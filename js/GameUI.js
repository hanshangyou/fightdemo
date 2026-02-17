import { getStages } from './StageEditor.js';

export class GameUI {
    elements = {};

    constructor() {
        this.cacheElements();
    }

    cacheElements() {
        this.elements = {
            gameContainer: document.getElementById('game-container'),
            screens: {
                main: document.getElementById('screen-main'),
                gacha: document.getElementById('screen-gacha'),
                battle: document.getElementById('screen-battle'),
                camp: document.getElementById('screen-camp'),
                result: document.getElementById('screen-result'),
                editor: document.getElementById('screen-editor'),
                stageEditor: document.getElementById('screen-stage-editor'),
                mapEditor: document.getElementById('screen-map-editor')
            },
            main: {
                gold: document.getElementById('main-gold'),
                tickets: document.getElementById('main-tickets'),
                stage: document.getElementById('main-stage'),
                stageName: document.getElementById('stage-name'),
                stageDesc: document.getElementById('stage-desc'),
                stageTeamMax: document.getElementById('stage-team-max'),
                btnGacha: document.getElementById('btn-gacha'),
                btnBattle: document.getElementById('btn-battle'),
                btnEditor: document.getElementById('btn-editor'),
                btnStageEditor: document.getElementById('btn-stage-editor')
            },
            gacha: {
                drawPool: document.getElementById('draw-pool'),
                teamCount: document.getElementById('team-count'),
                teamMax: document.getElementById('team-max'),
                tickets: document.getElementById('gacha-tickets'),
                btnPull: document.getElementById('btn-pull'),
                btnReroll: document.getElementById('btn-reroll'),
                btnConfirm: document.getElementById('btn-confirm'),
                btnBack: document.getElementById('btn-back-gacha')
            },
            battle: {
                teamA: document.getElementById('battle-team-a'),
                teamB: document.getElementById('battle-team-b'),
                log: document.getElementById('battle-log'),
                stageInfo: document.getElementById('battle-stage-info')
            },
            camp: {
                title: document.getElementById('camp-title'),
                subtitle: document.getElementById('camp-subtitle'),
                hint: document.getElementById('camp-hint'),
                availableCount: document.getElementById('camp-available-count'),
                team: document.getElementById('camp-team'),
                draw: document.getElementById('camp-draw'),
                btnDraw: document.getElementById('btn-camp-draw'),
                btnNext: document.getElementById('btn-camp-next'),
                btnHome: document.getElementById('btn-camp-home')
            },
            result: {
                title: document.getElementById('result-title'),
                message: document.getElementById('result-message'),
                rewards: document.getElementById('result-rewards'),
                btnNext: document.getElementById('btn-next'),
                btnRetry: document.getElementById('btn-retry'),
                btnRestart: document.getElementById('btn-restart'),
                btnHome: document.getElementById('btn-home')
            }
        };
    }

    showScreen(screenName) {
        Object.values(this.elements.screens).forEach(screen => {
            if (screen) screen.classList.remove('active');
        });
        if (this.elements.screens[screenName]) {
            this.elements.screens[screenName].classList.add('active');
        }
    }

    updateMainScreen(gold, tickets, stage, team = [], hasStartedGame = false) {
        if (this.elements.main.gold) {
            this.elements.main.gold.textContent = gold;
        }
        if (this.elements.main.tickets) {
            this.elements.main.tickets.textContent = tickets;
        }
        if (stage) {
            const stages = getStages();
            if (this.elements.main.stage) {
                this.elements.main.stage.textContent = `${stage.id}/${stages.length}`;
            }
            if (this.elements.main.stageName) {
                this.elements.main.stageName.textContent = stage.name;
            }
            if (this.elements.main.stageDesc) {
                this.elements.main.stageDesc.textContent = stage.description;
            }
            if (this.elements.main.stageTeamMax) {
                this.elements.main.stageTeamMax.textContent = stage.maxTeamSize ?? 3;
            }
        }
        
        const teamInfo = document.getElementById('main-team-info');
        if (teamInfo) {
            if (team.length > 0) {
                teamInfo.innerHTML = `<span style="color:#2ecc71">当前队伍: ${team.map(c => c.name).join(', ')}</span>`;
            } else {
                teamInfo.innerHTML = '<span style="color:#e74c3c">未组建队伍</span>';
            }
        }
        
        if (this.elements.main.btnGacha) {
            this.elements.main.btnGacha.disabled = hasStartedGame;
            if (hasStartedGame) {
                this.elements.main.btnGacha.style.opacity = '0.5';
            } else {
                this.elements.main.btnGacha.style.opacity = '1';
            }
        }
    }

