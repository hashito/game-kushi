// Test scenes (?scene=<id>, test mode: nothing is saved): one per key place, for screenshots and checks. tools/scene-links.mjs lists them.
// prepare() makes the world agree with the tasks done on the way (they ran quietly): the mill, the hatch, the charms in hand, the seals,
// and where 千草さん is (G.placeGhost, the same code a resumed save uses).
const L1 = ['T_CHOBA', 'T_PEEL1', 'T_PASTE1'];
const L2 = ['T_HASHIRI', 'T_OKU', 'T_SAGYO', 'T_PHONE', 'T_USU', 'T_HATCH'];
const L3a = ['T_LIGHT', 'T_HIKAE', 'T_DORO'], L3b = [...L3a, 'T_KOSHI_SEE'], L3c = [...L3b, 'T_LURE', 'T_TRAP'], L3d = [...L3c, 'T_KOSHI', 'T_OKUMURO', 'T_FLUE2'];
const ITEMS2 = ['TESHOKU', 'MATCHES', 'KOTEKO'];
const PEEL1 = ['F_NAKA'], PEEL2 = [...PEEL1, 'F_HASHIRI', 'F_OKU', 'F_ROKA', 'F_SAGYO'], PEEL3 = [...PEEL2, 'F_DORO', 'F_IBU'];
const DONE = [...L1, ...L2, ...L3d, 'T_BOX', 'T_ESCAPE', 'T_SEAL'];
const SEALED = { K_IBU: 1, K_FLUE: 1 };
export const SCENES = [
  { id: 'omote', group: '家', label: '表の土間（はじまり）', at: { x: 1.3, z: 24.6, yaw: -1.0, floor: 1 } },
  { id: 'choba', group: '家', label: '帳場の格子の前', at: { x: 4.9, z: 23.4, yaw: -0.9, floor: 1 } },
  { id: 'practice', group: '家', label: '中の間の襖（札を貼る練習）', tasks: ['T_CHOBA', 'T_PEEL1'], peeled: PEEL1, fuda: 1, at: { x: 4.6, z: 21.0, yaw: 0, floor: 1 } },
  { id: 'naka', group: '家', label: '中の間（仏壇・黒電話・箪笥）', tasks: L1, peeled: PEEL1, fuda: 1, at: { x: 4.0, z: 18.6, yaw: 0, floor: 1 } },
  { id: 'hashiri', group: '家', label: '走り庭（台所）', tasks: L1, peeled: [...PEEL1, 'F_HASHIRI'], fuda: 2, at: { x: 1.3, z: 18.8, yaw: 0, floor: 1 } },
  { id: 'oku', group: '家', label: '奥の間', tasks: [...L1, 'T_HASHIRI'], items: ['TESHOKU', 'MATCHES'], peeled: [...PEEL1, 'F_HASHIRI', 'F_OKU'], fuda: 3, at: { x: 5.3, z: 12.2, yaw: 0, floor: 1 } },
  { id: 'sagyo', group: '家', label: '作業場（揚げ戸と臼）', tasks: [...L1, 'T_HASHIRI', 'T_OKU', 'T_SAGYO', 'T_PHONE'], items: ITEMS2, peeled: PEEL2, fuda: 5, at: { x: 4.5, z: 2.5, yaw: -0.61, floor: 1 } },
  { id: 'muro', group: '地下', label: '室（手燭に火を入れる）', tasks: [...L1, ...L2], items: ITEMS2, peeled: PEEL2, fuda: 5, at: { x: 6.6, z: 1.2, yaw: 2.4, floor: 0 } },
  { id: 'doro', group: '地下', label: '土の廊下', tasks: [...L1, ...L2, ...L3a], items: [...ITEMS2, 'KAKE_KUSHI'], peeled: [...PEEL2, 'F_DORO'], fuda: 6, light: true, at: { x: 2.6, z: -2.5, yaw: 0, floor: 0 } },
  { id: 'koshi', group: '地下', label: '奥の室の格子戸（はじめて見る）', tasks: [...L1, ...L2, ...L3a], items: [...ITEMS2, 'KAKE_KUSHI'], peeled: [...PEEL2, 'F_DORO'], fuda: 6, light: true, ghost: true, at: { x: 2.6, z: -14.0, yaw: 0, floor: 0 } },
  { id: 'ita', group: '地下', label: '板の間（壁の札）', tasks: [...L1, ...L2, ...L3b], items: [...ITEMS2, 'KAKE_KUSHI'], peeled: [...PEEL2, 'F_DORO', 'F_ITA'], fuda: 7, light: true, ghost: true, at: { x: -2.0, z: -6.0, yaw: Math.PI / 2, floor: 0 } },
  { id: 'ibushi', group: '地下', label: '燻しの間（櫛を置く）', tasks: [...L1, ...L2, ...L3b], items: [...ITEMS2, 'KAKE_KUSHI'], peeled: PEEL3, fuda: 7, light: true, ghost: true, at: { x: 5.0, z: -9.0, yaw: -Math.PI / 2, floor: 0 } },
  { id: 'flue', group: '地下', label: '燻しの間（煙道の札をはがす前）', tasks: [...L1, ...L2, ...L3b, 'T_LURE'], items: ITEMS2, peeled: PEEL3, fuda: 7, light: true, ghost: true, at: { x: 7.5, z: -11.8, yaw: 0, floor: 0 } },
  { id: 'wax', group: '地下', label: '格子戸の蝋をとかす', tasks: [...L1, ...L2, ...L3c], items: ITEMS2, peeled: [...PEEL3, 'F_FLUE'], seals: { K_IBU: 1 }, fuda: 6, light: true, ghost: true, at: { x: 2.6, z: -17.8, yaw: 0, floor: 0 } },
  { id: 'okumuro', group: '地下', label: '奥の室（奥の棚）', tasks: [...L1, ...L2, ...L3c, 'T_KOSHI'], items: ITEMS2, peeled: [...PEEL3, 'F_FLUE', 'F_KOSHI'], seals: { K_IBU: 1 }, fuda: 6, light: true, ghost: true, at: { x: 2.6, z: -21.0, yaw: 0, floor: 0 } },
  { id: 'shelf', group: '地下', label: '奥の棚の前（櫛を取る前）', tasks: [...L1, ...L2, ...L3d], items: ITEMS2, peeled: [...PEEL3, 'F_FLUE', 'F_KOSHI'], seals: SEALED, fuda: 5, light: true, ghost: true, at: { x: 2.6, z: -24.6, yaw: 0, floor: 0 } },
  { id: 'escape', group: '地下', label: '櫛を持って逃げる（奥の室）', tasks: [...L1, ...L2, ...L3d, 'T_BOX'], items: [...ITEMS2, 'COMB'], peeled: [...PEEL3, 'F_FLUE', 'F_KOSHI'], seals: SEALED, fuda: 5, hunt: true, at: { x: 2.6, z: -24.6, yaw: Math.PI, floor: 0 } },
  { id: 'escape-doro', group: '地下', label: '逃げる（燻しの間の戸の前）', tasks: [...L1, ...L2, ...L3d, 'T_BOX'], items: [...ITEMS2, 'COMB'], peeled: [...PEEL3, 'F_FLUE', 'F_KOSHI'], seals: SEALED, fuda: 5, hunt: true, at: { x: 2.6, z: -11.0, yaw: Math.PI, floor: 0 } },
  { id: 'bench', group: '家', label: '作業台（考えをまとめる）', tasks: DONE, items: [...ITEMS2, 'COMB'], peeled: [...PEEL3, 'F_FLUE', 'F_KOSHI'], fuda: 3, at: { x: 1.6, z: 2.2, yaw: Math.PI / 2, floor: 1 } },
  { id: 'end-give', group: '家', label: '帳場（櫛を持って戻った）', tasks: DONE, items: [...ITEMS2, 'COMB'], peeled: [...PEEL3, 'F_FLUE', 'F_KOSHI'], fuda: 3, at: { x: 4.9, z: 23.2, yaw: -0.9, floor: 1 } },
  { id: 'end', group: '家', label: '帳場（結末の前・手紙あり）', tasks: [...DONE, 'T_THINK', 'T_RETURN', 'T_SQ1'], items: ITEMS2, peeled: [...PEEL3, 'F_FLUE', 'F_KOSHI'], flags: ['letters', 'returned'], fuda: 3, at: { x: 4.9, z: 23.4, yaw: -0.9, floor: 1 } },
];
export function installTests(ext, G) {
  ext.registerTestScenes(SCENES, {
    prepare: (sc, a) => {
      const ctx = a.ctx;
      for (const i of sc.items || []) if (!ctx.state.inv.includes(i)) ctx.state.inv.push(i);
      for (const f of sc.flags || []) if (!ctx.state.flags.includes(f)) ctx.state.flags.push(f);
      for (const id of sc.peeled || []) { G.peelQuiet(id); const C = G.charms.get(id); if (C && C.door) { const d = ctx.world.doors.get(C.door); if (d) { d.open(); d.snap && d.snap(); } } }
      G.fuda = sc.fuda || 0;
      for (const [id, n] of Object.entries(sc.seals || {})) G.setSeal(id, n);
      G.ev.push('bell', 'comb');
      if (G.applyStory) G.applyStory();
      if (sc.light || ctx.state.tasks.includes('T_LIGHT')) G.light0(true);
      if (sc.ghost || sc.hunt) G.placeGhost();
    },
  });
}
