'use strict';
// SNES-style sound, modeled on the SPC700. Every instrument is a short sample synthesized at start-up
// at 32 kHz and squeezed through BRR (the SNES's 4-bit ADPCM sample format), then played back pitched
// like the S-DSP does: ADSR envelopes, stereo pan, and one shared echo (a feedback delay of up to
// 240 ms through a low-pass FIR). A low-pass on the output stands in for the Gaussian interpolation.
const Sound = (() => {
  const SR = 32000, TAU2 = Math.PI * 2;
  let ctx = null, master = null, mix = null, sfxBus = null, echoIn = null, echo = null;
  let song = null, wanted = null, muted = false;
  const INST = {};
  const lastPlayed = {};

  // ---- Sample synthesis (runs once, into Float32Arrays at 32 kHz) -------------------------------
  // One band-limited cycle (2048 points) from a list of harmonic amplitudes.
  function cycle(amps) {
    const n = 2048, t = new Float32Array(n + 1);
    amps.forEach((a, k) => { if (a) for (let i = 0; i < n; i++) t[i] += a * Math.sin(TAU2 * (k + 1) * i / n); });
    t[n] = t[0];
    return t;
  }
  const SINE = cycle([1]);
  const saw = (n, roll = 1) => Array.from({ length: n }, (_, k) => 1 / Math.pow(k + 1, roll));
  const pulse = (duty, n) => Array.from({ length: n }, (_, k) => Math.sin(Math.PI * (k + 1) * duty) / (k + 1));
  const white = n => Float32Array.from({ length: n }, () => Math.random() * 2 - 1);
  const len = t => Math.round(t * SR / 16) * 16;   // BRR works in 16-sample blocks

  // Adds an oscillator. Looped samples use whole-number Hz over a whole-second (or quarter-second) loop,
  // so every voice ends its loop exactly where it began and the loop is seamless.
  function addOsc(d, tab, hz, vol, vib = 0, ph = 0) {
    const inc = hz * 2048 / SR;
    for (let i = 0; i < d.length; i++) {
      const k = ph | 0;
      d[i] += vol * (tab[k] + (tab[k + 1] - tab[k]) * (ph - k));
      ph += vib ? inc * (1 + vib * Math.sin(TAU2 * 5 * i / SR)) : inc;
      if (ph >= 2048) ph -= 2048;
    }
    return d;
  }
  // Decaying partial for one-shot samples (pianos, bells, drums).
  function addPartial(d, hz, vol, tau, drop = 0, dropT = 0.05) {
    let ph = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / SR;
      d[i] += vol * Math.exp(-t / tau) * Math.sin(ph);
      ph += TAU2 * hz * (1 + drop * Math.exp(-t / dropT)) / SR;
    }
    return d;
  }
  // RBJ biquad. `loop` runs the filter once to settle so a looped sample stays seamless.
  function filter(d, type, f, q = 0.707, loop = false) {
    const w = TAU2 * f / SR, cs = Math.cos(w), al = Math.sin(w) / (2 * q);
    const a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al;
    let b0, b1, b2;
    if (type === 'lp') { b1 = 1 - cs; b0 = b2 = b1 / 2; }
    else if (type === 'hp') { b1 = -(1 + cs); b0 = b2 = (1 + cs) / 2; }
    else { b0 = al; b1 = 0; b2 = -al; }
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let pass = loop ? 0 : 1; pass < 2; pass++) {
      for (let i = 0; i < d.length; i++) {
        const x = d[i], y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
        x2 = x1; x1 = x; y2 = y1; y1 = y;
        if (pass) d[i] = y;
      }
    }
    return d;
  }
  const shape = (d, fn) => { for (let i = 0; i < d.length; i++) d[i] *= fn(i / SR); return d; };
  const mixIn = (d, s, vol) => { for (let i = 0; i < Math.min(d.length, s.length); i++) d[i] += s[i] * vol; return d; };

  // BRR: 16-sample blocks of 4-bit nibbles, each with a shift and one of the four prediction filters,
  // picked per block for the least error. The first block uses filter 0, as a loop start must.
  const BRR_F = [[0, 0], [15 / 16, 0], [61 / 32, -15 / 16], [115 / 64, -13 / 16]];
  function brr(d) {
    const out = new Float32Array(d.length), tmp = new Float32Array(16), best = new Float32Array(16);
    let p1 = 0, p2 = 0;
    for (let b = 0; b < d.length; b += 16) {
      let bestErr = Infinity, n1 = 0, n2 = 0;
      for (let f = 0; f < (b ? 4 : 1); f++) {
        const [c1, c2] = BRR_F[f];
        let mx = 0, q1 = p1, q2 = p2;
        for (let i = 0; i < 16; i++) { const x = d[b + i] * 32767; mx = Math.max(mx, Math.abs(x - c1 * q1 - c2 * q2)); q2 = q1; q1 = x; }
        let s0 = 0;
        while (s0 < 12 && mx > 7 * (1 << s0)) s0++;
        for (let s = Math.max(0, s0 - 1); s <= s0; s++) {
          const step = 1 << s;
          let err = 0; q1 = p1; q2 = p2;
          for (let i = 0; i < 16; i++) {
            const x = d[b + i] * 32767, pred = c1 * q1 + c2 * q2;
            const nib = Math.max(-8, Math.min(7, Math.round((x - pred) / step)));
            const y = Math.max(-32768, Math.min(32767, pred + nib * step));
            err += (x - y) * (x - y); tmp[i] = y; q2 = q1; q1 = y;
          }
          if (err < bestErr) { bestErr = err; best.set(tmp); n1 = q1; n2 = q2; }
        }
      }
      for (let i = 0; i < 16; i++) out[b + i] = best[i] / 32768;
      p1 = n1; p2 = n2;
    }
    return out;
  }

  // Normalize, BRR-encode and store an instrument. f0 is the pitch the sample plays at rate 1.
  function add(name, d, f0, loop, env = {}) {
    let pk = 0;
    for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i]));
    for (let i = 0; i < d.length; i++) d[i] = d[i] * 0.9 / (pk || 1);
    const buf = ctx.createBuffer(1, d.length, SR);
    buf.getChannelData(0).set(brr(d));
    INST[name] = { buf, f0, loop, dur: d.length / SR, env: { a: 0.002, d: 0, s: 1, sr: 0, r: 0.03, ...env } };
  }

  // The instrument set, like one game's sample bank in the SPC's 64 KB.
  function buildSamples() {
    const buf = t => new Float32Array(len(t)), rnd = () => Math.random() * 2048;
    // Chip waves for sound effects.
    [['sq12', 0.125], ['sq25', 0.25], ['sq50', 0.5]].forEach(([n, duty]) => add(n, addOsc(buf(0.25), cycle(pulse(duty, 15)), 440, 1), 440, true));
    add('saw', addOsc(buf(0.25), cycle(saw(15)), 440, 1), 440, true);
    add('sine', addOsc(buf(0.25), SINE, 440, 1), 440, true);
    add('noise', white(len(0.5)), 1000, true, { a: 0.001, r: 0.02 });
    // Lead: saw plus a hollow square, two voices a few cents apart, with a slow vibrato.
    const leadTab = cycle(saw(14).map((a, k) => a * 0.6 + (k % 2 ? 0 : 0.4 / (k + 1))));
    add('lead', filter(addOsc(addOsc(buf(1), leadTab, 440, 0.55, 0.004), leadTab, 442, 0.45, 0.004, rnd()), 'lp', 4500, 0.7, true),
      440, true, { a: 0.01, d: 0.4, s: 0.75, r: 0.1 });
    const saw28 = cycle(saw(28));
    add('brass', filter(addOsc(addOsc(buf(1), saw28, 220, 0.5), saw28, 221, 0.5, 0, rnd()), 'lp', 2400, 0.8, true),
      220, true, { a: 0.06, d: 0.4, s: 0.7, r: 0.15 });
    // Supersaw strings: seven saws spread over +-3 Hz (about 23 cents).
    { const d = buf(1), t = cycle(saw(30, 1.1));
      for (const off of [-3, -2, -1, 0, 1, 2, 3]) addOsc(d, t, 220 + off, 1 / 7, 0, rnd());
      add('strings', filter(filter(d, 'lp', 3200, 0.7, true), 'hp', 160, 0.7, true), 220, true, { a: 0.3, r: 0.5 }); }
    // Choir "aah": harmonics weighted by the vowel's formants, three singers with vibrato.
    { const d = buf(1), res = (f, c, bw) => 1 / (1 + ((f - c) / bw) ** 2);
      const form = f => res(f, 750, 110) + 0.6 * res(f, 1150, 120) + 0.25 * res(f, 2800, 180) + 0.04;
      const t = cycle(Array.from({ length: 30 }, (_, k) => (k < 2 ? 0.5 : 0) + form((k + 1) * 220) / (k + 1) * 3));
      for (const hz of [219, 220, 221]) addOsc(d, t, hz, 1 / 3, 0.006, rnd());
      add('choir', d, 220, true, { a: 0.35, r: 0.5 }); }
    // Hoover: detuned saws and a narrow pulse over a sub sine (the engine bends it into each note).
    { const d = buf(1), s = cycle(saw(40)), p = cycle(pulse(0.3, 40));
      addOsc(d, s, 110, 0.35); addOsc(d, s, 108, 0.3, 0, rnd()); addOsc(d, p, 112, 0.3, 0, rnd()); addOsc(d, SINE, 55, 0.35);
      add('hoover', filter(d, 'lp', 3200, 0.9, true), 110, true, { a: 0.01, d: 0.5, s: 0.8, r: 0.2 }); }
    { const s = cycle(saw(40));   // reese: two saws 16 cents apart, darkened
      add('reese', filter(addOsc(addOsc(buf(1), s, 110, 0.5), s, 111, 0.5, 0, rnd()), 'lp', 1400, 0.9, true),
        110, true, { a: 0.004, d: 0.25, s: 0.8, r: 0.05 }); }
    add('sub', addOsc(buf(0.5), cycle([1, 0.25, 0.1]), 110, 1), 110, true, { a: 0.005, r: 0.06 });
    add('organ', addOsc(buf(0.5), cycle([1, 0.8, 0.6, 0.5, 0, 0.3, 0, 0.25, 0, 0.1]), 220, 1), 220, true, { a: 0.002, d: 0.2, s: 0.35, r: 0.06 });

    // Rave piano: two slightly detuned strings per note, stretched partials, hammer knock.
    { const d = buf(2);
      for (let k = 1; k <= 16; k++) for (const det of [0, 0.7]) {
        const hz = k * (262 + det) * Math.sqrt(1 + 0.0003 * k * k);
        if (hz < 9000) addPartial(d, hz, 0.5 / Math.pow(k, 1.1), 1.8 / (1 + 0.4 * k));
      }
      mixIn(d, shape(filter(white(len(0.03)), 'bp', 2500, 0.8), t => Math.exp(-t / 0.004)), 0.3);
      add('piano', d, 262, false, { r: 0.2 }); }
    // FM electric piano and bell.
    { const d = buf(2);
      for (let i = 0; i < d.length; i++) {
        const t = i / SR, w = TAU2 * 262 * t;
        d[i] = Math.sin(w + (1.6 * Math.exp(-t / 0.3) + 0.25) * Math.sin(w)) * Math.exp(-t / 1.1) + 0.12 * Math.sin(w * 14) * Math.exp(-t / 0.04);
      }
      add('epiano', d, 262, false, { r: 0.25 }); }
    { const d = buf(2);
      for (let i = 0; i < d.length; i++) {
        const t = i / SR, w = TAU2 * 523 * t;
        d[i] = Math.sin(w + 2.2 * Math.exp(-t / 0.5) * Math.sin(w * 3.5)) * Math.exp(-t / 0.8) * Math.min(1, t / 0.002);
      }
      add('bell', d, 523, false, { r: 0.5 }); }
    // Orchestra hit: strings and brass on root, fifth and octaves, a bow scrape and a timpani thump.
    { const d = buf(0.9), s = cycle(saw(40));
      [[131, 0.3], [131.7, 0.25], [196.5, 0.2], [262, 0.25], [262.9, 0.2], [393.2, 0.12], [524, 0.1]].forEach(([hz, v]) => addOsc(d, s, hz, v, 0, rnd()));
      shape(d, t => Math.min(1, t / 0.004) * (Math.exp(-t / 0.22) + 0.15 * Math.exp(-t / 0.6)));
      mixIn(d, shape(filter(white(d.length), 'bp', 1500, 0.8), t => Math.exp(-t / 0.05)), 0.5);
      addPartial(d, 65.5, 0.6, 0.15);
      add('orch', filter(d, 'lp', 5000), 131, false, { r: 0.3 }); }
    // Timpani: drum-head modes that sag in pitch right after the mallet strike.
    { const d = buf(2);
      [[1, 1, 1.3], [1.5, 0.5, 0.9], [1.98, 0.35, 0.7], [2.44, 0.2, 0.45], [2.9, 0.12, 0.3]].forEach(([r, v, tau]) => addPartial(d, 87 * r, v, tau, 0.02, 0.06));
      mixIn(d, shape(filter(white(len(0.05)), 'lp', 800), t => Math.exp(-t / 0.01)), 0.6);
      add('timp', d, 87, false, { r: 0.5 }); }

    // Breakbeat kit.
    { const d = buf(0.4);
      addPartial(d, 45, 1, 0.2, 2.6, 0.035);
      mixIn(d, shape(white(len(0.01)), t => Math.exp(-t / 0.002)), 0.3);
      add('kick', shape(d, () => 1).map(x => Math.tanh(1.6 * x)), 440, false); }
    { const d = buf(0.3);
      addPartial(d, 185, 0.6, 0.05); addPartial(d, 330, 0.3, 0.04);
      mixIn(d, shape(filter(white(d.length), 'hp', 1500), t => Math.exp(-t / 0.12)), 0.9);
      add('snare', d.map(x => Math.tanh(1.4 * x)), 440, false); }
    add('hat', shape(filter(white(len(0.1)), 'hp', 7000), t => Math.exp(-t / 0.018)), 440, false);
    add('ohat', shape(filter(white(len(0.45)), 'hp', 6500), t => Math.exp(-t / 0.13)), 440, false);
    { const d = shape(filter(white(len(1.5)), 'hp', 3500), t => Math.exp(-t / 0.55));
      for (const hz of [3120, 4200, 5470]) addPartial(d, hz, 0.1, 0.4);
      add('crash', d, 440, false); }
    { const d = shape(filter(white(len(1)), 'hp', 6000), t => 0.35 * Math.exp(-t / 0.35));
      for (const hz of [2520, 3470, 5200]) addPartial(d, hz, 0.25, 0.6);
      add('ride', d, 440, false); }
    add('clap', shape(filter(white(len(0.3)), 'bp', 1200, 0.8), t => t < 0.03 ? Math.exp(-(t % 0.01) / 0.003) : Math.exp(-(t - 0.03) / 0.08)), 440, false);
    // Explosion: brown rumble with crackle, pitched down by the effects.
    { const d = buf(1.8), w = white(d.length);
      let b = 0;
      for (let i = 0; i < d.length; i++) { b = b * 0.995 + w[i] * 0.05; d[i] = b + (Math.random() < 0.004 * Math.exp(-i / SR / 0.3) ? w[i] * 2 : 0); }
      add('boom', shape(filter(d, 'lp', 1500), t => Math.min(1, t / 0.005) * Math.exp(-t / 0.5)), 440, false); }
  }

  // ---- The S-DSP: output chain and echo -------------------------------------------------------
  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.6;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 4;
    const gauss = ctx.createBiquadFilter();   // the Gaussian interpolation's soft top end
    gauss.type = 'lowpass'; gauss.frequency.value = 12000; gauss.Q.value = 0.5;
    mix = ctx.createGain();
    mix.connect(gauss); gauss.connect(comp); comp.connect(master); master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.7;
    sfxBus.connect(mix);
    // Echo: the delay feeds back through the FIR (here a low-pass), like EDL/EFB/FIR on the SNES.
    echoIn = ctx.createGain();
    const dl = ctx.createDelay(0.5), fir = ctx.createBiquadFilter(), fb = ctx.createGain(), ret = ctx.createGain();
    fir.type = 'lowpass';
    echoIn.connect(dl); dl.connect(fir); fir.connect(fb); fb.connect(dl); fir.connect(ret); ret.connect(mix);
    echo = { dl, fir, fb, ret };
    setEcho(ECHO);
    buildSamples();
  }

  // One echo for everything, as on the SNES. delay in seconds (max 0.24 = EDL 15), fb, mix, tone (Hz).
  const ECHO = { delay: 0.128, fb: 0.3, mix: 0.3, tone: 3500 };
  function setEcho(e) {
    const t = ctx.currentTime;
    echo.dl.delayTime.setValueAtTime(Math.min(0.24, e.delay), t);
    echo.fb.gain.setValueAtTime(e.fb, t);
    echo.ret.gain.setValueAtTime(e.mix, t);
    echo.fir.frequency.setValueAtTime(e.tone || 3500, t);
  }

  // Browsers only allow audio after a user gesture; call this from input handlers.
  function unlock() {
    init();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!song && wanted) playSong(wanted);
  }

  // Key one voice on and off: pitch = sample rate change, ADSR on a gain, optional pan and echo send.
  // o: at/delay (s), vol, pan, echo (send level), bend (semitones glided in over bendT), slide (Hz at
  // the end), vib (depth, as a fraction of the pitch), swell (fade in over the whole note), env overrides.
  function voice(name, hz, dur, o = {}, dest = sfxBus) {
    const I = INST[name];
    if (!ctx || !I) return;
    const t0 = Math.max(o.at || 0, ctx.currentTime) + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = I.buf;
    if (I.loop) { src.loop = true; src.loopStart = 0; src.loopEnd = I.dur; }
    const r = hz / I.f0, pr = src.playbackRate;
    pr.setValueAtTime(o.bend ? r * Math.pow(2, o.bend / 12) : r, t0);
    if (o.bend) pr.exponentialRampToValueAtTime(r, t0 + (o.bendT || 0.08));
    if (o.slide) pr.exponentialRampToValueAtTime(Math.max(0.01, o.slide / I.f0), t0 + dur);
    const g = ctx.createGain();
    const end = o.swell ? swell(g.gain, t0, dur, o.vol ?? 1) : envelope(g.gain, t0, dur, o.vol ?? 1, { ...I.env, ...o.env });
    if (o.vib) {
      const lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.value = 5.5; depth.gain.value = r * o.vib;
      lfo.connect(depth); depth.connect(pr);
      lfo.start(t0 + 0.12); lfo.stop(end + 0.05);
    }
    src.connect(g);
    let node = g;
    if (o.pan) { const p = ctx.createStereoPanner(); p.pan.value = o.pan; g.connect(p); node = p; }
    node.connect(dest);
    if (o.echo) { const s = ctx.createGain(); s.gain.value = o.echo; node.connect(s); s.connect(echoIn); }
    src.start(t0);
    src.stop(end + 0.05);
  }
  // Attack to vol, decay toward vol*s, then the sustain rate fades it while held; release on key-off.
  function envelope(p, t0, dur, v, e) {
    const a = Math.min(e.a, dur * 0.5), tD = t0 + a, tOff = t0 + dur;
    p.setValueAtTime(0, t0);
    p.linearRampToValueAtTime(v, tD);
    const dec = t => e.d ? v * e.s + v * (1 - e.s) * Math.exp(-(t - tD) / e.d) : v;
    if (e.d) p.setTargetAtTime(v * e.s, tD, e.d);
    const tS = tD + e.d * 3;
    let val = dec(tOff);
    if (e.sr && tS < tOff) { p.setTargetAtTime(0, tS, e.sr); val = dec(tS) * Math.exp(-(tOff - tS) / e.sr); }
    p.setValueAtTime(val, tOff);
    p.linearRampToValueAtTime(0, tOff + e.r);
    return tOff + e.r;
  }
  function swell(p, t0, dur, v) {
    p.setValueAtTime(0.0001, t0);
    p.linearRampToValueAtTime(v, t0 + dur);
    p.linearRampToValueAtTime(0, t0 + dur + 0.03);
    return t0 + dur + 0.03;
  }

  // ---- Sound effects ---------------------------------------------------------------------------
  const v = (name, hz, dur, o) => voice(name, hz, dur, o);
  const SFX = {
    shoot: () => v('sq12', 1800, 0.07, { slide: 520, vol: 0.3 }),
    spread: () => v('saw', 1100, 0.09, { slide: 320, vol: 0.25 }),
    missile: () => { v('noise', 500, 0.3, { slide: 1400, vol: 0.2 }); v('sq25', 160, 0.2, { slide: 640, vol: 0.3 }); },
    hit: () => v('sq25', 2000, 0.05, { slide: 800, vol: 0.25 }),
    tink: () => v('bell', 2600, 0.08, { vol: 0.25 }),
    explode: () => { v('boom', 570, 0.45, { slide: 300, vol: 0.8 }); v('kick', 440, 0.2, { vol: 0.4 }); },
    boom: () => { v('boom', 350, 1.4, { slide: 170, vol: 1, echo: 0.4 }); v('timp', 58, 1.2, { vol: 0.7 }); },
    die: () => {
      v('boom', 300, 1.8, { slide: 150, vol: 1, echo: 0.5 });
      [660, 520, 400, 300, 220].forEach((f, i) => v('lead', f, 0.14, { delay: i * 0.1, vol: 0.35, echo: 0.5 }));
    },
    transform: () => {
      v('noise', 1600, 0.05, { vol: 0.3 });
      [330, 494, 659, 988].forEach((f, i) => v('saw', f, 0.06, { delay: 0.03 + i * 0.045, vol: 0.22, echo: 0.3 }));
      v('noise', 900, 0.05, { delay: 0.22, vol: 0.25 });
    },
    denied: () => { v('sq50', 150, 0.07, { vol: 0.25 }); v('sq50', 110, 0.1, { delay: 0.07, vol: 0.25 }); },
    armor: () => { v('noise', 1200, 0.15, { vol: 0.3 }); v('bell', 900, 0.3, { slide: 300, vol: 0.35 }); },
    beam: () => v('saw', 420 + Math.random() * 200, 0.12, { slide: 900, vol: 0.2, vib: 0.03 }),
    charge: () => { v('saw', 200, 0.6, { slide: 1200, vol: 0.2, vib: 0.02 }); v('noise', 300, 0.6, { slide: 2000, vol: 0.12, swell: true }); },
    silence: () => { v('sq25', 880, 0.7, { slide: 110, vol: 0.25, echo: 0.5 }); v('sine', 440, 0.7, { slide: 55, vol: 0.4 }); },
    restore: () => [523, 659, 784, 1047].forEach((f, i) => v('bell', f, 0.3, { delay: i * 0.06, vol: 0.35, echo: 0.5 })),
    oneup: () => [784, 988, 1175, 1568, 1175, 1568].forEach((f, i) => v('bell', f, 0.2, { delay: i * 0.07, vol: 0.3, echo: 0.4 })),
    dive: () => v('sine', 300, 0.35, { slide: 900, vol: 0.25 }),
    select: () => { v('bell', 988, 0.15, { vol: 0.3 }); v('sq25', 988, 0.05, { vol: 0.12 }); },
    move: () => v('sq12', 660, 0.035, { vol: 0.22 }),
    blip: () => v('sq12', 1200, 0.025, { vol: 0.1 }),
    bossHit: () => { v('sq50', 220, 0.04, { vol: 0.2 }); v('noise', 3000, 0.03, { vol: 0.1 }); },
    takeoff: () => { v('noise', 300, 1, { slide: 1600, vol: 0.25 }); v('saw', 120, 0.9, { slide: 480, vol: 0.2 }); },
    land: () => { v('kick', 440, 0.3, { vol: 0.7 }); v('noise', 400, 0.15, { vol: 0.25 }); },
    cash: () => [1319, 1568, 2093].forEach((f, i) => v('bell', f, 0.15, { delay: i * 0.05, vol: 0.3 })),
    levelup: () => {
      [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => v('bell', f, 0.25, { delay: i * 0.08, vol: 0.3, echo: 0.5 }));
      [262, 330, 392].forEach(f => v('strings', f, 0.9, { vol: 0.12, echo: 0.3 }));
    },
  };

  function sfx(name) {
    if (!ctx || !SFX[name]) return;
    const now = ctx.currentTime;
    if (lastPlayed[name] !== undefined && now - lastPlayed[name] < 0.03) return;
    lastPlayed[name] = now;
    SFX[name]();
  }

  // ---- Music sequencer ------------------------------------------------------------------------
  // Notes are "NAME:LEN" tokens, LEN in sixteenths. R = rest. "A4+C5+E5:2" plays a chord, and
  // "orch@F#3:4" plays one note on another instrument. Drum tracks (inst 'kit') use K kick, S snare,
  // G ghost snare, H hat, O open hat, C crash, Y ride, P clap and Z (a noise riser that swells over LEN).
  // Track options: inst, vol, pan, echo (send), gate, bend + bendT (glide in), vib.
  const SEMI = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  function freqOf(name) {
    const m = /^([A-G]#?)(\d)$/.exec(name);
    const midi = (parseInt(m[2], 10) + 1) * 12 + SEMI[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  const parse = str => str.trim().split(/\s+/).map(tok => {
    const [n, l] = tok.split(':');
    return { n, len: parseInt(l, 10) || 1 };
  });

  // ---- Arrangements -------------------------------------------------------------------------
  // Inspired by two Acen records (1992), analysed for tempo, key and harmony; the melodies are our own.
  // "Trip II The Moon": 104 BPM breakbeats in F# over an F# drone, the offbeat riff on D -> C#, the
  // F# -> E -> D -> E climb, the F#7 -> A -> Dmaj7 -> E kaleidoscope and the F# -> C# -> B -> E drop.
  // "Obsessed II": 118 BPM in C# minor, a dark intro with the bass rocking D <-> C#, then the driving
  // E(maj7) -> B -> G#m7 -> F#m7 loop. Title, station and missions follow the first; bosses the second.
  const CH = {
    D:     { b: 'D2',  pad: 'D3+A3+D4+F#4',   stab: 'D4+F#4+A4',     arp: ['D5', 'F#5', 'A5', 'D6'] },
    Cs:    { b: 'C#2', pad: 'C#3+G#3+C#4+F4', stab: 'C#4+F4+G#4',    arp: ['C#5', 'F5', 'G#5', 'C#6'] },
    Fs:    { b: 'F#2', pad: 'F#3+C#4+F#4+A#4', stab: 'F#4+A#4+C#5',  arp: ['F#5', 'A#5', 'C#6', 'F#6'] },
    E:     { b: 'E2',  pad: 'E3+B3+E4+G#4',   stab: 'E4+G#4+B4',     arp: ['E5', 'G#5', 'B5', 'E6'] },
    B:     { b: 'B1',  pad: 'B2+F#3+B3+D#4',  stab: 'F#4+B4+D#5',    arp: ['B4', 'D#5', 'F#5', 'B5'] },
    A:     { b: 'A1',  pad: 'A2+E3+A3+C#4',   stab: 'A4+C#5+E5',     arp: ['A4', 'C#5', 'E5', 'A5'] },
    Fs7:   { b: 'F#2', pad: 'F#3+C#4+E4+A#4', stab: 'F#4+C#5+E5',    arp: ['F#5', 'C#6', 'E6', 'F#6'] },
    Dmaj7: { b: 'D2',  pad: 'D3+A3+C#4+F#4',  stab: 'D4+F#4+C#5',    arp: ['D5', 'F#5', 'C#6', 'D6'] },
    Daug:  { b: 'D2',  pad: 'D3+F#3+A#3+D4',  stab: 'D4+F#4+A#4',    arp: ['D5', 'F#5', 'A#5', 'D6'] },
    Emaj7: { b: 'E2',  pad: 'E3+B3+D#4+G#4',  stab: 'G#4+B4+D#5',    arp: ['E5', 'G#5', 'B5', 'D#6'] },
    Gsm7:  { b: 'G#1', pad: 'G#2+D#3+F#3+B3', stab: 'F#4+B4+D#5',    arp: ['G#4', 'B4', 'D#5', 'F#5'] },
    Fsm7:  { b: 'F#1', pad: 'F#2+C#3+E3+A3',  stab: 'E4+A4+C#5',     arp: ['F#4', 'A4', 'C#5', 'E5'] },
    Csm:   { b: 'C#2', pad: 'C#3+G#3+C#4+E4', stab: 'E4+G#4+C#5',    arp: ['C#5', 'E5', 'G#5', 'C#6'] },
  };
  const REST = 'R:16';
  const up = n => n.replace(/\d/, d => +d + 1);   // same note, one octave up
  // A song from [section, chords] pairs; each part maps (bar, chord) to one bar (16 sixteenths) or null.
  function arrange(bpm, echoFx, sections, parts) {
    const bars = [];
    for (const [sec, chords] of sections) chords.forEach((c, i) => bars.push({ sec, i, c: CH[c] }));
    return { step: 15 / bpm, loop: true, echo: echoFx,
      tracks: parts.map(([o, f]) => ({ ...o, notes: bars.map(b => f(b, b.c) || REST).join(' ') })) };
  }
  // Rhythm strings: x starts a note, - holds it, . rests. hits('x-.x', 'C4') = 'C4:2 R:1 C4:1'.
  const hits = (pat, n) => pat.replace(/x-*/g, m => ` ${n}:${m.length} `).replace(/\./g, ' R:1 ').trim().split(/\s+/).join(' ');
  const in_ = (b, ...secs) => secs.includes(b.sec);
  const riff = c => [0, 2, 1, 2, 3, 2, 1, 2].map(k => `R:1 ${c.arp[k]}:1`).join(' ');   // the offbeat riff
  const shimmer = c => [0, 1, 2, 3, 2, 1, 2, 3, 1, 2, 3, 2, 3, 2, 1, 2].map(k => c.arp[k] + ':1').join(' ');
  const arp8 = c => [0, 1, 2, 3, 2, 1, 2, 3].map(k => c.arp[k] + ':2').join(' ');
  const roll = n => `R:8 ${Array(8).fill(n + ':1').join(' ')}`;   // timpani roll into the next section
  const mel = (b, lines) => lines[b.sec] && lines[b.sec][b.i];

  // Drums, one bar per call: each lane is 16 characters (k s g h o c y p as in the kit, . rest).
  const DRUM = { k: 'K', s: 'S', g: 'G', h: 'H', o: 'O', c: 'C', y: 'Y', p: 'P' };
  const beat = (...lanes) => Array.from({ length: 16 }, (_, t) => {
    const hs = lanes.map(l => l[t]).filter(ch => ch !== '.').map(ch => DRUM[ch]);
    return (hs.length ? hs.join('+') : 'R') + ':1';
  }).join(' ');
  const crash = bar => bar.replace(/^(\S+):1/, (m, n) => (n === 'R' ? 'C' : 'C+' + n) + ':1');
  // A section's drum bar: crash on bar 0, a fill (or riser) on its last bar, else alternate the loop.
  const groove = (loop, n, end) => b => b.i === n - 1 ? end : b.i === 0 ? crash(loop[0]) : loop[b.i % loop.length];
  const FILL = beat('k.......k.......', '....s...s.s.ssss');
  const RISER = 'Z:12 S:1 S:1 S:1 S:1';
  // "Trip" breakbeats: the chopped break, a busier drop version, the sparse climb and the ride groove.
  const BRK = [beat('k.k.......k.....', '....s..g.g..s..g', 'h.h.h.h.h.h.h.o.'), beat('k.k.......kk....', '....s..g.g..s.g.', 'h.h.h.h.h.h.h.h.')];
  const BRK2 = [beat('k.k...k...k..k..', '....s..g.gs.s..s', 'hhh.hhh.hhh.hhh.'), beat('k.k.......k.k...', '.g..s..g.g..s.ss', 'hhh.hhh.hhh.hho.')];
  const SPARSE = [beat('k.......k.......', '....s.......s...', '..h...h...h...h.'), beat('k.......k.k.....', '....s.......s...', '..h...h...h...h.')];
  const RIDE = [beat('k.......k.......', '....s.......s..g', 'y.y.y.y.y.y.y.y.'), beat('k.....k...k.....', '....s.......s...', 'y.y.y.y.y.y.y.y.')];
  // "Obsessed" breakbeats: the driving break with claps, the dark half-time intro and the climax build.
  const OBS = [beat('k..k..k...k.....', '....s.......s...', 'h.hhh.hhh.hhh.hh', '....p.......p...'),
    beat('k..k..k...k..k..', '....s..g.g..s..g', 'h.hhh.hhh.hhh.ho', '....p.......p...')];
  const DARK = [beat('k.......k.......', '............s...', '..h...h...h...h.'), beat('k.....k.k.......', '............s...', '..h...h...h...h.')];
  const BUILD = [beat('k.......k.......', '....s.......s...', 'h.h.h.h.h.h.h.h.'), beat('k...k...k...k...', 's...s...s...s...'),
    beat('k.k.k.k.k.k.k.k.', 's.s.s.s.s.s.s.s.'), 'Z:8 ' + Array(8).fill('S:1').join(' ')];

  // Echo settings: 144 ms is EDL 9, one sixteenth at 104 BPM; 128 ms (EDL 8) is one at 118 BPM.
  const ECHO_TRIP = { delay: 0.144, fb: 0.5, mix: 0.4, tone: 3000 };
  const ECHO_OBS = { delay: 0.128, fb: 0.35, mix: 0.3, tone: 3500 };

  // Title: the riff under strings, the orchestral climb with choir and timpani, then the theme.
  const title = arrange(104, ECHO_TRIP, [
    ['intro', ['D', 'Cs', 'D', 'Cs']], ['climb', ['Fs', 'E', 'D', 'E']],
    ['theme', ['D', 'Cs', 'D', 'Cs']], ['climb2', ['Fs', 'E', 'Daug', 'E']],
  ], [
    [{ inst: 'strings', vol: 0.22, pan: -0.25, echo: 0.3, gate: 1 }, (b, c) => c.pad + ':16'],
    [{ inst: 'choir', vol: 0.2, pan: 0.25, echo: 0.5, gate: 1 }, (b, c) => !in_(b, 'intro') && c.pad + ':16'],
    [{ inst: 'piano', vol: 0.3, pan: 0.35, echo: 0.5 }, (b, c) => in_(b, 'intro', 'theme') && riff(c)],
    [{ inst: 'bell', vol: 0.12, pan: -0.45, echo: 0.6 }, (b, c) => in_(b, 'climb', 'climb2') && shimmer(c)],
    [{ inst: 'sub', vol: 0.5 }, (b, c) => in_(b, 'intro') ? c.b + ':16' : `${c.b}:12 ${up(c.b)}:4`],
    [{ inst: 'lead', vol: 0.24, echo: 0.4, vib: 0.006 }, b => mel(b, {
      theme: ['F#5:6 A5:2 C#6:4 A5:4', 'G#5:6 F5:2 C#5:8', 'F#5:4 A5:4 D6:4 C#6:2 A5:2', 'C#6:6 A#5:2 G#5:4 F5:4'],
      climb2: ['C#6:8 F#6:8', 'E6:6 D#6:2 B5:8', 'A#5:8 F#6:8', 'G#5:12 B5:4'],
    })],
    [{ inst: 'timp', vol: 0.5, echo: 0.2 }, (b, c) => b.i === 3 ? roll(c.b) : b.i === 0 && in_(b, 'climb', 'climb2') && c.b + ':16'],
    [{ inst: 'orch', vol: 0.45, echo: 0.4 }, (b, c) => b.i === 0 && (in_(b, 'theme') ? `${up(c.b)}:4 R:12` : in_(b, 'climb', 'climb2') && `${up(c.b)}:6 ${up(c.b)}:2 R:8`)],
  ]);

  // Starbase and galaxy map: the calm kaleidoscope section, then the same over the F# pedal.
  const base = arrange(104, ECHO_TRIP, [
    ['glow', ['Fs7', 'A', 'Dmaj7', 'E']], ['glow2', ['Fs7', 'A', 'Daug', 'E']],
    ['pedal', ['Fs7', 'A', 'Dmaj7', 'E']], ['pedal2', ['Fs7', 'A', 'Daug', 'E']],
  ], [
    [{ inst: 'epiano', vol: 0.28, pan: -0.3, echo: 0.5 }, (b, c) => arp8(c)],
    [{ inst: 'strings', vol: 0.14, pan: 0.2, echo: 0.3, gate: 1 }, (b, c) => c.pad + ':16'],
    [{ inst: 'sub', vol: 0.45 }, (b, c) => b.sec.startsWith('pedal') ? 'F#2:16' : `${c.b}:8 ${up(c.b)}:8`],
    [{ inst: 'bell', vol: 0.2, pan: 0.35, echo: 0.6 }, b => mel(b, {
      glow2: ['C#6:4 R:4 E6:4 R:4', 'E6:4 R:4 C#6:4 R:4', 'F#6:6 R:2 C#6:8', 'B5:8 G#5:8'],
      pedal2: ['F#6:4 R:4 E6:4 C#6:4', 'E6:8 C#6:8', 'A#5:4 R:4 F#5:8', 'G#5:12 R:4'],
    })],
    [{ inst: 'kit', vol: 0.4 }, b => b.sec.startsWith('pedal') && beat('k.......k.......', '............g...', 'y.y.y.y.y.y.y.y.')],
    [{ inst: 'choir', vol: 0.12, pan: -0.2, echo: 0.5, gate: 1 }, (b, c) => b.sec.startsWith('pedal') && c.pad + ':16'],
  ]);

  // Missions: riff over the break, the climb (riser at its end), the drop, then the kaleidoscope.
  const mission = arrange(104, { ...ECHO_TRIP, fb: 0.35, mix: 0.3 }, [
    ['riff', ['D', 'Cs', 'D', 'Cs', 'D', 'Cs', 'D', 'Cs']],
    ['climb', ['Fs', 'E', 'D', 'E', 'Fs', 'E', 'Daug', 'E']],
    ['drop', ['Fs', 'Cs', 'B', 'E', 'Fs', 'Cs', 'B', 'E']],
    ['kaleido', ['Fs7', 'A', 'Dmaj7', 'E', 'Fs7', 'A', 'Daug', 'E']],
  ], [
    [{ inst: 'kit', vol: 0.9 }, b => ({ riff: groove(BRK, 8, FILL), climb: groove(SPARSE, 8, RISER),
      drop: groove(BRK2, 8, FILL), kaleido: groove(RIDE, 8, FILL) })[b.sec](b)],
    [{ inst: 'sub', vol: 0.5 }, (b, c) => in_(b, 'drop') ? [0, 0, 1, 0, 0, 1, 0, 1].map(k => `reese@${k ? up(c.b) : c.b}:2`).join(' ')
      : in_(b, 'climb') ? c.b + ':16' : in_(b, 'kaleido') ? `${c.b}:8 ${up(c.b)}:8` : `${c.b}:12 ${up(c.b)}:4`],
    [{ inst: 'piano', vol: 0.28, pan: 0.3, echo: 0.3 }, (b, c) => in_(b, 'riff') ? riff(c)
      : in_(b, 'drop') ? hits('x-.x-.x-..x-.x-.', c.stab) : in_(b, 'kaleido') && `epiano@${arp8(c).replace(/ /g, ' epiano@')}`],
    [{ inst: 'strings', vol: 0.15, pan: -0.3, echo: 0.2, gate: 1 }, (b, c) => c.pad + ':16'],
    [{ inst: 'hoover', vol: 0.24, bend: -12, bendT: 0.12, echo: 0.2 }, (b, c) => {
      const h = up(c.b);
      if (in_(b, 'drop')) return b.i === 0 ? `orch@${h}:4 ${h}:2 R:2 ${h}:4 R:4` : b.i % 2 ? `R:2 ${h}:2 R:2 ${h}:2 R:2 ${h}:6` : `${h}:6 R:2 ${h}:4 R:4`;
      return b.i === 0 && in_(b, 'climb', 'kaleido') && `orch@${h}:4 R:12`;
    }],
    [{ inst: 'lead', vol: 0.24, echo: 0.35, vib: 0.006 }, b => b.i >= 4 && mel({ ...b, i: b.i - 4 }, {
      riff: ['F#5:6 A5:2 C#6:4 A5:4', 'G#5:6 F5:2 C#5:8', 'F#5:4 A5:4 D6:4 C#6:2 A5:2', 'C#6:6 A#5:2 G#5:4 F5:4'],
      climb: ['C#6:8 F#6:8', 'E6:6 D#6:2 B5:8', 'A#5:8 F#6:8', 'G#5:12 B5:4'],
      drop: ['C#6:3 A#5:3 F#5:2 A#5:2 C#6:2 F#6:4', 'F6:3 C#6:3 G#5:2 C#6:2 F6:2 G#6:4',
        'D#6:3 B5:3 F#5:2 B5:2 D#6:2 F#6:4', 'E6:4 D#6:2 B5:2 G#5:4 B5:4'],
    })],
    [{ inst: 'choir', vol: 0.15, pan: 0.3, echo: 0.5, gate: 1 }, (b, c) => in_(b, 'climb', 'kaleido') && c.pad + ':16'],
    [{ inst: 'bell', vol: 0.15, pan: -0.4, echo: 0.5 }, (b, c) => in_(b, 'climb') ? shimmer(c) : in_(b, 'kaleido') && [
      'C#6:4 R:4 E6:4 R:4', 'E6:4 R:4 C#6:4 R:4', 'F#6:6 R:2 C#6:8', 'B5:8 G#5:8',
      'F#6:4 R:4 E6:4 C#6:4', 'E6:8 C#6:8', 'A#5:4 R:4 F#5:8', 'G#5:12 R:4'][b.i]],
  ]);

  // Boss fights: the dark D <-> C# intro with a rising hoover, the driving E -> B -> G#m -> F#m loop
  // with piano stabs, rolling reese and orchestra hits, then a snare-roll climax on A -> B -> C#m.
  const boss = arrange(118, ECHO_OBS, [
    ['dark', ['Csm', 'Csm', 'Csm', 'Csm']],
    ['drive', ['Emaj7', 'B', 'Gsm7', 'Fsm7', 'Emaj7', 'B', 'Gsm7', 'Fsm7']],
    ['climax', ['A', 'B', 'Csm', 'Csm']],
  ], [
    [{ inst: 'kit', vol: 0.9 }, b => in_(b, 'dark') ? (b.i === 3 ? RISER : DARK[b.i % 2]) : in_(b, 'climax') ? BUILD[b.i] : groove(OBS, 8, FILL)(b)],
    [{ inst: 'reese', vol: 0.4, gate: 0.8 }, (b, c) => in_(b, 'dark') ? (b.i === 3 ? 'C#2:3 D2:3 E2:2 D2:3 C#2:3 D2:2' : 'C#2:3 D2:3 C#2:2 C#2:3 D2:3 C#2:2')
      : in_(b, 'climax') ? `${c.b}:8 ${c.b}:8` : [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1].map(k => (k ? up(c.b) : c.b) + ':1').join(' ')],
    [{ inst: 'piano', vol: 0.28, pan: 0.3, echo: 0.3 }, (b, c) => in_(b, 'drive') ? hits('x-.x-.x-..x-.x-.', c.stab) : in_(b, 'climax') && c.stab + ':16'],
    [{ inst: 'strings', vol: 0.15, pan: -0.3, echo: 0.2, gate: 1 }, (b, c) => c.pad + ':16'],
    [{ inst: 'hoover', vol: 0.24, bend: -12, bendT: 0.15, echo: 0.2 }, (b, c) => {
      if (in_(b, 'dark')) return ['C#3:16', 'D3:16', 'C#3:8 E3:8', 'G#2:16'][b.i];
      const h = up(c.b);
      if (b.i === 0 || (in_(b, 'drive') && b.i === 4)) return `orch@${h}:4 R:4 orch@${h}:2 R:6`;
      return in_(b, 'drive') && b.i % 2 && `R:8 ${h}:8`;
    }],
    [{ inst: 'lead', vol: 0.24, echo: 0.3, vib: 0.006 }, b => mel(b, {
      drive: ['G#5:3 B5:3 D#6:2 E6:4 D#6:2 B5:2', 'D#6:3 F#6:3 D#6:2 B5:4 A#5:2 F#5:2',
        'G#5:2 B5:2 D#6:4 C#6:2 B5:2 G#5:4', 'A5:3 C#6:3 E6:2 F#6:4 E6:2 C#6:2',
        'B5:4 G#5:2 B5:2 E6:6 D#6:2', 'F#6:6 D#6:2 B5:8', 'D#6:3 C#6:3 B5:2 G#5:4 B5:4', 'C#6:4 E6:4 A5:4 G#5:4'],
      climax: ['C#6:8 E6:8', 'D#6:8 F#6:8', 'E6:8 G#6:8', 'G#6:16'],
    })],
    [{ inst: 'choir', vol: 0.16, pan: 0.3, echo: 0.5, gate: 1 }, (b, c) => in_(b, 'dark') ? 'C#4+G#4:16' : (in_(b, 'climax') || b.i >= 4) && c.pad + ':16'],
    [{ inst: 'sq25', vol: 0.1, pan: -0.45, echo: 0.4, gate: 0.6 }, (b, c) => !in_(b, 'dark') && shimmer(c)],
  ]);

  const SONGS = {
    title,   // main menu
    stage: { step: 0.11, loop: false, echo: ECHO_TRIP, tracks: [   // stage start fanfare
      { inst: 'brass', vol: 0.3, echo: 0.3, notes: 'C#5:2 C#5:1 C#5:1 F#5:4 E5:2 F#5:2 G#5:4 A#5:16' },
      { inst: 'strings', vol: 0.18, gate: 1, notes: 'F#3+C#4+F#4:8 E3+B3+E4:8 F#3+A#3+C#4+F#4:16' },
      { inst: 'orch', vol: 0.45, echo: 0.4, notes: 'F#3:8 E3:8 F#3:4 R:12' },
      { inst: 'timp', vol: 0.5, notes: 'F#2:1 F#2:1 F#2:1 F#2:1 R:4 E2:4 R:4 F#2:4 R:12' },
      { inst: 'sub', vol: 0.45, notes: 'F#2:8 E2:8 F#2:16' },
      { inst: 'kit', vol: 0.7, notes: 'K+C:1 R:15 K+C:1 R:15' },
    ] },
    boss,
    mission,
    base,   // starbase and galaxy map
    gameover: { step: 0.17, loop: false, echo: ECHO_TRIP, tracks: [
      { inst: 'strings', vol: 0.2, gate: 1, notes: 'D3+A3+F#4:16 C#3+G#3+F4:16 F#3+A3+C#4:32' },
      { inst: 'choir', vol: 0.15, echo: 0.5, gate: 1, notes: 'D4+F#4:16 C#4+F4:16 C#4+F#4:32' },
      { inst: 'lead', vol: 0.22, echo: 0.5, vib: 0.008, notes: 'A5:4 G#5:4 F#5:4 E5:4 F5:6 C#5:2 G#5:8 F#5:32' },
      { inst: 'sub', vol: 0.45, notes: 'D2:16 C#2:16 F#1:32' },
      { inst: 'timp', vol: 0.5, notes: 'R:28 C#2:1 C#2:1 C#2:1 C#2:1 F#2:16 R:16' },
    ] },
    victory: { step: 0.1, loop: false, echo: ECHO_OBS, tracks: [
      { inst: 'lead', vol: 0.26, echo: 0.3, vib: 0.006, notes: 'B4:2 E5:2 G#5:2 B5:6 A5:2 G#5:2 F#5:2 G#5:2 A5:2 B5:4 C#6:2 D#6:2 E6:14 R:4' },
      { inst: 'piano', vol: 0.28, echo: 0.3, notes: 'E4+G#4+B4:4 R:2 E4+G#4+B4:2 R:4 E4+A4+C#5:4 B3+D#4+F#4:4 R:2 B3+D#4+F#4:2 R:8 G#4+B4+E5:16' },
      { inst: 'strings', vol: 0.18, gate: 1, notes: 'E3+B3+G#4:16 B2+F#3+D#4:16 E3+B3+E4+G#4:16' },
      { inst: 'sub', vol: 0.45, notes: 'E2:16 B1:16 E2:16' },
      { inst: 'orch', vol: 0.45, echo: 0.4, notes: 'E3:4 R:12 R:16 E3:4 R:12' },
      { inst: 'kit', vol: 0.7, notes: 'K+C:1 R:15 R:12 S:1 S:1 S:1 S:1 K+C:1 R:15' },
      { inst: 'bell', vol: 0.18, echo: 0.6, notes: 'R:32 E6:2 G#6:2 B6:2 E7:10' },
    ] },
  };

  const KIT = { K: ['kick', 1], S: ['snare', 0.8], G: ['snare', 0.28, 1.06], H: ['hat', 0.3, 1, 0.3], O: ['ohat', 0.3, 1, 0.3],
    C: ['crash', 0.5, 1, -0.35], Y: ['ride', 0.3, 1, 0.35], P: ['clap', 0.5, 1, -0.15] };
  function playNote(tr, nt, t, dur) {
    if (nt.n === 'R') return;
    let inst = tr.inst, names = nt.n;
    const at = names.indexOf('@');
    if (at > 0) { inst = names.slice(0, at); names = names.slice(at + 1); }
    const notes = names.split('+'), vol = 1 / Math.sqrt(notes.length);   // chords don't get louder per note
    for (const n of notes) {
      if (inst !== 'kit') voice(inst, freqOf(n), dur * (tr.gate || 0.92), { at: t, vol, bend: tr.bend, bendT: tr.bendT, vib: tr.vib }, tr.bus);
      else if (n === 'Z') voice('noise', 300, dur, { at: t, vol: 0.35, slide: 3000, swell: true }, tr.bus);
      else if (KIT[n]) { const [s, kv, rate = 1, pan = 0] = KIT[n]; voice(s, 440 * rate, INST[s].dur, { at: t, vol: kv, pan }, tr.bus); }
    }
  }

  function stopSong() {
    wanted = null;
    if (!song) return;
    const { bus, echoBus } = song;
    bus.gain.setValueAtTime(0, ctx.currentTime);
    echoBus.gain.setValueAtTime(0, ctx.currentTime);   // the echo already in the buffer rings out
    setTimeout(() => { bus.disconnect(); echoBus.disconnect(); }, 500);
    song = null;
  }

  function playSong(def) {
    stopSong();
    wanted = def.loop ? def : null;   // remember looping music until audio is unlocked
    if (!ctx) return;
    setEcho(def.echo || ECHO);
    const bus = ctx.createGain(), echoBus = ctx.createGain();
    bus.gain.value = 0.5;
    bus.connect(mix);
    echoBus.gain.value = 0.5;
    echoBus.connect(echoIn);
    const t = ctx.currentTime + 0.05;
    // Each track gets its own volume, pan and echo send (the S-DSP's per-voice VOL L/R and EON).
    const tracks = def.tracks.map(tr => {
      const g = ctx.createGain();
      g.gain.value = tr.vol ?? 0.3;
      let node = g;
      if (tr.pan) { const p = ctx.createStereoPanner(); p.pan.value = tr.pan; g.connect(p); node = p; }
      node.connect(bus);
      if (tr.echo) { const s = ctx.createGain(); s.gain.value = tr.echo; node.connect(s); s.connect(echoBus); }
      return { ...tr, bus: g, seq: parse(tr.notes), i: 0, time: t };
    });
    song = { def, bus, echoBus, tracks };
  }

  function update() {
    if (!song) return;
    const ahead = ctx.currentTime + 0.2;
    let alive = false;
    for (const tr of song.tracks) {
      while (tr.time < ahead) {
        if (tr.i >= tr.seq.length) { if (song.def.loop) tr.i = 0; else break; }
        const nt = tr.seq[tr.i++];
        const dur = nt.len * song.def.step;
        playNote(tr, nt, tr.time, dur);
        tr.time += dur;
      }
      if (song.def.loop || tr.i < tr.seq.length || tr.time > ctx.currentTime) alive = true;
    }
    if (!alive) song = null;
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.6;
  }

  return {
    unlock, sfx, playSong, stopSong, update, toggleMute, SONGS,
    get current() { return song ? song.def : null; },
    get locked() { return !ctx || ctx.state !== 'running'; },
    get muted() { return muted; },
  };
})();
