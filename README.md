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
pnpm install
```

### 2. 启动项目

```bash
pnpm dev
```

## Dify 对接方式（安全开源）

前端不直接持有 Dify Key，而是统一请求：

```text
POST /api/dify/workflows/run
POST /api/dify/chat-messages
```

由你自己的小后端（本仓库 `server/`）读取环境变量中的 Dify Key 并转发到 Dify。

## 项目截图

![登录页面](picture/登录页面.png)
![主页面](picture/主页面.png)
![咨询医师界面](picture/咨询医师界面.png)
![糖尿病健康助手界面](picture/糖尿病健康助手界面.png)
![糖尿病风险预测主界面](picture/糖尿病风险预测主界面.png)
![生活方案定制-生活习惯描述](picture/生活方案定制-生活习惯描述.png)
![生活方案定制-期望或已有建议](picture/生活方案定制-期望或已有建议.png)
![生活方案定制-个性化方案生成](picture/生活方案定制-个性化方案生成.png)
![打卡页面上半](picture/打卡页面上半.png)
![打卡页面下半](picture/打卡页面下半.png)
![方案-趋势上半](picture/方案-趋势上半.png)
![方案-趋势下半](picture/方案-趋势下半.png)
![打卡-提醒设置界面](picture/打卡-提醒设置界面.png)
![打卡-本月总结](picture/打卡-本月总结.png)

## 目录结构

- `pages/`: 页面组件
- `services/`: API 请求服务（走 /api/dify）
- `contexts/`: 全局状态管理（用户登录态）
- `server/`: Dify Key 代理服务（Node）
