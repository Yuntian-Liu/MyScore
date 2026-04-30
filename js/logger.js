// ==================== 前端日志收集器 ====================
import { APP_VERSION } from './config.js';

var logs = [];
var MAX_LOGS = 500;

// 拦截 console
var _origLog = console.log;
var _origError = console.error;
var _origWarn = console.warn;

function ts() {
    return new Date().toISOString().slice(11, 23);
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

console.log = function() {
    pushLog('INFO', arguments);
    _origLog.apply(console, arguments);
};

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
        'Time: ' + new Date().toISOString() + '\n';

    // 登录状态
    try {
        var auth = JSON.parse(localStorage.getItem('myscore_auth') || '{}');
        header += 'Logged In: ' + (!!auth.token) + '\n';
        if (auth.uid) header += 'UID: ' + auth.uid + '\n';
    } catch (e) {
        header += 'Logged In: parse_error\n';
    }

    // Service Worker 状态
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        header += 'SW Controller: active\n';
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
    snapshot += 'Records: ' + (localStorage.getItem('myscore_v51_records') || '[]').length + ' chars\n';
    snapshot += 'Custom: ' + (localStorage.getItem('myscore_v51_custom') || '{}').length + ' chars\n';

    // 成就解锁详情
    var achSnap = '\n--- ACHIEVEMENTS ---\n';
    try {
        var ach = JSON.parse(localStorage.getItem('myscore_achievements') || '{}');
        var unlocked = ach.unlocked || [];
        achSnap += 'Unlocked (' + unlocked.length + '): ' + unlocked.join(', ') + '\n';
    } catch (e) {
        achSnap += 'Parse error\n';
    }

    // AI 调用次数（本地模式）
    var aiSnap = '\n--- AI USAGE (LOCAL MODE) ---\n';
    try {
        var usage = JSON.parse(localStorage.getItem('myscore_local_ai_usage') || '{}');
        var today = new Date().toISOString().slice(0, 10);
        aiSnap += 'Today (' + today + '): ' + (usage[today] || 0) + ' calls\n';
    } catch (e) {
        aiSnap += 'Parse error\n';
    }

    var blob = new Blob([header + body + snapshot + achSnap + aiSnap], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'MyScore_Log_' + new Date().toISOString().slice(0, 10) + '.txt';
    a.click();
    URL.revokeObjectURL(url);
}

window.exportLogs = exportLogs;
