# CHIMERA WING: The Epigenome War

A Galaga / U.N. Squadron-style shooter with NES-style graphics. You fly the **VX-3 Chimera**, a
transforming fighter, off the deck of a space carrier against the fleets of **Dr. Helena Voss**,
a rogue epigeneticist who has taken over the galaxy's pilots by switching their genes on and off.

## The story

Voss never changed a letter of anyone's DNA. She changed which genes are *used*. Your ally,
**Dr. Mira Kato**, was her lab partner and built the Chimera to stop her. Before every mission Mira
briefs you on a real piece of epigenetics (Waddington's landscape, the Dutch Hunger Winter,
agouti mice, queen bees, X-inactivation, imprinting, Yamanaka's reprogramming and more), tells you
why that planet matters and what its boss is, and Voss answers. Along the way you learn why she's
doing it, in the same order whichever route you fly.

Beating Voss's flagship at **The Citadel** plays the epilogue. After that the **Echo campaign**
begins: every sector opens again, harder, against the **Voss Echo**, with new science facts, and
you keep your money, level, specials and ship.

## The campaign

Your **space carrier** travels a galaxy map of six star systems (sectors). Each sector has a
**starbase** where the carrier docks:

```
            ALPHA CENTAURI ── SIRIUS ──┐
SOL ──<                         │       >── EPSILON ERIDANI (Voss's Citadel)
            BARNARD'S STAR ── TAU CETI ┘
```

- At a starbase you pick a planet **mission**, visit the **shop**, check your **status**, or open
  the **galaxy map** to fly the carrier to another unlocked sector.
- Every planet mission has two legs. You **take off from the carrier**, fly a vertical
  **approach** (Galaga-style), **land back on the carrier**, then take off again for a
  side-scrolling **assault** (U.N. Squadron-style) that ends with the sector's **boss**, and land.
- Clearing every planet in a sector pays a bonus and **opens the sectors linked to it**.
  Epsilon Eridani opens once Sirius *or* Tau Ceti falls, so you choose your route.
- If your ship goes down, the **mission fails** and the carrier brings you back to the starbase.
  You keep your money, XP and upgrades, and can try again.
- The game **saves** every time the carrier docks. Pick **CONTINUE** on the title screen.

| Sector | Signature enemy | Boss |
|---|---|---|
| SOL | – | Histone Gunship |
| ALPHA CENTAURI | Splitters: break into two MiGs when shot (DNMT1 copying) | DNMT1 Copier: rebuilds one lost turret |
| BARNARD'S STAR | Drone swarms | Hive Queen: shields herself while she launches drones |
| SIRIUS | More gold (acetylated) planes | X-Inactivator: two cores, one shut off at random |
| TAU CETI | Armored planes | Imprint Twins: only one turret is open at a time |
| EPSILON ERIDANI | All of them | Nucleosome Fortress, Gunship Mk II, and Voss's Flagship |

Some approaches are **challenging stages** (the planes don't shoot): hit all 40 for a bonus.

### Money, experience and upgrades

- Every mission pays **credits** (mission pay plus combat pay from your score) and **XP**.
  Replaying a cleared planet pays half. Clearing a sector adds a bonus.
- **Levels 2, 5 and 8** each let you **learn a special attack** for good. You start with none.
- The **shop** sells **WEAPONS**, **SHIELDS** and **SPECIAL** upgrades (+1 each, prices rise, max 12)
  and new **ship hulls**. Each hull has its own look (top-down and side profile) and changes your stats:

| Hull | Sold at | Weapons | Shields | Special | Speed |
|---|---|---|---|---|---|
| VX-3 CHIMERA | (starting ship) | +0 | +0 | +0 | 100% |
| VX-5 MANTICORE | Alpha Centauri | +2 | −1 | +0 | 105% |
| VX-6 GRIFFIN | Barnard's Star | +0 | +3 | −1 | 90% |
| VX-9 HYDRA | Sirius, Tau Ceti | +1 | +1 | +1 | 110% |

## Running it

No install or build step. Open `index.html` in Chrome, Edge or Firefox.

- `index.html?stage=N` jumps straight into a mission leg for testing: planet `ceil(N/2)` in map order,
  odd N = approach, even N = assault (e.g. 2 = Earth assault, 23 = the fortress at Aegir). Test runs don't save.
- `F` toggles fullscreen and `M` mutes the sound.

## Controls

| Action      | USB controller          | Keyboard        |
|-------------|-------------------------|-----------------|
| Move        | D-pad / left stick      | Arrows / WASD   |
| Fire (hold) | A                       | Z / Space / J   |
| Special weapon | B                    | C / L           |
| Transform   | X / Y / RB / RT         | X / K           |
| Previous form | LB / LT               | Q / Shift       |
| Pick a form | –                       | 1 / 2 / 3       |
| Pause       | Start                   | Enter / P / Esc |

Controllers use the browser Gamepad API. Xbox and PlayStation pads work as-is. Generic USB pads
(SNES/NES-style) also work, and that includes pads whose D-pad shows up as a "hat switch". If your
buttons land in odd places, use **CONTROLLER SETUP** on the title screen to remap FIRE, SPECIAL,
TRANSFORM, PREV FORM and START. The mapping is saved per controller. Browsers hide a controller
until you press one of its buttons, so press one after plugging it in.

## Pilots

A new game starts by picking who flies the Chimera. Each pilot has three stats (hulls and shop
upgrades add to them):

- **Weapons** sets how hard your shots hit (4 = normal damage, 8 = double).
- **Shields** is how many hits the ship can take. When they run out the HUD flashes
  **DANGER**, and one more hit destroys the ship and fails the mission. Shields are repaired at
  every takeoff, and score bonuses (20,000, then every 70,000) repair one.
- **Special** is how many times you can use your special weapon on each leg.

| Pilot    |               | Weapons | Shields | Special |
|----------|---------------|---------|---------|---------|
| MAVERICK | Hotshot ace   | 8       | 4       | 3       |
| TURTLE   | Iron wall     | 4       | 8       | 3       |
| DRAC     | Alien tactician | 4     | 4       | 6       |

## The three forms

| Form      | Weapon                  | Movement                     | Special |
|-----------|-------------------------|------------------------------|---------|
| FIGHTER   | Rapid twin cannons      | Fastest, low altitude only   | Smallest hitbox |
| GUARDIAN  | 3-way spread            | Can climb/dive in the low sky | |
| BATTLOID  | Homing micro-missiles   | Slow, can climb/dive          | Armor absorbs one hit (then 10 s reboot) |

## The epigenetics

- **Methylators** (purple flying wings) fly down and fire a methylation beam. If it catches you,
  the form you were in is **silenced** and you can't use it. The Methylator carries it away, like a
  captured ship in Galaga. Shoot that plane down to demethylate the gene and get the form back
  (+1000 points). If your last working form gets silenced, it costs a shield and all your forms come back
  (with no shields left, it destroys the ship).
- **Acetylated** planes (gold) fly faster, fire double shots and are worth double points.
- **TET capsules:** gold planes sometimes drop a green-and-white capsule (more often when a form
  is silenced). Fly into it to demethylate one silenced form. With nothing silenced, it's worth
  1000 points. Real TET enzymes start the process that removes methyl marks from DNA.
- **Epigenetic memory:** if one form gets 60% or more of your kills in a stage, the next squadron
  adapts and takes half damage from it. Keep transforming.
## The two kinds of stage

- **Approach** (Galaga-style, top-down, you fly up): 40 planes fly into formation and dive at you.
  On a challenging stage they don't shoot. At Aegir the approach ends at the **Nucleosome
  Fortress**: destroy both turrets to drop the shield on the histone core, then dodge its
  silencing beam.
- **Assault** (side-scrolling, U.N. Squadron-style): you face right and every form can fly anywhere
  on the left side of the screen. Every ship here, yours and the enemy's, is drawn in side profile.
  Enemies include:
  - MiG squadrons flying in lines or swooping at you
  - Ambushes from behind, with a red `!>` warning on the left edge first
  - Slow, tough bombers
  - SAM sites on the ground
  - Methylators that park on the right and fire their silencing beam sideways. If one gets away
    carrying your gene, that form stays silenced for the rest of the leg.
  - The sector's own enemies (see the table above)

  Each assault ends with the sector's boss, a flying battleship seen side-on.

## Special weapons

You learn specials at levels 2, 5 and 8. After a briefing, the **hangar** screen lets you equip
one special you have learned. Fire it with **C** (keyboard) or **B** (controller). Every takeoff
rearms it with as many uses as your **Special** stat.

| Weapon        | Effect |
|---------------|--------|
| THUNDER LASER | One-second beam that pierces everything ahead |
| CLUSTER BOMB  | Fires 3 bombs. Each bursts into 8 fragments on impact (or when its fuse runs out) |
| MEGA CRUSH    | Damages every enemy on screen and erases enemy bullets |
| GENE SHIELD   | 5-second barrier that blocks bullets, rams enemies and stops methylation beams |
| TET BURST     | Restores every silenced form and cuts off methylation beams on screen |
| WINGMAN       | A drone flies with you for 10 seconds and copies every shot |

## Project layout

```
index.html        page + canvas
js/nes.js         NES palette, bitmap font, sprite baking, draw helpers
js/sprites.js     all pixel art (hulls top-down + side profile, aircraft, portraits, boss hulls)
js/audio.js       chiptune synth (pulse/triangle/noise) + music sequencer + sound effects
js/input.js       keyboard + gamepad (standard, generic, hat-switch) + remapping
js/game.js        game states, Galaga stages, player, enemies, rendering
js/bosses.js      data-driven bosses (turrets, cores, shields, beams)
js/side.js        side-scrolling assaults: enemy script, behaviors, parallax background
js/specials.js    hangar screen + special weapons
js/pilots.js      pilot select, ship hulls, stats, shields
js/campaign.js    sectors, missions, rewards, levels, saves, galaxy map
js/starbase.js    starbase menus, shop, status, learn-a-special screen
js/carrier.js     space carrier art, takeoff and landing
js/story.js       planet briefings, story beats, epilogue, Echo facts, Mira's hints
js/tet.js         TET capsule pickups
js/main.js        boot + fixed 60 Hz loop
```
