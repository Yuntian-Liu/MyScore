// ==================== 仪表盘 / 图表 / 历史记录 ====================
import { STORAGE, ACHIEVEMENTS, XP_PER_LEVEL } from './config.js';
import { escapeHtml, getExamTheme, getExamBadgeMarkup } from './utils.js';
import { getRecords, saveRecords, allExams, buildArchiveHighlights } from './storage.js';
import { isLoggedIn, getUserMode, _isSyncing } from './auth.js';
import { addXP, getGamificationData } from './gamification.js';
import { fetchAIComment, renderAiComment, triggerLocalAiComment, showLocalAiHint, hideLocalAiHint, showModeChoiceModal, getAiCache, getGoal, currentAiStyle } from './ai.js';
import { logEvent } from './logger.js';

let mainChartInstance = null;
let radarChartInstance = null;
let _currentDetailExamType = null;

// ==================== Dashboard 主渲染 ====================

export function renderDashboard() {
    if (typeof window.updatePetMood === 'function') window.updatePetMood();
    addXP('dashboard', { silent: true });

    // 游戏化 UI
    var _gamData = getGamificationData();
    renderXpBar(_gamData.xp);
    renderStreakIndicator(_gamData.streak);
    renderAchievementWall(_gamData.achievements);

    const records = getRecords();
    const exams = allExams();

    // Hero 指标
    document.getElementById('total-count').textContent = records.length;
    const types = [...new Set(records.map(r => r.examType))];
    document.getElementById('exam-types-count').textContent = types.length;
    document.getElementById('record-count').textContent = records.length;
    document.getElementById('latest-exam-date').textContent = records.length ? records[records.length-1].date : '-';

    // Hero 归档
    const archiveGrid = document.getElementById('hero-archive-grid');
    if (archiveGrid) {
        const highlights = buildArchiveHighlights(records, exams);
        if (!highlights.length) {
            archiveGrid.innerHTML = '<div class="hero-archive-pill c1"><div class="hero-archive-pill-head"><span class="hero-archive-name">等待记录</span><span class="hero-archive-value">0次</span></div><div class="hero-archive-meta"><div class="hero-archive-meta-row"><span class="hero-archive-meta-label">最高成绩</span><span class="hero-archive-meta-value">-</span></div><div class="hero-archive-meta-row"><span class="hero-archive-meta-label">最近记录</span><span class="hero-archive-meta-value">开始录入后出现</span></div></div></div>';
        } else {
            archiveGrid.innerHTML = highlights.map(function (item, index) {
                const bestText = item.best === null ? '-' : item.best.toFixed(1);
                const colorClass = 'c' + ((index % 4) + 1);
                const theme = getExamTheme(item.examType);
                return '<div class="hero-archive-pill ' + colorClass + '" style="background:linear-gradient(180deg,#ffffff,' + theme.soft + ');border-color:' + theme.accent + '30;"><div class="hero-archive-pill-head"><span class="hero-archive-name" style="color:' + theme.strong + ';">' + escapeHtml(item.name) + '</span><span class="hero-archive-value" style="color:' + theme.strong + ';">' + item.count + '次</span></div><div class="hero-archive-meta"><div class="hero-archive-meta-row"><span class="hero-archive-meta-label">最高成绩</span><span class="hero-archive-meta-value">' + escapeHtml(bestText) + '</span></div><div class="hero-archive-meta-row"><span class="hero-archive-meta-label">最近记录</span><span class="hero-archive-meta-value">' + escapeHtml(item.lastDate) + '</span></div></div></div>';
            }).join('');
        }
    }

    // 最近成绩摘要
    renderRecentSummary(records, exams);

    // 考试类型概览
    renderExamTypeGrid(records, exams, types);
}

// ==================== 最近成绩摘要 ====================

