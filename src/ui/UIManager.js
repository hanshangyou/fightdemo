import { Button } from './components/Button.js';
import { CharacterCard } from './components/CharacterCard.js';
import { WeaponCard } from './components/WeaponCard.js';
import { Modal } from './components/Modal.js';

export class UIManager {
    constructor() {
        this.screens = {};
        this.activeScreen = null;
        this.elements = {};
        this.init();
    }

    init() {
        this.cacheElements();
    }

    cacheElements() {
        this.elements = {
            gameContainer: document.getElementById('game-container'),
            main: document.getElementById('screen-main'),
            gacha: document.getElementById('screen-gacha'),
            battle: document.getElementById('screen-battle'),
            camp: document.getElementById('screen-camp'),
            result: document.getElementById('screen-result'),
            editor: document.getElementById('screen-editor'),
            stageEditor: document.getElementById('screen-stage-editor'),
            mapEditor: document.getElementById('screen-map-editor')
        };

        this.screens = {
            main: this.elements.main,
            gacha: this.elements.gacha,
            battle: this.elements.battle,
            camp: this.elements.camp,
            result: this.elements.result,
            editor: this.elements.editor,
            stageEditor: this.elements.stageEditor,
            mapEditor: this.elements.mapEditor
        };
    }

    showScreen(screenName) {
        Object.keys(this.screens).forEach(key => {
            this.screens[key].classList.remove('active');
        });

        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
            this.activeScreen = screenName;
        }
    }

    getElement(id) {
        return document.getElementById(id);
    }

    createButton(options) {
        return new Button(options);
    }

    createCharacterCard(character, options) {
        return new CharacterCard(character, options);
    }

    createWeaponCard(weapon, options) {
        return new WeaponCard(weapon, options);
    }

    createModal(options) {
        return new Modal(options);
    }

    showDamagePopup(target, damage) {
        const popup = document.createElement('div');
        popup.className = 'damage-popup';
        popup.textContent = `-${damage}`;
        
        const rect = (typeof target === 'object' && target.getBoundingClientRect) 
            ? target.getBoundingClientRect() 
            : { left: window.innerWidth / 2, top: window.innerHeight / 2 };
        
        popup.style.left = `${rect.left + rect.width / 2}px`;
        popup.style.top = `${rect.top}px`;
        
        document.body.appendChild(popup);
        
        setTimeout(() => {
            popup.remove();
        }, 800);
    }

    renderCharacterCards(container, characters, options = {}) {
        container.innerHTML = '';
        
        characters.forEach(char => {
            const card = this.createCharacterCard(char, {
                selectable: options.selectable,
                selected: options.selectedIds?.includes(char.id),
                onSelect: options.onSelect,
                showWeapon: options.showWeapon,
                showStats: options.showStats
            });
            card.render(container);
        });
    }

    renderWeaponCards(container, weapons, options = {}) {
        container.innerHTML = '';
        
        weapons.forEach(weapon => {
            const card = this.createWeaponCard(weapon, {
                selectable: options.selectable,
                selected: options.selectedIds?.includes(weapon.id),
                onSelect: options.onSelect
            });
            card.render(container);
        });
    }
}
