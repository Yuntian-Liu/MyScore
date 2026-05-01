// ==================== 数据存取层 ====================
import { STORAGE, BUILTIN_EXAMS } from './config.js';
import { readStorageJson, showAiToast } from './utils.js';
import { logEvent } from './logger.js';

export function getRecords() {
    const data = readStorageJson(STORAGE.RECORDS, []);
    return Array.isArray(data) ? data : [];
}

export function saveRecords(r) {
    try {
        localStorage.setItem(STORAGE.RECORDS, JSON.stringify(r));
        logEvent('storage-save', { key: 'records', count: Array.isArray(r) ? r.length : 0 });
        if (window.scheduleCloudSync) window.scheduleCloudSync();
    } catch (e) {
        logEvent('storage-full', { key: 'records', error: String(e) });
        showAiToast('本地存储空间不足，请导出并清理旧数据');
    }
}

export function getCustom() {
    const data = readStorageJson(STORAGE.CUSTOM, {});
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
}

export function saveCustom(c) {
    try {
        localStorage.setItem(STORAGE.CUSTOM, JSON.stringify(c));
        logEvent('storage-save', { key: 'custom', count: c && typeof c === 'object' ? Object.keys(c).length : 0 });
        if (window.scheduleCloudSync) window.scheduleCloudSync();
    } catch (e) {
        logEvent('storage-full', { key: 'custom', error: String(e) });
        showAiToast('本地存储空间不足，请导出并清理旧数据');
    }
}

export function allExams() {
    return { ...BUILTIN_EXAMS, ...getCustom() };
}

export function buildArchiveHighlights(records, exams) {
    if (!records.length) return [];

    const grouped = {};
    for (const record of records) {
        if (!grouped[record.examType]) {
            grouped[record.examType] = [];
        }
        grouped[record.examType].push(record);
    }

    return Object.entries(grouped)
        .map(function (entry) {
            const examType = entry[0];
            const examRecords = entry[1];
            const exam = exams[examType];
            const totals = examRecords
                .map(function (record) { return typeof record.total === 'number' ? record.total : null; })
                .filter(function (value) { return value !== null; });

            return {
                examType: examType,
                name: exam ? exam.name : examType,
                count: examRecords.length,
                best: totals.length ? Math.max.apply(null, totals) : null,
                lastDate: examRecords
                    .map(function (record) { return record.date; })
                    .sort()
                    .slice(-1)[0] || '-'
            };
        })
        .sort(function (a, b) {
            if (b.count !== a.count) return b.count - a.count;
            return a.name.localeCompare(b.name, 'zh-CN');
        })
        .slice(0, 4);
}

export function getGoal(examType) {
    try {
        var goals = JSON.parse(localStorage.getItem('myscore_goals') || '{}');
        return goals[examType] || null;
    } catch { return null; }
}

export function saveGoal(examType, target) {
    try {
        var goals = JSON.parse(localStorage.getItem('myscore_goals') || '{}');
        goals[examType] = target;
        localStorage.setItem('myscore_goals', JSON.stringify(goals));
        if (window.scheduleCloudSync) window.scheduleCloudSync();
    } catch {}
}
