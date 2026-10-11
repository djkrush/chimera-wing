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
| M4 | **Hulls and the gun ladder** (shipped, see the README) | Two guns per form (a start gun and a market upgrade), one form per gun, 16 new guns, gun levels bought at markets, specials tied to hulls, two new hulls, pilot perks with a mechanic, unique hull art | Every hull becomes its own ship, and credits get a steady use in every galaxy |
| M5 | **Bosses and rewards** (each feature needs an interview first, see the M5 spec) | Side bosses become ground fortresses, part-reactive and multi-section bosses, escape timers, readable turret patterns, boss %, chains, grazing, weapon challenges, secrets | Rewards for playing well, not just for playing longer |
| M6 | **Stages** (each feature needs an interview first, see the M6 spec) | Branching legs, new mission kinds, risk contracts, hazards, checkpoints, speed control, weapon-swap beam, planet briefings | Variety between missions late in the campaign |
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

### Stats patch (shipped)

Pilots started with too many shields and almost every plane died to one hit. Pilot stats are now
MAVERICK 2 / 2 / 1, TURTLE 1 / 3 / 1 and DRAC 1 / 2 / 2 (WPN / SHD / SPC); damage is
`(1 + weapons) / 4` of a gun's, so WEAPONS 1 is half of the old normal; hull bonuses were roughly halved;
caps are 8 / 8 / 5; a stat point comes every third level; and market stat upgrades became **hull**
upgrades (`HULL WEAPONS +1` and so on, two of each per hull, 1,500 then 3,000 credits, counted in
`camp.up['key@hull']`). Old saves move their pilot stat upgrades onto the hull in use and are refunded
the rest. Plane hp stays as it was (`ENEMY_HP` = 1 in `enemyHp`), because the halved damage already
doubles the hits a MiG takes.

Scripted runs (the human-ish bot, median of three, a test campaign with no training):

| Difficulty | Before (TURTLE / MAVERICK) | After (TURTLE / MAVERICK) |
|---|---|---|
| 1 | 89 s, 4 hits / 86 s, 3 hits | 119 s, 11 hits / 113 s, 6 hits |
| 7 | 114 s, 13 hits / 83 s, 4 hits | 133 s, 16 hits / 116 s, 11 hits |
| 13, trained late-game pilot | 126 s, 21 hits (WPN 16) | 146 s, 25 hits (WPN 8, 6 shields) |
| 18, trained late-game pilot | 132 s, 34 hits | 162 s, 44 hits |

The Mars capital ship went from one pass (23 s) to two passes (about 46 s); boss hp is unchanged. Plane
hp scaled 1.25x or 1.5x pushed early legs past 140 s with three times the hits, so it was left at 1.
Side legs weren't measured (the bot only steers across); check them by hand.

To revisit: whether SHD 8 is still too many late on, and whether the Mars capital ship should keep
two passes for a WEAPONS 1 pilot.

### M4: hulls and the gun ladder (shipped)

The gun ladder (two guns per form, one form per gun, 27 guns), bought gun levels, market rows that say
who a gun is for, specials tied to hulls, the BEHEMOTH and the SPHINX, pilot perks, every hull's own art
and saves v5 and v6 are in the README (hulls, Guns, Pilots, Special weapons) and CLAUDE.md (`fit`, `rung`,
`gunLv`, `sp`, `specs`, `perkId`, `hullParts`, `migrateV4`, `migrateV5`).

Confirmed with the user before building: special bays by family (later replaced, see below), the missile
pods only on the PHOENIX and SPHINX, and a hull coming with its three start guns. Rules the user added:

- **No upgrades in flight.** Gun XP is gone; levels are only bought at markets. The hangar only offers
  the hull's own two guns per form.
