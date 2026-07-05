# FlowForge 项目记忆

## 技术架构
- Tauri 2.x 桌面应用，React 19 + TypeScript 前端，Rust 后端
- 状态管理：4 个 zustand Store（appStore / editorStore / configStore / editorMetaStore）
- 画布：@xyflow/react v12
- 无 UI 框架依赖（MUI/Ant Design/Tailwind），全量内联 style + CSS 变量

## 核心设计决策
- 画布仅显示 flow 类型 Pin，数据流走 Parameters 声明式引用
- 内置节点 + 自定义节点并存（configStore 合并覆盖机制）
- Tab 多文档系统（editorStore flush/load 机制）
- 代码生成：Rust 内置（GUI 导出）+ 独立 CLI（`cli/generate.cjs`）
- partial class 模式：生成 `.gen.cs` 声明数据，手写 `.cs` 写逻辑
- 导出：Tauri dialog 选目录 → Rust 生成 → 写入磁盘（不再走 HTTP 中转）

## 当前状态（2026-07-05）
- 16 项核心功能中 11 完成、1 部分、4 未实现
- 待做：验证逻辑、节点复制粘贴、Subgraph、DSL 热加载
- 文档：`flowforge-proto-architecture.md` 为权威技术文档

## 老大偏好
- Rust 后端内置代码生成（不额外装 Node.js）
- partial class 模式（生成+手写分离）
- 一个二进制两种模式（GUI + CLI）
- Runtime 基类内嵌拷贝（不依赖 NuGet）
