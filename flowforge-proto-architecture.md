# FlowForge Proto — 项目架构与实现说明

> **更新日期**：2026-06-26  
> **作者**：齐活林（Qi）· 交付总监

---

## TL;DR

FlowForge Proto 是一个**面向游戏对话流（Dialogue Flow）的可视化脚本编辑器**。基于 React + Vite + xyflow 构建的 SPA，配合轻量级 Node.js 本地文件服务，实现节点拖拽、连线编排、参数系统、撤销/重做、文件保存/打开的完整工作流。输出格式为 `.flow` JSON DSL。

---

## 1. 项目概述

### 1.1 是什么

**FlowForge Proto** 是一个**节点式流程图编辑器**，专为游戏剧情/对话系统设计。策划或开发者通过可视化拖拽节点、连线来编排游戏中的对话流、分支选择和事件触发逻辑。

### 1.2 核心价值

| 维度 | 说明 |
|------|------|
| **可视化编排** | 告别手写 JSON/XML，直接在画布上搭建对话流程 |
| **领域专用 DSL** | `.flow` JSON 格式，结构化描述节点、参数、连线关系 |
| **参数系统** | 支持固定值 / 引用参数 两种模式，节点可读写全局参数 |
| **轻量级** | 纯前端 + 最小后端，不到 15 个源文件 |
| **可扩展** | 内置节点定义（builtinNodes）即可扩展新节点类型，无需改编辑器核心 |

### 1.3 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **前端框架** | React | 19.2.7 |
| **构建工具** | Vite | 8.1.0 |
| **语言** | TypeScript | 6.0.2 |
| **流程画布** | @xyflow/react | 12.11.1 |
| **状态管理** | zustand | 5.0.14 |
| **UUID 生成** | uuid | 14.0.1 |
| **后端运行时** | Node.js (native http) | — |
| **代码检查** | oxlint | 1.69.0 |

---

## 2. 项目目录结构

```
flowforge-proto/
├── index.html                  # SPA 入口 HTML
├── package.json                # 项目依赖与脚本
├── vite.config.ts              # Vite 配置（含 /api 代理到 3001）
├── tsconfig.json               # TS 根配置（引用 app + node 两个 project）
├── tsconfig.app.json           # 前端 TS 编译选项
├── tsconfig.node.json          # Node 端 TS 编译选项
├── .gitignore
├── .oxlintrc.json              # oxlint 规则配置
├── README.md
│
├── public/
│   ├── favicon.svg
│   └── icons.svg
│
├── server/                     # ⬅ 轻量级 Node.js 后端
│   ├── index.cjs               #    文件保存/打开 API
│   └── sample.flow.json        #    示例流程文件
│
├── src/                        # ⬅ 前端源码
│   ├── main.tsx                #    应用入口，挂载 React
│   ├── App.tsx                 #    根组件（直接渲染 AppShell）
│   ├── index.css               #    全局样式 & CSS 变量（设计令牌）
│   │
│   ├── types/
│   │   └── index.ts            #    全量 TypeScript 类型定义
│   │
│   ├── store/
│   │   └── editorStore.ts      #    Zustand 全局状态（核心 Store）
│   │
│   ├── data/
│   │   └── builtinNodes.ts     #    内置节点定义（6 种节点类型）
│   │
│   └── components/
│       ├── layout/
│       │   └── AppShell.tsx    #    应用外壳布局 + 键盘快捷键 + 保存逻辑
│       │
│       ├── toolbar/
│       │   └── Toolbar.tsx     #    顶部工具栏（文件名、脏标记、撤销/重做）
│       │
│       ├── canvas/
│       │   ├── FlowCanvas.tsx  #    流程画布（ReactFlow 容器）
│       │   └── FlowNodeComponent.tsx  # 自定义节点渲染组件
│       │
│       └── panels/
│           ├── NodeLibrary.tsx      # 左侧节点库面板（拖拽/搜索/分类）
│           ├── ParametersPanel.tsx  # 画布内参数浮层面板
│           ├── PropertyPanel.tsx    # 右侧属性编辑面板
│           └── StatusBar.tsx        # 底部状态栏
│
└── dist/                       # 构建产物
```

---

