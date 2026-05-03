// ==================== 前端日志收集器 ====================
import { APP_VERSION } from './config.js';

var logs = [];
var MAX_LOGS = 1000;

// 拦截 console（仅 error 和 warn，不拦截 log 以避免第三方噪音）
var _origError = console.error;
var _origWarn = console.warn;

function ts() {
    return new Date().toISOString().slice(0, 23);
}

function pushLog(level, args) {
    var msg = Array.prototype.map.call(args, function(a) {
        if (typeof a === 'object') {
            try { return JSON.stringify(a); } catch { return String(a); }
        }
        return String(a);
    }).join(' ');
    logs.push({ t: ts(), level: level, msg: msg });
    if (logs.length > MAX_LOGS) logs.shift();
}

console.error = function() {
    pushLog('ERROR', arguments);
    _origError.apply(console, arguments);
};

console.warn = function() {
    pushLog('WARN', arguments);
    _origWarn.apply(console, arguments);
};

// 自定义事件日志
export function logEvent(category, data) {
    var msg = '';
    try { msg = JSON.stringify(data); } catch { msg = String(data); }
    logs.push({ t: ts(), level: 'EVENT', cat: category, msg: msg });
    if (logs.length > MAX_LOGS) logs.shift();
}

// 导出为 .txt 文件
export function exportLogs() {
    var header = 'MyScore Log Export\n' +
        'Version: V' + APP_VERSION + '\n' +
        'User Agent: ' + navigator.userAgent + '\n' +
        'Online: ' + navigator.onLine + '\n' +
        'Time: ' + new Date().toISOString() + '\n' +
        'Timezone: UTC' + (new Date().getTimezoneOffset() > 0 ? '-' : '+') + Math.abs(new Date().getTimezoneOffset() / 60) + '\n' +
        'Screen: ' + screen.width + 'x' + screen.height + ' @' + (window.devicePixelRatio || 1) + 'x\n' +
        'Viewport: ' + window.innerWidth + 'x' + window.innerHeight + '\n';

    // 登录状态
    try {
        var auth = JSON.parse(localStorage.getItem('myscore_auth') || '{}');
        header += 'Logged In: ' + (!!auth.token) + '\n';
        if (auth.uid) header += 'UID: ' + auth.uid + '\n';
        header += 'Feishu Bound: ' + (!!auth.feishuOpenId) + '\n';
    } catch (e) {
        header += 'Logged In: parse_error\n';
    }

    // Service Worker 状态
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        var sw = navigator.serviceWorker.controller;
        header += 'SW Controller: active\n';
        header += 'SW ScriptURL: ' + (sw.scriptURL || 'unknown') + '\n';
        header += 'SW State: ' + (sw.state || 'unknown') + '\n';
    } else {
        header += 'SW Controller: none\n';
    }

    // PWA 安装状态
    header += 'PWA Standalone: ' + (window.matchMedia('(display-mode: standalone)').matches) + '\n';

    header += '---\n';

    var body = logs.map(function(l) {
        var line = l.t + ' [' + l.level + ']';
        if (l.cat) line += ' {' + l.cat + '}';
        line += ' ' + l.msg;
        return line;
    }).join('\n');

    // localStorage 快照
    var snapshot = '\n--- LOCALSTORAGE SNAPSHOT ---\n';
    var keys = ['myscore_xp_data', 'myscore_streak_data', 'myscore_achievements',
                'myscore_daily_xp', 'myscore_user_mode', 'myscore_ai_style'];
    keys.forEach(function(k) {
        var v = localStorage.getItem(k);
        if (v) snapshot += k + ': ' + v + '\n';
    });

    // Records 摘要
    try {
        var recs = JSON.parse(localStorage.getItem('myscore_v51_records') || '[]');
        snapshot += 'Records: ' + recs.length + ' entries\n';
        if (recs.length > 0) {
            var first = recs[0], last = recs[recs.length - 1];
            snapshot += '  First: ' + first.examType + ' ' + first.date + ' id=' + first.id + '\n';
            snapshot += '  Last:  ' + last.examType + ' ' + last.date + ' id=' + last.id + '\n';
        }
    } catch (e) { snapshot += 'Records: parse_error\n'; }

    // Custom 考试类型摘要
    try {
        var cust = JSON.parse(localStorage.getItem('myscore_v51_custom') || '{}');
        var custKeys = Object.keys(cust);
        snapshot += 'Custom: ' + custKeys.length + ' types';
        if (custKeys.length) snapshot += ' [' + custKeys.join(', ') + ']';
        snapshot += '\n';
    } catch (e) { snapshot += 'Custom: parse_error\n'; }

    // localStorage 用量统计
    var usageSection = '\n--- LOCALSTORAGE USAGE ---\n';
    var totalSize = 0;
    var lsKeys = ['myscore_v51_records', 'myscore_v51_custom', 'myscore_auth', 'myscore_xp_data',
        'myscore_streak_data', 'myscore_achievements', 'myscore_daily_xp', 'myscore_user_mode',
        'myscore_ai_style', 'myscore_local_ai_usage', 'myscore_goals', 'myscore_tutuer_history',
        'myscore_pet_state', 'myscore_ai_debated'];
    lsKeys.forEach(function(k) {
        var v = localStorage.getItem(k);
        if (v) {
            var size = v.length * 2;
            totalSize += size;
            usageSection += k + ': ' + (size / 1024).toFixed(1) + ' KB\n';
        }
    });
    usageSection += 'Total (tracked keys): ' + (totalSize / 1024).toFixed(1) + ' KB / ~5120 KB\n';

    // 成就解锁详情
    var achSnap = '\n--- ACHIEVEMENTS ---\n';
    try {
        var ach = JSON.parse(localStorage.getItem('myscore_achievements') || '[]');
        if (Array.isArray(ach)) {
            achSnap += 'Unlocked (' + ach.length + '): ' + ach.join(', ') + '\n';
        } else if (ach.unlocked) {
            achSnap += 'Unlocked (' + ach.unlocked.length + '): ' + ach.unlocked.join(', ') + '\n';
        }
    } catch (e) {
        achSnap += 'Parse error\n';
    }

    // AI 调用次数（本地模式）
    var aiSnap = '\n--- AI USAGE (LOCAL MODE) ---\n';
    try {
        var usage = JSON.parse(localStorage.getItem('myscore_local_ai_usage') || '{}');
        var today = new Date().toISOString().slice(0, 10);
        aiSnap += 'Today (' + today + '): ' + (usage.count || 0) + ' calls\n';
    } catch (e) {
        aiSnap += 'Parse error\n';
    }

    var blob = new Blob([header + body + snapshot + usageSection + achSnap + aiSnap], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'MyScore_Log_' + new Date().toISOString().slice(0, 10) + '.txt';
    a.click();
    URL.revokeObjectURL(url);
}

window.exportLogs = exportLogs;
