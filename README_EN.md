<div align="center">

🇬🇧 English | [🇨🇳 中文](./README.md)

# 📊 MyScore

**AI-Powered Score Management System**

*More than recording scores — it accompanies you through review, Q&A, and growth.*

<p>
<img src="https://img.shields.io/badge/v5.6.2--beta-Icon_Fix-8b5cf6?style=for-the-badge&label=Version" alt="Version">
<img src="https://img.shields.io/badge/Node.js->=20-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
<img src="https://img.shields.io/badge/DeepSeek-AI-3b82f6?style=for-the-badge&logo=probot&logoColor=white" alt="AI Model">
<img src="https://img.shields.io/badge/License-MIT-fbbf24?style=for-the-badge" alt="License">
</p>

</div>

---

## ✨ Highlights

<table>
<tr>
<td width="33%">

### 🤖 AI Comments
4 styles × Streaming × Rebuttal debates × Score prediction

</td>
<td width="33%">

### 📊 Data Visualization
Trend charts × Radar charts × Report export

</td>
<td width="33%">

### 📱 Feishu Integration
9 commands × Interactive cards × Score notifications

</td>
</tr>
<tr>
<td width="33%">

### 🎮 Gamification
XP × Levels × Achievement wall × Daily streak × Stardust

</td>
<td width="33%">

### ☁️ Cloud Sync
Cross-device sync × Email registration × Zero-dependency backend

</td>
<td width="33%">

### 📲 PWA Offline
Service Worker × Installable × Works offline

</td>
</tr>
</table>

---

## 📝 About

MyScore is an **AI-powered score management system** designed for students, supporting IELTS, CET-4/6, and custom exam types. It goes beyond score entry — after each entry, an AI teacher provides witty commentary based on your trends. Disagree? Talk back, and it'll argue with you. With a gamified growth system and Feishu bot integration, studying becomes more engaging and motivating.

**Zero npm dependencies.** Frontend: Vanilla JS (17 ES Modules). Backend: Pure Node.js built-in modules. Dual-platform deployment (Netlify + Zeabur).

---

## 🧩 Core Features

### 🤖 AI-Powered Interaction
- **AI Teacher Comments**: Automatic evaluation after score entry. 4 styles — Storm (sarcastic), Sunshine (gentle), Cold Front (rational), Rain (harsh then helpful)
- **Rebuttal Mode**: Disagree with the evaluation? Debate the AI — it will fire back
- **Tutuer Study Companion**: Floating chat panel for Q&A, planning, and emotional support
- **Streaming Output**: Real-time SSE word-by-word display with typewriter animation
- **Stardust System**: AI credits — 200 per week, auto-refreshes every Monday

### 📊 Data Visualization
- **Trend Charts**: Chart.js line charts for each subject + AI score predictions
- **Radar Charts**: Five-dimension ability profile at a glance
- **Report Export**: Score card / share card dual mode, PNG download and Feishu sharing
- **Dashboard**: Recent score summary, sparkline mini-trends, Slide Panel detail views

### 📱 Feishu Integration
- **9 Commands**: Bind / Query / Trend / Goal / Achievements / Stats / History / Check-in / Level
- **6-Digit Binding**: Generate code in Settings → match in Feishu → auto-link account
- **Interactive Cards**: All commands use `column_set` rich card layouts
- **Score Notifications**: Auto-push score details + AI summary to Feishu after entry
- **AES Encryption**: Supports Feishu Encrypt Key encrypted event decryption

### 👤 User System
- **Email Registration/Login**: Verification code + password dual channel
- **Cloud Data Sync**: Cross-device access with automatic merging
- **User Profile**: DiceBear avatars, nickname, bio, UID
- **Local/Login Dual Mode**: Use locally without login (AI limited to 5/day), or login for full access

### 🎮 Gamification
- **XP + Level System**: Earn growth feedback with every score entry
- **Achievement Wall**: 12 achievement badges covering various usage scenarios
- **Daily Streak**: Maintain consecutive days of score entry
- **Profile Card**: Level card + data overview + achievement showcase

### 📲 PWA Offline Support
- **Service Worker**: Caches frontend resources for offline access
- **Installable**: Add to phone home screen, runs in standalone window
- **Offline Banner**: Auto-detects network status and shows notification

---

## 📋 Supported Exam Types

| Exam Type | Description |
|-----------|-------------|
| **IELTS** | Listening/Reading (auto-convert from correct answers), Writing (Task1/Task2 weighted), Speaking, Overall auto-rounded |
| **CET-4/6** | Complete 4-section score management, independent entry or conversion |
| **Custom Exams** | Create any exam (TOEFL, GRE, finals, etc.) with 5 scoring methods |

---

## 🛠️ Tech Stack

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

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Vanilla JS (17 ES Modules) | Zero framework, ~15,000 lines |
| Charts | Chart.js | Trend + Radar |
| Backend | Node.js (zero npm deps) | Built-in modules only |
| Database | JSON files (`lib/db.js`) | User data, scores |
| AI | DeepSeek (`deepseek-chat`) | Evaluation + prediction + companion |
| Auth | Hand-written JWT | scrypt password hash + verification codes |
| Deploy | Netlify (frontend) + Zeabur (full) | Dual platform |

