export interface CharacterStats {
    maxHp: number;
    hp: number;
    attack: number;
    defense: number;
    speed: number;
}

export interface CharacterConfig {
    id: string;
    background: string;
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
    team: 'A' | 'B';
}

export class Character {
    readonly id: string;
    readonly background: string;
    readonly team: 'A' | 'B';
    private _maxHp: number;
    private _hp: number;
    private _attack: number;
    private _defense: number;
    private _speed: number;
    private _actionGauge: number = 0;

    constructor(config: CharacterConfig) {
        this.id = config.id;
        this.background = config.background;
        this.team = config.team;
        this._maxHp = config.maxHp;
        this._hp = config.maxHp;
        this._attack = config.attack;
        this._defense = config.defense;
        this._speed = config.speed;
    }

    get maxHp(): number {
        return this._maxHp;
    }

    get hp(): number {
        return this._hp;
    }

    get attack(): number {
        return this._attack;
    }

    get defense(): number {
        return this._defense;
    }

    get speed(): number {
        return this._speed;
    }

    get actionGauge(): number {
        return this._actionGauge;
    }

    get isAlive(): boolean {
        return this._hp > 0;
    }

    get hpPercentage(): number {
        return (this._hp / this._maxHp) * 100;
    }

    takeDamage(damage: number): number {
        const actualDamage = Math.max(1, damage - this._defense);
        this._hp = Math.max(0, this._hp - actualDamage);
        return actualDamage;
    }

    heal(amount: number): number {
        const oldHp = this._hp;
        this._hp = Math.min(this._maxHp, this._hp + amount);
        return this._hp - oldHp;
    }

    fillActionGauge(): void {
        this._actionGauge += this._speed;
    }

    resetActionGauge(): void {
        this._actionGauge = 0;
    }

    canAct(threshold: number = 100): boolean {
        return this._actionGauge >= threshold;
    }

    getStats(): CharacterStats {
        return {
            maxHp: this._maxHp,
            hp: this._hp,
            attack: this._attack,
            defense: this._defense,
            speed: this._speed
        };
    }

    reset(): void {
        this._hp = this._maxHp;
        this._actionGauge = 0;
    }
}
