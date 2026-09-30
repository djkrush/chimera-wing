'use strict';
// The star map, in three zoom levels: the universe (three galaxies), a galaxy (its four star systems
// and the routes between them) and a system (its star and up to ten planets on their orbits). A picks
// (zooming in, or flying the carrier to a planet), B zooms back out. Planets, systems and galaxies can
// also be tapped or clicked (tapMap). Carrier travel plays on the map level that fits the trip.

const MAP_ZOOM = 26;   // frames for a zoom between levels

Object.assign(Game, {
  mapUI: null, travel: null,

  openMap() {
    const P = this.planetHere(), S = SYSTEM_BY_ID[P.sys];
    this.mapUI = { level: 2, gal: S.galIndex, sys: GALAXIES[S.galIndex].systems.indexOf(S), sel: P.index, zoom: null };
    this.setState('map');
  },

  // Items on a map level: [{ x, y, open, obj }].
  mapItems(level) {
    const U = this.mapUI;
    if (level === 0) return GALAXIES.map(G => ({ x: G.x, y: G.y, open: this.galaxyOpen(G), obj: G }));
    if (level === 1) return GALAXIES[U.gal].systems.map(S => ({ x: S.x, y: S.y, open: this.systemOpen(S), obj: S }));
    const S = GALAXIES[U.gal].systems[U.sys], open = this.systemOpen(S);
    return S.planets.map((P, i) => ({ ...this.orbitPos(S, i), open, obj: P }));
  },

  // Planets circle their star slowly, on flattened ellipses (the plane seen at an angle).
  orbitPos(S, i) {
    const P = S.planets[i], rx = 30 + P.ring * (180 / Math.max(5, S.planets.length)), a = P.orbit.a + this.t * 0.0018 * 40 / rx;
    return { x: Math.round(CX + Math.cos(a) * rx), y: Math.round(100 + Math.sin(a) * rx * 0.36), rx };
  },

  mapZoom(into, x, y, fn) {
    const U = this.mapUI;
    U.zoom = { t: 0, into, x, y, from: U.level };
    fn();
    Sound.sfx(into ? 'select' : 'move');
  },

  updateMap() {
    this.stateT++;
    const U = this.mapUI;
    if (U.zoom) { if (++U.zoom.t >= MAP_ZOOM) U.zoom = null; return; }
    if (Input.just('back') || Input.just('special')) { this.mapBack(); return; }
    const items = this.mapItems(U.level);
    if (U.level === 2) {                                   // planets: step through them in orbit order
      const n = items.length;
      if (Input.just('left') || Input.just('up')) { U.sel = (U.sel + n - 1) % n; Sound.sfx('move'); }
      if (Input.just('right') || Input.just('down')) { U.sel = (U.sel + 1) % n; Sound.sfx('move'); }
    } else {
      const dirs = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
      for (const [key, [dx, dy]] of Object.entries(dirs)) {
        if (!Input.just(key)) continue;
        const cur = items[U.sel];
        let best = -1, bd = Infinity;
        items.forEach((q, i) => {
          const vx = q.x - cur.x, vy = q.y - cur.y, along = vx * dx + vy * dy;
          if (along <= 0) return;
          const d = along + Math.abs(vx * dy - vy * dx) * 2;
          if (d < bd) { bd = d; best = i; }
        });
        if (best >= 0) { U.sel = best; Sound.sfx('move'); }
      }
    }
    if (this.stateT > 10 && (Input.just('fire') || Input.just('start'))) this.mapPick();
  },

  mapPick() {
    const U = this.mapUI, it = this.mapItems(U.level)[U.sel], here = this.planetHere();
    if (!it.open) { Sound.sfx('denied'); this.toast(U.level === 0 ? 'GALAXY LOCKED' : 'SYSTEM LOCKED'); return; }
    if (U.level === 0) {
      this.mapZoom(true, it.x, it.y, () => {
        U.gal = U.sel; U.level = 1;
        const S = this.systemDef();
        U.sel = S.galIndex === U.gal ? GALAXIES[U.gal].systems.indexOf(S) : 0;
      });
    } else if (U.level === 1) {
      this.mapZoom(true, it.x, it.y, () => {
        U.sys = U.sel; U.level = 2;
        U.sel = here.sys === it.obj.id ? here.index : 0;
      });
    } else if (it.obj === here) { Sound.sfx('select'); this.setState('base'); }
    else { Sound.sfx('select'); this.startTravel(here.id, it.obj.id); }
  },

  mapBack() {
    const U = this.mapUI;
    if (U.level === 0) { Sound.sfx('move'); this.setState('base'); return; }
    const parent = this.mapItems(U.level - 1)[U.level === 2 ? U.sys : U.gal];
    this.mapZoom(false, parent.x, parent.y, () => { U.sel = U.level === 2 ? U.sys : U.gal; U.level--; });
  },

  // Touch or click on the map: pick the nearest item; a second tap on the selected one acts on it.
  tapMap(x, y) {
    const U = this.mapUI;
    if (U.zoom) return;
    if (x < 44 && y < 22) { this.mapBack(); return; }
    let best = -1, bd = 18 * 18;
    this.mapItems(U.level).forEach((q, i) => { const d = (q.x - x) ** 2 + (q.y - y) ** 2; if (d < bd) { bd = d; best = i; } });
    if (best < 0) return;
    if (best === U.sel) this.mapPick(); else { U.sel = best; Sound.sfx('move'); }
  },

  // ---- Carrier travel ----------------------------------------------------------------
  // The trip plays on the smallest map that shows both ends: a system, a galaxy or the universe.
  startTravel(from, to) {
    const A = PLANET_BY_ID[from], B = PLANET_BY_ID[to], SA = SYSTEM_BY_ID[A.sys], SB = SYSTEM_BY_ID[B.sys];
    const level = from === to || A.sys === B.sys ? 2 : SA.galIndex === SB.galIndex ? 1 : 0;
    this.travel = { from, to, level, dur: from === to ? 70 : level === 2 ? 120 : level === 1 ? 150 : 190 };
    this.mapUI = { level, gal: SB.galIndex, sys: GALAXIES[SB.galIndex].systems.indexOf(SB), sel: -1, zoom: null };
    this.inBase = false;
    this.setState('travel');
    Sound.playSong(Sound.SONGS.base);
    if (level === 0) Sound.sfx('takeoff');
  },

  updateTravel() {
    this.stateT++;
    const T = this.travel;
    const skip = this.stateT > 20 && (Input.just('fire') || Input.just('start'));
    if (this.stateT >= T.dur || skip) {
      this.camp.at = T.to;
      this.travel = null;
      this.arriveBase();
    }
  },

  // Where a planet's carrier marker sits on a map level.
  markerPos(level, id) {
    const P = PLANET_BY_ID[id], S = SYSTEM_BY_ID[P.sys];
    if (level === 0) return GALAXIES[S.galIndex];
    if (level === 1) return S;
    return this.orbitPos(S, P.index);
  },

  drawTravel(ctx) {
    const T = this.travel, B = PLANET_BY_ID[T.to], SB = SYSTEM_BY_ID[B.sys];
    const k = Math.min(1, this.stateT / (T.dur - 30)), e = k * k * (3 - 2 * k);
    const a = this.markerPos(T.level, T.from), b = this.markerPos(T.level, T.to);
    if (T.level === 0 && k > 0.1 && k < 0.9) this.drawWarp(ctx);
    this.drawMapLevel(ctx, T.level);
    this.drawCarrierIcon(ctx, a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e - 12);
    const msg = k < 1 && T.from !== T.to ? (T.level === 0 ? 'HYPERJUMP TO ' + GALAXIES[SB.galIndex].name
      : T.level === 1 ? 'JUMPING TO ' + SB.name : 'FLYING TO ' + B.name) : 'ORBITING ' + B.name;
    NES.box(ctx, OX + 8, 190, 240, 20, C.black, SB.col);
    if ((this.t >> 3) & 1 || k >= 1) NES.text(ctx, msg, CX, 196, C.white, { align: 'center' });
  },

  // Hyperjump: star streaks racing out from the center.
  drawWarp(ctx) {
    SNES.add(ctx, () => {
      for (let i = 0; i < 60; i++) {
        const a = i * 2.4, d = ((this.t * 4 + i * 37) % 240), len = 4 + d * 0.12;
        ctx.fillStyle = i % 3 ? '#3060c0' : '#a0d0f8';
        for (let s = 0; s < len; s += 1) ctx.fillRect(Math.round(CX + Math.cos(a) * (d + s)), Math.round(110 + Math.sin(a) * (d + s) * 0.6), 1, 1);
      }
    });
  },

  // ---- Drawing ------------------------------------------------------------------------
  drawMapScreen(ctx) {
    const U = this.mapUI, Z = U.zoom;
    if (Z) {
      // Zooming in: the parent view swells around the picked item, then the child view grows out of
      // it. Zooming out plays the same thing backwards.
      const k = Z.into ? Z.t / MAP_ZOOM : 1 - Z.t / MAP_ZOOM;
      const parent = Z.into ? Z.from : U.level, child = parent + 1;
      const s = k < 0.5 ? 1 + 10 * (k * 2) ** 2 : 0.1 + 0.9 * (k * 2 - 1);
      ctx.save();
      ctx.translate(Z.x, Z.y); ctx.scale(s, s); ctx.translate(-Z.x, -Z.y);
      this.drawMapLevel(ctx, k < 0.5 ? parent : child, true);
      ctx.restore();
      return;
    }
    this.drawMapLevel(ctx, U.level);
    this.panel(ctx, () => this.drawMapInfo(ctx));
  },

  drawMapLevel(ctx, level, bare) {
    const U = this.mapUI, t = this.t, center = { align: 'center' };
    SNES.half(ctx, () => {                                  // holographic grid
      ctx.fillStyle = '#2048c0';
      for (let x = 4; x < W; x += 16) ctx.fillRect(x, 26, 1, 150);
      for (let y = 26; y < 180; y += 16) ctx.fillRect(0, y, W, 1);
    }, 0.25);
    const items = this.mapItems(level), sel = this.state === 'map' && !U.zoom && level === U.level ? U.sel : -1;
    const title = level === 0 ? 'KNOWN SPACE' : level === 1 ? GALAXIES[U.gal].name : GALAXIES[U.gal].systems[U.sys].name;
    if (!bare) {
      NES.text(ctx, title, CX, 6, C.gold, { align: 'center', scale: 2 });
      if (this.state === 'map') NES.text(ctx, '< BACK', 4, 6, C.gray);
    }
    if (level === 0) {
      for (let i = 0; i < GALAXIES.length - 1; i++) this.drawRoute(ctx, GALAXIES[i], GALAXIES[i + 1], this.galaxyOpen(GALAXIES[i + 1]));
      items.forEach((it, i) => {
        const G = it.obj;
        SNES.add(ctx, () => NES.draw(ctx, SNES.glow(8, SNES.mix(it.open ? G.col : '#505868', '#000000', 0.5)), it.x, it.y));
        const art = this.galaxyArt(G, it.open);
        SNES.add(ctx, () => SNES.drawRot(ctx, art, it.x, it.y, t * 0.004 * (i % 2 ? -1 : 1), 1.5, 0.9));
        const secured = G.systems.filter(S => this.systemSecured(S)).length;
        NES.text(ctx, it.open ? G.name : '???', it.x, it.y + 26, it.open ? C.white : C.gray, center);
        if (it.open) NES.text(ctx, secured + '/4', it.x, it.y + 35, secured === 4 ? C.lime : C.lgray, center);
        if (i === sel) this.drawReticle(ctx, it.x, it.y, 30);
      });
    } else if (level === 1) {
      const G = GALAXIES[U.gal];
      SNES.half(ctx, () => SNES.drawRot(ctx, this.galaxyArt(G, true), CX, 104, t * 0.001, 5, 3), 0.18);
      for (const S of G.systems) for (const id of S.links) {
        const O = SYSTEM_BY_ID[id];
        if (O.x < S.x || (O.x === S.x && O.y < S.y)) continue;   // draw each link once
        this.drawRoute(ctx, S, O, this.systemOpen(S) && this.systemOpen(O));
      }
      items.forEach((it, i) => {
        const S = it.obj, done = this.systemSecured(S);
        if (it.open) SNES.add(ctx, () => NES.draw(ctx, SNES.glow(12 + ((t >> 4) & 1), SNES.mix(S.col, '#000000', 0.55)), it.x, it.y));
        NES.draw(ctx, SNES.sphere(it.open ? 5 : 4, it.open ? S.col : '#505868'), it.x, it.y);
        NES.text(ctx, it.open ? S.short : '???', it.x, it.y + 10, it.open ? (done ? C.lime : C.white) : C.gray, center);
        if (it.open) NES.text(ctx, this.systemClearedCount(S) + '/' + S.planets.length, it.x, it.y + 19, done ? C.lime : C.lgray, center);
        if (i === sel) this.drawReticle(ctx, it.x, it.y, 9);
      });
    } else {
      const S = GALAXIES[U.gal].systems[U.sys];
      SNES.add(ctx, () => {                                 // the star
        NES.draw(ctx, SNES.glow(26, SNES.mix(S.col, '#000000', 0.6)), CX, 100);
        NES.draw(ctx, SNES.glow(12, S.col), CX, 100);
      });
      NES.draw(ctx, SNES.sphere(6, SNES.mix(S.col, '#ffffff', 0.6)), CX, 100);
      items.forEach((it, i) => {                            // orbits as dotted ellipses
        ctx.fillStyle = i === sel ? '#4070d0' : '#1c2c60';
        for (let a = 0; a < TAU; a += 6 / it.rx) ctx.fillRect(Math.round(CX + Math.cos(a) * it.rx), Math.round(100 + Math.sin(a) * it.rx * 0.36), 1, 1);
      });
      // nearer planets (lower on screen) draw over farther ones
      items.map((it, i) => [it, i]).sort((a, b) => a[0].y - b[0].y).forEach(([it, i]) => {
        const P = it.obj, r = P.orbit.size + (i === sel ? 1 : 0);
        NES.draw(ctx, SNES.sphere(r, it.open ? P.disc[0] : '#505868'), it.x, it.y);
        if (it.open) { ctx.fillStyle = P.disc[1]; ctx.fillRect(it.x - r + 1, it.y, r * 2 - 1, 1); }   // a band across it
        if (this.planetCleared(P)) { ctx.fillStyle = C.lime; ctx.fillRect(it.x - 1, it.y + r + 2, 3, 1); }
        if (i === sel) {
          this.drawReticle(ctx, it.x, it.y, r + 4);
          NES.text(ctx, P.name, it.x, it.y + r + 6, C.white, center);
        }
      });
    }
    if (!bare && this.state === 'map') {
      const here = this.planetHere(), at = this.markerPos(level, here.id), S = SYSTEM_BY_ID[here.sys];
      const show = level === 0 || (level === 1 ? S.galIndex === U.gal : S === GALAXIES[U.gal].systems[U.sys]);
      if (show) this.drawCarrierIcon(ctx, at.x, at.y - 12);
    }
  },

  drawRoute(ctx, A, B, open) {
    const n = Math.ceil(Math.hypot(B.x - A.x, B.y - A.y) / 3);
    for (let k = 1; k < n; k++) {
      const x = Math.round(A.x + (B.x - A.x) * k / n), y = Math.round(A.y + (B.y - A.y) * k / n);
      if (!open) { if (k % 2) { ctx.fillStyle = '#404858'; ctx.fillRect(x, y, 1, 1); } continue; }
      const pulse = (k + (this.t >> 2)) % 12 === 0;
      SNES.add(ctx, () => NES.draw(ctx, SNES.glow(pulse ? 3 : 1, pulse ? '#60c0f8' : '#2050b0'), x, y));
    }
  },

  // Reticle: four corner ticks, breathing.
  drawReticle(ctx, x, y, d0) {
    const d = d0 + ((this.t >> 3) & 1);
    ctx.fillStyle = C.gold;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.fillRect(x + sx * d - (sx > 0 ? 3 : 0), y + sy * d, 4, 1);
      ctx.fillRect(x + sx * d, y + sy * d - (sy > 0 ? 3 : 0), 1, 4);
    }
  },

  // A galaxy seen face-on, baked once: a glowing core and two arms of star clumps (a bar across the
  // core for the Milky Way), or scattered clusters for the irregular Magellanic Cloud. Tilted when drawn.
  galaxyArt(G, open) {
    this.galaxyImg = this.galaxyImg || {};
    const key = G.id + open;
    if (this.galaxyImg[key]) return this.galaxyImg[key];
    const r = seededRand(G.id), [c1, c2] = open ? G.arms : ['#808890', '#404850'];
    return (this.galaxyImg[key] = SNES.layer(49, 49, g => {
      const dot = (x, y, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), 1, 1); };
      if (G.id === 'lmc') {
        for (let i = 0; i < 260; i++) {
          const a = r() * TAU, d = Math.sqrt(r()) * 20;
          dot(24 + Math.cos(a) * d * 1.1, 24 + Math.sin(a) * d * 0.7, SNES.mix(c1, c2, r() * (d / 20)));
        }
      } else {
        for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 140; i++) {
          const q = i / 140, a = arm * Math.PI + q * 4.2 + (r() - 0.5) * 0.5, d = (G.bar ? 6 : 3) + q * 18 + (r() - 0.5) * 3;
          dot(24 + Math.cos(a) * d, 24 + Math.sin(a) * d, SNES.mix(c1, c2, q));
        }
        if (G.bar) for (let x = -7; x <= 7; x++) dot(24 + x, 24 + Math.round(x * 0.3), c1);
      }
      g.drawImage(SNES.glow(6, SNES.mix(c1, '#ffffff', 0.3)), 18, 18);
    }));
  },

  drawMapInfo(ctx) {
    const U = this.mapUI, it = this.mapItems(U.level)[U.sel], c = this.camp;
    const O = it.obj, col = O.col || SYSTEM_BY_ID[O.sys].col;
    NES.box(ctx, 8, 180, 240, 40, C.black, col);
    const T = (s, y, cl, x = 14) => NES.text(ctx, s, x, y, cl);
    if (U.level === 0) {
      if (it.open) {
        T(O.name, 185, O.col);
        T(O.systems.filter(S => this.systemSecured(S)).length + '/4 SYSTEMS SECURED', 196, C.white);
      } else {
        T('UNCHARTED GALAXY', 185, C.gray);
        T('SECURE EVERY SYSTEM IN THE', 196, C.lgray); T(GALAXIES[O.index - 1].name + ' FIRST.', 205, C.lgray);
      }
    } else if (U.level === 1) {
      if (it.open) {
        T(O.name, 185, O.col);
        NES.text(ctx, this.systemClearedCount(O) + '/' + O.planets.length + ' PLANETS', 242, 185, C.white, { align: 'right' });
        T(this.systemSecured(O) ? (this.systemCleared(O) ? 'LIBERATED' : 'SECURED') : 'CLEAR ' + this.systemNeed(O) + ' PLANETS TO SECURE IT.', 196,
          this.systemSecured(O) ? C.lime : C.lgray);
        T('STATION: ' + O.base, 206, C.aqua);
      } else {
        T('UNCHARTED SYSTEM', 185, C.gray);
        T('SECURE A LINKED SYSTEM FIRST.', 196, C.lgray);
      }
    } else {
      const done = O.missions.filter((k, i) => this.missionDone(O, i)).length;
      T(O.name, 185, O.disc[0] === C.black ? C.white : C.gold);
      NES.text(ctx, done + '/' + O.missions.length + ' MISSIONS', 242, 185, done === O.missions.length ? C.lime : C.white, { align: 'right' });
      T('SELLS: ' + this.marketShort(O), 196, C.lgray);
      if (O.hulls.length) T('SHIPYARD: ' + HULLS[O.hulls[0]].name, 206, C.aqua);
      if (!it.open) T('SYSTEM LOCKED', 206, C.gray);
    }
    const here = U.level === 2 && O.id === this.planetHere().id;
    NES.text(ctx, (U.level === 2 ? (here ? 'A: DOCK' : 'A: FLY THERE') : 'A: ZOOM IN') + '   B: ' + (U.level ? 'ZOOM OUT' : 'BACK'),
      128, 226, C.gray, { align: 'center' });
  },
});
