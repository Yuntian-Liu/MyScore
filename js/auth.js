// ==================== 认证 / 用户管理 / 云同步 ====================
import { STORAGE, TURNSTILE_SITE_KEY, AVATAR_OPTIONS, USER_AGREEMENT_HTML, PRIVACY_POLICY_HTML, XP_PER_LEVEL, ACHIEVEMENTS, XP_SOURCES, XP_DAILY_CAP } from './config.js';
import { readStorageJson, escapeHtml, getAvatarUrl, showAiToast } from './utils.js';
import { getRecords, saveRecords, getCustom, saveCustom } from './storage.js';

let currentUser = null;
let syncTimer = null;
let selectedAvatarSeed = 'adventurer';
let loginEmailCache = '';

var turnstileWidgetId = null;
var turnstileReady = false;
var turnstileScriptLoaded = false;

var profilePanelOpen = false;
var hoverCooldown = false;

export var _justLoggedOut = false;
export var _isSyncing = false;

// ---- 公共 API ----
export function isLoggedIn() { return currentUser !== null; }
export function getCurrentUser() { return currentUser; }

export function getUserMode() {
    if (isLoggedIn()) return 'loggedin';
    return localStorage.getItem(STORAGE.USER_MODE) || '';
}

export function setUserMode(mode) {
    localStorage.setItem(STORAGE.USER_MODE, mode);
}

export function getLocalAiUsage() {
    var today = new Date().toISOString().slice(0, 10);
    try {
        var data = JSON.parse(localStorage.getItem(STORAGE.LOCAL_AI_USAGE));
        if (data && data.date === today) return data;
    } catch {}
    return { date: today, count: 0 };
}

export function incrementLocalAiUsage() {
    var usage = getLocalAiUsage();
    usage.count++;
    localStorage.setItem(STORAGE.LOCAL_AI_USAGE, JSON.stringify(usage));
    return usage.count;
}

export function isLocalAiLimitReached() {
    return getLocalAiUsage().count >= 5; // LOCAL_AI_DAILY_LIMIT
}

// ---- 登录流程 ----
function showLoginError(msg) {
    var el = document.getElementById('login-error');
    if (el) { el.textContent = msg; el.style.display = msg ? 'block' : 'none'; }
}

function updateSendCodeBtn() {
    var btn = document.getElementById('btn-send-code');
    var checkbox = document.getElementById('login-agree');
    if (btn && checkbox) {
        var agreed = checkbox.checked;
        var tokenReady = !TURNSTILE_SITE_KEY || getTurnstileToken() !== null;
        btn.disabled = !agreed || !tokenReady;
        btn.style.opacity = (agreed && tokenReady) ? '1' : '0.5';
    }
}

function goToStep(stepId) {
    showLoginError('');
    document.querySelectorAll('.login-step').forEach(function(el) {
        el.classList.remove('active');
    });
    var target = document.getElementById(stepId);
    if (target) target.classList.add('active');
    if (stepId === 'step-avatar') {
        renderAvatarGrid('avatar-grid', selectedAvatarSeed, function(seed) {
            selectedAvatarSeed = seed;
        });
    }
}

function renderAvatarGrid(containerId, currentSeed, onSelect) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    AVATAR_OPTIONS.forEach(function(opt) {
        var div = document.createElement('div');
        div.className = 'avatar-option' + (opt.seed === currentSeed ? ' selected' : '');
        div.innerHTML = '<img src="' + getAvatarUrl(opt.seed, 64) + '" alt="' + opt.label + '"><span>' + opt.label + '</span>';
        div.onclick = function() {
            container.querySelectorAll('.avatar-option').forEach(function(el) { el.classList.remove('selected'); });
            div.classList.add('selected');
            if (onSelect) onSelect(opt.seed);
        };
        container.appendChild(div);
    });
}

// ---- Turnstile ----
function loadTurnstileScript() {
    if (turnstileScriptLoaded) return;
    turnstileScriptLoaded = true;
    var script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
    script.async = true;
    document.head.appendChild(script);
}

window.onTurnstileLoad = function() {
    turnstileReady = true;
    renderTurnstileWidget();
};

