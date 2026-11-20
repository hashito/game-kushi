// Off-route play: the wrong things a player tries, each answered with a reason and never a dead end (headless, real keys).
//   node tools/probe.mjs --qa --out D:/kushi-stages/offroute --steps tools/play/offroute.mjs
// Starts from the title (the first part) and then jumps between test scenes (?scene=<id>, nothing saved).
import { helpers } from './lib.mjs';

export default async (api) => {
  const { p, G, sleep, log, shot, base } = api, H = helpers(api);
  const say = () => G(`[...document.querySelectorAll('.tl-say, .gf-say, #say, .say, [class*="thought"]')].filter((e) => e.offsetParent).map((e) => e.textContent.trim()).filter(Boolean).slice(-2).join(' / ')`);
  const tryE = async (x, z, y, tag) => { const pr = await H.use(x, z, y); await sleep(700); log(`  ${tag} | prompt: ${pr} | says: ${await say()}`); await shot(tag); };
  const scene = async (id) => { await p.goto(`${base}?qa=1&scene=${id}`); await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 60000); await sleep(2500); await H.idle(); log(`scene ${id}`, JSON.stringify(await H.pos())); };

  // 1. the very start: the front door, a door charm before talking to Haru, the back of the shop
  await G(`(document.getElementById('start-btn').click(), 1)`); await sleep(1800);
  // the map guide's primary button opens the map: a player who just wants to walk presses 歩き出す
  for (let i = 0; i < 20; i++) { await G(`([...document.querySelectorAll('button')].filter((b) => b.offsetParent && /歩き出す/.test(b.textContent)).forEach((b) => b.click()), 1)`); if (!(await G('g.blocked()'))) break; await H.closeWindows(); await sleep(400); }
  await H.idle(); await sleep(400);
  await tryE(0.2, 24.6, 1.2, 'front-door');
  await H.walkTo(3.6, 23.2); await H.walkTo(4.2, 21.2);
  await tryE(4.43, 20.08, 1.45, 'peel-before-haru');
  // 2. the dark: the corridor door with no light; the ledger not read yet
  await scene('muro');
  await H.walkTo(2.8, 0.2); await tryE(3.22, -0.905, 1.45, 'doro-no-light');
  await tryE(5.2, 1.6, 1.0, 'light-at-kiln');
  // 3. Haru without the comb
  await scene('naka'); await H.walkTo(3.6, 21.6); await H.walkTo(4.9, 23.2); await tryE(5.7, 22.5, 1.0, 'haru-no-comb');
  // 4. the lattice while she is behind it; the drying rack before the lattice was seen; the flue charm before the comb is out
  await scene('koshi'); await H.walkTo(2.6, -16.0); await sleep(6000); await H.idle(); await H.idle(); await H.walkTo(2.6, -18.2); await tryE(2.6, -18.6, 1.3, 'koshi-peel-early'); await shot('koshi-view');
  await scene('ibushi'); await H.walkTo(7.5, -11.9); await tryE(7.5, -12.91, 0.45, 'flue-before-lure');
  await H.route([[5.0, -10.4], [8.4, -10.4], [8.4, -9.0]]); await tryE(8.95, -9.0, 1.0, 'lure');
  await H.walkTo(7.5, -11.9); await H.use(7.5, -12.91, 0.45, { noIdle: true, wait: 1200 });
  await H.route([[5.0, -10.4], [4.2, -8.6]]); await tryE(3.505, -8.43, 1.3, 'paste-from-inside');
  // 5. the lattice with the candle out; the shelf before the flue mouth of 奥の室 is charmed
  await scene('wax'); await G('(g.setLight(false), 1)'); await sleep(400); await tryE(2.6, -18.6, 1.3, 'wax-no-light');
  await scene('okumuro'); await H.walkTo(2.6, -25.5); await tryE(2.6, -26.3, 1.1, 'box-before-flue');
  // 6. caught on the run back: stand still and let her come (back to the shelf, the charms as they were, she starts over)
  await scene('escape'); const t0 = Date.now();
  while (Date.now() - t0 < 70000) { const s = await G('({ deaths: g.state.deaths || 0, card: !!document.querySelector(".gf-mo-card, .gf-dead") })'); if (s.deaths || s.card) { log('  caught', JSON.stringify(s)); break; } await sleep(1000); }
  await sleep(1500); await shot('caught');
  await H.idle(6000); log('  after caught', JSON.stringify(await H.pos()), await G('({ comb: g.state.inv.includes("COMB"), fuda: kc.fuda, ibu: kc.sealN("K_IBU"), flue: kc.sealN("K_FLUE"), mode: kc.gh.mode })')); await shot('after-caught');
  // 7. the bench before the hatch is sealed / the return before the thinking
  await scene('bench'); await H.walkTo(6.6, 1.0); await tryE(6.6, -0.5, 0.1, 'return-before-think');
};
