# 项目概览

## 项目定位
- 类型：单页网页游戏（六边形地图回合制战斗 + 抽卡 + 关卡/武器/卡池编辑）。
- 入口：index.html 引入 src/main.js。[index.html](file:///c:/Users/27184/Documents/trae_projects/fightdemo/index.html#L262-L262)

## 页面结构
- 主页：关卡信息、资源与入口按钮（含卡池/武器/关卡编辑）。[index.html](file:///c:/Users/27184/Documents/trae_projects/fightdemo/index.html#L2660-L2685)
- 抽卡组队页：抽卡池、组队计数、确认开战。[index.html](file:///c:/Users/27184/Documents/trae_projects/fightdemo/index.html#L2688-L2708)
- 战斗页：六边形地图、布阵面板、行动面板、回合顺序与战斗日志。[index.html](file:///c:/Users/27184/Documents/trae_projects/fightdemo/index.html#L2711-L2782)
- 营地页：角色池、招募/武器入口、下一关按钮。[index.html](file:///c:/Users/27184/Documents/trae_projects/fightdemo/index.html#L2784-L2811)
- 营地弹窗：招募抽卡与武器池弹窗、武器切换浮层。[index.html](file:///c:/Users/27184/Documents/trae_projects/fightdemo/index.html#L2813-L2844)
- 结算页：胜负与奖励展示、重试/重开按钮。[index.html](file:///c:/Users/27184/Documents/trae_projects/fightdemo/index.html#L2846-L2858)
- 卡池编辑器页：角色池增删改（复用 editor 容器）。[index.html](file:///c:/Users/27184/Documents/trae_projects/fightdemo/index.html#L2860-L2862) + [PoolEditor.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/PoolEditor.js)
- 武器编辑器页：武器池增删改（复用 editor 容器）。[WeaponEditor.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/WeaponEditor.js)
- 关卡编辑器页：关卡列表、敌人配置与上限配置。[index.html](file:///c:/Users/27184/Documents/trae_projects/fightdemo/index.html#L2864-L2866) + [StageEditor.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/StageEditor.js)
- 关卡地图编辑页：六边形地图编辑与敌人布点。[index.html](file:///c:/Users/27184/Documents/trae_projects/fightdemo/index.html#L2868-L2879) + [hex-map-editor-embedded.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/hex-map-editor-embedded.js)

## 核心模块
- 主流程控制：Game 类，负责页面切换、抽卡、战斗、营地与结算流转。[main.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/main.js)
- UI 绑定：GameUI 缓存 DOM 与提供渲染入口。[GameUI.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/ui/GameUI.js)
- 抽卡系统：GachaSystem，负责抽卡概率与角色生成。[GachaSystem.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/systems/GachaSystem.js)
- 武器系统：WeaponSystem，管理武器池、实例化武器。[WeaponSystem.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/systems/WeaponSystem.js)
- 武器编辑器：武器池 UI 与增删改逻辑。[WeaponEditor.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/editors/WeaponEditor.js)
- 关卡系统：StageSystem，负责关卡读取、推进与敌人实例化。[StageSystem.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/systems/StageSystem.js)
- 六边形战斗编排：initHexBattle 负责连接准备/战斗子模块。[hex-battle.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/hexagonal/hex-battle.js)
- 战斗准备阶段：布阵、敌人生成、准备 UI。[hex-battle-prepare.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/hexagonal/hex-battle-prepare.js)
- 战斗阶段：回合/AP、移动与攻击、日志与高亮。[hex-battle-combat.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/hexagonal/hex-battle-combat.js)
- 六边形地图编辑器核心：initHexMapEditor，地图编辑/保存/重置逻辑。[hex-map-editor.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/hexagonal/hex-map-editor.js)
- 坐标与邻居：六边形坐标换算与邻居取值。[hex-coordinates.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/objects/hex-coordinates.js)
- 战场装配器：initHexBattlefield，聚合地图与战斗模块。[hex-battlefield.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/hexagonal/hex-battlefield.js)

## 关键数据流
- 抽卡与组队：
  - 抽卡页点击抽卡 → GachaSystem.pull10 生成角色 → GameUI 渲染卡池。[main.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/main.js#L203-L220)
  - 点击卡牌选择队伍 → currentTeam 更新 → 组队计数更新。[main.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/main.js#L131-L149)
  - 确认开战 → 同步备选池 → 进入战斗加载。[main.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/main.js#L203-L317)
- 武器配置与装备：
  - 武器编辑器增删改 → WeaponSystem 写入武器池。[WeaponEditor.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/editors/WeaponEditor.js)
  - 进入营地 → 自动为角色补齐武器 → 营地武器池与角色列表渲染。[main.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/main.js#L425-L456)
  - 营地武器弹窗/浮层选择装备 → 更换角色武器并回写 UI。[main.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/main.js#L642-L711)
- 战斗加载：
  - StageSystem 读取当前关卡 → createEnemies 创建敌人实例。[StageSystem.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/systems/StageSystem.js#L34-L58)
  - hex-battle.loadBattle 接收 stage/playerUnits/enemyUnits → 初始化地图与准备阶段。[hex-battle.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/hexagonal/hex-battle.js#L372-L385)
- 回合制战斗：
  - 回合顺序按速度与 AP 逻辑执行 → 玩家回合可移动/攻击 → 敌人行动决策。[hex-battle-combat.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/hexagonal/hex-battle-combat.js)
  - 结束判定 → 回传战斗统计与阵亡信息给主流程。[hex-battle-combat.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/hexagonal/hex-battle-combat.js)
- 营地与结算：
  - 胜利 → 结算页展示奖励与统计 → 进入营地抽卡/整备。[main.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/main.js#L361-L438)
  - 失败 → 失败面板选择原队重试或返回营地重选。[main.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/main.js#L396-L559)

## 逻辑设定摘要
- 队伍人数：最少 1 人，上限由关卡 maxTeamSize 决定。[main.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/main.js#L254-L274)
- 抽卡：开局 10 连仅一次；营地 5 连每营地一次。[GachaSystem.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/systems/GachaSystem.js#L66-L155) + [main.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/main.js#L481-L520)
- 战斗：六方向相邻移动/攻击；回合上限由关卡配置。[hex-battle.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/hexagonal/hex-battle.js#L123-L133)
- 武器：武器提供射程、AP 消耗与伤害区间；角色可装备/卸下武器。[WeaponSystem.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/systems/WeaponSystem.js#L5-L52)
- 阵亡处理：胜利时阵亡角色留在备选池不可用，失败时恢复。[main.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/main.js#L361-L390)

## 数据持久化（localStorage）
- 角色池：fightdemo_character_pool。[GachaSystem.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/systems/GachaSystem.js#L35-L63)
- 武器池：fightdemo_weapon_pool。[WeaponSystem.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/systems/WeaponSystem.js#L3-L30)
- 关卡配置：fightdemo_stages（含 maxTeamSize、mapId、enemySpawns）。默认配置见 [default-stages.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/config/default-stages.js)，读取入口在 [StageEditor.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/editors/StageEditor.js#L1-L40)
- 地图存档：
  - 当前地图快照：fightdemo.hex-map.v1
  - 全局默认地图：fightdemo.hex-map.default.v1
  - 关卡地图集合：fightdemo.hex-map.stage.v1
  见 [hex-map-editor.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/hexagonal/hex-map-editor.js#L4-L203)

## 文档与辅助文件
- 游戏规则文档：[GAME_RULES.md](file:///c:/Users/27184/Documents/trae_projects/fightdemo/GAME_RULES.md)
- 更新日志：[CHANGELOG.md](file:///c:/Users/27184/Documents/trae_projects/fightdemo/CHANGELOG.md)
- 战场演示页：hexagonal-battlefield.html（六边形战场 UI 试验页）。[hexagonal-battlefield.html](file:///c:/Users/27184/Documents/trae_projects/fightdemo/hexagonal-battlefield.html)
- 独立地图编辑页：[hex-map-editor.html](file:///c:/Users/27184/Documents/trae_projects/fightdemo/hex-map-editor.html) + [hex-map-editor-page.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/hex-map-editor-page.js)
## 代码目录结构
- src/main.js：游戏入口与流程控制。[main.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/main.js)
- src/systems：抽卡、关卡、武器等系统逻辑。[systems](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/systems)
- src/editors：卡池/关卡/武器编辑器。[editors](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/editors)
- src/hexagonal：六边形地图与战斗模块。[hexagonal](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/hexagonal)
- src/ui：UI 组件与页面渲染。[ui](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/ui)
- src/config：默认角色/武器/关卡配置。[config](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/config)
- src/styles：样式拆分文件。[styles](file:///c:/Users/27184/Documents/trae_projects/fightdemo/src/styles)
