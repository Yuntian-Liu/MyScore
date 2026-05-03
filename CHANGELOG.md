# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Semantic Versioning](https://semver.org/).

---

## [5.6.0-beta] - 2026-05-04

**代号：Stardust（星尘）**

### Added
- ✅ **星尘（Stardust）系统**：AI 功能积分制，登录用户每周 200 星尘，周一 00:00 自动刷新
- ✅ **星尘消耗分级**：评论✨2 / 回嘴✨1 / 预测✨5 / 分析✨6 / 突突er✨1
- ✅ **星尘 UI**：导航栏余额胶囊 + 个人名片星尘列 + 功能标题消耗胶囊 + 余额不足弹窗
- ✅ **星尘使用文档**：站内指南 AI 交互部分新增规则说明与消耗表格

### Changed
- 🔄 星尘 AI 成功后扣除（AI 失败不扣星尘）
- 🔄 本地开发 Turnstile 自动跳过（localhost 免人机验证）
- 🔄 CORS 暴露自定义 header（前端实时更新星尘余额）

### Fixed
- 🐛 云同步覆盖星尘数据 — pushToCloud 保留服务端 stardust 字段
- 🐛 突突er 发送按钮变"发送"文字 — 恢复为 ↑ 箭头

---

## [5.5.0-beta] - 2026-05-03

**代号：Feishu Integration（飞书集成）**

### Added
- ✅ **飞书机器人 9 命令全覆盖**：绑定/查询/趋势/目标/成就/统计/历史/打卡/等级
- ✅ **飞书交互卡片全面升级**：所有命令使用 column_set 交互式卡片
- ✅ **导出日志飞书状态**：exportLogs 新增 Feishu Bound 字段

### Changed
- 🔄 飞书绑定码移动端适配 — font-size 2.5rem→1.8rem
- 🔄 清理 console.warn 调试语句 — dashboard/auth/report 共 8 处
- 🔄 站内使用文档飞书命令表补充至 9 个命令
- 🔄 用户协议/隐私政策新增飞书相关条款

### Fixed
- 🐛 飞书通知不推送 — findUserByUid → findUserById
- 🐛 成就命令无响应 — 移除浏览器模块导入
- 🐛 等级命令 RangeError — XP 计算公式修正
- 🐛 飞书 webhook 重复推送 — 添加 event_id 去重机制
- 🐛 绑定码复制按钮 this 上下文错误
- 🐛 桌宠气泡移动端溢出

---

## [5.4.0-beta] - 2026-05-04

**代号：Feishu Integration（飞书集成）**

### Added
- ✅ **飞书机器人完整对接**：lib/feishu.js 命令路由 + 绑定码系统 + 6种卡片模板
- ✅ **飞书绑定流程**：设置页 6 位码绑定 UI（生成码 → 飞书发送 → 自动匹配）
- ✅ **飞书成绩通知**：录入成绩后自动推送交互式卡片到飞书
- ✅ **飞书机器人命令**：查询 / 趋势 / 目标 / 成就 / 帮助 / 绑定
- ✅ **db.js feishu_open_id 字段**：用户记录支持飞书绑定关系存储
- ✅ **server.js 新路由**：POST /api/feishu/bind + POST /api/feishu/notify
- ✅ **auth.js feishuOpenId 存储**：登录/恢复会话/资料更新时同步飞书绑定状态

### Changed
- 🔄 **设置页新增飞书集成区块**：绑定状态展示 + 码展示 + 解绑功能
- 🔄 **版本号升级至 V5.4.0-beta**

---

## [5.3.0-beta] - 2026-05-03

**代号：Trend Prediction & Report Polish（趋势预测与报告打磨）**

### Added
- ✅ **趋势图各科预测点**：折线图支持各科单独的 AI 预测虚线点，不再只有总分预测
- ✅ **SVG 雷达图**：导出报告分享卡片内嵌 SVG 雷达图（五维能力可视化）
- ✅ **html2canvas 报告导出**：重写导出逻辑，DOM-to-PNG 保证预览与下载图片一致
- ✅ **html2canvas 字体容错**：两轮截图策略（原版字体 → 系统字体 fallback），解决 Google Fonts 超时
- ✅ **移动端报告导出定宽**：固定宽度容器（成绩卡 700px / 分享卡 420px），手机端比例正常
- ✅ **沉浸式滚动条**：全局美化滚动条（Firefox + WebKit），默认隐藏 hover 显示

