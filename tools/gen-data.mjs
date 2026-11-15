#!/usr/bin/env node
// Builds data/*.json for 札の家 ― 奥の棚の櫛 from the tables below (one place for the layout, the charms, the tasks and the words).
//   node tools/gen-data.mjs
// Coordinates are absolute metres (x east, z south). The house is floor 1; the cellar (室) and the long passage are floor 0 (3.4 m below).
// The rule of the game (docs/brief.md): この家のお札は、死んだ者を通さない。千草さんは、自分の櫛のある所へ来る。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wr = (p, v) => { fs.writeFileSync(path.join(ROOT, p), JSON.stringify(v, null, 2) + '\n'); console.log('wrote', p); };
const P = (k) => `assets/photos/${k}.webp`;

// ---------------------------------------------------------------- rooms
const R = (id, name, x, z, w, d, floor, type, extra = {}) => ({ id, name, x, z, w, d, floor, kind: extra.kind || (type === 'corridor' ? 'corridor' : 'room'), type, furnish: false, ...extra });
const rooms = [
  // the house (a long, narrow machiya: the street side is south, the workshop at the back is north)
  R('OMOTE', '表の土間', 0, 20, 2.6, 6, 1, 'doma', { floorTex: 'dirt_floor', wallTex: 'wall_clay_stained' }),
  R('MISE', '店の間', 2.6, 20, 5.4, 6, 1, 'shop', { floorTex: 'planks_worn', wallTex: 'clay_wall' }),
  R('NAKA', '中の間', 2.6, 13, 5.4, 7, 1, 'washitsu', { floorTex: 'tatami_old', wallTex: 'clay_wall' }),
  R('HASHIRI', '走り庭（台所）', 0, 8, 2.6, 12, 1, 'doma', { floorTex: 'dirt_floor', wallTex: 'plaster_soot' }),
  R('OKU', '奥の間', 2.6, 6.5, 5.4, 6.5, 1, 'washitsu', { floorTex: 'tatami_old', wallTex: 'clay_wall' }),
  R('ROKA', '渡り廊下', 2.6, 5, 5.4, 1.5, 1, 'corridor', { kind: 'corridor', floorTex: 'engawa_boards', wallTex: 'clay_wall' }),
  R('SAGYO', '作業場', 0, -1, 8, 6, 1, 'workshop', { floorTex: 'planks_worn', wallTex: 'wall_clay_stained' }),
  // under the workshop: the cellar where the boxwood boards were smoked and laid down for years
  R('MURO', '室（むろ）', 1, -1, 8, 6, 0, 'storage', { floorTex: 'dirt_floor', wallTex: 'stone_wall' }),
  // the long passage (about 150 m), five sections, then the room at the end
  R('P1', '板の道', 1.6, -41, 2, 40, 0, 'corridor', { kind: 'corridor', floorTex: 'planks_dark', wallTex: 'stone_wall' }),
  R('P2', '低い道', -18.6, -42.6, 22.2, 1.6, 0, 'corridor', { kind: 'corridor', floorTex: 'dirt_floor', wallTex: 'rock_granite_mossy' }),
  R('P3', '水の道', -18.6, -81, 2, 38.4, 0, 'corridor', { kind: 'corridor', floorTex: 'wet_floor', wallTex: 'rock_granite_mossy' }),
  R('P4A', '札の回廊', -18.6, -82.6, 14.6, 1.6, 0, 'corridor', { kind: 'corridor', floorTex: 'planks_dark', wallTex: 'planks_dark' }),
  R('P4B', '札の回廊（格子戸の先）', -4, -82.6, 14, 1.6, 0, 'corridor', { kind: 'corridor', floorTex: 'planks_dark', wallTex: 'planks_dark' }),
  R('P5', '下りの道', 8, -100, 2, 17.4, 0, 'corridor', { kind: 'corridor', floorTex: 'dirt_floor', wallTex: 'stone_wall' }),
  R('OKUMURO', '奥の室', 5, -108, 8, 8, 0, 'storage', { floorTex: 'dirt_floor', wallTex: 'stone_wall' }),
];

// ---------------------------------------------------------------- doors (a charm on a door: data/fuda.json; the ext locks the door until it is peeled)
const D = (id, a, b, x, z, look, o = {}) => ({ id, a, b, x, z, width: o.width || 1.1, look, ...o });
const doors = [
  D('D_MISE', 'OMOTE', 'MISE', 2.6, 23.4, 'none', { open: true, width: 3.0, reason: '土間から店の間へ上がる框（戸のない段差）' }),
  D('D_NAKA', 'MISE', 'NAKA', 3.9, 20, 'fusuma', { closable: true, reason: '町家は廊下がなく、表から奥へ部屋が一列に続く（店の間の奥が中の間）' }),
  D('D_HASHIRI', 'OMOTE', 'HASHIRI', 1.3, 20, 'slide', { closable: true, width: 1.2, reason: '表の土間は、中戸の先で台所の走り庭へ土間のまま続く', unlock: 'house', hint: '土間の奥の中戸。札が貼ってある。……今は、ハルさんの話が先だ。' }),
  D('D_OKU', 'NAKA', 'OKU', 5.3, 13, 'fusuma', { closable: true, reason: '中の間の奥が、奥の間（町家の部屋は一列）', unlock: 'house', hint: '奥の間の襖。札が貼ってある。……今は、ハルさんの話が先だ。' }),
  D('D_ROKA', 'OKU', 'ROKA', 5.3, 6.5, 'slide', { closable: true, unlock: 'house', hint: '渡り廊下への板戸。札が貼ってある。' }),
  D('D_SAGYO', 'ROKA', 'SAGYO', 5.3, 5, 'slide', { closable: true, unlock: 'house', hint: '作業場の板戸。札が貼ってある。' }),
  D('D_P1', 'MURO', 'P1', 2.6, -1, 'slide', { closable: true, width: 1.2, unlock: 'passage', hint: '通路への板戸。札が貼ってある。真っ暗で、灯りがないと進めない。' }),
  D('D_P12', 'P1', 'P2', 2.6, -41, 'none', { open: true, width: 1.6 }),
  D('D_P23', 'P2', 'P3', -17.6, -42.6, 'none', { open: true, width: 1.6 }),
  D('D_P34', 'P3', 'P4A', -17.6, -81, 'none', { open: true, width: 1.6 }),
  D('D_GATE', 'P4A', 'P4B', -4, -81.8, 'none', { width: 1.4, unlock: 'passage', hint: '札だらけの格子戸。格子の真ん中の札が、戸と柱をつないでいる。' }),
  D('D_P45', 'P4B', 'P5', 9, -82.6, 'none', { open: true, width: 1.6 }),
  D('D_END', 'P5', 'OKUMURO', 9, -100, 'slide', { closable: true, width: 1.2 }),
];
// the ladder under the workshop's floor hatch (揚げ戸): the same place on both floors; the hatch opens when its old charm is peeled (stage L3)
doors.push({ id: 'ST_HATCH', a: 'MURO', b: 'SAGYO', kind: 'stairs', width: 1.0, unlock: 'muro', label: 'はしごを使う',
  hint: '作業場の床の揚げ戸。石の臼が載り、古い札が貼ってある。',
  ends: { a: { x: 6.6, z: 0.2, dir: 'n', arrive: [6.6, 1.0], yaw: Math.PI }, b: { x: 6.6, z: 0.2, dir: 'n', arrive: [6.6, 1.0], yaw: Math.PI } },
  reason: '作業場の床の揚げ戸から、地下の室へ降りるはしご' });

