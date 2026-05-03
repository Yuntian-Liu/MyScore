// ==================== 飞书机器人集成 ====================
// 环境变量：FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_ENCRYPT_KEY, FEISHU_VERIFICATION_TOKEN

import crypto from "node:crypto";

const FEISHU_API_BASE = "https://open.feishu.cn/open-apis";
const ENCRYPT_KEY = process.env.FEISHU_ENCRYPT_KEY || "";
const VERIFICATION_TOKEN = process.env.FEISHU_VERIFICATION_TOKEN || "";

// ==================== 飞书事件解密 ====================

function decryptFeishuEvent(encrypted) {
  if (!ENCRYPT_KEY) throw new Error("ENCRYPT_KEY not configured");
  const keyHash = crypto.createHash("sha256").update(ENCRYPT_KEY).digest();
  const buf = Buffer.from(encrypted, "base64");
  const iv = buf.subarray(0, 16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", keyHash, iv);
  let decrypted = decipher.update(buf.subarray(16), undefined, "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted);
}

let tenantToken = null;
let tokenExpires = 0;

// 事件去重：记录已处理的 event_id，防止飞书重试导致重复处理
const _processedEvents = new Map();

// ==================== 科目中文名映射 ====================

const SUBJECT_CN = {
  // 雅思保持英文（与网页端一致）
  cet4: { listening: "听力", reading: "阅读", writing: "写作", translation: "翻译" },
  cet6: { listening: "听力", reading: "阅读", writing: "写作", translation: "翻译" },
};

function getSubjectLabel(examType, subjectId) {
  return SUBJECT_CN[examType]?.[subjectId] || subjectId;
}

// ==================== 绑定码管理 ====================

const bindCodes = new Map();

function cleanExpiredCodes() {
  const now = Date.now();
  for (const [k, v] of bindCodes) {
    if (now > v.expiresAt) bindCodes.delete(k);
  }
}

export function generateBindCode(userId, email) {
  cleanExpiredCodes();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  bindCodes.set(code, {
    userId,
    email,
    expiresAt: Date.now() + 5 * 60 * 1000
  });
  return code;
}

export function consumeBindCode(code) {
  const entry = bindCodes.get(code);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    bindCodes.delete(code);
    return null;
  }
  bindCodes.delete(code);
  return { userId: entry.userId, email: entry.email };
}

// 每5分钟清理过期绑定码
setInterval(cleanExpiredCodes, 5 * 60 * 1000);

// ==================== Token ====================

export async function getTenantAccessToken() {
  if (tenantToken && Date.now() < tokenExpires) return tenantToken;

  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("Feishu app credentials not configured");
  }

  const res = await fetch(FEISHU_API_BASE + "/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error("Feishu auth failed: " + data.msg);
  }

  tenantToken = data.tenant_access_token;
  tokenExpires = Date.now() + (data.expire - 300) * 1000;
  return tenantToken;
}

// ==================== 消息发送 ====================

export async function sendFeishuMessage(openId, msgType, content) {
  const token = await getTenantAccessToken();
  const res = await fetch(FEISHU_API_BASE + "/im/v1/messages?receive_id_type=open_id", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({
      receive_id: openId,
      msg_type: msgType,
      content: typeof content === "string" ? content : JSON.stringify(content),
    }),
  });
  return await res.json();
}

export async function sendInteractiveCard(openId, cardContent) {
  return sendFeishuMessage(openId, "interactive", cardContent);
}

async function sendText(openId, text) {
  return sendFeishuMessage(openId, "text", JSON.stringify({ text }));
}

// ==================== 成就定义（服务端副本，避免导入浏览器模块） ====================

const ACHIEVEMENTS = [
  { id: "first_score", icon: "🎯", name: "初次记录", desc: "录入第一笔成绩" },
  { id: "five_scores", icon: "📝", name: "稳定考生", desc: "累计录入5次成绩" },
  { id: "ten_scores", icon: "📚", name: "学霸之路", desc: "累计录入10次成绩" },
  { id: "streak_3", icon: "🔥", name: "三日之约", desc: "连续打卡3天" },
  { id: "streak_7", icon: "🌟", name: "一周坚持", desc: "连续打卡7天" },
  { id: "streak_30", icon: "👑", name: "月度霸主", desc: "连续打卡30天" },
  { id: "ielts_7", icon: "🏆", name: "雅思7分", desc: "IELTS总分达到7.0" },
  { id: "cet4_500", icon: "💪", name: "四级500+", desc: "CET-4总分达到500" },
  { id: "cet6_500", icon: "🎓", name: "六级500+", desc: "CET-6总分达到500" },
  { id: "improvement", icon: "📈", name: "逆风翻盘", desc: "任一科目成绩显著提升" },
  { id: "ai_debate", icon: "⚔️", name: "反击选手", desc: "使用AI回嘴功能" },
  { id: "custom_exam", icon: "✨", name: "个性化", desc: "创建自定义考试" },
];