### Changed
- 🔄 **报告导出架构**：从 Canvas 手绘（html2canvas 替代 canvas API），删除 ~500 行旧代码
- 🔄 **移动端报告预览**：`table-layout: fixed` + 缩小字号/间距，解决表格溢出
- 🔄 **导出报告预览**：分享卡片增加 SVG 雷达图预览

### Fixed
- 🔧 **成就系统不触发**：新用户手动录入成绩后成就未检测，修复模式选择弹窗触发链
- 🔧 **模式选择弹窗不弹出**：`showModeChoiceModal` 未挂载到 window，导致 entry.js 无法调用
- 🔧 **retryPrediction 重试静默失败**：面板路径传递 retryCount=0，结合失败缓存导致重试无效
- 🔧 **sw.js 缓存版本不一致**：APP_SHELL URL 的 `?v=` 与 index.html 不同步

## [5.2.0-beta] - 2026-05-01

**代号：Profile & Polish（个人名片与体验打磨）**

### Added
- ✅ **个人名片功能**：Profile Panel 增强（XP 经验条 / 连续打卡 / 成就摘要 / 「查看名片」主按钮）；新增 Slide Panel 名片页（Hero Banner + 等级卡片 shimmer 动画 + 数据概览三列 + 成就墙 3×4 网格 + 经验来源明细）
- ✅ **游戏化 UI 组件**：导航栏经验条（等级 + 进度 + XP 数字）、连续打卡胶囊（⚡/🔥 + 天数）、成就墙（Hero 卡底部徽章条，已解锁/未解锁状态，N/12 计数）
- ✅ **AI 流式输出**：后端 SSE 流式代理（requestAiCommentStream + stream 路由）；前端 postCommentStream SSE 解析；AI 评论和伴学助手均支持流式，自动 fallback 非流式
- ✅ **AI 流式输出 UX**：「正在思考...」动态省略号 + 打字机闪烁光标动效
- ✅ **AI 评论截断检测**：记录 finish_reason 和 truncated 字段到前端日志
- ✅ **Dashboard UI 重构**：最近成绩摘要卡片（总分 + 考试信息 + 目标进度 + 各科分数条）、考试类型概览网格化、Sparkline 迷你趋势线、Hero 归档区
- ✅ **Slide Panel 二级面板**：考试类型详情面板、最近成绩详情面板、历史记录面板（右侧滑入，移动端底部抽屉）
- ✅ **导入导出按钮整合**：导出报告 / 导出数据 / 导入备份整合至考试概览区右上角 action-chip 按钮组
- ✅ **日志导出增强**：导出文件新增登录状态、Service Worker 状态、PWA 安装状态、成就解锁详情、AI 调用次数等诊断信息

### Changed
- 🔄 **Slide Panel 移动端适配**：全宽底部抽屉模式，修复内容偏窄和左侧溢出
- 🔄 **考试类型卡片**：「查看详情」按钮固定右下角，有无折线图都对齐
- 🔄 **Footer 简化**：删除 matrix 网格，改为 pill 链接
- 🔄 **伴学助手流式输出**：支持流式逐字显示，体验更自然
- 🔄 **使用文档更新**：补充个人名片、流式输出、游戏化 UI 说明

### Fixed
- 🔧 **SW 缓存未更新导致服务器 UI 崩溃**：Logo 渐变残留、XP 条/打卡/成绩数据异常（根因：sw.js 缓存名未更新，Cache First 策略加载旧版 CSS/JS）
- 🔧 **个人名片 XP 显示负数**：用取模替代循环减法计算等级内经验

---

## [5.1.0-beta] - 2026-04-29

**代号：Settings & Toolbox（设置与工具箱）**

