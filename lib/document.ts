import type { Scene } from "./compose";

/**
 * The engine stylesheet: stage, scene layout, typography and the motion
 * primitives. Everything inside the stage is sized in cqw so the animation
 * looks identical at any window size.
 */
export const ENGINE_CSS = `
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;height:100%}
body{
  background:#080807;
  display:grid;
  place-items:center;
  font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
  -webkit-font-smoothing:antialiased;
  overflow:hidden;
}

/* ---------- stage ---------- */
#stage{
  position:relative;
  width:min(100vw, calc(100vh * 9 / 16));
  aspect-ratio:9/16;
  container-type:size;
  overflow:hidden;
  background:var(--bg);
  color:var(--fg);
  transition:background .5s ease,color .5s ease;
}
#stage[data-t="d"]{--bg:#0e0d0c;--fg:#f5f0e8;--muted:#8d857a;--bronze:#c89a62;--hair:rgba(245,240,232,.18)}
#stage[data-t="l"]{--bg:#f2ede3;--fg:#161310;--muted:#877d70;--bronze:#a4713b;--hair:rgba(22,19,16,.18)}

#scenes{position:absolute;inset:0}

/* ---------- scene ---------- */
.scene{
  position:absolute;
  inset:0;
  display:flex;
  flex-direction:column;
  align-items:center;
  padding:17cqw 7cqw 0;
  opacity:0;
  animation:sceneIn .45s .04s ease forwards;
  will-change:opacity,transform,filter;
}
.scene.out{animation:sceneOut .6s ease forwards}
@keyframes sceneIn{to{opacity:1}}
@keyframes sceneOut{to{opacity:0;filter:blur(14px);transform:scale(1.04)}}

.kick{
  display:flex;
  align-items:center;
  gap:3.2cqw;
  margin:0 0 5cqw;
  font-size:3cqw;
  font-weight:500;
  letter-spacing:.24em;
  text-transform:uppercase;
  color:var(--bronze);
  opacity:0;
  animation:fadeIn .7s .1s ease forwards;
}
.kick::before,.kick::after{
  content:'';
  width:7cqw;
  height:1px;
  background:currentColor;
  opacity:.6;
  transform:scaleX(0);
  animation:hairIn 1.1s .32s cubic-bezier(.2,.8,.2,1) forwards;
}
.kick::before{transform-origin:right center}
.kick::after{transform-origin:left center}
@keyframes fadeIn{to{opacity:1}}
@keyframes hairIn{to{transform:scaleX(1)}}

.vis{
  width:66cqw;
  height:66cqw;
  flex:0 0 auto;
  margin:0 0 4.5cqw;
  overflow:visible;
}
.vis svg{display:block;width:100%;height:100%;overflow:visible}

/* ---------- text ---------- */
.l{
  margin:0;
  max-width:100%;
  font-family:'Instrument Serif',Georgia,'Times New Roman',serif;
  font-size:11.4cqw;
  font-weight:400;
  line-height:1.06;
  letter-spacing:-.012em;
  text-align:center;
  text-wrap:balance;
}
.l + .l{margin-top:.1em}
.l.s{
  margin-top:.9em;
  font-family:'Inter',system-ui,sans-serif;
  font-size:5.6cqw;
  font-weight:400;
  line-height:1.4;
  letter-spacing:0;
  color:var(--muted);
}
.l.b{font-size:14cqw;line-height:1.02}
.l.m{
  margin-top:1.6em;
  font-family:'Inter',system-ui,sans-serif;
  font-size:3.1cqw;
  font-weight:500;
  letter-spacing:.3em;
  text-transform:uppercase;
  color:var(--bronze);
}
.w{
  display:inline-block;
  margin-right:.26em;
  opacity:0;
  transform:translateY(.45em);
  filter:blur(12px);
  animation:wIn 1s var(--d,0s) cubic-bezier(.16,.84,.3,1) forwards;
}
.w:last-child{margin-right:0}
em{font-style:italic;color:var(--bronze)}
@keyframes wIn{to{opacity:1;transform:translateY(0);filter:blur(0)}}

/* ---------- svg defaults ---------- */
.vis *{
  fill:none;
  stroke-width:2.2;
  stroke-linecap:round;
  stroke-linejoin:round;
  transform-box:fill-box;
}
.A{stroke:var(--bronze)}
.F{stroke:var(--fg)}
.M{stroke:var(--muted)}
.fa{fill:var(--bronze);stroke:none}
.fs{fill:var(--bronze);fill-opacity:.18;stroke:none}

/* ---------- motion primitives ---------- */
.draw{stroke-dasharray:1;stroke-dashoffset:1;animation:draw var(--t,1.3s) var(--d,0s) ease forwards}
@keyframes draw{to{stroke-dashoffset:0}}

.fillin{
  stroke-dasharray:1;
  stroke-dashoffset:1;
  fill:var(--bronze);
  fill-opacity:0;
  animation:
    draw var(--t,1.4s) var(--d,0s) ease forwards,
    fillIn .9s calc(var(--d,0s) + var(--t,1.4s) * .75) ease forwards;
}
@keyframes fillIn{to{fill-opacity:.18}}

.pop{transform:scale(0);transform-origin:center;animation:pop var(--t,.7s) var(--d,0s) cubic-bezier(.34,1.56,.64,1) forwards}
@keyframes pop{to{transform:scale(1)}}

.rise{transform:scaleY(0);transform-origin:bottom;animation:rise var(--t,.9s) var(--d,0s) cubic-bezier(.34,1.4,.64,1) forwards}
@keyframes rise{to{transform:scaleY(1)}}

.grow{transform:scaleX(0);transform-origin:left;animation:grow var(--t,.9s) var(--d,0s) cubic-bezier(.2,.9,.2,1) forwards}
@keyframes grow{to{transform:scaleX(1)}}

.in{opacity:0;animation:in var(--t,.6s) var(--d,0s) ease forwards}
@keyframes in{to{opacity:1}}

.slide{opacity:0;transform:translateX(24px);animation:slide var(--t,.8s) var(--d,0s) cubic-bezier(.16,.84,.3,1) forwards}
@keyframes slide{to{opacity:1;transform:translateX(0)}}

.spin{transform-box:view-box;transform-origin:150px 150px;animation:spin var(--t,26s) linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

.pulse{animation:pulse var(--t,2.2s) var(--d,0s) ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:.35}50%{opacity:1}}

.ride{offset-distance:0;offset-rotate:0deg;animation:ride var(--t,2.4s) var(--d,0s) cubic-bezier(.45,0,.55,1) forwards}
@keyframes ride{from{offset-distance:0}to{offset-distance:100%}}

.cur{animation:cur 1s steps(1) infinite}
@keyframes cur{50%{opacity:0}}

/* ---------- progress + controls ---------- */
#prog{
  position:absolute;
  left:7cqw;
  right:7cqw;
  bottom:3.4cqw;
  display:flex;
  gap:1.2cqw;
  z-index:4;
  opacity:.5;
  transition:opacity .3s ease;
}
.seg{flex:1;height:2px;border-radius:2px;background:var(--hair);overflow:hidden}
.seg .bar{display:block;height:100%;width:0;border-radius:2px;background:var(--fg)}

#ui{
  position:absolute;
  left:0;
  right:0;
  bottom:7.5cqw;
  display:flex;
  justify-content:center;
  gap:2.4cqw;
  z-index:5;
  opacity:0;
  transform:translateY(8px);
  transition:opacity .3s ease,transform .3s ease;
  pointer-events:none;
}
body.show #ui{opacity:1;transform:translateY(0);pointer-events:auto}
body.hideui #ui,body.hideui #prog{opacity:0!important;pointer-events:none}
#ui button{
  appearance:none;
  cursor:pointer;
  padding:2.6cqw 3.4cqw;
  border:1px solid var(--hair);
  border-radius:999px;
  background:rgba(0,0,0,.28);
  color:var(--fg);
  font:500 2.6cqw/1 'Inter',system-ui,sans-serif;
  letter-spacing:.1em;
  text-transform:uppercase;
  backdrop-filter:blur(8px);
  transition:background .2s ease,border-color .2s ease;
}
#stage[data-t="l"] #ui button{background:rgba(255,255,255,.6)}
#ui button:hover{background:rgba(200,154,98,.22);border-color:var(--bronze)}

body.paused .scene,body.paused .scene *{animation-play-state:paused!important}

@media (prefers-reduced-motion:reduce){
  .spin,.pulse{animation:none!important;opacity:1!important}
}
`;

