import { RARITY, getCharacterPool } from '../systems/GachaSystem.js';
import { DEFAULT_STAGES } from '../config/default-stages.js';

const STAGES_STORAGE_KEY = 'fightdemo_stages';

function normalizeStages(stages) {
    return stages.map(stage => ({
        ...stage,
        maxTeamSize: stage.maxTeamSize ?? 3,
        mapId: stage.mapId ?? null,
        enemySpawns: stage.enemySpawns ?? null
    }));
}

export function getStages() {
    const stored = localStorage.getItem(STAGES_STORAGE_KEY);
    if (stored) {
        try {
            return normalizeStages(JSON.parse(stored));
        } catch (e) {
            return normalizeStages([...DEFAULT_STAGES]);
        }
    }
    return normalizeStages([...DEFAULT_STAGES]);
}

export function saveStages(stages) {
    localStorage.setItem(STAGES_STORAGE_KEY, JSON.stringify(stages));
}

export function resetStages() {
    localStorage.removeItem(STAGES_STORAGE_KEY);
    return normalizeStages([...DEFAULT_STAGES]);
}

export class StageEditor {
    container = null;
    stages = [];
    editingId = null;
    onSaveCallback = null;
    onCloseCallback = null;
    onMapEditCallback = null;
    selectedEnemies = [];

    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.stages = getStages();
        this.selectedEnemies = [];
    }

    render() {
        if (!this.container) return;
        
        const allCharacters = getCharacterPool();
        
        this.container.innerHTML = `
            <div class="editor-header">
                <h3>关卡管理</h3>
                <div class="editor-actions">
                    <button class="btn btn-success" id="btn-add-stage">➕ 添加关卡</button>
                    <button class="btn btn-warning" id="btn-reset-stages">🔄 重置默认</button>
                    <button class="btn btn-secondary" id="btn-close-stage-editor">返回</button>
                </div>
            </div>
            <div class="pool-stats">
                <span>总计: ${this.stages.length} 个关卡</span>
            </div>
            <div class="stage-list" id="stage-list"></div>
            <div class="stage-modal-full" id="stage-modal" style="display:none;">
                <div class="stage-modal-content">
                    <div class="stage-modal-header">
                        <h4 id="stage-modal-title">编辑关卡</h4>
                        <button class="btn-close-modal" id="btn-close-modal">✕</button>
                    </div>
                    <div class="stage-modal-body">
                        <div class="stage-form-left">
                            <div class="form-group">
                                <label>关卡名称</label>
                                <input type="text" id="edit-stage-name" placeholder="关卡名称">
                            </div>
                            <div class="form-group">
                                <label>关卡描述</label>
                                <input type="text" id="edit-stage-desc" placeholder="关卡描述">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>金币奖励</label>
                                    <input type="number" id="edit-stage-gold" min="0" max="9999">
                                </div>
                                <div class="form-group">
                                    <label>抽卡券奖励</label>
                                    <input type="number" id="edit-stage-tickets" min="0" max="99">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>最大上场人数</label>
                                <input type="number" id="edit-stage-team-max" min="1" max="5">
                            </div>
                            <div class="form-group">
                                <label>已选敌人 (<span id="selected-count">0</span>个)</label>
                                <div class="selected-enemies-box" id="selected-enemies-box"></div>
                            </div>
                        </div>
                        <div class="stage-form-right">
                            <div class="form-group">
                                <label>选择角色（点击添加/移除）</label>
                                <div class="filter-tabs" id="rarity-filter">
                                    <button class="filter-tab active" data-filter="all">全部</button>
                                    <button class="filter-tab" data-filter="ENEMY" style="border-color:#e74c3c">敌对</button>
                                    <button class="filter-tab" data-filter="LEGENDARY" style="border-color:#f39c12">传说</button>
                                    <button class="filter-tab" data-filter="EPIC" style="border-color:#9b59b6">史诗</button>
                                    <button class="filter-tab" data-filter="RARE" style="border-color:#3498db">稀有</button>
                                    <button class="filter-tab" data-filter="COMMON" style="border-color:#95a5a6">普通</button>
                                </div>
                            </div>
                            <div class="character-select-grid" id="character-select-grid">
                                ${allCharacters.map(c => {
                                    const rarity = RARITY[c.rarity] || RARITY.COMMON;
                                    return `
                                        <div class="char-select-item" data-id="${c.id}" data-rarity="${c.rarity}" style="border-color:${rarity.color}">
                                            <div class="char-select-icon">${c.icon || '👤'}</div>
                                            <div class="char-select-name">${c.background}</div>
                                            <div class="char-select-rarity" style="color:${rarity.color}">${rarity.name}</div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="stage-modal-footer">
                        <button class="btn btn-success" id="btn-save-stage">💾 保存</button>
                        <button class="btn btn-secondary" id="btn-cancel-stage">取消</button>
                    </div>
                </div>
            </div>
        `;
        
        this.renderStageList();
        this.bindEvents();
    }

    renderStageList() {
        const listContainer = document.getElementById('stage-list');
        if (!listContainer) return;
        
        if (this.stages.length === 0) {
            listContainer.innerHTML = '<div class="empty-hint">暂无关卡，请添加</div>';
            return;
        }
        
        const allCharacters = getCharacterPool();
        
        listContainer.innerHTML = this.stages.map(stage => {
            const enemyNames = stage.enemies.map(eid => {
                const char = allCharacters.find(c => c.id === eid);
                return char ? `${char.icon || '👤'}${char.background}` : eid;
            }).join(' ');
            
            return `
                <div class="stage-item" data-id="${stage.id}">
                    <div class="stage-info">
                        <div class="stage-name">${stage.name}</div>
                        <div class="stage-desc">${stage.description}</div>
                        <div class="stage-enemies">敌人: ${enemyNames}</div>
                        <div class="stage-rewards">奖励: 💰${stage.rewards.gold} 🎫${stage.rewards.gachaTickets} | 上场上限: ${stage.maxTeamSize ?? 3}</div>
                        <div class="stage-map">地图: ${stage.mapId ? '自定义' : '默认'}</div>
                    </div>
                    <div class="stage-actions">
                        <button class="btn-small btn-edit-stage" data-id="${stage.id}">✏️</button>
                        <button class="btn-small btn-map-stage" data-id="${stage.id}">🗺️</button>
                        <button class="btn-small btn-delete-stage" data-id="${stage.id}">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    bindEvents() {
        document.getElementById('btn-add-stage')?.addEventListener('click', () => this.showAddModal());
        document.getElementById('btn-reset-stages')?.addEventListener('click', () => this.resetStages());
        document.getElementById('btn-close-stage-editor')?.addEventListener('click', () => this.close());
        document.getElementById('btn-save-stage')?.addEventListener('click', () => this.saveStage());
        document.getElementById('btn-cancel-stage')?.addEventListener('click', () => this.hideModal());
        document.getElementById('btn-close-modal')?.addEventListener('click', () => this.hideModal());
        
        document.querySelectorAll('.btn-edit-stage').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.showEditModal(parseInt(e.target.dataset.id));
            });
        });
        
        document.querySelectorAll('.btn-delete-stage').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.deleteStage(parseInt(e.target.dataset.id));
            });
        });

        document.querySelectorAll('.btn-map-stage').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                if (Number.isNaN(id)) return;
                if (this.onMapEditCallback) {
                    this.onMapEditCallback(id);
                }
            });
        });
        
        document.querySelectorAll('.char-select-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const target = e.target.closest('.char-select-item');
                if (target) {
                    const charId = target.dataset.id;
                    const index = this.selectedEnemies.indexOf(charId);
                    if (index > -1) {
                        this.selectedEnemies.splice(index, 1);
                        target.classList.remove('selected');
                    } else {
                        this.selectedEnemies.push(charId);
                        target.classList.add('selected');
                    }
                    this.updateSelectedEnemies();
                }
            });
        });
        
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.filterCharacters(e.target.dataset.filter);
            });
        });
    }

    filterCharacters(filter) {
        const items = document.querySelectorAll('.char-select-item');
        items.forEach(item => {
            if (filter === 'all' || item.dataset.rarity === filter) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }

    updateSelectedEnemies() {
        const container = document.getElementById('selected-enemies-box');
        const countEl = document.getElementById('selected-count');
        if (!container) return;
        
        if (countEl) {
            countEl.textContent = this.selectedEnemies.length;
        }
        
        const allCharacters = getCharacterPool();
        
        if (this.selectedEnemies.length === 0) {
            container.innerHTML = '<div class="empty-selection">点击右侧角色卡片添加敌人</div>';
            return;
        }
        
        container.innerHTML = this.selectedEnemies.map(charId => {
            const char = allCharacters.find(c => c.id === charId);
            if (!char) return '';
            const rarity = RARITY[char.rarity] || RARITY.COMMON;
            return `
                <div class="selected-enemy-tag" data-id="${charId}">
                    <span>${char.icon || '👤'}</span>
                    <span>${char.background}</span>
                    <button class="remove-enemy" data-id="${charId}">✕</button>
                </div>
            `;
        }).join('');
        
        container.querySelectorAll('.remove-enemy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const charId = e.target.dataset.id;
                const index = this.selectedEnemies.indexOf(charId);
                if (index > -1) {
                    this.selectedEnemies.splice(index, 1);
                    const gridItem = document.querySelector(`.char-select-item[data-id="${charId}"]`);
                    if (gridItem) gridItem.classList.remove('selected');
                    this.updateSelectedEnemies();
                }
            });
        });
    }

    showAddModal() {
        this.editingId = null;
        this.selectedEnemies = [];
        document.getElementById('stage-modal-title').textContent = '添加关卡';
        document.getElementById('edit-stage-name').value = '';
        document.getElementById('edit-stage-desc').value = '';
        document.getElementById('edit-stage-gold').value = 100;
        document.getElementById('edit-stage-tickets').value = 3;
        document.getElementById('edit-stage-team-max').value = 3;
        
        document.querySelectorAll('.char-select-item').forEach(item => item.classList.remove('selected'));
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.filter-tab[data-filter="all"]')?.classList.add('active');
        this.filterCharacters('all');
        this.updateSelectedEnemies();
        
        document.getElementById('stage-modal').style.display = 'flex';
    }

    showEditModal(id) {
        const stage = this.stages.find(s => s.id === id);
        if (!stage) return;
        
        this.editingId = id;
        this.selectedEnemies = [...stage.enemies];
        document.getElementById('stage-modal-title').textContent = '编辑关卡';
        document.getElementById('edit-stage-name').value = stage.name;
        document.getElementById('edit-stage-desc').value = stage.description;
        document.getElementById('edit-stage-gold').value = stage.rewards.gold;
        document.getElementById('edit-stage-tickets').value = stage.rewards.gachaTickets;
        document.getElementById('edit-stage-team-max').value = stage.maxTeamSize ?? 3;
        
        document.querySelectorAll('.char-select-item').forEach(item => {
            if (this.selectedEnemies.includes(item.dataset.id)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.filter-tab[data-filter="all"]')?.classList.add('active');
        this.filterCharacters('all');
        this.updateSelectedEnemies();
        
        document.getElementById('stage-modal').style.display = 'flex';
    }

    hideModal() {
        document.getElementById('stage-modal').style.display = 'none';
        this.editingId = null;
    }

    saveStage() {
        const name = document.getElementById('edit-stage-name').value.trim();
        const desc = document.getElementById('edit-stage-desc').value.trim();
        const gold = parseInt(document.getElementById('edit-stage-gold').value) || 100;
        const tickets = parseInt(document.getElementById('edit-stage-tickets').value) || 3;
        const teamMaxInput = parseInt(document.getElementById('edit-stage-team-max').value);
        const maxTeamSize = Math.max(1, Math.min(5, Number.isNaN(teamMaxInput) ? 3 : teamMaxInput));
        
        if (!name) {
            alert('请填写关卡名称！');
            return;
        }
        
        if (this.selectedEnemies.length === 0) {
            alert('请至少选择一个敌人！');
            return;
        }
        
        const existing = this.editingId ? this.stages.find(s => s.id === this.editingId) : null;
        const stageData = {
            id: this.editingId || (this.stages.length > 0 ? Math.max(...this.stages.map(s => s.id)) + 1 : 1),
            name,
            description: desc,
            enemies: [...this.selectedEnemies],
            maxTeamSize,
            rewards: {
                gold: Math.max(0, Math.min(9999, gold)),
                gachaTickets: Math.max(0, Math.min(99, tickets))
            },
            mapId: existing?.mapId ?? null,
            enemySpawns: existing?.enemySpawns ?? null
        };
        
        if (this.editingId) {
            const index = this.stages.findIndex(s => s.id === this.editingId);
            if (index > -1) {
                this.stages[index] = stageData;
            }
        } else {
            this.stages.push(stageData);
        }
        
        saveStages(this.stages);
        this.hideModal();
        this.render();
        
        if (this.onSaveCallback) {
            this.onSaveCallback();
        }
    }

    deleteStage(id) {
        if (this.stages.length <= 1) {
            alert('至少保留一个关卡！');
            return;
        }
        
        if (confirm('确定要删除这个关卡吗？')) {
            this.stages = this.stages.filter(s => s.id !== id);
            saveStages(this.stages);
            this.render();
            
            if (this.onSaveCallback) {
                this.onSaveCallback();
            }
        }
    }

    resetStages() {
        if (confirm('确定要重置为默认关卡吗？所有自定义修改将丢失！')) {
            this.stages = resetStages();
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
        this.stages = getStages();
        this.render();
    }

    onSave(callback) {
        this.onSaveCallback = callback;
    }

    onClose(callback) {
        this.onCloseCallback = callback;
    }

    onMapEdit(callback) {
        this.onMapEditCallback = callback;
    }
}