### Added
- ✅ **设置页面二级导航**：使用指南、版本日志、用户协议、隐私政策内嵌设置弹窗，支持返回
- ✅ **快捷工具箱**：左下角收纳设置/伴学助手/版本日志，桌面端 hover 展开，移动端点击展开
- ✅ **前端日志导出**：设置页「导出日志」按钮，一键下载诊断文件
- ✅ **关键事件埋点**：成绩保存、AI 调用错误自动记录

### Changed
- 🔄 **设置页面重构**：固定尺寸弹窗，子页面无跳转切换
- 🔄 **Profile Panel 优化**：移除悬浮卡片，点击头像展开完整面板，头像放大，设置入口替代编辑资料
- 🔄 **Chevron 图标**：「关于」区域导航箭头替换为 SVG chevron + hover 动画
- 🔄 **使用指南更新**：补充快捷工具箱使用说明

### Removed
- 🗑️ **死代码清理**：删除 `settings.js`、`ai.js`、`info.js` 中未使用的函数和变量
- 🗑️ **重复样式清理**：删除 `style.css` 中重复的媒体查询块
- 🗑️ **数据修正**：修复 CHANGELOG 中 XP 上限数据不一致（100 → 50）

### Fixed
- 🔧 **AI 老师风格化命名**：切换风格后老师名称、思考文案、回嘴措辞动态匹配（毒舌老师/暖阳老师/冷老师/雨老师），不再一律显示"毒舌老师"
- 🔧 **AI max_tokens 截断**：初始评价 180→280、回嘴 150→220、伴学助手 220→350，防止输出被意外截断
- 🔧 **AI 日志增强**：前端日志新增 `ai-comment`/`ai-rebuttal`/`ai-error` 事件，记录评论长度、截断检测、请求耗时、HTTP 状态码；`postComment` 错误对象携带 status 和 duration

---

## [5.0.1-beta] - 2026-04-24

**代号：Modular & Model（模块化重构与模型升级）**

### Changed
- 🔧 **模块化架构重构**：单体 `app.js`（4396 行）拆分为 13 个 ES 模块（main/config/utils/storage/auth/ai/dashboard/entry/custom/report/pet/tutuer/info），提升代码可维护性
- 🔧 **AI 模型升级**：DeepSeek 模型从 `deepseek-chat` 升级至 `deepseek-v4-flash`

### Fixed
- 🔧 **本地模式选择弹窗无效**：`window.setUserMode` 代理引用不存在的 `window._authSetUserMode`，导致用户选择"本地模式"后实际不生效
- 🔧 **退出登录后模式弹窗永不触发**：`window._auth_justLoggedOut` 未从模块变量同步到 window，导致退出后首次使用 AI 时不再弹出模式选择
- 🔧 **start-local.bat 编码问题**：UTF-8 中文注释在 CMD(GBK) 下导致 `set AI_API_KEY` 不生效

---

## [5.0.0-beta] - 2026-04-17

**代号：Slider & Score（拖动条与成绩体验升级）**

### Added
- ✅ **拖动条输入组件**：所有成绩输入新增 Slider 拖动条，支持拖动和数字输入双模式，带刻度标记
- ✅ **扣分制计分方式**：自定义考试新增第五种计分类型「扣分制」——从满分扣除，支持单项最多扣分限制
- ✅ **输入实时校验**：超范围成绩立即红框 + 错误提示，保存前自动拦截所有异常输入
- ✅ **分享卡记录选择器**：导出报告时可选择具体哪次成绩记录
- ✅ **桌宠增强**：支持自由拖动、拖拽缩放（0.5x~1.8x）、左右边缘吸附、关闭与重新打开，位置和大小自动记忆

### Fixed
- 🔧 **四六级写作翻译分数转换修正**：乘数从 7.1 调整为 212/30，总分精确对齐 710
- 🔧 **浏览器自动填充误识别**：聊天输入框添加 autocomplete="off"，不再触发保存密码提示