function renderRecentSummary(records, exams) {
    var div = document.getElementById('recent-summary-content');
    var aiPreview = document.getElementById('ai-preview');
    if (!div) return;

    if (!records.length) {
        div.innerHTML = '<div class="empty-state"><svg width="64" height="64" fill="none" stroke="#d1d5db" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom:1rem;"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg><p style="color:#6b7280;margin-bottom:1rem;">还没有成绩记录</p><button onclick="showPage(\'entry\')" style="color:#10b981;font-weight:600;background:none;border:none;cursor:pointer;">开始录入 →</button></div>';
        if (aiPreview) aiPreview.style.display = 'none';
        return;
    }

    var last = records[records.length - 1];
    var exam = exams[last.examType];
    var isCet = last.examType === 'cet4' || last.examType === 'cet6';
    var theme = getExamTheme(last.examType);
    var totalLabel = last.examType === 'ielts' ? 'Overall' : '总分';

    var html = '<div class="recent-summary-layout">';

    // 左列：大总分 + 考试信息
    html += '<div class="recent-summary-left">';
    if (last.total !== null) {
        html += '<div class="recent-summary-total" style="color:' + theme.strong + ';">' + last.total.toFixed(1) + '</div>';
    }
    html += '<div class="recent-summary-exam" style="color:' + theme.strong + ';">' + getExamBadgeMarkup(last.examType, exam ? exam.name : '', 22) + ' ' + escapeHtml(exam ? exam.name : '') + '</div>';
    html += '<div class="recent-summary-date">' + escapeHtml(last.date) + '</div>';

    // 目标进度
    var goal = getGoal(last.examType);
    if (goal !== null && last.total !== null) {
        var pct = Math.min(100, Math.round((last.total / goal) * 100));
        var barColor = pct >= 100 ? '#10b981' : (pct >= 70 ? '#f59e0b' : '#ef4444');
        html += '<div style="margin-top:0.6rem;">';
        html += '<div style="display:flex;align-items:center;gap:0.4rem;font-size:0.75rem;color:#6b7280;">';
        html += '<span>目标 ' + goal.toFixed(1) + '</span>';
        html += '<div class="recent-summary-goal" style="flex:1;max-width:80px;"><div class="recent-summary-goal-fill" style="width:' + pct + '%;background:' + barColor + ';"></div></div>';
        html += '<span style="color:' + barColor + ';font-weight:700;">' + pct + '%</span>';
        html += '</div></div>';
    }
    html += '</div>';

    // 右列：雅思风格分科卡片
    html += '<div class="recent-summary-right">';

    if (exam) {
        // 构建科目列表（CET 合并写作翻译）
        var scoreItems = [];
        for (var s of exam.subjects) {
            if (isCet && (s.id === 'writing' || s.id === 'translation')) continue;
            var sc = last.scores[s.id] || 0;
            scoreItems.push({ short: s.short || s.name, score: sc.toFixed(s.dec), color: s.color, dec: s.dec });
        }
        if (isCet) {
            var wtTotal = (last.scores['writing'] || 0) + (last.scores['translation'] || 0);
            scoreItems.push({ short: '写作翻译', score: String(wtTotal), color: '#f59e0b', dec: 0 });
        }
        // 加 Overall / 总分 作为最后一个卡片
        if (last.total !== null) {
            scoreItems.push({ short: totalLabel, score: last.total.toFixed(1), color: theme.accent, dec: 1, isTotal: true });
        }

        html += '<div class="recent-summary-scores">';
        for (var si = 0; si < scoreItems.length; si++) {
            var item = scoreItems[si];
            var itemClass = item.isTotal ? ' recent-summary-score-total-card' : '';
            html += '<div class="recent-summary-score-item' + itemClass + '" style="--accent:' + item.color + ';border-top:3px solid ' + item.color + ';">';
            html += '<span class="recent-summary-score-name" style="color:' + item.color + ';">' + escapeHtml(item.short) + '</span>';
            html += '<span class="recent-summary-score-val" style="color:' + item.color + ';">' + item.score + '</span>';
            html += '</div>';
        }
        html += '</div>';
    }

    // 对比 delta
    var sameType = records.filter(function(r) { return r.examType === last.examType; });
    if (sameType.length >= 2 && exam) {
        var prev = sameType[sameType.length - 2];
        html += '<div class="recent-summary-delta">';
        for (var ci = 0; ci < exam.subjects.length; ci++) {
            var cs = exam.subjects[ci];
            if (isCet && (cs.id === 'writing' || cs.id === 'translation')) continue;
            var curV = last.scores[cs.id] || 0;
            var preV = prev.scores[cs.id] || 0;
            var diff = curV - preV;
            var dColor = diff > 0 ? '#10b981' : (diff < 0 ? '#ef4444' : '#9ca3af');
            var arrow = diff > 0 ? '↑' : (diff < 0 ? '↓' : '→');
            var sign = diff > 0 ? '+' : '';
            html += '<span style="color:' + dColor + ';">' + escapeHtml(cs.short || cs.name) + ' ' + arrow + sign + diff.toFixed(cs.dec) + '</span>';
        }
        if (last.total !== null && prev.total !== null) {
            var td = last.total - prev.total;
            var tdc = td > 0 ? '#10b981' : (td < 0 ? '#ef4444' : '#9ca3af');
            var ta = td > 0 ? '↑' : (td < 0 ? '↓' : '→');
            var ts = td > 0 ? '+' : '';
            html += '<span style="color:' + tdc + ';font-weight:700;">' + totalLabel + ' ' + ta + ts + td.toFixed(1) + '</span>';
        }
        html += '</div>';
    }

    // 查看详情按钮
    html += '<div class="recent-summary-footer"><button onclick="openRecentDetail()" style="font-size:0.82rem;color:#1f6a52;background:none;border:none;cursor:pointer;font-weight:600;">查看详细分析 →</button></div>';
    html += '</div></div>';

    div.innerHTML = html;

    // AI 预览
    if (aiPreview) {
        var aiCache = getAiCache();
        var historyRecs = records.filter(r => r.examType === last.examType).map(r => r.total).slice(-5);
        var aiCacheKey = last.examType + ':' + last.total + ':' + historyRecs.join(',');
        var aiText = document.getElementById('ai-preview-text');

        if (isLoggedIn()) {
            if (aiCache.lastAiComment) {
                aiText.textContent = aiCache.lastAiComment.split('|||')[0].trim().substring(0, 60);
                aiPreview.style.display = 'flex';
            } else if (aiCacheKey !== aiCache.lastAiCacheKey) {
                fetchAIComment(exam ? exam.name : last.examType, last.total, historyRecs).then(function() {
                    var c = getAiCache();
                    if (c.lastAiComment && aiText) {
                        aiText.textContent = c.lastAiComment.split('|||')[0].trim().substring(0, 60);
                        aiPreview.style.display = 'flex';
                    }
                });
            }
            hideLocalAiHint();
        } else {
            var mode = getUserMode();
            if (!mode) {
                showModeChoiceModal(function(chosenMode) {
                    if (chosenMode === 'local') triggerLocalAiComment(exam, last, historyRecs, aiCacheKey);
                });
            } else if (mode === 'local') {
                triggerLocalAiComment(exam, last, historyRecs, aiCacheKey);
            }
        }
    }
}

