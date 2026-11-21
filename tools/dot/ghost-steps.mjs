// 千草 in the dot versions: wait in the passage with her comb (?scene=escape) and let her come; a shot every 0.7 s from the moment
// she is within 7 m, then the catch (the player's caught motion, the close-up, the death card) and the retry.
//   node tools/probe.mjs --public --path dot/ --query scene=escape\&dotscript=1 --out <dir> --steps tools/dot/ghost-steps.mjs
import { helpers } from '../play/lib.mjs';

export default async (api) => {
  const { G, sleep, log, shot } = api, H = helpers(api);
  const S = () => G('({ mode: kc.gh.mode, d: +Math.hypot(kc.gh.x - g.camera.position.x, kc.gh.z - g.camera.position.z).toFixed(2), vis: !!(kc.chigusa && kc.chigusa.root.visible), her: window.__dot.figures.chigusa && window.__dot.figures.chigusa.anim.frame, me: window.__dot.figures.worker.anim.frame, herY: kc.chigusa && +kc.chigusa.root.position.y.toFixed(3), floorY: +g.world.floorY(0).toFixed(3), card: !!document.querySelector(".gf-mo-card") })');
  await G(`(document.getElementById('start-btn').click(), 1)`); await sleep(2500);
  await H.idle(8000);
  log('start', await S());
  let n = 0;
  for (let i = 0; i < 260; i++) {
    const s = await S();
    if (s.card) { log('caught', s); break; }
    if (s.vis && s.d < 7 && n < 8 && i % 2 === 0) { n++; log('near', s); await shot(`near-${n}`); }
    await sleep(350);
  }
  await sleep(300); await shot('card');
  await G(`(() => { const b = document.querySelector('.gf-mo-card button'); if (b) b.click(); return 1; })()`);
  await sleep(1500); await H.idle(8000); await shot('after');
  log('after', await S());
};