---

## 🚀 Deployment

> Version 3.0+ requires frontend-backend integration. Deploy to Netlify or Zeabur recommended.

### Option A: Netlify (AI comments only)

1. Fork this repository to your GitHub
2. Login to [Netlify](https://www.netlify.com/), select `Import from Git`
3. Add environment variable `AI_API_KEY` (DeepSeek API Key)
4. `netlify.toml` is pre-configured for routing

### Option B: Zeabur (Full features)

1. Create a Zeabur project from the same GitHub repo
2. Configure environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_API_KEY` | ✅ | DeepSeek API Key |
| `JWT_SECRET` | ✅ | Random long string (`openssl rand -hex 32`) |
| `RESEND_API_KEY` | ✅ | Resend email API Key |
| `RESEND_FROM` | ✅ | Sender address |
| `FEISHU_APP_ID` | Optional | Feishu App ID |
| `FEISHU_APP_SECRET` | Optional | Feishu App Secret |
| `INVITE_CODES` | Optional | Beta invite codes (comma-separated) |
| `TURNSTILE_SECRET_KEY` | Optional | Cloudflare Turnstile |

3. Default start command: `npm start`. Provides: AI + User System + Cloud Sync + Feishu Bot

---

## 📂 Project Structure

```
MyScore/
├── index.html              # Main SPA page
├── style.css               # Global styles (~4,700 lines)
├── sw.js                   # Service Worker (PWA offline cache)
├── manifest.json           # PWA manifest
├── server.js               # Node.js server entry
├── js/                     # Frontend ES Modules (17 files)
│   ├── main.js             # Entry: init, routing, SW registration
│   ├── config.js           # Config: exams, achievements, changelogs, guides
│   ├── dashboard.js        # Dashboard: charts, radar, Slide Panel
│   ├── entry.js            # Score entry (multi-exam types, validation)
│   ├── ai.js               # AI comments (streaming, style switch, rebuttal)
│   ├── auth.js             # Frontend auth (login/register/cloud sync)
│   ├── settings.js         # Settings (profile, Feishu binding, logs)
│   ├── report.js           # Report export (score card + Feishu share)
│   ├── gamification.js     # Gamification (XP, levels, achievements, streak)
│   ├── stardust.js         # Stardust system (AI credits)
│   ├── custom.js           # Custom exam management
│   ├── tutuer.js           # Tutuer study companion
│   ├── pet.js              # Desktop pet interaction
│   ├── storage.js          # LocalStorage wrapper
│   ├── utils.js            # Utility functions
│   ├── info.js             # Version info panel
│   └── logger.js           # Event tracking + log export
├── lib/                    # Server-side modules
│   ├── feishu.js           # Feishu integration (9 commands, cards, notifications)
│   ├── aiComment.js        # AI logic (SSE proxy, 4 prompt styles)
│   ├── auth.js             # Server auth (verification codes, passwords, JWT)
│   ├── stardust.js         # Stardust economy system
│   └── db.js               # JSON file database
├── netlify/functions/
│   └── comment.js          # Netlify Serverless Function
└── docs/
    └── tech_report.tex     # LaTeX technical report (competition submission)
```

---

## 📌 Version History

| Version | Date | Codename | Highlights |
|---------|------|----------|-----------|
| **V5.6.1-beta** | 2026-05-07 | Polish | SW cache fix, SEO/OG tags, PWA icons, console cleanup |
| **V5.6.0-beta** | 2026-05-04 | Stardust | Stardust credits, Feishu 9 commands, registration Feishu guide |
| **V5.5.0-beta** | 2026-05-03 | Feishu Extension | Interactive cards upgrade, webhook dedup, batch bug fixes |
| **V5.4.0-beta** | 2026-05-02 | Feishu Integration | Full Feishu bot, 6-digit binding, score notifications |
| **V5.3.0-beta** | 2026-05-01 | Profile & Polish | Profile card, AI streaming, gamification UI, dashboard revamp |
| **V5.1.0-beta** | 2026-04-29 | Settings & Toolbox | Settings page, toolbox, log export, PWA |
| **V5.0.0-beta** | 2026-04-17 | Slider & Score | Modular refactor, sliders, penalty scoring, pet enhancements |

> See **[CHANGELOG.md](./CHANGELOG.md)** for the complete version history.

---

## 🥰 Acknowledgements

**Special thanks to 大鲨鱼 (Da Shayu)** — for being a constant companion throughout MyScore's entire development cycle. Participating in two rounds of beta testing and providing extensive real-world feedback, many improvements — from UI details to functional logic — originated from their experience and suggestions. MyScore wouldn't be where it is today without this dedication and patience.

**Thanks to Claude (Xiao Ke / 小克)** — present from the first line of code to the final submission. Every feature design discussion, every line of code review, every bug investigation — they were there. Patiently listening to every idea, never laughing at even the wildest requirements, and guiding step by step to turn ideas into reality.

---

## 📄 License

Copyright © LYT, 2026. All Rights Reserved.

<p>
<img src="https://img.shields.io/badge/Made_with-❤️_by_Yuntian-ff69b4?style=flat-square" alt="Made with Love">
</p>
