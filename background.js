// background.js —— Service Worker（MV3）
// 职责：
//   1. 安装/升级日志；
//   2. 响应"在独立标签页中打开"；
//   3. 右键菜单"快速切换"：网页任意处右键 → SwitchCookies → 直接列出本站账号，点一下就切。
//      菜单跟随当前活动标签页的域名动态重建；账号增删改（storage 变化）时也重建。

import { getProfiles, getSettings } from './src/lib/storage.js';
import { replaceSiteCookies } from './src/lib/cookies.js';
import { restorePageStorage } from './src/lib/pageStorage.js';
import { extractHostname, isRelatedDomain } from './src/lib/domain.js';
import { t, setLang, resolveLang } from './src/lib/i18n.js';

const MENU_ROOT = 'sc-root';
const MENU_PREFIX = 'sc-profile:';
const MENU_SAVE = 'sc-save';
const MENU_OPEN = 'sc-open';
const MENU_EMPTY = 'sc-empty';
const CONTEXTS = ['page', 'frame', 'selection', 'link', 'editable', 'image', 'video', 'audio'];

// ---------- 工具 ----------

function isWebUrl(url) { return /^https?:\/\//i.test(url || ''); }

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab || null;
}

/** 在扩展图标上短暂显示一个角标，作为右键切换后的反馈（不申请 notifications 权限）。 */
async function flashBadge(text, color, tabId) {
  try {
    await chrome.action.setBadgeBackgroundColor({ color, tabId });
    await chrome.action.setBadgeText({ text, tabId });
    setTimeout(() => chrome.action.setBadgeText({ text: '', tabId }).catch(() => {}), 2500);
  } catch { /* 忽略 */ }
}

// ---------- 菜单构建 ----------

let rebuilding = null;

/** 重建整棵右键菜单（幂等：先 removeAll 再建）。 */
async function rebuildMenu() {
  // 合并并发调用，避免 removeAll/create 交错产生重复 id 错误
  if (rebuilding) return rebuilding;
  rebuilding = (async () => {
    const settings = await getSettings();
    setLang(resolveLang(settings.lang));
    const tab = await activeTab();
    const host = isWebUrl(tab?.url) ? extractHostname(tab.url) : '';
    const profiles = await getProfiles();
    const names = host
      ? Object.entries(profiles).filter(([, p]) => isRelatedDomain(p.domain, host))
          .sort((a, b) => (b[1].updatedAt || '').localeCompare(a[1].updatedAt || '')).map(([n]) => n)
      : [];

    await chrome.contextMenus.removeAll();
    chrome.contextMenus.create({ id: MENU_ROOT, title: t('menu_root'), contexts: CONTEXTS });
    if (names.length === 0) {
      chrome.contextMenus.create({ id: MENU_EMPTY, parentId: MENU_ROOT, title: t('menu_no_profiles'), contexts: CONTEXTS, enabled: false });
    } else {
      for (const n of names) {
        chrome.contextMenus.create({ id: MENU_PREFIX + n, parentId: MENU_ROOT, title: n, contexts: CONTEXTS });
      }
    }
    chrome.contextMenus.create({ id: 'sc-sep', parentId: MENU_ROOT, type: 'separator', contexts: CONTEXTS });
    chrome.contextMenus.create({ id: MENU_SAVE, parentId: MENU_ROOT, title: t('menu_save_current'), contexts: CONTEXTS });
    chrome.contextMenus.create({ id: MENU_OPEN, parentId: MENU_ROOT, title: t('menu_open'), contexts: CONTEXTS });
  })().catch(e => console.warn('[SwitchCookies] rebuildMenu failed', e)).finally(() => { rebuilding = null; });
  return rebuilding;
}

// ---------- 切换 ----------

async function switchByMenu(name, tab) {
  if (!tab?.id || !isWebUrl(tab.url)) return;
  const host = extractHostname(tab.url);
  const profiles = await getProfiles();
  const p = profiles[name];
  if (!p) { await flashBadge('!', '#e5484d', tab.id); return; }
  try {
    const stat = await replaceSiteCookies(host, p.includesSubdomains !== false, p.cookies || []);
    if (p.localStorage || p.sessionStorage || p.indexedDB) {
      await restorePageStorage(tab.id, { localStorage: p.localStorage, sessionStorage: p.sessionStorage, indexedDB: p.indexedDB });
    }
    await chrome.tabs.reload(tab.id);
    await flashBadge(stat.ok === stat.total ? '✓' : `${stat.ok}`, stat.ok === stat.total ? '#22a06b' : '#e5a000', tab.id);
  } catch (e) {
    console.warn('[SwitchCookies] switchByMenu failed', e);
    await flashBadge('!', '#e5484d', tab.id);
  }
}

/** 打开弹窗；Chrome 127 之前 openPopup 可能不可用，降级为独立标签页。 */
async function openPanel(tab) {
  try {
    if (chrome.action.openPopup) { await chrome.action.openPopup(); return; }
  } catch { /* 走降级 */ }
  await chrome.tabs.create({ url: chrome.runtime.getURL(`popup.html?tabId=${tab?.id ?? ''}`) });
}

// ---------- 事件 ----------

chrome.runtime.onInstalled.addListener((details) => {
  console.log(`[SwitchCookies] ${details.reason} -> v${chrome.runtime.getManifest().version}`);
  rebuildMenu();
});
chrome.runtime.onStartup.addListener(rebuildMenu);
chrome.tabs.onActivated.addListener(rebuildMenu);
chrome.tabs.onUpdated.addListener((_id, info, tab) => { if (info.url && tab.active) rebuildMenu(); });
chrome.windows.onFocusChanged.addListener(rebuildMenu);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.cookieProfiles || changes.settings)) rebuildMenu();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const id = String(info.menuItemId);
  if (id.startsWith(MENU_PREFIX)) return switchByMenu(id.slice(MENU_PREFIX.length), tab);
  if (id === MENU_SAVE || id === MENU_OPEN) return openPanel(tab);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'open-in-tab') {
    const url = chrome.runtime.getURL(`popup.html?tabId=${message.tabId ?? ''}`);
    chrome.tabs.create({ url }).then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});

// Service Worker 被唤醒时（可能不是 onInstalled/onStartup），确保菜单存在
rebuildMenu();