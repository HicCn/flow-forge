# FlowForge 功能规格文档

**日期**：2026-06-26
**版本**：v1.0
**依赖**：[UI 布局需求](../requirements/ui-layout-requirements.md) · [产品 PRD](../product-strategy/prd-flow-editor-game-dev-2026-06-25.md)

---

## 1. 系统架构

```
┌──────────────────────────────────────────────────────┐
│                    Tauri 桌面壳                       │
│  ┌────────────────────┐  ┌────────────────────────┐  │
│  │   React 前端        │  │   Rust 后端             │  │
│  │                    │  │                        │  │
│  │  ┌───编辑器核心───┐ │  │  ┌──文件系统─────────┐ │  │
│  │  │ 画布渲染      │ │  │  │ 读写 .flow JSON    │ │  │
│  │  │ 交互管理      │ │  │  │ 监听文件变更       │ │  │
│  │  │ 状态同步      │ │  │  │ 最近文件列表       │ │  │
│  │  └──────────────┘ │  │  └──────────────────┘ │  │
│  │  ┌──DSL 引擎────┐  │  │  ┌──DSL 加载────────┐  │  │
│  │  │ 解析 DSL 定义 │  │  │  │ 扫描 DSL 目录     │ │  │
│  │  │ 生成节点类型  │  │  │  │ 校验 DSL 格式     │ │  │
│  │  │ Pin 类型校验  │  │  │  │ 热加载监听       │ │  │
│  │  └──────────────┘  │  │  └──────────────────┘ │  │
│  │  ┌──序列化───────┐  │  │  ┌──导出────────────┐ │  │
│  │  │ JSON 编解码   │  │  │  │ 模板引擎          │ │  │
│  │  │ UUID 生成     │  │  │  │ Yarn/Lua 转换     │ │  │
│  │  │ 版本兼容      │  │  │  │ CSV 导出          │ │  │
│  │  └──────────────┘  │  │  └──────────────────┘ │  │
│  │  ┌──校验系统────┐  │  │                        │  │
│  │  │ 节点完整性    │  │  │                        │  │
│  │  │ 连线合法性    │  │  │                        │  │
│  │  │ 循环检测      │  │  │                        │  │
│  │  └──────────────┘  │  │                        │  │
│  └────────────────────┘  └────────────────────────┘  │
└──────────────────────────────────────────────────────┘
          ↕ IPC (invoke / event)
    前端与后端通过 Tauri 命令通信
```

### 1.1 前后端职责分割

| 层 | 职责 | 不负责 |
|---|---|---|
| **React 前端** | 画布渲染、交互响应、状态管理、DSL 解析（供 UI 使用） | 文件 IO、持久化、导出转换 |
| **Rust 后端** | 文件读写、DSL 目录扫描与热加载、导出模板渲染、系统对话框 | 任何 UI 逻辑 |

### 1.2 IPC 命令清单

| 命令 | 方向 | 说明 |
|---|---|---|
| `open_file` | 前端→后端 | 弹出系统对话框，读取 .flow JSON 返回前端 |
| `save_file` | 前端→后端 | 接收 JSON 字符串，写入文件 |
| `load_dsl_definitions` | 前端→后端 | 扫描 DSL 目录，返回全部节点定义 |
| `watch_dsl_dir` | 后端→前端 | DSL 文件变更事件推送，触发前端热重载 |
| `export_yarn` | 前端→后端 | 传入工作流 JSON，返回 Yarn 格式文本 |
| `export_lua` | 前端→后端 | 传入工作流 JSON，返回 Lua 模板代码 |
| `validate_workflow` | 前端→后端 | 可选：后端复验 JSON Schema 合法性 |

---

## 2. 模块划分

### 2.1 前端模块

| 模块 | 技术依赖 | 职责 |
|---|---|---|
| **Canvas** | ReactFlow (@xyflow/react) | 画布渲染、节点布局、连线绘制、缩放平移 |
| **Interaction** | ReactFlow + React | 拖放、框选、右键菜单、快捷键 |
| **NodeRenderer** | React 组件 | 各类型节点的自定义渲染 |
| **PinSystem** | ReactFlow Handle | 多 Pin 管理、类型标记、连线校验回调 |
| **DSLResolver** | 纯 TS | 解析 DSL 定义 JSON，生成节点类型注册表 |
| **PropertyPanel** | React + 动态表单 | 根据选中节点 DSL 定义渲染属性编辑表单 |
| **SearchPanel** | React + 命令面板 | Cmd+K 搜索面板、模糊匹配、排序 |
| **StateStore** | Zustand | 全局状态：节点列表、连线列表、选中状态、历史栈 |
| **Validator** | 纯 TS | 工作流校验：必填参数、未连接 Pin、循环引用 |
| **Serializer** | 纯 TS | 状态对象 ↔ .flow JSON 序列化/反序列化 |
| **Minimap** | ReactFlow Minimap | 小地图渲染 |