// ---------------------------------------------------------------- charms (お札). on: a door (peel to open) | post (paste to hold the dead back) | wall (spare ones)
// side: the face the charm is on (n / s / e / w of the door line), so it faces the player who comes to it.
const fuda = {
  doors: [
    { id: 'F_NAKA', door: 'D_NAKA', side: 's', stage: 'L1', label: '中の間の襖の札' },
    { id: 'F_HASHIRI', door: 'D_HASHIRI', side: 's', stage: 'L2', label: '中戸の札' },
    { id: 'F_OKU', door: 'D_OKU', side: 's', stage: 'L2', label: '奥の間の襖の札' },
    { id: 'F_ROKA', door: 'D_ROKA', side: 's', stage: 'L2', label: '渡り廊下の板戸の札' },
    { id: 'F_SAGYO', door: 'D_SAGYO', side: 's', stage: 'L2', label: '作業場の板戸の札' },
    { id: 'F_P1', door: 'D_P1', side: 's', stage: 'L3', label: '通路の板戸の札' },
    { id: 'F_GATE', door: 'D_GATE', side: 'w', stage: 'L3', label: '格子戸の札' },
  ],
  // posts: two pillars with a rope (結界の柱). x / z = the middle of the passage; along: the axis the passage runs on there
  posts: [
    { id: 'K_DAIKOKU', room: 'MISE', x: 2.78, z: 21.4, kind: 'pillar', label: '大黒柱' },
    { id: 'K_LESSON', room: 'P4B', x: 2.0, z: -81.8, along: 'x', label: '結界（けっかい）の柱' },
    { id: 'K_P5', room: 'P5', x: 9, z: -98.8, along: 'z', label: '結界の柱' },
    { id: 'K_P5B', room: 'P5', x: 9, z: -84.0, along: 'z', label: '結界の柱' },
    { id: 'K_P4', room: 'P4A', x: -9.0, z: -81.8, along: 'x', label: '結界の柱' },
    { id: 'K_P3A', room: 'P3', x: -17.6, z: -78.6, along: 'z', label: '結界の柱' },
    { id: 'K_P3B', room: 'P3', x: -17.6, z: -60.0, along: 'z', label: '結界の柱' },
    { id: 'K_P3C', room: 'P3', x: -17.6, z: -45.0, along: 'z', label: '結界の柱' },
    { id: 'K_P2', room: 'P2', x: -6.0, z: -41.8, along: 'x', label: '結界の柱' },
    { id: 'K_P1A', room: 'P1', x: 2.6, z: -28.0, along: 'z', label: '結界の柱' },
    { id: 'K_P1B', room: 'P1', x: 2.6, z: -10.0, along: 'z', label: '結界の柱' },
  ],
  // the spare charms on the walls of the charm corridor (side quest: more charms for the way back)
  walls: [
    { id: 'W_1', room: 'P4A', x: -14.0, z: -81.13, face: 'n', label: '壁の札' },
    { id: 'W_2', room: 'P4A', x: -11.2, z: -82.47, face: 's', label: '壁の札' },
    { id: 'W_3', room: 'P4A', x: -6.4, z: -81.13, face: 'n', label: '壁の札' },
  ],
  // the route the dead woman walks (the middle of the passage, from the room at the end to the ladder)
  route: [[9, -104], [9, -100], [9, -81.8], [-17.6, -81.8], [-17.6, -41.8], [2.6, -41.8], [2.6, -1.0], [6.0, 0.6]],
};

// ---------------------------------------------------------------- stations
const S = (id, room, x, z, label, o = {}) => ({ id, room, x, z, label, ...o });
const stations = [
  S('S_CHOBA', 'MISE', 5.35, 22.75, '帳場の格子'),
  S('S_PHONE', 'NAKA', 3.15, 13.55, '黒電話'),
  S('S_BUTSUDAN', 'NAKA', 7.45, 16.5, '仏壇'),
  S('S_USU', 'SAGYO', 6.6, 0.9, '揚げ戸の上の臼'),
  S('S_HATCH', 'SAGYO', 6.6, 0.25, '揚げ戸'),
  S('S_BENCH', 'SAGYO', 0.75, 2.2, '作業台'),
  S('S_LIGHT', 'MURO', 5.2, 1.6, '燻し炉の縁'),
  S('S_LAMP1', 'P1', 1.95, -2.6, '壁の灯明'),
  S('S_LAMP2', 'P3', -18.25, -44.2, '壁の灯明'),
  S('S_LAMP3', 'P4A', -16.0, -82.25, '壁の灯明'),
  S('S_LAMP4', 'P5', 9.65, -84.8, '壁の灯明'),
  S('S_SHELF', 'OKUMURO', 9, -107.3, '奥の棚'),
];

// hides: cupboards for boards with a charm inside the door (G7: you see what they are)
const hides = [
  { id: 'H_MURO', room: 'MURO', x: 8.5, z: 3.8, look: 'cabinet', label: '札を貼った戸棚' },
  { id: 'H_P1', room: 'P1', x: 3.25, z: -21.5, look: 'cabinet', label: '札を貼った戸棚' },
  { id: 'H_P3', room: 'P3', x: -16.95, z: -66.0, look: 'cabinet', label: '札を貼った戸棚' },
  { id: 'H_P5', room: 'P5', x: 9.65, z: -92.0, look: 'cabinet', label: '札を貼った戸棚' },
];

const plan = {
  rooms, doors, stations, hides, furniture: [], start: 'OMOTE',
  spawn: { x: 1.3, z: 24.6, yaw: -1.0, floor: 1 },
  lampPool: true,
  exits: ['OMOTE'],
  floorNames: { 0: '地下', 1: '家' },
  checks: { ignore: ['no-loop', 'exits-few', 'direct-total', 'no-corridor'], why: '出口は表の戸一つ（閉じ込められる話。最後にハルさんが開ける）。町家は奥へ一本につながる作り（表から奥へ、戸を一枚ずつ）。地下の通路も一本道（長い一本道を、札を貼りながら逃げる場面として作った）。' },
};

// ---------------------------------------------------------------- items
const items = [
  { id: 'SHEET', name: '訪問の記録票', start: true, kind: 'folder', photo: P('item-sheet'), desc: 'ひまわり訪問介護の記録票。「櫛田ハル様（96）。帳場から動かれません。家の奥（作業場・地下）には入らないこと。お札には触らないこと（ご本人の強い希望）。担当：野口」', why: '今日の訪問の中身と、この家の注意が書いてある。', feeling: '奥へ行くな、札に触るな。……その両方を、これからする。' },
  { id: 'PHONE', name: '携帯電話', start: true, kind: 'handheld', photo: P('item-phone'), desc: '私の携帯。この家の中では圏外で、電池も残り少ない。', why: '外に助けを呼べない。', feeling: 'アンテナが一本も立たない。' },
  { id: 'TESHOKU', name: '手燭', room: 'HASHIRI', x: 2.25, z: 17.7, y: 1.0, kind: 'candlestick', stage: 'L2', photo: P('item-teshoku'), desc: '持ち手のついた小さな燭台。短い蝋燭が立っている。', why: '地下の室と通路は真っ暗。マッチで火を入れて、足元を照らす（[F] で灯す・消す）。', feeling: '小さな火だ。消さないように歩こう。' },
  { id: 'MATCHES', name: 'マッチ', room: 'HASHIRI', x: 0.5, z: 15.4, y: 0.8, kind: 'matchbox', stage: 'L2', photo: P('item-matches'), desc: '台所のマッチ箱。まだ何本も残っている。', why: '手燭と、通路の壁の灯明（とうみょう：油の皿の古い灯り）に火を入れる。', feeling: '湿気ていない。誰かが最近まで使っていた。' },
  { id: 'KOTEKO', name: '鉄の梃子', room: 'SAGYO', x: 7.5, z: 3.9, y: 0.9, kind: 'crowbar', stage: 'L2', photo: P('item-koteko'), desc: '作業場の壁に立てかけてあった、長い鉄の棒。', why: '揚げ戸の上の重い臼を、梃子の力で転がしてどかす。', feeling: '重い。手が冷える。' },
  { id: 'OLD_FUDA', name: '揚げ戸の古い札', given: 'T_HATCH', kind: 'burnt-paper', photo: P('item-oldfuda'), desc: '揚げ戸に貼ってあった札。ほかのどの札よりも古く、黄ばんでいる。墨で日付：「昭和四十九年霜月十四日」（霜月は十一月）。揚げ戸の上から、下へ向けて貼ってあった。', why: 'この家でいちばん最初に貼られた札かもしれない。日付が手がかりになる。', feeling: '下から上がって来られないように貼った札だ。' },
  { id: 'COMB', name: '柘植の櫛', given: 'T_BOX', kind: 'comb', photo: P('item-comb'), desc: '明るい黄色の、半月の形の櫛。柘植（つげ）の木を削って磨いたもの。歯が細かく、一本も欠けていない。', why: 'ハルさんが「持って来い」と言った櫛。婚礼の写真で、千草さんの髪に挿してあった櫛と同じ形。', feeling: '持っていると、首のうしろが冷たい。' },
  { id: 'LETTER1', name: 'ハルさんの手紙（一）', room: 'HASHIRI', x: 2.25, z: 18.4, y: 0.62, kind: 'envelope', stage: 'L2', photo: P('item-letter'), desc: '水屋の引き出しの奥にあった封筒。宛名は「千草へ」。切手は貼っていない。', why: '出さなかった手紙。三通そろえて、仏壇の前で書いた順に並べる（寄り道）。', feeling: '宛名の字が、震えている。' },
  { id: 'LETTER2', name: 'ハルさんの手紙（二）', room: 'OKU', x: 3.3, z: 7.05, y: 1.05, kind: 'envelope', stage: 'L2', photo: P('item-letter'), desc: '着物の箪笥の上に、たたんだ着物の間にはさんであった封筒。宛名は「千草へ」。', why: '出さなかった手紙（寄り道）。', feeling: '何度も開けて、閉じた跡がある。' },
  { id: 'LETTER3', name: 'ハルさんの手紙（三）', room: 'SAGYO', x: 2.6, z: 4.5, y: 0.75, kind: 'envelope', stage: 'L2', photo: P('item-letter'), desc: '作業場の道具箱の蓋の裏に、糊で貼りつけてあった封筒。宛名は「千草へ」。中に、二枚。古い便箋と、新しい便箋。', why: '出さなかった手紙（寄り道）。', feeling: 'いちばん新しい手紙だ。' },
];