// ==================== 考试类型概览网格 ====================

function renderExamTypeGrid(records, exams, types) {
    var grid = document.getElementById('exam-type-grid');
    if (!grid) return;

    if (!types.length) {
        grid.innerHTML = '<div class="empty-state" style="padding:1.5rem;"><p style="color:#9ca3af;">录入成绩后，这里会显示各考试类型的概览。</p></div>';
        return;
    }

    var html = '';
    for (var t = 0; t < types.length; t++) {
        var tid = types[t];
        var exam = exams[tid];
        if (!exam) continue;
        var recs = records.filter(function(r) { return r.examType === tid; });
        var theme = getExamTheme(tid);
        var totals = recs.map(function(r) { return r.total; }).filter(function(v) { return typeof v === 'number' && isFinite(v); });
        var best = totals.length ? Math.max.apply(null, totals) : null;
        var avg = totals.length ? (totals.reduce(function(a,b){return a+b;},0) / totals.length) : null;

        html += '<div class="exam-type-card" onclick="openExamDetail(\'' + tid + '\')" style="--accent:' + theme.accent + ';border-color:' + theme.accent + '18;">';
        html += '<div class="exam-type-card-head">';
        html += '<span class="exam-type-card-name" style="color:' + theme.strong + ';">' + getExamBadgeMarkup(tid, exam.name, 22) + ' ' + escapeHtml(exam.name) + '</span>';
        html += '<span class="exam-type-card-count">' + recs.length + '次</span>';
        html += '</div>';
        html += '<div class="exam-type-card-stats">';
        html += '<div class="exam-type-card-stat">最佳<strong style="color:' + theme.strong + ';">' + (best !== null ? best.toFixed(1) : '-') + '</strong></div>';
        html += '<div class="exam-type-card-stat">平均<strong>' + (avg !== null ? avg.toFixed(1) : '-') + '</strong></div>';
        html += '<div class="exam-type-card-stat">最近<strong style="font-size:0.88rem;">' + escapeHtml(recs[recs.length-1].date) + '</strong></div>';
        html += '</div>';

        // Sparkline
        if (totals.length >= 2) {
            var sparkSvg = renderSparklineSVG(totals, theme.accent);
            html += '<div class="exam-type-card-spark">' + sparkSvg + '</div>';
        }

        html += '<div class="exam-type-card-link">查看详情 →</div>';
        html += '</div>';
    }
    grid.innerHTML = html;
}

