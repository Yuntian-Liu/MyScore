// ==================== 设置页面 ====================
import { APP_VERSION, GUIDE_SECTIONS, CHANGELOG_CURRENT, CHANGELOG_HISTORY, USER_AGREEMENT_HTML, PRIVACY_POLICY_HTML } from './config.js';
import { logEvent } from './logger.js';
import { getRecords, saveRecords, saveCustom } from './storage.js';
import { isLoggedIn, getCurrentUser } from './auth.js';
import { showAiToast, getAvatarUrl, escapeHtml } from './utils.js';

// 头像选择状态
var _settingsAvatarSeed = null;

export function openSettings() {
    settingsGoHome();
    var user = getCurrentUser();
    _settingsAvatarSeed = user ? user.avatarSeed : null;

    // 个人资料
    var profileSection = document.getElementById('settings-profile');
    if (user) {
        if (profileSection) profileSection.style.display = 'block';
        var avatarImg = document.getElementById('settings-avatar');
        if (avatarImg) avatarImg.src = getAvatarUrl(user.avatarSeed, 64);
        var nickInput = document.getElementById('settings-nickname');
        if (nickInput) nickInput.value = user.nickname || '';
        var bioInput = document.getElementById('settings-bio');
        if (bioInput) bioInput.value = user.bio || '';
        var uidEl = document.getElementById('settings-uid');
        if (uidEl) uidEl.textContent = user.uid || '-';
        var emailEl = document.getElementById('settings-email');
        if (emailEl) emailEl.textContent = user.email || '-';
    } else {
        if (profileSection) profileSection.style.display = 'none';
    }

    // 版本号
    var verEl = document.getElementById('settings-version');
    if (verEl) verEl.textContent = 'V' + APP_VERSION;

    // 飞书绑定状态
    renderFeishuBindSection();

    document.getElementById('settings-modal').classList.add('active');
}

export function closeSettings() {
    settingsGoHome();
    document.getElementById('settings-modal').classList.remove('active');
}

function closeSettingsOnBackdrop(e) {
    if (e.target.id === 'settings-modal') closeSettings();
}

// ---- 子页面导航 ----
var PAGE_TITLES = {
    guide: '使用指南',
    changelog: '版本日志',
    agreement: '用户协议',
    privacy: '隐私政策'
};

export function settingsNavigate(page) {
    var home = document.getElementById('settings-home');
    var backBtn = document.getElementById('settings-back-btn');
    var title = document.getElementById('settings-header-title');

    if (home) home.classList.remove('active');
    if (backBtn) backBtn.classList.add('visible');
    if (title) title.textContent = PAGE_TITLES[page] || page;

    // 隐藏其他子页面
    ['guide', 'changelog', 'agreement', 'privacy'].forEach(function(p) {
        var el = document.getElementById('settings-sub-' + p);
        if (el) el.classList.remove('active');
    });

    var subPage = document.getElementById('settings-sub-' + page);
    if (!subPage) return;

    // 渲染内容
    renderSubPageContent(page, subPage);
    subPage.classList.add('active');
    subPage.scrollTop = 0;

    // 滚动 modal-content 到顶部
    var modalContent = subPage.closest('.modal-content');
    if (modalContent) modalContent.scrollTop = 0;
}

export function settingsGoHome() {
    var home = document.getElementById('settings-home');
    var backBtn = document.getElementById('settings-back-btn');
    var title = document.getElementById('settings-header-title');

    if (home) home.classList.add('active');
    if (backBtn) backBtn.classList.remove('visible');
    if (title) title.textContent = '设置';

    ['guide', 'changelog', 'agreement', 'privacy'].forEach(function(p) {
        var el = document.getElementById('settings-sub-' + p);
        if (el) el.classList.remove('active');
    });
}

