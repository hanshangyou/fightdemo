import { RARITY } from '../systems/GachaSystem.js';
import { WEAPON_TYPES, getWeaponPool, saveWeaponPool, resetWeaponPool } from '../systems/WeaponSystem.js';

export class WeaponEditor {
    container = null;
    pool = [];
    editingId = null;
    onSaveCallback = null;
    onCloseCallback = null;

    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.pool = getWeaponPool();
        this.editingId = null;
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="editor-header">
                <h3>武器池管理</h3>
                <div class="editor-actions">
                    <button class="btn btn-success" id="btn-add-weapon">➕ 添加武器</button>
                    <button class="btn btn-warning" id="btn-reset-weapon-pool">🔄 重置默认</button>
                    <button class="btn btn-secondary" id="btn-close-weapon-editor">返回</button>
                </div>
            </div>
            <div class="pool-stats">
                <span>总计: ${this.pool.length} 把</span>
                <span style="color:#95a5a6">普通: ${this.pool.filter(w => w.rarity === 'COMMON').length}</span>
                <span style="color:#3498db">稀有: ${this.pool.filter(w => w.rarity === 'RARE').length}</span>
                <span style="color:#9b59b6">史诗: ${this.pool.filter(w => w.rarity === 'EPIC').length}</span>
                <span style="color:#f39c12">传说: ${this.pool.filter(w => w.rarity === 'LEGENDARY').length}</span>
                <span style="color:#e74c3c">敌对: ${this.pool.filter(w => w.rarity === 'ENEMY').length}</span>
            </div>
            <div class="pool-list" id="weapon-pool-list"></div>
            <div class="editor-modal" id="weapon-editor-modal" style="display:none;">
                <div class="modal-content">
                    <h4 id="weapon-modal-title">编辑武器</h4>
                    <div class="form-group">
                        <label>武器名称</label>
                        <input type="text" id="edit-weapon-name" placeholder="显示名称">
                    </div>
                    <div class="form-group">
                        <label>图标</label>
                        <input type="text" id="edit-weapon-icon" placeholder="emoji图标">
                    </div>
                    <div class="form-group">
                        <label>武器类型</label>
                        <select id="edit-weapon-type">
                            <option value="SWORD">剑</option>
                            <option value="SPEAR">枪</option>
                            <option value="BOW">弓</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>稀有度</label>
                        <select id="edit-weapon-rarity">
                            <option value="COMMON">普通</option>
                            <option value="RARE">稀有</option>
                            <option value="EPIC">史诗</option>
                            <option value="LEGENDARY">传说</option>
                            <option value="ENEMY">敌对</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>射程</label>
                            <input type="number" id="edit-weapon-range" min="1" max="3">
                        </div>
                        <div class="form-group">
                            <label>AP消耗</label>
                            <input type="number" id="edit-weapon-ap" min="1" max="9">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>伤害下限</label>
                            <input type="number" id="edit-weapon-dmg-min" min="1" max="99">
                        </div>
                        <div class="form-group">
                            <label>伤害上限</label>
                            <input type="number" id="edit-weapon-dmg-max" min="1" max="99">
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-success" id="btn-save-weapon">保存</button>
                        <button class="btn btn-secondary" id="btn-cancel-weapon-edit">取消</button>
                    </div>
                </div>
            </div>
        `;

        this.renderPoolList();
        this.bindEvents();
    }

    renderPoolList() {
        const listContainer = document.getElementById('weapon-pool-list');
        if (!listContainer) return;

        if (this.pool.length === 0) {
            listContainer.innerHTML = '<div class="empty-hint">武器池为空，请添加武器</div>';
            return;
        }

        listContainer.innerHTML = this.pool.map(weapon => {
            const rarity = RARITY[weapon.rarity] || RARITY.COMMON;
            const type = WEAPON_TYPES[weapon.type] || WEAPON_TYPES.SWORD;
            return `
                <div class="pool-item" data-id="${weapon.id}" style="border-color: ${rarity.color}">
                    <div class="pool-item-icon">${weapon.icon || type.icon}</div>
                    <div class="pool-item-info">
                        <div class="pool-item-name">${weapon.name}</div>
                        <div class="pool-item-rarity" style="color:${rarity.color}">${rarity.name}</div>
                    </div>
                    <div class="pool-item-stats">
                        <span>📏${weapon.range}</span>
                        <span>✨${weapon.apCost}</span>
                        <span>💥${weapon.damageMin}-${weapon.damageMax}</span>
                    </div>
                    <div class="pool-item-actions">
                        <button class="btn-small btn-weapon-edit" data-id="${weapon.id}">✏️</button>
                        <button class="btn-small btn-weapon-delete" data-id="${weapon.id}">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    bindEvents() {
        document.getElementById('btn-add-weapon')?.addEventListener('click', () => this.showAddModal());
        document.getElementById('btn-reset-weapon-pool')?.addEventListener('click', () => this.resetPool());
        document.getElementById('btn-close-weapon-editor')?.addEventListener('click', () => this.close());
        document.getElementById('btn-save-weapon')?.addEventListener('click', () => this.saveWeapon());
        document.getElementById('btn-cancel-weapon-edit')?.addEventListener('click', () => this.hideModal());

        document.querySelectorAll('.btn-weapon-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.showEditModal(e.target.dataset.id);
            });
        });

        document.querySelectorAll('.btn-weapon-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.deleteWeapon(e.target.dataset.id);
            });
        });
    }

    generateId() {
        return `weapon_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    showAddModal() {
        this.editingId = null;
        const type = WEAPON_TYPES.SWORD;
        document.getElementById('weapon-modal-title').textContent = '添加武器';
        document.getElementById('edit-weapon-name').value = '';
        document.getElementById('edit-weapon-icon').value = type.icon;
        document.getElementById('edit-weapon-type').value = 'SWORD';
        document.getElementById('edit-weapon-rarity').value = 'COMMON';
        document.getElementById('edit-weapon-range').value = type.range;
        document.getElementById('edit-weapon-ap').value = type.apCost;
        document.getElementById('edit-weapon-dmg-min').value = type.damageMin;
        document.getElementById('edit-weapon-dmg-max').value = type.damageMax;
        document.getElementById('weapon-editor-modal').style.display = 'flex';
    }

    showEditModal(id) {
        const weapon = this.pool.find(w => w.id === id);
        if (!weapon) return;

        this.editingId = id;
        document.getElementById('weapon-modal-title').textContent = '编辑武器';
        document.getElementById('edit-weapon-name').value = weapon.name;
        document.getElementById('edit-weapon-icon').value = weapon.icon || '';
        document.getElementById('edit-weapon-type').value = weapon.type;
        document.getElementById('edit-weapon-rarity').value = weapon.rarity;
        document.getElementById('edit-weapon-range').value = weapon.range;
        document.getElementById('edit-weapon-ap').value = weapon.apCost;
        document.getElementById('edit-weapon-dmg-min').value = weapon.damageMin;
        document.getElementById('edit-weapon-dmg-max').value = weapon.damageMax;
        document.getElementById('weapon-editor-modal').style.display = 'flex';
    }

    hideModal() {
        document.getElementById('weapon-editor-modal').style.display = 'none';
        this.editingId = null;
    }

    saveWeapon() {
        const name = document.getElementById('edit-weapon-name').value.trim();
        const icon = document.getElementById('edit-weapon-icon').value.trim();
        const type = document.getElementById('edit-weapon-type').value;
        const rarity = document.getElementById('edit-weapon-rarity').value;
        const range = parseInt(document.getElementById('edit-weapon-range').value) || 1;
        const apCost = parseInt(document.getElementById('edit-weapon-ap').value) || 1;
        const damageMin = parseInt(document.getElementById('edit-weapon-dmg-min').value) || 1;
        const damageMax = parseInt(document.getElementById('edit-weapon-dmg-max').value) || 1;

        if (!name) {
            alert('请填写武器名称！');
            return;
        }
        if (damageMin > damageMax) {
            alert('伤害下限不能高于上限！');
            return;
        }

        const weaponData = {
            id: this.editingId || this.generateId(),
            name,
            icon,
            type,
            rarity,
            range: Math.max(1, Math.min(3, range)),
            apCost: Math.max(1, Math.min(9, apCost)),
            damageMin: Math.max(1, Math.min(99, damageMin)),
            damageMax: Math.max(1, Math.min(99, damageMax))
        };

        if (this.editingId) {
            const index = this.pool.findIndex(w => w.id === this.editingId);
            if (index > -1) {
                this.pool[index] = weaponData;
            }
        } else {
            this.pool.push(weaponData);
        }

        saveWeaponPool(this.pool);
        this.hideModal();
        this.render();

        if (this.onSaveCallback) {
            this.onSaveCallback();
        }
    }

    deleteWeapon(id) {
        if (this.pool.length <= 1) {
            alert('至少保留一把武器！');
            return;
        }

        if (confirm('确定要删除这把武器吗？')) {
            this.pool = this.pool.filter(w => w.id !== id);
            saveWeaponPool(this.pool);
            this.render();

            if (this.onSaveCallback) {
                this.onSaveCallback();
            }
        }
    }

    resetPool() {
        if (confirm('确定要重置为默认武器池吗？所有自定义修改将丢失！')) {
            this.pool = resetWeaponPool();
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
        this.pool = getWeaponPool();
        this.render();
    }

    onSave(callback) {
        this.onSaveCallback = callback;
    }

    onClose(callback) {
        this.onCloseCallback = callback;
    }
}
