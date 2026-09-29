# CLAUDE.md

Guidance for working on **Chimera Wing**, a Galaga / U.N. Squadron-style shooter with NES-style graphics,
written in plain browser JavaScript. `README.md` covers gameplay, controls and story. Read it before you
change how the game plays.

## Running and testing

- There is no build step, no package manager, no bundler and no test suite. Open `index.html` in a browser.
- `index.html?stage=N` skips the title screen and starts at stage N (2 = first side mission,
  3 = challenging stage, 5 = Nucleosome Fortress). Use it to check your changes.
- `M` mutes, `F` toggles fullscreen. Audio only starts after a key press or click (browser autoplay rules).
- To check a change, load the page and look at the browser console. A runtime error stops the loop,
  and all you see is a frozen canvas.

## Architecture

Scripts are plain globals loaded by `<script>` tags in `index.html`. **Load order matters**:

```
nes.js → sprites.js → audio.js → input.js → game.js → side.js → specials.js → main.js
```

| Global | File | Role |
|---|---|---|
| `NES` | `js/nes.js` | 256×240 screen size (`NES.W/H`), NES palette `NES.C`, 5×7 bitmap font (`NES.text`), `NES.sprite` (bakes ASCII art into canvases), draw helpers (`draw`, `drawRot`, `disc`, `box`, `wrap`) |
| `SPR` | `js/sprites.js` | All pixel art as ASCII rows + color maps, baked at load time. Sprites point **up**; the game rotates them. |
| `Sound` | `js/audio.js` | WebAudio chiptune: `Sound.sfx(name)` (names in the `SFX` table), `Sound.playSong(Sound.SONGS.x)`, sequencer notes as `"NOTE:LEN"` tokens in sixteenths |
| `Input` | `js/input.js` | Keyboard and gamepad merged into abstract actions: `Input.pressed(a)`, `Input.just(a)`. Actions: `left right up down fire special transform prevForm start back form1-3`. Per-pad remaps live in `localStorage['chimera.padmap']`. |
| `Game` | `js/game.js` | One big singleton object: state machine, Galaga stages, player, enemies, bullets, collision, bosses, HUD and all rendering |
| (mixins) | `js/side.js`, `js/specials.js` | Add methods to `Game` with `Object.assign(Game, {...})`. They must load after `game.js`. |
| boot | `js/main.js` | Scales the canvas to whole-number sizes, sets global hotkeys, runs a **fixed 60 Hz** accumulator loop (`Input.update(); Game.update();` per tick, `Game.draw(ctx)` per frame) |

### Game state machine

`Game.state` is one of `title | howto | setup | intro | hangar | play | clear | result | gameover`.
`Game.update()` and `Game.draw()` switch on it. Change state with `setState(s)`, which also resets
`stateT`. `Game.paused` shows the in-game menu over any state.

The flow for each stage is `startStage(n)` → `intro` (Voss briefing) → `openHangar()` (pick a special) →
`beginPlay()` → `play` → `clear`/`result` → next stage.

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
- `STAGE_NAMES`, `SIDE_NAMES`, `VOSS`: stage titles and Dr. Voss's dialogue.
- `SPECIALS` (in `specials.js`): the hangar's special weapons.

## Conventions

- **Stay NES-authentic.** Use only colors from `NES.C` and the 256×240 resolution. Round coordinates to
  whole pixels when drawing. Don't use anti-aliasing, gradients or smooth rotation (`drawRot` snaps to 16 directions).
- **All timing counts frames at 60 Hz** (e.g. `300` = 5 seconds). Don't use `Date`/`performance.now()` for game logic.
- **The font is uppercase only** and has a limited character set (see `FONT` in `nes.js`). A character
  that isn't in it is silently skipped. Wrap long lines with `NES.wrap(str, n)`. Dialogue fits 25 characters per line.
- Sprites are ASCII grids: `.` is transparent, and every other character looks up a color in a map. Draw them pointing up.
- Every file starts with `'use strict';`. Shared helpers in `game.js` (`rand`, `randi`, `pick`, `clamp`,
  `angDiff`, `TAU`, `C`, `W`, `H`) are globals and available to the files loaded after it.
- Keep the style: short methods on `Game`, compact one-line statements, and brief comments that explain *why*.
- Wrap all `localStorage` access in try/catch (keys: `chimera.hi`, `chimera.padmap`).
- Keep the game playable with only a D-pad, A, B, Select and Start (NES-style pads). Put keyboard-only
  extras (like `back`) on top of that; don't make them required.
- Theme: the enemies and mechanics are named after real epigenetics (methylation, acetylation, histones,
  CpG islands). Keep new content accurate to that science.

## Adding things (quick recipes)

- **New sound effect:** add an entry to `SFX` in `audio.js`, then call `Sound.sfx('name')`.
- **New special weapon:** add it to `SPECIALS`, handle its `id` in `useSpecial()` (plus `updateSpecial`/
  `drawSpecialFx` if it lasts over time), and add an icon to `SPR.specialIcons` at the same index.
- **New side-mission pattern:** add a `case` to `spawnSidePattern`, add it to the `kinds` list in `initSide`,
  and add a `beh` case in `updateSideEnemy` if it needs new movement.
- **New system in its own file:** use the `Object.assign(Game, {...})` mixin pattern and add a
  `<script>` tag after `game.js` in `index.html`.

## Repo notes

- Git branch is `master` with no commits yet (the default branch is meant to be `main`).
- `.gitignore` ignores `node_modules/` and OS junk files. If you add npm tooling (a linter, a local
  server), keep the game runnable straight from `index.html`.