### 2.2 后端模块

| 模块 | 技术依赖 | 职责 |
|---|---|---|
| **FileManager** | tauri::fs | 文件打开/保存对话框、读写操作 |
| **DSLWatcher** | notify crate | 监听 DSL 目录变化，推送事件 |
| **Exporter** | 模板引擎 | Yarn Spinner / Lua / CSV 格式导出 |
| **SchemaValidator** | jsonschema crate | 可选的 JSON Schema 后端复验 |

---

## 3. 数据模型

### 3.1 工作流文件 (.flow)

```jsonc
{
  "version": "1.0",
  "meta": {
    "name": "chapter_1_intro",
    "author": "designer_name",
    "created_at": "2026-06-26T10:00:00Z",
    "updated_at": "2026-06-26T12:30:00Z",
    "dsl_version": "1.2.0"
  },
  "parameters": [
    { "key": "npc_name", "type": "string", "default": "Elder Sage", "source": "flow_input" },
    { "key": "quest_id", "type": "number", "default": 42,          "source": "flow_input" }
  ],
  "nodes": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "type": "dialogue_line",
      "position": { "x": 320, "y": 240 },
      "params": {
        "speaker":    { "source": "param", "value": "npc_name" },
        "text":       { "source": "fixed", "value": "Who goes there?" },
        "expression": { "source": "fixed", "value": "neutral" },
        "auto_advance": true,
        "delay": 2.0
      },
      "disabled": false
    }
  ],
  "edges": [
    {
      "id": "edge-uuid-here",
      "source_node": "a1b2c3d4-...",
      "source_pin": "flow_out",
      "target_node": "b2c3d4e5-...",
      "target_pin": "flow_in"
    }
  ],
  "subgraphs": [...],
  "groups": [...]
}
```

> edges 仅包含 flow 类型的执行流连线。数据流转通过 `parameters` 声明 < → `params` 引用完成。

### 3.2 节点定义 DSL (.node.json)

```jsonc
{
  "dsl_version": "1.0",
  "node": {
    "type": "dialogue_line",
    "category": "dialogue",
    "label": "Dialogue Line",
    "description": "Display a line of dialogue with speaker and expression",
    "color": "#D85A30",
    "icon": "message-square"
  },
  "pins": {
    "inputs": [
      { "id": "flow_in",    "label": "",  "type": "flow",   "required": true  }
    ],
    "outputs": [
      { "id": "flow_out",   "label": "",  "type": "flow",   "required": true  }
    ]
  },
  "params": [
    {
      "key": "speaker",
      "type": "string",
      "label": "Speaker",
      "default": "",
      "required": true,
      "source": "param_or_fixed"
    },
    {
      "key": "text",
      "type": "text",
      "label": "Dialogue",
      "default": "",
      "required": true,
      "source": "fixed"
    },
    {
      "key": "expression",
      "type": "enum",
      "label": "Expression",
      "default": "neutral",
      "required": false,
      "options": ["neutral","happy","angry","sad","surprised"],
      "source": "param_or_fixed"
    },
    {
      "key": "auto_advance",
      "type": "boolean",
      "label": "Auto Advance",
      "default": false,
      "required": false,
      "source": "fixed"
    },
    {
      "key": "delay",
      "type": "float",
      "label": "Delay (s)",
      "default": 1.5,
      "required": false,
      "min": 0.0,
      "max": 30.0,
      "source": "fixed"
    }
  ],
  "writes": [
    { "key": "speaker", "type": "string", "description": "Update current speaker after this dialogue" }
  ]
}
```

#### 参数 `source` 字段

| source 值 | 含义 | 属性面板表现 |
|---|---|---|
| `fixed` | 仅支持固定值（手填） | 显示输入控件，无参数引用的下拉切换 |
| `param` | 仅支持引用 Parameters 面板中的参数 | 显示下拉选择，无固定值输入 |
| `param_or_fixed` | 可切换：固定值 或 引用参数 | 显示双模控件（单选切换） |

#### 节点 `writes` 声明