// ==================== 卡片模板 ====================

export function buildWelcomeCard(nickname) {
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: "绑定成功！" },
      template: "green"
    },
    elements: [
      { tag: "markdown", content: `**${nickname || '同学'}**，欢迎连接 MyScore AI 助手！` },
      { tag: "hr" },
      { tag: "markdown", content: "**你可以这样跟我对话：**" },
      { tag: "column_set", flex_mode: "none", background_style: "grey", columns: [
        { tag: "column", width: "weighted", weight: 1, elements: [
          { tag: "markdown", content: "**查询** — 查看最新成绩\n**趋势** — 成绩变化趋势\n**目标** — 目标完成进度\n**统计** — 各科成绩统计" }
        ]},
        { tag: "column", width: "weighted", weight: 1, elements: [
          { tag: "markdown", content: "**历史** — 最近成绩记录\n**成就** — 已解锁成就\n**打卡** — 每日打卡状态\n**等级** — 等级与经验值" }
        ]}
      ]}
    ]
  };
}

export function buildScoreNotifyCard(record, examName, aiSummary) {
  const date = record.date || "未知日期";
  const total = record.total ?? "-";

  const scoreLines = Object.entries(record.scores || {}).map(([k, v]) => {
    const label = getSubjectLabel(record.examType, k);
    return `${label}　**${v}**`;
  }).join("\n");

  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: "📊 成绩通知" },
      template: "blue"
    },
    elements: [
      { tag: "column_set", flex_mode: "none", columns: [
        { tag: "column", width: "weighted", weight: 2, elements: [
          { tag: "markdown", content: `**${examName}**　｜　${date}` }
        ]},
        { tag: "column", width: "auto", elements: [
          { tag: "markdown", content: `**${total}**` }
        ]}
      ]},
      { tag: "hr" },
      { tag: "markdown", content: scoreLines || "暂无分项数据" },
      ...(aiSummary ? [{ tag: "hr" }, { tag: "markdown", content: `*🤖 ${aiSummary}*` }] : [])
    ]
  };
}

export function buildQueryCard(records, exams) {
  if (!records || records.length === 0) {
    return {
      config: { wide_screen_mode: true },
      header: { title: { tag: "plain_text", content: "📋 查询结果" }, template: "orange" },
      elements: [{ tag: "markdown", content: "暂无成绩记录，快去 MyScore 录入吧！" }]
    };
  }

  const latest = records[records.length - 1];
  const examName = exams[latest.examType]?.name || latest.examType;
  const date = latest.date || "未知";
  const total = latest.total ?? "-";

  const scoreLines = Object.entries(latest.scores || {}).map(([k, v]) => {
    const label = getSubjectLabel(latest.examType, k);
    return `${label}　**${v}**`;
  }).join("\n");

  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: "plain_text", content: "📋 最新成绩" }, template: "blue" },
    elements: [
      { tag: "column_set", flex_mode: "none", columns: [
        { tag: "column", width: "weighted", weight: 2, elements: [
          { tag: "markdown", content: `**${examName}**　｜　${date}\n共 ${records.length} 条记录` }
        ]},
        { tag: "column", width: "auto", elements: [
          { tag: "markdown", content: `**${total}**` }
        ]}
      ]},
      { tag: "hr" },
      { tag: "markdown", content: scoreLines || "-" }
    ]
  };
}

