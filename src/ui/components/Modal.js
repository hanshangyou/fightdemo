export class Modal {
    constructor(options = {}) {
        this.title = options.title || '';
        this.content = options.content || null;
        this.onClose = options.onClose || null;
        this.showCloseButton = options.showCloseButton !== false;
        this.closeOnBackdrop = options.closeOnBackdrop !== false;
        this.classes = options.classes || [];
        
        this.element = null;
        this.backdrop = null;
        this.create();
    }

    create() {
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'editor-modal';
        
        this.element = document.createElement('div');
        this.element.className = this.getContentClasses();
        
        if (this.title || this.showCloseButton) {
            const header = document.createElement('div');
            header.className = 'modal-header';
            
            if (this.title) {
                const titleH4 = document.createElement('h4');
                titleH4.textContent = this.title;
                header.appendChild(titleH4);
            }
            
            if (this.showCloseButton) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'btn-close-modal';
                closeBtn.innerHTML = '&times;';
                closeBtn.addEventListener('click', () => this.close());
                header.appendChild(closeBtn);
            }
            
            this.element.appendChild(header);
        }
        
        const body = document.createElement('div');
        body.className = 'modal-body';
        
        if (this.content) {
            if (typeof this.content === 'string') {
                body.innerHTML = this.content;
            } else if (this.content instanceof HTMLElement) {
                body.appendChild(this.content);
            }
        }
        
        this.element.appendChild(body);
        
        this.backdrop.appendChild(this.element);
        
        if (this.closeOnBackdrop) {
            this.backdrop.addEventListener('click', (e) => {
                if (e.target === this.backdrop) {
                    this.close();
                }
            });
        }
    }

    getContentClasses() {
        const classes = ['modal-content'];
        if (this.classes.length > 0) {
            classes.push(...this.classes);
        }
        return classes.join(' ');
    }

    setContent(content) {
        const body = this.element.querySelector('.modal-body');
        if (body) {
            if (typeof content === 'string') {
                body.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                body.innerHTML = '';
                body.appendChild(content);
            }
        }
        this.content = content;
    }

    setTitle(title) {
        const header = this.element.querySelector('.modal-header h4');
        if (header) {
            header.textContent = title;
        }
        this.title = title;
    }

    open() {
        document.body.appendChild(this.backdrop);
    }

    close() {
        if (this.onClose) {
            this.onClose();
        }
        this.backdrop.remove();
    }

    destroy() {
        this.close();
    }
}