`writes` 数组声明该节点运行后会**写入 Parameters 面板**的参数。编辑器据此在 Parameters 面板和属性面板中展示数据来源信息。引擎 Runtime 负责执行实际的写入逻辑。

### 3.3 Pin 类型（画布可见）

画布上**仅显示 `flow` 类型 Pin**，用于控制节点执行顺序。

| 类型标识 | 含义 |
|---|---|
| `flow` | 执行流/控制流，只能 flow → flow |

### 3.4 参数类型系统（Panels 引用）

以下类型用于 Parameters 面板和属性面板的引用校验，不在画布上生成 Pin：

| 类型标识 | 含义 | 引用兼容 |
|---|---|---|
| `string` | 文本 | string → string |
| `number` | 整数 | number → number, number → float |
| `float` | 浮点数 | float → float, float → number |
| `boolean` | 布尔值 | boolean → boolean |
| `enum` | 枚举 | enum → string, enum → enum |
| `event` | 事件引用 | event → event |
| `any` | 任意类型 | any ↔ 任意 |
| `array` | 数组（P1） | array[T] ↔ array[T] |

---

## 4. DSL 注册机制

### 4.1 注册流程

```
1. 程序编写 .node.json 文件 → 放入项目 DSL 目录
2. 编辑器启动 / 热加载 → Rust 扫描 DSL 目录
3. 校验 DSL 格式 → 解析为 NodeDefinition[]
4. 推送到前端 → DSLResolver 生成注册表
5. 节点库面板更新 → 策划可在画布使用该节点
```

### 4.2 DSL 目录结构

```
project/
└── flowforge-dsl/
    ├── dialogue/
    │   ├── dialogue_line.node.json
    │   ├── branch_choice.node.json
    │   └── condition.node.json
    ├── quest/
    │   ├── accept_quest.node.json
    │   └── complete_quest.node.json
    └── flow/
        ├── loop.node.json
        └── wait.node.json
```

### 4.3 DSL 热加载

Rust 后端使用 `notify` crate 监听 DSL 目录：
- `.node.json` 新增 → 注册新节点类型
- `.node.json` 修改 → **拒绝**，已注册的节点定义不可修改。需新建节点类型或新增参数
- `.node.json` 删除 → 需先通过使用情况检查（见 4.5），通过后方可删除

### 4.4 节点创建与参数声明（程序员工作流）

程序创建新节点类型的完整流程：

```
1. 在 flowforge-dsl/<category>/ 目录下新建 .node.json 文件
2. 声明节点基本信息：type、category、label、description
3. 声明 Pin（输入/输出接口）：
   - 每个 Pin 定义 id、label、type、required
   - 多 Pin 节点按顺序排列（flow_in 通常为第一个输入，flow_out 为第一个输出）
4. 声明参数（params）：
   - 每个参数定义 key、type、label、default、required
   - 可选字段：min/max（数值）、options（枚举）、placeholder、description
5. 保存文件 → DSL 热加载 → 节点立即出现在编辑器的节点库中
```

### 4.5 DSL 增量更新原则（不可变性）

**核心原则：DSL 定义一旦生效，不可修改。采用纯增量更新策略。**

```
  可以做的              不可以做的
  ─────────            ──────────
  ✅ 新增节点类型        ❌ 修改已有节点定义
  ✅ 新增参数（追加）     ❌ 修改已有参数类型
  ✅ 新增 Pin（追加）     ❌ 修改已有 Pin 类型
  ✅ 删除（检查后）       ❌ 删除已有参数/Pin
                         ❌ 修改 node.type 标识
```

#### 4.5.1 设计理由

| 原则 | 理由 |
|---|---|
| **不可修改** | 节点定义是程序与策划之间的契约。一旦有 .flow 文件使用了该节点，修改定义等于单方面改契约，已配置的数据必然面临不一致 |
| **可追加** | 新增参数时提供 `default` 值，已有实例自动继承默认值，校验可通过。可选 Pin 同理 |
| **可删除（需检查）** | 删除是支持的，但必须先检查所有 .flow 文件，确认该定义未被使用 |

#### 4.5.2 新增参数规则

向已有节点定义追加参数时：

```jsonc
// 原定义有 2 个参数，追加第 3 个
"params": [
  { "key": "speaker",  "type": "string", "required": true  },
  { "key": "text",     "type": "text",   "required": true  },
  // ↓ 新增：必须提供 default
  { "key": "emotion",  "type": "enum",   "required": false, "default": "neutral", "options": ["neutral","happy","sad"] }
]
```

