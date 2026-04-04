        // ==================== 数据存储 ====================
        const STORAGE = {
            RECORDS: 'myscore_v51_records',  // 保持与V5.2兼容
            CUSTOM: 'myscore_v51_custom'
        };
        const COMMENT_API_ENDPOINT = (() => {
            const meta = document.querySelector('meta[name="myscore-comment-endpoint"]');
            return meta && meta.content ? meta.content.trim() : '/api/comment';
        })();

        // 图表实例变量
        let mainChartInstance = null;

        // 内置考试配置
        const BUILTIN_EXAMS = {
            ielts: {
                id: 'ielts',
                name: '雅思',
                desc: 'IELTS Academic',
                icon: '📋',
                builtin: true,
                calcTotal: true,
                subjects: [
                    { id: 'listening', name: 'Listening', short: 'L', color: '#3b82f6', type: 'lookup', min: 0, max: 40, dec: 1 },
                    { id: 'reading', name: 'Reading', short: 'R', color: '#10b981', type: 'lookup', min: 0, max: 40, dec: 1 },
                    { id: 'writing', name: 'Writing', short: 'W', color: '#f59e0b', type: 'ielts-writing', min: 0, max: 9, step: 0.5, dec: 1, hasTasks: true },
                    { id: 'speaking', name: 'Speaking', short: 'S', color: '#8b5cf6', type: 'direct', min: 0, max: 9, step: 0.5, dec: 1 }
                ]
            },
            cet4: {
                id: 'cet4',
                name: '四级',
                desc: 'CET-4',
                icon: '📚',
                builtin: true,
                calcTotal: true,
                subjects: [
                    { id: 'listening', name: '听力', short: '听', color: '#3b82f6', type: 'sections', sections: [
                        { name: '短对话', score: 7.1, max: 8 },
                        { name: '长对话', score: 7.1, max: 7 },
                        { name: '短文', score: 14.2, max: 10 }
                    ], dec: 0 },
                    { id: 'reading', name: '阅读', short: '读', color: '#10b981', type: 'sections', sections: [
                        { name: '选词填空', score: 3.55, max: 10 },
                        { name: '长篇阅读', score: 7.1, max: 10 },
                        { name: '仔细阅读', score: 14.2, max: 10 }
                    ], dec: 0 },
                    { id: 'writing', name: '写作', short: '写', color: '#f59e0b', type: 'formula', min: 0, max: 15, mult: 7.1, dec: 0 },
                    { id: 'translation', name: '翻译', short: '译', color: '#ef4444', type: 'formula', min: 0, max: 15, mult: 7.1, dec: 0 }
                ]
            },
            cet6: {
                id: 'cet6',
                name: '六级',
                desc: 'CET-6',
                icon: '🎓',
                builtin: true,
                calcTotal: true,
                subjects: [
                    { id: 'listening', name: '听力', short: '听', color: '#3b82f6', type: 'sections', sections: [
                        { name: '长对话', score: 7.1, max: 8 },
                        { name: '听力篇章', score: 7.1, max: 7 },
                        { name: '讲座', score: 14.2, max: 10 }
                    ], dec: 0 },
                    { id: 'reading', name: '阅读', short: '读', color: '#10b981', type: 'sections', sections: [
                        { name: '选词填空', score: 3.55, max: 10 },
                        { name: '长篇阅读', score: 7.1, max: 10 },
                        { name: '仔细阅读', score: 14.2, max: 10 }
                    ], dec: 0 },
                    { id: 'writing', name: '写作', short: '写', color: '#f59e0b', type: 'formula', min: 0, max: 15, mult: 7.1, dec: 0 },
                    { id: 'translation', name: '翻译', short: '译', color: '#ef4444', type: 'formula', min: 0, max: 15, mult: 7.1, dec: 0 }
                ]
            }
        };

        const EXAM_THEME_MAP = {
            ielts: {
                accent: '#5b7cff',
                strong: '#2f4fcb',
                soft: '#eef1ff',
                softAlt: '#fff2ea',
                contrast: '#ffffff',
                reportGradientStart: '#5b7cff',
                reportGradientEnd: '#ff8a63'
            },
            cet4: {
                accent: '#23a17b',
                strong: '#16765c',
                soft: '#e9fbf3',
                softAlt: '#fff0db',
                contrast: '#ffffff',
                reportGradientStart: '#23a17b',
                reportGradientEnd: '#f4a63e'
            },
            cet6: {
                accent: '#8d63ff',
                strong: '#6542c9',
                soft: '#f1edff',
                softAlt: '#ffe9f3',
                contrast: '#ffffff',
                reportGradientStart: '#7d61ff',
                reportGradientEnd: '#ff7fab'
            }
        };

        const FALLBACK_THEME_POOL = [
            { accent: '#ff8b68', strong: '#d86343', soft: '#fff0e8', softAlt: '#fff8ef', contrast: '#ffffff', reportGradientStart: '#ff8b68', reportGradientEnd: '#ffb36a' },
            { accent: '#48a7a0', strong: '#2f7a74', soft: '#e8f9f7', softAlt: '#eef9ff', contrast: '#ffffff', reportGradientStart: '#48a7a0', reportGradientEnd: '#7ac8f7' },
            { accent: '#6b7cff', strong: '#4958cb', soft: '#edf0ff', softAlt: '#f7edff', contrast: '#ffffff', reportGradientStart: '#6b7cff', reportGradientEnd: '#b37cff' },
            { accent: '#f08b36', strong: '#c36a1d', soft: '#fff2e5', softAlt: '#fff9ef', contrast: '#ffffff', reportGradientStart: '#f08b36', reportGradientEnd: '#ffbf66' }
        ];

        // 雅思查找表
        const IELTS_TABLES = {
            listening: [
                {min:39,max:40,s:9.0},{min:37,max:38,s:8.5},{min:35,max:36,s:8.0},{min:32,max:34,s:7.5},
                {min:30,max:31,s:7.0},{min:26,max:29,s:6.5},{min:23,max:25,s:6.0},{min:18,max:22,s:5.5},
                {min:16,max:17,s:5.0},{min:13,max:15,s:4.5},{min:10,max:12,s:4.0},{min:6,max:9,s:3.5},
                {min:4,max:5,s:3.0},{min:3,max:3,s:2.5},{min:2,max:2,s:2.0},{min:1,max:1,s:1.0},{min:0,max:0,s:0.5}
            ],
            reading: [
                {min:39,max:40,s:9.0},{min:37,max:38,s:8.5},{min:35,max:36,s:8.0},{min:33,max:34,s:7.5},
                {min:30,max:32,s:7.0},{min:27,max:29,s:6.5},{min:23,max:26,s:6.0},{min:19,max:22,s:5.5},
                {min:15,max:18,s:5.0},{min:13,max:14,s:4.5},{min:10,max:12,s:4.0},{min:8,max:9,s:3.5},
                {min:6,max:7,s:3.0},{min:4,max:5,s:2.5},{min:3,max:3,s:2.5},{min:2,max:2,s:2.0},{min:1,max:1,s:1.0},{min:0,max:0,s:0.5}
            ]
        };

        // ==================== 工具函数 ====================
        function readStorageJson(key, fallback) {
            try {
                const raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : fallback;
            } catch (error) {
                console.warn('Failed to parse localStorage key:', key, error);
                return fallback;
            }
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function escapeAttr(value) {
            return escapeHtml(value);
        }

        function getExamTheme(examType) {
            if (EXAM_THEME_MAP[examType]) return EXAM_THEME_MAP[examType];
            const seed = String(examType || 'custom').split('').reduce(function (acc, ch) {
                return acc + ch.charCodeAt(0);
            }, 0);
            return FALLBACK_THEME_POOL[seed % FALLBACK_THEME_POOL.length];
        }

        function getExamBadgeMarkup(examType, label, size) {
            const theme = getExamTheme(examType);
            const boxSize = size || 42;
            const iconSize = Math.round(boxSize * 0.64);
            const padding = Math.round((boxSize - iconSize) / 2);
            let iconMarkup = '';

            if (examType === 'ielts') {
                iconMarkup = `
                    <path d="M11 11h10" stroke="${theme.contrast}" stroke-width="2.2" stroke-linecap="round"/>
                    <path d="M11 16h10" stroke="${theme.contrast}" stroke-width="2.2" stroke-linecap="round"/>
                    <path d="M11 21h7" stroke="${theme.contrast}" stroke-width="2.2" stroke-linecap="round"/>
                    <rect x="6" y="9" width="3" height="3" rx="1.2" fill="${theme.contrast}"/>
                    <rect x="6" y="14" width="3" height="3" rx="1.2" fill="${theme.contrast}"/>
                    <rect x="6" y="19" width="3" height="3" rx="1.2" fill="${theme.contrast}"/>
                `;
            } else if (examType === 'cet4') {
                iconMarkup = `
                    <path d="M8 22V11.5c0-1 .8-1.8 1.8-1.8h11.6c1 0 1.8.8 1.8 1.8V22" stroke="${theme.contrast}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 9V7.8c0-1 .8-1.8 1.8-1.8h3.4c1 0 1.8.8 1.8 1.8V9" stroke="${theme.contrast}" stroke-width="2.1" stroke-linecap="round"/>
                    <path d="M8 15h15" stroke="${theme.contrast}" stroke-width="2.1" stroke-linecap="round"/>
                    <path d="m14 15.2 1.7 1.7 3.3-3.4" stroke="${theme.contrast}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
                `;
            } else if (examType === 'cet6') {
                iconMarkup = `
                    <path d="M7 22h18" stroke="${theme.contrast}" stroke-width="2.1" stroke-linecap="round"/>
                    <rect x="9" y="14" width="3.4" height="8" rx="1.2" fill="${theme.contrast}"/>
                    <rect x="14.4" y="11" width="3.4" height="11" rx="1.2" fill="${theme.contrast}" opacity="0.92"/>
                    <rect x="19.8" y="8" width="3.4" height="14" rx="1.2" fill="${theme.contrast}" opacity="0.82"/>
                    <path d="M9 10.2c2-.2 3.8-.8 5.4-2 1.7-1.2 3.2-2.9 4.6-5.2" stroke="${theme.contrast}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="m18.6 3 1.8.1-.1 1.8" stroke="${theme.contrast}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
                `;
            } else {
                const initial = escapeHtml(String(label || examType || 'M').slice(0, 1).toUpperCase());
                iconMarkup = `<text x="16" y="21" text-anchor="middle" font-size="13" font-weight="700" fill="${theme.contrast}" font-family="Manrope, sans-serif">${initial}</text>`;
            }

            return '<span style="display:inline-flex;align-items:center;justify-content:center;width:' + boxSize + 'px;height:' + boxSize + 'px;border-radius:' + Math.round(boxSize * 0.34) + 'px;background:linear-gradient(135deg,' + theme.reportGradientStart + ', ' + theme.reportGradientEnd + ');box-shadow:0 12px 30px -18px rgba(40,55,90,0.45);flex-shrink:0;"><svg width="' + iconSize + '" height="' + iconSize + '" viewBox="0 0 32 32" fill="none" aria-hidden="true" style="display:block">' + iconMarkup + '</svg></span>';
        }

        function getReportTypeIconMarkup(kind, size) {
            const iconSize = size || 30;
            if (kind === 'scorecard') {
                return '<svg width="' + iconSize + '" height="' + iconSize + '" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="6" y="5.5" width="20" height="21" rx="5" fill="#eef1ff" stroke="#5b7cff" stroke-width="1.8"/><path d="M11 12h10M11 17h10M11 22h6" stroke="#3f5ee8" stroke-width="2" stroke-linecap="round"/></svg>';
            }
            return '<svg width="' + iconSize + '" height="' + iconSize + '" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="5.5" y="7" width="21" height="18" rx="6" fill="#fff2ea" stroke="#ff8a63" stroke-width="1.8"/><path d="M10 21l4.5-5 4 3.5 4.5-6" stroke="#f26d44" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="21" r="1.6" fill="#f26d44"/><circle cx="18.5" cy="19.5" r="1.6" fill="#f26d44"/><circle cx="23" cy="13.5" r="1.6" fill="#f26d44"/></svg>';
        }

        async function postComment(payload) {
            const res = await fetch(COMMENT_API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            let data = {};
            try {
                data = await res.json();
            } catch (error) {
                if (!res.ok) {
                    throw new Error('AI 服务返回了不可解析的响应');
                }
            }

            if (!res.ok) {
                throw new Error(data.error || ('AI 请求失败（' + res.status + '）'));
            }

            return data;
        }

        function getRecords() {
            const data = readStorageJson(STORAGE.RECORDS, []);
            return Array.isArray(data) ? data : [];
        }

        function saveRecords(r) {
            localStorage.setItem(STORAGE.RECORDS, JSON.stringify(r));
        }

        function getCustom() {
            const data = readStorageJson(STORAGE.CUSTOM, {});
            return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
        }

        function saveCustom(c) {
            localStorage.setItem(STORAGE.CUSTOM, JSON.stringify(c));
        }

        function allExams() {
            return { ...BUILTIN_EXAMS, ...getCustom() };
        }

        function buildArchiveHighlights(records, exams) {
            if (!records.length) return [];

            const grouped = {};
            for (const record of records) {
                if (!grouped[record.examType]) {
                    grouped[record.examType] = [];
                }
                grouped[record.examType].push(record);
            }

            return Object.entries(grouped)
                .map(function (entry) {
                    const examType = entry[0];
                    const examRecords = entry[1];
                    const exam = exams[examType];
                    const totals = examRecords
                        .map(function (record) { return typeof record.total === 'number' ? record.total : null; })
                        .filter(function (value) { return value !== null; });

                    return {
                        examType: examType,
                        name: exam ? exam.name : examType,
                        count: examRecords.length,
                        best: totals.length ? Math.max.apply(null, totals) : null,
                        lastDate: examRecords
                            .map(function (record) { return record.date; })
                            .sort()
                            .slice(-1)[0] || '-'
                    };
                })
                .sort(function (a, b) {
                    if (b.count !== a.count) return b.count - a.count;
                    return a.name.localeCompare(b.name, 'zh-CN');
                })
                .slice(0, 4);
        }

        function roundUp(n) { return Math.ceil(n); }

        function calcIeltsOverall(scores) {
            const avg = scores.reduce((a,b)=>a+b,0)/scores.length;
            const dec = avg - Math.floor(avg);
            if (dec >= 0.25 && dec < 0.5) return Math.floor(avg) + 0.5;
            if (dec >= 0.75) return Math.floor(avg) + 1.0;
            return Math.round(avg * 2) / 2;
        }

        // 雅思写作 Task1/Task2 加权计算 (Task2占2/3, Task1占1/3)
        function calcWritingScore(t1, t2) {
            if (t1 === null || t2 === null) return null;
            const score = (t2 * 2 + t1) / 3;
            return Math.round(score * 2) / 2;
        }

        function lookup(raw, type) {
            const table = IELTS_TABLES[type];
            if (!table) return parseFloat(raw) || 0;
            const v = parseInt(raw) || 0;
            for (const item of table) {
                if (v >= item.min && v <= item.max) return item.s;
            }
            return 0;
        }

        // ==================== 页面切换 ====================
        function showPage(p) {
            document.querySelectorAll('.page').forEach(el => el.classList.add('hidden'));
            document.getElementById('page-' + p).classList.remove('hidden');
            document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
            document.getElementById('nav-' + p).classList.add('active');

            if (p === 'dashboard') renderDashboard();
            else if (p === 'entry') {
                currentExam = null;
                writingTask1 = null;
                writingTask2 = null;
                renderExamSelector();
                document.getElementById('entry-form-container').innerHTML = '<div class="empty-state"><svg width="64" height="64" fill="none" stroke="#d1d5db" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom:1rem;"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg><p style="color:#6b7280;margin-bottom:1rem;">还没有成绩记录</p><button onclick="showPage(\'entry\')" style="color:#10b981;font-weight:600;background:none;border:none;cursor:pointer;">开始录入 →</button></div>';
            }
            else if (p === 'custom') renderCustomList();
        }

        // ==================== 仪表盘 ====================
        function renderDashboard() {
            // 更新桌面宠物的心情
        if (typeof updatePetMood === 'function') {
        updatePetMood();
        }
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
                    // 先显示非写作翻译的科目
                    for (const s of exam.subjects) {
                        if (isCet && (s.id === 'writing' || s.id === 'translation')) continue;

                        const sc = last.scores[s.id] || 0;
                        html += '<div class="recent-score-item" style="background:' + s.color + '15;border:2px solid ' + s.color + '40;">';
                        html += '<div class="recent-score-item-label" style="color:' + s.color + ';">' + escapeHtml(s.name) + '</div>';
                        html += '<div class="recent-score-item-value" style="color:' + s.color + ';">' + sc.toFixed(s.dec) + '</div></div>';
                    }

                    // CET考试：合并显示写作和翻译
                    if (isCet) {
                        const writingScore = last.scores['writing'] || 0;
                        const translationScore = last.scores['translation'] || 0;
                        const wtTotal = writingScore + translationScore;
                        const wtColor = '#f59e0b';
                        html += '<div class="recent-score-item" style="background:' + wtColor + '15;border:2px solid ' + wtColor + '40;">';
                        html += '<div class="recent-score-item-label" style="color:' + wtColor + ';">写作和翻译</div>';
                        html += '<div class="recent-score-item-value" style="color:' + wtColor + ';">' + wtTotal + '</div></div>';
                    }
                }
                html += '</div>';
                if (last.total !== null) {
                    const totalLabel = last.examType === 'ielts' ? 'Overall' : '总分';
                    html += '<div class="total-preview"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-weight:600;color:#059669;">' + totalLabel + '</span><span style="font-size:2.5rem;font-weight:bold;" class="gradient-text">' + last.total.toFixed(1) + '</span></div></div>';
                }
                recentDiv.innerHTML = html;
                // 准备历史数据
const historyRecs = records.filter(r => r.examType === last.examType).map(r => r.total).slice(-5);
// 呼叫 AI (传入：考试名、本次总分、历史记录)
fetchAIComment(exam ? exam.name : last.examType, last.total, historyRecs);
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
                        const writingScore = r.scores['writing'] || 0;
                        const translationScore = r.scores['translation'] || 0;
                        const wtTotal = writingScore + translationScore;
                        const wtColor = '#f59e0b';
                        badges += '<span class="score-badge" style="background:' + wtColor + '15;color:' + wtColor + ';">写作和翻译: ' + wtTotal + '</span>';
                    }

                    const theme = getExamTheme(r.examType);
                    listHtml += '<div class="record-box" style="border-color:' + theme.accent + '26;box-shadow:0 16px 34px -30px ' + theme.accent + '66;"><div class="record-row"><div class="record-main"><div class="record-meta">' + getExamBadgeMarkup(r.examType, e.name, 38) + '<span style="font-weight:700;color:' + theme.strong + ';">' + escapeHtml(e.name) + '</span><span style="color:#9ca3af;font-size:0.875rem;">' + escapeHtml(r.date) + '</span></div><div class="record-badges">' + badges + '</div></div><div class="record-side">';
                    if (r.total !== null) {
                        const totalLabel = r.examType === 'ielts' ? 'Overall' : '总分';
                        listHtml += '<div class="record-total"><div style="font-size:0.75rem;color:#9ca3af;">' + totalLabel + '</div><div style="font-size:1.75rem;font-weight:bold;color:' + theme.strong + ';">' + r.total.toFixed(1) + '</div></div>';
                    }
                    listHtml += '<button class="record-delete" onclick="deleteRecord(' + r.id + ')">×</button></div></div></div>';
                }
                listDiv.innerHTML = listHtml;
            }
        }

        function switchDashboardTab(tab, btnElement) {
            // 使用传入的btnElement而不是event.target
            const btn = btnElement || event.target;
            
            // 移除所有active状态
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            // 添加active状态到当前按钮
            btn.classList.add('active');
            
            const container = document.getElementById('tab-content-overview');
            const chartsContainer = document.getElementById('charts-container');
            const overviewEmpty = document.getElementById('overview-empty');

            if (tab === 'overview') {
                // 显示概览
                overviewEmpty.style.display = 'block';
                chartsContainer.style.display = 'none';
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

            // 显示统计卡片 - 不破坏chartsContainer
            let statsHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;margin-bottom:1.5rem;">';
            statsHtml += '<div class="stat-box"><p style="color:#6b7280;font-size:0.875rem;">考试次数</p><p style="font-size:2rem;font-weight:bold;" class="gradient-text">' + recs.length + '</p></div>';
            statsHtml += '<div class="stat-box"><p style="color:#6b7280;font-size:0.875rem;">最近</p><p style="font-size:1.25rem;font-weight:bold;">' + escapeHtml(recs[recs.length-1].date) + '</p></div>';
            if (exam.calcTotal) {
                const totals = recs.map(r => r.total);
                const rootStyle = getComputedStyle(document.documentElement);
                const accentColor = rootStyle.getPropertyValue('--accent').trim() || '#c35f3d';
                const supportColor = rootStyle.getPropertyValue('--support').trim() || '#7b6aa6';
                statsHtml += '<div class="stat-box"><p style="color:#6b7280;font-size:0.875rem;">最佳</p><p style="font-size:2rem;font-weight:bold;color:' + accentColor + ';">' + Math.max(...totals).toFixed(1) + '</p></div>';
                statsHtml += '<div class="stat-box"><p style="color:#6b7280;font-size:0.875rem;">平均</p><p style="font-size:2rem;font-weight:bold;color:' + supportColor + ';">' + (totals.reduce((a,b)=>a+b,0)/totals.length).toFixed(1) + '</p></div>';
            }
            statsHtml += '</div>';

            // 更新统计区域
            const statsArea = document.getElementById('stats-area');
            if (statsArea) {
                statsArea.innerHTML = statsHtml;
            } else {
                overviewEmpty.innerHTML = statsHtml;
            }

            // 渲染图表
            chartsContainer.style.display = 'block';
            renderMainChart(tab, recs, exam);
        }

        // ==================== 图表渲染 ====================
        function renderMainChart(examType, records, exam) {
            const canvas = document.getElementById('main-chart');
            const noDataEl = document.getElementById('chart-no-data');
            if (!canvas) return;

            if (mainChartInstance) {
                mainChartInstance.destroy();
                mainChartInstance = null;
            }

            if (records.length === 0) {
                noDataEl.style.display = 'block';
                canvas.parentElement.style.display = 'none';
                return;
            }

            noDataEl.style.display = 'none';
            canvas.parentElement.style.display = 'block';

            const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));

            // 根据考试类型准备数据
            let datasets = [];
            const examId = examType;

            if (examId === 'ielts') {
                // 雅思图表
                datasets = [
                    { label: 'Overall', data: sorted.map(r => r.total), borderColor: '#275b56', backgroundColor: 'rgba(39, 91, 86, 0.12)', borderWidth: 3, fill: true, tension: 0.3, pointRadius: 5 },
                    { label: 'Listening', data: sorted.map(r => r.scores.listening || 0), borderColor: '#4d7298', borderWidth: 2, tension: 0.3, pointRadius: 4 },
                    { label: 'Reading', data: sorted.map(r => r.scores.reading || 0), borderColor: '#275b56', borderWidth: 2, tension: 0.3, pointRadius: 4 },
                    { label: 'Writing', data: sorted.map(r => r.scores.writing || 0), borderColor: '#c35f3d', borderWidth: 2, tension: 0.3, pointRadius: 4 },
                    { label: 'Speaking', data: sorted.map(r => r.scores.speaking || 0), borderColor: '#7b6aa6', borderWidth: 2, tension: 0.3, pointRadius: 4 }
                ];
            } else if (examId === 'cet4' || examId === 'cet6') {
                // 四六级图表 - 写作和翻译合并显示
                const color = examId === 'cet4' ? '#275b56' : '#7b6aa6';
                datasets = [
                    { label: '总分', data: sorted.map(r => r.total), borderColor: color, backgroundColor: color + '20', borderWidth: 3, fill: true, tension: 0.3, pointRadius: 5 },
                    { label: '听力', data: sorted.map(r => r.scores.listening || 0), borderColor: '#4d7298', borderWidth: 2, tension: 0.3, pointRadius: 4 },
                    { label: '阅读', data: sorted.map(r => r.scores.reading || 0), borderColor: '#275b56', borderWidth: 2, tension: 0.3, pointRadius: 4 },
                    { label: '写作和翻译', data: sorted.map(r => (r.scores.writing || 0) + (r.scores.translation || 0)), borderColor: '#c35f3d', borderWidth: 2, tension: 0.3, pointRadius: 4 }
                ];
            } else {
                // 自定义考试 - 显示总分和各科目
                datasets = [
                    { label: '总分', data: sorted.map(r => r.total), borderColor: '#275b56', backgroundColor: 'rgba(39, 91, 86, 0.12)', borderWidth: 3, fill: true, tension: 0.3, pointRadius: 5 }
                ];
                // 添加各科目数据
                for (const s of exam.subjects) {
                    datasets.push({
                        label: s.name,
                        data: sorted.map(r => r.scores[s.id] || 0),
                        borderColor: s.color,
                        borderWidth: 2,
                        tension: 0.3,
                        pointRadius: 4
                    });
                }
            }

            const ctx = canvas.getContext('2d');
            mainChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: sorted.map(r => r.date),
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: { usePointStyle: true, padding: 15 }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            grid: { color: 'rgba(0, 0, 0, 0.05)' }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        // ==================== 历史记录 ====================
        function renderHistoryRecords() {
            const records = getRecords();
            const exams = allExams();
            const listDiv = document.getElementById('records-list');
            
            if (!records.length) {
                listDiv.innerHTML = '<div class="empty-state" style="padding:2rem;"><p style="color:#9ca3af;">暂无历史记录</p></div>';
                return;
            }
            
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
                    const writingScore = r.scores['writing'] || 0;
                    const translationScore = r.scores['translation'] || 0;
                    const wtTotal = writingScore + translationScore;
                    const wtColor = '#f59e0b';
                    badges += '<span class="score-badge" style="background:' + wtColor + '15;color:' + wtColor + ';">写作和翻译: ' + wtTotal + '</span>';
                }

                const theme = getExamTheme(r.examType);
                listHtml += '<div class="record-box" style="border-color:' + theme.accent + '26;box-shadow:0 16px 34px -30px ' + theme.accent + '66;"><div class="record-row"><div class="record-main"><div class="record-meta">' + getExamBadgeMarkup(r.examType, e.name, 38) + '<span style="font-weight:700;color:' + theme.strong + ';">' + escapeHtml(e.name) + '</span><span style="color:#9ca3af;font-size:0.875rem;">' + escapeHtml(r.date) + '</span></div><div class="record-badges">' + badges + '</div></div><div class="record-side">';
                if (r.total !== null) {
                    const totalLabel = r.examType === 'ielts' ? 'Overall' : '总分';
                    listHtml += '<div class="record-total"><div style="font-size:0.75rem;color:#9ca3af;">' + totalLabel + '</div><div style="font-size:1.75rem;font-weight:bold;color:' + theme.strong + ';">' + r.total.toFixed(1) + '</div></div>';
                }
                listHtml += '<button class="record-delete" onclick="deleteRecord(' + r.id + ')">×</button></div></div></div>';
            }
            listDiv.innerHTML = listHtml;
        }

        function deleteRecord(id) {
            if (!confirm('确定删除这条记录？')) return;
            saveRecords(getRecords().filter(r => r.id !== id));
            renderDashboard();
        }

        function clearAllRecords() {
            if (!confirm('确定清空所有记录？此操作不可恢复！')) return;
            localStorage.removeItem(STORAGE.RECORDS);
            renderDashboard();
        }


        // ==================== 录入成绩 ====================
        let currentExam = null;
        let writingTask1 = null;
        let writingTask2 = null;

        function renderExamSelector() {
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

            // 更新选中状态
            document.querySelectorAll('.exam-card').forEach((c, i) => {
                const keys = Object.keys(exams);
                c.classList.toggle('active', keys[i] === id);
            });

            // 渲染表单
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

                // 雅思写作特殊处理 - Task1/Task2
                if (s.type === 'ielts-writing') {
                    html += '<div style="margin-bottom:1rem;">';
                    html += '<label style="display:block;margin-bottom:0.5rem;font-size:0.875rem;color:#b45309;font-weight:500;">总分 (0-9，步长0.5)</label>';
                    html += '<input type="number" id="sub-' + s.id + '" min="0" max="9" step="0.5" class="input" placeholder="输入总分" oninput="updateTotalPreview()">';
                    html += '</div>';
                    html += '<div style="border-top:2px solid #fcd34d;padding-top:1rem;margin-top:1rem;">';
                    html += '<div style="margin-bottom:1rem;">';
                    html += '<label style="display:block;margin-bottom:0.5rem;font-size:0.875rem;color:#b45309;">Task 1 (小作文)</label>';
                    html += '<input type="number" id="task1-' + s.id + '" min="0" max="9" step="0.5" class="input" placeholder="Task1 分数" oninput="onTaskInput(1, this.value)">';
                    html += '</div>';
                    html += '<div style="margin-bottom:1rem;">';
                    html += '<label style="display:block;margin-bottom:0.5rem;font-size:0.875rem;color:#b45309;">Task 2 (大作文)</label>';
                    html += '<input type="number" id="task2-' + s.id + '" min="0" max="9" step="0.5" class="input" placeholder="Task2 分数" oninput="onTaskInput(2, this.value)">';
                    html += '</div>';
                    html += '<div style="background:rgba(255,255,255,0.7);border:1.5px solid #fcd34d;border-radius:12px;padding:1rem;">';
                    html += '<div style="font-size:0.875rem;color:#b45309;font-weight:500;">自动计算 (Task2×2 + Task1) ÷ 3</div>';
                    html += '<div id="writing-calc" style="font-size:1.5rem;font-weight:bold;color:#b45309;">-</div>';
                    html += '</div>';
                    html += '</div>';
                }
                else if (s.type === 'direct') {
                    html += '<input type="number" id="sub-' + s.id + '" min="' + s.min + '" max="' + s.max + '" step="' + (s.step || 1) + '" class="input" placeholder="' + s.min + '-' + s.max + '" oninput="updateTotalPreview()">';
                }
                else if (s.type === 'lookup') {
                    html += '<input type="number" id="sub-' + s.id + '" min="' + s.min + '" max="' + s.max + '" class="input" placeholder="正确题数 (' + s.min + '-' + s.max + ')" oninput="updateLookup(this, \'' + s.id + '\')">';
                    html += '<div style="margin-top:0.75rem;padding:0.75rem;background:' + s.color + '15;border-radius:10px;border:1.5px solid ' + s.color + '30;">';
                    html += '<span style="color:' + s.color + ';font-weight:500;">折算分: </span>';
                    html += '<strong id="calc-' + s.id + '" style="color:' + s.color + ';font-size:1.25rem;">-</strong>';
                    html += '</div>';
                }
                else if (s.type === 'sections') {
                    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.75rem;margin-bottom:0.75rem;">';
                    for (const sec of s.sections) {
                        html += '<div><label style="display:block;font-size:0.75rem;color:#6b7280;margin-bottom:0.25rem;">' + sec.name + ' (' + sec.score + '分/题)</label><input type="number" id="sub-' + s.id + '-' + sec.name + '" min="0" max="' + sec.max + '" class="input" placeholder="0-' + sec.max + '" oninput="updateSections(this, \'' + s.id + '\')"></div>';
                    }
                    html += '</div>';
                    html += '<div style="padding:0.75rem;background:' + s.color + '15;border-radius:10px;border:1.5px solid ' + s.color + '30;">';
                    html += '<span style="color:' + s.color + ';font-weight:500;">总分: </span>';
                    html += '<strong id="calc-' + s.id + '" style="color:' + s.color + ';font-size:1.25rem;">-</strong>';
                    html += '</div>';
                }
                else if (s.type === 'subquestions') {
                    html += '<div style="margin-bottom:0.75rem;"><label style="font-size:0.875rem;color:#6b7280;">各小题得分：</label></div>';
                    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.75rem;margin-bottom:0.75rem;">';
                    for (const sq of s.subquestions) {
                        html += '<div><label style="display:block;font-size:0.75rem;color:#6b7280;margin-bottom:0.25rem;">' + sq.name + ' (满分' + sq.max + ')</label><input type="number" id="sub-' + s.id + '-' + sq.name + '" min="0" max="' + sq.max + '" class="input" placeholder="0-' + sq.max + '" oninput="updateSubQuestions(this, \'' + s.id + '\')"></div>';
                    }
                    html += '</div>';
                    html += '<div style="padding:0.75rem;background:' + s.color + '15;border-radius:10px;border:1.5px solid ' + s.color + '30;">';
                    html += '<span style="color:' + s.color + ';font-weight:500;">小题总分: </span>';
                    html += '<strong id="calc-' + s.id + '" style="color:' + s.color + ';font-size:1.25rem;">-</strong>';
                    html += '</div>';
                }
                else if (s.type === 'formula') {
                    html += '<input type="number" id="sub-' + s.id + '" min="' + s.min + '" max="' + s.max + '" step="0.5" class="input" placeholder="原始分 (' + s.min + '-' + s.max + ')" oninput="updateFormula(this, \'' + s.id + '\', ' + s.mult + ')">';
                    html += '<div style="margin-top:0.75rem;padding:0.75rem;background:' + s.color + '15;border-radius:10px;border:1.5px solid ' + s.color + '30;">';
                    html += '<span style="color:' + s.color + ';font-weight:500;">折算分 (×' + s.mult + '): </span>';
                    html += '<strong id="calc-' + s.id + '" style="color:' + s.color + ';font-size:1.25rem;">-</strong>';
                    html += '</div>';
                }

                html += '</div></div></div>';
            }

            if (exam.calcTotal) {
                html += '<div class="total-preview" style="margin:1.5rem 0;">';
                html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
                html += '<span style="font-weight:700;color:#059669;">' + (exam.id === 'ielts' ? 'Overall' : '总分预览') + '</span>';
                html += '<span id="preview-total" style="font-size:2.5rem;font-weight:bold;" class="gradient-text">-</span>';
                html += '</div></div>';
            }

            html += '<button type="submit" class="btn-primary" style="width:100%;">💾 保存成绩</button>';
            html += '</form>';

            document.getElementById('entry-form-container').innerHTML = html;
            document.getElementById('score-date').value = new Date().toISOString().split('T')[0];
        }

        function toggleAcc(header) {
            const content = header.nextElementSibling;
            const arrow = header.querySelector('.accordion-arrow');
            const isExpanded = content.classList.contains('expanded');
            
            document.querySelectorAll('.accordion-content').forEach(c => c.classList.remove('expanded'));
            document.querySelectorAll('.accordion-arrow').forEach(a => a.classList.remove('expanded'));
            
            if (!isExpanded) {
                content.classList.add('expanded');
                arrow.classList.add('expanded');
            }
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
            } else {
                document.getElementById('writing-calc').textContent = '-';
            }
            updateTotalPreview();
        }

        function updateLookup(el, subId) {
            const score = lookup(el.value, subId);
            const calcEl = document.getElementById('calc-' + subId);
            if (calcEl) calcEl.textContent = score.toFixed(1);
            updateTotalPreview();
        }

        function updateSections(el, subId) {
            if (!currentExam) return;
            const exam = allExams()[currentExam];
            if (!exam) return;
            const sub = exam.subjects.find(s => s.id === subId);
            if (!sub || !sub.sections) return;
            
            let sum = 0;
            for (const sec of sub.sections) {
                const inputEl = document.getElementById('sub-' + subId + '-' + sec.name);
                const v = inputEl ? (parseInt(inputEl.value) || 0) : 0;
                sum += v * (sec.score || 0);
            }
            const result = roundUp(sum);
            const calcEl = document.getElementById('calc-' + subId);
            if (calcEl) calcEl.textContent = result;
            updateTotalPreview();
        }

        function updateFormula(el, subId, mult) {
            const raw = parseFloat(el.value) || 0;
            const calcEl = document.getElementById('calc-' + subId);
            if (calcEl) calcEl.textContent = roundUp(raw * mult);
            updateTotalPreview();
        }

        function updateSubQuestions(el, subId) {
            if (!currentExam) return;
            const exam = allExams()[currentExam];
            if (!exam) return;
            const sub = exam.subjects.find(s => s.id === subId);
            if (!sub || !sub.subquestions) return;
            
            let sum = 0;
            for (const sq of sub.subquestions) {
                const inputEl = document.getElementById('sub-' + subId + '-' + sq.name);
                const v = inputEl ? (parseFloat(inputEl.value) || 0) : 0;
                sum += v;
            }
            const calcEl = document.getElementById('calc-' + subId);
            if (calcEl) calcEl.textContent = sum.toFixed(1);
            updateTotalPreview();
        }

        function updateTotalPreview() {
            if (!currentExam) return;
            const exam = allExams()[currentExam];
            if (!exam || !exam.calcTotal) return;

            const scores = [];
            for (const s of exam.subjects) {
                let sc = 0;
                if (s.type === 'ielts-writing') {
                    sc = parseFloat(document.getElementById('sub-' + s.id)?.value) || 0;
                } else if (s.type === 'direct' || s.type === 'lookup') {
                    const el = document.getElementById('sub-' + s.id);
                    sc = s.type === 'lookup' ? lookup(el?.value, s.id) : (parseFloat(el?.value) || 0);
                } else if (s.type === 'sections' || s.type === 'subquestions') {
                    sc = parseFloat(document.getElementById('calc-' + s.id)?.textContent) || 0;
                } else if (s.type === 'formula') {
                    sc = parseInt(document.getElementById('calc-' + s.id)?.textContent) || 0;
                }
                scores.push(sc);
            }

            let total = 0;
            if (exam.id === 'ielts') {
                total = calcIeltsOverall(scores);
            } else {
                total = scores.reduce((a, b) => a + b, 0);
            }
            document.getElementById('preview-total').textContent = total.toFixed(1);
        }

        function submitScore(e) {
            e.preventDefault();
            if (!currentExam) return;

            const exam = allExams()[currentExam];
            const scores = {};

            for (const s of exam.subjects) {
                if (s.type === 'ielts-writing') {
                    scores[s.id] = parseFloat(document.getElementById('sub-' + s.id)?.value) || 0;
                } else if (s.type === 'direct') {
                    scores[s.id] = parseFloat(document.getElementById('sub-' + s.id)?.value) || 0;
                } else if (s.type === 'lookup') {
                    scores[s.id] = lookup(document.getElementById('sub-' + s.id)?.value, s.id);
                } else if (s.type === 'sections' || s.type === 'subquestions') {
                    scores[s.id] = parseFloat(document.getElementById('calc-' + s.id)?.textContent) || 0;
                } else if (s.type === 'formula') {
                    scores[s.id] = parseInt(document.getElementById('calc-' + s.id)?.textContent) || 0;
                }
            }

            let total = null;
            if (exam.calcTotal) {
                const vals = Object.values(scores);
                total = exam.id === 'ielts' ? calcIeltsOverall(vals) : vals.reduce((a, b) => a + b, 0);
            }

            const rec = {
                id: Date.now(),
                examType: currentExam,
                date: document.getElementById('score-date').value,
                scores: scores,
                total: total
            };

            const recs = getRecords();
            recs.push(rec);
            saveRecords(recs);

            alert('成绩保存成功！');
            showPage('dashboard');
        }


        // ==================== 自定义考试 ====================
        let customSubs = [];

        function renderCustomList() {
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

        function closeCreateModal() {
            document.getElementById('create-modal').classList.remove('active');
        }

        function closeModalOnBackdrop(e) {
            if (e.target.id === 'create-modal') closeCreateModal();
        }

        function addSubject() {
            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
            customSubs.push({ id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5), name: '', short: '', color: colors[customSubs.length % colors.length], type: 'direct', min: 0, max: 100 });
            renderSubList();
        }

        function renderSubList() {
            const container = document.getElementById('subjects-list');
            if (!customSubs.length) {
                container.innerHTML = '<p style="color:#9ca3af;text-align:center;padding:1rem;">点击上方按钮添加科目</p>';
                return;
            }
            let html = '';
            for (let i = 0; i < customSubs.length; i++) {
                const s = customSubs[i];
                html += '<div style="padding:1rem;background:#f9fafb;border-radius:12px;margin-bottom:0.75rem;border:1.5px solid #e5e7eb;">';
                html += '<div style="display:grid;grid-template-columns:1fr 80px 40px;gap:0.5rem;margin-bottom:0.5rem;">';
                html += '<input type="text" placeholder="科目名称" value="' + escapeAttr(s.name) + '" onchange="customSubs[' + i + '].name=this.value" class="input">';
                html += '<input type="text" placeholder="简称" value="' + escapeAttr(s.short) + '" onchange="customSubs[' + i + '].short=this.value" class="input">';
                html += '<input type="color" value="' + s.color + '" onchange="customSubs[' + i + '].color=this.value" style="width:40px;height:40px;border:none;border-radius:0.5rem;cursor:pointer;">';
                html += '</div>';
                html += '<select onchange="customSubs[' + i + '].type=this.value;renderSubList()" class="input" style="margin-bottom:0.5rem;">';
                html += '<option value="direct" ' + (s.type === 'direct' ? 'selected' : '') + '>直接输入分数</option>';
                html += '<option value="subquestions" ' + (s.type === 'subquestions' ? 'selected' : '') + '>多小题计分</option>';
                html += '<option value="sections" ' + (s.type === 'sections' ? 'selected' : '') + '>分部分计分</option>';
                html += '<option value="formula" ' + (s.type === 'formula' ? 'selected' : '') + '>公式计算</option>';
                html += '</select>';

                if (s.type === 'direct') {
                    html += '<div style="display:flex;gap:0.5rem;"><input type="number" placeholder="最小值" value="' + s.min + '" onchange="customSubs[' + i + '].min=parseFloat(this.value)" class="input"><input type="number" placeholder="最大值" value="' + s.max + '" onchange="customSubs[' + i + '].max=parseFloat(this.value)" class="input"></div>';
                } else if (s.type === 'subquestions') {
                    if (!s.subquestions) s.subquestions = [{ name: '小题1', max: 10 }];
                    html += '<div id="subqs-' + i + '">';
                    for (let j = 0; j < s.subquestions.length; j++) {
                        const sq = s.subquestions[j];
                        html += '<div style="display:flex;gap:0.5rem;margin-bottom:0.25rem;"><input type="text" placeholder="小题名称" value="' + escapeAttr(sq.name) + '" onchange="customSubs[' + i + '].subquestions[' + j + '].name=this.value" class="input" style="flex:1;"><input type="number" placeholder="满分" value="' + sq.max + '" onchange="customSubs[' + i + '].subquestions[' + j + '].max=parseFloat(this.value)" class="input" style="width:80px;"></div>';
                    }
                    html += '</div><button type="button" onclick="addSubQuestion(' + i + ')" style="color:#10b981;background:none;border:none;cursor:pointer;font-size:0.875rem;">+ 添加小题</button>';
                } else if (s.type === 'formula') {
                    html += '<div style="display:flex;gap:0.5rem;"><input type="number" placeholder="原始分最大值" value="' + (s.max || 15) + '" onchange="customSubs[' + i + '].max=parseFloat(this.value)" class="input"><input type="number" placeholder="乘数" value="' + (s.mult || 7.1) + '" onchange="customSubs[' + i + '].mult=parseFloat(this.value)" class="input"></div>';
                } else if (s.type === 'sections') {
                    if (!s.sections) s.sections = [{ name: '部分1', score: 1, max: 10 }];
                    html += '<div id="secs-' + i + '">';
                    for (let j = 0; j < s.sections.length; j++) {
                        const sec = s.sections[j];
                        html += '<div style="display:flex;gap:0.5rem;margin-bottom:0.25rem;"><input type="text" placeholder="名称" value="' + escapeAttr(sec.name) + '" onchange="customSubs[' + i + '].sections[' + j + '].name=this.value" class="input" style="flex:1;"><input type="number" placeholder="分值" value="' + sec.score + '" onchange="customSubs[' + i + '].sections[' + j + '].score=parseFloat(this.value)" class="input" style="width:80px;"><input type="number" placeholder="最大题数" value="' + sec.max + '" onchange="customSubs[' + i + '].sections[' + j + '].max=parseInt(this.value)" class="input" style="width:80px;"></div>';
                    }
                    html += '</div><button type="button" onclick="addSec(' + i + ')" style="color:#10b981;background:none;border:none;cursor:pointer;font-size:0.875rem;">+ 添加部分</button>';
                }

                html += '<button type="button" onclick="removeSub(' + i + ')" style="color:#ef4444;background:none;border:none;cursor:pointer;font-size:0.875rem;margin-top:0.5rem;">删除科目</button>';
                html += '</div>';
            }
            container.innerHTML = html;
        }

        function addSec(idx) {
            customSubs[idx].sections.push({ name: '', score: 1, max: 10 });
            renderSubList();
        }

        function addSubQuestion(idx) {
            if (!customSubs[idx].subquestions) customSubs[idx].subquestions = [];
            customSubs[idx].subquestions.push({ name: '', max: 10 });
            renderSubList();
        }

        function removeSub(idx) {
            customSubs.splice(idx, 1);
            renderSubList();
        }

        function submitCreateForm(e) {
            e.preventDefault();
            if (!customSubs.length) {
                alert('请至少添加一个科目！');
                return;
            }
            for (const s of customSubs) {
                if (!s.name || !s.short) {
                    alert('请填写所有科目的名称和简称！');
                    return;
                }
            }

            const exam = {
                id: 'custom_' + Date.now(),
                name: document.getElementById('new-exam-name').value,
                desc: document.getElementById('new-exam-desc').value,
                icon: '📝',
                builtin: false,
                calcTotal: true,
                subjects: customSubs
            };

            const custom = getCustom();
            custom[exam.id] = exam;
            saveCustom(custom);

            closeCreateModal();
            renderCustomList();
            alert('考试类型创建成功！');
        }

        function deleteCustom(id) {
            if (!confirm('确定删除？相关成绩也会被删除！')) return;
            const custom = getCustom();
            delete custom[id];
            saveCustom(custom);
            saveRecords(getRecords().filter(r => r.examType !== id));
            renderCustomList();
        }

        // ==================== 导入导出 ====================
        function exportData() {
            const records = getRecords();
            const custom = getCustom();
            if (!records.length && !Object.keys(custom).length) {
                alert('暂无数据可导出！');
                return;
            }
            const data = { version: '8.0', date: new Date().toISOString(), records, custom };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'MyScore_Backup_' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '.json';
            a.click();
            URL.revokeObjectURL(url);
            alert('导出成功！\n记录: ' + records.length + ' 条\n自定义考试: ' + Object.keys(custom).length + ' 个');
        }

        function importData(input) {
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!data.version) throw new Error('文件格式错误');
                    let newRecs = 0, newExams = 0;
                    if (data.records) {
                        const existing = getRecords();
                        const ids = new Set(existing.map(r => r.id));
                        for (const r of data.records) {
                            if (!ids.has(r.id)) {
                                existing.push(r);
                                newRecs++;
                            }
                        }
                        saveRecords(existing);
                    }
                    if (data.custom) {
                        const existing = getCustom();
                        for (const [id, e] of Object.entries(data.custom)) {
                            if (!existing[id]) {
                                existing[id] = e;
                                newExams++;
                            }
                        }
                        saveCustom(existing);
                    }
                    alert('导入成功！\n新记录: ' + newRecs + ' 条\n新考试类型: ' + newExams + ' 个');
                    renderDashboard();
                } catch (err) {
                    alert('导入失败: ' + err.message);
                }
            };
            reader.readAsText(file);
            input.value = '';
        }       
