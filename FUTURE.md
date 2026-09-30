# Future improvements

Ideas for later versions of Chimera Wing. The **Roadmap** orders them into releases; the **Economy**
and **Design specs** sections size the first ones; the **Idea catalog** holds every idea once, with the
game it comes from. Add new ideas to the catalog and give them a milestone. Move an item to the README
when it ships.

Sources: GameFAQs guides for U.N. Squadron (SNES), Carrier Air Wing (arcade), Gradius III (SNES),
Axelay (SNES), Thunder Force IV (Genesis), Radiant Silvergun (Saturn), R-Type III (SNES), Darius Twin
(SNES) and Strikers 1945 II (PlayStation); the source code of two 1942 remakes
([kavros/1942-Arcade-Game](https://github.com/kavros/1942-Arcade-Game) and
[theonlyrao/1942](https://github.com/theonlyrao/1942)) and of three small open-source shooters
([Typhoon Force: Storm Fighter](https://frost-dev.itch.io/typhoon-force), LÖVE/Lua;
[SUPERCRUISE](https://github.com/Awcmon/SUPERCRUISE), C++; and
[Astral Shooter](https://github.com/ThatOneGuy2664/Astral-Shooter), Phaser); and reviews and wikis for Gley Lancer, Batsugun,
Steel Empire, Zanac, Super Aleste, Arrow Flash and DoDonPachi.

## Roadmap

Each milestone is a release the game can ship on its own. Items link to the catalog below.

| # | Milestone | What it adds | Why first |
|---|---|---|---|
| M1 | **Loadout** | Guns as parts, new guns sold at markets, guns that level up with use, a hangar that fits guns, save v3 | The core of both problems: markets run out of stock, and progress stops once stats cap |
| M2 | **Arsenal and economy** | Ordnance, barrier and escort modules, Mk II / Mk III upgrades, price retune, money missions | Gives credits a use in every galaxy (see Economy) |
| M3 | **Vertical stages** | Traffic between squadrons, gunship mini-bosses, squadron bonus, rear attacks, fire budgets, shot-down %, bullet types by color, off-screen warnings, screen shake | The vertical stages repeat the same five waves; this makes them a 1942-style run |
| M4 | **Hulls** | Hull roles and signature moves, four late hulls, pilot perks with a mechanic, unique hull art | New ships to chase in the Magellanic Cloud and Andromeda |
| M5 | **Bosses and rewards** | Part-reactive and multi-section bosses, escape timers, readable turret patterns, boss %, chains, grazing, weapon challenges, secrets | Rewards for playing well, not just for playing longer |
| M6 | **Stages** | Branching legs, new mission kinds, risk contracts, hazards, checkpoints, speed control, weapon-swap beam, planet briefings | Variety between missions late in the campaign |
| — | **Later** | Carrier upgrades, card game, music, passive slots, planet reputation, more galaxies, touch polish, save slots, score attack | Worth doing, but they don't fix the long-campaign problem |

## Economy

Numbers from the code (`missionComplete` in `js/campaign.js`, `HULLS` in `js/pilots.js`, `UPGRADES` in
`js/starbase.js`) and a run of every mission in `js/world.js` (12 systems, 243 missions). Income counts
mission pay, planet bonuses and system securing and liberation bonuses; **combat pay** (`score / 40` plus
challenge bonuses) comes on top and isn't included.

| Galaxy | Systems (tier) | Mission and bonus pay | Running total | New things to buy there |
|---|---|---|---|---|
| Milky Way | Sol, Alpha Centauri, Barnard's Star, Sirius (0-3) | about 65,000 | 65,000 | Manticore 4k, Griffin 5k, Hydra 9k, and every upgrade |
| Magellanic Cloud | Tarantula, S Doradus, SN 1987A, N44 (4-7) | about 150,000 | 215,000 | Wyvern 12k, Basilisk 18k |
| Andromeda | NGC 206, Mayall II, M32, M31 Nucleus (8-11) | about 250,000 | 460,000 | Phoenix 30k (Basilisk and Wyvern again) |

What there is to spend it on:

- **Hulls:** 78,000 for all six.
- **Upgrades with a cap:** about 45,000 to max all of them (`base * (n + 1)` each: engine 9k, three gun
  upgrades 14.4k, coolers 7.2k, armor 3k, scanner 2.1k, trade license 9k).
- **Stat upgrades:** few, because stats cap at 16 and 29 level-ups already train stats.

**Total: about 130,000 of things to buy against 460,000+ of income.** Money stops mattering around the
middle of the Magellanic Cloud: that galaxy pays 150k and adds 30k of hulls. The Phoenix at 30k is cheap
by the time it's on sale, and Andromeda adds nothing new.

**Target:** new things to buy should cost about 70 to 80% of what a galaxy pays, so a player who clears
most missions can afford most of it, and a player who skips missions has to choose.

| Galaxy | Pays | Target spend | Proposed sinks |
|---|---|---|---|
| Milky Way | 65k | 50k | As now (hulls 18k, upgrades about 30k), plus the first market guns (about 1.5k to 3k each) |
| Magellanic Cloud | 150k | 110k | Two new hulls (about 45k and 60k), Mk II upgrade tier (about 25k), guns at 4k to 8k, ordnance (about 10% of mission pay) |
| Andromeda | 250k | 185k | Two new hulls (about 75k and 90k), Mk III tier (about 50k), top guns at 10k to 15k, ordnance, carrier upgrades |

Rules for tuning:

- **Price by galaxy, not by count.** `upgradePrice` grows linearly with purchases, so the last engine
  level costs 3,600 at any point in the game. Mk II and Mk III tiers should be separate market entries
  (`engine2`, `engine3`) that only appear in `MARKET_POOL` draws for planets in the Magellanic Cloud and
  Andromeda, and raise the cap by 1 or 2 levels at 3x and 6x the base price.
- **Hull prices about 30% of a galaxy's pay.** A new hull should take one or two systems of saving, not
  a whole galaxy (U.N. Squadron's guide tells players to grind one mission for the $1,000,000 F-200: avoid that).
- **Ordnance is the steady sink.** It costs something every mission and pays some back (see the spec below).
- **Keep formulas in one place.** Put per-galaxy multipliers in a small table next to `upgradePrice`
  so later tuning is one edit.

## Design specs

Sized for implementation. Everything here must still work with a D-pad, A, B, Select and Start, and with
touch; screen text is uppercase and wraps at 25 characters.

### M1: guns as parts

- **Data:** `GUNS` (`js/weapons.js`) gains `price`, `mount` (`'light'` or `'heavy'`) and `desc` (two
  lines of 25 characters). `HULLS[h].guns` stays as the hull's **default fit**. Each hull gains
  `mounts: [f0, f1, f2]`, the heaviest class each form takes (a light mount takes only light guns; a heavy
  mount takes either). Heavy guns: `bomb`, `laser`, and new charge or rail guns.
- **Save:** `camp.guns` lists the guns owned (starting with the default fit of every owned hull);
  `camp.fit[hull]` is `[gun0, gun1, gun2]`, falling back to `HULLS[hull].guns`.
- **Firing:** `fireWeapon()` reads `this.fittedGun(form)` instead of `this.hullDef().guns[f]`. The hull's
  form multiplier (`HULLS[h].form`) still applies, so a Battloid-strong hull stays best in that form.
- **Markets:** `MARKET_POOL` entries of the form `gun:ripple` list a gun for sale; the shop page shows
  `OWNED` or the price. Early planets sell light guns, later ones heavy guns. Buying a hull also gives its
  default guns.
- **Hangar:** always opens before a sortie, not only when a special is learned. Four rows: FIGHTER,
  GUARDIAN, BATTLOID, SPECIAL. Up/down picks a row, left/right changes the gun or special on it, A
  launches. Guns a mount can't take are skipped. Touch: tap a row to pick it, tap its left or right half
  to change it (`tapHangar`).
- **New guns** (see the catalog): charge shot, rear rail gun, wall-hugging grenades, swivel vulcan,
  orbiting shots, spread field. Each needs a `case` in `fireWeapon()`, flight in `steerBullet()` and art
  in `drawPlayerBullet()`.

### M1: guns level up with use

- **Save:** `camp.gunXP[id]`, points earned with that gun.
- **Earning:** `killEnemy(e, form)` already knows which form scored the kill. Add the enemy's points to
  the XP of the gun fitted in that form. Specials and passives earn nothing.
- **Levels:** five, at 0, 2,000, 6,000, 15,000 and 35,000 XP (tune with a real run). Each gun has its
  own table of what a level changes, and every level must be visible, as in Darius Twin, where each of
  the eight upgrades changes the shot's shape:
  - Twin cannon: faster, a third stream, wider streams, pierces one plane.
  - Vulcan: tighter spread, more bullets on screen.
  - Piercing laser: pierces one more plane each level.
  - Ripple: the ring grows faster and wider.
  - Homing: three missiles, then four, turning faster.
- **Display:** the hangar shows `TWIN CANNON LV3` and a bar to the next level; the debrief lists guns
  that levelled.

### M2: ordnance

- **Data:** an `ORDNANCE` table: `{ id, name, family, tier, uses, price, hulls }`. Families have tiers,
  like Carrier Air Wing's homing missiles (Sparrow, Sidewinder, AMRAAM, Phoenix): for example missile pod
  I to III, bomb rack I to III, cluster pod, shield cell. `hulls` lists the hulls that can carry it, so
  hull roles matter.
- **Buying:** a LOADOUT row in the market; stock is kept in `camp.ord[id]`.
- **Using:** no new button. The hangar's SPECIAL row lists learned specials *and* stocked ordnance, and
  the special button fires whichever is fitted. Ordnance uses its own stock instead of `specialAmmo()`.
- **After the mission:** unused ordnance comes back to stock. Ordnance fired is gone. On a failed mission
  it's all lost, as in U.N. Squadron, so buying is a bet.

### Save version 3

- Bump `camp.v` to 3 and add `guns`, `fit`, `gunXP` and `ord` in `newCampaign()`.
- `continueCampaign()` now accepts only `v === 2` after migrating v1. Make migration a chain: v1 to v2
  (`migrateSave`), then v2 to v3 (owned guns = the default guns of every owned hull, empty `fit`, `gunXP`
  and `ord`).

## Idea catalog

### Hulls (M4)

- **Clear roles, not just bigger numbers (U.N. Squadron, Carrier Air Wing).** U.N. Squadron's planes each
  do one thing: the F-14 is fastest but carries few ground weapons, the A-10 is slowest with the best
  ground weapons, the YF-23 stealth plane can't be locked onto by homing missiles, and the endgame F-200
  carries every weapon and more of each (two Mega Crushes instead of one). Carrier Air Wing offers its
  biggest homing missile only to the F-14. Our hulls mostly differ in stats; give each a job through its
  mounts and the ordnance it can carry.
- **A signature move per hull.** Manticore: an evasive roll (1942's loop: invulnerable, three per leg,
  1,000 points for each one left at the end). Griffin: Battloid shield bash. Hydra: a third drone.
  Wyvern: Guardian lock-on volley. Basilisk: charged piercing shot. Phoenix: revives once per mission.
  Moves need no new button: a double-tap on a direction, or holding a form button.
- **Four late hulls.** Andromeda sells no new hull today. Add a ground-attack hull (A-10 or A-6 style:
  heavy mounts, bombs in every form), a stealth hull (enemy homing missiles lose it, methyl beams take
  longer to lock on), a drone carrier (escorts in every form), and a prototype won from a boss instead of
  bought. Prices follow the Economy table.
- **Pilot perks with a mechanic.** Pilots have perks today, but they're only stats (MAVERICK starts with
  8 weapons, TURTLE 8 shields, DRAC 6 special). U.N. Squadron's pilots differ in how they play: Shin
  powers up his gun fastest, Mickey carries the most special weapons, Greg recovers from damage fastest.
  For us: MAVERICK's guns level up faster, TURTLE's shields recharge after a quiet spell, DRAC carries
  one more ordnance slot.
- **Unique hull art.** The Wyvern, Basilisk and Phoenix reuse the Griffin, Manticore and Hydra airframes
  in new colors. Each should get its own Fighter shape, and every hull its own Guardian and Battloid art.

### Guns (M1)

- **Guns as parts (Axelay, Gradius III).** Axelay fits one weapon to each of three slots before every
  stage and unlocks one new weapon per stage; each new weapon suits the stage where it unlocks (Needle
  Cracker's homing for the city, Explosion Bombs for the pipe mazes). Gradius III's Edit Mode picks one
  option from each of six categories. Spec above.
- **New guns:**
  - *Charge shot:* Gradius III's Energy Laser (tap for small shots, hold for big ones), Thunder Force
    IV's Thunder Sword (charges while you aren't firing), Strikers 1945's three-level meter that fills
    more slowly toward level 3.
  - *Hyper beam* (R-Type III): charge fully, then fire a burst of heavy shots for a few seconds until the
    gun overheats and can't charge until it cools.
  - *Rear rail gun* (TF4 Railgun): fires backward and hits harder the closer you are.
  - *Wall-hugging grenades* (TF4 Snake): fired up and down, they burn along the ground they hit; good
    against turrets on side missions.
  - *Free Way* (TF4): bullets toward where you steer, missiles the opposite way.
  - *Swivel vulcan* (Axelay Round Vulcan): sweeps forward while fire is held, back when released.
  - *Orbiting shots* (Axelay Morning Star): a ring that circles the ship and also blocks bullets.
  - *Spread field* (Radiant Silvergun): angled shots that burst and hang in the air, blocking missiles.
  - *Lightning lock* (Radiant Silvergun homing plasma): locks two targets and hits harder the longer
    it holds, even through walls.
  - *Rear-guard vulcan* (Gradius Tailgun and 2-Way Back): covers the ship's back.
  - *Diagonal bombs* (Darius Twin secondary): arcing bombs that become four-way diagonal lasers as they level.
- **Guns level up with use (Radiant Silvergun, Batsugun, Steel Empire, Darius Twin).** Radiant Silvergun
  turns a weapon's points into its XP, and combined weapons split XP, each part improving a different
  stat. Batsugun levels its gun every 288 kill points (twice), then gives bombs. Steel Empire's weapons
  go to level 20 and are kept on death. Spec above. This replaces the old "weapon levels" idea.
- **In-flight power level (Carrier Air Wing, U.N. Squadron, Darius Twin).** Carrier Air Wing's gun levels
  come at 2, 8, 15, 23 and 31 pickups; U.N. Squadron's planes cap between 3 and 7; Darius Twin drops a
  power-up only from the last of six cubes. Optional on top of gun XP: pickups that raise the gun for the
  current leg only, capped per hull.

### Markets and ordnance (M2)

- **Ordnance bought per mission (U.N. Squadron, Carrier Air Wing).** Spec above.
- **Defense modules (Carrier Air Wing, Gradius III, TF4, Darius Twin).** Carrier Air Wing sells a shield
  for 3 or 5 hits. Gradius III's barriers protect differently: a front shield (about 14 hits from ahead),
  a rotating shield (front and back), a force field (3 hits from any side), or Reduce (shrinks the ship).
  TF4's shield blocks 3 hits with a moment of invulnerability after each. Darius Twin's shield has three
  grades (blue, silver, gold at 4 and 9 pickups) and looks more worn with each hit. For us: barrier
  modules that soak hits before `Game.shields`, and look worn as they fail.
- **Escort modules (Gradius III options, TF4 CLAW, Gley Lancer, R-Type III).** Gradius III's options trail,
  snake, hold a V formation or rotate around the ship as a shield. TF4's CLAW blocks some shots and adds
  shots to every weapon. Gley Lancer offers seven mover systems, among them Shadow (trails the ship,
  fires ahead) and Search (aims on its own). R-Type III's Force attaches to the front or the back, or
  flies free. The Drone Escort passive could take a formation module from the market.
- **Wingmen that can be shot off (1942).** kavros's remake flies side fighters into place beside the
  player; they fire with it and each is lost to one hit. A market module or a Wingman special variant
  that soaks one hit.
- **Mk II and Mk III upgrades.** See Economy.
- **Money missions (U.N. Squadron).** A short, optional supply-convoy raid that pays well and can be
  replayed; a safety valve for players short of credits.

### Vertical stages (M3)

What the 1942 remakes do that our vertical stages don't. Today a vertical stage is 2 to 4 squadrons,
each the same five Galaga waves (mirrored every other squadron), and the next squadron only comes once
the last is cleared (`buildNormalWaves`, `nextSquadron` in `js/game.js`).

- **Traffic between squadrons (kavros 1942).** Its stage is a 150-second timeline of overlapping groups
  in JSON: each type starts on its own delay (small jets every 9 to 16 s, eight times; medium planes at 18
  to 34 s; big planes at 40 and 120 s), and planes fly through and leave instead of forming up. For us: a
  `VTRAFFIC` table of groups (type, entry, count, spacing) that plays while a squadron flies in and
  between squadrons, spawned from `updateSpawns`. The stage keeps moving instead of pausing on the
  formation.
- **Three weight classes (kavros 1942).** Small planes die to 1 hit (30 to 70 points), medium ones take
  3 to 4 (1,000 to 1,500 points when destroyed, 100 per hit), big ones 8 to 10 (2,000); grey versions are
  tougher than green. For us: a medium gunship (3 to 4 hp) and a big bomber (8 to 10 hp) for vertical
  stages. Each needs an `ENEMY` entry, top-down and side art in `ENEMY_DEFS` and an hp in `spawnSideEnemy`.
- **Gunship mini-boss that can escape (kavros 1942, R-Type III, Darius Twin).** 1942's big plane climbs
  in from below, holds still, then leaves if you haven't killed it; its volleys spend ammo (the green one
  fires 2 angled shots, the grey one 4). R-Type III's early robots run away when the next one arrives.
  Darius Twin's mini-bosses, in contrast, stay until killed. For us: the gunship enters, holds and fires
  fans through `spreadShot`, and leaves after a while; escaping costs the kill bonus, not a hit.
- **Squadron bonus (kavros 1942, Darius Twin).** 1942's red squadron of 5 enters in a line from one side,
  0.4 s apart, and drops a power-up only when the last one dies. Darius Twin does the same with six
  cubes. For us: a marked line of 5 that drops a TET capsule or shield cell through `dropTet` when all
  five are shot down.
- **Attacks from behind (kavros 1942, Darius Twin).** 1942's medium planes enter from the bottom moving up.
  Darius Twin sends cubes and red ships from behind in later zones. For us: occasional rear entries,
  flagged by a warning arrow at the screen edge first.
- **Fire budgets and formation fire (kavros 1942).** Every second, each enemy on screen has a 20% chance
  to shoot, and each carries limited ammo (big planes spend 3 to 5 per volley), so old planes run dry.
  Ours cap bullets on screen (`10 + stage`) and fire only on entry and at fixed dive heights; planes in
  formation never fire. For us: a slow per-second chance from the formation (`updateAttacks`), and an
  ammo count per plane in `enemyFire`, with more for acetylated planes.
- **Fair homing (kavros 1942).** Its grey planes pick a down-left, down-right or straight path from where
  the player is, with a 10 px dead zone, and stop steering and shooting within 100 px. Ours fire at
  y 70, 110 and 140 whatever the distance. For us: skip a diver's shot when it is right on top of the player.
- **Shot-down % at stage clear (kavros 1942).** Its clear screen shows the percent of enemies destroyed
  and 1,000 points per unused loop. For us: show the percent and pay credits for it. We already pay
  `stageHits * 10` and 500 for a perfect challenge stage (`checkStageEnd`); extend that to every leg.
- **Boss in a band (theonlyrao 1942).** Its boss wanders at random but stays in a band at the top of the
  screen and picks a new heading every 75 frames; its levels shorten the gap between planes by a fixed step. For
  us: a simple rule for any new free-flying vertical boss.

### Enemy AI and game feel (M3)

From the source code of Typhoon Force, SUPERCRUISE and Astral Shooter. All three are small, but a few of
their rules are clearer than ours.

- **Bullet types by color (Typhoon Force).** Its changelog makes "bullet behaviour bound to the bullet
  type, not enemy type, so bullets of one colour always act the same way". Its enemies fire `aim`
  (at the player) or `straight` bullets. We have one enemy bullet (`SPR.ebullet`, drawn with one glow).
  For us: three or four bullet kinds with their own colors (aimed, straight down, slow homing,
  splitting), chosen per enemy in `enemyFire`/`spreadShot`, so a player can read a pattern at a glance.
  Keep the methyl beam as its own thing.
- **Scripted volleys (Typhoon Force).** Each enemy type lists the ticks it fires on: `fire_at` 200, 210,
  220 and again 650, 660, 670, so a volley is a burst of three shots 10 frames apart at a fixed point in
  its flight. It moves by a function of its own tick with an `offset` per member, so a group staggers
  without separate paths. For us: a `fire` list on wave entries (frames into the path) beside today's
  random `enterFireAt`, for hand-made bursts in set pieces.
- **Park-and-snipe enemy (Typhoon Force).** Its third enemy slides in to a set position, stops and keeps
  aiming at the player until destroyed; waves of four or five stagger their stop positions. For us: a
  turret plane that parks at the top of a vertical stage (or the right edge of a side mission) and
  fires aimed bursts; the player has to go and kill it, which breaks up camping in one spot.
- **Interceptors from every edge (SUPERCRUISE).** Enemies spawn from all four sides at random speeds and
  turn toward the player at a fixed 0.1 degrees per step, so faster ones overshoot. Each kill scores the
  enemy's speed squared, so the fastest planes pay most. For us: a fast interceptor type (kamikaze
  family, `spawnKamikaze`) whose points scale with speed.
- **Off-screen threat markers (SUPERCRUISE).** For every enemy flying toward the player it projects the
  approach line onto the screen border and draws a WARNING marker there: yellow when far, red within
  500 px, brighter as it closes. For us: small edge markers for rear entries, kamikazes and interceptors
  (the same marker as the rear-attack warning in Vertical stages).
- **Gun heat (SUPERCRUISE).** Each shot adds heat (3.3 of 100), heat bleeds off 1.5% per frame, a
  caution sound plays above 80, and at 100 the gun locks until it drops to 5. For us: a heat meter
  instead of the bullets-on-screen `cap` for some guns (vulcan, hyper beam), and it gives the GUN
  COOLERS upgrade a literal job.
- **Screen shake by distance (SUPERCRUISE).** Each explosion "punches" the view by an amount that falls off
  with distance from the player; only the strongest punch counts, and it decays 10% a frame. Firing and
  the afterburner add small punches. For us: SNES games shook by offsetting the background scroll a few
  whole pixels. Use it for boss deaths, big kills and hits on the player, scaled by distance and capped
  low, with a setting to turn it off.
- **Near-miss sounds (SUPERCRUISE).** A flyby sound plays once when an enemy passes within range. For us:
  a whoosh when a diver or kamikaze passes close; it pairs with grazing (Rewards).
- **Readable invulnerability and timers (Typhoon Force, Astral Shooter).** Typhoon Force draws the ship
  translucent for the first two thirds of its 3-second invulnerability and blinks it for the last third,
  so the player knows when it ends. Astral Shooter's 15-second shield starts blinking 5 seconds before it
  runs out. Ours blink the whole time (`drawWorld`, `p.invuln`). For us: steady, then blinking near the
  end, for invulnerability and for Gene Shield, Reflect Field, Force Pod and Hyper Mode.
- **Mission cards (SUPERCRUISE).** A typed-out title card on takeoff ("International Waters, Bering Sea,
  May 3rd, 1984, 1800 hours, DEFCON 3") and a KIA card with kills and time survived. For us: a short
  typed card at takeoff (planet, system, time, mission kind) and kills and time on the failed-mission
  screen.

### Bosses (M5)

- **Parts that change the fight (Darius Twin, Strikers 1945).** Darius Twin's squid shows its weak point
  when one tentacle is destroyed, but turns frantic if both are; its lobster stops firing while its claws
  fly loose, then starts charging once they're destroyed. Strikers 1945 hides gold bars under a
  destroyer's guns that only appear if the guns go before the control tower. For us: warship and capital
  targets whose loss changes what the rest do, so the order of kills is a choice (`updateBossShields`
  already has shield rules to build on).
- **Twin bosses (Darius Twin).** Emperor and Queen Fossil take turns in front; kill the wrong one first
  and the survivor gets harder. A pair of capital ships.
- **Multi-section bosses (Strikers 1945, R-Type III).** Each Strikers boss is two or three sections:
  armor first, then a transformed form (a train's armor, then the mech inside). R-Type III's last stage
  replays three older bosses as phases. For us: a warship whose hull breaks open into a second form
  after its targets fall.
- **Ordered locks (R-Type III).** The Foundry boss's gem sits behind blue, green and red blocks that must
  fall in that order. Fits the theme: remove marks in the right order (for example a demethylase
  before a histone core opens).
- **Readable turret patterns (kavros 1942, R-Type III).** 1942's "death star" fires straight, left and right
  on fixed frames of its rotation. R-Type III's boss patterns cycle in a fixed order that the guide lists.
  Tie capital-ship turret volleys to their rotation so fights can be learned.
- **Boss destruction % (Radiant Silvergun).** 5,000 points per percent of a boss destroyed and nothing
  if it escapes. For us: credits per boss target killed before the capital ship's last pass.

### Rewards (M5)

- **Color chains (Radiant Silvergun).** Three kills of the same color start a chain that grows. For us:
  chain methylated (gray) or acetylated (gold) planes for credits and XP.
- **Earn the bomb in flight (Radiant Silvergun, DoDonPachi).** Cutting ten pink bullets with the sword
  makes a screen-clearing Hyper Sword; DoDonPachi fills a hyper meter with combos. For us: absorbing
  certain enemy shots charges a free Mega Crush.
- **Weapon challenges (Radiant Silvergun).** Bonuses such as 300 homing hits without a miss. For us: a
  per-gun challenge list that pays once and shows on the gun's hangar card.
- **Grazing (Radiant Silvergun).** Bullets that scrape past the ship add points.
- **Timed pickups (Strikers 1945).** Gold bars are worth 200 to 2,000 points depending on when in their
  flash you catch them. Credits pickups that reward timing.
- **Hidden secrets (Carrier Air Wing, TF4, Radiant Silvergun).** Bonus items in scenery you can shoot (a
  cow in a mound of dirt, a snowman in an ice pillar), hidden power-ups uncovered by shooting walls, 30
  dogs found with the lock-on weapon. For us: hidden TET caches and credits on side missions, and a
  log of secrets found per planet.
- **Destroy-everything and no-hit bonuses (Carrier Air Wing).** A bonus for destroying every enemy in a
  mission and one for taking no hits; see shot-down % above.
- **Collisions cost power, not a hit (Strikers 1945).** Touching a plane knocks the gun down a level
  instead of killing. Worth trying once guns have in-flight levels.

### Stages (M6)

- **Branching paths with different rewards (TF4, Axelay, Radiant Silvergun, Darius Twin).** TF4's caves
  fork into routes with different pickups; Axelay's cavern forks into an easy and a hard path; Radiant
  Silvergun picks stage 2 or 4 after stage 1; Darius Twin's map branches at every stage. For us: a side
  leg that forks, the harder path paying more.
- **Mission variety.** Escort a convoy, defend the carrier, a timed evacuation, a stealth run under
  radar, a race through an asteroid field.
- **Hazards (R-Type III, Darius Twin, Strikers 1945).** Crushing ceilings, rotating walls, lava that
  fills a maze, a dam that breaks when you destroy the tank on it (taking its guns with it). For side
  missions.
- **Checkpoints (R-Type III).** Each stage is split into areas and a lost ship restarts at the area, not
  the stage. For us: a failed long leg could restart at its halfway point for part pay.
- **Rewards for keeping your defenses (TF4).** Reach a mid-boss with the shield up and it goes berserk,
  then drops a shield and a Blade. For us: a bonus drop for reaching a boss at full shields.
- **Adjustable speed (TF4, Gley Lancer).** TF4 sets speed from 25% to 100% in flight. For us: a slow mode
  for precise dodging, held with a form button.
- **Enemy fire that swaps your weapon (Axelay).** A beam that doesn't hurt but changes your weapon. For
  us: a methylation beam that forces a form change instead of silencing one.
- **Risk contracts (Zanac).** Optional briefing modifiers (faster bullets, no specials, a time limit) for
  bonus pay.
- **Harder second loop (R-Type III).** Its Advanced Mission replays every stage with tougher, faster
  enemies that fire more and change color, and the true ending needs it. Our Echo campaign already loops;
  recolored enemies and new patterns would make it feel new.
- **Hand-written briefings for every planet.** Generated planets use Mira's mission line plus a science
  note. Planet-specific stories, side characters and Voss's lieutenants would make each world memorable.

### Later

- **Space carrier upgrades.** Spend credits on the carrier itself: a faster jump drive (shorter travel),
  a repair bay (start missions with bonus shields), a hangar for a second ship, deck guns that cover
  takeoffs and landings, a science lab that raises TET capsule drops, and a cosmetic paint shop. Also the
  endgame money sink (see Economy).
- **Space station mini game: a card game.** A casino deck on every starbase where the pilot can gamble
  credits and win or lose money. Station crews could bet with themed cards (histone suits, a "methyl"
  wild card), with higher-stakes tables in later galaxies and a house champion to beat in each one.
- **More music and sounds.** A new theme per galaxy, and distinct sounds for each gun and special.
- **Passive skill slots.** Every learned passive is always on today. Limited slots (more at higher
  levels) would make builds a real choice.
- **Special style: stock or charge (Arrow Flash).** A hull or passive that turns the special into a
  charge meter instead of a fixed number of uses.
- **Planet reputation.** Liberated planets give discounts, unlock rare stock and send wingmen.
- **More galaxies.** The structure supports more: add a galaxy to `GALAXIES` in `js/world.js`.
- **Short score-attack mode (Super Aleste).** A few legs in a row for a high score, for players who've
  finished the campaign; Strikers 1945 rates each stage for time, gold and points.
- **Touch polish.** Optional fixed D-pad instead of the floating stick, adjustable button size and
  position, and haptic feedback (`navigator.vibrate`) on hits.
- **Save slots and cloud saves.**
