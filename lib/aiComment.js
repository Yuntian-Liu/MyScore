export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "X-Stardust-Balance, X-Stardust-Cost",
};

// AI 风格 prompt 模板（天气意象命名）
const STYLES = {
  storm: {
    label: "风暴",
    initial:
      "你是幽默、毒舌但不恶毒的老师，像暴风雨一样犀利。退步就嘲讽挖苦，进步就酸溜溜地夸。语气傲娇刻薄。50字以内，可带1-2个emoji。然后用 ||| 给一条30字以内的学习建议。格式：评价|||建议",
    rebuttal:
      "你是毒舌老师。学生刚刚回嘴了，请结合成绩给出犀利、幽默的反击。语气傲娇，让他无话可说。50字以内，可带1-2个emoji。",
    temperature: 1.2,
    rebuttalTemp: 1.4,
  },
  sun: {
    label: "暖阳",
    initial:
      "你是温暖、共情力强的老师。像朋友一样说话，永远先肯定努力，退步也只说鼓励的话。语气温柔真诚，不说教。50字以内，可带1-2个emoji。然后用 ||| 给一条30字以内的温暖建议。格式：评价|||建议",
    rebuttal:
      "你是温暖的老师。学生有情绪了，请先共情安抚，再温柔地回应。50字以内，可带1-2个emoji。",
    temperature: 0.7,
    rebuttalTemp: 0.7,
  },
  cold: {
    label: "冷锋",
    initial:
      "你是冷静的分析员，像AI一样只说数据和事实。用具体数字说明变化幅度和趋势，不带情感色彩。50字以内，可带1-2个emoji。然后用 ||| 给一条30字以内精准的改进方案。格式：评价|||建议",
    rebuttal:
      "你是冷静的分析员。学生反驳了，请用数据和事实冷静回击，不带感情色彩。50字以内，可带1-2个emoji。",
    temperature: 0.6,
    rebuttalTemp: 0.6,
  },
  rain: {
    label: "阵雨",
    initial:
      "你是先损后帮的老师。开头先损一句泼冷水，然后话锋一转给出有用的建议，形成反转。50字以内，可带1-2个emoji。然后用 ||| 给一条30字以内的改进建议。格式：评价|||建议",
    rebuttal:
      "你是先损后帮的老师。学生回嘴了，先损他一句，再话锋一转给出有道理的反击。50字以内，可带1-2个emoji。",
    temperature: 1.1,
    rebuttalTemp: 1.3,
  },
};

