import { Character } from './Character.js';

export const RARITY = {
    COMMON: { name: '普通', color: '#95a5a6', multiplier: 1 },
    RARE: { name: '稀有', color: '#3498db', multiplier: 1.2 },
    EPIC: { name: '史诗', color: '#9b59b6', multiplier: 1.5 },
    LEGENDARY: { name: '传说', color: '#f39c12', multiplier: 2 },
    ENEMY: { name: '敌对', color: '#e74c3c', multiplier: 1 }
};

export const DEFAULT_CHARACTER_POOL = [
    { id: 'warrior', name: '战士', rarity: 'COMMON', baseStats: { maxHp: 100, attack: 20, defense: 10, speed: 12 }, icon: '⚔️' },
    { id: 'knight', name: '骑士', rarity: 'RARE', baseStats: { maxHp: 130, attack: 22, defense: 15, speed: 10 }, icon: '🛡️' },
    { id: 'mage', name: '法师', rarity: 'COMMON', baseStats: { maxHp: 70, attack: 30, defense: 5, speed: 15 }, icon: '🔮' },
    { id: 'archmage', name: '大法师', rarity: 'EPIC', baseStats: { maxHp: 80, attack: 40, defense: 6, speed: 18 }, icon: '🌟' },
    { id: 'priest', name: '牧师', rarity: 'COMMON', baseStats: { maxHp: 85, attack: 15, defense: 8, speed: 14 }, icon: '✝️' },
    { id: 'assassin', name: '刺客', rarity: 'RARE', baseStats: { maxHp: 65, attack: 35, defense: 4, speed: 25 }, icon: '🗡️' },
    { id: 'archer', name: '弓箭手', rarity: 'COMMON', baseStats: { maxHp: 75, attack: 25, defense: 6, speed: 20 }, icon: '🏹' },
    { id: 'paladin', name: '圣骑士', rarity: 'EPIC', baseStats: { maxHp: 140, attack: 28, defense: 18, speed: 8 }, icon: '⚜️' },
    { id: 'berserker', name: '狂战士', rarity: 'RARE', baseStats: { maxHp: 110, attack: 38, defense: 5, speed: 16 }, icon: '🪓' },
    { id: 'ninja', name: '忍者', rarity: 'EPIC', baseStats: { maxHp: 60, attack: 42, defense: 3, speed: 30 }, icon: '🥷' },
    { id: 'dragon_knight', name: '龙骑士', rarity: 'LEGENDARY', baseStats: { maxHp: 160, attack: 45, defense: 20, speed: 12 }, icon: '🐉' },
    { id: 'phoenix', name: '凤凰使者', rarity: 'LEGENDARY', baseStats: { maxHp: 90, attack: 50, defense: 10, speed: 22 }, icon: '🔥' },
    { id: 'goblin', name: '哥布林', rarity: 'ENEMY', baseStats: { maxHp: 50, attack: 12, defense: 3, speed: 15 }, icon: '👺' },
    { id: 'goblin_boss', name: '哥布林头目', rarity: 'ENEMY', baseStats: { maxHp: 70, attack: 18, defense: 5, speed: 12 }, icon: '👹' },
    { id: 'wolf', name: '野狼', rarity: 'ENEMY', baseStats: { maxHp: 70, attack: 20, defense: 5, speed: 20 }, icon: '🐺' },
    { id: 'skeleton', name: '骷髅兵', rarity: 'ENEMY', baseStats: { maxHp: 60, attack: 22, defense: 8, speed: 14 }, icon: '💀' },
    { id: 'ghost', name: '幽灵', rarity: 'ENEMY', baseStats: { maxHp: 60, attack: 35, defense: 5, speed: 25 }, icon: '👻' },
    { id: 'vampire', name: '吸血鬼', rarity: 'ENEMY', baseStats: { maxHp: 100, attack: 35, defense: 12, speed: 18 }, icon: '🧛' },
    { id: 'demon', name: '恶魔', rarity: 'ENEMY', baseStats: { maxHp: 120, attack: 40, defense: 15, speed: 14 }, icon: '👿' },
    { id: 'dragon', name: '暗黑龙', rarity: 'ENEMY', baseStats: { maxHp: 200, attack: 55, defense: 25, speed: 10 }, icon: '🐲' },
    { id: 'demon_king', name: '魔王', rarity: 'ENEMY', baseStats: { maxHp: 300, attack: 65, defense: 25, speed: 16 }, icon: '👑' }
];

const STORAGE_KEY = 'fightdemo_character_pool';

export function getCharacterPool() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            return [...DEFAULT_CHARACTER_POOL];
        }
    }
    return [...DEFAULT_CHARACTER_POOL];
}

export function getPlayableCharacterPool() {
    return getCharacterPool().filter(c => c.rarity !== 'ENEMY');
}

export function getEnemyCharacterPool() {
    return getCharacterPool().filter(c => c.rarity === 'ENEMY');
}

export function saveCharacterPool(pool) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pool));
}

export function resetCharacterPool() {
    localStorage.removeItem(STORAGE_KEY);
    return [...DEFAULT_CHARACTER_POOL];
}

export class GachaSystem {
    currentDrawPool = [];
    gachaCount = 0;
    characterPool = [];
    
    RARITY_RATES = {
        COMMON: 68,
        RARE: 22,
        EPIC: 8,
        LEGENDARY: 2
    };

    constructor() {
        this.currentDrawPool = [];
        this.gachaCount = 0;
        this.characterPool = getPlayableCharacterPool();
    }

    getRandomRarity() {
        const rand = Math.random() * 100;
        let cumulative = 0;
        
        for (const [rarity, rate] of Object.entries(this.RARITY_RATES)) {
            cumulative += rate;
            if (rand < cumulative) {
                return rarity;
            }
        }
        return 'COMMON';
    }

    createCharacter(template) {
        const multiplier = RARITY[template.rarity]?.multiplier || 1;
        
        const character = new Character({
            id: `${template.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: template.name,
            maxHp: Math.round(template.baseStats.maxHp * multiplier),
            attack: Math.round(template.baseStats.attack * multiplier),
            defense: Math.round(template.baseStats.defense * multiplier),
            speed: Math.round(template.baseStats.speed * multiplier),
            team: 'A',
            icon: template.icon,
            rarity: template.rarity,
            templateId: template.id
        });

        return character;
    }

    pull(count) {
        this.currentDrawPool = [];
        this.characterPool = getPlayableCharacterPool();
        
        for (let i = 0; i < count; i++) {
            const rarity = this.getRandomRarity();
            const pool = this.characterPool.filter(c => c.rarity === rarity);
            
            if (pool.length === 0) {
                i--;
                continue;
            }
            
            const template = pool[Math.floor(Math.random() * pool.length)];
            const character = this.createCharacter(template);
            this.currentDrawPool.push(character);
        }
        
        this.gachaCount++;
        return this.currentDrawPool;
    }

    pull10() {
        return this.pull(10);
    }

    pull5() {
        return this.pull(5);
    }

    getCurrentDrawPool() {
        return this.currentDrawPool;
    }

    hasDrawn() {
        return this.currentDrawPool.length > 0;
    }

    clearDrawPool() {
        this.currentDrawPool = [];
    }
}
