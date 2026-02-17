import { getStages, saveStages } from './StageEditor.js';
import { key, parseKey } from './hex-coordinates.js';

const STORAGE_KEY = 'fightdemo.hex-map.v1';
const DEFAULT_STORAGE_KEY = 'fightdemo.hex-map.default.v1';
const STAGE_MAP_STORAGE_KEY = 'fightdemo.hex-map.stage.v1';

export function initHexMapEditor(elements, options = {}) {
    const {
        hexMap,
        toggleEditorBtn,
        editorBar,
        editorSaveDefaultBtn,
        editorSaveStageBtn,
        editorResetBtn,
        coordDisplayEl,
    } = elements;

    const state = {
        mode: 'play',
        tool: 'select',
        paintKind: 'neutral',
        cells: new Map(),
        selected: null,
        dragging: null,
        dragPointerId: null,
        dragStartKey: null,
        unitDraggingKey: null,
        unitDragPointerId: null,
        hoverCoord: null,
        layout: null,
        ghostEl: null,
        highlightMoves: null,
        highlightAttacks: null,
        defaultCells: null,
        stageId: Number.isFinite(options.stageId) ? options.stageId : getStageId(),
    };

    let unitProvider = null;
    let playHandlers = {};
    let cellsChangedHandler = null;
    let unitDragHandler = null;
    let stageSavePayloadProvider = null;
    let stageSavedHandler = null;
    let saveStageBound = false;

    function getMetrics() {
        const mapStyle = getComputedStyle(hexMap);
        const hexW = parseFloat(mapStyle.getPropertyValue('--hex-w')) || 64;
        const hexH = parseFloat(mapStyle.getPropertyValue('--hex-h')) || hexW * 0.8660254;
        const gapX = parseFloat(mapStyle.getPropertyValue('--gap-x')) || 0;
        const stepX = hexW * 0.75;
        const stepY = hexH;
        const pad = 6;
        return { hexW, hexH, gapX, stepX, stepY, pad };
    }

    function coordToXY(col, row, m) {
        const sideShift = col === 0 ? 0 : Math.sign(col) * m.gapX;
        const x = col * m.stepX + sideShift;
        const y = row * m.stepY + (Math.abs(col) % 2 ? m.stepY / 2 : 0);
        return { x, y };
    }

    function buildDefaultCells() {
        const cols = new Map();
        cols.set(-4, { rStart: 2, rEnd: 4 });
        cols.set(-3, { rStart: 1, rEnd: 4 });
        cols.set(-2, { rStart: 1, rEnd: 5 });
        cols.set(-1, { rStart: 0, rEnd: 5 });
        cols.set(0, { rStart: 0, rEnd: 6 });
        cols.set(1, { rStart: 0, rEnd: 5 });
        cols.set(2, { rStart: 1, rEnd: 5 });
        cols.set(3, { rStart: 1, rEnd: 4 });
        cols.set(4, { rStart: 2, rEnd: 4 });

        const cells = [];
        Array.from(cols.entries()).forEach(([col, cfg]) => {
            for (let row = cfg.rStart; row <= cfg.rEnd; row++) {
                let kind = 'neutral';
                if (col === 0 ||col===1||col===-1 ) kind = 'boundary';
                if (col < -1) kind = 'ally';
                if(col==-1 && row==3) kind = 'ally';
                if(col==-1 && row==2) kind = 'ally';
                if (col > 1) kind = 'enemy';
                if(col==1 && row==3) kind = 'enemy';
                if(col==1 && row==2) kind = 'enemy';
                if(col==0 && row==3) kind = 'neutral';
                cells.push({ col, row, kind });
            }
        });
        return cells;
    }

    function parseCells(raw) {
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return null;
            if (!parsed.every(x => typeof x?.col === 'number' && typeof x?.row === 'number')) return null;
            return parsed.map(x => ({
                col: x.col,
                row: x.row,
                kind: ['boundary', 'ally', 'enemy', 'neutral'].includes(x.kind) ? x.kind : 'neutral',
            }));
        } catch (e) {
            return null;
        }
    }

    function loadDefaultCells() {
        const storedDefault = loadCellsFromStorage(DEFAULT_STORAGE_KEY);
        return storedDefault || buildDefaultCells();
    }

    function loadCellsFromStorage(keyName) {
        try {
            const raw = localStorage.getItem(keyName);
            if (!raw) return null;
            return parseCells(raw);
        } catch (e) {
            return null;
        }
    }

    function saveDefault(cells) {
        try {
            localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify(cells));
        } catch (e) {}
    }

    function saveCurrent(cells) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cells));
        } catch (e) {}
    }

    function loadStageMaps() {
        try {
            const raw = localStorage.getItem(STAGE_MAP_STORAGE_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e) {
            return {};
        }
    }

    function saveStageMaps(maps) {
        try {
            localStorage.setItem(STAGE_MAP_STORAGE_KEY, JSON.stringify(maps));
        } catch (e) {}
    }

    function createMapId() {
        return `map_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    }

    function getStageId() {
        const params = new URLSearchParams(window.location.search);
        const raw = params.get('stageId');
        const id = raw ? parseInt(raw, 10) : NaN;
        return Number.isNaN(id) ? null : id;
    }

    function getStageMapId(stageId) {
        if (!stageId) return null;
        const stages = getStages();
        return stages.find(s => s.id === stageId)?.mapId ?? null;
    }

    function setStageMapId(stageId, mapId) {
        if (!stageId) return;
        const stages = getStages();
        const index = stages.findIndex(s => s.id === stageId);
        if (index === -1) return;
        stages[index] = { ...stages[index], mapId };
        saveStages(stages);
    }

    function loadCellsForStage(stageId) {
        if (!stageId) return loadDefaultCells();
        const mapId = getStageMapId(stageId);
        if (!mapId) return loadDefaultCells();
        const maps = loadStageMaps();
        const cells = maps[mapId];
        return Array.isArray(cells) ? cells : loadDefaultCells();
    }

    function saveStageCells(stageId, cells, payload) {
        if (!stageId) return null;
        const maps = loadStageMaps();
        const mapId = getStageMapId(stageId) || createMapId();
        maps[mapId] = cells;
        saveStageMaps(maps);
        const stages = getStages();
        const index = stages.findIndex(s => s.id === stageId);
        if (index !== -1) {
            stages[index] = { ...stages[index], mapId, ...(payload || {}) };
            saveStages(stages);
        }
        return mapId;
    }

    function computeBounds(m) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        state.cells.forEach(c => {
            const p = coordToXY(c.col, c.row, m);
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });

        if (!isFinite(minX)) {
            minX = 0;
            minY = 0;
            maxX = 0;
            maxY = 0;
        }

        return { minX, minY, maxX, maxY };
    }

    function render() {
        const m = getMetrics();
        const { minX, minY, maxX, maxY } = computeBounds(m);
        state.layout = { m, minX, minY };
        hexMap.style.width = `${(maxX - minX) + m.hexW + m.pad * 2}px`;
        hexMap.style.height = `${(maxY - minY) + m.hexH + m.pad * 2}px`;
        hexMap.innerHTML = '';

        const frag = document.createDocumentFragment();
        Array.from(state.cells.values()).forEach(c => {
            const p = coordToXY(c.col, c.row, m);
            const cell = document.createElement('div');
            cell.className = 'hex-cell';
            if (c.kind === 'boundary') cell.classList.add('boundary');
            if (c.kind === 'ally') cell.classList.add('ally');
            if (c.kind === 'enemy') cell.classList.add('enemy');
            if (state.selected === key(c.col, c.row)) cell.classList.add('selected');
            if (state.highlightMoves?.has(key(c.col, c.row))) cell.classList.add('move-option');
            if (state.highlightAttacks?.has(key(c.col, c.row))) cell.classList.add('attack-option');

            const fill = document.createElement('div');
            fill.className = 'hex-fill';
            cell.appendChild(fill);

            const unit = unitProvider ? unitProvider(c.col, c.row) : null;
            if (unit) {
                cell.classList.add('has-unit');
                const icon = document.createElement('div');
                icon.className = 'unit-icon';
                icon.textContent = unit.icon || '❔';
                cell.appendChild(icon);
            }

            cell.style.left = `${(p.x - minX) + m.pad}px`;
            cell.style.top = `${(p.y - minY) + m.pad}px`;
            cell.dataset.col = String(c.col);
            cell.dataset.row = String(c.row);
            frag.appendChild(cell);
        });

        hexMap.appendChild(frag);

        if (state.mode === 'edit' || state.dragging || state.unitDraggingKey) {
            const ghost = ensureGhost();
            hexMap.appendChild(ghost);
            setGhostCoord(state.hoverCoord);
        }

        updateCoordDisplay();
    }

    function updateCoordDisplay() {
        if (!coordDisplayEl) return;
        if (state.mode !== 'edit' || !state.selected) {
            coordDisplayEl.hidden = true;
            return;
        }
        const { col, row } = parseKey(state.selected);
        coordDisplayEl.textContent = `坐标: (${col}, ${row})`;
        coordDisplayEl.hidden = false;
    }

    function setCells(cells) {
        state.cells.clear();
        cells.forEach(c => state.cells.set(key(c.col, c.row), { ...c }));
        state.selected = null;
        saveCurrent(cells);
        render();
        if (cellsChangedHandler) cellsChangedHandler(Array.from(state.cells.values()));
    }

    function ensureGhost() {
        if (state.ghostEl && state.ghostEl.isConnected) return state.ghostEl;
        const ghost = document.createElement('div');
        ghost.className = 'hex-cell ghost';
        const fill = document.createElement('div');
        fill.className = 'hex-fill';
        ghost.appendChild(fill);
        ghost.style.display = 'none';
        state.ghostEl = ghost;
        hexMap.appendChild(ghost);
        return ghost;
    }

    function setGhostCoord(coord) {
        const ghost = ensureGhost();
        if (!coord || !state.layout) {
            ghost.style.display = 'none';
            return;
        }
        const m = state.layout.m;
        const world = coordToXY(coord.col, coord.row, m);
        ghost.style.left = `${(world.x - state.layout.minX) + m.pad}px`;
        ghost.style.top = `${(world.y - state.layout.minY) + m.pad}px`;
        ghost.style.display = '';
    }

    function getSearchRange() {
        let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity;
        state.cells.forEach(c => {
            minCol = Math.min(minCol, c.col);
            maxCol = Math.max(maxCol, c.col);
            minRow = Math.min(minRow, c.row);
            maxRow = Math.max(maxRow, c.row);
        });
        if (!isFinite(minCol)) return { minCol: -6, maxCol: 6, minRow: -2, maxRow: 10 };
        return { minCol: minCol - 3, maxCol: maxCol + 3, minRow: minRow - 3, maxRow: maxRow + 3 };
    }

    function findNearestCoordFromEvent(e) {
        if (!state.layout) return null;
        const rect = hexMap.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;
        const m = state.layout.m;
        const worldX = localX + state.layout.minX - m.pad;
        const worldY = localY + state.layout.minY - m.pad;

        const range = getSearchRange();
        let best = null;
        let bestD2 = Infinity;
        for (let col = range.minCol; col <= range.maxCol; col++) {
            for (let row = range.minRow; row <= range.maxRow; row++) {
                const p = coordToXY(col, row, m);
                const dx = worldX - p.x;
                const dy = worldY - p.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < bestD2) {
                    bestD2 = d2;
                    best = { col, row };
                }
            }
        }

        const threshold = (m.hexW * 0.65) * (m.hexW * 0.65);
        if (bestD2 > threshold) return null;
        return best;
    }

    function setMode(mode) {
        state.mode = mode;
        if (mode === 'edit') {
            if (editorBar) editorBar.hidden = false;
            if (toggleEditorBtn) toggleEditorBtn.textContent = '退出编辑';
            setTool(state.tool);
        } else {
            if (editorBar) editorBar.hidden = true;
            if (toggleEditorBtn) toggleEditorBtn.textContent = '编辑地图';
            state.hoverCoord = null;
        }
        render();
    }

    function setStageId(stageId) {
        state.stageId = Number.isFinite(stageId) ? stageId : null;
        const initial = state.stageId ? loadCellsForStage(state.stageId) : loadDefaultCells();
        setCells(initial);
        if (state.mode !== 'edit' && options.mode === 'edit') {
            setMode('edit');
        }
        updateSaveStageVisibility();
    }

    function updateSaveStageVisibility() {
        if (!editorSaveStageBtn) return;
        editorSaveStageBtn.hidden = !state.stageId;
        if (!saveStageBound) {
            editorSaveStageBtn.addEventListener('click', function() {
                if (!state.stageId) return;
                const snapshot = Array.from(state.cells.values());
                const payload = stageSavePayloadProvider ? stageSavePayloadProvider() : null;
                saveStageCells(state.stageId, snapshot, payload);
                if (stageSavedHandler) stageSavedHandler(state.stageId);
            });
            saveStageBound = true;
        }
    }

    function setTool(tool) {
        state.tool = tool;
        editorBar.querySelectorAll('[data-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
        const typeRow = editorBar.querySelector('[data-type-row]');
        if (typeRow) typeRow.classList.toggle('disabled', tool !== 'paint');
        state.hoverCoord = null;
        setGhostCoord(null);
    }

    function setPaintKind(kind) {
        state.paintKind = kind;
        editorBar.querySelectorAll('[data-kind]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.kind === kind);
        });
    }

    function addCellAt(coord) {
        if (!coord) return;
        const k = key(coord.col, coord.row);
        if (state.cells.has(k)) return;
        state.cells.set(k, { col: coord.col, row: coord.row, kind: state.paintKind });
        state.selected = k;
        saveCurrent(Array.from(state.cells.values()));
        render();
        if (cellsChangedHandler) cellsChangedHandler(Array.from(state.cells.values()));
    }

    function setCellKind(col, row, kind) {
        const k = key(col, row);
        const cell = state.cells.get(k);
        if (!cell) return;
        if (cell.kind === kind) return;
        state.cells.set(k, { ...cell, kind });
        saveCurrent(Array.from(state.cells.values()));
        render();
        if (cellsChangedHandler) cellsChangedHandler(Array.from(state.cells.values()));
    }

    function deleteCellAt(col, row) {
        const k = key(col, row);
        if (!state.cells.has(k)) return;
        state.cells.delete(k);
        if (state.selected === k) state.selected = null;
        saveCurrent(Array.from(state.cells.values()));
        render();
        if (cellsChangedHandler) cellsChangedHandler(Array.from(state.cells.values()));
    }

    function moveCell(fromKey, toCoord) {
        if (!fromKey || !toCoord) return;
        const toKey = key(toCoord.col, toCoord.row);
        if (fromKey === toKey) return;
        if (state.cells.has(toKey)) return;
        const cell = state.cells.get(fromKey);
        if (!cell) return;
        state.cells.delete(fromKey);
        state.cells.set(toKey, { ...cell, col: toCoord.col, row: toCoord.row });
        state.selected = toKey;
        saveCurrent(Array.from(state.cells.values()));
        render();
        if (cellsChangedHandler) cellsChangedHandler(Array.from(state.cells.values()));
    }

    function onEditorPointerDown(e, cellEl) {
        if (cellEl && !cellEl.classList.contains('ghost')) {
            const col = Number(cellEl.dataset.col);
            const row = Number(cellEl.dataset.row);
            const k = key(col, row);
            const unit = unitProvider ? unitProvider(col, row) : null;

            if (state.tool === 'select' && unit && unitDragHandler?.canDrag?.(unit)) {
                state.selected = k;
                state.unitDraggingKey = k;
                state.unitDragPointerId = e.pointerId;
                cellEl.setPointerCapture(e.pointerId);
                state.hoverCoord = { col, row };
                setGhostCoord(state.hoverCoord);
                render();
                return;
            }

            if (state.tool === 'delete') {
                deleteCellAt(col, row);
                return;
            }

            state.selected = k;
            render();

            if (state.tool === 'paint') {
                setCellKind(col, row, state.paintKind);
                return;
            }

            if (state.tool === 'select') {
                state.dragging = k;
                state.dragStartKey = k;
                state.dragPointerId = e.pointerId;
                cellEl.setPointerCapture(e.pointerId);
                state.hoverCoord = { col, row };
                setGhostCoord(state.hoverCoord);
            }
            return;
        }

        const coord = findNearestCoordFromEvent(e);
        if (state.tool === 'add') {
            addCellAt(coord);
            return;
        }

        if (state.tool === 'select') {
            state.selected = null;
            state.hoverCoord = coord;
            setGhostCoord(state.hoverCoord);
            render();
        }
    }

    function onEditorPointerMove(e) {
        if (state.unitDraggingKey) {
            const coord = findNearestCoordFromEvent(e);
            state.hoverCoord = coord;
            setGhostCoord(coord);
            return;
        }
        if (!state.dragging && state.tool !== 'add') return;
        const coord = findNearestCoordFromEvent(e);
        state.hoverCoord = coord;
        setGhostCoord(coord);
    }

    function onEditorPointerUp(e) {
        if (state.unitDraggingKey) {
            if (state.unitDragPointerId !== e.pointerId) return;
            const coord = findNearestCoordFromEvent(e);
            const fromKey = state.unitDraggingKey;
            state.unitDraggingKey = null;
            state.unitDragPointerId = null;
            state.hoverCoord = null;
            setGhostCoord(null);
            unitDragHandler?.onDrop?.(fromKey, coord);
            render();
            return;
        }
        if (!state.dragging) return;
        if (state.dragPointerId !== e.pointerId) return;
        const coord = findNearestCoordFromEvent(e);
        const fromKey = state.dragging;
        state.dragging = null;
        state.dragPointerId = null;
        state.hoverCoord = null;
        setGhostCoord(null);
        moveCell(fromKey, coord);
    }

    function setPlayHandlers(handlers) {
        playHandlers = handlers || {};
    }

    function setUnitProvider(provider) {
        unitProvider = provider;
        render();
    }

    function setUnitDragHandler(handler) {
        unitDragHandler = handler;
    }

    function setStageSavePayloadProvider(provider) {
        stageSavePayloadProvider = provider;
    }

    function setStageSavedHandler(handler) {
        stageSavedHandler = handler;
    }

    function setCellsChangedHandler(handler) {
        cellsChangedHandler = handler;
    }

    function setHighlights(moves, attacks) {
        state.highlightMoves = moves;
        state.highlightAttacks = attacks;
        render();
    }

    function setHoverCoord(coord) {
        state.hoverCoord = coord;
        setGhostCoord(coord);
    }

    if (toggleEditorBtn) {
        toggleEditorBtn.addEventListener('click', function() {
            setMode(state.mode === 'edit' ? 'play' : 'edit');
        });
    }

    if (editorBar) {
        editorBar.addEventListener('click', function(e) {
            const btn = e.target.closest('[data-tool]');
            if (btn) setTool(btn.dataset.tool);
            const kindBtn = e.target.closest('[data-kind]');
            if (kindBtn) {
                setPaintKind(kindBtn.dataset.kind);
                if (state.tool !== 'paint') setTool('paint');
            }
        });
    }

    if (editorResetBtn) {
        editorResetBtn.addEventListener('click', function() {
            const fallback = state.stageId ? loadCellsForStage(state.stageId) : loadDefaultCells();
            setCells(fallback);
        });
    }

    if (editorSaveDefaultBtn) {
        editorSaveDefaultBtn.addEventListener('click', function() {
            const snapshot = Array.from(state.cells.values());
            saveDefault(snapshot);
            state.defaultCells = snapshot.map(c => ({ ...c }));
        });
    }

    updateSaveStageVisibility();

    hexMap.addEventListener('pointerdown', function(e) {
        const cellEl = e.target.closest('.hex-cell');
        if (state.mode !== 'edit') {
            if (playHandlers.onPointerDown) {
                playHandlers.onPointerDown(e, cellEl);
            }
            return;
        }
        onEditorPointerDown(e, cellEl);
    });

    hexMap.addEventListener('pointermove', function(e) {
        if (state.mode !== 'edit') {
            if (playHandlers.onPointerMove) {
                playHandlers.onPointerMove(e);
            }
            return;
        }
        onEditorPointerMove(e);
    });

    hexMap.addEventListener('pointerup', function(e) {
        if (state.mode !== 'edit') {
            if (playHandlers.onPointerUp) {
                playHandlers.onPointerUp(e);
            }
            return;
        }
        onEditorPointerUp(e);
    });

    window.addEventListener('keydown', function(e) {
        if (state.mode !== 'edit') return;
        if (e.key !== 'Backspace' && e.key !== 'Delete') return;
        if (!state.selected) return;
        const { col, row } = parseKey(state.selected);
        deleteCellAt(col, row);
    });

    const storedCurrent = loadCellsFromStorage(STORAGE_KEY);
    const initial = state.stageId ? loadCellsForStage(state.stageId) : storedCurrent || loadDefaultCells();
    state.defaultCells = loadDefaultCells();
    setCells(initial);

    const modeParam = new URLSearchParams(window.location.search).get('mode');
    if (options.mode === 'edit' || modeParam === 'edit') {
        setMode('edit');
    }

    return {
        state,
        key,
        parseKey,
        render,
        setCells,
        setPlayHandlers,
        setUnitProvider,
        setUnitDragHandler,
        setHighlights,
        setHoverCoord,
        setGhostCoord,
        findNearestCoordFromEvent,
        getCellAt: (col, row) => state.cells.get(key(col, row)),
        getStageId: () => state.stageId,
        setCellsChangedHandler,
        setStageSavePayloadProvider,
        setStageSavedHandler,
        setStageId,
    };
}