// 全局变量，用来记住上下文
let lastExamType = '';
let lastScore = 0;
let lastHistory = [];
let lastAiComment = '';

// 1. 初始获取评价 (renderDashboard 调用这个)
async function fetchAIComment(examType, currentScore, historyScores) {
    // 保存上下文，一会儿吵架要用
    lastExamType = examType;
    lastScore = currentScore;
    lastHistory = historyScores;

    const container = document.getElementById('ai-container');
    const box = document.getElementById('ai-comment-box');
    const actions = document.getElementById('ai-actions');
    const replyArea = document.getElementById('reply-input-area');

    if (!container) return;

    // 重置界面状态
    container.style.display = 'block';
    actions.style.display = 'none'; // 先藏起按钮
    replyArea.style.display = 'none'; // 先藏起输入框
    box.innerHTML = '🤖 毒舌老师正在推眼镜分析你的成绩...';
    box.style.background = 'rgba(221,238,231,0.72)'; // 恢复绿色背景
    box.style.color = '#174f3d';
    box.style.borderColor = 'rgba(31,106,82,0.14)';

    try {
        const data = await postComment({
            examType,
            currentScore,
            historyScores
        });
        
        if (data.comment) {
            lastAiComment = data.comment; // 记住老师骂了什么
            box.innerHTML = `<strong>👩‍🏫 毒舌老师：</strong> ${escapeHtml(data.comment)}`;
            actions.style.display = 'flex'; // 显示"回嘴"按钮
        } else {
            box.innerHTML = '老师去吃饭了...';
        }
    } catch (err) {
        console.error(err);
        box.innerHTML = '老师断线了...';
    }
}

