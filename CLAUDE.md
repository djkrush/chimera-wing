# CLAUDE.md

Guidance for working on **Chimera Wing**, a Galaga / U.N. Squadron-style shooter with NES-style graphics,
written in plain browser JavaScript. `README.md` covers gameplay, controls and story. Read it before you
change how the game plays. `FUTURE.md` lists planned improvements; add ideas there.

## Running and testing

- There is no build step, no package manager, no bundler and no test suite. Open `index.html` in a browser.
- `index.html?stage=N` skips the title screen and drops into a planet's stronghold (`testLeg` in
  `campaign.js`): planet `ceil(N/2)` in `PLANETS` order, odd N = first leg, even N = the boss leg. E.g.
  2 = Earth's base, 4 = the Mars capital-ship flyover, 168 = the finale. `&hull=N`,
  `&passives=drone,rear` and `&fit=charge,swivel,rail` (one gun per form) set up the ship. Test
  campaigns (`camp.test`) never save, all specials are learned, every gun is owned, and every mission
  on earlier planets counts as cleared.
- `index.html?touch` turns on the touch controls on a desktop; clicks act as taps.
- Serve the folder over HTTP (e.g. `python -m http.server`) for browser automation: extensions can't
  open `file://`. Browsers cache the scripts, so send `Cache-Control: no-store` or change port after edits.
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
nes.js → snes.js → shipyard.js → faces.js → sprites.js → audio.js → input.js → game.js → bosses.js → capital.js → side.js
       → scenery.js → specials.js → weapons.js → pilots.js → skills.js → world.js → campaign.js → starmap.js
       → starbase.js → carrier.js → story.js → tet.js → howto.js → touch.js → main.js
