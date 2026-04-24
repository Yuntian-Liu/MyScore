// ==================== 突突er 伴学助手 ====================
import { readStorageJson, postComment } from './utils.js';
import { _justLoggedOut, profilePanelOpen, hideProfilePanel } from './auth.js';
import { showModeChoiceModal } from './ai.js';

const TUTUER_HISTORY_KEY = 'myscore_tutuer_history';
let tutuerMessages = [];
let tutuerSending = false;
let tutuerViewportSyncPending = false;

function getTutuerDefaultGreeting() {
    return '我是突突er，今天我会陪你一起学。你可以跟我聊情绪、计划、拖延，或者直接问学习题目。';
}

export function loadTutuerHistory() {
    try {
        const parsed = readStorageJson(TUTUER_HISTORY_KEY, []);
        if (Array.isArray(parsed) && parsed.length) {
            tutuerMessages = parsed.filter(function (m) {
                return m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string';
            }).slice(-30);
            return;
        }
    } catch (e) {}
    tutuerMessages = [{ role: 'assistant', content: getTutuerDefaultGreeting() }];
}

function saveTutuerHistory() {
    localStorage.setItem(TUTUER_HISTORY_KEY, JSON.stringify(tutuerMessages.slice(-30)));
    if (typeof window.scheduleCloudSync === 'function') window.scheduleCloudSync();
}

function clearTutuerHistory() {
    tutuerMessages = [{ role: 'assistant', content: getTutuerDefaultGreeting() }];
    saveTutuerHistory();
    renderTutuerMessages();
}

export function renderTutuerMessages() {
    const list = document.getElementById('tutuer-chat-list');
    if (!list) return;
    list.innerHTML = '';
    for (const msg of tutuerMessages) {
        const bubble = document.createElement('div');
        bubble.className = 'tutuer-msg ' + msg.role;
        bubble.textContent = msg.content;
        list.appendChild(bubble);
    }
    list.scrollTop = list.scrollHeight;
}

function openTutuerPanel() {
    const panel = document.getElementById('tutuer-panel');
    const input = document.getElementById('tutuer-input');
    if (!panel) return;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    panel.classList.remove('hidden');
    panel.classList.remove('expanded-mobile');
    document.body.classList.toggle('tutuer-open-mobile', isMobile);
    syncTutuerExpandBtn();
    setTutuerUnread(false);
    renderTutuerMessages();
    scheduleTutuerViewportSync();
    setTimeout(scheduleTutuerViewportSync, 80);
    setTimeout(scheduleTutuerViewportSync, 220);
    if (input && !isMobile) input.focus();
}

function closeTutuerPanel(event) {
    if (event) event.stopPropagation();
    const panel = document.getElementById('tutuer-panel');
    if (!panel) return;
    panel.classList.add('hidden');
    panel.classList.remove('expanded-mobile');
    panel.classList.remove('keyboard-open-mobile');
    panel.style.removeProperty('bottom');
    panel.style.removeProperty('height');
    panel.style.removeProperty('top');
    document.body.classList.remove('tutuer-open-mobile');
    syncTutuerExpandBtn();
}

function toggleTutuerPanel() {
    const panel = document.getElementById('tutuer-panel');
    if (!panel) return;
    if (panel.classList.contains('hidden')) {
        openTutuerPanel();
    } else {
        closeTutuerPanel();
    }
}

function syncTutuerExpandBtn() {
    const panel = document.getElementById('tutuer-panel');
    const btn = document.getElementById('tutuer-expand-btn');
    if (!panel || !btn) return;
    const expanded = panel.classList.contains('expanded-mobile');
    btn.textContent = expanded ? '⤡' : '⤢';
    btn.setAttribute('aria-label', expanded ? '还原面板' : '展开面板');
    btn.title = expanded ? '还原' : '展开';
}

function toggleTutuerExpand(event) {
    if (event) event.stopPropagation();
    if (!window.matchMedia('(max-width: 768px)').matches) return;
    const panel = document.getElementById('tutuer-panel');
    if (!panel || panel.classList.contains('hidden')) return;
    panel.classList.toggle('expanded-mobile');
    syncTutuerExpandBtn();
    scheduleTutuerViewportSync();
}

function scheduleTutuerViewportSync() {
    if (tutuerViewportSyncPending) return;
    tutuerViewportSyncPending = true;
    requestAnimationFrame(function () {
        tutuerViewportSyncPending = false;
        syncTutuerViewportForKeyboard();
    });
}