    renderDrawPool(characters, selectedIds = [], withAnimation = true, emptyHint = '点击下方按钮抽取10个角色') {
        const container = this.elements.gacha.drawPool;
        if (!container) return;
        
        container.innerHTML = '';
        
        if (characters.length === 0) {
            container.innerHTML = `<div class="empty-hint">${emptyHint}</div>`;
            return;
        }
        
        characters.forEach((char, index) => {
            const card = this.createCharacterCard(char);
            if (!char.isDead) {
                card.classList.add('selectable');
            }
            
            if (withAnimation) {
                card.classList.add('gacha-card');
                card.style.animationDelay = `${index * 0.05}s`;
            } else {
                card.classList.add('no-animation');
            }
            
            if (selectedIds.includes(char.id)) {
                card.classList.add('selected');
            }
            
            card.dataset.characterId = char.id;
            container.appendChild(card);
        });
    }

    clearDrawPool(emptyHint = '点击下方按钮抽取10个角色') {
        if (this.elements.gacha.drawPool) {
            this.elements.gacha.drawPool.innerHTML = `<div class="empty-hint">${emptyHint}</div>`;
        }
    }

    updateTeamCount(current, max) {
        if (this.elements.gacha.teamCount) {
            this.elements.gacha.teamCount.textContent = current;
        }
        if (this.elements.gacha.teamMax) {
            this.elements.gacha.teamMax.textContent = max;
        }
    }

    updateGachaButtons(hasDrawn) {
        if (this.elements.gacha.btnPull) {
            this.elements.gacha.btnPull.style.display = hasDrawn ? 'none' : 'inline-block';
        }
        if (this.elements.gacha.btnReroll) {
            this.elements.gacha.btnReroll.style.display = hasDrawn ? 'none' : 'inline-block';
        }
        if (this.elements.gacha.btnBack) {
            this.elements.gacha.btnBack.textContent = hasDrawn ? '返回' : '返回';
        }
    }

    setGachaControls({ showDrawButtons = true, confirmText = '⚔️ 开始战斗', backText = '返回' }) {
        if (this.elements.gacha.btnPull) {
            this.elements.gacha.btnPull.style.display = showDrawButtons ? 'inline-block' : 'none';
        }
        if (this.elements.gacha.btnReroll) {
            this.elements.gacha.btnReroll.style.display = showDrawButtons ? 'inline-block' : 'none';
        }
        if (this.elements.gacha.btnConfirm) {
            this.elements.gacha.btnConfirm.textContent = confirmText;
        }
        if (this.elements.gacha.btnBack) {
            this.elements.gacha.btnBack.textContent = backText;
        }
    }

    updateGachaTickets(tickets) {
        if (this.elements.gacha.tickets) {
            this.elements.gacha.tickets.textContent = tickets;
        }
    }

    createCharacterCard(character) {
        const card = document.createElement('div');
        card.className = 'character-card';
        if (character.isDead) {
            card.classList.add('dead');
        }
        
        const rarity = character.rarity || 'COMMON';
        const rarityInfo = {
            COMMON: { name: '普通', color: '#95a5a6' },
            RARE: { name: '稀有', color: '#3498db' },
            EPIC: { name: '史诗', color: '#9b59b6' },
            LEGENDARY: { name: '传说', color: '#f39c12' },
            ENEMY: { name: '敌对', color: '#e74c3c' }
        };
        
        const rarityData = rarityInfo[rarity] || rarityInfo.COMMON;
        
        card.style.borderColor = rarityData.color;
        card.dataset.rarity = rarity;
        card.dataset.rarityLabel = rarityData.name;
        card.innerHTML = `
            <div class="character-rarity" style="color: ${rarityData.color}">${rarityData.name}</div>
            <div class="character-icon">${character.icon || '👤'}</div>
            <div class="character-name">${character.name}</div>
            <div class="character-stats">
                <span>❤️${character.maxHp}</span>
                <span>⚔️${character.attack}</span>
                <span>🛡️${character.defense}</span>
                <span>💨${character.speed}</span>
            </div>
        `;
        
        return card;
    }

    renderCampTeam(team, selectable = false) {
        const container = this.elements.camp.team;
        if (!container) return;
        container.innerHTML = '';
        container.classList.toggle('select-mode', selectable);

        team.forEach(char => {
            const card = this.createCharacterCard(char);
            card.dataset.characterId = char.id;
            container.appendChild(card);
        });
    }

