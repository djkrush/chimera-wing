# CLAUDE.md

Guidance for working on **Chimera Wing**, a Galaga / U.N. Squadron-style shooter with NES-style graphics,
written in plain browser JavaScript. `README.md` covers gameplay, controls and story. Read it before you
change how the game plays.

## Running and testing

- There is no build step, no package manager, no bundler and no test suite. Open `index.html` in a browser.
- `index.html?stage=N` skips the title screen and drops into a mission leg (`testLeg` in `campaign.js`):
  planet `ceil(N/2)` in map order, odd N = approach, even N = assault. E.g. 2 = Earth's base,
  4 = the Mars capital-ship flyover, 5 = Venus challenge approach, 26 = the finale. Test campaigns
  (`camp.test`) never save, all specials are learned, and earlier planets count as cleared.
- Scripted tests write to the real `localStorage` of that browser (`chimera.save`, `chimera.hi`).
  Remove what you added when you're done.
- An automated or background browser tab throttles `requestAnimationFrame`, so simulated key presses
  get missed. To script a test, step frames by hand from the console: `Input.update(); Game.update();`
  in a loop, holding keys with dispatched `keydown`/`keyup` events. Call `Game.draw(ctx)` to render.
- `M` mutes, `F` toggles fullscreen. Audio only starts after a key press or click (browser autoplay rules).
- To check a change, load the page and look at the browser console. A runtime error stops the loop,
  and all you see is a frozen canvas.

## Architecture

Scripts are plain globals loaded by `<script>` tags in `index.html`. **Load order matters**:

```
nes.js → snes.js → shipyard.js → sprites.js → audio.js → input.js → game.js → bosses.js → capital.js → side.js
       → scenery.js → specials.js → pilots.js → campaign.js → starbase.js → carrier.js → story.js → tet.js → main.js
```

| Global | File | Role |
|---|---|---|
| `NES` | `js/nes.js` | 424×240 widescreen size (`NES.W/H`), base palette `NES.C`, shaded 5×7 bitmap font (`NES.text`), `NES.sprite`, draw helpers (`draw`, `drawRot`, `drawFlip`, `disc`, `box` (SNES window), `hilite`, `wrap`) |
| `SNES` | `js/snes.js` | 15-bit color and 5-shade `ramp`s, `bake` (shaded ASCII sprites), `glow`/`sphere`/`globe`, smooth `drawRot` with scaling, color math (`add`, `half`), HDMA-style `bands`, parallax `layer`/`scrollX`/`scrollY`, Mode 7 `texture`/`mode7` |
| `YARD` | `js/shipyard.js` | Painter for the big pre-rendered machines (carrier, capital ships, boss warships): `sheet(w, h)` lays down materials at height levels (`rect`, `poly`, `ellipse`, `mirrorX`, `recolor`), `bake()` bevels, drop-shadows and outlines them; detail helpers `modules`, `plates`, `greebles`, `vent`, `turret`, `windows` |
| `SPR` | `js/sprites.js` | All pixel art as ASCII rows + color maps, baked at load time. Top-down sprites point **up** and the game rotates them. Side-mission sprites are **side profiles**, drawn unrotated. |
| `Sound` | `js/audio.js` | WebAudio chiptune: `Sound.sfx(name)` (names in the `SFX` table), `Sound.playSong(Sound.SONGS.x)`, sequencer notes as `"NOTE:LEN"` tokens in sixteenths |
| `Input` | `js/input.js` | Keyboard and gamepad merged into abstract actions: `Input.pressed(a)`, `Input.just(a)`. Actions: `left right up down fire special transform prevForm start back form1-3`. Per-pad remaps live in `localStorage['chimera.padmap']`. |
| `Game` | `js/game.js` | One big singleton object: state machine, Galaga stages, player, enemies, bullets, collision, HUD and rendering |
| (mixins) | `js/bosses.js`, `js/capital.js`, `js/side.js`, `js/scenery.js`, `js/specials.js`, `js/pilots.js`, `js/campaign.js`, `js/starbase.js`, `js/carrier.js`, `js/story.js`, `js/tet.js` | Add methods to `Game` with `Object.assign(Game, {...})`. They must load after `game.js`. `Object.assign` copies a getter's *value*, so mixins use methods (e.g. `villain()`), not getters. |
| boot | `js/main.js` | Scales the canvas to whole-number sizes, sets global hotkeys, runs a **fixed 60 Hz** accumulator loop (`Input.update(); Game.update();` per tick, `Game.draw(ctx)` per frame) |

