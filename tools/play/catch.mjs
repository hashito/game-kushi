// #15 repro (2.0 basement): get caught by 千草さん (real flow, no ?qa: catch close-up, death card, retry) and check the game goes on:
// the player can move, she is back where the phase starts, the charms are as they were, and the phase can still be won.
//   node tools/probe.mjs --query "scene=escape" --out D:/kushi-stages/catch --steps tools/play/catch.mjs                (the run back)
//   CATCH=flue node tools/probe.mjs --query "scene=flue" --out D:/kushi-stages/catch-flue --steps tools/play/catch.mjs  (燻しの間)
import { helpers } from './lib.mjs';
export default async (api) => {
  const { p, G, sleep, log, shot } = api, H = helpers(api);
  const flue = process.env.CATCH === 'flue';
  const S = () => G('({ room: g.state.room, mode: kc.gh.mode, gr: kc.gh.room, gx: +kc.gh.x.toFixed(1), gz: +kc.gh.z.toFixed(1), x: +g.camera.position.x.toFixed(1), z: +g.camera.position.z.toFixed(1), ibu: kc.sealN("K_IBU"), flueS: kc.sealN("K_FLUE"), fluePeeled: kc.peeled.includes("F_FLUE"), fuda: kc.fuda, blocked: g.blocked(), deaths: g.state.deaths, card: !!document.querySelector(".gf-mo-card"), tasks: g.state.tasks.slice(-2) })');
  await G(`(document.getElementById('start-btn').click(), 1)`); await sleep(2500);
  await H.idle(8000);
  log('start', await S());
  let res = 'ok';
  for (let round = 1; round <= 3; round++) {
    if (flue) { await H.walkTo(7.5, -11.9); await H.use(7.5, -12.9, 0.45, { noIdle: true }); await sleep(1500); log('peeled flue', await S()); }
    let caught = false;
    for (let i = 0; i < 220; i++) { const s = await S(); if (s.card) { caught = true; log('caught', round, s); break; } await sleep(300); }
    if (!caught) { log('not caught', await S()); res = 'not-caught'; break; }
    for (let i = 0; i < 40 && !(await G('!!document.querySelector(".gf-mo-card button")')); i++) await sleep(300);
    await sleep(600); await shot(`card-${round}`);
    await G(`(() => { const b = document.querySelector('.gf-mo-card button'); if (b) b.click(); return 1; })()`);
    await sleep(1500); await H.idle(8000); await shot(`after-${round}`);
    const a = await S(); log('after', a);
    if (a.blocked || a.card) { res = 'SOFTLOCK blocked'; break; }
    if (flue && (a.mode !== 'cage' || a.fluePeeled || a.ibu !== 0)) res = 'flue phase not reset';
    if (!flue && (a.mode !== 'hunt' || a.ibu < 1 || a.flueS < 1 || a.room !== 'OKUMURO')) res = 'hunt phase not reset';
    const p0 = await H.pos(); await p.key('KeyW', 'down'); await sleep(800); await p.key('KeyW', 'up'); const p1 = await H.pos();
    const mv = Math.hypot(p1.x - p0.x, p1.z - p0.z); log('moved', mv.toFixed(2));
    if (mv < 0.2) { res = 'SOFTLOCK cannot move'; break; }
    if (res !== 'ok') break;
  }
  // and the phase can still be won after the catches
  if (res === 'ok' && flue) {
    await H.walkTo(7.5, -11.9); await H.use(7.5, -12.9, 0.45, { noIdle: true }); await sleep(900);
    await H.route([[5.0, -10.4], [4.0, -9.0], [2.6, -8.6]], { run: true });
    await H.use(3.505, -8.43, 1.3, { noIdle: true }); log('pasted', await S());
    for (let i = 0; i < 60 && !(await G('g.state.tasks.includes("T_TRAP")')); i++) await sleep(300);
    await H.idle(15000); const s = await S(); log('trap', s); if (!s.tasks.includes('T_TRAP') && s.mode !== 'trapped') res = 'could not trap after catches';
  }
  if (res === 'ok' && !flue) {
    await G('(g.setLight(true), 1)'); await sleep(1600);
    const ok = await H.route([[2.6, -20.5], [2.6, -9.0], [2.6, -0.6], [6.6, 0.9]], { run: true });
    await shot('at-ladder'); await H.use(6.6, -0.5, 1.2, { noIdle: true }); await sleep(2500);
    // 2.2: caught upstairs = death and a retry from the top of the ladder; stand still once to be caught, then run to 店の間
    for (let i = 0; i < 40 && (await G('!g.state.flags.includes("chase2")')); i++) await sleep(300);
    let cardUp = false; for (let i = 0; i < 100 && !(cardUp = await G('!!document.querySelector(".gf-mo-card")')); i++) await sleep(300);
    log('caught upstairs', cardUp, await G('(document.querySelector(".gf-mo-card") || {}).textContent'), await G('g.checkpoint && g.checkpoint.floor')); await shot('caught-up');
    for (let i = 0; i < 8 && (await G('g.blocked()')); i++) { await H.closeWindows(); await sleep(600); }
    if (!cardUp) res = 'not caught upstairs';
    log('after retry', await S()); await shot('retry-up');
    await H.route([[5.3, 4.0], [5.3, 5.75], [5.3, 7.4], [5.3, 12.0], [5.3, 14.0], [3.9, 19.0], [3.9, 21.0], [4.6, 22.6]], { run: true });
    for (let i = 0; i < 40 && !(await G('g.state.tasks.includes("T_ESCAPE")')); i++) await sleep(300);
    const s = await S(); log('escape', ok, s); if (!(await G('g.state.tasks.includes("T_ESCAPE")'))) res = 'could not escape after catches';
  }
  log('RESULT', res);
};
