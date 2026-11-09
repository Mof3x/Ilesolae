/* Optional: paste a form endpoint here (e.g. a free Formspree form URL like
   "https://formspree.io/f/xxxxxxx") and submissions arrive straight in the inbox,
   no email app needed. Leave empty to use the "choose how to send" step. */
var FORM_ENDPOINT = "";
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

  function send() {
    if (!FORM_ENDPOINT) { open('panelSend'); return; }
    fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(Object.assign({ _subject: pending.subject }, pending.data))
    }).then(function (r) { open(r.ok ? 'panelDone' : 'panelSend'); })
      .catch(function () { open('panelSend'); });
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
    var body =
      'Film title: ' + d.title + '\n' +
      'Running time: ' + d.runtime + '\n' +
      'Link: ' + d.link + '\n\n' +
      'About me & the film:\n' + d.about + '\n\n' +
      '— ' + d.name + '\n' + d.email;
    prepare('Open Call Submission — ' + d.title, body, d);
    cameFromForm = true;
    send();
  });

  var contactForm = $('contactForm');
  if (contactForm) contactForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = grab(this);
    prepare(d.topic + ' — ' + d.name, d.message + '\n\n— ' + d.name + '\n' + d.email, d);
    cameFromForm = false;
    title.textContent = '(send your message';
    send();
  });
})();
