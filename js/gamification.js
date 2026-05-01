// ==================== 游戏化数据模块 ====================
import { STORAGE, ACHIEVEMENTS, XP_PER_LEVEL, XP_SOURCES, XP_DAILY_CAP } from './config.js';
import { logEvent } from './logger.js';

var DAILY_XP_KEY = 'myscore_daily_xp';

// ==================== Toast 队列 ====================
var toastQueue = [];
var toastPlaying = false;

function enqueueToast(tag, amount, detail, isAchievement) {
    toastQueue.push({ tag: tag, amount: amount, detail: detail, achievement: !!isAchievement });
    if (!toastPlaying) playNextToast();
}

function playNextToast() {
    if (!toastQueue.length) { toastPlaying = false; return; }
    toastPlaying = true;
    var item = toastQueue.shift();
    showToastInternal(item.tag, item.amount, item.detail, item.achievement, function() {
        setTimeout(playNextToast, 300);
    });
}

function showToastInternal(tag, amount, detail, isAchievement, onDone) {
    var el = document.createElement('div');
    el.className = 'gamification-toast' + (isAchievement ? ' achievement' : '');

    if (amount !== undefined) {
        el.innerHTML = '<span class="gt-tag">' + tag + '</span>' +
                       '<span class="gt-xp">+' + amount + ' XP</span>';
    } else {
        el.innerHTML = '<span class="gt-tag">' + tag + '</span>' +
                       '<span class="gt-msg">' + detail + '</span>';
    }

    document.body.appendChild(el);
    el.offsetHeight;
    el.classList.add('show');
    setTimeout(function () {
        el.classList.remove('show');
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
            if (onDone) onDone();
        }, 400);
    }, 2500);
}

// ==================== 每日 XP 追踪 ====================
function getDailyData() {
    var data = readData(DAILY_XP_KEY, { date: '', total: 0, counts: {} });
    var today = new Date().toISOString().slice(0, 10);
    if (data.date !== today) {
        data = { date: today, total: 0, counts: {} };
    }
    return data;
}

function saveDailyData(data) {
    saveData(DAILY_XP_KEY, data);
}

// ==================== 经验值 ====================
export function addXP(sourceKey, opts) {
    var source = XP_SOURCES[sourceKey];
    if (!source) return null;
    var silent = opts && opts.silent;

    var daily = getDailyData();

    // 检查每日上限
    if (daily.total >= XP_DAILY_CAP) {
        if (!silent) enqueueToast('知止', undefined, '今日修习已满');
        return readData(STORAGE.XP, { total: 0, level: 1 });
    }

    // 一次性来源：检查是否已使用
    if (source.once) {
        var onceKey = 'myscore_xp_once_' + sourceKey;
        if (localStorage.getItem(onceKey)) return readData(STORAGE.XP, { total: 0, level: 1 });
        localStorage.setItem(onceKey, '1');
    }

    // 计算实际 XP（递减逻辑）
    var amount = source.base;
    if (source.daily) {
        var count = daily.counts[sourceKey] || 0;
        if (count > 0) {
            amount = Math.max(1, Math.floor(source.base * 0.5));
        }
        daily.counts[sourceKey] = count + 1;
    }

    // 确保不超过每日上限
    amount = Math.min(amount, XP_DAILY_CAP - daily.total);
    if (amount <= 0) {
        if (!silent) enqueueToast('知止', undefined, '今日修习已满');
        return readData(STORAGE.XP, { total: 0, level: 1 });
    }

    // 更新每日统计
    daily.total += amount;
    saveDailyData(daily);

    // 更新总 XP
    var xpData = readData(STORAGE.XP, { total: 0, level: 1 });
    var oldLevel = xpData.level;
    xpData.total += amount;

    // 检查升级
    while (xpData.total >= XP_PER_LEVEL(xpData.level)) {
        xpData.total -= XP_PER_LEVEL(xpData.level);
        xpData.level++;
    }

    saveData(STORAGE.XP, xpData);

    logEvent('xp-gain', { source: sourceKey, amount: amount, newTotal: xpData.total, newLevel: xpData.level, levelUp: xpData.level > oldLevel });

    // XP 增加入队列
    if (!silent) enqueueToast(source.label, amount);

    // 升级入队列
    if (xpData.level > oldLevel && !silent) {
        enqueueToast('进境', undefined, '升至 Lv.' + xpData.level);
    }

    return xpData;
}

// ==================== 连续打卡 ====================
export function updateStreak() {
    var data = readData(STORAGE.STREAK, {});
    var today = new Date().toISOString().slice(0, 10);
    var last = data.lastDate;

    // 今天已打卡，直接返回
    if (last === today) return data;

    // 计算昨天日期
    var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (last === yesterday) {
        data.currentStreak = (data.currentStreak || 0) + 1;
    } else {
        data.currentStreak = 1;
    }

    data.longestStreak = Math.max(data.longestStreak || 0, data.currentStreak);
    data.lastDate = today;
    if (!data.firstVisit) data.firstVisit = today;

    saveData(STORAGE.STREAK, data);

    logEvent('streak-update', { currentStreak: data.currentStreak, longestStreak: data.longestStreak, wasIncremented: last === yesterday });

    // 每日打卡 XP
    addXP('checkin');

    return data;
}

// ==================== 成就检查 ====================
export function checkAchievements() {
    var records = readData(STORAGE.RECORDS, []);
    var streakData = readData(STORAGE.STREAK, {});
    var unlocked = readData(STORAGE.ACHIEVEMENTS, []);
    var newlyUnlocked = [];

    ACHIEVEMENTS.forEach(function (a) {
        if (unlocked.indexOf(a.id) === -1) {
            try {
                if (a.condition(records, streakData)) {
                    unlocked.push(a.id);
                    newlyUnlocked.push(a);
                }
            } catch (e) { /* 成就条件检查出错时静默跳过 */ }
        }
    });

    if (newlyUnlocked.length > 0) {
        saveData(STORAGE.ACHIEVEMENTS, unlocked);
        logEvent('achievement-unlock', { ids: newlyUnlocked.map(function(a) { return a.id; }), total: unlocked.length });
        newlyUnlocked.forEach(function (a) {
            enqueueToast('功成', undefined, a.name + ' · ' + a.desc, true);
        });
    }

    return newlyUnlocked;
}

// ==================== 获取全部游戏化数据 ====================
export function getGamificationData() {
    return {
        streak: readData(STORAGE.STREAK, {}),
        xp: readData(STORAGE.XP, { total: 0, level: 1 }),
        achievements: readData(STORAGE.ACHIEVEMENTS, [])
    };
}

// ==================== 工具函数 ====================
function readData(key, fallback) {
    try {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
        return fallback;
    }
}

function saveData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) { /* localStorage 写入失败静默处理 */ }
}
