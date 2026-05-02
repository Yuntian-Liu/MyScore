// ==================== 报告导出功能 ====================
import { APP_VERSION } from './config.js';
import { escapeHtml, escapeAttr, getExamTheme, getExamBadgeMarkup, getReportTypeIconMarkup } from './utils.js';
import { getRecords, allExams } from './storage.js';
import { addXP } from './gamification.js';
import { logEvent } from './logger.js';
let currentReportType = 'scorecard';

function openReportModal() {
    const records = getRecords();
    if (!records.length) {
        alert('暂无成绩记录，请先录入成绩！');
        return;
    }

    const select = document.getElementById('report-exam-select');
    const exams = allExams();
    let options = '<option value="all">全部考试类型</option>';

    const usedTypes = new Set(records.map(r => r.examType));
    for (const type of usedTypes) {
        if (exams[type]) {
            options += `<option value="${escapeAttr(type)}">${escapeHtml(exams[type].name)}</option>`;
        }
    }
    select.innerHTML = options;

    document.getElementById('report-modal').classList.add('active');
    renderReportPreview();
}

function closeReportModal() {
    document.getElementById('report-modal').classList.remove('active');
}

function closeReportModalOnBackdrop(event) {
    if (event.target.id === 'report-modal') {
        closeReportModal();
    }
}

function selectReportType(type, element) {
    currentReportType = type;
    document.querySelectorAll('#report-modal .exam-card').forEach(card => {
        card.classList.remove('active');
    });
    element.classList.add('active');
    document.getElementById('report-record-row').style.display = type === 'sharecard' ? '' : 'none';
    document.getElementById('report-range-row').style.display = type === 'scorecard' ? '' : 'none';
    if (type === 'sharecard') populateRecordSelect();
    renderReportPreview();
}

function onReportExamChange() {
    if (currentReportType === 'sharecard') populateRecordSelect();
    renderReportPreview();
}

function populateRecordSelect() {
    const examType = document.getElementById('report-exam-select').value;
    const exams = allExams();
    let records = getRecords();
    if (examType !== 'all') {
        records = records.filter(r => r.examType === examType);
    }
    records = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));

    const select = document.getElementById('report-record-select');
    let options = '';
    records.forEach(function(r, i) {
        var examName = exams[r.examType] ? exams[r.examType].name : r.examType;
        var scoreText = (r.total !== null && r.total !== undefined) ? (r.total.toFixed(1) + ' 分') : '';
        options += '<option value="' + i + '">' + escapeHtml(r.date + ' · ' + examName + (scoreText ? ' · ' + scoreText : '')) + '</option>';
    });
    select.innerHTML = options || '<option value="0">暂无记录</option>';
}

function buildShareTrendData(records) {
    const recentRecords = records.slice(0, 5).reverse();
    const scores = recentRecords.map(function (record) {
        return typeof record.total === 'number' ? record.total : 0;
    });
    const minScore = Math.min.apply(null, scores);
    const maxScore = Math.max.apply(null, scores);
    const range = Math.max(maxScore - minScore, 1);

    return recentRecords.map(function (record, index) {
        const score = typeof record.total === 'number' ? record.total : minScore;
        return {
            label: record.date.slice(5),
            score: score,
            xRatio: recentRecords.length === 1 ? 0.5 : index / (recentRecords.length - 1),
            yRatio: 1 - ((score - minScore) / range)
        };
    });
}

