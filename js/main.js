import { GachaSystem } from './GachaSystem.js';
import { StageSystem } from './StageSystem.js';
import { BattleSystem } from './BattleSystem.js';
import { GameUI } from './GameUI.js';
import { PoolEditor } from './PoolEditor.js';
import { StageEditor, getStages } from './StageEditor.js';

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
    playerPool = [];
    hasDrawn = false;
    initialDrawUsed = false;
    selectingFromPool = false;
    campDrawUsed = false;
    campDrawPool = [];
    campSelectedDrawId = null;
    lastCampStage = null;
    lastCampRewards = null;
    lastResultSummary = null;
    campRetryMode = false;
    battleDeadIds = new Set();

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
        this.ui.onGoBattle(() => {
            if (this.playerPool.length > 0) {
                this.showTeamSelectFromPool();
            } else {
                this.showGachaScreen();
            }
        });
        this.ui.onGoEditor(() => this.showEditorScreen());
        this.ui.onGoStageEditor(() => this.showStageEditorScreen());
        
        this.ui.onGachaPull(() => this.pullGacha());
        this.ui.onReroll(() => this.rerollGacha());
        this.ui.onBackFromGacha(() => this.handleBackFromGacha());
        
        this.ui.onCharacterSelect((charId) => this.toggleCharacterInTeam(charId));
        this.ui.onConfirmTeam(() => this.confirmTeamAndStartBattle());

        this.ui.onNextStage(() => this.enterCampFromResult());
        this.ui.onRetry(() => this.retryWithSameTeam());
        this.ui.onRestart(() => this.returnToCampAfterDefeat());
        this.ui.onGoHome(() => this.resetGame());

        this.ui.onCampDraw(() => this.campDraw5());
        this.ui.onCampNext(() => this.campNextStage());
        this.ui.onCampHome(() => this.resetGame());
        this.ui.onCampSelectDraw((charId) => this.selectCampDraw(charId));
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
        this.stageSystem.reloadStages();
        this.selectingFromPool = false;
        const maxTeamSize = this.getCurrentMaxTeamSize();
        if (this.gachaSystem.hasDrawn()) {
            this.ui.renderDrawPool(this.gachaSystem.getCurrentDrawPool(), this.currentTeam.map(c => c.id), false);
            this.ui.updateTeamCount(this.currentTeam.length, maxTeamSize);
        } else {
            this.ui.clearDrawPool();
            this.ui.updateTeamCount(0, maxTeamSize);
        }
        this.ui.updateGachaTickets(this.gachaTickets);
        this.ui.updateGachaButtons(this.initialDrawUsed);
        this.ui.setGachaControls({
            showDrawButtons: !this.initialDrawUsed,
            confirmText: '⚔️ 开始战斗',
            backText: '返回'
        });
        this.ui.showScreen('gacha');
    }

    pullGacha() {
        if (this.initialDrawUsed) {
            alert('已抽卡，本局开局只能抽一次！');
            return;
        }
        
        if (this.gachaTickets <= 0) {
            alert('抽卡券不足！');
            return;
        }
        
        this.gachaTickets--;
        this.currentTeam = [];
        this.selectingFromPool = false;
        
        const results = this.gachaSystem.pull10();
        this.ui.renderDrawPool(results, []);
        this.ui.updateTeamCount(0, this.getCurrentMaxTeamSize());
        this.ui.updateGachaTickets(this.gachaTickets);
        this.ui.updateGachaButtons(true);
        this.ui.updateMainScreen(this.gold, this.gachaTickets, this.stageSystem.getCurrentStage());
        this.initialDrawUsed = true;
    }

    rerollGacha() {
        alert('开局抽卡只能进行一次，不能重抽。');
    }

    toggleCharacterInTeam(charId) {
        const sourcePool = this.selectingFromPool ? this.playerPool : this.gachaSystem.getCurrentDrawPool();
        const character = sourcePool.find(c => c.id === charId);
        if (!character) return;
        if (this.selectingFromPool && character.isDead) {
            alert('该角色已阵亡，无法上场。');
            return;
        }
        const maxTeamSize = this.getCurrentMaxTeamSize();
        
        const existingIndex = this.currentTeam.findIndex(c => c.id === charId);
        
        if (existingIndex > -1) {
            this.currentTeam.splice(existingIndex, 1);
        } else {
            if (this.currentTeam.length >= maxTeamSize) {
                alert(`最多只能选择${maxTeamSize}个角色！`);
                return;
            }
            this.currentTeam.push(character);
        }
        
        const poolToRender = this.selectingFromPool ? this.playerPool : this.gachaSystem.getCurrentDrawPool();
        const emptyHint = this.selectingFromPool ? '备选池为空，请先抽卡获得角色' : '点击下方按钮抽取10个角色';
        this.ui.renderDrawPool(poolToRender, this.currentTeam.map(c => c.id), false, emptyHint);
        this.ui.updateTeamCount(this.currentTeam.length, maxTeamSize);
    }

    confirmTeamAndStartBattle() {
        const maxTeamSize = this.getCurrentMaxTeamSize();
        if (this.currentTeam.length < 1) {
            alert('请至少选择1个角色！');
            return;
        }
        if (this.currentTeam.length > maxTeamSize) {
            alert(`最多只能选择${maxTeamSize}个角色！`);
            return;
        }
        if (!this.selectingFromPool) {
            this.currentTeam.forEach(c => {
                if (!this.playerPool.find(p => p.id === c.id)) {
                    this.playerPool.push(c);
                }
            });
        }
        this.gachaSystem.clearDrawPool();
        this.selectingFromPool = false;
        this.startBattle();
    }

    startBattle() {
        const maxTeamSize = this.getCurrentMaxTeamSize();
        if (this.currentTeam.length < 1 || this.currentTeam.length > maxTeamSize) {
            alert(`请先选择1到${maxTeamSize}名角色组队！`);
            if (this.playerPool.length > 0) {
                this.showTeamSelectFromPool();
            } else {
                this.showGachaScreen();
            }
            return;
        }

        this.hasDrawn = true;
        this.currentTeam.forEach(c => c.reset());
        this.battleDeadIds = new Set();
        
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
                    if (event.data.defender.team === 'A') {
                        event.data.defender.isDead = true;
                        this.battleDeadIds.add(event.data.defender.id);
                        const poolChar = this.playerPool.find(c => c.id === event.data.defender.id);
                        if (poolChar) {
                            poolChar.isDead = true;
                        }
                    }
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
            this.reorderPlayerPoolByLastTeam();
            this.lastResultSummary = { stage, rewards, damageStats, totalDamage, turnCount };
        } else if (this.battleDeadIds.size > 0) {
            this.battleDeadIds.forEach(id => {
                const teamChar = this.currentTeam.find(c => c.id === id);
                if (teamChar) teamChar.isDead = false;
                const poolChar = this.playerPool.find(c => c.id === id);
                if (poolChar) poolChar.isDead = false;
            });
        }
        this.battleDeadIds = new Set();
        
        this.ui.showResult(isVictory, stage, isVictory ? stage.rewards : null, damageStats, totalDamage, turnCount, this.hasDrawn);
    }

    retryWithSameTeam() {
        this.currentTeam.forEach(c => c.reset());
        this.startBattle();
    }
    
    showCamp(stage, rewards, damageStats, totalDamage, turnCount, preserveState = false, subtitleOverride = '') {
        this.lastCampStage = stage;
        this.lastCampRewards = rewards;
        if (!preserveState) {
            this.campDrawUsed = false;
        }
        this.campDrawPool = [];
        this.campSelectedDrawId = null;

        const subtitle = subtitleOverride || (this.campRetryMode
            ? `重新挑战 ${this.stageSystem.getCurrentStage().name} | 当前资源 💰${this.gold} 🎫${this.gachaTickets}`
            : `通过 ${stage.name} | 奖励 💰+${rewards.gold} 🎫+${rewards.gachaTickets} | 当前资源 💰${this.gold} 🎫${this.gachaTickets}`);
        this.ui.updateCampHeader('🏕️ 营地', subtitle);
        const hintText = this.campDrawUsed
            ? '本次营地已抽卡，可直接挑战下一关'
            : '可选：消耗1张抽卡券抽5张，并选择1张加入备选池';
        this.ui.updateCampHint(hintText);
        const availableCount = this.playerPool.filter(c => !c.isDead).length;
        this.ui.updateCampAvailableCount(availableCount);
        this.ui.renderCampTeam(this.playerPool, false);
        this.ui.renderCampDrawPool([], null);
        const nextText = this.campRetryMode
            ? '🔄 重新挑战'
            : (this.stageSystem.isLastStage() ? '🏠 通关返回首页' : '➡️ 挑战下一关');
        this.ui.setCampButtons({
            canDraw: !this.campDrawUsed && this.gachaTickets > 0,
            nextText
        });
        this.ui.showScreen('camp');
    }

    enterCampFromResult() {
        if (!this.lastResultSummary) return;
        const { stage, rewards, damageStats, totalDamage, turnCount } = this.lastResultSummary;
        this.lastResultSummary = null;
        this.campRetryMode = false;
        this.showCamp(stage, rewards, damageStats, totalDamage, turnCount, false);
    }

    reorderPlayerPoolByLastTeam() {
        if (this.playerPool.length === 0) return;
        if (this.currentTeam.length === 0) return;
        const teamIds = this.currentTeam.map(c => c.id);
        this.playerPool.sort((a, b) => {
            const aIdx = teamIds.indexOf(a.id);
            const bIdx = teamIds.indexOf(b.id);
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
            if (aIdx !== -1) return -1;
            if (bIdx !== -1) return 1;
            return 0;
        });
    }

    campDraw5() {
        if (this.campDrawUsed) {
            alert('本次营地已抽卡。');
            return;
        }
        if (this.gachaTickets <= 0) {
            alert('抽卡券不足！');
            return;
        }
        this.gachaTickets--;
        this.campDrawUsed = true;
        this.campDrawPool = this.gachaSystem.pull5();
        this.campSelectedDrawId = null;

        this.ui.updateMainScreen(this.gold, this.gachaTickets, this.stageSystem.getCurrentStage(), this.currentTeam, this.hasDrawn);
        this.ui.updateCampHint('请选择1张卡加入备选池');
        this.ui.renderCampDrawPool(this.campDrawPool, null);
        this.ui.renderCampTeam(this.playerPool, false);
        this.ui.setCampButtons({
            canDraw: false,
            nextText: this.stageSystem.isLastStage() ? '🏠 通关返回首页' : '➡️ 挑战下一关'
        });
    }

    selectCampDraw(charId) {
        if (this.campSelectedDrawId) {
            return;
        }
        const picked = this.campDrawPool.find(c => c.id === charId);
        if (!picked) return;
        this.campSelectedDrawId = charId;
        this.playerPool.push(picked);
        this.campDrawPool = [];
        this.gachaSystem.clearDrawPool();

        this.ui.renderCampTeam(this.playerPool, false);
        this.ui.renderCampDrawPool([], null);
        this.ui.updateCampHint(`已保留 ${picked.name}，已加入备选池`);
        const availableCount = this.playerPool.filter(c => !c.isDead).length;
        this.ui.updateCampAvailableCount(availableCount);
    }

    campNextStage() {
        this.stageSystem.reloadStages();
        if (this.stageSystem.isLastStage()) {
            this.resetGame();
            return;
        }
        if (this.campRetryMode) {
            this.campRetryMode = false;
            this.showTeamSelectFromPool();
            return;
        }
        if (this.stageSystem.advanceStage()) {
            this.showTeamSelectFromPool();
        }
    }

    showTeamSelectFromPool() {
        this.stageSystem.reloadStages();
        this.selectingFromPool = true;
        this.currentTeam = [];
        const maxTeamSize = this.getCurrentMaxTeamSize();
        const availableCount = this.playerPool.filter(c => !c.isDead).length;
        this.ui.renderDrawPool(this.playerPool, [], false, '备选池为空，请先抽卡获得角色');
        this.ui.updateTeamCount(0, maxTeamSize);
        this.ui.updateGachaTickets(this.gachaTickets);
        this.ui.setGachaControls({
            showDrawButtons: false,
            confirmText: '⚔️ 开始战斗',
            backText: '返回营地'
        });
        this.ui.updateCampAvailableCount(availableCount);
        this.ui.showScreen('gacha');
    }

    getCurrentMaxTeamSize() {
        const stages = getStages();
        const stage = stages[this.stageSystem.currentStage] || stages[0];
        const max = parseInt(stage?.maxTeamSize, 10);
        if (Number.isFinite(max)) {
            return Math.max(1, max);
        }
        return 3;
    }

    handleBackFromGacha() {
        if (this.selectingFromPool && this.lastCampStage && this.lastCampRewards) {
            this.showCamp(this.lastCampStage, this.lastCampRewards, null, null, null, true);
            return;
        }
        this.showMainScreen();
    }

    returnToCampAfterDefeat() {
        if (this.lastCampStage && this.lastCampRewards) {
            this.campRetryMode = true;
            this.showCamp(this.lastCampStage, this.lastCampRewards, null, null, null, true);
            return;
        }
        if (this.playerPool.length > 0) {
            this.showTeamSelectFromPool();
            return;
        }
        this.showGachaScreen();
    }

    resetGame() {
        this.gold = 0;
        this.gachaTickets = 10;
        this.currentTeam = [];
        this.playerPool = [];
        this.hasDrawn = false;
        this.initialDrawUsed = false;
        this.selectingFromPool = false;
        this.campDrawUsed = false;
        this.campDrawPool = [];
        this.campSelectedDrawId = null;
        this.lastCampStage = null;
        this.lastCampRewards = null;
        this.lastResultSummary = null;
        this.campRetryMode = false;
        this.gachaSystem.clearDrawPool();
        this.stageSystem.reset();
        this.updateMainScreen();
        this.showMainScreen();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Game();
});
