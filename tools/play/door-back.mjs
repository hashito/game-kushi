// 2.6.0 (play 2026-11-26 #5 「戸の裏からも札を貼れるようにしてください」): a door's charm spot works from both sides. In 寝間 (scene nema: its
// door's own charm is off, 6 charms in hand) aim at the post from inside the room (the back of the door), [E] pastes there - the charm is
// drawn on the 寝間 face of the post (FRAME_FACE off it, not in the frame) - then from the corridor side [E] takes it off and pastes again on
// that side. Prints "door-back: OK" or what failed.  node tools/probe.mjs --out <dir> --steps tools/play/door-back.mjs
export default async ({ p, G, sleep, log, base, shot }) => {
  await p.goto(`${base}?scene=nema&qa=1`); await p.waitFor("window.__game && window.__game.state && window.__game.state.started", 120000); await sleep(2500);
  for (let i = 0; i < 6; i++) { await G(`(document.querySelectorAll('.wm-layer .btn.primary, [role=dialog] .btn.primary').forEach((b) => b.click()), 1)`); await sleep(250); }
  const bad = [];
  const aim = async (cx, cz, tx, ty, tz) => G(`(() => { const c = g.camera.position; c.x = ${cx}; c.z = ${cz}; g.fp.yaw = Math.atan2(-(${tx} - c.x), -(${tz} - c.z)); g.fp.pitch = Math.atan2(${ty} + g.world.floorY(g.floor) - c.y, Math.hypot(${tx} - c.x, ${tz} - c.z)); return 1; })()`);
  const prompt = () => G(`document.getElementById('prompt').textContent`);
  const shown = () => G(`(() => { const S = window.__kc.seals.get('K_NEMA'); const v = []; for (const sl of [...S.slots, ...(S.slotsB || [])]) if (sl.mesh.visible) v.push([sl.mesh.name, +sl.mesh.position.x.toFixed(3)]); return v; })()`);
  // the back (inside 寝間, east of the door at x 3.6)
  await aim(4.8, -15.4, 3.74, 1.42, -15.61); await sleep(400);
  let pr = await prompt(); if (!/札を貼る/.test(pr)) bad.push(`back: the prompt is "${pr}", not 札を貼る`);
  await p.key('KeyE'); await sleep(700);
  let side = await G(`window.__kc.sealSides('K_NEMA')`), v = await shown();
  if (side !== 'b') bad.push(`back: pasted on side "${side}", not b`);
  if (!v.length || !/:b0$/.test(v[0][0]) || !(v[0][1] > 3.6 + 0.13 && v[0][1] < 3.6 + 0.16)) bad.push(`back: the drawn charm is ${JSON.stringify(v)} (want seal:K_NEMA:b0 at x 3.73-3.76)`);
  if (shot) await shot('door-back-pasted');
  // the front (the corridor, west of the door): [E] takes it off, [E] again pastes on this side
  await aim(2.4, -15.6, 3.46, 1.42, -15.61); await sleep(400);
  pr = await prompt(); if (!/はがす/.test(pr)) bad.push(`front: the prompt is "${pr}", not はがす`);
  await p.key('KeyE'); await sleep(600);
  if ((await G(`window.__kc.sealN('K_NEMA')`)) !== 0) bad.push('front: the charm did not come off');
  await p.key('KeyE'); await sleep(700);
  side = await G(`window.__kc.sealSides('K_NEMA')`); v = await shown();
  if (side !== 'f') bad.push(`front: pasted on side "${side}", not f`);
  if (!v.length || /:b\d$/.test(v[0][0]) || !(v[0][1] < 3.6 - 0.13 && v[0][1] > 3.6 - 0.16)) bad.push(`front: the drawn charm is ${JSON.stringify(v)} (want seal:K_NEMA:0 at x 3.44-3.47)`);
  if (shot) await shot('door-front-pasted');
  log(bad.length ? `door-back: FAIL ${bad.join(' | ')}` : 'door-back: OK');
};
