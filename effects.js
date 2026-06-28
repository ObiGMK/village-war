// ============================================================
// AUDIO + VISUAL EFFECTS ENGINE
// ============================================================

// ----- AUDIO -----
// SFX always available. Music OFF by default — user toggles on with  button.
const Audio = (() => {
    let ctx = null;
    let sfxMuted = false;
    let musicEnabled = false;       // default OFF
    let musicGain = null, musicBus = null, reverbBus = null;
    let musicPlaying = false;
    let musicTimer = null;

    function init() {
        if (!ctx) {
            try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
            catch(e) {}
        }
        return ctx;
    }

    function tone(freq, dur, type = 'sine', vol = 0.12, attack = 0.005) {
        if (sfxMuted) return;
        const c = init(); if (!c) return;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        const now = c.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(vol, now + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        osc.connect(gain).connect(c.destination);
        osc.start(now);
        osc.stop(now + dur + 0.1);
    }

    function noise(dur, vol = 0.08, freq = 1000) {
        if (sfxMuted) return;
        const c = init(); if (!c) return;
        const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/data.length, 2);
        const src = c.createBufferSource();
        const filter = c.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = freq;
        const gain = c.createGain();
        gain.gain.value = vol;
        src.buffer = buf;
        src.connect(filter).connect(gain).connect(c.destination);
        src.start();
    }

    function chord(freqs, dur, type = 'triangle', vol = 0.10) {
        freqs.forEach((f, i) => setTimeout(() => tone(f, dur, type, vol), i * 40));
    }

    // ----- MUSIC: real recorded medieval instrument tracks (CC0, archive.org) -----
    // Actual composed songs played by real instruments — no synth. Tagged by mood
    // so the score adapts: calm pieces in the village, epic pieces in battle.
    // Smooth crossfades between tracks; falls back to the synth engine only if the
    // network ever fails, so it's never silent.
    const BASE = 'https://archive.org/download/medieval-instrumental-background-music/';
    const PLAYLIST = [
        { title: 'Town Theme',          mood: 'calm', url: BASE + 'town-theme-1-113018.mp3' },
        { title: 'Dancing at the Inn',  mood: 'calm', url: BASE + 'Dancing%20at%20the%20Inn.mp3' },
        { title: 'The Britons',         mood: 'calm', url: BASE + 'The%20Britons.mp3' },
        { title: 'Celebration',         mood: 'calm', url: BASE + 'Celebration.mp3' },
        { title: 'Royal Coupling',      mood: 'calm', url: BASE + 'Royal%20Coupling.mp3' },
        { title: 'Painting Room',       mood: 'calm', url: BASE + 'Painting%20Room.mp3' },
        { title: 'Rogue Meadow',        mood: 'calm', url: BASE + 'rogue-meadow-113856.mp3' },
        { title: 'Nimue, Lady of the Lake', mood: 'calm', url: BASE + 'nimue-the-lady-of-the-lake-medieval-love-ballad-5638.mp3' },
        { title: 'Beyond New Horizons', mood: 'epic', url: BASE + 'beyond-new-horizons-free-epic-viking-medieval-soundtrack-22081.mp3' },
        { title: 'Toward the Mountains',mood: 'epic', url: BASE + 'toward-the-mountains-epic-adventure-music-7581.mp3' },
        { title: 'Nordic Wist',         mood: 'epic', url: BASE + 'Nordic%20Wist.mp3' },
        { title: 'Cold Journey',        mood: 'epic', url: BASE + 'Cold%20Journey.mp3' }
    ];
    const CALM = PLAYLIST.map((t, i) => i).filter(i => PLAYLIST[i].mood === 'calm');
    const EPIC = PLAYLIST.map((t, i) => i).filter(i => PLAYLIST[i].mood === 'epic');

    const MUSIC_VOL = 0.55;
    let musicAudio = null;
    let musicTrackIdx = 0;
    let onTrackChange = null;
    let musicMode = 'calm';
    let queue = [], qpos = 0;
    let failCount = 0, usingFallback = false;
    let preloadEl = null;

    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function buildQueue(mode) { return shuffle((mode === 'epic' ? EPIC : CALM).slice()); }

    function fadeTo(el, target, done) {
        if (!el) return;
        const step = target > el.volume ? 0.05 : -0.06;
        const iv = setInterval(() => {
            let v = el.volume + step;
            if ((step > 0 && v >= target) || (step < 0 && v <= target)) { v = target; clearInterval(iv); if (done) done(); }
            try { el.volume = Math.max(0, Math.min(1, v)); } catch (e) { clearInterval(iv); }
        }, 60);
    }

    // Preload the next likely track during the title/gate screen so entry is instant.
    function preloadFirst() {
        if (preloadEl) return;
        const idx = (buildQueue('calm'))[0];
        const a = new window.Audio();
        a.preload = 'auto'; a.src = PLAYLIST[idx].url; a.volume = 0;
        a.load();
        preloadEl = a; preloadEl._idx = idx;
    }

    function attachHandlers(a) {
        a.addEventListener('ended', () => { if (musicPlaying && a === musicAudio) playNext(); });
        a.addEventListener('error', () => { onTrackError(a); });
        a.addEventListener('playing', () => { failCount = 0; });
    }
    function retryOnGesture(a) {
        const retry = () => { if (a === musicAudio) a.play().catch(() => {}); document.removeEventListener('pointerdown', retry); };
        document.addEventListener('pointerdown', retry, { once: true });
    }
    function onTrackError(a) {
        if (a !== musicAudio || !musicPlaying) return;
        failCount++;
        if (failCount >= 3 && typeof ProcMusic !== 'undefined') {
            // network keeps failing — switch to the synth engine so we're never silent
            usingFallback = true;
            ProcMusic.setBattle(musicMode === 'epic');
            ProcMusic.start();
            if (onTrackChange) onTrackChange('Live score (offline)', -1);
            return;
        }
        setTimeout(() => { if (musicPlaying) playNext(); }, 700);
    }

    function crossfadeTo(idx) {
        const old = musicAudio;
        let a;
        if (preloadEl && preloadEl._idx === idx) { a = preloadEl; preloadEl = null; }
        else { a = new window.Audio(); a.preload = 'auto'; a.src = PLAYLIST[idx].url; }
        a.volume = 0;
        attachHandlers(a);
        musicAudio = a; musicTrackIdx = idx;
        const pr = a.play();
        if (pr && pr.catch) pr.catch(() => retryOnGesture(a));
        fadeTo(a, MUSIC_VOL);
        if (old && old !== a) fadeTo(old, 0, () => { try { old.pause(); old.src = ''; } catch (e) {} });
        if (onTrackChange) onTrackChange(PLAYLIST[idx].title, idx);
    }

    function playNext() {
        if (usingFallback) return; // synth engine handles itself
        qpos++;
        if (!queue.length || qpos >= queue.length) { queue = buildQueue(musicMode); qpos = 0; }
        crossfadeTo(queue[qpos]);
    }
    function nextTrack() { if (musicPlaying && !usingFallback) playNext(); }
    function prevTrack() { if (musicPlaying && !usingFallback) { qpos = (qpos - 2 + queue.length) % queue.length; playNext(); } }

    function startMusic() {
        if (musicPlaying) return;
        musicPlaying = true; failCount = 0; usingFallback = false;
        queue = buildQueue(musicMode); qpos = 0;
        crossfadeTo(queue[0]);
    }
    function stopMusic() {
        musicPlaying = false;
        if (usingFallback && typeof ProcMusic !== 'undefined') { ProcMusic.stop(); usingFallback = false; }
        if (musicAudio) { const a = musicAudio; fadeTo(a, 0, () => { try { a.pause(); a.src = ''; } catch (e) {} }); musicAudio = null; }
        if (onTrackChange) onTrackChange(null, -1);
    }
    // Adaptive: swap the whole mood (calm village ↔ epic battle) with a crossfade.
    function setMusicMode(mode) {
        if (mode === musicMode) return;
        musicMode = mode;
        if (usingFallback && typeof ProcMusic !== 'undefined') { ProcMusic.setBattle(mode === 'epic'); return; }
        if (musicPlaying) { queue = buildQueue(mode); qpos = 0; crossfadeTo(queue[0]); }
    }
    function getCurrentTrack() { return musicPlaying ? PLAYLIST[musicTrackIdx] : null; }

    return {
        click: () => tone(660, 0.04, 'sine', 0.05),
        place: () => { tone(440, 0.08, 'sine', 0.13); setTimeout(() => tone(660, 0.12, 'sine', 0.10), 60); },
        coin:  () => { tone(1320, 0.06, 'sine', 0.08); setTimeout(() => tone(1760, 0.08, 'sine', 0.06), 50); },
        upgrade: () => { tone(523, 0.1, 'sine', 0.12); setTimeout(() => tone(659, 0.1, 'sine', 0.12), 80); setTimeout(() => tone(784, 0.18, 'sine', 0.12), 160); },
        train: () => { tone(220, 0.08, 'triangle', 0.09); setTimeout(() => tone(330, 0.1, 'triangle', 0.07), 50); },
        attack: () => { noise(0.15, 0.10, 800); setTimeout(() => tone(120, 0.2, 'sine', 0.10), 50); },
        victory: () => chord([523, 659, 784, 1047], 0.6, 'sine', 0.12),
        defeat: () => chord([392, 311, 247, 196], 0.5, 'triangle', 0.10),
        levelup: () => chord([523, 659, 784, 1047, 1319], 0.4, 'sine', 0.14),
        error: () => tone(150, 0.15, 'sine', 0.10),
        whoosh: () => noise(0.2, 0.05, 400),
        achievement: () => { chord([659, 880, 1175], 0.3, 'sine', 0.13); setTimeout(() => chord([784, 1047, 1397], 0.4, 'sine', 0.12), 200); },
        // ---- Music: real recorded medieval tracks (real instruments / real songs),
        // mood-adaptive (calm village ↔ epic battle), synth fallback if offline. ----
        startMusic: () => { if (musicEnabled) startMusic(); },
        stopMusic,
        nextTrack: () => { if (musicPlaying) nextTrack(); },
        prevTrack: () => { if (musicPlaying) prevTrack(); },
        getCurrentTrack,
        onTrackChange: (cb) => { onTrackChange = cb; if (typeof ProcMusic !== 'undefined') ProcMusic.onChange(cb); },
        setBattleMusic: (on) => { setMusicMode(on ? 'epic' : 'calm'); },
        preloadMusic: () => { try { preloadFirst(); } catch (e) {} },
        fanfare: () => {},   // entry is now the real recorded theme (no synth flourish)
        enableMusic: () => { musicEnabled = true; startMusic(); return true; },
        toggleMusic: () => {
            musicEnabled = !musicEnabled;
            musicEnabled ? startMusic() : stopMusic();
            return musicEnabled;
        },
        isMusicOn: () => musicEnabled,
        toggleSfx: () => { sfxMuted = !sfxMuted; return sfxMuted; },
        isSfxMuted: () => sfxMuted,
        // Legacy compat
        toggleMute: () => { sfxMuted = !sfxMuted; return sfxMuted; },
        isMuted: () => sfxMuted
    };
})();

