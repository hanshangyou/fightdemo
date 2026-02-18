import { getPlayableCharacterPool, getCharacterPool } from './GachaSystem.js';

export function createPreparePhase({ state, mapApi, elements, helpers, uiHandlers }) {
    const {
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
    } = elements;

    function updatePrepareHint() {
        if (state.phase === 'battle') return;
        helpers.setBattleLogVisible(false);
    }

    function getEnemyTemplates() {
        const pool = getCharacterPool();
        const map = new Map(pool.map(c => [c.id, c]));
        return (state.stage?.enemies || []).map(id => map.get(id)).filter(Boolean);
    }

    function getEnemyPoolTemplates() {
        const pool = getCharacterPool();
        const map = new Map(pool.map(c => [c.id, c]));
        const spawns = Array.isArray(state.stage?.enemySpawns) ? state.stage.enemySpawns : null;
        let ids = [];
        if (spawns && spawns.length) {
            ids = spawns.map(s => s?.enemyId).filter(Boolean);
        }
        if (!ids.length) {
            ids = state.stage?.enemies || [];
        }
        return ids.map(id => map.get(id)).filter(Boolean);
    }

    function buildPlayerPool() {
        if (Array.isArray(state.external?.playerUnits) && state.external.playerUnits.length) {
            state.playerPool = state.external.playerUnits.map(c => ({
                id: c.id,
                background: c.background,
                icon: c.icon,
                baseStats: {
                    maxHp: c.maxHp,
                    attack: c.attack,
                    defense: c.defense,
                    speed: c.speed
                },
                templateId: c.templateId ?? c.id,
                source: c,
                sourceId: c.id,
                used: false
            }));
            state.maxTeamSize = Math.min(state.maxTeamSize, state.playerPool.length || state.maxTeamSize);
            return;
        }
        const pool = getPlayableCharacterPool();
        state.playerPool = pool.map(c => ({ ...c, used: false }));
    }

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function placeEnemies() {
        const enemyCells = Array.from(mapApi.state.cells.values()).filter(c => c.kind === 'enemy');
        const available = shuffle(enemyCells.map(c => mapApi.key(c.col, c.row)));
        const usedSlots = new Set();
        const pending = [];
        const spawns = Array.isArray(state.stage?.enemySpawns) ? state.stage.enemySpawns : null;
        const enemyIds = state.stage?.enemies || [];
        let enemies = [];

        if (Array.isArray(state.external?.enemyUnits) && state.external.enemyUnits.length) {
            enemies = state.external.enemyUnits.map(c => ({
                id: c.id,
                background: c.background,
                icon: c.icon,
                team: 'enemy',
                templateId: c.templateId ?? c.id,
                source: c,
                sourceId: c.id,
                stats: {
                    maxHp: c.maxHp,
                    hp: c.hp ?? c.maxHp,
                    attack: c.attack,
                    defense: c.defense,
                    speed: c.speed
                }
            }));
        } else {
            const templates = getEnemyTemplates();
            enemies = templates.map(t => ({
                id: t.id,
                background: t.background,
                icon: t.icon,
                team: 'enemy',
                templateId: t.id,
                stats: { ...t.baseStats, hp: t.baseStats.maxHp }
            }));
        }

        const usedUnits = new Set();
        const takeUnitByTemplateId = (templateId) => {
            const unit = enemies.find(u => !usedUnits.has(u) && u.templateId === templateId);
            if (unit) usedUnits.add(unit);
            return unit || null;
        };
        const takeUnitByIndex = (idx) => {
            const unit = enemies[idx];
            if (unit && !usedUnits.has(unit)) {
                usedUnits.add(unit);
                return unit;
            }
            return null;
        };

        if (spawns && spawns.length) {
            spawns.forEach((spawn, index) => {
                const templateId = spawn?.enemyId || enemyIds[index];
                const unit = templateId ? takeUnitByTemplateId(templateId) : takeUnitByIndex(index);
                if (!unit) return;
                if (!spawn || !Number.isFinite(spawn.col) || !Number.isFinite(spawn.row)) {
                    pending.push(unit);
                    return;
                }
                const cell = mapApi.getCellAt(spawn.col, spawn.row);
                const k = mapApi.key(spawn.col, spawn.row);
                if (!cell || cell.kind !== 'enemy' || usedSlots.has(k)) {
                    pending.push(unit);
                    return;
                }
                usedSlots.add(k);
                helpers.setUnit(spawn.col, spawn.row, { ...unit });
            });
        } else {
            pending.push(...enemies);
        }

        const remaining = available.filter(k => !usedSlots.has(k));
        pending.forEach((unit, index) => {
            const slotKey = remaining[index];
            if (!slotKey || !unit) return;
            const { col, row } = mapApi.parseKey(slotKey);
            helpers.setUnit(col, row, { ...unit });
        });
    }

    function placePlayerAt(coord, template) {
        if (!coord || !template) return false;
        const cell = mapApi.getCellAt(coord.col, coord.row);
        if (!cell || cell.kind !== 'ally') return false;
        if (helpers.isOccupied(coord.col, coord.row)) return false;
        const placedCount = Array.from(state.units.values()).filter(u => u.team === 'ally').length;
        if (placedCount >= state.maxTeamSize) return false;
        helpers.setUnit(coord.col, coord.row, { id: template.id, background: template.background, icon: template.icon, team: 'ally', templateId: template.templateId ?? template.id, source: template.source, sourceId: template.sourceId ?? template.id, stats: { ...template.baseStats, hp: template.baseStats.maxHp } });
        template.used = true;
        state.selectedUnitId = null;
        return true;
    }

    function removePlayerPlacementById(id) {
        let removed = false;
        Array.from(state.units.entries()).some(([k, u]) => {
            if (u.team === 'ally' && u.id === id) {
                state.units.delete(k);
                removed = true;
                return true;
            }
            return false;
        });
        const template = state.playerPool.find(t => t.id === id);
        if (template) template.used = false;
        if (state.selectedUnitId === id) state.selectedUnitId = null;
        if (removed) {
            mapApi.render();
            uiHandlers.renderPrepUI();
        }
    }

    function startPreparePhase() {
        state.phase = 'prepare';
        state.awaitingAction = false;
        state.turnOrder = [];
        state.activeUnitKey = null;
        state.validMoves = null;
        state.validAttacks = null;
        state.lastLogTurnKey = null;
        state.lastLogRound = 0;
        mapApi.setActiveUnitKey(null);
        mapApi.setHighlights(null, null);
        mapApi.render();
        renderPrepUI();
        helpers.clearBattleLog();
        uiHandlers.renderBattleActionPanels();
        updatePrepareHint();
    }

    function resetPlacement() {
        helpers.clearAllyUnits();
        buildPlayerPool();
        const enemyPlaced = Array.from(state.units.values()).some(u => u.team === 'enemy');
        if (!enemyPlaced) placeEnemies();
        startPreparePhase();
    }

    function renderPrepUI() {
        if (!state.stage) return;
        const enemyTotal = state.stage.enemies.length;
        const enemyPlaced = Array.from(state.units.values()).filter(u => u.team === 'enemy').length;
        const playerPlaced = Array.from(state.units.values()).filter(u => u.team === 'ally').length;
        stageNameEl.textContent = state.stage.name || '准备阶段';
        phaseLabelEl.textContent = state.phase === 'battle' ? '战斗阶段' : '准备阶段';
        enemyCountEl.textContent = `敌方: ${enemyPlaced}/${enemyTotal}`;
        playerCountEl.textContent = `我方: ${playerPlaced}/${state.maxTeamSize}`;
        playerPoolEl.innerHTML = '';
        if (state.phase !== 'battle') {
            state.playerPool.forEach(template => {
                const rarity = (template.rarity || template.source?.rarity || 'COMMON').toLowerCase();
                const baseStats = template.baseStats || template.stats || {};
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'character-card';
                if (template.used) card.classList.add('placed');
                if (state.selectedUnitId === template.id) card.classList.add('selected');
                card.classList.add(`rarity-${rarity}`);
                card.dataset.id = template.id;
                card.innerHTML = `
                    <div class="character-icon">${template.icon}</div>
                    <div class="character-name">${template.background}</div>
                    <div class="character-stats">
                        <span>❤️${baseStats.maxHp ?? '-'}</span>
                        <span>💨${baseStats.speed ?? '-'}</span>
                        <span>⚔️${baseStats.attack ?? '-'}</span>
                        <span>🛡️${baseStats.defense ?? '-'}</span>
                    </div>
                `;
                card.addEventListener('click', () => {
                    if (template.used) {
                        removePlayerPlacementById(template.id);
                        return;
                    }
                    state.selectedUnitId = template.id;
                    renderPrepUI();
                });
                playerPoolEl.appendChild(card);
            });
        }
        if (enemyPoolEl) {
            const panel = enemyPoolEl.closest('.enemy-pool-panel');
            if (state.phase === 'battle') {
                enemyPoolEl.innerHTML = '';
                if (panel) panel.style.display = 'none';
            } else {
                if (panel) panel.style.display = 'flex';
                enemyPoolEl.innerHTML = '';
                const templates = getEnemyPoolTemplates();
                templates.forEach(template => {
                    const rarity = (template?.rarity || 'ENEMY').toLowerCase();
                    const baseStats = template?.baseStats || {};
                    const card = document.createElement('button');
                    card.type = 'button';
                    card.className = 'character-card enemy-readonly';
                    card.classList.add(`rarity-${rarity}`);
                    card.disabled = true;
                    card.innerHTML = `
                        <div class="character-icon">${template?.icon || '❔'}</div>
                        <div class="character-name">${template?.background || '敌人'}</div>
                        <div class="character-stats">
                            <span>❤️${baseStats.maxHp ?? '-'}</span>
                            <span>💨${baseStats.speed ?? '-'}</span>
                            <span>⚔️${baseStats.attack ?? '-'}</span>
                            <span>🛡️${baseStats.defense ?? '-'}</span>
                        </div>
                    `;
                    enemyPoolEl.appendChild(card);
                });
            }
        }
        const ready = playerPlaced === state.maxTeamSize;
        startBattleBtn.disabled = !ready || state.phase === 'battle';
        resetPlacementBtn.disabled = state.phase === 'battle';
        const actionButtonsEl = startBattleBtn?.closest('.action-buttons');
        if (actionButtonsEl) {
            actionButtonsEl.style.display = state.phase === 'battle' ? 'none' : 'flex';
        }
        const prepPanelEl = playerPoolEl?.closest('.prep-panel');
        if (prepPanelEl) {
            prepPanelEl.style.display = state.phase === 'battle' ? 'none' : 'flex';
        }
        if (battlePanelEl) {
            battlePanelEl.style.display = state.phase === 'battle' ? 'flex' : 'none';
        }
        turnOrderEl.style.display = state.phase === 'battle' ? 'grid' : 'none';
        uiHandlers.renderBattleActionPanels();
        updatePrepareHint();
    }

    return {
        renderPrepUI,
        startPreparePhase,
        resetPlacement,
        placePlayerAt,
        removePlayerPlacementById
    };
}