// 2. 显示输入框
function showReplyInput() {
    document.getElementById('reply-input-area').style.display = 'block';
    document.getElementById('ai-actions').style.display = 'none'; // 隐藏按钮
    document.getElementById('user-rebuttal').focus();
}

// 3. 发送回嘴 (吵架逻辑)
async function sendRebuttal() {
    const input = document.getElementById('user-rebuttal');
    const rebuttal = input.value.trim();
    if (!rebuttal) return;

    const box = document.getElementById('ai-comment-box');
    
    // 界面变身：变成"对战中"状态
    box.innerHTML = `<strong>😤 你：</strong> ${escapeHtml(rebuttal)}<br><hr style="margin:8px 0; border:0; border-top:1px dashed #a7f3d0">🤖 老师正在思考怎么怼回来...`;
    box.style.background = 'rgba(243,224,207,0.82)';
    box.style.color = '#8e5520';
    box.style.borderColor = 'rgba(188,108,37,0.24)';
    
    document.getElementById('reply-input-area').style.display = 'none'; // 隐藏输入框

    try {
        const data = await postComment({
            examType: lastExamType,
            currentScore: lastScore,
            historyScores: lastHistory,
            userRebuttal: rebuttal,      // 重点：把你的回嘴发过去
            previousComment: lastAiComment // 重点：把老师刚才的话发过去
        });
        
        if (data.comment) {
            lastAiComment = data.comment; // 更新上下文
            // 显示这一轮的战况
            box.innerHTML = `<strong>😤 你：</strong> ${escapeHtml(rebuttal)}<br><br><strong>👩‍🏫 毒舌老师：</strong> ${escapeHtml(data.comment)}`;
            
            // 允许继续回嘴 (无限套娃)
            document.getElementById('ai-actions').style.display = 'flex';
            input.value = ''; // 清空输入框
        }
    } catch (err) {
        box.innerHTML += '<br>(老师被气得掉线了)';
    }
}
 // ================= 桌面宠物逻辑 =================