- **Radio pauses the stage.** A message in `play` or `clear` freezes everything until a fresh A, B or
  tap (after 20 frames, so held fire can't skip it). The window is drawn solid.
- **Level-ups:** odd levels teach a passive and even levels give nothing; the bonus every third level
  alternates a stat point (3, 9, 15...) and an extra passive (6, 12, 18...).
- **Specials are tied to hulls, like guns** (replacing the special bays built in step 6). Each hull has a
  start special and one bought on every starbase's SPECIALS page (priced and gated by galaxy like that
  hull's upgrade guns); levels never teach
  them. Old saves drop the specials they had learned and keep their hulls' start specials. Pairs:
  CHIMERA cluster > gene shield, MANTICORE thunder laser > mega crush, GRIFFIN gene shield > reflect,
  HYDRA TET burst > wingman, WYVERN chrono > force pod, BASILISK mega crush > gravity bomb, BEHEMOTH
  cluster > EMP, PHOENIX hyper mode > missile barrage, SPHINX wingman > missile barrage.

Changes from the spec:

| Change | Why |
|---|---|
| Gun XP removed in step 1, not step 2 | Save v5 had to turn XP into levels at once, and the user asked for no upgrades in flight |
| Steps 3 to 5 built and committed together | The 16 guns share new helpers (`allTargets`, `damageAny`, `blastAt`, zone and `noHit` bullets) |
| The Guardian takes shoulders and pack only, no head | In GERWALK the head is hidden under the fuselage, top-down and side |
| Starbase lists show 6 rows and a 3-line info box | The spec's gun info line ("FIGHTER GUN. UPGRADE ON ..., START ON ...") needs about 75 characters |
| Grenades are thrown forward-left and forward-right in vertical legs | "Above and below" only reads in side legs |
| Existing guns retuned (vulcan 0.45 → 0.7 a round, ripple 1.1 → 2 every 14 frames, wave 0.8 → 1, bomb 2 → 2.4, homing 2 → 2.8, charge balls 3 / 6 / 11) | So each upgrade out-damages its start gun |

Tuning, measured against stationary dummies (damage a frame at LV1 per point of `gunPower`, one target
100 px ahead / a group of five): every upgrade beats its start gun on one target or the group, except
the close-range AFTERBURNER and CANISTER, which win only up close (0.34 and 0.28 at 45 px). Then a bot
(steers under the nearest plane, holds fire, transforms every 8 s, hits counted but not taken) flew
each galaxy's hull with its start guns and with its upgrades at LV1:

| Leg (difficulty) | Hull | Start guns | Upgrades |
|---|---|---|---|
| Earth (1) | MANTICORE | 81 s, 5 hits | 82 s, 4 hits |
| Canis (7) | HYDRA | 105 s, 14 hits | 104 s, 17 hits |
| Capsid (13) | BEHEMOTH | 102 to 109 s, about 32 hits | 113 to 124 s, about 35 hits |
| Accretion (18) | SPHINX | 128 s, 47 hits | 80 s, 25 hits |

Start guns hold up in every galaxy (the stats patch measured 113 to 162 s). The economy check below is
unchanged: `GUN_PRICE` uses the spec's prices.

To revisit after real play:

- **Short-range guns and the bot.** The BEHEMOTH's upgrades and the SPHINX's start set look slow only
  because the bot stays at the bottom; check the AFTERBURNER and CANISTER by hand.
- **The rear rail gun** still has little to shoot in vertical legs (catalog note below).
- **Homing at rung 7.** It is the PHOENIX's upgrade but measures below the CANISTER up close; its worth is
  aiming itself. Watch whether it feels like the prize the ladder says it is.
- **FLAK FIELD** blocks seekers and splitting shells only; widen it to every bullet if it feels weak.
- **Radio pauses** add up on legs with many hints; trim `HINTS` or queue them if they get in the way.

#### Economy check

A typical run flies one hull per galaxy, buys its three upgrades and levels its six guns as far as the
gates allow (LV3, LV4, LV5), on top of the hulls and the M2 sinks:

| Galaxy | Pays | Hull flown | Upgrades | Levels | Hulls bought | M2 sinks | Total | Share |
|---|---|---|---|---|---|---|---|---|
| Milky Way | 65k | HYDRA | 7.8k | 6.6k | 18k | about 30k | about 62k | 95% |
| Magellanic | 150k | BASILISK | 15k | 27k | 30k (Wyvern, Basilisk) | about 63k | about 135k | 90% |
| Andromeda | 250k | PHOENIX | 27k | 79k | 30k (Phoenix) | about 58k | about 194k | 78% |

The SPHINX (60k) and a second hull's guns are the stretch goals on top. Leveling every gun in the game
costs about 225k, so no one does it all. If the climb feels slow, lower `GUN_PRICE` for rungs 4 to 8
first, then the level multipliers.
### M5: bosses and rewards (interview first)

Like M6, M5 is a list of candidate features. **Every feature needs an interview with the user before it
gets a spec**: keep, change or drop it, then settle the open questions below. Only interviewed features
are written up (rules, numbers, files, a build step) and go into M5; a dropped feature moves to the
catalog's Later list with a note saying why. Interview one feature at a time and record the answers here.
The catalog sections Bosses (M5) and Rewards (M5) hold the background for each.

| Feature | Status | Questions for the interview |
|---|---|---|
| Ground fortresses instead of beached warships | draft written (catalog), needs interview | Are CITADEL, FOUNDRY and NEST the right three styles, and which boss gets which? How should destruction look? Should fortresses also get M5's multi-section or part-reactive rules? |
| Parts that change the fight | needs interview | Which reactions (a weak point opens, the boss goes frantic, guns stop while parts fly loose)? Side fortresses, capital ships or both? |
| Twin bosses | needs interview | A pair of capital ships, a pair of fortresses, or both? What happens if the wrong one dies first? |
| Multi-section bosses | needs interview | How many sections? Does a fortress break open into a second form? Which bosses? |
| Ordered locks | needs interview | Which epigenetic order to teach (for example a demethylase before a histone core)? How is the order shown on screen? |
| Readable turret patterns | needs interview | Fixed volleys tied to a capital ship's rotation, side fortress turrets, or both? |
| Boss destruction % and escape timers | needs interview | Does a boss leave after a time limit? Pay per target killed before it escapes, or a percent bonus? Does a capital ship's last pass count as its escape? |
| Color chains | needs interview | Chain gray (methylated) or gold (acetylated) planes, or both? What does a chain pay, and how is it shown? |
| Earn the special in flight | needs interview | What earns a use (shooting bullets, a kill streak)? Does it fit the low SPC stats from the stats patch? |
| Weapon challenges | needs interview | Which challenges (hits without a miss, kills with one gun)? Per gun, tied to M4's gun levels? What do they pay? |
| Grazing | needs interview | Points only, or a meter that pays out? Does it reward risk too much now that shields are low? |
| Timed pickups | needs interview | Which pickups lose value over time? Points or credits? |
| Hidden secrets | needs interview | Where do they hide (scenery, fortress parts, off the path)? What do they give? |
| Destroy-everything and no-hit bonuses | needs interview | Per leg or per mission? How do they relate to the shot-down % that already shipped? |
| Collisions cost power, not a hit | needs interview | With M4's bought gun levels, should a collision drop a gun level for the leg, or keep costing a shield? |
| Fair homing for divers | needs interview | Widen the dead zone above the ship? Do divers stop firing when close? |
| Boss in a band | needs interview | Use the heavy's movement rule for new free-flying vertical bosses? Which bosses would those be? |
| Scripted volleys | needs interview | Hand-made bursts in set pieces: which set pieces? |

### M6: stages (interview first)

M6 is a list of candidate features, not a plan. The user likes some and not others, so **every feature
needs an interview with the user before it gets a spec**: keep, change or drop it, then settle the open
questions below. Only interviewed features are written up (rules, numbers, files, a build step), and only
they go into M6. A dropped feature moves to the catalog's Later list with a note saying why. Interview
one feature at a time and record the answers here.

| Feature | Status | Questions for the interview |
|---|---|---|
| Branching paths | needs interview | Side legs only, or vertical too? How is the fork chosen (fly up or down at a marked split, or picked at the briefing)? What does the hard path pay or give? |
| New mission kinds: escort, carrier defense, timed evacuation, stealth run, asteroid race | needs interview | Which of the five? Vertical or side for each? What fails the mission? Do they replace patrol slots on generated planets or add to them? |
| Hazards: crushing ceilings, rotating walls, lava, a breaking dam | needs interview | Which hazards, and on which terrains? Do they cost a shield or destroy the ship? Before or after M5's fortresses? |
| Checkpoints | needs interview | Restart at a leg's halfway point, or at each squadron? How much pay does a restart cost? Any limit per mission? |
| Full-shields reward | needs interview | What drops (a shield cell, credits, ordnance)? Bosses only, or the mini-boss heavy too? Does it overlap M5's rewards? |
| Adjustable speed | needs interview | A held slow mode or set speeds? Which button on an NES pad and on touch, since SELECT transforms? |
| Weapon-swap beam | needs interview | Should a beam force a form change instead of silencing one? On every methylator or a new enemy? How does it work with M4's two guns per form? |
| Risk contracts | needs interview | Which modifiers (faster bullets, no specials, a time limit, others)? How much bonus each? Offered on every mission or only some? |
| Harder second loop | needs interview | Recolored enemies, new patterns, faster fire, or all three? Does the Echo campaign need anything else? |
| Hand-written planet briefings | needs interview | Every generated planet, or one per system? New side characters and Voss's lieutenants: who are they? |
| Interceptors from every edge | needs interview | A new enemy or a traffic group? Points by speed? In side missions too? |
| Tracking threat markers | needs interview | Replace the fixed warning arrows everywhere, or only for fast enemies? |
| Mission cards | needs interview | What goes on the takeoff card? A stats card on failure too? Skippable? |

## Idea catalog

### Hulls (M4, shipped; what's left)

M4 shipped clear roles (U.N. Squadron's planes each do one thing; Carrier Air Wing offers its
biggest homing missile only to the F-14), pilot perks with a mechanic (U.N. Squadron's Shin, Mickey and
Greg) and unique hull art. Left for later:

- **Signature moves** (1942's loop, a shield bash, a lock-on volley): tried in the first M4 draft and
  dropped; hulls are set apart by their guns and specials instead.
- **More late hulls:** a stealth hull (enemy homing loses it, methyl beams lock on slower; U.N.
  Squadron's YF-23), a drone carrier (escorts in every form), and a prototype won from a boss instead of
  bought. Each would need a ladder rung or a branch off it.

### Guns (M4, shipped; what's left)

The M4 ladder took the catalog's guns: Thunder Sword (TF4), hyper beam (R-Type III), grenades (TF4
Snake), Free Way (TF4), orbiting shots (Axelay Morning Star) as ORBIT RING, the spread field (Radiant
Silvergun) as FLAK FIELD, Lightning lock (Radiant Silvergun), the rear-guard vulcan (Gradius) as TAIL
VULCAN and the diagonal bombs (Darius Twin) as DIAGONAL. Gun XP went away with it. Left for later:

- **The rear rail gun in vertical stages.** It fires down off the bottom of the screen; rear attacks (M3)
  now give it targets there, but a shorter-range spread would still help it against divers.
- **In-flight power level (Carrier Air Wing, U.N. Squadron, Darius Twin).** Carrier Air Wing's gun levels
  come at 2, 8, 15, 23 and 31 pickups; U.N. Squadron's planes cap between 3 and 7; Darius Twin drops a
  power-up only from the last of six cubes. Optional on top of bought levels: pickups that raise the gun for the
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
  COOLERS upgrade a literal job. (Later: M4 shipped without it)
- **Readable timers for specials (Typhoon Force, Astral Shooter).** Astral Shooter's 15-second shield
  starts blinking 5 seconds before it runs out. Invulnerability does this now; Gene Shield, Reflect
  Field, Force Pod and Hyper Mode still don't. (Later)
- **Mission cards (SUPERCRUISE).** A typed-out title card on takeoff ("International Waters, Bering Sea,
  May 3rd, 1984, 1800 hours, DEFCON 3") and a KIA card with kills and time survived. For us: a short
  typed card at takeoff (planet, system, time, mission kind) and kills and time on the failed-mission
  screen. (M6)

### Bosses (M5)

Candidates only: each needs an interview before it is planned (see the M5 spec).

- **Ground fortresses instead of beached warships (Truxton, Thunder Force IV).** The side-mission bosses
  (`bosses.js`) are painted as battleships, destroyers and carriers sitting on landing legs, which reads
  as a ship run aground. Their names already say base (HISTONE BUNKER, IMPRINT KEEP, HP1 BASTION, DNMT3
  FOUNDRY, HIVE NEST), so repaint them as fortresses and keep the targets, shield rules and fights:
  - Three `BASE_STYLES` replace the hull styles and return the same target slots: **CITADEL** (was the
    battleship: a keep on an earth berm, stepped concrete walls, corner towers for the turrets, roof silo
    doors for the launchers, a radar mast, the core behind armored glass; HISTONE BUNKER, X-INACTIVATOR,
    IMPRINT KEEP, HDAC FORTRESS, CTCF BARRIER, HP1 BASTION), **FOUNDRY** (was the destroyer: a long low
    works of half-buried bunkers with gun slits, smokestacks and cooling towers, conveyor gantries, the
    core in a reactor hall; DNMT1 COPIER, DNMT3 FOUNDRY, whose rebuilding turrets suit a factory) and
    **NEST** (was the carrier: domed hangar mounds dug into a hillside, blast doors for the drone hangars,
    launch rails, a buried reactor dome; HIVE NEST, THE REMODELER).
  - Built into the ground: foundations below `SIDE_GROUND`, earth berms sloping up at both ends in the
    planet's own terrain colors, no bow, keel, legs or shadow gap under it. Reinforced concrete and armor
    plate with the boss palette as trim and lights, hazard stripes, scorch marks. It still scrolls in
    with the ground.
  - Destruction: towers topple and sections slump into smoke and dust on top of today's explosions.
  - Art direction: capital ships (vertical) stay Yamato and Star Destroyer warships; side bosses become
    ground fortresses. Update CLAUDE.md, the README and the `bosses.js` header with it.
  - Proposed as M5's first step: multi-section and part-reactive bosses fit a fortress well (walls that
    crumble as their guns fall). Confirm in the M5 interview.
  - The side bosses should also be very long and require multiple passes like the vertical bosses. This
    is consistent with ground bosses in UN Squadron.
  - It is ok for vertical and side bosses to take several passes to complete. Three passes should be an
    easy boss.

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

Candidates only: each needs an interview before it is planned (see the M5 spec).

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

Candidates only: each needs an interview before it is planned (see the M6 spec).

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
