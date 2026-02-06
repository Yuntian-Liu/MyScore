export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = await req.json();
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

    const apiKey = Netlify.env.get("AI_API_KEY");
    if (!apiKey) {
      throw new Error("AI_API_KEY is not configured");
    }

    const apiUrl = "https://api.deepseek.com/chat/completions";
    let messages = [];
    let temperature = 1.1;
    let maxTokens = 180;

    if (mode === "companion") {
      const safeHistory = Array.isArray(conversationHistory)
        ? conversationHistory
            .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
            .slice(-12)
        : [];

      messages = [
        {
          role: "system",
          content:
            "你是突突er，一位温暖、克制、可靠的中文伴学AI。你的任务是倾听、安慰、鼓励执行、解答学习问题。语气真诚，不说教，不毒舌。优先给出可执行建议（最多3条）。如用户在倾诉，先共情再建议。单次回复尽量控制在120字内。",
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
          "你是毒舌老师。学生刚刚回嘴了，请结合成绩给出犀利、幽默、短句式反击。保持逻辑清晰，语气傲娇。50字以内，带1-2个emoji。";
        userContent = `考试：${examType}，分数：${currentScore}。你之前说：“${previousComment || ""}”。学生回嘴：“${userRebuttal}”。请回击：`;
        temperature = 1.3;
        maxTokens = 150;
      } else {
        const scores = Array.isArray(historyScores) ? historyScores.join(" -> ") : "";
        systemPrompt =
          "你是幽默、毒舌但不恶毒的老师。根据成绩给一句简短评价。进步就傲娇夸，退步就幽默提醒并给复习建议。50字以内，带1-2个emoji。";
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
        model: "deepseek-chat",
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    const data = await response.json();
    const aiComment = data?.choices?.[0]?.message?.content || "我在这，先深呼吸一下。";

    return new Response(JSON.stringify({ comment: aiComment }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
};
