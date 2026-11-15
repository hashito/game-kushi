/* game-kit 0641622: js/mg-trace-path.js — edit in game-kit and run tools/kit-sync.js */
// Library mini game "trace-path" (standard 1.8.2: a talisman's brush stroke, a cut along a line, the thread of a seal): trace the line from
// its start to its end without leaving it. Leaving the line only stops the stroke there: start again from where it stopped (nothing lost).
// Mouse / touch drag; with the keyboard (or the button), hold Space / E to move the brush along the line.
//   cfg: title, help, points ([[x, y], ...] 0..1 in the box: the line; default a zigzag), tol (0.07: how far off the line is allowed),
//        look: 'brush' (default) | 'cut' | 'thread', ok / off (the lines)
//   hooks: { sound(name, ctx) }  name = 'draw' | 'off' | 'ok'
import { mgFrame } from './mg-frame.js';

const DEF = [[0.08, 0.7], [0.25, 0.3], [0.45, 0.62], [0.62, 0.25], [0.8, 0.55], [0.92, 0.3]];
const lengths = (pts) => { const l = []; for (let i = 1; i < pts.length; i++) l.push(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return l; };
/** distance from p to the polyline pts, and how far along it (0..1) the nearest point is */
export function nearest(pts, p) {
  const lens = lengths(pts), total = lens.reduce((a, b) => a + b, 0) || 1;
  let best = { d: Infinity, t: 0 }, acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9;
    const u = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / l2)), d = Math.hypot(ax + dx * u - p[0], ay + dy * u - p[1]);
    if (d < best.d) best = { d, t: (acc + lens[i - 1] * u) / total };
    acc += lens[i - 1];
  }
  return best;
}
/** the point at t (0..1) along the polyline */
export function pointAt(pts, t) {
  const lens = lengths(pts); let want = Math.max(0, Math.min(1, t)) * lens.reduce((a, b) => a + b, 0);
  for (let i = 1; i < pts.length; i++) {
    if (want <= lens[i - 1] || i === pts.length - 1) { const u = lens[i - 1] ? Math.min(1, want / lens[i - 1]) : 0; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u]; }
    want -= lens[i - 1];
  }
  return pts[pts.length - 1];
}
/** one step of the stroke: progress grows only while the pen is on the line and close to where the stroke has reached */
export function traceStep(progress, p, pts, tol = 0.07) {
  const n = nearest(pts, p);
  if (n.d > tol) return { progress, off: true };
  if (n.t > progress + 0.12) return { progress, off: false };   // ahead along the line: wait for the pen to come along it
  return { progress: Math.max(progress, n.t), off: false };
}
export const tracePathOk = (progress) => progress >= 0.985;

export default {
  type: 'trace-path',
  about: '線からはみ出さずに、始めから終わりまでなぞる',
  mount(host, cfg = {}, ctx = {}, hooks = {}) {
    return new Promise((done) => {
      const pts = cfg.points || DEF, tol = cfg.tol ?? 0.07, snd = (n) => hooks.sound && hooks.sound(n, ctx);
      let prog = 0, drawing = false, raf = 0, keyHeld = false;
      const f = mgFrame(host, { cfg, ctx, title: cfg.title || '線をなぞる', help: cfg.help || '丸い印から、線をはみ出さずに終わりまでなぞってください。キーでは Space か E を押している間、筆が線の上を進みます。' }, (ok) => { cancelAnimationFrame(raf); done(ok); });
      const W = 400, H = 260, P = (q) => `${(q[0] * W).toFixed(1)},${(q[1] * H).toFixed(1)}`, line = pts.map(P).join(' ');
      f.body.innerHTML = `<div class="mgx-trace mgx-trace--${cfg.look || 'brush'}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="なぞる線">
        <polyline class="mgx-trace-guide" points="${line}" style="stroke-width:${(tol * 2 * H).toFixed(0)}px"/>
        <polyline class="mgx-trace-line" points="${line}"/>
        <polyline class="mgx-trace-ink" points=""/>
        <circle class="mgx-trace-end" cx="${pts.at(-1)[0] * W}" cy="${pts.at(-1)[1] * H}" r="12"/>
        <circle class="mgx-trace-pen" r="12" cx="${pts[0][0] * W}" cy="${pts[0][1] * H}"/></svg>
        <button type="button" class="btn mgx-trace-key">押している間、筆を進める</button></div>`;
      const svg = f.body.querySelector('svg'), ink = f.body.querySelector('.mgx-trace-ink'), pen = f.body.querySelector('.mgx-trace-pen'), keyBtn = f.body.querySelector('.mgx-trace-key');
      const draw = () => { const a = []; for (let i = 0; i <= 40; i++) a.push(P(pointAt(pts, (i / 40) * prog))); ink.setAttribute('points', a.join(' ')); const q = pointAt(pts, prog); pen.setAttribute('cx', q[0] * W); pen.setAttribute('cy', q[1] * H); };
      const finish = () => {
        if (!tracePathOk(prog) || f.done) return false;
        prog = 1; draw(); drawing = false; keyHeld = false; snd('ok'); f.say(cfg.ok || '最後まで、きれいに引けた。'); f.win(600); return true;
      };
      const at = (e) => { const r = svg.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
      svg.addEventListener('pointerdown', (e) => {
        e.preventDefault(); const n = nearest(pts, at(e));
        if (n.d <= tol * 1.5 && n.t <= prog + 0.06) { drawing = true; svg.setPointerCapture && svg.setPointerCapture(e.pointerId); f.say(''); }
        else f.say('筆は、止まっているところ（丸い印）から引いてください。');
      });
      svg.addEventListener('pointermove', (e) => {
        if (!drawing || f.done) return;
        const s = traceStep(prog, at(e), pts, tol);
        if (s.off) { drawing = false; snd('off'); f.miss(); f.say(cfg.off || 'はみ出した。止まったところから、もう一度。'); return; }
        if (s.progress > prog) { prog = s.progress; snd('draw'); draw(); finish(); }
      });
      const up = () => { drawing = false; };
      svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
      // keyboard / one button: hold to move the brush steadily along the line
      const tick = () => { if (f.done) return; if (keyHeld) { prog = Math.min(1, prog + 0.006); draw(); if (finish()) return; } raf = requestAnimationFrame(tick); };
      keyBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); keyHeld = true; });
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) keyBtn.addEventListener(ev, () => { keyHeld = false; });
      f.on('keydown', (e) => { if (e.code === 'Space' || e.code === 'KeyE') { e.preventDefault(); keyHeld = true; } });
      f.on('keyup', (e) => { if (e.code === 'Space' || e.code === 'KeyE') keyHeld = false; });
      draw();
      if (ctx.qa) return f.end(true);
      keyBtn.focus(); raf = requestAnimationFrame(tick);
    });
  },
};
