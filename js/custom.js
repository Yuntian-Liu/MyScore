// ==================== 自定义考试管理 / 导入导出 ====================
import { APP_VERSION } from './config.js';
import { escapeHtml, escapeAttr, getExamTheme, getExamBadgeMarkup } from './utils.js';
import { getRecords, saveRecords, getCustom, saveCustom } from './storage.js';
import { addXP, checkAchievements } from './gamification.js';
import { logEvent } from './logger.js';

let customSubs = [];

export function renderCustomList() {
    const custom = getCustom();
    const container = document.getElementById('custom-exam-list');
    if (!Object.keys(custom).length) {
        container.innerHTML = '<div class="empty-state"><p style="color:#9ca3af;">还没有自定义考试类型</p><p style="font-size:0.875rem;color:#d1d5db;">点击右上角按钮创建</p></div>';
        return;
    }
    let html = '';
    for (const [id, e] of Object.entries(custom)) {
        let subs = '';
        const theme = getExamTheme(id);
        for (const s of e.subjects) {
            subs += '<span style="display:inline-block;padding:0.375rem 0.875rem;border-radius:9999px;font-size:0.75rem;margin-right:0.5rem;background:' + s.color + '15;color:' + s.color + ';">' + escapeHtml(s.name) + '</span>';
        }
        html += '<div class="record-box" style="border-color:' + theme.accent + '24;box-shadow:0 18px 40px -34px ' + theme.accent + '66;"><div style="display:flex;justify-content:space-between;align-items:center;"><div style="display:flex;align-items:center;gap:1rem;">' + getExamBadgeMarkup(id, e.name, 44) + '<div><div style="font-weight:700;color:' + theme.strong + ';">' + escapeHtml(e.name) + '</div><div style="font-size:0.875rem;color:#9ca3af;">' + escapeHtml(e.desc || '无描述') + '</div><div style="margin-top:0.5rem;">' + subs + '</div></div></div><button onclick="deleteCustom(\'' + id + '\')" style="background:none;border:none;color:#9ca3af;cursor:pointer;font-size:1.5rem;">×</button></div></div>';
    }
    container.innerHTML = html;
}

function openCreateModal() {
    customSubs = [];
    document.getElementById('create-exam-form').reset();
    document.getElementById('subjects-list').innerHTML = '';
    document.getElementById('create-modal').classList.add('active');
}

function closeCreateModal() { document.getElementById('create-modal').classList.remove('active'); }
function closeModalOnBackdrop(e) { if (e.target.id === 'create-modal') closeCreateModal(); }

function addSubject() {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
    customSubs.push({ id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5), name: '', short: '', color: colors[customSubs.length % colors.length], type: 'direct', min: 0, max: 100 });
    renderSubList();
}

