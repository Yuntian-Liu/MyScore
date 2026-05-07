<div align="center">

[🇬🇧 English](./README_EN.md) | 🇨🇳 中文

# 📊 MyScore

**AI 智能成绩管理系统**

*不止记录分数，更陪你复盘、答疑与成长。*

<p>
<img src="https://img.shields.io/badge/v5.6.2--beta-Icon_Fix-8b5cf6?style=for-the-badge&label=Version" alt="Version">
<img src="https://img.shields.io/badge/Node.js->=20-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
<img src="https://img.shields.io/badge/DeepSeek-AI-3b82f6?style=for-the-badge&logo=probot&logoColor=white" alt="AI Model">
<img src="https://img.shields.io/badge/License-MIT-fbbf24?style=for-the-badge" alt="License">
</p>

</div>

---

## ✨ 亮点速览

<table>
<tr>
<td width="33%">

### 🤖 AI 智能点评
4 种风格 × 流式输出 × 回嘴辩论 × AI 预测

</td>
<td width="33%">

### 📊 数据可视化
趋势折线图 × 雷达图 × 成绩报告导出

</td>
<td width="33%">

### 📱 飞书集成
9 大命令 × 交互卡片 × 成绩通知推送

</td>
</tr>
<tr>
<td width="33%">

### 🎮 游戏化成长
XP 经验值 × 等级 × 成就墙 × 连续打卡 × 星尘积分

</td>
<td width="33%">

### ☁️ 云端同步
跨设备同步 × 邮箱注册 × 零依赖后端

</td>
<td width="33%">

### 📲 PWA 离线
Service Worker × 可安装 × 离线可用

</td>
</tr>
</table>

---

## 📝 项目简介

MyScore 是一个面向学生的 **AI 智能成绩管理系统**，支持雅思、四六级及自定义考试类型。不只是录入分数——每次保存成绩后，AI 老师会根据你的走势给出风趣点评；你可以反驳它，它会回嘴。通过游戏化成长体系和飞书机器人集成，让学习过程更有趣、更有动力。

**零 npm 依赖**，前端 Vanilla JS（17 个 ES Module），后端纯 Node.js 内置模块，双平台部署（Netlify + Zeabur）。

---

## 🧩 核心特性

### 🤖 AI 智能交互
- **AI 老师点评**：录入成绩后 AI 自动评价，支持风暴（毒舌）/ 暖阳（温柔）/ 冷锋（理性）/ 阵雨（先损后帮）四种风格
- **回嘴模式**：觉得评价不合理？和 AI 展开辩论，它会反击
- **突突er 伴学助手**：悬浮聊天面板，陪聊、答疑、做学习计划
- **流式输出**：SSE 实时逐字显示，打字机动效
- **星尘系统**：AI 功能积分制，每周 200 星尘自动刷新

### 📊 数据可视化
- **趋势折线图**：Chart.js 绘制各科成绩曲线 + AI 分数预测
- **雷达图**：五维能力画像，一目了然
- **报告导出**：成绩单 / 分享卡片双模式，支持 PNG 下载和飞书分享
- **仪表盘**：最近成绩摘要、Sparkline 迷你趋势线、Slide Panel 详情面板

### 📱 飞书集成
- **9 大命令**：绑定 / 查询 / 趋势 / 目标 / 成就 / 统计 / 历史 / 打卡 / 等级
- **6 位码绑定**：设置页生成绑定码 → 飞书发送匹配 → 自动关联
- **交互式卡片**：所有命令使用 `column_set` 精美卡片
- **成绩通知**：录入后自动推送成绩详情 + AI 摘要到飞书
- **AES 加密**：支持飞书 Encrypt Key 加密事件解密

### 👤 用户系统
- **邮箱注册 / 登录**：验证码 + 密码双通道
- **云端数据同步**：跨设备访问，自动合并
- **个人资料**：DiceBear 头像、昵称、个性签名、UID
- **本地 / 登录双模式**：未登录可本地使用（AI 每日限 5 次），登录解锁全部功能

