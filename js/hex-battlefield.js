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
        startBattleBtn: getEl('startBattleBtn', 'start-battle-btn'),
        resetPlacementBtn: getEl('resetPlacementBtn', 'reset-placement-btn'),
        battlePanelEl: getEl('battlePanelEl', 'battle-panel'),
        battleStageNameEl: getEl('battleStageNameEl', 'battle-stage-name'),
        battleRoundEl: getEl('battleRoundEl', 'battle-round'),
        battleStatusEl: getEl('battleStatusEl', 'battle-status'),
        turnOrderEl: getEl('turnOrderEl', 'turn-order'),
        turnOrderListEl: getEl('turnOrderListEl', 'turn-order-list'),
        battleHintsEl: getEl('battleHintsEl', 'battle-hints'),
        hintTitleEl: getEl('hintTitleEl', 'hint-title'),
        hintMainEl: getEl('hintMainEl', 'hint-main'),
        hintSubEl: getEl('hintSubEl', 'hint-sub'),
    };

    const mapApi = initHexMapEditor(elements, options.mapOptions || {});
    const battleApi = initHexBattle({ mapApi, elements, config: options.battleConfig || {} });
    return { mapApi, battleApi, elements };
}
