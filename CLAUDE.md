# CLAUDE.md

Guidance for working on **Chimera Wing**, a Galaga / U.N. Squadron-style shooter with NES-style graphics,
written in plain browser JavaScript. `README.md` covers gameplay, controls and story. Read it before you
change how the game plays.

## Running and testing

- There is no build step, no package manager, no bundler and no test suite. Open `index.html` in a browser.
- `index.html?stage=N` skips the title screen and starts at stage N (2 = first side mission,
  3 = challenging stage, 5 = Nucleosome Fortress, 15 = story finale, 16 = second loop). Use it to check your changes.
- An automated or background browser tab throttles `requestAnimationFrame`, so simulated key presses
  get missed. To script a test, step frames by hand from the console: `Input.update(); Game.update();`
  in a loop, holding keys with dispatched `keydown`/`keyup` events. Call `Game.draw(ctx)` to render.
- `M` mutes, `F` toggles fullscreen. Audio only starts after a key press or click (browser autoplay rules).
- To check a change, load the page and look at the browser console. A runtime error stops the loop,
  and all you see is a frozen canvas.

## Architecture

Scripts are plain globals loaded by `<script>` tags in `index.html`. **Load order matters**:

```
nes.js → sprites.js → audio.js → input.js → game.js → side.js → specials.js → story.js → tet.js → main.js
```

| Global | File | Role |
|---|---|---|
| `NES` | `js/nes.js` | 256×240 screen size (`NES.W/H`), NES palette `NES.C`, 5×7 bitmap font (`NES.text`), `NES.sprite` (bakes ASCII art into canvases), draw helpers (`draw`, `drawRot`, `disc`, `box`, `wrap`) |
| `SPR` | `js/sprites.js` | All pixel art as ASCII rows + color maps, baked at load time. Sprites point **up**; the game rotates them. |
| `Sound` | `js/audio.js` | WebAudio chiptune: `Sound.sfx(name)` (names in the `SFX` table), `Sound.playSong(Sound.SONGS.x)`, sequencer notes as `"NOTE:LEN"` tokens in sixteenths |
| `Input` | `js/input.js` | Keyboard and gamepad merged into abstract actions: `Input.pressed(a)`, `Input.just(a)`. Actions: `left right up down fire special transform prevForm start back form1-3`. Per-pad remaps live in `localStorage['chimera.padmap']`. |
| `Game` | `js/game.js` | One big singleton object: state machine, Galaga stages, player, enemies, bullets, collision, bosses, HUD and all rendering |
| (mixins) | `js/side.js`, `js/specials.js`, `js/story.js`, `js/tet.js` | Add methods to `Game` with `Object.assign(Game, {...})`. They must load after `game.js`. `Object.assign` copies a getter's *value*, so mixins use methods (e.g. `villain()`), not getters. |
| boot | `js/main.js` | Scales the canvas to whole-number sizes, sets global hotkeys, runs a **fixed 60 Hz** accumulator loop (`Input.update(); Game.update();` per tick, `Game.draw(ctx)` per frame) |

### Game state machine

`Game.state` is one of `title | howto | setup | intro | hangar | play | clear | result | gameover`.
`Game.update()` and `Game.draw()` switch on it. Change state with `setState(s)`, which also resets
`stateT`. `Game.paused` shows the in-game menu over any state.

The flow for each stage is `startStage(n)` → `intro` (paged briefing) → `openHangar()` (pick a special) →
`beginPlay()` → `play` → `clear`/`result` → next stage. After the boss on stage `FINALE` (15), `updateClear`
calls `startEnding()` instead, which plays the epilogue and then starts stage 16.

### Story (`js/story.js`)

- `CAST` lists the speakers: `mira` (the ally, aqua), `voss` (the villain, pink) and `echo` (the villain from
  stage 16 on, magenta). `Game.villain()` picks Voss or the Echo from the stage number.
- `STORY[n]` holds the title and pages for campaign stages 1–15. A page is `[speaker, text]`.
  Stages after 15 are built by `briefingFor(n)` from `LOOP_TOPICS` (title and fact) and `ECHO_LINES`.
- `startBriefing(label, title, pages, done)` runs any sequence of pages in the `intro` state. Fire
  finishes the typing and then turns the page. Start skips to `done()`.
- In-game radio: `say(text, who = villain, queued = false)`. With `queued`, the message waits in `radioQ`
  until the current one ends. `hint(key)` shows one of Mira's `HINTS` once per game.
- `VOSS` in `game.js` keeps the in-play radio barks (silenced, restored, boss phases, game over).

### Stage types