function renderSubList() {
    const container = document.getElementById('subjects-list');
    if (!customSubs.length) { container.innerHTML = '<p style="color:#9ca3af;text-align:center;padding:1rem;">点击上方按钮添加题型</p>'; return; }
    let html = '';
    for (let i = 0; i < customSubs.length; i++) {
        const s = customSubs[i];
        html += '<div style="padding:1rem;background:#f9fafb;border-radius:12px;margin-bottom:0.75rem;border:1.5px solid #e5e7eb;">';
        html += '<div style="display:grid;grid-template-columns:1fr 80px 40px;gap:0.5rem;margin-bottom:0.5rem;">';
        html += '<input type="text" placeholder="题型名称" value="' + escapeAttr(s.name) + '" oninput="customSubs[' + i + '].name=this.value" class="input">';
        html += '<input type="text" placeholder="简称" value="' + escapeAttr(s.short) + '" oninput="customSubs[' + i + '].short=this.value" class="input">';
        html += '<input type="color" value="' + s.color + '" onchange="customSubs[' + i + '].color=this.value" style="width:40px;height:40px;border:none;border-radius:0.5rem;cursor:pointer;"></div>';
        html += '<select onchange="customSubs[' + i + '].type=this.value;if(this.value===\'formula\'){if(!customSubs[' + i + '].mult)customSubs[' + i + '].mult=1;if(!customSubs[' + i + '].max)customSubs[' + i + '].max=100;if(customSubs[' + i + '].min==null)customSubs[' + i + '].min=0;}renderSubList()" class="input" style="margin-bottom:0.25rem;">';
        html += '<option value="direct" ' + (s.type === 'direct' ? 'selected' : '') + '>直接打分</option>';
        html += '<option value="subquestions" ' + (s.type === 'subquestions' ? 'selected' : '') + '>按题组求和</option>';
        html += '<option value="sections" ' + (s.type === 'sections' ? 'selected' : '') + '>按答对题数算</option>';
        html += '<option value="formula" ' + (s.type === 'formula' ? 'selected' : '') + '>按系数折算</option>';
        html += '<option value="deduction" ' + (s.type === 'deduction' ? 'selected' : '') + '>从满分扣分</option></select>';
        var typeDescMap = { direct: '老师给什么分就填什么分', subquestions: '多组题目分别打分，自动算总分', sections: '每部分答对几题 × 每题分值，再合计', formula: '输入原始分，自动乘以系数换算', deduction: '从满分开始，逐项扣除，自动算最终得分' };
        html += '<p style="font-size:0.75rem;color:#9ca3af;margin:0 0 0.5rem;">' + (typeDescMap[s.type] || '') + '</p>';

        if (s.type === 'direct') {
            html += '<div style="display:flex;gap:0.5rem;"><div style="flex:1;"><label style="display:block;font-size:0.7rem;color:#9ca3af;margin-bottom:2px;">最小值</label><input type="number" placeholder="默认 0" ' + (s.min ? 'value="' + s.min + '"' : '') + ' onchange="customSubs[' + i + '].min=parseFloat(this.value)" class="input" style="width:100%;"></div><div style="flex:1;"><label style="display:block;font-size:0.7rem;color:#9ca3af;margin-bottom:2px;">满分</label><input type="number" placeholder="默认 100" ' + (s.max && s.max !== 100 ? 'value="' + s.max + '"' : '') + ' onchange="customSubs[' + i + '].max=parseFloat(this.value)" class="input" style="width:100%;"></div></div>';
        } else if (s.type === 'subquestions') {
            if (!s.subquestions) s.subquestions = [{ name: '', max: '' }];
            html += '<div id="subqs-' + i + '">';
            for (let j = 0; j < s.subquestions.length; j++) {
                const sq = s.subquestions[j];
                html += '<div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;padding:0.5rem;background:#fff;border-radius:8px;border:1px solid #e5e7eb;"><div style="flex:1;"><label style="display:block;font-size:0.7rem;color:#9ca3af;margin-bottom:2px;">题目组名称</label><input type="text" placeholder="如：听力理解" value="' + escapeAttr(sq.name) + '" onchange="customSubs[' + i + '].subquestions[' + j + '].name=this.value" class="input" style="width:100%;"></div><div style="flex:1;"><label style="display:block;font-size:0.7rem;color:#9ca3af;margin-bottom:2px;">该组满分</label><input type="number" placeholder="如：30" ' + (sq.max ? 'value="' + sq.max + '"' : '') + ' onchange="customSubs[' + i + '].subquestions[' + j + '].max=parseFloat(this.value)" class="input" style="width:100%;"></div></div>';
            }
            html += '</div><button type="button" onclick="addSubQuestion(' + i + ')" style="color:#10b981;background:none;border:none;cursor:pointer;font-size:0.875rem;">+ 添加题目组</button>';
        } else if (s.type === 'formula') {
            html += '<div style="display:flex;gap:0.5rem;"><div style="flex:1;"><label style="display:block;font-size:0.7rem;color:#9ca3af;margin-bottom:2px;">满分（原始分）</label><input type="number" placeholder="默认 100" ' + (s.max && s.max !== 100 ? 'value="' + s.max + '"' : '') + ' onchange="customSubs[' + i + '].max=parseFloat(this.value)" class="input" style="width:100%;"></div><div style="flex:1;"><label style="display:block;font-size:0.7rem;color:#9ca3af;margin-bottom:2px;">换算系数</label><input type="number" step="any" placeholder="如：1.5" ' + (s.mult && s.mult !== 1 ? 'value="' + s.mult + '"' : '') + ' onchange="customSubs[' + i + '].mult=parseFloat(this.value)" class="input" style="width:100%;"></div></div>';
        } else if (s.type === 'sections') {
            if (!s.sections) s.sections = [{ name: '', score: '', max: '' }];
            html += '<div id="secs-' + i + '">';
            for (let j = 0; j < s.sections.length; j++) {
                const sec = s.sections[j];
                html += '<div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;padding:0.5rem;background:#fff;border-radius:8px;border:1px solid #e5e7eb;"><div style="flex:1;"><label style="display:block;font-size:0.7rem;color:#9ca3af;margin-bottom:2px;">部分名称</label><input type="text" placeholder="如：选择题" value="' + escapeAttr(sec.name) + '" onchange="customSubs[' + i + '].sections[' + j + '].name=this.value" class="input" style="width:100%;"></div><div style="flex:1;"><label style="display:block;font-size:0.7rem;color:#9ca3af;margin-bottom:2px;">每题分值</label><input type="number" placeholder="如：2" ' + (sec.score ? 'value="' + sec.score + '"' : '') + ' onchange="customSubs[' + i + '].sections[' + j + '].score=parseFloat(this.value)" class="input" style="width:100%;"></div><div style="flex:1;"><label style="display:block;font-size:0.7rem;color:#9ca3af;margin-bottom:2px;">共几题</label><input type="number" placeholder="如：20" ' + (sec.max ? 'value="' + sec.max + '"' : '') + ' onchange="customSubs[' + i + '].sections[' + j + '].max=parseInt(this.value)" class="input" style="width:100%;"></div></div>';
            }
            html += '</div><button type="button" onclick="addSec(' + i + ')" style="color:#10b981;background:none;border:none;cursor:pointer;font-size:0.875rem;">+ 添加部分</button>';
        } else if (s.type === 'deduction') {
            if (!s.deductions) s.deductions = [{ name: '', points: '' }];
            html += '<div style="flex:1;max-width:50%;margin-bottom:0.5rem;"><label style="display:block;font-size:0.7rem;color:#9ca3af;margin-bottom:2px;">满分</label><input type="number" placeholder="默认 100" ' + (s.max && s.max !== 100 ? 'value="' + s.max + '"' : '') + ' onchange="customSubs[' + i + '].max=parseFloat(this.value)" class="input" style="width:100%;"></div>';
            html += '<div id="ded-' + i + '">';
            for (let j = 0; j < s.deductions.length; j++) {
                const d = s.deductions[j];
                html += '<div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;padding:0.5rem;background:#fff;border-radius:8px;border:1px solid #e5e7eb;"><div style="flex:1;"><label style="display:block;font-size:0.7rem;color:#9ca3af;margin-bottom:2px;">扣分项名称</label><input type="text" placeholder="如：粗心失误" value="' + escapeAttr(d.name) + '" onchange="customSubs[' + i + '].deductions[' + j + '].name=this.value" class="input" style="width:100%;"></div><div style="flex:1;"><label style="display:block;font-size:0.7rem;color:#9ca3af;margin-bottom:2px;">该项最多扣几分</label><input type="number" step="any" placeholder="如：5" ' + (d.points ? 'value="' + d.points + '"' : '') + ' onchange="customSubs[' + i + '].deductions[' + j + '].points=parseFloat(this.value)" class="input" style="width:100%;"></div></div>';
            }
            html += '</div><button type="button" onclick="addDeduction(' + i + ')" style="color:#10b981;background:none;border:none;cursor:pointer;font-size:0.875rem;">+ 添加扣分项</button>';
        }

        html += '<button type="button" onclick="removeSub(' + i + ')" style="color:#ef4444;background:none;border:none;cursor:pointer;font-size:0.875rem;margin-top:0.5rem;">删除题型</button></div>';
    }
    container.innerHTML = html;
}

