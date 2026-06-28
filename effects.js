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

    // ----- MUSIC: real CC0 medieval orchestral tracks streamed from archive.org -----
    const PLAYLIST = [
        { title: 'Celebration',        url: 'https://archive.org/download/medieval-instrumental-background-music/Celebration.mp3' },
        { title: 'Dancing at the Inn', url: 'https://archive.org/download/medieval-instrumental-background-music/Dancing%20at%20the%20Inn.mp3' },
        { title: 'Royal Coupling',     url: 'https://archive.org/download/medieval-instrumental-background-music/Royal%20Coupling.mp3' },
        { title: 'The Britons',        url: 'https://archive.org/download/medieval-instrumental-background-music/The%20Britons.mp3' },
        { title: 'Nordic Wist',        url: 'https://archive.org/download/medieval-instrumental-background-music/Nordic%20Wist.mp3' },
        { title: 'Beyond New Horizons',url: 'https://archive.org/download/medieval-instrumental-background-music/beyond-new-horizons-free-epic-viking-medieval-soundtrack-22081.mp3' },
        { title: 'Toward the Mountains',url:'https://archive.org/download/medieval-instrumental-background-music/toward-the-mountains-epic-adventure-music-7581.mp3' },
        { title: 'Town Theme',         url: 'https://archive.org/download/medieval-instrumental-background-music/town-theme-1-113018.mp3' },
        { title: 'Cold Journey',       url: 'https://archive.org/download/medieval-instrumental-background-music/Cold%20Journey.mp3' },
        { title: 'Painting Room',      url: 'https://archive.org/download/medieval-instrumental-background-music/Painting%20Room.mp3' },
        { title: 'Rogue Meadow',       url: 'https://archive.org/download/medieval-instrumental-background-music/rogue-meadow-113856.mp3' },
        { title: 'Nimue (Lady of the Lake)', url: 'https://archive.org/download/medieval-instrumental-background-music/nimue-the-lady-of-the-lake-medieval-love-ballad-5638.mp3' }
    ];
    let musicAudio = null;
    let musicTrackIdx = 0;
    let onTrackChange = null;  // callback for UI updates

    // "The Britons" is the recurring MAIN THEME — it returns every few tracks
    // so the soundtrack feels cohesive, with varied tracks woven in between.
    const MAIN_THEME = 3;
    function buildMusicOrder() {
        const others = PLAYLIST.map((_, i) => i).filter(i => i !== MAIN_THEME);
        for (let i = others.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [others[i], others[j]] = [others[j], others[i]];
        }
        // Weave: main theme, then 2 different tracks, repeat — recognizable but never monotonous
        const order = [];
        let oi = 0;
        while (oi < others.length) {
            order.push(MAIN_THEME);
            order.push(others[oi++]);
            if (oi < others.length) order.push(others[oi++]);
        }
        return order;
    }
    let musicOrder = buildMusicOrder();
    let musicOrderPos = 0;

    const MUSIC_VOL = 0.5;
    function playTrack(idx) {
        if (musicAudio) {
            try { musicAudio.pause(); musicAudio.src = ''; } catch(e) {}
            musicAudio = null;
        }
        musicTrackIdx = idx;
        const track = PLAYLIST[idx];
        if (!track) return;
        const a = new window.Audio();
        a.preload = 'auto';
        a.volume = MUSIC_VOL;          // audible immediately (no async gate)
        a.src = track.url;
        a.addEventListener('ended', () => { if (musicPlaying) nextTrack(); });
        a.addEventListener('error', () => { if (musicPlaying) setTimeout(nextTrack, 1000); });
        musicAudio = a;
        // CRITICAL: call play() synchronously now (within the user-gesture stack)
        const pr = a.play();
        if (pr && pr.catch) {
            pr.catch(() => {
                // If blocked, retry once on the next user interaction
                const retry = () => { a.play().catch(() => {}); document.removeEventListener('pointerdown', retry); };
                document.addEventListener('pointerdown', retry, { once: true });
            });
        }
        // Gentle fade-in from 0 to MUSIC_VOL
        a.volume = 0;
        let v = 0;
        const fadeIv = setInterval(() => {
            if (a !== musicAudio || !musicPlaying) { clearInterval(fadeIv); return; }
            v = Math.min(MUSIC_VOL, v + 0.04);
            try { a.volume = v; } catch(e) {}
            if (v >= MUSIC_VOL) clearInterval(fadeIv);
        }, 70);
        if (onTrackChange) onTrackChange(track.title, idx);
    }

    function nextTrack() {
        musicOrderPos++;
        if (musicOrderPos >= musicOrder.length) {
            // Reshuffle the non-theme tracks for a fresh cycle (variety never repeats identically)
            musicOrder = buildMusicOrder();
            musicOrderPos = 0;
        }
        playTrack(musicOrder[musicOrderPos]);
    }
    function prevTrack() {
        musicOrderPos = (musicOrderPos - 1 + musicOrder.length) % musicOrder.length;
        playTrack(musicOrder[musicOrderPos]);
    }

    function startMusic() {
        if (musicPlaying) return;
        musicPlaying = true;
        musicOrderPos = 0;
        musicOrder = buildMusicOrder();
        playTrack(musicOrder[musicOrderPos]);
    }

    function stopMusic() {
        musicPlaying = false;
        if (musicAudio) {
            const a = musicAudio;
            // Fade out then stop
            let v = a.volume;
            const fadeIv = setInterval(() => {
                v = Math.max(0, v - 0.04);
                try { a.volume = v; } catch(e) {}
                if (v <= 0) {
                    clearInterval(fadeIv);
                    try { a.pause(); a.src = ''; } catch(e) {}
                }
            }, 50);
            musicAudio = null;
        }
        if (onTrackChange) onTrackChange(null, -1);
    }

    function getCurrentTrack() {
        if (!musicPlaying) return null;
        return PLAYLIST[musicTrackIdx];
    }

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
        // ---- Music now runs on the procedural adaptive engine (always works,
        // shifts calm↔battle). Falls back to the streamed playlist only if the
        // engine is somehow unavailable. ----
        startMusic: () => { if (musicEnabled) { (typeof ProcMusic !== 'undefined') ? ProcMusic.start() : startMusic(); } },
        stopMusic: () => { (typeof ProcMusic !== 'undefined') ? ProcMusic.stop() : stopMusic(); },
        nextTrack: () => { (typeof ProcMusic !== 'undefined') ? ProcMusic.next() : (musicPlaying && nextTrack()); },
        prevTrack: () => { (typeof ProcMusic !== 'undefined') ? ProcMusic.prev() : (musicPlaying && prevTrack()); },
        getCurrentTrack: () => (typeof ProcMusic !== 'undefined') ? (ProcMusic.isPlaying() ? { title: ProcMusic.currentName() } : null) : getCurrentTrack(),
        onTrackChange: (cb) => { onTrackChange = cb; if (typeof ProcMusic !== 'undefined') ProcMusic.onChange(cb); },
        setBattleMusic: (on) => { if (typeof ProcMusic !== 'undefined') ProcMusic.setBattle(on); },
        fanfare: () => { if (typeof ProcMusic !== 'undefined') ProcMusic.fanfare(); },
        enableMusic: () => {   // force music ON (used when the player enters the game)
            musicEnabled = true;
            if (typeof ProcMusic !== 'undefined') ProcMusic.start(); else startMusic();
            return true;
        },
        toggleMusic: () => {
            musicEnabled = !musicEnabled;
            if (typeof ProcMusic !== 'undefined') { musicEnabled ? ProcMusic.start() : ProcMusic.stop(); }
            else { musicEnabled ? startMusic() : stopMusic(); }
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
