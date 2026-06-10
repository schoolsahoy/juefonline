// Form submission endpoint for juefonline.org (Vercel serverless function).
//
// Receives the three site forms (JEEP application, contact, Jain RTE notify-me),
// stores every submission in Neon Postgres (system of record) and sends a
// notification email via Resend. Succeeds if EITHER storage or email works,
// so a misconfigured mail key never loses a lead.
//
// Env vars (set in Vercel project settings):
//   DATABASE_URL    — Neon connection string (project: juefonline)
//   RESEND_API_KEY  — Resend API key for notification emails
//   TO_EMAIL        — notification recipient (default: subs@schoolsahoy.com)
//   FROM_EMAIL      — sender (default: Resend test sender; switch to a
//                     juefonline.org address once the domain is verified)

import { neon } from '@neondatabase/serverless';

const FORMS = {
  jeep: {
    required: ['husband_name', 'wife_name', 'email', 'phone', 'location', 'occupation', 'motivation'],
    fields: [
      ['husband_name', "Husband's Name"],
      ['wife_name', "Wife's Name"],
      ['email', 'Email'],
      ['phone', 'Phone'],
      ['location', 'City & State'],
      ['occupation', 'Occupation (Both)'],
      ['motivation', 'Why JEEP'],
      ['source', 'Heard About JUEF Via'],
    ],
    subject: (d) => `JEEP Application — ${d.husband_name} & ${d.wife_name}`,
    name: (d) => `${d.husband_name} & ${d.wife_name}`,
  },
  contact: {
    required: ['firstName', 'lastName', 'email'],
    fields: [
      ['firstName', 'First Name'],
      ['lastName', 'Last Name'],
      ['email', 'Email'],
      ['phone', 'Phone'],
      ['interest', 'Interested In'],
      ['institution', 'Institution'],
      ['message', 'Message'],
    ],
    subject: (d) => `Website Contact — ${d.firstName} ${d.lastName}`,
    name: (d) => `${d.firstName} ${d.lastName}`,
  },
  give: {
    required: ['name', 'whatsapp'],
    fields: [
      ['name', 'Name'],
      ['whatsapp', 'WhatsApp'],
    ],
    subject: (d) => `Jain RTE Notify-Me — ${d.name}`,
    name: (d) => d.name,
  },
};

const MAX_FIELD_LEN = 5000;
const THANK_YOU_URL = '/pages/thank-you.html';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const body = req.body || {};
  const wantsJson = (req.headers['content-type'] || '').includes('application/json');

  // Honeypot filled in => bot. Pretend success, store nothing.
  if (body._gotcha) return respondOk(res, wantsJson);

  const meta = FORMS[body.form_type];
  if (!meta) return respondErr(res, wantsJson, 400, 'Unknown form type.');

  const data = {};
  for (const [key] of meta.fields) {
    const value = body[key];
    if (value == null) continue;
    const s = String(value).trim().slice(0, MAX_FIELD_LEN);
    if (s) data[key] = s;
  }

  const missing = meta.required.filter((k) => !data[k]);
  if (missing.length) {
    return respondErr(res, wantsJson, 400, `Missing required fields: ${missing.join(', ')}`);
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return respondErr(res, wantsJson, 400, 'Please enter a valid email address.');
  }

  const name = meta.name(data);
  const stored = await storeSubmission(req, body.form_type, data, name);
  const emailed = await sendEmail(meta, data);
  if (stored.id && emailed) await markEmailSent(stored.id);

  if (!stored.id && !emailed) {
    console.error('Submission lost: both DB and email unavailable', { form_type: body.form_type });
    return respondErr(res, wantsJson, 500,
      'Something went wrong on our side. Please email info@juefonline.org directly.');
  }
  return respondOk(res, wantsJson);
}

async function storeSubmission(req, formType, data, name) {
  if (!process.env.DATABASE_URL) return {};
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      INSERT INTO form_submissions (form_type, name, email, phone, payload, user_agent, referer)
      VALUES (${formType}, ${name}, ${data.email || null}, ${data.phone || data.whatsapp || null},
              ${JSON.stringify(data)}, ${req.headers['user-agent'] || null}, ${req.headers['referer'] || null})
      RETURNING id`;
    return rows[0] || {};
  } catch (err) {
    console.error('DB insert failed:', err);
    return {};
  }
}

async function markEmailSent(id) {
  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`UPDATE form_submissions SET email_sent = true WHERE id = ${id}`;
  } catch (err) {
    console.error('email_sent update failed:', err);
  }
}

async function sendEmail(meta, data) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const to = process.env.TO_EMAIL || 'subs@schoolsahoy.com';
  const from = process.env.FROM_EMAIL || 'JUEF Website <onboarding@resend.dev>';
  const lines = meta.fields
    .filter(([k]) => data[k])
    .map(([k, label]) => `${label}: ${data[k]}`);
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject: meta.subject(data),
        text: lines.join('\n'),
        ...(data.email ? { reply_to: [data.email] } : {}),
      }),
    });
    if (!r.ok) console.error('Resend error:', r.status, await r.text());
    return r.ok;
  } catch (err) {
    console.error('Resend request failed:', err);
    return false;
  }
}

function respondOk(res, wantsJson) {
  if (wantsJson) return res.status(200).json({ ok: true });
  res.statusCode = 303;
  res.setHeader('Location', THANK_YOU_URL);
  return res.end();
}

function respondErr(res, wantsJson, status, message) {
  if (wantsJson) return res.status(status).json({ ok: false, error: message });
  return res.status(status).send(message);
}
