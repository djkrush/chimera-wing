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
| M1 | **Loadout** (shipped, see the README) | Guns as parts, new guns sold at markets, guns that level up with use, a hangar that fits guns, save v3 | The core of both problems: markets run out of stock, and progress stops once stats cap |
| M2 | **Arsenal and economy** (shipped, see the README) | Ordnance, barrier and escort modules, Mk II / Mk III upgrades, a price table, supply raids, save v4 | Gives credits a use in every galaxy (see Economy) |
| M3 | **Vertical stages** (shipped, see the README) | Traffic between squadrons, gunship mini-bosses, squadron bonus, rear attacks, fire budgets, shot-down %, bullet types by color, off-screen warnings, screen shake | The vertical stages repeat the same five waves; this makes them a 1942-style run |
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

**Total before M2: about 130,000 of things to buy against 460,000+ of income.** Money stopped mattering
around the middle of the Magellanic Cloud: that galaxy pays 150k and adds 30k of hulls. The Phoenix at
30k is cheap by the time it's on sale, and Andromeda added nothing new.

**What M1 and M2 added** (prices in `js/weapons.js`, `js/arsenal.js` and `PRICE` in `js/starbase.js`):

| Galaxy | Pays | New permanent sinks | Running ordnance |
|---|---|---|---|
| Milky Way | 65k | Guns 1.2k to 3k (8 guns, about 18k), barrier I 2.5k, side fighters 4k | Missile pod I, bomb rack I, cluster pod, shield cell: 100 to 400 a use |
| Magellanic Cloud | 150k | Swivel, charge, rail guns (18k), Mk II tiers (18k), barrier II 9k, option trail 6k, orbit option 12k: about 63k | Pod II and rack II: 250 to 300 a use |
| Andromeda | 250k | Mk III tiers (36k), barrier III 22k: about 58k | Pod III and rack III: 500 to 600 a use |

That brings the permanent total to about 275,000 against 460,000+, with ordnance as the open-ended sink
(a mission that fires its full carry of six costs 600 to 3,600). Still short of the Andromeda target:
M4's late hulls are meant to close it. Supply raids (mission pay at 0.6 plus about 12 cargo tanks
worth 480 to 2,500 in all, by tier) are the safety valve; watch that they don't out-earn new missions.

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

### M2 (shipped)

Ordnance, modules, Mk II / Mk III, the `PRICE` table, supply raids and save v4 are in the README
(Ordnance, Modules, the upgrade table and SUPPLY RAID) and CLAUDE.md. Two choices to revisit after
real play:

- **What a failed mission costs.** Only the ordnance you carried is lost, not your whole stock, so
  the bet is capped at one carry (six uses). U.N. Squadron loses everything bought; try that if
  ordnance feels too safe.
