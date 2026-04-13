# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Semantic Versioning](https://semver.org/).

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
