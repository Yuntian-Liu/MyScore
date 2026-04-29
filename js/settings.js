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
