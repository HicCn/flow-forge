# FlowForge

> 面向游戏开发的节点式可视化流程编辑器 —— 拖拽节点，连线逻辑，一键生成引擎代码。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-orange)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19.x-61DAFB)](https://react.dev)

---

## 这是什么

FlowForge 是一个**桌面端节点编辑器**，专为游戏策划和独立开发者设计。

用可视化的方式搭建对话剧情、任务链、事件触发流程，然后**一键导出代码**，直接接入 Unity / Godot / Cocos 等引擎的运行时。

内置了一个 RPG 村庄 NPC 对话的完整示例，打开就能跑。

---

## 核心功能

| 功能 | 说明 |
|------|------|
| 🎨 **可视化编辑** | ReactFlow 画布，拖拽节点、连线逻辑，所见即所得 |
| 🔧 **可扩展节点系统** | 自由定义节点类型：引脚、参数、分类，TypeManager 统一管理；内置 7 种节点 + 3 种流程类型开箱即用 |
| 🧬 **多语言代码生成** | 从节点定义生成代码（C# / TypeScript 等），与手写代码共存不覆盖 |
| 📑 **多标签页** | 同时编辑多个流程文件 |
| ↩️ **撤销/重做** | 50 层历史栈，Ctrl+Z / Ctrl+Y |
| 🌐 **中英双语** | 界面自动跟随系统语言，支持切换 |
| 💾 **标准文档格式** | `.flow` JSON 格式，人类可读，版本化，支持 Git 协作 |
| 🖥️ **跨平台桌面端** | Windows / macOS / Linux，Tauri 2 打包，原生性能 |

---

## 内置节点一览

| 节点 | 分类 | 功能 |
|------|------|------|
| `Flow Start` | 流程控制 | 流程入口点 |
| `Flow End` | 流程控制 | 流程终止 |
| `Dialogue Line` | 对话 | 对话行：说话人、文本、表情、自动推进、延迟 |
| `Branch Choice` | 对话 | 分支选择：A/B/C 三条玩家选项 |
| `Condition` | 逻辑 | 条件分支：变量比较，T/F 两条出口 |
| `Event Trigger` | 事件 | 触发游戏事件：动画、音效、奖励等 |
| `Call Flow` | 流程 | 调用其他流程，传递参数 |

---

## 设计哲学

> 这个项目的每一个设计决策背后都有一个被现实毒打过的理由。

### 一、需求前置，定义驱动一切

**先定义"这个节点是什么"，再让编辑器、代码生成器、运行时各自消费同一份定义。**

整个系统的基石是 `NodeDefinition`——一个描述节点行为的 TypeScript 对象：它有哪些引脚、哪些参数、参数是什么类型、该出现在哪种流程里。这份定义是**唯一真相源（Single Source of Truth）**：

```
NodeDefinition（一份定义）
    ├─→ 编辑器：渲染节点、生成属性面板、校验输入
    ├─→ 代码生成：输出目标语言代码（C# / TypeScript / ...）
    └─→ 引擎运行时：按 pin 执行控制流
```

不是"编辑器长什么样就生成什么代码"，而是反过来的——**定义决定了编辑器、代码和运行时长什么样**。加一个新节点只需要写一份 NodeDefinition，三端同时生效。

这个顺序不能颠：需求定义在前，工具实现在后。颠倒了就成了硬编码编辑器 UI，加一个节点要改五个文件。

### 二、局限于配置，职责清晰

**这个工具只做一件事：编辑配置。不碰运行时，不管引擎，不画蛇添足。**

FlowForge 的边界很明确——它是配置层，不是执行层：

```
FlowForge（配置层）         Runtime（执行层）         引擎（集成层）
─────────────────        ─────────────────        ─────────────
编辑 .flow 文件           解析 .flow 文件          挂载 Runtime
生成目标语言代码          执行控制流              注入游戏上下文
管理节点类型定义          派发事件                 驱动渲染
```

编辑器输出的是数据（`.flow` JSON）和代码（`.gen.cs`），不是运行着的游戏。运行时怎么实现、引擎怎么集成，不是编辑器该管的事。职责不越界，每一层才能独立演化。

### 三、只增不改，标记代替删除

**类型定义一旦被使用，就不能简单地改掉或删掉。**

已有项目文件可能引用了旧类型，直接修改会导致数据断裂。所以采用**三段式生命周期**：

```
active → deprecated → deleted
  ↑         ↑            ↑
 可新建   已有文件      确认无引用
         仍可打开⚠      后才允许
```

已有类型需要改？标记为 `deprecated`，新建替代类型。旧文件继续工作，新文件用新类型。策划不会被"更新后打不开老项目"折磨。

### 四、嵌套流，组合优于平铺

**不是"一个文件写到底"，而是"大流程拆小流程，小流程互相调用"。**

`flow_call` 节点让一个流程可以调用另一个流程，就像函数调用一样：对话流程里调用一个"通用奖励发放流程"、任务流程里调用一个"通用 NPC 反应流程"。

```
主剧情流程
  ├─ [对话] NPC 给任务
  ├─ [调用] → 任务追踪流程（独立 .flow 文件）
  ├─ [对话] 任务完成反馈
  └─ [调用] → 奖励发放流程（独立 .flow 文件，可复用）
```

收益很明显：流程可复用（同一个奖励流程被多个任务复用）、可独立编辑（改子流程不影响主流程）、可独立测试（直接打开子流程文件运行）。

---

## 技术栈

```
前端      React 19 + TypeScript + Vite 8
编辑器     @xyflow/react (ReactFlow)
状态管理   Zustand 5
桌面端     Tauri 2 (Rust)
代码生成   Rust（多语言：C# / TypeScript / ...）
国际化     自研轻量方案 (useSyncExternalStore)
```

---

## 快速开始

### 下载预编译版本

从 [Releases](https://github.com/your-username/flowforge/releases) 下载对应平台安装包：

- **Windows**: `.msi` / `.exe` 安装程序
- **macOS**: `.dmg` 磁盘映像
- **Linux**: `.deb` / `.AppImage`

### 从源码构建

前置依赖：
- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://www.rust-lang.org/) (Tauri 构建需要)

```bash
# 克隆仓库
git clone https://github.com/your-username/flowforge.git
cd flowforge

# 安装前端依赖
npm install

# 开发模式（纯浏览器，需要同时启动后端）
npm run dev
node server/index.cjs          # 另一个终端

# Tauri 桌面开发模式
npm run tauri dev

# 构建桌面安装包
npm run tauri build
# 产物在 src-tauri/target/release/bundle/
```

### 浏览器开发模式

不装 Rust 也能在浏览器里跑：

```bash
npm install
npm run dev            # 终端 1：Vite dev server → http://localhost:5173
node server/index.cjs  # 终端 2：文件 API 服务 → http://localhost:3001
```

浏览器打开 `http://localhost:5173`，加载示例流程即可体验。

---

## 使用流程

```
新建流程 → 选择类型（剧情/任务/动作）
  → 从节点库拖入节点
  → 连线编排逻辑
  → 在属性面板编辑参数
  → Ctrl+S 保存为 .flow 文件
  → 导出 → 生成代码 → 导入引擎
```

### 示例流程

项目内置了一个 RPG 村庄 NPC 对话示例（`src-tauri/resources/sample.flow.json`）：

```
[开始] → [长老打招呼] → [是否接受任务？]
                            ├─ 接受 → [告知任务内容] → [结束]
                            └─ 拒绝 → [礼貌告别]     → [结束]
```

首次打开时自动加载，或从 `文件 → 打开示例` 手动加载。

---

## 文档格式

`.flow` 文件是标准 JSON，可以直接用 Git 追踪变更：

```json
{
  "version": "1.0",
  "meta": { "name": "quest_01", "author": "designer", "flow_type": "dialogue" },
  "parameters": [{ "key": "npc_name", "type": "string", "default": "村长" }],
  "nodes": [
    { "id": "node-1", "type": "dialogue_line", "position": {"x": 100, "y": 200},
      "params": { "speaker": {"source": "param", "value": "npc_name"}, "text": {...} } }
  ],
  "edges": [
    { "id": "e1", "source_node": "node-1", "source_pin": "flow_out",
      "target_node": "node-2", "target_pin": "flow_in" }
  ]
}
```

---

## 核心愿景

| # | 目标 | 说明 |
|---|------|------|
| 1 | **完整的增量更新** | 只重新生成变更的节点，不重跑全量。改一个对话流程不需要等整个项目重新编译 |
| 2 | **运行时调试** | 断点、单步执行、变量面板——策划在编辑器里就能验证流程逻辑，不需要每次都进引擎跑一遍 |
| 3 | **配置文件的跨版本管理** | 工具升级后旧 `.flow` 文件无缝打开，自动迁移、兼容提示。配置比工具活得久 |
| 4 | **更多语言支持** | C# / TypeScript 先行，后续扩展到 GDScript、Lua 等引擎常用语言

---

## 贡献

欢迎提 Issue 和 PR。

- 遇到 bug → [提交 Issue](https://github.com/your-username/flowforge/issues)
- 有功能想法 → 先在 Issue 里讨论再动手
- 提交 PR → 确保通过 `npm run lint`

---

## 许可证

[MIT](LICENSE) — 随意使用、修改、商用。

---

## 联系作者

- QQ：1273615260
- 欢迎反馈、建议、合作交流

---

## 支持作者

如果这个项目帮到了你，欢迎请我喝杯咖啡 ☕

<div align="center">
  <table>
    <tr>
      <td align="center"><b>微信</b></td>
      <td align="center"><b>支付宝</b></td>
    </tr>
    <tr>
      <td><img src="https://your-cdn.com/wechat-qr.png" width="180" alt="微信赞赏"></td>
      <td><img src="https://your-cdn.com/alipay-qr.png" width="180" alt="支付宝赞赏"></td>
    </tr>
  </table>
</div>

---

*Made with 🗿 by an indie game developer, for indie game developers.*