// ---------------------------------------------------------------- documents (F7 / F18)
const docs = [
  { id: 'DOC_TODOKE', title: '家出人捜索願（控え）', room: 'NAKA', x: 6.0, z: 13.35, y: 0.9, stage: 'L2', photo: P('doc-todoke'),
    text: '家出人捜索願（控）　昭和四十九年十一月十六日\n届出人：櫛田ハル（本人の義母）\n家出人：櫛田千草（二十八歳）\n家出の日時：昭和四十九年十一月十四日　夕方\n状況：置き手紙もなく、家を出たまま戻らない。夫（清次）を十月に亡くし、ふさいでいた。',
    feeling: '家出の届を出したのは、ハルさん。千草さんがいなくなった二日あとだ。' },
  { id: 'DOC_DIARY', title: '千草の日記帳', room: 'OKU', x: 7.35, z: 11.6, y: 0.42, stage: 'L2', photo: P('doc-diary'),
    text: '昭和四十九年十月五日\nおととい、清次さんが、櫛の配達の帰りに、車の事故で亡くなった。お義母さんは、私の櫛のせいだと言う。櫛は「苦死（くし）」に通じる。嫁に櫛を贈るから、こうなったのだ、と。\n\n十一月二日\nお義母さんが、私の櫛を取り上げた。清次さんが婚礼のときに作ってくれた、柘植の櫛。\n\n十一月十四日\nお義母さんが言った。「櫛が欲しけりゃ、奥の棚から持って来い」。室の奥の棚に置いたそうだ。今から、手燭（てしょく）を持って降りる。',
    feeling: '「奥の棚から持って来い」。……ハルさんが私に言ったのと、同じ言葉だ。日記は、この日で終わっている。' },
  { id: 'DOC_TSUGE', title: '柘植櫛の作り方（作業場の板書き）', room: 'SAGYO', x: 3.6, z: -0.94, y: 1.5, stage: 'L2', photo: P('doc-tsuge'),
    text: '一、柘植（つげ）の木を、板に挽く。\n二、板を室（むろ）で燻し、七年寝かせる。狂いが出なくなるまで。\n三、歯を一本ずつ挽き、木賊（とくさ）で磨く。\n四、椿油に漬けて、色と艶を出す。\n――櫛田櫛店　清次',
    feeling: '地下の室は、櫛の板を寝かせておく場所だったんだ。' },
  { id: 'DOC_KANBAN', title: '店の札書き', room: 'MISE', x: 5.0, z: 25.9, y: 1.6, stage: 'L1', photo: P('room-mise'),
    text: '柘植櫛　櫛田櫛店　明治二十年創業\n「櫛は髪を守り、持ち主を守る」\n※婚礼の櫛、承ります',
    feeling: '婚礼の櫛。……櫛は「苦死（くし）」に通じるから、贈り物にはしないと聞いたことがある。' },
];

// ---------------------------------------------------------------- things to look at
const T = (id, room, x, z, y, label, text, feeling, o = {}) => ({ id, room, position: [x, z], y, label, text, feeling, size: o.size || 0.7, ...(o.photo ? { photo: P(o.photo) } : {}), ...(o.requires ? { requires: o.requires } : {}) });
const things = [
  T('OMOTE_DOOR', 'OMOTE', 1.3, 25.85, 1.2, '表の戸', ['押しても引いても、動かない。鍵は開いているのに、向こうから押さえられているみたいだ。', 'やはり動かない。ハルさんは「戸は、わしが押さえとる」と言った。'], '外の音が、まるで聞こえない。', { photo: 'th-omote-door' }),
  T('OMOTE_SHOES', 'OMOTE', 2.1, 22.2, 0.3, '上がり框', ['靴が一足。女物の古い草履。きちんとそろえてある。'], '何十年も履いていないような草履だ。', { photo: 'th-omote-shoes' }),
  T('MISE_CASE', 'MISE', 4.0, 25.6, 1.0, '陳列棚', ['ガラスの棚に、櫛が並んでいた跡。日に焼けていない四角い跡が残っている。中身は一つもない。'], '櫛の店なのに、櫛が一本もない。', { photo: 'th-mise-case' }),
  T('MISE_TEA', 'MISE', 5.6, 22.9, 0.9, '格子の前の湯呑み', ['格子の前に、湯呑みが二つ。茶はとっくに乾いて、茶渋が輪になっている。埃が積もっている。'], '何日も、誰も触っていない。', { photo: 'th-mise-tea' }),
  T('MISE_LATTICE', 'MISE', 5.85, 21.2, 1.2, '帳場の格子', ['格子の内側に、札がすき間なく貼ってある。内には、火鉢と小さな行灯（あんどん）。', '外から何かが入らないように、貼ったのだろうか。'], 'ハルさんは、背中を向けたまま動かない。', { photo: 'th-mise-lattice' }),
  T('NAKA_IHAI', 'NAKA', 7.6, 16.5, 1.15, '仏壇の位牌', ['位牌が一つ。「櫛田清次　昭和四十九年十月三日　行年（ぎょうねん：亡くなった歳）二十六」。', '清次さんは昭和四十九年の十月に亡くなっている。'], 'ハルさんの息子さんだろう。五十二年前に、二十六で。', { photo: 'th-naka-ihai' }),
  T('NAKA_PHOTO', 'NAKA', 7.6, 17.4, 1.45, '婚礼の写真', ['古い婚礼の写真。紋付の若い男の人と、白無垢（しろむく）の花嫁。花嫁の髪に、明るい色の半月の櫛が挿してある。', '写真の裏に「清次・千草　昭和四十五年春」。'], '花嫁の櫛。……ハルさんが欲しがっている櫛は、これだろうか。', { photo: 'doc-wedding' }),
  T('NAKA_PHONE', 'NAKA', 3.0, 13.4, 0.9, '黒電話', ['黒電話。受話器を上げても、何の音もしない。ダイヤルを回しても、どこにもつながらない。', '線が古いのかもしれない。'], '外へは、電話もかけられない。', { photo: 'th-naka-phone' }),
  T('NAKA_TANSU', 'NAKA', 6.0, 13.35, 0.7, '箪笥', ['引き出しの一つに、役所の書類の控えが入っている。'], '', { photo: 'th-naka-tansu' }),
  T('HASHIRI_KAMADO', 'HASHIRI', 0.5, 15.8, 0.9, 'かまど', ['煤けたかまど。火を落としてから、ずいぶんたっている。'], '', { photo: 'th-hashiri-kamado' }),
  T('HASHIRI_WELL', 'HASHIRI', 1.3, 9.0, 0.7, '井戸', ['土間の中に井戸がある。木の蓋に、札が三枚。', '蓋の下で、水がはねる音がした。'], 'この井戸の水は、どこにつながっているんだろう。', { photo: 'th-hashiri-well' }),
  T('HASHIRI_MIZUYA', 'HASHIRI', 2.25, 18.8, 1.55, '水屋', ['茶碗が二人分。片方は、縁が欠けている。'], '', { photo: 'th-hashiri-mizuya' }),
  T('OKU_KYODAI', 'OKU', 7.6, 8.0, 1.0, '鏡台', ['鏡台に布がかけてある。引き出しに、櫛を入れる細長い桐の箱。中は空だ。'], '櫛の箱だけが、ここにある。', { photo: 'th-oku-kyodai' }),
  T('OKU_KIMONO', 'OKU', 2.75, 7.05, 0.6, '着物の箪笥', ['箪笥の上に、藍色の着物がたたんである。……少し湿っている。'], '', { photo: 'th-oku-kimono' }),
  T('ROKA_AMADO', 'ROKA', 7.6, 5.75, 1.2, '雨戸', ['雨戸が閉め切ってある。すき間に、札が縦に何枚も貼ってある。'], '外は、もう真っ暗だろう。', { photo: 'th-roka-amado' }),
  T('SAGYO_COMB', 'SAGYO', 0.55, 1.2, 0.95, '作りかけの櫛', ['作業台に、作りかけの櫛が一枚。歯が半分だけ挽いてある。のこぎり、やすり、木賊（とくさ：磨くための草）。'], '五十年以上、誰も触っていない。', { photo: 'th-sagyo-comb' }),
  T('SAGYO_BOARDS', 'SAGYO', 1.2, 4.6, 1.2, '柘植の板', ['薄い板が束ねて立ててある。黄色い木肌。櫛の材の柘植だ。'], '', { photo: 'th-sagyo-boards' }),
  T('SAGYO_FLOOR', 'SAGYO', 4.2, 1.5, 0.1, '作業場の床', ['床板の下から、かすかに音がする。カリ……カリ……。何かを、細かくひっかくような。'], '櫛で、髪をすく音みたいだ。', { photo: 'th-sagyo-floor' }),
  T('MURO_SCRATCH', 'MURO', 6.6, 0.0, 3.0, '揚げ戸の裏', ['揚げ戸の裏板に、爪でかいた跡が何十本もある。下から、誰かが開けようとした跡だ。'], '閉じこめられていたんだ。下から、何日も。', { photo: 'th-muro-scratch' }),
  T('MURO_BOARDS', 'MURO', 8.6, 0.6, 1.2, '寝かせた板', ['柘植の板が、壁一面に積んである。燻された煙の匂いが、まだ残っている。'], '', { photo: 'th-muro-boards' }),
  T('MURO_KILN', 'MURO', 5.2, 2.6, 0.5, '燻し炉', ['板を燻すための、浅い炉。灰が固まっている。'], '', { photo: 'th-muro-kiln' }),
  T('P1_HAIR', 'P1', 1.75, -16.0, 1.3, '板のすき間', ['積んだ板のすき間に、長い黒髪がはさまっている。何本も。'], '女の人の髪だ。', { photo: 'th-p1-hair' }),
  T('P2_HANDS', 'P2', -6.0, -41.8, 0.1, '濡れた手の跡', ['床に、濡れた手の跡が続いている。這って進んだ跡だ。奥から、こちらへ。'], '', { photo: 'th-p2-hands' }),
  T('P3_TOOTH', 'P3', -17.2, -58.0, 0.1, '水に浮くもの', ['水の上に、長い髪の束が浮いている。……ゆっくり、こちらへ流れてくる。'], '', { photo: 'th-p3-tooth' }),
  T('P4_FUDA', 'P4A', -12.6, -81.04, 1.4, '回廊の札', ['壁も天井も、札で埋まっている。何百枚。日付はどれも「昭和四十九年霜月十四日」。……一晩で、これだけ貼ったのか。'], 'あの夜、ハルさんは千草さんを閉じこめるために、これだけの札を書いた。', { photo: 'th-p4-fuda' }),
  T('P5_STEPS', 'P5', 8.4, -94.0, 0.1, '足跡', ['湿った土に、小さな足跡。素足の女の人の足。奥から来て、奥へ戻っている。'], '', { photo: 'th-p5-steps' }),
  T('OKUMURO_KIMONO', 'OKUMURO', 8.2, -106.6, 0.3, '藍の着物', ['棚の下に、藍の着物がくずれている。長い黒髪が、床に広がっている。袖から、白い指の骨がのぞいている。', '帯留めに、字が彫ってある。「千草」。'], '千草さんは、家出したんじゃない。五十二年、ここにいたんだ。', { photo: 'th-okumuro-kimono' }),
  T('OKUMURO_CANDLE', 'OKUMURO', 10.6, -107.2, 0.3, '燃え尽きた手燭', ['手燭が一つ。蝋燭は根元まで燃え尽きている。'], '千草さんの灯りは、ここで尽きた。', { photo: 'th-okumuro-candle' }),
];

