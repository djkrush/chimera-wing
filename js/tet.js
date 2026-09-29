'use strict';
// TET capsules. TET enzymes start the removal of methyl marks from DNA, so a capsule
// demethylates one silenced form. Acetylated (gold) planes sometimes drop one.
// Capsules drift backward: down in vertical stages, left in side missions.

Object.assign(Game, {
  dropTet(e) {
    const p = this.player;
    const need = p.silenced.some(s => s);
    if (Math.random() >= (need ? 0.6 : 0.2)) return;
    const [vx, vy] = this.orient(0, 0.7);
    this.pickups.push({ x: e.x, y: e.y, vx, vy, t: 0 });
  },

  updatePickups() {
    const p = this.player;
    for (const q of this.pickups) {
      q.t++;
      q.x += q.vx;
      q.y += q.vy;
      if (q.x < -8 || q.x > W + 8 || q.y > H + 8) q.dead = true;
      else if (p.alive && Math.abs(q.x - p.x) < 13 && Math.abs(q.y - p.y) < 13) { q.dead = true; this.collectTet(q); }
    }
    this.pickups = this.pickups.filter(q => !q.dead);
  },

  collectTet(q) {
    const p = this.player;
    // Prefer a form no methylator is carrying: shooting the carrier gets that one back anyway.
    const held = new Set(this.enemies.filter(e => !e.dead && e.holding >= 0).map(e => e.holding));
    const silenced = [0, 1, 2].filter(f => p.silenced[f]);
    const f = silenced.find(g => !held.has(g)) ?? silenced[0];
    this.spark(q.x, q.y, C.lime, 8);
    if (f === undefined) {
      this.addScore(1000);
      this.popup(q.x, q.y - 8, 'TET 1000', C.lime);
      Sound.sfx('select');
      this.hint('tetSpare');
      return;
    }
    for (const e of this.enemies) if (e.holding === f) e.holding = -1;
    this.restoreForm(f);
    this.hint('tet');
  },

  drawPickups(ctx) {
    for (const q of this.pickups) {
      if (q.t > 20 && q.t % 16 < 3) continue;   // blink so it stands out from bullets
      NES.draw(ctx, SPR.tet, q.x, q.y);
    }
  },
});
