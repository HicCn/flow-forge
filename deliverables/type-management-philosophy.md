# FlowForge 类型维护哲学

> 版本：1.0 | 日期：2026-07-05

---

## 核心原则

### 一、只增不改，标记代替删除

永远不直接修改或删除已存在的类型定义。需要变更时，标记为 `deprecated`（弃用）并创建替代类型。

```
旧类型 + 已存在的文件 → 继续工作，显示警告，引导迁移
新类型             → 用于新建文件
```

**为什么**：策划的配置会随时间演化，但已有项目文件不能断裂。标记 deprecated 比直接删除安全——文件仍然能打开、编辑、导出，只是不再作为新建选项。

---

### 二、三层统一生命周期

同一个状态机应用于所有可配置实体：

| 层 | 实体 | 当前状态 |
|----|------|---------|
| FlowType | 流程类型（剧情流/任务流/动作流…） | 已实现 |
| NodeDefinition | 节点定义（对话/条件/事件…） | 后续 |
| ParamDefinition | 参数定义 | 后续 |

**状态机：**

```
                    ┌──────────────────┐
                    │                  │
   新建 ──────────► │     active       │ 可被新建文件/节点使用
                    │                  │
                    └───────┬──────────┘
                            │ 标记"弃用"
                            ▼
                    ┌──────────────────┐
                    │                  │
                    │   deprecated     │ 已有文件继续工作，不可新建
                    │                  │ 渲染为 ⚠ 过期样式，提示迁移
                    └───────┬──────────┘
                            │ 全量扫描：确认无文件引用
                            ▼
                    ┌──────────────────┐
                    │                  │
                    │    deleted       │ 从配置中永久移除
                    │                  │
                    └──────────────────┘
```

| 状态 | 新建可用 | 已有文件可用 | 可执行操作 |
|------|---------|------------|-----------|
| `active` | ✓ | ✓ | 弃用 |
| `deprecated` | ✗ | ✓（标 ⚠） | 启用 / 删除（无引用时） |
| `deleted` | ✗ | ✗ | 不可恢复 |

**删除前置条件**：必须全量扫描项目内所有 `.flow` 文件，确认无任何引用后，才允许删除。

---

### 三、配置归用户，内核归代码

```
代码层（不可变）              用户层（可变 / localStorage）
─────────────                ──────────
builtinFlowTypes        ←→     customFlowTypes
builtinNodeDefinitions ←→     customNodes（后续）
builtinParams           ←→     customParams（后续）

运行时合并：用户覆盖优先于代码默认
```

| 维度 | 代码内置 (`builtin: true`) | 用户自定义 (`builtin: false`) |
|------|---------------------------|------------------------------|
| 编辑 | 仅可覆盖 `status`，不可改 id/label/description | 全 CRUD |
| 删除 | 不可删除，仅可标记 deprecated | 可删除（确认无引用后） |
| 存储 | TypeScript 代码 | localStorage → 后续 `project.json` |
| 版本 | 代码版本 | `version` 自增（每次编辑 +1） |

---

### 四、ConfigStore 是唯一入口

所有类型查询和修改 **必须** 通过 `configStore`，禁止直接读写 `builtinFlowTypes` 或 `localStorage`：

```ts
// ✓ 正确 — 包含用户自定义 + 内置类型覆盖
import { useConfigStore } from '../store/configStore';
const types = useConfigStore(s => s.getActiveFlowTypes());

// ✗ 错误 — 遗漏用户自定义和覆盖
import { builtinFlowTypes } from '../data/flowTypes';
```

`configStore` 提供：

| 方法 | 返回 |
|------|------|
| `getFlowTypes()` | 所有非 deleted 类型（内置 + 自定义，覆盖后合并） |
| `getActiveFlowTypes()` | 仅 `status === 'active'` |
| `findFlowType(id)` | 按 id 查找（包括 deprecated） |
| `addFlowType()` / `updateFlowType()` | 自定义类型 CRUD |
| `setFlowTypeStatus(id, status)` | 标记内置/自定义类型的生命周期 |
| `deleteFlowType(id)` | 删除自定义类型 |

**合并规则**：若 `customFlowTypes` 中存在与内置类型同 `id` 的条目，则该条目为内置类型的 **覆盖**——以自定义的 `status` 为准，其余字段保留内置值。

---

### 五、打开文件时兼容优先

不拒绝打开任何历史文件。类型过期不意味数据过期。

```
打开 .flow 文件
  → 读取 meta.flow_type
  → configStore.findFlowType(id)
  ├─ 找到且 active → 正常打开
  ├─ 找到但 deprecated → 正常打开 + Toolbar 显示 ⚠ 标记
  └─ 找不到 → 弹窗提示原因，让用户选择替代类型或只读查看
```

---

### 六、TypeManager 的职责范围

`TypeManager` 是 **配置管理层的唯一 UI 入口**，负责所有可配置实体的生命周期：

```
TypeManager
├── FlowType 管理（已实现）
│   ├── 查看：[内置] / [自定义] 标签，active / deprecated 状态
│   ├── 新建：名称 + 描述
│   ├── 编辑：名称 + 描述（内置类型编辑会生成覆盖记录）
│   ├── 弃用：标记 deprecated（内置和自定义均可）
│   ├── 启用：恢复 active
│   └── 删除：仅自定义 + 确认 + 未来需扫描引用
│
├── NodeDefinition 管理（占位）
│   └── 待实现
│
└── 持久化
    └── localStorage（当前） → .flowforge/project.json（后续）
```

---

## 后续演进

| 阶段 | 内容 |
|------|------|
| 当前 | FlowType CRUD + 弃用/启用（localStorage） |
| 下一步 | NodeDefinition 管理（同上生命周期） |
| 后续 | 项目工作区（project.json）、删除前置扫描 |
| 远期 | 策划完全自定配置，程序只实现节点运行时 |

---

*此文档随项目演化更新。*
