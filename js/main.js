import { GachaSystem } from './GachaSystem.js';
import { StageSystem } from './StageSystem.js';
import { BattleSystem } from './BattleSystem.js';
import { GameUI } from './GameUI.js';
import { PoolEditor } from './PoolEditor.js';
import { StageEditor } from './StageEditor.js';

class Game {
    ui;
    gachaSystem;
    stageSystem;
    battleSystem = null;
    poolEditor = null;
    stageEditor = null;
    
    gold = 0;
    gachaTickets = 10;
    currentTeam = [];
    maxTeamSize = 3;
    hasDrawn = false;

    constructor() {
        this.ui = new GameUI();
        this.gachaSystem = new GachaSystem();
        this.stageSystem = new StageSystem();
        this.poolEditor = new PoolEditor('editor-container');
        this.stageEditor = new StageEditor('stage-editor-container');
        
        this.poolEditor.onSave(() => {
            this.gachaSystem = new GachaSystem();
        });
        
        this.poolEditor.onClose(() => {
            this.showMainScreen();
        });
        
        this.stageEditor.onSave(() => {
            this.stageSystem.reloadStages();
        });
        
        this.stageEditor.onClose(() => {
            this.showMainScreen();
        });
        
        this.setupEventListeners();
        this.updateMainScreen();
        this.showMainScreen();
    }

    setupEventListeners() {
        this.ui.onGoGacha(() => this.showGachaScreen());
        this.ui.onGoBattle(() => this.startBattle());
        this.ui.onGoEditor(() => this.showEditorScreen());
        this.ui.onGoStageEditor(() => this.showStageEditorScreen());
        
        this.ui.onGachaPull(() => this.pullGacha());
        this.ui.onReroll(() => this.rerollGacha());
        this.ui.onBackFromGacha(() => this.showMainScreen());
        
        this.ui.onCharacterSelect((charId) => this.toggleCharacterInTeam(charId));
        this.ui.onConfirmTeam(() => this.confirmTeamAndStartBattle());
        
        this.ui.onNextStage(() => this.goToNextStage());
        this.ui.onRetry(() => this.retryWithSameTeam());
        this.ui.onRestart(() => this.reselectTeamForCurrentStage());
        this.ui.onGoHome(() => this.resetGame());
    }

    updateMainScreen() {
        const stage = this.stageSystem.getCurrentStage();
        this.ui.updateMainScreen(this.gold, this.gachaTickets, stage, this.currentTeam, this.hasDrawn);
    }

    showMainScreen() {
        this.updateMainScreen();
        this.ui.showScreen('main');
    }

    showEditorScreen() {
        if (this.hasDrawn) {
            alert('已开始挑战，无法编辑卡池！请返回首页重新开始后再编辑。');
            return;
        }
        this.poolEditor.show();
        this.ui.showScreen('editor');
    }
    
    showStageEditorScreen() {
        if (this.hasDrawn) {
            alert('已开始挑战，无法编辑关卡！请返回首页重新开始后再编辑。');
            return;
        }
        this.stageEditor.show();
        this.ui.showScreen('stageEditor');
    }

    showGachaScreen() {
        if (this.hasDrawn) {
            this.showTeamSelectScreen();
            return;
        }
        
        if (this.gachaSystem.hasDrawn()) {
            this.ui.renderDrawPool(this.gachaSystem.getCurrentDrawPool(), this.currentTeam.map(c => c.id), false);
            this.ui.updateTeamCount(this.currentTeam.length, this.maxTeamSize);
        } else {
            this.ui.clearDrawPool();
            this.ui.updateTeamCount(0, this.maxTeamSize);
        }
        this.ui.updateGachaTickets(this.gachaTickets);
        this.ui.updateGachaButtons(this.hasDrawn);
        this.ui.showScreen('gacha');
    }
    
    showTeamSelectScreen() {
        if (!this.gachaSystem.hasDrawn()) {
            alert('请先抽取角色！');
            this.showMainScreen();
            return;
        }
        
        this.currentTeam = [];
        this.ui.renderDrawPool(this.gachaSystem.getCurrentDrawPool(), [], false);
        this.ui.updateTeamCount(0, this.maxTeamSize);
        this.ui.updateGachaTickets(this.gachaTickets);
        this.ui.updateGachaButtons(this.hasDrawn);
        this.ui.showScreen('gacha');
    }

    pullGacha() {
        if (this.hasDrawn) {
            alert('已开始挑战，无法重新抽卡！');
            return;
        }
        
        if (this.gachaTickets <= 0) {
            alert('抽卡券不足！');
            return;
        }
        
        this.gachaTickets--;
        this.currentTeam = [];
        
        const results = this.gachaSystem.pull10();
        this.ui.renderDrawPool(results, []);
        this.ui.updateTeamCount(0, this.maxTeamSize);
        this.ui.updateGachaTickets(this.gachaTickets);
        this.ui.updateMainScreen(this.gold, this.gachaTickets, this.stageSystem.getCurrentStage());
    }