// ---------------------------------------------------------------- stages
const stages = {
  goal: { title: '奥の棚の櫛を持ち帰り、この家で起きたことを確かめる', short: '奥の棚の櫛を持って来る', sub: '戸の札をはがして奥へ進む。はがした札は、柱に貼って使える。', meter: '進み' },
  levels: [
    { id: 'L1', name: '帳場の声', title: '帳場のハルさんの話を聞き、札のはがし方と貼り方を覚える', recap: '私はヘルパーの宮下航。代わりに訪ねた櫛田ハルさんの家で、表の戸が開かなくなった。帳場の格子の奥のハルさんに「奥の棚から櫛を持って来い。持って来るまで戸は開けん」と言われた。札は [E] ではがせて、柱に [E] で貼れる。', text: '札に向いて [E] で、そっとはがせる。はがした札は、柱に [E] で貼れる。', unlocks: ['front'] },
    { id: 'L2', name: '家の奥へ', title: '札をはがしながら奥へ進み、作業場の揚げ戸を開ける', recap: '札をはがして中の間・台所・奥の間を抜け、作業場まで来た。黒電話で野口さんから、ハルさんが先週亡くなったと聞いた。死んだハルさんは、自分の札の輪から出られない。千草さんの日記は「奥の棚から持って来い」と言われた日で終わっていた。揚げ戸の札は、その日の日付だった。', text: 'ハルさんは先週亡くなっている。死んだ者は、札を越えられない。', unlocks: ['house'] },
    { id: 'L3', name: '室と長い通路', title: '地下の室で手燭に火を入れ、灯明に火を移しながら、通路の奥の室まで行く', recap: '揚げ戸の裏には、下から爪でかいた跡があった。長い通路の札の回廊で、藍の着物の女の人が札に押し返された。柱に札を貼ると、その向こうで止まった。', text: '通路は長い。灯明に火を移しておけば、帰り道が明るい。', unlocks: ['muro', 'passage'] },
    { id: 'L4', name: '奥の棚', title: '奥の棚の櫛を取り、追ってくる千草さんを柱の札で止めながら、揚げ戸まで戻る', recap: '奥の室で、千草さんの亡きがらを見つけた。棚の箱の櫛を取ると、千草さんが起き上がって追ってきた。柱の札で止めながら通路を戻り、揚げ戸に古い札を上から貼った。', text: '櫛を持っていると、千草さんが来る。柱に札を貼って止める。', unlocks: [] },
    { id: 'L5', name: '札の家の謎', title: '作業台で考えをまとめ、櫛をどうするか決める', recap: '五十二年前、ハルさんは千草さんに「奥の棚から櫛を持って来い」と言い、降りた千草さんを揚げ戸の札と臼で閉じこめた。櫛をハルさんに渡すか、千草さんに返すかを決める。', text: '櫛をハルさんに渡すか、千草さんに返すか。', unlocks: [] },
  ],
  facts: [
    { from: 'L1', text: 'お札は、死んだ者を通さない。戸の札をはがすと戸が開き、はがした札は柱に貼れる（右上の「札 ×N」）。' },
    { from: 'L1', text: '表の戸は、ハルさんが押さえている。奥の棚の櫛を持って来るまで開けない、と言った。' },
    { from: 'L2', text: 'ハルさんは先週、病院で亡くなった。死んだので、自分が貼った札の輪（帳場の格子）から出られない。' },
    { from: 'L2', text: '千草さん（ハルさんの息子・清次さんの妻）は、昭和四十九年十一月十四日に「家出した」ことになっている。その日の日記は「奥の棚から持って来い」と言われて地下へ降りる、で終わっている。' },
    { from: 'L3', text: '千草さんは、自分の櫛のある所へ来る。柱に貼った札の向こうで止まるが、札は焦げて、しばらくで落ちる。' },
  ],
  unlocks: {
    front: { name: '表の土間・店の間', icon: 'home', desc: '最初から歩ける。' },
    house: { name: '中の間・走り庭・奥の間・渡り廊下・作業場', icon: 'door', desc: 'ハルさんの話を聞いたあと、戸の札をはがして進む。' },
    muro: { name: '地下の室', icon: 'stairs', desc: '作業場の揚げ戸の臼をどかし、古い札をはがすと降りられる。' },
    passage: { name: '長い通路と奥の室', icon: 'door', desc: '室の板戸の札をはがし、手燭に火を入れて進む。' },
  },
};

