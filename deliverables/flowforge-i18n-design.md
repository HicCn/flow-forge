# FlowForge 多语言 (i18n) 技术方案

> **范围：系统 UI 文本。节点定义（业务范畴）不翻译，保持英文。**

---

## 一、设计意图

### 1.1 为什么做多语言？

FlowForge 是一个面向游戏开发的节点式流程编辑器。编辑器的核心价值是**通用工具能力**（画布操作、文件管理、参数编辑），这些系统 UI 应该对中英文用户同样友好。语言切换功能是最小可行方案——不依赖浏览器设置、不搞自动检测强绑定，用户自己决定用什么语言。

### 1.2 为什么节点定义不翻译？

> 节点是业务范畴，不是系统 UI。

| 对比维度 | 系统 UI | 节点定义 |
|----------|---------|---------|
| 稳定性 | 极少变动 | 随业务高频增删改 |
| 受众 | 所有用户 | 同团队开发者 |
| 维护者 | 框架层 | 业务层 |
| 用语性质 | 通用 GUI 语言（Save、Delete、Properties） | 领域术语（Dialogue Line、Branch Choice、Event Trigger） |

把节点定义纳入翻译体系的问题：

1. **维护噩梦。** 每加一个新节点类型，就需要在至少两套语言包里同步翻译。翻译遗漏不会导致编译错误，是典型的静默 bug。
2. **概念二义性。** 业务团队讨论 "Dialogue Line" 时指同一个东西，一旦翻译成"对话行"/"台词行"/"对话节点"，不同语言用户之间就产生了术语鸿沟。
3. **伪需求。** 团队内跨国协作需要业务节点多语言是小众场景。真遇到这种需求时，在节点定义的 `label` 字段后加一个 `label_i18n` 字段即可，不应该让翻译系统承载这个复杂度。

**结论：节点定义保持英文作为单一事实来源，翻译系统只覆盖编辑器壳层的系统 UI。**

---

## 二、技术选型

### 2.1 方案对比

| 维度 | 自建轻量 | i18next + react-i18next | react-intl |
|------|:--:|:--:|:--:|
| 额外依赖 | **0** | 2 个包 (~15KB) | 1 个包 (~30KB) |
| 学习成本 | 1 个 hook，10 分钟 | i18next 概念体系 | ICU MessageFormat |
| 类型安全 | TS 字典天然类型安全 | 需额外声明 | 需额外声明 |
| 与项目哲学一致性 | ✅ 零框架依赖 | ❌ 引入新范式 | ❌ 偏重 |
| 当前需求匹配度 | ✅ 完美 | ⚠️ 功能过剩 | ❌ 大炮打蚊子 |

**选择：自建轻量方案。**

理由很直接：项目的 UI 层已经明确选择了零 CSS 框架路线（全内联样式），后端服务也是原生 `http` 模块。引入一个重量级 i18n 库与整个项目的极简哲学矛盾。自建方案 ~60 行代码、一个 hook、零依赖，完全够用。

### 2.2 设计原则

1. **类型安全。** 翻译 key 从 TS 字典类型自动推导，拼错 key 编译报错，杜绝 `t('savee')` 这类运行时 bug。
2. **同构约束。** 英文翻译字典声明为 `typeof zhCN`，任何新增 key 漏翻都会在编译期暴露。
3. **降级不崩溃。** 如果某个 key 在翻译字典中不存在，降级为显示 key 本身（而不是崩溃），方便开发调试。
4. **解耦 Store。** 不使用 Zustand，用 `useSyncExternalStore` 自建响应式通道。语言偏好不好入编辑器状态树。
5. **隐式语言切换。** 监听 `localStorage` 的 `storage` 事件，一个标签页切换语言，其他标签页同步响应。

---

## 三、架构设计

### 3.1 文件结构

```
src/
├── i18n/
│   ├── index.ts              # 导出：useT hook、setLocale、getLocale、Locale 类型
│   ├── locales/
│   │   ├── zh-CN.ts          # 中文翻译字典
│   │   └── en-US.ts          # 英文翻译字典（assert typeof zhCN）
│   └── types.ts              # TranslationKey 路径推导类型
```

### 3.2 数据流

