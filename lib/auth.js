import { createHmac, timingSafeEqual, randomInt } from 'node:crypto';
import { findUser, registerUser, saveCode, verifyCode, consumeCode, checkCodeValid, hashPassword, checkPassword } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is required. Generate one with: openssl rand -hex 32');
    process.exit(1);
}
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'MyScore <onboarding@resend.dev>';

const VALID_AVATAR_SEEDS = ['adventurer', 'lorelei', 'notionists', 'croodles', 'big-smile', 'personas', 'micah', 'bottts', 'fun-emoji', 'avataaars', 'pixel-art', 'thumbs'];

const INVITE_CODES = (process.env.INVITE_CODES || '').split(',').map(s => s.trim()).filter(Boolean);

// ==================== JWT ====================

function base64url(str) {
    return Buffer.from(str).toString('base64url');
}

function signToken(user) {
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64url(JSON.stringify({
        sub: user.id,
        uid: user.uid,
        email: user.email,
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    }));
    const signature = createHmac('sha256', JWT_SECRET)
        .update(`${header}.${body}`)
        .digest('base64url');
    return `${header}.${body}.${signature}`;
}

export function verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expected = createHmac('sha256', JWT_SECRET)
        .update(`${header}.${body}`)
        .digest('base64url');

    try {
        if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    } catch {
        return null;
    }

    try {
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
        if (payload.exp && payload.exp < Date.now() / 1000) return null;
        return { userId: payload.sub, uid: payload.uid, email: payload.email };
    } catch {
        return null;
    }
}

// ==================== Email ====================

function generateCode() {
    return String(randomInt(100000, 1000000));
}

async function sendEmail(to, code) {
    if (!RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not set, skipping email send. Code:', code);
        return;
    }

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: RESEND_FROM,
            to,
            subject: 'MyScore 登录验证码',
            html: `
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #eceff3;box-shadow:0 8px 30px rgba(0,0,0,0.04);">
      <!-- Header -->
      <tr>
        <td style="padding:28px 32px 12px;text-align:left;">
          <div style="font-size:22px;font-weight:700;color:#111827;letter-spacing:0;">MyScore</div>
          <div style="font-size:13px;color:#6b7280;margin-top:6px;">登录安全验证</div>
        </td>
      </tr>
      <!-- Body -->
      <tr>
        <td style="padding:32px;">
          <p style="font-size:15px;color:#374151;margin:0 0 8px;line-height:1.6;">你好，你的一次性验证码如下：</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding:20px 0;">
                <div style="display:inline-block;background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:14px 22px;font-size:34px;font-weight:700;letter-spacing:0.35em;color:#111827;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;">${code}</div>
              </td>
            </tr>
          </table>
          <p style="font-size:13px;color:#6b7280;margin:0;line-height:1.7;text-align:center;">验证码 <strong style="color:#111827;">5 分钟</strong> 内有效，请勿泄露给他人。</p>
        </td>
      </tr>
      <!-- Divider -->
      <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid #f1f5f9;margin:0;"></td></tr>
      <!-- Footer -->
      <tr>
        <td style="padding:20px 32px;">
          <p style="font-size:12px;color:#6b7280;margin:0;line-height:1.6;">如果你没有请求此验证码，请直接忽略本邮件。</p>
          <p style="font-size:11px;color:#9ca3af;margin:12px 0 0;line-height:1.5;">© MyScore · 不止记录分数，更陪你复盘、答疑与成长</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>
            `,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Resend API error: ${err}`);
    }
}

// ==================== Public API ====================

export async function sendVerificationCode(email) {
    const code = generateCode();
    saveCode(email, code);
    await sendEmail(email, code);
}

export function registerWithEmail(email, code, nickname, avatarSeed, bio, password, inviteCode) {
    const ok = verifyCode(email, code);
    if (!ok) return { error: '验证码错误或已过期' };

    if (!nickname || nickname.trim().length < 1) return { error: '请输入昵称' };
    if (nickname.trim().length > 20) return { error: '昵称最多20个字符' };
    if (!VALID_AVATAR_SEEDS.includes(avatarSeed)) return { error: '无效的头像选择' };
    if (bio && bio.length > 60) return { error: '个性签名最多60个字符' };
    if (!password || password.length < 6) return { error: '密码至少6位' };

    // Check invite code
    let isBeta = false;
    if (inviteCode && INVITE_CODES.length > 0) {
        isBeta = INVITE_CODES.includes(inviteCode);
    }

    const { salt, hash } = hashPassword(password);
    const user = registerUser(email, nickname.trim(), avatarSeed, bio || '', hash, salt, isBeta);
    if (!user) return { error: '该邮箱已注册' };

    const token = signToken(user);
    return { token, user };
}

export function loginWithPassword(email, password) {
    const user = findUser(email);
    if (!user) return { error: '该账号尚未注册，请先通过验证码完成注册' };

    const ok = checkPassword(password, user.salt, user.password_hash);
    if (!ok) return { error: '密码错误，请重试' };

    const token = signToken(user);
    return { token, user };
}

export function loginWithCode(email, code) {
    const ok = checkCodeValid(email, code);
    if (!ok) return { error: '验证码错误或已过期' };

    const user = findUser(email);
    if (!user) return { isNewUser: true };

    // Existing user: consume the code and issue token
    consumeCode(email);
    const token = signToken(user);
    return { token, user };
}