### Changed
- 🔧 **科目→题型**：自定义考试「科目设置」更名为「题型设置」，「+ 添加科目」更名为「+ 添加题型」
- 🔧 **计分方式重命名**：五种计分方式添加中文名称和说明文字，降低理解门槛
- 🔧 **计分配置字段优化**：添加标签和占位符引导，去除默认值预填充
- 🔧 **项目矩阵 UI 降权**：页脚项目矩阵透明背景、弱化阴影，融入页脚
- 🔧 **公式法系数支持小数**：系数输入添加 step="any"，支持任意精度小数
- 🔧 **报告导出流程优化**：新增考试类型筛选，支持选择具体记录导出

---

## [4.2.0-beta] - 2026-04-17

**代号：Splash & Stability（开屏动画与稳健性增强）**

### Added
- ✅ **开屏动画**：Siri 风格流体光球背景 + Great Vibes 手写字体四色渐变描边动画 + Gemini 呼吸渐变填充，4 秒自动消失，支持跳过按钮，首次访问展示
- ✅ **云同步失败提示**：推送/拉取云端数据失败时显示 Toast 通知用户

### Fixed
- 🔧 **clearAllRecords 云端误删**：已登录状态下清空本地记录不再同步空数据到云端
- 🔧 **注销后残留定时器**：退出登录时清理 syncTimer，防止注销后仍触发推送
- 🔧 **登录成功后页面不刷新**：无本地记录时登录后也正确刷新 Dashboard
- 🔧 **NaN 显示**：无有效成绩时统计卡片不再显示 NaN
- 🔧 **弹窗层级错误**：Profile Card 不再浮在弹窗之上（modal z-index 提升）
- 🔧 **成绩提交无验证**：拒绝 NaN / 负数，空日期提醒，全零二次确认
- 🔧 **localStorage 溢出崩溃**：存储空间不足时提示用户导出清理
- 🔧 **页面切换崩溃**：showPage 传入无效页面名时安全处理
- 🔧 **验证码输入无限制**：输入框限制纯数字 + JS 正则校验
- 🔧 **模式选择弹窗时机**：退出登录后不再立即弹窗，改为触发 AI 功能时才弹出

### Changed
- 🔧 **CORS 默认策略**：未配置 ALLOWED_ORIGIN 时默认拒绝而非放行所有来源
- 🔧 **登录同步防竞态**：同步期间阻止页面切换，避免数据不一致
- 🔧 **AI 请求超时**：AI API 请求增加 30 秒超时保护

---

## [4.1.0-beta] - 2026-04-15

**代号：Dual Mode Architecture（本地/登录双模式架构）**

### Added
- 本地/登录双模式架构：未登录用户首次触发 AI 时弹窗选择"登录使用"或"本地使用"
- AI 评论 API 认证：登录用户无限制，匿名用户按 IP 每日限 5 次
- 本地模式提示条：AI 区域下方显示"今日已用 x/5 次，登录解锁"
- 首次模式选择弹窗（双按钮选择卡片式设计）
- 本地 AI 使用上限弹窗（次数用尽时弹出，引导登录）
- 退出登录确认弹窗：提示数据已存云端，确认后清除本地成绩、保留设置
- 本地→云端数据自动迁移：本地用户登录后自动同步数据

### Fixed
- 修复 Banner 关闭按钮因作用域问题无法点击（addEventListener 替代 inline onclick）
- 修复 Banner 三段高度不匹配、圆角衔接断裂的样式问题
- 修复中文字体渲染异常
- 修复公式型成绩小数被 parseInt 截断（改为 parseFloat）
- 修复 switchDashboardTab 使用隐式 event 变量
- 修复验证码登录 attempts 计数器多加一次（新增 consumeCode 函数）
- 修复 UID 生成并发竞态（改为内存计数器）
- 修复 forceLogout 后 user_mode 残留导致 AI 评论永久失效
- 修复模式选择弹窗背景点击强制选择本地模式的问题
- 修复 confirmLogout 不清除 STORAGE.CUSTOM 的问题
- 修复自定义考试"公式计算"类型科目折算分显示 NaN（mult 属性未初始化）
- 修复自定义考试 sections/subquestions 数据异常时页面崩溃（添加 undefined 防御）
- 修复自定义考试"公式计算"类型切换时 min 属性未初始化的问题