export function buildTrendCard(records, exams) {
  if (!records || records.length < 2) {
    return {
      config: { wide_screen_mode: true },
      header: { title: { tag: "plain_text", content: "📈 成绩趋势" }, template: "orange" },
      elements: [{ tag: "markdown", content: "成绩记录不足2条，暂时无法分析趋势哦。继续努力录入吧！" }]
    };
  }

  const recent = records.slice(-5);
  const lines = [];
  for (let i = 0; i < recent.length; i++) {
    const rec = recent[i];
    const examName = exams[rec.examType]?.name || rec.examType;
    const total = rec.total ?? "-";
    let arrow = "";
    if (i > 0 && rec.total !== null && recent[i - 1].total !== null) {
      arrow = rec.total > recent[i - 1].total ? " ↑" : rec.total < recent[i - 1].total ? " ↓" : " →";
    }
    lines.push(`**${examName}** ${rec.date}\n${total}${arrow}`);
  }

  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: "plain_text", content: "📈 成绩趋势" }, template: "green" },
    elements: [
      { tag: "markdown", content: `最近 **${recent.length}** 次考试成绩变化` },
      { tag: "hr" },
      { tag: "markdown", content: lines.join("\n\n") }
    ]
  };
}

export function buildGoalCard(goals, records, exams) {
  if (!goals || Object.keys(goals).length === 0) {
    return {
      config: { wide_screen_mode: true },
      header: { title: { tag: "plain_text", content: "🎯 目标进度" }, template: "orange" },
      elements: [{ tag: "markdown", content: "还没有设置目标分数哦，去 MyScore 设置一个吧！" }]
    };
  }

  const lines = [];
  for (const [examType, target] of Object.entries(goals)) {
    const examName = exams[examType]?.name || examType;
    const typeRecords = records.filter(r => r.examType === examType);
    if (typeRecords.length === 0) {
      lines.push(`**${examName}**\n目标 ${target}（尚无记录）`);
      continue;
    }
    const latest = typeRecords[typeRecords.length - 1].total;
    if (latest === null || latest === undefined) {
      lines.push(`**${examName}**\n目标 ${target}`);
      continue;
    }
    const pct = Math.min(100, Math.round((latest / target) * 100));
    const filled = Math.floor(pct / 5);
    const bar = "█".repeat(filled) + "░".repeat(20 - filled);
    lines.push(`**${examName}**\n${latest} / ${target}  **${pct}%**\n\`${bar}\``);
  }

  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: "plain_text", content: "🎯 目标进度" }, template: "blue" },
    elements: [
      { tag: "markdown", content: `共 **${Object.keys(goals).length}** 个目标` },
      { tag: "hr" },
      { tag: "markdown", content: lines.join("\n\n") }
    ]
  };
}

export function buildAchievementCard(unlockedIds, allAchievements) {
  const unlocked = unlockedIds || [];
  if (unlocked.length === 0) {
    return {
      header: { title: { tag: "plain_text", content: "🏆 成就墙" }, template: "purple" },
      elements: [{ tag: "markdown", content: "还没有解锁成就哦，继续使用 MyScore 吧！" }]
    };
  }

  const items = unlocked.map(id => {
    const ach = allAchievements?.find(a => a.id === id);
    return ach ? `${ach.icon} **${ach.name}** — ${ach.desc}` : id;
  });

  return {
    header: { title: { tag: "plain_text", content: "🏆 已解锁成就 (" + unlocked.length + ")" }, template: "purple" },
    elements: [
      { tag: "markdown", content: items.join("\n\n") }
    ]
  };
}

export function buildHelpCard() {
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: "❓ MyScore 机器人帮助" },
      template: "indigo"
    },
    elements: [
      { tag: "markdown", content: "**直接发送以下关键词即可：**" },
      { tag: "column_set", flex_mode: "none", background_style: "grey", columns: [
        { tag: "column", width: "weighted", weight: 1, elements: [
          { tag: "markdown", content: "`查询` — 最新成绩\n`趋势` — 成绩变化趋势\n`目标` — 目标完成进度\n`统计` — 各科成绩统计" }
        ]},
        { tag: "column", width: "weighted", weight: 1, elements: [
          { tag: "markdown", content: "`历史` — 最近成绩记录\n`成就` — 已解锁成就\n`打卡` — 每日打卡状态\n`等级` — 等级与经验值" }
        ]}
      ]},
      { tag: "hr" },
      { tag: "markdown", content: "`绑定 XXXXXX` — 绑定账号　`帮助` — 本帮助信息" },
      { tag: "hr" },
      { tag: "markdown", content: "*MyScore AI 智能成绩管理系统*" }
    ]
  };
}

