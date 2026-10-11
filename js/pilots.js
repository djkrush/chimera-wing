'use strict';
// Pilots and ship hulls. The player picks a pilot for a new campaign. Each pilot has three stats:
//   weapons: shot strength, (1 + weapons) / 4 times a gun's damage: 1 is half, 3 is the guns' own damage.
//   shields: hits the ship can take. With none left, the next hit destroys it and ends the game.
//   special: uses of the hangar's special weapon in each leg.

const PILOTS = [
  { name: 'MAVERICK', tag: 'HOTSHOT ACE', col: C.red, weapons: 2, shields: 2, special: 1,
    perk: 'SHOTS HIT HARDEST.' },
  { name: 'TURTLE', tag: 'IRON WALL', col: C.lime, weapons: 1, shields: 3, special: 1,
    perk: 'TAKES THE MOST HITS.' },
  { name: 'DRAC', tag: 'ALIEN TACTICIAN', col: C.magenta, weapons: 1, shields: 2, special: 2,
    perk: 'TWO SPECIALS EACH LEG.' },
];
const STAT_MAX = 4;   // pips on the pilot cards
const STAT_CAP = { weapons: 8, shields: 8, special: 5 };   // pilot + hull + hull upgrades + training never go past these

// Ship hulls. The pilot flies one hull at a time. Its modifiers add to the pilot's stats, and speed
// scales every form. fit = each form's two guns, [start, upgrade] (weapons.js: GUNS; the CHIMERA has no
// upgrades); rung = its step on the gun ladder (FUTURE.md, M4): each hull starts with the guns the one
// below it buys as upgrades. form = damage multiplier in FIGHTER, GUARDIAN and BATTLOID.
// Planet markets sell them (P.hulls in world.js). Keep the order: saves store the index, and HULL_ART
// (sprites.js) follows it, so the BEHEMOTH (rung 6) and SPHINX (rung 8) come after the PHOENIX (rung 7).
const HULLS = [
  { name: 'VX-3 CHIMERA', rung: 0, weapons: 0, shields: 0, special: 0, speed: 1, price: 0, form: [1, 1, 1],
    fit: [['twin', null], ['spread', null], ['laser', null]], desc: 'THE ORIGINAL. BALANCED.' },
  { name: 'VX-5 MANTICORE', rung: 1, weapons: 1, shields: 0, special: 1, speed: 1.1, price: 4000, form: [1.4, 1, 0.8],
    fit: [['twin', 'vulcan'], ['spread', 'wave'], ['laser', 'grenade']], desc: 'STRIKER. DEADLIEST AS A FIGHTER.' },
  { name: 'VX-6 GRIFFIN', rung: 2, weapons: 0, shields: 2, special: 0, speed: 0.9, price: 5000, form: [0.9, 1, 1.4],
    fit: [['vulcan', 'ripple'], ['wave', 'bomb'], ['grenade', 'charge']], desc: 'ARMOR. BEST AS A BATTLOID.' },
  { name: 'VX-9 HYDRA', rung: 3, weapons: 0, shields: 1, special: 0, speed: 1.1, price: 9000, form: [1.1, 1.1, 1.1],
    fit: [['ripple', 'gunpod'], ['bomb', 'swivel'], ['charge', 'rail']], desc: 'ALL-ROUNDER. GOOD AT EVERYTHING.' },
  { name: 'VX-7 WYVERN', rung: 4, weapons: 0, shields: 1, special: 1, speed: 1, price: 12000, form: [0.9, 1.4, 1],
    fit: [['gunpod', 'tail'], ['swivel', 'flak'], ['rail', 'hyper']], desc: 'GUARDIAN. BEST AS A GUARDIAN.' },
  { name: 'VX-8 BASILISK', rung: 5, weapons: 2, shields: -1, special: 2, speed: 1.15, price: 18000, form: [1.2, 1.2, 1],
    fit: [['tail', 'needle'], ['flak', 'diagonal'], ['hyper', 'sword']], desc: 'PIERCING. HITS HARD, BREAKS EASY.' },
  { name: 'VX-12 PHOENIX', rung: 7, weapons: 1, shields: 1, special: 1, speed: 1.15, price: 30000, form: [1.3, 1.3, 1.3],
    fit: [['rocket', 'burner'], ['mortar', 'ring'], ['canister', 'homing']], desc: 'TOP OF THE LINE. FIRE AND HOMING.' },
  { name: 'VX-10 BEHEMOTH', rung: 6, weapons: 1, shields: 2, special: 0, speed: 0.85, price: 25000, form: [1.1, 1, 1.2],
    fit: [['needle', 'rocket'], ['diagonal', 'mortar'], ['sword', 'canister']], desc: 'GROUND ATTACK. HEAVY AND SLOW.' },
  { name: 'VX-11 SPHINX', rung: 8, weapons: 1, shields: 0, special: 0, speed: 1.2, price: 60000, form: [1.2, 1.1, 1],
    fit: [['burner', 'freeway'], ['ring', 'chain'], ['homing', 'lock']], desc: 'MISSILE CARRIER. LOCKS ON.' },
];

