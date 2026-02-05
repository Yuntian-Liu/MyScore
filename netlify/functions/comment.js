// 文件路径: netlify/functions/comment.js

export default async (req, context) => {
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
    // 这里多接收了两个参数：userRebuttal (你的回嘴), previousComment (AI上一句说的话)
    const { examType, currentScore, historyScores, userRebuttal, previousComment } = body;

    const apiKey = Netlify.env.get("AI_API_KEY");
    if (!apiKey) throw new Error("API Key 未配置");

    const apiUrl = "https://api.deepseek.com/chat/completions";

    // === 核心逻辑分流 ===
    let systemPrompt = "";
    let userContent = "";

    if (userRebuttal) {
      // 模式二：吵架模式
      systemPrompt = `你是一个毒舌老师。刚才学生对你的评价表示不服，正在回嘴。
      请根据学生的反驳，结合他的成绩，狠狠地、幽默地怼回去。
      - 逻辑要自洽，不要被学生带偏。
      - 语气要傲娇、犀利。
      - 字数 50 字以内，带 emoji。`;
      
      userContent = `考试：${examType}，分数：${currentScore}。
      你之前说："${previousComment}"
      学生回嘴说："${userRebuttal}"
      请反击：`;
    } else {
      // 模式一：正常评价模式 (保持不变)
      systemPrompt = `你是一个说话幽默、带点"毒舌"属性的严厉老师。
      请根据学生的成绩给出一句简短的评价（50字以内）。
      - 进步了：用略带惊讶但傲娇的语气夸奖。
      - 退步了：用幽默的比喻损一下，并给出复习建议。
      - 必须包含1-2个emoji。`;
      
      userContent = `考试：${examType}，本次：${currentScore}，历史：${historyScores.join(" -> ")}`;
    }

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
        temperature: 1.4, // 吵架的时候可以让它更疯一点
        max_tokens: 150
      })
    });

    const data = await response.json();
    const aiComment = data.choices?.[0]?.message?.content || "老师被气晕了...";

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