export function buildStatsCard(records, exams) {
  if (!records || records.length === 0) {
    return {
      config: { wide_screen_mode: true },
      header: { title: { tag: "plain_text", content: "📊 成绩统计" }, template: "orange" },
      elements: [{ tag: "markdown", content: "暂无成绩记录，快去录入吧！" }]
    };
  }

  const byType = {};
  for (const rec of records) {
    if (!byType[rec.examType]) byType[rec.examType] = [];
    byType[rec.examType].push(rec);
  }

  const lines = [];
  for (const [type, recs] of Object.entries(byType)) {
    const name = exams[type]?.name || type;
    const totals = recs.map(r => r.total).filter(t => t !== null && t !== undefined);
    if (totals.length === 0) continue;
    const avg = (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1);
    const max = Math.max(...totals);
    const min = Math.min(...totals);
    lines.push("**" + name + "**　共 " + recs.length + " 次\n平均 " + avg + "　最高 " + max + "　最低 " + min);
  }

  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: "plain_text", content: "📊 成绩统计" }, template: "blue" },
    elements: [
      { tag: "markdown", content: "共录入 **" + records.length + "** 次成绩" },
      { tag: "hr" },
      { tag: "markdown", content: lines.join("\n\n") || "暂无有效数据" }
    ]
  };
}

export function buildHistoryCard(records, exams) {
  if (!records || records.length === 0) {
    return {
      config: { wide_screen_mode: true },
      header: { title: { tag: "plain_text", content: "📜 历史记录" }, template: "orange" },
      elements: [{ tag: "markdown", content: "暂无成绩记录，快去录入吧！" }]
    };
  }

  const recent = records.slice(-5).reverse();
  const lines = [];
  for (const rec of recent) {
    const name = exams[rec.examType]?.name || rec.examType;
    const total = rec.total ?? "-";
    lines.push("**" + name + "**　" + (rec.date || "未知") + "　**" + total + "**");
  }

  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: "plain_text", content: "📜 最近成绩" }, template: "blue" },
    elements: [
      { tag: "markdown", content: "共 " + records.length + " 条记录，显示最近 5 条" },
      { tag: "hr" },
      { tag: "markdown", content: lines.join("\n") }
    ]
  };
}

export function buildCheckinCard(streakData) {
  const today = new Date().toISOString().slice(0, 10);
  const lastCheckin = streakData?.lastCheckin || "";
  const currentStreak = streakData?.currentStreak || 0;
  const longestStreak = streakData?.longestStreak || 0;
  const isCheckedToday = lastCheckin === today;

  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: "plain_text", content: "🔥 每日打卡" }, template: isCheckedToday ? "green" : "orange" },
    elements: [
      { tag: "markdown", content: isCheckedToday
        ? "今日已打卡！当前连续 **" + currentStreak + "** 天"
        : "今日还未打卡哦，去 MyScore 网站打卡吧！" },
      { tag: "hr" },
      { tag: "markdown", content: "当前连续　**" + currentStreak + "** 天\n最长连续　**" + longestStreak + "** 天" }
    ]
  };
}

export function buildLevelCard(xpData) {
  const total = xpData?.total || 0;
  const level = xpData?.level || 1;
  const xpNeeded = 80 * level;
  const pct = Math.min(100, Math.round((total / xpNeeded) * 100));
  const filled = Math.floor(pct / 5);
  const bar = "█".repeat(filled) + "░".repeat(20 - filled);

  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: "plain_text", content: "⭐ 等级信息" }, template: "purple" },
    elements: [
      { tag: "markdown", content: "当前等级　**Lv." + level + "**\n总经验值　**" + total + "** XP" },
      { tag: "hr" },
      { tag: "markdown", content: "升级所需　" + total + " / " + xpNeeded + " XP　**" + pct + "%**\n`" + bar + "`" }
    ]
  };
}

// ==================== 命令路由 ====================

const COMMANDS = [
  { pattern: /^绑定\s+(\d{6})$/, handler: "bind" },
  { pattern: /^查询$/, handler: "query" },
  { pattern: /^趋势$/, handler: "trend" },
  { pattern: /^目标$/, handler: "goal" },
  { pattern: /^成就$/, handler: "achievement" },
  { pattern: /^统计$/, handler: "stats" },
  { pattern: /^历史$/, handler: "history" },
  { pattern: /^打卡$/, handler: "checkin" },
  { pattern: /^等级$/, handler: "level" },
  { pattern: /^(帮助|help)$/, handler: "help" },
];

