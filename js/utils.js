// ==================== 工具函数 ====================
import { STORAGE, EXAM_THEME_MAP, FALLBACK_THEME_POOL, IELTS_TABLES, COMMENT_API_ENDPOINT } from './config.js';

export function readStorageJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
        console.warn('Failed to parse localStorage key:', key, error);
        return fallback;
    }
}

export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function escapeAttr(value) {
    return escapeHtml(value);
}

export function getAvatarUrl(seed, size) {
    return 'https://api.dicebear.com/9.x/' + (seed || 'adventurer') + '/svg?size=' + (size || 64);
}

export function getExamTheme(examType) {
    if (EXAM_THEME_MAP[examType]) return EXAM_THEME_MAP[examType];
    const seed = String(examType || 'custom').split('').reduce(function (acc, ch) {
        return acc + ch.charCodeAt(0);
    }, 0);
    return FALLBACK_THEME_POOL[seed % FALLBACK_THEME_POOL.length];
}

export function getExamBadgeMarkup(examType, label, size) {
    const theme = getExamTheme(examType);
    const boxSize = size || 42;
    const iconSize = Math.round(boxSize * 0.64);
    const padding = Math.round((boxSize - iconSize) / 2);
    let iconMarkup = '';

    if (examType === 'ielts') {
        iconMarkup = `
            <path d="M11 11h10" stroke="${theme.contrast}" stroke-width="2.2" stroke-linecap="round"/>
            <path d="M11 16h10" stroke="${theme.contrast}" stroke-width="2.2" stroke-linecap="round"/>
            <path d="M11 21h7" stroke="${theme.contrast}" stroke-width="2.2" stroke-linecap="round"/>
            <rect x="6" y="9" width="3" height="3" rx="1.2" fill="${theme.contrast}"/>
            <rect x="6" y="14" width="3" height="3" rx="1.2" fill="${theme.contrast}"/>
            <rect x="6" y="19" width="3" height="3" rx="1.2" fill="${theme.contrast}"/>
        `;
    } else if (examType === 'cet4') {
        iconMarkup = `
            <path d="M8 22V11.5c0-1 .8-1.8 1.8-1.8h11.6c1 0 1.8.8 1.8 1.8V22" stroke="${theme.contrast}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 9V7.8c0-1 .8-1.8 1.8-1.8h3.4c1 0 1.8.8 1.8 1.8V9" stroke="${theme.contrast}" stroke-width="2.1" stroke-linecap="round"/>
            <path d="M8 15h15" stroke="${theme.contrast}" stroke-width="2.1" stroke-linecap="round"/>
            <path d="m14 15.2 1.7 1.7 3.3-3.4" stroke="${theme.contrast}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
        `;
    } else if (examType === 'cet6') {
        iconMarkup = `
            <path d="M7 22h18" stroke="${theme.contrast}" stroke-width="2.1" stroke-linecap="round"/>
            <rect x="9" y="14" width="3.4" height="8" rx="1.2" fill="${theme.contrast}"/>
            <rect x="14.4" y="11" width="3.4" height="11" rx="1.2" fill="${theme.contrast}" opacity="0.92"/>
            <rect x="19.8" y="8" width="3.4" height="14" rx="1.2" fill="${theme.contrast}" opacity="0.82"/>
            <path d="M9 10.2c2-.2 3.8-.8 5.4-2 1.7-1.2 3.2-2.9 4.6-5.2" stroke="${theme.contrast}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="m18.6 3 1.8.1-.1 1.8" stroke="${theme.contrast}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
        `;
    } else {
        const initial = escapeHtml(String(label || examType || 'M').slice(0, 1).toUpperCase());
        iconMarkup = `<text x="16" y="21" text-anchor="middle" font-size="13" font-weight="700" fill="${theme.contrast}" font-family="Manrope, sans-serif">${initial}</text>`;
    }

    return '<span style="display:inline-flex;align-items:center;justify-content:center;width:' + boxSize + 'px;height:' + boxSize + 'px;border-radius:' + Math.round(boxSize * 0.34) + 'px;background:linear-gradient(135deg,' + theme.reportGradientStart + ', ' + theme.reportGradientEnd + ');box-shadow:0 12px 30px -18px rgba(40,55,90,0.45);flex-shrink:0;"><svg width="' + iconSize + '" height="' + iconSize + '" viewBox="0 0 32 32" fill="none" aria-hidden="true" style="display:block">' + iconMarkup + '</svg></span>';
}

