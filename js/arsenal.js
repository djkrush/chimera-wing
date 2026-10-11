'use strict';
// The arsenal: ordnance and modules, bought at planet markets (starbase.js) and fitted in the hangar
// (specials.js).
// ORDNANCE is bought by the rack (uses) into camp.ord[id] and fired with the special button instead
// of a special. At launch the hangar loads up to `carry` of the fitted kind and takes it out of stock;
// what's left comes back after a completed mission, and a failed one loses it (U.N. Squadron: buying
// is a bet). hulls: the hulls that can carry it (null = every hull).
// MODULES are permanent parts: buy each once (camp.mods) and fit one per mission (camp.mod). Barriers
// soak hits before the shields (Darius Twin's blue, silver and gold grades); escorts fly with you
// (1942's side fighters, Gradius's trailing and rotating options). Both refill at every takeoff.

const ORDNANCE = [
  { id: 'missile1', name: 'MISSILE POD I', short: 'MSL1', family: 'missile', n: 3, uses: 3, carry: 6, price: 300, gal: 1, hulls: [6, 8],
    desc: '3 HOMING MISSILES A USE.' },
  { id: 'missile2', name: 'MISSILE POD II', short: 'MSL2', family: 'missile', n: 5, uses: 3, carry: 6, price: 750, gal: 1, hulls: [6, 8],
    desc: '5 HOMING MISSILES A USE.' },
  { id: 'missile3', name: 'MISSILE POD III', short: 'MSL3', family: 'missile', n: 7, uses: 3, carry: 6, price: 1500, gal: 2, hulls: [6, 8],
    desc: '7 HOMING MISSILES A USE.' },
  { id: 'bomb1', name: 'BOMB RACK I', short: 'BMB1', family: 'bomb', n: 1, blast: 30, uses: 3, carry: 6, price: 360, gal: 0, hulls: [0, 2, 4, 6, 7],
    desc: 'A HEAVY BOMB THAT FALLS.' },
  { id: 'bomb2', name: 'BOMB RACK II', short: 'BMB2', family: 'bomb', n: 2, blast: 36, uses: 3, carry: 6, price: 900, gal: 1, hulls: [0, 2, 4, 6, 7],
    desc: '2 BOMBS, A WIDER BLAST.' },
  { id: 'bomb3', name: 'BOMB RACK III', short: 'BMB3', family: 'bomb', n: 3, blast: 42, uses: 3, carry: 6, price: 1800, gal: 2, hulls: [0, 2, 4, 6, 7],
    desc: '3 BOMBS, THE WIDEST BLAST.' },
  { id: 'cluster', name: 'CLUSTER POD', short: 'CLU', family: 'cluster', n: 3, uses: 3, carry: 6, price: 600, gal: 0, hulls: null,
    desc: '3 BOMBS THAT BURST INTO 8.' },
  { id: 'cell', name: 'SHIELD CELL', short: 'CELL', family: 'cell', uses: 2, carry: 3, price: 800, gal: 0, hulls: null,
    desc: 'FIXES 1 SHIELD IN FLIGHT.' },
];
const ORD_BY_ID = Object.fromEntries(ORDNANCE.map(o => [o.id, o]));

const MODULES = [
  { id: 'barrier1', name: 'BARRIER I', kind: 'barrier', hits: 1, price: 2500, gal: 0, desc: 'A BLUE RING SOAKS 1 HIT.' },
  { id: 'barrier2', name: 'BARRIER II', kind: 'barrier', hits: 2, price: 9000, gal: 1, desc: 'A SILVER RING SOAKS 2 HITS.' },
  { id: 'barrier3', name: 'BARRIER III', kind: 'barrier', hits: 3, price: 22000, gal: 2, desc: 'A GOLD RING SOAKS 3 HITS.' },
  { id: 'fighters', name: 'SIDE FIGHTERS', kind: 'escort', price: 4000, gal: 0, desc: 'TWO FIGHTERS FIRE WITH YOU. A HIT DOWNS ONE.' },
  { id: 'trail', name: 'OPTION TRAIL', kind: 'escort', price: 6000, gal: 1, desc: 'AN ORB TRAILS YOU AND COPIES YOUR SHOTS.' },
  { id: 'orbit', name: 'ORBIT OPTION', kind: 'escort', price: 12000, gal: 1, desc: 'AN ORB CIRCLES YOU AND BLOCKS BULLETS.' },
];
const MODULE_BY_ID = Object.fromEntries(MODULES.map(m => [m.id, m]));
const BARRIER_COLS = [[C.sky, C.blue], [C.white, C.lgray], [C.yellow, C.gold]];   // grade I, II, III
const TRAIL_LAG = 16;   // frames of movement the option trail runs behind