function matchCommand(text) {
  for (const cmd of COMMANDS) {
    const m = text.match(cmd.pattern);
    if (m) return { handler: cmd.handler, args: m.slice(1) };
  }
  return null;
}

// ==================== 事件处理 ====================

export async function handleFeishuEvent(body) {
  // 解密加密事件（飞书启用 Encrypt Key 后请求体会加密）
  if (body.encrypt) {
    try {
      body = decryptFeishuEvent(body.encrypt);
    } catch (e) {
      console.error("[Feishu] Decrypt failed:", e.message);
      return { ok: true };
    }
  }

  // URL 验证
  if (body.challenge) {
    return { challenge: body.challenge };
  }

  // 事件去重：飞书未及时收到响应会重试投递，跳过已处理的事件
  const eventId = body.header?.event_id;
  if (eventId) {
    if (_processedEvents.has(eventId)) {
      console.log("[Feishu] Duplicate event skipped:", eventId);
      return { ok: true };
    }
    _processedEvents.set(eventId, Date.now());
    // 清理超过 5 分钟的记录，防止内存泄漏
    const now = Date.now();
    for (const [id, ts] of _processedEvents) {
      if (now - ts > 5 * 60 * 1000) _processedEvents.delete(id);
    }
    // 限制容量上限
    if (_processedEvents.size > 1000) {
      const oldest = _processedEvents.keys().next().value;
      _processedEvents.delete(oldest);
    }
  }

  const event = body.event;
  if (!event) return { ok: true };

  // 消息事件
  if (event.message) {
    const msg = event.message;
    const content = JSON.parse(msg.content || '{}');
    const text = (content.text || '').trim();
    const openId = event.sender?.sender_id?.open_id;

    console.log("[Feishu] Received message:", text, "from", openId);

    if (!text || !openId) return { ok: true };

    const matched = matchCommand(text);
    if (!matched) {
      await sendText(openId, "未识别的命令，发送「帮助」查看可用命令列表。");
      return { ok: true };
    }

    try {
      switch (matched.handler) {
        case "bind":
          await handleBindCommand(openId, matched.args[0]);
          break;
        case "query":
          await handleQueryCommand(openId);
          break;
        case "trend":
          await handleTrendCommand(openId);
          break;
        case "goal":
          await handleGoalCommand(openId);
          break;
        case "achievement":
          await handleAchievementCommand(openId);
          break;
        case "stats":
          await handleStatsCommand(openId);
          break;
        case "history":
          await handleHistoryCommand(openId);
          break;
        case "checkin":
          await handleCheckinCommand(openId);
          break;
        case "level":
          await handleLevelCommand(openId);
          break;
        case "help":
          await sendInteractiveCard(openId, buildHelpCard());
          break;
      }
    } catch (e) {
      console.error("[Feishu] Command error:", matched.handler, e);
      await sendText(openId, "处理命令时出错，请稍后重试。");
    }
  }

  return { ok: true };
}

async function handleBindCommand(openId, code) {
  const { updateUserFeishuOpenId, findUserByUid } = await import("./db.js");
  const entry = consumeBindCode(code);

  if (!entry) {
    await sendText(openId, "绑定码无效或已过期，请在 MyScore 网站重新获取。");
    return;
  }

  const user = updateUserFeishuOpenId(entry.email, openId);
  if (user) {
    const card = buildWelcomeCard(user.nickname);
    await sendInteractiveCard(openId, card);
    console.log("[Feishu] User bound:", entry.email, "->", openId);
  } else {
    await sendText(openId, "绑定失败，请稍后重试。");
  }
}

async function handleQueryCommand(openId) {
  const { findUserByFeishuOpenId, getUserData } = await import("./db.js");
  const user = findUserByFeishuOpenId(openId);
  if (!user) {
    await sendText(openId, "尚未绑定 MyScore 账号，请先在网站设置页进行绑定。");
    return;
  }

  const data = getUserData(String(user.id));
  const records = data?.records || [];
  const custom = data?.custom || {};
  const exams = { ...getBuiltinExams(), ...custom };

  const card = buildQueryCard(records, exams);
  await sendInteractiveCard(openId, card);
}

