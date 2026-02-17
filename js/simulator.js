import { GachaSystem, RARITY } from './GachaSystem.js';
import { StageSystem } from './StageSystem.js';
import { BattleSystem } from './BattleSystem.js';

export async function runSimulation(options = {}) {
    const config = normalizeConfig(options);
    const rng = createRng(config.seed);
    const originalRandom = Math.random;
    const stats = createStats();
    Math.random = rng;
    try {
        for (let i = 0; i < config.runs; i++) {
            const runResult = await simulateSingleRun(config, stats, i + 1);
            stats.totalRuns++;
            if (runResult.fullClear) {
                stats.fullClears++;
            }
            if (runResult.failedStageName) {
                stats.failureStageCounts[runResult.failedStageName] = (stats.failureStageCounts[runResult.failedStageName] || 0) + 1;
            }
            if (stats.runLogs.length < config.logLimit) {
                stats.runLogs.push(runResult.runLog);
            }
        }
    } finally {
        Math.random = originalRandom;
    }
    stats.gacha.rarityRates = buildRarityRates(stats.gacha.rarityCounts, stats.gacha.totalPulls);
    stats.stageSummaries = stats.stageSummaries.map(s => ({
        ...s,
        winRate: s.attempts > 0 ? s.wins / s.attempts : 0,
        avgTurnsWin: s.wins > 0 ? s.totalTurnsWin / s.wins : 0,
        avgTurnsAll: s.attempts > 0 ? s.totalTurnsAll / s.attempts : 0
    }));
    return stats;
}

export function formatSimulationReport(stats) {
    const lines = [];
    lines.push(`模拟次数: ${stats.totalRuns}`);
    lines.push(`通关次数: ${stats.fullClears}`);
    lines.push(`通关率: ${(stats.fullClears / Math.max(1, stats.totalRuns) * 100).toFixed(2)}%`);
    lines.push('');
    lines.push('关卡表现:');
    stats.stageSummaries.forEach(s => {
        lines.push(`${s.stageName} | 尝试 ${s.attempts} | 胜利 ${s.wins} | 胜率 ${(s.winRate * 100).toFixed(2)}% | 平均回合(胜利) ${s.avgTurnsWin.toFixed(2)} | 平均回合(全部) ${s.avgTurnsAll.toFixed(2)}`);
    });
    lines.push('');
    lines.push('失败关卡分布:');
    const failureEntries = getTopEntries(stats.failureStageCounts, stats.stageSummaries.length);
    if (failureEntries.length === 0) {
        lines.push('无');
    } else {
        failureEntries.forEach(([name, count]) => {
            lines.push(`${name}: ${count}`);
        });
    }
    lines.push('');
    lines.push('抽卡统计:');
    lines.push(`抽卡总数: ${stats.gacha.totalPulls}`);
    Object.keys(stats.gacha.rarityCounts).forEach(r => {
        const count = stats.gacha.rarityCounts[r] || 0;
        const rate = stats.gacha.rarityRates[r] || 0;
        const label = RARITY[r]?.name || r;
        lines.push(`${label}: ${count} (${(rate * 100).toFixed(2)}%)`);
    });
    lines.push('');
    lines.push('热门角色(抽卡次数):');
    getTopEntries(stats.gacha.templateCounts, 10).forEach(([id, count]) => {
        lines.push(`${id}: ${count}`);
    });
    lines.push('');
    lines.push('热门上阵(上场次数):');
    getTopEntries(stats.teamUsage, 10).forEach(([id, count]) => {
        lines.push(`${id}: ${count}`);
    });
    lines.push('');
    lines.push('闯关过程样本:');
    if (stats.runLogs.length === 0) {
        lines.push('无');
    } else {
        stats.runLogs.forEach(log => {
            lines.push(`Run#${log.runId} | 结果: ${log.result}`);
            log.stages.forEach(stage => {
                const teamLine = stage.team.length > 0 ? stage.team.join(',') : '无队伍';
                lines.push(`  - ${stage.stageName} | ${stage.result} | 回合 ${stage.turns} | 阵容 ${teamLine}`);
            });
            if (log.failedStageName) {
                lines.push(`  - 失败关卡: ${log.failedStageName}`);
            }
        });
    }
    return lines.join('\n');
}

function normalizeConfig(options) {
    return {
        runs: clampInt(options.runs ?? 200, 1, 100000),
        seed: toNumber(options.seed ?? 12345),
        campDrawMode: options.campDrawMode ?? 'always',
        logLimit: clampInt(options.logLimit ?? 20, 0, 200),
        teamScoreWeights: {
            maxHp: toNumber(options.teamScoreWeights?.maxHp ?? 0.6),
            attack: toNumber(options.teamScoreWeights?.attack ?? 2),
            defense: toNumber(options.teamScoreWeights?.defense ?? 1.2),
            speed: toNumber(options.teamScoreWeights?.speed ?? 1)
        }
    };
}

