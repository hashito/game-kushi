// The basement must be readable (play 2026-11-21: 「地下室が真っ暗で見えずどこで何するか分かりづらいです」): every basement step's test scene,
// shot, and measured: the light around the player and around the next goal (dot/js/dot/guide.js: D.guide) must not fall to black.
//   node tools/probe.mjs --public --path dot/ --size 1280x800 --out <dir> --steps tools/dot/basement-steps.mjs   (BASE_SCENES=muro,doro picks)
import { lumaSource, LUMA_MIN, LUMA_DARK } from './scene-luma.mjs';
const SCENES = ['muro', 'doro', 'koshi', 'ita', 'ibushi', 'flue', 'wax', 'okumuro', 'shelf', 'escape', 'escape-doro'];
export default async ({ p, G, sleep, log, shot, base }) => {
  const pick = (process.env.BASE_SCENES || '').split(',').filter(Boolean);
  const rows = [];
  for (const sc of SCENES) {
    if (pick.length && !pick.includes(sc)) continue;
    await p.goto(`${base}?scene=${sc}&qa=1`);
    await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 120000);
    await sleep(2500);
    for (let i = 0; i < 6 && (await G('g.blocked()')); i++) { await G(`(document.querySelectorAll('.wm-layer .btn.primary, #gf-reader .tl-close').forEach((b) => b.click()), 1)`); await sleep(500); }
    await sleep(1200);
    const top = await G('!!(window.__dot && window.__dot.topCam)');
    const ahead = top ? '0' : '1.4';
    const r = await G(lumaSource({
      camera: top ? 'window.__dot.topCam' : 'g.camera',
      points: {
        player: `(() => { const c = g.camera.position, f = g.world.floorY(g.floor); return [c.x - Math.sin(g.fp.yaw) * ${ahead}, f + ${top ? 0.8 : 0.5}, c.z - Math.cos(g.fp.yaw) * ${ahead}]; })()`,
        // beside the spot ahead (one dark object right in front - a rack's bar - is not the room being black): the brightest of the three counts
        playerL: `(() => { const c = g.camera.position, f = g.world.floorY(g.floor), a = g.fp.yaw; return [c.x - Math.sin(a) * ${ahead} - Math.cos(a) * 0.7, f + ${top ? 0.8 : 0.5}, c.z - Math.cos(a) * ${ahead} + Math.sin(a) * 0.7]; })()`,
        playerR: `(() => { const c = g.camera.position, f = g.world.floorY(g.floor), a = g.fp.yaw; return [c.x - Math.sin(a) * ${ahead} + Math.cos(a) * 0.7, f + ${top ? 0.8 : 0.5}, c.z - Math.cos(a) * ${ahead} - Math.sin(a) * 0.7]; })()`,
        goal: `(() => { const d = window.__dot && window.__dot.guide; return d && d.on && d.at ? [d.at[0], g.world.floorY(0) + 1.15, d.at[1]] : null; })()`,   // the beacon's glow (dot/js/dot/guide.js: 1.15 m)
      },
      box: 0.07,
    }));
    const guide = await G('JSON.stringify(window.__dot && window.__dot.guide)');
    log(sc, JSON.stringify(r), guide);
    await shot(sc);
    if (r.error) { log('ERROR', sc, r.error); continue; }
    const P = [r.points.player, r.points.playerL, r.points.playerR].filter((x) => x && x.on).sort((a, b) => b.mean - a.mean)[0] || r.points.player, Q = r.points.goal, MIN = (await G('!!g.lightOn')) ? LUMA_MIN : LUMA_DARK;   // before the candle: the one dark beat
    if (P.on && P.mean < MIN.player) log('ERROR', `${sc}: around the player too dark (${P.mean} < ${MIN.player})`);
    if (Q.on && Q.mean < MIN.goal) log('ERROR', `${sc}: around the next goal too dark (${Q.mean} < ${MIN.goal})`);
    if (r.frame < MIN.frame) log('ERROR', `${sc}: the whole picture too dark (${r.frame} < ${MIN.frame})`);
    if (!JSON.parse(guide || '{}').on) log('WARN', `${sc}: no next-goal glow`);
    rows.push([sc, P.mean, Q.on ? Q.mean : '-', r.frame, r.black]);
  }
  log('LUMA', JSON.stringify(rows));
};
