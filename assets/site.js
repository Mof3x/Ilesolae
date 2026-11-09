/* Where the forms send to: the Cloudflare Worker in _worker/ that emails via Resend.
   If it can't be reached, people get the "choose how to send" fallback instead.
   Set to "" to always use that fallback. */
var FORM_ENDPOINT = "https://forms.ilesolae.org";
var TO = "admin@ilesolae.org";

(function () {
  function $(id) { return document.getElementById(id); }

  // ---- Open Call curtain (text repeated twice so the drift loops seamlessly)
  document.querySelectorAll('.curtain .track').forEach(function (t) {
    var html = '';
    for (var i = 0; i < 60; i++) html += '<span>Open Call</span>';
    t.innerHTML = html;
  });

  // ---- size buttons/labels to their squeezed text
  function fitSqueezed() {
    var s = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--squeeze')) || 1;
    document.querySelectorAll('.btn .sqi, .nav .sqi, .mail-link.sqi, label > .sqi, .close .sqi').forEach(function (el) {
      el.style.marginRight = el.style.marginLeft = '';
      var lost = el.offsetWidth * (1 - s);
      if (el.closest('.btn')) el.style.marginLeft = el.style.marginRight = (22 - lost / 2) + 'px';
      else el.style.marginRight = (-lost) + 'px';
    });
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(fitSqueezed);

  // ---- nav
  var nav = $('nav');
  function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  var yr = $('yr'); if (yr) yr.textContent = new Date().getFullYear();

  // ---- dialog + sending
  var dlg = $('dlg');
  if (!dlg) return;
  var panels = ['panelForm', 'panelSend', 'panelDone'];
  var pending = null;
  var cameFromForm = false;
  var title = $('dlg-title').firstChild;

  function show(id) {
    panels.forEach(function (p) { var el = $(p); if (el) el.hidden = p !== id; });
    $('copyNote').textContent = '';
    $('backBtn').hidden = !cameFromForm;
    requestAnimationFrame(fitSqueezed);
  }
  function open(id) {
    show(id);
    if (!dlg.open) dlg.showModal();
  }

  document.querySelectorAll('[data-open-submit]').forEach(function (b) {
    b.addEventListener('click', function () {
      title.textContent = '(submit your film';
      cameFromForm = true;
      open('panelForm');
    });
  });
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
  });
  $('backBtn').addEventListener('click', function () { show('panelForm'); });

  function prepare(subject, body, data) {
    pending = { subject: subject, body: body, data: data };
    var s = encodeURIComponent(subject), b = encodeURIComponent(body);
    $('viaGmail').href = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + TO + '&su=' + s + '&body=' + b;
    $('viaOutlook').href = 'https://outlook.live.com/mail/0/deeplink/compose?to=' + TO + '&subject=' + s + '&body=' + b;
    $('viaApp').href = 'mailto:' + TO + '?subject=' + s + '&body=' + b;
  }

  var sendHint = $('sendHint');
  var sendHintDefault = sendHint ? sendHint.textContent : '';

  function fallback() {
    if (sendHint) sendHint.textContent = FORM_ENDPOINT
      ? 'We couldn’t send it from the site just now — choose another way. Your message is already written.'
      : sendHintDefault;
    open('panelSend');
  }

  function send(form) {
    if (!FORM_ENDPOINT) { fallback(); return; }
    var btn = form.querySelector('button[type=submit]');
    var label = btn.querySelector('.sqi');
    var was = label.textContent;
    btn.disabled = true;
    label.textContent = 'sending…';
    fitSqueezed();
    fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pending.data)
    })
      .then(function (r) {
        if (!r.ok) throw new Error('send failed');
        form.reset();
        open('panelDone');
      })
      .catch(fallback)
      .finally(function () {
        btn.disabled = false;
        label.textContent = was;
        fitSqueezed();
      });
  }

  $('viaCopy').addEventListener('click', function () {
    var text = 'To: ' + TO + '\nSubject: ' + pending.subject + '\n\n' + pending.body;
    var note = $('copyNote');
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .then(function () { note.textContent = 'Copied — paste it into an email to ' + TO + '.'; })
      .catch(function () { note.textContent = 'Couldn’t copy automatically — please email ' + TO + '.'; });
  });

  function grab(form) {
    var d = {}; new FormData(form).forEach(function (v, k) { d[k] = String(v).trim(); }); return d;
  }

  var submitForm = $('submitForm');
  if (submitForm) submitForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = grab(this);
    d.kind = 'submission';
    var body =
      'Film title: ' + d.title + '\n' +
      'Running time: ' + d.runtime + '\n' +
      'Link: ' + d.link + '\n\n' +
      'About me & the film:\n' + d.about + '\n\n' +
      '— ' + d.name + '\n' + d.email;
    prepare('Open Call Submission — ' + d.title, body, d);
    cameFromForm = true;
    send(this);
  });

  var contactForm = $('contactForm');
  if (contactForm) contactForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = grab(this);
    d.kind = 'contact';
    prepare(d.topic + ' — ' + d.name, d.message + '\n\n— ' + d.name + '\n' + d.email, d);
    cameFromForm = false;
    title.textContent = '(send your message';
    send(this);
  });
})();