    renderCampDrawPool(characters, selectedId = null) {
        const container = this.elements.camp.draw;
        if (!container) return;
        container.innerHTML = '';

        if (!characters || characters.length === 0) {
            container.innerHTML = '<div class="empty-hint">本次营地未抽卡</div>';
            return;
        }

        characters.forEach(char => {
            const card = this.createCharacterCard(char);
            card.dataset.characterId = char.id;
            if (selectedId && selectedId === char.id) {
                card.classList.add('selected');
            }
            container.appendChild(card);
        });
    }

    updateCampHeader(title, subtitle) {
        if (this.elements.camp.title) this.elements.camp.title.textContent = title;
        if (this.elements.camp.subtitle) this.elements.camp.subtitle.textContent = subtitle;
    }

    updateCampHint(text) {
        if (this.elements.camp.hint) this.elements.camp.hint.textContent = text;
    }

    setCampButtons({ canDraw, nextText }) {
        if (this.elements.camp.btnDraw) {
            this.elements.camp.btnDraw.disabled = !canDraw;
            this.elements.camp.btnDraw.style.opacity = canDraw ? '1' : '0.5';
        }
        if (this.elements.camp.btnNext && nextText) {
            this.elements.camp.btnNext.textContent = nextText;
        }
    }

    updateCampAvailableCount(count) {
        if (this.elements.camp.availableCount) {
            this.elements.camp.availableCount.textContent = count;
        }
    }

    renderBattleTeam(characters, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        characters.forEach(char => {
            const card = document.createElement('div');
            card.className = 'battle-character-card';
            card.id = `battle-char-${char.id}`;
            
            card.innerHTML = `
                <div class="battle-char-icon">${char.icon || '👤'}</div>
                <div class="battle-char-name">${char.name}</div>
                <div class="battle-char-stats">
                    <span>⚔️${char.attack}</span>
                    <span>🛡️${char.defense}</span>
                    <span>💨${char.speed}</span>
                </div>
                <div class="hp-bar-container">
                    <div class="hp-bar" style="width: ${char.hpPercentage}%"></div>
                </div>
                <div class="hp-text">${char.hp}/${char.maxHp}</div>
                <div class="action-bar">
                    <div class="action-bar-fill" style="width: ${Math.min(100, char.actionGauge)}%"></div>
                </div>
            `;
            
            container.appendChild(card);
        });
    }

    updateBattleCharacter(character) {
        const card = document.getElementById(`battle-char-${character.id}`);
        if (!card) return;
        
        const hpBar = card.querySelector('.hp-bar');
        const hpText = card.querySelector('.hp-text');
        const actionBar = card.querySelector('.action-bar-fill');
        
        if (hpBar) {
            hpBar.style.width = `${character.hpPercentage}%`;
            hpBar.classList.remove('low', 'medium');
            if (character.hpPercentage <= 25) {
                hpBar.classList.add('low');
            } else if (character.hpPercentage <= 50) {
                hpBar.classList.add('medium');
            }
        }
        
        if (hpText) {
            hpText.textContent = `${character.hp}/${character.maxHp}`;
        }
        
        if (actionBar) {
            actionBar.style.width = `${Math.min(100, character.actionGauge)}%`;
        }
        
        if (!character.isAlive) {
            card.classList.add('dead');
        }
        card.classList.remove('hit');
        card.classList.add('hit');
        setTimeout(() => card.classList.remove('hit'), 200);
    }

    setActiveCharacter(character) {
        document.querySelectorAll('.battle-character-card.active').forEach(el => {
            el.classList.remove('active');
        });
        
        if (character) {
            const card = document.getElementById(`battle-char-${character.id}`);
            if (card) {
                card.classList.add('active');
            }
        }
    }

    showDamagePopup(character, damage) {
        const card = document.getElementById(`battle-char-${character.id}`);
        if (!card) return;
        
        const popup = document.createElement('div');
        popup.className = 'damage-popup';
        popup.textContent = `-${damage}`;
        
        const rect = card.getBoundingClientRect();
        popup.style.left = `${rect.left + rect.width / 2}px`;
        popup.style.top = `${rect.top}px`;
        
        document.body.appendChild(popup);
        
        setTimeout(() => popup.remove(), 800);
    }

    addBattleLog(message, type = '') {
        const log = this.elements.battle.log;
        if (!log) return;
        
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = message;
        
        log.insertBefore(entry, log.firstChild);
        
        while (log.children.length > 50) {
            log.removeChild(log.lastChild);
        }
    }

    clearBattleLog() {
        if (this.elements.battle.log) {
            this.elements.battle.log.innerHTML = '';
        }
    }

