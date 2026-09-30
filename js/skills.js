'use strict';
// Pilot skills. Every level-up the pilot trains one stat (+1 WEAPONS, SHIELDS or SPECIAL), then learns
// a special attack (even levels, specials.js) or a passive skill (odd levels). Passive skills are
// always on once learned. A new pilot picks one of three starter passives. Choices wait in
// camp.pending ('starter', 'stat', 'special', 'passive') until the LEARN screen takes them, so a
// quit in the middle loses nothing.
// Ideas borrowed from the classics: Gradius's Options (DRONE ESCORT), air-to-ground Missile (GROUND
// MISSILES) and Double (TAIL GUN), and the shield-cell and repair pickups of many a shooter.

const PASSIVES = [
  { id: 'drone', name: 'DRONE ESCORT', col: C.sky, desc: ['AN ESCORT DRONE FLIES WITH', 'YOU AND FIRES WHEN YOU DO.'] },
  { id: 'hull', name: 'REINFORCED HULL', col: C.lime, desc: ['+2 SHIELDS AT EVERY', 'TAKEOFF.'] },
  { id: 'gmissile', name: 'GROUND MISSILES', col: C.orange, desc: ['SIDE MISSIONS: MISSILES', 'SKIM THE GROUND AT TANKS.'] },
  { id: 'rear', name: 'TAIL GUN', col: C.yellow, desc: ['FIRES BEHIND YOU WHILE', 'YOU SHOOT. NO AMBUSHES.'] },
  { id: 'regen', name: 'AUTO REPAIR', col: C.mint, desc: ['REPAIRS ONE SHIELD EVERY', '20 SECONDS IN A MISSION.'] },
  { id: 'second', name: 'SECOND WIND', col: C.gold, desc: ['ONCE PER LEG, A FATAL HIT', 'LEAVES YOU ONE SHIELD.'] },
  { id: 'genelock', name: 'GENE LOCK', col: C.pink, desc: ['BLOCKS THE FIRST METHYL', 'BEAM THAT HITS EACH LEG.'] },
  { id: 'magnet', name: 'TET MAGNET', col: C.lime, desc: ['MORE TET CAPSULES DROP,', 'AND THEY FLY TO YOU.'] },
  { id: 'salvage', name: 'SALVAGE RIGHTS', col: C.gold, desc: ['+20% CREDITS FROM', 'EVERY MISSION.'] },
  { id: 'study', name: 'QUICK STUDY', col: C.aqua, desc: ['+20% EXPERIENCE FROM', 'EVERY MISSION.'] },
  { id: 'armor', name: 'REACTIVE ARMOR', col: C.lgray, desc: ['BATTLOID ARMOR REBOOTS', 'TWICE AS FAST.'] },
  { id: 'ammo', name: 'EXTRA MAGAZINE', col: C.orange, desc: ['ONE MORE SPECIAL USE', 'AT EVERY TAKEOFF.'] },
  { id: 'overclock', name: 'OVERCLOCK', col: C.red, desc: ['EVERY GUN FIRES 15%', 'FASTER.'] },
];
const PASSIVE_BY_ID = Object.fromEntries(PASSIVES.map(s => [s.id, s]));
const STARTER_PASSIVES = ['drone', 'hull', 'gmissile'];
const STAT_ROWS = [['weapons', 'WEAPONS', C.red, 'SHOTS HIT HARDER.'], ['shields', 'SHIELDS', C.sky, 'TAKE ONE MORE HIT.'],
  ['special', 'SPECIAL', C.gold, 'ONE MORE SPECIAL PER LEG.']];