/**
 * The scene runtime, embedded verbatim in every exported file.
 * Plain ES5-ish JS so the document needs nothing but a browser.
 */
export const RUNTIME_JS = String.raw`
(function () {
  var S = window.__SCENES__ || [];
  if (!S.length) return;

  var stage = document.getElementById('stage');
  var layer = document.getElementById('scenes');
  var prog = document.getElementById('prog');

  var i = 0;
  var timer = null;
  var raf = 0;
  var current = null;
  var paused = false;
  var elapsed = 0;
  var lastFrame = 0;
  var remaining = 0;

  function el(tag, cls) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
  }

  /* Split a line into word spans; *asterisks* toggle bronze italic. */
  function wordNodes(line, start) {
    var frag = document.createDocumentFragment();
    var tokens = line.split(/\s+/).filter(Boolean);
    var open = false;
    for (var n = 0; n < tokens.length; n++) {
      var raw = tokens[n];
      var starts = raw.charAt(0) === '*';
      var ends = raw.length > 1 && raw.charAt(raw.length - 1) === '*';
      var emphasise = open || starts;
      if (starts) { raw = raw.slice(1); open = !open; }
      if (ends && raw.length > 1) { raw = raw.slice(0, -1); open = !open; }
      var w = el('span', 'w');
      w.style.setProperty('--d', (start + n * 0.08).toFixed(3) + 's');
      if (emphasise) {
        var em = el('em');
        em.textContent = raw;
        w.appendChild(em);
      } else {
        w.textContent = raw;
      }
      frag.appendChild(w);
    }
    return frag;
  }

  function build(sc) {
    var root = el('div', 'scene');
    if (sc.k) {
      var kick = el('div', 'kick');
      kick.textContent = sc.k;
      root.appendChild(kick);
    }
    var vis = el('div', 'vis');
    vis.innerHTML = '<svg viewBox="0 0 300 300">' + sc.svg + '</svg>';
    root.appendChild(vis);

    var t = 1.2;
    for (var n = 0; n < sc.L.length; n++) {
      var line = sc.L[n];
      var cls = 'l';
      if (line.slice(0, 2) === 's:') { cls = 'l s'; line = line.slice(2); }
      else if (line.slice(0, 2) === 'b:') { cls = 'l b'; line = line.slice(2); }
      else if (line.slice(0, 2) === 'm:') { cls = 'l m'; line = line.slice(2); }
      var node = el('div', cls);
      node.appendChild(wordNodes(line, t));
      root.appendChild(node);
      t += 0.3 + line.split(/\s+/).filter(Boolean).length * 0.08;
    }
    return root;
  }

  function buildProgress() {
    prog.innerHTML = '';
    for (var n = 0; n < S.length; n++) {
      var seg = el('div', 'seg');
      var bar = el('div', 'bar');
      seg.appendChild(bar);
      prog.appendChild(seg);
    }
  }

  function tick() {
    if (paused) return;
    var now = Date.now();
    elapsed += now - lastFrame;
    lastFrame = now;
    var bar = prog.children[i] && prog.children[i].firstChild;
    if (bar) bar.style.width = Math.min(100, (elapsed / S[i].d) * 100) + '%';
    raf = requestAnimationFrame(tick);
  }

  function go(n) {
    clearTimeout(timer);
    cancelAnimationFrame(raf);
    if (current) {
      var old = current;
      old.classList.add('out');
      setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 700);
    }

    i = (n + S.length) % S.length;
    var sc = S[i];

    stage.setAttribute('data-t', sc.t);
    current = build(sc);
    layer.appendChild(current);

    for (var b = 0; b < prog.children.length; b++) {
      prog.children[b].firstChild.style.width = b < i ? '100%' : '0%';
    }

    paused = false;
    document.body.classList.remove('paused');
    elapsed = 0;
    lastFrame = Date.now();
    tick();

    timer = setTimeout(function () { go(i + 1); }, sc.d);
  }

  function pause() {
    if (paused) return;
    paused = true;
    clearTimeout(timer);
    cancelAnimationFrame(raf);
    remaining = Math.max(0, S[i].d - elapsed);
    document.body.classList.add('paused');
  }

  function resume() {
    if (!paused) return;
    paused = false;
    document.body.classList.remove('paused');
    lastFrame = Date.now();
    raf = requestAnimationFrame(tick);
    timer = setTimeout(function () { go(i + 1); }, remaining);
  }

  function toggle() { if (paused) resume(); else pause(); }

  var idle;
  function wake() {
    if (document.body.classList.contains('hideui')) return;
    document.body.classList.add('show');
    clearTimeout(idle);
    idle = setTimeout(function () { document.body.classList.remove('show'); }, 1800);
  }
  window.addEventListener('mousemove', wake);
  window.addEventListener('touchstart', wake);

  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    else if (e.code === 'ArrowRight') { e.preventDefault(); go(i + 1); }
    else if (e.code === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
    else if (e.key === 'r' || e.key === 'R') { go(0); }
    else if (e.key === 'h' || e.key === 'H') {
      document.body.classList.toggle('hideui');
      document.body.classList.remove('show');
    }
  });

  var buttons = document.querySelectorAll('#ui button');
  for (var q = 0; q < buttons.length; q++) {
    buttons[q].addEventListener('click', function () {
      var action = this.getAttribute('data-a');
      if (action === 'toggle') toggle();
      else if (action === 'next') go(i + 1);
      else if (action === 'prev') go(i - 1);
      else if (action === 'restart') go(0);
    });
  }

  buildProgress();
  go(0);
})();
`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build the standalone single-file document: one .html, no frameworks, no
 * external libraries, Google Fonts the only remote asset.
 */
export function buildDocument(scenes: Scene[], options: { title?: string } = {}): string {
  const title = escapeHtml(options.title ?? "Content Engine");
  const data = JSON.stringify(scenes).replace(/</g, "\\u003c");
  const theme = scenes[0]?.t ?? "d";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark" />
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
<style>${ENGINE_CSS}</style>
</head>
<body>
<div id="stage" data-t="${theme}">
  <div id="scenes"></div>
  <div id="prog"></div>
  <div id="ui">
    <button type="button" data-a="toggle">Pause</button>
    <button type="button" data-a="prev">Prev</button>
    <button type="button" data-a="next">Next</button>
    <button type="button" data-a="restart">Restart</button>
  </div>
</div>
<script>window.__SCENES__=${data};</script>
<script>${RUNTIME_JS}</script>
</body>
</html>`;
}
