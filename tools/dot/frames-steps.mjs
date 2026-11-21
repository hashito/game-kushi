// The pixel frames' inner margin (playtest: 「ドット版のUIの説明文などの枠からのマージンがほとんどないです」): every framed box of the UI is
// measured in each state (title, the opening window, the HUD with the step guide and the thought band, a thing card, the menu, the map,
// the death card, the ending) with game-kit tools/frame-padding.mjs (copied in tools/dot/frame-padding.mjs): the gap between the frame's
// inner line (border or inset outline) and its text, logged as FRAMES and failing (ERROR) under 14 px (a button: 8 px left / right).
//   node tools/probe.mjs --public --path dot/ --query qa=1 --out <dir> --steps tools/dot/frames-steps.mjs        (add --mobile --size 390x844)
import { framePaddingSource } from './frame-padding.mjs';
import { frameNestSource } from './frame-nest.mjs';   // kit 1.21.0 P32: the inner frame inside the panel, no frame line across the text, no squashed picture
import { helpers } from '../play/lib.mjs';

export default async (api) => {
  const { G, p, sleep, log, shot } = api, H = helpers(api);
  let bad = 0;
  const audit = async (name) => {
    await sleep(500);
    await shot(name);
    const r = await G(framePaddingSource({ box: 14, button: 8 }));   // the dot skin asks a little more than the kit's 12
    log('FRAMES', name, r.length ? JSON.stringify(r) : 'ok');
    bad += r.length;
    const n = await G(frameNestSource());
    log('NEST', name, n.length ? JSON.stringify(n) : 'ok');
    bad += n.length;
  };
  await audit('title');
  await G(`((document.querySelector('#gf-rotate .gf-rot-ok') || { click() {} }).click(), 1)`);
  await G(`(document.getElementById('start-btn').click(), 1)`);
  await sleep(2500);
  await audit('opening');
  await H.idle(); await sleep(600);
  await audit('hud');
  // a thing card: the lattice in front of ハル (a tap on the screen where it is)
  const xy = await G(`(() => { const P = new g.camera.position.constructor(5.85, g.fp.floorY + 1.0, 21.2); const cam = window.__dot && window.__dot.topCam && window.__dot.mode === 'top' ? window.__dot.topCam : g.camera; const v = P.project(cam); return [Math.round((v.x + 1) / 2 * innerWidth), Math.round((1 - v.y) / 2 * innerHeight)]; })()`);
  await p.click(xy[0], xy[1]); await sleep(900);
  await audit('thing-card');   // the look card in the lane (not a window: play goes on)
  await H.idle(); await sleep(300);
  // a document in the reading panel, and ハル's talk window
  await G(`(() => { const ia = g.world.interactables.map((o) => o.userData.interact).find((x) => x && x.kind === 'look'); return ia ? (g.useInteract(ia), 1) : 0; })()`); await sleep(900);
  await audit('reader');
  await G(`((document.querySelector('#gf-reader .tl-close') || { click() {} }).click(), 1)`); await H.idle(); await sleep(300);
  await H.walkTo(3.6, 23.4); await H.walkTo(4.9, 23.2); await H.face(5.7, 22.55, 1.0); await sleep(300);
  await p.key('KeyE'); await sleep(1500);
  await audit('talk');
  await H.idle(); await sleep(300);
  await G(`(g.tm && g.tm.open('tasks'), 1)`); await sleep(500);
  await audit('menu-tasks');
  await G(`(g.tm && g.tm.open('map'), 1)`); await sleep(500);
  await audit('menu-map');
  await H.idle(); await sleep(300);
  await G(`(g.die('kushi_caught'), 1)`); await sleep(1500);
  await audit('death');
  await H.idle(); await sleep(300);
  await G(`(g.setFlag('end_free'), 1)`); await sleep(3500);
  await audit('ending');
  log('FRAMES total', bad);
  if (bad) log('ERROR', `${bad} framed boxes with text closer than the minimum to their frame`);
};
