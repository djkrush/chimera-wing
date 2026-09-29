'use strict';
// Pilots and ship hulls. The player picks a pilot for a new campaign. Each pilot has three stats (max 8):
//   weapons: shot strength. 4 is normal damage and 8 is double.
//   shields: hits the ship can take. With none left, the next hit destroys it and ends the game.
//   special: uses of the hangar's special weapon in each mission.

const PILOTS = [
  { name: 'MAVERICK', tag: 'HOTSHOT ACE', col: C.red, weapons: 8, shields: 4, special: 3,
    perk: 'SHOTS HIT TWICE AS HARD.' },
  { name: 'TURTLE', tag: 'IRON WALL', col: C.lime, weapons: 4, shields: 8, special: 3,
    perk: '8 HITS BEFORE DANGER.' },
  { name: 'DRAC', tag: 'ALIEN TACTICIAN', col: C.magenta, weapons: 4, shields: 4, special: 6,
    perk: 'DOUBLE SPECIAL AMMO.' },
];
const STAT_MAX = 8;
const STAT_CAP = 12;   // pilot + hull + starbase upgrades never go past this

// Ship hulls. The pilot flies one hull at a time. Its modifiers add to the pilot's stats, and speed
// scales every form. Starbases sell the others (see `hull` in SECTORS, campaign.js).
const HULLS = [
  { name: 'VX-3 CHIMERA', weapons: 0, shields: 0, special: 0, speed: 1, price: 0,
    desc: 'THE ORIGINAL. BALANCED.' },
  { name: 'VX-5 MANTICORE', weapons: 2, shields: -1, special: 0, speed: 1.05, price: 4000,
    desc: 'FORWARD-SWEPT STRIKER.' },
  { name: 'VX-6 GRIFFIN', weapons: 0, shields: 3, special: -1, speed: 0.9, price: 4000,
    desc: 'HEAVY ARMOR, THREE ENGINES.' },
  { name: 'VX-9 HYDRA', weapons: 1, shields: 1, special: 1, speed: 1.1, price: 9000,
    desc: 'BEST AT EVERYTHING.' },
];

Object.assign(Game, {
  pilot: 0, pilotSel: 0,

  pilotDef() { return PILOTS[this.pilot]; },
  hullDef() { return HULLS[this.camp ? this.camp.hull : 0]; },
  // Effective stat: pilot + hull + upgrades bought at starbases.
  statOf(key) {
    const up = this.camp ? this.camp.up[key] : 0;
    return clamp(this.pilotDef()[key] + this.hullDef()[key] + up, 1, STAT_CAP);
  },
  gunPower() { return this.statOf('weapons') / 4; },
  speedMul() { return this.hullDef().speed; },

  openPilotSelect() {
    this.setState('pilot');
    this.pilotSel = this.pilot;
  },

  updatePilotSelect() {
    this.stateT++;
    const n = PILOTS.length;
    if (Input.just('up')) { this.pilotSel = (this.pilotSel + n - 1) % n; Sound.sfx('move'); }
    if (Input.just('down')) { this.pilotSel = (this.pilotSel + 1) % n; Sound.sfx('move'); }
    if (Input.just('back') || Input.just('special')) { Sound.sfx('move'); this.setState('title'); return; }
    if (this.stateT > 12 && (Input.just('fire') || Input.just('start'))) {
      this.pilot = this.pilotSel;
      Sound.sfx('select');
      this.newCampaign(this.pilot);
    }
  },

  // Shields soak hits. Returns false when there were none left and the ship went down.
  takeHit() {
    const p = this.player;
    if (this.shields <= 0) { this.killPlayer(); return false; }
    this.shields--;
    p.invuln = 120;
    this.explode(p.x, p.y, 12, [C.white, C.sky, C.aqua]);
    this.popup(p.x, p.y - 16, this.shields ? 'SHIELD -1' : 'DANGER', this.shields ? C.sky : C.red);
    Sound.sfx('armor');
    if (!this.shields) this.hint('danger');
    return true;
  },

  drawPilotSelect(ctx) {
    const center = { align: 'center' };
    NES.text(ctx, 'CHOOSE YOUR PILOT', 128, 10, C.gold, center);
    const stats = [['WEAPONS', 'weapons', C.red], ['SHIELDS', 'shields', C.sky], ['SPECIAL', 'special', C.gold]];
    PILOTS.forEach((pl, i) => {
      const y = 26 + i * 64, sel = i === this.pilotSel;
      NES.box(ctx, 8, y, 240, 58, sel ? C.navy : C.black, sel ? pl.col : C.gray);
      ctx.fillStyle = sel ? C.black : C.navy;
      ctx.fillRect(16, y + 8, 26, 26);
      ctx.drawImage(SPR.pilots[i], 17, y + 9);
      if (sel && (this.t >> 3) & 1) NES.text(ctx, '>', 18, y + 40, C.gold);
      NES.text(ctx, pl.name, 50, y + 5, sel ? pl.col : C.lgray);
      NES.text(ctx, pl.tag, 240, y + 5, sel ? C.white : C.gray, { align: 'right' });
      stats.forEach(([label, key, col], k) => {
        const sy = y + 17 + k * 9, v = pl[key];
        NES.text(ctx, label, 50, sy, sel ? C.white : C.gray);
        for (let s = 0; s < STAT_MAX; s++) {
          ctx.fillStyle = s < v ? (sel ? col : C.lgray) : C.black;
          ctx.fillRect(108 + s * 8, sy, 7, 7);
        }
        NES.text(ctx, String(v), 178, sy, sel ? C.white : C.gray);
      });
      NES.text(ctx, pl.perk, 50, y + 45, sel ? C.aqua : C.gray);
    });
    if ((this.t >> 4) & 1) NES.text(ctx, 'UP/DOWN: CHOOSE   A: FLY', 128, 222, C.white, center);
    NES.text(ctx, 'B: BACK', 128, 231, C.gray, center);
  },
});
