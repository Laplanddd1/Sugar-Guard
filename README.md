# SugarGuard - 糖尿病风险管理小助手


这是一个基于 React + TypeScript + Vite 开发的糖尿病风险管理前端应用。项目集成了 AI 智能问答、风险预测、生活方案定制等功能，并对接了 Dify 后端工作流。

## 技术栈

- **前端框架**: React 19
- **构建工具**: Vite
- **UI 库**: Tailwind CSS, Lucide React
- **路由**: React Router v7
- **语言**: TypeScript

## 核心功能

1.  **AI 智能助手**: 对接后端智能体，提供实时健康咨询。
2.  **风险预测**: 输入身体指标，AI 预测糖尿病风险。
3.  **方案定制**: 生成个性化的饮食和运动方案。
4.  **健康科普**: 浏览糖尿病相关的文章和知识。

## 本地运行与对接

### 1. 安装依赖

```bash
npm install
```

### 2. 启动项目

```bash
npm run dev
```

## 部署到服务器

本项目为纯前端静态站点，部署建议使用 Nginx 托管 `dist/` 并配置 `/api` 反向代理。

详见：[DEPLOY.md](file:///f:/小学期/2025-12/diabetesAssistant/DEPLOY.md)

### 3. 后端对接说明

本项目配置了反向代理，连接到小组部署的云服务器。

- **前端请求地址**: `/api/v1/...`
- **代理目标地址**: `http://47.110.76.245`

请确保开发环境能够访问公网。

## 目录结构

- `/src/pages`: 页面组件
- `/src/services`: API 请求服务 (Dify 对接)
- `/src/contexts`: 全局状态管理 (用户登录态)
- `/src/types`: TypeScript 类型定义