```

| Global | File | Role |
|---|---|---|
| `NES` | `js/nes.js` | 424×240 widescreen size (`NES.W/H`), base palette `NES.C`, shaded 5×7 bitmap font (`NES.text`), `NES.sprite`, draw helpers (`draw`, `drawRot`, `drawFlip`, `disc`, `box` (SNES window), `hilite`, `wrap`) |
| `SNES` | `js/snes.js` | 15-bit color and 5-shade `ramp`s, `bake` (shaded ASCII sprites), `glow`/`sphere`/`globe`, smooth `drawRot` with scaling, color math (`add`, `half`), HDMA-style `bands`, parallax `layer`/`scrollX`/`scrollY`, Mode 7 `texture`/`mode7` |
| `FACES` | `js/faces.js` | Character portraits (56×64), painted like SNES fighting-game select screens: shapes drawn in 40×48 units on a 4× canvas (materials with form lighting plus shadow/highlight shapes), reduced to pixels with hand-picked ramps and a silhouette outline, then eyes and glints stamped pixel by pixel. The pilots (`pilot()`) are front views in full flight gear with the mirror visor down over the eyes (helmet, visor, oxygen mask and hose); Mira and Voss are painted front-view faces (`frontNeck`/`frontHead`). `drawFace` frames them at 60×68; dialogue puts the frame in the widescreen margin left of the text box. |
| `YARD` | `js/shipyard.js` | Painter for the big pre-rendered machines (carrier, capital ships, boss warships): `sheet(w, h)` lays down materials at height levels (`rect`, `poly`, `ellipse`, `mirrorX`, `recolor`), `bake()` bevels, drop-shadows and outlines them; detail helpers `modules`, `plates`, `greebles`, `vent`, `turret`, `windows` |
| `SPR` | `js/sprites.js` | All pixel art as ASCII rows + color maps, baked at load time. Top-down sprites point **up** and the game rotates them. Side-mission sprites are **side profiles**, drawn unrotated. |
| `Sound` | `js/audio.js` | SNES-style (SPC700) sound: instruments are samples synthesized at start-up and BRR-encoded (`buildSamples`), played with ADSR, pan and one shared echo. `Sound.sfx(name)` (names in the `SFX` table), `Sound.playSong(Sound.SONGS.x)`. Sequencer notes are `"NOTE:LEN"` tokens in sixteenths, `A4+C5:2` chords, `inst@NOTE` to borrow an instrument; drum tracks use the kit letters. Songs are built bar by bar with `arrange(bpm, echo, sections, parts)`. The music takes its tempo, keys and harmony from Acen's 1992 records ("Trip II The Moon", "Obsessed II"), with our own melodies. |
| `Input` | `js/input.js` | Keyboard, gamepad and touch merged into abstract actions: `Input.pressed(a)`, `Input.just(a)`. Actions: `left right up down fire special transform prevForm start back form1-3`. Per-pad remaps live in `localStorage['chimera.padmap']`. Touch feeds `Input.setVirtual(a, on)` (held) and `Input.pulse(a)` (one frame). |
| `Touch` | `js/touch.js` | Touch controls (DOM overlay): floating joystick in flight, A/B/X/START buttons, taps elsewhere go to `Game.tap(x, y)`. On for Android/Samsung UAs, `?touch`, or the first touch. `Touch.on` switches `main.js` to fill-the-screen scaling. |
| world data | `js/world.js` | `GALAXIES` → systems → planets, flattened into `SYSTEMS`, `PLANETS` and the `*_BY_ID` maps. Also `MISSION_KINDS`, `MARKET_POOL`, `TERRAIN_PAL`, `seededRand`. Loads after `game.js` (uses `C`, `TAU`). |
| `Game` | `js/game.js` | One big singleton object: state machine, Galaga stages, player, enemies, bullets, collision, HUD and rendering |
| (mixins) | `js/bosses.js`, `js/capital.js`, `js/side.js`, `js/scenery.js`, `js/specials.js`, `js/weapons.js`, `js/pilots.js`, `js/skills.js`, `js/campaign.js`, `js/starmap.js`, `js/starbase.js`, `js/carrier.js`, `js/story.js`, `js/tet.js`, `js/howto.js`, `js/touch.js` | Add methods to `Game` with `Object.assign(Game, {...})`. They must load after `game.js`. `Object.assign` copies a getter's *value*, so mixins use methods (e.g. `villain()`), not getters. |
| boot | `js/main.js` | Scales the canvas to whole-number sizes, sets global hotkeys, runs a **fixed 60 Hz** accumulator loop (`Input.update(); Game.update();` per tick, `Game.draw(ctx)` per frame) |

### Game state machine

`Game.state` is one of `title | howto | setup | pilot | travel | base | map | intro | hangar | sortie |
takeoff | play | clear | result | landing | debrief | learn | gameover`. `Game.update()` and `Game.draw()`
switch on it. Change state with `setState(s)`, which also resets `stateT`. `Game.paused` shows the
in-game menu over any state; START opens it on every screen past the title (so menus confirm with A,
not START). It offers RESUME, SKIP BRIEFING, SOUND, ABORT MISSION, QUIT TO TITLE and EXIT GAME
(`exitGame()`: save, leave fullscreen, go back a page). `inMenu()` lists the full-screen menu states (no playfield; `draw()` sends
them to `drawMenuScreen`). While `inBase` is set, `intro`/`hangar` draw over the starbase (`drawInBase`).

Campaign flow (`campaign.js`):

```
NEW GAME → pilot → newCampaign() → travel → base (autosave) → learn (starter passive)
base: MISSIONS → startMission(i) → intro (briefing) → hangar (guns and special) → sortie
  → startLeg(0) → takeoff → play → clear/result → legDone() → landing → afterLanding()
  → startLeg(1) ... (as many legs as the mission has; a stronghold's last leg has the boss)
  → missionComplete() → debrief → learn (one screen per pending choice) → base
      (finale: debrief → startEnding() → epilogue → startNewGamePlus() → travel → base)
base: STAR MAP → map (zoom levels) → travel → base      gameover / ABORT MISSION → missionFailed() → base
```

- **Where you are:** `camp.at` is the planet the carrier orbits. `planetHere()`, `systemDef()` and
  `galaxyDef()` resolve it (or the mission's planet during a mission). `arriveBase()` runs pending
  level-up choices first, then a galaxy's arrival briefing (`GALAXY_STORY`) on the first visit.
- **Missions** (`makeMission(P, i)`): `{ planet, mi, kind, legs: [{ type, boss }], leg }`. Kinds are in
  `MISSION_KINDS` (`world.js`); a leg type is `normal | challenge | side | raid | capital` (`raid` is a
  side stage with `this.raid` set). Progress lives in `camp.cleared['planetId:missionIndex']`.
- **Unlocking:** a planet's stronghold opens when its other missions are done (`missionOpen`); a system
  is secured at half its planets cleared (`systemSecured`), which opens linked systems (`systemOpen`);
  a galaxy opens when every system of the previous one is secured (`galaxyOpen`).
- **Star map** (`starmap.js`): `mapUI = { level: 0 universe | 1 galaxy | 2 system, gal, sys, sel, zoom }`.
  `mapItems(level)` lists what can be picked; `tapMap` handles clicks and taps; travel plays on the
  smallest map level that shows both ends.
- **Level-ups** (`skills.js`): `gainLevels()` pushes `'stat'` and `'special'`/`'passive'` into
  `camp.pending`; `openLearn()` shows them one by one (three random offers each) and ends in
  `leaveDebrief()`.

### Story (`js/story.js`)

- `CAST` lists the speakers: `mira` (the ally, aqua), `voss` (the villain, pink) and `echo` (the villain in
  the Echo campaign, magenta). `Game.villain()` picks Voss or the Echo from `camp.loop`.
- `PLANET_STORY[planetId]` holds a story planet's stronghold briefing. A page is `[speaker, text]`. Each
  says why we fight there and what the boss is. Every other mission gets a field briefing built by
  `planetBriefing(S, P, kind)`: Mira's `MISSION_LINES[kind]`, a science note from `FIELD_NOTES`, and a
  line from `VOSS_TAUNTS` (or `LOOP_TOPICS`/`ECHO_LINES` in the Echo campaign).
- `STORY_BEATS[n]` tells Voss's personal story. Beat `n` plays once, before the next briefing after
  `n` systems are secured, so it stays in order on any route. `GALAXY_STORY[galaxyId]` plays on the
  carrier's first arrival in a galaxy.
- `startBriefing(label, title, pages, done)` runs any sequence of pages in the `intro` state. Fire
  finishes the typing and then turns the page. The game menu's SKIP BRIEFING jumps to `done()`.
- In-game radio: `say(text, who = villain, queued = false)`. With `queued`, the message waits in `radioQ`
  until the current one ends. `hint(key)` shows one of Mira's `HINTS` once per game.
- `VOSS` in `game.js` keeps the in-play radio barks (silenced, restored, boss phases, game over).

### Stage types

Each leg has an explicit type, set by `setupStage(type)`. A stronghold's planet `order` picks its pair:
`'vs'` = vertical approach (`normal`, or the planet's `approach`), then a `side` assault ending at a
boss base; `'sv'` = `side` approach (no boss), then a `capital` flyover. Other missions are a single
leg (`MISSION_KINDS`). `Game.legBoss` is true on a boss leg (side.js only adds the boss event then).
`Game.isSide` is a getter on `stageType`. `this.stage` is a difficulty number from `difficulty(boss)`:
it grows with the system's `tier` (its place in the galaxy chain) and the planet's place in its system,
like open-world zones. `hpMul()` makes enemies and bosses tougher in later galaxies.

- **Vertical stages:** several squadrons in turn (`squads`, `nextSquadron()`), wave layouts (`buildNormalWaves`, `buildChallengeWaves`), spline flight paths
  (`PATH_DEFS` → `PATHS`), formation slots, dives, methylator beams.
- **Side missions** (`side.js`): `initSide()` builds a timed event script. `updateSide()` spawns patterns
  (`migLine`, `migSwoop`, `migRear`, `bomber`, `sam`, `methyl`, `splitterLine`, `droneSwarm`,
  `armoredPair`, `boss`). Each enemy's `beh` field picks its movement in `updateSideEnemy`. Everything
  in a side mission is drawn in **side profile**: `drawShip(..., side)` uses `SPR.hulls[h].side`,
  `drawSideEnemy` uses `SPR.enemy[type].side` (facing left, flipped with `NES.drawFlip` when flying right),
  and the boss is a grounded warship drawn side-on.
- **Systems:** each system in `GALAXIES` (`world.js`) gives its planets, links, boss, capital, enemy
  `swap`s (`mixType`), extra `sideKinds`, `acetyl` bonus and securing `bonus`. Planets carry their
  side-mission colors (`sky`), map colors (`disc`), `terrain`, `missions`, `market` (upgrade keys) and
  `hulls` (their shipyard). Generated planets are `[name, terrain code]`; `seededRand(P.id)` fills in
  the rest, so they never change between runs (don't reorder them: saves key missions by planet id).
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
  The planet's `boss`/`capital` field or the system's picks the id.
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

- `FORMS`: the player's three forms (speed, hitbox). Every form flies in all four directions; `p.tilt`
  eases toward the stick and `drawShip(..., tilt)` shows bank frames (vertical, `SPR.hulls[h].top.bankR/bankL`)
  or pitch steps (side). The Battloid's engine glow comes from its feet. What each form fires is a
  gun part: `fittedGun(form)` reads `camp.fit[hull]` and falls back to the hull's default fit
  `HULLS[h].guns`. `HULLS[h].mounts[f]` ('light' | 'heavy') limits what fits (`canMount`); `HULLS[h].form[f]`
  is the hull's damage multiplier in that form. Guns level up (`gunLevel(id)`, 1 to 5 at `GUN_LEVELS`)
  from the points each form scores (`addGunXP` in `killEnemy`), and `fireWeapon()` reads the level.
  `triggerGun()` runs every frame (charge meter `p.charge`, swivel angle `p.swivel`) and calls
  `fireWeapon()`; it, `updateBullets()`, `steerBullet()` and `drawPlayerBullet()` live in `weapons.js`;
  `collide()` calls `bulletHits(b, e)` there (piercing shots carry `pierce` and a `hit` list; wide ones a
  `rad`; `bulletEnd(b)` bursts bombs, clusters and charge balls).
- `ENEMY`: enemy types (hp, points `[normal, acetylated]`, hit radius). A new enemy type needs an entry
  here, top-down **and** side-profile art in `ENEMY_DEFS` (`sprites.js`), and an hp in `spawnSideEnemy`.
- `VOSS`: Dr. Voss's in-play radio lines. The briefings and stage titles are in `story.js`.
- `SPECIALS` (in `specials.js`): special weapons, learned at even levels; the hangar's SPECIAL row lists
  only `camp.learned` (the row is hidden until one is learned). The hangar (`hangarRow` 0 to 3,
  `hangarChange(dir)`, `tapHangar`) opens before every sortie. Ammo = `specialAmmo()`, refilled at every takeoff. Lasting ones keep timers
  (`chronoT`, `empT`, `reflectT`, `podT`, `hyperT`, `grav`) reset by `clearSpecialFx()`;
  `specialCollide()` runs their effects on bullets and planes.
- `PASSIVES` (in `skills.js`): always-on skills, learned at odd levels (`hasPassive(id)`). In-flight
  ones run in `updatePassives()`; others hook in where they act (`takeHit`, `silenceForm`, `battMax`,
  `maxShields`, `specialAmmo`, rewards, `tet.js`). Per-leg flags reset in `resetPassives()`.
- `PILOTS` and `HULLS` (in `pilots.js`): `statOf(key)` = pilot + hull + `camp.up` upgrades +
  `camp.train` (level-up points), capped at `STAT_CAP` (16). `gunPower(form)` = `weapons / 4` times the
  hull's form multiplier and the form's gun upgrade; `speedMul()` = hull speed and engine upgrades.
  There are no lives: `Game.shields` soaks hits through `takeHit()`, one more hit at 0 fails the
  mission, and shields refill to `maxShields()` in `setupStage`.
- `LEVELS` (in `campaign.js`), `UPGRADES` and `upgradePrice` (in `starbase.js`; `camp.up[key]` counts
  purchases).
- `Game.camp` is the whole saved campaign (`v: 3`: pilot, hull, owned hulls, `up`, `train`, money, xp,
  level, `learned` specials, `passives`, `pending` choices, `cleared` missions, `at` planet, `seen`
  galaxies, loop, story beats, score, `guns` owned, `fit[hull]`, `gunXP[id]`, `ord` (ordnance, for M2),
  and `opened` systems for converted saves). It is saved as JSON in `localStorage['chimera.save']` by
  `saveCampaign()` whenever the carrier docks, you buy something or you launch from the hangar.
  `continueCampaign()` migrates step by step: `migrateSave()` (v1 → v2), then `migrateV2()` (v2 → v3).
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
- Keep the game playable with only a D-pad, A, B, Select and Start (NES-style pads), and with touch
  (joystick, A, B, X, START and taps). Put keyboard-only extras (like `back`) on top of that; don't make
  them required. New menus should accept taps: add a case to `Game.tap` (`touch.js`).
- Theme: the enemies, mechanics and story are built on real epigenetics (methylation, acetylation, histones,
  TET enzymes, imprinting and so on). The villain can be evil, but her science has to be right: check every
  fact you add, and don't invent biology (no "aggression genes").

## Adding things (quick recipes)

- **New sound effect:** add an entry to `SFX` in `audio.js` (voices from the `INST` sample bank), then call `Sound.sfx('name')`.
- **New instrument:** synthesize it in `buildSamples()` and `add(name, data, f0, loop, env)`; looped
  samples need whole-number Hz over their length so the loop is seamless.
- **New special weapon:** add it to `SPECIALS`, handle its `id` in `useSpecial()` (plus `updateSpecial`/
  `drawSpecialFx`/`specialCollide`/`clearSpecialFx` if it lasts over time), and add an icon to
  `SPR.specialIcons` at the same index.
- **New passive skill:** add it to `PASSIVES` (`skills.js`) and check `hasPassive('id')` where it acts.
- **New gun:** add it to `GUNS` (`weapons.js`: `price`, `mount`, `gal` = first galaxy that sells it,
  two `desc` lines, four `lv` effects of 18 characters or fewer) and a `case` in `fireWeapon()` that reads
  the level `L` (and `gunCap()` if it fires more per shot); give new bullet kinds flight in
  `steerBullet()` and art in `drawPlayerBullet()`. Markets pick it up from `MARKET_POOL` automatically.
- **New market upgrade:** add it to `UPGRADES` (`starbase.js`) and `MARKET_POOL` (`world.js`), then read
  `upLevel('key')` where it acts.
- **New side-mission pattern:** add a `case` to `spawnSidePattern`, add it to the `kinds` list in `initSide`,
  and add a `beh` case in `updateSideEnemy` if it needs new movement.
- **New story beat:** edit `PLANET_STORY` (per planet), `STORY_BEATS` (Voss's arc) or
  `LOOP_TOPICS`/`ECHO_LINES` (Echo campaign) in `story.js`. For a one-off radio tip, add it to `HINTS`
  and call `this.hint('key')` where it happens.
- **New planet:** add `['NAME', 'terrain code']` to a system's `planets` in `world.js` (a generated
  planet), or a full object (id, name, terrain, `sky`, `disc`, optional `order`, `approach`, `boss`,
  `capital`, `missions`, `market`, `hulls`, `ring`) with a stronghold briefing in `PLANET_STORY`. At most
  ten planets per system. Add new planets at the end of a list: `?stage=N` counts them in order.
- **New system:** add it to a galaxy's `systems` with `x/y` on the galaxy map and `links` in **both**
  directions. The galaxy's first system is its entry point.
- **New galaxy:** add it to `GALAXIES` with `x/y` on the universe map, `col` and `arms` colors.
- **Text length:** briefing pages wrap at 25 characters, 6 lines; radio lines and boss intros 3 lines.
  Mission lines are built from planet and boss names, so check long names against `MISSION_LINES`.
- **New boss warship:** add an entry to `BOSSES` (name, `style`, `pal`, `layout`, `shield`, `launch`, `hp`,
  intro), plus a layout to `BASE_LAYOUTS`, a hull to `BASE_STYLES` or a rule to `updateBossShields` if needed.
- **New capital ship:** add an entry to `CAPITALS` (name, `style`, size, palette, target counts, `launch`
  type, intro). A new `CAP_STYLES` hull must return at least as many slots as the ship mounts.
- **New hull:** add it to `HULLS` (`pilots.js`, with `guns` and `form`) and `HULL_ART` (`sprites.js`,
  same index, with top-down and side-profile rows), and put its index in a planet's `hulls` to sell it.
- **HOW TO PLAY** (`howto.js`): an illustrated FAQ. `howPages()` builds the topics and pages once:
  `page(q, paragraphs, art)` or `list(q, items, art)` (lists come from the game's tables and split over
  pages by height). Each `art(ctx, x, y, hi)` draws in the left pane, centered on x, y; on lists `hi` is
  the lit row. A page that runs too long logs `HOWTO page too long` to the console. When you add a gun,
  special, passive, upgrade, hull or enemy, its list updates by itself; new mechanics need a page.
- **New system in its own file:** use the `Object.assign(Game, {...})` mixin pattern and add a
  `<script>` tag after `game.js` in `index.html`.

## Repo notes

- Work happens on `main`.
- `.gitignore` ignores `node_modules/` and OS junk files. If you add npm tooling (a linter, a local
  server), keep the game runnable straight from `index.html`.
