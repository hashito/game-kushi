// 2.5.0 (play test 2026-11-23 #7 「最後は紙芝居風に各場面と言葉を見せてください。ここも喋るようにしてほしいです」): the ending is a kamishibai -
// the story card by card (data/endings.json "pages": a picture, its words, the narrator's voice), turned by the player; then the ending
// card (kicker, title, the endings found, the buttons). The same as the kit core's own ending with "pages" (kit 1.38.0 js/kamishibai.js).
import { showKamishibai } from '../kit/kamishibai.js';
import { showEndingScene } from '../kit/ending-scene.js';

export function installEnding(ext) {
  ext.registerScreen('ending', { open: (ctx, e) => {
    const card = () => showEndingScene(ctx, { photo: e.photo, kicker: e.kicker, title: e.title, text: e.pages ? '' : e.text, roll: e.pages ? [] : e.roll, endings: { all: ctx.data.endings, current: e.id }, buttons: [{ label: '最初から', primary: true, fn: () => location.reload() }] });
    if (Array.isArray(e.pages) && e.pages.length) showKamishibai(ctx, { pages: e.pages, label: (ctx.manifest && ctx.manifest.title) || '' }).then(card); else card();
  } });
}
