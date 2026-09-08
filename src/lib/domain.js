// src/lib/domain.js —— 域名工具
// 比喻：网址像一封信的地址。"根域名"是城市（github.com），
// "子域名"是街道（api.github.com）。切换账号时通常要按"城市"整体处理，
// 因为登录态 Cookie 往往写在 .github.com 上，对所有街道都有效。

/** 常见的"两级公共后缀"，如 co.uk、com.cn。不完整，但覆盖绝大多数日常场景。 */
const TWO_LEVEL_SUFFIXES = new Set([
  'co', 'com', 'org', 'net', 'gov', 'edu', 'ac', 'ltd', 'plc', 'me', 'or', 'ne', 'go'
]);

/** 从完整 URL 中取出主机名；无法解析时返回空字符串。 */
export function extractHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/** 判断是否为 IPv4 / IPv6 / localhost 这类无需再拆分的主机。 */
export function isIpOrLocal(hostname) {
  if (!hostname) return false;
  if (hostname === 'localhost' || !hostname.includes('.')) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
  if (hostname.includes(':')) return true; // IPv6
  return false;
}

/**
 * 取根域名：
 *   api.github.com     -> github.com
 *   www.bbc.co.uk      -> bbc.co.uk
 *   127.0.0.1          -> 127.0.0.1
 * 边界：对 github.io、vercel.app 之类"私有公共后缀"会把整个平台当成一个站，
 * 这种情况建议用户关闭"包含子域名"。
 */
export function extractRootDomain(hostname) {
  if (!hostname || typeof hostname !== 'string') return '';
  if (isIpOrLocal(hostname)) return hostname;
  const parts = hostname.split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  const tld = parts[parts.length - 1];
  const sld = parts[parts.length - 2];
  if (tld.length === 2 && TWO_LEVEL_SUFFIXES.has(sld) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

/** 去掉 Cookie 域名开头的点：".github.com" -> "github.com" */
export function stripLeadingDot(domain) {
  return domain && domain.startsWith('.') ? domain.slice(1) : domain;
}

/**
 * 判断配置是否与当前站点"相关"：同根域名即视为相关。
 * @param {string} profileDomain 配置保存时的域名
 * @param {string} currentHost 当前标签页主机名
 */
export function isRelatedDomain(profileDomain, currentHost) {
  if (!profileDomain || !currentHost) return false;
  if (profileDomain === currentHost) return true;
  return extractRootDomain(profileDomain) === extractRootDomain(currentHost);
}

/** 根据 Cookie 对象拼出可用于 chrome.cookies.set/remove 的 URL。 */
export function cookieToUrl(cookie) {
  const scheme = cookie.secure ? 'https://' : 'http://';
  const host = stripLeadingDot(cookie.domain || '');
  const path = cookie.path || '/';
  return `${scheme}${host}${path}`;
}