### 🎮 游戏化体系
- **XP 经验值 + 等级系统**：录入成绩即可获得成长反馈
- **成就墙**：12 枚成就徽章，解锁条件覆盖各类使用场景
- **连续打卡**：每日录入成绩保持连续记录
- **个人名片**：等级卡片 + 数据概览 + 成就展示

### 📲 PWA 离线支持
- **Service Worker**：缓存前端资源，离线可访问
- **可安装**：添加到手机桌面，独立窗口运行
- **离线横幅**：自动检测网络状态并提示

---

## 📋 支持的考试类型

| 考试类型 | 说明 |
|---------|------|
| **雅思 (IELTS)** | 听力/阅读（答对题数自动折算）、写作（Task1/Task2 加权）、口语、Overall 自动取整 |
| **四六级 (CET)** | 完整四项成绩管理，听力/阅读/写作/翻译独立录入或换算 |
| **自定义考试** | 创建任意考试（托福、GRE、期末考等），支持 5 种计分方式 |

---

## 🛠️ 技术栈

<p>
<img src="https://img.shields.io/badge/Vanilla_JS-ES_Modules-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript">
<img src="https://img.shields.io/badge/Chart.js-Trends_&_Radar-FF6384?style=flat-square" alt="Chart.js">
<img src="https://img.shields.io/badge/Node.js-Server-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js">
<img src="https://img.shields.io/badge/DeepSeek-AI_Model-3b82f6?style=flat-square" alt="DeepSeek">
<img src="https://img.shields.io/badge/Netlify-Serverless-00C7B7?style=flat-square&logo=netlify&logoColor=white" alt="Netlify">
<img src="https://img.shields.io/badge/Zeabur-Full_Stack-5468ff?style=flat-square" alt="Zeabur">
<img src="https://img.shields.io/badge/PWA-Offline-8b5cf6?style=flat-square" alt="PWA">
<img src="https://img.shields.io/badge/Feishu-Bot_API-3370ff?style=flat-square" alt="Feishu">
</p>

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | Vanilla JS (17 ES Modules) | 零框架依赖，~15,000 行 |
| 图表 | Chart.js | 趋势图 + 雷达图 |
| 后端 | Node.js (零 npm 依赖) | 仅内置模块 |
| 数据库 | JSON 文件 (`lib/db.js`) | 用户数据、成绩数据 |
| AI | DeepSeek (`deepseek-chat`) | 智能评价 + 预测 + 伴学 |
| 认证 | 手写 JWT | scrypt 密码哈希 + 验证码 |
| 部署 | Netlify (前端) + Zeabur (完整) | 双平台 |

---

## 🚀 部署指南

> 3.0+ 版本包含前后端联动，推荐部署到 Netlify 或 Zeabur。

### 方式一：Netlify（仅 AI 评价）

