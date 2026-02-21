export const DEFAULT_STAGES = [
    { id: 1, name: '第1关：新手村', description: '击败弱小的哥布林团伙', enemies: ['goblin', 'goblin', 'goblin_boss'], rewards: { gold: 100, gachaTickets: 3 }, maxTeamSize: 3 },
    { id: 2, name: '第2关：迷雾森林', description: '森林中的野兽和亡灵出没', enemies: ['wolf', 'wolf', 'skeleton', 'skeleton'], rewards: { gold: 150, gachaTickets: 4 }, maxTeamSize: 3 },
    { id: 3, name: '第3关：荒废矿坑', description: '深入地下，面对矿坑怪物', enemies: ['skeleton', 'skeleton', 'goblin_boss', 'goblin_boss'], rewards: { gold: 200, gachaTickets: 5 }, maxTeamSize: 4 },
    { id: 4, name: '第4关：幽灵古堡', description: '古堡中游荡着强大的亡灵', enemies: ['ghost', 'vampire', 'vampire', 'ghost', 'skeleton'], rewards: { gold: 300, gachaTickets: 6 }, maxTeamSize: 4 },
    { id: 5, name: '第5关：熔岩地狱', description: '炽热的地狱中潜伏着恶魔', enemies: ['demon', 'demon', 'vampire', 'dragon', 'demon'], rewards: { gold: 400, gachaTickets: 8 }, maxTeamSize: 5 },
    { id: 6, name: '第6关：魔王城', description: '最终决战！击败魔王军团', enemies: ['demon', 'demon', 'dragon', 'demon_king', 'vampire'], rewards: { gold: 600, gachaTickets: 12 }, maxTeamSize: 5 }
];