function syncTutuerViewportForKeyboard() {
    if (!window.matchMedia('(max-width: 768px)').matches) return;
    const panel = document.getElementById('tutuer-panel');
    if (!panel || panel.classList.contains('hidden')) return;
    const vv = window.visualViewport;
    if (!vv) return;

    const overlap = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
    const keyboardOpen = overlap > 120;

    panel.classList.toggle('keyboard-open-mobile', keyboardOpen);

    if (!keyboardOpen) {
        panel.style.removeProperty('bottom');
        panel.style.removeProperty('height');
        panel.style.removeProperty('top');
        return;
    }

    panel.style.top = 'auto';
    panel.style.bottom = Math.round(overlap + 8) + 'px';

    const expanded = panel.classList.contains('expanded-mobile');
    const targetHeight = expanded
        ? Math.max(260, vv.height - 16)
        : Math.max(240, Math.min(560, vv.height * 0.72));
    panel.style.height = Math.round(targetHeight) + 'px';

    const input = document.getElementById('tutuer-input');
    if (input && document.activeElement === input) {
        setTimeout(function () {
            input.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 60);
    }
}

export function bindTutuerViewportEvents() {
    const input = document.getElementById('tutuer-input');
    if (input) {
        input.addEventListener('focus', function () {
            scheduleTutuerViewportSync();
            setTimeout(scheduleTutuerViewportSync, 120);
            setTimeout(scheduleTutuerViewportSync, 260);
        });
        document.addEventListener('click', function(e) {
            var area = document.getElementById('nav-user-area');
            if (profilePanelOpen && area && !area.contains(e.target)) {
                hideProfilePanel();
            }
        });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && profilePanelOpen) hideProfilePanel();
        });
        input.addEventListener('blur', function () {
            setTimeout(scheduleTutuerViewportSync, 80);
        });
    }

    window.addEventListener('resize', scheduleTutuerViewportSync, { passive: true });
    window.addEventListener('orientationchange', scheduleTutuerViewportSync, { passive: true });
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', scheduleTutuerViewportSync, { passive: true });
        window.visualViewport.addEventListener('scroll', scheduleTutuerViewportSync, { passive: true });
    }
}

function setTutuerLoading(loading) {
    const sending = document.getElementById('tutuer-send-btn');
    if (!sending) return;
    tutuerSending = loading;
    sending.disabled = loading;
    sending.textContent = loading ? '思考中...' : '发送';
}

export function setTutuerUnread(unread) {
    const dot = document.getElementById('tutuer-fab-dot');
    if (!dot) return;
    dot.classList.toggle('hidden', !unread);
}

function getTutuerFallbackReply(userText) {
    if (userText.includes('难受') || userText.includes('焦虑') || userText.includes('压力')) {
        return '先把这件事拆成一小步：现在只做 10 分钟最简单的部分。做完再告诉我感受，我们继续。';
    }
    if (userText.includes('不会') || userText.includes('看不懂')) {
        return '把题目或知识点贴给我，我会先用最简单版本讲一遍，再给你一题练习。';
    }
    return '我在，慢慢说。你可以告诉我你现在最卡的点，我会给你一个可执行的小计划。';
}

function askTutuerStudyPlan() {
    const preset = '请根据我今天的状态，帮我生成一个可执行的今日学习计划（包含：1) 25分钟任务分块 2) 休息节奏 3) 今晚复盘问题）。';
    const input = document.getElementById('tutuer-input');
    openTutuerPanel();
    if (input) {
        input.value = preset;
    }
    sendTutuerMessage();
}

async function sendTutuerMessage() {
    if (tutuerSending) return;
    // 退出登录后首次触发 AI → 弹出模式选择
    if (window._auth_justLoggedOut) {
        window._auth_justLoggedOut = false;
        showModeChoiceModal(function(chosenMode) {
            if (chosenMode === 'local') {
                sendTutuerMessage();
            }
        });
        return;
    }
    const input = document.getElementById('tutuer-input');
    if (!input) return;
    const userText = input.value.trim();
    if (!userText) return;

    tutuerMessages.push({ role: 'user', content: userText });
    input.value = '';
    renderTutuerMessages();
    setTutuerLoading(true);

    try {
        const history = tutuerMessages.slice(-12).map(function (m) {
            return { role: m.role, content: m.content };
        });

        const data = await postComment({
            mode: 'companion',
            userMessage: userText,
            conversationHistory: history
        });
        const reply = data && data.comment ? data.comment : getTutuerFallbackReply(userText);
        tutuerMessages.push({ role: 'assistant', content: reply });
    } catch (err) {
        tutuerMessages.push({ role: 'assistant', content: getTutuerFallbackReply(userText) });
    } finally {
        setTutuerLoading(false);
        saveTutuerHistory();
        renderTutuerMessages();
        const panel = document.getElementById('tutuer-panel');
        if (panel && panel.classList.contains('hidden')) {
            setTutuerUnread(true);
        }
    }
}

function handleTutuerInputKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendTutuerMessage();
    }
}

// ==================== 全局键盘事件 ====================
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        if (typeof window.closeInfoModal === 'function') window.closeInfoModal();
        closeTutuerPanel();
    }
});

// ==================== 挂载到 window ====================
window.openTutuerPanel = openTutuerPanel;
window.closeTutuerPanel = closeTutuerPanel;
window.toggleTutuerPanel = toggleTutuerPanel;
window.toggleTutuerExpand = toggleTutuerExpand;
window.clearTutuerHistory = clearTutuerHistory;
window.askTutuerStudyPlan = askTutuerStudyPlan;
window.sendTutuerMessage = sendTutuerMessage;
window.handleTutuerInputKeydown = handleTutuerInputKeydown;
