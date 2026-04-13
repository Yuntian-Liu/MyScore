import { createHmac, timingSafeEqual, randomInt } from 'node:crypto';
import { findUser, registerUser, saveCode, verifyCode, checkCodeValid, hashPassword, checkPassword } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'myscore-default-secret-change-me';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'MyScore <onboarding@resend.dev>';

const VALID_AVATAR_SEEDS = ['adventurer', 'lorelei', 'notionists', 'bottts', 'fun-emoji', 'avataaars', 'pixel-art', 'thumbs'];

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
            subject: 'MyScore 验证码',
            html: `
                <div style="font-family:system-ui,sans-serif;max-width:400px;margin:0 auto;padding:2rem;">
                    <h2 style="color:#1f6a52;margin-bottom:1rem;">MyScore 验证码</h2>
                    <p style="font-size:1rem;color:#374151;">你的登录验证码是：</p>
                    <p style="font-size:2rem;font-weight:800;color:#1f6a52;letter-spacing:0.3em;margin:1rem 0;">${code}</p>
                    <p style="font-size:0.85rem;color:#9ca3af;">验证码 5 分钟内有效。如非本人操作，请忽略此邮件。</p>
                </div>
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

export function registerWithEmail(email, code, nickname, avatarSeed, bio, password) {
    const ok = verifyCode(email, code);
    if (!ok) return { error: '验证码错误或已过期' };

    if (!nickname || nickname.trim().length < 1) return { error: '请输入昵称' };
    if (nickname.trim().length > 20) return { error: '昵称最多20个字符' };
    if (!VALID_AVATAR_SEEDS.includes(avatarSeed)) return { error: '无效的头像选择' };
    if (bio && bio.length > 60) return { error: '个性签名最多60个字符' };
    if (!password || password.length < 6) return { error: '密码至少6位' };

    const { salt, hash } = hashPassword(password);
    const user = registerUser(email, nickname.trim(), avatarSeed, bio || '', hash, salt);
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
    verifyCode(email, code);
    const token = signToken(user);
    return { token, user };
}