function renderTurnstileWidget() {
    var container = document.getElementById('turnstile-container');
    if (!container || !TURNSTILE_SITE_KEY) return;
    container.innerHTML = '';
    if (typeof turnstile === 'undefined') return;
    turnstileWidgetId = turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'light',
        callback: function() { updateSendCodeBtn(); },
        'error-callback': function() { updateSendCodeBtn(); },
        'expired-callback': function() { updateSendCodeBtn(); }
    });
}

function initTurnstile() {
    var container = document.getElementById('turnstile-container');
    if (!container) return;
    container.innerHTML = '';
    turnstileWidgetId = null;
    if (!TURNSTILE_SITE_KEY) return;
    if (turnstileReady) { renderTurnstileWidget(); }
    else { loadTurnstileScript(); }
}

function destroyTurnstile() {
    if (turnstileWidgetId !== null && typeof turnstile !== 'undefined') {
        try { turnstile.remove(turnstileWidgetId); } catch (e) {}
    }
    turnstileWidgetId = null;
}

function getTurnstileToken() {
    if (!TURNSTILE_SITE_KEY || typeof turnstile === 'undefined' || turnstileWidgetId === null) return null;
    try { return turnstile.getResponse(turnstileWidgetId); } catch (e) { return null; }
}

function resetTurnstile() {
    if (turnstileWidgetId !== null && typeof turnstile !== 'undefined') {
        try { turnstile.reset(turnstileWidgetId); } catch (e) {}
    }
}

// ---- 登录 / 注册 / 验证 ----
function openLoginModal() {
    var modal = document.getElementById('login-modal');
    if (!modal) return;
    var accountEl = document.getElementById('login-account');
    if (accountEl) accountEl.value = '';
    var pwAccountEl = document.getElementById('login-pw-account');
    if (pwAccountEl) pwAccountEl.value = '';
    document.getElementById('login-code').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-agree').checked = false;
    document.getElementById('reg-nickname').value = '';
    document.getElementById('reg-bio').value = '';
    document.getElementById('reg-password').value = '';
    document.getElementById('reg-password2').value = '';
    document.getElementById('reg-invite-code').value = '';
    selectedAvatarSeed = 'adventurer';
    loginEmailCache = '';
    updateSendCodeBtn();
    showLoginError('');
    initTurnstile();
    goToStep('step-email');
    modal.classList.add('active');
}

function closeLoginModal() {
    destroyTurnstile();
    var modal = document.getElementById('login-modal');
    if (modal) modal.classList.remove('active');
}

async function requestLoginCode() {
    var account = document.getElementById('login-account').value.trim();
    if (!account) { showLoginError('请输入邮箱或 UID'); return; }
    var isUid = /^\d+$/.test(account);
    if (!isUid && !account.includes('@')) { showLoginError('请输入有效的邮箱地址或 UID'); return; }
    var btn = document.getElementById('btn-send-code');
    btn.disabled = true;
    btn.textContent = '发送中...';
    try {
        var body = { account: account };
        var token = getTurnstileToken();
        if (!token && TURNSTILE_SITE_KEY) { showLoginError('人机验证加载中，请稍候再试'); resetTurnstile(); return; }
        if (token) body.turnstileToken = token;
        var res = await fetch('/api/auth/send-code', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        var data = await res.json();
        if (!res.ok) { showLoginError(data.error || '发送失败'); resetTurnstile(); return; }
        loginEmailCache = account;
        document.getElementById('login-email-display').textContent = data.maskedEmail || account;
        goToStep('step-code');
    } catch (e) { showLoginError('网络错误，请检查连接'); }
    finally { btn.disabled = false; btn.textContent = '发送验证码'; updateSendCodeBtn(); }
}

async function submitVerifyCode() {
    var email = loginEmailCache;
    var code = document.getElementById('login-code').value.trim();
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) { showLoginError('请输入6位数字验证码'); return; }
    var btn = document.getElementById('btn-verify');
    btn.disabled = true; btn.textContent = '验证中...';
    try {
        var res = await fetch('/api/auth/login-code', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account: email, code: code })
        });
        var data = await res.json();
        if (!res.ok) { showLoginError(data.error || '验证失败'); return; }
        if (data.isNewUser) { document.getElementById('login-modal-title').textContent = '创建账号'; goToStep('step-invite'); return; }
        onLoginSuccess(data.token, data.user);
    } catch (e) { showLoginError('网络错误，请检查连接'); }
    finally { btn.disabled = false; btn.textContent = '验证'; }
}