// ---------------------------------------------------------------- tasks
const stepRoom = (text, room, body) => ({ text, body, done: 'room', room });
const stepLook = (st, text, body) => ({ text, body, done: 'look', emphasis: `station:${st}` });
const stepDo = (text, body) => ({ text, body, done: 'task' });
const tasks = [
  // L1
  { id: 'T_CHOBA', stage: 'L1', room: 'MISE', station: 'S_CHOBA', title: '帳場の格子の前で、ハルさんと話す',
    meaning: '表の戸が開かない理由と、ハルさんが私に何をさせたいのかを聞くため。', hint: '店の間の右奥、格子で囲まれた帳場。格子の前で [E]。',
    steps: [stepLook('S_CHOBA', '帳場の格子の前に立つ', '店の間の右奥。灯りの向こうに、背中を向けた老女。'), stepDo('[E] で話す')] },
  { id: 'T_PEEL1', stage: 'L1', room: 'MISE', needs: ['T_CHOBA'], title: '中の間の襖の札をはがす',
    meaning: '札のはがし方を覚えるため。はがした札は持ち歩けて、帰りに柱に貼って使える。', hint: '店の間の奥（北）の襖。札に向いて [E] で、そっとはがせる。',
    steps: [{ text: '中の間の襖の札に向く', body: '店の間の奥の襖。白い札が、襖と柱にまたがって貼ってある。', done: 'task' }] },
  { id: 'T_PASTE1', stage: 'L1', room: 'MISE', needs: ['T_PEEL1'], title: '大黒柱に札を貼り、もう一度はがす',
    meaning: '札の貼り方を覚えるため。柱に貼った札の向こうへ、死んだ者は来られない。', hint: '店の間と土間の境の太い柱（大黒柱）。柱に向いて [E] で貼り、もう一度 [E] ではがす。',
    steps: [{ text: '大黒柱に向いて [E] で札を貼る', done: 'task' }] },
  // L2
  { id: 'T_HASHIRI', stage: 'L2', room: 'HASHIRI', title: '走り庭（台所）で、手燭とマッチを持つ',
    meaning: '地下は真っ暗だとハルさんが言った。灯りになる手燭と、火をつけるマッチが要る。', hint: '表の土間の奥の中戸（札が貼ってある）。その向こうの、土間の台所。',
    steps: [stepRoom('表の土間の中戸の札をはがして、走り庭へ', 'HASHIRI', '走り庭は、土間のまま奥へ続く台所。'), stepDo('手燭とマッチを拾う', '水屋の上と、かまどの上。')] },
  { id: 'T_OKU', stage: 'L2', room: 'OKU', title: '奥の間を調べる',
    meaning: '作業場へは、奥の間と渡り廊下を通る。奥の間は、ハルさんの息子夫婦の部屋だったらしい。', hint: '中の間の奥の襖。札をはがして入る。文机の日記帳。',
    steps: [stepRoom('中の間の奥の襖の札をはがして、奥の間へ', 'OKU'), stepDo('文机の日記帳を読む', '部屋の東の窓ぎわ。')] },
  { id: 'T_SAGYO', stage: 'L2', room: 'SAGYO', needs: ['T_OKU'], title: '渡り廊下を抜けて、作業場へ入る',
    meaning: 'ハルさんの言った揚げ戸は、作業場の床にある。', hint: '奥の間の奥の板戸、渡り廊下、その先の板戸。どちらも札をはがす。',
    steps: [stepRoom('奥の間の板戸の札をはがして、渡り廊下へ', 'ROKA'), stepRoom('作業場の板戸の札をはがして、作業場へ', 'SAGYO')] },
  { id: 'T_PHONE', stage: 'L2', room: 'NAKA', station: 'S_PHONE', needs: ['T_SAGYO'], title: '中の間の黒電話に出る',
    meaning: 'つながらなかった黒電話が鳴っている。誰かが、この家にかけてきた。外と話せるかもしれない。', hint: '中の間の北西の隅の黒電話。',
    steps: [stepRoom('鳴っている黒電話の中の間へ戻る', 'NAKA'), stepLook('S_PHONE', '黒電話の前に立つ'), stepDo('[E] で受話器を取る')] },
  { id: 'T_USU', stage: 'L2', room: 'SAGYO', station: 'S_USU', needs: ['T_PHONE'], title: '梃子で、揚げ戸の上の臼をどかす',
    meaning: '揚げ戸の上に、石の臼が載せてある。どかさないと揚げ戸が開かない。', hint: '作業場の東の壁に、鉄の梃子が立てかけてある。',
    minigame: { type: 'timing', cfg: { title: '臼を転がす', help: '梃子を臼の下に差しこんだ。揺れる印が赤い帯に来た瞬間に押して、体重をかける。三回で臼が転がる。', need: 3, half: 0.12, speed: 1.1, look: 'hammer', ok: '臼が、ごろりと転がった。', miss: '梃子が滑った。もう一度、印が帯に来たときに。' } },
    steps: [stepDo('鉄の梃子を拾う', '作業場の東の壁ぎわ。'), stepLook('S_USU', '揚げ戸の上の臼の前に立つ'), stepDo('[E] で梃子を差しこむ')] },
  { id: 'T_HATCH', stage: 'L2', room: 'SAGYO', station: 'S_HATCH', needs: ['T_USU'], title: '揚げ戸の古い札をはがす',
    meaning: '揚げ戸の上から、古い札が貼ってある。はがせば、地下の室へ降りられる。', hint: '臼をどかした揚げ戸の上。',
    steps: [stepLook('S_HATCH', '揚げ戸の札を見る'), stepDo('[E] で古い札をはがす')] },
  // L3
  { id: 'T_LIGHT', stage: 'L3', room: 'MURO', station: 'S_LIGHT', title: '室で、手燭に火を入れる',
    meaning: '室も通路も真っ暗。マッチの火を手燭に移さないと、一歩も進めない。', hint: '作業場の揚げ戸のはしごを降りる。降りたすぐ前の、燻し炉（いぶしろ）の縁。',
    minigame: { type: 'steady-hand', cfg: { title: 'マッチの火を手燭に移す', help: '下からすき間風が吹いてくる。指先（印）を、ゆっくり動く輪の中に保って、火を守る。', sec: 6, r: 0.2, speed: 0.6, look: 'flame', ok: '手燭に火が入った。' } },
    steps: [stepRoom('揚げ戸のはしごで、地下の室へ降りる', 'MURO'), stepLook('S_LIGHT', '燻し炉の縁に手燭を置く'), stepDo('[E] でマッチを擦る')] },
  { id: 'T_P1', stage: 'L3', room: 'MURO', needs: ['T_LIGHT'], title: '室の奥の、通路の板戸の札をはがす',
    meaning: 'ハルさんの言った通路は、この板戸の向こう。', hint: '室の北の壁、はしごの左手の板戸。',
    steps: [{ text: '通路の板戸の札をはがす', body: '室の北の壁。', done: 'task' }] },
  { id: 'T_LAMP1', stage: 'L3', room: 'P1', station: 'S_LAMP1', needs: ['T_P1'], title: '板の道の灯明に火を移す',
    meaning: '灯明（とうみょう）は、油の皿に灯心をひたした古い灯り。帰りに走るとき、道が見えるように火を移しておく。', hint: '通路に入ってすぐ、左の壁のくぼみ。',
    steps: [stepLook('S_LAMP1', '壁の灯明の前に立つ'), stepDo('[E] で火を移す')] },
  { id: 'T_LAMP2', stage: 'L3', room: 'P3', station: 'S_LAMP2', needs: ['T_LAMP1'], title: '水の道の灯明に火を移す',
    meaning: '帰り道のために、灯明に火を移しておく。', hint: '板の道を北へ、突き当たりを左の低い道（しゃがんで進む）、その先を右。水の道の入口の左の壁。',
    steps: [stepRoom('板の道を北へ進む', 'P1'), stepRoom('突き当たりを左、低い道をしゃがんで進む', 'P2', '[C]（画面では「しゃがむ」）。天井が低い。'), stepRoom('右へ曲がって、水の道へ', 'P3'), stepLook('S_LAMP2', '壁の灯明の前に立つ'), stepDo('[E] で火を移す')] },
  { id: 'T_LAMP3', stage: 'L3', room: 'P4A', station: 'S_LAMP3', needs: ['T_LAMP2'], title: '札の回廊の灯明に火を移す',
    meaning: '帰り道のために、灯明に火を移しておく。', hint: '水の道を北の突き当たりまで歩き、右へ。',
    steps: [stepRoom('水の道を北の突き当たりまで歩く', 'P4A', '水が足首まである。ゆっくりしか歩けない。'), stepLook('S_LAMP3', '壁の灯明の前に立つ'), stepDo('[E] で火を移す')] },
  { id: 'T_GATE', stage: 'L3', room: 'P4A', needs: ['T_LAMP3'], title: '格子戸の札をはがす',
    meaning: '札の回廊の真ん中に、札だらけの格子戸がある。札をはがさないと進めない。', hint: '回廊を東へ。格子戸の真ん中の札。',
    steps: [{ text: '回廊を東へ進み、格子戸の札をはがす', done: 'task' }] },
  { id: 'T_POST', stage: 'L3', room: 'P4B', needs: ['T_GATE'], title: '結界の柱に札を貼って、来るものを止める',
    meaning: 'ハルさんに教わったとおり、柱に札を貼ると、その向こうへ死んだ者は来られない。帰りに必ず使う。', hint: '格子戸の先の、二本の柱の間に縄が張ってあるところ。柱に向いて [E]。',
    steps: [{ text: '結界の柱に向いて [E] で札を貼る', done: 'task' }] },
  { id: 'T_LAMP4', stage: 'L3', room: 'P5', station: 'S_LAMP4', needs: ['T_POST'], title: '下りの道の灯明に火を移す',
    meaning: '帰り道のために、灯明に火を移しておく。', hint: '回廊の東の突き当たりを左（北）へ。入口の右の壁。',
    steps: [stepRoom('回廊の東の端から、北の下りの道へ', 'P5'), stepLook('S_LAMP4', '壁の灯明の前に立つ'), stepDo('[E] で火を移す')] },
  { id: 'T_OKUMURO', stage: 'L3', room: 'OKUMURO', needs: ['T_LAMP4'], title: '通路の突き当たりの、奥の室に入る',
    meaning: 'ハルさんの言った「奥の棚」は、通路の突き当たりの部屋にある。', hint: '下りの道の突き当たりの板戸。',
    steps: [stepRoom('突き当たりの板戸を開けて、奥の室へ', 'OKUMURO')] },
  // L4
  { id: 'T_BOX', stage: 'L4', room: 'OKUMURO', station: 'S_SHELF', title: '奥の棚の箱の紐をほどき、櫛を取る',
    meaning: 'ハルさんの言った櫛は、この箱の中にある。持って帰れば、ハルさんは表の戸を開けると言った。', hint: '奥の室の北の壁の棚。',
    minigame: { type: 'trace-path', cfg: { title: '箱の紐をほどく', help: '固く結んだ紐の結び目を、線からはみ出さずに、ほどける向きにたどる。はみ出しても、止まった所から続けられる。', look: 'thread', points: [[0.12, 0.7], [0.3, 0.3], [0.5, 0.62], [0.68, 0.28], [0.88, 0.66]], tol: 0.07, ok: '結び目がほどけた。蓋が、少し持ち上がる。' } },
    steps: [stepLook('S_SHELF', '奥の棚の箱の前に立つ'), stepDo('[E] で紐をほどく')] },
  { id: 'T_ESCAPE', stage: 'L4', room: 'SAGYO', needs: ['T_BOX'], title: '櫛を持って、揚げ戸まで逃げ戻る',
    meaning: '櫛を持っていると、千草さんが追ってくる。柱に札を貼って止めながら、来た道を戻る。', hint: '来た道を戻る：下りの道、札の回廊、水の道、低い道（しゃがむ）、板の道、室のはしご。',
    steps: [stepRoom('札の回廊まで戻る', 'P4A', '後ろから来たら、柱に [E] で札を貼る。'), stepRoom('水の道を戻る', 'P3'), stepRoom('低い道をしゃがんで戻る', 'P2'), stepRoom('板の道を戻る', 'P1'), stepRoom('室のはしごで、作業場へ上がる', 'SAGYO')] },
  { id: 'T_SEAL', stage: 'L4', room: 'SAGYO', station: 'S_HATCH', needs: ['T_ESCAPE'], title: '揚げ戸に、古い札を貼る',
    meaning: '揚げ戸を閉めただけでは、千草さんが下から押し開ける。札を貼れば、上がって来られない。', hint: 'はしごを上がった足もとの揚げ戸。',
    steps: [stepLook('S_HATCH', '揚げ戸を見る'), stepDo('[E] ですぐに札を貼る')] },
  // L5
  { id: 'T_THINK', stage: 'L5', room: 'SAGYO', station: 'S_BENCH', title: '作業台で、考えをまとめる',
    meaning: 'このまま櫛をハルさんに渡していいのかを決める前に、集めた物から、五十二年前に何が起きたのかを確かめる。', hint: '作業場の西の壁の作業台。',
    steps: [stepLook('S_BENCH', '作業台の前に立つ'), stepDo('[E] で、集めた物を並べて考える')] },
  { id: 'T_RETURN', stage: 'L5', room: 'SAGYO', station: 'S_HATCH', needs: ['T_THINK'], title: '揚げ戸の札をはがし、櫛を千草さんに返す',
    meaning: '千草さんが探しているのは、夫の清次さんが作った櫛。返せば、もう追ってはこないかもしれない。', hint: '作業場の揚げ戸。',
    steps: [stepLook('S_HATCH', '揚げ戸の前に立つ'), stepDo('[E] で札をはがし、櫛を返す')] },
  { id: 'T_END', stage: 'L5', room: 'MISE', station: 'S_CHOBA', needs: ['T_SEAL'], title: '帳場のハルさんのところへ行く',
    meaning: '櫛を渡すか、千草さんに返したことを話して、表の戸を開けてもらう。', hint: '店の間の右奥の帳場の格子。',
    steps: [stepRoom('店の間へ戻る', 'MISE'), stepLook('S_CHOBA', '帳場の格子の前に立つ'), stepDo('[E] でハルさんと話す')] },
  // side quests
  { id: 'T_SQ1', stage: 'L2', room: 'NAKA', station: 'S_BUTSUDAN', optional: true, title: '（寄り道）ハルさんの出せなかった手紙を、書いた順に並べる',
    meaning: '家のあちこちに、「千草へ」と宛名を書いた封筒が隠してある。三通を書いた順に読めば、ハルさんが五十二年、何を思っていたかが分かる。', hint: '走り庭の水屋（みずや：食器棚）、奥の間の着物の箪笥、作業場の道具箱。三通そろえて、中の間の仏壇の前へ。',
    minigame: { type: 'order-steps', cfg: { title: 'ハルさんの手紙：書いた順に', help: '札を二つ続けて押すと入れ替わる。書いた順に並べたら「これで確かめる」。', steps: ['昭和五十年：一年たった。「奥の棚から持って来い」と言うたのも、揚げ戸に札を貼ったのも、わしじゃ。', '昭和六十年：今夜も下から、髪をすく音がする。札をまた一枚貼った。あんたに会うのが怖い。', '平成二十年：清次の位牌に、毎朝あやまっとる。けど、揚げ戸は開けられん。', '令和七年：もう長うない。死んだら、あんたのところへ降りて謝らんといけん。'], seed: 4, ok: '手紙がつながった。ハルさんは五十二年、謝れないまま札を貼り続けていた。' } },
    steps: [{ text: '「千草へ」の封筒を三通集める', body: '走り庭の水屋・奥の間の箪笥・作業場の道具箱。', done: 'look', emphasis: 'station:S_BUTSUDAN' }, stepDo('仏壇の前で、[E] で書いた順に並べる')] },
  { id: 'T_SQ2', stage: 'L3', room: 'P4A', optional: true, title: '（寄り道）札の回廊の壁の札をはがして、帰りの札を増やす',
    meaning: '回廊の壁には、はがせそうな札がある。帰りに柱に貼る札が増える。', hint: '格子戸の手前の壁。少し浮いている札が三枚。',
    steps: [{ text: '浮いている壁の札を三枚はがす', done: 'task' }] },
];

