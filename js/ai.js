// ==================== AI 评论 / 风格 / 回嘴 / 目标追踪 ====================
import { AI_STYLES, LOCAL_AI_DAILY_LIMIT, COMMENT_API_ENDPOINT } from './config.js';
import { escapeHtml, showAiToast, postComment, postCommentStream } from './utils.js';
import { isLoggedIn, getUserMode, getLocalAiUsage, incrementLocalAiUsage, isLocalAiLimitReached } from './auth.js';
import { addXP, checkAchievements } from './gamification.js';
import { logEvent } from './logger.js';

// AI 风格状态
export let currentAiStyle = localStorage.getItem('myscore_ai_style') || 'storm';
var aiStyleLocked = false;
var aiStyleCooldown = false;

// AI 评论上下文
let lastExamType = '';
let lastScore = 0;
let lastHistory = [];
let lastAiComment = '';
let lastAiCacheKey = '';

// 供 auth.js 退出登录时重置缓存
window._resetAiCache = function() { lastAiCacheKey = ''; lastAiComment = ''; };
window._setCurrentAiStyle = function(s) { currentAiStyle = s; };

export function setAiStyle(styleKey) {
    if (!AI_STYLES[styleKey]) return;
    var prevStyle = currentAiStyle;
    currentAiStyle = styleKey;
    localStorage.setItem('myscore_ai_style', styleKey);
    if (window.scheduleCloudSync) window.scheduleCloudSync();
    document.querySelectorAll('#panel-ai-style-bar button').forEach(function(btn) {
        btn.style.background = 'rgba(255,251,245,0.95)';
        btn.style.borderColor = 'rgba(81,63,44,0.12)';
        btn.style.color = '#8e5520';
    });
    var active = document.getElementById('style-' + styleKey);
    if (active) {
        active.style.background = 'rgba(31,106,82,0.12)';
        active.style.borderColor = 'rgba(31,106,82,0.2)';
        active.style.color = '#174f3d';
    }
    if (prevStyle !== styleKey && lastExamType && lastScore) {
        addXP('style');
        if (aiStyleLocked || aiStyleCooldown) { showAiToast('您点得太快啦~ 老师还在赶来的路上'); return; }
        fetchAIComment(lastExamType, lastScore, lastHistory);
    }
}

// ---- AI 评论主逻辑 ----
export async function fetchAIComment(examType, currentScore, historyScores) {
    lastExamType = examType;
    lastScore = currentScore;
    lastHistory = historyScores;

    const container = document.getElementById('ai-container');
    const box = document.getElementById('ai-comment-box');
    const actions = document.getElementById('ai-actions');
    const replyArea = document.getElementById('reply-input-area');
    if (!container) return;
    aiStyleLocked = true;
    container.style.display = 'block';
    actions.style.display = 'none';
    replyArea.style.display = 'none';
    box.innerHTML = '🤖 ' + AI_STYLES[currentAiStyle].teacherName + '正在推眼镜分析你的成绩...';
    box.style.background = 'rgba(221,238,231,0.72)';
    box.style.color = '#174f3d';
    box.style.borderColor = 'rgba(31,106,82,0.14)';
    setAiStyle(currentAiStyle);

    try {
        // 优先尝试流式输出
        var streamOk = false;
        try {
            var streamFullText = '';
            var streamStart = Date.now();
            box.innerHTML = '<strong>🤖 ' + AI_STYLES[currentAiStyle].teacherName + '：</strong> <span class="ai-thinking-dots">正在思考</span><span id="ai-stream-text" style="display:none;"></span><span id="ai-cursor" class="ai-cursor" style="display:none;">|</span>';
            box.style.background = 'rgba(221,238,231,0.72)';
            box.style.color = '#174f3d';
            box.style.borderColor = 'rgba(31,106,82,0.14)';

            streamFullText = await postCommentStream(
                { examType, currentScore, historyScores, style: currentAiStyle },
                function onChunk(delta, full) {
                    var thinking = box.querySelector('.ai-thinking-dots');
                    if (thinking) thinking.style.display = 'none';
                    var span = document.getElementById('ai-stream-text');
                    var cursor = document.getElementById('ai-cursor');
                    if (span) { span.style.display = 'inline'; span.textContent = full; }
                    if (cursor) cursor.style.display = 'inline';
                }
            );
            // 流结束后移除光标
            var cursor = document.getElementById('ai-cursor');
            if (cursor) cursor.style.display = 'none';
            streamOk = true;

            if (streamFullText) {
                lastAiComment = streamFullText;
                renderAiComment(box, streamFullText, currentAiStyle);
                actions.style.display = 'flex';
                var truncated = !/[。！？.!?\n\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]$/u.test(streamFullText.trim());
                logEvent('ai-comment', { examType, style: currentAiStyle, length: streamFullText.length, truncated: truncated, duration: Date.now() - streamStart, stream: true });
            } else { box.innerHTML = '老师去吃饭了...'; }
        } catch (streamErr) {
            // 流式失败，fallback 到非流式
            if (!streamOk) {
                var data = await postComment({ examType, currentScore, historyScores, style: currentAiStyle });
                if (data.comment) {
                    lastAiComment = data.comment;
                    renderAiComment(box, data.comment, currentAiStyle);
                    actions.style.display = 'flex';
                    var comment = data.comment;
                    var truncated = !/[。！？.!?\n\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]$/u.test(comment.trim());
                    logEvent('ai-comment', { examType, style: currentAiStyle, length: comment.length, truncated: truncated, duration: data._duration, stream: false });
                } else { box.innerHTML = '老师去吃饭了...'; }
            }
        }
    } catch (err) { console.error(err); logEvent('ai-error', { examType, status: err.status || 0, duration: err.duration, error: err.message }); box.innerHTML = '老师断线了...'; }
    finally { aiStyleLocked = false; aiStyleCooldown = true; setTimeout(function() { aiStyleCooldown = false; }, 3000); }
}