async function submitPasswordLogin() {
    var account = document.getElementById('login-pw-account').value.trim();
    var password = document.getElementById('login-password').value;
    if (!account) { showLoginError('请输入邮箱或 UID'); return; }
    if (!password) { showLoginError('请输入密码'); return; }
    var btn = document.getElementById('btn-login-pw');
    btn.disabled = true; btn.textContent = '登录中...';
    try {
        var res = await fetch('/api/auth/login-password', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account: account, password: password })
        });
        var data = await res.json();
        if (!res.ok) { showLoginError(data.error || '登录失败'); return; }
        onLoginSuccess(data.token, data.user);
    } catch (e) { showLoginError('网络错误，请检查连接'); }
    finally { btn.disabled = false; btn.textContent = '登录'; }
}

async function submitRegister() {
    var nickname = document.getElementById('reg-nickname').value.trim();
    var bio = document.getElementById('reg-bio').value.trim();
    var password = document.getElementById('reg-password').value;
    var password2 = document.getElementById('reg-password2').value;
    if (!nickname) { showLoginError('请输入昵称'); return; }
    if (!password || password.length < 6) { showLoginError('密码至少6位'); return; }
    if (password !== password2) { showLoginError('两次密码不一致'); return; }
    var btn = document.getElementById('btn-register');
    btn.disabled = true; btn.textContent = '注册中...';
    try {
        var res = await fetch('/api/auth/register', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: loginEmailCache, code: document.getElementById('login-code').value.trim(),
                nickname: nickname, avatarSeed: selectedAvatarSeed, bio: bio, password: password,
                inviteCode: document.getElementById('reg-invite-code').value.trim()
            })
        });
        var data = await res.json();
        if (!res.ok) { showLoginError(data.error || '注册失败'); return; }
        onLoginSuccess(data.token, data.user);
    } catch (e) { showLoginError('网络错误，请检查连接'); }
    finally { btn.disabled = false; btn.textContent = '完成注册'; }
}

function onLoginSuccess(token, user) {
    var hadLocalRecords = getRecords().length > 0;
    currentUser = {
        userId: user.id, uid: user.uid, email: user.email, nickname: user.nickname,
        avatarSeed: user.avatar_seed, bio: user.bio, isAdmin: user.is_admin, isBeta: user.is_beta, token: token
    };
    localStorage.setItem(STORAGE.AUTH, JSON.stringify(currentUser));
    setUserMode('loggedin');
    closeLoginModal();
    updateLoginButton();
    _isSyncing = true;
    pullFromCloud().then(function() {
        if (hadLocalRecords) pushToCloud();
        _isSyncing = false;
        if (window.renderDashboard) window.renderDashboard();
    }).catch(function() { _isSyncing = false; });
}

// ---- 退出登录 ----
function logout() {
    var overlay = document.getElementById('logout-confirm-modal');
    if (overlay) overlay.classList.add('active');
}

function cancelLogout() {
    var overlay = document.getElementById('logout-confirm-modal');
    if (overlay) overlay.classList.remove('active');
}

function forceLogout() {
    localStorage.removeItem(STORAGE.AUTH);
    localStorage.removeItem(STORAGE.USER_MODE);
    currentUser = null;
    updateLoginButton();
}

