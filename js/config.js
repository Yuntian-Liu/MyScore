// ==================== 全局常量与配置 ====================

export const STORAGE = {
    RECORDS: 'myscore_v51_records',
    CUSTOM: 'myscore_v51_custom',
    AUTH: 'myscore_auth',
    USER_MODE: 'myscore_user_mode',
    LOCAL_AI_USAGE: 'myscore_local_ai_usage',
    STREAK: 'myscore_streak_data',
    XP: 'myscore_xp_data',
    ACHIEVEMENTS: 'myscore_achievements'
};

export var TURNSTILE_SITE_KEY = '0x4AAAAAAC9X9WOjivjdJMJl';

// ==================== 游戏化：经验值与成就 ====================

export const XP_PER_LEVEL = function (level) { return 80 * level; };

export const ACHIEVEMENTS = [
    { id: 'first_score', icon: '🎯', name: '初次记录', desc: '录入第一笔成绩',
        condition: function (r) { return r.length >= 1; } },
    { id: 'five_scores', icon: '📝', name: '稳定考生', desc: '累计录入5次成绩',
        condition: function (r) { return r.length >= 5; } },
    { id: 'ten_scores', icon: '📚', name: '学霸之路', desc: '累计录入10次成绩',
        condition: function (r) { return r.length >= 10; } },
    { id: 'streak_3', icon: '🔥', name: '三日之约', desc: '连续打卡3天',
        condition: function (r, s) { return s.currentStreak >= 3; } },
    { id: 'streak_7', icon: '🌟', name: '一周坚持', desc: '连续打卡7天',
        condition: function (r, s) { return s.currentStreak >= 7; } },
    { id: 'streak_30', icon: '👑', name: '月度霸主', desc: '连续打卡30天',
        condition: function (r, s) { return s.currentStreak >= 30; } },
    { id: 'ielts_7', icon: '🏆', name: '雅思7分', desc: 'IELTS总分达到7.0',
        condition: function (r) { return r.some(function (x) { return x.examType === 'ielts' && x.total >= 7.0; }); } },
    { id: 'cet4_500', icon: '💪', name: '四级500+', desc: 'CET-4总分达到500',
        condition: function (r) { return r.some(function (x) { return x.examType === 'cet4' && x.total >= 500; }); } },
    { id: 'cet6_500', icon: '🎓', name: '六级500+', desc: 'CET-6总分达到500',
        condition: function (r) { return r.some(function (x) { return x.examType === 'cet6' && x.total >= 500; }); } },
    { id: 'improvement', icon: '📈', name: '逆风翻盘', desc: '任一科目成绩显著提升',
        condition: function (r) {
            var byType = {};
            r.forEach(function (x) { (byType[x.examType] = byType[x.examType] || []).push(x); });
            return Object.keys(byType).some(function (t) {
                var arr = byType[t].sort(function (a, b) { return a.id - b.id; });
                if (arr.length < 2) return false;
                return arr[arr.length - 1].total > arr[0].total * 1.1;
            });
        } },
    { id: 'ai_debate', icon: '⚔️', name: '反击选手', desc: '使用AI回嘴功能',
        condition: function () { return localStorage.getItem('myscore_ai_debated') === '1'; } },
    { id: 'custom_exam', icon: '✨', name: '个性化', desc: '创建自定义考试',
        condition: function () {
            try { return Object.keys(JSON.parse(localStorage.getItem('myscore_v51_custom') || '{}')).length > 0; }
            catch (e) { return false; }
        } }
];

// ==================== XP 来源配置 ====================
// label: 文化标识  base: 基础XP  daily: 是否受每日递减影响  once: 是否一次性
export const XP_SOURCES = {
    score:      { label: '勤学', base: 10, daily: true,  desc: '录入成绩' },
    rebuttal:   { label: '善问', base: 5,  daily: true,  desc: 'AI 回嘴' },
    checkin:    { label: '笃行', base: 3,  daily: false, desc: '每日打卡' },
    goal:       { label: '立志', base: 5,  once: true,   desc: '设置目标' },
    export:     { label: '传薪', base: 3,  daily: true,  desc: '导出报告' },
    dashboard:  { label: '省身', base: 2,  daily: true,  desc: '查看仪表盘' },
    style:      { label: '求变', base: 2,  daily: true,  desc: '切换风格' },
    custom:     { label: '开拓', base: 5,  once: true,   desc: '创建考试' }
};

export const XP_DAILY_CAP = 50;

export const AVATAR_OPTIONS = [
    { seed: 'adventurer', label: '冒险家' },
    { seed: 'lorelei', label: '精灵' },
    { seed: 'notionists', label: '手绘' },
    { seed: 'croodles', label: '涂鸦' },
    { seed: 'big-smile', label: '大笑' },
    { seed: 'personas', label: '个性' },
    { seed: 'micah', label: '扁平' },
    { seed: 'bottts', label: '机器人' },
    { seed: 'fun-emoji', label: '表情' },
    { seed: 'avataaars', label: '插画' },
    { seed: 'pixel-art', label: '像素' },
    { seed: 'thumbs', label: '拇指' }
];

export const LOCAL_AI_DAILY_LIMIT = 8;

export const AI_STYLES = {
    storm: { icon: '⛈️', name: '风暴', desc: '犀利刻薄', teacherName: '毒舌老师', actionLabel: '回嘴', thinkingText: '正在思考怎么怼回来...' },
    sun:   { icon: '☀️', name: '暖阳', desc: '温暖鼓励', teacherName: '暖阳老师', actionLabel: '回应', thinkingText: '正在思考怎么回复你...' },
    cold:  { icon: '❄️', name: '冷锋', desc: '理性分析', teacherName: '冷老师',   actionLabel: '反驳', thinkingText: '正在分析你的观点...' },
    rain:  { icon: '🌧️', name: '阵雨', desc: '先损后帮', teacherName: '雨老师',   actionLabel: '反驳', thinkingText: '正在想怎么接招...' }
};

export const COMMENT_API_ENDPOINT = (() => {
    const meta = document.querySelector('meta[name="myscore-comment-endpoint"]');
    return meta && meta.content ? meta.content.trim() : '/api/comment';
})();

export const BUILTIN_EXAMS = {
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
            { id: 'writing', name: '写作', short: '写', color: '#f59e0b', type: 'formula', min: 0, max: 15, mult: 212/30, dec: 0 },
            { id: 'translation', name: '翻译', short: '译', color: '#ef4444', type: 'formula', min: 0, max: 15, mult: 212/30, dec: 0 }
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
            { id: 'writing', name: '写作', short: '写', color: '#f59e0b', type: 'formula', min: 0, max: 15, mult: 212/30, dec: 0 },
            { id: 'translation', name: '翻译', short: '译', color: '#ef4444', type: 'formula', min: 0, max: 15, mult: 212/30, dec: 0 }
        ]
    }
};