export function renderAiComment(box, rawComment, style) {
    var styleKey = style || currentAiStyle;
    var teacherName = (AI_STYLES[styleKey] || AI_STYLES.storm).teacherName;
    var parts = rawComment.split('|||');
    var mainComment = parts[0] ? parts[0].trim() : rawComment;
    var suggestion = parts[1] ? parts[1].trim() : '';
    var html = '<strong>👩‍🏫 ' + teacherName + '：</strong> ' + escapeHtml(mainComment);
    if (suggestion) {
        var sugId = 'sug-' + Date.now();
        html += '<br><span onclick="toggleSuggestion(\'' + sugId + '\')" style="display:inline-block; margin-top:0.4rem; font-size:0.82rem; color:#1f6a52; cursor:pointer; font-weight:600;" class="sug-toggle">展开建议 ▾</span>';
        html += '<div id="' + sugId + '" style="display:none; margin-top:0.35rem; padding:0.5rem 0.7rem; background:rgba(31,106,82,0.06); border-radius:0.7rem; font-size:0.88rem; color:#174f3d; line-height:1.6;">' + escapeHtml(suggestion) + '</div>';
    }
    box.innerHTML = html;
}

function toggleSuggestion(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var toggle = el.previousElementSibling;
    if (el.style.display === 'none') { el.style.display = 'block'; if (toggle) toggle.textContent = '收起建议 ▴'; }
    else { el.style.display = 'none'; if (toggle) toggle.textContent = '展开建议 ▾'; }
}

// ---- 回嘴 ----
function showReplyInput() {
    document.getElementById('reply-input-area').style.display = 'block';
    document.getElementById('ai-actions').style.display = 'none';
    document.getElementById('user-rebuttal').focus();
}

async function sendRebuttal() {
    const input = document.getElementById('user-rebuttal');
    const rebuttal = input.value.trim();
    if (!rebuttal) return;
    const box = document.getElementById('ai-comment-box');
    box.innerHTML = '<strong>😤 你：</strong> ' + escapeHtml(rebuttal) + '<br><hr style="margin:8px 0; border:0; border-top:1px dashed #a7f3d0">🤖 ' + AI_STYLES[currentAiStyle].thinkingText;
    box.style.background = 'rgba(243,224,207,0.82)';
    box.style.color = '#8e5520';
    box.style.borderColor = 'rgba(188,108,37,0.24)';
    document.getElementById('reply-input-area').style.display = 'none';
    try {
        const data = await postComment({
            examType: lastExamType, currentScore: lastScore, historyScores: lastHistory,
            userRebuttal: rebuttal, previousComment: lastAiComment, style: currentAiStyle
        });
        if (data.comment) {
            lastAiComment = data.comment;
            box.innerHTML = '<strong>😤 你：</strong> ' + escapeHtml(rebuttal) + '<br><br><strong>👩‍🏫 ' + AI_STYLES[currentAiStyle].teacherName + '：</strong> ' + escapeHtml(data.comment);
            document.getElementById('ai-actions').style.display = 'flex';
            input.value = '';
            addXP('rebuttal');
            localStorage.setItem('myscore_ai_debated', '1');
            logEvent('ai-rebuttal', { examType: lastExamType, style: currentAiStyle, length: data.comment.length, duration: data._duration });
        }
    } catch (err) { console.error(err); logEvent('ai-error', { examType: lastExamType, type: 'rebuttal', status: err.status || 0, duration: err.duration, error: err.message }); box.innerHTML += '<br>(老师被气得掉线了)'; }
}

// ---- 目标追踪 ----
function getGoal(examType) {
    try { var goals = JSON.parse(localStorage.getItem('myscore_goals') || '{}'); return goals[examType] || null; } catch { return null; }
}

function saveGoal(examType, target) {
    try {
        var goals = JSON.parse(localStorage.getItem('myscore_goals') || '{}');
        goals[examType] = target;
        localStorage.setItem('myscore_goals', JSON.stringify(goals));
        if (window.scheduleCloudSync) window.scheduleCloudSync();
    } catch {}
}

var _goalExamType = null;

