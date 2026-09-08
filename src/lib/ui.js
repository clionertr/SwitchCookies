// src/lib/ui.js —— 界面小工具
// 设计原则（"轮椅级"易用）：
//   - 不用浏览器原生 alert/confirm/prompt（会卡住弹窗、无法样式化）；
//   - 所有反馈都在弹窗内部：底部 toast 提示、卡片原地变确认条；
//   - 危险操作先给"撤销"机会，而不是先弹确认。

import { t } from './i18n.js';

/** 创建元素的简写：h('button', { class: 'btn', onclick: fn }, '文字', childEl) */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ---------- Toast ----------

let toastTimer = null;

/**
 * 底部提示。kind: info | success | error | progress
 * opts.action = { label, onClick } 可加一个按钮（如"撤销"）
 * opts.duration 毫秒；progress 类型默认不自动消失。
 */
export function toast(message, kind = 'info', opts = {}) {
  const host = $('#toast');
  if (!host) return;
  clearTimeout(toastTimer);
  host.innerHTML = '';
  host.className = `toast toast-${kind} show`;
  host.append(h('span', { class: 'toast-msg' }, message));
  if (opts.action) {
    host.append(h('button', { class: 'toast-action', onclick: () => { hideToast(); opts.action.onClick(); } }, opts.action.label));
  }
  const duration = opts.duration ?? (kind === 'progress' ? 0 : kind === 'error' ? 6000 : 3000);
  if (duration > 0) toastTimer = setTimeout(hideToast, duration);
}

export function hideToast() {
  const host = $('#toast');
  if (host) host.className = 'toast';
}

// ---------- 内嵌确认 ----------

/**
 * 在某个容器元素内原地显示确认条，返回 Promise<boolean>。
 * 用法：if (await inlineConfirm(card, t('delete_confirm', {name}), { danger: true })) ...
 * 期间容器原内容隐藏，Esc = 取消，Enter = 确认。
 */
export function inlineConfirm(container, message, opts = {}) {
  return new Promise(resolve => {
    const prev = Array.from(container.children);
    prev.forEach(c => c.hidden = true);
    let checkbox = null;
    const bar = h('div', { class: 'confirm-bar', role: 'alertdialog' },
      h('div', { class: 'confirm-msg' }, message),
      opts.checkboxLabel ? h('label', { class: 'check' }, (checkbox = h('input', { type: 'checkbox' })), h('span', {}, opts.checkboxLabel)) : null,
      h('div', { class: 'confirm-actions' },
        h('button', { class: `btn ${opts.danger ? 'btn-danger' : 'btn-primary'}`, onclick: () => done(true) }, opts.okLabel || t('confirm')),
        h('button', { class: 'btn btn-ghost', onclick: () => done(false) }, t('cancel')),
      ),
    );
    const onKey = (e) => { if (e.key === 'Escape') done(false); else if (e.key === 'Enter') done(true); };
    const done = (ok) => {
      document.removeEventListener('keydown', onKey);
      bar.remove();
      prev.forEach(c => c.hidden = false);
      resolve(ok ? { ok: true, checked: !!checkbox?.checked } : { ok: false, checked: false });
    };
    document.addEventListener('keydown', onKey);
    container.append(bar);
    bar.querySelector('button').focus();
  });
}

// ---------- 文件下载 / 读取 ----------

export function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function readFileAsJson(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => { try { resolve(JSON.parse(r.result)); } catch (e) { reject(e); } };
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

// ---------- 格式化 ----------

export function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return document.documentElement.lang === 'zh-CN' ? '刚刚' : 'just now';
  if (min < 60) return document.documentElement.lang === 'zh-CN' ? `${min} 分钟前` : `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return document.documentElement.lang === 'zh-CN' ? `${hr} 小时前` : `${hr} h ago`;
  return d.toLocaleDateString();
}

export function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

/** 简单防抖。 */
export function debounce(fn, ms = 200) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

/** 网站图标 URL：MV3 的 _favicon 路由，需要 manifest 声明 "favicon" 权限。 */
export function faviconUrl(pageUrl) {
  const u = new URL(chrome.runtime.getURL('/_favicon/'));
  u.searchParams.set('pageUrl', pageUrl);
  u.searchParams.set('size', '32');
  return u.toString();
}