// ==================== 成绩录入 / 验证 / 滑块 ====================
import { escapeHtml, escapeAttr, getExamTheme, getExamBadgeMarkup, showAiToast, calcIeltsOverall, calcWritingScore, lookup } from './utils.js';
import { getRecords, saveRecords, allExams } from './storage.js';
import { addXP, checkAchievements } from './gamification.js';
import { logEvent } from './logger.js';

let currentExam = null;
let writingTask1 = null;
let writingTask2 = null;

export function renderExamSelector() {
    const exams = allExams();
    const container = document.getElementById('exam-type-selector');
    let html = '';
    for (const [id, e] of Object.entries(exams)) {
        const theme = getExamTheme(id);
        html += '<div class="exam-card" onclick="selectExam(\'' + id + '\')" style="border-color:' + theme.accent + '24;background:linear-gradient(180deg,#ffffff, ' + theme.soft + ');box-shadow:0 18px 42px -34px ' + theme.accent + '66;">' + getExamBadgeMarkup(id, e.name, 52) + '<div style="font-weight:700;color:' + theme.strong + ';margin-top:0.85rem;">' + escapeHtml(e.name) + '</div><div style="font-size:0.875rem;color:#7c8298;">' + escapeHtml(e.desc) + '</div></div>';
    }
    container.innerHTML = html;
}