function promptSetGoal(examType) {
    _goalExamType = examType;
    var current = getGoal(examType);
    var overlay = document.getElementById('goal-overlay');
    var input = document.getElementById('goal-overlay-input');
    var title = document.getElementById('goal-overlay-title');
    title.textContent = '设置目标分数' + (current ? '（当前：' + current.toFixed(1) + '）' : '');
    input.value = current ? current.toFixed(1) : '';
    overlay.style.display = 'flex';
    setTimeout(function() { input.focus(); input.select(); }, 100);
}

function confirmGoal() {
    if (!_goalExamType) return;
    var input = document.getElementById('goal-overlay-input');
    var val = parseFloat(input.value.trim());
    if (isNaN(val) || val <= 0) { alert('请输入有效的正数'); return; }
    saveGoal(_goalExamType, val);
    addXP('goal');
    document.getElementById('goal-overlay').style.display = 'none';
    _goalExamType = null;
    if (window.renderDashboard) window.renderDashboard();
}

function cancelGoal() { document.getElementById('goal-overlay').style.display = 'none'; _goalExamType = null; }

// ---- 本地模式 AI ----
export function triggerLocalAiComment(exam, last, historyRecs, aiCacheKey) {
    if (window._auth_justLoggedOut) {
        window._auth_justLoggedOut = false;
        showModeChoiceModal(function(chosenMode) {
            if (chosenMode === 'local') triggerLocalAiComment(exam, last, historyRecs, aiCacheKey);
        });
        return;
    }
    if (isLocalAiLimitReached()) {
        showLocalAiLimitModal();
        showLocalAiHint();
        const box = document.getElementById('ai-comment-box');
        const container = document.getElementById('ai-container');
        if (container) container.style.display = 'block';
        if (box) box.innerHTML = '<span style="color:#9ca3af;">今日 AI 评论次数已用完</span>';
        return;
    }
    if (aiCacheKey !== lastAiCacheKey) {
        lastAiCacheKey = aiCacheKey;
        fetchAIComment(exam ? exam.name : last.examType, last.total, historyRecs).then(function() {
            incrementLocalAiUsage(); showLocalAiHint();
        }).catch(function() { showLocalAiHint(); });
    } else {
        const box = document.getElementById('ai-comment-box');
        const container = document.getElementById('ai-container');
        const actions = document.getElementById('ai-actions');
        if (container) container.style.display = 'block';
        if (box && lastAiComment) renderAiComment(box, lastAiComment);
        if (actions) actions.style.display = 'flex';
        showLocalAiHint();
    }
}

export function showLocalAiHint() {
    var hint = document.getElementById('local-ai-hint');
    if (!hint || isLoggedIn()) return;
    var usage = getLocalAiUsage();
    hint.innerHTML = '本地模式 · 今日已用 ' + usage.count + '/' + LOCAL_AI_DAILY_LIMIT + ' 次 · <a href="#" onclick="openLoginModal();return false;" style="color:#6366f1;font-weight:600;">登录解锁完整功能</a>';
    hint.style.display = 'block';
}

export function hideLocalAiHint() {
    var hint = document.getElementById('local-ai-hint');
    if (hint) hint.style.display = 'none';
}

// ---- 模式选择弹窗 ----
export function showModeChoiceModal(onChoice) {
    var overlay = document.getElementById('mode-choice-modal');
    if (!overlay) return;
    overlay.classList.add('active');
    overlay._onChoice = onChoice;
}

function closeModeChoiceModal(choice) {
    var overlay = document.getElementById('mode-choice-modal');
    if (!overlay) return;
    overlay.classList.remove('active');
    if (choice === 'login') { window.openLoginModal(); }
    else if (choice === 'local') { if (window.setUserMode) window.setUserMode('local'); }
    if (choice && overlay._onChoice) overlay._onChoice(choice);
    // 模式选择后补发游戏化通知
    if (choice) { checkAchievements(); }
    // 补发延迟的保存成功 toast
    if (window._pendingSaveToast) {
        window._pendingSaveToast = false;
        setTimeout(function() { showAiToast('成绩保存成功！'); }, 600);
    }
}

function showLocalAiLimitModal() {
    var overlay = document.getElementById('local-ai-limit-modal');
    if (overlay) overlay.classList.add('active');
}

function closeLocalAiLimitModal(goLogin) {
    var overlay = document.getElementById('local-ai-limit-modal');
    if (overlay) overlay.classList.remove('active');
    if (goLogin) window.openLoginModal();
}

// 导出缓存供 dashboard 使用
export function getAiCache() { return { lastAiCacheKey, lastAiComment, lastExamType, lastScore, lastHistory }; }
export { getGoal };

// ---- 挂载到 window ----
window.setAiStyle = setAiStyle;
window.showReplyInput = showReplyInput;
window.sendRebuttal = sendRebuttal;
window.toggleSuggestion = toggleSuggestion;
window.promptSetGoal = promptSetGoal;
window.confirmGoal = confirmGoal;
window.cancelGoal = cancelGoal;
window.closeModeChoiceModal = closeModeChoiceModal;
window.closeLocalAiLimitModal = closeLocalAiLimitModal;
// setUserMode 已由 auth.js 挂载到 window
