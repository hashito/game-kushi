// The mood props of the dot version: a few designed parts of the kit's atmosphere library (1.20.1, K1 和 / K5) in each room, two or
// three per room and one that stands out (*). They tell what kind of house this is before a word is read: salt at the middle door (a house that
// keeps something out), a torn umbrella left in the entry, a lit andon in the altar room, a roped futon in the back room, a charm-sealed box
// in the cellar, a covered mirror in the smoke room, an upside-down screen (the funeral custom) where she was shut in.
// Against the north and side walls (the camera from above looks north: a part just inside a south wall is hidden behind it), out of doorways and off the routes the play scripts and the guide take; the bigger ones get a collider (a box a
// little smaller than the part) so the player never walks through them. Positions: x, z in the plan's metres; face = where the
// part's front looks (0 +z, PI/2 +x, PI -z, -PI/2 -x); s = scale on the library's real size.
import ROOMS from './props-rooms.js';   // the per-room list for the placement update (Q-series parts)
const E = Math.PI / 2, W = -Math.PI / 2, N = Math.PI, S = 0;
export const PROPS = [
  // 表の土間
  { room: 'OMOTE', k: 'bangasa', x: 0.5, z: 23.3, face: E, s: 0.75, star: true, solid: true },
  { room: 'OMOTE', k: 'morishio', x: 0.45, z: 20.4, face: S, s: 1.6 },   // by the middle door's charm
  // 店の間
  { room: 'MISE', k: 'hibachi', x: 3.15, z: 21.0, face: S, solid: true },
  { room: 'MISE', k: 'ichimatsu', x: 5.45, z: 20.32, face: S, s: 1.3, star: true },
  // 中の間
  { room: 'NAKA', k: 'andon', x: 3.0, z: 14.7, face: E, star: true, solid: true },
  { room: 'NAKA', k: 'kouro', x: 7.6, z: 15.5, face: W, s: 1.3 },
  // 走り庭
  { room: 'HASHIRI', k: 'mizugame', x: 0.48, z: 12.85, face: E, s: 0.8, solid: true },
  { room: 'HASHIRI', k: 'tsukemono', x: 2.22, z: 10.9, face: W, s: 0.8, star: true, solid: true },
  // 奥の間
  { room: 'OKU', k: 'andon-torn', x: 2.95, z: 11.2, face: E, solid: true },
  { room: 'OKU', k: 'futon-rolled', x: 3.35, z: 9.6, face: E, star: true, solid: true },
  // 作業場
  { room: 'SAGYO', k: 'seoikago', x: 1.3, z: -0.55, face: S, solid: true },
  { room: 'SAGYO', k: 'nata-stump', x: 6.6, z: 2.45, face: W, s: 0.7, star: true, solid: true },
  // 室
  { room: 'MURO', k: 'tawara', x: 1.6, z: 1.3, face: E, solid: true },
  { room: 'MURO', k: 'box-sealed', x: 7.3, z: 3.0, face: W, star: true, solid: true },
  // 土の廊下: the charms papered on the wall
  { room: 'DORO', k: 'ofuda-wall', x: 1.7, z: -11.5, face: E, star: true },
  // 板の間
  { room: 'ITA', k: 'box-chained', x: 1.05, z: -7.7, face: W, star: true, solid: true },
  { room: 'ITA', k: 'morishio', x: -3.85, z: -8.5, face: E, s: 1.6 },
  // 燻しの間
  { room: 'IBUSHI', k: 'mirror-cloth', x: 4.15, z: -12.5, face: S, star: true, solid: true },
  { room: 'IBUSHI', k: 'candle-fallen', x: 9.05, z: -12.2, face: W, s: 1.5 },
  // 奥の室
  { room: 'OKUMURO', k: 'byobu-sakasa', x: -0.3, z: -26.65, face: S, star: true, solid: true },
  { room: 'OKUMURO', k: 'kiku-oke', x: 6.0, z: -26.4, face: W, s: 1.4 },
];

/** put the props into the scene (and their colliders into the world); returns a report per prop */
export function placeProps(THREE, ctx, { stackGeo, stackIndex, mat, glowMat, parent }) {
  const Wd = ctx.world, out = [];
  const rooms = new Map((ctx.data.plan.rooms || []).map((r) => [r.id, r]));
  const extra = Object.entries(ROOMS || {}).flatMap(([room, L]) => (L || []).map((q) => ({ ...q, room })));
  for (const p of [...PROPS, ...extra]) {
    const R = rooms.get(p.room), info = stackIndex[p.k];
    if (!R || !info) { out.push({ k: p.k, room: p.room, missing: true }); continue; }
    const fy = Wd.floorY(R.floor || 0);
    const g = stackGeo(p.k), gb = g.boundingBox, c = gb.getCenter(new THREE.Vector3());
    const grp = new THREE.Group(); grp.name = `dot-prop:${p.k}`;
    const add = (geo, m) => { const ms = new THREE.Mesh(geo, m); ms.position.set(-c.x, -gb.min.y, -c.z); ms.castShadow = m === mat; ms.receiveShadow = m === mat; grp.add(ms); return ms; };
    add(g, mat);
    if (info.glow && stackIndex[info.glow]) add(stackGeo(info.glow), glowMat);
    const s = p.s || 1;
    grp.scale.setScalar(s);
    grp.rotation.y = p.face || 0;
    grp.position.set(p.x, fy, p.z);
    parent.add(grp);
    grp.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(grp);
    const rec = { k: p.k, room: p.room, star: !!p.star, box: [box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z].map((v) => +v.toFixed(2)) };
    if (p.solid) {
      const cb = box.clone(); cb.min.x += 0.04; cb.min.z += 0.04; cb.max.x -= 0.04; cb.max.z -= 0.04;
      Wd.colliders.push({ box: cb, off: false, prop: p.k });
      rec.solid = true;
    }
    // what it overlaps (should be nothing: a wall, a door, a thing to use)
    rec.hits = Wd.colliders.filter((col) => !col.prop && col.box.intersectsBox(box) && col.box.max.y - col.box.min.y > 0.05 && col.box.min.y < fy + 2.2 && col.box.max.y > fy + 0.05).length;
    rec.near = Wd.interactables.filter((o) => { const q = new THREE.Vector3(); o.getWorldPosition(q); return Math.abs(q.y - fy) < 2.5 && Math.hypot(q.x - p.x, q.z - p.z) < 0.6; }).map((o) => (o.userData.interact || {}).id);
    out.push(rec);
  }
  return out;
}
