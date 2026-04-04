export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    let systemPrompt = "";
    let userContent = "";

    if (userRebuttal) {
      systemPrompt =
        "你是毒舌老师。学生刚刚回嘴了，请结合成绩给出犀利、幽默、短句式反击。保持逻辑清晰，语气傲娇。50 字以内，可带 1-2 个 emoji。";
      userContent = `考试：${examType}，分数：${currentScore}。你之前说："${
        previousComment || ""
      }"。学生回嘴："${userRebuttal}"。请回击：`;
      temperature = 1.3;
      maxTokens = 150;
    } else {
      const scores = Array.isArray(historyScores) ? historyScores.join(" -> ") : "";
      systemPrompt =
        "你是幽默、毒舌但不恶毒的老师。请根据成绩给一句简短评价。进步就傲娇夸，退步就幽默提醒并给复习建议。50 字以内，可带 1-2 个 emoji。";
      userContent = `考试：${examType}，本次：${currentScore}，历史：${scores}`;
      temperature = 1.1;
      maxTokens = 150;
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