function renderReportPreview() {
    const container = document.getElementById('report-preview');
    const examType = document.getElementById('report-exam-select').value;
    const range = document.getElementById('report-range').value;

    let records = getRecords();
    if (examType !== 'all') {
        records = records.filter(r => r.examType === examType);
    }

    records = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (range !== 'all') {
        records = records.slice(0, parseInt(range));
    }

    if (!records.length) {
        container.innerHTML = '<p style="color:#9ca3af;text-align:center;">所选范围内暂无数据</p>';
        return;
    }

    const exams = allExams();
    const previewTheme = getExamTheme(examType === 'all' ? (records[0] && records[0].examType) : examType);

    if (currentReportType === 'scorecard') {
        let html = `<div style="font-family:Manrope,sans-serif;color:#243144;">`;
        html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1.2rem;padding:1rem 1.1rem;border-radius:20px;background:linear-gradient(135deg,${previewTheme.soft},${previewTheme.softAlt});border:1px solid ${previewTheme.accent}22;">`;
        html += `<div style="display:flex;align-items:center;gap:0.85rem;">${getReportTypeIconMarkup('scorecard', 34)}<div><h3 style="font-size:1.18rem;font-weight:800;color:${previewTheme.strong};margin-bottom:0.18rem;">MyScore 成绩报告</h3><p style="font-size:0.82rem;color:#6d758d;">按考试类型整理近期表现与总分记录</p></div></div>`;
        html += `<div style="text-align:right;font-size:0.8rem;color:#6d758d;"><div>生成时间</div><div style="font-weight:700;color:${previewTheme.strong};margin-top:0.12rem;">${escapeHtml(new Date().toLocaleString('zh-CN'))}</div></div>`;
        html += `</div>`;

        const grouped = {};
        records.forEach(r => {
            if (!grouped[r.examType]) grouped[r.examType] = [];
            grouped[r.examType].push(r);
        });

        for (const [type, recs] of Object.entries(grouped)) {
            const exam = exams[type];
            if (!exam) continue;
            const theme = getExamTheme(type);

            html += `<div style="margin-bottom:1.35rem;border:1px solid ${theme.accent}1f;border-radius:20px;padding:1rem;background:linear-gradient(180deg,#ffffff,${theme.soft});box-shadow:0 18px 44px -36px ${theme.accent}66;">`;
            html += `<div style="display:flex;align-items:center;gap:0.85rem;margin-bottom:0.85rem;">${getExamBadgeMarkup(type, exam.name, 42)}<div><h4 style="font-weight:800;color:${theme.strong};margin-bottom:0.16rem;">${escapeHtml(exam.name)}</h4><div style="font-size:0.8rem;color:#7a8298;">${escapeHtml(exam.desc || '考试记录')}</div></div></div>`;
            html += `<table style="width:100%;border-collapse:separate;border-spacing:0;font-size:0.84rem;overflow:hidden;border-radius:16px;">`;
            html += `<tr style="background:${theme.softAlt};">`;
            html += `<th style="padding:0.68rem;text-align:left;border-top:1px solid ${theme.accent}18;border-bottom:1px solid ${theme.accent}18;">日期</th>`;

            const subjects = exam.subjects || [];
            subjects.forEach(s => {
                if (type === 'cet4' || type === 'cet6') {
                    if (s.id === 'writing' || s.id === 'translation') return;
                }
                html += `<th style="padding:0.68rem;text-align:center;border-top:1px solid ${theme.accent}18;border-bottom:1px solid ${theme.accent}18;">${escapeHtml(s.short)}</th>`;
            });
            if (type === 'cet4' || type === 'cet6') {
                html += `<th style="padding:0.68rem;text-align:center;border-top:1px solid ${theme.accent}18;border-bottom:1px solid ${theme.accent}18;">写作翻译</th>`;
            }
            if (exam.calcTotal) {
                const totalLabel = type === 'ielts' ? 'Overall' : '总分';
                html += `<th style="padding:0.68rem;text-align:center;border-top:1px solid ${theme.accent}18;border-bottom:1px solid ${theme.accent}18;">${totalLabel}</th>`;
            }
            html += `</tr>`;

            recs.forEach((r, index) => {
                const rowBg = index % 2 === 0 ? '#ffffff' : theme.soft;
                html += `<tr style="background:${rowBg};">`;
                html += `<td style="padding:0.62rem 0.68rem;border-bottom:1px solid ${theme.accent}14;">${escapeHtml(r.date)}</td>`;
                subjects.forEach(s => {
                    if (type === 'cet4' || type === 'cet6') {
                        if (s.id === 'writing' || s.id === 'translation') return;
                    }
                    const score = r.scores[s.id] || 0;
                    html += `<td style="padding:0.62rem 0.68rem;text-align:center;border-bottom:1px solid ${theme.accent}14;">${score.toFixed(s.dec || 1)}</td>`;
                });
                if (type === 'cet4' || type === 'cet6') {
                    const wt = (r.scores.writing || 0) + (r.scores.translation || 0);
                    html += `<td style="padding:0.62rem 0.68rem;text-align:center;border-bottom:1px solid ${theme.accent}14;">${wt}</td>`;
                }
                if (exam.calcTotal) {
                    const totalText = r.total === null || r.total === undefined ? '-' : r.total.toFixed(1);
                    html += `<td style="padding:0.62rem 0.68rem;text-align:center;border-bottom:1px solid ${theme.accent}14;font-weight:800;color:${theme.strong};">${totalText}</td>`;
                }
                html += `</tr>`;
            });

            html += `</table></div>`;
        }

        html += `</div>`;
        container.innerHTML = html;
    } else {
        var recordSelect = document.getElementById('report-record-select');
        var selectedIdx = recordSelect ? parseInt(recordSelect.value) : 0;
        var allFiltered = getRecords();
        if (examType !== 'all') allFiltered = allFiltered.filter(r => r.examType === examType);
        allFiltered = [...allFiltered].sort((a, b) => new Date(b.date) - new Date(a.date));
        if (isNaN(selectedIdx) || selectedIdx < 0 || selectedIdx >= allFiltered.length) selectedIdx = 0;
        const latest = allFiltered[selectedIdx] || records[0];
        const exam = exams[latest.examType];
        const theme = getExamTheme(latest.examType);
        const trendData = buildShareTrendData(allFiltered);

        let html = `<div style="font-family:Manrope,sans-serif;">`;
        html += `<div style="background:linear-gradient(140deg,${theme.reportGradientStart},${theme.reportGradientEnd});border-radius:30px;padding:1.5rem 1.35rem 1.4rem;color:white;text-align:center;position:relative;overflow:hidden;min-height:235px;">`;
        html += `<div style="position:absolute;inset:-46px auto auto -44px;width:132px;height:132px;border-radius:50%;background:rgba(255,255,255,0.12);"></div>`;
        html += `<div style="position:absolute;inset:auto -48px -62px auto;width:176px;height:176px;border-radius:50%;background:rgba(255,255,255,0.12);"></div>`;
        html += `<div style="position:relative;display:flex;justify-content:center;margin-bottom:0.9rem;">${getExamBadgeMarkup(latest.examType, exam ? exam.name : '考试', 56)}</div>`;
        html += `<div style="position:relative;font-size:1.15rem;font-weight:800;margin-bottom:0.35rem;">${escapeHtml(exam ? exam.name : '考试')}</div>`;
        html += `<div style="position:relative;font-size:0.8rem;opacity:0.92;">${escapeHtml(latest.date)}</div>`;

        if (latest.total !== null) {
            html += `<div style="position:relative;font-size:3.6rem;line-height:1;font-weight:800;margin:1.2rem 0 0.5rem;font-style:italic;">${latest.total.toFixed(1)}</div>`;
            html += `<div style="position:relative;font-size:0.84rem;opacity:0.86;">${latest.examType === 'ielts' ? 'Overall' : '总分'}</div>`;
        }
        html += `</div>`;

        if (trendData.length > 1) {
            const chartW = 520;
            const chartH = 124;
            const path = trendData.map(function (point, index) {
                const x = 42 + point.xRatio * (chartW - 84);
                const y = 18 + point.yRatio * (chartH - 42);
                return (index === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2);
            }).join(' ');

            html += `<div style="margin-top:1rem;padding:1rem 1.1rem 0.9rem;border:1px solid ${theme.accent}1f;border-radius:24px;background:linear-gradient(180deg,#ffffff,${theme.soft});">`;
            html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.55rem;"><div style="font-size:0.88rem;font-weight:700;color:${theme.strong};">最近 5 次趋势</div><div style="font-size:0.75rem;color:#7d8599;">${escapeHtml(exam ? exam.desc : '成绩摘要')}</div></div>`;
            html += `<svg viewBox="0 0 ${chartW} ${chartH}" width="100%" height="124" aria-hidden="true">`;
            html += `<path d="${path}" fill="none" stroke="${theme.accent}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`;
            trendData.forEach(function (point, index) {
                const x = 42 + point.xRatio * (chartW - 84);
                const y = 18 + point.yRatio * (chartH - 42);
                const radius = index === trendData.length - 1 ? 7 : 5;
                html += `<circle cx="${x}" cy="${y}" r="${radius}" fill="${index === trendData.length - 1 ? '#ffffff' : theme.accent}" stroke="${theme.accent}" stroke-width="3"/>`;
            });
            html += `</svg>`;
            html += `<div style="display:grid;grid-template-columns:repeat(${trendData.length},minmax(0,1fr));gap:0.5rem;margin-top:0.1rem;">`;
            trendData.forEach(function (point) {
                html += `<div style="text-align:center;font-size:0.7rem;color:#9ca3af;">${escapeHtml(point.label)}</div>`;
            });
            html += `</div></div>`;
        }

        // SVG 雷达图
        var hasRadar = exam && exam.subjects && exam.subjects.length >= 3 && latest.scores;
        if (hasRadar) {
            var isIelts = latest.examType === 'ielts';
            var subjects = exam.subjects;
            var radarLabels = subjects.map(function(s) { return s.short || s.name; });

            function normalizeRadar(s, val) {
                if (isIelts) return val;
                var mx;
                if (s.type === 'sections') mx = (s.sections || []).reduce(function(sum, sec) { return sum + (sec.max || 0) * (sec.score || 0); }, 0);
                else if (s.type === 'formula') mx = (s.max || 0) * (s.mult || 1);
                else mx = s.max || 100;
                if (!mx) mx = 100;
                return Math.round((val / mx) * 1000) / 10;
            }
            var radarValues = subjects.map(function(s) {
                var raw = latest.scores[s.id];
                return normalizeRadar(s, (raw !== undefined && raw !== null) ? Number(raw) : 0);
            });
            var maxVal = isIelts ? 9 : 100;
            var rn = subjects.length;
            var rSvgW = 220, rSvgH = 200;
            var rCx = rSvgW / 2, rCy = 104, rRadius = 72;
            var rAngleStep = (Math.PI * 2) / rn;
            var rStartAngle = -Math.PI / 2;

            function rP(r, i) {
                var angle = rStartAngle + i * rAngleStep;
                return (rCx + r * Math.cos(angle)).toFixed(1) + ',' + (rCy + r * Math.sin(angle)).toFixed(1);
            }

            html += `<div style="margin-top:1rem;padding:1rem 1.1rem 0.9rem;border:1px solid ${theme.accent}1f;border-radius:24px;background:linear-gradient(180deg,#ffffff,${theme.soft});">`;
            html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.55rem;"><div style="font-size:0.88rem;font-weight:700;color:${theme.strong};">技能画像</div><div style="font-size:0.75rem;color:#7d8599;">${escapeHtml(exam.desc || '')}</div></div>`;
            html += `<svg viewBox="0 0 ${rSvgW} ${rSvgH}" width="100%" height="200" style="display:block;margin:0 auto;">`;

            // 同心网格 + 轴线
            for (var layer = 1; layer <= 3; layer++) {
                var layerR = rRadius * (layer / 3);
                var gridPts = [];
                for (var gi = 0; gi < rn; gi++) gridPts.push(rP(layerR, gi));
                html += `<polygon points="${gridPts.join(' ')}" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="1"/>`;
            }
            for (var ai = 0; ai < rn; ai++) {
                html += `<line x1="${rCx}" y1="${rCy}" x2="${rP(rRadius, ai).split(',')[0]}" y2="${rP(rRadius, ai).split(',')[1]}" stroke="rgba(0,0,0,0.06)" stroke-width="1"/>`;
            }

            // 数据多边形
            var dataPts = [];
            for (var di = 0; di < rn; di++) {
                var val = Math.max(0, Math.min(radarValues[di] || 0, maxVal));
                dataPts.push(rP((val / maxVal) * rRadius, di));
            }
            html += `<polygon points="${dataPts.join(' ')}" fill="${theme.accent}30" stroke="${theme.accent}" stroke-width="2"/>`;

            // 数据点 + 标签
            for (var li = 0; li < rn; li++) {
                var lVal = Math.max(0, Math.min(radarValues[li] || 0, maxVal));
                var lPt = rP((lVal / maxVal) * rRadius, li).split(',');
                html += `<circle cx="${lPt[0]}" cy="${lPt[1]}" r="3.5" fill="${theme.accent}"/>`;
                var lpR = rRadius + 16;
                var lpPt = rP(lpR, li).split(',');
                html += `<text x="${lpPt[0]}" y="${lpPt[1]}" text-anchor="middle" dominant-baseline="middle" fill="#6b7280" font-size="11" font-family="system-ui">${escapeHtml(radarLabels[li])}</text>`;
            }
            html += `</svg></div>`;
        }

        html += `<div style="margin-top:1rem;text-align:center;font-size:0.75rem;color:#9ca3af;">Generated by MyScore V` + APP_VERSION + `</div>`;
        container.innerHTML = html;
    }
}

