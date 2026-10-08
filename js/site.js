/* signature-web · base/motion.js (from the AKMIRA reference build, 2026-10-01)
   Studio motion as behaviour only; the look stays per client.
   Markup hooks: [data-nav] header, [data-hero] first screen, .rv text/UI blocks (never photos),
   [data-par="4"] wrapper around a framed photo (amplitude in percent), .intro overlay with .intro__mark,
   [data-menu], [data-menu-open], [data-menu-close], gallery: [data-lb] dialog, [data-open="key"][data-index],
   window.GALLERY = { key: [{src,w,h}] }, window.GALLERY_TITLES = { key: 'Title · Place' }.
   Load lenis.min.js before this file (defer both). In <head>, before any CSS paints:
   <script>(function(d){d.classList.add('js');var r=matchMedia('(prefers-reduced-motion: reduce)').matches,s;try{s=sessionStorage.getItem('intro-seen')}catch(e){}if(r||s)d.classList.add('no-intro')})(document.documentElement)</script>
   Without the .intro element the page simply skips it. */
(function () {
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var nav = document.querySelector('[data-nav]');
  var hero = document.querySelector('[data-hero]');
  var hasIntro = !!document.querySelector('.intro');
  if (!hasIntro) root.classList.add('no-intro');

  /* smooth scroll: wheel only, touch stays native */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  var navH = function () { return nav ? nav.offsetHeight : 0; };
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a) return;
    var id = a.getAttribute('href'); if (id.length < 2) return;
    var t = document.querySelector(id); if (!t) return;
    e.preventDefault();
    var off = (hero && t === hero) ? 0 : -navH() + 1;
    if (lenis) lenis.scrollTo(t, { offset: off, duration: 1.4 }); else window.scrollTo({ top: t.getBoundingClientRect().top + scrollY + off, behavior: reduce ? 'auto' : 'smooth' });
  });

  /* reveals: text and UI only, once; the hero waits for the intro */
  var els = [].slice.call(document.querySelectorAll('.rv'));
  var heroEls = els.filter(function (el) { return hero && hero.contains(el); });
  var restEls = els.filter(function (el) { return heroEls.indexOf(el) < 0; });
  var show = function (el) { el.classList.add('in'); };
  if (reduce || !('IntersectionObserver' in window)) { els.forEach(show); }
  else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting || e.boundingClientRect.top < 0) { show(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    restEls.forEach(function (el) { io.observe(el); });
    var sweep = function () { restEls.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) show(el); }); };
    setTimeout(sweep, 3200);
    addEventListener('pageshow', sweep);
    addEventListener('beforeprint', function () { els.forEach(show); });
  }

  /* intro: the client's mark once per session, then the hero settles */
  var ready = function () {
    root.classList.add('is-ready');
    setTimeout(function () { heroEls.forEach(show); }, root.classList.contains('no-intro') ? 120 : 380);
    try { sessionStorage.setItem('intro-seen', '1'); } catch (e) {}
  };
  var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  if (root.classList.contains('no-intro')) { fontsReady.then(function () { requestAnimationFrame(ready); }); }
  else {
    if (lenis) lenis.stop();
    var t0 = Date.now();
    Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 2000); })]).then(function () {
      setTimeout(function () { ready(); if (lenis) lenis.start(); }, Math.max(0, 1250 - (Date.now() - t0)));
    });
  }
  setTimeout(function () { if (!root.classList.contains('is-ready')) { ready(); if (lenis) lenis.start(); } }, 3500);

  /* parallax inside the frame: desktop with a fine pointer only */
  var pars = [].slice.call(document.querySelectorAll('[data-par]'));
  var parOn = !reduce && finePointer && innerWidth >= 1024 && pars.length;
  var updatePar = function () {
    var vh = innerHeight;
    for (var i = 0; i < pars.length; i++) {
      var el = pars[i], box = el.parentElement.getBoundingClientRect();
      if (box.bottom < -100 || box.top > vh + 100) continue;
      var p = ((box.top + box.height / 2) - vh / 2) / (vh / 2 + box.height / 2);
      el.style.setProperty('--py', (-p * (+(el.getAttribute('data-par') || 4))).toFixed(3) + '%');
    }
  };
  if (parOn) { root.classList.add('has-par'); updatePar(); }

  /* nav: solid after the hero, steps away while reading down, returns on the way up */
  var lastY = scrollY, menuOpen = false;
  var onScroll = function (y) {
    if (parOn) updatePar();
    if (!nav) return;
    nav.classList.toggle('is-solid', hero ? hero.getBoundingClientRect().bottom <= navH() + 1 : true);
    var dy = y - lastY;
    if (!menuOpen && !reduce) {
      if (y > innerHeight * 0.9 && dy > 4) nav.classList.add('is-away');
      else if (dy < -4 || y < innerHeight * 0.5) nav.classList.remove('is-away');
    }
    lastY = y;
  };
  if (lenis) lenis.on('scroll', function (l) { onScroll(l.scroll); });
  else addEventListener('scroll', function () { onScroll(scrollY); }, { passive: true });
  addEventListener('resize', function () { onScroll(scrollY); });
  onScroll(scrollY);
  nav && nav.addEventListener('focusin', function () { nav.classList.remove('is-away'); });

  /* menu */
  var menu = document.querySelector('[data-menu]');
  var openBtn = document.querySelector('[data-menu-open]');
  var setMenu = function (open) {
    if (!menu) return;
    menuOpen = open; menu.hidden = !open;
    openBtn && openBtn.setAttribute('aria-expanded', String(open));
    if (lenis) { open ? lenis.stop() : lenis.start(); } else document.body.style.overflow = open ? 'hidden' : '';
    if (open) { var first = menu.querySelector('a'); first && first.focus(); } else { openBtn && openBtn.focus(); }
  };
  openBtn && openBtn.addEventListener('click', function () { setMenu(true); });
  menu && menu.addEventListener('click', function (e) { if (e.target.closest('[data-menu-close]')) setMenu(false); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu && !menu.hidden) setMenu(false); });

  /* gallery */
  var G = window.GALLERY || {}, titles = window.GALLERY_TITLES || {};
  var lb = document.querySelector('[data-lb]');
  if (!lb || typeof lb.showModal !== 'function') return;
  var img = lb.querySelector('[data-lb-img]'), tEl = lb.querySelector('[data-lb-title]'), cEl = lb.querySelector('[data-lb-count]');
  var cur = { key: null, i: 0 };
  var render = function () {
    var list = G[cur.key] || []; if (!list.length) return;
    var it = list[cur.i];
    img.classList.add('is-loading');
    var pre = new Image(); pre.onload = pre.onerror = function () { img.src = it.src; img.width = it.w; img.height = it.h; img.classList.remove('is-loading'); };
    pre.src = it.src;
    img.alt = (titles[cur.key] || '') + ', ' + (cur.i + 1) + ' / ' + list.length;
    if (tEl) tEl.textContent = titles[cur.key] || '';
    if (cEl) cEl.textContent = (cur.i + 1) + ' / ' + list.length;
    var nx = list[(cur.i + 1) % list.length]; if (nx) { var p2 = new Image(); p2.src = nx.src; }
  };
  var go = function (d) { var n = (G[cur.key] || []).length; if (!n) return; cur.i = (cur.i + d + n) % n; render(); };
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-open]'); if (!a) return;
    var key = a.getAttribute('data-open'); if (!G[key]) return;
    e.preventDefault(); cur.key = key; cur.i = +a.getAttribute('data-index') || 0; render();
    lb.showModal(); if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden';
  });
  var q = function (s) { return lb.querySelector(s); };
  q('[data-lb-prev]') && q('[data-lb-prev]').addEventListener('click', function () { go(-1); });
  q('[data-lb-next]') && q('[data-lb-next]').addEventListener('click', function () { go(1); });
  q('[data-lb-close]') && q('[data-lb-close]').addEventListener('click', function () { lb.close(); });
  lb.addEventListener('close', function () { if (lenis) lenis.start(); else document.body.style.overflow = ''; });
  lb.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); });
  var sx = null;
  lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); sx = null; });
})();

