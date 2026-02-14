import { Character } from './Character.js';
import { BattleSystem } from './BattleSystem.js';
import { GameUI } from './GameUI.js';

class Game {
    private ui: GameUI;
    private battleSystem: BattleSystem | null = null;
    private teamA: Character[] = [];
    private teamB: Character[] = [];

    constructor() {
        this.ui = new GameUI();
        this.initializeCharacters();
        this.setupEventListeners();
        this.renderInitial();
    }

    private initializeCharacters(): void {
        this.teamA = [
            new Character({
                id: 'a1',
                name: '战士',
                maxHp: 120,
                attack: 25,
                defense: 10,
                speed: 15,
                team: 'A'
            }),
            new Character({
                id: 'a2',
                name: '法师',
                maxHp: 80,
                attack: 35,
                defense: 5,
                speed: 20,
                team: 'A'
            }),
            new Character({
                id: 'a3',
                name: '牧师',
                maxHp: 90,
                attack: 15,
                defense: 8,
                speed: 18,
                team: 'A'
            })
        ];

        this.teamB = [
            new Character({
                id: 'b1',
                name: '哥布林',
                maxHp: 60,
                attack: 18,
                defense: 5,
                speed: 25,
                team: 'B'
            }),
            new Character({
                id: 'b2',
                name: '兽人',
                maxHp: 150,
                attack: 30,
                defense: 12,
                speed: 10,
                team: 'B'
            }),
            new Character({
                id: 'b3',
                name: '暗影刺客',
                maxHp: 70,
                attack: 40,
                defense: 3,
                speed: 30,
                team: 'B'
            })
        ];
    }

    private setupEventListeners(): void {
        this.ui.onStart(() => this.startBattle());
        this.ui.onRestart(() => this.restartGame());
    }

    private renderInitial(): void {
        this.ui.clearCharacters();
        this.ui.renderTeam(this.teamA, document.getElementById('team-a')!);
        this.ui.renderTeam(this.teamB, document.getElementById('team-b')!);
        this.ui.clearLog();
        this.ui.addLogEntry('点击"开始战斗"按钮开始游戏', 'turn');
    }

    private startBattle(): void {
        this.ui.setStartButton(false);
        this.ui.setRestartButton(false);
        this.ui.clearLog();

        this.teamA.forEach(c => c.reset());
        this.teamB.forEach(c => c.reset());

        this.battleSystem = new BattleSystem(this.teamA, this.teamB);
        
        this.battleSystem.addEventListener((event) => {
            this.ui.handleBattleEvent(event);
        });

        this.battleSystem.start();
    }

    private restartGame(): void {
        if (this.battleSystem) {
            this.battleSystem.stop();
            this.battleSystem = null;
        }

        this.ui.clearCharacters();
        this.initializeCharacters();
        this.renderInitial();
        this.ui.setStartButton(true);
        this.ui.setRestartButton(false);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Game();
});