### Game state machine

`Game.state` is one of `title | howto | setup | pilot | travel | base | map | intro | hangar | sortie |
takeoff | play | clear | result | landing | debrief | learn | gameover`. `Game.update()` and `Game.draw()`
switch on it. Change state with `setState(s)`, which also resets `stateT`. `Game.paused` shows the
in-game menu over any state. `inMenu()` lists the full-screen menu states (no playfield; `draw()` sends
them to `drawMenuScreen`). While `inBase` is set, `intro`/`hangar` draw over the starbase (`drawInBase`).

Campaign flow (`campaign.js`):

```
NEW GAME → pilot → newCampaign() → travel → base (autosave)
base: MISSIONS → startMission(i) → intro (briefing) → hangar (if any specials learned) → sortie
  → startLeg('approach') → takeoff → play → clear/result → legDone() → landing → afterLanding()
  → startLeg('assault')  → takeoff → play → boss → clear → landing → missionComplete()
  → debrief → learn (if a level-up earned a special) → base
      (finale: debrief → startEnding() → epilogue → startNewGamePlus() → travel → base)
base: GALAXY MAP → map → travel → base      gameover / ABORT MISSION → missionFailed() → base
```

### Story (`js/story.js`)

- `CAST` lists the speakers: `mira` (the ally, aqua), `voss` (the villain, pink) and `echo` (the villain in
  the Echo campaign, magenta). `Game.villain()` picks Voss or the Echo from `camp.loop`.
- `PLANET_STORY[planetId]` holds each planet's title and pages. A page is `[speaker, text]`. Each briefing
  says why we fight there and what the boss is.
- `STORY_BEATS[n]` tells Voss's personal story. Beat `n` plays once, before the next briefing after
  `n` sectors are cleared, so it stays in order on any route. `planetBriefing(S, P)` puts it together
  (and uses `LOOP_TOPICS`/`ECHO_LINES` in the Echo campaign).
- `startBriefing(label, title, pages, done)` runs any sequence of pages in the `intro` state. Fire
  finishes the typing and then turns the page. Start skips to `done()`.
- In-game radio: `say(text, who = villain, queued = false)`. With `queued`, the message waits in `radioQ`
  until the current one ends. `hint(key)` shows one of Mira's `HINTS` once per game.
- `VOSS` in `game.js` keeps the in-play radio barks (silenced, restored, boss phases, game over).

### Stage types

