// ==================== 主入口 ====================
import { APP_VERSION, BETA_BANNER } from './config.js';
import { restoreSession, _isSyncing } from './auth.js';
import { renderExamSelector, resetEntryState } from './entry.js';
import { renderCustomList } from './custom.js';
import { renderDashboard } from './dashboard.js';
import { maybeShowChangelogOnFirstOpen } from './info.js';
import { loadTutuerHistory, renderTutuerMessages, setTutuerUnread, bindTutuerViewportEvents } from './tutuer.js';
import { updatePetMood, initPetDraggable } from './pet.js';

// 导入 side-effect 模块（它们自注册 window 函数）
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
        document.getElementById('entry-form-container').innerHTML = '<div class="empty-state"><svg width="64" height="64" fill="none" stroke="#d1d5db" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom:1rem;"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg><p style="color:#6b7280;margin-bottom:1rem;">还没有成绩记录</p><button onclick="showPage(\'entry\')" style="color:#10b981;font-weight:600;background:none;border:none;cursor:pointer;">开始录入 →</button></div>';
    }
    else if (p === 'custom') renderCustomList();
}
window.showPage = showPage;

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', function () {
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
    renderDashboard();
    maybeShowChangelogOnFirstOpen();
    loadTutuerHistory();
    renderTutuerMessages();
    setTutuerUnread(false);
    bindTutuerViewportEvents();
    updatePetMood();
    initPetDraggable();
});