Object.assign(Game, {
  learnUI: null,

  // Levels reached with the XP in camp.xp; each one queues its choices.
  gainLevels() {
    const c = this.camp, levels = [];
    while (c.level < LEVELS.length && c.xp >= LEVELS[c.level]) {
      c.level++;
      levels.push(c.level);
      c.pending.push('stat', c.level % 2 ? 'passive' : 'special');
    }
    return levels;
  },

  learnOptions(kind) {
    const c = this.camp, shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);
    if (kind === 'stat') return STAT_ROWS.map(r => r[0]).filter(k => this.statOf(k) < STAT_CAP);
    if (kind === 'starter') return STARTER_PASSIVES.filter(id => !c.passives.includes(id));
    if (kind === 'special') return shuffle(SPECIALS.map((s, i) => i).filter(i => !c.learned.includes(i))).slice(0, 3);
    return shuffle(PASSIVES.map(s => s.id).filter(id => !c.passives.includes(id))).slice(0, 3);
  },

  // Opens the next pending choice. A special with none left to learn becomes a passive (and back);
  // with nothing at all left it is skipped.
  openLearn() {
    const c = this.camp;
    while (c.pending.length) {
      let kind = c.pending[0], opts = this.learnOptions(kind);
      if (!opts.length && (kind === 'special' || kind === 'passive')) {
        kind = kind === 'special' ? 'passive' : 'special';
        opts = this.learnOptions(kind);
      }
      if (opts.length) {
        this.learnUI = { kind, opts, sel: 0 };
        this.setState('learn');
        Sound.sfx('levelup');
        return;
      }
      c.pending.shift();
    }
    this.leaveDebrief();
  },

  updateLearn() {
    this.stateT++;
    const L = this.learnUI, n = L.opts.length;
    if (Input.just('up')) { L.sel = (L.sel + n - 1) % n; Sound.sfx('move'); }
    if (Input.just('down')) { L.sel = (L.sel + 1) % n; Sound.sfx('move'); }
    if (this.stateT >= 20 && (Input.just('fire') || Input.just('start'))) this.pickLearn();
  },

  pickLearn() {
    const c = this.camp, L = this.learnUI, v = L.opts[L.sel];
    if (L.kind === 'stat') { c.train[v] = (c.train[v] || 0) + 1; this.toast(v.toUpperCase() + ' +1'); }
    else if (L.kind === 'special') { c.learned.push(v); this.lastSpecial = v; this.toast(SPECIALS[v].name + ' LEARNED'); }
    else { c.passives.push(v); this.toast(PASSIVE_BY_ID[v].name + ' LEARNED'); }
    c.pending.shift();
    Sound.sfx('restore');
    this.saveCampaign();
    this.openLearn();
  },

  // Tap a row to pick it; tap the picked row again to confirm.
  tapLearn(x, y) {
    const i = Math.floor((y - 76) / 22);
    if (this.stateT < 20 || i < 0 || i >= this.learnUI.opts.length) return;
    if (i === this.learnUI.sel) this.pickLearn(); else { this.learnUI.sel = i; Sound.sfx('move'); }
  },

  drawLearn(ctx) {
    const center = { align: 'center' }, L = this.learnUI, c = this.camp;
    NES.box(ctx, 2, 2, 252, 236, C.black, C.lime);
    const head = { starter: 'FIRST SKILL', stat: 'LEVEL ' + c.level + '!' }[L.kind] || 'LEVEL ' + c.level + '!';
    NES.text(ctx, head, 128, 16, C.lime, { align: 'center', scale: 2, shadow: C.dgreen });
    const sub = { starter: ['CHOOSE A STARTING PASSIVE.', 'IT IS ALWAYS ON.'], stat: ['TRAIN ONE STAT: +1.', 'YOU KEEP IT FOR GOOD.'],
      special: ['LEARN A NEW SPECIAL ATTACK.', 'EQUIP IT IN THE HANGAR.'], passive: ['LEARN A PASSIVE SKILL.', 'IT IS ALWAYS ON.'] }[L.kind];
    sub.forEach((l, i) => NES.text(ctx, l, 128, 42 + i * 10, i ? C.lgray : C.white, center));
    let desc = [];
    L.opts.forEach((v, i) => {
      const y = 80 + i * 22, sel = i === L.sel;
      if (sel) NES.hilite(ctx, 18, y - 5, 220, 18);
      if (sel && (this.t >> 3) & 1) NES.text(ctx, '>', 22, y, C.gold);
      let name, col, right = '';
      if (L.kind === 'stat') {
        const row = STAT_ROWS.find(r => r[0] === v), now = this.statOf(v);
        [name, col, right] = [row[1], row[2], now + ' > ' + (now + 1)];
        if (sel) desc = [row[3]];
      } else if (L.kind === 'special') {
        const s = SPECIALS[v];
        NES.draw(ctx, SPR.specialIcons[v], 38, y + 3);
        [name, col] = [s.name, s.color];
        if (sel) desc = s.desc;
      } else {
        const s = PASSIVE_BY_ID[v];
        [name, col] = [s.name, s.col];
        if (sel) desc = s.desc;
      }
      NES.text(ctx, name, 50, y, sel ? col : C.gray);
      if (right) NES.text(ctx, right, 230, y, sel ? C.white : C.gray, { align: 'right' });
    });
    desc.forEach((l, i) => NES.text(ctx, l, 128, 170 + i * 10, C.aqua, center));
    if (c.pending.length > 1) NES.text(ctx, (c.pending.length - 1) + ' MORE TO CHOOSE', 128, 204, C.gray, center);
    if ((this.t >> 4) & 1) NES.text(ctx, 'SPACE / A: CHOOSE', 128, 222, C.white, center);
  },

  // ---- Passive skills in flight ------------------------------------------------------------
  resetPassives() { this.secondUsed = false; this.lockUsed = false; this.regenT = 0; this.gmT = 0; },

  // Where the escort drone flies: the other side from the Wingman special's drone.
  escortOffset() { return this.orient(26, 10); },

  updatePassives() {
    const p = this.player;
    if (!p.alive || !this.camp) return;
    if (this.hasPassive('drone') && Input.pressed('fire') && this.t % 14 === 0) {
      const [ox, oy] = this.escortOffset(), [vx, vy] = this.orient(0, -6);
      this.pBul.push({ x: p.x + ox, y: p.y + oy, vx, vy, kind: 'shot', dmg: this.gunPower() * 0.5, form: -1 });
    }
    if (this.hasPassive('regen') && this.shields < this.maxShields() && ++this.regenT >= 1200) {
      this.regenT = 0;
      this.shields++;
      this.popup(p.x, p.y - 20, 'REPAIR +1', C.mint);
      Sound.sfx('oneup');
    }
    // Ground missiles: in side missions, whenever something sits on the ground ahead.
    if (this.hasPassive('gmissile') && this.isSide && ++this.gmT >= 75) {
      const ground = this.enemies.some(e => !e.dead && (e.beh === 'ground' || e.beh === 'tank') && e.x > p.x && e.x < W) || this.boss;
      if (ground) {
        this.gmT = 0;
        this.pBul.push({ x: p.x, y: p.y + 6, vx: 1.5, vy: 1.5, kind: 'gmissile', dmg: 3 * this.gunPower(), form: -1, life: 260 });
        Sound.sfx('missile');
      }
    }
  },

  drawPassives(ctx) {
    const p = this.player;
    if (!p.alive || p.hidden || !this.hasPassive('drone')) return;
    const [ox, oy] = this.escortOffset();
    NES.draw(ctx, this.isSide ? SPR.escortSide : SPR.escort, p.x + ox, p.y + oy + Math.round(Math.sin(this.t * 0.08)));
  },
});
