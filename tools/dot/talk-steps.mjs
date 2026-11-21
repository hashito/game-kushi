// A person is easy to speak to (2026-11-21 「婆さんに話しかけづらいです。領域を増やしてください」): kit tools/talk-ring.mjs at the 帳場.
//   node tools/probe.mjs --public [--path dot/] --out <dir> --steps tools/dot/talk-steps.mjs
import { talkRingSource, TALK_RING_MIN } from './talk-ring.mjs';
export default async ({ p, G, sleep, log, base }) => {
  for (const sc of ['choba', 'end']) {
    await p.goto(`${base}?scene=${sc}&qa=1`);
    await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 120000);
    await sleep(2500);
    for (let i = 0; i < 6 && (await G('g.blocked()')); i++) { await G(`(document.querySelectorAll('.wm-layer .btn.primary, #gf-reader .tl-close').forEach((b) => b.click()), 1)`); await sleep(500); }
    const r = await G(talkRingSource({ radii: [1.0, 1.8, 2.6] }));
    log('TALK', sc, JSON.stringify(r));
    for (const s of r) { const near = ['1', '1.8'].reduce((a, k) => [a[0] + (s.byRadius[k] || [0, 0])[0], a[1] + (s.byRadius[k] || [0, 0])[1]], [0, 0]); const sh = near[0] ? near[1] / near[0] : 0; if (sh < TALK_RING_MIN) log('ERROR', `${sc} ${s.id}: talk picked from only ${(sh * 100).toFixed(0)}% of the spots within 1.8 m`); }
  }
};
