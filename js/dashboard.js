// ==================== 仪表盘 / 图表 / 历史记录 ====================
import { STORAGE, ACHIEVEMENTS, XP_PER_LEVEL } from './config.js';
import { escapeHtml, getExamTheme, getExamBadgeMarkup, postComment, postCommentStream } from './utils.js';
import { getRecords, saveRecords, allExams, buildArchiveHighlights } from './storage.js';
import { isLoggedIn, getUserMode, _isSyncing } from './auth.js';
import { addXP, getGamificationData } from './gamification.js';
import { fetchAIComment, renderAiComment, triggerLocalAiComment, showLocalAiHint, hideLocalAiHint, showModeChoiceModal, getAiCache, getGoal, currentAiStyle } from './ai.js';
import { logEvent } from './logger.js';

let mainChartInstance = null;
let radarChartInstance = null;
let _currentDetailExamType = null;
let _predictionFailCache = {};

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
    document.getElementById('latest-exam-date').textContent = records.length ? records.reduce(function(a, b) { return a.id > b.id ? a : b; }).date : '-';

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

// ==================== AI 成绩预测 ====================

var _predictionCache = {};

async function renderPrediction(records, exams) {
    var section = document.getElementById('prediction-section');
    var content = document.getElementById('prediction-content');
    if (!section || !content) return;

    // 找到 3+ 条记录的考试类型
    var typeCounts = {};
    records.forEach(function(r) {
        typeCounts[r.examType] = (typeCounts[r.examType] || 0) + 1;
    });
    var predictable = Object.keys(typeCounts).filter(function(t) { return typeCounts[t] >= 3; });

    if (!predictable.length) {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';

    // 对每个可预测的考试类型生成预测
    var html = '';
    for (var pi = 0; pi < predictable.length; pi++) {
        var examType = predictable[pi];
        var exam = exams[examType];
        var recs = records.filter(function(r) { return r.examType === examType; });
        var theme = getExamTheme(examType);

        // 检查缓存
        var cacheKey = 'pred_' + examType;
        var cached = _predictionCache[cacheKey];
        if (!cached || (Date.now() - cached.ts > 3600000)) {
            // 异步请求，先显示加载状态
            html += renderPredictionLoading(examType, exam, theme);
            fetchPrediction(examType, recs, exam);
            continue;
        }

        html += renderPredictionResult(examType, exam, theme, cached.data, recs);
    }

    if (html) content.innerHTML = html;
}

function renderPredictionLoading(examType, exam, theme) {
    var name = exam ? exam.name : examType;
    return '<div class="prediction-item" data-exam="' + examType + '">'
        + '<div class="prediction-item-header">'
        + getExamBadgeMarkup(examType, name, 20)
        + '<span class="prediction-exam-name" style="color:' + theme.strong + ';">' + escapeHtml(name) + '</span>'
        + '</div>'
        + '<div class="prediction-loading"><span class="ai-thinking-dots"><span>.</span><span>.</span><span>.</span></span> AI 正在分析趋势</div>'
        + '</div>';
}

function showPredictionError(examType, retryCount) {
    var content = document.getElementById('prediction-content');
    if (!content) return;
    var items = content.querySelectorAll('.prediction-item');
    for (var i = 0; i < items.length; i++) {
        if (items[i].getAttribute('data-exam') === examType) {
            var retryId = 'retry-pred-' + examType;
            var html = '<div class="prediction-error-wrap">';
            html += '<div class="prediction-error-text">预测生成失败' + (retryCount > 0 ? '（已重试 ' + retryCount + ' 次）' : '') + '</div>';
            html += '<button class="prediction-retry-btn" id="' + retryId + '" onclick="retryPrediction(\'' + examType + '\')">重新预测</button>';
            html += '</div>';
            items[i].innerHTML = html;
            break;
        }
    }
}

function retryPrediction(examType) {
    var records = getRecords();
    var exams = allExams();
    var exam = exams[examType];
    var recs = records.filter(function(r) { return r.examType === examType; });

    // 清除缓存强制重新请求
    _predictionCache['pred_' + examType] = null;

    // 优先查找 Panel 内的预测容器
    var panelEl = document.getElementById('panel-prediction-content');
    if (panelEl) {
        panelEl.innerHTML = '<div class="prediction-loading"><span class="ai-thinking-dots"><span>.</span><span>.</span><span>.</span></span> AI 正在分析趋势</div>';
        fetchPrediction(examType, recs, exam, 1, panelEl);
        return;
    }

    // Fallback: Dashboard 容器
    var content = document.getElementById('prediction-content');
    if (content) {
        var items = content.querySelectorAll('.prediction-item');
        for (var i = 0; i < items.length; i++) {
            if (items[i].getAttribute('data-exam') === examType) {
                items[i].innerHTML = '<div class="prediction-loading"><span class="ai-thinking-dots"><span>.</span><span>.</span><span>.</span></span> AI 正在分析趋势</div>';
                break;
            }
        }
    }

    fetchPrediction(examType, recs, exam, 1);
}

function renderPredictionResult(examType, exam, theme, data, recs) {
    var name = exam ? exam.name : examType;
    var pred = data.prediction || {};
    var isIelts = examType === 'ielts';
    var total = pred.total !== undefined ? pred.total : '-';
    if (total !== '-' && isIelts) total = Number(total).toFixed(1);
    var confidence = data.confidence || 'medium';
    var analysis = data.analysis || '';
    var confColor = confidence === 'high' ? '#10b981' : (confidence === 'medium' ? '#f59e0b' : '#ef4444');
    var confLabel = confidence === 'high' ? '高置信度' : (confidence === 'medium' ? '中等置信度' : '低置信度');
    var confPct = confidence === 'high' ? 90 : (confidence === 'medium' ? 60 : 30);

    var html = '<div class="prediction-item" data-exam="' + examType + '">';
    html += '<div class="prediction-item-header">';
    html += getExamBadgeMarkup(examType, name, 20);
    html += '<span class="prediction-exam-name" style="color:' + theme.strong + ';">' + escapeHtml(name) + '</span>';
    html += '</div>';

    html += '<div class="prediction-body">';
    // 总分预测
    html += '<div class="prediction-total" style="color:' + theme.strong + ';">';
    html += '<span class="prediction-total-label">预测总分</span>';
    html += '<span class="prediction-total-value">' + total + '</span>';
    html += '</div>';

    // 分科预测
    if (exam && exam.subjects) {
        html += '<div class="prediction-scores">';
        for (var s of exam.subjects) {
            var score = pred[s.id] || pred[s.name] || '-';
            if (score !== '-' && isIelts) score = Number(score).toFixed(1);
            html += '<div class="prediction-score-chip" style="--accent:' + (s.color || theme.accent) + ';">';
            html += '<span class="prediction-score-name">' + escapeHtml(s.short || s.name) + '</span>';
            html += '<span class="prediction-score-val">' + score + '</span>';
            html += '</div>';
        }
        html += '</div>';
    }

    // 置信度
    html += '<div class="prediction-confidence">';
    html += '<div class="prediction-conf-bar"><div class="prediction-conf-fill" style="width:' + confPct + '%;background:' + confColor + ';"></div></div>';
    html += '<span class="prediction-conf-label" style="color:' + confColor + ';">' + confLabel + '</span>';
    html += '</div>';

    // 分析文字
    if (analysis) {
        html += '<div class="prediction-analysis">' + escapeHtml(analysis) + '</div>';
    }

    html += '</div></div>';
    return html;
}

async function fetchPrediction(examType, recs, exam, _retryCount, _targetEl) {
    var retryCount = _retryCount || 0;
    var targetEl = _targetEl || document.getElementById('prediction-content');

    // 失败缓存：5 分钟内同考试类型不重复请求（手动重试除外）
    var failCache = _predictionFailCache[examType];
    if (failCache && Date.now() - failCache < 5 * 60 * 1000 && retryCount === 0) {
        if (targetEl && targetEl.id === 'panel-prediction-content') {
            targetEl.innerHTML = '<div class="prediction-error-wrap"><div class="prediction-error-text">预测生成失败</div><button class="prediction-retry-btn" onclick="retryPrediction(\'' + examType + '\')">重新预测</button></div>';
        }
        return;
    }

    try {
        var sorted = recs.slice().sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
        var historyScores = sorted.slice(-8).map(function(r) {
            var obj = { date: r.date, total: r.total };
            if (r.scores) {
                for (var k in r.scores) {
                    obj[k] = r.scores[k];
                }
            }
            return obj;
        });

        // 构建科目信息，让 AI 知道具体的 key 和分值范围
        var subjectInfo = '';
        if (exam && exam.subjects) {
            subjectInfo = exam.subjects.map(function(s) {
                return s.id + '(' + s.name + ', 0-' + (s.max || 9) + ')';
            }).join(', ');
        }

        var result = await postComment({
            mode: 'prediction',
            examType: examType,
            historyScores: historyScores,
            subjectInfo: subjectInfo
        });

        var comment = result.comment || '';
        // 尝试解析 JSON
        var data;
        try {
            var jsonMatch = comment.match(/\{[\s\S]*\}/);
            data = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch {
            data = null;
        }

        // JSON 解析失败或无有效预测数据 → 显示错误+重试
        if (!data || !data.prediction) {
            throw new Error('Invalid prediction response');
        }
        // 兼容 "overall" / "总分" 等总分子段
        if (data.prediction.total === undefined) {
            var totalKey = Object.keys(data.prediction).find(function(k) {
                return k.toLowerCase() === 'overall' || k === '总分';
            });
            if (totalKey) {
                data.prediction.total = data.prediction[totalKey];
            }
        }
        if (data.prediction.total === undefined) {
            throw new Error('Invalid prediction response');
        }

        // Key 模糊匹配：AI 可能输出 "Listening" 而非 "listening"
        if (exam && exam.subjects) {
            exam.subjects.forEach(function(s) {
                if (data.prediction[s.id] === undefined) {
                    var keys = Object.keys(data.prediction);
                    var match = keys.find(function(k) { return k.toLowerCase() === s.id.toLowerCase(); });
                    if (match && match !== s.id) data.prediction[s.id] = data.prediction[match];
                }
            });
        }

        // IELTS 分数规范化：强制半分制
        if (examType === 'ielts') {
            for (var k in data.prediction) {
                if (typeof data.prediction[k] === 'number') {
                    data.prediction[k] = Math.round(data.prediction[k] * 2) / 2;
                }
            }
        }

        // 缓存
        _predictionCache['pred_' + examType] = { data: data, ts: Date.now() };
        delete _predictionFailCache[examType];

        // 更新 DOM — 支持 Panel 内和 Dashboard 两种容器
        var theme = getExamTheme(examType);
        targetEl = _targetEl || document.getElementById('prediction-content');
        if (!targetEl) return;

        // Panel 内直接替换内容
        if (targetEl.id === 'panel-prediction-content') {
            targetEl.innerHTML = renderPredictionResult(examType, exam, theme, data, recs);
            return;
        }

        // Dashboard 内查找匹配的 prediction-item
        var items = targetEl.querySelectorAll('.prediction-item');
        for (var i = 0; i < items.length; i++) {
            if (items[i].getAttribute('data-exam') === examType) {
                items[i].outerHTML = renderPredictionResult(examType, exam, theme, data, recs);
                break;
            }
        }
    } catch (e) {
        _predictionFailCache[examType] = Date.now();
        targetEl = _targetEl || document.getElementById('prediction-content');
        if (!targetEl) return;
        if (targetEl.id === 'panel-prediction-content') {
            targetEl.innerHTML = '<div class="prediction-error-wrap"><div class="prediction-error-text">预测生成失败</div><button class="prediction-retry-btn" onclick="retryPrediction(\'' + examType + '\')">重新预测</button></div>';
        } else {
            showPredictionError(examType, retryCount);
        }
    }
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

    // AI 预览（仅显示缓存，不在 Dashboard 触发 API 调用）
    if (aiPreview) {
        var aiCache = getAiCache();
        var aiText = document.getElementById('ai-preview-text');

        if (aiCache.lastAiComment) {
            aiText.textContent = aiCache.lastAiComment.split('|||')[0].trim().substring(0, 60);
            aiPreview.style.display = 'flex';
        }
        if (!isLoggedIn()) showLocalAiHint();
        else hideLocalAiHint();
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

    // 对比按钮（2+条记录）
    if (recs.length >= 2) {
        html += '<button class="action-chip" style="margin:0.5rem 0 1rem;" onclick="openComparePanel(\'' + examType + '\')">';
        html += '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01"/></svg>';
        html += ' 成绩对比</button>';
    }

    if (recs.length >= 1) {
        // 趋势图
        html += '<h3 class="panel-section-title">📈 成绩趋势</h3>';
        html += '<div class="panel-chart-wrap"><canvas id="panel-main-chart"></canvas></div>';

        // AI 成绩预测（3+条记录，手动触发）
        if (recs.length >= 3) {
            html += '<h3 class="panel-section-title">🔮 AI 成绩预测</h3>';
            html += '<div id="panel-prediction-content" class="panel-prediction-section">';
            var predCached = _predictionCache['pred_' + examType];
            if (predCached && (Date.now() - predCached.ts < 3600000)) {
                html += renderPredictionResult(examType, exam, theme, predCached.data, recs);
            } else {
                html += '<div style="text-align:center;padding:0.6rem 0;">';
                html += '<div style="color:#6b7280;font-size:0.88rem;margin-bottom:0.6rem;">基于历史趋势预测下一次成绩</div>';
                html += '<button onclick="window._startPanelPrediction(\'' + examType + '\')" style="background:rgba(31,106,82,0.1);color:#174f3d;border:1.5px solid rgba(31,106,82,0.2);padding:0.5rem 1.4rem;border-radius:99px;cursor:pointer;font-size:0.88rem;font-weight:700;">✨ 开始预测</button>';
                html += '</div>';
            }
            html += '</div>';
        }

        // 雷达图
        if (exam.subjects && exam.subjects.length >= 3) {
            html += '<h3 class="panel-section-title">🎯 技能画像</h3>';
            html += '<div class="panel-chart-wrap" style="max-width:400px;margin:0 auto 1.5rem;"><canvas id="panel-radar-chart"></canvas></div>';
        }

        // AI 薄弱项分析（3+条记录，手动触发）
        if (recs.length >= 3 && exam.subjects && exam.subjects.length >= 2) {
            html += '<h3 class="panel-section-title">🩺 AI 薄弱项分析</h3>';
            html += '<div id="weakness-content" class="weakness-section">';
            var weakCached = _weaknessCache['weak_' + examType];
            if (weakCached && (Date.now() - weakCached.ts < 7200000)) {
                html += renderWeaknessHTML(weakCached.data, exam);
            } else {
                html += '<div style="text-align:center;padding:0.6rem 0;">';
                html += '<div style="color:#6b7280;font-size:0.88rem;margin-bottom:0.6rem;">分析你的薄弱科目并给出建议</div>';
                html += '<button onclick="window._startPanelWeakness(\'' + examType + '\')" style="background:rgba(31,106,82,0.1);color:#174f3d;border:1.5px solid rgba(31,106,82,0.2);padding:0.5rem 1.4rem;border-radius:99px;cursor:pointer;font-size:0.88rem;font-weight:700;">✨ 开始分析</button>';
                html += '</div>';
            }
            html += '</div>';
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

    // 手动触发函数需要的上下文
    window._panelExamCtx = window._panelExamCtx || {};
    window._panelExamCtx[examType] = { recs: recs, exam: exam };
}

// ==================== AI 薄弱项分析 ====================

var _weaknessCache = {};

async function fetchWeaknessAnalysis(examType, recs, exam) {
    var el = document.getElementById('weakness-content');
    if (!el) return;

    var cacheKey = 'weak_' + examType;
    var cached = _weaknessCache[cacheKey];

    if (cached && (Date.now() - cached.ts < 7200000)) {
        el.innerHTML = renderWeaknessHTML(cached.data, exam);
        return;
    }

    try {
        var sorted = recs.slice().sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
        var historyScores = sorted.slice(-8).map(function(r) {
            var obj = { date: r.date, total: r.total };
            if (r.scores) {
                for (var k in r.scores) { obj[k] = r.scores[k]; }
            }
            return obj;
        });

        var result = await postComment({
            mode: 'weakness',
            examType: examType,
            historyScores: historyScores
        });

        var comment = result.comment || '';
        var data;
        try {
            var jsonMatch = comment.match(/\{[\s\S]*\}/);
            data = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch {
            data = null;
        }

        if (!data || !data.weaknesses) {
            el.innerHTML = '<div class="weakness-error">分析暂时不可用</div>';
            return;
        }

        _weaknessCache[cacheKey] = { data: data, ts: Date.now() };
        el.innerHTML = renderWeaknessHTML(data, exam);
    } catch (e) {
        el.innerHTML = '<div class="weakness-error">分析暂时不可用</div>';
    }
}

function renderWeaknessHTML(data, exam) {
    var html = '';
    if (data.overall) {
        html += '<div class="weakness-overall">' + escapeHtml(data.overall) + '</div>';
    }
    if (data.weaknesses && data.weaknesses.length) {
        html += '<div class="weakness-list">';
        for (var w of data.weaknesses) {
            var isWeak = w.level === '弱';
            var color = isWeak ? '#ef4444' : '#f59e0b';
            var bg = isWeak ? '#fef2f2' : '#fffbeb';
            html += '<div class="weakness-item" style="background:' + bg + ';border-left:3px solid ' + color + ';">';
            html += '<div class="weakness-item-head">';
            html += '<span class="weakness-subject" style="color:' + color + ';">' + escapeHtml(w.subject || '') + '</span>';
            html += '<span class="weakness-level-badge" style="background:' + color + ';">' + escapeHtml(w.level || '') + '</span>';
            html += '</div>';
            if (w.analysis) html += '<p class="weakness-analysis">' + escapeHtml(w.analysis) + '</p>';
            if (w.suggestion) html += '<p class="weakness-suggestion">💡 ' + escapeHtml(w.suggestion) + '</p>';
            html += '</div>';
        }
        html += '</div>';
    }
    return html;
}

// ==================== Panel E: 成绩对比 ====================

var compareChartA = null;
var compareChartB = null;

function openComparePanel(examType) {
    renderComparePanel(examType);
    openSlidePanel('compare-panel');
}

function renderComparePanel(examType) {
    var records = getRecords();
    var exams = allExams();
    var exam = exams[examType];
    var recs = records.filter(function(r) { return r.examType === examType; });
    var body = document.getElementById('compare-body');
    if (!body || !exam || recs.length < 2) return;

    var theme = getExamTheme(examType);
    var sorted = recs.slice().sort(function(a, b) { return new Date(a.date) - new Date(b.date); });

    var html = '';
    html += '<div class="compare-header">' + getExamBadgeMarkup(examType, exam.name, 20) + ' ' + escapeHtml(exam.name) + ' · 选择两次考试进行对比</div>';

    // 选择器
    html += '<div class="compare-selectors">';
    html += '<div class="compare-select-group"><label>记录 A</label><select id="compare-select-a" class="compare-select" onchange="updateCompareChart(\'' + examType + '\')">';
    for (var i = 0; i < sorted.length; i++) {
        html += '<option value="' + i + '"' + (i === sorted.length - 2 ? ' selected' : '') + '>' + escapeHtml(sorted[i].date) + ' · ' + (sorted[i].total != null ? sorted[i].total.toFixed(1) : '-') + '</option>';
    }
    html += '</select></div>';
    html += '<div class="compare-select-group"><label>记录 B</label><select id="compare-select-b" class="compare-select" onchange="updateCompareChart(\'' + examType + '\')">';
    for (var i = 0; i < sorted.length; i++) {
        html += '<option value="' + i + '"' + (i === sorted.length - 1 ? ' selected' : '') + '>' + escapeHtml(sorted[i].date) + ' · ' + (sorted[i].total != null ? sorted[i].total.toFixed(1) : '-') + '</option>';
    }
    html += '</select></div>';
    html += '</div>';

    // 雷达图区域
    if (exam.subjects && exam.subjects.length >= 3) {
        html += '<div class="compare-radar-row">';
        html += '<div class="compare-radar-col"><div class="compare-radar-label">A</div><canvas id="compare-radar-a"></canvas></div>';
        html += '<div class="compare-radar-col"><div class="compare-radar-label">B</div><canvas id="compare-radar-b"></canvas></div>';
        html += '</div>';
    }

    // 差异表
    html += '<div id="compare-diff-table"></div>';

    body.innerHTML = html;

    // 初始渲染
    setTimeout(function() { updateCompareChart(examType); }, 50);
}

function updateCompareChart(examType) {
    var records = getRecords();
    var exams = allExams();
    var exam = exams[examType];
    var recs = records.filter(function(r) { return r.examType === examType; });
    var sorted = recs.slice().sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
    if (!exam || sorted.length < 2) return;

    var selA = document.getElementById('compare-select-a');
    var selB = document.getElementById('compare-select-b');
    if (!selA || !selB) return;

    var idxA = parseInt(selA.value) || 0;
    var idxB = parseInt(selB.value) || 0;
    var recA = sorted[idxA];
    var recB = sorted[idxB];
    if (!recA || !recB) return;

    var subjects = exam.subjects || [];
    var isIelts = examType === 'ielts';
    var theme = getExamTheme(examType);

    function normalize(s, val) {
        if (isIelts) return val;
        var mx;
        if (s.type === 'sections') mx = (s.sections || []).reduce(function(sum, sec) { return sum + (sec.max || 0) * (sec.score || 0); }, 0);
        else if (s.type === 'formula') mx = (s.max || 0) * (s.mult || 1);
        else mx = s.max || 100;
        if (!mx) mx = 100;
        return Math.round((val / mx) * 1000) / 10;
    }

    var labels = subjects.map(function(s) { return s.short || s.name; });
    var dataA = subjects.map(function(s) {
        var raw = recA.scores ? recA.scores[s.id] : undefined;
        return normalize(s, (raw !== undefined && raw !== null) ? Number(raw) : 0);
    });
    var dataB = subjects.map(function(s) {
        var raw = recB.scores ? recB.scores[s.id] : undefined;
        return normalize(s, (raw !== undefined && raw !== null) ? Number(raw) : 0);
    });

    // 更新雷达图
    var scaleMax = isIelts ? 9 : 100;
    var canvasA = document.getElementById('compare-radar-a');
    var canvasB = document.getElementById('compare-radar-b');

    if (canvasA && canvasB && subjects.length >= 3) {
        if (compareChartA) { compareChartA.destroy(); compareChartA = null; }
        if (compareChartB) { compareChartB.destroy(); compareChartB = null; }

        compareChartA = new Chart(canvasA.getContext('2d'), {
            type: 'radar',
            data: { labels: labels, datasets: [{ data: dataA, backgroundColor: theme.accent + '25', borderColor: theme.accent, borderWidth: 2, pointBackgroundColor: theme.accent, pointRadius: 3 }] },
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { r: { beginAtZero: true, max: scaleMax, ticks: { stepSize: isIelts ? 1 : 20, font: { size: 9 } }, pointLabels: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.06)' } } } }
        });

        compareChartB = new Chart(canvasB.getContext('2d'), {
            type: 'radar',
            data: { labels: labels, datasets: [{ data: dataB, backgroundColor: 'rgba(59,130,246,0.15)', borderColor: '#3b82f6', borderWidth: 2, pointBackgroundColor: '#3b82f6', pointRadius: 3 }] },
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { r: { beginAtZero: true, max: scaleMax, ticks: { stepSize: isIelts ? 1 : 20, font: { size: 9 } }, pointLabels: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.06)' } } } }
        });
    }

    // 差异表
    var diffDiv = document.getElementById('compare-diff-table');
    if (diffDiv && subjects.length) {
        var dhtml = '<div class="compare-diff">';
        dhtml += '<div class="compare-diff-header"><span>科目</span><span>A (' + escapeHtml(recA.date) + ')</span><span>B (' + escapeHtml(recB.date) + ')</span><span>变化</span></div>';
        for (var i = 0; i < subjects.length; i++) {
            var s = subjects[i];
            var rawA = recA.scores ? recA.scores[s.id] : 0;
            var rawB = recB.scores ? recB.scores[s.id] : 0;
            var diff = Number(rawB) - Number(rawA);
            var diffColor = diff > 0 ? '#10b981' : (diff < 0 ? '#ef4444' : '#6b7280');
            var diffSign = diff > 0 ? '+' : '';
            dhtml += '<div class="compare-diff-row">';
            dhtml += '<span class="compare-diff-subject">' + escapeHtml(s.short || s.name) + '</span>';
            dhtml += '<span>' + Number(rawA).toFixed(s.dec) + '</span>';
            dhtml += '<span>' + Number(rawB).toFixed(s.dec) + '</span>';
            dhtml += '<span style="color:' + diffColor + ';font-weight:700;">' + diffSign + diff.toFixed(s.dec) + '</span>';
            dhtml += '</div>';
        }
        // 总分行
        if (recA.total != null && recB.total != null) {
            var tDiff = recB.total - recA.total;
            var tDiffColor = tDiff > 0 ? '#10b981' : (tDiff < 0 ? '#ef4444' : '#6b7280');
            var tDiffSign = tDiff > 0 ? '+' : '';
            dhtml += '<div class="compare-diff-row compare-diff-total">';
            dhtml += '<span class="compare-diff-subject" style="font-weight:700;">总分</span>';
            dhtml += '<span style="font-weight:700;">' + recA.total.toFixed(1) + '</span>';
            dhtml += '<span style="font-weight:700;">' + recB.total.toFixed(1) + '</span>';
            dhtml += '<span style="color:' + tDiffColor + ';font-weight:800;">' + tDiffSign + tDiff.toFixed(1) + '</span>';
            dhtml += '</div>';
        }
        dhtml += '</div>';
        diffDiv.innerHTML = dhtml;
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

    // AI 评论（手动触发版）
    var historyRecs = records.filter(r => r.examType === last.examType).map(r => r.total).slice(-5);
    var aiCache = getAiCache();
    var aiCacheKey = last.examType + ':' + last.total + ':' + historyRecs.join(',');
    var hasCached = aiCache.lastAiComment && aiCache.lastAiCacheKey === aiCacheKey;
    var curStyle = localStorage.getItem('myscore_ai_style') || 'storm';

    html += '<div id="panel-ai-section" style="margin-top:1.2rem;">';
    html += '<h3 class="panel-section-title">🤖 AI 点评</h3>';
    // 风格选择栏
    html += '<div id="panel-ai-style-bar" style="display:flex;gap:0.4rem;margin-bottom:0.5rem;flex-wrap:wrap;">';
    var styleList = [
        { key: 'storm', icon: '⛈️', label: '风暴' },
        { key: 'sun',   icon: '☀️', label: '暖阳' },
        { key: 'cold',  icon: '❄️', label: '冷锋' },
        { key: 'rain',  icon: '🌧️', label: '阵雨' }
    ];
    styleList.forEach(function(s) {
        var isActive = s.key === curStyle;
        var bg = isActive ? 'rgba(31,106,82,0.12)' : 'rgba(255,251,245,0.95)';
        var bc = isActive ? 'rgba(31,106,82,0.2)' : 'rgba(81,63,44,0.12)';
        var clr = isActive ? '#174f3d' : '#8e5520';
        html += '<button onclick="window._panelAiSetStyle(\'' + s.key + '\')" id="panel-style-' + s.key + '" style="font-size:0.78rem;padding:0.35rem 0.75rem;border-radius:99px;border:1px solid ' + bc + ';background:' + bg + ';color:' + clr + ';cursor:pointer;font-weight:700;">' + s.icon + ' ' + s.label + '</button>';
    });
    html += '</div>';

    // 评论框：有缓存显示缓存，无缓存显示开始按钮
    var boxStyle = 'background:rgba(221,238,231,0.72);border:1px solid rgba(31,106,82,0.14);border-radius:1rem;padding:1rem;color:#174f3d;line-height:1.7;font-size:0.95rem;position:relative;';
    if (hasCached) {
        html += '<div id="panel-ai-comment-box" style="' + boxStyle + '"></div>';
    } else {
        html += '<div id="panel-ai-comment-box" style="' + boxStyle + '">';
        html += '<div style="text-align:center;padding:0.5rem 0;">';
        html += '<div style="color:#6b7280;font-size:0.88rem;margin-bottom:0.7rem;">选择你喜欢的风格，开始获取 AI 点评</div>';
        html += '<button onclick="window._startPanelAiAnalysis()" style="background:rgba(31,106,82,0.1);color:#174f3d;border:1.5px solid rgba(31,106,82,0.2);padding:0.55rem 1.6rem;border-radius:99px;cursor:pointer;font-size:0.9rem;font-weight:700;">✨ 开始分析</button>';
        html += '</div></div>';
    }
    // 操作按钮（继续聊聊）
    var actionsDisplay = hasCached ? 'flex' : 'none';
    html += '<div id="panel-ai-actions" style="display:' + actionsDisplay + ';justify-content:flex-end;gap:0.5rem;margin-top:0.5rem;">';
    html += '<button onclick="window._panelShowReply()" style="font-size:0.82rem;color:#174f3d;background:rgba(255,251,245,0.95);border:1px solid rgba(31,106,82,0.16);padding:0.42rem 0.9rem;border-radius:99px;cursor:pointer;font-weight:700;">继续聊聊</button>';
    html += '</div>';
    // 回嘴输入区
    html += '<div id="panel-reply-input-area" style="display:none;margin-top:0.5rem;"><div style="display:flex;gap:0.5rem;">';
    html += '<input type="text" id="panel-user-rebuttal" autocomplete="off" placeholder="输入你想回应的话..." style="flex:1;border:1px solid rgba(81,63,44,0.14);border-radius:0.9rem;padding:0.65rem 0.8rem;outline:none;font-size:0.92rem;background:rgba(255,251,245,0.94);">';
    html += '<button onclick="window._panelSendRebuttal()" style="background:#1f6a52;color:white;border:none;padding:0.65rem 1rem;border-radius:0.9rem;cursor:pointer;font-size:0.9rem;font-weight:700;">发送</button>';
    html += '</div></div>';
    html += '</div>';

    body.innerHTML = html;

    // 存储面板上下文供 panel AI 函数使用
    window._panelAiCtx = { examType: last.examType, examName: exam ? exam.name : last.examType, score: last.total, history: historyRecs, exam: exam, analyzed: hasCached, lastComment: hasCached ? aiCache.lastAiComment : '' };

    // 如果有缓存，渲染缓存的评论
    if (hasCached) {
        var panelBox = document.getElementById('panel-ai-comment-box');
        if (panelBox) renderAiComment(panelBox, aiCache.lastAiComment, curStyle);
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

    // 添加预测虚线（如果缓存中有预测数据）
    var cached = _predictionCache['pred_' + examType];
    var labels = sorted.map(r => r.date);
    if (cached && cached.data && cached.data.prediction) {
        var pred = cached.data.prediction;
        var hasAppendedLabel = false;

        // 建立科目 ID → { name, color } 映射
        var subjectMap = {};
        if (exam && exam.subjects) {
            for (var si = 0; si < exam.subjects.length; si++) {
                subjectMap[exam.subjects[si].id] = { name: exam.subjects[si].name, color: exam.subjects[si].color };
            }
        }

        // 总分预测虚线
        var predTotal = pred.total;
        if (predTotal !== undefined && predTotal !== '-') {
            var predData = new Array(sorted.length).fill(null);
            predData.push(Number(predTotal));
            labels.push('预测');
            hasAppendedLabel = true;
            datasets.push({
                label: 'AI 预测', data: predData,
                borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)',
                borderWidth: 2, borderDash: [6, 4], pointStyle: 'triangle',
                pointRadius: 6, pointBackgroundColor: '#f59e0b',
                fill: false, tension: 0.3, spanGaps: false
            });
        }

        // 各科目预测虚线
        for (var key in pred) {
            if (key === 'total' || key === 'overall') continue;
            var subjInfo = subjectMap[key];
            if (subjInfo && pred[key] !== undefined && pred[key] !== '-') {
                if (!hasAppendedLabel) {
                    labels.push('预测');
                    hasAppendedLabel = true;
                }
                var sData = new Array(sorted.length).fill(null);
                sData.push(Number(pred[key]));
                datasets.push({
                    label: subjInfo.name + ' 预测', data: sData,
                    borderColor: subjInfo.color, borderWidth: 2, borderDash: [6, 4],
                    pointStyle: 'triangle', pointRadius: 5, pointBackgroundColor: subjInfo.color,
                    fill: false, tension: 0.3, spanGaps: false
                });
            }
        }
    }

    mainChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: { labels: labels, datasets: datasets },
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

    if (records.length >= 3) {
        var avgData = subjects.map(function(s) {
            var sum = 0, count = 0;
            records.forEach(function(r) {
                var raw = r.scores ? r.scores[s.id] : undefined;
                if (raw !== undefined && raw !== null) {
                    sum += normalize(s, Number(raw));
                    count++;
                }
            });
            return count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
        });
        datasets.push({ label: '平均', data: avgData, backgroundColor: 'rgba(59,130,246,0.08)', borderColor: '#3b82f6', borderWidth: 1.5, borderDash: [3,3], pointBackgroundColor: '#3b82f6', pointRadius: 3 });
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
window.openComparePanel = openComparePanel;
window.updateCompareChart = updateCompareChart;
window.retryPrediction = retryPrediction;

// ==================== 面板预测/薄弱项手动触发 ====================

window._startPanelPrediction = function(examType) {
    var ctx = window._panelExamCtx && window._panelExamCtx[examType];
    if (!ctx) return;
    var predEl = document.getElementById('panel-prediction-content');
    if (!predEl) return;
    // 清除失败缓存（手动触发）
    delete _predictionFailCache[examType];
    predEl.innerHTML = '<div class="prediction-loading"><span class="ai-thinking-dots"><span>.</span><span>.</span><span>.</span></span> AI 正在分析趋势</div>';
    fetchPrediction(examType, ctx.recs, ctx.exam, 0, predEl);
};

window._startPanelWeakness = function(examType) {
    var ctx = window._panelExamCtx && window._panelExamCtx[examType];
    if (!ctx) return;
    var el = document.getElementById('weakness-content');
    if (!el) return;
    el.innerHTML = '<div class="weakness-loading"><span class="ai-thinking-dots"><span>.</span><span>.</span><span>.</span></span> AI 正在分析薄弱项</div>';
    fetchWeaknessAnalysis(examType, ctx.recs, ctx.exam);
};

// ==================== 面板 AI 点评（手动触发） ====================

// 面板内切换 AI 风格
window._panelAiSetStyle = function(styleKey) {
    localStorage.setItem('myscore_ai_style', styleKey);
    // 更新按钮高亮
    var allStyles = ['storm', 'sun', 'cold', 'rain'];
    allStyles.forEach(function(s) {
        var btn = document.getElementById('panel-style-' + s);
        if (!btn) return;
        if (s === styleKey) {
            btn.style.background = 'rgba(31,106,82,0.12)';
            btn.style.borderColor = 'rgba(31,106,82,0.2)';
            btn.style.color = '#174f3d';
        } else {
            btn.style.background = 'rgba(255,251,245,0.95)';
            btn.style.borderColor = 'rgba(81,63,44,0.12)';
            btn.style.color = '#8e5520';
        }
    });
    // 如果已经分析过，切换风格后重新分析
    if (window._panelAiCtx && window._panelAiCtx.analyzed) {
        window._startPanelAiAnalysis();
    }
};

// 面板内开始 AI 分析
window._startPanelAiAnalysis = async function() {
    var ctx = window._panelAiCtx;
    if (!ctx) return;
    var box = document.getElementById('panel-ai-comment-box');
    var actions = document.getElementById('panel-ai-actions');
    if (!box) return;
    if (actions) actions.style.display = 'none';
    var replyArea = document.getElementById('panel-reply-input-area');
    if (replyArea) replyArea.style.display = 'none';

    var style = localStorage.getItem('myscore_ai_style') || 'storm';
    var teacherNames = { storm: '风暴老师', sun: '暖阳老师', cold: '冷锋老师', rain: '阵雨老师' };
    var teacherName = teacherNames[style] || 'AI 老师';

    // 显示加载
    box.innerHTML = '<strong>🤖 ' + escapeHtml(teacherName) + '：</strong> <span class="ai-thinking-dots">正在思考</span><span id="panel-ai-stream-text" style="display:none;"></span><span id="panel-ai-cursor" class="ai-cursor" style="display:none;">|</span>';

    try {
        var fullText = await postCommentStream(
            { examType: ctx.examName, currentScore: ctx.score, historyScores: ctx.history, style: style },
            function onChunk(delta, full) {
                var thinking = box.querySelector('.ai-thinking-dots');
                if (thinking) thinking.style.display = 'none';
                var span = document.getElementById('panel-ai-stream-text');
                var cursor = document.getElementById('panel-ai-cursor');
                if (span) { span.style.display = 'inline'; span.textContent = full; }
                if (cursor) cursor.style.display = 'inline';
            }
        );
        var cursor = document.getElementById('panel-ai-cursor');
        if (cursor) cursor.style.display = 'none';

        if (fullText) {
            ctx.analyzed = true;
            ctx.lastComment = fullText;
            renderAiComment(box, fullText, style);
            if (actions) actions.style.display = 'flex';
            logEvent('ai-comment', { examType: ctx.examType, style: style, length: fullText.length, stream: true });
        } else {
            box.innerHTML = '老师去吃饭了...';
        }
    } catch (err) {
        console.error(err);
        // fallback 到非流式
        try {
            var data = await postComment({ examType: ctx.examName, currentScore: ctx.score, historyScores: ctx.history, style: style });
            if (data.comment) {
                ctx.analyzed = true;
                ctx.lastComment = data.comment;
                renderAiComment(box, data.comment, style);
                if (actions) actions.style.display = 'flex';
                logEvent('ai-comment', { examType: ctx.examType, style: style, length: data.comment.length, stream: false });
            } else {
                box.innerHTML = '老师去吃饭了...';
            }
        } catch (err2) {
            console.error(err2);
            logEvent('ai-error', { examType: ctx.examType, error: err2.message });
            box.innerHTML = '<span style="color:#9ca3af;">老师断线了... </span><button onclick="window._startPanelAiAnalysis()" style="margin-left:0.5rem;font-size:0.82rem;color:#1f6a52;background:none;border:1px solid rgba(31,106,82,0.2);padding:0.3rem 0.8rem;border-radius:99px;cursor:pointer;">重试</button>';
        }
    }
};

// 面板内回嘴输入
window._panelShowReply = function() {
    var area = document.getElementById('panel-reply-input-area');
    var actions = document.getElementById('panel-ai-actions');
    if (area) area.style.display = 'block';
    if (actions) actions.style.display = 'none';
    var input = document.getElementById('panel-user-rebuttal');
    if (input) input.focus();
};

// 面板内发送回嘴
window._panelSendRebuttal = async function() {
    var ctx = window._panelAiCtx;
    if (!ctx) return;
    var input = document.getElementById('panel-user-rebuttal');
    var rebuttal = input ? input.value.trim() : '';
    if (!rebuttal) return;
    var box = document.getElementById('panel-ai-comment-box');
    var actions = document.getElementById('panel-ai-actions');
    if (!box) return;

    var style = localStorage.getItem('myscore_ai_style') || 'storm';
    var teacherNames = { storm: '风暴老师', sun: '暖阳老师', cold: '冷锋老师', rain: '阵雨老师' };
    box.innerHTML = '<strong>😤 你：</strong> ' + escapeHtml(rebuttal) + '<br><hr style="margin:8px 0;border:0;border-top:1px dashed #a7f3d0">🤖 ' + (teacherNames[style] || 'AI 老师') + '正在想怎么回你...';
    box.style.background = 'rgba(243,224,207,0.82)';
    box.style.color = '#8e5520';
    box.style.borderColor = 'rgba(188,108,37,0.24)';
    var replyArea = document.getElementById('panel-reply-input-area');
    if (replyArea) replyArea.style.display = 'none';

    try {
        var data = await postComment({
            examType: ctx.examName, currentScore: ctx.score, historyScores: ctx.history,
            userRebuttal: rebuttal, previousComment: ctx.lastComment, style: style
        });
        if (data.comment) {
            ctx.lastComment = data.comment;
            box.style.background = 'rgba(221,238,231,0.72)';
            box.style.color = '#174f3d';
            box.style.borderColor = 'rgba(31,106,82,0.14)';
            box.innerHTML = '<strong>😤 你：</strong> ' + escapeHtml(rebuttal) + '<br><br><strong>👩‍🏫 ' + (teacherNames[style] || 'AI 老师') + '：</strong> ' + escapeHtml(data.comment);
            if (actions) actions.style.display = 'flex';
            if (input) input.value = '';
            logEvent('ai-rebuttal', { examType: ctx.examType, style: style, length: data.comment.length });
        }
    } catch (err) {
        console.error(err);
        logEvent('ai-error', { examType: ctx.examType, type: 'rebuttal', error: err.message });
        box.innerHTML += '<br><span style="color:#9ca3af;">(老师被气得掉线了)</span>';
    }
};