`stageTypeOf(n)` in `game.js` decides the type: even stages are `side`; odd stages are `boss` (n % 10 === 5),
`challenge` (n % 4 === 3) or `normal`. `Game.isSide` is a getter on `stageType`.

- **Vertical stages:** wave layouts (`buildNormalWaves`, `buildChallengeWaves`), spline flight paths
  (`PATH_DEFS` → `PATHS`), formation slots, dives, methylator beams.
- **Side missions** (`side.js`): `initSide()` builds a timed event script. `updateSide()` spawns patterns
  (`migLine`, `migSwoop`, `migRear`, `bomber`, `sam`, `methyl`, `boss`). Each enemy's `beh` field picks
  its movement in `updateSideEnemy`.
- **Bosses:** one `makeBoss(side)` serves both the fortress (vertical) and the gunship (side, turned to face left).
  Parts `L`/`R` are turrets and `C` is the shielded core.
- **`orient(x, y)`** turns a vertical-stage direction (up = forward) into the current orientation.
  Use it in code shared by both modes so that code doesn't need separate vertical and side branches.

### Key data tables (at the top of `game.js`)

- `FORMS`: the player's three forms (speed, `free` = can climb/dive, hitbox).
- `ENEMY`: enemy types (hp, points `[normal, acetylated]`, hit radius). A new enemy type needs an entry
  here, art in `SPR`, and drawing in `drawEnemy`.
- `VOSS`: Dr. Voss's in-play radio lines. The briefings and stage titles are in `story.js`.
- `SPECIALS` (in `specials.js`): the hangar's special weapons.
- TET capsules (`tet.js`): acetylated kills may drop one (`dropTet`); collecting it restores a silenced form.

## Conventions

- **Stay NES-authentic.** Use only colors from `NES.C` and the 256×240 resolution. Round coordinates to
  whole pixels when drawing. Don't use anti-aliasing, gradients or smooth rotation (`drawRot` snaps to 16 directions).
- **All timing counts frames at 60 Hz** (e.g. `300` = 5 seconds). Don't use `Date`/`performance.now()` for game logic.
- **The font is uppercase only** and has a limited character set (see `FONT` in `nes.js`). A character
  that isn't in it is silently skipped (so no `&`, `;` or `*`). Wrap long lines with `NES.wrap(str, n)`.
  Dialogue wraps at 25 characters: a briefing page holds 6 lines and a radio message 3. Longer text
  is cut off without any warning, so count the wrapped lines. Screen text at x=8 fits about 30 characters.
- Sprites are ASCII grids: `.` is transparent, and every other character looks up a color in a map. Draw them pointing up.
- Every file starts with `'use strict';`. Shared helpers in `game.js` (`rand`, `randi`, `pick`, `clamp`,
  `angDiff`, `TAU`, `C`, `W`, `H`) are globals and available to the files loaded after it.
- Keep the style: short methods on `Game`, compact one-line statements, and brief comments that explain *why*.
- Wrap all `localStorage` access in try/catch (keys: `chimera.hi`, `chimera.padmap`).
- Keep the game playable with only a D-pad, A, B, Select and Start (NES-style pads). Put keyboard-only
  extras (like `back`) on top of that; don't make them required.
- Theme: the enemies, mechanics and story are built on real epigenetics (methylation, acetylation, histones,
  TET enzymes, imprinting and so on). The villain can be evil, but her science has to be right: check every
  fact you add, and don't invent biology (no "aggression genes").

## Adding things (quick recipes)

- **New sound effect:** add an entry to `SFX` in `audio.js`, then call `Sound.sfx('name')`.
- **New special weapon:** add it to `SPECIALS`, handle its `id` in `useSpecial()` (plus `updateSpecial`/
  `drawSpecialFx` if it lasts over time), and add an icon to `SPR.specialIcons` at the same index.
- **New side-mission pattern:** add a `case` to `spawnSidePattern`, add it to the `kinds` list in `initSide`,
  and add a `beh` case in `updateSideEnemy` if it needs new movement.
- **New story beat:** edit `STORY[n]` (campaign) or `LOOP_TOPICS`/`ECHO_LINES` (second loop) in `story.js`.
  For a one-off radio tip, add it to `HINTS` and call `this.hint('key')` where it happens.
- **New system in its own file:** use the `Object.assign(Game, {...})` mixin pattern and add a
  `<script>` tag after `game.js` in `index.html`.

## Repo notes

- Git branch is `master` with no commits yet (the default branch is meant to be `main`).
- `.gitignore` ignores `node_modules/` and OS junk files. If you add npm tooling (a linter, a local
  server), keep the game runnable straight from `index.html`.