## 3. 架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser (SPA)                              │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ NodeLib  │  │ FlowCanvas│  │ Property │  │ ParametersPanel  │   │
│  │ (左侧)   │  │ (中央)    │  │ (右侧)   │  │ (画布浮层)       │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
│       │             │             │                  │              │
│       │       ┌─────┴─────┐       │                  │              │
│       └───────┤  zustand   ├───────┘                  │              │
│               │ editorStore│──────────────────────────┘              │
│               └─────┬─────┘                                         │
│                     │                                               │
│  ┌──────────────────┴──────────────────────────────┐               │
│  │              AppShell (布局 + 快捷键 + 保存)      │               │
│  └──────────────────┬──────────────────────────────┘               │
│                     │  HTTP POST /api/save|save-as|open             │
└─────────────────────┼──────────────────────────────────────────────┘
                      │  vite proxy: /api → localhost:3001
┌─────────────────────┼──────────────────────────────────────────────┐
│              Node.js Server (server/index.cjs)                      │
│                                                                     │
│  POST /api/save      →  保存到指定路径                                │
│  POST /api/save-as   →  另存为（写入项目目录）                         │
│  POST /api/open      →  打开示例文件                                  │
│  GET  /api/list-samples → 列出 .flow 文件                            │
│                                                                     │
│  输出格式: .flow JSON (FlowDocument schema)                          │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.1 数据流

```
用户操作 (拖拽/连线/编辑参数)
       │
       ▼
Zustand Store (editorStore.ts)
  ├─ nodes: FlowNode[]
  ├─ edges: FlowEdge[]
  ├─ parameters: FlowParameter[]
  ├─ history: HistoryEntry[]  (最多 50 条快照)
  └─ selectedNodeIds
       │
       ▼
所有组件通过 selector 订阅所需状态
  useEditorStore(s => s.nodes)
  useEditorStore(s => s.edges)
  ...
       │
       ▼
Ctrl+S → serializeDocument() → JSON → fetch /api/save
```

### 3.2 状态管理架构

```
EditorStore (zustand)
│
├─ 画布数据层
│   ├── nodes: FlowNode[]          ← @xyflow/react 的 Node 扩展类型
│   ├── edges: FlowEdge[]          ← @xyflow/react 的 Edge 扩展类型
│   └── parameters: FlowParameter[]  ← 全局参数列表
│
├─ 选择与视图
│   ├── selectedNodeIds / selectedEdgeIds
│   └── viewport { x, y, zoom }
│
├─ 编辑器元数据
│   ├── filePath / isDirty
│   ├── nodeDefinitions[]          ← 从 builtinNodes 加载
│   └── validationResult
│
├─ 历史记录
│   ├── history: HistoryEntry[]    ← 最多 50 条快照
│   └── historyIndex: number
│
└─ Actions
    ├── addNode / deleteNodes
    ├── addEdge / deleteEdges
    ├── updateNodeParam / updateNodePosition
    ├── addParameter / removeParameter
    ├── loadDocument / clearCanvas
    ├── undo / redo
    └── setSelection / setViewport / setValidationResult
```

### 3.3 撤销/重做机制

```
操作前                          操作后
history: [A] [B] [C]          history: [A] [B] [C] [D]   ← 新增快照
         idx=2                           idx=3

Undo：回退到 history[idx-1]，idx--
Redo：前进到 history[idx+1]，idx++

快照策略：
- 仅快照 nodes / edges / parameters（不包含选择状态）
- JSON 序列化实现深拷贝（store.restore / store.snapshot）
- 重复快照自动去重（JSON 比较）
- 上限 50 条（超出时 shift 最老记录）
```

---

## 4. 类型系统（types/index.ts）

### 4.1 核心类型关系