// ---------------------------------------------------------------- endings
const endings = [
  { id: 'E3', title: 'ほどけた札', kind: 'good', kicker: '二人は、いっしょに降りていった', photo: P('end-e3'), requires: { flags: ['end_free'] },
    text: '気がつくと、表の戸は開いていた。帳場の畳に、ほどけた札が散らばっていた。\n駆けつけた野口さんに、私は地下の奥の室のことを話した。翌朝、警察が地下の奥の室で、一人の女性の遺骨を見つけた。昭和四十九年に家出したとされていた、櫛田千草さんだった。\nそのそばに、白い髪の束が、柘植の櫛でまとめて置いてあったという。\n櫛田の家から、髪をすく音は、もう聞こえない。' },
  { id: 'E2', title: '髪に戻った櫛', kind: 'normal', kicker: '千草さんは、五十二年ぶりに見つかった', photo: P('end-e2'), requires: { flags: ['end_keep'] },
    text: '表の戸が開くと、車で駆けつけた野口さんが立っていた。私は、地下の奥の室のことを話した。\n翌朝、警察が揚げ戸の下から、一人の女性の遺骨を運び出した。昭和四十九年に家出したとされていた、櫛田千草さんだった。\n遺骨の髪には、柘植の櫛が挿してあったという。\n帳場の格子の札は、今も一枚もはがれていない。ハルさんは、今もあの格子の内で、背中を向けているのだろう。' },
  { id: 'E1', title: '燃える櫛', kind: 'bad', kicker: '言われたとおりに、持って来た', photo: P('end-e1'), requires: { flags: ['end_give'] },
    text: '櫛は火鉢の中で、ぱちぱちと音を立てて燃えた。床の下の細い叫び声は、それきり聞こえなくなった。\n表の戸が開いた。冷たい夜気の向こうに、野口さんの車の灯りが見えた。\n半年後、櫛田の家は取り壊された。私は、地下のことを誰にも言えなかった。地下の室は、中を確かめないまま埋め戻されたと聞いた。\n今でも夜になると、ときどき、髪をすく音が聞こえる気がする。' },
];