Object.assign(Game, {
  pilot: 0, pilotSel: 0,

  pilotDef() { return PILOTS[this.pilot]; },
  hullDef() { return HULLS[this.camp ? this.camp.hull : 0]; },
  // Effective stat: pilot + hull + the hull's market upgrades (starbase.js: up['key@hull']) + points
  // trained at level-ups.
  statOf(key) {
    const c = this.camp, extra = c ? (c.train[key] || 0) + (c.up[key + '@' + c.hull] || 0) : 0;
    return clamp(this.pilotDef()[key] + this.hullDef()[key] + extra, 1, STAT_CAP[key]);
  },
  // Levels bought, Mk II and Mk III included (starbase.js), so every effect picks them up.
  upLevel(key) { const u = this.camp ? this.camp.up : {}; return (u[key] || 0) + (u[key + '2'] || 0) + (u[key + '3'] || 0); },
  hasPassive(id) { return !!this.camp && this.camp.passives.includes(id); },
  // Shot damage for a form: the weapons stat, the hull's strength in that form and the form's gun upgrade.
  gunPower(form = this.player.form) {
    return (1 + this.statOf('weapons')) / 4 * this.hullDef().form[form] * (1 + 0.2 * this.upLevel(['ftr', 'grd', 'btl'][form]));
  },
  speedMul() { return this.hullDef().speed * (1 + 0.05 * this.upLevel('engine')); },
  maxShields() { return this.statOf('shields') + (this.hasPassive('hull') ? 2 : 0); },
  specialAmmo() { return this.statOf('special') + (this.hasPassive('ammo') ? 1 : 0); },
  // Frames the Battloid's armor needs to reboot after soaking a hit.
  battMax() { return Math.round(600 * (this.hasPassive('armor') ? 0.5 : 1) * (1 - 0.25 * this.upLevel('armor'))); },

  openPilotSelect() {
    this.setState('pilot');
    this.pilotSel = this.pilot;
  },

  updatePilotSelect() {
    this.stateT++;
    const n = PILOTS.length;
    if (Input.just('up') || Input.just('left')) { this.pilotSel = (this.pilotSel + n - 1) % n; Sound.sfx('move'); }
    if (Input.just('down') || Input.just('right')) { this.pilotSel = (this.pilotSel + 1) % n; Sound.sfx('move'); }
    if (Input.just('back') || Input.just('special')) { Sound.sfx('move'); this.setState('title'); return; }
    if (this.stateT > 12 && (Input.just('fire') || Input.just('start'))) this.pilotPick();
  },

  pilotPick() {
    this.pilot = this.pilotSel;
    Sound.sfx('select');
    this.newCampaign(this.pilot);
  },

  // Shields soak hits. Returns false when there were none left and the ship went down.
  takeHit() {
    const p = this.player;
    if (this.barrier > 0) { this.barrierHit(); return true; }   // a barrier module soaks it first (arsenal.js)
    if (this.shields <= 0 && this.hasPassive('second') && !this.secondUsed) {   // SECOND WIND: once per leg
      this.secondUsed = true;
      this.shields = 1;
      this.popup(p.x, p.y - 26, 'SECOND WIND', C.gold);
    }
    if (this.shields <= 0) { this.killPlayer(); return false; }
    this.shields--;
    p.invuln = 120;
    this.punch(3);
    this.explode(p.x, p.y, 12, [C.white, C.sky, C.aqua]);
    this.popup(p.x, p.y - 16, this.shields ? 'SHIELD -1' : 'DANGER', this.shields ? C.sky : C.red);
    Sound.sfx('armor');
    if (!this.shields) this.hint('danger');
    return true;
  },

  // Fighting-game style select: one card per pilot across the widescreen, portrait on top.
  drawPilotSelect(ctx) {
    const center = { align: 'center' };
    NES.text(ctx, 'CHOOSE YOUR PILOT', CX, 8, C.gold, { align: 'center', scale: 2 });
    const stats = [['WPN', 'weapons', C.red], ['SHD', 'shields', C.sky], ['SPC', 'special', C.gold]];
    PILOTS.forEach((pl, i) => {
      const w = 132, x = CX - 205 + i * 139, y = 30, sel = i === this.pilotSel, mid = x + (w >> 1);
      NES.box(ctx, x, y, w, 178, sel ? '#203890' : C.black, sel ? pl.col : C.gray);
      this.drawFace(ctx, SPR.pilots[i], mid - 30, y + 8, sel ? pl.col : C.gray);
      if (sel && (this.t >> 3) & 1) { NES.text(ctx, '>', x + 12, y + 38, C.gold); NES.text(ctx, '<', x + w - 18, y + 38, C.gold); }
      NES.text(ctx, pl.name, mid, y + 82, sel ? pl.col : C.lgray, center);
      NES.text(ctx, pl.tag, mid, y + 93, sel ? C.white : C.gray, center);
      stats.forEach(([label, key, col], k) => {
        const sy = y + 108 + k * 11, v = pl[key];
        NES.text(ctx, label, x + 8, sy, sel ? C.white : C.gray);
        this.drawStatPips(ctx, x + 36, sy, v, STAT_MAX, sel ? col : C.lgray);
        NES.text(ctx, String(v), x + w - 10, sy, sel ? C.white : C.gray, { align: 'right' });
      });
      NES.wrap(pl.perk, 15).forEach((l, k) => NES.text(ctx, l, mid, y + 147 + k * 10, sel ? C.aqua : C.gray, center));
    });
    if ((this.t >> 4) & 1) NES.text(ctx, 'LEFT/RIGHT: CHOOSE   A: FLY', CX, 216, C.white, center);
    NES.text(ctx, 'B: BACK', CX, 228, C.gray, center);
  },
});