function selectExam(id) {
    currentExam = id;
    writingTask1 = null;
    writingTask2 = null;
    const exams = allExams();
    const exam = exams[id];

    document.querySelectorAll('.exam-card').forEach((c, i) => {
        const keys = Object.keys(exams);
        c.classList.toggle('active', keys[i] === id);
    });

    let html = '<form onsubmit="submitScore(event)">';
    html += '<div style="margin-bottom:1.5rem;"><label style="display:block;margin-bottom:0.5rem;font-weight:500;">考试日期</label><input type="date" id="score-date" required class="input" style="max-width:200px;"></div>';

    for (let i = 0; i < exam.subjects.length; i++) {
        const s = exam.subjects[i];
        const open = i === 0 ? 'expanded' : '';
        const arrow = i === 0 ? 'expanded' : '';
        const theme = s.id === 'listening' ? 'listening' : s.id === 'reading' ? 'reading' : s.id === 'writing' ? 'writing' : s.id === 'speaking' ? 'speaking' : 'translation';

        html += '<div class="subject-box ' + theme + '">';
        html += '<div class="accordion-header" onclick="toggleAcc(this)">';
        html += '<div style="display:flex;align-items:center;gap:0.75rem;">';
        html += '<div style="width:40px;height:40px;border-radius:10px;background:' + s.color + ';display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;">' + s.short + '</div>';
        html += '<div style="font-weight:700;font-size:1.125rem;">' + s.name + '</div></div>';
        html += '<svg class="accordion-arrow ' + arrow + '" fill="none" stroke="#6b7280" stroke-width="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>';
        html += '</div>';
        html += '<div class="accordion-content ' + open + '"><div style="padding:0 1.25rem 1.25rem;">';

        if (s.type === 'ielts-writing') {
            html += '<div style="margin-bottom:1rem;"><label style="display:block;margin-bottom:0.5rem;font-size:0.875rem;color:#b45309;font-weight:500;">总分 (0-9，步长0.5)</label>';
            html += '<input type="number" id="sub-' + s.id + '" min="0" max="9" step="0.5" class="input" placeholder="输入总分" oninput="updateTotalPreview();validateScoreInput(this)"></div>';
            html += '<div style="border-top:2px solid #fcd34d;padding-top:1rem;margin-top:1rem;">';
            html += '<div style="margin-bottom:1rem;"><label style="display:block;margin-bottom:0.5rem;font-size:0.875rem;color:#b45309;">Task 1 (小作文)</label>';
            html += '<input type="number" id="task1-' + s.id + '" min="0" max="9" step="0.5" class="input" placeholder="Task1 分数" oninput="validateScoreInput(this);onTaskInput(1, this.value)"></div>';
            html += '<div style="margin-bottom:1rem;"><label style="display:block;margin-bottom:0.5rem;font-size:0.875rem;color:#b45309;">Task 2 (大作文)</label>';
            html += '<input type="number" id="task2-' + s.id + '" min="0" max="9" step="0.5" class="input" placeholder="Task2 分数" oninput="validateScoreInput(this);onTaskInput(2, this.value)"></div>';
            html += '<div style="background:rgba(255,255,255,0.7);border:1.5px solid #fcd34d;border-radius:12px;padding:1rem;">';
            html += '<div style="font-size:0.875rem;color:#b45309;font-weight:500;">自动计算 (Task2×2 + Task1) ÷ 3</div>';
            html += '<div id="writing-calc" style="font-size:1.5rem;font-weight:bold;color:#b45309;">-</div></div></div>';
        } else if (s.type === 'direct') {
            html += '<input type="number" id="sub-' + s.id + '" min="' + s.min + '" max="' + s.max + '" step="' + (s.step || 1) + '" class="input" placeholder="' + s.min + '-' + s.max + '" oninput="updateTotalPreview();validateScoreInput(this)">';
        } else if (s.type === 'lookup') {
            html += '<input type="number" id="sub-' + s.id + '" min="' + s.min + '" max="' + s.max + '" class="input" placeholder="正确题数 (' + s.min + '-' + s.max + ')" oninput="validateScoreInput(this);updateLookup(this, \'' + s.id + '\')">';
            html += '<div style="margin-top:0.75rem;padding:0.75rem;background:' + s.color + '15;border-radius:10px;border:1.5px solid ' + s.color + '30;"><span style="color:' + s.color + ';font-weight:500;">折算分: </span><strong id="calc-' + s.id + '" style="color:' + s.color + ';font-size:1.25rem;">-</strong></div>';
        } else if (s.type === 'sections') {
            html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.75rem;margin-bottom:0.75rem;">';
            for (const sec of (s.sections || [])) {
                html += '<div><label style="display:block;font-size:0.75rem;color:#6b7280;margin-bottom:0.25rem;">' + sec.name + ' — 输入答对题数（每题' + sec.score + '分）</label><input type="number" id="sub-' + s.id + '-' + sec.name + '" min="0" max="' + sec.max + '" class="input" placeholder="答对 0-' + sec.max + ' 题" oninput="validateScoreInput(this);updateSections(this, \'' + s.id + '\')"></div>';
            }
            html += '</div>';
            html += '<div style="padding:0.75rem;background:' + s.color + '15;border-radius:10px;border:1.5px solid ' + s.color + '30;"><span style="color:' + s.color + ';font-weight:500;">总分: </span><strong id="calc-' + s.id + '" style="color:' + s.color + ';font-size:1.25rem;">-</strong></div>';
        } else if (s.type === 'subquestions') {
            html += '<div style="margin-bottom:0.75rem;"><label style="font-size:0.875rem;color:#6b7280;">各题目组得分：</label></div>';
            html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.75rem;margin-bottom:0.75rem;">';
            for (const sq of (s.subquestions || [])) {
                html += '<div><label style="display:block;font-size:0.75rem;color:#6b7280;margin-bottom:0.25rem;">' + sq.name + ' (满分' + sq.max + ')</label><input type="number" id="sub-' + s.id + '-' + sq.name + '" min="0" max="' + sq.max + '" class="input" placeholder="0-' + sq.max + '" oninput="validateScoreInput(this);updateSubQuestions(this, \'' + s.id + '\')"></div>';
            }
            html += '</div>';
            html += '<div style="padding:0.75rem;background:' + s.color + '15;border-radius:10px;border:1.5px solid ' + s.color + '30;"><span style="color:' + s.color + ';font-weight:500;">小题总分: </span><strong id="calc-' + s.id + '" style="color:' + s.color + ';font-size:1.25rem;">-</strong></div>';
        } else if (s.type === 'formula') {
            var formulaMult = s.mult || 1;
            var formulaMultDisplay = Math.round(formulaMult * 100) / 100;
            html += '<input type="number" id="sub-' + s.id + '" min="' + s.min + '" max="' + s.max + '" step="0.5" class="input" placeholder="输入原始分 (' + s.min + '-' + s.max + ')" oninput="validateScoreInput(this);updateFormula(this, \'' + s.id + '\', ' + formulaMult + ')">';
            html += '<div style="margin-top:0.75rem;padding:0.75rem;background:' + s.color + '15;border-radius:10px;border:1.5px solid ' + s.color + '30;"><span style="color:' + s.color + ';font-weight:500;">折算分 (×' + formulaMultDisplay + '): </span><strong id="calc-' + s.id + '" style="color:' + s.color + ';font-size:1.25rem;">-</strong></div>';
        } else if (s.type === 'deduction') {
            var dedMax = s.max || 100;
            html += '<div style="margin-bottom:0.5rem;padding:0.5rem 0.75rem;background:' + s.color + '10;border-radius:8px;font-size:0.85rem;color:' + s.color + ';font-weight:600;">满分：' + dedMax + ' 分</div>';
            html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.75rem;margin-bottom:0.75rem;">';
            for (const d of (s.deductions || [])) {
                html += '<div><label style="display:block;font-size:0.75rem;color:#6b7280;margin-bottom:0.25rem;">' + d.name + ' — 输入扣分（最多' + (d.points || dedMax) + '分）</label><input type="number" id="sub-' + s.id + '-' + d.name + '" min="0" max="' + (d.points || dedMax) + '" step="0.5" class="input" placeholder="扣几分" oninput="validateScoreInput(this);updateDeduction(this, \'' + s.id + '\', ' + dedMax + ')"></div>';
            }
            html += '</div>';
            html += '<div style="padding:0.75rem;background:' + s.color + '15;border-radius:10px;border:1.5px solid ' + s.color + '30;"><span style="color:' + s.color + ';font-weight:500;">最终得分: </span><strong id="calc-' + s.id + '" style="color:' + s.color + ';font-size:1.25rem;">' + dedMax + '</strong></div>';
        }

        html += '</div></div></div>';
    }

    if (exam.calcTotal) {
        html += '<div class="total-preview" style="margin:1.5rem 0;"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-weight:700;color:#059669;">' + (exam.id === 'ielts' ? 'Overall' : '总分预览') + '</span><span id="preview-total" style="font-size:2.5rem;font-weight:bold;" class="gradient-text">-</span></div></div>';
    }

    html += '<button type="submit" class="btn-primary" style="width:100%;">💾 保存成绩</button></form>';
    document.getElementById('entry-form-container').innerHTML = html;
    document.getElementById('score-date').value = new Date().toISOString().split('T')[0];

    // 注入 slider
    document.querySelectorAll('#entry-form-container input[type="number"]').forEach(function(input) {
        var max = input.max;
        if (!max || max === '' || input.step === 'any') return;
        var min = input.min || '0';
        var step = input.step || '1';
        var id = input.id;
        var wrap = document.createElement('div');
        wrap.className = 'score-slider-wrap';
        var box = input.closest('.subject-box');
        var sliderColor = '#2e6b79';
        if (box) { var badge = box.querySelector('[style*="background"]'); if (badge) { var bgStyle = badge.getAttribute('style') || ''; var match = bgStyle.match(/background:\s*(#[0-9a-fA-F]{6})/); if (match) sliderColor = match[1]; } }
        wrap.style.setProperty('--slider-color', sliderColor);
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:0.75rem;';
        var range = document.createElement('input');
        range.type = 'range'; range.id = 'range-' + id; range.min = min; range.max = max; range.step = step; range.value = input.value || min; range.className = 'score-range';
        range.setAttribute('oninput', "syncSliderToInput(this,'" + id + "')");
        var valSpan = document.createElement('span');
        valSpan.id = 'rangeval-' + id; valSpan.className = 'score-range-val'; valSpan.textContent = input.value || '-';
        row.appendChild(range); row.appendChild(valSpan); wrap.appendChild(row);
        wrap.insertAdjacentHTML('beforeend', buildSliderMarks(parseFloat(min), parseFloat(max)));
        input.style.maxWidth = '120px'; input.style.marginTop = '0.35rem';
        input.parentNode.insertBefore(wrap, input); wrap.appendChild(input);
        updateSliderVisual(range);
    });
}

function toggleAcc(header) {
    const content = header.nextElementSibling;
    const arrow = header.querySelector('.accordion-arrow');
    const isExpanded = content.classList.contains('expanded');
    document.querySelectorAll('.accordion-content').forEach(c => c.classList.remove('expanded'));
    document.querySelectorAll('.accordion-arrow').forEach(a => a.classList.remove('expanded'));
    if (!isExpanded) { content.classList.add('expanded'); arrow.classList.add('expanded'); }
}

function onTaskInput(task, val) {
    const score = parseFloat(val);
    if (task === 1) writingTask1 = isNaN(score) ? null : score;
    else writingTask2 = isNaN(score) ? null : score;
    if (writingTask1 !== null && writingTask2 !== null) {
        const total = calcWritingScore(writingTask1, writingTask2);
        document.getElementById('writing-calc').textContent = total.toFixed(1);
        const totalInput = document.getElementById('sub-writing');
        if (totalInput) totalInput.value = total.toFixed(1);
    } else { document.getElementById('writing-calc').textContent = '-'; }
    updateTotalPreview();
}

function updateLookup(el, subId) { const score = lookup(el.value, subId); const calcEl = document.getElementById('calc-' + subId); if (calcEl) calcEl.textContent = score.toFixed(1); updateTotalPreview(); }

function updateSections(el, subId) {
    if (!currentExam) return;
    const exam = allExams()[currentExam]; if (!exam) return;
    const sub = exam.subjects.find(s => s.id === subId); if (!sub || !sub.sections) return;
    let sum = 0;
    for (const sec of sub.sections) { const inputEl = document.getElementById('sub-' + subId + '-' + sec.name); sum += (inputEl ? (parseInt(inputEl.value) || 0) : 0) * (sec.score || 0); }
    const calcEl = document.getElementById('calc-' + subId); if (calcEl) calcEl.textContent = Math.ceil(sum);
    updateTotalPreview();
}

function updateFormula(el, subId, mult) {
    const raw = parseFloat(el.value) || 0;
    const calcEl = document.getElementById('calc-' + subId); if (calcEl) calcEl.textContent = Math.round(raw * (parseFloat(mult) || 1));
    updateTotalPreview();
}

function updateDeduction(el, subId, maxScore) {
    var totalDeducted = 0;
    var exam = allExams()[currentExam];
    var subject = exam ? exam.subjects.find(function(s) { return s.id === subId; }) : null;
    if (subject && subject.deductions) {
        for (var k = 0; k < subject.deductions.length; k++) {
            var inputEl = document.getElementById('sub-' + subId + '-' + subject.deductions[k].name);
            if (inputEl) totalDeducted += parseFloat(inputEl.value) || 0;
        }
    }
    var finalScore = Math.max(0, (maxScore || 100) - totalDeducted);
    var calcEl = document.getElementById('calc-' + subId); if (calcEl) calcEl.textContent = finalScore;
    var overTip = document.getElementById('ded-over-' + subId);
    if (totalDeducted > (maxScore || 100)) {
        if (!overTip) { overTip = document.createElement('div'); overTip.id = 'ded-over-' + subId; overTip.className = 'input-error-msg'; overTip.style.marginTop = '0.5rem'; overTip.textContent = '总扣分已超过满分，最终得分为 0'; if (calcEl) calcEl.parentNode.appendChild(overTip); }
    } else if (overTip) { overTip.remove(); }
    updateTotalPreview();
}

function updateSubQuestions(el, subId) {
    if (!currentExam) return;
    const exam = allExams()[currentExam]; if (!exam) return;
    const sub = exam.subjects.find(s => s.id === subId); if (!sub || !sub.subquestions) return;
    let sum = 0;
    for (const sq of sub.subquestions) { const inputEl = document.getElementById('sub-' + subId + '-' + sq.name); sum += inputEl ? (parseFloat(inputEl.value) || 0) : 0; }
    const calcEl = document.getElementById('calc-' + subId); if (calcEl) calcEl.textContent = sum.toFixed(1);
    updateTotalPreview();
}

function validateScoreInput(el) {
    var min = parseFloat(el.min); var max = parseFloat(el.max); var val = parseFloat(el.value); var next = el.nextElementSibling;
    if (isNaN(val) || el.value === '') { el.classList.remove('input-error'); if (next && next.classList.contains('input-error-msg')) next.remove(); syncInputToSlider(el); return true; }
    var outOfRange = false; var msg = '';
    if (!isNaN(min) && val < min) { outOfRange = true; msg = '不能低于 ' + min; }
    if (!isNaN(max) && val > max) { outOfRange = true; msg = '不能超过 ' + max; }
    if (outOfRange) {
        el.classList.add('input-error');
        if (!next || !next.classList.contains('input-error-msg')) { var tip = document.createElement('div'); tip.className = 'input-error-msg'; tip.textContent = msg; el.parentNode.insertBefore(tip, el.nextSibling); } else { next.textContent = msg; }
        return false;
    } else { el.classList.remove('input-error'); if (next && next.classList.contains('input-error-msg')) next.remove(); syncInputToSlider(el); return true; }
}

function syncSliderToInput(rangeEl, inputId) { var input = document.getElementById(inputId); if (input) { input.value = rangeEl.value; input.dispatchEvent(new Event('input', { bubbles: true })); } updateSliderVisual(rangeEl); }

function syncInputToSlider(inputEl) {
    var slider = document.getElementById('range-' + inputEl.id); if (slider) { slider.value = inputEl.value; updateSliderVisual(slider); }
    var valSpan = document.getElementById('rangeval-' + inputEl.id); if (valSpan) valSpan.textContent = inputEl.value || '-';
}

function updateSliderVisual(rangeEl) {
    var min = parseFloat(rangeEl.min) || 0; var max = parseFloat(rangeEl.max) || 100; var val = parseFloat(rangeEl.value) || 0;
    var pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
    var color = getComputedStyle(rangeEl).getPropertyValue('--slider-color').trim() || '#2e6b79';
    rangeEl.style.background = 'linear-gradient(to right, ' + color + ' ' + pct + '%, rgba(84,99,125,0.08) ' + pct + '%)';
    var inputId = rangeEl.id.replace('range-', '');
    var valSpan = document.getElementById('rangeval-' + inputId); if (valSpan) valSpan.textContent = rangeEl.value || '-';
}

function buildSliderMarks(min, max) {
    var count = 5; var html = '<div class="score-range-marks">';
    for (var i = 0; i < count; i++) { var val = min + (max - min) * i / (count - 1); html += '<span>' + (Number.isInteger(min) && Number.isInteger(max) ? Math.round(val) : val.toFixed(1)) + '</span>'; }
    html += '</div>'; return html;
}

function updateTotalPreview() {
    if (!currentExam) return;
    const exam = allExams()[currentExam]; if (!exam || !exam.calcTotal) return;
    const scores = [];
    for (const s of exam.subjects) {
        let sc = 0;
        if (s.type === 'ielts-writing') { sc = parseFloat(document.getElementById('sub-' + s.id)?.value) || 0; }
        else if (s.type === 'direct' || s.type === 'lookup') { const el = document.getElementById('sub-' + s.id); sc = s.type === 'lookup' ? lookup(el?.value, s.id) : (parseFloat(el?.value) || 0); }
        else if (s.type === 'sections' || s.type === 'subquestions' || s.type === 'formula' || s.type === 'deduction') { sc = parseFloat(document.getElementById('calc-' + s.id)?.textContent) || 0; }
        scores.push(sc);
    }
    let total = exam.id === 'ielts' ? calcIeltsOverall(scores) : scores.reduce((a, b) => a + b, 0);
    document.getElementById('preview-total').textContent = total.toFixed(1);
}

function submitScore(e) {
    e.preventDefault();
    if (!currentExam) return;
    const exam = allExams()[currentExam];
    const scores = {};
    var dateVal = document.getElementById('score-date').value;
    if (!dateVal) { showAiToast('请选择考试日期'); return; }
    var invalidInputs = document.querySelectorAll('#entry-form-container .input-error');
    if (invalidInputs.length) { showAiToast('请修正标红的输入项，数值超出允许范围'); invalidInputs[0].focus(); return; }

    for (const s of exam.subjects) {
        var rawVal;
        if (s.type === 'ielts-writing' || s.type === 'direct') { rawVal = parseFloat(document.getElementById('sub-' + s.id)?.value); }
        else if (s.type === 'lookup') { rawVal = lookup(document.getElementById('sub-' + s.id)?.value, s.id); }
        else { rawVal = parseFloat(document.getElementById('calc-' + s.id)?.textContent); }
        if (typeof rawVal !== 'number' || !isFinite(rawVal)) rawVal = 0;
        scores[s.id] = rawVal;
    }

    if (Object.values(scores).every(function(v) { return v === 0; })) { if (!confirm('所有成绩均为 0，确定要提交吗？')) return; }

    let total = null;
    if (exam.calcTotal) { const vals = Object.values(scores); total = exam.id === 'ielts' ? calcIeltsOverall(vals) : vals.reduce((a, b) => a + b, 0); }

    const rec = { id: Date.now(), examType: currentExam, date: dateVal, scores: scores, total: total };
    const recs = getRecords(); recs.push(rec); saveRecords(recs);
    logEvent('score-save', { examType: currentExam, total: total });

    // 飞书通知（静默，不阻塞主流程）
    (function () {
        var auth = localStorage.getItem('myscore_auth');
        if (!auth) return;
        try {
            var user = JSON.parse(auth);
            if (!user.token) return;
            fetch('/api/feishu/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + user.token },
                body: JSON.stringify({ record: rec })
            }).catch(function () {});
        } catch (e) {}
    })();

    // 未选模式时静默记录 XP，避免与模式选择弹窗冲突
    if (localStorage.getItem('myscore_user_mode')) {
        addXP('score');
        checkAchievements();
        showAiToast('成绩保存成功！');
    } else {
        addXP('score', { silent: true });
        window._pendingSaveToast = true;
        if (window.showModeChoiceModal) window.showModeChoiceModal();
    }
    if (window.showPage) window.showPage('dashboard');
}

// ---- 挂载到 window ----
window.selectExam = selectExam;
window.toggleAcc = toggleAcc;
window.onTaskInput = onTaskInput;
window.updateLookup = updateLookup;
window.updateSections = updateSections;
window.updateFormula = updateFormula;
window.updateDeduction = updateDeduction;
window.updateSubQuestions = updateSubQuestions;
window.validateScoreInput = validateScoreInput;
window.syncSliderToInput = syncSliderToInput;
window.updateTotalPreview = updateTotalPreview;
window.submitScore = submitScore;

// 导出给 main.js 的
export function resetEntryState() { currentExam = null; writingTask1 = null; writingTask2 = null; }