Each leg has an explicit type, set by `setupStage(type)`. The planet's `order` picks the pair:
`'vs'` (default) = vertical approach (`normal`, or the planet's `approach`, e.g. `challenge`), then a
`side` assault ending at a boss base; `'sv'` = `side` approach (no boss), then a `capital` flyover.
`Game.legBoss` is true on the assault leg (side.js only adds the boss event then). `Game.isSide` is a
getter on `stageType`. `this.stage` is a difficulty number from `difficulty(leg)` (it grows with planets
cleared, not with the route), and the enemy formulas scale with it.

- **Vertical stages:** wave layouts (`buildNormalWaves`, `buildChallengeWaves`), spline flight paths
  (`PATH_DEFS` → `PATHS`), formation slots, dives, methylator beams.
- **Side missions** (`side.js`): `initSide()` builds a timed event script. `updateSide()` spawns patterns
  (`migLine`, `migSwoop`, `migRear`, `bomber`, `sam`, `methyl`, `splitterLine`, `droneSwarm`,
  `armoredPair`, `boss`). Each enemy's `beh` field picks its movement in `updateSideEnemy`. Everything
  in a side mission is drawn in **side profile**: `drawShip(..., side)` uses `SPR.hulls[h].side`,
  `drawSideEnemy` uses `SPR.enemy[type].side` (facing left, flipped with `NES.drawFlip` when flying right),
  and the boss is a grounded warship drawn side-on.
- **Sectors:** `SECTORS` in `campaign.js` gives each sector its planets, links, boss, enemy `swap`s
  (`mixType`), extra `sideKinds`, `acetyl` bonus and the hull its shop sells. Planets carry their
  side-mission background colors (`sky`).
- **Boss warships** (`bosses.js`, side missions): grounded warships on landing legs, bow left.
  `BOSSES[id]` picks a hull `style` (`BASE_STYLES`: battleship, destroyer, carrier), a palette, how many
  targets of each kind it mounts (`BASE_LAYOUTS`: turrets, launchers, hangars, radars, cores) and a
  `shield` rule (`turrets`, `launch`, `swapCore`, `swapTurret`). The style paints the hull (`bossArt`)
  and returns the target slots, so targets sit on painted features (`sx/sy` from the hull's left edge
  at ground level). The ship rolls in with the ground, then sets `scrollLock`. Win = every target dead.
  The hull is scenery: shots pass through it and the ship can fly over the whole screen.
- **Homing missiles** re-check `targetable()` every frame, so they drop targets that die, leave the
  screen, get shielded or are removed. New target kinds must be added to `findTarget`/`targetable`.
- **Capital ships** (`capital.js`, vertical boss): `CAPITALS[id]` sets the hull `style` (`CAP_STYLES`:
  battleship, destroyer, carrier, twin), size, palette and target counts. The style paints the hull and
  returns target slots. The ship is drawn with a transform (`placeCapital`: center, angle, scale) through
  three phases: `zoom` (it grows from far away to full size), `pass` (it scrolls under you; only now can
  targets be hit) and, when a pass ends with targets left, `spin` (seen from far away, it turns 180
  degrees) before the next zoom. `capitalToScreen(lx, ly)` maps hull coordinates to the screen.
  Specials and homing missiles reach its targets through `capitalOnScreen()`/`damageCapTarget()`.
  The planet's `boss`/`capital` field or the sector's picks the id.
- **Carrier** (`carrier.js`): drawn to scale with the ship (`CAR`: a 360×720 top view, a 580-wide side
  profile). `startTakeoff()` lifts the ship on the deck elevator and catapults it off the bow while the
  camera follows; `startLanding()` brings the carrier in stern first, the ship touches down on the wires,
  rolls out to the elevator and is lowered. `this.carrier` is drawn by `drawWorld` while it exists.
- **Widescreen layout:** gameplay uses the whole 424-wide screen (`W`, center `CX`). Menus, dialogue and
  banners are 256-wide layouts drawn in a centered panel: `panel(ctx, fn)` translates by `OX`. Backdrops
  (title, starbase, galaxy map, sortie) span the full width.
- **`orient(x, y)`** turns a vertical-stage direction (up = forward) into the current orientation.
  Use it in code shared by both modes so that code doesn't need separate vertical and side branches.

### Key data tables (at the top of `game.js`)

- `FORMS`: the player's three forms (speed, `free` = can climb/dive, hitbox).
- `ENEMY`: enemy types (hp, points `[normal, acetylated]`, hit radius). A new enemy type needs an entry
  here, top-down **and** side-profile art in `ENEMY_DEFS` (`sprites.js`), and an hp in `spawnSideEnemy`.
- `VOSS`: Dr. Voss's in-play radio lines. The briefings and stage titles are in `story.js`.
- `SPECIALS` (in `specials.js`): special weapons. The pilot learns them at `LEARN_LEVELS` (2, 5, 8); the
  hangar lists only `camp.learned`. Ammo = the `special` stat, refilled at every takeoff.
- `PILOTS` and `HULLS` (in `pilots.js`): `statOf(key)` = pilot + hull + `camp.up` upgrades, capped at
  `STAT_CAP`. `weapons` is the shot damage multiplier (`statOf('weapons') / 4`, via `gunPower()`), the
  hull's `speed` scales every form (`speedMul()`). There are no lives: `Game.shields` soaks hits through
  `takeHit()`, one more hit at 0 fails the mission, and shields refill in `setupStage`.
- `SECTORS`, `LEVELS`, `LEARN_LEVELS` (in `campaign.js`), `UPGRADES` and prices (in `starbase.js`).
- `Game.camp` is the whole saved campaign (pilot, hull, owned hulls, upgrades, money, xp, level, learned
  specials, cleared planets, current sector, loop, story beats seen, score). It is saved as JSON in
  `localStorage['chimera.save']` by `saveCampaign()` whenever the carrier docks or you buy something.
- TET capsules (`tet.js`): acetylated kills may drop one (`dropTet`); collecting it restores a silenced form.

## Conventions

- **Stay SNES-authentic.** The screen is 424×240 (16:9 at the SNES's 240 lines). Colors are 15-bit (use
  `SNES.rgb`/`mix`/`ramp`); shade with 5-step ramps and banded glows, never smooth gradients or
  anti-aliasing. Round coordinates to whole pixels. Rotation and scaling (`SNES.drawRot`, transforms)
  and color math (`SNES.add`, `SNES.half`) are fine, as on the SNES.
- **Art direction:** Robotech is the reference for portraits (anime cel style) and for our ships and the
  enemies; Truxton for the mechanical detail of ships, turrets and tanks; Space Battleship Yamato and Star
  Destroyers for the bosses. Every enemy is a machine (no animals, fish or bugs).
- **All timing counts frames at 60 Hz** (e.g. `300` = 5 seconds). Don't use `Date`/`performance.now()` for game logic.
- **The font is uppercase only** and has a limited character set (see `FONT` in `nes.js`). A character
  that isn't in it is silently skipped (so no `&`, `;` or `*`). Wrap long lines with `NES.wrap(str, n)`.
  Dialogue wraps at 25 characters: a briefing page holds 6 lines and a radio message 3. Longer text
  is cut off without any warning, so count the wrapped lines. Screen text at x=8 fits about 30 characters.
- Sprites are ASCII grids: `.` is transparent, and every other character looks up a color in a map.
  Draw top-down sprites pointing up. Side-mission art is a separate side profile: the player's points
  right, enemies' point left. Don't rotate a top-down sprite for a side mission.
- Every file starts with `'use strict';`. Shared helpers in `game.js` (`rand`, `randi`, `pick`, `clamp`,
  `angDiff`, `TAU`, `C`, `W`, `H`, `CX`, `OX`) are globals and available to the files loaded after it.
- Keep the style: short methods on `Game`, compact one-line statements, and brief comments that explain *why*.
- Wrap all `localStorage` access in try/catch (keys: `chimera.hi`, `chimera.padmap`, `chimera.save`).
  If you change the shape of `Game.camp`, bump its `v` and handle old saves in `continueCampaign`.
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
- **New story beat:** edit `PLANET_STORY` (per planet), `STORY_BEATS` (Voss's arc) or
  `LOOP_TOPICS`/`ECHO_LINES` (Echo campaign) in `story.js`. For a one-off radio tip, add it to `HINTS`
  and call `this.hint('key')` where it happens.
- **New planet:** add it to a sector's `planets` in `SECTORS` (id, name, `sky`, `disc`, optional
  `order`, `approach`, `boss`, `capital`) and add its briefing to `PLANET_STORY`.
- **New sector:** add it to `SECTORS` with `x/y` on the map and `links` in **both** directions.
- **New boss warship:** add an entry to `BOSSES` (name, `style`, `pal`, `layout`, `shield`, `launch`, `hp`,
  intro), plus a layout to `BASE_LAYOUTS`, a hull to `BASE_STYLES` or a rule to `updateBossShields` if needed.
- **New capital ship:** add an entry to `CAPITALS` (name, `style`, size, palette, target counts, `launch`
  type, intro). A new `CAP_STYLES` hull must return at least as many slots as the ship mounts.
- **New hull:** add it to `HULLS` (`pilots.js`) and `HULL_ART` (`sprites.js`, same index, with top-down
  and side-profile rows), and set a sector's `hull` to sell it.
- **New system in its own file:** use the `Object.assign(Game, {...})` mixin pattern and add a
  `<script>` tag after `game.js` in `index.html`.

## Repo notes

- Work happens on `main`.
- `.gitignore` ignores `node_modules/` and OS junk files. If you add npm tooling (a linter, a local
  server), keep the game runnable straight from `index.html`.
