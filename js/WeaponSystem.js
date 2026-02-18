import { DEFAULT_WEAPON_POOL } from './DefaultWeaponPool.js';

const STORAGE_KEY = 'fightdemo_weapon_pool';

export const WEAPON_TYPES = {
    SWORD: { name: '剑', icon: '⚔️', range: 1, apCost: 3, damageMin: 7, damageMax: 12 },
    SPEAR: { name: '枪', icon: '🔱', range: 2, apCost: 4, damageMin: 5, damageMax: 10 },
    BOW: { name: '弓', icon: '🏹', range: 3, apCost: 4, damageMin: 4, damageMax: 9 }
};

export function getWeaponPool() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            return [...DEFAULT_WEAPON_POOL];
        }
    }
    return [...DEFAULT_WEAPON_POOL];
}

export function saveWeaponPool(pool) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pool));
}

export function resetWeaponPool() {
    localStorage.removeItem(STORAGE_KEY);
    return [...DEFAULT_WEAPON_POOL];
}