// 1. 毒舌语录库 (本地快速响应，不用等AI)
const SASSY_QUOTES = [
    "看什么看？单词背完了吗？😡",
    "你今天的复习时长如果是 0，我对你的评价也是 0。",
    "这么闲？还有空戳我？去刷题！👉",
    "上次那点分，你怎么睡得着觉的？",
    "再戳我，我就把你的成绩发给你爸妈。📱",
    "只有弱者才会在意别人的评价，强者都在刷题。📚",
    "哟，这不是那位总分 5.5 的选手吗？😏",
    "这就是你对待学习的态度？再戳一下试试？👊",
    "你知道吗？你的成绩让我怀疑你是不是在梦游考试。😴",
    "别看了，成绩不会自己变高，快去学习！📖",
    "你离成功只差一个字：努力。",
    "如果拖延是比赛，你已经是冠军了。🏆",
    "你的目标是考第一？还是考倒数第一？🤔",
    "别再摸鱼了，鱼都嫌你烦了。🐟",
    "你知道吗？你的成绩让我想起了我的噩梦。😱",
    "再不努力，你的未来会比今天更糟糕。",
    "你是来学习的，还是来打酱油的？",
    "成绩单不会撒谎，但你会。😏",
    "你觉得自己很努力？那成绩呢？",
    "别再找借口了，时间不会等你。⏳",
    "你以为考高分靠运气？不，靠实力。💪",
    "再戳我，我就把你的成绩贴在公告栏上。📋",
    "你知道吗？你的成绩让我怀疑你是不是在考古。🦴",
    "努力是免费的，但你选择了昂贵的懒惰。",
    "你知道吗？你的成绩让我想起了我小时候的玩笑。",
    "你是来考试的，还是来交朋友的？",
    "如果学习是游戏，你已经卡关了。",
    "你的未来取决于你今天的努力。",
    "别再拖延了，时间不会为你停留。",
    "你知道吗？你的成绩让我想起了我的黑历史。",
    "你是来挑战极限的，还是来挑战底线的？",
    "学习是场马拉松，而你却在起点睡着了。",
    "你知道吗？你的成绩让我怀疑你是不是在玩躲猫猫。",
    "别再找借口了，成功只属于那些努力的人。",
    "你觉得自己很聪明？那为什么成绩单不这么认为？",
    "你知道吗？你的成绩让我想起了我丢失的记忆。",
    "别再摸鱼了，鱼都开始嫌弃你了。"
,
    "今天点我三次了，背单词点过三次吗？😏",
    "你和高分之间就差一个动作：开始。",
    "我不是在骂你，我是在提前播报现实。",
    "你这学习节奏，像开了省电模式。🔋",
    "别把‘明天开始’当口头禅了，明天都听烦了。",
    "你现在的分数，像是在给未来挖坑。",
    "刷短视频的手速这么快，刷题怎么就卡了？📱",
    "你是来拿分的，不是来和拖延症谈恋爱的。",
    "每次点我都很积极，做题要是也这么积极就好了。",
    "这分数不是终点，但再躺就真到终点了。🛌",
    "你现在这状态，连错题本都替你着急。😮‍💨",
    "你不是不会，你只是一直没认真开始。",
    "学得慢没关系，停着不动才是问题。",
    "今天少找一个借口，明天就多一分底气。",
    "别再等状态了，状态是做出来的。",
    "你可以嘴硬，但成绩单只认分数。📄",
    "你这波操作，像是在给低分做长期投资。",
    "知识点都在排队等你，你却在原地发呆。",
    "我劝你现在学，不然以后只能学会后悔。",
    "别总说差一点，你差的是那一点点坚持。",
    "你今天复习了吗，还是又在和时间赛跑并且输了？",
    "考试不看心情，看准备。🎯",
    "你要么现在吃学习的苦，要么之后吃现实的苦。",
    "这不是天赋问题，是你执行力的问题。",
    "我都替你记住目标了，你别先忘了。",
    "再拖下去，计划表都要长灰了。🗂️",
    "你以为在休息，其实是在给焦虑充值。⚠️",
    "继续点我可以，但顺手点开题库更好。",
    "你不是差，你是还没把自己用到位。",
    "你的潜力很大，别把它只放在想象里。",
    "今天认真一点，明天就不用慌一点。✅",
    "如果努力有声音，你今天有点安静。",
    "你离进步不远，前提是别后退。",
    "再摸鱼我就默认你在给别人让名次了。🐟",
    "你这分数像天气预报：阴天转努力。",
    "我没有否定你，我只是否定你的偷懒。",
    "别再研究玄学提分了，先把题做完。📝",
    "要不这样，点我一次就去做一道题。",
    "你不是缺方法，你是缺持续执行。",
    "每次说马上开始，马上都快退休了。⌛",
    "再给自己一次认真投入的机会吧。",
    "高分不会突然出现，只会被一点点做出来。📈",
    "你今天的认真程度，决定明天的从容程度。",
    "继续努力，别让我夸你的机会一直缺席。👏",
    "别怕慢，怕的是你一直不出发。",
    "你这次要是稳住，后面会越来越轻松。",
    "我看好你，但你得先动起来。🚀",
    "现在开始还不晚，继续拖才晚。",
    "再点一次之前，先去做三道题，成交？"];