```
NodeDefinition          —— 节点模板（定义 pins / params）
        │
        ▼ 实例化
FlowNode (extends @xyflow Node)
  └─ data: FlowNodeData
       ├─ nodeType ← def.type
       ├─ params: Record<string, ParamValue>
       │    └─ { source: 'fixed', value: X } | { source: 'param', value: key }
       └─ writes?: WriteDefinition[]

FlowEdge (extends @xyflow Edge)
  └─ data: FlowEdgeData
       ├─ sourcePin: string
       └─ targetPin: string

FlowParameter           —— 全局参数（可被节点 param 引用）
  ├─ key, type, default
  └─ source: 'flow_input' | 'node' | 'expression'

FlowDocument            —— 序列化格式 (.flow JSON)
  ├─ version, meta
  ├─ parameters: FlowParameter[]
  ├─ nodes: unknown[]   （精简后的节点数据）
  └─ edges: unknown[]   （精简后的连线数据）
```

### 4.2 参数来源模型

```
ParamSource:
  'fixed'         → 固定值，用户在属性面板直接输入
  'param'         → 引用全局参数，值从 FlowParameter 获取
  'param_or_fixed'→ 用户可在两种模式间切换（如 speaker 字段）
```

### 4.3 Pin（引脚）类型

```
PinType: 'flow' | 'string' | 'number' | 'float' | 'boolean' | 'enum' | 'event' | 'any' | 'text'
```

---

## 5. 内置节点定义（builtinNodes.ts）

| 类型 | 类别 | 标签 | 说明 | 颜色 |
|------|------|------|------|------|
| `flow_start` | flow | Flow Start | 对话流入口，仅输出 | `#534AB7` |
| `flow_end` | flow | Flow End | 终止流，仅输入 | `#534AB7` |
| `dialogue_line` | dialogue | Dialogue Line | 显示一句对话，含说话者/表情/自动推进/延迟 | `#D85A30` |
| `branch_choice` | dialogue | Branch Choice | 玩家多选分支（A/B/C 三个输出引脚） | `#D85A30` |
| `condition` | dialogue | Condition | 变量条件判断（T/F 两个输出引脚） | `#D85A30` |
| `event_trigger` | events | Event Trigger | 触发游戏事件（音效、相机抖动、奖励等） | `#1D9E75` |

**扩展方式**：在 `builtinNodeDefinitions` 数组中追加新的 `NodeDefinition` 对象即可，编辑器无需任何修改。

---

## 6. 组件详细说明

### 6.1 AppShell（外壳布局）

```
┌────────────────────────────────────────────────────────┐
│ Toolbar                          [←] [→]   3 nodes     │  ← 40px
├────────┬───────────────────────────────┬───────────────┤
│        │                               │               │
│  Node  │      FlowCanvas               │  Property     │
│ Library│      (ReactFlow)              │  Panel        │
│ 150px  │       flex:1                  │  180px        │
│        │                               │               │
│        │    ┌──────────┐               │               │
│        │    │Parameters│               │               │
│        │    │ 浮层面板  │               │               │
│        │    └──────────┘               │               │
│        │                               │               │
├────────┴───────────────────────────────┴───────────────┤
│ StatusBar    sample.flow │ 6 nodes, 6 edges │ 100%     │  ← 28px
└────────────────────────────────────────────────────────┘
```

**职责**：
- 提供 `ReactFlowProvider` 上下文（xyflow 必需）
- 注册全局键盘快捷键（Ctrl+S 保存 / Ctrl+Z 撤销 / Ctrl+Y 重做）
- 调用 `serializeDocument()` 将 Store 状态序列化为 FlowDocument JSON

### 6.2 FlowCanvas（画布）

**功能清单**：
- ReactFlow 容器，配置节点类型映射 `{ flowNode: FlowNodeComponent }`
- 节点连线 (`onConnect` → `addEdge`)
- 节点拖放 (`onDrop` — 从 NodeLibrary 拖入)
- 右键菜单 (`onContextMenu` — 显示 Add Node 弹出菜单)
- 选择管理 (`onSelectionChange` / `onNodeClick` / `onPaneClick`)
- 键盘操作 (`onKeyDown` — Delete/Backspace 删除选中，Ctrl+Z/Y)
- 背景点阵 (`Background variant=Dots`)
- 缩略图 (`MiniMap`) 和 控制器 (`Controls`)

### 6.3 FlowNodeComponent（节点渲染）