function _captureWithTimeout(el, opts, timeoutMs) {
    return Promise.race([
        html2canvas(el, opts),
        new Promise(function(_, reject) {
            setTimeout(function() { reject(new Error('html2canvas timeout')); }, timeoutMs);
        })
    ]);
}

function _injectFallbackFont(clone) {
    clone.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    clone.querySelectorAll('[style*="Manrope"]').forEach(function(el) {
        el.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    });
}

function _createFixedWrapper(contentEl) {
    var fixedWidth = currentReportType === 'scorecard' ? 700 : 420;
    var wrapper = document.createElement('div');
    wrapper.style.width = fixedWidth + 'px';
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.style.background = '#f9fafb';
    wrapper.style.padding = '0';
    wrapper.style.margin = '0';
    wrapper.appendChild(contentEl);
    document.body.appendChild(wrapper);
    return wrapper;
}

async function downloadReport() {
    var preview = document.getElementById('report-preview');
    if (!preview || !preview.querySelector('div[style*="font-family"]')) {
        alert('请先选择数据生成预览');
        return;
    }

    logEvent('report-export', { type: currentReportType });

    var canvasOpts = { scale: 3, backgroundColor: '#f9fafb', logging: false, imageTimeout: 3000, useCORS: false };
    var canvas = null;

    // 第一次尝试：克隆原版预览 + 固定宽度容器（保留 Google Fonts）
    var clone1 = preview.cloneNode(true);
    var wrapper1 = _createFixedWrapper(clone1);
    try {
        canvas = await _captureWithTimeout(wrapper1, canvasOpts, 8000);
    } catch (e) {
        console.warn('[Report] 原版截图超时，使用系统字体重试');
    } finally {
        document.body.removeChild(wrapper1);
    }

    // 第二次尝试：克隆 + 系统字体兜底
    if (!canvas) {
        var clone2 = preview.cloneNode(true);
        _injectFallbackFont(clone2);
        var wrapper2 = _createFixedWrapper(clone2);
        try {
            canvas = await _captureWithTimeout(wrapper2, canvasOpts, 8000);
        } catch (e2) {
            console.error('[Report] 系统字体截图也失败:', e2);
            alert('导出超时，请对预览区域截图保存');
        } finally {
            document.body.removeChild(wrapper2);
        }
    }

    if (canvas) {
        var a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        var dateStr = new Date().toISOString().slice(0, 10);
        var typeName = currentReportType === 'scorecard' ? '成绩单' : '分享卡片';
        a.download = 'MyScore_' + typeName + '_' + dateStr + '.png';
        a.click();
        addXP('export');
        closeReportModal();
        alert(typeName + '已保存！');
    }
}

// ==================== 挂载到 window ====================
window.openReportModal = openReportModal;
window.closeReportModal = closeReportModal;
window.closeReportModalOnBackdrop = closeReportModalOnBackdrop;
window.selectReportType = selectReportType;
window.onReportExamChange = onReportExamChange;
window.populateRecordSelect = populateRecordSelect;
window.renderReportPreview = renderReportPreview;
window.downloadReport = downloadReport;
