// src/popup/cookiesView.js —— "Cookie"标签页
// 两种范围：
//   本站：当前网站的 Cookie，平铺列表，可新增 / 编辑 / 删除 / 一键清空；
//   全部网站：浏览器里所有 Cookie，按域名分组折叠，可搜索、编辑、删除单条或整个域名。

import { ctx, notify, onChange, reloadTargetTab } from './context.js';
import { t } from '../lib/i18n.js';
import { $, $$, h, toast, inlineConfirm, downloadJson, debounce, todayStamp } from '../lib/ui.js';
import { getCookiesForSite, getAllBrowserCookies, removeCookie, removeCookies } from '../lib/cookies.js';
import { extractRootDomain, stripLeadingDot } from '../lib/domain.js';
import { openCookieEditor } from './cookieEditor.js';

let scope = 'site';       // site | all
let cookies = [];         // 当前范围内全部 Cookie
let allExpanded = false;
const openGroups = new Set(); // 记住展开过的域名，刷新后不塌回去

// ---------------- 数据 ----------------

async function load() {
  if (scope === 'site') {
    cookies = ctx.hostname ? await getCookiesForSite(ctx.hostname, ctx.settings.includeSubdomains) : [];
  } else {
    cookies = await getAllBrowserCookies();
  }
  cookies.sort((a, b) => a.domain.localeCompare(b.domain) || a.name.localeCompare(b.name));
  render();
}

function filtered() {
  const q = $('#cookie-search').value.trim().toLowerCase();
  if (!q) return cookies;
  return cookies.filter(c => c.name.toLowerCase().includes(q) || c.domain.toLowerCase().includes(q) || (c.value || '').toLowerCase().includes(q));
}

// ---------------- 单条 Cookie 行 ----------------

function flags(c) {
  const f = [];
  if (c.secure) f.push('Secure');
  if (c.httpOnly) f.push('HttpOnly');
  if (c.session) f.push('Session');
  if (c.partitionKey) f.push('Partitioned');
  if (c.sameSite && c.sameSite !== 'unspecified') f.push(c.sameSite === 'no_restriction' ? 'None' : c.sameSite[0].toUpperCase() + c.sameSite.slice(1));
  return f;
}

function row(c, showDomain) {
  const el = h('div', { class: 'cookie' });
  const main = h('div', { class: 'cookie-main' },
    h('div', { class: 'cookie-name', title: c.name }, c.name),
    h('div', { class: 'cookie-value', title: c.value }, c.value || '(empty)'),
    h('div', { class: 'cookie-flags' },
      showDomain ? h('span', { class: 'cookie-domain' }, c.domain + c.path) : h('span', { class: 'cookie-domain' }, c.path !== '/' ? c.path : ''),
      ...flags(c).map(f => h('span', { class: 'flag' }, f)),
    ),
  );
  const actions = h('div', { class: 'cookie-actions' },
    h('button', { class: 'icon-btn', title: t('edit'), onclick: () => openCookieEditor(c, {}, load) }, '✏️'),
    h('button', { class: 'icon-btn danger', title: t('delete'), onclick: async () => {
      const r = await inlineConfirm(el, `${t('delete')} "${c.name}"?`, { danger: true, okLabel: t('delete') });
      if (!r.ok) return;
      await removeCookie(c);
      toast(t('cookie_deleted', { name: c.name }), 'info');
      load();
    } }, '🗑'),
  );
  el.append(main, actions);
  return el;
}

// ---------------- 渲染 ----------------

function renderSite(list) {
  const host = $('#cookies-list');
  host.replaceChildren(...list.map(c => row(c, c.domain !== ctx.hostname && c.domain !== '.' + ctx.hostname)));
  $('#cookie-count').textContent = t('cookie_count_site', { n: cookies.length }) + (list.length !== cookies.length ? ` · ${list.length}` : '');
  if (!list.length) host.append(h('div', { class: 'hint center' }, t('no_cookies')));
}

