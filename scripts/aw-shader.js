// Mörners — mjuk pastelldimma i ljusa Beställ-bandet (GLSL fbm + domain warp)
// Prestanda: 0.5x upplösning, rAF endast när sektionen syns, respekterar reduced motion.
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  const host = document.querySelector('.orderband');
  if (!host) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'awfx';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) { canvas.remove(); return; }

  const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
  const FRAG = `
precision mediump float;
uniform vec2 u_res; uniform float u_t;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x),
             mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0., a = .5;
  for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.03; a *= .5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 q = uv * vec2(u_res.x / u_res.y, 1.);
  float t = u_t * .025;

  /* domain warp — långsam ember-drift */
  vec2 w1 = vec2(fbm(q * 1.6 + t), fbm(q * 1.6 - t * .7));
  vec2 w2 = vec2(fbm(q * 2.2 + 3.1 * w1 + vec2(1.7, 9.2)), fbm(q * 2.2 + 3.1 * w1 + vec2(8.3, 2.8)));
  float n = fbm(q * 1.9 + 2.4 * w2 - t * .5);

  /* palett: bläckmörkt -> falu-glöd -> svag bärnsten */
  vec3 ink   = vec3(.937, .910, .855);   /* bas: paper-2 */
  vec3 falu  = vec3(.980, .845, .690);   /* varm aprikosdimma */
  vec3 amber = vec3(.835, .865, .915);   /* svag marin dis */

  vec3 col = ink;
  col = mix(col, falu,  smoothstep(.40, .78, n) * .85);
  col = mix(col, amber, smoothstep(.70, .95, n) * .55);

  /* vinjett — håll kanterna mörka, texten läsbar */
  float vig = smoothstep(1.15, .35, distance(uv, vec2(.62, .45)));
  col = mix(ink, col, vig);

  gl_FragColor = vec4(col, 1.);
}`;

  function sh(type, src){ const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uT = gl.getUniformLocation(prog, 'u_t');

  const SCALE = 0.5; // halva upplösningen räcker — mjuk glöd
  function resize(){
    const r = host.getBoundingClientRect();
    canvas.width = Math.max(2, Math.round(r.width * SCALE));
    canvas.height = Math.max(2, Math.round(r.height * SCALE));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  let raf = 0, visible = false;
  const t0 = performance.now();
  function frame(now){
    gl.uniform1f(uT, (now - t0) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = visible ? requestAnimationFrame(frame) : 0;
  }
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }, { rootMargin: '80px' }).observe(host);
})();
