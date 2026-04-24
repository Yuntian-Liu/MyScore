// ==================== 桌面宠物 ====================
import { SASSY_QUOTES, PET_STORAGE_KEY, PET_DRAG_THRESHOLD, PET_SNAP_THRESHOLD, PET_SNAP_MARGIN, PET_MIN_SCALE, PET_MAX_SCALE } from './config.js';
import { showAiToast } from './utils.js';
import { getRecords } from './storage.js';

let bubbleTimer = null;
let recentQuoteIndexes = [];
const RECENT_QUOTES_WINDOW = 20;

var petDragState = null;
var petScaleState = null;

export function updatePetMood() {
    const records = getRecords();
    const avatar = document.getElementById('pet-avatar');
    if (!avatar) return;
    if (!records.length) { avatar.innerHTML = '😴'; return; }
    const last = records[records.length - 1];
    const prev = records.length > 1 ? records[records.length - 2] : null;
    if (!prev) avatar.innerHTML = '😐';
    else if (last.total > prev.total) avatar.innerHTML = '😎';
    else if (last.total < prev.total) avatar.innerHTML = '😡';
    else avatar.innerHTML = '😑';
}

function getNonRepeatingQuoteIndex() {
    if (SASSY_QUOTES.length <= 1) return 0;
    const windowSize = Math.min(RECENT_QUOTES_WINDOW, SASSY_QUOTES.length - 1);
    const recentSet = new Set(recentQuoteIndexes);
    let pickedIndex = -1;
    for (let i = 0; i < 12; i++) { const idx = Math.floor(Math.random() * SASSY_QUOTES.length); if (!recentSet.has(idx)) { pickedIndex = idx; break; } }
    if (pickedIndex === -1) { pickedIndex = 0; while (recentSet.has(pickedIndex) && pickedIndex < SASSY_QUOTES.length - 1) pickedIndex++; }
    recentQuoteIndexes.push(pickedIndex);
    if (recentQuoteIndexes.length > windowSize) recentQuoteIndexes.shift();
    return pickedIndex;
}

function pokeTeacher() {
    const bubble = document.getElementById('pet-bubble');
    const pet = document.getElementById('desktop-pet');
    bubble.innerText = SASSY_QUOTES[getNonRepeatingQuoteIndex()];
    bubble.style.opacity = '1'; bubble.style.visibility = 'visible'; bubble.style.transform = 'translateY(-10px)';
    pet.style.transform = 'scale(0.9) rotate(-5deg)';
    setTimeout(function() { pet.style.transform = ''; }, 200);
    if (bubbleTimer) clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function() { bubble.style.opacity = '0'; bubble.style.visibility = 'hidden'; bubble.style.transform = 'translateY(0)'; }, 3000);
}

function getPetState() { try { return JSON.parse(localStorage.getItem(PET_STORAGE_KEY)) || {}; } catch(e) { return {}; } }
function savePetState(patch) { var prev = getPetState(); localStorage.setItem(PET_STORAGE_KEY, JSON.stringify(Object.assign({}, prev, patch))); }