### Changed
- Banner 样式重设计：统一高度、优化 hover 过渡、增大关闭按钮点击区域
- 移除未使用的 Tailwind CDN 脚本（减少 ~300KB 页面加载）
- AI 评论新增内存缓存，避免相同参数重复调用 API
- 删除 3 个未使用的死代码函数：renderHistoryRecords、downloadTextReport、downloadImageCard
- 导出数据/报告水印版本号改为引用 APP_VERSION 常量

---

## [4.0.3-beta] - 2026-04-15

**代号：Bug Fix & UX Enhancement（修 Bug 与体验优化）**

### Fixed
- 修复头像点击跳转登录界面的 Bug，新增点击展开个人资料面板
- 修复 Cloudflare Turnstile 验证反复失败问题
- 修复 AI 风格切换高频点击导致后端崩溃问题

### Added
- 新增内测感谢 Banner，滚动展示反馈贡献者

### Changed
- 优化悬停卡片过渡动画

---

## [4.0.2-beta] - 2026-04-14

**代号：Beta Polish（内测打磨）**

### Added
- 内测邀请码系统：注册时输入邀请码获得「内测」标识
- 新增头像：「涂鸦」「扁平」两款风格
- 隐私政策/用户协议增补：服务器位置、第三方服务、数据删除流程
- 版本日志重做：HTML 结构化排版

---

## [4.0.1-beta] - 2026-04-14

**代号：Security Hardening（安全加固）**

### Security
- JWT_SECRET 强制配置（未设置则拒绝启动）
- 路径遍历修复
- 验证码暴力破解防护（5 次上限）
- IP 限流：send-code 3/分、login 10/分、comment 20/分

### Added
- Cloudflare Turnstile 人机验证
- UID 登录支持
- 密码登录独立输入框
- 错误信息脱敏、AI Prompt 长度截断

---

## [4.0.0-beta] - 2026-04-13

**代号：Account System（账号系统）**

### Added
- 邮箱验证码注册与登录系统（Resend API 发送验证码）
- 密码登录（scrypt 哈希加密，crypto.randomInt 验证码）
- 用户资料系统：头像（DiceBear 8 款）、昵称、个性签名
- UID 自增系统（从 1100000 起），首用户自动成为管理员
- 管理员金色渐变胶囊标签
- 云端数据同步：登录后成绩、目标、AI 风格等自动上传/拉取
- 跨设备数据合并（按 ID 去重，本地 + 云端双写）
- 用户协议与隐私政策（弹窗展示，发送验证码前必须勾选）
- 多步骤登录弹窗（毛玻璃 + 滑动动画）
- 头像选择网格（渐变边框 + 缩放动画）
- 悬浮资料卡片（头像、昵称、UID、签名、管理员标签）
- 编辑资料弹窗（随时修改头像、昵称、签名）
- 后端输入校验（avatar_seed 白名单、昵称/签名长度限制）
- JWT 令牌认证（手写 HMAC-SHA256，零依赖）

### Changed
- 后端新增 5 个 API 路由：register / login-code / login-password / profile GET / profile PUT
- `lib/db.js` 重写为 JSON 文件存储（用户表 + 验证码表 + 数据目录）
- `lib/auth.js` 重写为完整认证模块（邮件发送 + 密码哈希 + JWT）
- `server.js` 新增路由分发（auth + sync + comment）
- `app.js` 新增约 350 行前端认证模块
- `style.css` 新增约 200 行登录/资料卡/头像/管理员标签样式
- `index.html` 新增多步骤登录弹窗、悬浮卡片、编辑资料弹窗、协议弹窗
- `package.json` 版本号升至 4.0.0-beta，零新增依赖
- `.gitignore` 新增 `data/` 排除数据库文件

### Security
- 密码 scrypt 单向哈希 + timingSafeEqual 比对
- avatar_seed 白名单校验（防 XSS）
- 验证码使用 crypto.randomInt（非 Math.random）
- nickname/bio 长度限制（20/60 字符）

---

## [3.1.1] - 2026-04-12

**代号：SemVer Normalization（版本号规范化）**

