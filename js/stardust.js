// js/stardust.js — 星尘（Stardust）前端模块

let _stardustBalance = null;

window.fetchStardustBalance = fetchStardustBalance;
window.showInsufficientStardustModal = showInsufficientStardustModal;
window.hideStardustBadge = hideStardustBadge;
window.getStardustBalance = getStardustBalance;
window.updateStardustFromHeaders = updateStardustFromHeaders;

export function getStardustBalance() {
    return _stardustBalance;
}

export async function fetchStardustBalance() {
    try {
        var authData = JSON.parse(localStorage.getItem('myscore_auth') || '{}');
        var token = authData.token;
        if (!token) { _stardustBalance = null; renderStardustBadge(null); return null; }
        var res = await fetch('/api/stardust', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) { _stardustBalance = null; renderStardustBadge(null); return null; }
        var data = await res.json();
        if (data.ok && data.stardust) {
            _stardustBalance = data.stardust.balance;
            renderStardustBadge(_stardustBalance);
            return _stardustBalance;
        }
    } catch (e) {
        // 静默失败
    }
    _stardustBalance = null;
    renderStardustBadge(null);
    return null;
}

export function renderStardustBadge(balance) {
    var el = document.getElementById('gam-stardust');
    if (!el) return;
    if (balance === null || balance === undefined) {
        el.classList.add('hidden');
        return;
    }
    el.classList.remove('hidden');
    var countEl = document.getElementById('gam-stardust-count');
    if (countEl) countEl.textContent = balance;
    if (balance < 20) {
        el.classList.add('stardust-low');
    } else {
        el.classList.remove('stardust-low');
    }
}

export function showInsufficientStardustModal(data) {
    var nextRefresh = data && data.nextRefresh ? new Date(data.nextRefresh) : null;
    var refreshStr = '';
    if (nextRefresh) {
        var month = nextRefresh.getMonth() + 1;
        var day = nextRefresh.getDate();
        var hours = String(nextRefresh.getHours()).padStart(2, '0');
        var minutes = String(nextRefresh.getMinutes()).padStart(2, '0');
        refreshStr = month + '月' + day + '日 ' + hours + ':' + minutes + ' 自动恢复 200 星尘';
    } else {
        refreshStr = '下周一 00:00 自动恢复 200 星尘';
    }
    var balance = (data && data.balance !== undefined) ? data.balance : 0;
    var cost = (data && data.cost) || '?';

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay stardust-modal-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML =
        '<div class="modal-content stardust-modal" onclick="event.stopPropagation()" style="max-width:360px;text-align:center;">' +
            '<div style="font-size:2.5rem;margin-bottom:0.5rem;">✨</div>' +
            '<h3 style="font-size:1.25rem;font-weight:700;margin-bottom:0.5rem;" class="gradient-text">本周星尘已用完</h3>' +
            '<p style="color:#9ca3af;font-size:0.9rem;margin-bottom:0.25rem;">当前余额：' + balance + ' 星尘 · 本次需要：' + cost + ' 星尘</p>' +
            '<p style="color:#6b7280;font-size:0.85rem;margin-bottom:1.25rem;">' + refreshStr + '</p>' +
            '<button class="btn-primary" onclick="this.closest(\'.stardust-modal-overlay\').remove()" style="width:100%;">知道了</button>' +
        '</div>';
    document.body.appendChild(overlay);
}

export function updateStardustFromHeaders(headers) {
    var bal = headers.get('X-Stardust-Balance');
    if (bal !== null && bal !== undefined) {
        _stardustBalance = parseInt(bal, 10);
        renderStardustBadge(_stardustBalance);
    }
}

export function hideStardustBadge() {
    _stardustBalance = null;
    renderStardustBadge(null);
}
