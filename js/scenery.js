'use strict';
// SNES-style scenery built from each planet's colors: a Mode 7 surface under a gradient sky for
// vertical stages, and a multi-layer parallax landscape for side missions. Baked once per planet.

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
  // fbm over a grid of `period` cells at the base octave; u,v in 0..1 wrap
  return (u, v, oct = 4) => {
    let s = 0, amp = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { s += amp * val(u * period * f, v * period * f); amp *= 0.5; f *= 2; }
    return s / (1 - Math.pow(0.5, oct));
  };
}
const seedOf = id => [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7);

Object.assign(Game, {
  scenery() {
    const P = this.mission ? this.mission.planet : { id: 'earth', sky: [C.navy, C.dgreen, C.brown, C.olive], disc: [C.blue, C.green] };
    this.sceneCache = this.sceneCache || {};
    return this.sceneCache[P.id] || (this.sceneCache[P.id] = this.buildScenery(P));
  },

  buildScenery(P) {
    const [far, near, ground, stripe] = P.sky, [sea, land] = P.disc;
    const seed = seedOf(P.id), noise = makeNoise(seed, 4), R = SNES.ramp;
    const rFar = R(far), rNear = R(near), rGround = R(ground), rSea = R(sea), rLand = R(land), rStripe = R(stripe);
    const S = {};
    // Sky: deep space at the top fading into the planet's haze at the horizon.
    // The haze is brighter than anything on the ground, so distant ridges read as silhouettes.
    const haze = SNES.mix(rFar[4], '#e8e8f8', 0.35);
    S.sideSky = ['#000010', SNES.mix(rFar[0], '#000010', 0.3), rFar[2], SNES.mix(rFar[3], haze, 0.5), haze];
    S.topSky = ['#000008', SNES.mix(rFar[0], '#000010', 0.6), SNES.mix(rFar[3], haze, 0.5), haze];
    S.haze = haze;
    // Atmospheric perspective: the far range is its planet color pulled toward the haze.
    const rMist = rFar.map(c => SNES.mix(c, haze, 0.3));

    // ---- Mode 7 surface (vertical stages) ----
    const hmap = (u, v) => noise(u, v, 5);
    const pick = (r, t) => r[Math.max(0, Math.min(4, Math.floor(t * 5)))];
    S.floor = SNES.texture(512, (g, w) => {
      const img = g.createImageData(w, w), d = img.data;
      for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
        const u = x / w, v = y / w, h = hmap(u, v);
        const slope = (h - hmap(u - 1.5 / w, v - 1.5 / w)) * 40;   // lit from the top-left
        let col;
        if (h < 0.46) col = pick(rSea, 0.25 + h * 0.9 + slope * 0.1);
        else if (h < 0.49) col = rGround[3];                        // shoreline
        else if (h < 0.66) col = pick(rLand, 0.35 + slope + (h - 0.5));
        else col = pick(rGround, 0.45 + slope + (h - 0.66) * 1.5);
        const [r, gg, b] = [1, 3, 5].map(i => parseInt(col.slice(i, i + 2), 16));
        const k = 0.62;   // keep the ground darker than the sprites
        const i = (y * w + x) * 4;
        d[i] = r * k; d[i + 1] = gg * k; d[i + 2] = b * k; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      // a few settlements / bases: grids of lit blocks on land
      for (let n = 0; n < 14; n++) {
        const cx = Math.floor(noise(n * 0.37, 0.11, 1) * w * 3) % w, cy = Math.floor(noise(0.73, n * 0.29, 1) * w * 3) % w;
        if (hmap(cx / w, cy / w) < 0.5) continue;
        for (let k = 0; k < 9; k++) {
          g.fillStyle = k % 3 ? rStripe[1] : rStripe[3];
          g.fillRect((cx + (k % 3) * 4) % w, (cy + Math.floor(k / 3) * 4) % w, 3, 3);
        }
      }
    });

    // ---- Side-mission parallax layers ----
    // A ridge line: lit rim, faces shaded by slope, darker with depth, and a noise texture
    // (rock strata far away, tree cover up close) so the body isn't flat bands.
    const ridge = (g, w, h, r, base, amp, freq, snow, grain) => {
      const nz = makeNoise(seed + freq, freq), tx = makeNoise(seed + freq * 3, grain);
      const top = x => Math.round(base - nz(x / w, 0.5, 4) * amp);
      for (let x = 0; x < w; x++) {
        const t = top(x), slope = top(x + 1) - top(x - 1);
        for (let y = t; y < h; y++) {
          const depth = y - t, v = tx(x / w, y / w, 3);
          let i = depth < 2 ? (slope > 0 ? 4 : 3) : 2 + (slope < -1 ? 1 : slope > 1 ? -1 : 0) - Math.floor(depth / 16);
          if (depth >= 2) i += v > 0.62 ? 1 : v < 0.36 ? -1 : 0;
          let col = r[Math.max(0, Math.min(4, i))];
          if (snow && depth < 3 + (v > 0.5 ? 2 : 0) && t < base - amp * 0.6) col = '#f0f0f8';
          g.fillStyle = col; g.fillRect(x, y, 1, 1);
        }
      }
    };
    S.far = SNES.layer(512, 100, (g, w, h) => ridge(g, w, h, rMist, 70, 62, 6, true, 24));
    S.near = SNES.layer(512, 70, (g, w, h) => ridge(g, w, h, rNear, 46, 36, 9, false, 64));
    S.clouds = SNES.layer(512, 40, (g, w, h) => {
      const nz = makeNoise(seed + 99, 8);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = nz(x / w, y / h / 4, 4) - Math.abs(y - h / 2) / h;
        if (v < 0.42) continue;
        g.fillStyle = v > 0.56 ? '#f8f8ff' : v > 0.48 ? SNES.mix(haze, '#ffffff', 0.5) : haze;
        g.fillRect(x, y, 1, 1);
      }
    });
    // Ground strip: shaded rock and dirt with the planet's stripe color as markings.
    S.ground = SNES.layer(64, 24, (g, w, h) => {
      const nz = makeNoise(seed + 7, 4);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = nz(x / w, y / h / 2, 3);
        g.fillStyle = y === 0 ? rStripe[4] : y < 3 ? rGround[3] : pick(rGround, 0.15 + v * 0.7 - y / h * 0.3);
        g.fillRect(x, y, 1, 1);
      }
      g.fillStyle = rStripe[2];
      g.fillRect(4, 8, 14, 1); g.fillRect(36, 16, 10, 1);
    });
    return S;
  },

  // Vertical stages: gradient sky with stars, the planet's surface below in Mode 7 perspective.
  drawTopBG(ctx) {
    const S = this.scenery(), horizon = 36;
    SNES.bands(ctx, 0, horizon + 8, S.topSky);
    for (const s of this.stars) {
      if (s.y < horizon && (this.t + s.ph) % 60 < 48) { ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, s.y | 0, 1, 1); }
    }
    this.floorY = (this.floorY || 0) - 0.9;   // fly forward over the surface
    SNES.mode7(ctx, S.floor, { x: 128, y: this.floorY, ang: 0, horizon, top: horizon + 1, bottom: H,
      height: 150, fog: [S.haze, 0.5] });
  },

  // Side missions: sky, far mountains, drifting clouds (see-through), near hills, the ground.
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
});