function renderSubPageContent(page, container) {
    if (page === 'guide') {
        container.innerHTML = '<div class="settings-sub-content">' +
            '<div class="guide-sidebar" id="settings-guide-sidebar">' +
            GUIDE_SECTIONS.map(function(s, i) {
                return '<button class="guide-nav-btn' + (i === 0 ? ' active' : '') + '" onclick="settingsSwitchGuideSection(' + i + ')">' + escapeHtml(s.label) + '</button>';
            }).join('') +
            '</div>' +
            '<div class="guide-body" id="settings-guide-body">' +
            GUIDE_SECTIONS[0].content +
            '</div></div>';
    } else if (page === 'changelog') {
        container.innerHTML = '<div class="settings-sub-content" id="settings-changelog-container">' +
            CHANGELOG_CURRENT +
            '<div style="text-align:center;margin-top:1.5rem;padding-top:1rem;border-top:1px solid rgba(84,99,125,0.1);">' +
            '<button class="changelog-history-btn" onclick="settingsShowChangelogHistory()">查看历史版本</button></div></div>';
    } else if (page === 'agreement') {
        container.innerHTML = '<div class="settings-sub-content">' + USER_AGREEMENT_HTML + '</div>';
    } else if (page === 'privacy') {
        container.innerHTML = '<div class="settings-sub-content">' + PRIVACY_POLICY_HTML + '</div>';
    }
}

export function settingsSwitchGuideSection(index) {
    var body = document.getElementById('settings-guide-body');
    var sidebar = document.getElementById('settings-guide-sidebar');
    if (!body || !sidebar) return;
    body.innerHTML = GUIDE_SECTIONS[index].content;
    sidebar.querySelectorAll('.guide-nav-btn').forEach(function(btn, i) {
        btn.classList.toggle('active', i === index);
    });
    body.scrollTop = 0;
}

export function settingsShowChangelogHistory() {
    var container = document.getElementById('settings-changelog-container');
    var title = document.getElementById('settings-header-title');
    if (!container || !title) return;
    title.textContent = '历史版本日志';
    container.innerHTML = '<div style="text-align:center;margin-bottom:1.2rem;"><button class="changelog-history-btn" onclick="settingsBackToCurrentChangelog()">← 返回当前版本</button></div>' + CHANGELOG_HISTORY;
    container.scrollTop = 0;
}

export function settingsBackToCurrentChangelog() {
    var container = document.getElementById('settings-changelog-container');
    var title = document.getElementById('settings-header-title');
    if (!container || !title) return;
    title.textContent = PAGE_TITLES.changelog;
    container.innerHTML = CHANGELOG_CURRENT +
        '<div style="text-align:center;margin-top:1.5rem;padding-top:1rem;border-top:1px solid rgba(84,99,125,0.1);">' +
        '<button class="changelog-history-btn" onclick="settingsShowChangelogHistory()">查看历史版本</button></div>';
    container.scrollTop = 0;
}

// ---- 保存个人资料 ----
async function saveSettingsProfile() {
    var user = getCurrentUser();
    if (!user) return;
    var nickname = document.getElementById('settings-nickname').value.trim();
    var bio = document.getElementById('settings-bio').value.trim();
    if (!nickname) { showAiToast('昵称不能为空'); return; }
    try {
        var res = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + user.token },
            body: JSON.stringify({ nickname: nickname, avatar_seed: _settingsAvatarSeed || user.avatarSeed, bio: bio })
        });
        if (!res.ok) { var data = await res.json(); showAiToast(data.error || '保存失败'); return; }
        var data = await res.json();
        user.nickname = data.profile.nickname;
        user.avatarSeed = data.profile.avatar_seed;
        user.bio = data.profile.bio;
        localStorage.setItem('myscore_auth', JSON.stringify(user));
        if (window.updateLoginButton) window.updateLoginButton();
        showAiToast('资料已保存');
        logEvent('profile', { action: 'save' });
    } catch (e) { showAiToast('网络错误'); }
}

