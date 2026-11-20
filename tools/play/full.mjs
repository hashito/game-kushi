// The whole game from the title through real input (keys inside the page; mini games are done at once with ?qa=1):
//   node tools/probe.mjs --qa --out D:/kushi-stages/play-e1 --steps tools/play/full.mjs
// PLAY_END = give (E1, default) | keep (E2) | free (E3: reads the letters on the way). PLAY_UPTO = L2 | L3 | L4 stops early.
// Every key point gets a screenshot. PLAY_RESUME=1 also reloads the page in the middle of the basement (the flue running; the run back) and
// goes on from つづきから: the phase starts over, nothing is stuck.
import { helpers } from './lib.mjs';

export default async (api) => {
  const { p, G, sleep, log, shot } = api, H = helpers(api);
  const END = process.env.PLAY_END || 'give', LET = END === 'free', UPTO = process.env.PLAY_UPTO || '';
  const st = async (tag) => log(tag, await G(`({ room: g.state.room, n: g.state.tasks.length, last: g.state.tasks.slice(-3), level: g.prog.index, fuda: kc.fuda, prompt: document.getElementById('prompt').textContent, ended: g.state.ended, inv: g.state.inv.join(" ") })`));
  const must = async (task) => { const ok = await G(`g.state.tasks.includes('${task}')`); if (!ok) throw new Error(`ERROR ${task} not done: ${JSON.stringify(await G('({ room: g.state.room, tasks: g.state.tasks, prompt: document.getElementById("prompt").textContent })'))}`); };
  const choose = async (id) => { for (let i = 0; i < 40; i++) { const ok = await G(`(() => { const b = document.querySelector('.gf-talk-choice[data-id="${id}"]'); if (b) { b.click(); return true; } return false; })()`); if (ok) return true; await sleep(250); } log('  no choice', id); return false; };
  // ?qa=1: ctx.choose opens nothing and answers window.__gfChoice at once, so the answers are queued before the [E] that asks
  const pre = (ids) => G(`(window.__gfQ = ${JSON.stringify(ids)}, Object.getOwnPropertyDescriptor(window, '__gfChoice') || Object.defineProperty(window, '__gfChoice', { configurable: true, get() { return (window.__gfQ || []).shift(); } }), 1)`);
  const use = async (x, z, y, tag) => { let pr = ''; for (let i = 0; i < 3 && !pr; i++) { if (i) await sleep(600); pr = await H.use(x, z, y); } log(' ', tag || 'use', '|', pr); return pr; };   // an empty prompt (a line still on screen, a step short) is tried again
  const peel = async (x, z, y = 1.45) => { const pr = await H.use(x, z, y, { wait: 1400 }); log('  peel |', pr); };
  const RES = !!process.env.PLAY_RESUME;
  const reload = async (tag) => {
    await sleep(1200); log(`reload (${tag})`, await G('({ mode: kc.gh.mode, ibu: kc.sealN("K_IBU"), flue: kc.peeled.includes("F_FLUE"), fuda: kc.fuda, tasks: g.state.tasks.length })'));
    await p.goto(api.base + '?qa=1'); await p.waitFor("document.getElementById('continue-btn') && !document.getElementById('start-btn').disabled", 120000);
    await G(`(document.getElementById('continue-btn').click(), 1)`); await sleep(2500); await H.idle();
    const s = await G('({ room: g.state.room, mode: kc.gh.mode, gr: kc.gh.room, ibu: kc.sealN("K_IBU"), flueS: kc.sealN("K_FLUE"), flue: kc.peeled.includes("F_FLUE"), fuda: kc.fuda, tasks: g.state.tasks.length, blocked: g.blocked(), pos: [g.camera.position.x.toFixed(1), g.camera.position.z.toFixed(1)].join(",") })');
    log(`resumed (${tag})`, s); await shot(`resumed-${tag}`); return s;
  };
  const where = async () => log('  at', JSON.stringify(await H.pos()));
  
  await G(`(document.getElementById('start-btn').click(), 1)`);
  await sleep(1800); await shot('opening-1');
  await H.idle(); await sleep(400);
  await shot('omote-start'); await st('start');
  // ---- L1 ----
  await H.walkTo(3.6, 23.4); await H.walkTo(4.9, 23.2); await H.face(5.7, 22.5, 1.0); await sleep(300); await shot('choba');
  await use(5.7, 22.55, 1.0, 'T_CHOBA'); await must('T_CHOBA');
  await H.walkTo(4.2, 21.2); await H.face(4.43, 20.08, 1.45); await sleep(300); await shot('naka-fuda');
  await peel(4.43, 20.08); await H.idle(); await must('T_PEEL1');
  await H.walkTo(4.2, 21.2); await use(4.43, 20.1, 1.3, 'paste K_NAKA'); await H.idle(); await shot('naka-pasted');
  await use(4.43, 20.1, 1.3, 'peel K_NAKA'); await H.idle(); await must('T_PASTE1');
  await st('L1 done');
  // ---- L2: the kitchen ----
  await H.walkTo(3.6, 22.8); await H.walkTo(1.4, 21.2); await peel(1.88, 20.08); await H.idle();
  await H.walkTo(1.3, 19.2); await H.walkTo(1.5, 17.7); await shot('hashiri');
  await use(2.25, 17.7, 1.0, 'TESHOKU'); await H.idle();
  if (LET) { await H.walkTo(1.5, 18.4); await use(2.25, 18.4, 0.62, 'LETTER1'); await H.idle(); }
  await H.walkTo(1.4, 15.4); await use(0.5, 15.4, 0.85, 'MATCHES'); await H.idle(); await must('T_HASHIRI');
  // the back rooms
  await H.route([[1.3, 19.4], [1.3, 21.0], [1.7, 23.0], [3.6, 23.0], [3.9, 21.0], [3.9, 19.0]]);
  await shot('naka');
  await H.walkTo(5.4, 14.0); await peel(5.83, 13.08); await H.idle(); await H.walkTo(5.3, 12.0);
  await H.walkTo(6.5, 11.6); await use(7.35, 11.6, 0.42, 'DOC_DIARY'); await H.idle(); await must('T_OKU'); await shot('oku');
  if (LET) { await H.walkTo(3.0, 8.0); await use(3.3, 7.05, 1.05, 'LETTER2'); await H.idle(); }
  await H.walkTo(5.4, 7.4); await peel(5.83, 6.58); await H.idle(); await H.walkTo(5.3, 5.75);
  await H.walkTo(5.0, 5.9); await peel(5.83, 5.08); await H.idle(); await H.walkTo(5.3, 4.0); await H.idle();
  await must('T_SAGYO'); await shot('sagyo');
  await H.walkTo(6.6, 3.9); await use(7.5, 3.9, 0.9, 'KOTEKO'); await H.idle();
  await H.walkTo(1.3, 1.6); await H.face(0.45, 1.6, 0.86); await sleep(300); await shot('kakekushi'); await use(0.45, 1.6, 0.86, 'KAKE_KUSHI'); await H.idle();
  if (LET) { await H.walkTo(2.6, 3.6); await use(2.6, 4.5, 0.75, 'LETTER3'); await H.idle(); }
  // the phone
  await sleep(3000); await H.idle();
  await H.route([[5.3, 4.2], [5.3, 5.75], [5.3, 7.4], [5.3, 12.0], [5.3, 14.0], [3.6, 14.2]]); await shot('phone');
  await use(3.15, 13.55, 0.7, 'T_PHONE'); await H.idle(); await must('T_PHONE'); await shot('after-phone');
  if (LET) { await H.walkTo(6.5, 16.5); await use(7.45, 16.5, 0.9, 'T_SQ1'); await H.idle(); const lt = await G('g.state.flags.includes("letters")'); log('  letters', lt); if (!lt) throw new Error('ERROR letters not read'); }
  // the mill and the hatch
  await H.route([[5.3, 14.0], [5.3, 12.0], [5.3, 7.4], [5.3, 5.75], [5.3, 4.0], [6.6, 1.0]]);
  await H.face(6.6, -0.5, 0.4); await sleep(300); await shot('usu');
  await use(6.6, -0.5, 0.4, 'T_USU'); await H.idle(); await sleep(1500); await must('T_USU');
  await use(6.6, -0.5, 0.1, 'T_HATCH'); await H.idle(); await must('T_HATCH'); await shot('hatch-open');
  await st('L2 done'); if (UPTO === 'L2') return;
  // ---- L3: down ----
  await use(6.6, -0.5, 0.3, 'ladder down'); await sleep(1500); await H.idle(); await st('muro'); await shot('muro-dark');
  await use(5.2, 1.6, 0.35, 'T_LIGHT'); await H.idle(); await must('T_LIGHT'); await shot('muro-lit');
  await H.face(6.6, -0.5, 3.0); await sleep(300); await shot('muro-scratches');
  await H.walkTo(1.9, 3.7); await H.face(1.24, 3.7, 1.05); await sleep(300); await shot('hikae-shelf');
  await use(1.24, 3.7, 1.05, 'DOC_HIKAE'); await H.idle(); await H.idle(); await must('T_HIKAE');
  await H.walkTo(2.8, 0.2); await peel(3.22, -0.905); await H.idle(); await must('T_DORO');
  const t0 = Date.now();
  await H.walkTo(2.6, -6.0, { onStep: () => H.idle(200).then(() => false) }); await shot('doro');
  await H.walkTo(2.6, -16.0, { onStep: () => H.idle(200).then(() => false) }); await sleep(1500); await shot('koshi-coming');
  for (let i = 0; i < 40 && !(await G('g.state.tasks.includes("T_KOSHI_SEE")')); i++) { await sleep(500); if (i === 6) await shot('koshi-press'); await H.idle(500); }
  await H.idle(); await must('T_KOSHI_SEE');
  if (LET) {   // the side room: three charms off the walls (T_SQ2)
    await H.walkTo(2.3, -5.43); await peel(1.695, -5.43); await H.idle(); await H.walkTo(0.4, -6.0); await shot('ita');
    await H.walkTo(-3.6, -7.2); await peel(-4.31, -7.2, 1.5); await H.idle(); await H.walkTo(-3.6, -5.0); await peel(-4.31, -5.0, 1.5); await H.idle();
    await H.walkTo(-2.0, -8.2); await peel(-2.0, -8.91, 1.5); await H.idle(); await must('T_SQ2'); await H.walkTo(0.4, -6.0); await H.walkTo(2.6, -6.0);
  }
  await H.walkTo(2.6, -8.43); await peel(3.505, -8.43); await H.idle(); await H.walkTo(5.0, -9.0); await shot('ibushi');
  await H.route([[5.0, -10.4], [8.4, -10.4], [8.4, -9.0]]); await use(8.95, -9.0, 1.0, 'T_LURE'); await H.idle(); await must('T_LURE'); await shot('lure');
  await H.walkTo(7.5, -11.9); await H.face(7.5, -12.91, 0.45); await sleep(300); await shot('flue-charm');
  await H.use(7.5, -12.91, 0.45, { noIdle: true, wait: 1200 }); log('  flue |', await G('kc.gh.mode'));
  if (RES) {
    const r = await reload('flue'); if (r.mode !== 'cage' || r.flue || r.ibu) throw new Error('ERROR flue phase not reset on resume');
    await H.walkTo(7.5, -11.9); await H.use(7.5, -12.91, 0.45, { noIdle: true, wait: 1200 }); log('  flue again |', await G('kc.gh.mode'));
  }
  await H.route([[5.0, -10.4], [4.0, -9.0], [2.6, -8.6]], { run: true });
  await use(3.505, -8.43, 1.3, 'paste K_IBU'); await shot('ibu-sealed');
  for (let i = 0; i < 60 && !(await G('g.state.tasks.includes("T_TRAP")')); i++) { await sleep(500); if (i === 4) await shot('flue-bells'); }
  await H.idle(); await must('T_TRAP'); await H.idle();
  await H.walkTo(2.6, -17.6); await G('(g.setLight(true), 1)'); await sleep(1500); await shot('koshi-wax');
  await use(2.6, -18.6, 1.3, 'T_KOSHI'); await H.idle(); await must('T_KOSHI'); await sleep(1500); await H.idle(); await shot('koshi-open');
  await H.walkTo(2.6, -21.0); await H.idle(); await must('T_OKUMURO'); await H.idle();
  await H.walkTo(5.5, -20.0); await use(5.5, -19.09, 0.45, 'paste K_FLUE'); await H.idle(); await must('T_FLUE2');
  log('basement (s):', ((Date.now() - t0) / 1000).toFixed(0));
  await H.walkTo(2.6, -25.5); await H.face(2.6, -26.3, 1.1); await sleep(300); await shot('okumuro-shelf');
  await st('L3 done'); if (UPTO === 'L3') return;
  // ---- L4: the comb and the run ----
  await use(2.6, -26.3, 1.1, 'T_BOX'); await sleep(800); await H.idle(); await must('T_BOX'); await shot('rise');
  const runTo = (x, z, o = {}) => H.walkTo(x, z, { run: true, ...o });
  if (RES) { await runTo(2.6, -21.0); const r = await reload('hunt'); if (r.mode !== 'hunt' || r.ibu < 1 || r.blocked) throw new Error('ERROR hunt phase not restored on resume'); }
  await runTo(2.6, -21.0); await runTo(2.6, -10.0); await shot('run-ibu'); await runTo(2.6, -1.6); await runTo(2.6, -0.1); await runTo(6.6, 0.9);
  await use(6.6, -0.5, 1.2, 'ladder up'); await sleep(1500);
  log('dead?', await G('({ room: g.state.room, deaths: g.state.deaths })'));
  await H.idle(); await must('T_ESCAPE'); await shot('seal-bar');
  await use(6.6, -0.5, 0.1, 'T_SEAL'); await H.idle(); await must('T_SEAL');
  await st('L4 done'); if (UPTO === 'L4') return;
  // ---- L5 ----
  if (END === 'give') {
    await H.route([[5.3, 4.0], [5.3, 5.75], [5.3, 7.4], [5.3, 12.0], [5.3, 14.0], [3.9, 19.0], [3.9, 21.0], [4.9, 23.2]]);
    await pre(['give']); await use(5.7, 22.5, 1.0, 'T_END give'); await sleep(800); await H.idle();
  } else {
    await H.walkTo(1.6, 2.2); await pre(['away', 'muro', 'shut', 'haru', 'burn']); await use(0.75, 2.2, 0.9, 'T_THINK'); await sleep(800);
    await H.idle(1500);
    await H.idle(1500); log('  think answers left', await G('window.__gfQ.length'));
    await H.idle(); await must('T_THINK'); await shot('think-done');
    await H.walkTo(6.6, 1.0); await pre(['yes']); await use(6.6, -0.5, 0.1, 'T_RETURN'); await sleep(800); await H.idle(); await must('T_RETURN'); await shot('returned');
    await H.route([[5.3, 4.0], [5.3, 5.75], [5.3, 7.4], [5.3, 12.0], [5.3, 14.0], [3.9, 19.0], [3.9, 21.0], [4.9, 23.2]]);
    await pre([END]); await use(5.7, 22.5, 1.0, 'T_END ' + END); await sleep(800); await H.idle(3000); await H.idle();
  }
  await sleep(1500); await shot('ending');
  await st('end'); log('ending', await G('g.state.ended && (g.state.endingId || g.state.ending || true)'), await G('g.state.flags.filter((f) => /^end_/.test(f))'));
};