function addSec(idx) { customSubs[idx].sections.push({ name: '', score: '', max: '' }); renderSubList(); }
function addSubQuestion(idx) { if (!customSubs[idx].subquestions) customSubs[idx].subquestions = []; customSubs[idx].subquestions.push({ name: '', max: '' }); renderSubList(); }
function addDeduction(idx) { if (!customSubs[idx].deductions) customSubs[idx].deductions = []; customSubs[idx].deductions.push({ name: '', points: '' }); renderSubList(); }
function removeSub(idx) { customSubs.splice(idx, 1); renderSubList(); }

function submitCreateForm(e) {
    e.preventDefault();
    if (!customSubs.length) { alert('请至少添加一个题型！'); return; }
    for (const s of customSubs) { if (!s.name || !s.short) { alert('请填写所有题型的名称和简称！'); return; } }
    const exam = { id: 'custom_' + Date.now(), name: document.getElementById('new-exam-name').value, desc: document.getElementById('new-exam-desc').value, icon: '📝', builtin: false, calcTotal: true, subjects: customSubs };
    const custom = getCustom(); custom[exam.id] = exam; saveCustom(custom);
    addXP('custom');
    logEvent('custom-create', { examId: exam.id, name: exam.name, subjectCount: customSubs.length });
    closeCreateModal(); renderCustomList(); alert('考试类型创建成功！');
}

