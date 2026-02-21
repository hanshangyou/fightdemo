export class Button {
    constructor(options = {}) {
        this.text = options.text || '';
        this.type = options.type || 'primary';
        this.disabled = options.disabled || false;
        this.onClick = options.onClick || null;
        this.icon = options.icon || null;
        this.size = options.size || 'normal';
        this.classes = options.classes || [];
        
        this.element = null;
        this.create();
    }

    create() {
        this.element = document.createElement('button');
        this.element.className = this.getClasses();
        
        if (this.icon) {
            const iconSpan = document.createElement('span');
            iconSpan.textContent = this.icon;
            this.element.appendChild(iconSpan);
        }
        
        const textSpan = document.createElement('span');
        textSpan.textContent = this.text;
        this.element.appendChild(textSpan);
        
        this.element.disabled = this.disabled;
        
        if (this.onClick) {
            this.element.addEventListener('click', this.onClick);
        }
    }

    getClasses() {
        const classes = ['btn', `btn-${this.type}`];
        
        if (this.size === 'small') {
            classes.push('btn-small');
        }
        
        if (this.classes.length > 0) {
            classes.push(...this.classes);
        }
        
        return classes.join(' ');
    }

    setText(text) {
        const textSpan = this.element.querySelector('span:last-child');
        if (textSpan) {
            textSpan.textContent = text;
        }
        this.text = text;
    }

    setDisabled(disabled) {
        this.element.disabled = disabled;
        this.disabled = disabled;
    }

    setType(type) {
        this.element.className = this.element.className.replace(`btn-${this.type}`, `btn-${type}`);
        this.type = type;
    }

    destroy() {
        if (this.onClick) {
            this.element.removeEventListener('click', this.onClick);
        }
        this.element.remove();
    }

    render(container) {
        container.appendChild(this.element);
    }
}
