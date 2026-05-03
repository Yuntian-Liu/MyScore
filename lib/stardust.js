import { getUserData, saveUserData } from './db.js';

const STARDUST_COSTS = {
    comment: { cost: 2, label: 'AI 评论' },
    rebuttal: { cost: 1, label: 'AI 回嘴' },
    prediction: { cost: 5, label: 'AI 预测' },
    weakness: { cost: 6, label: '薄弱项分析' },
    companion: { cost: 1, label: '突突er' },
};

const WEEKLY_ALLOCATION = 200;

function getCurrentWeekMonday() {
    const now = new Date();
    const cstOffset = 8 * 60 * 60 * 1000;
    const cstNow = new Date(now.getTime() + cstOffset);
    const dayOfWeek = cstNow.getUTCDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(cstNow);
    monday.setUTCHours(0, 0, 0, 0);
    monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
    return monday;
}

function getNextRefreshDate() {
    const currentMonday = getCurrentWeekMonday();
    const next = new Date(currentMonday);
    next.setUTCDate(next.getUTCDate() + 7);
    return next;
}

export function getFeatureCost(body) {
    if (!body) return { ...STARDUST_COSTS.comment, mode: 'comment' };
    if (body.mode === 'prediction') return { ...STARDUST_COSTS.prediction, mode: 'prediction' };
    if (body.mode === 'weakness') return { ...STARDUST_COSTS.weakness, mode: 'weakness' };
    if (body.mode === 'companion') return { ...STARDUST_COSTS.companion, mode: 'companion' };
    if (body.userRebuttal) return { ...STARDUST_COSTS.rebuttal, mode: 'rebuttal' };
    return { ...STARDUST_COSTS.comment, mode: 'comment' };
}

export function getStardustData(userId) {
    const data = getUserData(userId);
    if (!data || !data.stardust) return null;
    return data.stardust;
}

export function initializeStardust(userId) {
    const data = getUserData(userId) || {};
    const currentMonday = getCurrentWeekMonday();
    data.stardust = {
        balance: WEEKLY_ALLOCATION,
        last_refresh: currentMonday.toISOString(),
        total_used: 0,
    };
    saveUserData(userId, data);
    return data.stardust;
}

function needsRefresh(lastRefresh) {
    const currentMonday = getCurrentWeekMonday();
    return new Date(lastRefresh) < currentMonday;
}

function refreshIfNeeded(stardustData) {
    if (needsRefresh(stardustData.last_refresh)) {
        stardustData.balance = WEEKLY_ALLOCATION;
        stardustData.last_refresh = getCurrentWeekMonday().toISOString();
    }
    return stardustData;
}

export function checkStardust(userId, cost) {
    const data = getUserData(userId);
    if (!data) {
        return { success: false, error: '用户数据不存在', balance: 0, nextRefresh: getNextRefreshDate().toISOString() };
    }

    if (!data.stardust) {
        data.stardust = {
            balance: WEEKLY_ALLOCATION,
            last_refresh: getCurrentWeekMonday().toISOString(),
            total_used: 0,
        };
        saveUserData(userId, data);
    }

    refreshIfNeeded(data.stardust);
    saveUserData(userId, data);

    if (data.stardust.balance < cost) {
        return {
            success: false,
            error: '本周星尘已用完',
            balance: data.stardust.balance,
            nextRefresh: getNextRefreshDate().toISOString(),
        };
    }

    return {
        success: true,
        balance: data.stardust.balance,
        nextRefresh: getNextRefreshDate().toISOString(),
    };
}

export function deductStardust(userId, cost, mode) {
    const data = getUserData(userId);
    if (!data || !data.stardust) {
        return { success: false, error: '星尘数据异常', balance: 0, nextRefresh: getNextRefreshDate().toISOString() };
    }

    refreshIfNeeded(data.stardust);
    data.stardust.balance -= cost;
    data.stardust.total_used += cost;
    saveUserData(userId, data);

    return {
        success: true,
        balance: data.stardust.balance,
        cost,
        mode,
        nextRefresh: getNextRefreshDate().toISOString(),
    };
}

export function getStardustBalance(userId) {
    const data = getUserData(userId);
    if (!data) {
        initializeStardust(userId);
        return { balance: WEEKLY_ALLOCATION, last_refresh: getCurrentWeekMonday().toISOString(), nextRefresh: getNextRefreshDate().toISOString() };
    }
    if (!data.stardust) {
        data.stardust = {
            balance: WEEKLY_ALLOCATION,
            last_refresh: getCurrentWeekMonday().toISOString(),
            total_used: 0,
        };
    }
    refreshIfNeeded(data.stardust);
    saveUserData(userId, data);
    return {
        balance: data.stardust.balance,
        last_refresh: data.stardust.last_refresh,
        nextRefresh: getNextRefreshDate().toISOString(),
    };
}