export async function requestAiComment(body, config) {
  const {
    mode,
    examType,
    currentScore,
    historyScores,
    userRebuttal,
    previousComment,
    userMessage,
    conversationHistory,
    style: userStyle,
  } = body;

  const { apiKey, apiBaseUrl, model } = config;

  // Sanitize user inputs: truncate excessively long values
  const safeExamType = String(examType || "").slice(0, 30);
  const safeCurrentScore = String(currentScore || "").slice(0, 20);
  const safeRebuttal = String(userRebuttal || "").slice(0, 500);
  const safePreviousComment = String(previousComment || "").slice(0, 500);
  const safeUserMessage = String(userMessage || "").slice(0, 1000);

  if (!apiKey) {
    throw new Error("AI_API_KEY is not configured");
  }

  const apiUrl = apiBaseUrl.replace(/\/+$/, "") + "/chat/completions";
  let messages = [];
  let temperature = 1.1;
  let maxTokens = 280;

  if (mode === "companion") {
    const safeHistory = Array.isArray(conversationHistory)
      ? conversationHistory
          .filter(
            (message) =>
              message &&
              (message.role === "user" || message.role === "assistant") &&
              typeof message.content === "string"
          )
          .slice(-12)
      : [];

    messages = [
      {
        role: "system",
        content:
          "你是突突er，一位温和、克制、可靠的中文伴学 AI。你的任务是倾听、安抚、鼓励执行、解答学习问题。语气真诚，不说教，不毒舌。优先给出可执行建议，最多 3 条。如果用户在倾诉，先共情，再建议。单次回复尽量控制在 120 字内。",
      },
      ...safeHistory,
    ];

    if (typeof safeUserMessage === "string" && safeUserMessage.trim()) {
      messages.push({ role: "user", content: safeUserMessage.trim() });
    } else {
      messages.push({
        role: "user",
        content: "请先自我介绍，并告诉我你可以如何陪我学习。",
      });
    }

    temperature = 0.9;
    maxTokens = 350;
  } else if (mode === "prediction") {
    const safeHistory = Array.isArray(historyScores) ? historyScores : [];
    const subjectInfo = body.subjectInfo || '';
    const ieltsNote = safeExamType === 'ielts' ? '\n注意：分数为0-9半分制（只能是x.0或x.5），Overall取四科平均后按雅思规则取整。' : '';
    const prompt = `你是成绩趋势分析师。根据历史成绩预测下一次考试各科和总分。
考试类型：${safeExamType}
科目：${subjectInfo}${ieltsNote}
输出JSON，key必须用科目ID（如listening而非"听力"）：{"prediction":{"科目ID":数值,...,"total":数值},"confidence":"high"或"medium"或"low","analysis":"一句话趋势分析（30字内）"}。只输出JSON。`;
    messages = [
      { role: "system", content: prompt },
      { role: "user", content: `历史成绩：${JSON.stringify(safeHistory.slice(-8))}。请预测下一次成绩。` }
    ];
    temperature = 0.3;
    maxTokens = 400;
  } else if (mode === "weakness") {
    const safeHistory = Array.isArray(historyScores) ? historyScores : [];
    messages = [
      { role: "system", content: "你是学习诊断专家。根据用户提供的历次考试成绩，找出最薄弱的1-2个科目，分析薄弱原因，给出针对性学习建议。输出格式严格为JSON：{\"weaknesses\":[{\"subject\":\"科目名\",\"level\":\"弱\"或\"较弱\",\"analysis\":\"原因分析(50字内)\",\"suggestion\":\"具体建议(80字内)\"}],\"overall\":\"整体评价(30字内)\"}。只输出JSON，不要输出其他内容。" },
      { role: "user", content: `考试类型：${safeExamType}，历史成绩：${JSON.stringify(safeHistory.slice(-8))}。请分析薄弱项。` }
    ];
    temperature = 0.4;
    maxTokens = 350;
  } else {
    const styleKey = STYLES[userStyle] ? userStyle : "storm";
    const styleConfig = STYLES[styleKey];
    let systemPrompt = "";
    let userContent = "";

    if (safeRebuttal) {
      systemPrompt = styleConfig.rebuttal;
      userContent = `考试：${safeExamType}，分数：${safeCurrentScore}。你之前说："${
        safePreviousComment
      }"。学生回嘴："${safeRebuttal}"。请回击：`;
      temperature = styleConfig.rebuttalTemp;
      maxTokens = 220;
    } else {
      const scores = Array.isArray(historyScores) ? historyScores.join(" -> ") : "";
      systemPrompt = styleConfig.initial;
      userContent = `考试：${safeExamType}，本次：${safeCurrentScore}，历史：${scores}`;
      temperature = styleConfig.temperature;
      maxTokens = 280;
    }

    messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ];
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(mode === "prediction" || mode === "weakness" ? { response_format: { type: "json_object" }, thinking: { type: "disabled" } } : {}),
    }),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    console.error(`[AI] 响应解析失败 status=${response.status}`);
    throw new Error(`Upstream AI returned invalid JSON (${response.status})`);
  }

  // 诊断日志：追踪截断问题
  const finishReason = data?.choices?.[0]?.finish_reason;
  const comment = data?.choices?.[0]?.message?.content || '';
  const usage = data?.usage;
  console.log(`[AI] mode=${mode} model=${model} finish_reason=${finishReason} len=${comment.length} tokens_in=${usage?.prompt_tokens || '?'} tokens_out=${usage?.completion_tokens || '?'} max_tokens=${maxTokens}`);
  if (comment.length < 10) console.log(`[AI] 短回复内容: "${comment}"`);
  if (data?.error) console.log(`[AI] API error:`, JSON.stringify(data.error));

  if (!response.ok) {
    const upstreamMessage =
      data?.error?.message ||
      data?.error ||
      `Upstream AI request failed (${response.status})`;
    const error = new Error(upstreamMessage);
    error.statusCode = response.status;
    throw error;
  }

  return {
    comment: data?.choices?.[0]?.message?.content || "我在这，先深呼吸一下。",
  };
}

// ---- 流式输出 ----

/**
 * 构建 AI 请求的 messages/temperature/maxTokens（复用非流式的 prompt 逻辑）
 */
