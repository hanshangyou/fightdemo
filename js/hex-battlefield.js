import { initHexMapEditor } from './hex-map-editor.js';
import { initHexBattle } from './hex-battle.js';

export function initHexBattlefield(options = {}) {
    const ids = options.ids || {};
    const getEl = (key, fallback) => document.getElementById(ids[key] || fallback);
    const elements = {
        hexMap: getEl('hexMap', 'hex-map'),
        toggleEditorBtn: getEl('toggleEditorBtn', 'toggle-editor'),
        editorBar: getEl('editorBar', 'editor-bar'),
        editorSaveDefaultBtn: getEl('editorSaveDefaultBtn', 'editor-save-default'),
        editorSaveStageBtn: getEl('editorSaveStageBtn', 'editor-save-stage'),
        editorResetBtn: getEl('editorResetBtn', 'editor-reset'),
        coordDisplayEl: getEl('coordDisplayEl', 'map-coord-display'),
        stageNameEl: getEl('stageNameEl', 'stage-name'),
        phaseLabelEl: getEl('phaseLabelEl', 'phase-label'),
        enemyCountEl: getEl('enemyCountEl', 'enemy-count'),
        playerCountEl: getEl('playerCountEl', 'player-count'),
        playerPoolEl: getEl('playerPoolEl', 'player-pool'),
        enemyPoolEl: getEl('enemyPoolEl', 'enemy-pool'),
        startBattleBtn: getEl('startBattleBtn', 'start-battle-btn'),
        resetPlacementBtn: getEl('resetPlacementBtn', 'reset-placement-btn'),
        battlePanelEl: getEl('battlePanelEl', 'battle-panel'),
        battleStageNameEl: getEl('battleStageNameEl', 'battle-stage-name'),
        battleRoundEl: getEl('battleRoundEl', 'battle-round'),
        battleStatusEl: getEl('battleStatusEl', 'battle-status'),
        turnOrderEl: getEl('turnOrderEl', 'turn-order'),
        turnOrderListEl: getEl('turnOrderListEl', 'turn-order-list'),
        battleLogEl: getEl('battleLogEl', 'battle-log'),
        battleLogListEl: getEl('battleLogListEl', 'battle-log-list'),
        battleActionLayoutEl: getEl('battleActionLayoutEl', 'battle-action-layout'),
        battleActiveUnitEl: getEl('battleActiveUnitEl', 'battle-active-unit'),
        battleTargetListEl: getEl('battleTargetListEl', 'battle-target-list'),
        battleSkipTurnBtn: getEl('battleSkipTurnBtn', 'battle-skip-turn-btn'),
    };

    const mapApi = initHexMapEditor(elements, options.mapOptions || {});
    const battleApi = initHexBattle({ mapApi, elements, config: options.battleConfig || {} });
    return { mapApi, battleApi, elements };
}
