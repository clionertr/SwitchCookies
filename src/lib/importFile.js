// src/lib/importFile.js —— 识别并导入本扩展导出的三种 JSON
// 弹窗页与独立导入窗口共用，避免两套解析逻辑分叉。

import { readFileAsJson } from './ui.js';
import { mergeProfiles } from './storage.js';
import { setCookies, getCookiesForSite, removeCookies } from './cookies.js';
import { isRelatedDomain } from './domain.js';

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isCookie = cookie => isRecord(cookie) && typeof cookie.name === 'string'
  && typeof cookie.value === 'string' && typeof cookie.domain === 'string' && !!cookie.domain;
const isCookieList = cookies => Array.isArray(cookies) && cookies.every(isCookie);

function cookieResult(vars) {
  return {
    ok: vars.ok === vars.total,
    kind: vars.ok === vars.total ? 'success' : vars.ok ? 'info' : 'error',
    key: 'imported_cookies',
    vars,
    notify: 'cookies',
  };
}

/**
 * @param {File} file
 * @param {{ hostname?: string, tabId?: number }} [target]
 * @returns {Promise<{ ok: boolean, kind: string, key: string, vars?: object, notify?: string }>}
 */
export async function importSwitchCookiesFile(file, target = {}) {
  let data;
  try {
    data = await readFileAsJson(file);
  } catch {
    return { ok: false, kind: 'error', key: 'import_invalid' };
  }

  if (data?.type === 'cookie_profiles' && isRecord(data.profiles)
    && Object.values(data.profiles).every(p => isRecord(p) && typeof p.domain === 'string' && isCookieList(p.cookies))) {
    const vars = await mergeProfiles(data.profiles);
    return { ok: true, kind: 'success', key: 'imported_profiles', vars, notify: 'profiles' };
  }

  if (data?.allDomains && isRecord(data.cookiesByDomain)
    && Object.values(data.cookiesByDomain).every(isCookieList)) {
    const all = Object.values(data.cookiesByDomain).flat();
    const vars = await setCookies(all);
    return cookieResult(vars);
  }

  if (typeof data?.domain === 'string' && data.domain && isCookieList(data.cookies)) {
    // 文件中的域名决定替换范围，不能清空打开导入窗口时所在的其他站点。
    const hostname = data.domain;
    if (hostname) {
      const existing = await getCookiesForSite(hostname, data.includesSubdomains !== false);
      await removeCookies(existing);
    }
    const vars = await setCookies(data.cookies);
    if (target.tabId && isRelatedDomain(hostname, target.hostname)) {
      try { await chrome.tabs.reload(target.tabId); } catch { /* 标签可能已关 */ }
    }
    return cookieResult(vars);
  }

  return { ok: false, kind: 'error', key: 'import_invalid' };
}
