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

        html += `<div style="margin-top:1rem;text-align:center;font-size:0.75rem;color:#9ca3af;">Generated by MyScore V` + APP_VERSION + `</div>`;
        container.innerHTML = html;
    }
}

async function downloadReport() {
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
        alert('所选范围内暂无数据');
        return;
    }

    logEvent('report-export', { type: currentReportType, examType: examType, recordCount: records.length });

    if (currentReportType === 'scorecard') {
        await downloadScorecardImage(records);
        addXP('export');
    } else {
        var recordSelect = document.getElementById('report-record-select');
        var selectedIdx = recordSelect ? parseInt(recordSelect.value) : 0;
        var allRecords = getRecords();
        if (examType !== 'all') allRecords = allRecords.filter(r => r.examType === examType);
        allRecords = [...allRecords].sort((a, b) => new Date(b.date) - new Date(a.date));
        downloadShareCardDirect(allRecords, selectedIdx);
        addXP('export');
    }
}

function downloadScorecardImage(records) {
    const exams = allExams();
    const canvas = document.createElement('canvas');
    const scale = 3;
    const W = 700;

    const grouped = {};
    records.forEach(r => {
        if (!grouped[r.examType]) grouped[r.examType] = [];
        grouped[r.examType].push(r);
    });

    const headerH = 120;
    const footerH = 60;
    const rowH = 36;
    const tableHeaderH = 38;
    const sectionGap = 30;
    const titleH = 50;
    let totalH = headerH;
    for (const [type, recs] of Object.entries(grouped)) {
        totalH += titleH + tableHeaderH + recs.length * rowH + sectionGap;
    }
    totalH += footerH;

    canvas.width = W * scale;
    canvas.height = totalH * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, totalH);

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, W, headerH);
    ctx.fillStyle = '#0f9d6e';
    ctx.font = 'bold 26px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('MyScore 成绩单', W / 2, 50);
    ctx.fillStyle = '#5f6368';
    ctx.font = '13px system-ui';
    ctx.fillText('生成时间: ' + new Date().toLocaleString('zh-CN'), W / 2, 78);
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, headerH - 1);
    ctx.lineTo(W - 40, headerH - 1);
    ctx.stroke();

    let y = headerH + 20;
    const padL = 40;
    const padR = 40;
    const tableW = W - padL - padR;

    for (const [type, recs] of Object.entries(grouped)) {
        const exam = exams[type];
        if (!exam) continue;
        const theme = getExamTheme(type);

        ctx.fillStyle = theme.soft;
        ctx.beginPath();
        ctx.roundRect(padL, y - 20, tableW, 36, 12);
        ctx.fill();
        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.roundRect(padL + 12, y - 12, 16, 16, 5);
        ctx.fill();
        ctx.fillStyle = theme.strong;
        ctx.font = 'bold 17px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText(exam.name, padL + 38, y + 1);
        y += titleH - 12;

        const subjects = exam.subjects || [];
        let cols = ['日期'];
        subjects.forEach(s => {
            if ((type === 'cet4' || type === 'cet6') && (s.id === 'writing' || s.id === 'translation')) return;
            cols.push(s.short);
        });
        if (type === 'cet4' || type === 'cet6') cols.push('写译');
        if (exam.calcTotal) cols.push(type === 'ielts' ? 'Overall' : '总分');

        const dateColW = Math.max(tableW * 0.22, 110);
        const otherColW = (tableW - dateColW) / (cols.length - 1);

        function colX(i) {
            if (i === 0) return padL;
            return padL + dateColW + (i - 1) * otherColW;
        }
        function colW(i) {
            return i === 0 ? dateColW : otherColW;
        }

        ctx.fillStyle = theme.softAlt;
        ctx.beginPath();
        ctx.roundRect(padL, y, tableW, tableHeaderH, 6);
        ctx.fill();

        ctx.fillStyle = '#202124';
        ctx.font = 'bold 12px system-ui';
        cols.forEach((col, i) => {
            ctx.textAlign = i === 0 ? 'left' : 'center';
            const tx = i === 0 ? colX(i) + 12 : colX(i) + colW(i) / 2;
            ctx.fillText(col, tx, y + tableHeaderH / 2 + 4);
        });
        y += tableHeaderH;

        recs.forEach((r, rowIdx) => {
            const rowY = y;

            if (rowIdx % 2 === 0) {
                ctx.fillStyle = '#fafafa';
                ctx.fillRect(padL, rowY, tableW, rowH);
            }

            ctx.strokeStyle = '#ebebeb';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(padL, rowY + rowH);
            ctx.lineTo(padL + tableW, rowY + rowH);
            ctx.stroke();

            ctx.strokeStyle = '#ebebeb';
            for (let ci = 1; ci < cols.length; ci++) {
                const lx = colX(ci);
                ctx.beginPath();
                ctx.moveTo(lx, rowY);
                ctx.lineTo(lx, rowY + rowH);
                ctx.stroke();
            }

            let rowData = [r.date];
            subjects.forEach(s => {
                if ((type === 'cet4' || type === 'cet6') && (s.id === 'writing' || s.id === 'translation')) return;
                rowData.push((r.scores[s.id] || 0).toFixed(s.dec || 1));
            });
            if (type === 'cet4' || type === 'cet6') {
                rowData.push(((r.scores.writing || 0) + (r.scores.translation || 0)).toString());
            }
            if (exam.calcTotal) rowData.push(r.total ? r.total.toFixed(1) : '-');

            ctx.font = '12px system-ui';
            rowData.forEach((val, i) => {
                const isTotal = exam.calcTotal && i === rowData.length - 1;
                ctx.fillStyle = isTotal ? theme.strong : '#202124';
                ctx.font = isTotal ? 'bold 13px system-ui' : '12px system-ui';
                ctx.textAlign = i === 0 ? 'left' : 'center';
                const tx = i === 0 ? colX(i) + 12 : colX(i) + colW(i) / 2;
                ctx.fillText(val, tx, rowY + rowH / 2 + 4);
            });

            y += rowH;
        });

        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.strokeRect(padL, y - recs.length * rowH, tableW, recs.length * rowH);

        y += sectionGap;
    }

    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Generated by MyScore V' + APP_VERSION, W / 2, totalH - 25);

    const dataURL = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `MyScore_成绩单_${new Date().toISOString().slice(0, 10)}.png`;
    a.click();

    closeReportModal();
    alert('成绩单图片已保存！');
}