async function simulateSingleRun(config, stats, runId) {
    const gachaSystem = new GachaSystem();
    const stageSystem = new StageSystem();
    const totalStages = stageSystem.getTotalStages();
    let tickets = 10;
    let playerPool = [];
    let fullClear = true;
    let failedStageName = null;
    const stageSummaries = ensureStageSummaries(stats, stageSystem);
    const runLog = {
        runId,
        result: '失败',
        stages: [],
        failedStageName: null
    };

    if (tickets > 0) {
        tickets--;
        const draw = gachaSystem.pull10();
        recordGacha(draw, stats);
        const teamMax = stageSystem.getStage(0)?.maxTeamSize ?? 3;
        const team = pickBestTeam(draw, teamMax, config.teamScoreWeights);
        playerPool = mergePool(playerPool, team);
    }

    for (let stageIndex = 0; stageIndex < totalStages; stageIndex++) {
        const stage = stageSystem.getStage(stageIndex);
        if (!stage) {
            fullClear = false;
            failedStageName = `第${stageIndex + 1}关`;
            runLog.stages.push({
                stageName: failedStageName,
                result: '关卡不存在',
                turns: 0,
                team: []
            });
            break;
        }
        const teamMax = stage.maxTeamSize ?? 3;
        const team = pickBestTeam(playerPool, teamMax, config.teamScoreWeights);
        if (team.length === 0) {
            fullClear = false;
            failedStageName = stage.name;
            runLog.stages.push({
                stageName: stage.name,
                result: '无队伍',
                turns: 0,
                team: []
            });
            break;
        }
        team.forEach(c => c.reset());
        trackTeamUsage(stats, team);
        const enemies = stageSystem.createEnemies(stageIndex);
        const battle = new BattleSystem(team, enemies);
        battle.delay = () => Promise.resolve();
        const winner = await battle.start();
        const turns = battle.getTurnCount();
        const summary = stageSummaries[stageIndex];
        summary.attempts++;
        summary.totalTurnsAll += turns;
        if (winner === 'A') {
            summary.wins++;
            summary.totalTurnsWin += turns;
            runLog.stages.push({
                stageName: stage.name,
                result: '胜利',
                turns,
                team: team.map(c => c.templateId ?? c.id)
            });
            if (stage.rewards) {
                tickets += toNumber(stage.rewards.gachaTickets ?? 0);
            }
            if (stageIndex < totalStages - 1) {
                if (shouldCampDraw(config.campDrawMode, tickets)) {
                    tickets--;
                    const campDraw = gachaSystem.pull5();
                    recordGacha(campDraw, stats);
                    const picked = pickBestTeam(campDraw, 1, config.teamScoreWeights);
                    if (picked.length > 0) {
                        playerPool = mergePool(playerPool, picked);
                    }
                }
            }
        } else {
            fullClear = false;
            failedStageName = stage.name;
            runLog.stages.push({
                stageName: stage.name,
                result: '失败',
                turns,
                team: team.map(c => c.templateId ?? c.id)
            });
            break;
        }
    }
    runLog.result = fullClear ? '通关' : '失败';
    runLog.failedStageName = failedStageName;
    return { fullClear, failedStageName, runLog };
}

function ensureStageSummaries(stats, stageSystem) {
    if (stats.stageSummaries.length > 0) return stats.stageSummaries;
    const stages = stageSystem.stages.length > 0 ? stageSystem.stages : stageSystem.getStage(0) ? stageSystem.stages : [];
    const total = stageSystem.getTotalStages();
    const summaries = [];
    for (let i = 0; i < total; i++) {
        const stage = stageSystem.getStage(i);
        summaries.push({
            stageName: stage?.name ?? `第${i + 1}关`,
            attempts: 0,
            wins: 0,
            totalTurnsWin: 0,
            totalTurnsAll: 0,
            winRate: 0,
            avgTurnsWin: 0,
            avgTurnsAll: 0
        });
    }
    stats.stageSummaries = summaries;
    return summaries;
}

function recordGacha(draw, stats) {
    stats.gacha.totalPulls += draw.length;
    draw.forEach(c => {
        stats.gacha.rarityCounts[c.rarity] = (stats.gacha.rarityCounts[c.rarity] || 0) + 1;
        const key = c.templateId ?? c.id;
        stats.gacha.templateCounts[key] = (stats.gacha.templateCounts[key] || 0) + 1;
    });
}

function trackTeamUsage(stats, team) {
    team.forEach(c => {
        const key = c.templateId ?? c.id;
        stats.teamUsage[key] = (stats.teamUsage[key] || 0) + 1;
    });
}

function pickBestTeam(pool, maxSize, weights) {
    return [...pool]
        .sort((a, b) => scoreCharacter(b, weights) - scoreCharacter(a, weights))
        .slice(0, maxSize);
}

function scoreCharacter(character, weights) {
    return character.maxHp * weights.maxHp
        + character.attack * weights.attack
        + character.defense * weights.defense
        + character.speed * weights.speed;
}

function mergePool(pool, newChars) {
    const ids = new Set(pool.map(c => c.id));
    newChars.forEach(c => {
        if (!ids.has(c.id)) {
            pool.push(c);
            ids.add(c.id);
        }
    });
    return pool;
}

function shouldCampDraw(mode, tickets) {
    if (tickets <= 0) return false;
    if (mode === 'never') return false;
    if (mode === 'always') return true;
    return true;
}

function buildRarityRates(counts, total) {
    const result = {};
    Object.keys(counts).forEach(k => {
        result[k] = total > 0 ? counts[k] / total : 0;
    });
    return result;
}

function createStats() {
    return {
        totalRuns: 0,
        fullClears: 0,
        failureStageCounts: {},
        runLogs: [],
        stageSummaries: [],
        gacha: {
            totalPulls: 0,
            rarityCounts: { COMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0 },
            rarityRates: {},
            templateCounts: {}
        },
        teamUsage: {}
    };
}

function createRng(seed) {
    let state = Math.floor(seed) % 2147483647;
    if (state <= 0) state += 2147483646;
    return () => (state = state * 16807 % 2147483647) / 2147483647;
}

function getTopEntries(map, count) {
    return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, count);
}

function clampInt(value, min, max) {
    const num = Math.floor(toNumber(value));
    if (Number.isNaN(num)) return min;
    return Math.max(min, Math.min(max, num));
}

function toNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}
