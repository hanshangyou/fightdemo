import { Character } from './Character.js';
import { BattleSystem, BattleEvent } from './BattleSystem.js';

export class GameUI {
    private teamAContainer: HTMLElement;
    private teamBContainer: HTMLElement;
    private battleLog: HTMLElement;
    private btnStart: HTMLButtonElement;
    private btnRestart: HTMLButtonElement;
    private characterElements: Map<string, HTMLElement> = new Map();

    constructor() {
        this.teamAContainer = document.getElementById('team-a')!;
        this.teamBContainer = document.getElementById('team-b')!;
        this.battleLog = document.getElementById('battle-log')!;
        this.btnStart = document.getElementById('btn-start') as HTMLButtonElement;
        this.btnRestart = document.getElementById('btn-restart') as HTMLButtonElement;
    }

    renderCharacter(character: Character): HTMLElement {
        const card = document.createElement('div');
        card.className = 'character-card';
        card.id = `character-${character.id}`;
        
        card.innerHTML = `
            <div class="character-name">${character.background}</div>
            <div class="character-stats">
                ATK: ${character.attack} | DEF: ${character.defense} | SPD: ${character.speed}
            </div>
            <div class="hp-bar-container">
                <div class="hp-bar" style="width: ${character.hpPercentage}%"></div>
            </div>
            <div class="hp-text">${character.hp} / ${character.maxHp}</div>
            <div class="action-bar">
                <div class="action-bar-fill" style="width: ${character.actionGauge}%"></div>
            </div>
        `;
        
        this.characterElements.set(character.id, card);
        return card;
    }

    renderTeam(characters: Character[], container: HTMLElement): void {
        characters.forEach(character => {
            const card = this.renderCharacter(character);
            container.appendChild(card);
        });
    }

    updateCharacter(character: Character): void {
        const element = this.characterElements.get(character.id);
        if (!element) return;

        const hpBar = element.querySelector('.hp-bar') as HTMLElement;
        const hpText = element.querySelector('.hp-text') as HTMLElement;
        const actionBar = element.querySelector('.action-bar-fill') as HTMLElement;
        
        hpBar.style.width = `${character.hpPercentage}%`;
        hpText.textContent = `${character.hp} / ${character.maxHp}`;
        actionBar.style.width = `${Math.min(100, character.actionGauge)}%`;
        
        hpBar.classList.remove('low', 'medium');
        if (character.hpPercentage <= 25) {
            hpBar.classList.add('low');
        } else if (character.hpPercentage <= 50) {
            hpBar.classList.add('medium');
        }

        if (!character.isAlive) {
            element.classList.add('dead');
        }
    }

    setActiveCharacter(character: Character | null): void {
        this.characterElements.forEach((element, id) => {
            element.classList.remove('active');
        });
        
        if (character) {
            const element = this.characterElements.get(character.id);
            if (element) {
                element.classList.add('active');
            }
        }
    }

    showDamagePopup(character: Character, damage: number): void {
        const element = this.characterElements.get(character.id);
        if (!element) return;

        const popup = document.createElement('div');
        popup.className = 'damage-popup';
        popup.textContent = `-${damage}`;
        
        const rect = element.getBoundingClientRect();
        popup.style.left = `${rect.left + rect.width / 2}px`;
        popup.style.top = `${rect.top}px`;
        
        document.body.appendChild(popup);
        
        setTimeout(() => {
            popup.remove();
        }, 1000);
    }

    addLogEntry(message: string, type: string = ''): void {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = message;
        
        this.battleLog.insertBefore(entry, this.battleLog.firstChild);
        
        if (this.battleLog.children.length > 50) {
            this.battleLog.removeChild(this.battleLog.lastChild!);
        }
    }

    clearLog(): void {
        this.battleLog.innerHTML = '';
    }

    clearCharacters(): void {
        const teamALabel = this.teamAContainer.querySelector('.team-label');
        const teamBLabel = this.teamBContainer.querySelector('.team-label');
        
        this.teamAContainer.innerHTML = '';
        this.teamBContainer.innerHTML = '';
        
        if (teamALabel) this.teamAContainer.appendChild(teamALabel);
        if (teamBLabel) this.teamBContainer.appendChild(teamBLabel);
        
        this.characterElements.clear();
    }

    setStartButton(enabled: boolean): void {
        this.btnStart.disabled = !enabled;
    }

    setRestartButton(enabled: boolean): void {
        this.btnRestart.disabled = !enabled;
    }

    onStart(callback: () => void): void {
        this.btnStart.addEventListener('click', callback);
    }

    onRestart(callback: () => void): void {
        this.btnRestart.addEventListener('click', callback);
    }

    handleBattleEvent(event: BattleEvent): void {
        switch (event.type) {
            case 'battle_start':
                this.addLogEntry('⚔️ 战斗开始！', 'turn');
                break;
                
            case 'turn_start':
                if (event.data.activeCharacter) {
                    this.setActiveCharacter(event.data.activeCharacter);
                }
                break;
                
            case 'attack':
                if (event.data.attacker && event.data.defender && event.data.damage) {
                    this.updateCharacter(event.data.defender);
                    this.showDamagePopup(event.data.defender, event.data.damage);
                    this.addLogEntry(
                        `${event.data.attacker.background} 攻击 ${event.data.defender.background}，造成 ${event.data.damage} 点伤害！`,
                        'attack'
                    );
                }
                break;
                
            case 'death':
                if (event.data.defender) {
                    this.updateCharacter(event.data.defender);
                    this.addLogEntry(`💀 ${event.data.defender.background} 被击败！`, 'defend');
                }
                break;
                
            case 'victory':
                this.setActiveCharacter(null);
                const winnerText = event.data.winner === 'A' ? '🔵 我方' : '🔴 敌方';
                this.addLogEntry(`🏆 ${winnerText}获胜！`, 'victory');
                this.setStartButton(false);
                this.setRestartButton(true);
                break;
                
            case 'gauge_update':
                if (event.data.characters) {
                    event.data.characters.forEach(c => this.updateCharacter(c));
                }
                break;
        }
    }
}