/* Gilt Edged Bathrooms · before/after sliders, town tabs, project index, consultation form, phone call bar */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* before/after: drag anywhere on the photo (horizontal), vertical swipes keep scrolling the page */
  [].forEach.call(document.querySelectorAll('[data-ba]'), function (ba) {
    var range = ba.querySelector('.ba__range');
    var set = function (v) { v = Math.max(0, Math.min(100, v)); ba.style.setProperty('--pos', v + '%'); range.value = Math.round(v); };
    var fromX = function (x) { var r = ba.getBoundingClientRect(); return (x - r.left) / r.width * 100; };
    var drag = null;
    ba.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, on: e.pointerType === 'mouse' };
      if (drag.on) { ba.setPointerCapture(e.pointerId); ba.classList.add('is-drag'); set(fromX(e.clientX)); e.preventDefault(); }
    });
    ba.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.on) {
        var dx = Math.abs(e.clientX - drag.x), dy = Math.abs(e.clientY - drag.y);
        if (dx > 6 && dx > dy) { drag.on = true; try { ba.setPointerCapture(e.pointerId); } catch (_) {} ba.classList.add('is-drag'); }
        else if (dy > 8) { drag = null; return; }
      }
      if (drag && drag.on) set(fromX(e.clientX));
    });
    var end = function (e) {
      if (drag && !drag.on && e.type === 'pointerup' && Math.abs(e.clientX - drag.x) < 6 && Math.abs(e.clientY - drag.y) < 6) set(fromX(e.clientX));
      drag = null; ba.classList.remove('is-drag');
    };
    ba.addEventListener('pointerup', end);
    ba.addEventListener('pointercancel', end);
    range.addEventListener('input', function () { set(+range.value); });
    ba.setAttribute('tabindex', '-1');
    ba.addEventListener('click', function () { range.focus({ preventScroll: true }); });
  });

  /* town tabs over the before/after stage */
  var tabs = [].slice.call(document.querySelectorAll('.bax__tab'));
  var panels = [].slice.call(document.querySelectorAll('.bax__panel'));
  var sides = [].slice.call(document.querySelectorAll('.bax__side'));
  var show = function (i, focus) {
    tabs.forEach(function (t, k) { var on = k === i; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    [panels, sides].forEach(function (list) { list.forEach(function (p, k) { var on = k === i; p.hidden = !on; p.classList.toggle('is-on', on); }); });
  };
  tabs.forEach(function (t, i) {
    t.tabIndex = i === 0 ? 0 : -1;
    t.addEventListener('click', function () { show(i); });
    t.addEventListener('keydown', function (e) {
      var d = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : (e.key === 'ArrowUp' || e.key === 'ArrowLeft') ? -1 : 0;
      if (!d) return; e.preventDefault(); show((i + d + tabs.length) % tabs.length, true);
    });
  });

  /* project index: hovering or focusing a row swaps the plate */
  var ix = document.querySelector('.ix');
  if (ix) {
    var rows = [].slice.call(ix.querySelectorAll('.ix__row'));
    var slides = [].slice.call(ix.querySelectorAll('.ix__slide'));
    var cur = 0, timer = 0;
    var swap = function (i) {
      if (i === cur || !slides[i]) return;
      rows.forEach(function (r, k) { var on = k === i; r.classList.toggle('is-on', on); if (on) r.setAttribute('aria-current', 'true'); else r.removeAttribute('aria-current'); });
      var prev = slides[cur], next = slides[i];
      slides.forEach(function (s) { s.classList.remove('is-prev'); });
      prev.classList.remove('is-on'); prev.classList.add('is-prev'); next.classList.add('is-on');
      clearTimeout(timer); timer = setTimeout(function () { prev.classList.remove('is-prev'); }, reduce ? 0 : 700);
      cur = i;
      var cap = ix.querySelector('[data-ix-cap]'); if (cap) cap.textContent = next.getAttribute('data-cap') || '';
    };
    rows.forEach(function (r, i) {
      r.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse' || e.pointerType === 'pen') swap(i); });
      r.addEventListener('focus', function () { swap(i); });
    });
  }

  /* consultation form: entrance links preselect the project, file names, inline checks */
  var form = document.querySelector('[data-form]');
  if (form) {
    var sel = form.querySelector('#f-type');
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-type]'); if (!a || !sel) return;
      sel.value = a.getAttribute('data-type');
    });
    var files = form.querySelector('#f-photos'), out = form.querySelector('[data-files]');
    files && files.addEventListener('change', function () {
      var n = [].map.call(files.files, function (f) { return f.name; });
      out.textContent = n.length ? n.length + (n.length === 1 ? ' photo: ' : ' photos: ') + n.join(', ') : '';
    });
    var checks = {
      name: function (v) { return v.trim().length > 1 || 'Please add your name.'; },
      phone: function (v) { return v.replace(/\D/g, '').length >= 10 || 'Please add a phone number we can call.'; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Please check the email address.'; },
      postcode: function (v) { return /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/.test(v.trim()) || 'Please add a full postcode, e.g. CM12 9BT.'; }
    };
    var check = function (input) {
      var fn = checks[input.name]; if (!fn) return true;
      var r = fn(input.value), field = input.closest('.field'), msg = field.querySelector('.msg');
      if (r === true) { field.removeAttribute('data-state'); msg.textContent = ''; input.removeAttribute('aria-invalid'); return true; }
      field.setAttribute('data-state', 'error'); msg.textContent = r; input.setAttribute('aria-invalid', 'true'); return false;
    };
    [].forEach.call(form.querySelectorAll('input[name]'), function (i) {
      i.addEventListener('blur', function () { if (i.value) check(i); });
      i.addEventListener('input', function () { if (i.closest('.field').hasAttribute('data-state')) check(i); });
    });
    form.addEventListener('submit', function (e) {
      var bad = [].filter.call(form.querySelectorAll('input[name]'), function (i) { return !check(i); });
      if (bad.length) { e.preventDefault(); bad[0].focus(); return; }
      var b = form.querySelector('button[type="submit"]'); b.textContent = 'Sending'; b.disabled = true;
    });
  }

  /* phone call bar: in after the first screen, out near the form and the footer */
  var bar = document.querySelector('[data-callbar]');
  if (bar) {
    var stop = [].slice.call(document.querySelectorAll('#consultation, .foot'));
    var tick = function () {
      var past = scrollY > innerHeight * .7;
      var near = stop.some(function (s) { var r = s.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; });
      bar.classList.toggle('is-on', past && !near);
    };
    addEventListener('scroll', tick, { passive: true }); addEventListener('resize', tick); tick();
  }
})();