### Changed
- 将项目历史版本号统一为语义化版本号（SemVer: MAJOR.MINOR.PATCH）
- 重新划分三大阶段：1.x（纯成绩管理）→ 2.x（AI 赋能）→ 3.x（双平台工程化）
- 重命名 Versions_history 文件夹中所有历史版本文件为三段式编号
- 更新 README.md、index.html、app.js、package.json 中的版本号

### Added
- 创建 CHANGELOG.md 文件，记录完整版本变更历史

---

## [3.1.0] - 2026-04-06

**代号：Personality Upgrade（个性升级计划）**

### Added
- AI 评价风格系统：新增风暴（犀利）、暖阳（鼓励）、冷锋（理性）、阵雨（先损后帮）四种风格，一键切换
- 目标追踪功能：支持为每种考试设置目标分数，显示进度百分比

### Fixed
- 移除 start-local.bat 中硬编码的 API Key，防止密钥泄露
- 将 start-local.bat 加入 .gitignore，避免再次误提交敏感信息

---

## [3.0.1] - 2026-04-04

**代号：Code Cleanup（代码瘦身计划）**

### Changed
- 前端工程化拆分：CSS（~2000 行）提取到 `style.css`，JS（~2500 行）合并为 `app.js`，`index.html` 从 5170 行精简到约 560 行
- 后端去重：提取 `server.js` 与 `netlify/functions/comment.js` 的重复 AI 逻辑到 `lib/aiComment.js`

### Added
- 新增 `.gitignore`，防止误提交 node_modules、.env 等敏感文件
- CORS 支持 `ALLOWED_ORIGIN` 环境变量配置
- 新增 `start-local.bat` 本地启动脚本

### Fixed
- 修复导出备份文件版本号不一致的问题

---

## [3.0.0] - 2026-03-31

**代号：Lively Archive（灵动档案计划）**

### Added
- 统一 AI 接口入口 `/api/comment`，支持同一仓库同时部署到 Netlify 与 Zeabur
- Node 服务入口与 Zeabur 启动配置

### Changed
- 首页视觉语言重构：头部、卡片、背景氛围、排版比例与导航层级重新整理
- 学习档案区新增胶囊式摘要卡
- 页脚重做为品牌尾注区
- 考试类型引入统一主题色与 SVG 标识
- 报告导出预览与分享卡视觉统一

### Fixed
- 修复右侧卡片布局溢出、对齐不稳等问题
- 修复分享卡布局错位问题
- 修复自建后端与 Netlify 函数中的 AI 提示词乱码问题

---

## [2.4.0] - 2026-03-11

**代号：Polished Glass（精致玻璃计划）**

### Added
- Google Material 3 视觉风格升级：整体配色方案、圆角、间距、阴影全面焕新
- 新增报告导出功能：支持生成成绩单卡片/详细报告/学习总结

### Changed
- Header 视觉优化：背景色与 body 统一色系
- 导航交互优化：点击当前导航项自动回滚至页面顶部
- 页脚升级：新增 GitHub 开源标识与仓库链接

---

## [2.3.1] - 2026-02-12

**代号：Mobile Harmony（移动端和谐计划）**

### Changed
- 移动端 UI 系统升级：导航、卡片、历史记录、浮动入口完成系统级适配
- 最近成绩四宫格结构重构
- 历史记录重构为结构化行布局
- 突突er 交互升级：新增独立"展开/还原"按钮

### Fixed
- 修复输入区在移动端发送按钮挤压输入框的问题
- 引入 `visualViewport` 键盘感知与多时机同步，降低输入法遮挡

---

## [2.3.0] - 2026-02-07

### Added
- 版本日志系统：首次打开自动弹窗 + 左下角悬浮入口
- 突突er 伴学助手：悬浮入口与聊天面板，支持连续对话与情绪陪伴
- 突突er 快捷操作：一键生成今日学习计划、清空对话
- 突突er 未读提示：面板关闭时收到回复显示图标小红点

### Changed
- 扩展 Netlify AI 中转函数，支持 `mode: companion`

---

## [2.2.1] - 2026-02-06

**代号：The DOM Rescuer（DOM 拯救者）**

