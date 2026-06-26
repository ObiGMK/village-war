// ============================================================
// VISUAL ASSETS - Realistic 3D Rendered Icons
// Uses icons8.com 3D Fluency style (CC license w/ attribution)
// ============================================================

const ICON_BASE = 'https://img.icons8.com/3d-fluency/256';

// Unmistakably GOLD coin (the 🪙 emoji renders silver/gray on many systems)
const COIN_ICON = '<svg class="ico-coin" viewBox="0 0 24 24" width="1em" height="1em" style="vertical-align:-0.16em;margin-right:1px"><defs><radialGradient id="gcoin" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stop-color="#fff3b0"/><stop offset="0.5" stop-color="#fbc536"/><stop offset="1" stop-color="#c8860d"/></radialGradient></defs><circle cx="12" cy="12" r="10.5" fill="url(#gcoin)" stroke="#8a5a06" stroke-width="1.6"/><circle cx="12" cy="12" r="7.4" fill="none" stroke="#a86d06" stroke-width="1"/><text x="12" y="16.2" text-anchor="middle" font-size="11" font-weight="900" fill="#8a5a06" font-family="Arial, sans-serif">$</text><ellipse cx="9" cy="8" rx="2.4" ry="1.5" fill="rgba(255,255,255,0.6)" transform="rotate(-30 9 8)"/></svg>';
// Gold bar/ingot icon for the "gold" resource (distinct from coins)
const GOLD_ICON = '<svg class="ico-gold" viewBox="0 0 24 24" width="1em" height="1em" style="vertical-align:-0.16em;margin-right:1px"><polygon points="4,16 20,16 22,21 2,21" fill="#fcd34d" stroke="#a16207" stroke-width="1"/><polygon points="6,11 18,11 20,16 4,16" fill="#fde68a" stroke="#a16207" stroke-width="1"/><polygon points="6,11 18,11 18,12.5 6,12.5" fill="rgba(255,255,255,0.5)"/></svg>';
// Iron — a steel ingot
const IRON_ICON = '<svg class="ico-res" viewBox="0 0 24 24" width="1em" height="1em" style="vertical-align:-0.16em;margin-right:1px"><polygon points="3,16 21,16 23,21 1,21" fill="#9aa3b2" stroke="#454c5a" stroke-width="1"/><polygon points="5,11 19,11 21,16 3,16" fill="#c2c9d6" stroke="#454c5a" stroke-width="1"/><polygon points="5,11 19,11 19,12.4 5,12.4" fill="rgba(255,255,255,0.6)"/><polygon points="3,16 21,16 21,17.4 3,17.4" fill="rgba(255,255,255,0.3)"/></svg>';
// Wood — stacked logs (end-on)
const WOOD_ICON = '<svg class="ico-res" viewBox="0 0 24 24" width="1em" height="1em" style="vertical-align:-0.16em;margin-right:1px"><ellipse cx="8" cy="9" rx="5" ry="5" fill="#a9743c" stroke="#5a3a18" stroke-width="1.2"/><ellipse cx="8" cy="9" rx="2.4" ry="2.4" fill="none" stroke="#7a5028" stroke-width="1"/><ellipse cx="16" cy="9" rx="5" ry="5" fill="#a9743c" stroke="#5a3a18" stroke-width="1.2"/><ellipse cx="16" cy="9" rx="2.4" ry="2.4" fill="none" stroke="#7a5028" stroke-width="1"/><ellipse cx="12" cy="15.5" rx="5" ry="5" fill="#bd864a" stroke="#5a3a18" stroke-width="1.2"/><ellipse cx="12" cy="15.5" rx="2.4" ry="2.4" fill="none" stroke="#7a5028" stroke-width="1"/></svg>';
// Food — wheat sheaf
const FOOD_ICON = '<svg class="ico-res" viewBox="0 0 24 24" width="1em" height="1em" style="vertical-align:-0.16em;margin-right:1px"><g stroke="#9a7320" stroke-width="1" stroke-linecap="round"><line x1="12" y1="22" x2="12" y2="9"/><line x1="12" y1="20" x2="7" y2="16"/><line x1="12" y1="20" x2="17" y2="16"/></g><g fill="#f0c850" stroke="#a9842c" stroke-width="0.6"><ellipse cx="12" cy="6" rx="2.4" ry="4"/><ellipse cx="8" cy="9" rx="2" ry="3.4" transform="rotate(-28 8 9)"/><ellipse cx="16" cy="9" rx="2" ry="3.4" transform="rotate(28 16 9)"/></g></svg>';