// 2. 初始化宠物状态 (在 renderDashboard 里调用)
function updatePetMood() {
    const records = getRecords();
    const avatar = document.getElementById('pet-avatar');
    if (!records.length) {
        avatar.innerHTML = '😴'; // 没成绩时在睡觉
        return;
    }

    // 获取最近两次成绩来判断趋势
    const last = records[records.length - 1];
    const prev = records.length > 1 ? records[records.length - 2] : null;
    
    // 简单的变脸逻辑
    if (!prev) {
        avatar.innerHTML = '😐'; // 只有一次成绩，面无表情
    } else if (last.total > prev.total) {
        avatar.innerHTML = '😎'; // 进步了，戴墨镜
    } else if (last.total < prev.total) {
        avatar.innerHTML = '😡'; // 退步了，生气
    } else {
        avatar.innerHTML = '😑'; // 没变化，无语
    }
}

// 3. 戳一戳互动函数
let bubbleTimer = null;
let recentQuoteIndexes = [];
const RECENT_QUOTES_WINDOW = 20;

function getNonRepeatingQuoteIndex() {
    if (SASSY_QUOTES.length <= 1) return 0;

    const windowSize = Math.min(RECENT_QUOTES_WINDOW, SASSY_QUOTES.length - 1);
    const recentSet = new Set(recentQuoteIndexes);
    let pickedIndex = -1;

    for (let i = 0; i < 12; i++) {
        const idx = Math.floor(Math.random() * SASSY_QUOTES.length);
        if (!recentSet.has(idx)) {
            pickedIndex = idx;
            break;
        }
    }

    if (pickedIndex === -1) {
        pickedIndex = 0;
        while (recentSet.has(pickedIndex) && pickedIndex < SASSY_QUOTES.length - 1) {
            pickedIndex++;
        }
    }

    recentQuoteIndexes.push(pickedIndex);
    if (recentQuoteIndexes.length > windowSize) {
        recentQuoteIndexes.shift();
    }

    return pickedIndex;
}

