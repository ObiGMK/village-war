// ============================================================
// PROCEDURAL ADAPTIVE MUSIC ENGINE (Web Audio, zero network)
// A continuously-generated medieval soundtrack that ALWAYS works
// (no streaming dependency) and adapts: a calm village theme that
// smoothly intensifies into a driving battle theme and back.
//
// Layers: warm pad (chords) · plucked lute (generated melody) ·
// bass · light hand-drum, with extra percussion + faster tempo in
// battle. Look-ahead scheduler for tight, glitch-free timing.
// ============================================================

const ProcMusic = (function () {
    let ctx = null, master = null, reverbIn = null;
    let playing = false;
    let intensity = 0;          // 0 = calm village, 1 = full battle (smoothed)
    let targetIntensity = 0;
    let timer = null;
    let nextTime = 0, step = 0;
    let themeIdx = 0;

    // ---- musical material: a few medieval "themes" (key + chord progression) ----
    // Notes as semitone offsets from A2 (110 Hz). Aeolian/Dorian flavour.
    const A2 = 110;
    const semi = (n) => A2 * Math.pow(2, n / 12);
    // chord = [root, third, fifth] semitone offsets; bass = root offset (one octave down handled in synth)
    const THEMES = [
        { name: 'Village Green', root: 0,  // A minor (Aeolian): i - VI - III - VII  (Am - F - C - G)
          chords: [[12, 15, 19], [8, 12, 15], [3, 7, 10], [10, 14, 17]], scale: [0, 2, 3, 5, 7, 8, 10, 12] },
        { name: 'Hearth & Home', root: 5,  // D minor Dorian feel: i - VII - IV - i (Dm - C - G - Dm)
          chords: [[5, 8, 12], [3, 7, 10], [10, 14, 17], [5, 8, 12]], scale: [5, 7, 8, 10, 12, 14, 15, 17] },
        { name: 'Northern Road', root: 7,  // E minor: i - VI - VII - i (Em - C - D - Em)
          chords: [[7, 10, 14], [3, 7, 10], [5, 9, 12], [7, 10, 14]], scale: [7, 9, 10, 12, 14, 15, 17, 19] },
        { name: 'Old Kingdom',   root: 2,  // B minor: i - III - VII - VI
          chords: [[14, 17, 21], [5, 9, 12], [12, 16, 19], [10, 14, 17]], scale: [2, 4, 5, 7, 9, 10, 12, 14] }
    ];

    function init() {
        if (ctx) return ctx;
        try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
        master = ctx.createGain();
        master.gain.value = 0;
        master.connect(ctx.destination);
        // simple, cheap reverb: feedback delay network for space
        reverbIn = ctx.createGain();
        const d1 = ctx.createDelay(); d1.delayTime.value = 0.13;
        const d2 = ctx.createDelay(); d2.delayTime.value = 0.19;
        const fb = ctx.createGain(); fb.gain.value = 0.32;
        const damp = ctx.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 2600;
        const wet = ctx.createGain(); wet.gain.value = 0.28;
        reverbIn.connect(d1); d1.connect(damp); damp.connect(fb); fb.connect(d2); d2.connect(d1);
        damp.connect(wet); wet.connect(master);
        return ctx;
    }

    // ---- voices ----
    function pluck(freq, t, dur, vol, type) {
        const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
        o.type = type || 'triangle'; o.frequency.value = freq;
        lp.type = 'lowpass'; lp.frequency.value = Math.min(5200, freq * 6);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(lp); lp.connect(g); g.connect(master); g.connect(reverbIn);
        o.start(t); o.stop(t + dur + 0.05);
    }
    function pad(freq, t, dur, vol) {
        const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
        o.type = 'sawtooth'; o2.type = 'sawtooth';
        o.frequency.value = freq; o2.frequency.value = freq * 1.005; // gentle detune = warmth
        lp.type = 'lowpass'; lp.frequency.value = 900 + intensity * 1200;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.4);
        g.gain.setValueAtTime(vol, t + dur - 0.5);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master); g.connect(reverbIn);
        o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
    }
    function bass(freq, t, dur, vol) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + dur + 0.05);
    }
    function kick(t, vol) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + 0.2);
    }
    function drum(t, vol, freq) {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
        const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
        bp.type = 'bandpass'; bp.frequency.value = freq || 1900; bp.Q.value = 0.8;
        g.gain.value = vol; s.buffer = buf;
        s.connect(bp); bp.connect(g); g.connect(master); g.connect(reverbIn);
        s.start(t);
    }

    // ---- generative melody state ----
    let melodyIdx = 3; // index into theme.scale
    function nextMelodyNote(theme, chord, strong) {
        const scale = theme.scale;
        // stepwise walk, biased back toward chord tones on strong beats
        let move = [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)];
        melodyIdx = Math.max(0, Math.min(scale.length - 1, melodyIdx + move));
        if (strong) {
            // snap to nearest chord tone
            const chordPCs = chord.map(c => ((c % 12) + 12) % 12);
            let best = melodyIdx, bestD = 99;
            for (let i = 0; i < scale.length; i++) {
                if (chordPCs.includes(((scale[i] % 12) + 12) % 12)) {
                    const dd = Math.abs(i - melodyIdx);
                    if (dd < bestD) { bestD = dd; best = i; }
                }
            }
            melodyIdx = best;
        }
        return semi(scale[melodyIdx] + 12); // up an octave for lute register
    }

    // ---- scheduler ----
    function schedule(s, t) {
        const theme = THEMES[themeIdx];
        const bar = Math.floor(s / 8) % 4;             // 4-bar loop, 8 steps (8th notes) per bar
        const beat = s % 8;
        const chord = theme.chords[bar];
        const inten = intensity;

        // chord pad at bar start
        if (beat === 0) {
            const barLen = (60 / tempo()) * 4;
            chord.forEach((c, i) => pad(semi(c), t, barLen * 0.98, 0.05 + inten * 0.02));
        }
        // bass: downbeats (and an extra on intense)
        if (beat === 0 || beat === 4) bass(semi(chord[0] - 12), t, 0.5, 0.16 + inten * 0.05);
        if (inten > 0.5 && beat === 6) bass(semi(chord[0] - 12), t, 0.25, 0.10);

        // lute melody: calm = sparse on strong beats; battle = busier
        const playMel = inten < 0.4 ? (beat % 2 === 0) : (beat % 1 === 0 ? Math.random() < 0.85 : false);
        if (playMel) {
            const strong = (beat % 4 === 0);
            const f = nextMelodyNote(theme, chord, strong);
            pluck(f, t, inten > 0.4 ? 0.28 : 0.5, 0.10 + inten * 0.05, inten > 0.5 ? 'sawtooth' : 'triangle');
            // harmony third in battle
            if (inten > 0.6 && strong) pluck(f * 1.26, t, 0.25, 0.05);
        }
        // percussion: only as battle intensifies
        if (inten > 0.25) {
            if (beat === 0 || beat === 4) kick(t, 0.18 * inten);
            if (inten > 0.5 && (beat === 2 || beat === 6)) drum(t, 0.10 * inten, 1900);    // snare-ish
            if (inten > 0.7 && beat % 2 === 1) drum(t, 0.04 * inten, 5200);                 // hat
        } else {
            // soft hand-drum heartbeat in the village
            if (beat === 0) kick(t, 0.05);
        }
    }

    function tempo() { return 66 + intensity * 52; }   // 66 BPM calm → 118 BPM battle

    function loop() {
        if (!playing) return;
        // smooth the intensity toward target
        intensity += (targetIntensity - intensity) * 0.06;
        const secPer8th = (60 / tempo()) / 2;
        while (nextTime < ctx.currentTime + 0.15) {
            schedule(step, nextTime);
            nextTime += secPer8th;
            step++;
        }
    }

    function start() {
        if (!init()) return;
        if (ctx.state === 'suspended') ctx.resume();
        if (playing) return;
        playing = true;
        step = 0; nextTime = ctx.currentTime + 0.08;
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 1.2);  // fade in
        timer = setInterval(loop, 25);
        if (onChange) onChange(THEMES[themeIdx].name, themeIdx);
    }
    function stop() {
        if (!playing) return;
        playing = false;
        if (master) {
            master.gain.cancelScheduledValues(ctx.currentTime);
            master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
            master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
        }
        clearInterval(timer); timer = null;
        if (onChange) onChange(null, -1);
    }
    function setBattle(on) { targetIntensity = on ? 1 : 0; }
    function nextTheme(dir) {
        themeIdx = (themeIdx + (dir || 1) + THEMES.length) % THEMES.length;
        melodyIdx = 3;
        if (onChange) onChange(THEMES[themeIdx].name, themeIdx);
    }
    let onChange = null;

    return {
        start, stop, setBattle,
        isPlaying: () => playing,
        next: () => nextTheme(1),
        prev: () => nextTheme(-1),
        currentName: () => THEMES[themeIdx].name + (intensity > 0.4 ? ' (Battle)' : ''),
        onChange: (cb) => { onChange = cb; },
        // let the user nudge between streamed tracks and synth later if desired
        themeCount: () => THEMES.length
    };
})();