// Maps building type to icons8 3D Fluency icon name
const BUILDING_ICONS = {
    townhall:    'palace',
    goldmine:    'gold-bars',
    ironmine:    'iron',
    lumbermill:  'log-cabin',
    farm:        'farm',
    coinmint:    'bank',
    storage:     'treasure-chest',
    barracks:    'sword',
    stable:      'horse',
    fortress:    'tower',
    wall:        'brick-wall',
    archertower: 'archer',
    cannon:      'cannon'
};

// Returns rich HTML containing a real 3D image with shadow & level glow
function buildingHTML(type, lvl) {
    const icon = BUILDING_ICONS[type];
    const glow = lvl >= 8 ? 'glow-legendary' : lvl >= 5 ? 'glow-rare' : '';
    return `
        <div class="building-img-wrap ${glow}">
            <img class="building-img" src="${ICON_BASE}/${icon}.png" alt="${type}" draggable="false" loading="lazy">
            ${lvl >= 3 ? `<div class="building-flag"></div>` : ''}
        </div>
    `;
}

// Backward-compat: BUILDING_SVG used by renderGrid -> just call buildingHTML
const BUILDING_SVG = Object.fromEntries(
    Object.keys(BUILDING_ICONS).map(t => [t, (lvl) => buildingHTML(t, lvl)])
);

// ============================================================
// HEROES - Real 3D Rendered Portraits
// ============================================================