function deleteCustom(id) {
    if (!confirm('确定删除？相关成绩也会被删除！')) return;
    logEvent('custom-delete', { examId: id });
    const custom = getCustom(); delete custom[id]; saveCustom(custom);
    saveRecords(getRecords().filter(r => r.examType !== id));
    renderCustomList();
}

// ---- 导入导出 ----
function exportData() {
    const records = getRecords(); const custom = getCustom();
    if (!records.length && !Object.keys(custom).length) { alert('暂无数据可导出！'); return; }
    logEvent('data-export', { recordCount: records.length, customCount: Object.keys(custom).length });
    const data = { version: APP_VERSION, date: new Date().toISOString(), records, custom };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = 'MyScore_Backup_' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '.json';
    a.click(); URL.revokeObjectURL(url);
    alert('导出成功！\n记录: ' + records.length + ' 条\n自定义考试: ' + Object.keys(custom).length + ' 个');
}

function importData(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.version) throw new Error('文件格式错误');
            let newRecs = 0, newExams = 0;
            if (data.records) {
                const existing = getRecords(); const ids = new Set(existing.map(r => r.id));
                for (const r of data.records) { if (!ids.has(r.id)) { existing.push(r); newRecs++; } }
                saveRecords(existing);
            }
            if (data.custom) {
                const existing = getCustom();
                for (const [id, e] of Object.entries(data.custom)) { if (!existing[id]) { existing[id] = e; newExams++; } }
                saveCustom(existing);
            }
            alert('导入成功！\n新记录: ' + newRecs + ' 条\n新考试类型: ' + newExams + ' 个');
            logEvent('data-import', { newRecs: newRecs, newExams: newExams });
            if (window.renderDashboard) window.renderDashboard();
            checkAchievements();
        } catch (err) { alert('导入失败: ' + err.message); }
    };
    reader.readAsText(file); input.value = '';
}

// ---- 挂载到 window ----
window.customSubs = customSubs;
window.openCreateModal = openCreateModal;
window.closeCreateModal = closeCreateModal;
window.closeModalOnBackdrop = closeModalOnBackdrop;
window.addSubject = addSubject;
window.renderSubList = renderSubList;
window.addSec = addSec;
window.addSubQuestion = addSubQuestion;
window.addDeduction = addDeduction;
window.removeSub = removeSub;
window.submitCreateForm = submitCreateForm;
window.deleteCustom = deleteCustom;
window.exportData = exportData;
window.importData = importData;