function renderSparklineSVG(values, color) {
    if (values.length < 2) return '';
    var w = 200, h = 32, pad = 2;
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var range = max - min || 1;
    var points = values.map(function(v, i) {
        var x = pad + (i / (values.length - 1)) * (w - pad * 2);
        var y = h - pad - ((v - min) / range) * (h - pad * 2);
        return x.toFixed(1) + ',' + y.toFixed(1);
    });
    return '<svg width="100%" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"><polyline points="' + points.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

// ==================== Slide Panel 管理 ====================

function openSlidePanel(panelId) {
    logEvent('panel-open', { panel: panelId });
    var el = document.getElementById(panelId);
    if (el) el.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSlidePanel(panelId) {
    var el = document.getElementById(panelId);
    if (el) el.classList.remove('active');
    // 如果没有其他 panel 打开，恢复滚动
    var anyActive = document.querySelector('.slide-panel-overlay.active');
    if (!anyActive) document.body.style.overflow = '';
    // 销毁图表实例
    if (panelId === 'exam-detail-panel') {
        if (mainChartInstance) { mainChartInstance.destroy(); mainChartInstance = null; }
        if (radarChartInstance) { radarChartInstance.destroy(); radarChartInstance = null; }
    }
}

// ==================== Panel A: 考试类型详情 ====================

function openExamDetail(examType) {
    _currentDetailExamType = examType;
    renderExamDetail(examType);
    openSlidePanel('exam-detail-panel');
}

function renderExamDetail(examType) {
    var records = getRecords();
    var exams = allExams();
    var exam = exams[examType];
    var recs = records.filter(function(r) { return r.examType === examType; });
    if (!exam) return;

    var theme = getExamTheme(examType);
    document.getElementById('exam-detail-title').innerHTML = getExamBadgeMarkup(examType, exam.name, 24) + ' ' + escapeHtml(exam.name);

    var totals = recs.map(function(r) { return r.total; }).filter(function(v) { return typeof v === 'number' && isFinite(v); });
    var best = totals.length ? Math.max.apply(null, totals) : 0;
    var avg = totals.length ? (totals.reduce(function(a,b){return a+b;},0) / totals.length) : 0;

    var html = '';
    // 统计
    html += '<div class="panel-stats">';
    html += '<div class="panel-stat-box"><p>考试次数</p><strong class="gradient-text">' + recs.length + '</strong></div>';
    html += '<div class="panel-stat-box"><p>最佳成绩</p><strong style="color:' + theme.strong + ';">' + best.toFixed(1) + '</strong></div>';
    html += '<div class="panel-stat-box"><p>平均成绩</p><strong>' + avg.toFixed(1) + '</strong></div>';
    html += '<div class="panel-stat-box"><p>最近考试</p><strong style="font-size:1.1rem;">' + escapeHtml(recs.length ? recs[recs.length-1].date : '-') + '</strong></div>';
    html += '</div>';

    if (recs.length >= 1) {
        // 趋势图
        html += '<h3 class="panel-section-title">📈 成绩趋势</h3>';
        html += '<div class="panel-chart-wrap"><canvas id="panel-main-chart"></canvas></div>';

        // 雷达图
        if (exam.subjects && exam.subjects.length >= 3) {
            html += '<h3 class="panel-section-title">🎯 技能画像</h3>';
            html += '<div class="panel-chart-wrap" style="max-width:400px;margin:0 auto 1.5rem;"><canvas id="panel-radar-chart"></canvas></div>';
        }
    }

    // 该类型历史记录
    html += '<h3 class="panel-section-title">历史记录</h3>';
    html += '<div class="panel-records">';
    if (!recs.length) {
        html += '<p style="color:#9ca3af;">暂无记录</p>';
    } else {
        for (var i = recs.length - 1; i >= 0; i--) {
            var r = recs[i];
            var isCet = examType === 'cet4' || examType === 'cet6';
            var badges = '';
            for (var s of exam.subjects) {
                if (isCet && (s.id === 'writing' || s.id === 'translation')) continue;
                var sc = r.scores[s.id] || 0;
                badges += '<span class="score-badge" style="background:' + s.color + '15;color:' + s.color + ';">' + escapeHtml(s.short) + ': ' + sc.toFixed(s.dec) + '</span>';
            }
            if (isCet) {
                var wt = (r.scores['writing'] || 0) + (r.scores['translation'] || 0);
                badges += '<span class="score-badge" style="background:#f59e0b15;color:#f59e0b;">写作翻译: ' + wt + '</span>';
            }
            html += '<div class="record-box" style="border-color:' + theme.accent + '26;box-shadow:0 16px 34px -30px ' + theme.accent + '66;"><div class="record-row"><div class="record-main"><div class="record-meta"><span style="font-weight:700;color:' + theme.strong + ';">' + escapeHtml(exam.name) + '</span><span style="color:#9ca3af;font-size:0.875rem;">' + escapeHtml(r.date) + '</span></div><div class="record-badges">' + badges + '</div></div><div class="record-side">';
            if (r.total !== null) {
                var tl = examType === 'ielts' ? 'Overall' : '总分';
                html += '<div class="record-total"><div style="font-size:0.75rem;color:#9ca3af;">' + tl + '</div><div style="font-size:1.75rem;font-weight:bold;color:' + theme.strong + ';">' + r.total.toFixed(1) + '</div></div>';
            }
            html += '<button class="record-delete" onclick="deleteRecord(' + r.id + ')">×</button></div></div></div>';
        }
    }
    html += '</div>';

    document.getElementById('exam-detail-body').innerHTML = html;

    // 渲染图表（需要延迟等 canvas 挂载）
    if (recs.length >= 1) {
        setTimeout(function() {
            var mainCanvas = document.getElementById('panel-main-chart');
            if (mainCanvas) renderMainChartForPanel(examType, recs, exam, mainCanvas);
            var radarCanvas = document.getElementById('panel-radar-chart');
            if (radarCanvas && exam.subjects && exam.subjects.length >= 3) {
                renderRadarChartForPanel(examType, recs, exam, radarCanvas);
            }
        }, 50);
    }
}

// ==================== Panel B: 最近成绩详情 ====================

function openRecentDetail() {
    renderRecentDetail();
    openSlidePanel('recent-detail-panel');
}

function renderRecentDetail() {
    var records = getRecords();
    var exams = allExams();
    var body = document.getElementById('recent-detail-body');
    if (!body || !records.length) return;

    var last = records[records.length - 1];
    var exam = exams[last.examType];
    var isCet = last.examType === 'cet4' || last.examType === 'cet6';
    var theme = getExamTheme(last.examType);
    var totalLabel = last.examType === 'ielts' ? 'Overall' : '总分';

    var html = '';

    // 日期 + 考试类型
    html += '<div style="color:#6b7280;margin-bottom:0.75rem;">' + escapeHtml(last.date) + ' - ' + escapeHtml(exam ? exam.name : '未知') + '</div>';

    // 分数 grid
    html += '<div class="recent-score-grid">';
    if (exam) {
        for (var s of exam.subjects) {
            if (isCet && (s.id === 'writing' || s.id === 'translation')) continue;
            var sc = last.scores[s.id] || 0;
            html += '<div class="recent-score-item" style="background:' + s.color + '15;border:2px solid ' + s.color + '40;"><div class="recent-score-item-label" style="color:' + s.color + ';">' + escapeHtml(s.name) + '</div><div class="recent-score-item-value" style="color:' + s.color + ';">' + sc.toFixed(s.dec) + '</div></div>';
        }
        if (isCet) {
            var wtTotal = (last.scores['writing'] || 0) + (last.scores['translation'] || 0);
            html += '<div class="recent-score-item" style="background:#f59e0b15;border:2px solid #f59e0b40;"><div class="recent-score-item-label" style="color:#f59e0b;">写作和翻译</div><div class="recent-score-item-value" style="color:#f59e0b;">' + wtTotal + '</div></div>';
        }
    }
    html += '</div>';

    // 总分
    if (last.total !== null) {
        html += '<div class="total-preview"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-weight:600;color:#059669;">' + totalLabel + '</span><span style="font-size:2.5rem;font-weight:bold;" class="gradient-text">' + last.total.toFixed(1) + '</span></div></div>';

        // 目标
        var goal = getGoal(last.examType);
        if (goal !== null) {
            var pct = Math.min(100, Math.round((last.total / goal) * 100));
            var barColor = pct >= 100 ? '#10b981' : (pct >= 70 ? '#f59e0b' : '#ef4444');
            html += '<div style="margin-top:0.5rem;padding:0.6rem 0.8rem;background:rgba(31,106,82,0.05);border-radius:0.8rem;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.35rem;"><span style="font-size:0.82rem;color:#6b7280;font-weight:600;">目标 ' + goal.toFixed(1) + '</span><span style="font-size:0.82rem;color:' + barColor + ';font-weight:700;">' + pct + '%</span></div><div style="height:6px;background:rgba(0,0,0,0.06);border-radius:3px;overflow:hidden;"><div style="width:' + pct + '%;height:100%;background:' + barColor + ';border-radius:3px;transition:width 0.4s ease;"></div></div></div>';
        }
        html += '<div style="text-align:right;margin-top:0.4rem;"><button onclick="promptSetGoal(\'' + escapeHtml(last.examType) + '\')" style="font-size:0.78rem;color:#1f6a52;background:none;border:1px solid rgba(31,106,82,0.18);border-radius:99px;padding:0.25rem 0.7rem;cursor:pointer;font-weight:600;">' + (goal !== null ? '修改目标' : '设置目标') + '</button></div>';
    }

    // 对比上次
    var sameType = records.filter(function(r) { return r.examType === last.examType; });
    if (sameType.length >= 2 && exam) {
        var prev = sameType[sameType.length - 2];
        html += '<div style="margin-top:0.6rem;padding:0.7rem 0.8rem;background:rgba(31,106,82,0.04);border-radius:0.8rem;"><div style="font-size:0.82rem;color:#6b7280;font-weight:600;margin-bottom:0.4rem;">对比上次</div>';
        for (var ci = 0; ci < exam.subjects.length; ci++) {
            var cs = exam.subjects[ci];
            if (isCet && (cs.id === 'writing' || cs.id === 'translation')) continue;
            var curVal = last.scores[cs.id] || 0;
            var preVal = prev.scores[cs.id] || 0;
            var diff = curVal - preVal;
            var arrow, diffColor;
            if (diff > 0) { arrow = '↑'; diffColor = '#10b981'; }
            else if (diff < 0) { arrow = '↓'; diffColor = '#ef4444'; }
            else { arrow = '→'; diffColor = '#9ca3af'; }
            var sign = diff > 0 ? '+' : '';
            html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:0.2rem 0;font-size:0.88rem;"><span style="color:#374151;">' + escapeHtml(cs.name) + '</span><span style="color:#6b7280;">' + preVal.toFixed(cs.dec) + ' → ' + curVal.toFixed(cs.dec) + '</span><span style="color:' + diffColor + ';font-weight:700;">' + arrow + sign + diff.toFixed(cs.dec) + '</span></div>';
        }
        if (last.total !== null && prev.total !== null) {
            var totalDiff = last.total - prev.total;
            var tArrow, tColor;
            if (totalDiff > 0) { tArrow = '↑'; tColor = '#10b981'; }
            else if (totalDiff < 0) { tArrow = '↓'; tColor = '#ef4444'; }
            else { tArrow = '→'; tColor = '#9ca3af'; }
            var tSign = totalDiff > 0 ? '+' : '';
            html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:0.3rem 0 0 0;border-top:1px solid rgba(0,0,0,0.06);margin-top:0.2rem;font-size:0.9rem;"><span style="font-weight:700;color:#059669;">' + totalLabel + '</span><span style="color:#6b7280;">' + prev.total.toFixed(1) + ' → ' + last.total.toFixed(1) + '</span><span style="color:' + tColor + ';font-weight:700;">' + tArrow + tSign + totalDiff.toFixed(1) + '</span></div>';
        }
        html += '</div>';
    }

    // AI 评论（完整版）
    html += '<div id="panel-ai-section" style="margin-top:1.2rem;">';
    html += '<h3 class="panel-section-title">🤖 AI 点评</h3>';
    html += '<div id="panel-ai-style-bar" style="display:flex;gap:0.4rem;margin-bottom:0.5rem;flex-wrap:wrap;">';
    html += '<button onclick="setAiStyle(\'storm\')" id="style-storm" title="犀利刻薄" style="font-size:0.78rem;padding:0.35rem 0.75rem;border-radius:99px;border:1px solid rgba(31,106,82,0.2);background:rgba(31,106,82,0.12);color:#174f3d;cursor:pointer;font-weight:700;">⛈️ 风暴</button>';
    html += '<button onclick="setAiStyle(\'sun\')" id="style-sun" title="温暖鼓励" style="font-size:0.78rem;padding:0.35rem 0.75rem;border-radius:99px;border:1px solid rgba(81,63,44,0.12);background:rgba(255,251,245,0.95);color:#8e5520;cursor:pointer;font-weight:700;">☀️ 暖阳</button>';
    html += '<button onclick="setAiStyle(\'cold\')" id="style-cold" title="理性分析" style="font-size:0.78rem;padding:0.35rem 0.75rem;border-radius:99px;border:1px solid rgba(81,63,44,0.12);background:rgba(255,251,245,0.95);color:#8e5520;cursor:pointer;font-weight:700;">❄️ 冷锋</button>';
    html += '<button onclick="setAiStyle(\'rain\')" id="style-rain" title="先损后帮" style="font-size:0.78rem;padding:0.35rem 0.75rem;border-radius:99px;border:1px solid rgba(81,63,44,0.12);background:rgba(255,251,245,0.95);color:#8e5520;cursor:pointer;font-weight:700;">🌧️ 阵雨</button>';
    html += '</div>';
    html += '<div id="panel-ai-comment-box" style="background:rgba(221,238,231,0.72);border:1px solid rgba(31,106,82,0.14);border-radius:1rem;padding:1rem;color:#174f3d;line-height:1.7;font-size:0.95rem;position:relative;">🤖 AI 正在分析...</div>';
    html += '<div id="panel-ai-actions" style="display:none;justify-content:flex-end;gap:0.5rem;margin-top:0.5rem;"><button onclick="showReplyInput()" style="font-size:0.82rem;color:#174f3d;background:rgba(255,251,245,0.95);border:1px solid rgba(31,106,82,0.16);padding:0.42rem 0.9rem;border-radius:99px;cursor:pointer;font-weight:700;">继续聊聊</button></div>';
    html += '<div id="panel-reply-input-area" style="display:none;margin-top:0.5rem;"><div style="display:flex;gap:0.5rem;"><input type="text" id="panel-user-rebuttal" autocomplete="off" placeholder="输入你想回应的话..." style="flex:1;border:1px solid rgba(81,63,44,0.14);border-radius:0.9rem;padding:0.65rem 0.8rem;outline:none;font-size:0.92rem;background:rgba(255,251,245,0.94);"><button onclick="sendRebuttal()" style="background:#1f6a52;color:white;border:none;padding:0.65rem 1rem;border-radius:0.9rem;cursor:pointer;font-size:0.9rem;font-weight:700;">发送</button></div></div>';
    html += '</div>';

    body.innerHTML = html;

    // 触发 AI 评论（指向 panel 内的 box）
    // 需要临时让 ai.js 的 fetchAIComment 写入 panel-ai-comment-box
    var historyRecs = records.filter(r => r.examType === last.examType).map(r => r.total).slice(-5);
    var aiCache = getAiCache();
    var aiCacheKey = last.examType + ':' + last.total + ':' + historyRecs.join(',');

    // 使用全局 container/box 的方式让 ai.js 能找到
    // 临时设置 id 映射
    var panelBox = document.getElementById('panel-ai-comment-box');
    if (panelBox) {
        panelBox.id = 'ai-comment-box';
        var panelActions = document.getElementById('panel-ai-actions');
        if (panelActions) panelActions.id = 'ai-actions';
        var panelReply = document.getElementById('panel-reply-input-area');
        if (panelReply) panelReply.id = 'reply-input-area';
        var panelInput = document.getElementById('panel-user-rebuttal');
        if (panelInput) panelInput.id = 'user-rebuttal';
    }

    // 创建临时 ai-container
    var tempContainer = document.createElement('div');
    tempContainer.id = 'ai-container';
    tempContainer.style.display = 'block';
    panelBox.parentNode.insertBefore(tempContainer, panelBox);
    tempContainer.appendChild(panelBox);
    var actionsEl = document.getElementById('ai-actions');
    if (actionsEl) tempContainer.appendChild(actionsEl);
    var replyEl = document.getElementById('reply-input-area');
    if (replyEl) tempContainer.appendChild(replyEl);

    if (isLoggedIn()) {
        if (aiCacheKey !== aiCache.lastAiCacheKey) {
            fetchAIComment(exam ? exam.name : last.examType, last.total, historyRecs);
        } else if (aiCache.lastAiComment) {
            renderAiComment(document.getElementById('ai-comment-box'), aiCache.lastAiComment);
            var act = document.getElementById('ai-actions');
            if (act) act.style.display = 'flex';
        }
        hideLocalAiHint();
    } else {
        var mode = getUserMode();
        if (!mode) {
            showModeChoiceModal(function(chosenMode) {
                if (chosenMode === 'local') triggerLocalAiComment(exam, last, historyRecs, aiCacheKey);
            });
        } else if (mode === 'local') {
            triggerLocalAiComment(exam, last, historyRecs, aiCacheKey);
        }
    }
}

// ==================== Panel C: 历史记录 ====================

function openHistoryPanel() {
    renderHistoryPanel();
    openSlidePanel('history-panel');
}

function renderHistoryPanel() {
    var records = getRecords();
    var exams = allExams();
    var body = document.getElementById('history-body');
    if (!body) return;

    if (!records.length) {
        body.innerHTML = '<div class="empty-state" style="padding:2rem;"><p style="color:#9ca3af;">暂无历史记录</p></div>';
        return;
    }

    var html = '';
    for (var i = records.length - 1; i >= 0; i--) {
        var r = records[i];
        var e = exams[r.examType];
        if (!e) continue;
        var isCet = r.examType === 'cet4' || r.examType === 'cet6';
        var badges = '';
        for (var s of e.subjects) {
            if (isCet && (s.id === 'writing' || s.id === 'translation')) continue;
            var sc = r.scores[s.id] || 0;
            badges += '<span class="score-badge" style="background:' + s.color + '15;color:' + s.color + ';">' + escapeHtml(s.short) + ': ' + sc.toFixed(s.dec) + '</span>';
        }
        if (isCet) {
            var wtTotal = (r.scores['writing'] || 0) + (r.scores['translation'] || 0);
            badges += '<span class="score-badge" style="background:#f59e0b15;color:#f59e0b;">写作和翻译: ' + wtTotal + '</span>';
        }
        var theme = getExamTheme(r.examType);
        html += '<div class="record-box" style="border-color:' + theme.accent + '26;box-shadow:0 16px 34px -30px ' + theme.accent + '66;"><div class="record-row"><div class="record-main"><div class="record-meta">' + getExamBadgeMarkup(r.examType, e.name, 38) + '<span style="font-weight:700;color:' + theme.strong + ';">' + escapeHtml(e.name) + '</span><span style="color:#9ca3af;font-size:0.875rem;">' + escapeHtml(r.date) + '</span></div><div class="record-badges">' + badges + '</div></div><div class="record-side">';
        if (r.total !== null) {
            var tl = r.examType === 'ielts' ? 'Overall' : '总分';
            html += '<div class="record-total"><div style="font-size:0.75rem;color:#9ca3af;">' + tl + '</div><div style="font-size:1.75rem;font-weight:bold;color:' + theme.strong + ';">' + r.total.toFixed(1) + '</div></div>';
        }
        html += '<button class="record-delete" onclick="deleteRecord(' + r.id + ')">×</button></div></div></div>';
    }
    body.innerHTML = html;
}

// ==================== 图表渲染（Panel 内部） ====================

function renderMainChartForPanel(examType, records, exam, canvas) {
    if (mainChartInstance) { mainChartInstance.destroy(); mainChartInstance = null; }
    if (!canvas || !records.length) return;

    var sorted = records.slice().sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
    var datasets = [];

    if (examType === 'ielts') {
        datasets = [
            { label: 'Overall', data: sorted.map(r => r.total), borderColor: '#275b56', backgroundColor: 'rgba(39,91,86,0.12)', borderWidth: 3, fill: true, tension: 0.3, pointRadius: 5 },
            { label: 'Listening', data: sorted.map(r => r.scores.listening || 0), borderColor: '#4d7298', borderWidth: 2, tension: 0.3, pointRadius: 4 },
            { label: 'Reading', data: sorted.map(r => r.scores.reading || 0), borderColor: '#275b56', borderWidth: 2, tension: 0.3, pointRadius: 4 },
            { label: 'Writing', data: sorted.map(r => r.scores.writing || 0), borderColor: '#c35f3d', borderWidth: 2, tension: 0.3, pointRadius: 4 },
            { label: 'Speaking', data: sorted.map(r => r.scores.speaking || 0), borderColor: '#7b6aa6', borderWidth: 2, tension: 0.3, pointRadius: 4 }
        ];
    } else if (examType === 'cet4' || examType === 'cet6') {
        var color = examType === 'cet4' ? '#275b56' : '#7b6aa6';
        datasets = [
            { label: '总分', data: sorted.map(r => r.total), borderColor: color, backgroundColor: color + '20', borderWidth: 3, fill: true, tension: 0.3, pointRadius: 5 },
            { label: '听力', data: sorted.map(r => r.scores.listening || 0), borderColor: '#4d7298', borderWidth: 2, tension: 0.3, pointRadius: 4 },
            { label: '阅读', data: sorted.map(r => r.scores.reading || 0), borderColor: '#275b56', borderWidth: 2, tension: 0.3, pointRadius: 4 },
            { label: '写作和翻译', data: sorted.map(r => (r.scores.writing || 0) + (r.scores.translation || 0)), borderColor: '#c35f3d', borderWidth: 2, tension: 0.3, pointRadius: 4 }
        ];
    } else {
        datasets = [{ label: '总分', data: sorted.map(r => r.total), borderColor: '#275b56', backgroundColor: 'rgba(39,91,86,0.12)', borderWidth: 3, fill: true, tension: 0.3, pointRadius: 5 }];
        if (exam.subjects) {
            for (var s of exam.subjects) {
                datasets.push({ label: s.name, data: sorted.map(r => r.scores[s.id] || 0), borderColor: s.color, borderWidth: 2, tension: 0.3, pointRadius: 4 });
            }
        }
    }

    mainChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: { labels: sorted.map(r => r.date), datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 15 } } },
            scales: { y: { beginAtZero: false, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }
        }
    });
}