function confirmLogout() {
    var overlay = document.getElementById('logout-confirm-modal');
    if (overlay) overlay.classList.remove('active');
    clearTimeout(syncTimer);
    localStorage.removeItem(STORAGE.RECORDS);
    localStorage.removeItem(STORAGE.CUSTOM);
    localStorage.removeItem(STORAGE.AUTH);
    localStorage.removeItem(STORAGE.LOCAL_AI_USAGE);
    localStorage.removeItem('myscore_goals');
    localStorage.removeItem('myscore_ai_style');
    localStorage.removeItem('myscore_tutuer_history');
    localStorage.removeItem(STORAGE.STREAK);
    localStorage.removeItem(STORAGE.XP);
    localStorage.removeItem(STORAGE.ACHIEVEMENTS);
    localStorage.removeItem('myscore_ai_debated');
    localStorage.setItem(STORAGE.USER_MODE, 'local');
    _justLoggedOut = true;
    window._auth_justLoggedOut = true;
    currentUser = null;
    if (window._resetAiCache) window._resetAiCache();
    updateLoginButton();
    if (window.renderDashboard) window.renderDashboard();
}

// ---- 会话恢复 ----
export async function restoreSession() {
    try {
        var saved = JSON.parse(localStorage.getItem(STORAGE.AUTH));
        if (saved && saved.token) {
            currentUser = saved;
            try {
                var res = await fetch('/api/auth/profile', { headers: { 'Authorization': 'Bearer ' + saved.token } });
                if (res.ok) {
                    var data = await res.json();
                    if (data.profile) {
                        currentUser.nickname = data.profile.nickname;
                        currentUser.avatarSeed = data.profile.avatar_seed;
                        currentUser.bio = data.profile.bio;
                        currentUser.isAdmin = data.profile.is_admin;
                        currentUser.isBeta = data.profile.is_beta;
                        currentUser.uid = data.profile.uid;
                        localStorage.setItem(STORAGE.AUTH, JSON.stringify(currentUser));
                    }
                } else if (res.status === 401) { forceLogout(); return; }
            } catch {}
            updateLoginButton();
            pullFromCloud();
        }
    } catch {}
}

// ---- Profile Card / Panel ----
function updateLoginButton() {
    var area = document.getElementById('nav-user-area');
    if (!area) return;
    if (isLoggedIn()) {
        var badges = (currentUser.isAdmin ? '<span class="admin-badge">管理员</span>' : '') +
                     (currentUser.isBeta ? '<span class="beta-badge">内测</span>' : '');
        var _records = getRecords();
        var _examTypes = new Set(_records.map(function(r){return r.examType;})).size;
        // 游戏化摘要
        var xpData = readStorageJson(STORAGE.XP, { total: 0, level: 1 });
        var streakData = readStorageJson(STORAGE.STREAK, {});
        var achData = readStorageJson(STORAGE.ACHIEVEMENTS, []);
        var xpLevel = xpData.level || 1;
        var xpTotal = xpData.total || 0;
        var xpNeeded = XP_PER_LEVEL(xpLevel);
        var xpInLevel = xpNeeded > 0 ? xpTotal % xpNeeded : 0;
        if (xpTotal >= xpNeeded && xpInLevel === 0) xpInLevel = xpNeeded;
        var xpPct = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));
        var streak = streakData.currentStreak || 0;
        var achCount = Array.isArray(achData) ? achData.length : 0;
        var achIcons = achCount > 0 ? ACHIEVEMENTS.filter(function(a) { return achData.indexOf(a.id) !== -1; }).slice(0, 3).map(function(a) { return a.icon; }).join('') : '';
        area.innerHTML =
            '<img class="nav-avatar" id="nav-avatar-img" src="' + getAvatarUrl(currentUser.avatarSeed, 32) + '" alt="avatar" title="点击查看资料" onclick="toggleProfilePanel(event)">' +
            '<div class="profile-panel hidden" id="profile-panel">' +
                '<div class="profile-panel-header">' +
                    '<img class="profile-panel-avatar" src="' + getAvatarUrl(currentUser.avatarSeed, 96) + '" alt="">' +
                    '<div class="profile-panel-info">' +
                        '<div class="profile-panel-name">' + escapeHtml(currentUser.nickname || '') + badges + '</div>' +
                        (currentUser.bio ? '<div class="profile-panel-bio">' + escapeHtml(currentUser.bio) + '</div>' : '') +
                        '<div class="profile-panel-uid">UID: ' + currentUser.uid + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="profile-panel-divider"></div>' +
                // XP 经验条
                '<div class="pp-xp-row" onclick="openProfileCard()" style="cursor:pointer;">' +
                    '<span class="pp-xp-lv">Lv.' + xpLevel + '</span>' +
                    '<div class="pp-xp-track"><div class="pp-xp-fill" style="width:' + xpPct + '%;"></div></div>' +
                    '<span class="pp-xp-text">' + xpInLevel + '/' + xpNeeded + ' XP</span>' +
                '</div>' +
                '<div class="profile-panel-divider"></div>' +
                '<div class="profile-panel-detail"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:.45;"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg><span>' + maskEmail(currentUser.email) + '</span></div>' +
                '<div class="profile-panel-detail"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:.45;"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg><span id="profile-stats">' + _records.length + ' 条记录 · ' + _examTypes + ' 种考试</span></div>' +
                (streak >= 1 ? '<div class="profile-panel-detail"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:#b45309;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H8l5-7v4h3l-5 7z"/></svg><span style="color:#b45309;">' + (streak >= 7 ? '🔥 ' : '⚡ ') + '连续打卡 ' + streak + ' 天</span></div>' : '') +
                (achCount > 0 ? '<div class="profile-panel-detail"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:.45;"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z"/></svg><span>' + achIcons + ' ' + achCount + '/12 成就</span></div>' : '') +
                '<div class="profile-panel-divider"></div>' +
                '<div class="profile-panel-actions">' +
                    '<button class="profile-panel-btn profile-panel-btn-primary" onclick="openProfileCard()">查看名片</button>' +
                    '<button class="profile-panel-btn" onclick="openSettings()">设置</button>' +
                '</div>' +
                '<button class="profile-panel-btn profile-panel-btn-logout" style="width:100%;margin-top:0.4rem;" onclick="logout()">退出登录</button>' +
            '</div>';
    } else {
        area.innerHTML =
            '<button class="nav-btn login-btn" id="nav-login" type="button" onclick="openLoginModal()">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
                '<span>登录</span>' +
            '</button>';
    }
}