// ----- POPUPS (floating "+X" numbers) -----
function popup(text, opts = {}) {
    const el = document.createElement('div');
    el.className = 'fx-popup';
    el.textContent = text;
    if (opts.color) el.style.color = opts.color;
    if (opts.big) el.classList.add('big');
    const x = opts.x != null ? opts.x : window.innerWidth / 2;
    const y = opts.y != null ? opts.y : window.innerHeight / 2;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
}

function lootPopups(loot, originX, originY) {
    const icons = { coins: (typeof COIN_ICON !== 'undefined' ? COIN_ICON : ''), gold: (typeof GOLD_ICON !== 'undefined' ? GOLD_ICON : ''), iron: (typeof IRON_ICON !== 'undefined' ? IRON_ICON : ''), wood: (typeof WOOD_ICON !== 'undefined' ? WOOD_ICON : ''), food: (typeof FOOD_ICON !== 'undefined' ? FOOD_ICON : '') };
    const colors = { coins: '#fde047', gold: '#fbbf24', iron: '#cbd5e1', wood: '#a87d4a', food: '#86efac' };
    let i = 0;
    for (const [r, v] of Object.entries(loot)) {
        if (!v) continue;
        setTimeout(() => {
            popupHTML(`${icons[r] || ''} +${v}`, {
                color: colors[r] || '#fff',
                x: originX + (Math.random() - 0.5) * 60,
                y: originY + (Math.random() - 0.5) * 30
            });
        }, i * 100);
        i++;
    }
}

