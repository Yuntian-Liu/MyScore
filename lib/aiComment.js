export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

  if (!apiKey) {
    throw new Error("AI_API_KEY is not configured");
  }

  const apiUrl = apiBaseUrl.replace(/\/+$/, "") + "/chat/completions";
  let messages = [];
  let temperature = 1.1;
  let maxTokens = 180;

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

    if (typeof userMessage === "string" && userMessage.trim()) {
      messages.push({ role: "user", content: userMessage.trim() });
    } else {
      messages.push({
        role: "user",
        content: "请先自我介绍，并告诉我你可以如何陪我学习。",
      });
    }

    temperature = 0.9;
    maxTokens = 220;
  } else {
    const styleKey = STYLES[userStyle] ? userStyle : "storm";
    const styleConfig = STYLES[styleKey];
    let systemPrompt = "";
    let userContent = "";

    if (userRebuttal) {
      systemPrompt = styleConfig.rebuttal;
      userContent = `考试：${examType}，分数：${currentScore}。你之前说："${
        previousComment || ""
      }"。学生回嘴："${userRebuttal}"。请回击：`;
      temperature = styleConfig.rebuttalTemp;
      maxTokens = 150;
    } else {
      const scores = Array.isArray(historyScores) ? historyScores.join(" -> ") : "";
      systemPrompt = styleConfig.initial;
      userContent = `考试：${examType}，本次：${currentScore}，历史：${scores}`;
      temperature = styleConfig.temperature;
      maxTokens = 180;
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
    }),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Upstream AI returned invalid JSON (${response.status})`);
  }

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
