// Wall papers in the dot versions (2026-11-21 「壁に張り紙がある場合その張り紙よりも大きな枠が見えて、ちらついている」): every paper on a wall
// (pasted documents, the charms) is looked at from 1.1 m in front with the camera still: no visible part of it may be larger than the
// paper itself (a backing quad / frame), and nothing in its square may flicker between frames (kit tools/frame-flicker.mjs).
//   node tools/probe.mjs --public --path dot-fps/ --size 1280x800 --out <dir> --steps tools/dot/wallpaper-steps.mjs   (WP_IDS=DOC_KANBAN,F_NAKA picks)
import { flickerSource, FLICKER_MAX } from './frame-flicker.mjs';
export default async ({ p, G, sleep, log, shot, base }) => {
  await p.goto(`${base}?scene=choba&qa=1`);
  await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 120000);
  await sleep(2500);
  for (let i = 0; i < 6 && (await G('g.blocked()')); i++) { await G(`(document.querySelectorAll('.wm-layer .btn.primary, #gf-reader .tl-close').forEach((b) => b.click()), 1)`); await sleep(500); }
  // every paper on a wall: its centre, its normal (toward the room), its floor, the size of its sheet and of every visible part
  const list = await G(`(() => {
    const T = g.THREE, out = [], plan = g.data.plan, floorOf = (x, z, y) => { const r = plan.rooms.filter((q) => x >= q.x && x <= q.x + q.w && z >= q.z && z <= q.z + q.d).sort((a, b) => Math.abs(g.world.floorY(a.floor || 0) - y) - Math.abs(g.world.floorY(b.floor || 0) - y))[0]; return r ? r.floor || 0 : 0; };
    const parts = (o) => { const L = []; o.traverse((m) => { if (!(m.isMesh || m.isSprite) || !m.visible || (m.material && m.material.visible === false) || /^dot-mark/.test((m.material && m.material.name) || '')) return; if (m.isSprite) return; const s = new T.Box3().setFromObject(m).getSize(new T.Vector3()); L.push([+s.x.toFixed(3), +s.y.toFixed(3), +s.z.toFixed(3)]); }); return L; };
    for (const o of g.world.interactables) { const ia = o.userData.interact; if (!ia || ia.kind !== 'doc' || !o.userData.pasted || !o.visible) continue; o.updateMatrixWorld(true); const c = new T.Box3().setFromObject(o.userData.model || o).getCenter(new T.Vector3()), n = o.userData.pasted.normal; out.push({ id: ia.id, c: [c.x, c.y, c.z], n: [n.x, n.z], parts: parts(o.userData.model || o), floor: floorOf(c.x, c.z, c.y) }); }
    g.world.group.traverse((o) => { if (!/^fuda:/.test(o.name) || !o.visible) return; o.updateMatrixWorld(true); const c = new T.Box3().setFromObject(o).getCenter(new T.Vector3()), d = new T.Vector3(0, 0, 1).applyQuaternion(o.getWorldQuaternion(new T.Quaternion())); out.push({ id: o.name.slice(5), c: [c.x, c.y, c.z], n: [d.x, d.z], parts: parts(o), floor: floorOf(c.x, c.z, c.y) }); });
    return out;
  })()`);
  const pick = (process.env.WP_IDS || '').split(',').filter(Boolean);
  const rows = [];
  for (const w of list) {
    if (pick.length && !pick.includes(w.id)) continue;
    const [cx, cy, cz] = w.c, [nx, nz] = w.n, x = cx + nx * 1.1, z = cz + nz * 1.1;
    await G(`(() => { g.setFloor(${w.floor}, { x: ${x}, z: ${z} }); const c = g.camera.position; g.fp.yaw = Math.atan2(-(${cx} - c.x), -(${cz} - c.z)); g.fp.pitch = Math.atan2(${cy} - c.y, 1.1) * 0.8; return 1; })()`);
    await sleep(700);
    const top = await G('!!(window.__dot && window.__dot.topCam)');
    const f = await G(flickerSource({ camera: top ? 'window.__dot.topCam' : 'g.camera', points: { paper: `[${cx}, ${cy}, ${cz}]` }, box: 0.05, frames: 8 }));
    const sheet = w.parts[0] || [0, 0, 0], big = w.parts.filter((s) => Math.max(s[0], s[2]) > Math.max(sheet[0], sheet[2]) + 0.03 || s[1] > sheet[1] + 0.03);
    log(w.id, JSON.stringify({ floor: w.floor, flicker: f.paper, parts: w.parts }));
    await shot(`wp-${w.id}`);
    if (f.paper && f.paper.on && f.paper.share > FLICKER_MAX) log('ERROR', `${w.id}: flickers (${f.paper.share} of its square jumps between still frames)`);
    if (big.length) log('ERROR', `${w.id}: a visible part larger than the paper ${JSON.stringify(big)} (sheet ${JSON.stringify(sheet)})`);
    rows.push([w.id, f.paper && f.paper.share, w.parts.length]);
  }
  log('WALLPAPERS', JSON.stringify(rows));
};