function pokeTeacher() {
    const bubble = document.getElementById('pet-bubble');
    const avatar = document.getElementById('desktop-pet');
    
    // 短期不重复：优先避开最近出现过的语录
    const randomQuote = SASSY_QUOTES[getNonRepeatingQuoteIndex()];
    bubble.innerText = randomQuote;

    // 显示气泡
    bubble.style.opacity = '1';
    bubble.style.visibility = 'visible';
    bubble.style.transform = 'translateY(-10px)';

    // 头像抖动特效
    avatar.style.transform = 'scale(0.9) rotate(-5deg)';
    setTimeout(() => avatar.style.transform = 'scale(1) rotate(0)', 200);

    // 3秒后自动消失
    if (bubbleTimer) clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => {
        bubble.style.opacity = '0';
        bubble.style.visibility = 'hidden';
        bubble.style.transform = 'translateY(0)';
    }, 3000);
}
// ==================== 版本日志与使用文档 ====================
const APP_VERSION = '8.0.1';
const CHANGELOG_STORAGE_KEY = 'myscore_changelog_seen_' + APP_VERSION;
const CHANGELOG_PLACEHOLDER = `📝 MyScore V8.0.1 更新日志
发布时间：2026-04-04
代号：Code Cleanup（代码瘦身计划）

A. 前端工程化拆分 (Frontend Modularization)
• 将 index.html 中的 CSS（约 2000 行）提取到独立 style.css 文件。
• 将两个内联 script 块（约 2500 行）合并为独立 app.js 文件。
• index.html 从 5170 行精简到约 560 行，仅保留纯 HTML 结构。

B. 后端去重 (Backend Deduplication)
• 提取 server.js 与 netlify/functions/comment.js 的重复 AI 逻辑到共享模块 lib/aiComment.js。
• server.js 从 276 行精简到 155 行，comment.js 从 147 行精简到 34 行。
• 两个平台的 AI 提示词、模型调用逻辑统一维护，避免改漏。

C. 安全与配置 (Security & Configuration)
• 新增 .gitignore，防止误提交 node_modules、.env 等敏感文件。
• CORS 支持 ALLOWED_ORIGIN 环境变量配置，不设置时默认 *（向后兼容）。
• 新增 start-local.bat 本地启动脚本，方便本地开发调试。

D. 修复与优化 (Fixes & Polish)
• 修复导出备份文件版本号仍显示 5.2 的问题，统一更新为 8.0。
• 默认 AI 模型更新为 deepseek-reasoner。
• DEPLOYMENT.md 补充 ALLOWED_ORIGIN 环境变量说明。

感谢您持续使用 MyScore，V8.0.1 ✨
这一版聚焦代码质量与可维护性，功能体验无变化，为后续新功能开发打好基础。
Copyright © LYT, 2026 All Rights Reserved

---

📝 MyScore V8.0 更新日志
发布时间：2026-03-31 21:30
代号：Lively Archive（灵动档案计划）

A. 双平台后端对齐 (Deployment & API Alignment)
• 新增统一 AI 接口入口 /api/comment，支持同一仓库同时部署到 Netlify 与 Zeabur。
• 保留 Netlify 原有环境变量与函数逻辑，不改 AI_API_KEY 的既有配置方式。
• 补充 Node 服务入口、部署说明与 Zeabur 启动配置，迁移到自有服务器更顺滑。

B. 视觉系统升级 (UI & UX Refresh)
• 首页视觉语言重构：头部、卡片、背景氛围、排版比例与导航层级重新整理。
• 学习档案区新增胶囊式摘要卡，支持按考试类型展示记录次数、最佳成绩与最近记录。
• 页脚重做为品牌尾注区：版本、备案、开源仓库、版权信息统一整合，观感更轻快。

C. 图形与品牌统一 (Branding & Iconography)
• 顶部品牌图标改为更贴合”进步 / 趋势 / 成长”的几何 SVG 标记。
• 考试类型引入统一主题色与 SVG 标识，扩展到首页、记录列表、考试选择器与自定义考试区。
• 清理导出报告与站内局部组件中的旧 emoji 表达，减少 AI 模板感。

D. 报告导出升级 (Report Export)
• 成绩单预览与分享卡预览完成新版视觉统一，采用主题色与 SVG 图形替换旧样式。
• 导出图片与文本中的版本信息统一更新到 V8.0。
• 导出模块的信息层级、色彩关系与可读性进一步优化，更接近可直接分享的成品。

E. 稳定性与细节修复 (Polish & Robustness)
• 修复右侧卡片布局溢出、对齐不稳等问题。
• 统一项目内面向用户的版本展示与说明文案，减少版本错位。
• README 与站内版本日志同步补充，便于后续维护与交接。

感谢您持续使用 MyScore，V8.0 ✨
这一版重点围绕”同仓库双平台部署 + 更完整的产品化视觉体验”展开，欢迎继续反馈使用中的细节问题。
Copyright © LYT, 2026 All Rights Reserved`;

