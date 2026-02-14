import { RARITY, getCharacterPool, saveCharacterPool, resetCharacterPool, DEFAULT_CHARACTER_POOL } from './GachaSystem.js';

export class PoolEditor {
    container = null;
    pool = [];
    editingId = null;
    onSaveCallback = null;
    onCloseCallback = null;

    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.pool = getCharacterPool();
        this.editingId = null;
    }

    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="editor-header">
                <h3>卡池角色管理</h3>
                <div class="editor-actions">
                    <button class="btn btn-success" id="btn-add-character">➕ 添加角色</button>
                    <button class="btn btn-warning" id="btn-reset-pool">🔄 重置默认</button>
                    <button class="btn btn-secondary" id="btn-close-editor">返回</button>
                </div>
            </div>
            <div class="pool-stats">
                <span>总计: ${this.pool.length} 个</span>
                <span style="color:#95a5a6">普通: ${this.pool.filter(c => c.rarity === 'COMMON').length}</span>
                <span style="color:#3498db">稀有: ${this.pool.filter(c => c.rarity === 'RARE').length}</span>
                <span style="color:#9b59b6">史诗: ${this.pool.filter(c => c.rarity === 'EPIC').length}</span>
                <span style="color:#f39c12">传说: ${this.pool.filter(c => c.rarity === 'LEGENDARY').length}</span>
                <span style="color:#e74c3c">敌对: ${this.pool.filter(c => c.rarity === 'ENEMY').length}</span>
            </div>
            <div class="pool-list" id="pool-list"></div>
            <div class="editor-modal" id="editor-modal" style="display:none;">
                <div class="modal-content">
                    <h4 id="modal-title">编辑角色</h4>
                    <div class="form-group">
                        <label>角色名称</label>
                        <input type="text" id="edit-name" placeholder="显示名称">
                    </div>
                    <div class="form-group">
                        <label>图标</label>
                        <input type="text" id="edit-icon" placeholder="emoji图标">
                    </div>
                    <div class="form-group">
                        <label>稀有度</label>
                        <select id="edit-rarity">
                            <option value="COMMON">普通</option>
                            <option value="RARE">稀有</option>
                            <option value="EPIC">史诗</option>
                            <option value="LEGENDARY">传说</option>
                            <option value="ENEMY">敌对（不可抽取）</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>生命值</label>
                            <input type="number" id="edit-hp" min="1" max="999">
                        </div>
                        <div class="form-group">
                            <label>攻击力</label>
                            <input type="number" id="edit-attack" min="1" max="999">
                        </div>
                        <div class="form-group">
                            <label>防御力</label>
                            <input type="number" id="edit-defense" min="0" max="999">
                        </div>
                        <div class="form-group">
                            <label>速度</label>
                            <input type="number" id="edit-speed" min="1" max="99">
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-success" id="btn-save-character">保存</button>
                        <button class="btn btn-secondary" id="btn-cancel-edit">取消</button>
                    </div>
                </div>
            </div>
        `;
        
        this.renderPoolList();
        this.bindEvents();
    }

    renderPoolList() {
        const listContainer = document.getElementById('pool-list');
        if (!listContainer) return;
        
        if (this.pool.length === 0) {
            listContainer.innerHTML = '<div class="empty-hint">卡池为空，请添加角色</div>';
            return;
        }
        
        listContainer.innerHTML = this.pool.map(char => {
            const rarity = RARITY[char.rarity] || RARITY.COMMON;
            return `
                <div class="pool-item" data-id="${char.id}" style="border-color: ${rarity.color}">
                    <div class="pool-item-icon">${char.icon || '👤'}</div>
                    <div class="pool-item-info">
                        <div class="pool-item-name">${char.name}</div>
                        <div class="pool-item-rarity" style="color:${rarity.color}">${rarity.name}</div>
                    </div>
                    <div class="pool-item-stats">
                        <span>❤️${char.baseStats.maxHp}</span>
                        <span>⚔️${char.baseStats.attack}</span>
                        <span>🛡️${char.baseStats.defense}</span>
                        <span>💨${char.baseStats.speed}</span>
                    </div>
                    <div class="pool-item-actions">
                        <button class="btn-small btn-edit" data-id="${char.id}">✏️</button>
                        <button class="btn-small btn-delete" data-id="${char.id}">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    bindEvents() {
        document.getElementById('btn-add-character')?.addEventListener('click', () => this.showAddModal());
        document.getElementById('btn-reset-pool')?.addEventListener('click', () => this.resetPool());
        document.getElementById('btn-close-editor')?.addEventListener('click', () => this.close());
        document.getElementById('btn-save-character')?.addEventListener('click', () => this.saveCharacter());
        document.getElementById('btn-cancel-edit')?.addEventListener('click', () => this.hideModal());
        
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.showEditModal(e.target.dataset.id);
            });
        });
        
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.deleteCharacter(e.target.dataset.id);
            });
        });
    }

    generateId() {
        return `char_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    showAddModal() {
        this.editingId = null;
        document.getElementById('modal-title').textContent = '添加角色';
        document.getElementById('edit-name').value = '';
        document.getElementById('edit-icon').value = '👤';
        document.getElementById('edit-rarity').value = 'COMMON';
        document.getElementById('edit-hp').value = 100;
        document.getElementById('edit-attack').value = 20;
        document.getElementById('edit-defense').value = 5;
        document.getElementById('edit-speed').value = 15;
        document.getElementById('editor-modal').style.display = 'flex';
    }

    showEditModal(id) {
        const char = this.pool.find(c => c.id === id);
        if (!char) return;
        
        this.editingId = id;
        document.getElementById('modal-title').textContent = '编辑角色';
        document.getElementById('edit-name').value = char.name;
        document.getElementById('edit-icon').value = char.icon || '👤';
        document.getElementById('edit-rarity').value = char.rarity;
        document.getElementById('edit-hp').value = char.baseStats.maxHp;
        document.getElementById('edit-attack').value = char.baseStats.attack;
        document.getElementById('edit-defense').value = char.baseStats.defense;
        document.getElementById('edit-speed').value = char.baseStats.speed;
        document.getElementById('editor-modal').style.display = 'flex';
    }

    hideModal() {
        document.getElementById('editor-modal').style.display = 'none';
        this.editingId = null;
    }

    saveCharacter() {
        const name = document.getElementById('edit-name').value.trim();
        const icon = document.getElementById('edit-icon').value.trim() || '👤';
        const rarity = document.getElementById('edit-rarity').value;
        const hp = parseInt(document.getElementById('edit-hp').value) || 100;
        const attack = parseInt(document.getElementById('edit-attack').value) || 20;
        const defense = parseInt(document.getElementById('edit-defense').value) || 5;
        const speed = parseInt(document.getElementById('edit-speed').value) || 15;
        
        if (!name) {
            alert('请填写角色名称！');
            return;
        }
        
        const charData = {
            id: this.editingId || this.generateId(),
            name,
            icon,
            rarity,
            baseStats: {
                maxHp: Math.max(1, Math.min(999, hp)),
                attack: Math.max(1, Math.min(999, attack)),
                defense: Math.max(0, Math.min(999, defense)),
                speed: Math.max(1, Math.min(99, speed))
            }
        };
        
        if (this.editingId) {
            const index = this.pool.findIndex(c => c.id === this.editingId);
            if (index > -1) {
                this.pool[index] = charData;
            }
        } else {
            this.pool.push(charData);
        }
        
        saveCharacterPool(this.pool);
        this.hideModal();
        this.render();
        
        if (this.onSaveCallback) {
            this.onSaveCallback();
        }
    }

    deleteCharacter(id) {
        if (this.pool.length <= 1) {
            alert('至少保留一个角色！');
            return;
        }
        
        if (confirm('确定要删除这个角色吗？')) {
            this.pool = this.pool.filter(c => c.id !== id);
            saveCharacterPool(this.pool);
            this.render();
            
            if (this.onSaveCallback) {
                this.onSaveCallback();
            }
        }
    }

    resetPool() {
        if (confirm('确定要重置为默认卡池吗？所有自定义修改将丢失！')) {
            this.pool = resetCharacterPool();
            this.render();
            
            if (this.onSaveCallback) {
                this.onSaveCallback();
            }
        }
    }

    close() {
        if (this.container) {
            this.container.style.display = 'none';
        }
        if (this.onCloseCallback) {
            this.onCloseCallback();
        }
    }

    show() {
        if (this.container) {
            this.container.style.display = 'flex';
        }
        this.pool = getCharacterPool();
        this.render();
    }

    onSave(callback) {
        this.onSaveCallback = callback;
    }

    onClose(callback) {
        this.onCloseCallback = callback;
    }
}
