'use strict';
// Tiny chiptune engine: NES-like pulse / triangle / noise voices built on WebAudio.
const Sound = (() => {
  let ctx = null, master = null, sfxBus = null, noiseBuf = null;
  let song = null, wanted = null, muted = false;
  const waves = {};
  const lastPlayed = {};

  // Band-limited pulse wave with the given duty cycle (NES has 12.5/25/50%).
  function pulseWave(duty) {
    const n = 64, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) {
      re[k] = Math.sin(2 * Math.PI * k * duty) / (Math.PI * k);
      im[k] = (1 - Math.cos(2 * Math.PI * k * duty)) / (Math.PI * k);
    }
    return ctx.createPeriodicWave(re, im);
  }

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.6;
    sfxBus.connect(master);
    waves.pulse12 = pulseWave(0.125);
    waves.pulse25 = pulseWave(0.25);
    waves.pulse50 = pulseWave(0.5);
    // 15-bit LFSR noise like the NES noise channel.
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let lfsr = 1;
    for (let i = 0; i < d.length; i++) {
      if (i % 4 === 0) { const bit = (lfsr ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 14); }
      d[i] = lfsr & 1 ? 0.8 : -0.8;
    }
  }

  // Browsers only allow audio after a user gesture; call this from input handlers.
  function unlock() {
    init();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!song && wanted) playSong(wanted);
  }

  function tone(freq, dur, o = {}) {
    if (!ctx) return;
    const t0 = Math.max(o.at || 0, ctx.currentTime) + (o.delay || 0);
    const osc = ctx.createOscillator();
    const type = o.type || 'pulse25';
    if (waves[type]) osc.setPeriodicWave(waves[type]); else osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t0 + dur);
    const g = ctx.createGain();
    const v = o.vol ?? 0.3;
    g.gain.setValueAtTime(v, t0);
    if (o.hold) { g.gain.setValueAtTime(v, t0 + dur * 0.7); g.gain.linearRampToValueAtTime(0, t0 + dur); }
    else g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(o.dest || sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, o = {}) {
    if (!ctx) return;
    const t0 = Math.max(o.at || 0, ctx.currentTime) + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    src.playbackRate.setValueAtTime(o.rate || 1, t0);
    if (o.rateTo) src.playbackRate.linearRampToValueAtTime(o.rateTo, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol ?? 0.3, t0);
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    src.connect(g);
    g.connect(o.dest || sfxBus);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.02);
  }

  const SFX = {
    shoot: () => tone(1400, 0.06, { type: 'pulse12', vol: 0.12, slide: 500 }),
    spread: () => tone(900, 0.08, { type: 'pulse25', vol: 0.12, slide: 300 }),
    missile: () => { noise(0.18, { vol: 0.12, rate: 0.6, rateTo: 1.2 }); tone(180, 0.15, { type: 'triangle', vol: 0.25, slide: 700 }); },
    hit: () => tone(1600, 0.04, { type: 'pulse25', vol: 0.12, slide: 900 }),
    tink: () => tone(2400, 0.03, { type: 'pulse12', vol: 0.1 }),
    explode: () => noise(0.3, { vol: 0.35, rate: 0.5, rateTo: 0.15 }),
    boom: () => { noise(0.9, { vol: 0.5, rate: 0.35, rateTo: 0.08 }); tone(140, 0.7, { type: 'triangle', vol: 0.4, slide: 30 }); },
    die: () => {
      noise(1.2, { vol: 0.5, rate: 0.4, rateTo: 0.05 });
      [660, 520, 400, 300, 220].forEach((f, i) => tone(f, 0.12, { type: 'pulse50', vol: 0.15, delay: i * 0.1 }));
    },
    transform: () => {
      noise(0.05, { vol: 0.25, rate: 1.5 });
      [330, 494, 659].forEach((f, i) => tone(f, 0.05, { type: 'pulse25', vol: 0.15, delay: 0.03 + i * 0.05 }));
      noise(0.04, { vol: 0.2, rate: 0.8, delay: 0.2 });
    },
    denied: () => tone(110, 0.12, { type: 'pulse50', vol: 0.18 }),
    armor: () => { noise(0.2, { vol: 0.3, rate: 1.2 }); tone(900, 0.2, { type: 'pulse12', vol: 0.15, slide: 200 }); },
    beam: () => tone(420 + Math.random() * 200, 0.1, { type: 'triangle', vol: 0.2, slide: 900 }),
    charge: () => tone(200, 0.6, { type: 'pulse25', vol: 0.15, slide: 1200 }),
    silence: () => { tone(880, 0.6, { type: 'pulse25', vol: 0.2, slide: 110 }); tone(440, 0.6, { type: 'triangle', vol: 0.2, slide: 55 }); },
    restore: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.08, { type: 'pulse25', vol: 0.15, delay: i * 0.06 })),
    oneup: () => [784, 988, 1175, 1568, 1175, 1568].forEach((f, i) => tone(f, 0.07, { type: 'pulse25', vol: 0.15, delay: i * 0.07 })),
    dive: () => tone(300, 0.35, { type: 'triangle', vol: 0.1, slide: 900 }),
    select: () => tone(988, 0.08, { type: 'pulse25', vol: 0.15 }),
    move: () => tone(660, 0.03, { type: 'pulse12', vol: 0.12 }),
    blip: () => tone(1200, 0.02, { type: 'pulse12', vol: 0.05 }),
    bossHit: () => tone(220, 0.03, { type: 'pulse50', vol: 0.12 }),
  };

  function sfx(name) {
    if (!ctx || !SFX[name]) return;
    const now = ctx.currentTime;
    if (lastPlayed[name] !== undefined && now - lastPlayed[name] < 0.03) return;
    lastPlayed[name] = now;
    SFX[name]();
  }

  // ---- Music sequencer ------------------------------------------------------
  // Notes are "NAME:LEN" tokens, LEN in sixteenths. R = rest. Drums: K kick, S snare, H hat.
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

  const rep = (s, n) => Array(n).fill(s).join(' ');
  const SONGS = {
    title: { step: 0.1, loop: true, tracks: [
      { type: 'pulse25', vol: 0.16, notes:
        'A4:2 C5:2 E5:4 D5:2 C5:2 D5:4 E5:2 G5:2 A5:4 G5:2 E5:2 D5:4 ' +
        'C5:2 D5:2 E5:4 A4:2 C5:2 B4:4 G4:2 B4:2 A4:8 R:4' },
      { type: 'triangle', vol: 0.3, notes:
        rep('A2:2 A3:2', 4) + ' ' + rep('F2:2 F3:2', 4) + ' ' + rep('C3:2 C4:2', 4) + ' ' + rep('E2:2 E3:2', 4) },
      { type: 'drums', vol: 0.12, notes: rep('K:4 H:2 H:2 K:4 H:2 H:2', 4) },
    ] },
    stage: { step: 0.08, loop: false, tracks: [
      { type: 'pulse25', vol: 0.18, notes: 'E5:2 G5:2 A5:2 E5:2 G5:2 A5:2 C6:4 B5:2 A5:2 G5:2 A5:8' },
      { type: 'triangle', vol: 0.3, notes: 'A2:4 A3:4 C3:4 C4:4 D3:4 E3:4 A2:6' },
    ] },
    boss: { step: 0.085, loop: true, tracks: [
      { type: 'pulse25', vol: 0.15, notes:
        'E5:1 R:1 E5:1 F5:1 E5:2 B4:2 C5:1 R:1 C5:1 D5:1 C5:2 A4:2 ' +
        'B4:1 R:1 B4:1 C5:1 D5:2 E5:2 F5:2 E5:2 D5:2 B4:2' },
      { type: 'triangle', vol: 0.3, notes:
        rep('E2:2 E3:2', 2) + ' ' + rep('A2:2 A3:2', 2) + ' ' + rep('G2:2 G3:2', 2) + ' ' + rep('B2:2 B3:2', 2) },
      { type: 'drums', vol: 0.12, notes: rep('K:2 H:1 H:1 S:2 H:2', 4) },
    ] },
    gameover: { step: 0.12, loop: false, tracks: [
      { type: 'pulse25', vol: 0.16, notes: 'A4:3 G4:3 F4:3 E4:3 D4:3 C4:3 B3:3 A3:9' },
      { type: 'triangle', vol: 0.3, notes: 'A2:12 F2:12 A2:6' },
    ] },
    victory: { step: 0.09, loop: false, tracks: [
      { type: 'pulse25', vol: 0.18, notes: 'C5:2 E5:2 G5:2 C6:6 G5:2 C6:8' },
      { type: 'triangle', vol: 0.3, notes: 'C3:4 G3:4 C3:4 C4:10' },
    ] },
  };

  function playNote(tr, nt, t, dur, bus) {
    if (nt.n === 'R') return;
    if (tr.type === 'drums') {
      if (nt.n === 'K') {
        noise(0.07, { at: t, vol: tr.vol, rate: 0.3, dest: bus });
        tone(110, 0.08, { at: t, type: 'triangle', vol: tr.vol * 1.5, slide: 40, dest: bus });
      } else if (nt.n === 'S') noise(0.1, { at: t, vol: tr.vol, rate: 1, dest: bus });
      else noise(0.03, { at: t, vol: tr.vol * 0.6, rate: 3, dest: bus });
    } else {
      tone(freqOf(nt.n), dur * 0.92, { at: t, type: tr.type, vol: tr.vol, hold: true, dest: bus });
    }
  }

  function stopSong() {
    wanted = null;
    if (!song) return;
    const bus = song.bus;
    bus.gain.setValueAtTime(0, ctx.currentTime);
    setTimeout(() => bus.disconnect(), 500);
    song = null;
  }

  function playSong(def) {
    stopSong();
    wanted = def.loop ? def : null;   // remember looping music until audio is unlocked
    if (!ctx) return;
    const bus = ctx.createGain();
    bus.gain.value = 0.55;
    bus.connect(master);
    const t = ctx.currentTime + 0.05;
    song = { def, bus, tracks: def.tracks.map(tr => ({ ...tr, seq: parse(tr.notes), i: 0, time: t })) };
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
        playNote(tr, nt, tr.time, dur, song.bus);
        tr.time += dur;
      }
      if (song.def.loop || tr.i < tr.seq.length || tr.time > ctx.currentTime) alive = true;
    }
    if (!alive) song = null;
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.5;
  }

  return {
    unlock, sfx, playSong, stopSong, update, toggleMute, SONGS,
    get locked() { return !ctx || ctx.state !== 'running'; },
    get muted() { return muted; },
  };
})();