// ---- 头像选择 ----
function openSettingsAvatarPicker() {
    var grid = document.getElementById('settings-avatar-grid');
    if (!grid) return;
    import('./config.js').then(function(config) {
        grid.innerHTML = '';
        config.AVATAR_OPTIONS.forEach(function(opt) {
            var div = document.createElement('div');
            div.className = 'avatar-option' + (opt.seed === _settingsAvatarSeed ? ' selected' : '');
            div.innerHTML = '<img src="' + getAvatarUrl(opt.seed, 64) + '" alt="' + escapeHtml(opt.label) + '"><span>' + escapeHtml(opt.label) + '</span>';
            div.onclick = function() {
                grid.querySelectorAll('.avatar-option').forEach(function(el) { el.classList.remove('selected'); });
                div.classList.add('selected');
                _settingsAvatarSeed = opt.seed;
                var avatarImg = document.getElementById('settings-avatar');
                if (avatarImg) avatarImg.src = getAvatarUrl(opt.seed, 64);
            };
            grid.appendChild(div);
        });
    });
    grid.style.display = grid.style.display === 'none' ? 'grid' : 'none';
}

// ---- 清除数据 ----
function clearAllData() {
    if (!confirm('确定要清除所有本地数据？此操作不可恢复！')) return;
    if (!confirm('再次确认：清除所有成绩、自定义考试和游戏化数据？')) return;
    saveRecords([]);
    saveCustom({});
    localStorage.removeItem('myscore_streak_data');
    localStorage.removeItem('myscore_xp_data');
    localStorage.removeItem('myscore_achievements');
    localStorage.removeItem('myscore_daily_xp');
    localStorage.removeItem('myscore_goals');
    localStorage.removeItem('myscore_ai_debated');
    showAiToast('数据已清除');
    logEvent('data', { action: 'clear-all' });
    if (window.renderDashboard) window.renderDashboard();
    closeSettings();
}

// ---- 飞书集成 ----

var _feishuBindTimer = null;

function renderFeishuBindSection() {
    var container = document.getElementById('feishu-bind-status');
    if (!container) return;
    var user = getCurrentUser();

    if (!user) {
        container.innerHTML = '<div class="feishu-bind-card"><p style="color:var(--text-muted);font-size:0.85rem;">登录后可绑定飞书机器人，接收成绩通知</p></div>';
        return;
    }

    if (user.feishuOpenId) {
        container.innerHTML = '<div class="feishu-bind-card feishu-bound-status">' +
            '<div style="display:flex;align-items:center;gap:0.5rem;">' +
            '<span class="feishu-status-dot"></span>' +
            '<span style="color:var(--accent);font-weight:600;">已绑定飞书</span></div>' +
            '<p style="color:var(--text-muted);font-size:0.8rem;margin-top:0.35rem;">录入成绩后将自动推送通知到飞书</p>' +
            '<button class="btn-secondary" onclick="unbindFeishu()" style="margin-top:0.75rem;width:100%;">解绑飞书</button></div>';
        return;
    }

    container.innerHTML = '<div class="feishu-bind-card">' +
        '<p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:0.75rem;">绑定后可在飞书接收成绩通知、查询成绩和成就</p>' +
        '<button class="btn-primary" onclick="requestFeishuBindCode()" style="width:100%;">绑定飞书机器人</button></div>';
}

async function requestFeishuBindCode() {
    var container = document.getElementById('feishu-bind-status');
    var user = getCurrentUser();
    if (!user || !user.token) return;

    container.innerHTML = '<div class="feishu-bind-card"><div style="text-align:center;padding:1rem 0;"><div class="feishu-spinner"></div><p style="color:var(--text-muted);margin-top:0.5rem;">正在生成绑定码...</p></div></div>';

    try {
        var res = await fetch('/api/feishu/bind', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + user.token }
        });
        var data = await res.json();
        if (!data.ok) throw new Error(data.error || '生成失败');

        renderBindCodeDisplay(data.code);
    } catch (e) {
        container.innerHTML = '<div class="feishu-bind-card"><p style="color:#ef4444;">' + (e.message || '网络错误') + '</p>' +
            '<button class="btn-secondary" onclick="requestFeishuBindCode()" style="margin-top:0.75rem;width:100%;">重试</button></div>';
    }
}

