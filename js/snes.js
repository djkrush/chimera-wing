'use strict';
// SNES-style rendering on top of nes.js: 15-bit color, shaded sprite baking, smooth rotation and
// scaling, color-math blending, HDMA-style gradient bands, parallax layers and a Mode 7 floor.
const SNES = (() => {
  // ---- 15-bit color ---------------------------------------------------------------------------
  const q = v => Math.round(Math.max(0, Math.min(255, v)) / 255 * 31) * 255 / 31;
  const hex2 = v => Math.round(q(v)).toString(16).padStart(2, '0');
  const rgb = (r, g, b) => '#' + hex2(r) + hex2(g) + hex2(b);
  const parse = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const A = parse(a), B = parse(b); return rgb(...A.map((v, i) => v + (B[i] - v) * t)); };

  function toHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1));
    const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function fromHsl(h, s, l) {
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return rgb((r + m) * 255, (g + m) * 255, (b + m) * 255);
  }
  // Five shades from dark to highlight around a base color. Shadows drift toward blue/purple and
  // highlights toward warm white, the way SNES artists hand-picked their ramps.
  function ramp(base, spread = 1) {
    const [h, s, l] = toHsl(parse(base));
    const cool = h > 60 && h < 250 ? 1 : -1;   // direction from the hue toward ~240 (blue)
    return [-0.62, -0.34, 0, 0.22, 0.4].map((dl, i) => {
      const L = Math.max(0.04, Math.min(0.97, l + dl * spread * (dl < 0 ? l : 1 - l) * 1.6));
      const hs = i < 2 ? (2 - i) * 12 * cool : i > 2 ? -(i - 2) * 8 * cool : 0;
      return fromHsl(h + hs, Math.min(1, s * (i === 4 ? 0.7 : 1 + (2 - i) * 0.08)), L);
    });
  }

  // ---- Sprite baking --------------------------------------------------------------------------
  // Top-down art is symmetric: write the left half (ending on the center column) and mirror it.
  const mirror = rows => rows.map(r => r + [...r.slice(0, -1)].reverse().join(''));

  // Bake ASCII rows into a shaded sprite. `mats` maps a letter to a 5-shade ramp (auto-lit) or to a
  // single color (flat, e.g. glows). Lowercase letters use the same material in shadow (panel lines).
  // Each material region is beveled on its own, lit from the top-left, then the whole sprite gets a
  // dark outline. opt: { solid: color (flash silhouette), outline: false, light: [dx, dy],
  // volume: true (shade the whole silhouette as one rounded form: faces, where beveling every
  // feature separately would ring the eyes and mouth with dark pixels) }.
  function bake(rows, mats, opt = {}) {
    const h = rows.length, w = Math.max(...rows.map(r => r.length)), pad = opt.outline === false ? 0 : 1;
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : rows[y][x] || '.');
    const matOf = ch => (ch === '.' || ch === ' ' ? null : ch.toUpperCase());
    const region = opt.volume ? ch => (matOf(ch) ? 'X' : null) : matOf;   // what counts as "the same surface"
    // distance (in pixels, capped) from each pixel to the edge of its own material region
    const dist = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const m = region(at(x, y));
      if (!m) continue;
      let d = 4;
      for (let r = 1; r < 4 && d === 4; r++) {
        for (let k = -r; k <= r && d === 4; k++) {
          if (region(at(x + k, y - r)) !== m || region(at(x + k, y + r)) !== m ||
              region(at(x - r, y + k)) !== m || region(at(x + r, y + k)) !== m) d = r;
        }
      }
      dist[y * w + x] = d;
    }
    const D = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : dist[y * w + x]);
    const [lx, ly] = opt.light || [-0.6, -0.8];
    const c = document.createElement('canvas');
    c.width = w + pad * 2; c.height = h + pad * 2;
    const g = c.getContext('2d');
    const put = (x, y, col) => { g.fillStyle = col; g.fillRect(x + pad, y + pad, 1, 1); };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = at(x, y), m = matOf(ch);
      if (!m) continue;
      if (opt.solid) { put(x, y, opt.solid); continue; }
      const mat = mats[m];
      if (!mat) continue;
      if (typeof mat === 'string') { put(x, y, mat); continue; }
      if (ch !== m) { put(x, y, mat[opt.volume ? 2 : 1]); continue; }   // lowercase = shadowed panel line (softer on faces)
      const surf = region(ch), same = (dx, dy) => (region(at(x + dx, y + dy)) === surf ? D(x + dx, y + dy) : 0);
      const nx = same(-1, 0) - same(1, 0), ny = same(0, -1) - same(0, 1);
      const len = Math.hypot(nx, ny);
      const lit = len ? (nx * -lx + ny * -ly) / len : 0;
      const d = dist[y * w + x];
      const idx = lit > 0.5 && d <= 1 ? 4 : lit > 0.1 ? 3 : lit < -0.45 ? 1 : d >= 3 ? 3 : 2;
      put(x, y, mat[idx]);
    }
    if (pad && !opt.solid) outline(c);
    else if (pad && opt.solid) {
      g.globalCompositeOperation = 'destination-over';
      g.fillStyle = opt.solid;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.drawImage(c, dx, dy);
    }
    return c;
  }

  // Dark outline around everything opaque on a canvas, tinted by the neighboring color. Leave a 1px
  // transparent margin for it. Used by bake() and by procedurally drawn art (carrier, station).
  function outline(c) {
    const g = c.getContext('2d'), img = g.getImageData(0, 0, c.width, c.height), px = img.data, W2 = c.width;
    const alpha = (x, y) => (x < 0 || y < 0 || x >= W2 || y >= c.height ? 0 : px[(y * W2 + x) * 4 + 3]);
    const out = [];
    for (let y = 0; y < c.height; y++) for (let x = 0; x < W2; x++) {
      if (alpha(x, y)) continue;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => alpha(x + dx, y + dy));
      if (!n) continue;
      const i = ((y + n[1]) * W2 + x + n[0]) * 4;
      out.push([x, y, rgb(px[i] * 0.22, px[i + 1] * 0.2, px[i + 2] * 0.3 + 12)]);
    }
    for (const [x, y, col] of out) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    return c;
  }

  // A soft round glow (concentric bands, no smooth gradients) for additive blending.
  const glowCache = new Map();
  function glow(r, color) {
    const key = r + color;
    if (glowCache.has(key)) return glowCache.get(key);
    const c = document.createElement('canvas');
    c.width = c.height = r * 2 + 1;
    const g = c.getContext('2d'), [R, G, B] = parse(color);
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y) / r;
      if (d > 1) continue;
      const k = Math.ceil((1 - d) * 4) / 4;   // four hard bands
      g.fillStyle = rgb(R * k, G * k, B * k);
      g.fillRect(x + r, y + r, 1, 1);
    }
    glowCache.set(key, c);
    return c;
  }

  // A shaded ball lit from the top-left, in the five shades of `color`'s ramp (banded, not smooth).
  const sphereCache = new Map();
  function sphere(r, color) {
    const key = r + color;
    if (sphereCache.has(key)) return sphereCache.get(key);
    const R = ramp(color), c = document.createElement('canvas');
    c.width = c.height = r * 2 + 1;
    const g = c.getContext('2d');
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d2 = (x * x + y * y) / (r * r);
      if (d2 > 1) continue;
      const lit = (-x * 0.55 - y * 0.6) / r + Math.sqrt(1 - d2) * 0.58;
      g.fillStyle = R[lit > 0.95 ? 4 : lit > 0.6 ? 3 : lit > 0.25 ? 2 : lit > -0.1 ? 1 : 0];
      g.fillRect(x + r, y + r, 1, 1);
    }
    sphereCache.set(key, c);
    return c;
  }

  // A rotating planet: the Mode 7 texture wrapped onto a sphere, with banded day/night shading.
  // Only the part on screen is computed, so a huge globe rising from the bottom stays cheap.
  const gl = { canvas: null };
  function globe(ctx, tex, cx, cy, r, rot) {
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(NES.W, Math.ceil(cx + r + 1));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(NES.H, Math.ceil(cy + r + 1));
    if (x1 <= x0 || y1 <= y0) return;
    const w = x1 - x0, h = y1 - y0;
    if (!gl.canvas || gl.canvas.width < w || gl.canvas.height < h) {
      gl.canvas = document.createElement('canvas');
      gl.canvas.width = NES.W; gl.canvas.height = NES.H;
      gl.ctx = gl.canvas.getContext('2d');
    }
    const img = gl.ctx.createImageData(w, h), buf = new Uint32Array(img.data.buffer);
    const px = tex.px, size = tex.size, TAU = Math.PI * 2;
    for (let y = 0; y < h; y++) {
      const dy = (y + y0 - cy) / r;
      for (let x = 0; x < w; x++) {
        const dx = (x + x0 - cx) / r, d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        const nz = Math.sqrt(1 - d2);
        const u = (((Math.atan2(dx, nz) + rot) / TAU) % 1 + 1) % 1, v = Math.asin(dy) / Math.PI + 0.5;
        const c = px[Math.min(size - 1, (v * size) | 0) * size + ((u * size) | 0)];
        const lit = -dx * 0.55 - dy * 0.45 + nz * 0.7;
        const k = lit > 0.7 ? 1.5 : lit > 0.35 ? 1.25 : lit > 0.05 ? 0.95 : lit > -0.25 ? 0.55 : 0.25;
        const R = Math.min(255, (c & 255) * k), G = Math.min(255, ((c >> 8) & 255) * k), B = Math.min(255, ((c >> 16) & 255) * k);
        buf[y * w + x] = 0xff000000 | (B << 16) | (G << 8) | R;
      }
    }
    gl.ctx.clearRect(0, 0, w, h);
    gl.ctx.putImageData(img, 0, 0);
    ctx.drawImage(gl.canvas, 0, 0, w, h, x0, y0, w, h);
  }

  // ---- Drawing ----------------------------------------------------------------------------------
  // Rotation is smooth (snapped to 64 steps so pixels don't shimmer) and may be scaled.
  const STEP = Math.PI / 32;
  function drawRot(ctx, img, x, y, ang = 0, sx = 1, sy = sx) {
    const a = Math.round(ang / STEP) * STEP;
    if (!a && sx === 1 && sy === 1) {
      ctx.drawImage(img, Math.round(x) - (img.width >> 1), Math.round(y) - (img.height >> 1));
      return;
    }
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (a) ctx.rotate(a);
    ctx.scale(sx, sy);
    ctx.drawImage(img, -(img.width >> 1), -(img.height >> 1));
    ctx.restore();
  }
  // Color math: additive ("lighter") or half-transparent drawing, like the SNES sub-screen blend.
  function add(ctx, fn) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; fn(); ctx.restore(); }
  function half(ctx, fn, a = 0.5) { ctx.save(); ctx.globalAlpha = a; fn(); ctx.restore(); }

  // HDMA-style gradient: one color per scanline, interpolated between stops and quantized to 15-bit.
  const bandCache = new Map();
  function bands(ctx, y0, y1, stops, x = 0, w = NES.W) {
    const key = stops.join() + (y1 - y0);
    let c = bandCache.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = 1; c.height = Math.max(1, y1 - y0);
      const g = c.getContext('2d');
      for (let y = 0; y < c.height; y++) {
        const t = (y / Math.max(1, c.height - 1)) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(t));
        g.fillStyle = stops.length > 1 ? mix(stops[i], stops[i + 1], t - i) : stops[0];
        g.fillRect(0, y, 1, 1);
      }
      bandCache.set(key, c);
    }
    ctx.drawImage(c, x, y0, w, y1 - y0);
  }

  // Offscreen canvas painted once by fn(g, w, h): used for parallax layers and Mode 7 textures.
  function layer(w, h, fn) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    fn(c.getContext('2d'), w, h);
    return c;
  }
  // Tile a layer horizontally (side missions) or vertically (vertical stages) at a scroll offset.
  function scrollX(ctx, img, off, y) {
    const w = img.width;
    let x = -(((Math.round(off) % w) + w) % w);
    for (; x < NES.W; x += w) ctx.drawImage(img, x, y);
  }
  function scrollY(ctx, img, off, x = 0) {
    const h = img.height;
    let y = (((Math.round(off) % h) + h) % h) - h;
    for (; y < NES.H; y += h) for (let tx = x; tx < NES.W; tx += img.width) ctx.drawImage(img, tx, y);
  }

  // ---- Mode 7 -----------------------------------------------------------------------------------
  // A texture is a power-of-two canvas turned into packed pixels for fast per-scanline sampling.
  function texture(size, fn) {
    const c = layer(size, size, fn);
    const px = new Uint32Array(c.getContext('2d').getImageData(0, 0, size, size).data.buffer);
    return { size, px };
  }
  // Perspective floor, drawn one scanline at a time like Mode 7 with HDMA-changed matrices.
  // o: { x, y (camera over the texture), ang (heading, 0 = texture up), top, bottom (screen rows),
  //      horizon (row where the plane meets the sky), height (camera height), fog: [hex, amount] }
  const m7 = { canvas: null, ctx: null, img: null };
  function mode7(ctx, tex, o) {
    const W0 = NES.W, top = Math.max(o.top, Math.ceil(o.horizon + 1)), rows = o.bottom - top;
    if (rows <= 0) return;
    if (!m7.canvas || m7.canvas.height !== NES.H) {
      m7.canvas = layer(W0, NES.H, () => {});
      m7.ctx = m7.canvas.getContext('2d');
      m7.img = m7.ctx.createImageData(W0, NES.H);
      m7.buf = new Uint32Array(m7.img.data.buffer);
    }
    const buf = m7.buf, px = tex.px, mask = tex.size - 1, size = tex.size;
    const fx = Math.sin(o.ang || 0), fy = -Math.cos(o.ang || 0);   // forward
    const rx = -fy, ry = fx;                                       // right
    const [fr, fg, fb] = o.fog ? parse(o.fog[0]) : [0, 0, 0];
    for (let y = top; y < o.bottom; y++) {
      const z = (o.height || 64) * 128 / (y - o.horizon);            // distance to this scanline
      const lat = z / 128;                                           // world units per screen pixel
      let wx = o.x + fx * z - rx * lat * 128, wy = o.y + fy * z - ry * lat * 128;
      const sx = rx * lat, sy = ry * lat;
      const f = o.fog ? Math.min(1, (o.fog[1] || 1) * 40 / (y - o.horizon)) : 0;
      const k = Math.round(f * 8) / 8;                               // fog steps per scanline, like color math
      const row = y * W0;
      for (let x = 0; x < W0; x++) {
        let c = px[((wy | 0) & mask) * size + ((wx | 0) & mask)];
        if (k) {
          const r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
          c = 0xff000000 | ((b + (fb - b) * k) << 16) | ((g + (fg - g) * k) << 8) | (r + (fr - r) * k);
        }
        buf[row + x] = c;
        wx += sx; wy += sy;
      }
    }
    m7.ctx.putImageData(m7.img, 0, 0, 0, top, W0, rows);
    ctx.drawImage(m7.canvas, 0, top, W0, rows, 0, top, W0, rows);
  }

  return { rgb, mix, ramp, mirror, bake, outline, glow, sphere, globe, drawRot, add, half, bands, layer, scrollX, scrollY, texture, mode7 };
})();