- **必选参数不可追加** — 因为已存在的实例无法提供值。如需新增必选参数，应创建新节点类型
- **可选参数可追加** — 必须提供 `default`，已有实例自动填充默认值
- **追加顺序**：新参数追加到数组末尾，属性面板按 DSL 顺序渲染

#### 4.5.3 删除检查机制

删除 DSL 定义文件前，编辑器扫描项目内所有 `.flow` 文件，检查使用情况：

```
删除流程：
1. 用户删除 .node.json 文件（或通过编辑器界面操作）
2. 编辑器扫描所有 .flow 文件 → 查找使用该节点类型的实例
3. ↓
   ├─ 无使用记录 → 允许删除，DSL 热卸载
   └─ 有使用记录 → 拒绝删除，弹窗列出受影响的文件：
        "无法删除 'dialogue_line'，以下文件中有 12 个实例在使用：
          - chapter_1.flow (4 个)
          - chapter_2.flow (8 个)
         请先替换或移除这些节点后再删除。"
```

#### 4.5.4 需要新节点类型而非修改的典型场景

| 场景 | 做法 |
|---|---|
| 对话节点需要新增必选参数 `character_id` | 创建 `dialogue_line_v2` 新节点类型，保留旧定义 |
| 条件节点需要把 Pin 类型从 boolean 改为 number | 创建 `condition_number` 新节点类型 |
| 任务节点的流程逻辑需要重新设计 | 创建 `quest_v2` 系列新节点类型 |

旧定义保留不动，新需求用新类型表达。策划逐步迁移至新类型节点，迁移完成后可手动删除旧定义（需通过使用检查）。

---

## 5. Parameters 系统（声明式数据流转）

**核心原则：节点间执行顺序走 flow 连线，数据流转走 Parameters 面板声明。**

### 5.1 设计动机

ComfyUI 式"什么数据都连线"在游戏配置场景中会导致画布被数据线淹没。声明式方案将控制流（flow）与数据流分离：
- 画布 = 只画 flow 连线，干净
- 参数 = 悬浮垂直面板声明引用，像填表
- 面板浮在画布左上角，可拖拽，可折叠

### 5.2 数据结构

工作流文件的 `parameters` 数组存储所有可引用的参数：

```jsonc
"parameters": [
  { "key": "npc_name", "type": "string", "default": "Elder Sage", "source": "flow_input" },
  { "key": "quest_id", "type": "number", "default": 42,          "source": "flow_input" },
  { "key": "speaker",  "type": "string", "default": "",          "source": "node", "node_id": "xxx" },
  { "key": "is_hard",  "type": "boolean","default": false,       "source": "expression", "expression": "difficulty >= 3" }
]
```

| 字段 | 说明 |
|---|---|
| `key` | 参数唯一标识，节点通过此 key 引用 |
| `type` | 类型，决定引用校验规则 |
| `default` | 默认值，Flow Input 参数在无外部注入时使用 |
| `source` | 来源：`flow_input` / `node` / `expression` |

### 5.3 参数三种来源

| source | 创建方式 | 生命周期 |
|---|---|---|
| `flow_input` | 策划手动 Add 添加，或 Flow Input 节点自动创建 | 流程生命周期内不变（除非节点写入覆盖） |
| `node` | 某节点运行后写入，由 DSL 的 `writes` 字段声明 | 每次该节点执行后更新 |
| `expression` | 基于已有参数的计算表达式 | 依赖的参数变化时重新求值 |

### 5.4 节点参数引用

节点属性中的参数来源通过 `{ "source": "...", "value": "..." }` 结构记录：

```jsonc
// 固定值
"speaker": { "source": "fixed", "value": "Elder Sage" }

// 引用 Parameters 中的参数
"speaker": { "source": "param", "value": "npc_name" }
```

属性面板根据 `source` 渲染对应的控件模式。

### 5.5 Flow Input 节点

编辑器内置的特殊节点类型，用于声明流程入口参数：

```
Flow Input 节点属性面板：
  npc_name    string    "铁匠老王"    [+]
  quest_id    number    42            [+]
  mood        enum      angry         [+]

每个参数添加后会同步到 Parameters 面板，source 标记为 flow_input
```

Flow Input 节点只能有一个，固定出现在画布最左侧。

### 5.6 与校验系统的关系

