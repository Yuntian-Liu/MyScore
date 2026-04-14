import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const DATA_DIR = process.env.DATA_DIR || './data';
const USERS_FILE = join(DATA_DIR, 'users.json');
const CODES_FILE = join(DATA_DIR, 'codes.json');
const USER_DATA_DIR = join(DATA_DIR, 'userdata');
const UID_COUNTER_FILE = join(DATA_DIR, 'uid_counter.json');

function readJsonFile(filePath, fallback) {
    if (!existsSync(filePath)) return fallback;
    try {
        return JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch {
        return fallback;
    }
}

function writeJsonFile(filePath, data) {
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function initDb() {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    if (!existsSync(USER_DATA_DIR)) mkdirSync(USER_DATA_DIR, { recursive: true });
    if (!existsSync(UID_COUNTER_FILE)) {
        writeJsonFile(UID_COUNTER_FILE, { next: 1100000 });
    }
}

// ==================== UID ====================

export function getNextUid() {
    const counter = readJsonFile(UID_COUNTER_FILE, { next: 1100000 });
    const uid = counter.next;
    counter.next = uid + 1;
    writeJsonFile(UID_COUNTER_FILE, counter);
    return uid;
}

// ==================== Users ====================

export function findUser(email) {
    const users = readJsonFile(USERS_FILE, {});
    return users[email] || null;
}

export function findUserByUid(uid) {
    const users = readJsonFile(USERS_FILE, {});
    const uidNum = Number(uid);
    for (const email in users) {
        if (users[email].uid === uidNum) return users[email];
    }
    return null;
}

export function maskEmail(email) {
    if (!email || !email.includes('@')) return email;
    const [local, domain] = email.split('@');
    const masked = local.length <= 2
        ? local[0] + '***'
        : local[0] + '***' + local.slice(-1);
    return masked + '@' + domain;
}

export function registerUser(email, nickname, avatarSeed, bio, passwordHash, salt) {
    const users = readJsonFile(USERS_FILE, {});
    if (users[email]) return null;

    const uid = getNextUid();
    const user = {
        id: Date.now(),
        uid,
        email,
        nickname,
        avatar_seed: avatarSeed,
        bio: bio || '',
        password_hash: passwordHash,
        salt,
        is_admin: uid === 1100000,
        created_at: new Date().toISOString()
    };
    users[email] = user;
    writeJsonFile(USERS_FILE, users);
    return user;
}

export function updateUserProfile(email, updates) {
    const users = readJsonFile(USERS_FILE, {});
    const user = users[email];
    if (!user) return null;

    if (updates.nickname !== undefined) user.nickname = updates.nickname;
    if (updates.avatar_seed !== undefined) user.avatar_seed = updates.avatar_seed;
    if (updates.bio !== undefined) user.bio = updates.bio;

    users[email] = user;
    writeJsonFile(USERS_FILE, users);
    return user;
}

// ==================== Password ====================

export function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return { salt, hash };
}

export function checkPassword(password, salt, hash) {
    const derived = scryptSync(password, salt, 64).toString('hex');
    try {
        return timingSafeEqual(Buffer.from(derived), Buffer.from(hash));
    } catch {
        return false;
    }
}

// ==================== Verification Codes ====================

export function saveCode(email, code) {
    const codes = readJsonFile(CODES_FILE, {});
    codes[email] = {
        code,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        attempts: 0
    };
    writeJsonFile(CODES_FILE, codes);
}

export function checkCodeValid(email, code) {
    const codes = readJsonFile(CODES_FILE, {});
    const entry = codes[email];
    if (!entry) return false;
    if (new Date(entry.expires_at) < new Date()) return false;
    if (entry.attempts >= 5) return false;

    if (entry.code !== code) {
        // Only increment attempts on wrong code
        entry.attempts++;
        writeJsonFile(CODES_FILE, codes);
        return false;
    }

    return true;
}

export function verifyCode(email, code) {
    const codes = readJsonFile(CODES_FILE, {});
    const entry = codes[email];

    if (!entry) return false;

    if (new Date(entry.expires_at) < new Date()) {
        delete codes[email];
        writeJsonFile(CODES_FILE, codes);
        return false;
    }

    if (entry.attempts >= 5) {
        delete codes[email];
        writeJsonFile(CODES_FILE, codes);
        return false;
    }

    entry.attempts++;
    writeJsonFile(CODES_FILE, codes);

    if (entry.code !== code) return false;

    delete codes[email];
    writeJsonFile(CODES_FILE, codes);
    return true;
}

// ==================== User Data (cloud sync) ====================

export function saveUserData(userId, jsonData) {
    const filePath = join(USER_DATA_DIR, `${userId}.json`);
    const data = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData);
    writeFileSync(filePath, data, 'utf-8');
}

export function getUserData(userId) {
    const filePath = join(USER_DATA_DIR, `${userId}.json`);
    if (!existsSync(filePath)) return null;
    try {
        return JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch {
        return null;
    }
}