async function handleTrendCommand(openId) {
  const { findUserByFeishuOpenId, getUserData } = await import("./db.js");
  const user = findUserByFeishuOpenId(openId);
  if (!user) {
    await sendText(openId, "尚未绑定 MyScore 账号，请先在网站设置页进行绑定。");
    return;
  }

  const data = getUserData(String(user.id));
  const records = data?.records || [];
  const custom = data?.custom || {};
  const exams = { ...getBuiltinExams(), ...custom };

  const trendCard = buildTrendCard(records, exams);
  await sendInteractiveCard(openId, trendCard);
}

async function handleGoalCommand(openId) {
  const { findUserByFeishuOpenId, getUserData } = await import("./db.js");
  const user = findUserByFeishuOpenId(openId);
  if (!user) {
    await sendText(openId, "尚未绑定 MyScore 账号，请先在网站设置页进行绑定。");
    return;
  }

  const data = getUserData(String(user.id));
  const goals = data?.goals || {};
  const records = data?.records || [];
  const custom = data?.custom || {};
  const exams = { ...getBuiltinExams(), ...custom };

  const goalCard = buildGoalCard(goals, records, exams);
  await sendInteractiveCard(openId, goalCard);
}

async function handleAchievementCommand(openId) {
  const { findUserByFeishuOpenId, getUserData } = await import("./db.js");
  const user = findUserByFeishuOpenId(openId);
  if (!user) {
    await sendText(openId, "尚未绑定 MyScore 账号，请先在网站设置页进行绑定。");
    return;
  }

  const data = getUserData(String(user.id));
  const achievements = data?.achievements || [];

  const card = buildAchievementCard(achievements, ACHIEVEMENTS);
  await sendInteractiveCard(openId, card);
}

async function handleStatsCommand(openId) {
  const { findUserByFeishuOpenId, getUserData } = await import("./db.js");
  const user = findUserByFeishuOpenId(openId);
  if (!user) { await sendText(openId, "尚未绑定 MyScore 账号，请先在网站设置页进行绑定。"); return; }

  const data = getUserData(String(user.id));
  const records = data?.records || [];
  const custom = data?.custom || {};
  const exams = { ...getBuiltinExams(), ...custom };

  await sendInteractiveCard(openId, buildStatsCard(records, exams));
}

async function handleHistoryCommand(openId) {
  const { findUserByFeishuOpenId, getUserData } = await import("./db.js");
  const user = findUserByFeishuOpenId(openId);
  if (!user) { await sendText(openId, "尚未绑定 MyScore 账号，请先在网站设置页进行绑定。"); return; }

  const data = getUserData(String(user.id));
  const records = data?.records || [];
  const custom = data?.custom || {};
  const exams = { ...getBuiltinExams(), ...custom };

  await sendInteractiveCard(openId, buildHistoryCard(records, exams));
}

async function handleCheckinCommand(openId) {
  const { findUserByFeishuOpenId, getUserData } = await import("./db.js");
  const user = findUserByFeishuOpenId(openId);
  if (!user) { await sendText(openId, "尚未绑定 MyScore 账号，请先在网站设置页进行绑定。"); return; }

  const data = getUserData(String(user.id));
  const streakData = data?.streak_data || {};

  await sendInteractiveCard(openId, buildCheckinCard(streakData));
}

async function handleLevelCommand(openId) {
  const { findUserByFeishuOpenId, getUserData } = await import("./db.js");
  const user = findUserByFeishuOpenId(openId);
  if (!user) { await sendText(openId, "尚未绑定 MyScore 账号，请先在网站设置页进行绑定。"); return; }

  const data = getUserData(String(user.id));
  const xpData = data?.xp_data || { total: 0, level: 1 };

  await sendInteractiveCard(openId, buildLevelCard(xpData));
}

// ==================== 成绩通知 ====================

