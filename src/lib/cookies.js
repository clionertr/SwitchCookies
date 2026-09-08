// src/lib/cookies.js —— Cookie 读写封装（全部返回 Promise）
// 比喻：Cookie 像网站发给你的"会员卡"，登录态就写在卡上。
// 切换账号 = 把当前钱包里的卡全部收起来，换上另一套卡。

import { cookieToUrl, extractRootDomain } from './domain.js';

/**
 * 读取某域名下的全部 Cookie。
 * @param {string} hostname 当前主机名
 * @param {boolean} includeSubdomains 是否按根域名读取（推荐 true）
 * 说明：Chrome 119+ 支持 CHIPS 分区 Cookie，需要传 partitionKey: {} 才能读到；
 * 旧版本会报错，因此做了降级。
 */
export async function getCookiesForSite(hostname, includeSubdomains = true) {
  if (!hostname) return [];
  const domain = includeSubdomains ? extractRootDomain(hostname) : hostname;
  let cookies = [];
  try {
    cookies = await chrome.cookies.getAll({ domain, partitionKey: {} });
  } catch {
    cookies = await chrome.cookies.getAll({ domain });
  }
  if (includeSubdomains) return cookies;
  // 精确模式：只保留 host 完全一致或 ".host" 的 Cookie
  return cookies.filter(c => c.domain === hostname || c.domain === `.${hostname}`);
}

/** 读取浏览器里的全部 Cookie（危险操作，仅导出备份用）。 */
export async function getAllBrowserCookies() {
  try {
    return await chrome.cookies.getAll({ partitionKey: {} });
  } catch {
    return await chrome.cookies.getAll({});
  }
}

/** 删除一条 Cookie；失败不抛错，返回 false。 */
export async function removeCookie(cookie) {
  const details = { url: cookieToUrl(cookie), name: cookie.name };
  if (cookie.storeId) details.storeId = cookie.storeId;
  if (cookie.partitionKey) details.partitionKey = cookie.partitionKey;
  try {
    const r = await chrome.cookies.remove(details);
    return !!r;
  } catch (e) {
    console.warn('removeCookie failed', cookie.name, e);
    return false;
  }
}

/**
 * 把"已保存的 Cookie 对象"转成 chrome.cookies.set 需要的格式。
 * 规则：
 *   - hostOnly 的 Cookie、以及 __Host- / __Secure- 前缀，不能传 domain；
 *   - 会话 Cookie（session=true）不传 expirationDate；
 *   - 保留 partitionKey（分区 Cookie）。
 */
export function toSetDetails(cookie) {
  const details = {
    url: cookieToUrl(cookie),
    name: cookie.name,
    value: cookie.value ?? '',
    path: cookie.path || '/',
    secure: !!cookie.secure,
    httpOnly: !!cookie.httpOnly,
  };
  const isPrefixed = cookie.name.startsWith('__Host-') || cookie.name.startsWith('__Secure-');
  if (!cookie.hostOnly && !isPrefixed && cookie.domain) {
    details.domain = cookie.domain;
  }
  if (cookie.sameSite && cookie.sameSite !== 'unspecified') {
    details.sameSite = cookie.sameSite;
  }
  if (!cookie.session && cookie.expirationDate) {
    details.expirationDate = cookie.expirationDate;
  }
  if (cookie.storeId) details.storeId = cookie.storeId;
  if (cookie.partitionKey) details.partitionKey = cookie.partitionKey;
  return details;
}

/** 写入一条 Cookie；返回 { ok, error }。 */
export async function setCookie(cookie) {
  try {
    const result = await chrome.cookies.set(toSetDetails(cookie));
    if (!result) return { ok: false, error: chrome.runtime.lastError?.message || 'set returned null' };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

/** 批量写入，返回成功/失败统计，方便 UI 展示"12/13 条成功"。 */
export async function setCookies(cookies) {
  const results = await Promise.all(cookies.map(setCookie));
  const failed = results.filter(r => !r.ok);
  return { total: cookies.length, ok: results.length - failed.length, failed };
}

/** 批量删除。 */
export async function removeCookies(cookies) {
  const results = await Promise.all(cookies.map(removeCookie));
  return { total: cookies.length, ok: results.filter(Boolean).length };
}

/**
 * 用一组 Cookie 替换站点当前的 Cookie：先清空、再写入。
 * 这是"切换账号"的核心动作。
 */
export async function replaceSiteCookies(hostname, includeSubdomains, cookies) {
  const existing = await getCookiesForSite(hostname, includeSubdomains);
  await removeCookies(existing);
  return setCookies(cookies);
}