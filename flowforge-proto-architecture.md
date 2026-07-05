# FlowForge Proto — 技术实现文档

> **更新日期**：2026-07-05
> **版本**：v2.0

---

## TL;DR

FlowForge Proto 是一个**面向游戏内容生产（对话/任务/事件）的节点式可视化流程编辑器**。基于 Tauri + React + @xyflow/react 构建的桌面应用，支持可视化编排、参数系统、Tab 多文档、撤销/重做、DSL 类型管理、多语言、代码生成（C# Runtime）等完整功能。输出格式为 `.flow` JSON DSL。

---

## 1. 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **前端框架** | React | 19.2.7 |
| **构建工具** | Vite | 8.1.0 |
| **语言** | TypeScript | 6.0.2 |
| **流程画布** | @xyflow/react | 12.11.1 |
| **状态管理** | zustand | 5.0.14 |
| **桌面壳** | Tauri | 2.x |
| **后端语言** | Rust | edition 2021 |
| **后端依赖** | serde, serde_json, tauri-plugin-dialog, tauri-plugin-fs | — |
| **代码检查** | oxlint | 1.69.0 |
| **UUID** | uuid | 14.0.1 |

---

## 2. 项目目录结构

```
flowforge-proto/
├── index.html                      # SPA 入口 HTML
├── package.json                    # npm 依赖与脚本
├── vite.config.ts                  # Vite 配置
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── tauri.conf.json                 # Tauri 桌面应用配置
│
├── src/                            # ⬅ 前端 (React + TypeScript)
│   ├── main.tsx                    # 应用入口
│   ├── App.tsx                     # 路由: Landing / Editor
│   ├── index.css                   # CSS 变量体系
│   ├── types/index.ts              # 全量 TS 类型定义
│   ├── store/
│   │   ├── appStore.ts             # 应用状态 (screen, recentFiles, paths)
│   │   ├── editorStore.ts          # 编辑器核心 (nodes/edges/params/tabs/history)
│   │   ├── configStore.ts          # 类型配置 (FlowType/NodeDef/EnumType CRUD)
│   │   └── editorMetaStore.ts      # 编辑器元数据 (per-node comments)
│   ├── data/
│   │   ├── flowTypes.ts            # 3 个内置流程类型
│   │   └── builtinNodes.ts         # 7 个内置节点定义
│   ├── api/fileApi.ts              # 文件 API (Tauri invoke + Browser HTTP fallback)
│   ├── i18n/                       # 零依赖国际化 (zh-CN / en-US)
│   │   ├── index.ts, types.ts
│   │   └── locales/{zh-CN,en-US}.ts
│   ├── utils/dragBridge.ts         # WebView2 拖拽桥接
│   ├── components/
│   │   ├── layout/AppShell.tsx      # 编辑器主壳
│   │   ├── toolbar/Toolbar.tsx      # 顶部工具栏
│   │   ├── canvas/
│   │   │   ├── FlowCanvas.tsx       # ReactFlow 画布
│   │   │   └── FlowNodeComponent.tsx
│   │   ├── panels/
│   │   │   ├── NodeLibrary.tsx      # 节点库（左）
│   │   │   ├── PropertyPanel.tsx    # 属性面板（右）
│   │   │   ├── ParametersPanel.tsx  # 参数面板（浮层）
│   │   │   └── StatusBar.tsx        # 状态栏（底）
│   │   └── modals/
│   │       ├── TypePickerModal.tsx
│   │       ├── SettingsModal.tsx
│   │       ├── TypeManagerModal.tsx
│   │       └── NodeEditModal.tsx
│   └── screens/LandingScreen.tsx    # 首页
│
├── src-tauri/                      # ⬅ Rust 后端 (Tauri)
│   ├── src/
│   │   ├── main.rs                 # Windows 入口
│   │   ├── lib.rs                  # Tauri App + 5 个 command
│   │   └── code_generator/
│   │       ├── mod.rs              # 模块入口 + embed Runtime 文件
│   │       ├── parser.rs           # NodeDefinition JSON 解析
│   │       └── generator_cs.rs     # C# 代码生成
│   └── Cargo.toml                  # Rust 依赖
│
├── runtime/cs/                     # C# 运行时基类（6 文件）
│   ├── NodeStatus.cs               # 执行状态枚举
│   ├── INodeHandler.cs             # 节点生命周期接口
│   ├── IWireOuts.cs                # 输出接线接口
│   ├── INodeDataReceiver.cs        # JSON 数据接收
│   ├── IRuntime.cs                 # 运行时上下文接口
│   └── Param.cs                    # 参数封装泛型类
│
├── cli/                            # 独立 CLI 代码生成器（Node.js）
│   ├── generate.cjs                # CLI 入口
│   ├── lib/
│   │   ├── types.cjs               # 类型映射 + 校验
│   │   ├── gen-csharp.cjs          # C# 生成
│   │   └── gen-typescript.cjs      # TS 生成
│   ├── output/csharp/              # 预生成示例
│   └── runtime/csharp/             # 完整 C# Runtime 库
│
└── server/                         # 浏览器 dev HTTP 后端
    ├── index.cjs                   # Node.js HTTP (:3001)
    └── sample.flow.json            # 示例流程
```

