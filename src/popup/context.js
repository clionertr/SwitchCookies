// src/popup/context.js —— 弹窗共享状态
// 所有视图都从这里拿"当前操作的标签页是哪个、域名是什么、设置是什么"，
// 避免 v1 那种 window.currentDomain 全局变量到处飘。

import { extractHostname } from '../lib/domain.js';
import { getSettings, updateSettings } from '../lib/storage.js';

export const ctx = {
  tab: null,          // chrome.tabs.Tab
  hostname: '',       // 当前站点主机名，空表示非网页（chrome:// 等）
  url: '',
  settings: null,
  inTab: false,       // 是否以独立标签页方式打开
};

const listeners = new Set();
/** 订阅上下文变化（如设置更新后刷新列表）。 */
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(what) { listeners.forEach(fn => fn(what)); }

/** 判断 URL 是否是可操作的网页。 */
function isWebUrl(url) {
  return /^https?:\/\//i.test(url || '');
}

/** 初始化：读取设置、确定目标标签页。 */
export async function initContext() {
  ctx.settings = await getSettings();

  const params = new URLSearchParams(location.search);
  const tabIdParam = params.get('tabId');
  ctx.inTab = params.has('tabId');

  let tab = null;
  if (tabIdParam) {
    try { tab = await chrome.tabs.get(Number(tabIdParam)); } catch { tab = null; }
  }
  if (!tab) {
    // 普通弹窗模式：取当前窗口活动标签
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = active || null;
    // 独立标签页模式下，活动标签就是自己；退而找同窗口最近一个网页标签
    if (tab && tab.url && tab.url.startsWith(chrome.runtime.getURL(''))) {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      tab = tabs.filter(t => isWebUrl(t.url)).sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0] || null;
    }
  }
  ctx.tab = tab;
  ctx.url = tab?.url || '';
  ctx.hostname = isWebUrl(ctx.url) ? extractHostname(ctx.url) : '';
  return ctx;
}

/** 更新设置并广播。 */
export async function setSetting(patch) {
  ctx.settings = await updateSettings(patch);
  emit('settings');
  return ctx.settings;
}

/** 让所有视图刷新数据（如保存/切换/导入后）。 */
export function notify(what = 'data') { emit(what); }

/** 刷新目标标签页。 */
export async function reloadTargetTab() {
  if (!ctx.tab?.id) return false;
  try { await chrome.tabs.reload(ctx.tab.id); return true; } catch { return false; }
}