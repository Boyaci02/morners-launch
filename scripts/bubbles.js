// Mörners — stigande bubblor i hjälten (canvas 2D, varumärkesfärger på ljus botten)
// Particle-principer: per-partikel-integration, kontinuerlig emission, sinus-wobble.
// Prestanda: rAF endast när hjälten syns, dpr-capped, reduced-motion = av.
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  const host = document.querySelector('.hero');
  if (!host) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'bubbles';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = host.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // varumärkespalett på kräm — låg mättnadsstyrka, mest konturer
  const NAVY = '0, 23, 57', ORANGE = '255, 125, 3';
  const N = 26;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function spawn(p, first) {
    p.r = rnd(8, 64);                       // radie
    p.x = rnd(0, 1);                        // andel av bredd
    p.y = first ? rnd(0.1, 1.1) : 1.08 + p.r / 600; // start under kanten
    p.v = rnd(0.018, 0.05) / (p.r / 26);    // små bubblor stiger snabbare
    p.wA = rnd(6, 26);                      // wobble-amplitud px
    p.wF = rnd(0.4, 1.1);                   // wobble-frekvens
    p.ph = rnd(0, Math.PI * 2);
    const orange = Math.random() < 0.3;
    p.col = orange ? ORANGE : NAVY;
    p.fill = Math.random() < 0.35;
    p.a = p.fill ? rnd(0.045, 0.10) : rnd(0.10, 0.22); // fyllda svagare, konturer tydligare
    return p;
  }
  const parts = Array.from({ length: N }, () => spawn({}, true));

  let raf = 0, visible = false, t0 = performance.now();
  function frame(now) {
    const t = (now - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.y -= p.v / 60;
      if (p.y < -0.12) spawn(p, false);
      const x = p.x * W + Math.sin(t * p.wF + p.ph) * p.wA;
      const y = p.y * H;
      ctx.beginPath();
      ctx.arc(x, y, p.r, 0, Math.PI * 2);
      if (p.fill) {
        ctx.fillStyle = `rgba(${p.col}, ${p.a})`;
        ctx.fill();
      } else {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `rgba(${p.col}, ${p.a})`;
        ctx.stroke();
      }
    }
    raf = visible ? requestAnimationFrame(frame) : 0;
  }
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { t0 = performance.now() - 1; raf = requestAnimationFrame(frame); }
  }, { rootMargin: '60px' }).observe(host);
})();