---

## 3. 架构总览

```
┌────────────────────────────────────────────────────────────────┐
│                       Tauri 桌面壳                              │
│                                                                 │
│  ┌── React 前端 ────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  AppShell                                                 │  │
│  │  ├─ Toolbar (操作按钮 + 撤销重做)                         │  │
│  │  ├─ TabBar (多文档切换)                                   │  │
│  │  ├─ NodeLibrary (左) → FlowCanvas (中) ← Property (右)   │  │
│  │  │                   → ParametersPanel (浮层)             │  │
│  │  └─ StatusBar (底)                                        │  │
│  │                                                           │  │
│  │  4 个 zustand Store:                                      │  │
│  │  ├─ editorStore (nodes / edges / tabs / history)         │  │
│  │  ├─ configStore (flowTypes / nodeDefs / enums)           │  │
│  │  ├─ appStore (screen / recentFiles / paths)              │  │
│  │  └─ editorMetaStore (per-node comments)                  │  │
│  │                                                           │  │
│  │  TypeManager 三件套:                                      │  │
│  │  └─ FlowType + NodeType + EnumType CRUD                  │  │
│  │                                                           │  │
│  │  API 层 (fileApi.ts):                                     │  │
│  │  └─ 自动检测 Tauri / Browser 模式，对应 IPC / HTTP       │  │
│  └───────────────────────────────────────────────────────────┘  │
│        ↕ invoke()                    ↕ HTTP (dev fallback)       │
│  ┌── Rust 后端 ────────────────┐  ┌── server/index.cjs ──────┐  │
│  │ save_file / open_file       │  │ /api/save / /api/open     │  │
│  │ list_flow_files             │  │ /api/export-runtime       │  │
│  │ read_sample_file            │  └───────────────────────────┘  │
│  │ gen_runtime_cs              │                                 │
│  │   ├─ parser (JSON → IR)     │                                 │
│  │   └─ generator_cs (IR → .cs)│                                 │
│  └─────────────────────────────┘                                 │
└────────────────────────────────────────────────────────────────┘
```

### 3.1 Tauri Commands（5 个）

| Command | 用途 |
|---------|------|
| `save_file` | 写入文本内容到指定路径（自动创建父目录） |
| `open_file` | 读取文件全部文本内容 |
| `list_flow_files` | 列出目录下所有 `.flow` 文件 |
| `read_sample_file` | 读取打包的 `resources/sample.flow.json` |
| `gen_runtime_cs` | 从 NodeDefinition JSON 生成 C# .gen.cs + 拷贝 Runtime 基类 |

### 3.2 导出代码生成链路

```
编辑器 → 点击"导出代码" → Tauri Dialog 选目录
  → invoke("gen_runtime_cs", { nodeDefs, outputDir })
  → parser: JSON → Vec<NodeDefinition>
  → generator_cs: 每个 NodeDefinition 生成 .gen.cs partial class
  → 写入 {outputDir}/Generated/{Type}Node.gen.cs
  → 复制 6 个 Runtime 基类到 {outputDir}/Runtime/ (已存在则跳过)
  → 返回 GenerateResult (generated / runtime_files / skipped_runtime)
```

---

## 4. 状态管理（4 个 Zustand Store）

| Store | 职责 | 持久化 |
|-------|------|--------|
| **appStore** | `screen`（landing/editor）、`recentFiles`（最多 5 个）、`configDir`/`scriptDir` | localStorage |
| **editorStore** | 核心文档：nodes/edges/parameters/filePath/isDirty/viewport、**Tab 多文档系统**、undo/redo（50 步历史快照）、选择管理、文档加载/清空 | 无持久化（文件驱动） |
| **configStore** | FlowType + NodeDefinition + EnumType 的 CRUD、内置定义与自定义定义的合并覆盖 | localStorage |
| **editorMetaStore** | per-node comments（不附在 .flow JSON，存 .flow.meta 侧文件） | 无持久化（随编辑会话） |

### 4.1 EditorStore Tab 多文档系统

```
openTab(filePath, flowType) → 创建 TabData
closeTab(tabId)              → 先 flush 到 editorState，再删除
switchTab(tabId)             → flush 当前 → load 目标

flush机制：序列化当前 nodes/edges/params → 写回 TabData
load机制：TabData → 恢复 editorState
```

