'use strict';
// Character portraits (56 x 64), painted like SNES fighting-game select screens: front views lit hard
// from the upper left, hand-picked 5-6 tone ramps with banded shading, a dark line only around the
// silhouette. The pilots are in full flight gear in the cockpit; Mira and Voss are painted faces.
//
// Each face is painted as vector shapes on a 4x canvas: every shape has a material (skin, hair,
// cloth...) and its own rounded-form lighting, and shadow/highlight shapes are painted over the light.
// The result is reduced to pixels: each pixel takes the majority material of its 4x4 block
// and the ramp shade for its average light. Eyes and glints are then stamped by hand, pixel by pixel.

const FACES = (() => {
  const FW = 56, FH = 64, S = 4, K = 1.4;   // portrait size in pixels; shapes are drawn in 40 x 48 units (x K)

  function painter() {
    const mk = () => { const c = document.createElement('canvas'); c.width = FW * S; c.height = FH * S; const g = c.getContext('2d'); g.scale(S * K, S * K); return g; };
    const ids = mk(), light = mk(), mats = [null];
    light.fillStyle = '#000'; light.fillRect(0, 0, 40, 48);
    const path = (g, pts, close = true) => {   // points; a 4-number point is a curve [cx, cy, x, y]
      g.beginPath();
      if (typeof pts === 'function') { pts(g); return; }
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i];
        if (p.length === 4) g.quadraticCurveTo(p[0], p[1], p[2], p[3]); else g.lineTo(p[0], p[1]);
      }
      if (close) g.closePath();
    };
    // form: [cx, cy, rx, ry] of the rounded mass the shape belongs to (lit from the upper left)
    const formFill = (form, lo = 0.12, hi = 0.97) => {
      const [cx, cy, rx, ry] = form, r = Math.max(rx, ry) * 1.5;
      const gr = light.createRadialGradient(cx - rx * 0.35, cy - ry * 0.3, 0, cx - rx * 0.1, cy - ry * 0.1, r);
      const v = t => { const k = Math.round((hi - (hi - lo) * t) * 255); return `rgb(${k},${k},${k})`; };
      gr.addColorStop(0, v(0)); gr.addColorStop(0.5, v(0.25)); gr.addColorStop(0.8, v(0.6)); gr.addColorStop(1, v(1));
      return gr;
    };
    const P = {
      // A palette ramp (dark to light), returns the material id.
      mat(ramp) { mats.push(ramp); return mats.length - 1; },
      shape(m, pts, form, lo, hi) {
        path(ids, pts); ids.fillStyle = `rgb(${m * 8},0,0)`; ids.fill();
        path(light, pts); light.fillStyle = form ? formFill(form, lo, hi) : '#b0b0b0'; light.fill();
      },
      // A shape lit by a straight gradient (visors, lenses, sky): light v0 at (x0, y0) to v1 at (x1, y1).
      shapeLin(m, pts, [x0, y0, x1, y1], v0, v1) {
        path(ids, pts); ids.fillStyle = `rgb(${m * 8},0,0)`; ids.fill();
        const gr = light.createLinearGradient(x0, y0, x1, y1), k = v => { const c = Math.round(v * 255); return `rgb(${c},${c},${c})`; };
        gr.addColorStop(0, k(v0)); gr.addColorStop(1, k(v1));
        path(light, pts); light.fillStyle = gr; light.fill();
      },
      // Lines drawn as a material (brows, lids, strands).
      stroke(m, pts, w, lv = 0.5) {
        ids.lineWidth = light.lineWidth = w; ids.lineCap = light.lineCap = 'round'; ids.lineJoin = light.lineJoin = 'round';
        path(ids, pts, false); ids.strokeStyle = `rgb(${m * 8},0,0)`; ids.stroke();
        path(light, pts, false); const k = Math.round(lv * 255); light.strokeStyle = `rgb(${k},${k},${k})`; light.stroke();
      },
      // Paint light (a > 0) or shadow (a < 0) over whatever is there, without changing materials.
      shade(pts, a) { path(light, pts); light.fillStyle = a > 0 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${-a})`; light.fill(); },
      shadeLine(pts, w, a) {
        light.lineWidth = w; light.lineCap = 'round';
        path(light, pts, false); light.strokeStyle = a > 0 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${-a})`; light.stroke();
      },
      ell: (cx, cy, rx, ry, rot = 0) => g => g.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2),
      // Reduce to pixels, outline the silhouette, then apply hand stamps: { x, y, rows, map: {ch: color} }.
      // opt.bg: materials that count as background for the outline (a painted sky).
      bake(stamps = [], opt = {}) {
        const bgSet = new Set(opt.bg || []);
        const W4 = FW * S, idd = ids.getImageData(0, 0, W4, FH * S).data, lid = light.getImageData(0, 0, W4, FH * S).data;
        const out = new Array(FW * FH).fill(null), matAt = new Int16Array(FW * FH);
        for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
          const count = new Map();
          let lsum = 0, ln = 0;
          for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
            const k = ((y * S + j) * W4 + x * S + i) * 4, r = idd[k], a = idd[k + 3];
            if (a < 250 || r % 8) continue;
            count.set(r / 8, (count.get(r / 8) || 0) + 1);
          }
          let m = 0, best = 0;
          for (const [id, n] of count) if (n > best) { best = n; m = id; }
          if (!m || best < 6) continue;
          for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
            const k = ((y * S + j) * W4 + x * S + i) * 4;
            if (idd[k] / 8 === m) { lsum += lid[k]; ln++; }
          }
          const ramp = mats[m], l = lsum / ln / 255;
          matAt[y * FW + x] = m;
          out[y * FW + x] = ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(l * ramp.length)))];
        }
        // fill pinholes (a background pixel boxed in by the figure) with a neighbor's color
        for (let y = 1; y < FH - 1; y++) for (let x = 1; x < FW - 1; x++) {
          const i = y * FW + x;
          if (matAt[i]) continue;
          const nb = [i - 1, i + 1, i - FW, i + FW].filter(k => matAt[k]);
          if (nb.length >= 3) { matAt[i] = matAt[nb[0]]; out[i] = out[nb[0]]; }
        }
        // selective outline: figure pixels touching the background take their ramp's darkest shade
        const edge = [];
        for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
          const m = matAt[y * FW + x];
          if (!m || bgSet.has(m)) continue;
          const bg = (xx, yy) => xx >= 0 && yy >= 0 && xx < FW && yy < FH - 1 && (!matAt[yy * FW + xx] || bgSet.has(matAt[yy * FW + xx]));
          if (bg(x - 1, y) || bg(x + 1, y) || bg(x, y - 1) || bg(x, y + 1)) edge.push([y * FW + x, mats[m][0]]);
        }
        for (const [i, c] of edge) out[i] = c;
        for (const st of stamps) st.rows.forEach((row, j) => [...row].forEach((ch, i) => {
          if (ch !== '.' && st.map[ch]) out[(st.y + j) * FW + st.x + i] = st.map[ch];
        }));
        const c = document.createElement('canvas');
        c.width = FW; c.height = FH;
        const g = c.getContext('2d');
        out.forEach((col, i) => { if (col) { g.fillStyle = col; g.fillRect(i % FW, Math.floor(i / FW), 1, 1); } });
        return c;
      },
    };
    return P;
  }

  // ---- Shared anatomy: a head seen from the front, lit from the upper left --------------------------
  // Drawn in 40 x 48 units (the painter scales them to the portrait). o: { skin, line, lips } materials.
  const mirror = pts => [...pts, ...pts.slice().reverse().map(([x, y]) => [40 - x, y])];
  // The neck is painted before the clothes, the head after them.
  function frontNeck(P, o) {
    P.shape(o.skin, mirror([[20, 27], [16.4, 27], [16.2, 40], [20, 41]]), [19, 33, 5, 7], 0.1, 0.85);
    P.shade(mirror([[20, 29.5], [16, 29], [16.2, 33.5], [20, 34.5]]), -0.45);                         // under the chin
  }
  function frontHead(P, o) {
    for (const s of [1, -1]) P.shape(o.skin, P.ell(20 - s * 9.3, 20, 1.6, 2.8), [20 - s * 9.3, 20, 1.6, 2.8], 0.1, 0.8);   // ears
    P.shape(o.skin, mirror([[20, 6.2], [15.2, 7.2], [12, 10.5], [11, 15.5], [11.1, 20.5], [11.9, 24.8], [13.9, 28.6], [16.9, 31.4], [20, 32.3]]),
      [19, 17, 10, 13.5], 0.06, 1);
    P.shade(P.ell(27, 20, 4.5, 12), -0.12);                                                     // the side away from the light
    P.shade(P.ell(16, 19.7, 3.2, 1.9), -0.25);                                                   // eye sockets
    P.shade(P.ell(24, 19.7, 3.2, 1.9), -0.35);
    P.shade(P.ell(14.6, 23.2, 2.2, 1.2), 0.3);                                                  // cheekbones
    P.shade(P.ell(25.4, 23.2, 1.8, 1), 0.1);
    P.shadeLine([[13.5, 25.5], [15.5, 28.5]], 1.2, -0.2);
    P.shadeLine([[26.5, 25.5], [24.5, 28.5]], 1.2, -0.3);
    P.shadeLine([[19.5, 19], [19.5, 24.8]], 0.9, 0.4);                                           // nose
    P.shade([[20.6, 20.5], [21.6, 24.5], [21.4, 25.8], [20.4, 25.8]], -0.22);
    P.shade([[18.2, 26.2], [21.8, 26.2], [21.3, 26.9], [18.7, 26.9]], -0.35);
    P.stroke(o.line, [[18.6, 25.8], [19, 26]], 0.7, 0.2); P.stroke(o.line, [[21, 26], [21.4, 25.8]], 0.7, 0.2);   // nostrils
    if (o.lips) {
      P.shape(o.lips, [[17.2, 28.5], [18.9, 27.9], [20, 28.2], [21.1, 27.9], [22.8, 28.5], [20, 29]], [20, 28.4, 3, 1], 0.15, 0.75);
      P.shape(o.lips, [[17.8, 29.1], [22.2, 29.1], [21.2, 30.3], [18.8, 30.3]], [19.5, 29.6, 2.4, 1], 0.35, 1);
    }
    P.stroke(o.line, [[17.2, 28.5], [18.5, 29], [20, 29.1], [21.5, 29], [22.8, 28.4]], 0.55, 0.15);   // mouth, corners turned up
    P.shade([[18.8, 30.6], [21.2, 30.6], [20.8, 31.2], [19.2, 31.2]], -0.15);                      // under the lower lip
    P.shade(P.ell(19.4, 31.2, 1.6, 0.8), 0.2);                                                  // chin
  }
  // Mirrored eye/brow stamps around the face's center column (x = 27.5 in pixels).
  const pair = (x, y, left, map) => ({ x, y, rows: left.map(r => r + '.'.repeat(56 - 2 * x - 2 * r.length) + [...r].reverse().join('')), map });

  // ---- The cast ----------------------------------------------------------------------------------
  const SKIN = ['#3a1410', '#7c3424', '#b8603c', '#e0906a', '#f4bc96', '#ffe4c8'];
  const SKIN_TAN = ['#301008', '#682c18', '#a05030', '#cc7c50', '#e8a878', '#f8d4ac'];
  const LINE = ['#1c0808', '#3c1810', '#5c2818'];

  // Dr. Mira Kato, the mission commander: fleet uniform with a high collar, gold shoulder boards and
  // ribbons, dark hair drawn back, a slim headset; the carrier's bridge behind her.
  function mira() {
    const P = painter();
    const bg = P.mat(['#040c1c', '#0c1c38', '#183058', '#28487c']), skin = P.mat(SKIN), line = P.mat(LINE);
    const lips = P.mat(['#5c1420', '#a0303c', '#d05860', '#f08c8c']), hair = P.mat(['#0c0608', '#1c0e0c', '#342018', '#503020', '#704830', '#98683c']);
    const coat = P.mat(['#060a18', '#101c38', '#1c3058', '#2c4880', '#4868a8']), gold = P.mat(['#503000', '#a07010', '#e0b030', '#fff080']);
    const shirt = P.mat(['#8890a0', '#c0c8d4', '#ffffff']), set = P.mat(['#101418', '#303844', '#586470', '#8c98a4']);
    const rib = P.mat(['#801818', '#d03030']), rib2 = P.mat(['#185020', '#30a040']);
    P.shapeLin(bg, [[0, 0], [40, 0], [40, 48], [0, 48]], [0, 0, 0, 46], 0.9, 0.2);
    P.shape(hair, mirror([[20, 3.5], [13, 5], [9, 10], [8, 19], [9.5, 27], [12, 29], [11.5, 20], [13, 12], [20, 9]]), [20, 15, 12, 13]);   // hair behind
    frontNeck(P, { skin });
    P.shape(coat, mirror([[20, 34], [15, 31.5], [7, 34], [1, 38], [0, 48], [20, 48]]), [20, 41, 22, 9]);
    P.shape(shirt, mirror([[20, 35.5], [16.5, 32], [18, 38], [20, 40]]), [20, 36, 3, 4]);
    for (const s of [1, -1]) {
      const X = x => (s > 0 ? x : 40 - x);
      P.shape(coat, [[X(16), 30.5], [X(19), 36], [X(15), 39], [X(12.5), 33]], [X(15), 34, 3, 4], 0.2, 1);   // collar tabs
      P.shape(gold, [[X(3), 36.2], [X(10), 34], [X(10.5), 36], [X(3.5), 38.4]], [X(7), 36, 4, 2]);           // shoulder boards
      P.shape(gold, P.ell(X(14.4), 34.5, 0.8, 0.8), null);                                                    // collar pins
    }
    P.shape(rib, [[25, 40.5], [28, 40.5], [28, 41.6], [25, 41.6]], null); P.shape(rib2, [[28, 40.5], [31, 40.5], [31, 41.6], [28, 41.6]], null);
    frontHead(P, { skin, line, lips });
    P.shape(hair, mirror([[20, 5.2], [14, 6.2], [10.8, 10], [10.2, 16], [11, 21], [12, 17], [13.5, 12.5], [16.5, 9.5], [19.5, 8.8], [20, 7.2]]),
      [20, 10, 10, 6], 0.05, 1);                                                                  // parted, swept back
    P.shape(hair, [[20.5, 7.2], [25, 8.5], [28, 12.5], [28.5, 16], [26.5, 11.5], [22, 9.2]], [24, 10, 4, 3]);   // side-swept bang
    for (const [a, b] of [[[13, 8.6], [16, 6.6, 19.5, 6.4]], [[21, 6.6], [25, 7, 27.8, 10]], [[11.4, 12], [11.2, 15]]]) P.shadeLine([a, b], 0.8, 0.55);
    P.shape(set, P.ell(29.3, 20.2, 1.3, 2.2), [29.3, 20, 1.3, 2]);                                  // headset
    P.stroke(set, [[29.3, 22.5], [27.5, 27.5, 24, 29.5]], 0.6, 0.45);
    return P.bake([
      { x: 1, y: 3, rows: ['AAAA', 'A...', 'A...'], map: { A: '#3890d0' } },                             // bridge screens
      { x: 49, y: 5, rows: ['GGG', '.G.', 'GGG'], map: { G: '#40c070' } },
      pair(19, 24, ['..BBBB', '.B....'], { B: '#2c1810' }),
      pair(20, 27, ['.LLLL', 'LWIPW', '.WII.'], { L: '#1c0808', W: '#f4f0f0', I: '#1c8878', P: '#082020' }),
      { x: 22, y: 28, rows: ['X.........X'], map: { X: '#ffffff' } },
    ], { bg: [bg] });
  }

  // Dr. Helena Voss: flame-red hair swept up and to one side, thin glasses, black high collar under a
  // lab coat, the methyl pendant; a dim lab behind her with a DNA helix glowing on the screen.
  function voss() {
    const P = painter();
    const bg = P.mat(['#080010', '#180828', '#301048', '#482068']), skin = P.mat(['#3c1418', '#7c3430', '#b86050', '#dc907c', '#f0b8a4', '#ffe0d0']);
    const line = P.mat(LINE), lips = P.mat(['#400818', '#801028', '#c02040', '#e85060']);
    const hair = P.mat(['#1c0404', '#480c08', '#801c10', '#b83818', '#e06828', '#f8a050']);
    const black = P.mat(['#040406', '#101018', '#20202c', '#343444']), coat = P.mat(['#50586c', '#8890a4', '#b8c0d0', '#e0e4ec', '#ffffff']);
    const gold = P.mat(['#503000', '#a07010', '#e0b030', '#fff080']), frame = P.mat(['#101010', '#303038', '#606070']);
    P.shapeLin(bg, [[0, 0], [40, 0], [40, 48], [0, 48]], [0, 0, 0, 46], 0.9, 0.15);
    P.shape(hair, [[20, 1], [10, 4], [5, 12], [5, 24], [8, 31], [12, 30], [11.5, 20], [30, 18], [33, 26], [35, 20], [34, 9], [28, 2.5]], [19, 14, 15, 14]);
    frontNeck(P, { skin });
    P.shape(coat, mirror([[20, 37], [13, 32], [5, 34.5], [0, 38.5], [0, 48], [20, 48]]), [20, 41, 22, 9]);
    P.shape(black, mirror([[20, 27], [16, 27], [15.3, 32], [13.5, 36], [17, 44], [20, 46]]), [20, 34, 5, 9]);   // high collar
    for (const s of [1, -1]) P.shape(coat, [[20 - s * 13.5, 33], [20 - s * 16, 37], [20 - s * 17, 48], [20 - s * 10, 48]], [20 - s * 13, 40, 4, 8], 0.2, 1);   // lapels
    P.shape(gold, P.ell(20, 41, 1.3, 1.3), [20, 41, 1.3, 1.3]);                                         // pendant
    frontHead(P, { skin, line, lips });
    // swept up and over to her left in a tall wave, one lock down the side
    P.shape(hair, [[9.8, 16], [9.5, 9], [14, 4.2], [21, 2], [29, 3.5], [33.5, 8.5], [32, 12], [29.6, 10.5], [28.2, 16], [25.5, 10.5],
      [21, 8.8], [15.5, 9.5], [12.2, 13], [11.4, 19]], [21, 7, 12, 6], 0.05, 1);
    P.shape(hair, [[29, 12], [32.5, 14], [32, 26], [30.5, 30], [29.2, 22]], [30.5, 20, 2, 8]);
    for (const [a, b] of [[[11.5, 10], [15, 5.2, 21, 4]], [[17, 7.8], [23, 5, 30, 6.5]], [[30.3, 14], [31.3, 20]]]) P.shadeLine([a, b], 0.8, 0.6);
    for (const s of [1, -1]) P.stroke(frame, [[20 - s * 1.2, 19.3], [20 - s * 7, 19]], 0.45, 0.3);    // glasses
    P.stroke(frame, [[18.8, 19.4], [21.2, 19.4]], 0.4, 0.3);
    return P.bake([
      { x: 45, y: 3, rows: ['A..B', '.AB.', '.BA.', 'B..A', 'A..B', '.AB.', '.BA.', 'B..A'], map: { A: '#40d0b0', B: '#c040c0' } },   // helix on the lab screen
      pair(18, 24, ['.BBB..', '....BB'], { B: '#401008' }),                                              // brows angled down: a cold look
      pair(19, 26, ['FFFFFF', 'F....F', 'F....F', '.FFFF.'], { F: '#202028' }),                           // thin glasses frames
      pair(20, 27, ['LLLL', 'WIPW', '.II.'], { L: '#1c0808', W: '#f0f0e8', I: '#9c2468', P: '#200410' }),
      { x: 21, y: 27, rows: ['X..........X'], map: { X: '#e8fff0' } },
      { x: 30, y: 40, rows: ['.L'], map: { L: '#401018' } },                                             // a thin smile
    ], { bg: [bg] });
  }

  // ---- Pilots: front view in the cockpit, in full flight gear ------------------------------------
  // Helmet with the mirrored visor down over the eyes, ear cups,
  // an oxygen mask with its ribbed hose, flight suit, harness vest and shoulder patch, and the canopy
  // frame against the sky behind. o: ramps and options per pilot.
  function pilot(o) {
    const P = painter();
    const sky = P.mat(['#0c1c40', '#183468', '#2858a0', '#4080c8', '#70a8e8']), frame = P.mat(['#0c1014', '#20262e', '#384050']);
    const helmet = P.mat(o.helmet), stripe = P.mat(o.stripe), cup = P.mat(o.cup), mask = P.mat(o.mask);
    const visor = P.mat(o.visor || ['#081830', '#184078', '#3070c0', '#68a8f0', '#b8e0ff', '#ffffff']);
    const dark = P.mat(['#08080c', '#18181e', '#2a2c34', '#3c404a']), metal = P.mat(['#303440', '#687080', '#a8b0c0', '#e0e8f0']);
    const hose = P.mat(['#1c2024', '#3c444c', '#687480', '#98a4b0']), skin = P.mat(o.skin);
    const suit = P.mat(o.suit), vest = P.mat(o.vest), patch = P.mat(['#801010', '#d02820', '#f06050']);
    P.shapeLin(sky, [[0, 0], [40, 0], [40, 48], [0, 48]], [0, 0, 0, 40], 0.95, 0.25);
    P.shape(frame, [[0, 0], [8, 0], [0, 18]], null); P.shape(frame, [[40, 0], [32, 0], [40, 18]], null);   // canopy frame
    P.shape(suit, mirror([[20, 33], [13, 33], [5, 35], [0, 38], [0, 48], [20, 48]]), [20, 40, 22, 10]);
    for (const s of [1, -1]) {
      const X = x => (s > 0 ? x : 40 - x);
      P.shape(vest, [[X(7), 36], [X(15), 33.5], [X(17.5), 48], [X(4), 48]], [X(11), 41, 7, 8]);
      P.shape(metal, [[X(9.5), 41], [X(12.5), 41], [X(12.5), 43.5], [X(9.5), 43.5]], [X(11), 42, 2, 1]);   // harness clip
      P.shadeLine([[X(8), 44.5], [X(16), 44]], 0.8, -0.35);                                     // pocket seam
    }
    P.shape(patch, [[1.5, 39], [7, 38.5], [7, 43], [1.5, 43.5]], [4, 41, 3, 3]);
    P.stroke(metal, [[2, 41], [6.5, 40.8]], 0.7, 0.9);
    P.shape(dark, mirror([[20, 28], [12.5, 29], [12, 36], [20, 37]]), [20, 32, 8, 5]);    // collar and hood
    if (o.hair) for (const s of [1, -1]) { const X = x => (s > 0 ? x : 40 - x); P.shape(P.mat(o.hair), [[X(8), 25], [X(12), 24], [X(12.5), 33], [X(9), 35], [X(7), 30]], [X(10), 28, 3, 5]); }
    P.shape(helmet, P.ell(20, 16.5, 16.2, 16), [20, 14, 16, 15], 0.04, 1);
    P.shade(P.ell(12.5, 5.5, 3.2, 2), 0.45);                                                  // specular
    if (o.alien) {                                                                           // crest ridge for the tall cranium
      P.shape(stripe, mirror([[20, 1], [18, 1.5], [17, 10], [20, 11]]), [20, 6, 3, 5]);
      for (const s of [1, -1]) P.stroke(metal, [[20 - s * 7, 5], [20 - s * 10.5, 1.5]], 1.4, 0.7);   // antenna sleeves
    } else P.shape(stripe, mirror([[20, 0.8], [18.3, 1], [18.3, 9], [20, 9]]), [20, 5, 2, 5]);
    P.shape(skin, mirror([[20, 16], [12, 16], [11, 24], [13, 30], [20, 31]]), [20, 23, 8, 8]);   // face opening
    for (const s of [1, -1]) P.shape(cup, P.ell(20 - s * 14.6, 23.5, 3.2, 5.2), [20 - s * 14.6, 22.5, 3.2, 5.2], 0.05, 1);
    // the mask first, then the visor pulled down over the eyes to meet it: a convex mirror
    // reflecting the sky, the curved horizon, the ground below and the canopy frame
    const m = mirror([[20, 20.5], [16.6, 22.2], [14.1, 26.2], [14.6, 29.4], [17.2, 32.2], [20, 34.2]]);
    P.shape(mask, m, [20, 27, 6.5, 6.5], 0.05, 1);
    P.shadeLine([[19.3, 24], [19.3, 31]], 0.9, 0.35);                                          // the mask's ridge catches the light
    P.shade(mirror([[20, 29], [16, 28], [15, 29.5], [17.2, 32.2], [20, 34.2]]), -0.3);
    for (const s of [1, -1]) {                                                               // mask straps and clips
      P.stroke(dark, [[20 - s * 5.8, 26.5], [20 - s * 11.8, 24]], 0.9, 0.3);
      P.shape(metal, P.ell(20 - s * 6.3, 26.5, 1, 1), null);
    }
    P.shape(metal, P.ell(20, 30.8, 1.9, 1.6), [20, 30.5, 2, 2]);                            // valve
    const vis = mirror([[20, 5.4], [13, 5.9], [8, 7.8], [5.8, 11], [6, 16.5], [7.8, 20.5], [11.5, 23.2], [15.5, 23.6], [18, 22], [20, 21.4]]);
    P.shape(visor, vis, [20, 12, 15, 11], 0.06, 1);
    P.shade([[5.5, 15], [20, 11.5, 34.5, 15], [34.5, 24], [5.5, 24]], -0.4);                  // the ground below the horizon
    P.shadeLine([[6, 14.8], [20, 11.3, 34, 14.8]], 0.8, 0.55);                                 // curved horizon
    P.shadeLine([[7, 17], [11, 9], [15, 7.5]], 1, -0.55);                                     // the canopy frame reflected
    P.shadeLine([[33, 17], [29, 9], [25, 7.5]], 1, -0.55);
    P.shade(P.ell(11.5, 9, 2.8, 1.3, -0.35), 0.65);                                           // specular
    P.stroke(dark, vis.concat([vis[0]]), 0.8, 0.3);
    P.stroke(hose, [[20, 34], [20.4, 38], [23, 41], [26, 43.5], [28, 48]], 3.4, 0.75);      // hose, ribbed
    for (const [x, y] of [[20.2, 35.6], [20.4, 37.4], [21.2, 39.2], [22.6, 40.6], [24.2, 41.8], [25.6, 43.2], [26.8, 45], [27.6, 46.8]]) P.shadeLine([[x - 1.6, y], [x + 1.6, y + 0.3]], 0.55, -0.55);
    return P.bake(o.stamps, { bg: [sky, frame] });
  }

  const jet = { x: 34, y: 14, rows: ['..K..', 'KKKKK', '..K..'], map: { K: '#0c2448' } };   // a wingman reflected in the visor
  const glint = { x: 14, y: 5, rows: ['XX', 'X.'], map: { X: '#ffffff' } };
  const WHITE = ['#50586c', '#8890a4', '#b8c0d0', '#e0e4ec', '#ffffff'], ORANGE = ['#602008', '#b04810', '#e87820', '#f8a848', '#ffd890'];

  // Maverick: white helmet with a red stripe, blue mirror visor, olive mask, teal flight suit.
  const maverick = () => pilot({
    helmet: WHITE, stripe: ['#601010', '#b02020', '#e04030', '#f88060'], cup: ORANGE,
    mask: ['#101c14', '#203828', '#3c5c40', '#648460', '#90a880'],
    skin: SKIN_TAN, suit: ['#0c2428', '#1c4450', '#2c6c78', '#4c98a0', '#80c0c0'], vest: ['#202410', '#3c4420', '#646c38', '#8c9458', '#b8bc80'],
    stamps: [jet, glint],
  });
  // Turtle: olive helmet with a pink stripe, blonde hair at the sides, a rose-gold visor, gray mask.
  const turtle = () => pilot({
    helmet: ['#283018', '#485830', '#708048', '#98a868', '#c8d098'], stripe: ['#681838', '#b83068', '#f06898', '#ffb0d0'], cup: ['#681838', '#b83068', '#f06898', '#ffb0d0'],
    visor: ['#301018', '#704050', '#b87878', '#e8b0a0', '#f8e0d0', '#ffffff'], mask: ['#181c20', '#343c44', '#5c6670', '#8c98a0', '#b8c0c8'],
    skin: SKIN, hair: ['#805008', '#c08818', '#e8b830', '#f8d868', '#fff4b8'],
    suit: ['#0c2008', '#1c4010', '#306820', '#509838', '#80c860'], vest: ['#201c14', '#403828', '#686048', '#908868', '#c0b890'],
    stamps: [jet, glint],
  });
  // Drac: the alien tactician's helmet is tall for his cranium, with sleeves for his antennae and a
  // gold visor.
  const drac = () => pilot({
    alien: true, helmet: ['#281838', '#483060', '#705090', '#9878b8', '#c8b0e0'], stripe: ['#504000', '#a08010', '#e8c030', '#fff080'],
    cup: ['#303440', '#687080', '#a8b0c0', '#e0e8f0'], visor: ['#302000', '#6c5010', '#b08c20', '#e8c848', '#f8ec98', '#ffffff'], mask: ['#180828', '#301048', '#502070', '#7840a0'],
    skin: ['#082010', '#184020', '#306830', '#58984c', '#88c870', '#c0f0a0'],
    suit: ['#180828', '#301048', '#502070', '#7840a0', '#a070d0'], vest: ['#141418', '#2c2c34', '#484c58', '#6c7080', '#9098a8'],
    stamps: [jet, glint, { x: 13, y: 1, rows: ['G' + '.'.repeat(28) + 'G'], map: { G: '#c0ff80' } }],
  });

  // Baked on first use (canvas work belongs after page load, and not every screen needs them).
  const cache = {};
  const get = (k, fn) => cache[k] || (cache[k] = fn());
  return {
    W: FW, H: FH,
    get mira() { return get('mira', mira); },
    get voss() { return get('voss', voss); },
    get pilots() { return get('pilots', () => [maverick(), turtle(), drac()]); },
  };
})();