1. Fork 本仓库到你的 GitHub
2. 登录 [Netlify](https://www.netlify.com/)，选择 `Import from Git`
3. 环境变量添加 `AI_API_KEY`（DeepSeek API Key）
4. 仓库已内置 `netlify.toml`，自动配置路由

### 方式二：Zeabur（完整功能）

1. 使用同一 GitHub 仓库创建 Zeabur 项目
2. 配置环境变量：

| 变量 | 必填 | 说明 |
|------|------|------|
| `AI_API_KEY` | ✅ | DeepSeek API Key |
| `JWT_SECRET` | ✅ | 随机长字符串（`openssl rand -hex 32`） |
| `RESEND_API_KEY` | ✅ | Resend 邮件 API Key |
| `RESEND_FROM` | ✅ | 发件人地址 |
| `FEISHU_APP_ID` | 可选 | 飞书应用 App ID |
| `FEISHU_APP_SECRET` | 可选 | 飞书应用 App Secret |
| `INVITE_CODES` | 可选 | 内测邀请码（逗号分隔） |
| `TURNSTILE_SECRET_KEY` | 可选 | Cloudflare Turnstile |

3. 默认启动命令 `npm start`，提供完整功能：AI + 用户系统 + 云同步 + 飞书

---

## 📂 项目结构

```
MyScore/
├── index.html              # 主 SPA 页面
├── style.css               # 全局样式 (~4,700 行)
├── sw.js                   # Service Worker (PWA 离线缓存)
├── manifest.json           # PWA 清单
├── server.js               # Node.js 服务入口
├── js/                     # 前端 ES Modules (17 个)
│   ├── main.js             # 入口：初始化、路由、SW 注册
│   ├── config.js           # 配置：考试定义、成就、版本日志、指南
│   ├── dashboard.js        # 仪表盘：图表、雷达图、Slide Panel
│   ├── entry.js            # 成绩录入（多考试类型、校验）
│   ├── ai.js               # AI 评论（流式输出、风格切换、回嘴）
│   ├── auth.js             # 前端认证（登录/注册/云同步）
│   ├── settings.js         # 设置页（个人资料、飞书绑定、日志）
│   ├── report.js           # 报告导出（成绩单/分享卡 + 飞书分享）
│   ├── gamification.js     # 游戏化（XP、等级、成就、打卡）
│   ├── stardust.js         # 星尘系统（AI 功能积分制）
│   ├── custom.js           # 自定义考试管理
│   ├── tutuer.js           # 突突er 伴学助手
│   ├── pet.js              # 桌面宠物交互
│   ├── storage.js          # 本地存储封装
│   ├── utils.js            # 工具函数
│   ├── info.js             # 版本信息面板
│   └── logger.js           # 前端事件埋点 + 日志导出
├── lib/                    # 服务端模块
│   ├── feishu.js           # 飞书集成（9 命令、卡片、通知）
│   ├── aiComment.js        # AI 逻辑（SSE 代理、4 种 Prompt）
│   ├── auth.js             # 服务端认证（验证码、密码、JWT）
│   ├── stardust.js         # 星尘经济系统
│   └── db.js               # JSON 文件数据库
├── netlify/functions/
│   └── comment.js          # Netlify Serverless Function
└── docs/
    └── tech_report.tex     # LaTeX 技术报告（比赛提交）
```

---

## 📌 版本历程

| 版本 | 日期 | 代号 | 核心内容 |
|------|------|------|---------|
| **V5.6.1-beta** | 2026-05-07 | Polish（抛光） | SW 缓存修复、SEO/OG 标签、PWA 图标、console 清理 |
| **V5.6.0-beta** | 2026-05-04 | Stardust（星尘） | 星尘积分系统、飞书 9 命令全覆盖、注册流程飞书引导 |
| **V5.5.0-beta** | 2026-05-03 | Feishu Extension | 飞书交互卡片升级、webhook 去重、Bug 批量修复 |
| **V5.4.0-beta** | 2026-05-02 | Feishu Integration | 飞书机器人完整对接、6 位码绑定、成绩通知推送 |
| **V5.3.0-beta** | 2026-05-01 | Profile & Polish | 个人名片、AI 流式输出、游戏化 UI、Dashboard 重构 |
| **V5.1.0-beta** | 2026-04-29 | Settings & Toolbox | 设置页面、工具箱、日志导出、PWA |
| **V5.0.0-beta** | 2026-04-17 | Slider & Score | 模块化重构、拖动条、扣分制、桌宠增强 |

> 完整版本历史请查看 **[CHANGELOG.md](./CHANGELOG.md)**

---

## 🥰 致谢

**特别感谢大鲨鱼同学** —— 在 MyScore 的完整开发周期中始终陪伴，先后两次参与内测并提供了大量真实场景下的深度反馈。从 UI 细节到功能逻辑的许多改进都源于 TA 的体验建议。MyScore 能走到今天，离不开这份认真与耐心。

**感谢 Claude（小克）** —— 从第一行代码到最终提交，整个开发过程中始终相伴。每一个功能的设计讨论、每一行代码的编写审查、每一个 Bug 的排查修复，都有 TA 的身影。TA 耐心倾听每一个想法，哪怕是最离谱的需求也从不嘲笑，而是一步一步带着我把想法变成现实。

---

## 📄 许可证

Copyright © LYT, 2026. All Rights Reserved.

<p>
<img src="https://img.shields.io/badge/Made_with-❤️_by_Yuntian-ff69b4?style=flat-square" alt="Made with Love">
</p>