每个自定义节点渲染为：
```
┌──────────────────────┐
│  ● Flow Start        │  ← 颜色圆点 + 标签
├──────────────────────┤
│  speaker: $(npc_...) │  ← 参数摘要（最多显示 3 个）
│  text: Welcome, tr...│
│  expression: neutral │
│  writes: speaker     │  ← writes 提示（蓝色）
└──────────────────────┘
  ▲                  ▲
  flow_in       flow_out (branch_choice 有 A/B/C；condition 有 T/F)
```

特殊节点处理：
- `flow_start`：无输入 Handle
- `flow_end`：无输出 Handle
- `branch_choice`：3 个输出 Handle（choice_a/b/c），位置错开
- `condition`：2 个输出 Handle（flow_true=绿色, flow_false=红色）
- 被选中：蓝色边框 + 阴影
- 有验证错误：红色边框
- 禁用状态：opacity 0.45

### 6.4 NodeLibrary（节点库）

- **可折叠**：点击 ◀ 收起为 28px 竖条
- **搜索**：按 label / category / description 过滤
- **分类折叠**：按 category（flow / dialogue / events）分组，可单独折叠
- **拖拽**：`draggable` + `onDragStart` 设置 `application/node-type` MIME
- **双击**：直接在画布 (300, 200) 位置添加

### 6.5 PropertyPanel（属性面板）

- **可折叠**：点击 ▶ 收起为 28px 竖条
- **单选模式**：仅当选中 1 个节点时显示属性编辑
- **ParamEditor 子组件**：
  - `param_or_fixed` 参数显示 Fixed/Param 切换按钮
  - `fixed` 模式：根据类型渲染对应表单控件（input/text/textarea/select/checkbox/number）
  - `param` 模式：下拉选择兼容类型的全局参数
  - 类型兼容规则：`any↔any`, `同类型`, `number→float`, `enum→string`
- 显示节点 ID（8 位前缀）和 writes 列表

### 6.6 ParametersPanel（参数面板）

- **浮层定位**：absolute 在画布左上角
- **可折叠**：收起时显示 `Params (N)` 徽章
- **添加参数**：输入 key + 选择类型 → OK
- **删除参数**：每条参数右侧 × 按钮
- **类型标签**：用缩写徽章标识（s=string, n=number, f=float, b=boolean, e=enum）

### 6.7 Toolbar（工具栏）

- 显示项目名 `FlowForge — {文件名}`
- 脏状态指示器（绿点=已保存，黄点=未保存）
- 撤销/重做按钮（支持 disabled 状态）
- 节点计数

### 6.8 StatusBar（状态栏）

- 当前文件名
- 节点/边计数
- 验证错误/警告计数（红色/黄色）
- 缩放百分比

---

## 7. 后端服务（server/index.cjs）

### 7.1 API 路由

| 方法 | 路径 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| POST | `/api/save` | 保存到指定路径 | `{ path, content }` | `{ ok, path }` |
| POST | `/api/save-as` | 另存为（写入项目根） | `{ content }` | `{ ok, path }` |
| POST | `/api/open` | 打开示例文件 | — | `{ content, path }` |
| GET | `/api/list-samples` | 列出 .flow 文件 | — | `{ files }` |
| OPTIONS | `*` | CORS 预检 | — | 204 |

### 7.2 实现特点

- 零依赖：仅使用 Node.js 内置 `http`, `fs`, `path` 模块
- 端口 3001，由 Vite dev server 通过 proxy 代理
- CORS 全放行（本地开发环境）
- JSON 读写，无数据库

---

## 8. 启动与构建

```bash
# 安装依赖
npm install

# 开发模式
# 终端1: 启动后端
node server/index.cjs          # → http://localhost:3001
# 终端2: 启动前端
npm run dev                    # → http://localhost:5173（Vite 代理 /api → 3001）

# 生产构建
npm run build                  # → dist/

# 预览构建产物
npm run preview                # → Vite preview server

# 代码检查
npm run lint                   # → oxlint
```

> **注意**：`npm run dev` 只启动前端 Vite 开发服务器，后端需要单独启动。当前 `package.json` 未配置 `concurrently`，建议后续添加 `"dev:all"` 脚本。

---

## 9. 设计模式与约定

### 9.1 无 UI 框架依赖

项目**未使用** MUI / Ant Design / Tailwind CSS，所有 UI 通过 **内联 style** 实现，使用 CSS 变量（`--color-*`）作为设计令牌。这使得项目零额外 UI 依赖。

