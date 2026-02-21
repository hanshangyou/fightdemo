export class CharacterCard {
    constructor(character, options = {}) {
        this.character = character;
        this.selectable = options.selectable || false;
        this.selected = options.selected || false;
        this.onSelect = options.onSelect || null;
        this.showWeapon = options.showWeapon || false;
        this.showStats = options.showStats !== false;
        this.size = options.size || 'normal';
        
        this.element = null;
        this.create();
    }

    create() {
        this.element = document.createElement('div');
        this.updateClasses();
        
        this.renderContent();
        
        if (this.selectable && this.onSelect) {
            this.element.addEventListener('click', () => this.onSelect(this.character));
        }
    }

    updateClasses() {
        const classes = ['character-card'];
        
        if (this.selectable) {
            classes.push('selectable');
        }
        
        if (this.selected) {
            classes.push('selected');
        }
        
        if (this.character.isDead) {
            classes.push('dead');
        }
        
        if (this.character.rarity) {
            classes.push(`rarity-${this.character.rarity.toLowerCase()}`);
        }
        
        this.element.className = classes.join(' ');
    }

    renderContent() {
        this.element.innerHTML = '';
        
        if (this.character.rarity) {
            const rarityDiv = document.createElement('div');
            rarityDiv.className = 'character-rarity';
            rarityDiv.textContent = this.getRarityLabel();
            this.element.appendChild(rarityDiv);
        }
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'character-icon';
        iconDiv.textContent = this.character.icon || '👤';
        this.element.appendChild(iconDiv);
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'character-name';
        nameDiv.textContent = this.character.name || this.character.background || 'Unknown';
        this.element.appendChild(nameDiv);
        
        if (this.showStats) {
            const statsDiv = document.createElement('div');
            statsDiv.className = 'character-stats';
            
            if (this.character.hp !== undefined) {
                const hpSpan = document.createElement('span');
                hpSpan.textContent = `❤️ ${this.character.hp}/${this.character.maxHp || this.character.hp}`;
                statsDiv.appendChild(hpSpan);
            }
            
            if (this.character.atk !== undefined) {
                const atkSpan = document.createElement('span');
                atkSpan.textContent = `⚔️ ${this.character.atk}`;
                statsDiv.appendChild(atkSpan);
            }
            
            if (this.character.def !== undefined) {
                const defSpan = document.createElement('span');
                defSpan.textContent = `🛡️ ${this.character.def}`;
                statsDiv.appendChild(defSpan);
            }
            
            if (this.character.spd !== undefined) {
                const spdSpan = document.createElement('span');
                spdSpan.textContent = `💨 ${this.character.spd}`;
                statsDiv.appendChild(spdSpan);
            }
            
            this.element.appendChild(statsDiv);
        }
        
        if (this.showWeapon && this.character.equippedWeapon) {
            const weaponDiv = document.createElement('div');
            weaponDiv.className = 'character-weapon-info';
            
            const weaponLine = document.createElement('div');
            weaponLine.className = 'weapon-line';
            
            const weaponName = document.createElement('span');
            weaponName.className = 'weapon-name';
            weaponName.textContent = this.character.equippedWeapon.name;
            weaponLine.appendChild(weaponName);
            
            if (this.character.equippedWeapon.damage) {
                const weaponDmg = document.createElement('span');
                weaponDmg.className = 'weapon-dmg';
                weaponDmg.textContent = `${this.character.equippedWeapon.damage.min}-${this.character.equippedWeapon.damage.max}`;
                weaponLine.appendChild(weaponDmg);
            }
            
            weaponDiv.appendChild(weaponLine);
            this.element.appendChild(weaponDiv);
        }
    }

    getRarityLabel() {
        const rarityLabels = {
            'COMMON': '普通',
            'RARE': '稀有',
            'EPIC': '史诗',
            'LEGENDARY': '传说',
            'ENEMY': '敌人'
        };
        return rarityLabels[this.character.rarity] || '';
    }

    update(character) {
        this.character = character;
        this.updateClasses();
        this.renderContent();
    }

    setSelected(selected) {
        this.selected = selected;
        this.updateClasses();
    }

    destroy() {
        if (this.selectable && this.onSelect) {
            this.element.removeEventListener('click', () => this.onSelect(this.character));
        }
        this.element.remove();
    }

    render(container) {
        container.appendChild(this.element);
    }
}