function renderRadarChartForPanel(examType, records, exam, canvas) {
    if (radarChartInstance) { radarChartInstance.destroy(); radarChartInstance = null; }
    if (!canvas || !records || !records.length || !exam || !exam.subjects || exam.subjects.length < 3) return;

    var subjects = exam.subjects;
    var latest = records[records.length - 1];
    var labels = subjects.map(function(s) { return s.name || s.short; });
    var latestData = subjects.map(function(s) {
        var raw = latest.scores ? latest.scores[s.id] : undefined;
        return (raw !== undefined && raw !== null) ? Number(raw) : 0;
    });
    var isIelts = examType === 'ielts';

    function normalize(s, val) {
        if (isIelts) return val;
        var mx;
        if (s.type === 'sections') mx = (s.sections || []).reduce(function(sum, sec) { return sum + (sec.max || 0) * (sec.score || 0); }, 0);
        else if (s.type === 'formula') mx = (s.max || 0) * (s.mult || 1);
        else mx = s.max || 100;
        if (!mx) mx = 100;
        return Math.round((val / mx) * 1000) / 10;
    }

    var normalizedData = subjects.map(function(s, i) { return normalize(s, latestData[i]); });
    var theme = getExamTheme(examType) || { accent: '#275b56' };
    var primaryColor = theme.accent || '#275b56';

    var datasets = [{
        label: '最近', data: normalizedData,
        backgroundColor: primaryColor + '25', borderColor: primaryColor, borderWidth: 2,
        pointBackgroundColor: primaryColor, pointRadius: 4, pointHoverRadius: 6
    }];

    if (records.length >= 2) {
        var totals = records.map(function(r) { return r.total || 0; });
        var bestIdx = totals.indexOf(Math.max.apply(null, totals));
        var best = records[bestIdx];
        var bestData = subjects.map(function(s, i) {
            var raw = best.scores ? best.scores[s.id] : undefined;
            return normalize(s, (raw !== undefined && raw !== null) ? Number(raw) : 0);
        });
        datasets.push({ label: '最佳', data: bestData, backgroundColor: 'rgba(245,158,11,0.1)', borderColor: '#f59e0b', borderWidth: 1.5, borderDash: [5,5], pointBackgroundColor: '#f59e0b', pointRadius: 3 });
    }

    var scaleMax = isIelts ? 9 : 100;
    radarChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'radar',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12, font: { size: 12 } } } },
            scales: { r: { beginAtZero: true, max: scaleMax, ticks: { stepSize: isIelts ? 1 : 20, font: { size: 10 } }, pointLabels: { font: { size: 12, weight: 'bold' }, color: '#374151' }, grid: { color: 'rgba(0,0,0,0.06)' } } }
        }
    });
}