// ---------------------------------------------------------------- talk
const H = 'ハル', C = '千草', N = '野口', I = '私';
const talk = {
  opening: [
    { who: I, text: '私は宮下航。訪問介護のヘルパーをしている。今日は熱を出した先輩の野口さんの代わりに、山あいの町の古い家へ来た。', img: P('op-sheet') },
    { who: I, text: '十一月の夕方、五時半。利用者は櫛田ハルさん、九十六歳。むかし櫛を作って売っていた店の家に、一人で住んでいる。', img: P('op-mise') },
    { who: I, text: '記録票のとおり、鍵箱の鍵で表の戸を開けて入った。……戸が、ひとりでに閉まった。押しても引いても、もう動かない。', img: P('op-door') },
    { who: I, text: '店の奥に、格子で囲った帳場（店の勘定場）がある。格子の向こうの小さな灯りの前に、背中を向けた老女が座っている。', img: P('op-choba') },
    { who: H, where: '帳場の格子の奥', text: '閉めたのは、わしじゃ。……あんた、新しいヘルパーか。こっちへ来い。', img: P('op-choba') },
  ],
  choba1: [
    { who: I, text: 'こんばんは。ひまわり訪問介護の宮下です。今日は野口の代わりに来ました。……あの、表の戸が開かなくて。' },
    { who: H, where: '帳場の格子の奥', text: '戸は、わしが押さえとる。あんたに頼みがあるけえ、帰すわけにはいかん。' },
    { who: H, where: '帳場の格子の奥', text: 'この家のいちばん奥、作業場の床の揚げ戸（床にはめた戸）から、地下の室（むろ）へ降りる。長い通路の突き当たりの部屋の棚に、櫛がある。それを持って来い。' },
    { who: I, text: '櫛、ですか。……どうして、ご自分で取りに行かないんですか。' },
    { who: H, where: '帳場の格子の奥', text: 'わしは、この格子の内から出られん。足のこともあるが、それだけじゃない。……櫛を持って来るまで、表の戸は開けん。大声を出しても、ここらは誰も通らん。' },
    { who: I, text: '脅されている。携帯は圏外で、外に知らせる手もない。……今は、言われたとおりにするしかない。' },
    { who: H, where: '帳場の格子の奥', text: '奥へ行く戸には、みな札が貼ってある。札は、はがしてええ。はがした札は、なくさず持って行け。帰りに要る。' },
    { who: H, where: '帳場の格子の奥', text: 'まず、中の間の襖の札を一枚はがしてみい。札の端に指をかけて、そっとはがすんじゃ。' },
  ],
  peel1_done: [
    { who: H, where: '帳場の格子の奥', text: 'それでええ。はがした札は、柱に貼り直せる。土間との境の太い柱、大黒柱に、貼ってみい。' },
  ],
  paste1: [
    { who: H, where: '帳場の格子の奥', text: '柱に貼った札の向こうへは、死んだもんは来られん。帰りに、何かが付いて来たら、柱に貼れ。' },
    { who: H, where: '帳場の格子の奥', text: 'ただし、札は強う押されると焦げて、そのうち落ちる。落ちるまでに、逃げえ。' },
    { who: I, text: '死んだもの……？　何が付いて来るんですか。' },
    { who: H, where: '帳場の格子の奥', text: '……その札は、もう一度はがして持って行け。無駄にするな。' },
  ],
  paste1_done: [
    { who: H, where: '帳場の格子の奥', text: '行け。中の間の奥が奥の間、その先が渡り廊下、いちばん奥が作業場じゃ。' },
    { who: H, where: '帳場の格子の奥', text: '地下は真っ暗じゃけえ、灯りがいる。台所は、表の土間の中戸の向こう。手燭（てしょく）とマッチがある。' },
    { who: H, where: '帳場の格子の奥', text: '通路の壁の灯明（とうみょう：油の皿の灯り）にも、火を移して行け。帰りは、走ることになる。' },
  ],
  phone: [
    { who: N, where: '電話の声', text: 'もしもし、宮下くん？　やっとつながった。何度もかけたのよ。今、どこにいるの。' },
    { who: I, text: '野口さん。櫛田さんのお宅です。予定表に、十七時半の訪問があったので。' },
    { who: N, where: '電話の声', text: '……櫛田さんはね、先週の火曜に亡くなったの。病院で。訪問は全部取り消したはずなのに、予定表が直ってなかったのね。ごめん、私が言っておけば。' },
    { who: I, text: 'でも、今、帳場に……ハルさんがいて、話をしました。' },
    { who: N, where: '電話の声', text: '宮下くん、すぐ出て。……戸が開かない？　分かった、今から車で行く。一時間はかかる。それまで、奥へは行かないで。' },
    { who: N, where: '電話の声', text: 'あの家の奥はね、ハルさんが五十二年、誰も入れなかったの。お嫁さんの千草さんが家出してから、ずっと札を貼って――' },
    { who: I, text: '……切れた。受話器から、もう何の音もしない。' },
  ],
  haru_dead: [
    { who: H, where: '帳場の方から', text: '……聞いたか。' },
    { who: H, where: '帳場の方から', text: 'そうよ。わしは先週、死んだ。' },
    { who: H, where: '帳場の方から', text: '死んだもんは、札を越えられん。わしが五十二年かけて貼った札が、今はわしを、あの格子の内に閉じこめとる。' },
    { who: H, where: '帳場の方から', text: '戸を押さえるくらいはできる。じゃが、札の外へは一歩も出られん。' },
    { who: H, where: '帳場の方から', text: 'じゃから、生きとるあんたに頼んどる。櫛を持って来い。あの櫛がある限り、あの女は、この家から離れん。' },
    { who: I, text: 'あの女……千草さんのことですか。' },
    { who: H, where: '帳場の方から', text: '……櫛を持って来い。そうしたら、戸を開けてやる。' },
    { who: I, text: '野口さんが来るまで一時間。戸は、死んだ人に押さえられている。……奥へ行くしかない。揚げ戸の上の石臼は、梃子（てこ）になる鉄の棒があれば、どかせるだろう。' },
  ],
  hatch_done: [
    { who: I, text: '揚げ戸の札は、ほかのどの札よりも古い。黄ばんで、端が破れている。' },
    { who: I, text: '墨で日付がある。「昭和四十九年霜月十四日」。霜月は、十一月のことだ。……千草さんの日記の、最後の日と同じだ。' },
    { who: I, text: 'それに、この札は、揚げ戸の上から貼ってある。……下から、上がって来られないように。' },
  ],
  muro_in: [
    { who: I, text: '地下の室（むろ）。櫛の材の柘植（つげ）の板を、燻して何年も寝かせておく部屋だ。真っ暗で、ほとんど何も見えない。' },
    { who: I, text: '手燭に火を入れよう。目の前の燻し炉（いぶしろ）の縁なら、手燭を置いてマッチを擦れる。' },
  ],
  light_done: [
    { who: I, text: '手燭に火が入った。……見上げると、揚げ戸の裏板に、爪でかいた跡が何十本もある。' },
    { who: I, text: '下から、誰かが開けようとした跡だ。何日も。……ここに、閉じこめられた人がいる。' },
    { who: I, text: '火は小さい。足元は濡れた石と板。ここから先は、走れば転ぶ。ゆっくり行こう。' },
  ],
  gate: [
    { who: I, text: '格子戸の向こうに、誰かいる。藍の着物の女の人。膝まである濡れた黒髪で、顔が見えない。' },
    { who: C, where: '格子戸の向こう', text: '……かえして……。' },
    { who: I, text: '格子の札が煙を上げて、女の人が押し返された。……札は本当に、あれを止める。ハルさんの言った「死んだもの」は、あの人のことだ。' },
    { who: I, text: '女の人は、通路の奥へ消えた。格子戸を開けるには、真ん中の札をはがすしかない。' },
  ],
  post_ok: [
    { who: I, text: '止まった。柱の札の向こうで、女の人が髪を振り乱している。……札が、端から黒く焦げていく。' },
  ],
  post_done: [
    { who: I, text: '札が落ちた。……女の人は、すっと消えた。' },
    { who: I, text: '柱の札は、焦げて落ちるまでしか持たない。帰りに追われたら、柱に貼って、焦げる間に逃げる。' },
    { who: I, text: '千草さんは、櫛を探してくる。通路の戸棚にも、扉の内側に札が貼ってあった。中に隠れれば、櫛ごと見えなくなるかもしれない。' },
  ],
  okumuro: [
    { who: I, text: '通路の突き当たりの部屋。奥の壁に、小さな棚がある。その上に、紐をかけた細長い木の箱。', img: P('in-okumuro') },
    { who: I, text: '棚の下に、藍の着物がくずれている。長い黒髪が、床に広がっている。……袖から、白い指の骨がのぞいている。' },
    { who: I, text: '帯留めに、字が彫ってある。「千草」。……千草さん、なのか。家出したはずの人が、ここに。' },
    { who: I, text: '指の骨は、棚の箱のほうへ伸びている。……櫛を取ろうとして、ここで力尽きたんだ。' },
  ],
  rise: [
    { who: I, text: '柘植の櫛。明るい黄色の、半月の形。婚礼の写真で、花嫁の髪に挿してあった櫛だ。' },
    { who: C, where: 'うしろで', text: '……かえして……それは、わたしの……。' },
    { who: I, text: '手燭の火が、吹き消された。灯明の明かりの中で、藍の着物が起き上がる。……逃げろ。柱に札を貼りながら、揚げ戸まで。' },
  ],
  top: [
    { who: I, text: '揚げ戸を閉めた。下から、叩く音。揚げ戸が持ち上がってくる。……札を貼らないと！' },
  ],
  seal_done: [
    { who: I, text: '古い札を、揚げ戸の上から貼った。叩く音が、止んだ。' },
    { who: I, text: '……上から貼った。五十二年前、ハルさんも、こうしたんだ。下から、上がって来られないように。' },
    { who: H, where: '帳場の方から', text: '持って来たな。早う、こっちへ持って来い。' },
    { who: I, text: 'このまま渡していいのか。作業台で、集めた物を並べて、考えをまとめよう。' },
  ],
  think_done: [
    { who: I, text: 'ハルさんは五十二年前、千草さんにも同じことを言った。「奥の棚から、櫛を持って来い」。' },
    { who: I, text: '千草さんは、清次さんの形見の櫛を取りに降りて、閉じこめられた。そして今も、櫛を探している。' },
    { who: I, text: 'ハルさんに渡せば、櫛は燃やされる。戸は開く。千草さんは、二度と櫛に会えない。' },
    { who: I, text: '千草さんに返すなら、揚げ戸の札をはがして、櫛を手渡す。そのあと、帳場でハルさんに戸を開けてもらう。' },
  ],
  give: [
    { who: H, where: '帳場の格子の奥', text: 'よう持って来た。……格子のすき間から、こっちへ。' },
    { who: I, text: '櫛を、格子のすき間から差し入れた。格子の内で、ハルさんの手が、それを火鉢へ落とした。' },
    { who: H, where: '帳場の格子の奥', text: 'これでええ。これで、あの女は来ん。' },
    { who: I, text: '床の下から、細い叫び声。……すぐに、何も聞こえなくなった。' },
    { who: H, where: '帳場の格子の奥', text: '行け。戸は、開けてやる。' },
  ],
  return: [
    { who: I, text: '揚げ戸の札をはがして、戸を開けた。はしごの下に、千草さんが立っている。櫛を、差し出した。' },
    { who: C, where: '揚げ戸の下', text: '……清次さんの、櫛。' },
    { who: I, text: '千草さんは櫛を受け取って、ゆっくり髪に挿した。髪が分かれて、はじめて顔が見えた。若い、おだやかな顔だった。' },
    { who: C, where: '揚げ戸の下', text: 'あの日、お義母さんに言われたの。櫛が欲しければ、奥の棚から持って来いって。降りたら、上で揚げ戸が閉まった。何日も叩いたけれど、誰も開けてくれなかった。' },
    { who: C, where: '揚げ戸の下', text: '暗くて、箱の紐がほどけなかった。……やっと、手に戻った。ありがとう。わたしは、下で眠ります。見つけてもらえたから。' },
    { who: I, text: '千草さんは、はしごの下の暗がりへ消えた。もう、叩く音はしない。……帳場へ行こう。ハルさんに、戸を開けてもらう。' },
  ],
  last: [
    { who: H, where: '帳場の格子の奥', text: '……櫛を、返したんか。' },
    { who: I, text: 'はい。千草さんは、地下の奥の室にいました。五十二年前、あなたが揚げ戸に札を貼って、臼をのせて、閉じこめたんですね。' },
    { who: H, where: '帳場の格子の奥', text: '……清次が死んで、わしは、あの櫛のせいじゃと思うた。櫛は苦死。嫁に櫛なんぞ贈るけえ、と。櫛ごとあの子を下へ閉じこめれば、苦死も一緒に閉じこめられると思うた。' },
    { who: H, where: '帳場の格子の奥', text: 'それから毎晩、下から髪をすく音がした。札を貼った。また貼った。……死んだら、あの子と同じ側へ行く。それが怖うて、櫛を燃やしたかった。燃やせば、あの子は消える。消えれば、会わずにすむ。' },
  ],
  end_keep: [
    { who: H, where: '帳場の格子の奥', text: '……行け。わしは、ここにおる。' },
    { who: I, text: '背中のほうで、表の戸が、すっと開く音がした。' },
  ],
  end_free: [
    { who: I, text: '帳場の格子の札を、一枚ずつはがした。最後の一枚がはがれると、ハルさんの白い髪が、ほどけて肩に落ちた。' },
    { who: H, where: '帳場の格子の奥', text: '……千草。' },
    { who: I, text: '振り返ると、作業場のほうから、千草さんが歩いて来た。髪に、柘植の櫛。' },
    { who: C, where: '帳場の前', text: 'お義母さん。髪が、ほどけていますよ。' },
    { who: H, where: '帳場の格子の奥', text: '……すまなんだ。すまなんだ、千草。' },
    { who: I, text: '千草さんは、ハルさんの白い髪を、柘植の櫛でゆっくりとすいた。二人は、作業場の揚げ戸のほうへ、ならんで歩いていった。' },
  ],
  letters_done: [
    { who: I, text: '三通の封筒に、四枚の手紙。どれも千草さんにあてて書いて、出さなかった手紙だ。' },
    { who: I, text: 'ハルさんは五十二年、謝れないまま、札を貼り続けていた。……帳場の格子の札をはがせば、ハルさんは千草さんのところへ謝りに行けるのかもしれない。' },
  ],
  whisper1: [{ who: C, where: '通路の奥', text: '……どこ……。' }],
  whisper2: [{ who: C, where: 'すぐうしろ', text: '……かえして……。' }],
};
// note: the letters are four pieces in three envelopes (the third envelope holds two); the item texts say "三通"