export const EXAM_THEME_MAP = {
    ielts: {
        accent: '#5b7cff', strong: '#2f4fcb', soft: '#eef1ff',
        softAlt: '#fff2ea', contrast: '#ffffff',
        reportGradientStart: '#5b7cff', reportGradientEnd: '#ff8a63'
    },
    cet4: {
        accent: '#23a17b', strong: '#16765c', soft: '#e9fbf3',
        softAlt: '#fff0db', contrast: '#ffffff',
        reportGradientStart: '#23a17b', reportGradientEnd: '#f4a63e'
    },
    cet6: {
        accent: '#8d63ff', strong: '#6542c9', soft: '#f1edff',
        softAlt: '#ffe9f3', contrast: '#ffffff',
        reportGradientStart: '#7d61ff', reportGradientEnd: '#ff7fab'
    }
};

export const FALLBACK_THEME_POOL = [
    { accent: '#ff8b68', strong: '#d86343', soft: '#fff0e8', softAlt: '#fff8ef', contrast: '#ffffff', reportGradientStart: '#ff8b68', reportGradientEnd: '#ffb36a' },
    { accent: '#48a7a0', strong: '#2f7a74', soft: '#e8f9f7', softAlt: '#eef9ff', contrast: '#ffffff', reportGradientStart: '#48a7a0', reportGradientEnd: '#7ac8f7' },
    { accent: '#6b7cff', strong: '#4958cb', soft: '#edf0ff', softAlt: '#f7edff', contrast: '#ffffff', reportGradientStart: '#6b7cff', reportGradientEnd: '#b37cff' },
    { accent: '#f08b36', strong: '#c36a1d', soft: '#fff2e5', softAlt: '#fff9ef', contrast: '#ffffff', reportGradientStart: '#f08b36', reportGradientEnd: '#ffbf66' }
];