// ==================== 删除 / 清空 ====================

function deleteRecord(id) {
    if (!confirm('确定删除这条记录？')) return;
    var rec = getRecords().find(function(r) { return r.id === id; });
    logEvent('record-delete', { recordId: id, examType: rec ? rec.examType : 'unknown' });
    saveRecords(getRecords().filter(r => r.id !== id));
    // 刷新当前活跃的 panel 或 dashboard
    var examPanel = document.getElementById('exam-detail-panel');
    if (examPanel && examPanel.classList.contains('active') && _currentDetailExamType) {
        renderExamDetail(_currentDetailExamType);
    }
    var historyPanelEl = document.getElementById('history-panel');
    if (historyPanelEl && historyPanelEl.classList.contains('active')) {
        renderHistoryPanel();
    }
    renderDashboard();
}

function clearAllRecords() {
    if (!confirm('确定清空所有记录？此操作不可恢复！')) return;
    localStorage.removeItem(STORAGE.RECORDS);
    if (!isLoggedIn()) { if (window.scheduleCloudSync) window.scheduleCloudSync(); }
    closeSlidePanel('history-panel');
    renderDashboard();
}

// ==================== 游戏化 UI 渲染 ====================

function renderXpBar(xpData) {
    var bar = document.getElementById('gam-xp-bar');
    if (!bar) return;
    var level = xpData.level || 1;
    var total = xpData.total || 0;
    var needed = XP_PER_LEVEL(level);
    var pct = Math.min(100, Math.round((total / needed) * 100));
    var levelEl = bar.querySelector('.gam-xp-level');
    if (levelEl) levelEl.textContent = level;
    var fill = bar.querySelector('.gam-xp-fill');
    if (fill) fill.style.width = pct + '%';
    var textEl = bar.querySelector('.gam-xp-text');
    if (textEl) textEl.textContent = total + '/' + needed + ' XP';
}