function toggleProfilePanel(event) {
    event.stopPropagation();
    if (profilePanelOpen) { hideProfilePanel(); }
    else { var panel = document.getElementById('profile-panel'); if (panel) { panel.classList.remove('hidden'); profilePanelOpen = true; updateProfileStats(); } }
}
function hideProfilePanel() {
    var panel = document.getElementById('profile-panel'); if (panel) panel.classList.add('hidden');
    profilePanelOpen = false; hoverCooldown = true; setTimeout(function() { hoverCooldown = false; }, 350);
}
export { profilePanelOpen, hideProfilePanel };

function maskEmail(email) { if (!email) return ''; var parts = email.split('@'); if (parts.length !== 2) return email; return parts[0][0] + '***@' + parts[1]; }
function updateProfileStats() {
    var records = getRecords(); var count = records.length; var types = new Set(records.map(function(r) { return r.examType; })).size;
    var el = document.getElementById('profile-stats'); if (el) el.textContent = count + ' 条记录 · ' + types + ' 种考试';
}

// ---- 个人名片 Slide Panel ----
window.openProfileCard = function () {
    hideProfilePanel();
    setTimeout(function () {
        renderProfileCardContent();
        if (typeof window.openSlidePanel === 'function') {
            window.openSlidePanel('profile-card-panel');
        } else {
            var el = document.getElementById('profile-card-panel');
            if (el) el.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }, 150);
};

function renderProfileCardContent() {
    var body = document.getElementById('profile-card-body');
    if (!body || !isLoggedIn()) return;
    var user = getCurrentUser();
    var records = getRecords();
    var xpData = readStorageJson(STORAGE.XP, { total: 0, level: 1 });
    var streakData = readStorageJson(STORAGE.STREAK, {});
    var achData = readStorageJson(STORAGE.ACHIEVEMENTS, []);
    var xpLevel = xpData.level || 1;
    var xpTotal = xpData.total || 0;
    var xpNeeded = XP_PER_LEVEL(xpLevel);
    var xpInLevel = xpNeeded > 0 ? xpTotal % xpNeeded : 0;
    if (xpTotal >= xpNeeded && xpInLevel === 0) xpInLevel = xpNeeded;
    var xpPct = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));
    var streak = streakData.currentStreak || 0;
    var longestStreak = streakData.longestStreak || streak;
    var achList = Array.isArray(achData) ? achData : [];
    var badges = (user.isAdmin ? '<span class="admin-badge">管理员</span>' : '') +
                 (user.isBeta ? '<span class="beta-badge">内测</span>' : '');
    // === 区域1: Hero Banner ===
    var html = '<div class="pc-hero">';
    html += '<img class="pc-hero-avatar" src="' + getAvatarUrl(user.avatarSeed, 128) + '" alt="">';
    html += '<div class="pc-hero-name">' + escapeHtml(user.nickname || '') + badges + '</div>';
    html += '<div class="pc-hero-meta"><span>UID ' + user.uid + '</span><span class="pc-hero-dot">·</span><span>' + maskEmail(user.email) + '</span></div>';
    if (user.bio) html += '<div class="pc-hero-bio">' + escapeHtml(user.bio) + '</div>';
    html += '</div>';
    // === 区域2: 等级卡片 ===
    html += '<div class="pc-level-card">';
    html += '<div class="pc-level-num">Lv.' + xpLevel + '</div>';
    html += '<div class="pc-level-bar-track"><div class="pc-level-bar-fill" style="width:' + xpPct + '%;"></div></div>';
    html += '<div class="pc-level-meta"><span>' + xpInLevel + ' / ' + xpNeeded + ' XP</span><span>累计 ' + xpTotal + ' XP</span></div>';
    html += '</div>';
    // === 区域3: 数据概览 ===
    html += '<div class="pc-stats-grid">';
    html += '<div class="pc-stat-item"><div class="pc-stat-icon">📝</div><div class="pc-stat-value">' + records.length + '</div><div class="pc-stat-label">总记录</div></div>';
    html += '<div class="pc-stat-item"><div class="pc-stat-icon">' + (streak >= 7 ? '🔥' : '⚡') + '</div><div class="pc-stat-value">' + streak + '</div><div class="pc-stat-label">连续打卡' + (longestStreak > streak ? '<br><span style="font-size:0.7rem;color:#9ca3af;">最长 ' + longestStreak + ' 天</span>' : '') + '</div></div>';
    html += '<div class="pc-stat-item"><div class="pc-stat-icon">🏅</div><div class="pc-stat-value">' + achList.length + '/12</div><div class="pc-stat-label">已解锁成就</div></div>';
    html += '</div>';
    // === 区域4: 成就墙 ===
    html += '<div class="pc-section-title">成就</div>';
    html += '<div class="pc-ach-grid">';
    ACHIEVEMENTS.forEach(function (a) {
        var done = achList.indexOf(a.id) !== -1;
        html += '<div class="pc-ach-item' + (done ? ' pc-ach-done' : '') + '" title="' + escapeHtml(a.desc) + '">';
        html += '<div class="pc-ach-icon">' + (done ? a.icon : '🔒') + '</div>';
        html += '<div class="pc-ach-name">' + escapeHtml(a.name) + '</div>';
        html += '</div>';
    });
    html += '</div>';
    // === 区域5: 经验来源 ===
    html += '<div class="pc-section-title">经验来源</div>';
    html += '<div class="pc-xp-list">';
    var sourceKeys = Object.keys(XP_SOURCES);
    sourceKeys.forEach(function (key) {
        var src = XP_SOURCES[key];
        var tag = src.once ? '一次性' : (src.daily ? '每日递减' : '');
        html += '<div class="pc-xp-row">';
        html += '<div class="pc-xp-row-left"><span class="pc-xp-tag">' + escapeHtml(src.label) + '</span><span class="pc-xp-desc">' + escapeHtml(src.desc) + '</span></div>';
        html += '<div class="pc-xp-row-right"><span class="pc-xp-val">+' + src.base + ' XP</span>' + (tag ? '<span class="pc-xp-note">' + tag + '</span>' : '') + '</div>';
        html += '</div>';
    });
    html += '<div class="pc-xp-cap">每日上限 ' + XP_DAILY_CAP + ' XP</div>';
    html += '</div>';

    body.innerHTML = html;
}

