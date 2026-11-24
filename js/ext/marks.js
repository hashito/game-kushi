// Marks on the things to pick up in the normal version (2.5.3, re-check 2026-11-24 of play test 2026-11-20 #7
// 「マッチなどのアイテムがわかりづらすぎます」): the dot versions have carried a faint glow and a small pale ▼ over every item and document since
// 2.2/2.3 (dot/js/dot/guide.js), the normal version had nothing - in the dark 走り庭 the matches on the kamado and the candlestick on the
// mizuya could not be seen at all, even with the crosshair on them. The same mark here: a pale thin chevron (kit P53) a little above the
// thing and a faint warm glow on it, hidden through walls (kit mark-sight, P42), gone with the thing when it is taken.
// The dot versions skip this (their own marks are drawn by guide.js).
import * as THREE from 'three';
import { markSight } from '../../dot/js/kit/mark-sight.js';

export function installMarks(ext) {
  ext.on('game:ready', (ctx) => {
    if (typeof document === 'undefined' || document.documentElement.dataset.dot || window.__dot) return;
    const icv = document.createElement('canvas'); icv.width = icv.height = 32;
    { const x = icv.getContext('2d'); x.strokeStyle = '#d8cdb4'; x.lineWidth = 3; x.lineJoin = 'round'; x.lineCap = 'round'; x.beginPath(); x.moveTo(9, 12); x.lineTo(16, 20); x.lineTo(23, 12); x.stroke(); }
    const itex = new THREE.CanvasTexture(icv); itex.colorSpace = THREE.SRGBColorSpace;
    const gcv = document.createElement('canvas'); gcv.width = gcv.height = 64;
    { const c = gcv.getContext('2d'), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,226,160,1)'); gr.addColorStop(0.3, 'rgba(255,190,110,0.6)'); gr.addColorStop(1, 'rgba(255,150,60,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); }
    const gtex = new THREE.CanvasTexture(gcv); gtex.colorSpace = THREE.SRGBColorSpace;
    const iconM = new THREE.SpriteMaterial({ map: itex, transparent: true, opacity: 0.55, depthWrite: false, depthTest: false, fog: false }); iconM.name = 'kc-mark-icon'; iconM.userData.guideMark = true;
    const softM = new THREE.SpriteMaterial({ map: gtex, color: 0xffe2a8, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }); softM.name = 'kc-mark-glow';
    const marks = new Map();
    const markAll = () => {
      for (const o of ctx.world.interactables) {
        const ia = o.userData.interact;
        if (!ia || (ia.kind !== 'item' && ia.kind !== 'doc') || marks.has(o)) continue;
        const m = new THREE.Group(); m.name = 'kc-mark';
        const ic = new THREE.Sprite(iconM); ic.scale.set(0.12, 0.12, 1); ic.userData.guideMark = true; ic.renderOrder = 6; m.add(ic);
        const gl = new THREE.Sprite(softM); gl.scale.set(0.42, 0.42, 1); gl.renderOrder = 5; m.add(gl);
        o.add(m); marks.set(o, { m, ic, gl });
      }
    };
    markAll();
    window.__kcMarks = () => [...marks.entries()].filter(([o]) => o.parent && ctx.world.interactables.includes(o)).map(([o, k]) => ({ id: o.userData.interact.id, shown: k.m.visible && o.visible }));
    const sight = markSight(THREE, ctx);
    let markT = 0, t = 0;
    const wp = new THREE.Vector3();
    const update = (dt) => {
      t += dt; markT -= dt; if (markT <= 0) { markT = 1; markAll(); sight.refresh(); }
      const k = 0.5 + 0.5 * Math.sin(t * 3.1);
      for (const [o, M] of marks) {
        if (!o.parent) { marks.delete(o); continue; }
        const on = ctx.world.interactables.includes(o) && !o.userData.off;
        M.m.visible = on; if (!on) continue;
        o.getWorldPosition(wp);
        let F = ctx.world.floorY(0); for (let f = 1; f < 4; f++) { const y = ctx.world.floorY(f); if (Number.isFinite(y) && y <= wp.y + 0.05 && y > F) F = y; }
        const s = o.getWorldScale ? o.getWorldScale(new THREE.Vector3()).y || 1 : 1;
        M.ic.position.y = (Math.min(wp.y + 0.34, F + 1.75) - wp.y) / s + 0.015 * k;
        M.gl.material.opacity = 0.22 + 0.1 * k;
        M.ic.visible = sight.clear(M.ic);
      }
    };
    ctx.systems.push({ id: 'kc-marks', def: { update: (dt) => update(dt || 0.016) }, inst: null });
  });
}
