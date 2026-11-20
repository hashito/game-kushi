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

<!-- scene-links:start -->
## テスト用の場面リンク

`?scene=<id>` を付けて開くと、テストモードでその場面から始まります（前の作業は済んだことになり、会話は飛ばします）。
テストモードではセーブを書かず、消しもしません（画面の上に「テストモード」の札が出ます）。`?test` だけを付けると、最初からテストモードで遊べます。
知らない id のときは最初から始まります。場面の一覧は `js/ext/test-scenes.js`、この表は `node tools/scene-links.mjs` で作り直します。


### 家

| 場面 | 公開版 | 手元 (npm run serve) |
|---|---|---|
| 表の土間（はじまり） | [omote](https://kushi.autoarticles.net/?scene=omote) | [local](http://localhost:8000/?scene=omote) |
| 帳場の格子の前 | [choba](https://kushi.autoarticles.net/?scene=choba) | [local](http://localhost:8000/?scene=choba) |
| 中の間の襖（札を貼る練習） | [practice](https://kushi.autoarticles.net/?scene=practice) | [local](http://localhost:8000/?scene=practice) |
| 中の間（仏壇・黒電話・箪笥） | [naka](https://kushi.autoarticles.net/?scene=naka) | [local](http://localhost:8000/?scene=naka) |
| 走り庭（台所） | [hashiri](https://kushi.autoarticles.net/?scene=hashiri) | [local](http://localhost:8000/?scene=hashiri) |
| 奥の間 | [oku](https://kushi.autoarticles.net/?scene=oku) | [local](http://localhost:8000/?scene=oku) |
| 作業場（揚げ戸と臼） | [sagyo](https://kushi.autoarticles.net/?scene=sagyo) | [local](http://localhost:8000/?scene=sagyo) |

### 地下

| 場面 | 公開版 | 手元 (npm run serve) |
|---|---|---|
| 室（手燭に火を入れる） | [muro](https://kushi.autoarticles.net/?scene=muro) | [local](http://localhost:8000/?scene=muro) |
| 土の廊下 | [doro](https://kushi.autoarticles.net/?scene=doro) | [local](http://localhost:8000/?scene=doro) |
| 奥の室の格子戸（はじめて見る） | [koshi](https://kushi.autoarticles.net/?scene=koshi) | [local](http://localhost:8000/?scene=koshi) |
| 板の間（壁の札） | [ita](https://kushi.autoarticles.net/?scene=ita) | [local](http://localhost:8000/?scene=ita) |
| 燻しの間（櫛を置く） | [ibushi](https://kushi.autoarticles.net/?scene=ibushi) | [local](http://localhost:8000/?scene=ibushi) |
| 燻しの間（煙道の札をはがす前） | [flue](https://kushi.autoarticles.net/?scene=flue) | [local](http://localhost:8000/?scene=flue) |
| 格子戸の蝋をとかす | [wax](https://kushi.autoarticles.net/?scene=wax) | [local](http://localhost:8000/?scene=wax) |
| 奥の室（奥の棚） | [okumuro](https://kushi.autoarticles.net/?scene=okumuro) | [local](http://localhost:8000/?scene=okumuro) |
| 奥の棚の前（櫛を取る前） | [shelf](https://kushi.autoarticles.net/?scene=shelf) | [local](http://localhost:8000/?scene=shelf) |
| 櫛を持って逃げる（奥の室） | [escape](https://kushi.autoarticles.net/?scene=escape) | [local](http://localhost:8000/?scene=escape) |
| 逃げる（燻しの間の戸の前） | [escape-doro](https://kushi.autoarticles.net/?scene=escape-doro) | [local](http://localhost:8000/?scene=escape-doro) |

### 家

| 場面 | 公開版 | 手元 (npm run serve) |
|---|---|---|
| 作業台（考えをまとめる） | [bench](https://kushi.autoarticles.net/?scene=bench) | [local](http://localhost:8000/?scene=bench) |
| 帳場（櫛を持って戻った） | [end-give](https://kushi.autoarticles.net/?scene=end-give) | [local](http://localhost:8000/?scene=end-give) |
| 帳場（結末の前・手紙あり） | [end](https://kushi.autoarticles.net/?scene=end) | [local](http://localhost:8000/?scene=end) |

### 段階の頭

| 場面 | 公開版 | 手元 (npm run serve) |
|---|---|---|
| 1. 帳場のハルさんの話を聞き、札のはがし方と貼り方を覚える | [stage:L1](https://kushi.autoarticles.net/?scene=stage:L1) | [local](http://localhost:8000/?scene=stage:L1) |
| 2. 札をはがしながら奥へ進み、作業場の揚げ戸を開ける | [stage:L2](https://kushi.autoarticles.net/?scene=stage:L2) | [local](http://localhost:8000/?scene=stage:L2) |
| 3. 地下の室で手燭に火を入れ、札の控えを読み、奥の室の格子戸を開ける | [stage:L3](https://kushi.autoarticles.net/?scene=stage:L3) | [local](http://localhost:8000/?scene=stage:L3) |
| 4. 奥の棚の櫛を取り、焦げていく札が落ちる前に、揚げ戸まで戻る | [stage:L4](https://kushi.autoarticles.net/?scene=stage:L4) | [local](http://localhost:8000/?scene=stage:L4) |
| 5. 作業台で考えをまとめ、櫛をどうするか決める | [stage:L5](https://kushi.autoarticles.net/?scene=stage:L5) | [local](http://localhost:8000/?scene=stage:L5) |

<!-- scene-links:end -->
