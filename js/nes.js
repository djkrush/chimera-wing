'use strict';
// NES-style rendering helpers: palette, sprite baking, 5x7 bitmap font, primitives.
const NES = (() => {
  const W = 424, H = 240;   // 16:9 widescreen at the SNES's 240 lines

  // Colors taken from the NES 2C02 palette (common emulator values).
  const C = {
    black: '#000000', white: '#FCFCFC', lgray: '#BCBCBC', gray: '#7C7C7C',
    navy: '#0000BC', blue: '#0058F8', sky: '#3CBCFC', ice: '#A4E4FC', periwinkle: '#6888FC',
    violet: '#6844FC', purple: '#940084', magenta: '#D800CC', pink: '#F878F8', lavender: '#9878F8', rose: '#E40058',
    red: '#F83800', darkred: '#A81000', maroon: '#881400', orange: '#FCA044', rust: '#E45C10',
    gold: '#F8B800', yellow: '#F8D878', cream: '#FCE0A8', skin: '#F0D0B0', brown: '#503000', olive: '#AC7C00',
    dgreen: '#005800', green: '#00A800', lime: '#58D854', chartreuse: '#B8F818', mint: '#B8F8B8',
    teal: '#008888', cyan: '#00E8D8', aqua: '#00FCFC',
  };

  // 5x7 font. Each number is one row; bit 4 is the leftmost pixel.
  const FONT = {
    A: [0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11], B: [0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E],
    C: [0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E], D: [0x1E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1E],
    E: [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F], F: [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10],
    G: [0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0F], H: [0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
    I: [0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E], J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0C],
    K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11], L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F],
    M: [0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11], N: [0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11],
    O: [0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E], P: [0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10],
    Q: [0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D], R: [0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11],
    S: [0x0F, 0x10, 0x10, 0x0E, 0x01, 0x01, 0x1E], T: [0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
    U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E], V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04],
    W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0A], X: [0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11],
    Y: [0x11, 0x11, 0x11, 0x0A, 0x04, 0x04, 0x04], Z: [0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F],
    0: [0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E], 1: [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E],
    2: [0x0E, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1F], 3: [0x1F, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0E],
    4: [0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02], 5: [0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E],
    6: [0x06, 0x08, 0x10, 0x1E, 0x11, 0x11, 0x0E], 7: [0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
    8: [0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E], 9: [0x0E, 0x11, 0x11, 0x0F, 0x01, 0x02, 0x0C],
    '.': [0, 0, 0, 0, 0, 0x0C, 0x0C], ',': [0, 0, 0, 0, 0x0C, 0x04, 0x08],
    '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04], '?': [0x0E, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
    ':': [0, 0x0C, 0x0C, 0, 0x0C, 0x0C, 0], '-': [0, 0, 0, 0x1F, 0, 0, 0],
    "'": [0x04, 0x04, 0x08, 0, 0, 0, 0], '/': [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
    '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02], ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
    '+': [0, 0x04, 0x04, 0x1F, 0x04, 0x04, 0], '=': [0, 0, 0x1F, 0, 0x1F, 0, 0],
    '>': [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08], '<': [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02],
    '"': [0x0A, 0x0A, 0, 0, 0, 0, 0], '%': [0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03],
    '[': [0x0E, 0x08, 0x08, 0x08, 0x08, 0x08, 0x0E], ']': [0x0E, 0x02, 0x02, 0x02, 0x02, 0x02, 0x0E],
  };

  // SNES-style glyphs: each row shaded (light top, dark bottom) and a dark outline all round, so text
  // reads on any background. The glyph canvas is 7x9 (the 5x7 letter plus the outline); the advance
  // stays 8px so layouts don't change. `rows` gives each of the 7 rows its own color (logos).
  const glyphCache = new Map();
  function glyph(ch, color, rows) {
    const key = ch + (rows ? rows.join() : color);
    if (glyphCache.has(key)) return glyphCache.get(key);
    const bits = FONT[ch];
    let g = null;
    if (bits) {
      const shade = rows || [0.45, 0.2, 0, 0, 0, -0.18, -0.34].map(k =>
        k > 0 ? SNES.mix(color, '#ffffff', k) : k < 0 ? SNES.mix(color, '#000000', -k) : color);
      g = document.createElement('canvas');
      g.width = 7; g.height = 9;
      const x = g.getContext('2d');
      const on = (c, r) => r >= 0 && r < 7 && c >= 0 && c < 5 && (bits[r] & (16 >> c));
      x.fillStyle = '#000010';
      for (let r = -1; r <= 7; r++) for (let c = -1; c <= 5; c++) {
        if (on(c, r)) continue;
        if (on(c - 1, r) || on(c + 1, r) || on(c, r - 1) || on(c, r + 1) || on(c - 1, r - 1)) x.fillRect(c + 1, r + 1, 1, 1);
      }
      bits.forEach((b, r) => { x.fillStyle = shade[r]; for (let c = 0; c < 5; c++) if (b & (16 >> c)) x.fillRect(c + 1, r + 1, 1, 1); });
    }
    glyphCache.set(key, g);
    return g;
  }

  function textWidth(str, scale = 1) { return str.length ? (str.length * 8 - 3) * scale : 0; }

  function run(ctx, str, x, y, color, scale, rows) {
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === ' ') continue;
      const g = glyph(ch, color, rows);
      if (g) ctx.drawImage(g, x + i * 8 * scale - scale, y - scale, 7 * scale, 9 * scale);
    }
  }

  // opt: { scale, align: 'center'|'right', rows: [7 row colors] (default: shaded; chrome at scale 2+), shadow: color }
  function text(ctx, str, x, y, color = C.white, opt = {}) {
    str = String(str).toUpperCase();
    const scale = opt.scale || 1;
    if (opt.align === 'center') x -= Math.floor(textWidth(str, scale) / 2);
    else if (opt.align === 'right') x -= textWidth(str, scale);
    x = Math.round(x); y = Math.round(y);
    if (opt.shadow) run(ctx, str, x + scale, y + scale, opt.shadow, scale, null);
    run(ctx, str, x, y, color, scale, opt.rows || (scale >= 2 ? chrome(color) : null));   // big titles are chrome
  }

  // Bake a sprite from rows of characters. '.' is transparent; other chars look up `map`.
  // If `solid` is given, every opaque pixel uses that color (for hit-flash silhouettes).
  function sprite(rows, map, solid) {
    const h = rows.length, w = Math.max(...rows.map(r => r.length));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < rows[j].length; i++) {
        const ch = rows[j][i];
        if (ch === '.' || ch === ' ') continue;
        const col = solid || map[ch];
        if (!col) continue;
        x.fillStyle = col;
        x.fillRect(i, j, 1, 1);
      }
    }
    return c;
  }

  function draw(ctx, img, x, y) {
    ctx.drawImage(img, Math.round(x) - (img.width >> 1), Math.round(y) - (img.height >> 1));
  }

  // Rotation snapped to 16 directions, like pre-drawn arcade sprite rotations.
  const STEP = Math.PI / 8;
  function drawRot(ctx, img, x, y, ang) {
    let a = Math.round(ang / STEP) % 16;
    if (a < 0) a += 16;
    if (a === 0) { draw(ctx, img, x, y); return; }
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(a * STEP);
    ctx.drawImage(img, -(img.width >> 1), -(img.height >> 1));
    ctx.restore();
  }

  // Mirrored left-right (side profiles flying the other way).
  function drawFlip(ctx, img, x, y) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(img, -(img.width >> 1), -(img.height >> 1));
    ctx.restore();
  }

  function disc(ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    cx = Math.round(cx); cy = Math.round(cy);
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(r * r - dy * dy));
      ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
    }
  }

  // SNES window: a vertical gradient panel (black asks for the classic deep-blue RPG window) inside a
  // rounded, beveled frame in the border color: light top-left edge, darker bottom-right, dark outline.
  function box(ctx, x, y, w, h, fill = C.black, border = C.white) {
    const stops = fill === C.black ? ['#182c70', '#0c1848', '#050a24']
      : [SNES.mix(fill, '#ffffff', 0.18), fill, SNES.mix(fill, '#000000', 0.45)];
    const hi = SNES.mix(border, '#ffffff', 0.45), lo = SNES.mix(border, '#000000', 0.35);
    const r = (col, a, b, cw, ch) => { ctx.fillStyle = col; ctx.fillRect(a, b, cw, ch); };
    r('#000010', x + 1, y, w - 2, h); r('#000010', x, y + 1, w, h - 2);        // outline, corners cut
    r(lo, x + 1, y + 1, w - 2, h - 2);
    r(hi, x + 2, y + 1, w - 4, 1); r(hi, x + 1, y + 2, 1, h - 4);              // lit edges
    r(border, x + 2, y + 2, w - 4, h - 4);
    SNES.bands(ctx, y + 3, y + h - 3, stops, x + 3, w - 6);
  }

  // Chrome rows for big titles (pass as `rows`): bright top, a light band across the middle, dark base.
  const chrome = col => [SNES.mix(col, '#ffffff', 0.8), SNES.mix(col, '#ffffff', 0.45), col,
    SNES.mix(col, '#ffffff', 0.6), SNES.mix(col, '#000000', 0.1), SNES.mix(col, '#000000', 0.35), SNES.mix(col, '#000000', 0.55)];

  // Highlight bar behind a selected menu line: a blue gradient with a bright top edge.
  function hilite(ctx, x, y, w, h, col = '#2850c8') {
    SNES.bands(ctx, y, y + h, [SNES.mix(col, '#ffffff', 0.25), col, SNES.mix(col, '#000000', 0.5)], x, w);
    ctx.fillStyle = SNES.mix(col, '#ffffff', 0.55); ctx.fillRect(x + 1, y, w - 2, 1);
  }

  function wrap(str, n) {
    const lines = [];
    let cur = '';
    for (const word of str.split(' ')) {
      if (cur && (cur + ' ' + word).length > n) { lines.push(cur); cur = word; }
      else cur = cur ? cur + ' ' + word : word;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  return { W, H, C, text, textWidth, sprite, draw, drawRot, drawFlip, disc, box, hilite, chrome, wrap };
})();
