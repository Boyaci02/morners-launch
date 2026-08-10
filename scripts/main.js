// Överste Mörner — nav state, drawer, reveals, parallax, qopla placeholder
(() => {
  // Beställ-URL: klistra in Qopla-länken här när den kommer — alla knappar uppdateras automatiskt.
  const QOPLA_URL = "https://qopla.com/restaurant/morners/qEQ3g3j42O/order";

  const nav = document.querySelector('.nav');
  const burger = document.getElementById('burger');
  const drawer = document.getElementById('drawer');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // nav solid-on-scroll + göm vid scroll ned / visa vid scroll upp
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 40);
    const drawerOpen = drawer?.classList.contains('open');
    nav.classList.toggle('hide', !drawerOpen && y > 160 && y > lastY + 4);
    if (y < lastY - 4 || y <= 160) nav.classList.remove('hide');
    lastY = y;
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // mobile drawer
  const setDrawer = (open) => {
    burger.classList.toggle('open', open);
    drawer.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Stäng meny' : 'Öppna meny');
    // Håll headern (logga + X) ovanpå den öppna menyn — annars går den inte att stänga
    document.body.classList.toggle('drawer-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger?.addEventListener('click', () => setDrawer(!drawer.classList.contains('open')));
  drawer?.querySelectorAll('[data-close]').forEach((a) => a.addEventListener('click', () => setDrawer(false)));
  document.querySelector('.brand')?.addEventListener('click', () => setDrawer(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setDrawer(false); });

  // qopla placeholder → real link when QOPLA_URL is set
  document.querySelectorAll('[data-qopla]').forEach((el) => {
    if (QOPLA_URL) {
      el.href = QOPLA_URL;
      el.target = '_blank';
      el.rel = 'noopener';
    } else {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Onlinebeställningen är tillfälligt otillgänglig — försök igen om en stund.');
      });
    }
  });

  // scroll reveals (auto-stagger for [data-stagger] groups)
  const staggerGroups = [...document.querySelectorAll('[data-stagger]')];
  const grouped = new Set();
  staggerGroups.forEach((g) => g.querySelectorAll('[data-reveal]').forEach((k) => grouped.add(k)));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const t = e.target;
      if (t.hasAttribute('data-stagger')) {
        t.querySelectorAll('[data-reveal]').forEach((k, i) => {
          if (!reduce) k.style.transitionDelay = Math.min(i * 55, 330) + 'ms';
          k.classList.add('in');
        });
      } else {
        t.classList.add('in');
      }
      io.unobserve(t);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('[data-reveal]').forEach((el) => { if (!grouped.has(el)) io.observe(el); });
  staggerGroups.forEach((g) => io.observe(g));

  // parallax band
  const layers = [...document.querySelectorAll('[data-parallax]')];
  if (layers.length && !reduce) {
    let ticking = false;
    const update = () => {
      layers.forEach((l) => {
        const r = l.parentElement.getBoundingClientRect();
        const progress = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
        l.style.transform = `translate3d(0, ${(-progress * 50).toFixed(1)}px, 0)`;
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
    update();
  }

  // mobil beställ-bar — visas efter hero, döljs vid sidfoten
  const mobilebar = document.getElementById('mobilebar');
  const hero = document.querySelector('.hero');
  const foot = document.querySelector('.foot');
  if (mobilebar && hero) {
    let pastHero = false, atFoot = false;
    const sync = () => {
      const show = pastHero && !atFoot;
      mobilebar.classList.toggle('show', show);
      mobilebar.setAttribute('aria-hidden', String(!show));
    };
    new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; sync(); }, { threshold: 0.15 }).observe(hero);
    if (foot) new IntersectionObserver(([e]) => { atFoot = e.isIntersecting; sync(); }, { threshold: 0.05 }).observe(foot);
  }

  // aktiv nav-länk vid scroll
  const navLinks = [...document.querySelectorAll('.nav__links a[href^="#"]')];
  if (navLinks.length) {
    const map = new Map();
    navLinks.forEach((a) => {
      const sec = document.querySelector(a.getAttribute('href'));
      if (sec) map.set(sec, a);
    });
    const heroSec = document.querySelector('.hero');
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        navLinks.forEach((a) => a.classList.remove('active'));
        if (e.target !== heroSec) map.get(e.target)?.classList.add('active');
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    map.forEach((_, sec) => spy.observe(sec));
    if (heroSec) spy.observe(heroSec);
  }

  // öppet nu-badge — beräknas ur riktiga öppettider
  // [öppnar, stänger] i minuter; stänger > 1440 = efter midnatt
  const HOURS = [
    [12 * 60, 23 * 60],          // sön
    [11 * 60 + 30, 23 * 60],     // mån
    [11 * 60 + 30, 23 * 60],     // tis
    [11 * 60 + 30, 24 * 60],     // ons
    [11 * 60 + 30, 24 * 60],     // tor
    [11 * 60 + 30, 25 * 60 + 30],// fre (01:30)
    [11 * 60 + 30, 25 * 60 + 30],// lör (01:30)
  ];
  const badge = document.getElementById('openBadge');
  const openText = document.getElementById('openText');
  if (badge && openText) {
    const now = new Date();
    const day = now.getDay();
    const mins = now.getHours() * 60 + now.getMinutes();
    const fmt = (m) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const today = HOURS[day];
    const yester = HOURS[(day + 6) % 7];
    let open = false, text = '';
    if (mins >= today[0] && mins < Math.min(today[1], 1440)) {
      open = true; text = `Öppet nu · stänger ${fmt(today[1])}`;
    } else if (yester[1] > 1440 && mins < yester[1] - 1440) {
      open = true; text = `Öppet nu · stänger ${fmt(yester[1])}`;
    } else if (mins < today[0]) {
      text = `Stängt · öppnar ${fmt(today[0])}`;
    } else {
      text = `Stängt · öppnar ${fmt(HOURS[(day + 1) % 7][0])} imorgon`;
    }
    badge.classList.toggle('closed', !open);
    openText.textContent = text;
    badge.hidden = false;
  }

  // "Visa hela urvalet" — utökar menyn med staggrad entré
  const menuMore = document.getElementById('menuMore');
  if (menuMore) {
    const extra = [...document.querySelectorAll('.mrow--more')];
    let expanded = false;
    menuMore.addEventListener('click', () => {
      expanded = !expanded;
      menuMore.setAttribute('aria-expanded', String(expanded));
      if (expanded) {
        extra.forEach((r, i) => {
          r.hidden = false;
          setTimeout(() => r.classList.add('in'), reduce ? 0 : 40 + i * 55);
        });
        menuMore.innerHTML = 'Visa färre <span class="btn__a" aria-hidden="true">−</span>';
      } else {
        extra.forEach((r) => { r.classList.remove('in'); r.hidden = true; });
        menuMore.innerHTML = 'Visa hela urvalet <span class="btn__a" aria-hidden="true">+</span>';
        document.getElementById('meny')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      }
    });
  }

  // markera dagens rad i öppettiderna
  const today = new Date().getDay();
  document.querySelectorAll('.hrow[data-days]').forEach((row) => {
    if (row.dataset.days.split(',').map(Number).includes(today)) row.classList.add('today');
  });

  // year
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();

/* Öppningsavisering — visas en gång, kommer ihåg att den stängts.
   localStorage, inte cookie: en funktionell preferens som aldrig lämnar
   webbläsaren och som inte kräver samtycke. */
(function oppnarAvisering() {
  var d = document.getElementById('oppnar');
  if (!d || !d.showModal) return;
  var NYCKEL = 'morners-oppnat-nu';
  try { if (localStorage.getItem(NYCKEL)) return; } catch (e) {}

  setTimeout(function () {
    if (d.open) return;
    d.showModal();
    // showModal() focuses the first focusable child, which lights the close
    // cross with a focus ring the instant the dialog appears. Move focus to
    // the dialog itself: Escape and the focus trap still work, nothing looks
    // pressed. The `autofocus` attribute alone is not reliably honoured here.
    d.focus();
  }, 700);

  // Klick utanför kortet stänger. <dialog> ger Escape och fokusfälla gratis.
  d.addEventListener('click', function (e) {
    var r = d.getBoundingClientRect();
    var utanfor = e.clientX < r.left || e.clientX > r.right ||
                  e.clientY < r.top  || e.clientY > r.bottom;
    if (utanfor) d.close('utanfor');
  });

  d.addEventListener('close', function () {
    try { localStorage.setItem(NYCKEL, '1'); } catch (e) {}
    if (d.returnValue === 'meny') {
      var meny = document.getElementById('meny');
      if (meny) meny.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
})();