function renderStreakIndicator(streakData) {
    var el = document.getElementById('gam-streak');
    if (!el) return;
    var streak = streakData.currentStreak || 0;
    if (streak < 1) { el.style.display = 'none'; return; }
    var longest = streakData.longestStreak || streak;
    var fire = streak >= 7 ? '🔥' : '⚡';
    var text = fire + ' ' + streak + '天';
    if (longest > streak) text += '（最长' + longest + '天）';
    el.textContent = text;
    el.style.display = 'inline-flex';
}

function renderAchievementWall(unlockedIds) {
    var section = document.getElementById('gam-achievements');
    var grid = document.getElementById('gam-ach-grid');
    var countEl = document.getElementById('gam-ach-count');
    if (!section || !grid) return;

    var unlocked = unlockedIds || [];
    if (unlocked.length === 0 && !ACHIEVEMENTS) { section.style.display = 'none'; return; }

    section.style.display = '';
    if (countEl) countEl.textContent = unlocked.length + '/' + ACHIEVEMENTS.length;

    var html = '';
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
        var a = ACHIEVEMENTS[i];
        var done = unlocked.indexOf(a.id) >= 0;
        if (done) {
            html += '<span class="gam-ach-badge gam-ach-done" title="' + escapeHtml(a.desc) + '">'
                + '<span class="gam-ach-icon">' + a.icon + '</span>'
                + escapeHtml(a.name)
                + '</span>';
        } else {
            html += '<span class="gam-ach-badge gam-ach-locked" title="' + escapeHtml(a.desc) + '">'
                + '<span class="gam-ach-icon">🔒</span>'
                + escapeHtml(a.name)
                + '</span>';
        }
    }
    grid.innerHTML = html;
}

// ==================== 挂载到 window ====================
window.renderDashboard = renderDashboard;
window.deleteRecord = deleteRecord;
window.clearAllRecords = clearAllRecords;
window.openExamDetail = openExamDetail;
window.openRecentDetail = openRecentDetail;
window.openHistoryPanel = openHistoryPanel;
window.openSlidePanel = openSlidePanel;
window.closeSlidePanel = closeSlidePanel;
