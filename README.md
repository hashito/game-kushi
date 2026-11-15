# 札の家 ― 奥の棚の櫛

A 3D first-person game on the game-kit standard (docs/standard-3d.md in game-kit). Everything is data: `game.json`, `data/*.json`.
Game-specific code goes only into `js/ext/`; the look into `css/theme-game.css` (design tokens).

```
npm run serve      # http://localhost:8000/
npm test           # data checks
npm run plan       # floor-plan check (strict)
npm run media      # photos listed in the data exist
npm run smoke      # headless: start -> first task -> ending (needs Edge/Chrome; serves by itself)
npm run sync-kit   # copy the newest kit parts (kit.json lists them)
```

## This game

札の家 ― 奥の棚の櫛（key `kushi`, β）. One rule: *the charms keep the dead out; 千草 comes to wherever her comb is.* Peeling a door charm opens
the door and puts the charm in your hand; pasting it on a post in the passage stops her until it chars and falls.

- Data: `tools/gen-data.mjs` writes every `data/*.json` (edit it, not the JSON). Images: `tools/gen-images.mjs` (prompts in
  `tools/media.json`); voices: `tools/gen-voice.mjs` — both only through the local media queue at 127.0.0.1:8765.
- Code: `js/ext/` — `fuda.js` (charms: peel / paste / burn), `house.js` (the house and the passage), `ghost.js` (千草 on the passage
  line), `story.js` (tasks, events, endings), `words.js` (the protagonist's lines), `test-scenes.js` (`?scene=<id>`).
- Whole-game check (headless, real keys, every ending):
  `PLAY_END=give|keep|free node tools/probe.mjs --qa --out D:/kushi-stages/play-e1 --steps tools/play/full.mjs`
- Reviews: `docs/brief.md` (plan), `docs/spec-review.md` (cold reader, director critique, checks), `docs/kit-feedback.md`.
- The kit smoke test cannot play this game (tasks without a station, a floor-1 start); see `docs/kit-feedback.md`.