export async function sendFeishuNotification(userId, recordData, options = {}) {
  const { findUserById, getUserData } = await import("./db.js");
  const user = findUserById(String(userId));
  if (!user || !user.feishu_open_id) {
    console.log("[Feishu] Notification skipped: user not found or not bound", userId);
    return { skipped: true, reason: "not_bound" };
  }

  const shareType = options.type;

  // 分享类型：构建分享卡片
  if (shareType === "share_scorecard" || shareType === "share_card") {
    const data = getUserData(String(userId));
    const records = data?.records || [];
    const custom = data?.custom || {};
    const exams = { ...getBuiltinExams(), ...custom };

    let card;
    if (shareType === "share_scorecard") {
      card = buildShareScorecardCard(records, exams);
    } else {
      // share_card: 取最新一条记录
      const latest = records[records.length - 1];
      if (!latest) {
        return { skipped: true, reason: "no_records" };
      }
      const examName = exams[latest.examType]?.name || latest.examType;
      card = buildShareCard(latest, examName, records, exams);
    }

    const result = await sendInteractiveCard(user.feishu_open_id, card);
    console.log("[Feishu] Share card sent to", user.feishu_open_id, "type:", shareType);
    return result;
  }

  // 默认：成绩通知卡片
  const data = getUserData(String(userId));
  const custom = data?.custom || {};
  const exams = { ...getBuiltinExams(), ...custom };
  const examName = exams[recordData.examType]?.name || recordData.examType;

  const card = buildScoreNotifyCard(recordData, examName);
  const result = await sendInteractiveCard(user.feishu_open_id, card);
  console.log("[Feishu] Notification sent to", user.feishu_open_id);
  return result;
}

// ==================== 分享卡片模板 ====================

function buildShareScorecardCard(records, exams) {
  if (!records || records.length === 0) {
    return {
      config: { wide_screen_mode: true },
      header: { title: { tag: "plain_text", content: "📄 成绩单分享" }, template: "blue" },
      elements: [{ tag: "markdown", content: "暂无成绩记录，快去 MyScore 录入吧！" }]
    };
  }

  const byType = {};
  for (const r of records) {
    if (!byType[r.examType]) byType[r.examType] = [];
    byType[r.examType].push(r);
  }

  const sections = [];
  for (const [type, recs] of Object.entries(byType)) {
    const examName = exams[type]?.name || type;
    const latest = recs[recs.length - 1];
    const total = latest.total ?? "-";
    const lines = recs.slice(-3).reverse().map(r => {
      const scoreLine = Object.entries(r.scores || {}).map(([k, v]) => {
        return getSubjectLabel(type, k) + " " + v;
      }).join(" | ");
      return "**" + r.date + "**　" + (r.total ?? "-") + (scoreLine ? "\n" + scoreLine : "");
    });

    sections.push("**" + examName + "**　共 " + recs.length + " 条　最新 **" + total + "**\n\n" + lines.join("\n\n"));
  }

  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: "plain_text", content: "📄 我的成绩单" }, template: "blue" },
    elements: [
      { tag: "markdown", content: "共录入 **" + records.length + "** 次成绩记录" },
      { tag: "hr" },
      { tag: "markdown", content: sections.join("\n\n---\n\n") },
      { tag: "hr" },
      { tag: "markdown", content: "*Generated by MyScore*" }
    ]
  };
}

function buildShareCard(record, examName, allRecords, exams) {
  const date = record.date || "未知日期";
  const total = record.total ?? "-";

  const scoreLines = Object.entries(record.scores || {}).map(([k, v]) => {
    const label = getSubjectLabel(record.examType, k);
    return label + "　**" + v + "**";
  }).join("\n");

  // 趋势信息
  let trendText = "";
  const typeRecords = allRecords.filter(r => r.examType === record.examType);
  if (typeRecords.length >= 2) {
    const idx = typeRecords.indexOf(record);
    if (idx > 0) {
      const prev = typeRecords[idx - 1];
      if (record.total !== null && prev.total !== null) {
        const diff = (record.total - prev.total).toFixed(1);
        const arrow = diff > 0 ? " ↑ +" + diff : diff < 0 ? " ↓ " + diff : " →";
        trendText = "较上一次" + arrow;
      }
    }
  }

  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: "plain_text", content: "🎴 成绩卡片" }, template: "purple" },
    elements: [
      { tag: "column_set", flex_mode: "none", columns: [
        { tag: "column", width: "weighted", weight: 2, elements: [
          { tag: "markdown", content: "**" + examName + "**\n" + date + (trendText ? "\n" + trendText : "") }
        ]},
        { tag: "column", width: "auto", elements: [
          { tag: "markdown", content: "**" + total + "**" }
        ]}
      ]},
      { tag: "hr" },
      { tag: "markdown", content: scoreLines || "暂无分项数据" },
      { tag: "hr" },
      { tag: "markdown", content: "*Generated by MyScore*" }
    ]
  };
}

// ==================== 内置考试定义（避免循环依赖） ====================

function getBuiltinExams() {
  return {
    ielts: { name: "IELTS 雅思" },
    cet4: { name: "CET-4 四级" },
    cet6: { name: "CET-6 六级" }
  };
}