const GUIDE_PLACEHOLDER = `MyScore 使用指南
✨ 核心特性

🤖 AI 智能交互 (V7.x 新增)
• 毒舌老师: 每次录入成绩，AI 都会根据你的分数走势（进步/退步）给出犀利评价。
• 回怼模式: 觉得老师说得不对？点击 "💬 不服/回嘴" 按钮，和 AI 展开辩论！它会根据你的理由进行更有趣的反击。
• 桌面宠物: 右下角的 Emoji 老师会根据你的最近成绩自动变脸（😎 考好了 / 😡 考砸了），点击还能“戳一戳”互动。

📊 支持的考试类型
1.雅思考试 (IELTS)
• 听力/阅读: 根据正确题数自动折算分数（0-40题 → 0-9.0分）
• 写作 (Writing): Task 1/Task 2 分离输入，自动加权计算
• 口语 (Speaking): 直接输入分数
• Overall总分: 自动计算四项平均分，按雅思规则取整
2.大学英语考试 (CET)
• 四级/六级: 完整的成绩管理
• 分项计分: 听力/阅读/写作/翻译 独立录入或换算
3.自定义考试
• 完全自由: 创建任意考试类型（如托福、GRE、期末考）
• 四种计分: 直接输入 / 多小题计分 / 分部分计分 / 公式计算

📈 数据可视化 & 管理
• 趋势图表: Chart.js 绘制精美成绩曲线
• 数据安全: 浏览器 LocalStorage 本地存储，隐私无忧
• 备份恢复: 支持 JSON 格式一键导出/导入

📖 详细功能说明 
自定义考试类型使用指南
自定义考试允许你创建任意类型的考试评分系统，比如托福、GRE、模拟测试等。

STEP 1 创建新考试类型
1. 点击顶部"自定义考试"导航
2. 点击"+ 新建考试"按钮
3. 填写考试名称（如：托福）和描述（可选）

STEP 2 添加科目
每个考试可以添加多个科目，每个科目需要设置：
设置项 / 说明
科目名称 / 如：阅读、听力、写作
简称 / 显示在卡片上的缩写，如：阅、听、写
颜色 / 用于区分不同科目的标识色
计分方式 / 四种方式可选（见下文）

STEP 3 计分方式详解
✅方式一：直接输入分数
• 适用场景：直接输入最终成绩
• 示例：雅思口语直接输入 7.5 分
• 配置：只需设置最小值、最大值（如 0-9）
✅方式二：多小题计分
• 适用场景：一个大题包含多个小题，需要分别计分后加总
• 示例：数学解答题20分 = 第一问5分 + 第二问7分 + 第三问8分
• 配置：
  添加多个"小题"
  每小题设置：名称（如：第一问）、满分值（如：5）
  系统自动计算：各小题得分之和 = 该大题总分
✅方式三：分部分计分
• 适用场景：试卷分多个部分，每部分题数和分值不同
• 示例：四六级听力
（短对话8题×7.1分 + 长对话7题×7.1分 + 短文10题×14.2分）
• 配置：
  添加多个"部分"
  每部分设置：名称（如：短对话）、每题分值（如：7.1）、最大题数（如：8）
  系统自动计算：答对题数 × 每题分值，各部分的和即为该科目总分
✅方式四：公式计算
• 适用场景：原始分需要乘以系数换算
• 示例：四六级写作原始分0-15分，报道分 = 原始分 × 7.1
• 配置：
  原始分最大值（如：15）
  乘数系数（如：7.1）
  系统自动计算：输入原始分 × 乘数 = 最终分数
------------------------------------------------------------------------
📄 许可证
Copyright © LYT, 2026 All Rights Reserved
联系方式：liuyuntian@ytun.team`;

function openInfoModal(type) {
    const modal = document.getElementById('info-modal');
    const title = document.getElementById('info-modal-title');
    const body = document.getElementById('info-modal-body');
    const primary = document.getElementById('info-modal-primary');

    if (!modal || !title || !body || !primary) return;

    const isChangelog = type === 'changelog';
    title.textContent = isChangelog ? ('版本日志 · V' + APP_VERSION) : '使用文档';
    body.textContent = isChangelog ? CHANGELOG_PLACEHOLDER : GUIDE_PLACEHOLDER;

    primary.style.display = isChangelog ? 'inline-flex' : 'none';
    modal.classList.add('active');
}

function closeInfoModal() {
    const modal = document.getElementById('info-modal');
    if (!modal) return;
    modal.classList.remove('active');
}

function acknowledgeChangelog() {
    localStorage.setItem(CHANGELOG_STORAGE_KEY, '1');
    closeInfoModal();
}

function handleInfoModalOverlayClick(event) {
    if (event.target && event.target.id === 'info-modal') {
        closeInfoModal();
    }
}

function maybeShowChangelogOnFirstOpen() {
    const hasSeen = localStorage.getItem(CHANGELOG_STORAGE_KEY) === '1';
    if (!hasSeen) {
        localStorage.setItem(CHANGELOG_STORAGE_KEY, '1');
        openInfoModal('changelog');
    }
}

