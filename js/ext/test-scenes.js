// Test scenes (?scene=<id>, test mode: nothing is saved): one per key place, for screenshots and checks. tools/scene-links.mjs lists them.
// prepare() makes the world agree with the tasks done on the way (they ran quietly): the mill, the hatch, the lamps, the charms in hand.
const L1 = ['T_CHOBA', 'T_PEEL1', 'T_PASTE1'];
const L2 = ['T_HASHIRI', 'T_OKU', 'T_SAGYO', 'T_PHONE', 'T_USU', 'T_HATCH'];
const L3a = ['T_LIGHT', 'T_P1', 'T_LAMP1'], L3b = [...L3a, 'T_LAMP2', 'T_LAMP3'], L3c = [...L3b, 'T_GATE', 'T_POST', 'T_LAMP4', 'T_OKUMURO'];
const ITEMS2 = ['TESHOKU', 'MATCHES', 'KOTEKO'];
const PEEL1 = ['F_NAKA'], PEEL2 = [...PEEL1, 'F_HASHIRI', 'F_OKU', 'F_ROKA', 'F_SAGYO'];
export const SCENES = [
  { id: 'omote', group: '家', label: '表の土間（はじまり）', at: { x: 1.3, z: 24.6, yaw: -1.0, floor: 1 } },
  { id: 'choba', group: '家', label: '帳場の格子の前', at: { x: 4.9, z: 23.4, yaw: -0.9, floor: 1 } },
  { id: 'daikoku', group: '家', label: '大黒柱（札の練習）', tasks: ['T_CHOBA', 'T_PEEL1'], peeled: PEEL1, fuda: 1, at: { x: 3.8, z: 21.6, yaw: Math.PI / 2, floor: 1 } },
  { id: 'naka', group: '家', label: '中の間（仏壇・黒電話）', tasks: L1, peeled: PEEL1, fuda: 1, at: { x: 4.0, z: 18.6, yaw: 0, floor: 1 } },
  { id: 'hashiri', group: '家', label: '走り庭（台所）', tasks: L1, peeled: [...PEEL1, 'F_HASHIRI'], fuda: 2, at: { x: 1.3, z: 18.8, yaw: 0, floor: 1 } },
  { id: 'oku', group: '家', label: '奥の間', tasks: [...L1, 'T_HASHIRI'], items: ['TESHOKU', 'MATCHES'], peeled: [...PEEL1, 'F_HASHIRI', 'F_OKU'], fuda: 3, at: { x: 5.3, z: 12.2, yaw: 0, floor: 1 } },
  { id: 'sagyo', group: '家', label: '作業場（揚げ戸と臼）', tasks: [...L1, 'T_HASHIRI', 'T_OKU', 'T_SAGYO', 'T_PHONE'], items: ITEMS2, peeled: PEEL2, fuda: 5, at: { x: 4.5, z: 2.5, yaw: -0.61, floor: 1 } },
  { id: 'muro', group: '地下', label: '室（手燭に火を入れる）', tasks: [...L1, ...L2], items: ITEMS2, peeled: PEEL2, fuda: 5, at: { x: 6.6, z: 1.2, yaw: 2.4, floor: 0 } },
  { id: 'p1', group: '地下', label: '板の道', tasks: [...L1, ...L2, ...L3a], items: ITEMS2, peeled: [...PEEL2, 'F_P1'], fuda: 6, light: true, at: { x: 2.6, z: -4, yaw: 0, floor: 0 } },
  { id: 'p2', group: '地下', label: '低い道（しゃがむ）', tasks: [...L1, ...L2, ...L3a], items: ITEMS2, peeled: [...PEEL2, 'F_P1'], fuda: 6, light: true, at: { x: 1.8, z: -41.8, yaw: Math.PI / 2, floor: 0 } },
  { id: 'p3', group: '地下', label: '水の道', tasks: [...L1, ...L2, ...L3a, 'T_LAMP2'], items: ITEMS2, peeled: [...PEEL2, 'F_P1'], fuda: 6, light: true, at: { x: -17.6, z: -46, yaw: 0, floor: 0 } },
  { id: 'gate', group: '地下', label: '札の回廊（格子戸）', tasks: [...L1, ...L2, ...L3b], items: ITEMS2, peeled: [...PEEL2, 'F_P1'], fuda: 6, light: true, at: { x: -12, z: -81.8, yaw: -Math.PI / 2, floor: 0 } },
  { id: 'lesson', group: '地下', label: '結界の柱（練習）', tasks: [...L1, ...L2, ...L3b, 'T_GATE'], items: ITEMS2, peeled: [...PEEL2, 'F_P1', 'F_GATE'], flags: ['gate_seen'], fuda: 7, light: true, at: { x: -3, z: -81.8, yaw: -Math.PI / 2, floor: 0 } },
  { id: 'okumuro', group: '地下', label: '奥の室（奥の棚）', tasks: [...L1, ...L2, ...L3c], items: ITEMS2, peeled: [...PEEL2, 'F_P1', 'F_GATE'], flags: ['gate_seen'], fuda: 6, light: true, at: { x: 9, z: -102, yaw: 0, floor: 0 } },
  { id: 'escape', group: '地下', label: '櫛を持って逃げる（奥の室）', tasks: [...L1, ...L2, ...L3c, 'T_BOX'], items: [...ITEMS2, 'COMB'], peeled: [...PEEL2, 'F_P1', 'F_GATE'], flags: ['gate_seen'], fuda: 6, chase: 0, at: { x: 9, z: -105, yaw: Math.PI, floor: 0 } },
  { id: 'escape-p3', group: '地下', label: '逃げる（水の道の入口）', tasks: [...L1, ...L2, ...L3c, 'T_BOX'], items: [...ITEMS2, 'COMB'], peeled: [...PEEL2, 'F_P1', 'F_GATE'], flags: ['gate_seen'], fuda: 6, chase: 12, at: { x: -17.6, z: -79, yaw: Math.PI, floor: 0 } },
  { id: 'bench', group: '家', label: '作業台（考えをまとめる）', tasks: [...L1, ...L2, ...L3c, 'T_BOX', 'T_ESCAPE', 'T_SEAL'], items: [...ITEMS2, 'COMB'], peeled: [...PEEL2, 'F_P1', 'F_GATE'], flags: ['gate_seen'], fuda: 3, at: { x: 1.6, z: 2.2, yaw: Math.PI / 2, floor: 1 } },
  { id: 'end-give', group: '家', label: '帳場（櫛を持って戻った）', tasks: [...L1, ...L2, ...L3c, 'T_BOX', 'T_ESCAPE', 'T_SEAL'], items: [...ITEMS2, 'COMB'], peeled: [...PEEL2, 'F_P1', 'F_GATE'], flags: ['gate_seen'], fuda: 3, at: { x: 4.9, z: 23.2, yaw: -0.9, floor: 1 } },
  { id: 'end', group: '家', label: '帳場（結末の前・手紙あり）', tasks: [...L1, ...L2, ...L3c, 'T_BOX', 'T_ESCAPE', 'T_SEAL', 'T_THINK', 'T_RETURN', 'T_SQ1'], items: ITEMS2, peeled: [...PEEL2, 'F_P1', 'F_GATE'], flags: ['gate_seen', 'letters', 'returned'], fuda: 3, at: { x: 4.9, z: 23.4, yaw: -0.9, floor: 1 } },
];
export function installTests(ext, G) {
  ext.registerTestScenes(SCENES, {
    prepare: (sc, a) => {
      const ctx = a.ctx;
      for (const i of sc.items || []) if (!ctx.state.inv.includes(i)) ctx.state.inv.push(i);
      for (const f of sc.flags || []) if (!ctx.state.flags.includes(f)) ctx.state.flags.push(f);
      for (const id of sc.peeled || []) { G.peelQuiet(id); const C = G.charms.get(id); if (C && C.door) { const d = ctx.world.doors.get(C.door); if (d) { d.open(); d.snap && d.snap(); } } }
      G.fuda = sc.fuda || 0;
      if (sc.at.floor === 0) { const ps = G.project(sc.at.x, sc.at.z).s; for (const e of G.evS || []) if (e.s >= ps - 0.5 && !G.ev.includes(e.id)) G.ev.push(e.id); }
      if (G.applyStory) G.applyStory();
      if (sc.light || ctx.state.tasks.includes('T_LIGHT')) G.light0(true);
      if (sc.chase != null) { G.candleOut = true; if (G.takeSnap) G.takeSnap(); const ps = G.project(sc.at.x, sc.at.z).s; G.ghostStart('chase', Math.max(0, ps - sc.chase), { rise: 1.5, onCatch: () => { G.ghostStop(); ctx.die('chigusa'); } }); }
    },
  });
}