// Heroes — stats scale strongly with rarity, so better heroes are clearly stronger.
const HERO_DEFS = {
    // ---------- COMMON ----------
    knight: {
        name: 'Sir Alaric', title: 'The Iron Knight',
        rarity: 'common', unlockLevel: 1, unlockCost: { coins: 0 },
        baseStats: { hp: 240, attack: 40, defense: 32 },
        ability: 'Rallying Cry', abilityDesc: '+12% HP and ATK to all warriors',
        bonus: { warrior: { hpMult: 1.12, atkMult: 1.12 } },
        icon: 'knight', bgGradient: 'radial-gradient(circle at 35% 25%, #9aa3b2, #4a5260 70%, #232830)'
    },
    squire: {
        name: 'Tomas the Bold', title: 'Hopeful Squire',
        rarity: 'common', unlockLevel: 2, unlockCost: { coins: 800 },
        baseStats: { hp: 260, attack: 45, defense: 38 },
        ability: 'Shield Wall', abilityDesc: '+15% DEF to all troops',
        bonus: { all: { defMult: 1.15 } },
        icon: 'shield', bgGradient: 'radial-gradient(circle at 35% 25%, #a0b4c8, #44586c 70%, #1e2a36)'
    },
    // ---------- RARE ----------
    archerqueen: {
        name: 'Lyra Swiftarrow', title: 'The Forest Queen',
        rarity: 'rare', unlockLevel: 5, unlockCost: { gold: 600, coins: 2000 },
        baseStats: { hp: 300, attack: 80, defense: 35 },
        ability: 'Eagle Eye', abilityDesc: '+25% ATK & +10% HP to all archers',
        bonus: { archer: { atkMult: 1.25, hpMult: 1.10 } },
        icon: 'archer', bgGradient: 'radial-gradient(circle at 35% 25%, #6dd86e, #1f7a2f 70%, #0c3a18)'
    },
    berserker: {
        name: 'Ragnar Bloodaxe', title: 'The Berserker',
        rarity: 'rare', unlockLevel: 7, unlockCost: { gold: 1000, iron: 800 },
        baseStats: { hp: 360, attack: 110, defense: 28 },
        ability: 'Rage', abilityDesc: '+30% ATK to entire army',
        bonus: { all: { atkMult: 1.30 } },
        icon: 'hammer', bgGradient: 'radial-gradient(circle at 35% 25%, #ff5757, #8a1818 70%, #3f0808)'
    },
    valkyrie: {
        name: 'Brunhild', title: 'Winged Valkyrie',
        rarity: 'rare', unlockLevel: 9, unlockCost: { gold: 1400, iron: 1000, coins: 4000 },
        baseStats: { hp: 420, attack: 105, defense: 60 },
        ability: 'Battle Hymn', abilityDesc: '+15% HP & +15% ATK to entire army',
        bonus: { all: { hpMult: 1.15, atkMult: 1.15 } },
        icon: 'crown', bgGradient: 'radial-gradient(circle at 35% 25%, #b9c6ff, #4655a8 65%, #1c2150)'
    },
    // ---------- EPIC ----------
    healer: {
        name: 'Seraphina', title: 'Light of Hope',
        rarity: 'epic', unlockLevel: 11, unlockCost: { gold: 2000, food: 1500 },
        baseStats: { hp: 460, attack: 60, defense: 95 },
        ability: 'Divine Light', abilityDesc: '+30% HP to entire army',
        bonus: { all: { hpMult: 1.30 } },
        icon: 'queen', bgGradient: 'radial-gradient(circle at 35% 25%, #ffe7a3, #c98c2a 70%, #5a3a08)'
    },
    dragonrider: {
        name: 'Pyra Dragontamer', title: 'Lord of Flames',
        rarity: 'epic', unlockLevel: 13, unlockCost: { gold: 3000, iron: 2000, coins: 8000 },
        baseStats: { hp: 560, attack: 150, defense: 80 },
        ability: 'Inferno', abilityDesc: '+45% ATK to siege & cavalry',
        bonus: { siege: { atkMult: 1.45 }, cavalry: { atkMult: 1.45 } },
        icon: 'horse', bgGradient: 'radial-gradient(circle at 35% 25%, #ffb84a, #c54a08 60%, #4a1a08)'
    },
    frostmage: {
        name: 'Isolde', title: 'The Frost Witch',
        rarity: 'epic', unlockLevel: 15, unlockCost: { gold: 4000, iron: 2500, coins: 10000 },
        baseStats: { hp: 480, attack: 175, defense: 70 },
        ability: 'Frostbite', abilityDesc: '+35% ATK army-wide, slows enemies',
        bonus: { all: { atkMult: 1.35 } },
        icon: 'witch', bgGradient: 'radial-gradient(circle at 35% 25%, #a5e8ff, #1c7aa8 65%, #0a3450)'
    },
    // ---------- LEGENDARY ----------
    shadowassassin: {
        name: 'Vex Nightshade', title: 'Shadow Walker',
        rarity: 'legendary', unlockLevel: 17, unlockCost: { gold: 6000, iron: 3500, coins: 14000 },
        baseStats: { hp: 560, attack: 240, defense: 75 },
        ability: 'Shadow Strike', abilityDesc: '20% chance to instantly slay an enemy; +18% ATK',
        bonus: { all: { atkMult: 1.18, critChance: 0.20 } },
        icon: 'sword', bgGradient: 'radial-gradient(circle at 35% 25%, #a78bfa, #4c1d95 65%, #1a0a3a)'
    },
    warmage: {
        name: 'Zephyr Stormcaller', title: 'Archmage of War',
        rarity: 'legendary', unlockLevel: 20, unlockCost: { gold: 9000, iron: 5500, coins: 22000, food: 5000 },
        baseStats: { hp: 640, attack: 260, defense: 100 },
        ability: 'Storm Magic', abilityDesc: '+28% to ALL stats army-wide',
        bonus: { all: { atkMult: 1.28, hpMult: 1.28, defMult: 1.28 } },
        icon: 'wizard', bgGradient: 'radial-gradient(circle at 35% 25%, #38bdf8, #0c4a6e 65%, #082030)'
    },
    warlord: {
        name: 'Kael Ironcrown', title: 'The Warlord',
        rarity: 'legendary', unlockLevel: 23, unlockCost: { gold: 14000, iron: 9000, coins: 35000 },
        baseStats: { hp: 820, attack: 300, defense: 150 },
        ability: 'Conqueror', abilityDesc: '+35% ATK & +25% HP army-wide',
        bonus: { all: { atkMult: 1.35, hpMult: 1.25 } },
        icon: 'viking-ship', bgGradient: 'radial-gradient(circle at 35% 25%, #ffcf6e, #a8470a 60%, #3a1404)'
    },
    // ---------- MYTHIC ----------
    celestial: {
        name: 'Auriel', title: 'Celestial Guardian',
        rarity: 'mythic', unlockLevel: 27, unlockCost: { gold: 28000, iron: 18000, coins: 70000 },
        baseStats: { hp: 1100, attack: 400, defense: 240 },
        ability: 'Aegis of Light', abilityDesc: '+40% HP, +30% ATK, +30% DEF army-wide',
        bonus: { all: { hpMult: 1.40, atkMult: 1.30, defMult: 1.30 } },
        icon: 'queen', bgGradient: 'radial-gradient(circle at 35% 25%, #fff6c8, #e0a82a 55%, #7a4a08)'
    },
    dragonemperor: {
        name: 'Vaelthryx', title: 'The Dragon Emperor',
        rarity: 'mythic', unlockLevel: 33, unlockCost: { gold: 55000, iron: 35000, coins: 150000, food: 20000 },
        baseStats: { hp: 1500, attack: 560, defense: 300 },
        ability: 'Apocalypse', abilityDesc: '+45% to ALL stats; 25% instant-slay chance',
        bonus: { all: { atkMult: 1.45, hpMult: 1.45, defMult: 1.45, critChance: 0.25 } },
        icon: 'king', bgGradient: 'radial-gradient(circle at 35% 25%, #ff8a3a, #b81818 55%, #3a0808)'
    }
};