// ==================== 突突er 伴学助手 ====================
const TUTUER_HISTORY_KEY = 'myscore_tutuer_history';
let tutuerMessages = [];
let tutuerSending = false;
let tutuerViewportSyncPending = false;

function getTutuerDefaultGreeting() {
    return '我是突突er，今天我会陪你一起学。你可以跟我聊情绪、计划、拖延，或者直接问学习题目。';
}

function loadTutuerHistory() {
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
}

function clearTutuerHistory() {
    tutuerMessages = [{ role: 'assistant', content: getTutuerDefaultGreeting() }];
    saveTutuerHistory();
    renderTutuerMessages();
}

function renderTutuerMessages() {
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

function bindTutuerViewportEvents() {
    const input = document.getElementById('tutuer-input');
    if (input) {
        input.addEventListener('focus', function () {
            scheduleTutuerViewportSync();
            setTimeout(scheduleTutuerViewportSync, 120);
            setTimeout(scheduleTutuerViewportSync, 260);
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

function setTutuerUnread(unread) {
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

document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        closeInfoModal();
        closeTutuerPanel();
    }
});
// 页面加载完成后，顺便初始化一下心情
document.addEventListener('DOMContentLoaded', updatePetMood);
        // ==================== 初始化 ====================
        document.addEventListener('DOMContentLoaded', function () {
            renderDashboard();
            maybeShowChangelogOnFirstOpen();
            loadTutuerHistory();
            renderTutuerMessages();
            setTutuerUnread(false);
            bindTutuerViewportEvents();
        });
// ==================== 报告导出功能 V8.0 ====================
let currentReportType = 'scorecard';

function openReportModal() {
    const records = getRecords();
    if (!records.length) {
        alert('暂无成绩记录，请先录入成绩！');
        return;
    }
    
    // 初始化考试类型下拉框
    const select = document.getElementById('report-exam-select');
    const exams = allExams();
    let options = '<option value="all">全部考试类型</option>';
    
    // 收集使用的考试类型
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
    renderReportPreview();
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
    
    // 按日期排序
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
        let html = `<div style="font-family:Manrope,'Noto Sans SC',sans-serif;color:#243144;">`;
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
        const latest = records[0];
        const exam = exams[latest.examType];
        const theme = getExamTheme(latest.examType);
        const trendData = buildShareTrendData(records);
        
        let html = `<div style="font-family:Manrope,'Noto Sans SC',sans-serif;">`;
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
        
        html += `<div style="margin-top:1rem;text-align:center;font-size:0.75rem;color:#9ca3af;">Generated by MyScore V8.0</div>`;
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
    
    // 根据选择的报告类型下载对应格式
    if (currentReportType === 'scorecard') {
        await downloadScorecardImage(records);
    } else {
        downloadShareCardDirect(records);
    }
}

// 下载成绩单图片
function downloadScorecardImage(records) {
    const exams = allExams();

    // 3倍分辨率
    const canvas = document.createElement('canvas');
    const scale = 3;
    const W = 700;

    // 按考试类型分组
    const grouped = {};
    records.forEach(r => {
        if (!grouped[r.examType]) grouped[r.examType] = [];
        grouped[r.examType].push(r);
    });

    // 精确计算高度
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

    // 背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, totalH);

    // ---- 头部 ----
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, W, headerH);
    ctx.fillStyle = '#0f9d6e';
    ctx.font = 'bold 26px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('MyScore 成绩单', W / 2, 50);
    ctx.fillStyle = '#5f6368';
    ctx.font = '13px system-ui';
    ctx.fillText('生成时间: ' + new Date().toLocaleString('zh-CN'), W / 2, 78);
    // 分割线
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

        // 考试类型标题
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

        // 构建列
        const subjects = exam.subjects || [];
        let cols = ['日期'];
        subjects.forEach(s => {
            if ((type === 'cet4' || type === 'cet6') && (s.id === 'writing' || s.id === 'translation')) return;
            cols.push(s.short);
        });
        if (type === 'cet4' || type === 'cet6') cols.push('写译');
        if (exam.calcTotal) cols.push(type === 'ielts' ? 'Overall' : '总分');

        // 列宽：日期列稍宽
        const dateColW = Math.max(tableW * 0.22, 110);
        const otherColW = (tableW - dateColW) / (cols.length - 1);

        function colX(i) {
            if (i === 0) return padL;
            return padL + dateColW + (i - 1) * otherColW;
        }
        function colW(i) {
            return i === 0 ? dateColW : otherColW;
        }

        // 表头背景
        ctx.fillStyle = theme.softAlt;
        ctx.beginPath();
        ctx.roundRect(padL, y, tableW, tableHeaderH, 6);
        ctx.fill();

        // 表头文字
        ctx.fillStyle = '#202124';
        ctx.font = 'bold 12px system-ui';
        cols.forEach((col, i) => {
            ctx.textAlign = i === 0 ? 'left' : 'center';
            const tx = i === 0 ? colX(i) + 12 : colX(i) + colW(i) / 2;
            ctx.fillText(col, tx, y + tableHeaderH / 2 + 4);
        });
        y += tableHeaderH;

        // 数据行
        recs.forEach((r, rowIdx) => {
            const rowY = y;

            // 交替背景
            if (rowIdx % 2 === 0) {
                ctx.fillStyle = '#fafafa';
                ctx.fillRect(padL, rowY, tableW, rowH);
            }

            // 行底线
            ctx.strokeStyle = '#ebebeb';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(padL, rowY + rowH);
            ctx.lineTo(padL + tableW, rowY + rowH);
            ctx.stroke();

            // 列分隔线
            ctx.strokeStyle = '#ebebeb';
            for (let ci = 1; ci < cols.length; ci++) {
                const lx = colX(ci);
                ctx.beginPath();
                ctx.moveTo(lx, rowY);
                ctx.lineTo(lx, rowY + rowH);
                ctx.stroke();
            }

            // 构建该行数据
            let rowData = [r.date];
            subjects.forEach(s => {
                if ((type === 'cet4' || type === 'cet6') && (s.id === 'writing' || s.id === 'translation')) return;
                rowData.push((r.scores[s.id] || 0).toFixed(s.dec || 1));
            });
            if (type === 'cet4' || type === 'cet6') {
                rowData.push(((r.scores.writing || 0) + (r.scores.translation || 0)).toString());
            }
            if (exam.calcTotal) rowData.push(r.total ? r.total.toFixed(1) : '-');

            // 绘制文字
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

        // 表格外框
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.strokeRect(padL, y - recs.length * rowH, tableW, recs.length * rowH);

        y += sectionGap;
    }

    // 页脚
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Generated by MyScore V8.0', W / 2, totalH - 25);

    // 下载
    const dataURL = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `MyScore_成绩单_${new Date().toISOString().slice(0, 10)}.png`;
    a.click();

    closeReportModal();
    alert('成绩单图片已保存！');
}

// 直接下载分享卡片（使用折线图）
function downloadShareCardDirect(records) {
    const exams = allExams();
    const latest = records[0];
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

    // 顶部信息卡
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

    // 图形标记
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

    // 考试名称
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(exam.name, W / 2, heroY + 112);

    // 日期
    ctx.font = '12px system-ui';
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.fillText(latest.date, W / 2, heroY + 136);

    // 总分
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

    // 趋势卡
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

    // 页脚
    ctx.fillStyle = '#98a0b4';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Generated by MyScore V8.0', W / 2, H - 16);

    // 下载
    const dataURL = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `MyScore_分享卡片_${new Date().toISOString().slice(0, 10)}.png`;
    a.click();

    closeReportModal();
    alert('分享卡片已保存！');
}

async function downloadTextReport(records) {
    const exams = allExams();
    let content = '═══════════════════════════════════════\n';
    content += '         MyScore 成绩单\n';
    content += '═══════════════════════════════════════\n\n';
    content += `生成时间: ${new Date().toLocaleString('zh-CN')}\n`;
    content += `记录数量: ${records.length} 条\n\n`;
    content += '───────────────────────────────────────\n\n';
    
    // 按考试类型分组
    const grouped = {};
    records.forEach(r => {
        if (!grouped[r.examType]) grouped[r.examType] = [];
        grouped[r.examType].push(r);
    });
    
    for (const [type, recs] of Object.entries(grouped)) {
        const exam = exams[type];
        if (!exam) continue;
        
        content += `【${exam.name}】\n`;
        
        const subjects = exam.subjects || [];
        let header = '日期';
        subjects.forEach(s => {
            if (type === 'cet4' || type === 'cet6') {
                if (s.id === 'writing' || s.id === 'translation') return;
            }
            header += `\t${s.short}`;
        });
        if (type === 'cet4' || type === 'cet6') {
            header += '\t写作翻译';
        }
        if (exam.calcTotal) {
            const totalLabel = type === 'ielts' ? 'Overall' : '总分';
            header += '\t' + totalLabel;
        }
        content += header + '\n';
        
        recs.forEach(r => {
            let row = r.date;
            subjects.forEach(s => {
                if (type === 'cet4' || type === 'cet6') {
                    if (s.id === 'writing' || s.id === 'translation') return;
                }
                const score = r.scores[s.id] || 0;
                row += `\t${score.toFixed(s.dec || 1)}`;
            });
            if (type === 'cet4' || type === 'cet6') {
                const wt = (r.scores.writing || 0) + (r.scores.translation || 0);
                row += `\t${wt}`;
            }
            if (exam.calcTotal) {
                row += `\t${r.total ? r.total.toFixed(1) : '-'}`;
            }
            content += row + '\n';
        });
        
        content += '\n───────────────────────────────────────\n\n';
    }
    
    content += 'Powered by MyScore V8.0\n';
    
    // 下载文本文件
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MyScore_成绩单_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    closeReportModal();
    alert('报告已下载！');
}

async function downloadImageCard(records) {
    downloadShareCardDirect(records);
}