### 4.2 撤销/重做

- 快照范围：nodes / edges / parameters（不含选择状态）
- 上限 50 条，JSON 序列化深拷贝 + 去重
- 撤销：`history[--historyIndex]`，重做：`history[++historyIndex]`

---

## 5. 类型系统

### 5.1 核心类型关系

```
NodeDefinition (DSL 模板: type, category, pins, params, writes)
  │
  ▼ 实例化
FlowNode (extends @xyflow Node)
  └─ data: FlowNodeData
       ├─ nodeType ← def.type
       ├─ params: Record<string, ParamValue>
       │    └─ { source: 'fixed', value: X } | { source: 'param', value: key }
       └─ writes?: WriteDefinition[]

FlowEdge (extends @xyflow Edge)
  └─ data: FlowEdgeData { sourcePin, targetPin }

FlowParameter (全局参数)
  ├─ key, type, default
  └─ source: 'flow_input' | 'node' | 'expression'
```

### 5.2 参数来源模型

| source | 含义 | 控件表现 |
|--------|------|---------|
| `fixed` | 固定值 | 直接输入控件 |
| `param` | 引用全局参数 | 下拉选择兼容类型参数 |
| `param_or_fixed` | 可切换 | Fixed/Param 切换按钮 + 对应控件 |

### 5.3 Pin 类型

```
flow | string | number | float | boolean | enum | event | any | text
```

画布上仅显示 `flow` 类型 Pin。其他类型用于参数面板的类型校验。

---

## 6. 内置数据类型

### 6.1 内置流程类型（3 个）

| id | label | 说明 |
|----|-------|------|
| `dialogue` | 剧情流 (Dialogue Flow) | 对话驱动、分支选择 |
| `quest` | 任务流 (Quest Flow) | 任务步骤、条件、奖励 |
| `action` | 动作流 (Action Flow) | 事件触发、动画、音效 |

### 6.2 内置节点定义（7 个）

| type | category | 说明 | Pin 特点 |
|------|----------|------|----------|
| `flow_start` | flow | 流程入口 | 仅输出 |
| `flow_end` | flow | 流程终止 | 仅输入 |
| `dialogue_line` | dialogue | 显示一行对话 | 1 in + 1 out |
| `branch_choice` | dialogue | 多选分支 | 1 in + 3 out (A/B/C) |
| `condition` | dialogue | 条件判断 | 1 in + 2 out (T/F) |
| `event_trigger` | events | 触发游戏事件 | 1 in + 1 out |
| `flow_call` | flow | 调用其他流程 | 1 in + 1 out，支持 isInput 参数转发 |

---

## 7. 代码生成系统

### 7.1 生成目标

DSL 节点定义（NodeDefinition）→ C# partial class（.gen.cs）

```csharp
// 生成: DialogueLineNode.gen.cs
public partial class DialogueLineNode : INodeHandler, IWireOuts, INodeDataReceiver
{
    // Pins
    public const string In_FlowIn = "flow_in";
    public const string Out_FlowOut = "flow_out";

    // Params
    public Param<string> Speaker { get; }
    public Param<string> Text { get; }

    // Lifecycle
    public virtual void OnEnter(IRuntime rt) { }
    public virtual NodeStatus OnTick(IRuntime rt, float delta) { ... }
    public virtual void OnExit(IRuntime rt) { }

    // Wiring
    public void SetOut(string pinId, INodeHandler target) { ... }

    // JSON data
    public void ReceiveNodeData(JsonElement nodeJson) { ... }
}
```

### 7.2 DSL → C# 类型映射

| DSL type | C# type |
|----------|---------|
| `string` / `text` / `enum` | `string` |
| `number` | `int` |
| `float` | `float` |
| `boolean` | `bool` |

### 7.3 双层代码生成

| 层级 | 工具 | 用途 |
|------|------|------|
| **编辑器内置** | Rust `code_generator` (Tauri invoke) | GUI 一键导出，弹出目录选择器 |
| **独立 CLI** | `cli/generate.cjs` (Node.js) | CI/脚本集成，命令行调用 |

两层共享相同的 C# 代码模板逻辑，保证输出一致。

---

## 8. 国际化 (i18n)

- 零外部依赖，基于 `useSyncExternalStore` 的响应式方案
- 支持中文（zh-CN）和英文（en-US）
- 类型安全：翻译 key 从 zh-CN 字典自动推导，TS 编译期校验
- 插值语法：`t('toolbar.save', { count: 3 })` → `保存 (3)`
- 语言设置持久化到 localStorage，通过 Settings 面板切换

---

## 9. 关键设计决策

