import { Character } from './Character.js';

export interface BattleEvent {
    type: 'turn_start' | 'attack' | 'death' | 'victory' | 'battle_start' | 'gauge_update';
    data: BattleEventData;
}

export interface BattleEventData {
    attacker?: Character;
    defender?: Character;
    damage?: number;
    winner?: 'A' | 'B';
    turn?: number;
    characters?: Character[];
    activeCharacter?: Character;
}

export type BattleEventListener = (event: BattleEvent) => void;

export class BattleSystem {
    private teamA: Character[] = [];
    private teamB: Character[] = [];
    private turnCount: number = 0;
    private isRunning: boolean = false;
    private listeners: BattleEventListener[] = [];
    private actionThreshold: number = 100;

    constructor(teamA: Character[], teamB: Character[]) {
        this.teamA = [...teamA];
        this.teamB = [...teamB];
    }

    addEventListener(listener: BattleEventListener): void {
        this.listeners.push(listener);
    }

    removeEventListener(listener: BattleEventListener): void {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    private emit(event: BattleEvent): void {
        for (const listener of this.listeners) {
            listener(event);
        }
    }

    private getAllAliveCharacters(): Character[] {
        return [...this.teamA, ...this.teamB].filter(c => c.isAlive);
    }

    private getAliveTeamMembers(team: 'A' | 'B'): Character[] {
        const teamMembers = team === 'A' ? this.teamA : this.teamB;
        return teamMembers.filter(c => c.isAlive);
    }

    private getOpponents(character: Character): Character[] {
        return this.getAliveTeamMembers(character.team === 'A' ? 'B' : 'A');
    }

    private selectTarget(attacker: Character): Character | null {
        const opponents = this.getOpponents(attacker);
        if (opponents.length === 0) return null;
        
        const lowestHp = opponents.reduce((min, c) => c.hp < min.hp ? c : min, opponents[0]);
        return lowestHp;
    }

    private fillActionGauges(): void {
        const aliveCharacters = this.getAllAliveCharacters();
        for (const character of aliveCharacters) {
            character.fillActionGauge();
        }
    }

    private getNextActor(): Character | null {
        const aliveCharacters = this.getAllAliveCharacters();
        const readyCharacters = aliveCharacters
            .filter(c => c.canAct(this.actionThreshold))
            .sort((a, b) => b.actionGauge - a.actionGauge);
        
        return readyCharacters.length > 0 ? readyCharacters[0] : null;
    }

    private executeAttack(attacker: Character, defender: Character): number {
        const baseDamage = attacker.attack;
        const actualDamage = defender.takeDamage(baseDamage);
        return actualDamage;
    }

    private checkVictory(): 'A' | 'B' | null {
        const teamAAlive = this.teamA.some(c => c.isAlive);
        const teamBAlive = this.teamB.some(c => c.isAlive);

        if (!teamAAlive) return 'B';
        if (!teamBAlive) return 'A';
        return null;
    }

    async start(): Promise<'A' | 'B'> {
        this.isRunning = true;
        this.turnCount = 0;

        this.emit({
            type: 'battle_start',
            data: {
                characters: this.getAllAliveCharacters(),
                turn: 0
            }
        });

        await this.delay(500);

        while (this.isRunning) {
            this.fillActionGauges();
            
            this.emit({
                type: 'gauge_update',
                data: {
                    characters: this.getAllAliveCharacters()
                }
            });

            await this.delay(100);

            let actor = this.getNextActor();
            
            while (actor && this.isRunning) {
                this.turnCount++;
                
                this.emit({
                    type: 'turn_start',
                    data: {
                        turn: this.turnCount,
                        activeCharacter: actor,
                        characters: this.getAllAliveCharacters()
                    }
                });

                const target = this.selectTarget(actor);
                
                if (target) {
                    await this.delay(300);
                    
                    const damage = this.executeAttack(actor, target);
                    
                    this.emit({
                        type: 'attack',
                        data: {
                            attacker: actor,
                            defender: target,
                            damage: damage
                        }
                    });

                    if (!target.isAlive) {
                        await this.delay(200);
                        this.emit({
                            type: 'death',
                            data: {
                                defender: target
                            }
                        });
                    }

                    const winner = this.checkVictory();
                    if (winner) {
                        this.emit({
                            type: 'victory',
                            data: { winner }
                        });
                        this.isRunning = false;
                        return winner;
                    }
                }

                actor.resetActionGauge();
                await this.delay(200);
                
                this.fillActionGauges();
                actor = this.getNextActor();
            }
        }

        return 'A';
    }

    stop(): void {
        this.isRunning = false;
    }

    reset(): void {
        this.isRunning = false;
        this.turnCount = 0;
        [...this.teamA, ...this.teamB].forEach(c => c.reset());
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getTeamA(): Character[] {
        return this.teamA;
    }

    getTeamB(): Character[] {
        return this.teamB;
    }

    getTurnCount(): number {
        return this.turnCount;
    }
}