```
┌──────────────┐    useSyncExternalStore     ┌─────────────────┐
│  localStorage │◄──────────────────────────►│  useT() hook     │
│  flowforge-   │   subscribe / getSnapshot  │  → t(key)        │
│  locale       │                            │  → locale        │
└──────┬───────┘                            └────────┬────────┘
       │ setLocale()                                 │ 各组件调用 t()
       │                                             ▼
  ┌────┴──────────┐                        ┌──────────────────┐
  │ 语言切换 UI    │                        │ Toolbar / Panels  │
  │ (Toolbar 增    │                        │ / StatusBar /     │
  │  下拉框)      │                        │ ContextMenu       │
  └───────────────┘                        └──────────────────┘
```

### 3.3 翻译 Key 覆盖范围

只翻译**系统壳层 UI**，按组件分模块组织：

| 模块 | Key 前缀 | 覆盖内容 |
|------|----------|---------|
| toolbar | `toolbar.*` | 文件操作按钮、标题 tooltip、节点计数 |
| nodeLibrary | `nodeLibrary.*` | 搜索 placeholder、折叠 tooltip、空结果提示 |
| propertyPanel | `propertyPanel.*` | 面板标题、空选择提示、参数模式切换按钮、无参数提示 |
| parametersPanel | `parametersPanel.*` | 面板标题、添加/删除 tooltip、空参数提示 |
| statusBar | `statusBar.*` | 文件状态、节点/边计数、错误/警告计数 |
| canvas | `canvas.*` | 右键菜单项 |

**不翻译的内容**（明确排除）：

- 节点定义的 `label` / `description` / `category` / `params[].label` / `params[].description`
- 节点类型标识符（如 `flow_start`、`dialogue_line`）
- 参数 key（技术标识符）
- 键盘快捷键（如 `Ctrl+Z`）
- 品牌名 `FlowForge`

### 3.4 插值语法

使用 `{key}` 格式，与 JSX 的 `{}` 天然区分：

```
// 英文
toolbar.nodeCount: '{count} nodes'
statusBar.errors:   '{count} error(s)'

// 中文（语序自然适配）
toolbar.nodeCount: '{count} 个节点'
statusBar.errors:   '{count} 个错误'
```

复用同一组 key，翻译字典中的值自动适配目标语言语序。

### 3.5 语言切换 UI

在 **Toolbar 右侧** 增加一个语言下拉选择器：

```
[FlowForge — file.flow]  ...  [New] [Open] [Save] [Save As] [ZH▼]  [←] [→]  3 nodes
```

选项：
- 中文 (zh-CN)
- English (en-US)

选项本身用当前语言显示（中文环境显示 "中文"，英文环境显示 "中文 (Chinese)"），确保切换后用户能找回原来的语言。

选择器样式与现有 Toolbar 按钮一致（`btnStyle()`），不引入新的视觉元素。

### 3.6 持久化与默认值

| 场景 | 行为 |
|------|------|
| 首次打开应用 | 检测 `navigator.language`，`zh-*` → 中文，其余 → 英文 |
| 用户手动切换 | 写入 `localStorage` 的 `flowforge-locale` key |
| 再次打开应用 | 读取 `localStorage`，覆盖浏览器语言检测 |
| 多标签页同步 | `storage` 事件监听，实时同步 |

---

## 四、关键数据结构

### 4.1 核心 Hook API

```typescript
// src/i18n/index.ts

/** 切换语言（同时持久化到 localStorage） */
function setLocale(locale: Locale): void;

/** 获取当前语言（非 React 上下文可用） */
function getLocale(): Locale;

/**
 * React Hook — 返回翻译函数和当前语言
 *
 * const { t, locale } = useT();
 * t('toolbar.save')                     // → '保存' | 'Save'
 * t('statusBar.nodes', { count: 3 })    // → '3 个节点' | '3 nodes'
 */
function useT(): { t: TFunction; locale: Locale };
```

### 4.2 类型推导

```typescript
type TranslationKey =
  | 'toolbar.untitled'
  | 'toolbar.new'
  | 'toolbar.open'
  | 'toolbar.save'
  | 'toolbar.saveAs'
  | 'toolbar.sample'
  | 'toolbar.undo'
  | 'toolbar.redo'
  | 'toolbar.nodeCount'
  | 'nodeLibrary.expand'
  | 'nodeLibrary.nodes'
  | // ... 全部从 zhCN 字典自动推导，无需手写
```

实际实现用递归类型从 `typeof zhCN` 自动展开所有路径，任何拼写错误在 IDE 中即时标红。

### 4.3 翻译字典示例

