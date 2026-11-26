// Seat what you pick up on what is drawn under it (2.6.0, play 2026-11-26 #8 「日記が空中に浮いている場合があります」).
// The kit seats a pickup on the colliders (seatOn), and one with an explicit "y" (items.json / docs.json) is put at that height. Both are
// right for the boxes of the normal version, but the dot versions swap a piece of furniture for a dot part of its own shape
// (dot/js/dot/index.js FIXTURES): ハルさんの手紙（二） on 奥の間's kimono chest hung 33 cm in the air on /dot and /dot-fps, the search request
// on 中の間's chest 10 cm; in the normal version the matches and the third letter sat 5 cm over the kamado / the bench.
// Once everything is built (the first frame, after every game:ready - the dot swap included), each pickup lying on something (not pasted
// on a wall) looks down from just above its bottom at the drawn meshes under its footprint and is moved onto the highest of them. The stone
// on the kiln's rim (2.6.0 #2) is seated the same way (the dot kiln's rim is not the box's). window.__kcSettle lists what moved
// (kit check-playtest P67 fails on a pickup still floating).
import * as THREE from 'three';

const SKIP = /^(kc-mark|kc-light-mark|fudahit|sealhit|station|look|thing|hide|door|stairs|dot-guide|kc-flame|kc-ash)/;

export function installSettle(ext, G) {
  ext.on('game:ready', (ctx) => {
    let done = false;
    const run = () => {
      const W = ctx.world, moved = [];
      ctx.scene.updateMatrixWorld(true);
      const shown = (o) => { for (let q = o; q; q = q.parent) if (q.visible === false) return false; return true; };
      const drawn = (m) => { const mt = [].concat(m.material || [])[0]; return !!mt && mt.visible !== false && mt.colorWrite !== false && !(mt.transparent && mt.opacity < 0.05) && !m.isSprite; };
      const named = (m) => { for (let q = m; q && q !== W.group && q !== ctx.scene; q = q.parent) if (SKIP.test(q.name || '')) return true; return false; };
      const all = []; ctx.scene.traverse((m) => { if ((m.isMesh || m.isInstancedMesh) && shown(m) && drawn(m) && !named(m)) all.push(m); });
      const rc = new THREE.Raycaster();
      const seat = (o, id) => {
        const own = new Set(); o.traverse((q) => own.add(q));
        const b = new THREE.Box3(); o.traverse((q) => { if (q.isMesh && q !== o && shown(q) && drawn(q)) b.expandByObject(q); });
        if (b.isEmpty()) return;
        const s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
        const near = all.filter((m) => !own.has(m) && new THREE.Box3().setFromObject(m).intersectsBox(new THREE.Box3(new THREE.Vector3(b.min.x - 0.05, b.min.y - 0.8, b.min.z - 0.05), new THREE.Vector3(b.max.x + 0.05, b.min.y + 0.2, b.max.z + 0.05))));
        let top = -Infinity;
        for (const [fx, fz] of [[0, 0], [-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
          rc.set(new THREE.Vector3(c.x + fx * s.x, b.min.y + 0.12, c.z + fz * s.z), new THREE.Vector3(0, -1, 0)); rc.far = 0.9;
          const h = rc.intersectObjects(near, false)[0]; if (h) top = Math.max(top, h.point.y);
        }
        if (!Number.isFinite(top)) return;
        const d = top + 0.002 - b.min.y;
        if (Math.abs(d) < 0.012 || d > 0.12 || d < -0.6) return;
        const p = o.parent; const wp = o.getWorldPosition(new THREE.Vector3()); wp.y += d;
        o.position.copy(p ? p.worldToLocal(wp) : wp); o.updateMatrixWorld(true);
        moved.push({ id, by: +d.toFixed(3) });
      };
      for (const o of W.interactables) {
        const ia = o.userData && o.userData.interact;
        if (!ia || (ia.kind !== 'item' && ia.kind !== 'doc') || o.userData.pasted || !shown(o)) continue;
        seat(o, `${ia.kind}:${ia.id}`);
      }
      if (G.lightStone) seat(G.lightStone, 'kc-light-stone');
      if (typeof window !== 'undefined') window.__kcSettle = moved;
    };
    ctx.systems.push({ id: 'kc-settle', def: { update: () => { if (done) return; done = true; try { run(); } catch (e) { console.error('[kushi] settle', e); } } }, inst: null });
  });
}
