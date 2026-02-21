import { getStages } from '../editors/StageEditor.js';
import { createPreparePhase } from './hex-battle-prepare.js';
import { createBattlePhase } from './hex-battle-combat.js';

export function initHexBattle({ mapApi, elements, config = {} }) {
    const {
        hexMap,
        stageNameEl,
        phaseLabelEl,
        enemyCountEl,
        playerCountEl,
        playerPoolEl,
        startBattleBtn,
        resetPlacementBtn,
        battlePanelEl,
        battleStageNameEl,
        battleRoundEl,
        battleStatusEl,
        turnOrderEl,
        turnOrderListEl,
        enemyPoolEl,
        battleLogEl,
        battleLogListEl,
        battleActionLayoutEl,
        battleActiveUnitEl,
        battleTargetListEl,
        battleSkipTurnBtn,
        battleToastEl,
    } = elements;

    const state = {
        units: new Map(),
        phase: 'prepare',
        stageIndex: 0,
        stage: null,
        maxTeamSize: 3,
        playerPool: [],
        selectedUnitId: null,
        draggingUnitKey: null,
        draggingUnitPointerId: null,
        round: 1,
        roundLimit: 20,
        turnIndex: 0,
        turnOrder: [],
        activeUnitKey: null,
        awaitingAction: false,
        validMoves: null,
        validAttacks: null,
        damageStats: new Map(),
        totalDamage: 0,
        turnCount: 0,
        external: { ...config },
        lastLogTurnKey: null,
        lastLogRound: 0
    };

    mapApi.setUnitProvider((col, row) => state.units.get(mapApi.key(col, row)));

    function updateBattleLogVisibility(visible) {
        if (!battleLogEl) return;
        if (visible === false) {
            battleLogEl.hidden = true;
            return;
        }
        const hasContent = battleLogListEl && battleLogListEl.children.length > 0;
        battleLogEl.hidden = !hasContent;
    }

    function setBattleLogVisible(visible) {
        updateBattleLogVisibility(visible);
    }

    function clearBattleLog() {
        if (!battleLogListEl) return;
        battleLogListEl.innerHTML = '';
        updateBattleLogVisibility();
    }

    function appendBattleLog(message) {
        if (!battleLogListEl || !message) return;
        const item = document.createElement('div');
        item.className = 'battle-log-item';
        item.textContent = message;
        battleLogListEl.appendChild(item);
        if (battleLogListEl.children.length > 200) {
            battleLogListEl.removeChild(battleLogListEl.firstChild);
        }
        battleLogListEl.scrollTop = battleLogListEl.scrollHeight;
        updateBattleLogVisibility(true);
    }

    function setMapVisible(visible) {
        if (!hexMap?.parentElement) return;
        if (visible === false) {
            hexMap.parentElement.style.display = 'none';
            return;
        }
        hexMap.parentElement.style.display = 'flex';
    }

    let battleToastTimer = null;
    function showBattleToast(message) {
        if (!battleToastEl || !message) return;
        battleToastEl.textContent = message;
        battleToastEl.hidden = false;
        battleToastEl.classList.add('show');
        if (battleToastTimer) window.clearTimeout(battleToastTimer);
        battleToastTimer = window.setTimeout(() => {
            battleToastEl.classList.remove('show');
            battleToastEl.hidden = true;
        }, 1200);
    }

    function setMapPhase(phase) {
        if (!hexMap) return;
        hexMap.classList.remove('phase-prepare', 'phase-battle');
        if (phase === 'battle') {
            hexMap.classList.add('phase-battle');
            return;
        }
        hexMap.classList.add('phase-prepare');
    }

    function updateHoverHint() {
    }

    function getUnitAt(col, row) {
        return state.units.get(mapApi.key(col, row));
    }

    function isOccupied(col, row) {
        return state.units.has(mapApi.key(col, row));
    }

    function setUnit(col, row, unit) {
        state.units.set(mapApi.key(col, row), unit);
    }

    function clearUnits() {
        state.units.clear();
    }

    function clearAllyUnits() {
        Array.from(state.units.entries()).forEach(([k, u]) => {
            if (u.team === 'ally') state.units.delete(k);
        });
    }

    function initStage() {
        const stages = getStages();
        if (state.external?.stage) {
            state.stage = state.external.stage;
        } else {
            const stageId = mapApi.getStageId();
            state.stage = stageId ? stages.find(s => s.id === stageId) || stages[0] : stages[state.stageIndex] || stages[0];
        }
        state.maxTeamSize = state.stage?.maxTeamSize || 3;
        state.roundLimit = state.stage?.roundLimit || 20;
    }

    function replaceKeyInTurnOrder(fromKey, toKey) {
        if (!fromKey || !toKey || fromKey === toKey) return;
        if (Array.isArray(state.turnOrder) && state.turnOrder.length) {
            state.turnOrder = state.turnOrder.map(k => (k === fromKey ? toKey : k));
        }
        if (state.activeUnitKey === fromKey) {
            state.activeUnitKey = toKey;
            mapApi.setActiveUnitKey(toKey);
        }
    }

    function logMove(unit, fromKey, toKey, apCost) {
        if (state.phase !== 'battle') return;
        const from = mapApi.parseKey(fromKey);
        const to = mapApi.parseKey(toKey);
        const background = unit?.background || (unit?.team === 'enemy' ? '敌方' : '我方');
        if (Number.isFinite(apCost)) {
            appendBattleLog(`${background} 移动 (${from.col},${from.row}) → (${to.col},${to.row})（消耗AP ${apCost}）`);
            return;
        }
        appendBattleLog(`${background} 移动 (${from.col},${from.row}) → (${to.col},${to.row})`);
    }

    function moveUnit(fromKey, toCoord, apCost) {
        if (!fromKey || !toCoord) return false;
        const toKey = mapApi.key(toCoord.col, toCoord.row);
        if (fromKey === toKey) return true;
        if (state.units.has(toKey)) return false;
        const cell = mapApi.getCellAt(toCoord.col, toCoord.row);
        if (!cell) return false;
        const unit = state.units.get(fromKey);
        if (!unit) return false;
        state.units.delete(fromKey);
        state.units.set(toKey, unit);
        replaceKeyInTurnOrder(fromKey, toKey);
        logMove(unit, fromKey, toKey, apCost);
        return true;
    }

    function moveAllyUnit(fromKey, toCoord) {
        if (!fromKey || !toCoord) return false;
        const toKey = mapApi.key(toCoord.col, toCoord.row);
        if (fromKey === toKey) return true;
        if (state.units.has(toKey)) return false;
        const cell = mapApi.getCellAt(toCoord.col, toCoord.row);
        if (!cell || cell.kind !== 'ally') return false;
        const unit = state.units.get(fromKey);
        if (!unit || unit.team !== 'ally') return false;
        state.units.delete(fromKey);
        state.units.set(toKey, unit);
        replaceKeyInTurnOrder(fromKey, toKey);
        logMove(unit, fromKey, toKey);
        return true;
    }

    const uiHandlers = {};
    const prepareApi = createPreparePhase({
        state,
        mapApi,
        elements: {
            stageNameEl,
            phaseLabelEl,
            enemyCountEl,
            playerCountEl,
            playerPoolEl,
            startBattleBtn,
            resetPlacementBtn,
            battlePanelEl,
            turnOrderEl,
            enemyPoolEl
        },
        helpers: {
            setBattleLogVisible,
            clearBattleLog,
            setMapVisible,
            setMapPhase,
            showBattleToast,
            setUnit,
            isOccupied,
            clearAllyUnits
        },
        uiHandlers
    });
    const battleApi = createBattlePhase({
        state,
        mapApi,
        elements: {
            battleStageNameEl,
            battleRoundEl,
            battleStatusEl,
            turnOrderListEl,
            battleActionLayoutEl,
            battleActiveUnitEl,
            battleTargetListEl,
            battleSkipTurnBtn
        },
        helpers: {
            appendBattleLog,
            setBattleLogVisible,
            updateHoverHint,
            moveUnit,
            getUnitAt,
            clearBattleLog,
            setMapVisible,
            setMapPhase,
            showBattleToast
        },
        uiHandlers
    });

    uiHandlers.renderPrepUI = prepareApi.renderPrepUI;
    uiHandlers.renderBattleActionPanels = battleApi.renderBattleActionPanels;

    function loadBattle(battleConfig = {}) {
        state.external = { ...state.external, ...battleConfig };
        if (Number.isFinite(battleConfig.stageId)) {
            mapApi.setStageId(battleConfig.stageId);
        }
        clearUnits();
        initStage();
        prepareApi.resetPlacement();
    }

    initStage();
    prepareApi.resetPlacement();
    setMapPhase('prepare');

    mapApi.setPlayHandlers({
        onPointerDown: (e, cellEl) => {
            if (!cellEl) return;
            if (state.phase === 'prepare') {
                const col = Number(cellEl.dataset.col);
                const row = Number(cellEl.dataset.row);
                const selectedTemplate = state.playerPool.find(t => t.id === state.selectedUnitId);
                if (selectedTemplate) {
                    const placed = prepareApi.placePlayerAt({ col, row }, selectedTemplate);
                    if (placed) {
                        mapApi.render();
                        prepareApi.renderPrepUI();
                    }
                    return;
                }
                const unit = getUnitAt(col, row);
                if (unit && unit.team === 'ally') {
                    state.draggingUnitKey = mapApi.key(col, row);
                    state.draggingUnitPointerId = e.pointerId;
                    cellEl.setPointerCapture(e.pointerId);
                    mapApi.setHoverCoord({ col, row });
                }
                return;
            }
            if (state.phase === 'battle' && state.awaitingAction && state.activeUnitKey) {
                const col = Number(cellEl.dataset.col);
                const row = Number(cellEl.dataset.row);
                const targetKey = mapApi.key(col, row);
                if (state.validAttacks?.has(targetKey)) {
                    battleApi.handlePlayerAttack(targetKey);
                } else if (state.validMoves?.has(targetKey)) {
                    battleApi.handlePlayerMove({ col, row });
                } else {
                    return;
                }
            }
        },
        onPointerMove: (e) => {
            if (state.phase === 'prepare') {
                if (!state.draggingUnitKey) return;
                const coord = mapApi.findNearestCoordFromEvent(e);
                mapApi.setHoverCoord(coord);
                return;
            }
            if (state.phase === 'battle') {
                if (!state.awaitingAction) return;
                const coord = mapApi.findNearestCoordFromEvent(e);
                updateHoverHint(coord);
            }
        },
        onPointerUp: (e) => {
            if (!state.draggingUnitKey) return;
            if (state.draggingUnitPointerId !== e.pointerId) return;
            const coord = mapApi.findNearestCoordFromEvent(e);
            const fromKey = state.draggingUnitKey;
            state.draggingUnitKey = null;
            state.draggingUnitPointerId = null;
            mapApi.setHoverCoord(null);
            const moved = moveAllyUnit(fromKey, coord);
            if (moved) {
                mapApi.render();
                prepareApi.renderPrepUI();
            } else {
                mapApi.render();
            }
        },
    });

    if (hexMap) {
        hexMap.addEventListener('pointerleave', () => {
            updateHoverHint(null);
        });
    }

    startBattleBtn.addEventListener('click', function() {
        battleApi.startBattlePhase();
    });

    resetPlacementBtn.addEventListener('click', function() {
        prepareApi.resetPlacement();
    });

    if (battleSkipTurnBtn) {
        battleSkipTurnBtn.addEventListener('click', function() {
            if (state.phase !== 'battle' || !state.awaitingAction || !state.activeUnitKey) return;
            const unit = state.units.get(state.activeUnitKey);
            const background = unit?.background || (unit?.team === 'enemy' ? '敌方' : '我方');
            appendBattleLog(`${background} 跳过回合（消耗AP 0）`);
            battleApi.finalizePlayerAction();
        });
    }

    return {
        loadBattle,
        startPreparePhase: prepareApi.startPreparePhase,
        startBattlePhase: battleApi.startBattlePhase
    };
}
