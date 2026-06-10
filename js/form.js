// Form submission handling for juefonline.org
// Intercepts forms marked with [data-form], POSTs JSON to /api/submit,
// and shows inline success/error states. Without JS, forms fall back to a
// normal POST to /api/submit which redirects to /pages/thank-you.html.

(function () {
  'use strict';

  var FALLBACK_ERROR = 'Something went wrong. Please try again, or email info@juefonline.org directly.';

  document.querySelectorAll('form[data-form]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var button = form.querySelector('button[type="submit"]');
      var note = form.querySelector('.form-note');
      if (!note) {
        note = document.createElement('p');
        note.className = 'form-note';
        note.setAttribute('role', 'status');
        button.insertAdjacentElement('afterend', note);
      }

      var originalLabel = button.textContent;
      button.disabled = true;
      button.textContent = 'Sending…';
      note.textContent = '';

      var data = {};
      new FormData(form).forEach(function (value, key) { data[key] = value; });

      fetch(form.getAttribute('action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (response) {
          return response.json()
            .catch(function () { return {}; })
            .then(function (json) { return { ok: response.ok && json.ok, error: json.error }; });
        })
        .then(function (result) {
          if (!result.ok) {
            throw new Error(result.error || FALLBACK_ERROR);
          }
          form.innerHTML =
            '<div class="form-success" role="status">' +
            '<h3>' + (form.dataset.successTitle || 'Thank you!') + '</h3>' +
            '<p>' + (form.dataset.successMessage || "We've received your submission and will get back to you soon.") + '</p>' +
            '</div>';
        })
        .catch(function (err) {
          button.disabled = false;
          button.textContent = originalLabel;
          note.textContent = (err && err.message) ? err.message : FALLBACK_ERROR;
        });
    });
  });
})();