### Fixed
- 修复严重的 DOM 嵌套错误：缺失闭合标签导致录入和自定义页面无法加载

### Changed
- 更新页脚版权信息 (Designed by Liu Yuntian @ YTUN)

---

## [2.2.0] - 2026-02-06

### Added
- AI 回怼模式（Rebuttal System）：用户可反驳 AI 评价，实现多轮对话
- 动态战斗 UI：回嘴时界面切换为红色战斗状态

### Fixed
- 修复成绩列表容器丢失的 Bug

---

## [2.1.0] - 2026-02-06

### Added
- 桌面宠物（看板娘）：右下角常驻互动，表情随成绩变化
- 点击互动：点击宠物随机弹出趣味语录

---

## [2.0.0] - 2026-02-06

**AI 核心接入 — 产品本质改变**

### Added
- AI 智能成绩点评：接入 DeepSeek 大模型，新增毒舌老师人设
- Serverless 后端架构：引入 Netlify Functions (Node.js)，实现前后端分离
- AI 评价气泡 UI 组件，支持正在输入加载状态

### Changed
- 敏感数据安全：全面改用 Netlify 环境变量管理 API 密钥
- 错误处理机制：完善 API 调用失败时的降级显示逻辑

---

## [1.5.2] - 2026-02-02

### Changed
- 恢复成绩趋势图表功能（Chart.js），支持雅思/四级/六级成绩趋势可视化
- CET 考试写作和翻译合并显示

### Fixed
- 修复图表切换 Bug
- 修复历史记录不显示问题
- 修复数据兼容性问题

---

## [1.5.1] - 2026-02-02

### Added
- 多小题计分功能：支持一个大题包含多个小题，分别输入得分后自动加总

### Fixed
- 修复自定义考试科目缺少 ID 导致总分无法计算的问题
- 修复分部分计分实时预览不显示的问题
- 修复公式计算结果不纳入总分的问题

---

## [1.5.0] - 2026-02-02

### Added
- 雅思写作 Task1/Task2 分离输入，自动加权计算总分
- 自定义考试系统：支持创建任意考试，三种计分方式可选
- 独占式手风琴交互

### Changed
- UI 风格重构：改回明亮风格，暖白背景 + 翠绿主题色
- 科目配色：Listening蓝 / Reading绿 / Writing橙 / Speaking紫

---

## [1.4.0] - 2026-02-02

### Added
- 自定义考试类型系统：支持创建任意考试，配置科目、计分规则
- 四种计分方式：直接输入 / 查找表转换 / 分部分计分 / 公式计算
- 智能统计面板
- 分数趋势图表（Chart.js）
- 数据完整备份：导出/导入同时包含成绩记录和自定义考试配置

### Changed
- 全新深色主题 UI：深蓝紫渐变背景，玻璃拟态设计
- 响应式布局：完美适配手机和电脑屏幕

### Fixed
- 修复四六级听力 section 标签显示错误
- 修复日期选择器兼容性问题
- 修复表单验证的边界值处理

---

## [1.3.0] - 2026-01-xx

### Added
- 自定义考试引擎：支持创建和管理自定义考试类型

---

## [1.2.2] - 2026-01-xx

### Changed
- UI 风格调整：改为明亮风格，暖白背景 + 翠绿主题色

---

## [1.2.1] - 2026-01-xx

### Changed
- 小改进与优化

---

## [1.2.0] - 2026-01-xx

### Added
- 较大功能扩展

---

## [1.1.2] - 2026-01-xx

### Changed
- 小改动与优化

---

## [1.1.1] - 2026-01-xx

### Changed
- 小改动与优化

---

## [1.1.0] - 2026-01-xx

### Added
- 功能扩展

---

## [1.0.2] - 2026-01-xx

### Changed
- 小改进

---

## [1.0.1] - 2026-01-xx

### Changed
- 小改进

---

## [1.0.0] - 2026-01-xx

### Added
- 初始版本：基础考试成绩管理系统
- 支持 IELTS（雅思）成绩录入与管理
- 支持 CET（四六级）成绩录入与管理
- 浏览器 LocalStorage 本地存储