export function initPetDraggable() {
    var pet = document.getElementById('desktop-pet');
    if (!pet) return;
    var state = getPetState();
    if (state.visible === false) { pet.style.display = 'none'; var showFab = document.getElementById('pet-show-fab'); if (showFab) showFab.classList.remove('hidden'); }
    if (typeof state.x === 'number' && typeof state.y === 'number') { pet.style.right = 'auto'; pet.style.bottom = 'auto'; pet.style.left = state.x + 'px'; pet.style.top = state.y + 'px'; pet.classList.add('pet-positioned'); }
    var scale = typeof state.scale === 'number' ? state.scale : 1;
    pet.querySelector('#pet-avatar').style.fontSize = (4.5 * scale) + 'rem';
    pet.addEventListener('pointerdown', onPetPointerDown);
    document.addEventListener('pointermove', onPetPointerMove);
    document.addEventListener('pointerup', onPetPointerUp);
    var scaleHandle = document.getElementById('pet-scale-handle');
    if (scaleHandle) scaleHandle.addEventListener('pointerdown', onPetScaleStart);
    var closeBtn = document.getElementById('pet-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', function(e) { e.stopPropagation(); hideDesktopPet(); });
    pet.addEventListener('mouseenter', function() { if (closeBtn) closeBtn.style.display = 'flex'; if (scaleHandle) scaleHandle.style.opacity = '1'; });
    pet.addEventListener('mouseleave', function() { if (closeBtn) closeBtn.style.display = 'none'; if (scaleHandle) scaleHandle.style.opacity = '0'; });
    var showFab = document.getElementById('pet-show-fab');
    if (showFab) showFab.addEventListener('click', showDesktopPet);

    // Mobile pinch
    var petPinchState = null;
    pet.addEventListener('touchstart', function(e) {
        if (e.touches.length === 2) { e.preventDefault(); petPinchState = { startDist: getTouchDistance(e.touches), startScale: getPetState().scale || 1 }; }
    }, { passive: false });
    pet.addEventListener('touchmove', function(e) {
        if (!petPinchState || e.touches.length !== 2) return; e.preventDefault();
        var ratio = getTouchDistance(e.touches) / petPinchState.startDist;
        var newScale = Math.max(PET_MIN_SCALE, Math.min(PET_MAX_SCALE, petPinchState.startScale * ratio));
        var avatar = document.getElementById('pet-avatar'); if (avatar) avatar.style.fontSize = (4.5 * newScale) + 'rem';
    }, { passive: false });
    pet.addEventListener('touchend', function() {
        if (!petPinchState) return;
        var avatar = document.getElementById('pet-avatar'); var fs = parseFloat(avatar.style.fontSize) || 4.5;
        savePetState({ scale: fs / 4.5 }); petPinchState = null;
    });
    window.addEventListener('resize', function() { if (!pet || pet.style.display === 'none' || !pet.classList.contains('pet-positioned')) return; clampPetToViewport(); });
}

function onPetPointerDown(e) {
    if (e.target.closest('#pet-close-btn') || e.target.closest('#pet-scale-handle')) return;
    var pet = document.getElementById('desktop-pet'); var rect = pet.getBoundingClientRect();
    petDragState = { startX: e.clientX, startY: e.clientY, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top, moved: false };
    pet.classList.add('dragging'); pet.style.cursor = 'grabbing'; pet.setPointerCapture(e.pointerId); e.preventDefault();
}

function onPetPointerMove(e) {
    if (!petDragState) return;
    if (!petDragState.moved && (Math.abs(e.clientX - petDragState.startX) > PET_DRAG_THRESHOLD || Math.abs(e.clientY - petDragState.startY) > PET_DRAG_THRESHOLD)) petDragState.moved = true;
    if (!petDragState.moved) return;
    var pet = document.getElementById('desktop-pet');
    var newLeft = Math.max(0, Math.min(window.innerWidth - pet.offsetWidth, e.clientX - petDragState.offsetX));
    var newTop = Math.max(0, Math.min(window.innerHeight - pet.offsetHeight, e.clientY - petDragState.offsetY));
    pet.style.right = 'auto'; pet.style.bottom = 'auto'; pet.style.left = newLeft + 'px'; pet.style.top = newTop + 'px';
    pet.classList.add('pet-positioned'); updateBubbleDirection(newLeft);
}

function onPetPointerUp(e) {
    if (!petDragState) return;
    var pet = document.getElementById('desktop-pet'); pet.classList.remove('dragging'); pet.style.cursor = 'grab';
    if (!petDragState.moved) { pokeTeacher(); petDragState = null; return; }
    snapPetToEdge(); petDragState = null;
}