export function getReportTypeIconMarkup(kind, size) {
    const iconSize = size || 30;
    if (kind === 'scorecard') {
        return '<svg width="' + iconSize + '" height="' + iconSize + '" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="6" y="5.5" width="20" height="21" rx="5" fill="#eef1ff" stroke="#5b7cff" stroke-width="1.8"/><path d="M11 12h10M11 17h10M11 22h6" stroke="#3f5ee8" stroke-width="2" stroke-linecap="round"/></svg>';
    }
    return '<svg width="' + iconSize + '" height="' + iconSize + '" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="5.5" y="7" width="21" height="18" rx="6" fill="#fff2ea" stroke="#ff8a63" stroke-width="1.8"/><path d="M10 21l4.5-5 4 3.5 4.5-6" stroke="#f26d44" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="21" r="1.6" fill="#f26d44"/><circle cx="18.5" cy="19.5" r="1.6" fill="#f26d44"/><circle cx="23" cy="13.5" r="1.6" fill="#f26d44"/></svg>';
}

export function showAiToast(msg) {
    var existing = document.getElementById('ai-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'ai-toast';
    toast.textContent = msg;
    toast.style.cssText = 'position:fixed;top:1.5rem;left:50%;transform:translateX(-50%);background:rgba(31,106,82,0.92);color:#fff;padding:0.65rem 1.3rem;border-radius:99px;font-size:0.88rem;font-weight:600;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.15);opacity:0;transition:opacity 0.3s ease;pointer-events:none;';
    document.body.appendChild(toast);
    requestAnimationFrame(function() { toast.style.opacity = '1'; });
    setTimeout(function() {
        toast.style.opacity = '0';
        setTimeout(function() { toast.remove(); }, 300);
    }, 2200);
}

export function roundUp(n) { return Math.ceil(n); }

export function calcIeltsOverall(scores) {
    const avg = scores.reduce((a,b)=>a+b,0)/scores.length;
    const dec = avg - Math.floor(avg);
    if (dec >= 0.25 && dec < 0.5) return Math.floor(avg) + 0.5;
    if (dec >= 0.75) return Math.floor(avg) + 1.0;
    return Math.round(avg * 2) / 2;
}

export function calcWritingScore(t1, t2) {
    if (t1 === null || t2 === null) return null;
    const score = (t2 * 2 + t1) / 3;
    return Math.round(score * 2) / 2;
}

export function lookup(raw, type) {
    const table = IELTS_TABLES[type];
    if (!table) return parseFloat(raw) || 0;
    const v = parseInt(raw) || 0;
    for (const item of table) {
        if (v >= item.min && v <= item.max) return item.s;
    }
    return 0;
}

export async function postComment(payload) {
    var headers = { 'Content-Type': 'application/json' };
    if (window.isLoggedIn && window.isLoggedIn()) {
        var cu = window.getCurrentUser && window.getCurrentUser();
        if (cu && cu.token) {
            headers['Authorization'] = 'Bearer ' + cu.token;
        }
    }
    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 30000);
    try {
        const res = await fetch(COMMENT_API_ENDPOINT, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        let data = {};
        try {
            data = await res.json();
        } catch (error) {
            if (!res.ok) {
                throw new Error('AI 服务返回了不可解析的响应');
            }
        }

        if (!res.ok) {
            throw new Error(data.error || ('AI 请求失败（' + res.status + '）'));
        }

        return data;
    } catch (e) {
        if (e.name === 'AbortError') throw new Error('AI 请求超时，请稍后再试');
        throw e;
    } finally {
        clearTimeout(timeoutId);
    }
}