// Generate hero portrait HTML (used in renderHeroesView)
function heroPortraitHTML(id) {
    const h = HERO_DEFS[id];
    return `
        <div class="hero-portrait-inner" style="background: ${h.bgGradient}">
            <div class="hero-portrait-shimmer"></div>
            <img class="hero-img" src="${ICON_BASE}/${h.icon}.png" alt="${h.name}" draggable="false">
        </div>
    `;
}

// Patch portraits onto each hero def for backward compat
for (const [id, h] of Object.entries(HERO_DEFS)) {
    Object.defineProperty(h, 'portrait', {
        get() { return heroPortraitHTML(id); }
    });
}

// Camp / raid target icons
const CAMP_ICONS = {
    goblin:    'orc',
    wolf:      'horse',
    pirate:    'pirate-flag',
    crate:     'treasure-chest',
    tree:      'log-cabin',
    frog:      'iron',
    orc:       'orc',
    snowflake: 'snow',
    dragon:    'king',
    shadow:    'sword',
    volcano:   'cannon',
    demon:     'witch',
    skull:     'sword',
    abyss:     'tower',
    celestial: 'palace',
    village:   'farm'
};

function campIconHTML(iconKey) {
    const iconName = CAMP_ICONS[iconKey] || 'tower';
    return `<img class="camp-icon-img" src="${ICON_BASE}/${iconName}.png" alt="${iconKey}" draggable="false">`;
}

const RARITY_COLORS = {
    common: '#94a3b8',
    rare: '#3b82f6',
    epic: '#a855f7',
    legendary: '#f59e0b',
    mythic: '#ff4d6d'
};