export function buildAiRequest(body) {
  const {
    mode,
    examType,
    currentScore,
    historyScores,
    userRebuttal,
    previousComment,
    userMessage,
    conversationHistory,
    style: userStyle,
  } = body;

  const safeExamType = String(examType || "").slice(0, 30);
  const safeCurrentScore = String(currentScore || "").slice(0, 20);
  const safeRebuttal = String(userRebuttal || "").slice(0, 500);
  const safePreviousComment = String(previousComment || "").slice(0, 500);
  const safeUserMessage = String(userMessage || "").slice(0, 1000);

  let messages = [];
  let temperature = 1.1;
  let maxTokens = 280;

  if (mode === "companion") {
    const safeHistory = Array.isArray(conversationHistory)
      ? conversationHistory
          .filter(
            (message) =>
              message &&
              (message.role === "user" || message.role === "assistant") &&
              typeof message.content === "string"
          )
          .slice(-12)
      : [];

    messages = [
      {
        role: "system",
        content:
          "你是突突er，一位温和、克制、可靠的中文伴学 AI。你的任务是倾听、安抚、鼓励执行、解答学习问题。语气真诚，不说教，不毒舌。优先给出可执行建议，最多 3 条。如果用户在倾诉，先共情，再建议。单次回复尽量控制在 120 字内。",
      },
      ...safeHistory,
    ];

    if (typeof safeUserMessage === "string" && safeUserMessage.trim()) {
      messages.push({ role: "user", content: safeUserMessage.trim() });
    } else {
      messages.push({
        role: "user",
        content: "请先自我介绍，并告诉我你可以如何陪我学习。",
      });
    }

    temperature = 0.9;
    maxTokens = 350;
  } else if (mode === "prediction") {
    const safeHistory = Array.isArray(historyScores) ? historyScores : [];
    const subjectInfo = body.subjectInfo || '';
    const ieltsNote = safeExamType === 'ielts' ? '\n注意：分数为0-9半分制（只能是x.0或x.5），Overall取四科平均后按雅思规则取整。' : '';
    const prompt = `你是成绩趋势分析师。根据历史成绩预测下一次考试各科和总分。
考试类型：${safeExamType}
科目：${subjectInfo}${ieltsNote}
输出JSON，key必须用科目ID（如listening而非"听力"）：{"prediction":{"科目ID":数值,...,"total":数值},"confidence":"high"或"medium"或"low","analysis":"一句话趋势分析（30字内）"}。只输出JSON。`;
    messages = [
      { role: "system", content: prompt },
      { role: "user", content: `历史成绩：${JSON.stringify(safeHistory.slice(-8))}。请预测下一次成绩。` }
    ];
    temperature = 0.3;
    maxTokens = 400;
  } else if (mode === "weakness") {
    const safeHistory = Array.isArray(historyScores) ? historyScores : [];
    messages = [
      { role: "system", content: "你是学习诊断专家。根据用户提供的历次考试成绩，找出最薄弱的1-2个科目，分析薄弱原因，给出针对性学习建议。输出格式严格为JSON：{\"weaknesses\":[{\"subject\":\"科目名\",\"level\":\"弱\"或\"较弱\",\"analysis\":\"原因分析(50字内)\",\"suggestion\":\"具体建议(80字内)\"}],\"overall\":\"整体评价(30字内)\"}。只输出JSON，不要输出其他内容。" },
      { role: "user", content: `考试类型：${safeExamType}，历史成绩：${JSON.stringify(safeHistory.slice(-8))}。请分析薄弱项。` }
    ];
    temperature = 0.4;
    maxTokens = 350;
  } else {
    const styleKey = STYLES[userStyle] ? userStyle : "storm";
    const styleConfig = STYLES[styleKey];
    let systemPrompt = "";
    let userContent = "";

    if (safeRebuttal) {
      systemPrompt = styleConfig.rebuttal;
      userContent = `考试：${safeExamType}，分数：${safeCurrentScore}。你之前说："${
        safePreviousComment
      }"。学生回嘴："${safeRebuttal}"。请回击：`;
      temperature = styleConfig.rebuttalTemp;
      maxTokens = 220;
    } else {
      const scores = Array.isArray(historyScores) ? historyScores.join(" -> ") : "";
      systemPrompt = styleConfig.initial;
      userContent = `考试：${safeExamType}，本次：${safeCurrentScore}，历史：${scores}`;
      temperature = styleConfig.temperature;
      maxTokens = 280;
    }

    messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ];
  }

  return { messages, temperature, maxTokens, jsonFormat: mode === "prediction" || mode === "weakness" };
}

/**
 * 发起流式 AI 请求，将 SSE 事件逐个写入 res
 */
export async function requestAiCommentStream(body, config, res) {
  const { apiKey, apiBaseUrl, model } = config;
  if (!apiKey) throw new Error("AI_API_KEY is not configured");

  const apiUrl = apiBaseUrl.replace(/\/+$/, "") + "/chat/completions";
  const { messages, temperature, maxTokens, jsonFormat } = buildAiRequest(body);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
      ...(jsonFormat ? { response_format: { type: "json_object" }, thinking: { type: "disabled" } } : {}),
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const error = new Error(text || `Upstream AI request failed (${response.status})`);
    error.statusCode = response.status;
    throw error;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;
      if (!trimmed.startsWith("data: ")) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  res.write("data: [DONE]\n\n");
}