```typescript
// src/i18n/locales/zh-CN.ts
export const zhCN = {
  toolbar: {
    untitled: '未命名',
    new: '新建',
    open: '打开',
    save: '保存',
    saveAs: '另存为',
    sample: '示例',
    loadSample: '加载示例流程',
    undo: '撤销 (Ctrl+Z)',
    redo: '重做 (Ctrl+Y)',
    nodeCount: '{count} 个节点',
  },
  nodeLibrary: {
    expand: '展开节点库',
    nodes: '节点',
    search: '搜索节点...',
    collapse: '收起',
    noNodes: '无匹配节点',
  },
  propertyPanel: {
    expand: '展开属性面板',
    props: '属性',
    title: '属性',
    clickToEdit: '点击节点以编辑属性',
    nodesSelected: '已选择 {count} 个节点',
    noParams: '无可配置参数',
    writesTo: '写入参数',
    nodeId: 'ID:',
    unsupportedType: '不支持的类型',
    fixed: '固定值',
    param: '参数引用',
    selectParam: '-- 选择参数 --',
  },
  parametersPanel: {
    expand: '展开参数面板',
    params: '参数 ({count})',
    title: '参数',
    add: '添加参数',
    collapse: '收起',
    key: '键名',
    ok: '确定',
    remove: '移除',
    noParams: '暂无参数',
  },
  statusBar: {
    untitled: '未命名',
    nodes: '{count} 个节点',
    edges: '{count} 条连线',
    error: '{count} 个错误',
    noErrors: '无错误',
    warning: '{count} 个警告',
  },
  canvas: {
    contextMenu: {
      node: '节点',
      copy: '复制',
      delete: '删除',
    },
  },
} as const;
```

---

## 五、组件改造示例

以 Toolbar 为例，展示改造前后对比：

```tsx
// ── 改造前 ──
<button onClick={onSave} title="Save (Ctrl+S)" style={btnStyle()}>
  Save
</button>
<span>{nodes.length} nodes</span>

// ── 改造后 ──
import { useT } from '../../i18n';

export default function Toolbar({ ... }) {
  const { t } = useT();
  // ...

  return (
    <>
      <button onClick={onSave} title={t('toolbar.save') + ' (Ctrl+S)'} style={btnStyle()}>
        {t('toolbar.save')}
      </button>
      <span>{t('toolbar.nodeCount', { count: nodes.length })}</span>
    </>
  );
}
```

组件改动**非常机械**——找硬编码字符串 → 换成 `t('module.key')`。不需要重构组件结构，不影响现有逻辑。

---

## 六、影响面评估

| 文件 | 改动性质 | 预估行数 |
|------|----------|---------|
| `src/i18n/` (新建 3 个文件) | 新增 | ~150 行 |
| `src/components/toolbar/Toolbar.tsx` | 替换 14 处硬编码 + 加语言选择器 | +25 行 |
| `src/components/panels/NodeLibrary.tsx` | 替换 5 处硬编码 | +8 行 |
| `src/components/panels/PropertyPanel.tsx` | 替换 11 处硬编码 | +12 行 |
| `src/components/panels/ParametersPanel.tsx` | 替换 9 处硬编码 | +10 行 |
| `src/components/panels/StatusBar.tsx` | 替换 7 处硬编码 | +10 行 |
| `src/components/canvas/FlowCanvas.tsx` | 替换 3 处右键菜单 | +5 行 |
| **总计** | **全部增量，不删不改架构** | **~220 行** |

---

## 七、风险与边界

| 风险点 | 等级 | 对策 |
|--------|------|------|
| 翻译 key 拼错 | 低 | TS 类型推导，编译时拦截 |
| 新增系统 UI 文本未翻译 | 中 | `enUS` 声明为 `typeof zhCN`，编译时发现漏翻 |
| 翻译值包含 `{` 冲突 | 低 | 翻译文本不含 JSX，`{count}` 插值在渲染前完成 |
| 语言切换后组件不刷新 | 低 | `useSyncExternalStore` 保证订阅组件自动重渲染 |
| 用户切换语言的 UI 入口不明显 | 低 | 放在 Toolbar 最右侧操作区，视觉一致性高 |

---

## 八、总结

```
翻译范围：系统 UI 壳层（6 个组件，~50 条文本）
不翻译：  节点定义（业务范畴，保持英文单一事实来源）
技术方案：自建轻量 i18n（零依赖，~60 行核心代码）
类型安全：TS 字典 + 路径类型推导（编译时拼写检查）
切换入口：Toolbar 右侧语言下拉选择器
持久化：  localStorage + 浏览器语言检测退路
改动量：  纯增量 ~220 行，不改现有数据结构
```
