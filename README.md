# CHIMERA WING: The Epigenome War

A Galaga-style shooter with NES-style graphics. You fly the **VX-3 Chimera**, a transforming
fighter, against the air force of **Dr. Helena Voss**, a rogue epigeneticist who has taken over
the world's pilots by switching their genes on and off.

## The story

Voss never changed a letter of anyone's DNA. She changed which genes are *used*. Your ally,
**Dr. Mira Kato**, was her lab partner and built the Chimera to stop her. Before every stage Mira
briefs you on a real piece of epigenetics (Waddington's landscape, the Dutch Hunger Winter,
agouti mice, queen bees, X-inactivation, imprinting, Yamanaka's reprogramming and more), and
Voss answers. Along the way you learn why she's doing it.

The campaign runs through stage 15 and ends with an epilogue. After that the game keeps looping
against the **Voss Echo**, with a new science fact each stage.

## Running it

No install or build step. Open `index.html` in Chrome, Edge or Firefox.

- `index.html?stage=5` jumps straight to a stage, which is handy for testing (stage 2 is the first side mission, stage 5 the fortress).
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
  (+1000 points). If your last working form gets silenced, you lose a life.
- **Acetylated** planes (gold) fly faster, fire double shots and are worth double points.
- **TET capsules:** gold planes sometimes drop a green-and-white capsule (more often when a form
  is silenced). Fly into it to demethylate one silenced form. With nothing silenced, it's worth
  1000 points. Real TET enzymes start the process that removes methyl marks from DNA.
- **Epigenetic memory:** if one form gets 60% or more of your kills in a stage, the next squadron
  adapts and takes half damage from it. Keep transforming.
## Stage order

Stages alternate between two styles of play:

- **Odd stages are Galaga-style** (top-down, you fly up):
  - **Normal stages:** 40 planes fly into formation and dive at you.
  - **Challenging stages** (3, 7, 11, ...): the planes don't shoot. Shoot all 40 for a perfect bonus.
  - **Nucleosome Fortress** (5, 15, 25, ...): Voss's flying fortress. Destroy both turrets to drop
    the shield on the histone core. After that the core sweeps a silencing beam across the sky.
- **Even stages are side-scrolling missions** in the style of U.N. Squadron. You face right and every
  form can fly anywhere on the left side of the screen. Enemies include:
  - MiG squadrons flying in lines or swooping at you
  - Ambushes from behind, with a red `!>` warning on the left edge first
  - Slow, tough bombers
  - SAM sites on the ground
  - Methylators that park on the right and fire their silencing beam sideways. If one gets away
    carrying your gene, that form stays silenced for the rest of the mission.

  Each mission ends with Voss's **Histone Gunship**. It works like the fortress, turned sideways.

## Special weapons

After Voss's briefing, a **hangar** screen lets you pick one special weapon for that mission. Fire it
with **C** (keyboard) or **B** (controller). Ammo is limited, and whatever you don't use is lost when
the mission ends.

| Weapon        | Ammo | Effect |
|---------------|------|--------|
| THUNDER LASER | 5    | One-second beam that pierces everything ahead |
| CLUSTER BOMB  | 12   | Bursts into 8 fragments on impact (or when its fuse runs out) |
| MEGA CRUSH    | 2    | Damages every enemy on screen and erases enemy bullets |
| GENE SHIELD   | 3    | 5-second barrier that blocks bullets, rams enemies and stops methylation beams |

## Project layout

```
index.html        page + canvas
js/nes.js         NES palette, bitmap font, sprite baking, draw helpers
js/sprites.js     all pixel art (player forms, aircraft, Dr. Voss portrait, boss hull)
js/audio.js       chiptune synth (pulse/triangle/noise) + music sequencer + sound effects
js/input.js       keyboard + gamepad (standard, generic, hat-switch) + remapping
js/game.js        game states, Galaga stages, bosses, player, rendering
js/side.js        side-scrolling missions: enemy script, behaviors, parallax background
js/specials.js    hangar screen + special weapons
js/story.js       campaign briefings, epilogue, second-loop facts, Mira's hints
js/tet.js         TET capsule pickups
js/main.js        boot + fixed 60 Hz loop
```
