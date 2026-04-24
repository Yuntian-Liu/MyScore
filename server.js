import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createGzip } from "node:zlib";
import { extname, join, normalize, resolve, sep } from "node:path";
import { CORS_HEADERS, requestAiComment } from "./lib/aiComment.js";
import { initDb, saveUserData, getUserData, findUser, findUserByUid, updateUserProfile, maskEmail } from "./lib/db.js";
import { sendVerificationCode, registerWithEmail, loginWithPassword, loginWithCode, verifyToken } from "./lib/auth.js";

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT_DIR = process.cwd();

initDb();

// ==================== Rate Limiter ====================

const RATE_LIMITS = {
  "/api/auth/send-code": { max: 3, windowMs: 60_000 },
  "/api/auth/login-password": { max: 10, windowMs: 60_000 },
  "/api/auth/login-code": { max: 10, windowMs: 60_000 },
  "/api/comment": { max: 20, windowMs: 60_000 },
};

const rateStore = new Map();

function checkRateLimit(path, ip) {
  const limit = RATE_LIMITS[path];
  if (!limit) return true;
  const key = `${ip}:${path}`;
  const now = Date.now();
  const entry = rateStore.get(key);
  if (!entry || now - entry.start > limit.windowMs) {
    rateStore.set(key, { start: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= limit.max;
}

// Cleanup expired entries every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateStore) {
    const limit = RATE_LIMITS[key.split(":").slice(1).join(":")];
    if (limit && now - entry.start > limit.windowMs) rateStore.delete(key);
  }
}, 120_000);

// ==================== Turnstile Verification ====================

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;

async function verifyTurnstile(token) {
  if (!TURNSTILE_SECRET || !token) return !TURNSTILE_SECRET; // Skip if not configured
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: TURNSTILE_SECRET, response: token }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

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
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
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

// 匿名用户每日 AI 评论限额（按 IP）
const ANONYMOUS_DAILY_LIMIT = 5;
const dailyCommentStore = new Map(); // key: "ip:date", value: count

