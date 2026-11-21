// Off-route play of the top-down dot version with its own controls (no scripted yaw): screen-relative keys into walls and corners,
// [E] with nothing near, [E] at a thing behind the player, a click on a thing on the screen, crouch walking, running, the map.
//   node tools/probe.mjs --public --path dot/ --qa --out <dir> --steps tools/dot/offroute-top.mjs
import { helpers } from '../play/lib.mjs';

export default async (api) => {
  const { p, G, sleep, log, shot } = api, H = helpers(api);
  const st = () => G(`({ x: +g.camera.position.x.toFixed(2), z: +g.camera.position.z.toFixed(2), room: g.state.room, prompt: document.getElementById('prompt').textContent, anim: window.__dot.figures.worker.anim.state, frame: window.__dot.figures.worker.anim.frame, figY: +window.__dot.figures.worker.root.position.y.toFixed(3), floorY: g.fp.floorY, blocked: g.blocked(), tasks: g.state.tasks.length })`);
  const hold = async (keys, ms) => { for (const k of keys) await p.key(k, 'down'); await sleep(ms); const s = await st(); for (const k of keys) await p.key(k, 'up'); return s; };
  await G(`(document.getElementById('start-btn').click(), 1)`);
  await sleep(2500); await H.idle(); await sleep(300);
  log('start', await st());
  // 1. into the west wall and along it, into the corner
  log('walk into the wall (A 2s)', await hold(['KeyA'], 2000)); await shot('wall-west');
  log('corner (A+S 1.5s)', await hold(['KeyA', 'KeyS'], 1500)); await shot('corner');
  // 2. [E] with nothing in front
  await p.key('KeyE'); await sleep(600); log('E at nothing', await st(), await G(`[...document.querySelectorAll('.tl-say, .gf-say, [class*="thought"]')].filter((e) => e.offsetParent).map((e) => e.textContent.trim()).slice(-1)[0] || ''`));
  // 3. arrows and diagonal running
  log('arrows up-right + shift (1.2s)', await hold(['ArrowUp', 'ArrowRight', 'ShiftLeft'], 1200)); await shot('run-diag');
  // 4. crouch walk
  await p.key('KeyC'); await sleep(400);
  log('crouch-walk (D 1s)', await hold(['KeyD'], 1000)); await shot('crouch-walk');
  await p.key('KeyC'); await sleep(500); log('stood up', await st());
  // 5. to the lattice by keys only: up then right until the prompt names Haru (screen-relative moves)
  for (let i = 0; i < 14; i++) {
    const s = await st();
    if (/ハル/.test(s.prompt)) { log('reached Haru by keys', s); break; }
    const dx = 5.4 - s.x, dz = 22.3 - s.z;
    const keys = [...(Math.abs(dx) > 0.2 ? [dx > 0 ? 'KeyD' : 'KeyA'] : []), ...(Math.abs(dz) > 0.2 ? [dz > 0 ? 'KeyS' : 'KeyW'] : [])];
    if (!keys.length) { await hold(['KeyD'], 200); continue; }
    await hold(keys, 350);
  }
  await shot('haru-by-keys');
  // 6. turn away (walk down a step) and press E: the auto-aim takes the nearest thing in front, never one behind
  await hold(['KeyS'], 250); await sleep(200);
  log('facing away from the lattice', await st());
  // 7. a click on the lattice on the screen (as a tap)
  const xy = await G(`(() => { const v = g.camera.position.clone().set(5.85, g.fp.floorY + 1.0, 21.2).project(window.__dot.topCam); return [Math.round((v.x + 1) / 2 * innerWidth), Math.round((1 - v.y) / 2 * innerHeight)]; })()`);
  await p.click(xy[0], xy[1]); await sleep(900);
  log('clicked the lattice at', xy, await st(), 'window', await G('g.blocked()')); await shot('clicked-lattice');
  await H.idle();
  await p.key('KeyM'); await sleep(800); await shot('map'); await p.key('Escape'); await sleep(400);
  log('end', await st(), 'errors', api.errors().length);
};
