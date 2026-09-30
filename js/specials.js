'use strict';
// Special weapons. The pilot learns one at every even level (skills.js) and equips one learned special
// before each mission. Every takeoff rearms it with as many uses as the SPECIAL stat (pilots.js).
// The later ones come from the classics: Macross's missile swarms (BARRAGE), R-Type's Force (FORCE
// POD), DoDonPachi's hyper mode (HYPER), and the bullet-cancelling and time-slowing bombs of many
// modern shooters.

const SPECIALS = [
  { id: 'laser', name: 'THUNDER LASER', short: 'LSR', color: C.aqua,
    desc: ['A ONE-SECOND BEAM THAT', 'PIERCES EVERYTHING AHEAD.'] },
  { id: 'cluster', name: 'CLUSTER BOMB', short: 'CLU', color: C.orange,
    desc: ['3 BOMBS. EACH BURSTS INTO', '8 FRAGMENTS ON IMPACT.'] },
  { id: 'crush', name: 'MEGA CRUSH', short: 'MGC', color: C.white,
    desc: ['HITS EVERY ENEMY ON SCREEN', 'AND ERASES ENEMY BULLETS.'] },
  { id: 'shield', name: 'GENE SHIELD', short: 'SHD', color: C.lime,
    desc: ['5-SECOND BARRIER. BLOCKS', 'BULLETS AND METHYL BEAMS.'] },
  { id: 'tet', name: 'TET BURST', short: 'TET', color: C.mint,
    desc: ['RESTORES EVERY SILENCED', 'FORM AND STOPS BEAMS.'] },
  { id: 'wingman', name: 'WINGMAN', short: 'WNG', color: C.sky,
    desc: ['A DRONE FLIES WITH YOU FOR', '10 SECONDS AND COPIES SHOTS.'] },
  { id: 'barrage', name: 'MISSILE BARRAGE', short: 'BRG', color: C.lgray,
    desc: ['12 HOMING MISSILES FAN OUT', 'AND HUNT DOWN TARGETS.'] },
  { id: 'chrono', name: 'CHRONO FIELD', short: 'CHR', color: C.periwinkle,
    desc: ['FOR 5 SECONDS THE ENEMY', 'MOVES AT HALF SPEED.'] },
  { id: 'emp', name: 'EMP BLAST', short: 'EMP', color: C.ice,
    desc: ['ERASES BULLETS. NO ENEMY', 'GUN FIRES FOR 5 SECONDS.'] },
  { id: 'reflect', name: 'REFLECT FIELD', short: 'RFL', color: C.white,
    desc: ['4 SECONDS: BULLETS THAT', 'COME CLOSE BOUNCE BACK.'] },
  { id: 'gravity', name: 'GRAVITY BOMB', short: 'GRV', color: C.violet,
    desc: ['A SMALL BLACK HOLE PULLS', 'IN PLANES AND BULLETS.'] },
  { id: 'pod', name: 'FORCE POD', short: 'POD', color: C.orange,
    desc: ['12 SECONDS: A POD AHEAD OF', 'YOU BLOCKS AND SHOOTS.'] },
  { id: 'hyper', name: 'HYPER MODE', short: 'HYP', color: C.gold,
    desc: ['6 SECONDS: DOUBLE FIRE', 'RATE, +50% DAMAGE.'] },
];

