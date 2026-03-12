# JUEF Website Development Plan — juefonline.org

## Tech Stack
- **HTML5 / CSS3 / Vanilla JS** — fast, portable, zero dependencies
- **Hosting**: GitHub Pages (free, fast CDN, custom domain support)
- **Repo**: GitHub — version controlled, team-accessible
- **Forms**: Formspree or Google Forms embed (no backend needed initially)

## Site Architecture

```
juefonline.org/
├── index.html                  ← Homepage
├── jeep.html                   ← JEEP Landing Page (PRIORITY #1)
├── pages/
│   ├── framework.html          ← The Shraman Framework
│   ├── kalash.html             ← Kalash School (Ages 3-8)
│   ├── padam.html              ← Padam School (Ages 8-14)
│   ├── shikhar.html            ← Shikhar School (Ages 14-18)
│   ├── blog.html               ← Blog / Insights hub
│   ├── resources.html          ← Downloadable resources (gated)
│   ├── about.html              ← About JUEF + Team
│   └── contact.html            ← Contact + General inquiry
├── css/
│   ├── style.css               ← Global styles + design system
│   └── responsive.css          ← Mobile / tablet breakpoints
├── js/
│   ├── main.js                 ← Navigation, interactions
│   └── form.js                 ← Form handling
├── images/                     ← All site images
├── assets/                     ← Downloadable PDFs, docs
└── README.md                   ← Repo documentation
```

## Design System

| Element | Value |
|---------|-------|
| Primary Color | #1A6B5E (Teal — education trust meets nature) |
| Secondary Color | #C49A2A (Warm Gold — Jain heritage, warmth) |
| Accent | #7D9E82 (Sage Green — nature, calm, Shaanti) |
| Background | #FFFFFF / #F5F3EE (warm off-white, natural paper feel) |
| Text | #3A3535 (Charcoal Warm — softer than blue-grey) |
| Font (Headings) | Inter (modern, clean) |
| Font (Body) | Inter |
| Style | "Shraman Modern" — modern + warm, nature-rooted, NOT corporate or religious |
| Palette Name | Shraman Modern — bridges modernity with Kalash warmth |

## Page Priority & Build Order

| Priority | Page | Why |
|----------|------|-----|
| P0 | Homepage | First impression, routing hub |
| P0 | JEEP Landing Page | June 2026 deadline — conversion engine |
| P1 | Framework | Core credibility page |
| P1 | About | Trust + team |
| P2 | Three Schools (Kalash, Padam, Shikhar) | Depth pages |
| P2 | Contact | Lead capture |
| P3 | Blog | Content hub (can launch with 3-5 articles) |
| P3 | Resources | Gated downloads for email capture |

## SEO Foundations
- Semantic HTML5 (header, nav, main, section, article, footer)
- Meta tags on every page (title, description, OG tags)
- Schema.org markup (Organization, EducationalOrganization)
- Fast load times (no frameworks, optimized images)
- Mobile-first responsive design
- sitemap.xml + robots.txt

## Deployment
- GitHub Pages with custom domain (juefonline.org)
- CNAME record pointing to GitHub
- SSL via GitHub Pages (automatic)