function renderBindCodeDisplay(code) {
    var container = document.getElementById('feishu-bind-status');
    var secondsLeft = 300;

    function updateDisplay() {
        var m = Math.floor(secondsLeft / 60);
        var s = secondsLeft % 60;
        var timeStr = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');

        container.innerHTML = '<div class="feishu-bind-card">' +
            '<div style="text-align:center;">' +
            '<p style="color:var(--text-secondary);font-size:0.875rem;font-weight:500;">请在飞书中向 MyScore 机器人发送：</p>' +
            '<div class="feishu-code-display">' + code + '</div>' +
            '<p style="color:var(--text-muted);font-size:0.8rem;margin-top:0.5rem;">发送内容：<code style="background:rgba(39,91,86,0.08);padding:2px 8px;border-radius:4px;font-size:0.85rem;color:var(--accent);">绑定 ' + code + '</code></p>' +
            '<div class="feishu-countdown" id="feishu-timer">⏱ ' + timeStr + ' 后过期</div>' +
            '<button class="btn-secondary" onclick="checkFeishuBindStatus()" style="margin-top:1rem;width:100%;">我已发送，检查状态</button>' +
            '</div></div>';

        if (secondsLeft <= 0) {
            clearInterval(_feishuBindTimer);
            _feishuBindTimer = null;
            container.innerHTML = '<div class="feishu-bind-card"><p style="color:#f59e0b;">绑定码已过期</p>' +
                '<button class="btn-primary" onclick="requestFeishuBindCode()" style="margin-top:0.75rem;width:100%;">重新获取</button></div>';
        }
        secondsLeft--;
    }

    updateDisplay();
    _feishuBindTimer = setInterval(updateDisplay, 1000);
}

async function checkFeishuBindStatus() {
    if (_feishuBindTimer) { clearInterval(_feishuBindTimer); _feishuBindTimer = null; }
    var user = getCurrentUser();
    if (!user || !user.token) return;

    try {
        var res = await fetch('/api/auth/profile', {
            headers: { 'Authorization': 'Bearer ' + user.token }
        });
        var data = await res.json();
        if (data.ok && data.profile && data.profile.feishu_open_id) {
            user.feishuOpenId = data.profile.feishu_open_id;
            localStorage.setItem('myscore_auth', JSON.stringify(user));
            showAiToast('飞书绑定成功！');
            logEvent('feishu', { action: 'bind-success' });
            renderFeishuBindSection();
        } else {
            showAiToast('尚未检测到绑定，请确认已在飞书中发送绑定码');
            requestFeishuBindCode();
        }
    } catch (e) {
        showAiToast('检查状态失败，请重试');
    }
}

function unbindFeishu() {
    if (!confirm('确定要解绑飞书吗？解绑后将不再接收成绩通知。')) return;
    var user = getCurrentUser();
    if (!user) return;
    delete user.feishuOpenId;
    localStorage.setItem('myscore_auth', JSON.stringify(user));
    fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + user.token },
        body: JSON.stringify({ feishu_open_id: null })
    }).catch(function () {});
    showAiToast('已解绑飞书');
    logEvent('feishu', { action: 'unbind' });
    renderFeishuBindSection();
}

// ---- 挂载到 window ----
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.closeSettingsOnBackdrop = closeSettingsOnBackdrop;
window.saveSettingsProfile = saveSettingsProfile;
window.openSettingsAvatarPicker = openSettingsAvatarPicker;
window.clearAllData = clearAllData;

window.settingsNavigate = settingsNavigate;
window.settingsGoHome = settingsGoHome;
window.settingsSwitchGuideSection = settingsSwitchGuideSection;
window.settingsShowChangelogHistory = settingsShowChangelogHistory;
window.settingsBackToCurrentChangelog = settingsBackToCurrentChangelog;
window.requestFeishuBindCode = requestFeishuBindCode;
window.checkFeishuBindStatus = checkFeishuBindStatus;
window.unbindFeishu = unbindFeishu;