// dashboard.js 中的 openSlidePanel 需要挂到 window
// 在 main.js 中做桥接

// ---- 编辑资料 ----
function openEditProfileModal() {
    hideProfilePanel();
    var modal = document.getElementById('edit-profile-modal'); if (!modal) return;
    document.getElementById('edit-nickname').value = currentUser.nickname || '';
    document.getElementById('edit-bio').value = currentUser.bio || '';
    renderAvatarGrid('edit-avatar-grid', currentUser.avatarSeed, function(seed) { currentUser._pendingAvatarSeed = seed; });
    currentUser._pendingAvatarSeed = currentUser.avatarSeed;
    var errEl = document.getElementById('edit-profile-error'); if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
    modal.classList.add('active');
}

function closeEditProfileModal() { var modal = document.getElementById('edit-profile-modal'); if (modal) modal.classList.remove('active'); }

async function saveProfile() {
    var nickname = document.getElementById('edit-nickname').value.trim();
    var bio = document.getElementById('edit-bio').value.trim();
    if (!nickname) { var errEl = document.getElementById('edit-profile-error'); if (errEl) { errEl.textContent = '昵称不能为空'; errEl.style.display = 'block'; } return; }
    try {
        var res = await fetch('/api/auth/profile', {
            method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + currentUser.token },
            body: JSON.stringify({ nickname: nickname, avatar_seed: currentUser._pendingAvatarSeed || currentUser.avatarSeed, bio: bio })
        });
        if (!res.ok) { var data = await res.json(); var errEl = document.getElementById('edit-profile-error'); if (errEl) { errEl.textContent = data.error || '保存失败'; errEl.style.display = 'block'; } return; }
        var data = await res.json();
        currentUser.nickname = data.profile.nickname; currentUser.avatarSeed = data.profile.avatar_seed; currentUser.bio = data.profile.bio;
        localStorage.setItem(STORAGE.AUTH, JSON.stringify(currentUser));
        updateLoginButton(); closeEditProfileModal();
    } catch (e) { var errEl = document.getElementById('edit-profile-error'); if (errEl) { errEl.textContent = '网络错误'; errEl.style.display = 'block'; } }
}

