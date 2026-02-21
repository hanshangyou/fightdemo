import { initHexMapEditor } from './hex-map-editor.js';
import { getStages } from '../editors/StageEditor.js';
import { getCharacterPool } from '../systems/GachaSystem.js';

export class EmbeddedMapEditor {
    mapApi = null;
    stage = null;
    stageEnemies = [];
    enemyUnits = new Map();
    enemySpawns = [];
    enemySpawnIndexByKey = new Map();
    characterMap = new Map();
    onBack = null;
    toastEl = null;
    toastTimer = null;

    constructor(onBack) {
        this.onBack = onBack;
        const elements = {
            hexMap: document.getElementById('map-editor-hex-map'),
            toggleEditorBtn: document.getElementById('map-editor-toggle'),
            editorBar: document.getElementById('map-editor-bar'),
            editorSaveDefaultBtn: document.getElementById('map-editor-save-default'),
            editorSaveStageBtn: document.getElementById('map-editor-save-stage'),
            editorResetBtn: document.getElementById('map-editor-reset'),
            coordDisplayEl: document.getElementById('map-editor-coord-display'),
        };
        const characterPool = getCharacterPool();
        this.characterMap = new Map(characterPool.map(c => [c.id, c]));
        this.mapApi = initHexMapEditor(elements, { mode: 'edit' });
        this.toastEl = document.getElementById('map-editor-toast');
        this.bindBack();
        this.bindMapHooks();
    }

    bindBack() {
        const backBtn = document.getElementById('map-editor-back');
        if (!backBtn) return;
        backBtn.addEventListener('click', () => {
            if (this.onBack) this.onBack();
        });
    }

    bindMapHooks() {
        this.mapApi.setCellsChangedHandler((cells) => {
            this.refreshEnemyPreview(cells);
        });

        this.mapApi.setUnitDragHandler({
            canDrag: (unit) => unit?.team === 'enemy',
            onDrop: (fromKey, coord) => {
                if (!coord) return false;
                const index = this.enemySpawnIndexByKey.get(fromKey);
                if (index === undefined) return false;
                const cell = this.mapApi.getCellAt(coord.col, coord.row);
                if (!cell || cell.kind !== 'enemy') return false;
                const targetKey = this.mapApi.key(coord.col, coord.row);
                const occupied = this.enemySpawnIndexByKey.get(targetKey);
                if (occupied !== undefined && occupied !== index) return false;
                this.enemySpawns[index] = {
                    enemyId: this.enemySpawns[index]?.enemyId || this.stageEnemies[index],
                    col: coord.col,
                    row: coord.row,
                };
                this.enemySpawnIndexByKey.delete(fromKey);
                this.enemySpawnIndexByKey.set(targetKey, index);
                this.buildEnemyUnits();
                return true;
            }
        });

        this.mapApi.setStageSavePayloadProvider(() => ({
            enemySpawns: this.enemySpawns.map(spawn => {
                if (!spawn || !Number.isFinite(spawn.col) || !Number.isFinite(spawn.row)) return null;
                return { enemyId: spawn.enemyId, col: spawn.col, row: spawn.row };
            })
        }));

        this.mapApi.setStageSavedHandler(() => {
            this.showToast('保存成功');
        });
    }

    setStage(stageId) {
        const stages = getStages();
        this.stage = stageId ? stages.find(s => s.id === stageId) || stages[0] : stages[0];
        this.stageEnemies = this.stage?.enemies || [];
        this.enemySpawns = Array.isArray(this.stage?.enemySpawns) ? this.stage.enemySpawns.map(s => (s ? { ...s } : null)) : [];
        this.updateStageInfo();
        this.mapApi.setStageId(this.stage?.id || null);
        this.refreshEnemyPreview(Array.from(this.mapApi.state.cells.values()));
    }

    updateStageInfo() {
        const nameEl = document.getElementById('map-editor-stage-name');
        const enemiesEl = document.getElementById('map-editor-stage-enemies');
        if (nameEl) nameEl.textContent = this.stage?.name || '关卡地图';
        if (enemiesEl) {
            if (!this.stageEnemies.length) {
                enemiesEl.textContent = '敌方: 无';
                return;
            }
            const names = this.stageEnemies.map(id => {
                const c = this.characterMap.get(id);
                return c ? `${c.icon || '👤'}${c.background}` : id;
            });
            enemiesEl.textContent = `敌方: ${names.join(' ')}`;
        }
    }

    rebuildEnemySpawns(cells) {
        this.enemySpawnIndexByKey = new Map();
        if (!this.stageEnemies.length) {
            this.enemySpawns = [];
            return;
        }
        const enemyCells = cells
            .filter(c => c.kind === 'enemy')
            .sort((a, b) => a.col - b.col || a.row - b.row);
        const occupied = new Set();
        const nextSpawns = [];
        this.stageEnemies.forEach((enemyId, index) => {
            const desired = this.enemySpawns[index];
            let coord = null;
            if (desired && Number.isFinite(desired.col) && Number.isFinite(desired.row)) {
                const cell = this.mapApi.getCellAt(desired.col, desired.row);
                const k = this.mapApi.key(desired.col, desired.row);
                if (cell && cell.kind === 'enemy' && !occupied.has(k)) {
                    coord = { col: desired.col, row: desired.row };
                }
            }
            if (!coord) {
                const fallback = enemyCells.find(c => !occupied.has(this.mapApi.key(c.col, c.row)));
                if (fallback) coord = { col: fallback.col, row: fallback.row };
            }
            if (coord) {
                const k = this.mapApi.key(coord.col, coord.row);
                occupied.add(k);
                this.enemySpawnIndexByKey.set(k, index);
                nextSpawns[index] = { enemyId, col: coord.col, row: coord.row };
            } else {
                nextSpawns[index] = { enemyId, col: null, row: null };
            }
        });
        this.enemySpawns = nextSpawns;
    }

    buildEnemyUnits() {
        this.enemyUnits = new Map();
        this.enemySpawns.forEach(spawn => {
            if (!spawn || !Number.isFinite(spawn.col) || !Number.isFinite(spawn.row)) return;
            const template = this.characterMap.get(spawn.enemyId);
            if (!template) return;
            this.enemyUnits.set(this.mapApi.key(spawn.col, spawn.row), {
                id: template.id,
                background: template.background,
                icon: template.icon,
                team: 'enemy',
            });
        });
        this.mapApi.setUnitProvider((col, row) => this.enemyUnits.get(this.mapApi.key(col, row)));
    }

    refreshEnemyPreview(cells) {
        this.rebuildEnemySpawns(cells);
        this.buildEnemyUnits();
    }

    showToast(text) {
        if (!this.toastEl) return;
        this.toastEl.textContent = text;
        this.toastEl.classList.add('show');
        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            this.toastEl.classList.remove('show');
        }, 1600);
    }
}
