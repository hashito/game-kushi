// The props of the dot version (dot/js/dot/props.js + props-rooms.js): each one placed with nothing in it (walls, doors, things to use)
// and a picture of it from its room.   node tools/probe.mjs --public --path dot/ --query qa=1 --out <dir> --steps tools/dot/props-steps.mjs
export default async ({ G, sleep, log, shot }) => {
  await G(`(document.getElementById('start-btn').click(), 1)`); await sleep(3000);
  for (let i = 0; i < 20 && (await G('g.blocked()')); i++) { await G(`([...document.querySelectorAll('.wm-layer .btn.primary, #gf-reader .tl-close')].filter((b) => b.offsetParent).slice(0, 1).forEach((b) => b.click()), 1)`); await sleep(400); }
  const list = await G('window.__dot.props');
  for (const r of list) {
    if (r.missing) { log('ERROR', `${r.k} (${r.room}): no stack`); continue; }
    if (r.hits || (r.near || []).length) log('ERROR', `${r.k} (${r.room}): overlaps ${r.hits} collider(s), near ${JSON.stringify(r.near)}`);
    if (!/^q-/.test(r.k)) continue;
    const b = r.box, x = (b[0] + b[3]) / 2, z = (b[2] + b[5]) / 2, rm = await G(`(() => { const R = g.data.plan.rooms.find((q) => q.id === ${JSON.stringify(r.room)}); return [R.x + R.w / 2, R.z + R.d / 2, R.floor || 0]; })()`);
    const dx = rm[0] - x, dz = rm[1] - z, d = Math.hypot(dx, dz) || 1, k = Math.min(1.8, d) / d, px = x + dx * k, pz = z + dz * k;
    await G(`(g.setFloor(${rm[2]}, { x: ${px}, z: ${pz} }), g.setLight && g.setLight(true), g.fp.yaw = Math.atan2(-(${x} - ${px}), -(${z} - ${pz})), g.fp.pitch = -0.45, 1)`);
    await sleep(900); await shot(`prop-${r.k}`);
  }
  log('PROPS', JSON.stringify(list.map((r) => [r.k, r.room, r.hits, (r.near || []).length, r.missing ? 'missing' : ''])));
};
