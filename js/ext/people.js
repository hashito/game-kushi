// The two women of the house, built once from plain shapes (shared materials, compiled at the warm-up):
//   千草 - a young woman in an indigo kimono, wet black hair to the knees over her face (the passage, the gate, the chase, the ending);
//   ハル - a very old woman sitting in seiza behind the lattice, long loose white hair, her back to the shop.
import * as THREE from 'three';

const M = {};
export const mats = () => {
  if (M.kimono) return M;
  M.kimono = new THREE.MeshStandardMaterial({ color: 0x1a2340, roughness: 0.9 });
  M.obi = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.8 });
  M.skin = new THREE.MeshStandardMaterial({ color: 0xc9c4bd, roughness: 0.75, emissive: 0x1a1a1c, emissiveIntensity: 0.6 });
  M.hair = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.45, side: THREE.DoubleSide });
  M.white = new THREE.MeshStandardMaterial({ color: 0xcfcac0, roughness: 0.7, side: THREE.DoubleSide });
  M.dark = new THREE.MeshStandardMaterial({ color: 0x17120f, roughness: 0.9 });
  M.mist = new THREE.SpriteMaterial({ map: mistTexture(), color: 0x55606a, transparent: true, opacity: 0.25, depthWrite: false });
  return M;
};
function mistTexture() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,0.9)'); r.addColorStop(0.5, 'rgba(255,255,255,0.3)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** 千草: feet at y 0, facing +z. Long hair hangs over the face to the knees. */
export function buildChigusa() {
  const m = mats(), root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const add = (geo, mat, x, y, z, parent = body) => { const k = new THREE.Mesh(geo, mat); k.position.set(x, y, z); parent.add(k); return k; };
  add(new THREE.CylinderGeometry(0.19, 0.3, 1.2, 10), m.kimono, 0, 0.6, 0);
  add(new THREE.CylinderGeometry(0.19, 0.2, 0.24, 10), m.obi, 0, 1.24, 0);
  add(new THREE.CylinderGeometry(0.15, 0.19, 0.4, 10), m.kimono, 0, 1.55, 0);
  const head = new THREE.Group(); head.position.set(0, 1.84, 0.02); body.add(head);
  add(new THREE.SphereGeometry(0.1, 12, 10), m.skin, 0, 0, 0, head).scale.set(0.9, 1.15, 0.95);
  add(new THREE.SphereGeometry(0.114, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), m.hair, 0, 0.02, -0.005, head);
  // the hair: strands in front of the face down to the knees, and a heavy fall down the back
  const strands = [];
  for (let i = 0; i < 9; i++) { const s = add(new THREE.PlaneGeometry(0.045, 1.25 + (i % 3) * 0.12), m.hair, -0.1 + i * 0.025, -0.6, 0.11 - Math.abs(i - 4) * 0.01, head); s.rotation.y = (i - 4) * 0.07; strands.push(s); }
  for (const sx of [-1, 1]) { const b = add(new THREE.PlaneGeometry(0.16, 1.3), m.hair, sx * 0.11, -0.55, -0.03, head); b.rotation.y = sx * 1.2; }
  add(new THREE.PlaneGeometry(0.3, 1.4), m.hair, 0, -0.6, -0.12, head);
  const arms = [];
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(sx * 0.2, 1.66, 0); body.add(arm);
    add(new THREE.CylinderGeometry(0.07, 0.12, 0.6, 8), m.kimono, 0, -0.3, 0, arm);
    add(new THREE.CylinderGeometry(0.024, 0.02, 0.26, 6), m.skin, 0, -0.7, 0, arm);
    add(new THREE.BoxGeometry(0.055, 0.13, 0.03), m.skin, 0, -0.88, 0, arm);
    arms.push(arm);
  }
  const mist = [];
  for (let i = 0; i < 3; i++) { const s = new THREE.Sprite(m.mist); s.scale.setScalar(1.2 + i * 0.3); s.position.set(i % 2 ? 0.25 : -0.25, 0.5 + i * 0.45, 0.1); root.add(s); mist.push(s); }
  return { root, body, head, arms, strands, mist };
}

/** ハル: sitting in seiza on the floor (y 0), facing +z; her back is what you see from the shop. */
export function buildHaru() {
  const m = mats(), root = new THREE.Group();
  const add = (geo, mat, x, y, z) => { const k = new THREE.Mesh(geo, mat); k.position.set(x, y, z); root.add(k); return k; };
  add(new THREE.BoxGeometry(0.5, 0.22, 0.55), m.dark, 0, 0.11, 0.02);                 // the folded legs under the kimono
  add(new THREE.CylinderGeometry(0.15, 0.24, 0.55, 10), m.dark, 0, 0.48, -0.04).rotation.x = 0.18;   // a bent back
  const head = new THREE.Group(); head.position.set(0, 0.85, 0.06); root.add(head);
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), m.skin); h.scale.set(0.9, 1.1, 0.95); head.add(h);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), m.white); cap.position.set(0, 0.015, -0.01); head.add(cap);
  // loose white hair down the back to the floor
  for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.75), m.white); s.position.set(-0.1 + i * 0.05, -0.38, -0.1 - Math.abs(i - 2) * 0.01); s.rotation.x = -0.25; head.add(s); }
  for (const sx of [-1, 1]) add(new THREE.CylinderGeometry(0.05, 0.07, 0.4, 8), m.dark, sx * 0.17, 0.5, 0.1).rotation.x = -0.9;
  return { root, head };
}