function downloadShareCardDirect(records, selectedIndex) {
    const exams = allExams();
    const idx = (typeof selectedIndex === 'number' && selectedIndex >= 0 && selectedIndex < records.length) ? selectedIndex : 0;
    const latest = records[idx];
    const type = latest.examType;
    const exam = exams[type] || { name: '考试', calcTotal: true, maxTotal: 100 };
    const theme = getExamTheme(type);
    const trendData = buildShareTrendData(records);

    const canvas = document.createElement('canvas');
    const scale = 3;
    const W = 420;
    const H = 400;
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    const gradient = ctx.createLinearGradient(0, 0, W, H);
    gradient.addColorStop(0, theme.reportGradientStart);
    gradient.addColorStop(1, theme.reportGradientEnd);
    ctx.fillStyle = '#f7f7f8';
    ctx.fillRect(0, 0, W, H);

    const heroX = 18;
    const heroY = 18;
    const heroW = W - 36;
    const heroH = 214;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(heroX, heroY, heroW, heroH, 28);
    ctx.clip();
    ctx.fillStyle = gradient;
    ctx.fillRect(heroX, heroY, heroW, heroH);

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.arc(heroX + 34, heroY + 28, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(heroX + heroW - 34, heroY + heroH - 14, 64, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - 30, heroY + 28, 60, 60, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (type === 'ielts') {
        ctx.lineWidth = 4;
        [heroY + 49, heroY + 63, heroY + 77].forEach(function (y) {
            ctx.beginPath();
            ctx.moveTo(W / 2 - 8, y);
            ctx.lineTo(W / 2 + 14, y);
            ctx.stroke();
        });
        [heroY + 49, heroY + 63, heroY + 77].forEach(function (y) {
            ctx.beginPath();
            ctx.roundRect(W / 2 - 18, y - 4, 7, 7, 2);
            ctx.fill();
        });
    } else if (type === 'cet4') {
        ctx.lineWidth = 4;
        ctx.strokeRect(W / 2 - 16, heroY + 45, 32, 24);
        ctx.beginPath();
        ctx.moveTo(W / 2 - 16, heroY + 57);
        ctx.lineTo(W / 2 + 16, heroY + 57);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(W / 2 - 4, heroY + 43);
        ctx.lineTo(W / 2 - 4, heroY + 38);
        ctx.quadraticCurveTo(W / 2 - 4, heroY + 33, W / 2 + 2, heroY + 33);
        ctx.lineTo(W / 2 + 8, heroY + 33);
        ctx.quadraticCurveTo(W / 2 + 14, heroY + 33, W / 2 + 14, heroY + 38);
        ctx.lineTo(W / 2 + 14, heroY + 43);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.moveTo(W / 2 - 20, heroY + 76);
        ctx.lineTo(W / 2 + 20, heroY + 76);
        ctx.stroke();
        ctx.fillRect(W / 2 - 18, heroY + 61, 8, 15);
        ctx.fillRect(W / 2 - 5, heroY + 54, 8, 22);
        ctx.fillRect(W / 2 + 8, heroY + 45, 8, 31);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(W / 2 - 16, heroY + 56);
        ctx.quadraticCurveTo(W / 2 - 1, heroY + 51, W / 2 + 13, heroY + 38);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(W / 2 + 13, heroY + 38);
        ctx.lineTo(W / 2 + 11, heroY + 40);
        ctx.moveTo(W / 2 + 13, heroY + 38);
        ctx.lineTo(W / 2 + 11, heroY + 35);
        ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(exam.name, W / 2, heroY + 112);

    ctx.font = '12px system-ui';
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.fillText(latest.date, W / 2, heroY + 136);

    if (latest.total !== null) {
        ctx.fillStyle = 'white';
        ctx.font = 'italic bold 54px system-ui';
        ctx.fillText(latest.total.toFixed(1), W / 2, heroY + 188);

        ctx.font = '13px system-ui';
        ctx.fillStyle = 'rgba(255,255,255,0.84)';
        const totalLabel = type === 'ielts' ? 'Overall' : '总分';
        ctx.fillText(totalLabel, W / 2, heroY + 206);
    }
    ctx.restore();

    if (trendData.length > 1) {
        const panelX = 18;
        const panelY = 248;
        const panelW = W - 36;
        const panelH = 102;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 24);
        ctx.fill();
        ctx.strokeStyle = theme.accent + '22';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = theme.strong;
        ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText('最近 5 次趋势', panelX + 14, panelY + 24);
        ctx.fillStyle = '#8b93a8';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText(exam.desc || '成绩摘要', panelX + panelW - 14, panelY + 24);

        const chartLeft = panelX + 18;
        const chartTop = panelY + 36;
        const chartWidth = panelW - 36;
        const chartHeight = 42;
        const points = trendData.map(function (point) {
            return {
                x: chartLeft + point.xRatio * chartWidth,
                y: chartTop + point.yRatio * chartHeight
            };
        });

        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        points.forEach(function (point, index) {
            if (index === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();

        points.forEach(function (point, index) {
            ctx.beginPath();
            ctx.fillStyle = index === points.length - 1 ? '#ffffff' : theme.accent;
            ctx.strokeStyle = theme.accent;
            ctx.lineWidth = 2.5;
            ctx.arc(point.x, point.y, index === points.length - 1 ? 6 : 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        ctx.fillStyle = '#98a0b4';
        ctx.font = '11px system-ui';
        ctx.textAlign = 'center';
        trendData.forEach(function (point, index) {
            ctx.fillText(point.label, points[index].x, panelY + panelH - 12);
        });
    }

    ctx.fillStyle = '#98a0b4';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Generated by MyScore V' + APP_VERSION, W / 2, H - 16);

    const dataURL = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `MyScore_分享卡片_${new Date().toISOString().slice(0, 10)}.png`;
    a.click();

    closeReportModal();
    alert('分享卡片已保存！');
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
