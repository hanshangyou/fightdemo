export class WeaponCard {
    constructor(weapon, options = {}) {
        this.weapon = weapon;
        this.selectable = options.selectable || false;
        this.selected = options.selected || false;
        this.onSelect = options.onSelect || null;
        this.size = options.size || 'normal';
        
        this.element = null;
        this.create();
    }

    create() {
        this.element = document.createElement('div');
        this.updateClasses();
        
        this.renderContent();
        
        if (this.selectable && this.onSelect) {
            this.element.addEventListener('click', () => this.onSelect(this.weapon));
        }
    }

    updateClasses() {
        const classes = ['camp-weapon-card'];
        
        if (this.selectable) {
            classes.push('selectable');
        }
        
        if (this.selected) {
            classes.push('selected');
        }
        
        if (this.weapon.rarity) {
            classes.push(`rarity-${this.weapon.rarity.toLowerCase()}`);
        }
        
        this.element.className = classes.join(' ');
    }

    renderContent() {
        this.element.innerHTML = '';
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'camp-weapon-card-icon';
        iconDiv.textContent = this.weapon.icon || '🗡️';
        this.element.appendChild(iconDiv);
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'camp-weapon-card-name';
        nameDiv.textContent = this.weapon.name;
        this.element.appendChild(nameDiv);
        
        const metaDiv = document.createElement('div');
        metaDiv.className = 'camp-weapon-card-meta';
        
        if (this.weapon.damageMin !== undefined && this.weapon.damageMax !== undefined) {
            const damageSpan = document.createElement('span');
            damageSpan.textContent = `伤害: ${this.weapon.damageMin}-${this.weapon.damageMax}`;
            metaDiv.appendChild(damageSpan);
        }
        
        if (this.weapon.rarity) {
            const raritySpan = document.createElement('span');
            raritySpan.textContent = this.weapon.rarity;
            metaDiv.appendChild(raritySpan);
        }
        
        this.element.appendChild(metaDiv);
    }

    update(weapon) {
        this.weapon = weapon;
        this.updateClasses();
        this.renderContent();
    }

    setSelected(selected) {
        this.selected = selected;
        this.updateClasses();
    }

    destroy() {
        if (this.selectable && this.onSelect) {
            this.element.removeEventListener('click', () => this.onSelect(this.weapon));
        }
        this.element.remove();
    }

    render(container) {
        container.appendChild(this.element);
    }
}