// ---- 协议弹窗 ----
function openAgreementModal(type) {
    var modal = document.getElementById('agreement-modal'); if (!modal) return;
    var title = document.getElementById('agreement-modal-title');
    var body = document.getElementById('agreement-modal-body');
    title.textContent = type === 'privacy' ? '隐私政策' : '用户协议';
    body.innerHTML = type === 'privacy' ? PRIVACY_POLICY_HTML : USER_AGREEMENT_HTML;
    modal.classList.add('active');
}

function closeAgreementModal() { var modal = document.getElementById('agreement-modal'); if (modal) modal.classList.remove('active'); }

// ---- 云同步 ----
export function scheduleCloudSync() {
    if (!isLoggedIn()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(pushToCloud, 500);
}

async function pushToCloud() {
    if (!isLoggedIn()) return;
    try {
        await fetch('/api/sync', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + currentUser.token },
            body: JSON.stringify(gatherAllLocalStorage())
        });
    } catch (e) { console.warn('Cloud sync failed:', e); showAiToast('云同步失败，请检查网络连接'); }
}

async function pullFromCloud() {
    if (!isLoggedIn()) return;
    try {
        var res = await fetch('/api/sync', { headers: { 'Authorization': 'Bearer ' + currentUser.token } });
        if (res.status === 401) { forceLogout(); return; }
        if (!res.ok) return;
        var result = await res.json();
        if (result.data) mergeCloudData(result.data);
    } catch (e) { console.warn('Cloud pull failed:', e); showAiToast('云端数据拉取失败，请检查网络连接'); }
}

function gatherAllLocalStorage() {
    return {
        records: readStorageJson(STORAGE.RECORDS, []),
        custom: readStorageJson(STORAGE.CUSTOM, {}),
        goals: readStorageJson('myscore_goals', {}),
        ai_style: localStorage.getItem('myscore_ai_style') || 'storm',
        tutuer_history: readStorageJson('myscore_tutuer_history', []),
        streak_data: readStorageJson(STORAGE.STREAK, {}),
        xp_data: readStorageJson(STORAGE.XP, { total: 0, level: 1 }),
        achievements: readStorageJson(STORAGE.ACHIEVEMENTS, [])
    };
}

