// ==================== 飞书机器人集成（存根） ====================
// 待飞书自建应用创建完成后接入
// 需要环境变量：FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_VERIFICATION_TOKEN

const FEISHU_API_BASE = "https://open.feishu.cn/open-apis";

let tenantToken = null;
let tokenExpires = 0;

/**
 * 获取 tenant_access_token（带缓存）
 */
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

/**
 * 发送消息到飞书用户
 */
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

/**
 * 发送交互式卡片
 */
export async function sendInteractiveCard(openId, cardContent) {
  return sendFeishuMessage(openId, "interactive", cardContent);
}

/**
 * 处理飞书事件回调
 */
export async function handleFeishuEvent(body) {
  // URL 验证
  if (body.challenge) {
    return { challenge: body.challenge };
  }

  const event = body.event;
  if (!event) return { ok: true };

  // 消息事件：处理绑定或命令
  if (event.message) {
    const msg = event.message;
    const content = JSON.parse(msg.content || '{}');
    const text = (content.text || '').trim();

    console.log("[Feishu] Received message:", text, "from", event.sender?.sender_id?.open_id);

    // TODO: 根据 text 内容路由到不同命令处理
    // "绑定 XXXXXX" → 匹配绑定码
    // "查询" → 返回最新成绩
    // "趋势" → 返回成绩趋势
    // "目标" → 返回目标进度
    // "成就" → 返回已解锁成就
  }

  return { ok: true };
}
