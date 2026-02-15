import { Character } from './Character.js';
import { getCharacterPool } from './GachaSystem.js';
import { getStages } from './StageEditor.js';

export class StageSystem {
    currentStage = 0;
    highestCleared = 0;
    stages = [];

    constructor() {
        this.currentStage = 0;
        this.highestCleared = 0;
        this.stages = getStages();
    }

    reloadStages() {
        this.stages = getStages();
    }

    getCurrentStage() {
        return this.stages[this.currentStage];
    }

    getStage(index) {
        return this.stages[index];
    }

    getTotalStages() {
        return this.stages.length;
    }

    createEnemies(stageIndex) {
        this.stages = getStages();
        const stage = this.stages[stageIndex];
        if (!stage) return [];
        
        const allCharacters = getCharacterPool();
        
        return stage.enemies.map((enemyId, index) => {
            const template = allCharacters.find(c => c.id === enemyId);
            if (!template) return null;
            
            return new Character({
                id: `enemy_${stage.id}_${index}_${Date.now()}`,
                name: template.name,
                maxHp: template.baseStats.maxHp,
                attack: template.baseStats.attack,
                defense: template.baseStats.defense,
                speed: template.baseStats.speed,
                team: 'B',
                icon: template.icon,
                rarity: template.rarity,
                templateId: template.id
            });
        }).filter(c => c !== null);
    }

    advanceStage() {
        this.stages = getStages();
        if (this.currentStage < this.stages.length - 1) {
            this.currentStage++;
            return true;
        }
        return false;
    }

    clearCurrentStage() {
        if (this.currentStage > this.highestCleared) {
            this.highestCleared = this.currentStage;
        }
    }

    reset() {
        this.currentStage = 0;
        this.highestCleared = 0;
        this.stages = getStages();
    }

    isLastStage() {
        this.stages = getStages();
        return this.currentStage >= this.stages.length - 1;
    }

    isVictory() {
        this.stages = getStages();
        return this.highestCleared >= this.stages.length - 1;
    }
}
