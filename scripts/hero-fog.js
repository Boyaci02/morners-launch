// Mörners hero — "true colors"-reveal: inverterad ölbild där organiska
// dimformer avslöjar originalets bärnsten. GLSL fbm + domain warp på textur.
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const host = document.querySelector('.hero');
  const bgImg = host && host.querySelector('.hero__bg');
  if (!host || !bgImg || reduce) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'heroreveal';
  canvas.setAttribute('aria-hidden', 'true');
  host.insertBefore(canvas, bgImg.nextSibling);
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) { canvas.remove(); return; }

  const VERT = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * .5 + .5; gl_Position = vec4(p,0.,1.); }`;
  const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D u_tex;
uniform vec2 u_res; uniform vec2 u_img; uniform float u_t;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x), u.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
void main(){
  /* cover-fit UV */
  vec2 uv = vec2(vUv.x, 1. - vUv.y);
  float ra = u_res.x / u_res.y, ia = u_img.x / u_img.y;
  vec2 st = uv - .5;
  if (ra > ia) { st.y *= ia / ra; } else { st.x *= ra / ia; }
  st += .5;
  st.y = st.y * .9 + .03; /* fokus något uppåt som object-position 40% */
  vec3 tex = texture2D(u_tex, st).rgb;
  vec3 invd = vec3(1.) - tex;

  /* organiska avslöjande-former */
  vec2 q = uv * vec2(ra, 1.);
  float t = u_t * .04;
  vec2 w1 = vec2(fbm(q*1.1 + t), fbm(q*1.1 - t*.7));
  float n = fbm(q*1.4 + 2.8*w1 - t*.35);
  float m = smoothstep(.42, .68, n);            /* stora mjuka fönster */
  float rim = smoothstep(.38,.46,n) - smoothstep(.46,.56,n); /* varm kant */

  vec3 col = mix(invd, tex * vec3(1.06, 1.0, .94), m);   /* sanna färger i formerna */
  col += rim * vec3(1.0, .49, .012) * .25;               /* orange glödkant */
  gl_FragColor = vec4(col, 1.);
}`;
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
  const uRes=gl.getUniformLocation(prog,'u_res'), uT=gl.getUniformLocation(prog,'u_t'),
        uImg=gl.getUniformLocation(prog,'u_img'), uTex=gl.getUniformLocation(prog,'u_tex');

  const img = new Image();
  img.src = bgImg.currentSrc || bgImg.src;
  img.decode().then(() => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(uTex, 0);
    gl.uniform2f(uImg, img.naturalWidth, img.naturalHeight);
    host.classList.add('fx-on');   /* göm fallback-imgen */
    resize();
    start();
  }).catch(() => canvas.remove());

  const SCALE = .66;
  function resize(){ const r=host.getBoundingClientRect();
    canvas.width=Math.max(2,Math.round(r.width*SCALE)); canvas.height=Math.max(2,Math.round(r.height*SCALE));
    gl.viewport(0,0,canvas.width,canvas.height); gl.uniform2f(uRes,canvas.width,canvas.height);
    try { draw(); } catch(e){} }
  window.addEventListener('resize', resize, { passive:true });

  let raf=0, visible=false; const t0=performance.now();
  function draw(now){ gl.uniform1f(uT,((now ?? performance.now())-t0)/1000); gl.drawArrays(gl.TRIANGLES,0,3); }
  function frame(now){ draw(now); raf = visible ? requestAnimationFrame(frame) : 0; }
  function start(){
    new IntersectionObserver(([e])=>{ visible=e.isIntersecting; if(visible&&!raf) raf=requestAnimationFrame(frame); },{rootMargin:'60px'}).observe(host);
    visible = true; raf = requestAnimationFrame(frame);
  }
})();
