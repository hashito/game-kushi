// Every surface dot, room by room (kit 1.21.0 P33, tools/dot-scene.mjs): the player is put in the middle of each room, the dot pass has its
// two seconds, then every visible material of the scene is checked and the room is shot.
//   node tools/probe.mjs --public --path dot-fps/ --query qa=1 --out <dir> --steps tools/dot/dotscene-steps.mjs
import { dotSceneSource } from '../../dot/js/kit/dot-world.js';
export default async ({ G, sleep, log, shot }) => {
  await G(`(document.getElementById('start-btn').click(), 1)`); await sleep(2500);
  for (let i = 0; i < 20 && (await G('g.blocked()')); i++) { await G(`([...document.querySelectorAll('.wm-layer .btn.primary, #gf-reader .tl-close')].filter((b) => b.offsetParent).slice(0, 1).forEach((b) => b.click()), 1)`); await sleep(500); }
  const rooms = await G(`g.data.plan.rooms.map((r) => [r.id, r.x + r.w / 2, r.z + r.d / 2, r.floor || 0])`);
  let bad = 0;
  for (const [id, x, z, fl] of rooms) {
    await G(`(() => { const y = g.world.floorY ? g.world.floorY(${fl}) : 0; if (g.fp && g.fp.teleport) g.fp.teleport(${x}, y, ${z}); else { g.camera.position.set(${x}, y + 1.5, ${z}); } return 1; })()`);
    await sleep(2300);
    const r = await G(dotSceneSource());
    log('DOTSCENE', id, JSON.stringify(r));
    await shot(`room-${id}`);
    bad += (r.bad || []).length;
  }
  log('DOTSCENE kinds', JSON.stringify(await G(`window.__dot && window.__dot.dotify`)));
  if (bad) log('ERROR', `${bad} non-dot materials`);
};
