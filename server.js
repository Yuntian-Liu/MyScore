import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { CORS_HEADERS, requestAiComment } from "./lib/aiComment.js";
import { initDb, saveUserData, getUserData, findUser, updateUserProfile } from "./lib/db.js";
import { sendVerificationCode, registerWithEmail, loginWithPassword, loginWithCode, verifyToken } from "./lib/auth.js";

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT_DIR = process.cwd();

initDb();

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
    const config = {
      apiKey: process.env.AI_API_KEY,
      apiBaseUrl: process.env.AI_BASE_URL || "https://api.deepseek.com",
      model: process.env.AI_MODEL || "deepseek-chat",
    };
    const payload = await requestAiComment(body, config);
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

async function handleAuthRequest(req, res, path) {
  if (req.method === "OPTIONS") {
    res.writeHead(200, CORS_HEADERS);
    res.end("OK");
    return;
  }

  try {
    if (path === "/api/auth/send-code" && req.method === "POST") {
      const { email } = await readJsonBody(req);
      if (!email || !email.includes("@")) {
        sendJson(res, 400, { error: "请输入有效的邮箱地址" }, CORS_HEADERS);
        return;
      }
      await sendVerificationCode(email);
      sendJson(res, 200, { ok: true }, CORS_HEADERS);
      return;
    }

    if (path === "/api/auth/login-code" && req.method === "POST") {
      const { email, code } = await readJsonBody(req);
      if (!email || !code) {
        sendJson(res, 400, { error: "请输入邮箱和验证码" }, CORS_HEADERS);
        return;
      }
      const result = loginWithCode(email, code);
      if (result.error) {
        sendJson(res, 401, { error: result.error }, CORS_HEADERS);
        return;
      }
      if (result.isNewUser) {
        sendJson(res, 200, { ok: true, isNewUser: true }, CORS_HEADERS);
        return;
      }
      sendJson(res, 200, { ok: true, token: result.token, user: result.user }, CORS_HEADERS);
      return;
    }

    if (path === "/api/auth/register" && req.method === "POST") {
      const body = await readJsonBody(req);
      const { email, code, nickname, avatarSeed, bio, password } = body;
      if (!email || !code || !nickname || !password) {
        sendJson(res, 400, { error: "缺少必填字段" }, CORS_HEADERS);
        return;
      }
      const result = registerWithEmail(email, code, nickname, avatarSeed || 'default', bio || '', password);
      if (result.error) {
        sendJson(res, 400, { error: result.error }, CORS_HEADERS);
        return;
      }
      sendJson(res, 200, { ok: true, token: result.token, user: result.user }, CORS_HEADERS);
      return;
    }

    if (path === "/api/auth/login-password" && req.method === "POST") {
      const { email, password } = await readJsonBody(req);
      if (!email || !password) {
        sendJson(res, 400, { error: "请输入邮箱和密码" }, CORS_HEADERS);
        return;
      }
      const result = loginWithPassword(email, password);
      if (result.error) {
        sendJson(res, 401, { error: result.error }, CORS_HEADERS);
        return;
      }
      sendJson(res, 200, { ok: true, token: result.token, user: result.user }, CORS_HEADERS);
      return;
    }

    if (path === "/api/auth/profile" && req.method === "GET") {
      const token = extractBearerToken(req);
      const payload = verifyToken(token);
      if (!payload) {
        sendJson(res, 401, { error: "未登录或登录已过期" }, CORS_HEADERS);
        return;
      }
      const user = findUser(payload.email);
      if (!user) {
        sendJson(res, 404, { error: "用户不存在" }, CORS_HEADERS);
        return;
      }
      const { password_hash, salt, ...profile } = user;
      sendJson(res, 200, { ok: true, profile }, CORS_HEADERS);
      return;
    }

    if (path === "/api/auth/profile" && req.method === "PUT") {
      const token = extractBearerToken(req);
      const payload = verifyToken(token);
      if (!payload) {
        sendJson(res, 401, { error: "未登录或登录已过期" }, CORS_HEADERS);
        return;
      }
      const body = await readJsonBody(req);
      // Validate inputs
      const updates = {};
      if (body.nickname !== undefined) {
        if (typeof body.nickname !== 'string' || body.nickname.trim().length < 1 || body.nickname.trim().length > 20) {
          sendJson(res, 400, { error: "昵称需1-20个字符" }, CORS_HEADERS);
          return;
        }
        updates.nickname = body.nickname.trim();
      }
      if (body.avatar_seed !== undefined) {
        const validSeeds = ['adventurer', 'lorelei', 'notionists', 'bottts', 'fun-emoji', 'avataaars', 'pixel-art', 'thumbs'];
        if (!validSeeds.includes(body.avatar_seed)) {
          sendJson(res, 400, { error: "无效的头像选择" }, CORS_HEADERS);
          return;
        }
        updates.avatar_seed = body.avatar_seed;
      }
      if (body.bio !== undefined) {
        if (typeof body.bio !== 'string' || body.bio.length > 60) {
          sendJson(res, 400, { error: "个性签名最多60个字符" }, CORS_HEADERS);
          return;
        }
        updates.bio = body.bio;
      }
      const user = updateUserProfile(payload.email, updates);
      if (!user) {
        sendJson(res, 404, { error: "用户不存在" }, CORS_HEADERS);
        return;
      }
      const { password_hash, salt, ...profile } = user;
      sendJson(res, 200, { ok: true, profile }, CORS_HEADERS);
      return;
    }

    sendJson(res, 404, { error: "Not Found" }, CORS_HEADERS);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Internal Server Error" }, CORS_HEADERS);
  }
}

function extractBearerToken(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

async function handleSyncRequest(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(200, CORS_HEADERS);
    res.end("OK");
    return;
  }

  const token = extractBearerToken(req);
  const payload = verifyToken(token);
  if (!payload) {
    sendJson(res, 401, { error: "未登录或登录已过期" }, CORS_HEADERS);
    return;
  }

  try {
    if (req.method === "GET") {
      const data = getUserData(payload.userId);
      sendJson(res, 200, { ok: true, data }, CORS_HEADERS);
      return;
    }

    if (req.method === "PUT") {
      const body = await readJsonBody(req);
      saveUserData(payload.userId, body);
      sendJson(res, 200, { ok: true }, CORS_HEADERS);
      return;
    }

    sendJson(res, 405, { error: "Method Not Allowed" }, CORS_HEADERS);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Internal Server Error" }, CORS_HEADERS);
  }
}

const server = createServer(async (req, res) => {
  const url = req.url || "/";
  const path = url.split("?")[0];

  if (path.startsWith("/api/comment")) {
    await handleCommentApi(req, res);
    return;
  }

  if (path.startsWith("/api/auth/")) {
    await handleAuthRequest(req, res, path);
    return;
  }

  if (path === "/api/sync") {
    await handleSyncRequest(req, res);
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