function mergeCloudData(cloudData) {
    if (cloudData.records && Array.isArray(cloudData.records) && cloudData.records.length > 0) {
        var localRecords = getRecords();
        var merged = cloudData.records.slice();
        var cloudIds = new Set(merged.map(function(r) { return r.id; }));
        localRecords.forEach(function(r) { if (!cloudIds.has(r.id)) merged.push(r); });
        merged.sort(function(a, b) { return b.id - a.id; });
        saveRecords(merged);
    }
    if (cloudData.custom && typeof cloudData.custom === 'object') {
        var localCustom = getCustom();
        var mergedCustom = Object.assign({}, cloudData.custom, localCustom);
        saveCustom(mergedCustom);
    }
    if (cloudData.goals && typeof cloudData.goals === 'object') {
        try {
            var localGoals = JSON.parse(localStorage.getItem('myscore_goals') || '{}');
            var mergedGoals = Object.assign({}, cloudData.goals, localGoals);
            localStorage.setItem('myscore_goals', JSON.stringify(mergedGoals));
        } catch {}
    }
    if (cloudData.ai_style) {
        localStorage.setItem('myscore_ai_style', cloudData.ai_style);
        if (window._setCurrentAiStyle) window._setCurrentAiStyle(cloudData.ai_style);
    }
    // 合并游戏化数据：streak 取较大值，xp 取较大值，achievements 取并集
    if (cloudData.streak_data && typeof cloudData.streak_data === 'object') {
        try {
            var localStreak = readStorageJson(STORAGE.STREAK, {});
            if ((cloudData.streak_data.currentStreak || 0) > (localStreak.currentStreak || 0)) {
                localStreak.currentStreak = cloudData.streak_data.currentStreak;
            }
            if ((cloudData.streak_data.longestStreak || 0) > (localStreak.longestStreak || 0)) {
                localStreak.longestStreak = cloudData.streak_data.longestStreak;
            }
            localStorage.setItem(STORAGE.STREAK, JSON.stringify(localStreak));
        } catch {}
    }
    if (cloudData.xp_data && typeof cloudData.xp_data === 'object') {
        try {
            var localXp = readStorageJson(STORAGE.XP, { total: 0, level: 1 });
            if ((cloudData.xp_data.total || 0) > localXp.total) {
                localStorage.setItem(STORAGE.XP, JSON.stringify(cloudData.xp_data));
            }
        } catch {}
    }
    if (cloudData.achievements && Array.isArray(cloudData.achievements)) {
        try {
            var localAch = readStorageJson(STORAGE.ACHIEVEMENTS, []);
            cloudData.achievements.forEach(function (id) {
                if (localAch.indexOf(id) === -1) localAch.push(id);
            });
            localStorage.setItem(STORAGE.ACHIEVEMENTS, JSON.stringify(localAch));
        } catch {}
    }
    if (window.renderDashboard) window.renderDashboard();
}

// ---- 挂载到 window（HTML onclick 兼容） ----
window.isLoggedIn = isLoggedIn;
window.getCurrentUser = getCurrentUser;
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.requestLoginCode = requestLoginCode;
window.submitVerifyCode = submitVerifyCode;
window.submitPasswordLogin = submitPasswordLogin;
window.submitRegister = submitRegister;
window.goToStep = goToStep;
window.updateSendCodeBtn = updateSendCodeBtn;
window.logout = logout;
window.cancelLogout = cancelLogout;
window.confirmLogout = confirmLogout;
window.toggleProfilePanel = toggleProfilePanel;
window.hideProfilePanel = hideProfilePanel;
window.openEditProfileModal = openEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.saveProfile = saveProfile;
window.openAgreementModal = openAgreementModal;
window.closeAgreementModal = closeAgreementModal;
window.scheduleCloudSync = scheduleCloudSync;
window.setUserMode = setUserMode;