// ---------------------------------------------------------------- the questions of the workbench (T_THINK). why: the line when the pick is wrong
const think = {
  intro: '作業台に、集めた物を並べた。家出人の届、千草さんの日記、揚げ戸の古い札、婚礼の写真。……五十二年前に何が起きたのか、一つずつ確かめる。',
  questions: [
    { q: '千草さんは、昭和四十九年十一月十四日のあと、どこにいたのか。', options: [
      { id: 'away', label: '家出して、遠くへ行った（家出人の届のとおり）', why: '届を出したのはハルさん本人だ。奥の室の着物の帯留め（おびどめ）には、何と彫ってあった？' },
      { id: 'home', label: '実家に帰った', why: '実家のことは、どこにも出てこなかった。奥の室で見たものを思い出そう。' },
      { id: 'muro', label: '地下の奥の室にいて、そこで亡くなった', ok: true, why: '奥の室の着物の帯留めに「千草」。指の骨は、棚の箱へ伸びていた。' } ] },
    { q: '千草さんは、なぜ地下から出られなかったのか。', options: [
      { id: 'lost', label: '長い通路で道に迷った', why: '通路は一本道だった。室の揚げ戸の裏には、何があった？' },
      { id: 'shut', label: '揚げ戸を上から札で封じられ、石の臼で押さえられた', ok: true, why: '揚げ戸の札は上から貼ってあり、上には臼。裏板には、下からかいた爪あと。' },
      { id: 'hurt', label: '足をけがして、歩けなくなった', why: 'けがのことは、どこにもなかった。揚げ戸の札が貼ってあった向きを思い出そう。' } ] },
    { q: '揚げ戸に札を貼ったのは誰か。', options: [
      { id: 'seiji', label: '夫の清次さん', why: '清次さんは十月に亡くなっている（日記・位牌）。札の日付は十一月十四日だ。' },
      { id: 'self', label: '千草さん自身（自分で閉じこもった）', why: '札は揚げ戸の上から貼ってあった。下にいる人には貼れない。' },
      { id: 'haru', label: 'ハルさん', ok: true, why: '日記では、十一月十四日にハルさんが「奥の棚から持って来い」と言った。札の日付も同じ日。家出の届も、二日後にハルさんが出した。' } ] },
    { q: 'ハルさんは、なぜ今になって櫛を欲しがるのか。', options: [
      { id: 'keep', label: '息子の形見として、手もとに置きたい', why: 'ハルさんは櫛を「苦死」と呼んで嫌っていた。櫛がある限り、あの女は離れん、とも言った。' },
      { id: 'burn', label: '燃やして、千草さんを消すため', ok: true, why: 'ハルさんは「櫛がある限り、あの女はこの家から離れん」と言った。櫛を「苦死」と呼んで嫌っていた。燃やせば、千草さんは来なくなる。' },
      { id: 'sell', label: '売ってお金にするため', why: 'ハルさんはもう亡くなっている。櫛がある限り、あの女は離れん、と言った。' } ] },
  ],
};

// ---------------------------------------------------------------- monsters: none of the kit's (千草さん is the ext's own: she walks the passage route); the file turns on the hiding places
const monsters = { early: { stages: 1 }, hints: { run: '走れ！', turn: '曲がれ！', hide: '隠れろ！' }, monsters: [] };

const releaseNotes = { version: '1.0.1', notes: [{ version: '1.0.1', date: '2026-11-16', title: 'β版の手直し', items: [
  { type: 'fix', text: '始めた直後に数秒止まることがあったのを直しました。描画の準備は、タイトル画面の進み具合の棒のあいだに済ませます。' },
  { type: 'fix', text: '結末の櫛の絵を、本物の柘植の櫛に描き直しました。' },
  { type: 'new', text: '調べられる場所のうち、絵のなかった二十七か所すべてに絵を付けました。' },
  { type: 'fix', text: '櫛を持たずに帳場へ行ったとき、[E] で話しかけられることが分かるようにしました。' },
] }, { version: '0.9.0', date: '2026-11-15', title: 'β版を公開', items: [{ type: 'new', text: '町家と地下の長い通路、お札をはがして貼る仕掛け、櫛を持って逃げる場面、三つの結末と寄り道。' }] }] };

// ---------------------------------------------------------------- write
wr('data/plan.json', plan);
wr('data/fuda.json', { ...fuda, think });
wr('data/items.json', items.map((i) => { const t = i.given && tasks.find((x) => x.id === i.given); return { stage: t ? t.stage : 'L1', room: t ? t.room : 'OMOTE', ...i }; }));
wr('data/docs.json', docs);
wr('data/things.json', things);
wr('data/stages.json', stages);
wr('data/tasks.json', tasks);
wr('data/endings.json', endings);
// line ids and recorded voices (tools/gen-voice.mjs writes assets/voice/<id>.mp3)
for (const [k, seq] of Object.entries(talk)) seq.forEach((L, i) => { L.id = `${k}-${i + 1}`; if (L.who === N) L.vfx = 'phone'; if (fs.existsSync(path.join(ROOT, 'assets/voice', `${L.id}.mp3`))) L.voice = `assets/voice/${L.id}.mp3`; });
wr('data/talk.json', talk);
wr('data/monsters.json', monsters);
wr('data/release-notes.json', releaseNotes);
