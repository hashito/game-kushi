// Test scenes (?scene=<id>, test mode: nothing is saved): one per key place, for screenshots and checks. tools/scene-links.mjs lists them.
// prepare() makes the world agree with the tasks done on the way (they ran quietly): the mill, the hatch, the charms in hand, the seals,
// and where 千草さん is (G.placeGhost, the same code a resumed save uses).
const L1 = ['T_CHOBA', 'T_PEEL1', 'T_PASTE1'];
const L2 = ['T_HASHIRI', 'T_OKU', 'T_SAGYO', 'T_PHONE', 'T_HARU2', 'T_USU', 'T_HATCH'];
const L3a = ['T_LIGHT', 'T_HIKAE', 'T_DORO'], L3b = [...L3a, 'T_KOSHI_SEE'], L3c = [...L3b, 'T_LURE', 'T_TRAP'], L3d = [...L3c, 'T_KOSHI', 'T_OKUMURO', 'T_FLUE2'];
const ITEMS2 = ['TESHOKU', 'MATCHES', 'KOTEKO'];
const PEEL1 = ['F_NAKA'], PEEL2 = [...PEEL1, 'F_HASHIRI', 'F_OKU', 'F_ROKA', 'F_SAGYO'], PEEL3 = [...PEEL2, 'F_DORO', 'F_IBU'];
const DONE = [...L1, ...L2, ...L3d, 'T_BOX', 'T_ESCAPE', 'T_SEAL'];
const SEALED = { K_IBU: 1, K_FLUE: 2 };   // 2.5.0: 奥の室's flue mouth is wide - two charms side by side
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
  { id: 'ita', group: '地下', label: '板の間（煙道の蓋）', tasks: [...L1, ...L2, ...L3b], items: [...ITEMS2, 'KAKE_KUSHI'], peeled: [...PEEL2, 'F_DORO', 'F_ITA'], fuda: 7, light: true, ghost: true, at: { x: -2.0, z: -6.0, yaw: Math.PI / 2, floor: 0 } },
  { id: 'kame', group: '地下', label: '甕の間（煙道の蓋）', tasks: [...L1, ...L2, ...L3b], items: [...ITEMS2, 'KAKE_KUSHI'], peeled: [...PEEL2, 'F_DORO', 'F_KAME'], fuda: 4, light: true, ghost: true, at: { x: 0.4, z: -14.6, yaw: Math.PI / 2, floor: 0 } },
  { id: 'hatch', group: '家', label: '作業場の揚げ戸（臼をどけた）', tasks: [...L1, 'T_HASHIRI', 'T_OKU', 'T_SAGYO', 'T_PHONE', 'T_HARU2', 'T_USU'], items: ITEMS2, peeled: PEEL2, fuda: 5, at: { x: 6.6, z: 1.4, yaw: 0, floor: 1 } },
  { id: 'hatch-hole', group: '家', label: '作業場の揚げ戸（開いた穴）', tasks: [...L1, ...L2], items: ITEMS2, peeled: PEEL2, fuda: 2, at: { x: 6.6, z: 1.4, yaw: 0, floor: 1 } },
  { id: 'ibushi', group: '地下', label: '燻しの間（櫛を置く）', tasks: [...L1, ...L2, ...L3b], items: [...ITEMS2, 'KAKE_KUSHI'], peeled: PEEL3, fuda: 7, light: true, ghost: true, at: { x: 5.0, z: -9.0, yaw: -Math.PI / 2, floor: 0 } },
  { id: 'flue', group: '地下', label: '燻しの間（煙道の札をはがす前）', tasks: [...L1, ...L2, ...L3b, 'T_LURE'], items: ITEMS2, peeled: PEEL3, fuda: 7, light: true, ghost: true, at: { x: 7.5, z: -11.8, yaw: 0, floor: 0 } },
  { id: 'wax', group: '地下', label: '格子戸の蝋をとかす', tasks: [...L1, ...L2, ...L3c], items: ITEMS2, peeled: [...PEEL3, 'F_FLUE'], seals: { K_IBU: 1 }, fuda: 6, light: true, ghost: true, at: { x: 2.6, z: -17.8, yaw: 0, floor: 0 } },
  { id: 'okumuro', group: '地下', label: '奥の室（格子戸の札がはがれた）', tasks: [...L1, ...L2, ...L3c, 'T_KOSHI'], items: ITEMS2, peeled: [...PEEL3, 'F_FLUE', 'F_KOSHI'], seals: { K_IBU: 1 }, fuda: 6, light: true, ghost: true, at: { x: 2.6, z: -17.6, yaw: 0, floor: 0 } },
  { id: 'shelf', group: '地下', label: '奥の棚の前（櫛を取る前）', tasks: [...L1, ...L2, ...L3d], items: ITEMS2, peeled: [...PEEL3, 'F_FLUE', 'F_KOSHI'], seals: SEALED, fuda: 5, light: true, ghost: true, at: { x: 2.6, z: -24.6, yaw: 0, floor: 0 } },
  { id: 'escape', group: '地下', label: '櫛を持って逃げる（奥の室）', tasks: [...L1, ...L2, ...L3d, 'T_BOX'], items: [...ITEMS2, 'COMB'], peeled: [...PEEL3, 'F_FLUE', 'F_KOSHI'], seals: SEALED, fuda: 5, hunt: true, at: { x: 2.6, z: -24.6, yaw: Math.PI, floor: 0 } },
  { id: 'escape-doro', group: '地下', label: '逃げる（燻しの間の戸の前）', tasks: [...L1, ...L2, ...L3d, 'T_BOX'], items: [...ITEMS2, 'COMB'], peeled: [...PEEL3, 'F_FLUE', 'F_KOSHI'], seals: SEALED, fuda: 5, hunt: true, at: { x: 2.6, z: -11.0, yaw: Math.PI, floor: 0 } },
  { id: 'bench', group: '家', label: '作業台（考えをまとめる）', tasks: DONE, items: [...ITEMS2, 'COMB'], peeled: [...PEEL3, 'F_FLUE', 'F_KOSHI'], fuda: 3, at: { x: 1.6, z: 2.2, yaw: Math.PI / 2, floor: 1 } },
  { id: 'end-give', group: '家', label: '帳場（櫛を持って戻った）', tasks: DONE, items: [...ITEMS2, 'COMB'], peeled: [...PEEL3, 'F_FLUE', 'F_KOSHI'], fuda: 3, at: { x: 4.9, z: 23.2, yaw: -0.9, floor: 1 } },
  { id: 'phone', group: '家', label: '作業場（電話が鳴る前）', tasks: [...L1, 'T_HASHIRI', 'T_OKU'], items: ['TESHOKU', 'MATCHES'], peeled: [...PEEL1, 'F_HASHIRI', 'F_OKU', 'F_ROKA'], fuda: 2, at: { x: 2.6, z: 4.6, yaw: Math.PI, floor: 1 } },
  { id: 'out', group: '家', label: '表の戸（最後に開ける）', tasks: [...DONE, 'T_THINK', 'T_RETURN', 'T_END'], items: ITEMS2, peeled: [...PEEL3, 'F_FLUE', 'F_KOSHI'], flags: ['returned', 'chose_keep'], fuda: 3, at: { x: 1.3, z: 22.6, yaw: Math.PI, floor: 1 } },
  { id: 'out-give', group: '家', label: '表の戸（櫛を渡した後）', tasks: [...DONE, 'T_END'], items: ITEMS2, peeled: [...PEEL3, 'F_FLUE', 'F_KOSHI'], flags: ['chose_give'], fuda: 3, at: { x: 1.3, z: 23.6, yaw: Math.PI, floor: 1 } },
  { id: 'end', group: '家', label: '帳場（結末の前・手紙あり）', tasks: [...DONE, 'T_THINK', 'T_RETURN', 'T_SQ1'], items: ITEMS2, peeled: [...PEEL3, 'F_FLUE', 'F_KOSHI'], flags: ['letters', 'returned'], fuda: 3, at: { x: 4.9, z: 23.4, yaw: -0.9, floor: 1 } },
  // 2.5.0 (play test 2026-11-23 #3 #4): 寝間 - the room she lived in; the wide flue mouth in 奥の室 to shut with two charms; the hatch after the return
  { id: 'nema', group: '地下', label: '寝間（暮らしの跡・広い煙道の口）', tasks: [...L1, ...L2, ...L3b], items: [...ITEMS2, 'KAKE_KUSHI'], peeled: [...PEEL2, 'F_DORO', 'F_NEMA'], fuda: 6, light: true, ghost: true, at: { x: 4.4, z: -16.2, yaw: -Math.PI / 2, floor: 0 } },
  { id: 'wide', group: '地下', label: '奥の室の広い煙道の口（札を二枚）', tasks: [...L1, ...L2, ...L3c, 'T_KOSHI', 'T_OKUMURO'], items: ITEMS2, peeled: [...PEEL3, 'F_FLUE', 'F_KOSHI'], seals: { K_IBU: 1 }, fuda: 4, light: true, ghost: true, at: { x: 5.5, z: -20.6, yaw: Math.PI, floor: 0 } },
  { id: 'return-shut', group: '家', label: '揚げ戸（櫛を返した後）', tasks: [...DONE, 'T_THINK', 'T_RETURN'], items: ITEMS2, peeled: [...PEEL3, 'F_FLUE', 'F_KOSHI'], flags: ['returned'], fuda: 3, at: { x: 6.6, z: 1.4, yaw: 0, floor: 1 } },
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
      // 2.5.2 (the off-route script walked into 奥の室 and met a shut lattice): once the waxed charm is melted off (T_KOSHI), the scene
      // stands with the lattice door open, as the player left it on the way in
      if (ctx.state.tasks.includes('T_KOSHI') && G.openKoshi) G.openKoshi(true);
      if (sc.light || ctx.state.tasks.includes('T_LIGHT')) G.light0(true);
      if (sc.ghost || sc.hunt) G.placeGhost();
    },
  });
}
