# 数据 API

<cite>
**本文档引用的文件**
- [server.js](file://server.js)
- [app.js](file://app.js)
- [lib/db.js](file://lib/db.js)
- [lib/auth.js](file://lib/auth.js)
- [lib/aiComment.js](file://lib/aiComment.js)
- [netlify/functions/comment.js](file://netlify/functions/comment.js)
- [README.md](file://README.md)
</cite>

## 目录
1. [简介](#简介)
2. [项目结构](#项目结构)
3. [核心组件](#核心组件)
4. [架构概览](#架构概览)
5. [详细组件分析](#详细组件分析)
6. [依赖分析](#依赖分析)
7. [性能考虑](#性能考虑)
8. [故障排除指南](#故障排除指南)
9. [结论](#结论)

## 简介

MyScore 是一个基于 Web 的 AI 智能成绩管理系统，提供云端数据同步功能。本文档专注于数据 API 的完整文档，特别是数据同步接口（/api/sync）的设计与实现。

MyScore 的核心特性包括：
- 云端数据同步：登录后成绩数据自动上传云端，换设备登录数据不丢失
- 用户系统：邮箱验证码登录、密码登录、UID 登录
- AI 智能交互：毒舌老师评价、突突er伴学助手
- 响应式设计：移动端优先适配，支持多平台部署

## 项目结构

MyScore 采用前后端分离的架构设计，主要包含以下组件：

```mermaid
graph TB
subgraph "客户端层"
Browser[Web 浏览器]
App[前端应用 app.js]
end
subgraph "服务端层"
Server[HTTP 服务器 server.js]
Auth[认证模块 lib/auth.js]
DB[数据库模块 lib/db.js]
AI[Ai 评论模块 lib/aiComment.js]
end
subgraph "存储层"
LocalStorage[浏览器本地存储]
FileSystem[文件系统存储]
end
Browser --> App
App --> Server
Server --> Auth
Server --> DB
Server --> AI
App --> LocalStorage
DB --> FileSystem
```

**图表来源**
- [server.js:1-541](file://server.js#L1-L541)
- [app.js:1-800](file://app.js#L1-L800)
- [lib/db.js:1-207](file://lib/db.js#L1-L207)

**章节来源**
- [server.js:1-541](file://server.js#L1-L541)
- [app.js:1-800](file://app.js#L1-L800)
- [lib/db.js:1-207](file://lib/db.js#L1-L207)

## 核心组件

### 数据同步接口

数据同步接口位于 `/api/sync`，提供用户数据的云端同步功能。该接口支持两种 HTTP 方法：

- **GET /api/sync**: 获取用户的云端数据
- **PUT /api/sync**: 保存用户的本地数据到云端

### 数据存储结构

MyScore 将用户数据分为两类存储：

1. **本地存储**：使用浏览器的 localStorage，包含以下键值：
   - `myscore_v51_records`: 成绩记录数组
   - `myscore_v51_custom`: 自定义考试配置对象
   - `myscore_goals`: 目标分数配置
   - `myscore_ai_style`: AI 评价风格设置
   - `myscore_tutuer_history`: 伴学对话历史

2. **云端存储**：使用 JSON 文件存储在服务器端，文件名为 `{userId}.json`

### 数据合并策略

当用户登录后，系统会执行数据合并策略：

```mermaid
flowchart TD
Start([开始同步]) --> PullCloud[拉取云端数据]
PullCloud --> CheckData{是否有云端数据?}
CheckData --> |否| PushLocal[推送本地数据]
CheckData --> |是| MergeRecords[合并成绩记录]
MergeRecords --> MergeCustom[合并自定义配置]
MergeCustom --> MergeGoals[合并目标配置]
MergeGoals --> MergeStyle[合并AI风格]
MergeStyle --> PushMerged[推送合并后的数据]
PushLocal --> End([结束])
PushMerged --> End
```

**图表来源**
- [app.js:715-743](file://app.js#L715-L743)

**章节来源**
- [app.js:705-743](file://app.js#L705-L743)
- [lib/db.js:190-206](file://lib/db.js#L190-L206)

## 架构概览

MyScore 的数据 API 架构采用分层设计：

```mermaid
graph LR
subgraph "API 层"
SyncAPI[数据同步 API]
AuthAPI[认证 API]
CommentAPI[AI 评论 API]
end
subgraph "业务逻辑层"
SyncHandler[同步处理器]
AuthHandler[认证处理器]
CommentHandler[评论处理器]
end
subgraph "数据访问层"
UserDataDAO[用户数据 DAO]
UserDAO[用户 DAO]
CodeDAO[验证码 DAO]
end
subgraph "存储层"
JSONFile[JSON 文件存储]
FS[文件系统]
end
SyncAPI --> SyncHandler
AuthAPI --> AuthHandler
CommentAPI --> CommentHandler
SyncHandler --> UserDataDAO
AuthHandler --> UserDAO
CommentHandler --> CodeDAO
UserDataDAO --> JSONFile
UserDAO --> JSONFile
CodeDAO --> JSONFile
JSONFile --> FS
```

**图表来源**
- [server.js:469-502](file://server.js#L469-L502)
- [lib/db.js:190-206](file://lib/db.js#L190-L206)

**章节来源**
- [server.js:469-502](file://server.js#L469-L502)
- [lib/db.js:190-206](file://lib/db.js#L190-L206)

## 详细组件分析

### 数据同步 API 实现

#### GET /api/sync - 获取用户数据

当客户端发起 GET 请求时，服务器执行以下流程：

```mermaid
sequenceDiagram
participant Client as 客户端
participant Server as 服务器
participant Auth as 认证模块
participant DB as 数据库模块
Client->>Server : GET /api/sync
Server->>Server : 提取 Authorization 头
Server->>Auth : 验证 JWT 令牌
Auth-->>Server : 返回用户信息
Server->>DB : getUserData(userId)
DB-->>Server : 返回用户数据
Server-->>Client : 200 OK {ok : true, data}
```

**图表来源**
- [server.js:469-487](file://server.js#L469-L487)
- [lib/db.js:198-206](file://lib/db.js#L198-L206)

#### PUT /api/sync - 保存用户数据

当客户端发起 PUT 请求时，服务器执行以下流程：

```mermaid
sequenceDiagram
participant Client as 客户端
participant Server as 服务器
participant Auth as 认证模块
participant DB as 数据库模块
Client->>Server : PUT /api/sync {data}
Server->>Server : 提取 Authorization 头
Server->>Auth : 验证 JWT 令牌
Auth-->>Server : 返回用户信息
Server->>DB : saveUserData(userId, data)
DB-->>Server : 确认保存成功
Server-->>Client : 200 OK {ok : true}
```

**图表来源**
- [server.js:489-495](file://server.js#L489-L495)
- [lib/db.js:192-196](file://lib/db.js#L192-L196)

**章节来源**
- [server.js:469-502](file://server.js#L469-L502)
- [lib/db.js:190-206](file://lib/db.js#L190-L206)

### 数据结构定义

#### 本地存储数据结构

```mermaid
erDiagram
USER_DATA {
array records
object custom
object goals
string ai_style
array tutuer_history
}
RECORD {
number id PK
string examType
date date
number score
object subjects
string note
}
CUSTOM_EXAM {
string id PK
string name
string desc
string icon
boolean builtin
array subjects
}
GOALS {
string examType PK
number target
date deadline
}
TUTUER_HISTORY {
number id PK
string role
string content
datetime timestamp
}
USER_DATA ||--o{ RECORD : contains
USER_DATA ||--o{ CUSTOM_EXAM : contains
USER_DATA ||--o{ GOALS : contains
USER_DATA ||--o{ TUTUER_HISTORY : contains
```

**图表来源**
- [app.js:705-713](file://app.js#L705-L713)

#### 云端存储数据结构

云端存储采用简单的 JSON 文件格式，文件名为 `{userId}.json`：

```mermaid
flowchart TD
UserDataJSON["用户数据 JSON 文件"] --> RecordsArray["成绩记录数组"]
UserDataJSON --> CustomObject["自定义考试配置对象"]
UserDataJSON --> GoalsObject["目标分数配置对象"]
UserDataJSON --> AiStyle["AI 评价风格字符串"]
UserDataJSON --> TutuerHistory["伴学对话历史数组"]
RecordsArray --> RecordItem["单条成绩记录对象"]
CustomObject --> CustomExam["自定义考试配置对象"]
GoalsObject --> GoalItem["单个目标配置对象"]
TutuerHistory --> MessageItem["单条对话消息对象"]
```

**图表来源**
- [lib/db.js:192-196](file://lib/db.js#L192-L196)

**章节来源**
- [app.js:705-713](file://app.js#L705-L713)
- [lib/db.js:190-206](file://lib/db.js#L190-L206)

### 数据验证规则

#### 前端数据验证

前端应用对用户输入进行严格的验证：

- **成绩记录验证**：确保 `id` 为数字，`examType` 为字符串，`date` 为有效日期，`score` 为有效数值
- **自定义考试验证**：验证 `subjects` 数组中的每个科目配置
- **目标配置验证**：确保 `target` 为有效数值，`deadline` 为有效日期
- **AI 风格验证**：仅允许 `storm`、`sun`、`cold`、`rain` 四种风格

#### 后端数据验证

后端服务器对请求数据进行验证：

- **JWT 令牌验证**：确保请求携带有效的 Bearer 令牌
- **数据格式验证**：验证 JSON 数据结构的完整性
- **数据大小限制**：限制请求体大小不超过 1MB

**章节来源**
- [app.js:715-743](file://app.js#L715-L743)
- [server.js:103-112](file://server.js#L103-L112)

### 同步机制

#### 自动同步流程

```mermaid
sequenceDiagram
participant Timer as 同步定时器
participant App as 应用程序
participant Server as 服务器
participant DB as 数据库
Timer->>App : scheduleCloudSync()
App->>App : clearTimeout(syncTimer)
App->>App : setTimeout(pushToCloud, 500ms)
App->>Server : PUT /api/sync {data}
Server->>DB : saveUserData(userId, data)
DB-->>Server : 确认保存
Server-->>App : 200 OK {ok : true}
Note over App : 500ms 延迟避免频繁同步
```

**图表来源**
- [app.js:666-687](file://app.js#L666-L687)
- [server.js:489-495](file://server.js#L489-L495)

#### 手动同步触发

用户可以通过以下方式触发手动同步：
- 页面加载时自动同步
- 数据变更时自动触发
- 用户手动点击同步按钮

**章节来源**
- [app.js:666-687](file://app.js#L666-L687)
- [app.js:689-703](file://app.js#L689-L703)

### 冲突处理策略

MyScore 采用"云端优先，本地合并"的冲突处理策略：

1. **成绩记录冲突**：比较 `id` 字段，云端记录优先，本地记录保留
2. **自定义配置冲突**：使用 `Object.assign()` 合并，云端配置优先
3. **目标配置冲突**：使用 `Object.assign()` 合并，云端配置优先
4. **AI 风格冲突**：云端配置覆盖本地配置

```mermaid
flowchart TD
Conflict[检测到数据冲突] --> CompareIDs[比较记录ID]
CompareIDs --> CloudWins[云端记录优先]
CompareIDs --> LocalWins[本地记录保留]
CloudWins --> MergeCustom[合并自定义配置]
LocalWins --> MergeCustom
MergeCustom --> MergeGoals[合并目标配置]
MergeGoals --> UpdateStyle[更新AI风格]
UpdateStyle --> RenderDashboard[重新渲染界面]
```

**图表来源**
- [app.js:715-743](file://app.js#L715-L743)

**章节来源**
- [app.js:715-743](file://app.js#L715-L743)

## 依赖分析

### 组件间依赖关系

```mermaid
graph TD
Server[server.js] --> DB[lib/db.js]
Server --> Auth[lib/auth.js]
Server --> AI[lib/aiComment.js]
App[app.js] --> Server
App --> DB
NetlifyFunc[netlify/functions/comment.js] --> AI
DB --> FileSystem[文件系统]
Auth --> DB
```

**图表来源**
- [server.js:6-8](file://server.js#L6-L8)
- [app.js:1-8](file://app.js#L1-L8)

### 外部依赖

MyScore 使用以下外部服务：

1. **Cloudflare Turnstile**：人机验证服务
2. **Resend**：邮件发送服务
3. **DeepSeek API**：AI 评论服务
4. **DiceBear**：头像生成服务

**章节来源**
- [server.js:52-67](file://server.js#L52-L67)
- [lib/auth.js:9-10](file://lib/auth.js#L9-L10)
- [lib/aiComment.js:73-149](file://lib/aiComment.js#L73-L149)

## 性能考虑

### 缓存策略

- **静态资源缓存**：CSS、JS、图片等文件使用长期缓存策略
- **API 响应缓存**：数据同步接口返回的数据具有适当的缓存控制
- **内存缓存**：JWT 令牌在内存中缓存，避免重复解析

### 限流机制

服务器实现了多种限流机制：

- **IP 限流**：针对敏感端点的请求频率限制
- **验证码限流**：每分钟最多发送 3 次验证码
- **登录限流**：每分钟最多尝试 10 次登录
- **AI 评论限流**：每分钟最多 20 次 AI 评论请求

### 错误处理

- **优雅降级**：网络错误时提供友好的用户提示
- **重试机制**：自动重试短暂的网络错误
- **错误日志**：服务器端记录详细的错误信息

## 故障排除指南

### 常见问题及解决方案

#### 401 未授权错误

**症状**：请求返回 401 未授权错误

**原因**：
- JWT 令牌无效或已过期
- Authorization 头格式不正确

**解决方案**：
1. 检查 JWT 令牌是否正确设置
2. 确认令牌未过期（默认有效期 30 天）
3. 验证 Authorization 头格式：`Bearer <token>`

#### 404 未找到错误

**症状**：请求返回 404 未找到错误

**原因**：
- 用户数据文件不存在
- 用户 ID 无效

**解决方案**：
1. 确认用户已正确登录
2. 检查用户 ID 是否正确
3. 验证数据文件是否存在

#### 500 服务器内部错误

**症状**：请求返回 500 服务器内部错误

**原因**：
- 文件系统权限问题
- 数据格式异常
- 服务器资源不足

**解决方案**：
1. 检查服务器日志获取详细错误信息
2. 验证数据文件格式的完整性
3. 确认服务器有足够的磁盘空间

#### 同步失败

**症状**：数据同步失败，提示网络连接问题

**原因**：
- 网络连接不稳定
- 服务器暂时不可用
- 防火墙阻止请求

**解决方案**：
1. 检查网络连接状态
2. 稍后重试同步操作
3. 检查防火墙设置
4. 联系系统管理员

**章节来源**
- [server.js:478-501](file://server.js#L478-L501)
- [app.js:683-686](file://app.js#L683-L686)

## 结论

MyScore 的数据 API 设计体现了现代 Web 应用的最佳实践：

1. **安全性**：采用 JWT 令牌认证，支持人机验证，实现严格的访问控制
2. **可靠性**：提供完善的错误处理和重试机制，确保数据一致性
3. **性能**：优化的缓存策略和限流机制，提升用户体验
4. **可维护性**：清晰的代码结构和文档，便于后续开发和维护

数据同步功能通过简单而强大的 API 设计，实现了跨设备的数据共享，为用户提供了无缝的学习体验。系统的冲突处理策略确保了数据的完整性和一致性，而严格的安全措施保护了用户隐私和数据安全。