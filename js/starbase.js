'use strict';
// Starbase: where the carrier docks in each sector. Pick a planet mission, buy upgrades and hulls,
// check the pilot's status, or open the galaxy map to travel. Also the LEARN SPECIAL screen that
// follows a level-up at levels 2, 5 and 8.
// Menus follow the NES pad: D-pad to choose, A to pick, B to go back.

const UPGRADES = [
  { key: 'weapons', label: 'WEAPONS +1', desc: 'SHOTS HIT HARDER.' },
  { key: 'shields', label: 'SHIELDS +1', desc: 'TAKE ONE MORE HIT.' },
  { key: 'special', label: 'SPECIAL +1', desc: 'ONE MORE SPECIAL PER LEG.' },
];
const upgradePrice = n => 600 * (n + 1);   // each purchase of the same stat costs more

Object.assign(Game, {
  baseUI: null, learnSel: 0,

  // Rows for the current page: { label, right, col, act, info }.
  baseItems() {
    const U = this.baseUI, c = this.camp, S = this.sectorDef();
    const back = { label: 'BACK', act: () => this.basePage('main') };
    if (U.page === 'main') {
      return [
        { label: 'MISSIONS', act: () => this.basePage('missions'), info: 'FLY A MISSION IN ' + S.name + '.' },
        { label: 'SHOP', act: () => this.basePage('shop'), info: 'UPGRADES AND SHIP HULLS.' },
        { label: 'STATUS', act: () => this.basePage('status'), info: 'PILOT, SHIP AND SPECIALS.' },
        { label: 'GALAXY MAP', act: () => this.openMap(), info: 'TRAVEL TO ANOTHER SECTOR.' },
        { label: 'SAVE AND QUIT', act: () => { this.saveCampaign(); this.toTitle(); }, info: 'PROGRESS SAVES AT EVERY DOCKING.' },
      ];
    }
    if (U.page === 'missions') {
      return [...S.planets.map((P, i) => {
        const done = c.cleared[P.id];
        const flyover = P.order === 'sv';
        const boss = flyover ? CAPITALS[P.capital || S.capital].name : BOSSES[P.boss || S.boss].name;
        const how = flyover ? 'SIDE, THEN FLYOVER: ' : (P.approach === 'challenge' ? 'BONUS ' : '') + 'VERTICAL, THEN SIDE: ';
        return { label: P.name, right: done ? 'CLEAR' : 'NEW', col: done ? C.lime : C.gold,
          act: () => this.startMission(i), info: how + boss + (done ? '. HALF PAY.' : '.') };
      }), back];
    }
    if (U.page === 'shop') {
      const rows = UPGRADES.map(u => {
        const max = this.statOf(u.key) >= STAT_CAP, price = upgradePrice(c.up[u.key]);
        return { label: u.label, right: max ? 'MAX' : price + ' CR', col: max ? C.gray : c.money >= price ? C.white : C.gray,
          info: u.desc + ' NOW ' + this.statOf(u.key) + '.', act: () => this.buyUpgrade(u.key) };
      });
      HULLS.forEach((h, i) => {
        const owned = c.hulls.includes(i), sold = SECTORS.some(q => q.id === S.id && q.hull === i);
        if (!owned && !sold) return;
        const mods = ['WPN', 'SHD', 'SPC'].map((t, k) => {
          const v = h[['weapons', 'shields', 'special'][k]];
          return v ? t + (v > 0 ? '+' : '') + v : '';
        }).filter(Boolean).join(' ');
        rows.push({ label: h.name, right: i === c.hull ? 'IN USE' : owned ? 'EQUIP' : h.price + ' CR',
          col: i === c.hull ? C.lime : owned || c.money >= h.price ? C.aqua : C.gray,
          info: (mods || 'NO STAT CHANGES') + ' SPEED ' + Math.round(h.speed * 100) + '%',
          act: () => this.buyHull(i) });
      });
      return [...rows, back];
    }
    return [back];   // status
  },

  basePage(page) {
    this.baseUI = { page, sel: 0 };
    Sound.sfx('move');
  },

  updateBase() {
    this.stateT++;
    const U = this.baseUI, items = this.baseItems(), n = items.length;
    if (Input.just('up')) { U.sel = (U.sel + n - 1) % n; Sound.sfx('move'); }
    if (Input.just('down')) { U.sel = (U.sel + 1) % n; Sound.sfx('move'); }
    if (U.page !== 'main' && (Input.just('back') || Input.just('special'))) { this.basePage('main'); return; }
    if (this.stateT > 10 && (Input.just('fire') || Input.just('start'))) {
      Sound.sfx('select');
      items[U.sel].act();
    }
  },

  buyUpgrade(key) {
    const c = this.camp, price = upgradePrice(c.up[key]);
    if (this.statOf(key) >= STAT_CAP) { Sound.sfx('denied'); return; }
    if (c.money < price) { Sound.sfx('denied'); this.toast('NOT ENOUGH CREDITS'); return; }
    c.money -= price;
    c.up[key]++;
    Sound.sfx('cash');
    this.saveCampaign();
  },

  buyHull(i) {
    const c = this.camp, h = HULLS[i];
    if (c.hull === i) return;
    if (!c.hulls.includes(i)) {
      if (c.money < h.price) { Sound.sfx('denied'); this.toast('NOT ENOUGH CREDITS'); return; }
      c.money -= h.price;
      c.hulls.push(i);
      Sound.sfx('cash');
    }
    c.hull = i;
    this.toast(h.name + ' READY');
    this.saveCampaign();
  },

  // ---- Drawing ------------------------------------------------------------------------
  // The starbase with the carrier docked alongside. oy shifts it down (behind briefings).
  drawBaseScene(ctx, oy = 0) {
    const S = this.sectorDef(), t = this.t;
    ctx.save();
    ctx.translate(0, oy);
    NES.disc(ctx, 228, 24, 9, S.col);                  // the sector's star
    NES.disc(ctx, 226, 22, 4, C.white);
    const hx = 84, hy = 62;
    ctx.fillStyle = C.blue;                            // solar panels
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) ctx.fillRect(hx + s * (48 + k * 9) - (s < 0 ? 8 : 0), hy - 20, 8, 12);
      ctx.fillStyle = C.gray; ctx.fillRect(hx + (s < 0 ? -76 : 44), hy - 15, 32, 1); ctx.fillStyle = C.blue;
    }
    for (let k = 0; k < 64; k++) {                     // habitat ring
      const a = k / 64 * TAU;
      ctx.fillStyle = k % 8 === (t >> 3) % 8 ? C.yellow : C.lgray;
      ctx.fillRect(Math.round(hx + Math.cos(a) * 42), Math.round(hy + Math.sin(a) * 11), 2, 2);
    }
    ctx.fillStyle = C.gray;
    ctx.fillRect(hx - 42, hy, 84, 1); ctx.fillRect(hx, hy - 11, 1, 22);   // spokes
    NES.disc(ctx, hx, hy, 12, C.lgray);
    NES.disc(ctx, hx, hy, 9, C.gray);
    ctx.fillStyle = C.sky; ctx.fillRect(hx - 6, hy - 2, 12, 3);
    ctx.fillStyle = (t >> 4) & 1 ? C.red : C.darkred; ctx.fillRect(hx - 1, hy - 16, 2, 2);
    ctx.fillStyle = C.gray; ctx.fillRect(hx + 12, hy + 14, 60, 3);    // docking arm
    ctx.fillStyle = C.lgray; ctx.fillRect(hx + 12, hy + 14, 60, 1);
    this.drawCarrierSide(ctx, 176, 88, false);
    ctx.restore();
  },

  drawBase(ctx) {
    const S = this.sectorDef(), U = this.baseUI, c = this.camp, items = this.baseItems();
    this.drawBaseScene(ctx);
    NES.text(ctx, S.base, 6, 4, C.white);
    NES.text(ctx, S.name + (c.loop ? ' ECHO ' + c.loop : ''), 6, 13, S.col);
    NES.box(ctx, 4, 112, 248, 124, C.black, S.col);
    NES.text(ctx, c.money + ' CR', 10, 117, C.gold);
    NES.text(ctx, 'LV ' + c.level, 128, 117, C.lime, { align: 'center' });
    NES.text(ctx, PILOTS[c.pilot].name, 246, 117, PILOTS[c.pilot].col, { align: 'right' });
    ctx.fillStyle = C.navy; ctx.fillRect(5, 126, 246, 1);
    if (U.page === 'status') { this.drawStatus(ctx); return; }
    const title = { main: 'STARBASE', missions: 'MISSIONS', shop: 'SHOP' }[U.page];
    NES.text(ctx, title, 128, 130, C.gold, { align: 'center' });
    const step = items.length > 7 ? 9 : 11;
    items.forEach((it, i) => {
      const y = 142 + i * step, sel = i === U.sel;
      if (sel) { ctx.fillStyle = C.navy; ctx.fillRect(10, y - 2, 236, step - 1); }
      if (sel && (this.t >> 3) & 1) NES.text(ctx, '>', 12, y, C.gold);
      NES.text(ctx, it.label, 22, y, sel ? C.white : it.col === C.gray ? C.gray : C.lgray);
      if (it.right) NES.text(ctx, it.right, 242, y, it.col || C.white, { align: 'right' });
    });
    const info = items[U.sel].info;
    if (info) NES.wrap(info, 30).slice(0, 2).forEach((l, i) => NES.text(ctx, l, 10, 214 + i * 9, C.aqua));
  },

  drawStatus(ctx) {
    const c = this.camp, pl = PILOTS[c.pilot];
    ctx.fillStyle = C.navy; ctx.fillRect(10, 132, 26, 26);
    ctx.drawImage(SPR.pilots[c.pilot], 11, 133);
    this.drawShip(ctx, 0, 50, 145, 0, false, true);
    NES.text(ctx, this.hullDef().name, 66, 136, C.white);
    NES.text(ctx, 'SPEED ' + Math.round(this.speedMul() * 100) + '%', 66, 146, C.lgray);
    this.drawXpBar(ctx, 10, 162);
    const stats = [['WEAPONS', 'weapons', C.red], ['SHIELDS', 'shields', C.sky], ['SPECIAL', 'special', C.gold]];
    stats.forEach(([label, key, col], k) => {
      const y = 175 + k * 10, v = this.statOf(key);
      NES.text(ctx, label, 10, y, C.white);
      for (let s = 0; s < STAT_CAP; s++) {
        ctx.fillStyle = s < v ? col : C.navy;
        ctx.fillRect(66 + s * 8, y, 7, 7);
      }
      NES.text(ctx, String(v), 170, y, C.white);
    });
    NES.text(ctx, 'SPECIALS', 10, 207, C.gold);
    if (!c.learned.length) NES.text(ctx, 'NONE YET. LEARN AT LV 2.', 80, 207, C.gray);
    c.learned.forEach((idx, i) => {
      NES.draw(ctx, SPR.specialIcons[idx], 84 + i * 50, 210);
      NES.text(ctx, SPECIALS[idx].short, 92 + i * 50, 207, SPECIALS[idx].color);
    });
    if ((this.t >> 4) & 1) NES.text(ctx, 'B: BACK', 246, 224, C.gray, { align: 'right' });
  },

  // ---- Learn a special (after reaching level 2, 5 or 8) ----------------------------------
  openLearn() {
    this.setState('learn');
    this.learnSel = 0;
    Sound.sfx('levelup');
  },

  learnable() { return SPECIALS.map((s, i) => i).filter(i => !this.camp.learned.includes(i)); },

  updateLearn() {
    this.stateT++;
    const L = this.learnable(), n = L.length;
    if (Input.just('up')) { this.learnSel = (this.learnSel + n - 1) % n; Sound.sfx('move'); }
    if (Input.just('down')) { this.learnSel = (this.learnSel + 1) % n; Sound.sfx('move'); }
    if (this.stateT < 20 || !(Input.just('fire') || Input.just('start'))) return;
    const c = this.camp;
    c.learned.push(L[this.learnSel]);
    c.learnQ--;
    this.lastSpecial = L[this.learnSel];
    Sound.sfx('restore');
    this.toast(SPECIALS[L[this.learnSel]].name + ' LEARNED');
    if (c.learnQ > 0 && this.learnable().length) this.openLearn();
    else { c.learnQ = 0; this.leaveDebrief(); }
  },

  drawLearn(ctx) {
    const center = { align: 'center' }, L = this.learnable();
    NES.text(ctx, 'LEVEL ' + this.camp.level + '!', 128, 20, C.lime, { align: 'center', scale: 2, shadow: C.dgreen });
    NES.text(ctx, 'LEARN A NEW SPECIAL ATTACK', 128, 44, C.white, center);
    NES.text(ctx, 'YOU KEEP IT FOR GOOD.', 128, 54, C.lgray, center);
    L.forEach((idx, i) => {
      const s = SPECIALS[idx], y = 74 + i * 16, sel = i === this.learnSel;
      if (sel) { ctx.fillStyle = C.navy; ctx.fillRect(22, y - 4, 212, 15); }
      if (sel && (this.t >> 3) & 1) NES.text(ctx, '>', 24, y, C.gold);
      NES.draw(ctx, SPR.specialIcons[idx], 40, y + 3);
      NES.text(ctx, s.name, 52, y, sel ? s.color : C.gray);
    });
    const s = SPECIALS[L[this.learnSel]];
    if (s) s.desc.forEach((l, i) => NES.text(ctx, l, 128, 180 + i * 10, C.aqua, center));
    if ((this.t >> 4) & 1) NES.text(ctx, 'SPACE / A: LEARN', 128, 222, C.white, center);
  },
});
