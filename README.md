# A2UI Playground（架构脚手架）

本仓库是一个 TypeScript **monorepo** 脚手架，用于搭建 A2UI Playground 的整体工程结构（不包含具体业务细节实现）。

## 目录结构

- `packages/`
  - `a2ui-core/`：A2UI 协议解析与渲染树构建相关核心能力（parser / vnode / treebuilder）
  - `a2ui-react/`：基于 React 的 A2UI 协议渲染引擎
- `web/`
  - `a2ui-playground/`：Playground Web 应用（Vite）
- `server/`
  - `a2ui-playground-server/`：Playground Server（Koa + ts-node），用于协议生成/缓存与 Agent 编排（占位）

## 环境要求

- Node.js：建议 **18+ / 20+**
- npm：建议 **9+**

## 安装依赖

在仓库根目录执行：

```bash
npm install
```

## 启动（开发模式）

### 仅启动 Web（Vite）

```bash
npm run dev:web
```

### 仅启动 Server（Koa + ts-node）

```bash
npm run dev:server
```

### 同时启动 Web + Server

```bash
npm run dev
```

> 说明：当前 `dev` 脚本会并行启动两个进程（一个 server、一个 web）。

## 构建 / 类型检查

```bash
# 全部 workspace 一起构建（脚手架阶段可能仅做占位）
npm run build

# 全部 workspace 一起做类型检查
npm run typecheck
```

## 环境变量（占位）

如需后续接入 OpenAI/LLM，请在 `server/a2ui-playground-server` 侧准备环境变量（具体使用与链路实现不在本脚手架范围内）：

- `OPENAI_API_KEY`：OpenAI API Key（可选，占位）
- `OPENAI_BASE_URL`：自定义网关/代理（可选，占位）

## 常见问题

- **Q: 这是完整功能实现吗？**  
  A: 不是。本仓库目标是“先把项目架构搭好”，各模块仅保留最小可运行/可扩展的骨架与接口形状。

