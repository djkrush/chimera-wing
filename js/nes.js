'use strict';
// NES-style rendering helpers: palette, sprite baking, 5x7 bitmap font, primitives.
const NES = (() => {
  const W = 256, H = 240;

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

  const glyphCache = new Map();
  function glyph(ch, color) {
    const key = ch + color;
    if (glyphCache.has(key)) return glyphCache.get(key);
    const rows = FONT[ch];
    let g = null;
    if (rows) {
      g = document.createElement('canvas');
      g.width = 5; g.height = 7;
      const x = g.getContext('2d');
      x.fillStyle = color;
      rows.forEach((bits, r) => { for (let c = 0; c < 5; c++) if (bits & (16 >> c)) x.fillRect(c, r, 1, 1); });
    }
    glyphCache.set(key, g);
    return g;
  }

  function textWidth(str, scale = 1) { return str.length ? (str.length * 8 - 3) * scale : 0; }

  function run(ctx, str, x, y, color, scale, rows) {
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === ' ') continue;
      const dx = x + i * 8 * scale;
      if (rows) {
        for (let r = 0; r < 7; r++) {
          const g = glyph(ch, rows[r]);
          if (g) ctx.drawImage(g, 0, r, 5, 1, dx, y + r * scale, 5 * scale, scale);
        }
      } else {
        const g = glyph(ch, color);
        if (g) ctx.drawImage(g, dx, y, 5 * scale, 7 * scale);
      }
    }
  }

  // opt: { scale, align: 'center'|'right', rows: [7 colors for a vertical gradient], shadow: color }
  function text(ctx, str, x, y, color = C.white, opt = {}) {
    str = String(str).toUpperCase();
    const scale = opt.scale || 1;
    if (opt.align === 'center') x -= Math.floor(textWidth(str, scale) / 2);
    else if (opt.align === 'right') x -= textWidth(str, scale);
    x = Math.round(x); y = Math.round(y);
    if (opt.shadow) run(ctx, str, x + scale, y + scale, opt.shadow, scale, null);
    run(ctx, str, x, y, color, scale, opt.rows);
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

  function disc(ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    cx = Math.round(cx); cy = Math.round(cy);
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(r * r - dy * dy));
      ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
    }
  }

  function box(ctx, x, y, w, h, fill = C.black, border = C.white) {
    ctx.fillStyle = border; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
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

  return { W, H, C, text, textWidth, sprite, draw, drawRot, disc, box, wrap };
})();
