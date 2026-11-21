// Every item in the menu has a picture (鏡屋 → every dot game: 「絵のない詳細は空の箱や代わりの文字ではなく、ドットの絵」): its dithered photo, or,
// when a photo is missing, a dot picture of its own stack (kit 1.22.0 setItemThumbs + stackThumb, dot/js/dot/index.js). Never an empty box
// or two letters of its name.
//   node tools/probe.mjs --public --path dot/ --query qa=1 --out <dir> --steps tools/dot/thumbs-steps.mjs   (also dot-fps/, --mobile --size 390x844)
export default async ({ p, G, sleep, log, shot, base }) => {
  await p.goto(`${base}?scene=sagyo&qa=1`);
  await p.waitFor('window.__game && window.__game.state && window.__game.state.started', 120000);
  await sleep(2500);
  for (let i = 0; i < 6 && (await G('g.blocked()')); i++) { await G(`(document.querySelectorAll('.wm-layer .btn.primary, #gf-reader .tl-close').forEach((b) => b.click()), 1)`); await sleep(500); }
  await G(`(['TESHOKU', 'MATCHES', 'COMB', 'OLD_FUDA', 'LETTER1'].forEach((id) => { if (!g.state.inv.includes(id)) g.state.inv.push(id); }), 1)`);
  // a photo gone missing: the dot thumbnail stands in (the first item loses its photo for this check)
  const lost = await G(`(() => { const it = g.data.items.find((i) => g.state.inv.includes(i.id) && i.photo); if (!it) return null; it.photo = null; return it.id; })()`);
  await G(`(g.tm.open('items'), 1)`); await sleep(900);
  if (lost) { const ok = await G(`!!document.querySelector('.wm-layer .iv-cell[data-id="${lost}"] .iv-dotthumb')`); log(ok ? 'LOST' : 'ERROR', `${lost} without its photo: ${ok ? 'the dot thumbnail' : 'no dot thumbnail'}`); }
  const grid = await G(`(() => { const c = [...document.querySelectorAll('.wm-layer .iv-cell')]; return { n: c.length, dot: c.filter((e) => { const t = e.querySelector('.iv-th'); return t && !t.classList.contains('iv-nopic') && /url[(]/.test(t.style.backgroundImage); }).length, thumbs: c.filter((e) => e.querySelector('.iv-dotthumb')).length, nopic: c.filter((e) => e.querySelector('.iv-nopic')).map((e) => e.dataset.id) }; })()`);
  await shot('thumbs-grid');
  const cells = await G(`[...document.querySelectorAll('.wm-layer .iv-cell')].map((e) => e.dataset.id)`);
  for (const id of cells || []) {
    await G(`(document.querySelector('.wm-layer .iv-cell[data-id="${id}"]').click(), 1)`); await sleep(400);
    const d = await G(`(() => { const t = [...document.querySelectorAll('.wm-layer .iv-photo')].find((q) => !q.classList.contains('iv-nopic') && /url[(]/.test(q.style.backgroundImage || getComputedStyle(q).backgroundImage)); const e = document.querySelector('.wm-layer .iv-photo.iv-nopic'); const r = t && t.getBoundingClientRect(); return { dot: !!t, size: r ? [Math.round(r.width), Math.round(r.height)] : null, empty: !!e }; })()`);
    if (!d.dot || d.empty) log('ERROR', `${id}: the detail has no picture (${JSON.stringify(d)})`);
    log('THUMB', id, JSON.stringify(d));
    await shot(`thumbs-${id}`);
  }
  if (!grid.n || grid.dot < grid.n) log('ERROR', `grid: ${grid.dot}/${grid.n} with a picture, no picture: ${grid.nopic.join(', ')}`);
  log('THUMBS', JSON.stringify(grid));
};