function snapPetToEdge() {
    var pet = document.getElementById('desktop-pet'); var rect = pet.getBoundingClientRect();
    var vw = window.innerWidth; var vh = window.innerHeight;
    var snapped = false; var finalLeft = rect.left; var finalTop = rect.top;
    if (rect.left < PET_SNAP_THRESHOLD) { finalLeft = PET_SNAP_MARGIN; snapped = true; }
    else if (vw - rect.right < PET_SNAP_THRESHOLD) { finalLeft = vw - rect.width - PET_SNAP_MARGIN; snapped = true; }
    if (rect.top < PET_SNAP_THRESHOLD || vh - rect.bottom < PET_SNAP_THRESHOLD) showAiToast('桌宠只支持左右边缘吸附哦~');
    if (snapped) {
        pet.style.transition = 'left 0.3s cubic-bezier(0.22,1,0.36,1), top 0.3s cubic-bezier(0.22,1,0.36,1), transform 0.2s ease';
        pet.style.left = finalLeft + 'px'; pet.style.top = finalTop + 'px';
        updateBubbleDirection(finalLeft);
        setTimeout(function() { pet.style.transition = 'transform 0.2s ease'; }, 350);
    }
    var saveRect = snapped ? { left: finalLeft, top: finalTop } : { left: rect.left, top: rect.top };
    savePetState({ x: saveRect.left, y: saveRect.top });
}

function updateBubbleDirection(petLeft) {
    var bubble = document.getElementById('pet-bubble'); if (!bubble) return;
    var pet = document.getElementById('desktop-pet'); var petCenter = petLeft + pet.offsetWidth / 2;
    if (petCenter < window.innerWidth / 2) { bubble.style.left = '0'; bubble.style.right = 'auto'; bubble.style.borderRadius = '16px 16px 16px 0'; }
    else { bubble.style.right = '0'; bubble.style.left = 'auto'; bubble.style.borderRadius = '16px 16px 0 16px'; }
}

function onPetScaleStart(e) {
    e.stopPropagation(); e.preventDefault();
    petScaleState = { startX: e.clientX, startY: e.clientY, startScale: getPetState().scale || 1 };
    document.addEventListener('pointermove', onPetScaleMove);
    document.addEventListener('pointerup', onPetScaleEnd);
}

function onPetScaleMove(e) {
    if (!petScaleState) return;
    var delta = (petScaleState.startX - e.clientX) + (e.clientY - petScaleState.startY);
    var newScale = Math.max(PET_MIN_SCALE, Math.min(PET_MAX_SCALE, petScaleState.startScale + delta / 100));
    var avatar = document.getElementById('pet-avatar'); if (avatar) avatar.style.fontSize = (4.5 * newScale) + 'rem';
}

function onPetScaleEnd() {
    if (!petScaleState) return;
    var avatar = document.getElementById('pet-avatar'); var fs = parseFloat(avatar.style.fontSize) || 4.5;
    savePetState({ scale: fs / 4.5 }); petScaleState = null;
    document.removeEventListener('pointermove', onPetScaleMove);
    document.removeEventListener('pointerup', onPetScaleEnd);
}

function hideDesktopPet() { var pet = document.getElementById('desktop-pet'); if (pet) pet.style.display = 'none'; var fab = document.getElementById('pet-show-fab'); if (fab) fab.classList.remove('hidden'); savePetState({ visible: false }); }
function showDesktopPet() { var pet = document.getElementById('desktop-pet'); if (pet) pet.style.display = ''; var fab = document.getElementById('pet-show-fab'); if (fab) fab.classList.add('hidden'); savePetState({ visible: true }); }

function clampPetToViewport() {
    var pet = document.getElementById('desktop-pet'); if (!pet || pet.style.display === 'none') return;
    var left = Math.max(0, Math.min(window.innerWidth - pet.offsetWidth, parseFloat(pet.style.left) || 0));
    var top = Math.max(0, Math.min(window.innerHeight - pet.offsetHeight, parseFloat(pet.style.top) || 0));
    pet.style.left = left + 'px'; pet.style.top = top + 'px'; pet.style.right = 'auto'; pet.style.bottom = 'auto';
    updateBubbleDirection(left);
}

function getTouchDistance(touches) { var dx = touches[0].clientX - touches[1].clientX; var dy = touches[0].clientY - touches[1].clientY; return Math.sqrt(dx * dx + dy * dy); }

// ---- 挂载到 window ----
window.updatePetMood = updatePetMood;
window.pokeTeacher = pokeTeacher;
