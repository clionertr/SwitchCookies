// src/popup/main.js —— 弹窗入口
// 初始化顺序很重要：先主题（避免白屏闪烁）→ 语言 → 上下文（当前标签页）→ 各视图。

import { initContext, ctx } from './context.js';
import { setTheme } from '../lib/theme.js';
import { setLang, resolveLang, applyI18n, t } from '../lib/i18n.js';
import { $, $$, faviconUrl } from '../lib/ui.js';
import { initProfilesView } from './profilesView.js';
import { initCookiesView } from './cookiesView.js';
import { initCookieEditor } from './cookieEditor.js';
import { initMoreView } from './moreView.js';

function renderSiteBar() {
  const favicon = $('#site-favicon');
  const domainEl = $('#site-domain');
  const subEl = $('#site-sub');
  if (ctx.hostname) {
    domainEl.textContent = ctx.hostname;
    subEl.textContent = ctx.tab?.title || '';
    favicon.src = faviconUrl(ctx.url);
    favicon.hidden = false;
    favicon.onerror = () => { favicon.hidden = true; };
    document.body.classList.remove('no-site');
  } else {
    domainEl.textContent = t('no_site');
    subEl.textContent = '';
    favicon.hidden = true;
    document.body.classList.add('no-site');
  }
}

function initTabs() {
  const tabs = $$('.tab');
  const views = $$('.view');
  const activate = (name) => {
    tabs.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    views.forEach(v => v.classList.toggle('active', v.id === `view-${name}`));
    sessionStorage.setItem('sc_tab', name);
  };
  tabs.forEach(b => b.addEventListener('click', () => activate(b.dataset.tab)));
  // 记住上次停留的标签（同一浏览器会话内）
  const last = sessionStorage.getItem('sc_tab');
  if (last && tabs.some(b => b.dataset.tab === last)) activate(last);
}

async function boot() {
  await initContext();
  setTheme(ctx.settings.theme);
  setLang(resolveLang(ctx.settings.lang));
  applyI18n();
  if (ctx.inTab) document.body.classList.add('in-tab');

  renderSiteBar();
  initTabs();
  initCookieEditor();
  initMoreView();
  await Promise.all([initProfilesView(), initCookiesView()]);

  $('#btn-open-tab').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'open-in-tab', tabId: ctx.tab?.id });
    if (!ctx.inTab) window.close();
  });
}

boot().catch(err => {
  console.error('[SwitchCookies] boot failed', err);
  $('#site-domain').textContent = String(err?.message || err);
});