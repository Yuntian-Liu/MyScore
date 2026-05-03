// ==================== 飞书机器人集成 ====================
// 环境变量：FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_ENCRYPT_KEY, FEISHU_VERIFICATION_TOKEN

const FEISHU_API_BASE = "https://open.feishu.cn/open-apis";
const ENCRYPT_KEY = process.env.FEISHU_ENCRYPT_KEY || "";
const VERIFICATION_TOKEN = process.env.FEISHU_VERIFICATION_TOKEN || "";

let tenantToken = null;
let tokenExpires = 0;

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
          { tag: "markdown", content: "**查询** — 查看最新成绩\n**趋势** — 查看成绩趋势\n**目标** — 目标完成进度" }
        ]},
        { tag: "column", width: "weighted", weight: 1, elements: [
          { tag: "markdown", content: "**成就** — 已解锁成就\n**帮助** — 使用说明\n录入成绩后会自动推送通知" }
        ]}
      ]}
    ]
  };
}

export function buildScoreNotifyCard(record, examName, aiSummary) {
  const date = record.date || "未知日期";
  const total = record.total ?? "-";
  const scoreLines = Object.entries(record.scores || {}).map(([k, v]) => `**${k}**: ${v}`).join("\n");

  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: "成绩通知" },
      template: "blue"
    },
    elements: [
      { tag: "column_set", flex_mode: "none", columns: [
        { tag: "column", width: "weighted", weight: 2, elements: [
          { tag: "markdown", content: `**${examName}**\n${date}` }
        ]},
        { tag: "column", width: "auto", elements: [
          { tag: "markdown", content: `## ${total}\n总分` }
        ]}
      ]},
      { tag: "hr" },
      { tag: "markdown", content: scoreLines || "暂无分项数据" },
      ...(aiSummary ? [{ tag: "hr" }, { tag: "markdown", content: `*${aiSummary}*` }] : [])
    ]
  };
}

export function buildQueryCard(records, exams) {
  if (!records || records.length === 0) {
    return {
      header: { title: { tag: "plain_text", content: "查询结果" }, template: "orange" },
      elements: [{ tag: "markdown", content: "暂无成绩记录，快去 MyScore 录入吧！" }]
    };
  }

  const latest = records[records.length - 1];
  const examName = exams[latest.examType]?.name || latest.examType;
  const date = latest.date || "未知";
  const total = latest.total ?? "-";
  const scoreLines = Object.entries(latest.scores || {}).map(([k, v]) => `${k}: ${v}`).join(" | ");

  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: "plain_text", content: "最新成绩" }, template: "blue" },
    elements: [
      { tag: "column_set", flex_mode: "none", columns: [
        { tag: "column", width: "weighted", weight: 2, elements: [
          { tag: "markdown", content: `**${examName}**\n${date}\n共 ${records.length} 条记录` }
        ]},
        { tag: "column", width: "auto", elements: [
          { tag: "markdown", content: `## ${total}` }
        ]}
      ]},
      { tag: "hr" },
      { tag: "markdown", content: scoreLines || "-" }
    ]
  };
}

export function buildTrendText(records, exams) {
  if (!records || records.length < 2) {
    return "成绩记录不足2条，暂时无法分析趋势哦。继续努力录入吧！";
  }

  const recent = records.slice(-5);
  const lines = [];
  for (const rec of recent) {
    const examName = exams[rec.examType]?.name || rec.examType;
    const total = rec.total ?? "-";
    const arrow = recent.indexOf(rec) > 0 && rec.total !== null && recent[recent.indexOf(rec) - 1].total !== null
      ? (rec.total > recent[recent.indexOf(rec) - 1].total ? " ↑" : rec.total < recent[recent.indexOf(rec) - 1].total ? " ↓" : " →")
      : "";
    lines.push(`${examName} ${rec.date}: ${total}${arrow}`);
  }
  return lines.join("\n");
}

export function buildGoalText(goals, records, exams) {
  if (!goals || Object.keys(goals).length === 0) {
    return "还没有设置目标分数哦，去 MyScore 设置一个吧！";
  }

  const lines = [];
  for (const [examType, target] of Object.entries(goals)) {
    const examName = exams[examType]?.name || examType;
    const typeRecords = records.filter(r => r.examType === examType);
    if (typeRecords.length === 0) {
      lines.push(`**${examName}**: 目标 ${target}（尚无记录）`);
      continue;
    }
    const latest = typeRecords[typeRecords.length - 1].total;
    if (latest === null || latest === undefined) {
      lines.push(`**${examName}**: 目标 ${target}`);
      continue;
    }
    const pct = Math.min(100, Math.round((latest / target) * 100));
    const bar = "█".repeat(Math.floor(pct / 5)) + "░".repeat(20 - Math.floor(pct / 5));
    lines.push(`**${examName}**: ${latest} / ${target} (${pct}%)\n${bar}`);
  }
  return lines.join("\n");
}