| 决策 | 理由 |
|------|------|
| Tauri 桌面应用 | 策划不需要装 Node.js，一个 exe 即可 |
| zustand 而非 Redux | 轻量，API 简单，selector 模式避免不必要渲染 |
| 4 个 Store 分离 | 编辑器数据、类型配置、应用状态、元数据各自独立，职责清晰 |
| Tab 多文档系统 | 策划需要同时编辑多个流程（如对话 + 任务） |
| 零 UI 框架依赖 | CSS 变量体系足够，减少依赖和体积 |
| 内置 + 自定义节点并存 | 程序定义内置节点 + 策划通过 TypeManager 扩展 |
| 画布仅 flow 连线 | 数据流走 Parameters 声明，避免画布被数据线淹没 |
| 代码生成放 Rust | Tauri 无外部依赖，离线可用；保留 CLI 给 CI 用 |
| partial class 模式 | 生成文件声明数据，手写文件写逻辑，重生成不丢失手写代码 |
| WebView2 DragBridge | 绕过 WebView2 对 HTML5 DnD 的不完全支持 |

---

## 10. 功能完成度

| 功能 | 状态 | 备注 |
|------|------|------|
| 节点拖放/连线/删除 | ✅ | 拖拽 + 双击 + 右键菜单 |
| 参数编辑 (fixed/param) | ✅ | 6 种类型表单 + 双模式切换 |
| 撤销/重做 | ✅ | 50 步历史栈 |
| 文件保存/另存为/打开 | ✅ | Tauri 原生对话框 + 最近文件列表 |
| Tab 多文档 | ✅ | 支持打开多个 .flow 文件 |
| 节点搜索 | ✅ | 实时过滤 |
| 全局参数管理 | ✅ | 添加/删除/类型标记 |
| 类型管理中心 (TypeManager) | ✅ | FlowType + NodeType + EnumType CRUD |
| 国际化 | ✅ | 中文/英文切换 |
| 代码生成 (C# Runtime) | ✅ | 节点类 + Runtime 基类，目录选择导出 |
| 独立 CLI 生成器 | ✅ | `cli/generate.cjs` |
| 验证系统 | ⚠️ | validationResult 结构已定义，UI 有状态栏展示，实际校验逻辑待完善 |
| 节点复制粘贴 | ❌ | 未实现 |
| 节点组 (Subgraph) | ❌ | 未实现 |
| 多选属性编辑 | ❌ | 已支持多选，属性面板未适配 |
| 流程执行/预览 | ❌ | 纯编辑器，无运行时 |
| DSL 热加载 | ❌ | 规格中有设计，未实现 |

---

## 11. 旧文档审计

| 文档 | 日期 | 状态 | 说明 |
|------|------|------|------|
| **`flowforge-proto-architecture.md`**（本文档） | **2026-07-05** | ✅ 当前 | 已全面重写，替代旧版 v1.0 |
| `deliverables/specification/functional-specification.md` | 2026-06-26 | ⚠️ 目标规格 | 作为功能目标参考仍有效；导出部分（Tera→Yarn/Lua）与实际（Rust→C#）不一致；DSL热加载/Subgraph/完整校验未实现 |
| `deliverables/flowforge-i18n-design.md` | 2026-07-05 | ✅ 有效 | 设计文档，实现与设计一致 |
| `deliverables/type-management-philosophy.md` | 2026-07-05 | ✅ 有效 | 哲学文档，与实现一致 |
| `deliverables/product-strategy/prd-flow-editor-game-dev-2026-06-25.md` | 2026-06-25 | ✅ 有效 | PRD 产品策略文档，非实现文档 |
| `deliverables/requirements/ui-layout-requirements.md` | 2026-06-26 | ✅ 有效 | UI 需求文档，实现基本对齐 |
| `user-research-report.md` | 2025-06-25 | ✅ 有效 | 用户研究报告，非实现文档 |

### 关键差异记录

| 维度 | 功能规格 (2026-06-26) | 当前实现 (2026-07-05) |
|------|----------------------|----------------------|
| **架构** | React 前端 + Rust 后端 (Tauri) | ✅ 一致 |
| **DSL 热加载** | Rust notify crate 监听 | ❌ 未实现，节点定义通过 configStore 管理 |
| **导出格式** | Tera模板 → Yarn/Lua/CSV | Rust format! → C# (.gen.cs)，TS 待做 |
| **前端 IPC** | invoke("export_yarn")等 | invoke("gen_runtime_cs") |
| **校验系统** | 三级校验（Pin/节点/工作流） | ⚠️ 结构已定义，UI 有状态栏，实际逻辑待完善 |
| **Subgraph** | L0/L1 层级画布 | ❌ 未实现 |
| **ESLint/Prettier** | 按规格 | ❌ 使用 oxlint 替代 |