// Like popup() but allows HTML content (for SVG icons)
function popupHTML(html, opts = {}) {
    const el = document.createElement('div');
    el.className = 'fx-popup';
    el.innerHTML = html;
    if (opts.color) el.style.color = opts.color;
    if (opts.big) el.classList.add('big');
    el.style.left = (opts.x != null ? opts.x : window.innerWidth / 2) + 'px';
    el.style.top = (opts.y != null ? opts.y : window.innerHeight / 2) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
}

// ----- CONFETTI -----
function confetti(count = 80, duration = 2500) {
    const container = document.createElement('div');
    container.className = 'fx-confetti-container';
    document.body.appendChild(container);
    const colors = ['#fbbf24', '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#fff'];
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'fx-confetti-piece';
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.left = (Math.random() * 100) + '%';
        p.style.animationDelay = (Math.random() * 0.3) + 's';
        p.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
        p.style.transform = `rotate(${Math.random() * 360}deg)`;
        container.appendChild(p);
    }
    setTimeout(() => container.remove(), duration);
}

// ----- SCREEN SHAKE -----
function screenShake(intensity = 6, duration = 400) {
    const root = document.getElementById('app');
    if (!root) return;
    root.style.animation = `screenShake ${duration}ms cubic-bezier(.36,.07,.19,.97) both`;
    root.style.setProperty('--shake-intensity', intensity + 'px');
    setTimeout(() => { root.style.animation = ''; }, duration);
}

// ----- SPARKLE BURST -----
function sparkleBurst(x, y, count = 12) {
    for (let i = 0; i < count; i++) {
        const s = document.createElement('div');
        s.className = 'fx-sparkle';
        const angle = (Math.PI * 2 * i) / count;
        const dist = 30 + Math.random() * 50;
        s.style.left = x + 'px';
        s.style.top = y + 'px';
        s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
        s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
        document.body.appendChild(s);
        setTimeout(() => s.remove(), 800);
    }
}

// Bind click sound to all buttons globally
document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, .nav-btn, .build-card, .raid-card, .hero-card');
    if (btn && !btn.disabled) Audio.click();
}, true);
