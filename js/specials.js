'use strict';
// Mission special weapons. Before each stage the player picks one in the hangar.
// Every weapon gets as many uses as the pilot's SPECIAL stat (pilots.js), and whatever is
// left is lost when the mission ends.

const SPECIALS = [
  { id: 'laser', name: 'THUNDER LASER', short: 'LSR', color: C.aqua,
    desc: ['A ONE-SECOND BEAM THAT', 'PIERCES EVERYTHING AHEAD.'] },
  { id: 'cluster', name: 'CLUSTER BOMB', short: 'CLU', color: C.orange,
    desc: ['3 BOMBS. EACH BURSTS INTO', '8 FRAGMENTS ON IMPACT.'] },
  { id: 'crush', name: 'MEGA CRUSH', short: 'MGC', color: C.white,
    desc: ['HITS EVERY ENEMY ON SCREEN', 'AND ERASES ENEMY BULLETS.'] },
  { id: 'shield', name: 'GENE SHIELD', short: 'SHD', color: C.lime,
    desc: ['5-SECOND BARRIER. BLOCKS', 'BULLETS AND METHYL BEAMS.'] },
];

Object.assign(Game, {
  hangarSel: 0,

  openHangar() {
    this.setState('hangar');
    this.hangarSel = this.lastSpecial;
  },

  updateHangar() {
    this.stateT++;
    const n = SPECIALS.length;
    if (Input.just('up')) { this.hangarSel = (this.hangarSel + n - 1) % n; Sound.sfx('move'); }
    if (Input.just('down')) { this.hangarSel = (this.hangarSel + 1) % n; Sound.sfx('move'); }
    if (this.stateT > 12 && (Input.just('fire') || Input.just('start') || Input.just('special'))) {
      const sel = this.hangarSel;
      this.lastSpecial = sel;
      this.special = { idx: sel, ammo: this.pilotDef().special, cd: 0 };
      Sound.sfx('select');
      this.beginPlay();
    }
  },

  useSpecial() {
    const sp = this.special, p = this.player;
    if (!sp || !p.alive || sp.cd > 0) return;
    if (sp.ammo <= 0) {
      Sound.sfx('denied');
      this.popup(p.x, p.y - 14, 'NO AMMO', C.gray);
      sp.cd = 20;
      return;
    }
    sp.ammo--;
    this.shots++;
    switch (SPECIALS[sp.idx].id) {
      case 'laser':
        this.laser = { t: 60 };
        sp.cd = 60;
        Sound.sfx('charge');
        break;
      case 'cluster':
        for (const vx of [-1, 0, 1]) this.shoot(0, -8, vx, -3.5, { kind: 'cluster', dmg: 3, form: -1, life: 34 });
        this.shots += 2;   // three bombs per use
        sp.cd = 15;
        Sound.sfx('missile');
        break;
      case 'crush':
        this.megaCrush();
        sp.cd = 45;
        break;
      case 'shield':
        p.shieldT = 300;
        sp.cd = 30;
        Sound.sfx('restore');
        break;
    }
  },

  burstCluster(b) {
    this.explode(b.x, b.y, 8, [C.red, C.orange, C.yellow]);
    Sound.sfx('explode');
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      this.pBul.push({ x: b.x, y: b.y, vx: Math.cos(a) * 3.5, vy: Math.sin(a) * 3.5, kind: 'frag', dmg: 2, form: -1, life: 18 });
    }
  },

  megaCrush() {
    this.crushT = 16;
    Sound.sfx('boom');
    for (const b of this.eBul) this.spark(b.x, b.y, C.white, 1);
    this.eBul = [];
    for (const e of this.enemies) {
      if (!e.dead && e.x > -8 && e.x < W + 8 && e.y > -8 && e.y < H + 8) this.damageEnemy(e, 6, -1);
    }
    const B = this.boss;
    if (B && !B.dying && !B.entering) for (const pt of B.parts) if (!pt.dead) this.damageBossPart(pt, 20, -1, pt.x, pt.y);
  },

  // Is (x, y) inside the Thunder Laser beam? r = target radius.
  inLaser(x, y, r) {
    const p = this.player;
    if (this.isSide) return x > p.x && Math.abs(y - p.y) < 4 + r;
    return y < p.y && Math.abs(x - p.x) < 4 + r;
  },

  updateSpecial() {
    const sp = this.special, p = this.player;
    if (sp && sp.cd > 0) sp.cd--;
    if (p.shieldT > 0) p.shieldT--;
    if (this.crushT > 0) this.crushT--;
    const L = this.laser;
    if (!L) return;
    if (--L.t <= 0 || !p.alive) { this.laser = null; return; }
    if (L.t % 3 !== 0) return;
    for (const e of this.enemies) {
      if (!e.dead && this.inLaser(e.x, e.y, ENEMY[e.type].hit)) this.damageEnemy(e, 1, -1);
    }
    const B = this.boss;
    if (B && !B.dying && !B.entering) {
      for (const pt of B.parts) if (!pt.dead && this.inLaser(pt.x, pt.y, pt.r)) this.damageBossPart(pt, 1, -1, pt.x, pt.y);
    }
  },

  drawSpecialFx(ctx, layer) {
    const p = this.player;
    if (layer === 'under') {
      if (!this.laser || !p.alive) return;
      const x = Math.round(p.x), y = Math.round(p.y);
      const w = 5 + ((this.t >> 1) & 1) * 2;
      ctx.fillStyle = C.aqua;
      if (this.isSide) ctx.fillRect(x + 8, y - (w >> 1), W, w); else ctx.fillRect(x - (w >> 1), 0, w, y - 8);
      ctx.fillStyle = C.white;
      if (this.isSide) ctx.fillRect(x + 8, y - 1, W, 3); else ctx.fillRect(x - 1, 0, 3, y - 8);
      return;
    }
    if (p.alive && p.shieldT > 0 && (p.shieldT > 60 || (this.t >> 2) & 1)) {
      for (let k = 0; k < 20; k++) {
        const a = k / 20 * TAU + this.t * 0.08;
        ctx.fillStyle = k % 2 ? C.aqua : C.lime;
        ctx.fillRect(Math.round(p.x + Math.cos(a) * 12), Math.round(p.y + Math.sin(a) * 12), 2, 2);
      }
    }
    if (this.crushT > 12) {
      ctx.fillStyle = C.white;
      ctx.fillRect(0, 0, W, H);
    } else if (this.crushT > 0) {
      const r = (16 - this.crushT) * 20;
      ctx.fillStyle = C.yellow;
      for (let k = 0; k < 48; k++) {
        const a = k / 48 * TAU;
        ctx.fillRect(Math.round(p.x + Math.cos(a) * r), Math.round(p.y + Math.sin(a) * r), 3, 3);
      }
    }
  },

  drawHangar(ctx) {
    const center = { align: 'center' };
    NES.box(ctx, 16, 30, 224, 172, C.black, C.gold);
    NES.text(ctx, 'HANGAR: MISSION LOADOUT', 128, 38, C.gold, center);
    NES.text(ctx, 'PICK ONE SPECIAL WEAPON.', 128, 52, C.white, center);
    NES.text(ctx, 'IT ONLY LASTS THIS MISSION.', 128, 62, C.lgray, center);
    SPECIALS.forEach((s, i) => {
      const y = 80 + i * 17;
      const sel = i === this.hangarSel;
      if (sel) { ctx.fillStyle = C.navy; ctx.fillRect(22, y - 4, 212, 15); }
      if (sel && (this.t >> 3) & 1) NES.text(ctx, '>', 24, y, C.gold);
      NES.draw(ctx, SPR.specialIcons[i], 40, y + 3);
      NES.text(ctx, s.name, 52, y, sel ? C.white : C.gray);
      NES.text(ctx, 'X' + this.pilotDef().special, 228, y, sel ? s.color : C.gray, { align: 'right' });
    });
    SPECIALS[this.hangarSel].desc.forEach((l, i) => NES.text(ctx, l, 128, 152 + i * 10, C.aqua, center));
    NES.text(ctx, 'FIRE IT WITH: C KEY / PAD B', 128, 176, C.lgray, center);
    if ((this.t >> 4) & 1) NES.text(ctx, 'SPACE / A: LAUNCH', 128, 189, C.white, center);
  },
});