function renderAll(list) {
  const host = $('#cookies-list');
  // 按根域名分组，组内再按完整域名排序
  const groups = new Map();
  for (const c of list) {
    const key = extractRootDomain(stripLeadingDot(c.domain));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  const keys = Array.from(groups.keys()).sort();
  const q = $('#cookie-search').value.trim();
  host.replaceChildren(...keys.map(key => {
    const items = groups.get(key);
    const det = h('details', { class: 'domain-group', open: allExpanded || openGroups.has(key) || (q && keys.length <= 8) ? true : null });
    det.addEventListener('toggle', () => { if (det.open) openGroups.add(key); else openGroups.delete(key); });
    const delBtn = h('button', { class: 'icon-btn danger', title: t('delete'), onclick: async (e) => {
      e.preventDefault(); e.stopPropagation();
      const r = await inlineConfirm(det, t('clear_domain_confirm', { domain: key, n: items.length }), { danger: true, okLabel: t('delete') });
      if (!r.ok) return;
      const stat = await removeCookies(items);
      toast(t('cleared', { n: stat.ok }), 'info');
      load();
    } }, '🗑');
    det.append(
      h('summary', {}, h('span', { class: 'domain-name' }, key), h('span', { class: 'count' }, items.length), delBtn),
      h('div', { class: 'list' }, ...items.map(c => row(c, true))),
    );
    return det;
  }));
  const sites = new Set(cookies.map(c => extractRootDomain(stripLeadingDot(c.domain)))).size;
  $('#cookie-count').textContent = t('cookie_count_all', { sites, n: cookies.length }) + (list.length !== cookies.length ? ` · ${list.length}` : '');
  if (!list.length) host.append(h('div', { class: 'hint center' }, t('no_cookies')));
}

function render() {
  const list = filtered();
  if (scope === 'site') renderSite(list); else renderAll(list);
}

// ---------------- 操作 ----------------

async function clearSite() {
  if (!ctx.hostname || !cookies.length) return;
  const bar = $('#cookies-toolbar-site');
  const r = await inlineConfirm(bar.parentElement, t('clear_site_confirm', { domain: ctx.hostname, n: cookies.length }), { danger: true, okLabel: t('clear_site') });
  if (!r.ok) return;
  const stat = await removeCookies(cookies);
  await reloadTargetTab();
  toast(t('cleared', { n: stat.ok }), 'success');
  load();
  notify('profiles');
}

async function exportAll() {
  const r = await inlineConfirm($('#cookies-toolbar-all').parentElement, t('export_all_cookies_warning'), { danger: true, okLabel: t('export_all_cookies') });
  if (!r.ok) return;
  const byDomain = {};
  for (const c of cookies) (byDomain[c.domain] ||= []).push(c);
  downloadJson({ allDomains: true, cookiesByDomain: byDomain, totalCookies: cookies.length, exportedAt: new Date().toISOString() }, `all-cookies-${todayStamp()}.json`);
}

function setScope(s) {
  scope = s;
  $$('#view-cookies .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.scope === s));
  $('#cookies-toolbar-site').hidden = s !== 'site';
  $('#cookies-toolbar-all').hidden = s !== 'all';
  $('#all-warning').hidden = s !== 'all';
  $('#cookie-search').value = '';
  load();
}

function toggleGroups() {
  allExpanded = !allExpanded;
  if (!allExpanded) openGroups.clear();
  $('#btn-toggle-groups').textContent = t(allExpanded ? 'collapse_all' : 'expand_all');
  render();
}

// ---------------- 初始化 ----------------

export function initCookiesView() {
  $$('#view-cookies .seg-btn').forEach(b => b.addEventListener('click', () => setScope(b.dataset.scope)));
  $('#cookie-search').addEventListener('input', debounce(render, 120));
  $('#btn-add-cookie').addEventListener('click', () => openCookieEditor(null, { domain: ctx.hostname }, load));
  $('#btn-clear-site').addEventListener('click', clearSite);
  $('#btn-toggle-groups').addEventListener('click', toggleGroups);
  $('#btn-export-all-cookies').addEventListener('click', exportAll);
  onChange(what => { if (what === 'cookies' || what === 'data' || what === 'settings' || what === 'lang') load(); });
  return load();
}

/** 供导出本站 Cookie 使用。 */
export async function exportSiteCookies() {
  if (!ctx.hostname) { toast(t('no_site'), 'error'); return; }
  const list = await getCookiesForSite(ctx.hostname, ctx.settings.includeSubdomains);
  if (!list.length) { toast(t('no_cookies'), 'error'); return; }
  downloadJson({ domain: ctx.hostname, includesSubdomains: ctx.settings.includeSubdomains, cookies: list, exportedAt: new Date().toISOString() },
    `cookies-${ctx.hostname}-${todayStamp()}.json`);
}