Object.assign(Game, {
  hangarSel: 0,

  // Timers and objects of the specials that last a while. Cleared at every takeoff and docking.
  clearSpecialFx() {
    this.chronoT = 0; this.empT = 0; this.reflectT = 0; this.podT = 0; this.hyperT = 0; this.grav = null;
  },

  openHangar() {
    this.setState('hangar');
    this.hangarSel = Math.max(0, this.camp.learned.indexOf(this.lastSpecial));
  },

  updateHangar() {
    this.stateT++;
    const L = this.camp.learned, n = L.length;
    if (Input.just('up')) { this.hangarSel = (this.hangarSel + n - 1) % n; Sound.sfx('move'); }
    if (Input.just('down')) { this.hangarSel = (this.hangarSel + 1) % n; Sound.sfx('move'); }
    if (this.stateT > 12 && (Input.just('fire') || Input.just('special'))) this.launchHangar();
  },

  launchHangar() {
    const sel = this.camp.learned[this.hangarSel];
    this.lastSpecial = sel;
    this.special = { idx: sel, ammo: this.specialAmmo(), cd: 0 };
    Sound.sfx('select');
    this.startSortie();
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
      case 'tet':
        this.tetBurst();
        sp.cd = 60;
        break;
      case 'wingman':
        this.wingT = 600;
        sp.cd = 30;
        Sound.sfx('oneup');
        break;
      case 'barrage':
        for (let i = 0; i < 12; i++) {
          const hd = -Math.PI / 2 + (i - 5.5) * 0.26;
          this.shoot(0, -4, Math.cos(hd) * 1.5, Math.sin(hd) * 1.5,
            { hd, spd: 1.5, kind: 'missile', dmg: 2 * this.gunPower(), form: -1, life: 160, target: null });
        }
        sp.cd = 40;
        Sound.sfx('missile');
        break;
      case 'chrono':
        this.chronoT = 300;
        sp.cd = 40;
        Sound.sfx('charge');
        break;
      case 'emp':
        this.empT = 300;
        for (const b of this.eBul) this.spark(b.x, b.y, C.ice, 1);
        this.eBul = [];
        for (const e of this.enemies) {   // jammed beams shut off too
          if (e.state === 'beam') e.beamT = Math.max(e.beamT, 160);
          if (e.phase === 'beam') e.beamT = Math.max(e.beamT, 150);
        }
        if (this.boss && this.boss.beamT > 0) { this.boss.beamT = 0; this.boss.beamCd = 200; }
        this.crushT = 6;
        sp.cd = 45;
        Sound.sfx('boom');
        break;
      case 'reflect':
        this.reflectT = 240;
        sp.cd = 30;
        Sound.sfx('restore');
        break;
      case 'gravity': {
        const [ox, oy] = this.orient(0, -80);
        this.grav = { x: clamp(p.x + ox, 20, W - 20), y: clamp(p.y + oy, 20, H - 30), t: 180 };
        sp.cd = 45;
        Sound.sfx('charge');
        break;
      }
      case 'pod':
        this.podT = 720;
        sp.cd = 30;
        Sound.sfx('transform');
        break;
      case 'hyper':
        this.hyperT = 360;
        sp.cd = 30;
        Sound.sfx('levelup');
        break;
    }
  },

  // TET enzymes strip methyl marks: every silenced form comes back and beams on screen stop.
  tetBurst() {
    const p = this.player;
    this.tetT = 20;
    for (let f = 0; f < 3; f++) if (p.silenced[f]) this.restoreForm(f);
    for (const e of this.enemies) {
      e.holding = -1;
      if (e.state === 'beam') e.beamT = Math.max(e.beamT, 160);
      if (e.phase === 'beam') e.beamT = Math.max(e.beamT, 150);
    }
    if (this.boss && this.boss.beamT > 0) { this.boss.beamT = 0; this.boss.beamCd = 200; }
    Sound.sfx('restore');
  },

  // Where the Wingman drone flies: behind and to one side of the ship.
  wingOffset() { return this.orient(-26, 10); },
  // The Force Pod rides just ahead of the nose.
  podOffset() { return this.orient(0, -22); },

  // The lasting specials that touch bullets and planes (called from collide()).
  specialCollide() {
    const p = this.player;
    if (!p.alive) return;
    if (this.reflectT > 0) {   // REFLECT FIELD: close bullets turn round and become ours
      for (const b of this.eBul) {
        if (b.dead || Math.hypot(b.x - p.x, b.y - p.y) > 26) continue;
        b.dead = true;
        this.pBul.push({ x: b.x, y: b.y, vx: -b.vx * 1.6, vy: -b.vy * 1.6, kind: 'spread', dmg: this.gunPower(), form: -1 });
      }
    }
    if (this.podT > 0) {       // FORCE POD: blocks bullets, grinds planes it touches
      const [ox, oy] = this.podOffset(), x = p.x + ox, y = p.y + oy;
      for (const b of this.eBul) if (!b.dead && Math.hypot(b.x - x, b.y - y) < 8) { b.dead = true; this.spark(b.x, b.y, C.orange, 2); }
      if (this.t % 4 === 0) for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - x, e.y - y) < 14) this.damageEnemy(e, 0.5 * this.gunPower(), -1);
    }
    const G = this.grav;
    if (G) {                    // GRAVITY BOMB: pulls in flying planes and bullets, crushes what reaches the middle
      for (const b of this.eBul) {
        const dx = G.x - b.x, dy = G.y - b.y, d = Math.hypot(dx, dy);
        if (d < 10) b.dead = true; else if (d < 110) { b.x += dx / d * 2; b.y += dy / d * 2; }
      }
      for (const e of this.enemies) {
        if (e.dead) continue;
        const dx = G.x - e.x, dy = G.y - e.y, d = Math.hypot(dx, dy);
        if (e.state !== 'form' && e.beh !== 'ground' && e.beh !== 'tank' && d < 100 && d > 2) { e.x += dx / d * 1.2; e.y += dy / d * 1.2; }
        if (d < 20 && this.t % 4 === 0) this.damageEnemy(e, 0.6 * this.gunPower(), -1);
      }
      if (this.t % 6 === 0) {
        const B = this.boss;
        if (B && !B.dying && !B.entering) for (const pt of B.parts) if (!pt.dead && Math.hypot(pt.x - G.x, pt.y - G.y) < 40 + pt.r) this.damageBossPart(pt, 1, -1, pt.x, pt.y);
        for (const q of this.capitalOnScreen()) if (Math.hypot(q.x - G.x, q.y - G.y) < 40 + q.r) this.damageCapTarget(q, 1, -1, q.x, q.y);
      }
    }
  },

  drawWingman(ctx) {
    const p = this.player, [wx, wy] = this.wingOffset();
    NES.draw(ctx, this.isSide ? SPR.wingSide : SPR.wing, p.x + wx, p.y + wy);
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
    for (const q of this.capitalOnScreen()) this.damageCapTarget(q, 8, -1, q.x, q.y);
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
    if (this.wingT > 0) this.wingT--;
    if (this.tetT > 0) this.tetT--;
    for (const k of ['chronoT', 'empT', 'reflectT', 'podT', 'hyperT']) if (this[k] > 0) this[k]--;
    if (this.grav && --this.grav.t <= 0) { this.explode(this.grav.x, this.grav.y, 16, [C.violet, C.purple, C.white]); this.grav = null; }
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
    for (const q of this.capitalOnScreen()) if (this.inLaser(q.x, q.y, q.r)) this.damageCapTarget(q, 1, -1, q.x, q.y);
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
    if (this.chronoT > 0 && (this.chronoT > 60 || (this.t >> 2) & 1)) {   // a blue cast over the world
      SNES.half(ctx, () => { ctx.fillStyle = '#1830a0'; ctx.fillRect(0, 0, W, H); }, 0.18);
    }
    if (this.empT > 0 && this.t % 3 === 0) for (const e of this.enemies) if (Math.random() < 0.2) this.spark(e.x, e.y, C.ice, 1);
    if (p.alive && this.reflectT > 0 && (this.reflectT > 60 || (this.t >> 2) & 1)) {
      for (let k = 0; k < 24; k++) {
        const a = k / 24 * TAU - this.t * 0.1;
        ctx.fillStyle = k % 3 ? C.white : C.lgray;
        ctx.fillRect(Math.round(p.x + Math.cos(a) * 22), Math.round(p.y + Math.sin(a) * 22), 1, 1);
      }
    }
    if (p.alive && this.podT > 0 && (this.podT > 90 || (this.t >> 2) & 1)) {
      const [ox, oy] = this.podOffset(), x = p.x + ox, y = p.y + oy;
      SNES.add(ctx, () => NES.draw(ctx, SNES.glow(6 + ((this.t >> 2) & 1), '#a04810'), x, y));
      NES.draw(ctx, SNES.sphere(4, C.orange), x, y);
      ctx.fillStyle = C.white; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 2, 2, 1);
    }
    if (p.alive && this.hyperT > 0 && this.t % 3 === 0) this.spark(p.x + rand(-6, 6), p.y + rand(-6, 6), C.gold, 1);
    const G = this.grav;
    if (G) {                                     // a black core in a swirl of violet
      for (let k = 0; k < 30; k++) {
        const a = k / 30 * TAU + this.t * 0.15, r = 8 + ((k * 7 + this.t) % 24);
        ctx.fillStyle = k % 2 ? C.violet : C.purple;
        ctx.fillRect(Math.round(G.x + Math.cos(a) * r), Math.round(G.y + Math.sin(a) * r), 1, 1);
      }
      NES.disc(ctx, G.x, G.y, 6, C.black);
      NES.disc(ctx, G.x, G.y, 3, '#100020');
    }
    if (p.alive && p.shieldT > 0 && (p.shieldT > 60 || (this.t >> 2) & 1)) {
      for (let k = 0; k < 20; k++) {
        const a = k / 20 * TAU + this.t * 0.08;
        ctx.fillStyle = k % 2 ? C.aqua : C.lime;
        ctx.fillRect(Math.round(p.x + Math.cos(a) * 12), Math.round(p.y + Math.sin(a) * 12), 2, 2);
      }
    }
    if (this.tetT > 0) {
      const r = (20 - this.tetT) * 12;
      ctx.fillStyle = (this.t >> 1) & 1 ? C.lime : C.mint;
      for (let k = 0; k < 40; k++) {
        const a = k / 40 * TAU;
        ctx.fillRect(Math.round(p.x + Math.cos(a) * r), Math.round(p.y + Math.sin(a) * r), 2, 2);
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
    const center = { align: 'center' }, L = this.camp.learned, top = this.listTop(L.length, this.hangarSel, 5), H = this.hullDef();
    NES.box(ctx, 16, 30, 224, 176, C.black, C.gold);
    NES.text(ctx, 'HANGAR: MISSION LOADOUT', 128, 38, C.gold, center);
    NES.text(ctx, 'PICK ONE SPECIAL WEAPON.', 128, 52, C.white, center);
    NES.text(ctx, H.guns.map(g => GUNS[g].short).join(' / '), 128, 64, C.lgray, center);
    L.slice(top, top + 5).forEach((idx, j) => {
      const i = top + j, s = SPECIALS[idx], y = 82 + j * 13, sel = i === this.hangarSel;
      if (sel) NES.hilite(ctx, 22, y - 3, 212, 13);
      if (sel && (this.t >> 3) & 1) NES.text(ctx, '>', 24, y, C.gold);
      NES.draw(ctx, SPR.specialIcons[idx], 40, y + 3);
      NES.text(ctx, s.name, 52, y, sel ? C.white : C.gray);
      NES.text(ctx, 'X' + this.specialAmmo(), 228, y, sel ? s.color : C.gray, { align: 'right' });
    });
    if (L.length > 5) NES.text(ctx, (this.hangarSel + 1) + '/' + L.length, 234, 64, C.gray, { align: 'right' });
    SPECIALS[L[this.hangarSel]].desc.forEach((l, i) => NES.text(ctx, l, 128, 158 + i * 10, C.aqua, center));
    NES.text(ctx, 'FIRE IT WITH: C KEY / PAD B', 128, 180, C.lgray, center);
    if ((this.t >> 4) & 1) NES.text(ctx, 'SPACE / A: LAUNCH', 128, 193, C.white, center);
  },

  // Tap a row to pick it; tap the picked row again to launch.
  tapHangar(x, y) {
    const L = this.camp.learned, i = this.listTop(L.length, this.hangarSel, 5) + Math.floor((y - 79) / 13);
    if (i < 0 || i >= L.length || y < 79 || y > 79 + 13 * 5) return;
    if (i === this.hangarSel) this.launchHangar(); else { this.hangarSel = i; Sound.sfx('move'); }
  },

  // First visible row of a scrolling list of n rows showing vis at a time, keeping sel in view.
  listTop(n, sel, vis) { return clamp(sel - (vis >> 1), 0, Math.max(0, n - vis)); },
});