    showResult(isVictory, stage, rewards = null, damageStats = [], totalDamage = 0, turnCount = 0, hasDrawn = false) {
        this.elements.result.title.textContent = isVictory ? '🎉 胜利！' : '💀 失败...';
        this.elements.result.title.className = isVictory ? 'result-title victory' : 'result-title defeat';
        
        const statsHtml = `
            <div class="battle-stats">
                <div class="stats-summary">
                    <span>⚔️ 总回合: ${turnCount}</span>
                    <span>💥 总伤害: ${totalDamage}</span>
                </div>
                <div class="stats-detail">
                    ${damageStats.map(stat => `
                        <div class="stat-item">
                            <span class="stat-name">${stat.character.icon || '👤'} ${stat.character.name}</span>
                            <span class="stat-value">伤害: ${stat.totalDamage} | 攻击: ${stat.attacks}次${stat.kills > 0 ? ` | 击杀: ${stat.kills}` : ''}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        if (isVictory && rewards) {
            this.elements.result.message.textContent = `成功通过${stage.name}！`;
            this.elements.result.rewards.innerHTML = statsHtml + `
                <div class="reward-section">
                    <div class="reward-title">🎁 获得奖励</div>
                    <div class="reward-item">💰 金币 +${rewards.gold}</div>
                    <div class="reward-item">🎫 抽卡券 +${rewards.gachaTickets}</div>
                </div>
            `;
            this.elements.result.rewards.style.display = 'block';
            
            this.elements.result.btnNext.textContent = '🏕️ 进入营地';
            this.elements.result.btnNext.disabled = false;
            this.elements.result.btnNext.style.display = 'inline-block';
            this.elements.result.btnRetry.style.display = 'none';
            this.elements.result.btnRestart.style.display = 'none';
            this.elements.result.btnHome.style.display = 'none';
        } else {
            this.elements.result.message.textContent = '战斗失败，再接再厉！';
            this.elements.result.rewards.innerHTML = statsHtml;
            this.elements.result.rewards.style.display = 'block';
            this.elements.result.btnNext.style.display = 'none';
            this.elements.result.btnRetry.textContent = '🔄 原队重试';
            this.elements.result.btnRetry.style.display = 'inline-block';
            this.elements.result.btnRestart.textContent = '👥 重新选卡';
            this.elements.result.btnRestart.style.display = 'inline-block';
            this.elements.result.btnHome.textContent = '🏠 返回首页';
            this.elements.result.btnHome.style.display = 'inline-block';
        }
        
        this.showScreen('result');
    }

    onGachaPull(callback) {
        this.elements.gacha.btnPull?.addEventListener('click', callback);
    }

    onReroll(callback) {
        this.elements.gacha.btnReroll?.addEventListener('click', callback);
    }

    onConfirmTeam(callback) {
        this.elements.gacha.btnConfirm?.addEventListener('click', callback);
    }

    onBackFromGacha(callback) {
        this.elements.gacha.btnBack?.addEventListener('click', callback);
    }

    onGoGacha(callback) {
        this.elements.main.btnGacha?.addEventListener('click', callback);
    }

    onGoBattle(callback) {
        this.elements.main.btnBattle?.addEventListener('click', callback);
    }

    onNextStage(callback) {
        this.elements.result.btnNext?.addEventListener('click', callback);
    }

    onRetry(callback) {
        this.elements.result.btnRetry?.addEventListener('click', callback);
    }

    onRestart(callback) {
        this.elements.result.btnRestart?.addEventListener('click', callback);
    }

    onGoHome(callback) {
        this.elements.result.btnHome?.addEventListener('click', callback);
    }

    onGoEditor(callback) {
        this.elements.main.btnEditor?.addEventListener('click', callback);
    }

    onGoStageEditor(callback) {
        this.elements.main.btnStageEditor?.addEventListener('click', callback);
    }

    onCampDraw(callback) {
        this.elements.camp.btnDraw?.addEventListener('click', callback);
    }

    onCampNext(callback) {
        this.elements.camp.btnNext?.addEventListener('click', callback);
    }

    onCampHome(callback) {
        this.elements.camp.btnHome?.addEventListener('click', callback);
    }

    onCampSelectDraw(callback) {
        this.elements.camp.draw?.addEventListener('click', (e) => {
            const card = e.target.closest('.character-card');
            if (card) callback(card.dataset.characterId);
        });
    }

    onCampSelectTeam(callback) {
        this.elements.camp.team?.addEventListener('click', (e) => {
            const card = e.target.closest('.character-card');
            if (card) callback(card.dataset.characterId);
        });
    }

    onCharacterSelect(callback) {
        this.elements.gacha.drawPool?.addEventListener('click', (e) => {
            const card = e.target.closest('.character-card.selectable');
            if (card) {
                callback(card.dataset.characterId);
            }
        });
    }
}