- **One module slot.** A second slot (or pilot perks like DRAC's extra ordnance, M4) would make the
  escorts and barriers compete less.

### M3 (shipped)

Traffic, the gunship, sniper and heavy, the red squadron, rear attacks, fire budgets, bullet kinds by
color, edge warnings, shot-down %, screen shake, readable invulnerability and the near-miss sound are in
the README (vertical stages, the epigenetics) and CLAUDE.md (`traffic.js`, fire budgets, enemy bullets,
feedback, shot-down %).

Tuned with scripted runs at difficulty 1, 7, 13 and 18 (a bot that re-aims twice a second with some
error, fires in bursts and sidesteps bullets it sees coming):

| Change from the spec | Why |
|---|---|
| Four squadrons in every vertical leg (was 2 / 3 / 4 by difficulty) | Leg length is set by the squadrons, not by skill: with 2 or 3 an early leg ran 45 to 70 s whoever flew it. Now about 80 to 95 s at difficulty 1 and 7, 100 to 125 s at 13 and 18 |
| Intermissions 7 to 9 s (was 6 to 8) | A little more air between squadrons for traffic and the heavy |
| Traffic every 6 to 10 s in band A and 5 to 9 s in band B (was 8 to 14 and 6 to 11) | The clock stops while a squadron flies in, so the spec's gaps sent only one or two groups in an early leg |
| Band A's red squadron is the first or second group | Otherwise a short leg could end before it came |
| Snipers burst every 100 frames; from band C a burst is two seekers, not three | Parked snipers caused about one hit in eight late on |

Measured: the stage-1 fire rate is unchanged early on (10.5 shots a leg with budgets against 10.8
without; a passive player sees the same first 30 seconds, then the formation runs dry). Late on traffic
adds about 30% to the hits taken (12.7 against 9.7 a minute at difficulty 18 for the bot), and bullets
on screen average 0.5 early to 3 late, peaking at 18.

To revisit after real play:

- **Four squadrons from the first mission.** If early patrols drag, go back to three in band A and lean
  on traffic instead.
- **PERFECT is very hard** once traffic is busy, because every plane that flies off counts as missed. A
  softer rule would count traffic only once it has fired or been hit.
- **Gold planes and fire budgets.** Gold planes fire pairs, so their 1.5x ammo goes in fewer volleys.
  Try counting a pair as one round.

### M4: hulls

**Goal.** Hulls today differ by stat bonuses and a damage multiplier per form, and the last three reuse
the first airframes in new colors. M4 gives every hull a job and a move of its own (U.N. Squadron's
planes, 1942's loop), adds four late hulls so Andromeda has something to save for, turns the pilots'
perks into mechanics, and gives every hull its own art. No save change: hulls are still indices in
`camp.hulls`, moves and perks are per leg, and the won prototype is pushed into `camp.hulls`.

**Scope.** In: hull roles, signature moves and traits, the move input and HUD, four late hulls and
their prices, pilot perks, unique Fighter art for every hull and per-hull Guardian and Battloid parts,
HOW TO pages and docs. Left in the catalog: the M4 guns (Thunder Sword, hyper beam and the rest; they
can follow as their own release), in-flight power levels, gun XP tuning.

#### Moves and traits

Every hull gets either an **active move** (charges per leg) or a **trait** (always on). Both are data on
the hull: `HULLS[h].move = { id, name, uses, desc }` or `HULLS[h].trait = { id, name, desc }`, run in a new
mixin `js/moves.js` (after `pilots.js`): `startMove()`, `updateMove()`, `drawMove()`, `moveCollide()`.

- **Input: double-tap a direction** (the catalog's idea; it needs no new button, so it works on an NES
  pad). `Input.dbl(dir)` is true when a direction is pressed, released within 10 frames and pressed again
  within 12. It reads the merged actions, so it covers keys, D-pad, the analog stick and the touch
  joystick (a double flick). Directional moves (the roll, the bash) use that direction through
  `orient()`; the others go off on any direction.
- **Charges:** `uses` per leg (3 by default), refilled at takeoff; shown as small icons next to the
  special's ammo in the HUD. Each charge left when a leg clears pays 1,000 points on the clear banner
  (1942's loops), counted in `tallyLeg`.
- A move can't start during a transform (`morphT`), while silenced in that form, or in `gunsCold()`.

| # | Hull | Role | Move or trait | What it does |
|---|---|---|---|---|
| 0 | VX-3 CHIMERA | Balanced starter | Trait QUICK CHANGE | A transform is invulnerable while it morphs (14 frames), at most once a second |
| 1 | VX-5 MANTICORE | Striker, fastest Fighter | Move ROLL | Barrel roll 40 px toward the tapped side, invulnerable 30 frames (the bank frames spun through) |
| 2 | VX-6 GRIFFIN | Armor, Battloid | Move SHIELD BASH | Battloid only: a 24-frame dash forward behind the arm shield; blocks bullets, rams planes for 8x gun power |
| 3 | VX-9 HYDRA | All-rounder | Trait THIRD HEAD | An escort drone in every form that fires with you (stacks with DRONE ESCORT) |
| 4 | VX-7 WYVERN | Guardian | Move LOCK VOLLEY | Locks up to 6 targets on screen (`findTarget`/`targetable`) and fires a homing missile at each |
| 5 | VX-8 BASILISK | Glass cannon | Move LANCE | A piercing beam the length of the screen, 6x gun power, hits every target in line |
| 6 | VX-12 PHOENIX | Top of the line | Trait REBIRTH | Once per mission, a fatal hit leaves 3 shields and bursts in fire, clearing bullets nearby |
| 7 | VX-10 BEHEMOTH | Ground attack (A-10) | Move CARPET | Drops 6 bombs along its path; also carries every bomb rack, and ground targets and boss parts take +50% |
| 8 | VX-11 SPHINX | Stealth | Move CLOAK | 3 s unseen: planes aim at a decoy where you cloaked. Trait on top: `seek` bullets don't steer at it and methyl beams take twice as long to lock |
| 9 | VX-14 CERBERUS | Drone carrier | Move PACK | Two escort drones in every form (trait); the move sends them to ram the two nearest targets, then they return |
| 10 | VX-13 NUE | Prototype, won | Move OVERDRIVE | For 4 s, all three fitted guns fire at once (each at its form's power) |

Side missions use the same moves: the roll and bash run along `orient()`, CARPET bombs fall to
`SIDE_GROUND`, the LANCE fires right.

#### Four late hulls

New `HULLS` entries at the end (indices 7 to 10, so saves keep working), each with `HULL_ART`, a `guns`
default fit and `mounts`:

| Hull | WPN SHD SPC | Speed | Form multipliers | Mounts | Default guns | Price | Where |
|---|---|---|---|---|---|---|---|
| VX-10 BEHEMOTH | +1 +3 0 | 0.85 | 1.1 / 1.0 / 1.2 | heavy all | vulcan, bomb, laser | 25,000 | N44 Bubble (Magellanic) |
| VX-11 SPHINX | +1 0 +2 | 1.2 | 1.2 / 1.1 / 1.0 | light, heavy, light | wave, homing, vulcan | 50,000 | NGC 206 (Andromeda) |
| VX-14 CERBERUS | 0 +2 +2 | 1.0 | 1.0 / 1.2 / 1.0 | light, heavy, heavy | twin, ripple, homing | 65,000 | M32 (Andromeda) |
| VX-13 NUE | +3 +2 +2 | 1.2 | 1.4 all | heavy all | laser, ripple, homing | won | Mayall II stronghold |

- **Where they're sold:** `EXTRA_HULLS` in `world.js` (generated planets): `n44: 7`, `ngc206: 8`, `m32: 9`.
  That replaces the Basilisk at NGC 206 and the Wyvern at M32; both are still sold in the Magellanic
  Cloud, and a hull you own always shows in every shipyard.
- **The prototype:** clearing the Mayall II stronghold for the first time adds NUE to `camp.hulls`, with
  a Mira line in the debrief and a Voss taunt (it's her prototype). It can't be bought or sold.
- **Bomb racks:** `ORDNANCE` bomb entries add the BEHEMOTH to `hulls` (`[0, 2, 4, 6, 7]`).

**Economy check** (against the table above): the Magellanic Cloud goes from about 93k of permanent
sinks to 118k (79% of its 150k); Andromeda from about 88k to 203k (81% of 250k). Both sit at the top of
the 70 to 80% target, before ordnance, so tune the two Andromeda prices down first if it feels grindy.

#### Pilot perks

Stats stay as they are; the perk line on the pilot card and in the starbase changes to the mechanic:

| Pilot | Perk | How |
|---|---|---|
| MAVERICK | GUNS LEVEL UP 50% FASTER | `addGunXP` multiplies by 1.5 |
| TURTLE | SHIELDS RECHARGE AFTER 10 QUIET SECONDS | 600 frames without a hit restores 1 shield (up to max), then the timer restarts; stacks with AUTO REPAIR |
| DRAC | ONE MORE RACK AND ONE MORE MOVE | Ordnance `carry` + one rack's `uses`; +1 move charge per leg |

#### Art

- **Fighters:** new top-down and side Fighter sprites for the WYVERN, BASILISK and PHOENIX and the four
  new hulls (7 airframes, Truxton detail, Robotech VF lines): the BEHEMOTH heavy and twin-tailed with
  wing pylons, the SPHINX a flat faceted wedge, the CERBERUS wide with three drone bays, the NUE a
  forward-swept prototype.
- **Guardian and Battloid by parts** (like the VF-1 A, J, S and R heads): one shared body, with each
  hull adding a head, shoulder armor and backpack, composited into the ASCII rows before baking
  (`hullParts(h, form)` in `sprites.js`). That gives every hull its own GERWALK and robot without 40 new
  full sprites; the bank frames and side profiles are built from the same parts.
- Move effects: roll streaks, the bash shield flash, lock-on brackets, the lance beam, the cloak drawn
  with `SNES.half`, Rebirth flames. All in 15-bit color with banded glows.

#### HOW TO PLAY and docs

New pages: *WHAT IS MY HULL'S MOVE?* (double-tap, charges, the bonus for charges left, animated roll),
and the hull list gains each hull's role and move. README (hulls table, pilots, moves), CLAUDE.md
(`moves.js` in the load order and table, `HULLS[h].move`/`trait`, `Input.dbl`, a recipe for a new move).

#### Build order

Each step is playable and committed on its own, checked in Chrome with frames stepped by hand, the
console watched, and `chimera.*` keys put back.

1. **Move framework** (`input.js`, new `js/moves.js`, `index.html`, `game.js` HUD and `tallyLeg`):
   `Input.dbl`, charges, HUD icons, the clear bonus, and the MANTICORE roll as the first move. *Check:*
   double-taps fire the roll on keys, pad and touch; tapping a direction quickly to dodge doesn't
   (single taps under 10 frames apart without a release don't count); the roll works in side missions.
2. **The other six existing hulls' moves and traits.** *Check:* each one in a vertical and a side leg,
   on a boss leg (bash and lance on boss parts, the volley on capital-ship targets).
3. **Pilot perks.** *Check:* XP rate with MAVERICK, TURTLE's recharge timing, DRAC's carry and charges.
4. **The four late hulls:** stats, moves (CARPET, CLOAK, PACK, OVERDRIVE), shipyards, the prototype
   reward, bomb racks. Placeholder art (recolors) until step 5. *Check:* `?stage=` legs with each hull
   via `&hull=N`; buying in a test campaign; the Mayall II reward once and only once.
5. **Art:** seven Fighters and the Guardian and Battloid parts kit. *Check:* every hull in all three
   forms, banking, side profile, silenced and white flash, in the hangar and the shipyard.
6. **Tuning, HOW TO pages and docs.** Scripted runs with each move at stages about 1, 7, 13 and 18: a move
   should save about one hit a leg, not trivialize a boss; recheck the economy totals.

**Decisions to confirm before step 1:**

- The double-tap trigger, or a held button (hold SELECT for 20 frames; slower, but no accidental moves).
- Whether existing hulls keep their stats (recommended) or get rebalanced around their roles.
- Whether the M4 guns ship now or as their own release after M4 (recommended: after).

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

### Guns (M4)

Guns as parts, gun levels, the charge shot, the rear rail gun and the swivel vulcan shipped in M1
(README: Guns). Still to build, each as a `GUNS` entry with a `fireWeapon` case, `steerBullet` flight,
`drawPlayerBullet` art and four level effects:

- **More guns:**
  - *Charge shot, Thunder Sword variant* (TF4): charges while you aren't firing, instead of while held.
  - *Hyper beam* (R-Type III): charge fully, then fire a burst of heavy shots for a few seconds until the
    gun overheats and can't charge until it cools.
  - *Wall-hugging grenades* (TF4 Snake): fired up and down, they burn along the ground they hit; good
    against turrets on side missions.
  - *Free Way* (TF4): bullets toward where you steer, missiles the opposite way.
  - *Orbiting shots* (Axelay Morning Star): a ring that circles the ship and also blocks bullets.
  - *Spread field* (Radiant Silvergun): angled shots that burst and hang in the air, blocking missiles.
  - *Lightning lock* (Radiant Silvergun homing plasma): locks two targets and hits harder the longer
    it holds, even through walls.
  - *Rear-guard vulcan* (Gradius Tailgun and 2-Way Back): covers the ship's back.
  - *Diagonal bombs* (Darius Twin secondary): arcing bombs that become four-way diagonal lasers as they level.
- **Gun XP tuning.** The level thresholds (2,000 to 35,000) are a first guess: time them in a real run.
  Radiant Silvergun splits XP between combined weapons; boss and capital-ship targets could train the
  gun too (today only planes do).
- **The rear rail gun in vertical stages.** It fires down off the bottom of the screen; rear attacks (M3)
  now give it targets there, but a shorter-range spread would still help it against divers.
- **In-flight power level (Carrier Air Wing, U.N. Squadron, Darius Twin).** Carrier Air Wing's gun levels
  come at 2, 8, 15, 23 and 31 pickups; U.N. Squadron's planes cap between 3 and 7; Darius Twin drops a
  power-up only from the last of six cubes. Optional on top of gun XP: pickups that raise the gun for the
  current leg only, capped per hull.

### Markets and ordnance (M2, shipped; what's left)

Shipped in M2: ordnance (U.N. Squadron, Carrier Air Wing), barrier modules in three grades (Darius
Twin), side fighters (1942), the option trail and orbit option (Gradius), Mk II / Mk III and supply
raids (U.N. Squadron's money missions). The notes below keep the ideas M2 didn't use.

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

### Vertical stages (M3 shipped; what's left)

Shipped in M3: traffic between squadrons and three weight classes (kavros 1942: the gunship and the
heavy), the gunship mini-boss that can escape, the red squadron bonus, attacks from behind, fire budgets
with formation fire, shot-down %, bullet kinds by color (Typhoon Force), the park-and-snipe plane, edge
warnings, screen shake by distance and the near-miss sound (SUPERCRUISE), readable invulnerability
(Typhoon Force). See the README. Still open:

- **Fair homing (kavros 1942).** Its grey planes pick a down-left, down-right or straight path from where
  the player is, with a 10 px dead zone, and stop steering and shooting within 100 px. Ours spread two or
  three shots down each dive and skip a shot within 24 px above the ship; a wider dead zone could follow. (M5)
- **Boss in a band (theonlyrao 1942).** The heavy uses its rule (a new heading every 75 frames inside a
  band at the top). Use it for any new free-flying vertical boss, and its levels' shorter gaps between
  planes for later loops. (M5)
- **Scripted volleys (Typhoon Force).** Each enemy type lists the ticks it fires on: `fire_at` 200, 210,
  220 and again 650, 660, 670, so a volley is a burst of three shots 10 frames apart at a fixed point in
  its flight. It moves by a function of its own tick with an `offset` per member, so a group staggers
  without separate paths. For us: a `fire` list on wave entries (frames into the path) beside today's
  random `enterFireAt`, for hand-made bursts in set pieces. (M5)
- **Interceptors from every edge (SUPERCRUISE).** Enemies spawn from all four sides at random speeds and
  turn toward the player at a fixed 0.1 degrees per step, so faster ones overshoot. Each kill scores the
  enemy's speed squared, so the fastest planes pay most. For us: a fast interceptor type (kamikaze
  family, `spawnKamikaze`) whose points scale with speed, as a new traffic group. (M6)
- **Threat markers that track (SUPERCRUISE).** It projects every approaching enemy's line onto the
  screen border: yellow when far, red within 500 px, brighter as it closes. Ours are fixed arrows for
  rear attacks, the heavy and side ambushes; interceptors and kamikazes would want the tracking kind. (M6)
- **Gun heat (SUPERCRUISE).** Each shot adds heat (3.3 of 100), heat bleeds off 1.5% per frame, a
  caution sound plays above 80, and at 100 the gun locks until it drops to 5. For us: a heat meter
  instead of the bullets-on-screen `cap` for some guns (vulcan, hyper beam), and it gives the GUN
  COOLERS upgrade a literal job. (M4)
- **Readable timers for specials (Typhoon Force, Astral Shooter).** Astral Shooter's 15-second shield
  starts blinking 5 seconds before it runs out. Invulnerability does this now; Gene Shield, Reflect
  Field, Force Pod and Hyper Mode still don't. (Later)
- **Mission cards (SUPERCRUISE).** A typed-out title card on takeoff ("International Waters, Bering Sea,
  May 3rd, 1984, 1800 hours, DEFCON 3") and a KIA card with kills and time survived. For us: a short
  typed card at takeoff (planet, system, time, mission kind) and kills and time on the failed-mission
  screen. (M6)

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
