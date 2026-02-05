// 文件路径: netlify/functions/comment.js

export default async (req, context) => {
  // 1. 解决跨域问题 (让前端能访问)
  if (req.method === "OPTIONS") {
    return new Response("OK", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  // 只允许 POST 请求
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    const { examType, currentScore, historyScores } = body;

    // 从 Netlify 环境变量拿 Key
    const apiKey = Netlify.env.get("AI_API_KEY");
    if (!apiKey) throw new Error("API Key 未配置");

    // DeepSeek 官方接口地址
    const apiUrl = "https://api.deepseek.com/chat/completions";

    // 毒舌老师的人设 Prompt
    const systemPrompt = `你是一个说话幽默、带点"毒舌"属性的严厉老师。
    请根据学生的成绩给出一句简短的评价（50字以内）。
    - 进步了：用略带惊讶但傲娇的语气夸奖 (例如: "哟，这次居然没考砸？")。
    - 退步了：用幽默的比喻损一下，并给出复习建议。
    - 必须包含1-2个emoji。`;

    const userContent = `考试：${examType}，本次：${currentScore}，历史：${historyScores.join(" -> ")}`;

    // 调用 DeepSeek
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat", 
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        temperature: 1.3, // 稍微调高一点，让他更"疯"一点
        max_tokens: 100
      })
    });

    const data = await response.json();
    const aiComment = data.choices?.[0]?.message?.content || "老师正在喝茶，没空理你...";

    return new Response(JSON.stringify({ comment: aiComment }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }
};