    rerollGacha() {
        if (this.hasDrawn) {
            alert('已开始挑战，无法重新抽卡！');
            return;
        }
        
        if (this.gachaTickets <= 0) {
            alert('抽卡券不足！');
            return;
        }
        
        this.gachaTickets--;
        this.currentTeam = [];
        
        const results = this.gachaSystem.pull10();
        this.ui.renderDrawPool(results, []);
        this.ui.updateTeamCount(0, this.maxTeamSize);
        this.ui.updateGachaTickets(this.gachaTickets);
        this.ui.updateMainScreen(this.gold, this.gachaTickets, this.stageSystem.getCurrentStage());
    }

    toggleCharacterInTeam(charId) {
        const character = this.gachaSystem.getCurrentDrawPool().find(c => c.id === charId);
        if (!character) return;
        
        const existingIndex = this.currentTeam.findIndex(c => c.id === charId);
        
        if (existingIndex > -1) {
            this.currentTeam.splice(existingIndex, 1);
        } else {
            if (this.currentTeam.length >= this.maxTeamSize) {
                alert(`最多只能选择${this.maxTeamSize}个角色！`);
                return;
            }
            this.currentTeam.push(character);
        }
        
        this.ui.renderDrawPool(this.gachaSystem.getCurrentDrawPool(), this.currentTeam.map(c => c.id), false);
        this.ui.updateTeamCount(this.currentTeam.length, this.maxTeamSize);
    }

    confirmTeamAndStartBattle() {
        if (this.currentTeam.length === 0) {
            alert('请至少选择1个角色！');
            return;
        }
        
        this.startBattle();
    }

    startBattle() {
        if (this.currentTeam.length === 0) {
            alert('请先抽取角色并组建队伍！');
            this.showGachaScreen();
            return;
        }

        this.hasDrawn = true;
        this.currentTeam.forEach(c => c.reset());
        
        this.stageSystem.reloadStages();
        const stage = this.stageSystem.getCurrentStage();
        const enemies = this.stageSystem.createEnemies(this.stageSystem.currentStage);
        
        if (enemies.length === 0) {
            alert('当前关卡没有敌人，请检查关卡配置！');
            return;
        }
        
        document.getElementById('battle-stage-info').textContent = stage.name;
        
        this.ui.renderBattleTeam(this.currentTeam, 'battle-team-a');
        this.ui.renderBattleTeam(enemies, 'battle-team-b');
        this.ui.clearBattleLog();
        this.ui.showScreen('battle');
        
        this.battleSystem = new BattleSystem(this.currentTeam, enemies);
        
        this.battleSystem.addEventListener((event) => {
            this.handleBattleEvent(event);
        });
        
        this.ui.addBattleLog(`⚔️ ${stage.name} 开始！`, 'turn');
        
        this.battleSystem.start().then((winner) => {
            this.handleBattleEnd(winner);
        });
    }

    handleBattleEvent(event) {
        switch (event.type) {
            case 'turn_start':
                if (event.data.activeCharacter) {
                    this.ui.setActiveCharacter(event.data.activeCharacter);
                }
                break;
                
            case 'attack':
                if (event.data.attacker && event.data.defender && event.data.damage) {
                    this.ui.updateBattleCharacter(event.data.defender);
                    this.ui.showDamagePopup(event.data.defender, event.data.damage);
                    this.ui.addBattleLog(
                        `${event.data.attacker.name} → ${event.data.defender.name} -${event.data.damage}`,
                        event.data.defender.team === 'A' ? 'defend' : 'attack'
                    );
                }
                break;
                
            case 'death':
                if (event.data.defender) {
                    this.ui.updateBattleCharacter(event.data.defender);
                    this.ui.addBattleLog(`💀 ${event.data.defender.name} 被击败！`, 'turn');
                }
                break;
                
            case 'gauge_update':
                if (event.data.characters) {
                    event.data.characters.forEach(c => this.ui.updateBattleCharacter(c));
                }
                break;
        }
    }

    handleBattleEnd(winner) {
        const stage = this.stageSystem.getCurrentStage();
        const isVictory = winner === 'A';
        const damageStats = this.battleSystem.getDamageStats();
        const totalDamage = this.battleSystem.getTotalDamage();
        const turnCount = this.battleSystem.getTurnCount();
        
        if (isVictory) {
            this.stageSystem.clearCurrentStage();
            const rewards = stage.rewards;
            this.gold += rewards.gold;
            this.gachaTickets += rewards.gachaTickets;
        }
        
        this.ui.showResult(isVictory, stage, isVictory ? stage.rewards : null, damageStats, totalDamage, turnCount, this.hasDrawn);
    }

    goToNextStage() {
        this.stageSystem.reloadStages();
        const totalStages = this.stageSystem.getTotalStages();
        const currentStage = this.stageSystem.getCurrentStage();
        
        if (currentStage.id >= totalStages) {
            this.resetGame();
        } else if (this.stageSystem.advanceStage()) {
            this.showTeamSelectScreen();
        }
    }

    retryWithSameTeam() {
        this.currentTeam.forEach(c => c.reset());
        this.startBattle();
    }
    
    reselectTeamForCurrentStage() {
        this.currentTeam = [];
        this.showTeamSelectScreen();
    }

    resetGame() {
        this.gold = 0;
        this.gachaTickets = 10;
        this.currentTeam = [];
        this.hasDrawn = false;
        this.gachaSystem.clearDrawPool();
        this.stageSystem.reset();
        this.updateMainScreen();
        this.showMainScreen();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Game();
});
