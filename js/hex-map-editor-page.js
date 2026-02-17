import { initHexMapEditor } from './hex-map-editor.js';
import { getStages } from './StageEditor.js';
import { getCharacterPool } from './GachaSystem.js';

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const stageIdParam = params.get('stageId');
    const stageIdValue = stageIdParam ? parseInt(stageIdParam, 10) : null;
    const elements = {
        hexMap: document.getElementById('hex-map'),
        toggleEditorBtn: document.getElementById('toggle-editor'),
        editorBar: document.getElementById('editor-bar'),
        editorSaveDefaultBtn: document.getElementById('editor-save-default'),
        editorSaveStageBtn: document.getElementById('editor-save-stage'),
        editorResetBtn: document.getElementById('editor-reset'),
        coordDisplayEl: document.getElementById('map-coord-display'),
    };

    const mapStageNameEl = document.getElementById('map-stage-name');
    const mapStageEnemiesEl = document.getElementById('map-stage-enemies');
    const backBtn = document.getElementById('btn-back-stage-editor');
    const mapApi = initHexMapEditor(elements, { stageId: stageIdValue, mode: 'edit' });
    const stageId = mapApi.getStageId();
    const stages = getStages();
    const stage = stageId ? stages.find(s => s.id === stageId) || stages[0] : stages[0];
    const characterPool = getCharacterPool();
    const characterMap = new Map(characterPool.map(c => [c.id, c]));
    const stageEnemies = stage?.enemies || [];
    let enemyUnits = new Map();
    let enemySpawns = Array.isArray(stage?.enemySpawns) ? stage.enemySpawns.map(s => (s ? { ...s } : null)) : [];
    let enemySpawnIndexByKey = new Map();

    function updateStageInfo() {
        if (mapStageNameEl) mapStageNameEl.textContent = stage?.name || '关卡地图';
        if (mapStageEnemiesEl) {
            if (!stage?.enemies?.length) {
                mapStageEnemiesEl.textContent = '敌方: 无';
                return;
            }
            const names = stage.enemies.map(id => {
                const c = characterMap.get(id);
                return c ? `${c.icon || '👤'}${c.name}` : id;
            });
            mapStageEnemiesEl.textContent = `敌方: ${names.join(' ')}`;
        }
    }

    function rebuildEnemySpawns(cells) {
        enemySpawnIndexByKey = new Map();
        if (!stageEnemies.length) {
            enemySpawns = [];
            return;
        }
        const enemyCells = cells
            .filter(c => c.kind === 'enemy')
            .sort((a, b) => a.col - b.col || a.row - b.row);
        const occupied = new Set();
        const nextSpawns = [];
        stageEnemies.forEach((enemyId, index) => {
            const desired = enemySpawns[index];
            let coord = null;
            if (desired && Number.isFinite(desired.col) && Number.isFinite(desired.row)) {
                const cell = mapApi.getCellAt(desired.col, desired.row);
                const k = mapApi.key(desired.col, desired.row);
                if (cell && cell.kind === 'enemy' && !occupied.has(k)) {
                    coord = { col: desired.col, row: desired.row };
                }
            }
            if (!coord) {
                const fallback = enemyCells.find(c => !occupied.has(mapApi.key(c.col, c.row)));
                if (fallback) coord = { col: fallback.col, row: fallback.row };
            }
            if (coord) {
                const k = mapApi.key(coord.col, coord.row);
                occupied.add(k);
                enemySpawnIndexByKey.set(k, index);
                nextSpawns[index] = { enemyId, col: coord.col, row: coord.row };
            } else {
                nextSpawns[index] = { enemyId, col: null, row: null };
            }
        });
        enemySpawns = nextSpawns;
    }

    function buildEnemyUnits() {
        enemyUnits = new Map();
        enemySpawns.forEach(spawn => {
            if (!spawn || !Number.isFinite(spawn.col) || !Number.isFinite(spawn.row)) return;
            const template = characterMap.get(spawn.enemyId);
            if (!template) return;
            enemyUnits.set(mapApi.key(spawn.col, spawn.row), {
                id: template.id,
                name: template.name,
                icon: template.icon,
                team: 'enemy',
            });
        });
        mapApi.setUnitProvider((col, row) => enemyUnits.get(mapApi.key(col, row)));
    }

    function refreshEnemyPreview(cells) {
        rebuildEnemySpawns(cells);
        buildEnemyUnits();
    }

    mapApi.setCellsChangedHandler((cells) => {
        refreshEnemyPreview(cells);
    });

    mapApi.setUnitDragHandler({
        canDrag: (unit) => unit?.team === 'enemy',
        onDrop: (fromKey, coord) => {
            if (!coord) return false;
            const index = enemySpawnIndexByKey.get(fromKey);
            if (index === undefined) return false;
            const cell = mapApi.getCellAt(coord.col, coord.row);
            if (!cell || cell.kind !== 'enemy') return false;
            const targetKey = mapApi.key(coord.col, coord.row);
            const occupied = enemySpawnIndexByKey.get(targetKey);
            if (occupied !== undefined && occupied !== index) return false;
            enemySpawns[index] = {
                enemyId: enemySpawns[index]?.enemyId || stageEnemies[index],
                col: coord.col,
                row: coord.row,
            };
            enemySpawnIndexByKey.delete(fromKey);
            enemySpawnIndexByKey.set(targetKey, index);
            buildEnemyUnits();
            return true;
        }
    });

    mapApi.setStageSavePayloadProvider(() => ({
        enemySpawns: enemySpawns.map(spawn => {
            if (!spawn || !Number.isFinite(spawn.col) || !Number.isFinite(spawn.row)) return null;
            return { enemyId: spawn.enemyId, col: spawn.col, row: spawn.row };
        })
    }));

    updateStageInfo();
    refreshEnemyPreview(Array.from(mapApi.state.cells.values()));

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            const returnTo = params.get('returnTo');
            if (returnTo === 'stageEditor') {
                try {
                    sessionStorage.setItem('openStageEditor', '1');
                } catch (e) {}
                window.location.href = 'index.html';
                return;
            }
            window.history.back();
        });
    }
});
