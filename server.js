import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT_DIR = process.cwd();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function sendJson(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    ...extraHeaders,
  });
  res.end(text);
}

async function readJsonBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1024 * 1024) {
      throw new Error("Request body too large");
    }
  }
  return body ? JSON.parse(body) : {};
}

async function requestAiComment(body) {
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

  const apiKey = process.env.AI_API_KEY;
  const apiBaseUrl = process.env.AI_BASE_URL || "https://api.deepseek.com";
  const model = process.env.AI_MODEL || "deepseek-chat";

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
      userContent = `考试：${examType}，分数：${currentScore}。你之前说：“${
        previousComment || ""
      }”。学生回嘴：“${userRebuttal}”。请回击：`;
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

async function handleCommentApi(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(200, CORS_HEADERS);
    res.end("OK");
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method Not Allowed" }, CORS_HEADERS);
    return;
  }

  try {
    const body = await readJsonBody(req);
    const payload = await requestAiComment(body);
    sendJson(res, 200, payload, CORS_HEADERS);
  } catch (error) {
    sendJson(
      res,
      error.statusCode || 500,
      { error: error.message || "Internal Server Error" },
      CORS_HEADERS
    );
  }
}

function resolveRequestPath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  if (cleanPath === "/") {
    return join(ROOT_DIR, "index.html");
  }

  const relativePath = cleanPath.replace(/^\/+/, "");
  const normalizedPath = normalize(relativePath);
  const absolutePath = resolve(ROOT_DIR, normalizedPath);

  if (!absolutePath.startsWith(resolve(ROOT_DIR))) {
    return null;
  }

  return absolutePath;
}

async function serveStatic(req, res) {
  const requestedPath = resolveRequestPath(req.url || "/");
  if (!requestedPath) {
    sendText(res, 403, "Forbidden");
    return;
  }

  let filePath = requestedPath;
  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      filePath = join(filePath, "index.html");
    }
  } catch {
    if (!extname(filePath)) {
      filePath = join(ROOT_DIR, "index.html");
    }
  }

  if (!existsSync(filePath)) {
    sendText(res, 404, "Not Found");
    return;
  }

  const ext = extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": contentType });

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  createReadStream(filePath).pipe(res);
}

const server = createServer(async (req, res) => {
  const url = req.url || "/";

  if (url.startsWith("/api/comment")) {
    await handleCommentApi(req, res);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendText(res, 405, "Method Not Allowed");
    return;
  }

  await serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`MyScore server listening on http://${HOST}:${PORT}`);
});
