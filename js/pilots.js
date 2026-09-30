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
    if (Input.just('up') || Input.just('left')) { this.pilotSel = (this.pilotSel + n - 1) % n; Sound.sfx('move'); }
    if (Input.just('down') || Input.just('right')) { this.pilotSel = (this.pilotSel + 1) % n; Sound.sfx('move'); }
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
