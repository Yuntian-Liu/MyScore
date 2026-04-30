// ==================== 仪表盘 / 图表 / 历史记录 ====================
import { STORAGE, ACHIEVEMENTS, XP_PER_LEVEL } from './config.js';
import { escapeHtml, getExamTheme, getExamBadgeMarkup } from './utils.js';
import { getRecords, saveRecords, allExams, buildArchiveHighlights } from './storage.js';
import { isLoggedIn, getUserMode, _isSyncing } from './auth.js';
import { addXP, getGamificationData } from './gamification.js';
import { fetchAIComment, renderAiComment, triggerLocalAiComment, showLocalAiHint, hideLocalAiHint, showModeChoiceModal, getAiCache, getGoal, currentAiStyle } from './ai.js';

let mainChartInstance = null;
let radarChartInstance = null;

export function renderDashboard() {
    if (typeof window.updatePetMood === 'function') window.updatePetMood();

    // 每日首次查看仪表盘 XP（静默，不弹 toast）
    addXP('dashboard', { silent: true });

    // 游戏化 UI
    var _gamData = getGamificationData();
    renderXpBar(_gamData.xp);
    renderStreakIndicator(_gamData.streak);
    renderAchievementWall(_gamData.achievements);

    const records = getRecords();
    const exams = allExams();

    document.getElementById('total-count').textContent = records.length;
    const types = [...new Set(records.map(r => r.examType))];
    document.getElementById('exam-types-count').textContent = types.length;
    document.getElementById('record-count').textContent = records.length;
    const recordCountSide = document.getElementById('record-count-side');
    if (recordCountSide) recordCountSide.textContent = records.length;
    document.getElementById('latest-exam-date').textContent = records.length ? records[records.length-1].date : '-';

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

    // 最近成绩
    const recentDiv = document.getElementById('recent-score-content');
    if (!records.length) {
        recentDiv.innerHTML = '<div class="empty-state"><svg width="64" height="64" fill="none" stroke="#d1d5db" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom:1rem;"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg><p style="color:#6b7280;margin-bottom:1rem;">还没有成绩记录</p><button onclick="showPage(\'entry\')" style="color:#10b981;font-weight:600;background:none;border:none;cursor:pointer;">开始录入 →</button></div>';
    } else {
        const last = records[records.length-1];
        const exam = exams[last.examType];
        const isCet = last.examType === 'cet4' || last.examType === 'cet6';

        let html = '<div style="margin-bottom:0.5rem;color:#6b7280;">' + escapeHtml(last.date) + ' - ' + escapeHtml(exam ? exam.name : '未知') + '</div>';
        html += '<div class="recent-score-grid">';
        if (exam) {
            for (const s of exam.subjects) {
                if (isCet && (s.id === 'writing' || s.id === 'translation')) continue;
                const sc = last.scores[s.id] || 0;
                html += '<div class="recent-score-item" style="background:' + s.color + '15;border:2px solid ' + s.color + '40;"><div class="recent-score-item-label" style="color:' + s.color + ';">' + escapeHtml(s.name) + '</div><div class="recent-score-item-value" style="color:' + s.color + ';">' + sc.toFixed(s.dec) + '</div></div>';
            }
            if (isCet) {
                const wtTotal = (last.scores['writing'] || 0) + (last.scores['translation'] || 0);
                html += '<div class="recent-score-item" style="background:#f59e0b15;border:2px solid #f59e0b40;"><div class="recent-score-item-label" style="color:#f59e0b;">写作和翻译</div><div class="recent-score-item-value" style="color:#f59e0b;">' + wtTotal + '</div></div>';
            }
        }
        html += '</div>';
        var totalLabel = last.examType === 'ielts' ? 'Overall' : '总分';
        if (last.total !== null) {
            html += '<div class="total-preview"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-weight:600;color:#059669;">' + totalLabel + '</span><span style="font-size:2.5rem;font-weight:bold;" class="gradient-text">' + last.total.toFixed(1) + '</span></div></div>';
            var goalKey = last.examType;
            var goal = getGoal(goalKey);
            if (goal !== null) {
                var pct = Math.min(100, Math.round((last.total / goal) * 100));
                var barColor = pct >= 100 ? '#10b981' : (pct >= 70 ? '#f59e0b' : '#ef4444');
                html += '<div style="margin-top:0.5rem;padding:0.6rem 0.8rem;background:rgba(31,106,82,0.05);border-radius:0.8rem;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.35rem;"><span style="font-size:0.82rem;color:#6b7280;font-weight:600;">目标 ' + goal.toFixed(1) + '</span><span style="font-size:0.82rem;color:' + barColor + ';font-weight:700;">' + pct + '%</span></div><div style="height:6px;background:rgba(0,0,0,0.06);border-radius:3px;overflow:hidden;"><div style="width:' + pct + '%;height:100%;background:' + barColor + ';border-radius:3px;transition:width 0.4s ease;"></div></div></div>';
            }
            html += '<div style="text-align:right;margin-top:0.4rem;"><button onclick="promptSetGoal(\'' + escapeHtml(goalKey) + '\')" style="font-size:0.78rem;color:#1f6a52;background:none;border:1px solid rgba(31,106,82,0.18);border-radius:99px;padding:0.25rem 0.7rem;cursor:pointer;font-weight:600;">' + (goal !== null ? '修改目标' : '设置目标') + '</button></div>';
        }

        // 对比分析
        var sameTypeRecords = records.filter(function(r) { return r.examType === last.examType; });
        if (sameTypeRecords.length >= 2) {
            var prev = sameTypeRecords[sameTypeRecords.length - 2];
            html += '<div style="margin-top:0.6rem;padding:0.7rem 0.8rem;background:rgba(31,106,82,0.04);border-radius:0.8rem;"><div style="font-size:0.82rem;color:#6b7280;font-weight:600;margin-bottom:0.4rem;">对比上次</div>';
            if (exam) {
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

        recentDiv.innerHTML = html;

        // AI 评论
        const historyRecs = records.filter(r => r.examType === last.examType).map(r => r.total).slice(-5);
        const aiCache = getAiCache();
        const aiCacheKey = last.examType + ':' + last.total + ':' + historyRecs.join(',');
        if (isLoggedIn()) {
            if (aiCacheKey !== aiCache.lastAiCacheKey) {
                fetchAIComment(exam ? exam.name : last.examType, last.total, historyRecs);
            } else {
                const box = document.getElementById('ai-comment-box');
                const container = document.getElementById('ai-container');
                const actions = document.getElementById('ai-actions');
                if (container) container.style.display = 'block';
                if (box && aiCache.lastAiComment) renderAiComment(box, aiCache.lastAiComment);
                if (actions) actions.style.display = 'flex';
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

    // Tabs
    const tabsDiv = document.getElementById('dashboard-tabs');
    let tabsHtml = '<button class="tab-btn active" onclick="switchDashboardTab(\'overview\', this)">概览</button>';
    for (const tid of types) {
        const e = exams[tid];
        if (e) tabsHtml += '<button class="tab-btn" onclick="switchDashboardTab(\'' + tid + '\', this)">' + escapeHtml(e.name) + '</button>';
    }
    tabsDiv.innerHTML = tabsHtml;

    // 历史记录
    const listDiv = document.getElementById('records-list');
    if (!records.length) {
        listDiv.innerHTML = '<div class="empty-state" style="padding:2rem;"><p style="color:#9ca3af;">暂无历史记录</p></div>';
    } else {
        let listHtml = '';
        for (let i = records.length - 1; i >= 0; i--) {
            const r = records[i];
            const e = exams[r.examType];
            if (!e) continue;
            const isCet = r.examType === 'cet4' || r.examType === 'cet6';
            let badges = '';
            for (const s of e.subjects) {
                if (isCet && (s.id === 'writing' || s.id === 'translation')) continue;
                const sc = r.scores[s.id] || 0;
                badges += '<span class="score-badge" style="background:' + s.color + '15;color:' + s.color + ';">' + escapeHtml(s.short) + ': ' + sc.toFixed(s.dec) + '</span>';
            }
            if (isCet) {
                const wtTotal = (r.scores['writing'] || 0) + (r.scores['translation'] || 0);
                badges += '<span class="score-badge" style="background:#f59e0b15;color:#f59e0b;">写作和翻译: ' + wtTotal + '</span>';
            }
            const theme = getExamTheme(r.examType);
            listHtml += '<div class="record-box" style="border-color:' + theme.accent + '26;box-shadow:0 16px 34px -30px ' + theme.accent + '66;"><div class="record-row"><div class="record-main"><div class="record-meta">' + getExamBadgeMarkup(r.examType, e.name, 38) + '<span style="font-weight:700;color:' + theme.strong + ';">' + escapeHtml(e.name) + '</span><span style="color:#9ca3af;font-size:0.875rem;">' + escapeHtml(r.date) + '</span></div><div class="record-badges">' + badges + '</div></div><div class="record-side">';
            if (r.total !== null) {
                const totalLabel2 = r.examType === 'ielts' ? 'Overall' : '总分';
                listHtml += '<div class="record-total"><div style="font-size:0.75rem;color:#9ca3af;">' + totalLabel2 + '</div><div style="font-size:1.75rem;font-weight:bold;color:' + theme.strong + ';">' + r.total.toFixed(1) + '</div></div>';
            }
            listHtml += '<button class="record-delete" onclick="deleteRecord(' + r.id + ')">×</button></div></div></div>';
        }
        listDiv.innerHTML = listHtml;
    }
}

function switchDashboardTab(tab, btnElement) {
    const btn = btnElement || document.querySelector('.tab-btn.active');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const chartsContainer = document.getElementById('charts-container');
    const overviewEmpty = document.getElementById('overview-empty');

    if (tab === 'overview') {
        overviewEmpty.style.display = 'block'; chartsContainer.style.display = 'none';
        const rw = document.getElementById('radar-chart-wrapper'); if (rw) rw.style.display = 'none';
        return;
    }

    const exams = allExams();
    const exam = exams[tab];
    const recs = getRecords().filter(r => r.examType === tab);
    overviewEmpty.style.display = 'none';
    if (!recs.length) {
        overviewEmpty.innerHTML = '<p style="color:#9ca3af;">暂无' + escapeHtml(exam ? exam.name : '') + '数据</p>';
        chartsContainer.style.display = 'none';
        return;
    }

    let statsHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;margin-bottom:1.5rem;">';
    statsHtml += '<div class="stat-box"><p style="color:#6b7280;font-size:0.875rem;">考试次数</p><p style="font-size:2rem;font-weight:bold;" class="gradient-text">' + recs.length + '</p></div>';
    statsHtml += '<div class="stat-box"><p style="color:#6b7280;font-size:0.875rem;">最近</p><p style="font-size:1.25rem;font-weight:bold;">' + escapeHtml(recs[recs.length-1].date) + '</p></div>';
    if (exam.calcTotal) {
        const totals = recs.map(r => r.total).filter(t => typeof t === 'number' && isFinite(t));
        if (totals.length > 0) {
            const rootStyle = getComputedStyle(document.documentElement);
            const accentColor = rootStyle.getPropertyValue('--accent').trim() || '#c35f3d';
            const supportColor = rootStyle.getPropertyValue('--support').trim() || '#7b6aa6';
            statsHtml += '<div class="stat-box"><p style="color:#6b7280;font-size:0.875rem;">最佳</p><p style="font-size:2rem;font-weight:bold;color:' + accentColor + ';">' + Math.max(...totals).toFixed(1) + '</p></div>';
            statsHtml += '<div class="stat-box"><p style="color:#6b7280;font-size:0.875rem;">平均</p><p style="font-size:2rem;font-weight:bold;color:' + supportColor + ';">' + (totals.reduce((a,b)=>a+b,0)/totals.length).toFixed(1) + '</p></div>';
        }
    }
    statsHtml += '</div>';
    const statsArea = document.getElementById('stats-area');
    if (statsArea) statsArea.innerHTML = statsHtml;
    else overviewEmpty.innerHTML = statsHtml;

    chartsContainer.style.display = 'block';
    renderMainChart(tab, recs, exam);
    renderRadarChart(tab, recs, exam);
}

function renderMainChart(examType, records, exam) {
    const canvas = document.getElementById('main-chart');
    const noDataEl = document.getElementById('chart-no-data');
    if (!canvas) return;
    if (mainChartInstance) { mainChartInstance.destroy(); mainChartInstance = null; }
    if (records.length === 0) { noDataEl.style.display = 'block'; canvas.parentElement.style.display = 'none'; return; }
    noDataEl.style.display = 'none';
    canvas.parentElement.style.display = 'block';

    const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
    let datasets = [];

    if (examType === 'ielts') {
        datasets = [
            { label: 'Overall', data: sorted.map(r => r.total), borderColor: '#275b56', backgroundColor: 'rgba(39,91,86,0.12)', borderWidth: 3, fill: true, tension: 0.3, pointRadius: 5 },
            { label: 'Listening', data: sorted.map(r => r.scores.listening || 0), borderColor: '#4d7298', borderWidth: 2, tension: 0.3, pointRadius: 4 },
            { label: 'Reading', data: sorted.map(r => r.scores.reading || 0), borderColor: '#275b56', borderWidth: 2, tension: 0.3, pointRadius: 4 },
            { label: 'Writing', data: sorted.map(r => r.scores.writing || 0), borderColor: '#c35f3d', borderWidth: 2, tension: 0.3, pointRadius: 4 },
            { label: 'Speaking', data: sorted.map(r => r.scores.speaking || 0), borderColor: '#7b6aa6', borderWidth: 2, tension: 0.3, pointRadius: 4 }
        ];
    } else if (examType === 'cet4' || examType === 'cet6') {
        const color = examType === 'cet4' ? '#275b56' : '#7b6aa6';
        datasets = [
            { label: '总分', data: sorted.map(r => r.total), borderColor: color, backgroundColor: color + '20', borderWidth: 3, fill: true, tension: 0.3, pointRadius: 5 },
            { label: '听力', data: sorted.map(r => r.scores.listening || 0), borderColor: '#4d7298', borderWidth: 2, tension: 0.3, pointRadius: 4 },
            { label: '阅读', data: sorted.map(r => r.scores.reading || 0), borderColor: '#275b56', borderWidth: 2, tension: 0.3, pointRadius: 4 },
            { label: '写作和翻译', data: sorted.map(r => (r.scores.writing || 0) + (r.scores.translation || 0)), borderColor: '#c35f3d', borderWidth: 2, tension: 0.3, pointRadius: 4 }
        ];
    } else {
        datasets = [{ label: '总分', data: sorted.map(r => r.total), borderColor: '#275b56', backgroundColor: 'rgba(39,91,86,0.12)', borderWidth: 3, fill: true, tension: 0.3, pointRadius: 5 }];
        for (const s of exam.subjects) {
            datasets.push({ label: s.name, data: sorted.map(r => r.scores[s.id] || 0), borderColor: s.color, borderWidth: 2, tension: 0.3, pointRadius: 4 });
        }
    }

    const ctx = canvas.getContext('2d');
    mainChartInstance = new Chart(ctx, {
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

function renderRadarChart(examType, records, exam) {
    const wrapper = document.getElementById('radar-chart-wrapper');
    const canvas = document.getElementById('radar-chart');
    if (!wrapper || !canvas) return;
    if (radarChartInstance) { radarChartInstance.destroy(); radarChartInstance = null; }

    if (!records || !records.length || !exam || !exam.subjects || exam.subjects.length < 3) {
        wrapper.style.display = 'none';
        return;
    }

    wrapper.style.display = 'block';
    const subjects = exam.subjects;
    const latest = records[records.length - 1];

    // Build axis labels and data
    const labels = subjects.map(s => s.name || s.short);
    const latestData = subjects.map(s => {
        const raw = latest.scores ? latest.scores[s.id] : undefined;
        if (raw === undefined || raw === null) return 0;
        return Number(raw);
    });

    // Normalize to 0-100 for CET, keep 0-9 for IELTS, use % for custom
    const isIelts = examType === 'ielts';
    const normalizedData = subjects.map((s, i) => {
        const val = latestData[i];
        if (isIelts) return val;
        // Calculate actual max score per subject type
        var subjectMax;
        if (s.type === 'sections') {
            // sections: max = sum of (sec.max * sec.score)
            subjectMax = (s.sections || []).reduce(function(sum, sec) { return sum + (sec.max || 0) * (sec.score || 0); }, 0);
        } else if (s.type === 'formula') {
            // formula: max = raw max * multiplier
            subjectMax = (s.max || 0) * (s.mult || 1);
        } else {
            subjectMax = s.max || 100;
        }
        if (!subjectMax) subjectMax = 100;
        return Math.round((val / subjectMax) * 1000) / 10; // percentage with 1 decimal
    });

    const theme = getExamTheme(examType) || { accent: '#275b56' };
    const primaryColor = theme.accent || '#275b56';

    const datasets = [{
        label: '最近',
        data: normalizedData,
        backgroundColor: primaryColor + '25',
        borderColor: primaryColor,
        borderWidth: 2,
        pointBackgroundColor: primaryColor,
        pointRadius: 4,
        pointHoverRadius: 6
    }];

    // Best record overlay
    if (records.length >= 2) {
        const totals = records.map(r => r.total || 0);
        const bestIdx = totals.indexOf(Math.max(...totals));
        const best = records[bestIdx];
        const bestData = subjects.map((s, i) => {
            const raw = best.scores ? best.scores[s.id] : undefined;
            if (raw === undefined || raw === null) return 0;
            const val = Number(raw);
            if (isIelts) return val;
            var subjectMax;
            if (s.type === 'sections') { subjectMax = (s.sections || []).reduce(function(sum, sec) { return sum + (sec.max || 0) * (sec.score || 0); }, 0); }
            else if (s.type === 'formula') { subjectMax = (s.max || 0) * (s.mult || 1); }
            else { subjectMax = s.max || 100; }
            if (!subjectMax) subjectMax = 100;
            return Math.round((val / subjectMax) * 1000) / 10;
        });
        datasets.push({
            label: '最佳',
            data: bestData,
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderColor: '#f59e0b',
            borderWidth: 1.5,
            borderDash: [5, 5],
            pointBackgroundColor: '#f59e0b',
            pointRadius: 3,
            pointHoverRadius: 5
        });
    }

    // Average overlay (3+ records)
    if (records.length >= 3) {
        const avgData = subjects.map((s, i) => {
            const vals = records.map(r => {
                const raw = r.scores ? r.scores[s.id] : undefined;
                if (raw === undefined || raw === null) return 0;
                return Number(raw);
            });
            const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
            if (isIelts) return Math.round(avg * 10) / 10;
            var subjectMax;
            if (s.type === 'sections') { subjectMax = (s.sections || []).reduce(function(sum, sec) { return sum + (sec.max || 0) * (sec.score || 0); }, 0); }
            else if (s.type === 'formula') { subjectMax = (s.max || 0) * (s.mult || 1); }
            else { subjectMax = s.max || 100; }
            if (!subjectMax) subjectMax = 100;
            return Math.round((avg / subjectMax) * 1000) / 10;
        });
        datasets.push({
            label: '平均',
            data: avgData,
            backgroundColor: 'rgba(107, 114, 128, 0.08)',
            borderColor: '#9ca3af',
            borderWidth: 1,
            borderDash: [3, 3],
            pointBackgroundColor: '#9ca3af',
            pointRadius: 2,
            pointHoverRadius: 4
        });
    }

    const scaleMax = isIelts ? 9 : 100;
    const ctx = canvas.getContext('2d');
    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12, font: { size: 12 } } }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: scaleMax,
                    ticks: { stepSize: isIelts ? 1 : 20, font: { size: 10 } },
                    pointLabels: { font: { size: 12, weight: 'bold' }, color: '#374151' },
                    grid: { color: 'rgba(0,0,0,0.06)' }
                }
            }
        }
    });
}

function deleteRecord(id) {
    if (!confirm('确定删除这条记录？')) return;
    saveRecords(getRecords().filter(r => r.id !== id));
    renderDashboard();
}

function clearAllRecords() {
    if (!confirm('确定清空所有记录？此操作不可恢复！')) return;
    localStorage.removeItem(STORAGE.RECORDS);
    if (!isLoggedIn()) { if (window.scheduleCloudSync) window.scheduleCloudSync(); }
    renderDashboard();
}

// ---- 游戏化 UI 渲染 ----

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

// ---- 挂载到 window ----
window.renderDashboard = renderDashboard;
window.switchDashboardTab = switchDashboardTab;
window.deleteRecord = deleteRecord;
window.clearAllRecords = clearAllRecords;
