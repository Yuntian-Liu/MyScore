// ==================== 主入口 ====================
import { APP_VERSION, BETA_BANNER } from './config.js';
import { restoreSession, _isSyncing } from './auth.js';
import { renderExamSelector, resetEntryState } from './entry.js';
import { renderCustomList } from './custom.js';
import { renderDashboard } from './dashboard.js';
import { maybeShowChangelogOnFirstOpen } from './info.js';
import { loadTutuerHistory, renderTutuerMessages, setTutuerUnread, bindTutuerViewportEvents } from './tutuer.js';
import { updatePetMood, initPetDraggable } from './pet.js';
import { updateStreak, checkAchievements } from './gamification.js';

// 导入 side-effect 模块（它们自注册 window 函数）
import { logEvent } from './logger.js';
import './settings.js';
import './ai.js';
import './report.js';

// ==================== 页面切换 ====================
function showPage(p) {
    if (_isSyncing) return;
    document.querySelectorAll('.page').forEach(el => el.classList.add('hidden'));
    var pageEl = document.getElementById('page-' + p);
    if (!pageEl) return;
    pageEl.classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    var navEl = document.getElementById('nav-' + p);
    if (navEl) navEl.classList.add('active');

    if (p === 'dashboard') renderDashboard();
    else if (p === 'entry') {
        resetEntryState();
        renderExamSelector();
        document.getElementById('entry-form-container').innerHTML = '<div class="empty-state"><svg width="64" height="64" fill="none" stroke="#d1d5db" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom:1rem;"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg><p style="color:#9ca3af;">请选择考试类型开始录入</p></div>';
    }
    else if (p === 'custom') renderCustomList();
}
window.showPage = showPage;

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', function () {
    // 记录启动事件
    logEvent('app', { version: APP_VERSION, online: navigator.onLine });
    // ==================== 开屏动画 ====================
    (function initSplash() {
        var splash = document.getElementById('splash-screen');
        if (!splash) return;

        if (sessionStorage.getItem('myscore_splash_shown')) {
            splash.remove();
            return;
        }
        sessionStorage.setItem('myscore_splash_shown', '1');

        var ver = document.getElementById('splash-version');
        if (ver) ver.textContent = 'V' + APP_VERSION;

        var fontReady = document.fonts ? document.fonts.load("96px 'Great Vibes'") : Promise.resolve();
        fontReady.catch(function() {}).then(function() {
            var dismissed = false;
            function dismissSplash() {
                if (dismissed || !splash.parentNode) return;
                dismissed = true;
                splash.classList.add('fade-out');
                setTimeout(function() { splash.remove(); }, 800);
            }

            var skipBtn = document.getElementById('splash-skip');
            if (skipBtn) skipBtn.addEventListener('click', dismissSplash);

            setTimeout(dismissSplash, 4000);
        });
    })();

    // ==================== 内测感谢 Banner ====================
    function renderBetaBanner() {
        var el = document.getElementById("beta-banner");
        if (!el) return;
        if (!BETA_BANNER.enabled) { el.classList.add("hidden"); return; }
        var content = BETA_BANNER.items.join(" · ");
        var scrollContent = "<span>" + content + "</span><span>" + content + "</span>";
        el.innerHTML =
            '<div class="banner-badge"><span class="banner-badge-icon">✨</span>内测反馈</div>' +
            '<div class="banner-scroll-wrapper"><div class="banner-scroll-track">' + scrollContent + '</div></div>' +
            '<button class="banner-close" id="banner-close-btn" aria-label="关闭">&times;</button>';
        el.classList.remove("hidden");
        var closeBtn = document.getElementById('banner-close-btn');
        if (closeBtn) closeBtn.addEventListener('click', dismissBanner);
    }
    function dismissBanner() {
        var el = document.getElementById("beta-banner");
        if (el) el.classList.add("hidden");
    }

    renderBetaBanner();
    restoreSession();
    updateStreak();
    // 首次使用（未选模式）时延迟成就检查，避免与模式选择弹窗冲突
    var userMode = localStorage.getItem('myscore_user_mode');
    if (userMode) checkAchievements();
    renderDashboard();
    maybeShowChangelogOnFirstOpen();
    loadTutuerHistory();
    renderTutuerMessages();
    setTutuerUnread(false);
    bindTutuerViewportEvents();
    updatePetMood();
    initPetDraggable();

    // ==================== 快捷工具箱 移动端适配 ====================
    (function initFabToolbar() {
        var toolbar = document.getElementById('fab-toolbar');
        if (!toolbar) return;
        var trigger = toolbar.querySelector('.fab-toolbar-trigger');
        if (trigger) {
            trigger.addEventListener('click', function(e) {
                if ('ontouchstart' in window) {
                    e.preventDefault();
                    toolbar.classList.toggle('expanded');
                }
            });
        }
        document.addEventListener('click', function(e) {
            if (!toolbar.contains(e.target)) {
                toolbar.classList.remove('expanded');
            }
        });
    })();

    // ==================== Service Worker 注册 ====================
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(function(){});
    }

    // ==================== 在线/离线状态监听 ====================
    function updateOnlineStatus() {
        var banner = document.getElementById('offline-banner');
        if (!banner) return;
        if (navigator.onLine) { banner.classList.add('hidden'); }
        else { banner.classList.remove('hidden'); }
    }
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
});
