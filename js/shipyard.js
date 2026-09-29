'use strict';
// Shipyard: paints the big pre-rendered machines (the carrier, the capital ships and the boss
// fortresses) in the SNES style. Shapes are laid down as materials at a height level. Baking bevels
// every step in height (lit top-left edges, shaded bottom-right ones), lets raised parts cast drop
// shadows onto lower ones, and outlines the hull. The helpers add mechanical detail: plating, vents,
// greebles, gun turrets and window rows.
const YARD = (() => {
  const pack = hex => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); return 0xff000000 | (b << 16) | (g << 8) | r; };

  // Seeded random numbers, so every hull comes out the same each time.
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  }

  function sheet(w, h) {
    const mat = new Uint8Array(w * h), lev = new Uint8Array(w * h), mats = [null];
    const S = {
      w, h, grid: mat, lev, mats,
      // A material: `color` gets a 5-shade ramp and is lit by its height; `flat` colors are drawn as-is
      // (lights, glass, deck markings). base = the ramp shade of a flat face (2 normal, 3 light plates).
      mat(color, o = {}) {
        mats.push({ flat: !!o.flat, base: o.base ?? 2, ramp: o.flat ? null : SNES.ramp(color).map(pack), color: pack(color) });
        return mats.length - 1;
      },
      // Paint one pixel. With a level it builds; without one it paints over what is there.
      px(x, y, m, l) {
        x = Math.round(x); y = Math.round(y);
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const i = y * w + x;
        if (l === undefined && !mat[i]) return;   // paint needs a surface
        mat[i] = m;
        if (l !== undefined) lev[i] = l;
      },
      rect(x, y, rw, rh, m, l) {
        for (let yy = Math.round(y); yy < Math.round(y + rh); yy++) for (let xx = Math.round(x); xx < Math.round(x + rw); xx++) S.px(xx, yy, m, l);
      },
      // Filled polygon (even-odd rule, sampled at pixel centers).
      poly(pts, m, l) {
        const ys = pts.map(p => p[1]), y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(h - 1, Math.ceil(Math.max(...ys)));
        for (let y = y0; y <= y1; y++) {
          const cy = y + 0.5, xs = [];
          for (let i = 0; i < pts.length; i++) {
            const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
            if ((ay <= cy) !== (by <= cy)) xs.push(ax + (cy - ay) / (by - ay) * (bx - ax));
          }
          xs.sort((a, b) => a - b);
          for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.5); x < xs[k + 1] - 0.5; x++) S.px(x, y, m, l);
        }
      },
      ellipse(cx, cy, rx, ry, m, l) {
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const dx = (x - cx) / (rx + 0.3), dy = (y - cy) / (ry + 0.3);
          if (dx * dx + dy * dy <= 1) S.px(x, y, m, l);
        }
      },
      disc(cx, cy, r, m, l) { S.ellipse(cx, cy, r, r, m, l); },
      // Mirror the left half onto the right (top-down hulls are symmetric about x = cx).
      mirrorX(cx) {
        for (let y = 0; y < h; y++) for (let x = 0; x < cx; x++) {
          const a = y * w + x, b = y * w + (2 * cx - x);
          if (2 * cx - x < w) { mat[b] = mat[a]; lev[b] = lev[a]; }
        }
      },
      // Swap one material for another inside a box (plating patterns, stripes).
      recolor(x, y, rw, rh, from, to) {
        x = Math.round(x); y = Math.round(y); rw = Math.round(rw); rh = Math.round(rh);
        for (let yy = Math.max(0, y); yy < Math.min(h, y + rh); yy++) for (let xx = Math.max(0, x); xx < Math.min(w, x + rw); xx++) {
          const i = yy * w + xx;
          if (mat[i] === from) mat[i] = to;
        }
      },
      at(x, y) { x = Math.round(x); y = Math.round(y); return x < 0 || y < 0 || x >= w || y >= h ? 0 : mat[y * w + x]; },
      levAt(x, y) { return x < 0 || y < 0 || x >= w || y >= h ? -1 : mat[y * w + x] ? lev[y * w + x] : -1; },
      bake: o => bake(S, o),
    };
    return S;
  }

  // o: { shadow: drop-shadow length in px (default 3), outline: true }
  function bake(S, o = {}) {
    const { w, h, grid: mat, lev, mats } = S, sh = o.shadow ?? 3;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d'), img = g.createImageData(w, h), buf = new Uint32Array(img.data.buffer);
    const L = (x, y) => S.levAt(x, y);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, m = mat[i];
      if (!m) continue;
      const M = mats[m];
      if (M.flat) { buf[i] = M.color; continue; }
      const l = lev[i];
      let idx = M.base;
      if (L(x, y - 1) < l || L(x - 1, y) < l) idx = 4;
      else if (L(x, y + 1) < l || L(x + 1, y) < l) idx = L(x, y + 1) < l && L(x + 1, y) < l ? 0 : 1;
      else {
        for (let k = 1; k <= sh; k++) if (L(x - k, y - k) > l) { idx = Math.max(0, idx - 1); break; }
      }
      buf[i] = M.ramp[idx];
    }
    if (o.outline !== false) {
      const out = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (mat[y * w + x]) continue;
        const n = [[0, 1], [0, -1], [1, 0], [-1, 0]].find(([dx, dy]) => S.at(x + dx, y + dy));
        if (!n) continue;
        const v = buf[(y + n[1]) * w + x + n[0]];
        out.push([y * w + x, 0xff000000 | ((((v >> 16) & 255) * 0.3 + 10) << 16) | ((((v >> 8) & 255) * 0.2) << 8) | ((v & 255) * 0.2)]);
      }
      for (const [i, v] of out) buf[i] = v;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  // ---- Mechanical detail -----------------------------------------------------------------------
  // Armor plating: repaint a region's `from` material in a staggered brick of light and normal plates,
  // with dark seams between them.
  function plates(S, x, y, w, h, from, light, seam, pw = 16, ph = 10, seed = 1) {
    const r = rng(seed);
    for (let py = 0; py < h; py += ph) {
      const off = (py / ph) % 2 ? pw >> 1 : 0;
      for (let px = -off; px < w; px += pw) {
        if (r() < 0.35) S.recolor(x + Math.max(0, px), y + py, Math.min(pw, w - Math.max(0, px)), Math.min(ph, h - py), from, light);
      }
      S.recolor(x, y + py, w, 1, from, seam); S.recolor(x, y + py, w, 1, light, seam);
    }
  }
  // Small raised boxes (vents, hatches, pipes): Truxton-style surface clutter, only where `on` is.
  function greebles(S, x, y, w, h, on, m, l, n, seed = 1, max = 6) {
    const r = rng(seed);
    for (let k = 0; k < n; k++) {
      const gw = 2 + Math.floor(r() * max), gh = 2 + Math.floor(r() * max);
      const gx = x + Math.floor(r() * (w - gw)), gy = y + Math.floor(r() * (h - gh));
      if (S.at(gx, gy) !== on || S.at(gx + gw - 1, gy + gh - 1) !== on) continue;
      S.rect(gx, gy, gw, gh, m, l);
    }
  }
  // Machinery modules on a grid of cells (Truxton-style decks): vent blocks, hatches, pipe runs, tanks
  // and stacked boxes. A module is placed only where the whole cell is still the `on` material.
  // M: { metal, dark, black, light } materials. fill = share of cells used.
  function modules(S, x, y, w, h, on, M, l, seed = 1, cell = 16, fill = 0.45) {
    const r = rng(seed);
    x = Math.round(x); y = Math.round(y);
    const free = (cx, cy, cw, ch) => {
      for (let yy = cy; yy < cy + ch; yy += 3) for (let xx = cx; xx < cx + cw; xx += 3) if (S.at(xx, yy) !== on) return false;
      return S.at(cx + cw - 1, cy + ch - 1) === on;
    };
    for (let cy = y; cy + cell <= y + h; cy += cell) for (let cx = x; cx + cell <= x + w; cx += cell) {
      if (r() > fill) continue;
      const kind = Math.floor(r() * 6), m = 2, s = cell - m * 2, X = cx + m, Y = cy + m;
      if (kind === 5 && free(cx, cy, cell * 2, cell)) {           // pipe run across two cells
        S.rect(X, Y + 3, cell * 2 - m * 2, 3, M.light, l);
        S.rect(X, Y + s - 6, cell * 2 - m * 2, 3, M.light, l);
        for (let k = X + 4; k < cx + cell * 2 - 4; k += 8) S.rect(k, Y + 2, 2, s - 4, M.metal, l + 1);
        cx += cell;
        continue;
      }
      if (!free(cx, cy, cell, cell)) continue;
      if (kind === 0) vent(S, X, Y, s, s, M.metal, M.black, l);
      else if (kind === 1) { S.rect(X + 1, Y + 1, s - 2, s - 2, M.metal, l); S.rect(X + 3, Y + 3, s - 6, s - 6, M.light, l + 1); S.px(X + (s >> 1), Y + (s >> 1), M.dark); }   // hatch
      else if (kind === 2) { S.disc(cx + cell / 2, cy + cell / 2, s / 2 - 1, M.light, l); S.disc(cx + cell / 2 - 1, cy + cell / 2 - 1, 1, M.metal, l + 1); }   // tank
      else if (kind === 3) { S.rect(X, Y, s, s - 3, M.metal, l); S.rect(X + 2, Y + 2, s - 6, s - 8, M.light, l + 1); }   // stacked boxes
      else { for (let k = 0; k < s; k += 4) S.rect(X + k, Y, 2, s, M.dark, l); }   // cooling fins
    }
  }
  // Vent grille: dark slots across a raised frame.
  function vent(S, x, y, w, h, frame, slot, l) {
    S.rect(x, y, w, h, frame, l);
    for (let k = 1; k < h - 1; k += 2) S.rect(x + 1, y + k, w - 2, 1, slot);
  }
  // A top-down gun turret: armored dome, `n` barrels pointing along `ang` (0 = up), a sight slit.
  function turret(S, cx, cy, r, m, barrel, l, ang = 0, n = 3, len = r + 5) {
    const sx = Math.sin(ang), sy = -Math.cos(ang), px = -sy, py = sx;
    for (let b = 0; b < n; b++) {
      const off = (b - (n - 1) / 2) * 3;
      for (let k = r - 2; k < len; k++) S.px(cx + sx * k + px * off, cy + sy * k + py * off, barrel, l + 1);
    }
    S.disc(cx, cy, r, m, l);
    S.disc(cx - r * 0.25, cy - r * 0.25, Math.max(1, r * 0.45), m, l + 1);
  }
  // A row of lit windows.
  function windows(S, x, y, w, gap, m, ww = 2, wh = 1) {
    for (let k = 0; k + ww <= w; k += gap) S.rect(x + k, y, ww, wh, m);
  }

  return { sheet, rng, plates, greebles, modules, vent, turret, windows };
})();
