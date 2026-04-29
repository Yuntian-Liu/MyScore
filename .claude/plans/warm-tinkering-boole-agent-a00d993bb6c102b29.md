# Settings UI Overhaul - Implementation Plan

## Overview
Three changes to the MyScore settings UI:
1. Convert .settings-fab from circle to pill shape (match .changelog-fab)
2. Implement in-modal sub-page navigation for "关于" section items
3. Replace text arrows with chevron SVG icons

---

## 1. FAB Alignment: Settings FAB to Pill Shape

### HTML Change (index.html, lines 865-868)
Add expandable label span inside the settings-fab button:
- Add: span.settings-fab-label with text "设置"

### CSS Changes (style.css)

Replace existing .settings-fab block (lines 1242-1268) to use pill shape:
- border-radius: 9999px (was 50%)
- padding: 0.6rem 0.7rem (was fixed 40x40)
- Remove width/height constraints
- Add gap: 0.5rem for icon + label spacing
- Remove transform: rotate(45deg) from hover

Add new .settings-fab-label class (after line 1268):
- max-width: 0, opacity: 0 (hidden by default)
- max-width: 88px, opacity: 1 on hover (expand animation)
- Same pattern as .changelog-fab-label and .tutuer-fab-label

### Vertical Spacing Recalculation

Desktop: changelog bottom: 1.25rem, tutuer bottom: 5rem, settings bottom: 8.75rem
At each breakpoint, adjust all three consistently:
- @media 768px: settings 7.5rem, tutuer 4.5rem, changelog 0.9rem
- @media 480px: settings 6.7rem, tutuer 4.1rem, changelog 0.7rem, labels hidden

---

## 2. Settings Sub-Page Navigation

### Architecture
Two layers inside #settings-modal:
- "home" view: current sections (profile, AI, data, about)
- Sub-pages: guide, changelog, agreement, privacy

Both live inside #settings-pages container. Only one .settings-page.active at a time.

### HTML Changes (index.html, lines 602-683)

Restructure settings modal interior:
1. Add back button (left chevron SVG) in header, hidden by default
2. Wrap all current content in div#settings-home.settings-page.active
3. Add empty div#settings-sub-guide.settings-page
4. Add empty div#settings-sub-changelog.settings-page
5. Add empty div#settings-sub-agreement.settings-page
6. Add empty div#settings-sub-privacy.settings-page
7. Change onclick handlers on "关于" rows:
   - Line 663: settingsNavigate(guide) instead of closeSettings();openInfoModal(guide)
   - Line 666: settingsNavigate(changelog) instead of closeSettings();openInfoModal(changelog)
   - Line 669: settingsNavigate(agreement) instead of closeSettings();openAgreementModal(agreement)
   - Line 672: settingsNavigate(privacy) instead of closeSettings();openAgreementModal(privacy)

### CSS Changes for Sub-Pages (after line 3984)

```css
/* Settings page container */
#settings-pages { position: relative; overflow: hidden; }

/* Individual page wrapper */
.settings-page { display: none; }
.settings-page.active {
    display: block;
    animation: settingsPageIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
}

@keyframes settingsPageIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
}

/* Back button */
.settings-back-btn {
    background: none; border: none; color: var(--primary-dark);
    cursor: pointer; padding: 0.25rem; margin-right: 0.25rem;
    display: inline-flex; align-items: center; border-radius: 8px;
    transition: background 0.15s;
}
.settings-back-btn:hover { background: var(--primary-light); }

/* Sub-page content */
.settings-sub-content { padding: 0.5rem 0; line-height: 1.7; color: #374151; }
.settings-sub-content h3 { font-size: 1rem; font-weight: 700; color: #111827; margin: 1.25rem 0 0.5rem; }
.settings-sub-content p { margin: 0.5rem 0; font-size: 0.9rem; }
.settings-sub-content .guide-sidebar { margin-bottom: 0.75rem; }
```

### JavaScript Changes (js/settings.js)

Add to imports (line 2):
- GUIDE_SECTIONS, CHANGELOG_CURRENT, CHANGELOG_HISTORY, USER_AGREEMENT_HTML, PRIVACY_POLICY_HTML

New functions:
- settingsNavigate(page) - hide home, show sub-page, update header title and back button
- settingsGoHome() - show home, hide sub-page, reset header
- renderSettingsSubPage(page) - populate sub-page div with content
- settingsSwitchGuide(index) - switch guide sections within sub-page
- settingsShowChangelogHistory() / settingsBackToCurrentChangelog()

Modify openSettings() to call settingsGoHome() before showing modal
Modify closeSettings() to call settingsGoHome() before hiding modal

Add window mounts for all new functions.

---

## 3. Chevron SVG Icons

Replace all arrow text in "关于" rows with:
```html
<svg class="settings-chevron" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
```

CSS:
```css
.settings-chevron { color: var(--text-muted); flex-shrink: 0; transition: color 0.15s, transform 0.15s; }
.settings-info-row:hover .settings-chevron { color: var(--primary); transform: translateX(2px); }
```

---

## 4. Content Source Reuse

| Sub-page | Source | Already exported? |
|----------|--------|-------------------|
| 使用指南 | GUIDE_SECTIONS from config.js | Yes |
| 版本日志 | CHANGELOG_CURRENT/HISTORY from config.js | Yes |
| 用户协议 | USER_AGREEMENT_HTML from config.js | Yes |
| 隐私政策 | PRIVACY_POLICY_HTML from config.js | Yes |

No changes needed to auth.js or config.js. All values are already exported from config.js and can be imported directly into settings.js.

### Backward Compatibility
- openInfoModal() and openAgreementModal() remain unchanged in info.js and auth.js
- They continue to work for non-settings callers (nav buttons, changelog FAB, login page links)
- Only the settings "关于" section calls are replaced with settingsNavigate()

---

## 5. Implementation Order

1. CSS first - Add all new classes (sub-pages, back button, chevron, FAB label)
2. HTML second - Restructure settings modal, add FAB label, replace arrows with chevrons
3. JS third - Add imports, navigation functions, modify openSettings/closeSettings
4. Test all interactions

---

## 6. Verification Steps

### FAB Alignment
- All three FABs are pill-shaped with border-radius: 9999px
- Settings FAB shows "设置" label on hover with expand animation
- No rotate(45deg) on settings FAB hover
- FABs are evenly spaced vertically, no overlap
- Labels hidden at 480px breakpoint

### Sub-page Navigation
- Clicking "使用指南" transitions to guide sub-page within settings
- Guide sub-page has sidebar navigation that works
- Back button returns to settings home
- Same flow for all four sub-pages
- Opening settings always starts on home page
- Closing settings resets to home page

### Backward Compatibility
- Changelog FAB still opens standalone info modal
- Nav buttons still open standalone info modal
- Login page agreement links still open standalone agreement modal
- maybeShowChangelogOnFirstOpen still works

### Chevron Icons
- All four "关于" rows show chevron SVG
- Chevron animates right on row hover
- Color matches hover color

### Responsive
- Settings modal scrolls properly with sub-page content
- Guide sidebar wraps on mobile
- Back button is tappable on mobile
