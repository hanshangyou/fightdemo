import { getNeighbors, hexDistance, offsetToAxial, axialToOffset } from '../objects/hex-coordinates.js';

export function createBattlePhase({ state, mapApi, elements, helpers, uiHandlers }) {
    const AP_PER_TURN = 7;
    const AP_MOVE_COST = 2;
    const {
        battleStageNameEl,
        battleRoundEl,
        battleStatusEl,
        turnOrderListEl,
        battleActionLayoutEl,
        battleActiveUnitEl,
        battleTargetListEl,
        battleSkipTurnBtn
    } = elements;

    function updateBattleHint() {
        if (state.phase !== 'battle') return;
        helpers.setBattleLogVisible(true);
        const currentKey = state.turnOrder[state.turnIndex];
        if (!currentKey || !state.units.has(currentKey)) return;
        if (state.lastLogTurnKey === currentKey && state.lastLogRound === state.round) return;
        state.lastLogTurnKey = currentKey;
        state.lastLogRound = state.round;
        const unit = state.units.get(currentKey);
        const background = unit?.background || (unit?.team === 'enemy' ? '敌方' : '我方');
        helpers.appendBattleLog(`回合 ${state.round}：${background} 行动`);
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
            const str = unit.stats?.str ?? '-';
            const dex = unit.stats?.dex ?? '-';
            card.innerHTML = `
                <div class="order-icon">${unit.icon || '❔'}</div>
                <div class="order-hp">
                    <div class="order-hp-bar">
                        <div class="order-hp-fill" style="width: ${hpPercent}%"></div>
                    </div>
                    <div class="order-hp-text">${hp}/${maxHp || '-'}</div>
                </div>
                <div class="order-stats">
                    <span>💪${str}</span>
                    <span>🏃${dex}</span>
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

    function renderBattleActionPanels() {
        if (battleActionLayoutEl) {
            battleActionLayoutEl.style.display = state.phase === 'battle' ? 'grid' : 'none';
        }
        if (!battleActiveUnitEl && !battleTargetListEl) return;
        const activeUnit = state.activeUnitKey ? state.units.get(state.activeUnitKey) : null;
        if (battleActiveUnitEl) {
            battleActiveUnitEl.innerHTML = '';
            if (!activeUnit) {
                const empty = document.createElement('div');
                empty.className = 'battle-empty';
                empty.textContent = '暂无行动单位';
                battleActiveUnitEl.appendChild(empty);
            } else {
                const maxHp = Number.isFinite(activeUnit.stats?.maxHp) ? activeUnit.stats.maxHp : (activeUnit.stats?.hp ?? 0);
                const hp = Number.isFinite(activeUnit.stats?.hp) ? activeUnit.stats.hp : maxHp;
                const hpPercent = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
                const str = activeUnit.stats?.str ?? '-';
                const dex = activeUnit.stats?.dex ?? '-';
                const speed = activeUnit.stats?.speed ?? '-';
                const ap = Number.isFinite(activeUnit.ap) ? activeUnit.ap : 0;
                const weapon = activeUnit.equippedWeapon || activeUnit.source?.equippedWeapon || null;
                const weaponIcon = weapon?.icon || '🗡️';
                const weaponName = weapon?.name || '未装备';
                const weaponDamage = weapon ? `${weapon.damageMin}-${weapon.damageMax}` : '';
                const card = document.createElement('div');
                card.className = `battle-active-card ${activeUnit.team}`;
                card.innerHTML = `
                    <div class="battle-active-header">
                        <div class="order-icon">${activeUnit.icon || '❔'}</div>
                        <div class="battle-active-name">${activeUnit.background || '未知角色'}</div>
                        <span class="battle-active-ap">✨${ap}</span>
                    </div>
                    <div class="order-hp">
                        <div class="order-hp-bar">
                            <div class="order-hp-fill" style="width: ${hpPercent}%"></div>
                        </div>
                        <div class="order-hp-text">${hp}/${maxHp || '-'}</div>
                    </div>
                    <div class="order-stats">
                        <span>💪${str}</span>
                        <span>🏃${dex}</span>
                        <span>💨${speed}</span>
                    </div>
                    <div class="battle-weapon">
                        <div class="battle-weapon-icon">${weaponIcon}</div>
                        <div class="battle-weapon-name">${weaponName}</div>
                        <div class="battle-weapon-dmg">${weaponDamage}</div>
                    </div>
                `;
                battleActiveUnitEl.appendChild(card);
            }
        }
        if (battleTargetListEl) {
            battleTargetListEl.innerHTML = '';
            const canAct = state.phase === 'battle' && state.awaitingAction && activeUnit && activeUnit.team === 'ally';
            if (battleSkipTurnBtn) battleSkipTurnBtn.disabled = !canAct;
            if (!canAct) {
                const empty = document.createElement('div');
                empty.className = 'battle-empty';
                empty.textContent = '等待行动';
                battleTargetListEl.appendChild(empty);
                return;
            }
            const targets = Array.from(state.validAttacks ?? []).map(k => ({ key: k, unit: state.units.get(k) })).filter(t => t.unit);
            if (!targets.length) {
                const empty = document.createElement('div');
                empty.className = 'battle-empty';
                empty.textContent = '范围内无目标';
                battleTargetListEl.appendChild(empty);
                return;
            }
            targets.forEach(({ key, unit }) => {
                const card = document.createElement('button');
                card.type = 'button';
                card.className = `order-card battle-target-card ${unit.team}`;
                const maxHp = Number.isFinite(unit.stats?.maxHp) ? unit.stats.maxHp : (unit.stats?.hp ?? 0);
                const hp = Number.isFinite(unit.stats?.hp) ? unit.stats.hp : maxHp;
                const hpPercent = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
                const str = unit.stats?.str ?? '-';
                const dex = unit.stats?.dex ?? '-';
                card.innerHTML = `
                    <div class="order-icon">${unit.icon || '❔'}</div>
                    <div class="order-hp">
                        <div class="order-hp-bar">
                            <div class="order-hp-fill" style="width: ${hpPercent}%"></div>
                        </div>
                        <div class="order-hp-text">${hp}/${maxHp || '-'}</div>
                    </div>
                    <div class="order-stats">
                        <span>💪${str}</span>
                        <span>🏃${dex}</span>
                    </div>
                `;
                card.addEventListener('click', () => {
                    if (!canAct) return;
                    handlePlayerAttack(key);
                });
                battleTargetListEl.appendChild(card);
            });
        }
    }

    function finalizePlayerAction() {
        state.awaitingAction = false;
        state.validMoves = null;
        state.validAttacks = null;
        mapApi.setHighlights(null, null);
        mapApi.render();
        renderTurnOrder();
        updateBattleUI();
        helpers.updateHoverHint(null);
        renderBattleActionPanels();
        state.turnCount += 1;
        nextTurn();
    }

    function computeActionOptions(unitKey) {
        const coord = mapApi.parseKey(unitKey);
        const neighbors = getNeighbors(coord.col, coord.row);
        const moves = new Set();
        const attacks = new Set();
        const unit = state.units.get(unitKey);
        const weapon = unit?.equippedWeapon || unit?.source?.equippedWeapon || null;
        const range = Number.isFinite(weapon?.range) ? weapon.range : 1;
        const attackCoords = getAttackCoords(coord, range);
        neighbors.forEach(n => {
            const cell = mapApi.getCellAt(n.col, n.row);
            if (!cell) return;
            const unit = helpers.getUnitAt(n.col, n.row);
            if (!unit) {
                moves.add(mapApi.key(n.col, n.row));
                return;
            }
        });
        attackCoords.forEach(pos => {
            const cell = mapApi.getCellAt(pos.col, pos.row);
            if (!cell) return;
            const target = helpers.getUnitAt(pos.col, pos.row);
            if (target && target.team !== unit?.team) {
                attacks.add(mapApi.key(pos.col, pos.row));
            }
        });
        return { moves, attacks };
    }

    function getAttackCoords(coord, range) {
        if (range <= 1) {
            return getNeighbors(coord.col, coord.row);
        }
        if (range === 2) {
            return getRangeTwoLineCoords(coord);
        }
        if (range >= 3) {
            return getRangeThreeCoords(coord);
        }
        return [];
    }

    function getRangeTwoLineCoords(coord) {
        const axial = offsetToAxial(coord.col, coord.row);
        const dirs = [
            { q: 1, r: 0 },
            { q: 1, r: -1 },
            { q: 0, r: -1 },
            { q: -1, r: 0 },
            { q: -1, r: 1 },
            { q: 0, r: 1 }
        ];
        const results = [];
        dirs.forEach(d => {
            const step1 = axialToOffset(axial.q + d.q, axial.r + d.r);
            const step2 = axialToOffset(axial.q + d.q * 2, axial.r + d.r * 2);
            results.push(step1, step2);
        });
        return results;
    }

    function getRangeTwoRingCoords(coord) {
        const ring = new Map();
        const frontier = [coord];
        const visited = new Set([mapApi.key(coord.col, coord.row)]);
        for (let i = 0; i < 2; i += 1) {
            const next = [];
            frontier.forEach(pos => {
                getNeighbors(pos.col, pos.row).forEach(n => {
                    const k = mapApi.key(n.col, n.row);
                    if (visited.has(k)) return;
                    visited.add(k);
                    next.push(n);
                });
            });
            frontier.length = 0;
            next.forEach(n => frontier.push(n));
        }
        visited.forEach(k => {
            const pos = mapApi.parseKey(k);
            if (hexDistance(coord, pos) === 2) {
                ring.set(k, pos);
            }
        });
        return Array.from(ring.values());
    }

    function getRangeThreeCoords(coord) {
        const ring = getRangeTwoRingCoords(coord);
        const axial = offsetToAxial(coord.col, coord.row);
        const dirs = [
            { q: 1, r: 0 },
            { q: 1, r: -1 },
            { q: 0, r: -1 },
            { q: -1, r: 0 },
            { q: -1, r: 1 },
            { q: 0, r: 1 }
        ];
        const line = [];
        dirs.forEach(d => {
            const step3 = axialToOffset(axial.q + d.q * 3, axial.r + d.r * 3);
            line.push(step3);
        });
        return [...ring, ...line];
    }

    function getAp(unit) {
        return Number.isFinite(unit?.ap) ? unit.ap : 0;
    }

    function getAttackCost(unit) {
        const weapon = unit?.equippedWeapon || unit?.source?.equippedWeapon || null;
        const cost = Number.isFinite(weapon?.apCost) ? weapon.apCost : 3;
        return Math.max(0, cost);
    }

    function setUnitAp(unit) {
        unit.ap = AP_PER_TURN;
    }

    function getActionOptionsWithAp(unitKey) {
        const options = computeActionOptions(unitKey);
        const unit = state.units.get(unitKey);
        const ap = getAp(unit);
        if (ap < AP_MOVE_COST) options.moves.clear();
        if (ap < getAttackCost(unit)) options.attacks.clear();
        return options;
    }

    function hasAdjacentEnemy(unitKey) {
        const coord = mapApi.parseKey(unitKey);
        const unit = state.units.get(unitKey);
        if (!unit) return false;
        const neighbors = getNeighbors(coord.col, coord.row);
        return neighbors.some(n => {
            const other = helpers.getUnitAt(n.col, n.row);
            return other && other.team !== unit.team;
        });
    }

    function getMoveCost(unitKey) {
        return hasAdjacentEnemy(unitKey) ? AP_MOVE_COST * 2 : AP_MOVE_COST;
    }

    function tryMove(unitKey, toCoord) {
        const unit = state.units.get(unitKey);
        if (!unit) return false;
        const cost = getMoveCost(unitKey);
        if (getAp(unit) < cost) return false;
        const moved = helpers.moveUnit(unitKey, toCoord, cost);
        if (!moved) return false;
        unit.ap = Math.max(0, getAp(unit) - cost);
        return true;
    }

    function tryAttack(fromKey, toKey, cost) {
        const attacker = state.units.get(fromKey);
        if (!attacker || getAp(attacker) < cost) return false;
        applyAttack(fromKey, toKey, cost);
        attacker.ap = Math.max(0, getAp(attacker) - cost);
        return true;
    }

    function continuePlayerTurn() {
        const unitKey = state.activeUnitKey;
        const unit = unitKey ? state.units.get(unitKey) : null;
        if (!unit || unit.team !== 'ally') return;
        const options = getActionOptionsWithAp(unitKey);
        state.validMoves = options.moves;
        state.validAttacks = options.attacks;
        const canAct = options.moves.size || options.attacks.size;
        if (!canAct) {
            finalizePlayerAction();
            return;
        }
        state.awaitingAction = true;
        mapApi.setHighlights(state.validMoves, state.validAttacks);
        mapApi.render();
        renderTurnOrder();
        updateBattleUI();
        helpers.updateHoverHint(null);
        renderBattleActionPanels();
    }

    function handlePlayerAttack(targetKey) {
        if (!state.activeUnitKey) return false;
        const unit = state.units.get(state.activeUnitKey);
        const cost = getAttackCost(unit);
        const success = tryAttack(state.activeUnitKey, targetKey, cost);
        if (!success) return false;
        continuePlayerTurn();
        return true;
    }

    function handlePlayerMove(toCoord) {
        if (!state.activeUnitKey) return false;
        const unit = state.units.get(state.activeUnitKey);
        const cost = getMoveCost(state.activeUnitKey);
        if (unit && getAp(unit) < cost) {
            helpers.showBattleToast?.(`AP不足（需要AP ${cost}）`);
            return false;
        }
        const success = tryMove(state.activeUnitKey, toCoord);
        if (!success) return false;
        continuePlayerTurn();
        return true;
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
        while (true) {
            const ap = getAp(unit);
            const attackCost = getAttackCost(unit);
            if (ap < Math.min(AP_MOVE_COST, attackCost)) break;
            const target = selectEnemyTarget(unitKey);
            if (!target) break;
            const targetCoord = mapApi.parseKey(target[0]);
            const options = getActionOptionsWithAp(unitKey);
            if (options.attacks.size) {
                const targetKey = Array.from(options.attacks)[0];
                const attacked = tryAttack(unitKey, targetKey, attackCost);
                if (!attacked) break;
                continue;
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
                const moved = tryMove(unitKey, best);
                if (!moved) break;
                unitKey = mapApi.key(best.col, best.row);
                continue;
            }
            break;
        }
    }

    function applyAttack(fromKey, toKey, apCost = 0) {
        const attacker = state.units.get(fromKey);
        const target = state.units.get(toKey);
        if (!attacker || !target) return;
        const atkStr = attacker.stats?.str || 1;
        const atkDex = attacker.stats?.dex || 0;
        const defStr = target.stats?.str || 0;
        const defDex = target.stats?.dex || 0;
        const weapon = attacker.equippedWeapon || attacker.source?.equippedWeapon || null;
        const minDmg = Number.isFinite(weapon?.damageMin) ? weapon.damageMin : 1;
        const maxDmg = Number.isFinite(weapon?.damageMax) ? weapon.damageMax : minDmg;
        const roll = Math.floor(Math.random() * (Math.max(minDmg, maxDmg) - Math.min(minDmg, maxDmg) + 1)) + Math.min(minDmg, maxDmg);
        const weaponDamage = roll * (1+(atkStr - 10) * 5 / 100);
        const distance = Math.max(1, hexDistance(mapApi.parseKey(fromKey), mapApi.parseKey(toKey)));
        const hitRateRaw = 0.9 - (distance - 1) / 10 + 0.3 * distance * ((atkDex - defDex) / 100) * 5;
        const hitRate = Math.max(0.3, Math.min(hitRateRaw, 0.99));
        const hit = Math.random() < hitRate;
        let finalDamage = 0;
        let blockRate = 0;
        let blocked = false;
        if (hit) {
            const blockRateRaw = 0.3 - (distance - 1) / 10 - (0.9 / distance) * ((atkStr - defStr) / 100) * 7;
            blockRate = Math.max(0.01, Math.min(blockRateRaw, 0.99));
            blocked = Math.random() < blockRate;
            finalDamage = blocked ? weaponDamage * 0.2 : weaponDamage;
        }
        const dmg = Math.max(0, Math.round(finalDamage));
        target.stats.hp = Math.max(0, target.stats.hp - dmg);
        if (state.phase === 'battle') {
            const attackerName = attacker.background || (attacker.team === 'enemy' ? '敌方' : '我方');
            const targetName = target.background || (target.team === 'enemy' ? '敌方' : '我方');
            const maxHp = target.stats?.maxHp ?? target.stats?.hp ?? 0;
            const hitText = hit ? '命中' : '未命中';
            const blockText = hit ? (blocked ? '格挡' : '未格挡') : '未结算';
            helpers.appendBattleLog(`${attackerName} 攻击 ${targetName}：距离${distance}，武器伤害${weaponDamage.toFixed(1)}，命中率${(hitRate * 100).toFixed(1)}%（${hitText}），格挡率${(blockRate * 100).toFixed(1)}%（${blockText}），最终伤害${dmg}（HP ${target.stats.hp}/${maxHp}，消耗AP ${apCost}）`);
        }
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
            if (state.phase === 'battle') {
                const targetName = target.background || (target.team === 'enemy' ? '敌方' : '我方');
                helpers.appendBattleLog(`${targetName} 被击败`);
            }
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
        setUnitAp(unit);
        if (unit.team === 'ally') {
            const options = getActionOptionsWithAp(currentKey);
            const canAct = options.moves.size || options.attacks.size;
            if (!canAct) {
                finalizePlayerAction();
                return;
            }
            state.awaitingAction = true;
            state.validMoves = options.moves;
            state.validAttacks = options.attacks;
            mapApi.setHighlights(state.validMoves, state.validAttacks);
            mapApi.render();
            renderTurnOrder();
            updateBattleUI();
            updateBattleHint();
            helpers.updateHoverHint(null);
            renderBattleActionPanels();
            return;
        }
        state.awaitingAction = false;
        updateBattleHint();
        enemyAct(currentKey);
        mapApi.setHighlights(null, null);
        mapApi.render();
        renderTurnOrder();
        updateBattleUI();
        renderBattleActionPanels();
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
        state.lastLogTurnKey = null;
        state.lastLogRound = 0;
        helpers.setMapVisible?.(true);
        helpers.setMapPhase?.('battle');
        helpers.clearBattleLog();
        helpers.setBattleLogVisible(true);
        helpers.appendBattleLog('战斗开始');
        Array.from(state.units.values()).forEach(u => {
            u.ap = 0;
            if (u.team === 'ally') {
                const id = u.sourceId ?? u.id;
                state.damageStats.set(id, { unit: u, totalDamage: 0, attacks: 0, kills: 0 });
            }
        });
        buildTurnOrder();
        state.turnIndex = 0;
        uiHandlers.renderPrepUI();
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
        helpers.setBattleLogVisible(true);
        if (winner === 'A') {
            helpers.appendBattleLog('战斗结束：我方胜利');
        } else if (winner === 'B') {
            helpers.appendBattleLog('战斗结束：我方失败');
        } else {
            helpers.appendBattleLog('战斗结束');
        }
        renderBattleActionPanels();
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

    return {
        startBattlePhase,
        renderBattleActionPanels,
        handlePlayerAttack,
        handlePlayerMove,
        finalizePlayerAction
    };
}