function checkAnonymousDailyLimit(ip) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${ip}:${today}`;
  const count = dailyCommentStore.get(key) || 0;
  if (count >= ANONYMOUS_DAILY_LIMIT) return false;
  dailyCommentStore.set(key, count + 1);
  return true;
}

// 清理过期的每日计数器（每小时执行一次）
setInterval(() => {
  const today = new Date().toISOString().slice(0, 10);
  for (const [key] of dailyCommentStore) {
    if (!key.endsWith(today)) dailyCommentStore.delete(key);
  }
}, 3_600_000);

async function handleCommentApi(req, res, ip) {
  if (req.method === "OPTIONS") {
    res.writeHead(200, CORS_HEADERS);
    res.end("OK");
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method Not Allowed" }, CORS_HEADERS);
    return;
  }

  // 检查认证状态
  const token = extractBearerToken(req);
  const payload = token ? verifyToken(token) : null;

  // 未认证用户：检查每日限额
  if (!payload) {
    if (!checkAnonymousDailyLimit(ip)) {
      sendJson(res, 429, { error: "今日 AI 评论次数已用完，登录即可解锁完整功能", limit: ANONYMOUS_DAILY_LIMIT }, CORS_HEADERS);
      return;
    }
  }

  try {
    const body = await readJsonBody(req);
    const config = {
      apiKey: process.env.AI_API_KEY,
      apiBaseUrl: process.env.AI_BASE_URL || "https://api.deepseek.com",
      model: process.env.AI_MODEL || "deepseek-v4-flash",
    };
    const result = await requestAiComment(body, config);
    sendJson(res, 200, result, CORS_HEADERS);
  } catch (error) {
    sendJson(
      res,
      error.statusCode || 500,
      { error: "Internal Server Error" },
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

  const rootDir = resolve(ROOT_DIR) + sep;
  if (!absolutePath.startsWith(rootDir) && absolutePath !== resolve(ROOT_DIR)) {
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

  // Cache-Control: fonts long cache, others revalidate
  const cacheRules = {
    ".woff2": "public, max-age=31536000, immutable",
    ".woff":  "public, max-age=31536000, immutable",
    ".ttf":   "public, max-age=31536000, immutable",
    ".css":   "max-age=0, must-revalidate",
    ".js":    "max-age=0, must-revalidate",
    ".html":  "no-cache",
    ".png":   "public, max-age=86400",
    ".jpg":   "public, max-age=86400",
    ".jpeg":  "public, max-age=86400",
    ".webp":  "public, max-age=86400",
    ".svg":   "public, max-age=86400",
    ".ico":   "public, max-age=86400",
  };
  const cacheControl = cacheRules[ext] || "no-cache";

  // 304 Not Modified: check If-Modified-Since
  const fileStat = await stat(filePath);
  const mtime = fileStat.mtime.toUTCString();
  const ifModifiedSince = req.headers["if-modified-since"];
  if (ifModifiedSince && new Date(ifModifiedSince).getTime() >= fileStat.mtime.getTime()) {
    res.writeHead(304, { "Cache-Control": cacheControl, "Last-Modified": mtime });
    res.end();
    return;
  }

  const headers = { "Content-Type": contentType, "Cache-Control": cacheControl, "Last-Modified": mtime };

  // gzip for text-based files
  const gzipTypes = [".html", ".css", ".js", ".json", ".svg", ".md", ".txt"];
  const acceptGzip = gzipTypes.includes(ext) && (req.headers["accept-encoding"] || "").includes("gzip");

  if (acceptGzip) {
    headers["Content-Encoding"] = "gzip";
  }

  res.writeHead(200, headers);

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  const stream = createReadStream(filePath);
  if (acceptGzip) {
    stream.pipe(createGzip()).pipe(res);
  } else {
    stream.pipe(res);
  }
}

async function handleAuthRequest(req, res, path) {
  if (req.method === "OPTIONS") {
    res.writeHead(200, CORS_HEADERS);
    res.end("OK");
    return;
  }

  try {
    if (path === "/api/auth/send-code" && req.method === "POST") {
      const { account, turnstileToken } = await readJsonBody(req);

      // Turnstile verification
      if (!(await verifyTurnstile(turnstileToken))) {
        sendJson(res, 400, { error: "人机验证失败，请重试" }, CORS_HEADERS);
        return;
      }

      if (!account) {
        sendJson(res, 400, { error: "请输入邮箱或 UID" }, CORS_HEADERS);
        return;
      }

      // Determine if input is UID (pure digits) or email
      let targetEmail;
      const isUid = /^\d+$/.test(account.trim());

      if (isUid) {
        const user = findUserByUid(account.trim());
        if (!user) {
          sendJson(res, 400, { error: "该 UID 未注册" }, CORS_HEADERS);
          return;
        }
        targetEmail = user.email;
      } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account)) {
        targetEmail = account;
      } else {
        sendJson(res, 400, { error: "请输入有效的邮箱地址或 UID" }, CORS_HEADERS);
        return;
      }

      await sendVerificationCode(targetEmail);
      sendJson(res, 200, { ok: true, maskedEmail: maskEmail(targetEmail) }, CORS_HEADERS);
      return;
    }

    if (path === "/api/auth/login-code" && req.method === "POST") {
      const { account, code } = await readJsonBody(req);
      if (!account || !code) {
        sendJson(res, 400, { error: "请输入账号和验证码" }, CORS_HEADERS);
        return;
      }

      // Resolve UID to email
      let loginEmail;
      if (/^\d+$/.test(account.trim())) {
        const user = findUserByUid(account.trim());
        if (!user) {
          sendJson(res, 400, { error: "该 UID 未注册" }, CORS_HEADERS);
          return;
        }
        loginEmail = user.email;
      } else {
        loginEmail = account;
      }

      const result = loginWithCode(loginEmail, code);
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
      const { email, code, nickname, avatarSeed, bio, password, inviteCode } = body;
      if (!email || !code || !nickname || !password) {
        sendJson(res, 400, { error: "缺少必填字段" }, CORS_HEADERS);
        return;
      }
      const result = registerWithEmail(email, code, nickname, avatarSeed || 'default', bio || '', password, inviteCode || '');
      if (result.error) {
        sendJson(res, 400, { error: result.error }, CORS_HEADERS);
        return;
      }
      sendJson(res, 200, { ok: true, token: result.token, user: result.user }, CORS_HEADERS);
      return;
    }

    if (path === "/api/auth/login-password" && req.method === "POST") {
      const { account, password } = await readJsonBody(req);
      if (!account || !password) {
        sendJson(res, 400, { error: "请输入账号和密码" }, CORS_HEADERS);
        return;
      }

      // Resolve UID to email
      let loginEmail;
      if (/^\d+$/.test(account.trim())) {
        const user = findUserByUid(account.trim());
        if (!user) {
          sendJson(res, 401, { error: "账号或密码错误" }, CORS_HEADERS);
          return;
        }
        loginEmail = user.email;
      } else {
        loginEmail = account;
      }

      const result = loginWithPassword(loginEmail, password);
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
        const validSeeds = ['adventurer', 'lorelei', 'notionists', 'croodles', 'big-smile', 'personas', 'micah', 'bottts', 'fun-emoji', 'avataaars', 'pixel-art', 'thumbs'];
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
    console.error("Server error:", error);
    sendJson(res, 500, { error: "Internal Server Error" }, CORS_HEADERS);
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
    console.error("Server error:", error);
    sendJson(res, 500, { error: "Internal Server Error" }, CORS_HEADERS);
  }
}

const server = createServer(async (req, res) => {
  const url = req.url || "/";
  const path = url.split("?")[0];

  // Rate limiting for sensitive endpoints
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (!checkRateLimit(path, ip)) {
    sendJson(res, 429, { error: "请求过于频繁，请稍后再试" }, CORS_HEADERS);
    return;
  }

  if (path.startsWith("/api/comment")) {
    await handleCommentApi(req, res, ip);
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