| 校验项 | 说明 |
|---|---|
| 参数引用存在性 | 节点引用 `param` 的 key 必须在 `parameters` 数组中存在 |
| 参数引用类型兼容 | `param` 引用的类型必须与节点参数要求的类型兼容 |
| 节点产出声明 | `writes` 的 key 自动注册到 `parameters`（如不存在），类型由 DSL 声明 |
| 未引用参数警告 | `parameters` 中存在但无节点引用的参数给出信息提示 |

### 5.7 与增量更新原则的关系

- `parameters` 可追加：新增 Flow Input 参数或节点 writes 不影响已有配置
- `parameters` 不可修改类型：修改会导致已有引用不兼容，按增量原则拒绝
- `parameters` 可删除（需检查）：删除前扫描所有节点的 param 引用，有引用则阻断

---

## 6. 校验系统

### 6.1 校验层级

| 层级 | 触发时机 | 校验内容 |
|---|---|---|
| **Pin 级** | 连线拖拽松手时 | flow → flow 兼容性 |
| **节点级** | 参数修改时 | 必填参数非空、数值范围、枚举合法值、参数引用目标存在且类型兼容 |
| **工作流级** | 保存 / 手动触发 | 孤立节点、未连接必选 flow Pin、循环引用、Subgraph 参数绑定、未引用参数、参数引用悬空 |

### 6.2 校验结果结构

```jsonc
{
  "valid": false,
  "errors": [
    {
      "level": "error",
      "code": "MISSING_REQUIRED_PARAM",
      "node_id": "a1b2c3...",
      "message": "Parameter 'speaker' is required",
      "param_key": "speaker"
    },
    {
      "level": "error",
      "code": "PIN_TYPE_MISMATCH",
      "edge_id": "edge-xxx",
      "message": "Cannot connect string to number",
      "source_pin_type": "string",
      "target_pin_type": "number"
    }
  ],
  "warnings": [
    {
      "level": "warning",
      "code": "OPTIONAL_PIN_UNCONNECTED",
      "node_id": "b2c3d4...",
      "message": "Optional pin 'speaker_in' is not connected"
    },
    {
      "level": "warning",
      "code": "DEPRECATED_NODE_TYPE",
      "node_id": "c3d4e5...",
      "message": "Node type 'old_dialogue' is deprecated"
    }
  ]
}
```

### 6.3 循环引用检测

使用 DFS 遍历 flow 类型连线，检测是否存在回环。检测到循环时：
- 状态栏显示 ❌ 红色
- 循环路径上的连线以红色虚线高亮

---

## 7. 序列化规范

### 7.1 版本策略

- 工作流文件包含 `meta.dsl_version`
- 编辑器读取时检查版本，不支持的高版本拒绝打开并提示升级
- 旧版本文件自动迁移（如有 breaking change）

### 7.2 UUID 生成

- 格式：UUID v4（`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`）
- 每个节点、连线、Subgraph、组都独立生成 UUID
- 复制粘贴时重新生成所有 UUID，保留引用关系映射
- 跨文件复制时 $ref 引用转为内联

### 7.3 JSON 格式要求

- 缩进：2 空格
- 排序：meta → nodes → edges → subgraphs → groups
- 换行：每个节点对象独立一行（方便 Git diff）
- 不包含 `/* */` 注释

---

## 8. 状态管理

### 8.1 状态结构

```typescript
interface EditorState {
  // 文件
  filePath: string | null;
  isDirty: boolean;

  // 图数据
  nodes: FlowNode[];
  edges: FlowEdge[];               // 仅 flow 类型连线
  groups: NodeGroup[];

  // 参数
  parameters: FlowParameter[];     // Parameters 面板数据

  // 交互
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  viewport: { x: number; y: number; zoom: number };

  // DSL
  nodeDefinitions: NodeDefinition[];
  dslVersion: string;

  // 校验
  validationResult: ValidationResult | null;

  // 历史
  history: HistoryEntry[];
  historyIndex: number;
}
```

### 8.2 历史栈（撤销/重做）

- 最多 50 步
- 记录粒度：每次用户操作（增删节点、连线、修改参数、移动）
- 防抖：连续移动只记录起点和终点
- 快照：每次保存时记录完整快照

### 8.3 脏状态追踪

`isDirty` 为 true 时触发：
- 标题栏圆点变橙色
- 关闭窗口前弹保存确认
- 切换工作流 Tab 前弹保存确认

---

## 9. 导出系统

### 9.1 导出格式

