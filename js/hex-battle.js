import { getPlayableCharacterPool, getCharacterPool } from './GachaSystem.js';
import { getStages } from './StageEditor.js';
import { getNeighbors, hexDistance } from './hex-coordinates.js';

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
        battleHintsEl,
        hintTitleEl,
        hintMainEl,
        hintSubEl,
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
        external: { ...config }
    };

    mapApi.setUnitProvider((col, row) => state.units.get(mapApi.key(col, row)));

    const hintState = {
        base: { title: '', main: '', sub: '' },
    };

    function setHintLines(title, main, sub) {
        if (!battleHintsEl) return;
        const empty = !title && !main && !sub;
        battleHintsEl.hidden = empty;
        hintTitleEl.textContent = title || '';
        hintMainEl.textContent = main || '';
        hintSubEl.textContent = sub || '';
        hintTitleEl.hidden = !title;
        hintMainEl.hidden = !main;
        hintSubEl.hidden = !sub;
    }

    function setBaseHint(title, main, sub) {
        hintState.base = { title, main, sub };
        setHintLines(title, main, sub);
    }

    function updatePrepareHint() {
        if (state.phase === 'battle') return;
        const playerPlaced = Array.from(state.units.values()).filter(u => u.team === 'ally').length;
        const selectedTemplate = state.playerPool.find(t => t.id === state.selectedUnitId);
        if (selectedTemplate && !selectedTemplate.used) {
            setBaseHint('布阵提示', `选择 ${selectedTemplate.name}，点击我方格子放置`, '拖拽已上阵单位可调整位置');
            return;
        }
        if (playerPlaced < state.maxTeamSize) {
            setBaseHint('布阵提示', '点击卡牌选择上阵，再点击我方格子放置', '拖拽已上阵单位可调整位置');
            return;
        }
        setBaseHint('布阵完成', '可以开始战斗', '点击开始战斗进入回合制');
    }

    function updateBattleHint() {
        if (state.phase !== 'battle') return;
        if (!state.awaitingAction || !state.activeUnitKey) {
            setBaseHint('交战提示', '敌方行动中', '');
            return;
        }
        const unit = state.units.get(state.activeUnitKey);
        const moveCount = state.validMoves?.size || 0;
        const attackCount = state.validAttacks?.size || 0;
        setBaseHint('交战提示', `轮到 ${unit?.name || '我方'} 行动，可移动 ${moveCount}，可攻击 ${attackCount}`, '点击蓝色格移动，点击红色格攻击');
    }

    function updateHoverHint(coord) {
        if (state.phase !== 'battle' || !state.awaitingAction) return;
        if (!coord) {
            setHintLines(hintState.base.title, hintState.base.main, hintState.base.sub);
            return;
        }
        const key = mapApi.key(coord.col, coord.row);
        let sub = hintState.base.sub;
        if (state.validAttacks?.has(key)) {
            const target = state.units.get(key);
            const hp = target?.stats?.hp ?? 0;
            const maxHp = target?.stats?.maxHp ?? hp;
            sub = `攻击 ${target?.name || '敌方'} HP ${hp}/${maxHp}`;
        } else if (state.validMoves?.has(key)) {
            sub = `移动到 (${coord.col}, ${coord.row})`;
        }
        setHintLines(hintState.base.title, hintState.base.main, sub);
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
                name: c.name,
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
                name: c.name,
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
                name: t.name,
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
                setUnit(spawn.col, spawn.row, { ...unit });
            });
        } else {
            pending.push(...enemies);
        }

        const remaining = available.filter(k => !usedSlots.has(k));
        pending.forEach((unit, index) => {
            const slotKey = remaining[index];
            if (!slotKey || !unit) return;
            const { col, row } = mapApi.parseKey(slotKey);
            setUnit(col, row, { ...unit });
        });
    }

    function placePlayerAt(coord, template) {
        if (!coord || !template) return false;
        const cell = mapApi.getCellAt(coord.col, coord.row);
        if (!cell || cell.kind !== 'ally') return false;
        if (isOccupied(coord.col, coord.row)) return false;
        const placedCount = Array.from(state.units.values()).filter(u => u.team === 'ally').length;
        if (placedCount >= state.maxTeamSize) return false;
        setUnit(coord.col, coord.row, { id: template.id, name: template.name, icon: template.icon, team: 'ally', templateId: template.templateId ?? template.id, source: template.source, sourceId: template.sourceId ?? template.id, stats: { ...template.baseStats, hp: template.baseStats.maxHp } });
        template.used = true;
        state.selectedUnitId = null;
        return true;
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

    function moveUnit(fromKey, toCoord) {
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
            renderPrepUI();
        }
    }

    function startPreparePhase() {
        state.phase = 'prepare';
        state.awaitingAction = false;
        state.turnOrder = [];
        state.activeUnitKey = null;
        state.validMoves = null;
        state.validAttacks = null;
        mapApi.setActiveUnitKey(null);
        mapApi.setHighlights(null, null);
        mapApi.render();
        renderPrepUI();
        updatePrepareHint();
    }

    function resetPlacement() {
        clearAllyUnits();
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
                    <div class="character-name">${template.name}</div>
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
                        <div class="character-name">${template?.name || '敌人'}</div>
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
        if (battlePanelEl) {
            battlePanelEl.style.display = state.phase === 'battle' ? 'flex' : 'none';
        }
        turnOrderEl.style.display = state.phase === 'battle' ? 'grid' : 'none';
        updatePrepareHint();
    }

    function updateBattleUI() {
        if (!state.stage) return;
        if (battleStageNameEl) {
            battleStageNameEl.textContent = state.stage.name || '战斗阶段';
        }
        if (battleRoundEl) {
            battleRoundEl.textContent = `回合 ${state.round}/${state.roundLimit}`;
        }
        const allyAlive = Array.from(state.units.values()).filter(u => u.team === 'ally').length;
        const enemyAlive = Array.from(state.units.values()).filter(u => u.team === 'enemy').length;
        if (battleStatusEl) {
            battleStatusEl.textContent = `我方: ${allyAlive}  敌方: ${enemyAlive}`;
        }
    }

    function renderTurnOrder() {
        turnOrderListEl.innerHTML = '';
        const remaining = state.turnOrder.slice(state.turnIndex);
        const createOrderCard = (unit, isActive, isNextRound) => {
            const card = document.createElement('div');
            card.className = `order-card ${unit.team}`;
            if (isActive) card.classList.add('active');
            if (isNextRound) card.classList.add('next-round');
            const maxHp = Number.isFinite(unit.stats?.maxHp) ? unit.stats.maxHp : (unit.stats?.hp ?? 0);
            const hp = Number.isFinite(unit.stats?.hp) ? unit.stats.hp : maxHp;
            const hpPercent = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
            const attack = unit.stats?.attack ?? '-';
            const defense = unit.stats?.defense ?? '-';
            card.innerHTML = `
                <div class="order-icon">${unit.icon || '❔'}</div>
                <div class="order-hp">
                    <div class="order-hp-bar">
                        <div class="order-hp-fill" style="width: ${hpPercent}%"></div>
                    </div>
                    <div class="order-hp-text">${hp}/${maxHp || '-'}</div>
                </div>
                <div class="order-stats">
                    <span>⚔️${attack}</span>
                    <span>🛡️${defense}</span>
                </div>
            `;
            return card;
        };
        remaining.forEach(k => {
            const unit = state.units.get(k);
            if (!unit) return;
            turnOrderListEl.appendChild(createOrderCard(unit, k === state.activeUnitKey, false));
        });
        if (state.turnOrder.length) {
            if (remaining.length) {
                const divider = document.createElement('div');
                divider.className = 'order-divider';
                divider.innerHTML = '<span>⏳</span>';
                turnOrderListEl.appendChild(divider);
            }
            state.turnOrder.forEach(k => {
                const unit = state.units.get(k);
                if (!unit) return;
                turnOrderListEl.appendChild(createOrderCard(unit, false, true));
            });
        }
    }

    function computeActionOptions(unitKey) {
        const coord = mapApi.parseKey(unitKey);
        const neighbors = getNeighbors(coord.col, coord.row);
        const moves = new Set();
        const attacks = new Set();
        neighbors.forEach(n => {
            const cell = mapApi.getCellAt(n.col, n.row);
            if (!cell) return;
            const unit = getUnitAt(n.col, n.row);
            if (!unit) {
                moves.add(mapApi.key(n.col, n.row));
                return;
            }
            if (unit.team !== state.units.get(unitKey)?.team) {
                attacks.add(mapApi.key(n.col, n.row));
            }
        });
        return { moves, attacks };
    }

    function nextTurn() {
        state.turnIndex += 1;
        if (state.turnIndex >= state.turnOrder.length) {
            state.round += 1;
            buildTurnOrder();
        }
        stepTurn();
    }

    function buildTurnOrder() {
        const alive = Array.from(state.units.entries()).map(([k, u]) => ({
            key: k,
            speed: u.stats?.speed || 1,
        }));
        alive.sort((a, b) => b.speed - a.speed);
        state.turnOrder = alive.map(a => a.key);
        state.turnIndex = 0;
    }

    function getWinner() {
        const allyAlive = Array.from(state.units.values()).some(u => u.team === 'ally');
        const enemyAlive = Array.from(state.units.values()).some(u => u.team === 'enemy');
        if (!allyAlive && !enemyAlive) return 'B';
        if (!allyAlive) return 'B';
        if (!enemyAlive) return 'A';
        if (state.round > state.roundLimit) return 'B';
        return null;
    }

    function selectEnemyTarget(fromKey) {
        const from = mapApi.parseKey(fromKey);
        const enemies = Array.from(state.units.entries()).filter(([, u]) => u.team === 'ally');
        if (!enemies.length) return null;
        enemies.sort((a, b) => {
            const da = hexDistance(from, mapApi.parseKey(a[0]));
            const db = hexDistance(from, mapApi.parseKey(b[0]));
            return da - db;
        });
        return enemies[0];
    }

    function enemyAct(unitKey) {
        const unit = state.units.get(unitKey);
        if (!unit) return;
        const target = selectEnemyTarget(unitKey);
        if (!target) return;
        const targetCoord = mapApi.parseKey(target[0]);
        const options = computeActionOptions(unitKey);
        if (options.attacks.size) {
            const targetKey = Array.from(options.attacks)[0];
            applyAttack(unitKey, targetKey);
            return;
        }
        const neighbors = Array.from(options.moves).map(mapApi.parseKey);
        let best = null;
        let bestDist = Infinity;
        neighbors.forEach(n => {
            const d = hexDistance(n, targetCoord);
            if (d < bestDist) {
                bestDist = d;
                best = n;
            }
        });
        if (best) {
            moveUnit(unitKey, best);
        }
    }

    function applyAttack(fromKey, toKey) {
        const attacker = state.units.get(fromKey);
        const target = state.units.get(toKey);
        if (!attacker || !target) return;
        const atk = attacker.stats?.attack || 1;
        const def = target.stats?.defense || 0;
        const dmg = Math.max(1, atk - def);
        target.stats.hp = Math.max(0, target.stats.hp - dmg);
        if (attacker.team === 'ally') {
            const sourceId = attacker.sourceId ?? attacker.id;
            const stats = state.damageStats.get(sourceId);
            if (stats) {
                stats.totalDamage += dmg;
                stats.attacks += 1;
                state.totalDamage += dmg;
            }
        }
        if (target.stats.hp <= 0) {
            state.units.delete(toKey);
            if (attacker.team === 'ally') {
                const sourceId = attacker.sourceId ?? attacker.id;
                const stats = state.damageStats.get(sourceId);
                if (stats) stats.kills += 1;
            }
        }
    }

    function stepTurn() {
        const winner = getWinner();
        if (winner) {
            finalizeBattle(winner);
            return;
        }
        const currentKey = state.turnOrder[state.turnIndex];
        if (!currentKey || !state.units.has(currentKey)) {
            nextTurn();
            return;
        }
        state.activeUnitKey = currentKey;
        mapApi.setActiveUnitKey(currentKey);
        const unit = state.units.get(currentKey);
        if (unit.team === 'ally') {
            state.awaitingAction = true;
            const options = computeActionOptions(currentKey);
            state.validMoves = options.moves;
            state.validAttacks = options.attacks;
            mapApi.setHighlights(state.validMoves, state.validAttacks);
            mapApi.render();
            renderTurnOrder();
            updateBattleUI();
            updateBattleHint();
            updateHoverHint(null);
            return;
        }
        state.awaitingAction = false;
        updateBattleHint();
        const options = computeActionOptions(currentKey);
        if (options.attacks.size) {
            const targetKey = Array.from(options.attacks)[0];
            applyAttack(currentKey, targetKey);
        } else {
            enemyAct(currentKey);
        }
        mapApi.setHighlights(null, null);
        mapApi.render();
        renderTurnOrder();
        updateBattleUI();
        state.turnCount += 1;
        nextTurn();
    }

    function startBattlePhase() {
        state.phase = 'battle';
        state.selectedUnitId = null;
        state.round = 1;
        state.turnCount = 0;
        state.totalDamage = 0;
        state.damageStats = new Map();
        Array.from(state.units.values()).filter(u => u.team === 'ally').forEach(u => {
            const id = u.sourceId ?? u.id;
            state.damageStats.set(id, { unit: u, totalDamage: 0, attacks: 0, kills: 0 });
        });
        buildTurnOrder();
        state.turnIndex = 0;
        renderPrepUI();
        updateBattleUI();
        renderTurnOrder();
        updateBattleHint();
        stepTurn();
    }

    function finalizeBattle(winner) {
        state.phase = 'finished';
        state.awaitingAction = false;
        state.validMoves = null;
        state.validAttacks = null;
        state.activeUnitKey = null;
        mapApi.setActiveUnitKey(null);
        mapApi.setHighlights(null, null);
        mapApi.render();
        updateBattleUI();
        const aliveAllyIds = new Set(Array.from(state.units.values()).filter(u => u.team === 'ally').map(u => u.sourceId ?? u.id));
        const deadAllyIds = state.playerPool.map(t => t.sourceId ?? t.id).filter(id => !aliveAllyIds.has(id));
        const damageStats = Array.from(state.damageStats.entries()).map(([id, stats]) => ({
            character: stats.unit?.source || stats.unit,
            totalDamage: stats.totalDamage,
            attacks: stats.attacks,
            kills: stats.kills
        }));
        if (typeof state.external?.onBattleEnd === 'function') {
            state.external.onBattleEnd({
                winner,
                damageStats,
                totalDamage: state.totalDamage,
                turnCount: state.turnCount,
                deadAllyIds
            });
        }
    }

    mapApi.setPlayHandlers({
        onPointerDown: (e, cellEl) => {
            if (!cellEl) return;
            if (state.phase === 'prepare') {
                const col = Number(cellEl.dataset.col);
                const row = Number(cellEl.dataset.row);
                const selectedTemplate = state.playerPool.find(t => t.id === state.selectedUnitId);
                if (selectedTemplate) {
                    const placed = placePlayerAt({ col, row }, selectedTemplate);
                    if (placed) {
                        mapApi.render();
                        renderPrepUI();
                    }
                    return;
                }
                const unit = getUnitAt(col, row);
                if (unit && unit.team === 'ally') {
                    state.draggingUnitKey = mapApi.key(col, row);
                    state.draggingUnitPointerId = e.pointerId;
                    cellEl.setPointerCapture(e.pointerId);
                    mapApi.setHoverCoord({ col, row });
                    updatePrepareHint();
                }
                return;
            }
            if (state.phase === 'battle' && state.awaitingAction && state.activeUnitKey) {
                const col = Number(cellEl.dataset.col);
                const row = Number(cellEl.dataset.row);
                const targetKey = mapApi.key(col, row);
                if (state.validAttacks?.has(targetKey)) {
                    applyAttack(state.activeUnitKey, targetKey);
                } else if (state.validMoves?.has(targetKey)) {
                    moveUnit(state.activeUnitKey, { col, row });
                } else {
                    return;
                }
                state.awaitingAction = false;
                state.validMoves = null;
                state.validAttacks = null;
                mapApi.setHighlights(null, null);
                mapApi.render();
                renderTurnOrder();
                updateBattleUI();
                updateHoverHint(null);
                state.turnCount += 1;
                nextTurn();
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
                renderPrepUI();
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

    function loadBattle(battleConfig = {}) {
        state.external = { ...state.external, ...battleConfig };
        if (Number.isFinite(battleConfig.stageId)) {
            mapApi.setStageId(battleConfig.stageId);
        }
        clearUnits();
        initStage();
        resetPlacement();
    }

    initStage();
    resetPlacement();

    startBattleBtn.addEventListener('click', function() {
        startBattlePhase();
    });

    resetPlacementBtn.addEventListener('click', function() {
        resetPlacement();
    });

    return {
        loadBattle,
        startPreparePhase,
        startBattlePhase
    };
}
