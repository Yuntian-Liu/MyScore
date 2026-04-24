// ==================== 版本日志 / 使用指南 ====================
import { APP_VERSION, CHANGELOG_STORAGE_KEY, CHANGELOG_PLACEHOLDER, GUIDE_SECTIONS } from './config.js';

function openInfoModal(type) {
    const modal = document.getElementById('info-modal');
    const title = document.getElementById('info-modal-title');
    const body = document.getElementById('info-modal-body');
    const primary = document.getElementById('info-modal-primary');
    const sidebar = document.getElementById('guide-sidebar');

    if (!modal || !title || !body || !primary) return;

    const isChangelog = type === 'changelog';
    title.textContent = isChangelog ? ('版本日志 · V' + APP_VERSION) : 'MyScore 使用指南';

    if (isChangelog) {
        body.innerHTML = CHANGELOG_PLACEHOLDER;
        sidebar.style.display = 'none';
        primary.style.display = 'inline-flex';
    } else {
        sidebar.innerHTML = GUIDE_SECTIONS.map(function(s, i) {
            return '<button class="guide-nav-btn' + (i === 0 ? ' active' : '') + '" onclick="switchGuideSection(' + i + ')">' + s.label + '</button>';
        }).join('');
        sidebar.style.display = 'flex';
        body.innerHTML = GUIDE_SECTIONS[0].content;
        primary.style.display = 'none';
    }

    modal.classList.add('active');
}

function switchGuideSection(index) {
    var body = document.getElementById('info-modal-body');
    var sidebar = document.getElementById('guide-sidebar');
    if (!body || !sidebar) return;
    body.innerHTML = GUIDE_SECTIONS[index].content;
    sidebar.querySelectorAll('.guide-nav-btn').forEach(function(btn, i) {
        btn.classList.toggle('active', i === index);
    });
    body.scrollTop = 0;
}

function closeInfoModal() {
    const modal = document.getElementById('info-modal');
    if (!modal) return;
    modal.classList.remove('active');
}

function acknowledgeChangelog() {
    localStorage.setItem(CHANGELOG_STORAGE_KEY, '1');
    if (typeof window.scheduleCloudSync === 'function') window.scheduleCloudSync();
    closeInfoModal();
}

function handleInfoModalOverlayClick(event) {
    if (event.target && event.target.id === 'info-modal') {
        closeInfoModal();
    }
}

export function maybeShowChangelogOnFirstOpen() {
    const hasSeen = localStorage.getItem(CHANGELOG_STORAGE_KEY) === '1';
    if (!hasSeen) {
        localStorage.setItem(CHANGELOG_STORAGE_KEY, '1');
        openInfoModal('changelog');
    }
}

// ==================== 挂载到 window ====================
window.openInfoModal = openInfoModal;
window.closeInfoModal = closeInfoModal;
window.switchGuideSection = switchGuideSection;
window.acknowledgeChangelog = acknowledgeChangelog;
window.handleInfoModalOverlayClick = handleInfoModalOverlayClick;