| 格式 | 用途 | 引擎适配 |
|---|---|---|
| `.flow` JSON | 原生格式，完整保留 | 任何引擎（通过 Runtime 插件） |
| Yarn Spinner | 剧情对话 | Unity Yarn Spinner 插件 |
| Lua | 任务/事件系统 | 自定义游戏框架 |
| CSV | 表格化数据导入 | Excel/Google Sheets |

### 9.2 导出模板机制

后端使用模板引擎（如 Tera），导出格式由模板文件定义：

```
export-templates/
├── yarn/
│   └── dialogue.tera     # 将 flow nodes → Yarn 语法
├── lua/
│   ├── quest.tera         # 将 quest nodes → Lua 函数
│   └── event.tera         # 将 event nodes → Lua 事件注册
└── csv/
    └── dialogue.tera      # 将对话节点 → CSV 表格
```

### 9.3 导出流程

```
1. 用户点击 Export → 选择格式
2. 前端序列化当前工作流为 JSON
3. invoke("export_xxx", { workflow_json, template_name })
4. Rust 后端：解析 JSON → 结构体 → 传入模板 → 渲染文本
5. 弹出保存对话框 → 写入目标文件
```

---

## 10. 节点组（Subgraph）

### 10.1 创建

- 框选多个节点 → Ctrl+G 或右键菜单 → 创建节点组
- 命名节点组，暴露对外参数
- 组内节点不直接出现在画布 L0，以一个 Subgraph 节点替代

### 10.2 参数暴露

```
Subgraph "Quest Template"
  内部节点: AcceptQuest(id, npc) → KillTask(count) → CompleteQuest(id)
  暴露参数: quest_id (string), kill_count (number)
  对外 Pin: flow_in → flow_out
```

创建时自动识别未连接的内部 Pin，作为候选暴露参数。

### 10.3 编辑

- 双击 Subgraph 节点 → 画布进入 L1 层，显示内部节点
- 面包屑导航：`dialogue_test.flow > Quest Template (L1)`
- 状态栏显示当前层级 "L1"

---

## 11. 扩展点设计

### 11.1 插件化节点集

MVP 内置节点集（剧情 8 + 任务 4）作为"官方插件"实现。后续引擎适配时：
- Unity 团队发布 `flowforge-nodes-unity` DSL 包
- Unreal 团队发布 `flowforge-nodes-unreal` DSL 包
- DSL 目录支持多 source 合并

### 11.2 主题系统

- 内置 Light / Dark 两套主题
- 节点颜色跟随 DSL 定义，不受主题影响（保持领域一致性）
- 布局面板颜色跟随主题

### 11.3 快捷键自定义

- 设置面板中可查看和修改快捷键映射
- 与主题一起持久化到 `~/.flowforge/settings.json`
- 由 Rust 后端管理读写

---

## 12. 性能要求

| 指标 | 目标 |
|---|---|
| 画布流畅帧率 | 30+ FPS（100 节点以内） |
| 首次打开时长 | < 2 秒（含 DSL 加载） |
| 保存文件时长 | < 200ms |
| 搜索响应 | < 100ms（模糊匹配 200 个节点类型） |
| 撤销/重做 | < 50ms |
| 内存占用 | < 200MB（100 节点工作流） |
| 内存占用（空闲） | < 80MB |
| 安装包大小 | < 50MB（Tauri 压缩后） |

---

## 13. 技术依赖清单

### 前端 (React)

| 依赖 | 版本要求 | 用途 |
|---|---|---|
| react | ^18 | UI 框架 |
| typescript | ^5 | 类型安全 |
| vite | ^5 | 构建工具 |
| @xyflow/react | ^12 | 画布 + 节点编辑器 |
| zustand | ^4 | 状态管理 |
| react-markdown | ^9 | 属性面板 Markdown 渲染 |
| fuse.js | ^7 | 模糊搜索 |
| uuid | ^9 | UUID v4 生成 |

### 后端 (Rust / Tauri)

| 依赖 | 版本要求 | 用途 |
|---|---|---|
| tauri | ^2 | 桌面壳 |
| serde + serde_json | ^1 | JSON 序列化 |
| notify | ^6 | 文件系统监听 |
| tera | ^1 | 导出模板引擎 |
| uuid | ^1 | UUID v4（后端生成） |
| jsonschema | ^0.18 | Schema 后端复验 |

### 开发工具

| 工具 | 用途 |
|---|---|
| VS Code + rust-analyzer | Rust 开发 |
| VS Code + CodeLLDB | Rust 断点调试 |
| VS Code + ESLint + Prettier | 前端代码规范 |
| Git | 版本控制 |
