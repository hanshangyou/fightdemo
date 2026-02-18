# 项目概览

## 项目定位
- 类型：单页网页游戏（六边形地图回合制战斗 + 抽卡 + 关卡编辑）。
- 入口：index.html 引入 js/main.js。

## 页面结构
- 主页：关卡信息、资源、入口按钮。[index.html](file:///c:/Users/27184/Documents/trae_projects/fightdemo/index.html#L2350-L2373)
- 抽卡组队页：抽卡池、组队计数、确认开战。[index.html](file:///c:/Users/27184/Documents/trae_projects/fightdemo/index.html#L2375-L2395)
- 战斗页：六边形地图、布阵面板、行动面板、回合顺序与战斗日志。[index.html](file:///c:/Users/27184/Documents/trae_projects/fightdemo/index.html#L2398-L2474)
- 营地页：备选池、营地抽卡与下一关按钮。[index.html](file:///c:/Users/27184/Documents/trae_projects/fightdemo/index.html#L2476-L2503)
- 结算页：胜负与奖励展示、重试/重开按钮。[index.html](file:///c:/Users/27184/Documents/trae_projects/fightdemo/index.html#L2505-L2517)
- 卡池编辑器页：角色池增删改。[index.html](file:///c:/Users/27184/Documents/trae_projects/fightdemo/index.html#L2519-L2521) + [PoolEditor.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/PoolEditor.js)
- 关卡编辑器页：关卡列表、敌人配置与上限配置。[index.html](file:///c:/Users/27184/Documents/trae_projects/fightdemo/index.html#L2523-L2525) + [StageEditor.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/StageEditor.js)
- 关卡地图编辑页：六边形地图编辑与敌人布点。[index.html](file:///c:/Users/27184/Documents/trae_projects/fightdemo/index.html#L2527-L2559) + [hex-map-editor-embedded.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/hex-map-editor-embedded.js)

## 核心模块
- 主流程控制：Game 类，负责页面切换、抽卡、战斗、营地与结算流转。[main.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/main.js)
- UI 绑定：GameUI 缓存 DOM 与提供渲染入口。[GameUI.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/GameUI.js)
- 抽卡系统：GachaSystem，负责抽卡概率与角色生成。[GachaSystem.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/GachaSystem.js)
- 关卡系统：StageSystem，负责关卡读取、推进与敌人实例化。[StageSystem.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/StageSystem.js)
- 六边形战斗：initHexBattle，包含布阵、回合制逻辑与战斗日志。[hex-battle.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/hex-battle.js)
- 六边形地图编辑器核心：initHexMapEditor，地图编辑/保存/重置逻辑。[hex-map-editor.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/hex-map-editor.js)
- 坐标与邻居：六边形坐标换算与邻居取值。[hex-coordinates.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/hex-coordinates.js)
- 战场装配器：initHexBattlefield，聚合地图与战斗模块。[hex-battlefield.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/hex-battlefield.js)

## 关键数据流
- 抽卡与组队：
  - 抽卡页点击抽卡 → GachaSystem.pull10 生成角色 → GameUI 渲染卡池。[main.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/main.js#L198-L220)
  - 点击卡牌选择队伍 → currentTeam 更新 → 组队计数更新。[main.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/main.js#L226-L252)
  - 确认开战 → 同步备选池 → 进入战斗加载。[main.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/main.js#L254-L316)
- 战斗加载：
  - StageSystem 读取当前关卡 → createEnemies 创建敌人实例。[StageSystem.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/StageSystem.js#L34-L58)
  - hex-battle.loadBattle 接收 stage/playerUnits/enemyUnits → 初始化地图并布阵。[hex-battle.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/hex-battle.js#L372-L378)
- 回合制战斗：
  - 回合顺序按速度排序 → 玩家回合可移动或攻击 → 敌人简单寻敌行动。[hex-battle.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/hex-battle.js#L334-L533)
  - 结束判定 → 回传战斗统计与阵亡信息给主流程。[hex-battle.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/hex-battle.js#L603-L628)
- 营地与结算：
  - 胜利 → 结算页展示奖励与统计 → 进入营地抽卡/整备。[main.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/main.js#L361-L438)
  - 失败 → 失败面板选择原队重试或返回营地重选。[main.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/main.js#L396-L559)

## 逻辑设定摘要
- 队伍人数：最少 1 人，上限由关卡 maxTeamSize 决定。[main.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/main.js#L254-L274)
- 抽卡：开局 10 连仅一次；营地 5 连每营地一次。[GachaSystem.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/GachaSystem.js#L66-L155) + [main.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/main.js#L454-L476)
- 战斗：六方向相邻移动/攻击；速度排序回合；回合上限由关卡配置。[hex-battle.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/hex-battle.js#L123-L133)
- 阵亡处理：胜利时阵亡角色留在备选池不可用，失败时恢复。[main.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/main.js#L361-L390)

## 数据持久化（localStorage）
- 角色池：fightdemo_character_pool。[GachaSystem.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/GachaSystem.js#L35-L63)
- 关卡配置：fightdemo_stages（含 maxTeamSize、mapId、enemySpawns）。默认配置见 [default-stages.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/default-stages.js)，读取入口在 [StageEditor.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/StageEditor.js#L1-L40)
- 地图存档：
  - 当前地图快照：fightdemo.hex-map.v1
  - 全局默认地图：fightdemo.hex-map.default.v1
  - 关卡地图集合：fightdemo.hex-map.stage.v1
  见 [hex-map-editor.js](file:///c:/Users/27184/Documents/trae_projects/fightdemo/js/hex-map-editor.js#L4-L203)

## 文档与辅助文件
- 游戏规则文档：[GAME_RULES.md](file:///c:/Users/27184/Documents/trae_projects/fightdemo/GAME_RULES.md)
- 更新日志：[CHANGELOG.md](file:///c:/Users/27184/Documents/trae_projects/fightdemo/CHANGELOG.md)
- 战场演示页：hexagonal-battlefield.html（六边形战场 UI 试验页）。[hexagonal-battlefield.html](file:///c:/Users/27184/Documents/trae_projects/fightdemo/hexagonal-battlefield.html)
