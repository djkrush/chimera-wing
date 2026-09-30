'use strict';
// SNES-style scenery built from each planet's colors and terrain style (P.terrain: ocean, desert,
// clouds, hive, fields, ice, tech): a Mode 7 surface under a gradient sky for vertical stages, a
// multi-layer parallax landscape for side missions, and a nebula backdrop for space and menus.
// Everything is generated once per planet and cached.

// Seeded value noise (fractal), so every planet's terrain is fixed and tiles seamlessly.
function makeNoise(seed, period) {
  const hash = (x, y) => {
    x = ((x % period) + period) % period; y = ((y % period) + period) % period;
    let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const sm = t => t * t * (3 - 2 * t);
  const val = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
  // fbm over a grid of `period` cells at the base octave; u, v in 0..1 wrap
  return (u, v, oct = 4) => {
    let s = 0, amp = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { s += amp * val(u * period * f, v * period * f); amp *= 0.5; f *= 2; }
    return s / (1 - Math.pow(0.5, oct));
  };
}
const seedOf = id => [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7);
// Integer hash in 0..1 for per-cell choices (plots, hex cells, windows).
const hash2 = (a, b, seed) => {
  let h = Math.imul(a * 73856093 ^ b * 19349663 ^ seed, 2654435761);
  h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};
const rgbOf = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

Object.assign(Game, {
  // Scenery for planet P (default: the current mission's planet, or Earth on the title screen).
  scenery(P = this.mission ? this.mission.planet : PLANET_BY_ID.earth) {
    this.sceneCache = this.sceneCache || {};
    return this.sceneCache[P.id] || (this.sceneCache[P.id] = this.buildScenery(P));
  },

  buildScenery(P) {
    const [far, near, ground, stripe] = P.sky, [sea, land] = P.disc, style = P.terrain || 'ocean';
    const seed = seedOf(P.id), noise = makeNoise(seed, 4), R = SNES.ramp;
    const rFar = R(far), rNear = R(near), rGround = R(ground), rSea = R(sea), rLand = R(land), rStripe = R(stripe);
    // The haze is brighter than anything on the ground, so distant ridges read as silhouettes.
    const haze = SNES.mix(rFar[4], '#e8e8f8', 0.35);
    const S = { style, haze };
    S.sideSky = ['#000010', SNES.mix(rFar[0], '#000010', 0.3), rFar[2], SNES.mix(rFar[3], haze, 0.5), haze];
    S.topSky = ['#000008', SNES.mix(rFar[0], '#000010', 0.6), SNES.mix(rFar[3], haze, 0.5), haze];
    const rMist = rFar.map(c => SNES.mix(c, haze, 0.3));   // atmospheric perspective for the far range
    const sh = (r, t) => r[Math.max(0, Math.min(4, Math.floor(t * 5)))];   // ramp shade for t in 0..1

    S.floor = this.buildFloor(style, { seed, noise, rFar, rNear, rGround, rSea, rLand, rStripe, sh });
    S.far = SNES.layer(512, 100, (g, w, h) => this.farLayer(style, g, w, h, seed, rMist, haze));
    S.near = SNES.layer(512, 70, (g, w, h) => this.nearLayer(style, g, w, h, seed, rNear, rStripe));
    S.ground = SNES.layer(64, 24, (g, w, h) => this.groundStrip(style, g, w, h, seed, rGround, rStripe, sh));
    // Drifting clouds: side missions (a band) and vertical stages (a deck above the Mode 7 ground).
    const cloudy = { ocean: 0.42, fields: 0.45, clouds: 0.3, ice: 0.5, desert: 0.56, hive: 0.6, tech: 0.62 }[style];
    const cloudCol = v => (v > cloudy + 0.14 ? '#f8f8ff' : v > cloudy + 0.06 ? SNES.mix(haze, '#ffffff', 0.5) : haze);
    S.clouds = SNES.layer(512, 40, (g, w, h) => {
      const nz = makeNoise(seed + 99, 8);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = nz(x / w, y / h / 4, 4) - Math.abs(y - h / 2) / h;
        if (v >= cloudy) { g.fillStyle = cloudCol(v); g.fillRect(x, y, 1, 1); }
      }
    });
    S.deck = cloudy < 0.6 && style !== 'clouds' ? SNES.layer(256, 256, (g, w, h) => {
      const nz = makeNoise(seed + 55, 4);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = nz(x / w, y / h, 5);
        if (v >= cloudy + 0.2) { g.fillStyle = cloudCol(v - 0.2); g.fillRect(x, y, 1, 1); }
      }
    }) : null;
    return S;
  },

  // ---- Mode 7 surfaces ----------------------------------------------------------------------------
  buildFloor(style, K) {
    const { seed, noise, rGround, rSea, rLand, rStripe, rFar, sh } = K;
    const W0 = 512, nz2 = makeNoise(seed + 3, 8), nz3 = makeNoise(seed + 11, 16);
    const hmap = (u, v) => noise(u, v, 5);
    const light = (u, v) => (hmap(u, v) - hmap(u - 1.5 / W0, v - 1.5 / W0)) * 40;   // lit from the top-left
    // craters for desert worlds: wrapped distance to a fixed list of centers
    const craters = style === 'desert' ? Array.from({ length: 26 }, (_, i) => ({
      x: hash2(i, 1, seed) * W0, y: hash2(i, 2, seed) * W0, r: 5 + hash2(i, 3, seed) ** 2 * 26 })) : [];
    const wrapD = d => (d > W0 / 2 ? d - W0 : d < -W0 / 2 ? d + W0 : d);
    // nearest hex-lattice centers (16px cells, offset rows) for hive worlds
    const hexAt = (x, y) => {
      let best = 1e9, second = 1e9, id = 0;
      const row = Math.floor(y / 16);
      for (let r = row - 1; r <= row + 1; r++) {
        const off = (((r % 32) + 32) % 2) * 8;
        const col = Math.floor((x - off) / 16);
        for (let c = col - 1; c <= col + 1; c++) {
          const cx = c * 16 + off + 8, cy = r * 16 + 8, d = Math.hypot(x - cx, y - cy);
          if (d < best) { second = best; best = d; id = (((r % 32) + 32) % 32) * 64 + (((c % 32) + 32) % 32); }
          else if (d < second) second = d;
        }
      }
      return { edge: (second - best) / 2, id, d: best };
    };

    const pixel = (x, y) => {
      const u = x / W0, v = y / W0;
      switch (style) {
        case 'desert': {
          const h = hmap(u, v), l = light(u, v);
          const dune = Math.sin((u * 60 + nz2(u, v, 2) * 5) * Math.PI * 2) * 0.07;
          let col = h < 0.5 ? sh(rSea, 0.3 + h * 0.5 + l + dune) : sh(rLand, 0.2 + (h - 0.5) + l + dune);
          const cn = Math.abs(nz3(u, v, 3) - 0.5);                // winding canyon
          if (cn < 0.018) col = rGround[0]; else if (cn < 0.03) col = rGround[(nz3(u + 0.01, v, 3) > nz3(u, v, 3)) ? 1 : 3];
          for (const c of craters) {
            const dx = wrapD(x - c.x), dy = wrapD(y - c.y), d = Math.hypot(dx, dy);
            if (d > c.r * 1.25) continue;
            if (d < c.r) col = (dx + dy) / c.r > 0.3 ? rSea[3] : d < c.r * 0.7 ? rSea[1] : rSea[0];   // inner wall lit bottom-right
            else col = (dx + dy) < 0 ? rLand[4] : rLand[1];                                          // raised rim
            break;
          }
          return col;
        }
        case 'clouds': {
          const q = noise(u, v, 4), t = v * 5 + q * 1.9 + Math.sin(u * Math.PI * 2) * 0.3;
          const b = 0.5 + 0.5 * Math.sin(t * Math.PI * 2), top = nz2(u, v, 4);
          return top > 0.62 ? sh(rLand, 0.7 + (top - 0.62) * 2) : b > 0.5 ? sh(rLand, 0.2 + b * 0.5) : sh(rSea, 0.2 + b);
        }
        case 'hive': {
          const c = hexAt(x, y), capped = hash2(c.id, 7, seed) < 0.62;
          if (c.edge < 1.2) return rGround[1];
          if (c.edge < 2.2) return (x + y) % 3 ? rGround[3] : rGround[2];                    // wax wall bevel
          if (capped) return c.d < 3 ? rLand[4] : sh(rLand, 0.75 - c.d / 16);                 // domed caps catch the light
          return c.d < 2.5 ? rSea[4] : sh(rSea, 0.45 - c.d / 20);                              // open cells of honey
        }
        case 'fields': {
          const cx = Math.floor(x / 32), cy = Math.floor(y / 32), lx = x % 32, ly = y % 32;
          const split = hash2(cx, cy, seed) < 0.5, half = split ? (lx < 16 ? 0 : 1) : (ly < 16 ? 0 : 1);
          const k = hash2(cx * 2 + half, cy, seed + 1);
          if ((cx % 4 === 0 && lx < 2) || (cy % 4 === 0 && ly < 2)) return rStripe[lx + ly < 2 ? 3 : 2];   // roads
          if (lx === 0 || ly === 0 || (split ? lx === 16 : ly === 16)) return rGround[1];                  // hedgerows
          const r = [rLand, rSea, rGround, K.rNear][Math.floor(k * 4)];
          const furrow = ((split ? lx : ly) + Math.floor(k * 3)) % 3 === 0;
          return r[furrow ? 1 : 2 + (hash2(cx, cy, seed + 2) > 0.7 ? 1 : 0)];
        }
        case 'ice': {
          const h = hmap(u, v), l = light(u, v), cr = Math.abs(nz3(u, v, 4) - 0.5);
          if (h < 0.4) return sh(rSea, 0.1 + h + (nz2(u, v, 2) > 0.62 ? 0.5 : 0));            // open water with floes
          if (cr < 0.012) return rSea[0];
          if (cr < 0.022) return rLand[1];                                                    // crevasse walls
          return sh(rLand, 0.45 + l * 1.2 + (h - 0.4) * 0.6);
        }
        case 'tech': {
          const px = x % 32, py = y % 32, sub = hash2(Math.floor(x / 32), Math.floor(y / 32), seed);
          const qx = sub < 0.5 ? px % 16 : px, qy = sub < 0.5 ? py % 16 : py;
          if (x % 64 === 0 || y % 64 === 0) return rStripe[(x + y) % 8 < 4 ? 4 : 3];         // glowing conduits
          if (qx === 0 || qy === 0) return rFar[0];
          if (qx === 1 || qy === 1) return rFar[3];
          if (sub > 0.8 && Math.hypot(qx - 8, qy - 8) < 5) return (qx + qy) % 2 ? rFar[0] : rFar[1];   // vents
          if (sub > 0.6 && qx % 6 === 3 && qy % 6 === 3) return rStripe[4];                  // lights
          return sh(rFar, 0.35 + (qx + qy < 10 ? 0.15 : 0) + hash2(x >> 4, y >> 4, seed) * 0.1);
        }
        default: {   // ocean: seas, beaches, forests, mountains and a few settlements
          const h = hmap(u, v), l = light(u, v);
          if (h < 0.46) return sh(rSea, 0.25 + h * 0.9 + l * 0.1);
          if (h < 0.49) return rGround[3];
          if (h < 0.66) return sh(rLand, 0.35 + l + (h - 0.5));
          return sh(rGround, 0.45 + l + (h - 0.66) * 1.5);
        }
      }
    };
    return SNES.texture(W0, (g, w) => {
      const img = g.createImageData(w, w), d = img.data, cache = new Map();
      for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
        const col = pixel(x, y);
        let c = cache.get(col);
        if (!c) cache.set(col, c = rgbOf(col).map(n => n * 0.62));   // keep the ground darker than the sprites
        const i = (y * w + x) * 4;
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      if (style === 'ocean' || style === 'fields') {   // settlements: grids of lit blocks on land
        for (let n = 0; n < 14; n++) {
          const cx = Math.floor(hash2(n, 5, seed) * w), cy = Math.floor(hash2(n, 6, seed) * w);
          if (style === 'ocean' && hmap(cx / w, cy / w) < 0.5) continue;
          for (let k = 0; k < 9; k++) {
            g.fillStyle = k % 3 ? rStripe[1] : rStripe[3];
            g.fillRect((cx + (k % 3) * 4) % w, (cy + Math.floor(k / 3) * 4) % w, 3, 3);
          }
        }
      }
    });
  },

  // ---- Side-mission layers --------------------------------------------------------------------------
  // A ridge line: lit rim, faces shaded by slope, darker with depth, and a noise texture so the body
  // isn't flat bands. `shape` reshapes the height (mesas, jagged peaks, domes).
  ridge(g, w, h, r, o) {
    const nz = makeNoise(o.seed + o.freq, o.freq), tx = makeNoise(o.seed + o.freq * 3, o.grain);
    const top = x => Math.round(o.base - (o.shape ? o.shape(nz(x / w, 0.5, 4), x) : nz(x / w, 0.5, 4)) * o.amp);
    for (let x = 0; x < w; x++) {
      const t = top(x), slope = top(x + 1) - top(x - 1);
      for (let y = t; y < h; y++) {
        const depth = y - t, v = tx(x / w, y / w, 3);
        let i = depth < 2 ? (slope > 0 ? 4 : 3) : 2 + (slope < -1 ? 1 : slope > 1 ? -1 : 0) - Math.floor(depth / 16);
        if (depth >= 2) i += v > 0.62 ? 1 : v < 0.36 ? -1 : 0;
        if (o.strata && depth >= 2 && (y + Math.floor(v * 4)) % 7 === 0) i -= 1;   // layered rock
        let col = r[Math.max(0, Math.min(4, i))];
        if (o.snow && depth < o.snow + (v > 0.5 ? 2 : 0) && t < o.base - o.amp * 0.55) col = '#f0f0f8';
        g.fillStyle = col; g.fillRect(x, y, 1, 1);
      }
    }
  },

  farLayer(style, g, w, h, seed, r, haze) {
    if (style === 'tech') {   // a city skyline with lit windows
      for (let x = 0; x < w;) {
        const bw = 10 + Math.floor(hash2(x, 1, seed) * 22), bh = 30 + Math.floor(hash2(x, 2, seed) ** 2 * 64);
        for (let yy = h - bh; yy < h; yy++) for (let xx = x; xx < Math.min(w, x + bw); xx++) {
          const lit = (xx - x) % 4 === 2 && (yy - (h - bh)) % 5 === 2 && hash2(xx, yy, seed) > 0.55;
          g.fillStyle = lit ? r[4] : xx === x ? r[2] : yy === h - bh ? r[3] : r[1];
          g.fillRect(xx, yy, 1, 1);
        }
        if (hash2(x, 3, seed) > 0.6) { g.fillStyle = r[4]; g.fillRect(x + (bw >> 1), h - bh - 6, 1, 6); }   // antenna
        x += bw + Math.floor(hash2(x, 4, seed) * 4);
      }
      return;
    }
    if (style === 'clouds') {   // towering cloud banks instead of mountains
      const nz = makeNoise(seed + 21, 6);
      for (let x = 0; x < w; x++) {
        const t = Math.round(30 + nz(x / w, 0.3, 4) * 50);
        for (let y = t; y < h; y++) {
          const v = nz(x / w, y / h, 3) + (y - t) / 120;
          g.fillStyle = y - t < 2 ? '#f8f8ff' : v < 0.55 ? SNES.mix(haze, '#ffffff', 0.4) : v < 0.75 ? r[3] : r[2];
          g.fillRect(x, y, 1, 1);
        }
      }
      return;
    }
    const o = { seed, freq: 6, grain: 24, base: 70, amp: 62, snow: 3 };
    if (style === 'desert') Object.assign(o, { snow: 0, strata: true, shape: n => Math.round(n * 7) / 7 });   // mesas
    if (style === 'ice') Object.assign(o, { freq: 12, snow: 8, shape: n => n ** 0.8 });                      // jagged
    if (style === 'hive') Object.assign(o, { snow: 0, shape: (n, x) => n * 0.6 + Math.abs(Math.sin(x / 26)) * 0.5 });   // domes
    this.ridge(g, w, h, r, o);
  },

  nearLayer(style, g, w, h, seed, r, rStripe) {
    if (style === 'tech') {   // fortress wall: plates, pipes and warning lights
      for (let x = 0; x < w; x++) {
        const t = 26 + (Math.floor(x / 48) % 3) * 8;
        for (let y = t; y < h; y++) {
          const pipe = (y - t) % 14 === 5 || (y - t) % 14 === 6;
          g.fillStyle = y === t ? r[4] : pipe ? r[3] : x % 24 === 0 ? r[0] : (y - t) % 14 === 7 ? r[0] : r[1];
          g.fillRect(x, y, 1, 1);
        }
        if (x % 48 === 20) { g.fillStyle = rStripe[4]; g.fillRect(x, t + 2, 3, 2); }
      }
      return;
    }
    const o = { seed, freq: 9, grain: 64, base: 46, amp: 36 };
    if (style === 'ice') Object.assign(o, { snow: 4, base: 50 });
    if (style === 'desert') Object.assign(o, { strata: true });
    if (style === 'clouds') Object.assign(o, { grain: 16 });
    if (style === 'hive') Object.assign(o, { shape: (n, x) => n * 0.5 + Math.abs(Math.sin(x / 14)) * 0.5 });
    this.ridge(g, w, h, r, o);
  },

  groundStrip(style, g, w, h, seed, rGround, rStripe, sh) {
    const nz = makeNoise(seed + 7, 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = nz(x / w, y / h / 2, 3);
      let col = y === 0 ? rStripe[4] : y < 3 ? rGround[3] : sh(rGround, 0.15 + v * 0.7 - y / h * 0.3);
      if (style === 'tech' && y > 2) col = x % 16 === 0 || y % 8 === 3 ? rGround[0] : x % 16 === 1 ? rGround[3] : rGround[2];
      if (style === 'ice' && y > 2) col = sh(rStripe, 0.5 + v * 0.5 - y / h * 0.4);
      if (style === 'hive' && y > 2) col = (x + (Math.floor(y / 6) % 2) * 4) % 8 === 0 || y % 6 === 0 ? rGround[1] : rGround[3];
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
    if (style !== 'tech' && style !== 'hive') {
      g.fillStyle = rStripe[2];
      g.fillRect(4, 8, 14, 1); g.fillRect(36, 16, 10, 1);
    }
  },

  // ---- Drawing ------------------------------------------------------------------------------------
  // Vertical stages: gradient sky with stars, the surface below in Mode 7, clouds drifting over it.
  drawTopBG(ctx) {
    const S = this.scenery(), horizon = 36, challenge = this.stageType === 'challenge';
    SNES.bands(ctx, 0, horizon + 8, S.topSky);
    for (const s of this.stars) {
      if (s.y < horizon && (this.t + s.ph) % 60 < 48) { ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, s.y | 0, 1, 1); }
    }
    this.floorY = (this.floorY || 0) - (challenge ? 1.4 : 0.9);   // fly forward over the surface
    SNES.mode7(ctx, S.floor, { x: 128, y: this.floorY, ang: 0, horizon, top: horizon + 1, bottom: H,
      height: challenge ? 260 : 150, fog: [S.haze, 0.5] });   // challenge stages fly higher and faster
    if (S.deck) {   // scattered clouds over the near ground: they move faster (closer), drawn see-through
      for (const [y0, a] of [[110, 0.15], [140, 0.35]]) {   // two blend levels so the layer fades in, not cuts in
        ctx.save();
        ctx.beginPath(); ctx.rect(0, y0, W, y0 === 110 ? 30 : H - y0); ctx.clip();
        SNES.half(ctx, () => SNES.scrollY(ctx, S.deck, -this.floorY * 1.8), a);
        ctx.restore();
      }
    }
  },

  // Side missions: sky, far range, drifting clouds (see-through), near hills, the ground.
  drawSideLayers(ctx) {
    const S = this.scenery(), s = this.scroll;
    SNES.bands(ctx, 0, SIDE_GROUND, S.sideSky);
    for (const st of this.stars) {
      if (st.y < 70 && (this.t + st.ph) % 60 < 48) { ctx.fillStyle = st.c; ctx.fillRect(st.x | 0, st.y | 0, 1, 1); }
    }
    SNES.scrollX(ctx, S.far, s * 0.2, SIDE_GROUND - 100);
    SNES.half(ctx, () => SNES.scrollX(ctx, S.clouds, s * 0.35 + this.t * 0.1, 96), 0.6);
    SNES.scrollX(ctx, S.near, s * 0.55, SIDE_GROUND - 64);
    SNES.scrollX(ctx, S.ground, s, SIDE_GROUND);
  },

  // Space behind menus, cutscenes and the map: a dim nebula, then stars; the brightest twinkle as crosses.
  drawStars(ctx) {
    if (!this.nebula) {
      const nz = makeNoise(4242, 4), nz2 = makeNoise(777, 8);
      // kept dark so menu text stays readable on top of it
      const tint = [['#080014', '#100828', '#1c1040', '#2c1c58'], ['#000810', '#041424', '#082038', '#103050']];
      this.nebula = SNES.layer(256, 256, (g, w, h) => {
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const n = nz(x / w, y / h, 5) - 0.52;
          if (n <= 0) continue;
          const k = Math.min(3, Math.floor(n * 12));
          g.fillStyle = tint[nz2(x / w, y / h, 2) > 0.5 ? 1 : 0][k];
          g.fillRect(x, y, 1, 1);
        }
      });
    }
    SNES.scrollY(ctx, this.nebula, this.nebY || 0);
    for (const s of this.stars) {
      if ((this.t + s.ph) % 60 >= 48) continue;
      const x = s.x | 0, y = s.y | 0;
      ctx.fillStyle = s.c; ctx.fillRect(x, y, 1, 1);
      if (s.s > 1.3 && (this.t + s.ph) % 60 < 24) {   // bright star: a twinkling cross
        ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
        ctx.fillStyle = C.white; ctx.fillRect(x, y, 1, 1);
      }
    }
  },
});