Object.assign(Game, {
  barrier: 0, barrierMax: 0, sideFtr: [false, false], trail: [], orbitA: 0,

  // ---- Stock ----------------------------------------------------------------------------
  ordAllowed(id, h = this.camp.hull) { const o = ORD_BY_ID[id]; return !o.hulls || o.hulls.includes(h); },
  // How many go up at launch: its carry limit, and one more rack for DRAC.
  ordCarry(id) { const o = ORD_BY_ID[id]; return o.carry + (this.hasPerk('rack') ? o.uses : 0); },
  ordStock(id) { return (this.camp.ord && this.camp.ord[id]) || 0; },
  fittedModule() { const c = this.camp; return c && c.mod && (c.mods || []).includes(c.mod) ? MODULE_BY_ID[c.mod] : null; },

  // ---- Ordnance in flight -----------------------------------------------------------------
  // One use of the fitted ordnance. Returns false when it did nothing (a shield cell at full shields).
  useOrdnance(sp) {
    const o = ORD_BY_ID[sp.ord], p = this.player, k = this.gunPower();
    switch (o.family) {
      case 'missile':
        for (let i = 0; i < o.n; i++) {
          const hd = -Math.PI / 2 + (i - (o.n - 1) / 2) * 0.3;
          this.shoot(0, -4, Math.cos(hd) * 1.5, Math.sin(hd) * 1.5, { hd, spd: 1.5, kind: 'missile', dmg: 2 * k, form: -1, life: 160, target: null });
        }
        sp.cd = 30; Sound.sfx('missile');
        break;
      case 'bomb':   // like the bomb gun, but heavier: forward in vertical stages, dropped in side missions
        for (let i = 0; i < o.n; i++) {
          const s = o.n === 1 ? 0 : (i / (o.n - 1)) * 2 - 1;
          const b = this.shoot(s * 8, -6, s * 0.8, -3, { kind: 'bomb', heavy: true, dmg: 4 * k, form: -1, life: 60, blast: o.blast });
          if (this.isSide) { b.vy = 0.8 + s * 0.5; b.grav = true; b.life = 200; }
        }
        sp.cd = 30; Sound.sfx('missile');
        break;
      case 'cluster':
        for (const vx of [-1, 0, 1]) this.shoot(0, -8, vx, -3.5, { kind: 'cluster', dmg: 3, form: -1, life: 34 });
        sp.cd = 15; Sound.sfx('missile');
        break;
      case 'cell':
        if (this.shields >= this.maxShields()) { this.popup(p.x, p.y - 14, 'SHIELDS FULL', C.gray); sp.cd = 20; return false; }
        this.shields++;
        this.popup(p.x, p.y - 16, 'SHIELD +1', C.sky);
        this.spark(p.x, p.y, C.sky, 8);
        sp.cd = 30; Sound.sfx('oneup');
        break;
    }
    this.shots += o.n || 0;
    return true;
  },

  // A completed mission: the ordnance you didn't fire goes back into stock. Returns how many.
  returnOrdnance() {
    const sp = this.special;
    if (!sp || !sp.ord || sp.ammo <= 0) return 0;
    const n = sp.ammo;
    this.camp.ord[sp.ord] = this.ordStock(sp.ord) + n;
    sp.ammo = 0;
    return n;
  },

  // ---- Modules in flight ------------------------------------------------------------------
  // Every takeoff: the barrier is back at full strength and lost side fighters rejoin.
  setupModule() {
    const M = this.fittedModule(), p = this.player;
    this.barrierMax = this.barrier = M && M.kind === 'barrier' ? M.hits : 0;
    this.sideFtr = M && M.id === 'fighters' ? [true, true] : [false, false];
    const [bx, by] = this.orient(0, TRAIL_LAG);
    this.trail = Array.from({ length: TRAIL_LAG }, () => ({ x: p.x + bx, y: p.y + by }));
    this.orbitA = 0;
  },

  sideFtrOffset(i) { return this.orient(i ? 20 : -20, 4); },
  trailPos() { return this.trail[0] || this.player; },
  optionOrbitPos() { const p = this.player; return { x: p.x + Math.cos(this.orbitA) * 22, y: p.y + Math.sin(this.orbitA) * 22 }; },

  // A barrier hit: called by takeHit() before the shields are touched.
  barrierHit() {
    const p = this.player;
    this.barrier--;
    p.invuln = 90;
    this.spark(p.x, p.y, BARRIER_COLS[this.barrierMax - 1][0], 10);
    this.popup(p.x, p.y - 16, this.barrier ? 'BARRIER -1' : 'BARRIER DOWN', this.barrier ? C.sky : C.orange);
    Sound.sfx('armor');
  },

  updateModule() {
    const M = this.fittedModule(), p = this.player;
    if (!M || !p.alive) return;
    if (M.id === 'trail') {   // the orb follows the path you flew, and waits when you stop
      const last = this.trail[this.trail.length - 1];
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= 1) { this.trail.push({ x: p.x, y: p.y }); if (this.trail.length > TRAIL_LAG) this.trail.shift(); }
    }
    if (M.id === 'orbit') this.orbitA = (this.orbitA + 0.09) % TAU;
  },

  // Called from shoot(): the option trail copies every gun shot at half damage.
  moduleCopy(b) {
    const M = this.fittedModule();
    if (!M || M.id !== 'trail') return;
    const q = this.trailPos(), p = this.player;
    this.pBul.push({ ...b, x: b.x + q.x - p.x, y: b.y + q.y - p.y, dmg: b.dmg * 0.5, dmg0: b.dmg0 && b.dmg0 * 0.5, hit: b.hit && [], copy: true });
  },

  // Called from fireWeapon(): each side fighter still flying fires a bolt.
  moduleFire(k, f) {
    if (!this.sideFtr[0] && !this.sideFtr[1]) return;
    if (this.t - (this.ftrShotT || -99) < 8) return;
    this.ftrShotT = this.t;
    const p = this.player, [vx, vy] = this.orient(0, -6.5);
    for (const i of [0, 1]) {
      if (!this.sideFtr[i]) continue;
      const [ox, oy] = this.sideFtrOffset(i);
      this.pBul.push({ x: p.x + ox, y: p.y + oy, vx, vy, kind: 'shot', dmg: 0.6 * k, form: f, copy: true });
    }
  },

  // Called from collide(): side fighters are shot down, the orbit option blocks bullets and grinds planes.
  moduleCollide() {
    const M = this.fittedModule(), p = this.player;
    if (!M || !p.alive || p.hidden) return;
    if (M.id === 'fighters') {
      for (const i of [0, 1]) {
        if (!this.sideFtr[i]) continue;
        const [ox, oy] = this.sideFtrOffset(i), x = p.x + ox, y = p.y + oy;
        const b = this.eBul.find(q => !q.dead && Math.abs(q.x - x) < 5 && Math.abs(q.y - y) < 5);
        if (!b) continue;
        b.dead = true;
        this.sideFtr[i] = false;
        this.explode(x, y, 10, [C.white, C.sky, C.orange]);
        this.popup(x, y - 10, 'FIGHTER DOWN', C.orange);
        Sound.sfx('explode');
      }
    }
    if (M.id === 'orbit') {
      const { x, y } = this.optionOrbitPos();
      for (const b of this.eBul) if (!b.dead && Math.hypot(b.x - x, b.y - y) < 7) { b.dead = true; this.spark(b.x, b.y, C.orange, 2); }
      if (this.t % 4 === 0) for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - x, e.y - y) < 12) this.damageEnemy(e, 0.5 * this.gunPower(), -1);
    }
  },

  // Gradius-style option: an orange orb with a banded glow.
  drawOption(ctx, x, y) {
    SNES.add(ctx, () => NES.draw(ctx, SNES.glow(6 + ((this.t >> 2) & 1), '#a04810'), x, y));
    NES.draw(ctx, SNES.sphere(3, C.orange), x, y);
  },

  // Darius Twin's shield: a ring in the grade's color that opens gaps as it wears and flickers on its last hit.
  drawBarrier(ctx, x, y) {
    if (this.barrier <= 0) return;
    if (this.barrier === 1 && this.barrierMax > 1 && !((this.t >> 2) & 1)) return;
    const [hi, lo] = BARRIER_COLS[this.barrierMax - 1], lost = this.barrierMax - this.barrier, N = 24;
    for (let k = 0; k < N; k++) {
      if (lost && k % (lost + 2) === 0) continue;   // gaps grow as hits land
      const a = k / N * TAU + this.t * 0.05;
      ctx.fillStyle = k % 2 ? hi : lo;
      ctx.fillRect(Math.round(x + Math.cos(a) * 15), Math.round(y + Math.sin(a) * 15), 2, 2);
    }
  },

  drawModule(ctx) {
    const M = this.fittedModule(), p = this.player;
    if (!M || !p.alive || p.hidden) return;
    if (M.kind === 'barrier') this.drawBarrier(ctx, p.x, p.y);
    if (M.id === 'fighters') {
      for (const i of [0, 1]) {
        if (!this.sideFtr[i]) continue;
        const [ox, oy] = this.sideFtrOffset(i);
        NES.draw(ctx, this.isSide ? SPR.wingSide : SPR.wing, p.x + ox, p.y + oy);
      }
    }
    if (M.id === 'trail') { const q = this.trailPos(); this.drawOption(ctx, q.x, q.y); }
    if (M.id === 'orbit') { const q = this.optionOrbitPos(); this.drawOption(ctx, q.x, q.y); }
  },
});
