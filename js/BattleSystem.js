export class BattleSystem {
    teamA = [];
    teamB = [];
    turnCount = 0;
    isRunning = false;
    listeners = [];
    actionThreshold = 100;
    damageStats = new Map();

    constructor(teamA, teamB) {
        this.teamA = [...teamA];
        this.teamB = [...teamB];
        this.damageStats = new Map();
        
        this.teamA.forEach(c => this.damageStats.set(c.id, { 
            character: c, 
            totalDamage: 0, 
            attacks: 0,
            kills: 0 
        }));
    }

    addEventListener(listener) {
        this.listeners.push(listener);
    }

    removeEventListener(listener) {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    emit(event) {
        for (const listener of this.listeners) {
            listener(event);
        }
    }

    getAllAliveCharacters() {
        return [...this.teamA, ...this.teamB].filter(c => c.isAlive);
    }

    getAliveTeamMembers(team) {
        const teamMembers = team === 'A' ? this.teamA : this.teamB;
        return teamMembers.filter(c => c.isAlive);
    }

    getOpponents(character) {
        return this.getAliveTeamMembers(character.team === 'A' ? 'B' : 'A');
    }

    selectTarget(attacker) {
        const opponents = this.getOpponents(attacker);
        if (opponents.length === 0) return null;
        
        const lowestHp = opponents.reduce((min, c) => c.hp < min.hp ? c : min, opponents[0]);
        return lowestHp;
    }

    fillActionGauges() {
        const aliveCharacters = this.getAllAliveCharacters();
        for (const character of aliveCharacters) {
            character.fillActionGauge();
        }
    }

    getNextActor() {
        const aliveCharacters = this.getAllAliveCharacters();
        const readyCharacters = aliveCharacters
            .filter(c => c.canAct(this.actionThreshold))
            .sort((a, b) => b.actionGauge - a.actionGauge);
        
        return readyCharacters.length > 0 ? readyCharacters[0] : null;
    }

    executeAttack(attacker, defender) {
        const baseDamage = attacker.attack;
        const actualDamage = defender.takeDamage(baseDamage);
        
        if (attacker.team === 'A') {
            const stats = this.damageStats.get(attacker.id);
            if (stats) {
                stats.totalDamage += actualDamage;
                stats.attacks++;
                if (!defender.isAlive) {
                    stats.kills++;
                }
            }
        }
        
        return actualDamage;
    }

    checkVictory() {
        const teamAAlive = this.teamA.some(c => c.isAlive);
        const teamBAlive = this.teamB.some(c => c.isAlive);

        if (!teamAAlive) return 'B';
        if (!teamBAlive) return 'A';
        return null;
    }

    getDamageStats() {
        const result = [];
        this.teamA.forEach(c => {
            const stats = this.damageStats.get(c.id);
            if (stats) {
                result.push({
                    character: c,
                    totalDamage: stats.totalDamage,
                    attacks: stats.attacks,
                    kills: stats.kills
                });
            }
        });
        return result;
    }

    getTotalDamage() {
        let total = 0;
        this.damageStats.forEach(stats => {
            total += stats.totalDamage;
        });
        return total;
    }

    async start() {
        this.isRunning = true;
        this.turnCount = 0;
        this.damageStats.clear();
        this.teamA.forEach(c => this.damageStats.set(c.id, { 
            character: c, 
            totalDamage: 0, 
            attacks: 0,
            kills: 0 
        }));

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

    stop() {
        this.isRunning = false;
    }

    reset() {
        this.isRunning = false;
        this.turnCount = 0;
        this.damageStats.clear();
        [...this.teamA, ...this.teamB].forEach(c => c.reset());
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getTeamA() {
        return this.teamA;
    }

    getTeamB() {
        return this.teamB;
    }

    getTurnCount() {
        return this.turnCount;
    }
}