export const IELTS_TABLES = {
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

export const APP_VERSION = '5.4.0-beta';
export const CHANGELOG_STORAGE_KEY = 'myscore_changelog_seen_' + APP_VERSION;

export const PET_STORAGE_KEY = 'myscore_pet_state';
export const PET_DRAG_THRESHOLD = 5;
export const PET_SNAP_THRESHOLD = 20;
export const PET_SNAP_MARGIN = 8;
export const PET_MIN_SCALE = 0.5;
export const PET_MAX_SCALE = 1.8;
export const RECENT_QUOTES_WINDOW = 20;
export const TUTUER_HISTORY_KEY = 'myscore_tutuer_history';

export const SASSY_QUOTES = [
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
    "别再摸鱼了，鱼都开始嫌弃你了。",
    "今天点我三次了，背单词点过三次吗？😏",
    "你和高分之间就差一个动作：开始。",
    "我不是在骂你，我是在提前播报现实。",
    "你这学习节奏，像开了省电模式。🔋",
    "别把'明天开始'当口头禅了，明天都听烦了。",
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
    "再点一次之前，先去做三道题，成交？"
];

// ==================== 版本日志：当期版本 ====================
export const CHANGELOG_CURRENT = `
<div class="changelog-beta-banner">
  <span class="changelog-beta-badge">BETA</span>
  <p>当前版本为<strong>内测版本</strong>，功能和体验仍在打磨中。如遇到闪退、数据异常或界面错位，请谅解——这些问题正在被优先修复中。欢迎通过任何渠道向我们反馈，你的意见将直接影响下一版的走向。</p>
</div>
<div class="changelog-entry">
  <div class="changelog-header">
    <span class="changelog-version">V5.4.0-beta</span>
    <span class="changelog-date">2026-05-04</span>
  </div>
  <div class="changelog-codename">Feishu Integration（飞书集成）</div>
  <div class="changelog-section">
    <div class="changelog-section-title">
      <span class="changelog-icon" style="background:linear-gradient(135deg,#4285f4,#f9ab00);">★</span>
      新增
    </div>
    <ul class="changelog-list">
      <li><strong>飞书机器人完整对接</strong>：lib/feishu.js 命令路由系统（绑定/查询/趋势/目标/成就/帮助共 6 种命令）</li>
      <li><strong>6 位码绑定流程</strong>：设置页生成绑定码 → 飞书发送匹配 → 自动关联账号，5 分钟有效期 + 实时倒计时</li>
      <li><strong>飞书成绩通知卡片</strong>：录入成绩后自动推送交互式卡片到飞书（总分大字 + 分项明细 + AI 摘要）</li>
      <li><strong>飞书机器人查询</strong>：在飞书内发送「查询」获取最新成绩、「趋势」查看变化、「目标」看进度、「成就」查解锁列表</li>
      <li><strong>6 种卡片模板</strong>：欢迎卡 / 成绩通知卡 / 查询结果卡 / 趋势文字 / 目标进度 / 成就墙 / 帮助卡</li>
      <li><strong>设置页飞书区块</strong>：绑定状态展示 / 6 位码大字展示 / 引导步骤 / 解绑功能</li>
    </ul>
  </div>
  <div class="changelog-section">
    <div class="changelog-section-title">
      <span class="changelog-icon" style="background:linear-gradient(135deg,#8b5cf6,#3b82f6);">~</span>
      后端
    </div>
    <ul class="changelog-list">
      <li>server.js 新增 POST /api/feishu/bind（绑定码生成）和 POST /api/feishu/notify（通知推送）两个路由</li>
      <li>db.js 新增 feishu_open_id 字段 + updateUserFeishuOpenId() / findUserByFeishuOpenId() 函数</li>
      <li>auth.js 登录/恢复/更新三处同步 feishuOpenId 字段到前端存储</li>
      <li>profile PUT 接口支持 feishu_open_id 更新（用于解绑）</li>
    </ul>
  </div>
</div>`;

// ==================== 版本日志：历史版本 ====================
export const CHANGELOG_HISTORY = `
<div class="changelog-entry">
  <div class="changelog-header">
    <span class="changelog-version">V5.3.0-beta</span>
    <span class="changelog-date">2026-05-03</span>
  </div>
  <div class="changelog-codename">Trend Prediction & Report Polish（趋势预测与报告打磨）</div>
  <div class="changelog-section">
    <div class="changelog-section-title">
      <span class="changelog-icon" style="background:linear-gradient(135deg,#4285f4,#f9ab00);">★</span>
      新增
    </div>
    <ul class="changelog-list">
      <li><strong>趋势图各科预测点</strong>：折线图支持各科单独的 AI 预测虚线点（borderDash + triangle pointStyle），不再只有总分预测</li>
      <li><strong>SVG 雷达图</strong>：分享卡片预览内嵌纯 SVG 雷达图（极坐标→笛卡尔转换、同心网格、数据多边形）</li>
      <li><strong>html2canvas 报告导出</strong>：DOM-to-PNG 替代 Canvas 手绘，删除 ~500 行旧代码，保证预览与下载一致</li>
      <li><strong>html2canvas 字体容错</strong>：两轮截图策略（原版 Google Fonts → 系统字体 fallback），Promise.race 8s 超时包装</li>
      <li><strong>移动端报告导出定宽</strong>：固定宽度容器（成绩卡 700px / 分享卡 420px），手机端比例正常</li>
    </ul>
  </div>
  <div class="changelog-section">
    <div class="changelog-section-title">
      <span class="changelog-icon" style="background:linear-gradient(135deg,#8b5cf6,#3b82f6);">~</span>
      优化
    </div>
    <ul class="changelog-list">
      <li><strong>沉浸式滚动条</strong>：全局 scrollbar-width: thin + ::-webkit-scrollbar 样式，默认透明 hover 显示</li>
      <li><strong>移动端报告预览修复</strong>：table-layout: fixed + 缩小字号/间距/white-space: nowrap，解决表格溢出边框</li>
    </ul>
  </div>
  <div class="changelog-section">
    <div class="changelog-section-title">
      <span class="changelog-icon" style="background:linear-gradient(135deg,#ef4444,#f97316);">!</span>
      修复
    </div>
    <ul class="changelog-list">
      <li>成就系统不触发 — 新用户手动录入后成就未检测，修复模式选择弹窗触发链</li>
      <li>retryPrediction 重试静默失败 — 面板路径 retryCount=0 绕过 _predictionFailCache 冷却</li>
      <li>sw.js 缓存版本不一致 — APP_SHELL URL 的 ?v= 与 index.html 不同步</li>
    </ul>
  </div>
</div>
<div class="changelog-entry">
  <div class="changelog-header">
    <span class="changelog-version">V5.2.0-beta</span>
    <span class="changelog-date">2026-05-01</span>
  </div>
  <div class="changelog-codename">Profile & Polish（个人名片与体验打磨）</div>
  <div class="changelog-section">
    <div class="changelog-section-title">
      <span class="changelog-icon" style="background:linear-gradient(135deg,#4285f4,#f9ab00);">★</span>
      新增
    </div>
    <ul class="changelog-list">
      <li><strong>游戏化 UI 组件</strong>：导航栏经验条、连续打卡胶囊、成就墙（已解锁/未解锁状态）</li>
      <li><strong>个人名片</strong>：点击头像查看名片，Hero Banner + 等级卡片 + 数据概览 + 成就墙 + XP 来源明细</li>
      <li><strong>AI 流式输出</strong>：后端 SSE 流式代理 + 前端逐字渲染，「正在思考…」+ 打字机光标动效</li>
      <li><strong>Dashboard UI 重构</strong>：单列流式布局 + Slide Panel 二级面板（考试详情/最近成绩/历史记录/个人名片）</li>
      <li><strong>雷达图</strong>：Slide Panel 考试详情面板中 renderRadarChartForPanel（三种考试类型归一化）</li>
      <li><strong>伴学助手 UI 重写</strong>：仿 iMessage 气泡 + 流式打字机 + 移动端底部抽屉 + 键盘适配</li>
      <li><strong>验证码邮件重设计</strong>：品牌渐变顶栏 + SVG 盾牌 + CTA 按钮</li>
      <li><strong>Logo 更换</strong>：内联 SVG → 可商用 logo2.svg（favicon + Header + PWA icon 三合一）</li>
    </ul>
  </div>
  <div class="changelog-section">
    <div class="changelog-section-title">
      <span class="changelog-icon" style="background:linear-gradient(135deg,#8b5cf6,#3b82f6);">~</span>
      优化
    </div>
    <ul class="changelog-list">
      <li>Slide Panel 移动端适配 — 全宽底部抽屉模式</li>
      <li>Footer 简化 — 删除 matrix 网格改为 pill 链接</li>
      <li>使用文档更新 — 补充个人名片、流式输出说明</li>
    </ul>
  </div>
  <div class="changelog-section">
    <div class="changelog-section-title">
      <span class="changelog-icon" style="background:linear-gradient(135deg,#ef4444,#f97316);">!</span>
      修复
    </div>
    <ul class="changelog-list">
      <li>SW 缓存未更新导致服务器 UI 崩溃</li>
      <li>个人名片 XP 显示负数 — 用取模替代循环减法</li>
    </ul>
  </div>
</div>
<div class="changelog-entry">
  <div class="changelog-header">
    <span class="changelog-version">V5.1.0-beta</span>
    <span class="changelog-date">2026-04-29</span>
  </div>
  <div class="changelog-codename">Settings & Toolbox（设置与工具箱）</div>
  <div class="changelog-section">
    <div class="changelog-section-title">
      <span class="changelog-icon" style="background:linear-gradient(135deg,#4285f4,#f9ab00);">★</span>
      新增
    </div>
    <ul class="changelog-list">
      <li><strong>设置页面二级导航</strong>：使用指南、版本日志、用户协议、隐私政策内嵌设置弹窗，支持返回</li>
      <li><strong>快捷工具箱</strong>：左下角收纳设置/伴学助手/版本日志，桌面端 hover 展开，移动端点击展开</li>
      <li><strong>前端日志导出</strong>：设置页「导出日志」按钮，一键下载诊断文件</li>
      <li><strong>关键事件埋点</strong>：成绩保存、AI 调用错误自动记录</li>
    </ul>
  </div>
  <div class="changelog-section">
    <div class="changelog-section-title">
      <span class="changelog-icon" style="background:linear-gradient(135deg,#8b5cf6,#3b82f6);">~</span>
      优化
    </div>
    <ul class="changelog-list">
      <li>设置页面重构 — 固定尺寸弹窗，子页面无跳转切换</li>
      <li>Profile Panel 优化 — 移除悬浮卡片，点击头像展开完整面板</li>
    </ul>
  </div>
</div>
<div class="changelog-entry">
  <div class="changelog-header">
    <span class="changelog-version">V5.0.2-beta</span>
    <span class="changelog-date">2026-04-28</span>
  </div>
  <div class="changelog-codename">PWA & Gamification（渐进式应用与游戏化）</div>
  <div class="changelog-section">
    <div class="changelog-section-title">
      <span class="changelog-icon" style="background:linear-gradient(135deg,#4285f4,#f9ab00);">★</span>
      新增
    </div>
    <ul class="changelog-list">
      <li><strong>PWA 支持</strong>：添加 manifest.json 和 Service Worker，支持"添加到主屏幕"和离线访问</li>
      <li><strong>离线检测</strong>：网络断开时自动显示离线横幅提示</li>
      <li><strong>连续打卡</strong>：每日打开自动记录打卡，连续天数实时统计</li>
      <li><strong>经验值体系</strong>：8 种获取途径，每种配有文化标识（勤学/善问/笃行/立志/传薪/省身/求变/开拓）</li>
      <li><strong>每日上限</strong>：每日最多获取 50 XP，同一操作重复获取递减 50%</li>
      <li><strong>成就系统</strong>：12 项成就徽章，涵盖打卡、成绩、AI 互动等多个维度</li>
      <li><strong>游戏化数据云同步</strong>：打卡、经验值、成就随账号同步，换设备不丢失</li>
    </ul>
  </div>
  <div class="changelog-section">
    <div class="changelog-section-title">
      <span class="changelog-icon" style="background:linear-gradient(135deg,#8b5cf6,#3b82f6);">~</span>
      优化
    </div>
    <ul class="changelog-list">
      <li>成绩保存改用轻量 Toast 提示，替代浏览器原生弹窗</li>
      <li>首次使用时延迟游戏化通知，避免与模式选择弹窗冲突</li>
    </ul>
  </div>
</div>
<div class="changelog-entry">
  <div class="changelog-header">
    <span class="changelog-version">V5.0.1-beta</span>
    <span class="changelog-date">2026-04-24</span>
  </div>
  <div class="changelog-codename">Modular & Model（模块化重构与模型升级）</div>
  <div class="changelog-section">
    <div class="changelog-section-title">
      <span class="changelog-icon" style="background:linear-gradient(135deg,#4285f4,#f9ab00);">★</span>
      新增
    </div>
    <ul class="changelog-list">
      <li><strong>模块化架构</strong>：单体 app.js（4396 行）拆分为 13 个 ES 模块，提升代码可维护性</li>
      <li><strong>AI 模型升级</strong>：DeepSeek 模型从 deepseek-chat 升级至 deepseek-v4-flash</li>
    </ul>
  </div>
  <div class="changelog-section">
    <div class="changelog-section-title">
      <span class="changelog-icon" style="background:linear-gradient(135deg,#ef4444,#f97316);">!</span>
      修复
    </div>
    <ul class="changelog-list">
      <li>修复本地模式下模式选择弹窗无效（window.setUserMode 代理引用不存在的函数）</li>
      <li>修复退出登录后 AI 功能模式选择弹窗永不触发（window._auth_justLoggedOut 未同步）</li>
      <li>修复 start-local.bat 中文注释导致环境变量设置失败</li>
    </ul>
  </div>
</div>`;

// 兼容旧引用
export const CHANGELOG_PLACEHOLDER = CHANGELOG_CURRENT;

// ==================== 使用文档 ====================
export const GUIDE_SECTIONS = [
  { id: 'guide-quick', label: '快速上手', content: `
    <div class="guide-section" id="guide-quick">
      <div class="guide-section-title">
        <span class="guide-icon" style="background:linear-gradient(135deg,#10b981,#3b82f6);">壹</span>
        快速上手
      </div>
      <div class="guide-quick">
        <div class="guide-quick-item"><span class="guide-num">1</span>选择考试类型 → 录入成绩 → 保存</div>
        <div class="guide-quick-item"><span class="guide-num">2</span>保存后 AI 老师自动评价，觉得不对就点击「回嘴」</div>
        <div class="guide-quick-item"><span class="guide-num">3</span>左下角「快捷工具」可展开工具箱（桌面端 hover，移动端点击），内含设置、伴学助手、版本日志</div>
        <div class="guide-quick-item"><span class="guide-num">4</span>注册账号后数据自动同步云端，换设备不丢失</div>
        <div class="guide-quick-item"><span class="guide-num">5</span>每日打卡积累经验值，解锁成就徽章</div>
        <div class="guide-quick-item"><span class="guide-num">6</span>设置页可绑定飞书机器人，录入成绩后自动收到飞书通知卡片</div>
        <div class="guide-quick-item"><span class="guide-num">7</span>点击右上角头像 → 查看个人名片（等级/经验/打卡/成就一览）</div>
      </div>
    </div>`
  },
  { id: 'guide-scores', label: '成绩管理', content: `
    <div class="guide-section" id="guide-scores">
      <div class="guide-section-title">
        <span class="guide-icon" style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);">贰</span>
        内置考试
      </div>
      <div class="guide-exam-list">
        <div class="guide-exam-item"><span class="guide-exam-icon">📋</span><div><strong>雅思 IELTS</strong><br>听力 / 阅读 / 写作（Task1+Task2）/ 口语，总分自动按雅思规则取整</div></div>
        <div class="guide-exam-item"><span class="guide-exam-icon">📚</span><div><strong>四级 CET-4</strong><br>听力（短对话/长对话/短文加权）/ 阅读（三部分加权）/ 写作 / 翻译</div></div>
        <div class="guide-exam-item"><span class="guide-exam-icon">🎓</span><div><strong>六级 CET-6</strong><br>结构与四级相同，分值与题型自动适配</div></div>
      </div>
    </div>
    <div class="guide-section">
      <div class="guide-section-title">
        <span class="guide-icon" style="background:linear-gradient(135deg,#8b5cf6,#ec4899);">自</span>
        自定义考试
      </div>
      <p class="guide-desc">你可以创建任意类型的考试评分系统，如托福、GRE、期末考等。每个考试支持添加多个题型，每个题型有五种计分方式可选：</p>
      <div class="guide-methods">
        <div class="guide-method"><span class="guide-method-badge">A</span><strong>直接输入</strong> — 直接填入最终成绩（如口语 7.5 分）</div>
        <div class="guide-method"><span class="guide-method-badge">B</span><strong>多小题计分</strong> — 分别填写各小题得分，自动求和</div>
        <div class="guide-method"><span class="guide-method-badge">C</span><strong>分部分计分</strong> — 各部分题数 x 每题分值，自动汇总</div>
        <div class="guide-method"><span class="guide-method-badge">D</span><strong>公式计算</strong> — 原始分 x 系数 = 最终分数（如写作 x 7.1）</div>
        <div class="guide-method"><span class="guide-method-badge">E</span><strong>扣分制</strong> — 从满分中扣除（如满分 100，每题扣 5 分）</div>
      </div>
      <div class="guide-steps-list">
        <div class="guide-step"><div class="guide-step-num">1</div><div><strong>创建考试</strong>：点击顶部「自定义考试」→「+ 新建考试」→ 填写名称</div></div>
        <div class="guide-step"><div class="guide-step-num">2</div><div><strong>添加题型</strong>：设置名称、简称、颜色，选择计分方式</div></div>
        <div class="guide-step"><div class="guide-step-num">3</div><div><strong>录入成绩</strong>：选择考试 → 按题型输入分数 → 保存</div></div>
      </div>
    </div>
    <div class="guide-section">
      <div class="guide-section-title">
        <span class="guide-icon" style="background:linear-gradient(135deg,#f59e0b,#ef4444);">目</span>
        目标设定
      </div>
      <p class="guide-desc">在仪表盘中点击「设置目标」，输入目标分数。系统会在成绩录入后自动对比当前成绩与目标，帮助你追踪进步轨迹。</p>
    </div>
    <div class="guide-section">
      <div class="guide-section-title">
        <span class="guide-icon" style="background:linear-gradient(135deg,#10b981,#3b82f6);">表</span>
        Dashboard 总览
      </div>
      <p class="guide-desc">首页 Dashboard 分为两大区域：</p>
      <ul class="guide-list">
        <li><strong>最近成绩摘要</strong>：顶部展示最近一次考试的总分、考试信息、目标进度和各科分数条</li>
        <li><strong>考试类型概览</strong>：网格化卡片，每种考试类型独立一张卡片，展示迷你趋势线（Sparkline）和关键数据。点击卡片右下角「查看详情 →」可打开该考试类型的详细面板</li>
      </ul>
      <p class="guide-desc">右上角 action-chip 按钮组整合了「导出报告」「导出数据」「导入备份」三个快捷操作。</p>
    </div>
    <div class="guide-section">
      <div class="guide-section-title">
        <span class="guide-icon" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);">板</span>
        Slide Panel 面板
      </div>
      <p class="guide-desc">点击 Dashboard 中的各类元素，会弹出 Slide Panel 二级面板展示详细信息：</p>
      <ul class="guide-list">
        <li><strong>考试类型详情</strong>：点击考试卡片的「查看详情」，展示该类型的全部历史成绩、趋势折线图、各科分析</li>
        <li><strong>最近成绩详情</strong>：点击最近成绩摘要卡片，展示完整的科目分数和 AI 评价</li>
        <li><strong>历史记录</strong>：查看所有考试记录的完整列表</li>
      </ul>
      <p class="guide-desc" style="font-size:0.82rem;color:var(--text-muted);">桌面端面板从右侧滑入；移动端以底部抽屉形式展开，支持下滑关闭。</p>
    </div>`
  },
  { id: 'guide-ai', label: 'AI 交互', content: `
    <div class="guide-section" id="guide-ai">
      <div class="guide-section-title">
        <span class="guide-icon" style="background:linear-gradient(135deg,#f59e0b,#ef4444);">叁</span>
        评价风格
      </div>
      <p class="guide-desc">四种风格可一键切换，每种风格的 AI 老师性格截然不同：</p>
      <div class="guide-cards">
        <div class="guide-card"><div class="guide-card-icon">⛈</div><div class="guide-card-title">风暴</div><div class="guide-card-desc">犀利刻薄，进步酸溜溜地夸，退步毫不留情</div></div>
        <div class="guide-card"><div class="guide-card-icon">☀</div><div class="guide-card-title">暖阳</div><div class="guide-card-desc">温暖鼓励，永远先肯定努力，温柔不说教</div></div>
        <div class="guide-card"><div class="guide-card-icon">❄</div><div class="guide-card-title">冷锋</div><div class="guide-card-desc">理性分析，只说数据和事实，不带感情色彩</div></div>
        <div class="guide-card"><div class="guide-card-icon">🌧</div><div class="guide-card-title">阵雨</div><div class="guide-card-desc">先损后帮，开头泼冷水，话锋一转给出建议</div></div>
      </div>
    </div>
    <div class="guide-section">
      <div class="guide-section-title">
        <span class="guide-icon" style="background:linear-gradient(135deg,#ef4444,#f97316);">辩</span>
        回嘴模式
      </div>
      <p class="guide-desc">觉得老师说得不对？点击「回嘴」和 AI 展开辩论。AI 会结合你的成绩数据给出反击，看看谁更有道理。</p>
      <p class="guide-desc" style="margin-top:0.5rem;font-size:0.82rem;color:var(--text-muted);">AI 回复以流式逐字输出，你会先看到「正在思考…」的提示，然后文字伴随打字机光标逐字出现。</p>
    </div>
    <div class="guide-section">
      <div class="guide-section-title">
        <span class="guide-icon" style="background:linear-gradient(135deg,#8b5cf6,#ec4899);">伴</span>
        突突er 伴学助手
      </div>
      <p class="guide-desc">点击左下角按钮唤起伴学助手。它能倾听你的学习困惑、安抚情绪、答疑解惑、制定复习计划，是你的学习伙伴。</p>
    </div>
    <div class="guide-section">
      <div class="guide-section-title">
        <span class="guide-icon" style="background:linear-gradient(135deg,#10b981,#059669);">宠</span>
        桌面宠物
      </div>
      <p class="guide-desc">右下角的桌宠会随你的成绩变化表情。支持自由拖动、缩放、吸附到屏幕边缘，可关闭和重新打开。</p>
    </div>`
  },
  { id: 'guide-feishu', label: '飞书集成', content: `
    <div class="guide-section" id="guide-feishu">
      <div class="guide-section-title">
        <span class="guide-icon" style="background:linear-gradient(135deg,#0ea5e9,#6366f1);">飞</span>
        飞书机器人绑定
      </div>
      <p class="guide-desc">绑定飞书后，每次录入成绩都会自动推送精美的通知卡片到你的飞书。还可以在飞书中直接查询成绩、查看趋势和目标进度。</p>
      <div class="guide-steps-list">
        <div class="guide-step"><div class="guide-step-num">1</div><div><strong>打开飞书</strong>：在飞书搜索框中搜索 <strong style="color:var(--accent);">MyScore</strong>，进入机器人对话</div></div>
        <div class="guide-step"><div class="guide-step-num">2</div><div><strong>获取绑定码</strong>：回到 MyScore 网站设置页，点击「获取绑定码」，获得 6 位数字码</div></div>
        <div class="guide-step"><div class="guide-step-num">3</div><div><strong>发送绑定命令</strong>：在飞书中发送 <code style="background:rgba(39,91,86,0.08);padding:2px 8px;border-radius:4px;color:var(--accent);">绑定 XXXXXX</code>（替换为实际 6 位码）</div></div>
        <div class="guide-step"><div class="guide-step-num">4</div><div><strong>完成绑定</strong>：收到"绑定成功！"欢迎卡片即表示绑定完成，网站设置页会显示绿色已绑定状态</div></div>
      </div>
      <p class="guide-desc" style="margin-top:0.75rem;font-size:0.82rem;color:var(--text-muted);">绑定码有效期为 5 分钟，过期后可重新获取。每个绑定码只能使用一次。</p>
    </div>
    <div class="guide-section">
      <div class="guide-section-title">
        <span class="guide-icon" style="background:linear-gradient(135deg,#0ea5e9,#10b981);">令</span>
        机器人命令
      </div>
      <p class="guide-desc">绑定成功后，在飞书中直接发送以下关键词即可与 MyScore 交互：</p>
      <table class="guide-table">
        <thead><tr><th>命令</th><th>功能</th><th>返回形式</th></tr></thead>
        <tbody>
          <tr><td><code style="background:rgba(39,91,86,0.08);padding:2px 8px;border-radius:4px;">查询</code></td><td>查看最新一次考试成绩详情</td><td>交互式卡片</td></tr>
          <tr><td><code style="background:rgba(39,91,86,0.08);padding:2px 8px;border-radius:4px;">趋势</code></td><td>最近 5 次成绩变化走势（含升降箭头）</td><td>文字消息</td></tr>
          <tr><td><code style="background:rgba(39,91,86,0.08);padding:2px 8px;border-radius:4px;">目标</code></td><td>各科目目标完成进度百分比 + 进度条</td><td>文字消息</td></tr>
          <tr><td><code style="background:rgba(39,91,86,0.08);padding:2px 8px;border-radius:4px;">成就</code></td><td>已解锁的成就列表</td><td>交互式卡片</td></tr>
          <tr><td><code style="background:rgba(39,91,86,0.08);padding:2px 8px;border-radius:4px;">帮助</code></td><td>所有可用命令的快速参考</td><td>帮助卡片</td></tr>
        </tbody>
      </table>
    </div>
    <div class="guide-section">
      <div class="guide-section-title">
        <span class="guide-icon" style="background:linear-gradient(135deg,#f59e0b,#ef4444);">通</span>
        成绩通知推送
      </div>
      <p class="guide-desc">每次在网站录入成绩并保存后，如果已绑定飞书，系统会<strong>自动</strong>向飞书推送一张成绩通知卡片：</p>
      <ul class="guide-list">
        <li><strong>卡片内容</strong>：考试名称、日期、总分（大字突出）、各科分项明细、AI 摘要点评</li>
        <li><strong>推送时机</strong>：保存成绩后静默异步推送，不阻塞主流程</li>
        <li><strong>解绑方式</strong>：设置页 → 飞书集成区域 → 点击「解绑飞书」</li>
      </ul>
      <p class="guide-desc" style="margin-top:0.5rem;font-size:0.82rem;color:var(--text-muted);">未绑定飞书时，通知功能自动跳过，不影响正常使用。</p>
    </div>`
  },
  { id: 'guide-growth', label: '成长体系', content: `
    <div class="guide-section" id="guide-growth">
      <div class="guide-section-title">
        <span class="guide-icon" style="background:linear-gradient(135deg,#f59e0b,#f97316);">肆</span>
        连续打卡
      </div>
      <p class="guide-desc">每日打开 MyScore 自动记录打卡。连续使用天数越多，打卡记录越长。断签会重新开始计数。</p>
      <p class="guide-desc" style="font-size:0.82rem;color:var(--text-muted);">导航栏显示打卡胶囊（⚡ 连续不足 7 天 / 🔥 连续 7 天以上），直观展示当前连续天数。</p>
    </div>
    <div class="guide-section">
      <div class="guide-section-title">
        <span class="guide-icon" style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);">值</span>
        经验值
      </div>
      <p class="guide-desc">通过使用各项功能积累经验值，提升等级。导航栏右侧显示当前等级、经验进度条和 XP 数字。</p>
      <table class="guide-table">
        <thead><tr><th>标识</th><th>操作</th><th>XP</th></tr></thead>
        <tbody>
          <tr><td><span class="guide-method-badge" style="background:#1f6a52;">勤学</span></td><td>录入成绩</td><td class="xp-val">10</td></tr>
          <tr><td><span class="guide-method-badge" style="background:#1f6a52;">善问</span></td><td>AI 回嘴</td><td class="xp-val">5</td></tr>
          <tr><td><span class="guide-method-badge" style="background:#1f6a52;">笃行</span></td><td>每日打卡</td><td class="xp-val">3</td></tr>
          <tr><td><span class="guide-method-badge" style="background:#1f6a52;">立志</span></td><td>设置目标</td><td class="xp-val">5</td></tr>
          <tr><td><span class="guide-method-badge" style="background:#1f6a52;">传薪</span></td><td>导出报告</td><td class="xp-val">3</td></tr>
          <tr><td><span class="guide-method-badge" style="background:#1f6a52;">省身</span></td><td>查看仪表盘（静默）</td><td class="xp-val">2</td></tr>
          <tr><td><span class="guide-method-badge" style="background:#1f6a52;">求变</span></td><td>切换风格</td><td class="xp-val">2</td></tr>
          <tr><td><span class="guide-method-badge" style="background:#1f6a52;">开拓</span></td><td>创建考试</td><td class="xp-val">5</td></tr>
        </tbody>
      </table>
      <p class="guide-desc" style="margin-top:0.75rem;font-size:0.8rem;color:var(--text-muted);line-height:1.7;">
        <strong>规则说明：</strong>每日上限 50 XP。标有「每日」的操作首次获取 100% 经验值，同日再次获取降为 50%（向下取整，最低 1）。标有「一次性」的操作终身仅可获取一次。每日打卡不受递减影响。
      </p>
    </div>
    <div class="guide-section">
      <div class="guide-section-title">
        <span class="guide-icon" style="background:linear-gradient(135deg,#ef4444,#f97316);">章</span>
        成就徽章
      </div>
      <p class="guide-desc">达成特定条件自动解锁成就，共 12 项：</p>
      <div class="guide-cards">
        <div class="guide-card"><div class="guide-card-icon">靶</div><div class="guide-card-title">初次记录</div><div class="guide-card-desc">录入第一笔成绩</div></div>
        <div class="guide-card"><div class="guide-card-icon">笔</div><div class="guide-card-title">稳定考生</div><div class="guide-card-desc">累计录入 5 次成绩</div></div>
        <div class="guide-card"><div class="guide-card-icon">册</div><div class="guide-card-title">学霸之路</div><div class="guide-card-desc">累计录入 10 次成绩</div></div>
        <div class="guide-card"><div class="guide-card-icon">焰</div><div class="guide-card-title">三日之约</div><div class="guide-card-desc">连续打卡 3 天</div></div>
        <div class="guide-card"><div class="guide-card-icon">曜</div><div class="guide-card-title">一周坚持</div><div class="guide-card-desc">连续打卡 7 天</div></div>
        <div class="guide-card"><div class="guide-card-icon">冠</div><div class="guide-card-title">月度霸主</div><div class="guide-card-desc">连续打卡 30 天</div></div>
        <div class="guide-card"><div class="guide-card-icon">榜</div><div class="guide-card-title">雅思7分</div><div class="guide-card-desc">IELTS 总分达到 7.0</div></div>
        <div class="guide-card"><div class="guide-card-icon">力</div><div class="guide-card-title">四级500+</div><div class="guide-card-desc">CET-4 总分达到 500</div></div>
        <div class="guide-card"><div class="guide-card-icon">勋</div><div class="guide-card-title">六级500+</div><div class="guide-card-desc">CET-6 总分达到 500</div></div>
        <div class="guide-card"><div class="guide-card-icon">升</div><div class="guide-card-title">逆风翻盘</div><div class="guide-card-desc">任一科目成绩显著提升</div></div>
        <div class="guide-card"><div class="guide-card-icon">辩</div><div class="guide-card-title">反击选手</div><div class="guide-card-desc">使用 AI 回嘴功能</div></div>
        <div class="guide-card"><div class="guide-card-icon">拓</div><div class="guide-card-title">个性化</div><div class="guide-card-desc">创建自定义考试</div></div>
      </div>
    </div>
    <div class="guide-section">
      <div class="guide-section-title">
        <span class="guide-icon" style="background:linear-gradient(135deg,#8b5cf6,#ec4899);">卡</span>
        个人名片
      </div>
      <p class="guide-desc">点击右上角头像 → Profile Panel 中点击「查看名片」，打开完整的个人名片页面：</p>
      <ul class="guide-list">
        <li><strong>Hero Banner</strong>：头像 + 昵称 + UID + 邮箱</li>
        <li><strong>等级卡片</strong>：当前等级、经验进度条（shimmer 动画）、升级所需 XP</li>
        <li><strong>数据概览</strong>：总经验值 / 连续打卡天数 / 已解锁成就 三列数据</li>
        <li><strong>成就墙</strong>：3×4 网格展示全部 12 项成就，已解锁高亮，未解锁灰色</li>
        <li><strong>经验来源明细</strong>：各类 XP 来源的累计获得量</li>
      </ul>
    </div>`
  },
  { id: 'guide-data', label: '数据与安全', content: `
    <div class="guide-section" id="guide-data">
      <div class="guide-section-title">
        <span class="guide-icon" style="background:linear-gradient(135deg,#10b981,#059669);">伍</span>
        数据安全
      </div>
      <ul class="guide-list">
        <li><strong>本地优先</strong>：未登录时数据仅保存在浏览器 localStorage</li>
        <li><strong>云端同步</strong>：登录后数据自动上传，换设备登录自动拉取</li>
        <li><strong>密码加密</strong>：scrypt 单向哈希，服务器无法查看明文密码</li>
        <li><strong>传输加密</strong>：所有 API 通信走 HTTPS</li>
      </ul>
    </div>
    <div class="guide-section">
      <div class="guide-section-title">
        <span class="guide-icon" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);">份</span>
        备份与恢复
      </div>
      <ul class="guide-list">
        <li><strong>导出</strong>：在考试概览区右上角点击「导出数据」下载 JSON 备份文件</li>
        <li><strong>导入</strong>：点击「导入备份」选择备份文件，自动合并去重</li>
        <li><strong>导出报告</strong>：点击「导出报告」生成成绩单或分享卡片</li>
        <li><strong>合并逻辑</strong>：导入不会覆盖现有记录，只补充缺失的</li>
      </ul>
    </div>
    <div class="guide-section">
      <div class="guide-section-title">
        <span class="guide-icon" style="background:linear-gradient(135deg,#f59e0b,#f97316);">线</span>
        PWA 离线支持
      </div>
      <ul class="guide-list">
        <li><strong>添加到主屏幕</strong>：支持将应用安装到手机/电脑桌面，像原生 App 一样使用</li>
        <li><strong>离线访问</strong>：已缓存的页面和资源在断网后仍可使用</li>
        <li><strong>自动更新</strong>：新版本发布后自动更新缓存，无需手动操作</li>
      </ul>
    </div>`
  }
];

export var USER_AGREEMENT_HTML = '<h3>一、服务描述</h3><p>MyScore（以下简称"本服务"）是一款成绩记录与管理工具，提供成绩录入、趋势分析、AI 评价反馈及云端数据同步等功能。本服务由碳碳四键（以下简称"我们"）开发并运营。</p><p>本服务目前处于内测阶段，功能和界面可能随时调整。我们保留随时修改、暂停或终止服务的权利。</p><h3>二、用户账号</h3><p>1. 您需要通过邮箱验证码注册账号以使用云端同步功能。未登录状态下，数据仅保存在浏览器本地存储中。</p><p>2. 您应妥善保管账号信息和密码，因账号信息泄露导致的损失由您自行承担。</p><p>3. 您不得将账号转让、出借给他人使用。违反此规定产生的一切后果由您自行承担。</p><p>4. 您承诺注册信息真实有效，如发现虚假信息，我们有权暂停或终止您的账号。</p><h3>三、用户行为规范</h3><p>1. 您承诺不利用本服务从事任何违反法律法规的活动。</p><p>2. 您不得通过技术手段干扰本服务的正常运行，包括但不限于攻击、爬虫、注入等行为。</p><p>3. 您不得批量注册账号或恶意占用系统资源（如高频发送验证码请求）。</p><p>4. 您在使用 AI 功能时，不得输入违反法律法规或公序良俗的内容。我们保留在发现违规内容时中断服务并封禁账号的权利。</p><h3>四、知识产权</h3><p>本服务的所有内容（包括但不限于界面设计、代码、文案、图标）均受知识产权法保护。未经我们书面许可，您不得复制、修改或分发相关内容。</p><p>您在本服务中录入的成绩数据，知识产权归您所有。</p><h3>五、AI 功能说明</h3><p>1. 本服务提供 AI 评价反馈和伴学助手功能，由第三方 AI 大模型（DeepSeek）驱动。</p><p>2. AI 生成的内容仅供参考，不构成任何学术建议、医学建议或专业意见。您应自行判断 AI 建议的合理性。</p><p>3. AI 模型可能产生不准确、不适当或过时的内容，我们不对 AI 生成内容的准确性、完整性承担保证责任。</p><p>4. AI 功能依赖第三方服务商的可用性，如服务商故障可能导致 AI 功能暂时不可用。</p><h3>六、服务可用性</h3><p>1. 我们将尽合理努力保障服务的持续可用，但不保证服务不出现中断、延迟或错误。</p><p>2. 因服务器维护、网络故障、第三方服务商故障等不可控因素导致的服务中断，我们不承担责任，但会尽快恢复。</p><p>3. 因不可抗力（如自然灾害、政策变化）导致的服务终止或数据丢失，我们不承担责任。</p><h3>七、免责声明</h3><p>1. 本服务按"现状"提供，我们不对其适用性、可靠性、及时性作任何明示或暗示的保证。</p><p>2. 因系统故障、自然灾害等原因导致的数据丢失，我们不承担责任，但会尽合理努力保障数据安全。</p><p>3. 您通过本服务获取的任何信息或 AI 建议，均需自行判断其适用性，我们不对由此产生的任何损失承担责任。</p><h3>八、协议变更</h3><p>我们有权在必要时修改本协议条款。变更后的协议将在本页面更新。继续使用本服务即视为同意变更后的条款。如您不同意变更内容，应立即停止使用本服务。</p><h3>九、适用法律</h3><p>本协议适用中华人民共和国法律。如发生争议，双方应友好协商解决；协商不成的，任一方有权向本服务运营主体所在地有管辖权的法院提起诉讼。</p>';

export var PRIVACY_POLICY_HTML = '<h3>一、信息收集</h3><p>我们收集以下信息以提供服务：</p><p>1. <strong>账号信息</strong>：邮箱地址、昵称、头像选择。</p><p>2. <strong>成绩数据</strong>：您录入的考试成绩、自定义考试类型、目标分数。</p><p>3. <strong>使用记录</strong>：AI 评价对话历史（最近 30 条）。</p><p>我们不会收集您的真实姓名、身份证号、手机号等敏感信息。</p><h3>二、信息使用</h3><p>您的信息仅用于以下目的：</p><p>1. 提供云端数据同步服务，使您可以在不同设备上访问成绩数据。</p><p>2. 生成 AI 学习评价与陪学反馈。</p><p>3. 改善产品体验和服务质量。</p><p>我们不会将您的数据出售或分享给第三方。我们不会使用您的数据训练 AI 模型。</p><h3>三、信息存储</h3><p>1. 未登录状态下，所有数据存储在您的浏览器本地（localStorage）。</p><p>2. 登录后，数据同步至我们的服务器并加密存储。服务器部署在境外，由开发者自行运维管理。</p><p>3. 由于本服务包含 AI 对话功能，服务器部署于境外以确保 AI 服务的可用性和稳定性。所有数据由开发者直接管理，不经过任何第三方服务，数据安全可控。</p><h3>四、信息保护</h3><p>1. 密码采用单向哈希加密存储，我们无法查看您的明文密码。</p><p>2. 身份认证采用 JWT 令牌机制，有效期为 30 天。</p><p>3. 所有 API 通信采用 HTTPS 加密传输。</p><p>4. 数据存储使用持久卷，服务器重启或更新不会导致数据丢失。</p><h3>五、用户权利</h3><p>1. 您可以随时通过"导出数据"功能下载您的全部数据。</p><p>2. 您可以随时退出登录并清除本地数据。</p><p>3. 如需删除云端数据，请通过服务内的联系渠道联系我们，我们将在合理时间内处理。</p><p>4. 您有权拒绝我们收集非必要信息，但可能影响部分功能的使用。</p><h3>六、Cookie 与本地存储</h3><p>本服务使用浏览器 localStorage 存储数据，不使用第三方 Cookie，不加载任何第三方追踪脚本。localStorage 数据仅存在于您的设备上，我们无法远程访问。</p><h3>七、第三方服务</h3><p>本服务使用以下第三方服务：</p><p>1. <strong>DeepSeek API</strong>：用于生成 AI 学习评价。评价内容会发送至 DeepSeek 服务器处理，但我们不会将您的个人信息（如邮箱、昵称）一并发送。</p><p>2. <strong>Resend</strong>：用于发送注册验证码邮件。Resend 仅处理邮箱地址，不获取其他数据。</p><p>3. <strong>DiceBear</strong>：用于生成头像。头像由随机种子生成，不关联您的个人信息。</p><p>上述服务均有其自身的隐私政策，建议您查阅相关条款。</p><h3>八、数据保留与删除</h3><p>1. 您的账号数据会在服务运营期间持续保留。</p><p>2. 如果您希望删除账号及所有数据，请联系我们，我们将在核实身份后 7 个工作日内完成删除。</p><p>3. 服务停止运营时，我们会提前 30 天通知用户，并提供数据导出和删除的渠道。</p><h3>九、未成年人保护</h3><p>本服务主要面向学生群体。未满 14 周岁的用户在注册前应取得监护人的同意。我们不会针对性地收集未成年人的额外信息。</p><h3>十、政策更新</h3><p>本隐私政策可能在必要时更新。重大变更将通过站内通知告知您。继续使用本服务即视为同意更新后的政策。</p><p style="margin-top:1rem;color:#9ca3af;">最后更新：2026 年 4 月</p>';

export const BETA_BANNER = {
    enabled: true,
    items: [
        'V5.4.0-beta 更新：飞书机器人完整集成（绑定/通知/6种命令/卡片模板）',
        '设置页一键绑定飞书，录入成绩自动推送卡片通知到飞书',
        '感谢 <span class="banner-name banner-name-red">大鲨鱼</span><span class="banner-name banner-name-blue">Osc</span><span class="banner-name banner-name-green">处方</span> 的反馈贡献'
    ]
};
