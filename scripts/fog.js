// Mörners — EN dimma över hela den ljusa delen av sidan.
// Alla [data-fog]-sektioner samplar samma fält i sidkoordinater → inga skarvar.
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  const hosts = [...document.querySelectorAll('[data-fog]')];
  if (!hosts.length) return;
  const REF = 1200; // px per brusenhet — samma för alla sektioner

  const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;
  const FRAG = `
precision mediump float;
uniform vec2 u_res, u_size;      /* canvas-px, sektionens px-storlek */
uniform vec2 u_grad;             /* gradientens start/slut i sid-px */
uniform float u_t, u_top, u_ref; /* tid, sektionens topp i sid-px, px per brusenhet */
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x), u.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  /* sid-koordinater: kontinuerliga mellan sektioner */
  float pageY = u_top + (1. - uv.y) * u_size.y;
  vec2 q = vec2(uv.x * u_size.x, pageY) / u_ref;
  float t = u_t * .045;

  float g = clamp((pageY - u_grad.x) / max(1., u_grad.y - u_grad.x), 0., 1.);

  vec3 baseTop = vec3(.965,.945,.906);   /* kräm  #f6f1e7 */
  vec3 baseBot = vec3(.804,.859,.941);   /* marin #cddcf0 */
  vec3 lobeTop = vec3(.973,.855,.694);   /* varm aprikos */
  vec3 lobeBot = vec3(.643,.733,.878);   /* djupare blå */

  vec3 base = mix(baseTop, baseBot, g);
  vec3 lobe = mix(lobeTop, lobeBot, g);

  vec2 w = vec2(fbm(q*1.25 + t), fbm(q*1.25 - t*.7));
  float n = fbm(q*1.55 + 2.7*w - t*.4);

  vec3 col = base;
  col = mix(col, lobe, smoothstep(.34, .76, n) * .95);
  col = mix(col, mix(vec3(1.,.98,.95), vec3(.90,.94,.99), g), smoothstep(.68, .95, n) * .5);
  gl_FragColor = vec4(col, 1.);
}`;

  const instances = [];
  hosts.forEach((host) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'fogfx';
    canvas.setAttribute('aria-hidden', 'true');
    host.prepend(canvas);
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) { canvas.remove(); return; }
    function sh(t,s){ const o=gl.createShader(t); gl.shaderSource(o,s); gl.compileShader(o); return o; }
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog,'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    const u = (n) => gl.getUniformLocation(prog, n);
    gl.uniform1f(u('u_ref'), REF);
    instances.push({ host, canvas, gl, u, t0: performance.now() });
  });
  if (!instances.length) return;

  function layout() {
    const tops = instances.map(i => i.host.getBoundingClientRect().top + window.scrollY);
    const bots = instances.map((i, k) => tops[k] + i.host.getBoundingClientRect().height);
    const gradStart = Math.min(...tops), gradEnd = Math.max(...bots);
    instances.forEach((inst, k) => {
      const { host, canvas, gl, u } = inst;
      const r = host.getBoundingClientRect();
      const SCALE = 0.5;
      canvas.width = Math.max(2, Math.round(r.width * SCALE));
      canvas.height = Math.max(2, Math.round(r.height * SCALE));
      gl.useProgram(gl.getParameter(gl.CURRENT_PROGRAM) || null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u('u_res'), canvas.width, canvas.height);
      gl.uniform2f(u('u_size'), r.width, r.height);
      gl.uniform2f(u('u_grad'), gradStart, gradEnd);
      gl.uniform1f(u('u_top'), tops[k]);
      draw(inst);
    });
  }
  function draw(inst, now) {
    inst.gl.uniform1f(inst.u('u_t'), ((now ?? performance.now()) - inst.t0) / 1000);
    inst.gl.drawArrays(inst.gl.TRIANGLES, 0, 3);
  }
  layout();
  window.addEventListener('resize', layout, { passive: true });

  instances.forEach((inst) => {
    let raf = 0, visible = false;
    const frame = (now) => { draw(inst, now); raf = visible ? requestAnimationFrame(frame) : 0; };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }, { rootMargin: '100px' }).observe(inst.host);
  });
})();
