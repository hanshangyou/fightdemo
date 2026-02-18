import { Character } from './Character.js';
import { DEFAULT_CHARACTER_POOL } from './DefaultCharacterPool.js';
import { getWeaponPool } from './WeaponSystem.js';

export const RARITY = {
    COMMON: { name: '普通', color: '#95a5a6', multiplier: 1 },
    RARE: { name: '稀有', color: '#3498db', multiplier: 1.2 },
    EPIC: { name: '史诗', color: '#9b59b6', multiplier: 1.5 },
    LEGENDARY: { name: '传说', color: '#f39c12', multiplier: 2 },
    ENEMY: { name: '敌对', color: '#e74c3c', multiplier: 1 }
};

const STORAGE_KEY = 'fightdemo_character_pool';

export function getCharacterPool() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            const weaponPool = getWeaponPool();
            const getFallbackWeaponId = (rarity) => {
                if (!weaponPool.length) return null;
                const byRarity = weaponPool.find(weapon => weapon.rarity === rarity);
                return (byRarity || weaponPool[0])?.id ?? null;
            };
            return parsed.map(c => ({
                ...c,
                background: c.background ?? c.name,
                defaultWeaponId: c.defaultWeaponId ?? getFallbackWeaponId(c.rarity)
            }));
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
            background: template.background,
            maxHp: Math.round(template.baseStats.maxHp * multiplier),
            attack: Math.round(template.baseStats.attack * multiplier),
            defense: Math.round(template.baseStats.defense * multiplier),
            speed: Math.round(template.baseStats.speed * multiplier),
            team: 'A',
            icon: template.icon,
            rarity: template.rarity,
            templateId: template.id,
            defaultWeaponId: template.defaultWeaponId ?? null
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