export function buildAchievementCard(unlockedIds, allAchievements) {
  const unlocked = unlockedIds || [];
  if (unlocked.length === 0) {
    return {
      header: { title: { tag: "plain_text", content: "成就墙" }, template: "purple" },
      elements: [{ tag: "markdown", content: "还没有解锁成就哦，继续使用 MyScore 吧！" }]
    };
  }

  const items = unlocked.map(id => {
    const ach = allAchievements?.find(a => a.id === id);
    return ach ? `${ach.icon} **${ach.name}** — ${ach.desc}` : id;
  });

  return {
    header: { title: { tag: "plain_text", content: `已解锁成就 (${unlocked.length})` }, template: "purple" },
    elements: [
      { tag: "markdown", content: items.join("\n\n") }
    ]
  };
}

export function buildHelpCard() {
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: "MyScore 机器人帮助" },
      template: "indigo"
    },
    elements: [
      { tag: "markdown", content: "**直接发送以下关键词即可：**" },
      { tag: "column_set", flex_mode: "none", background_style: "grey", columns: [
        { tag: "column", width: "weighted", weight: 1, elements: [
          { tag: "markdown", content: "`查询` — 最新成绩\n`趋势` — 成绩变化趋势\n`目标` — 目标完成进度" }
        ]},
        { tag: "column", width: "weighted", weight: 1, elements: [
          { tag: "markdown", content: "`成就` — 已解锁成就\n`绑定 XXXXXX` — 绑定账号\n`帮助` — 本帮助信息" }
        ]}
      ]},
      { tag: "hr" },
      { tag: "markdown", content: "*MyScore AI 智能成绩管理系统*" }
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
  // URL 验证
  if (body.challenge) {
    return { challenge: body.challenge };
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
      case "help":
        await sendInteractiveCard(openId, buildHelpCard());
        break;
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

  const data = getUserData(String(user.uid));
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

  const data = getUserData(String(user.uid));
  const records = data?.records || [];
  const custom = data?.custom || {};
  const exams = { ...getBuiltinExams(), ...custom };

  const trendText = buildTrendText(records, exams);
  await sendText(openId, trendText);
}

async function handleGoalCommand(openId) {
  const { findUserByFeishuOpenId, getUserData } = await import("./db.js");
  const user = findUserByFeishuOpenId(openId);
  if (!user) {
    await sendText(openId, "尚未绑定 MyScore 账号，请先在网站设置页进行绑定。");
    return;
  }

  const data = getUserData(String(user.uid));
  const goals = data?.goals || {};
  const records = data?.records || [];
  const custom = data?.custom || {};
  const exams = { ...getBuiltinExams(), ...custom };

  const goalText = buildGoalText(goals, records, exams);
  await sendText(openId, goalText);
}

async function handleAchievementCommand(openId) {
  const { findUserByFeishuOpenId, getUserData } = await import("./db.js");
  const user = findUserByFeishuOpenId(openId);
  if (!user) {
    await sendText(openId, "尚未绑定 MyScore 账号，请先在网站设置页进行绑定。");
    return;
  }

  const data = getUserData(String(user.uid));
  const achievements = data?.achievements || [];

  const { ACHIEVEMENTS } = await import("../js/config.js");
  const card = buildAchievementCard(achievements, ACHIEVEMENTS);
  await sendInteractiveCard(openId, card);
}

// ==================== 成绩通知 ====================

export async function sendFeishuNotification(userId, recordData) {
  const { findUserByUid, getUserData } = await import("./db.js");
  const user = findUserByUid(String(userId));
  if (!user || !user.feishu_open_id) {
    console.log("[Feishu] Notification skipped: user not found or not bound", userId);
    return { skipped: true, reason: "not_bound" };
  }

  const data = getUserData(String(userId));
  const custom = data?.custom || {};
  const exams = { ...getBuiltinExams(), ...custom };
  const examName = exams[recordData.examType]?.name || recordData.examType;

  const card = buildScoreNotifyCard(recordData, examName);
  const result = await sendInteractiveCard(user.feishu_open_id, card);
  console.log("[Feishu] Notification sent to", user.feishu_open_id);
  return result;
}

// ==================== 内置考试定义（避免循环依赖） ====================

function getBuiltinExams() {
  return {
    ielts: { name: "IELTS 雅思" },
    cet4: { name: "CET-4 四级" },
    cet6: { name: "CET-6 六级" }
  };
}
