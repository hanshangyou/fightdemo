export class Character {
    id;
    name;
    team;
    _maxHp;
    _hp;
    _attack;
    _defense;
    _speed;
    _actionGauge = 0;

    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.team = config.team;
        this._maxHp = config.maxHp;
        this._hp = config.maxHp;
        this._attack = config.attack;
        this._defense = config.defense;
        this._speed = config.speed;
    }

    get maxHp() {
        return this._maxHp;
    }

    get hp() {
        return this._hp;
    }

    get attack() {
        return this._attack;
    }

    get defense() {
        return this._defense;
    }

    get speed() {
        return this._speed;
    }

    get actionGauge() {
        return this._actionGauge;
    }

    get isAlive() {
        return this._hp > 0;
    }

    get hpPercentage() {
        return (this._hp / this._maxHp) * 100;
    }

    takeDamage(damage) {
        const actualDamage = Math.max(1, damage - this._defense);
        this._hp = Math.max(0, this._hp - actualDamage);
        return actualDamage;
    }

    heal(amount) {
        const oldHp = this._hp;
        this._hp = Math.min(this._maxHp, this._hp + amount);
        return this._hp - oldHp;
    }

    fillActionGauge() {
        this._actionGauge += this._speed;
    }

    resetActionGauge() {
        this._actionGauge = 0;
    }

    canAct(threshold = 100) {
        return this._actionGauge >= threshold;
    }

    getStats() {
        return {
            maxHp: this._maxHp,
            hp: this._hp,
            attack: this._attack,
            defense: this._defense,
            speed: this._speed
        };
    }

    reset() {
        this._hp = this._maxHp;
        this._actionGauge = 0;
    }
}