### 9.2 CSS 变量体系

```css
:root {
  --font-sans / --font-mono / --font-serif
  --color-background-primary / secondary / tertiary
  --color-background-info / danger / success / warning
  --color-text-primary / secondary / tertiary
  --color-text-info / danger / success / warning
  --color-border-primary / secondary / tertiary
  --color-border-info / danger / success / warning
  --border-radius-md / lg / xl
}
```

### 9.3 状态管理模式

- **单一 Store**：所有编辑器状态集中在 `editorStore.ts`
- **Selector 优化**：每个组件只订阅需要的字段（避免不必要的重渲染）
- **历史快照**：深拷贝 + JSON 比较去重，上限 50 条

### 9.4 组件通信

- **全部通过 zustand Store**：无 props 逐层传递，无 Context（除 ReactFlowProvider）
- **React.memo**：FlowNodeComponent 使用 `memo` 优化重渲染

### 9.5 扩展约定

- 新增节点类型：仅需在 `builtinNodes.ts` 中追加 `NodeDefinition`
- 新增参数类型：在 `types/index.ts` 扩展 `ParamType`，在 `PropertyPanel.tsx` 的 `renderFixedInput` 中添加 case
- 新增引脚类型：扩展 `PinType`，节点定义中使用

---

## 10. 当前功能完成度

| 功能 | 状态 | 备注 |
|------|------|------|
| 节点拖放添加 | ✅ 完成 | 拖拽 + 双击 + 右键菜单 |
| 节点连线 | ✅ 完成 | xyflow 原生支持 |
| 节点删除 | ✅ 完成 | Delete/Backspace |
| 参数编辑 (fixed) | ✅ 完成 | 6 种类型表单控件 |
| 参数引用 (param) | ✅ 完成 | 类型兼容过滤 |
| 撤销/重做 | ✅ 完成 | 50 步历史栈 |
| 文件保存/另存为 | ✅ 完成 | 本地文件系统 |
| 示例文件打开 | ✅ 完成 | sample.flow.json |
| 节点搜索 | ✅ 完成 | 实时过滤 |
| 全局参数管理 | ✅ 完成 | 添加/删除 |
| 验证系统 | ⚠️ 框架已就绪 | validationResult 类型已定义，Store 有 setter，但无实际验证逻辑 |
| 文件打开对话框 | ❌ 未实现 | 目前只能打开示例文件 |
| 多选节点 | ⚠️ 框架支持 | Shift+点击多选，但属性面板不支持多选编辑 |
| 节点复制粘贴 | ❌ 未实现 | — |
| 导出/导入 | ❌ 未实现 | — |
| 流程执行/预览 | ❌ 未实现 | 纯编辑器，无运行时 |

---

## 11. 关键设计决策

| 决策 | 理由 |
|------|------|
| 不使用 UI 框架 | 保持零依赖，CSS 变量体系足够灵活 |
| zustand 而非 Redux | 更轻量，API 简单，适合中等复杂度 |
| 参数来源模型（fixed/param） | 巧妙支持"硬编码值"和"参数引用"两种模式，满足策划/程序协作需求 |
| 历史快照用 JSON 深拷贝 | 简单可靠，50 条快照内存开销可接受 |
| 后端用原生 http 模块 | 功能简单（4 个 API），无需 Express/Koa |
| 节点类型映射到 xyflow nodeTypes | 利用 ReactFlow 的自定义节点能力，扩展性强 |

---

## 12. 建议的后续优化方向

1. **完善验证系统**：实现 `validate()` 函数，检查未连线节点、未填参数、类型不匹配等
2. **文件打开对话框**：通过 `/api/list-samples` 已有基础，需前端 UI + `/api/open?path=xxx`
3. **快捷键增强**：Ctrl+C/V 复制粘贴、Ctrl+A 全选、Ctrl+D 复制节点
4. **并发启动脚本**：添加 `concurrently` 一键启动前后端
5. **节点搜索增强**：支持拼音首字母、标签过滤
6. **暗色主题**：利用现有 CSS 变量体系，添加 `[data-theme="dark"]` 变量覆盖
