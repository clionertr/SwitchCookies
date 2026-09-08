// src/popup/profilesView.js —— "账号"标签页
// 交互目标：打开弹窗 3 秒内看懂——上方一个大按钮"保存当前登录"，
// 下方本站账号置顶，每个账号一个显眼的"切换"按钮，其余动作收进 ⋯ 菜单。

import { ctx, notify, onChange, reloadTargetTab, setSetting } from './context.js';
import { t } from '../lib/i18n.js';
import { $, h, toast, inlineConfirm, downloadJson, formatTime, debounce, todayStamp } from '../lib/ui.js';
import { getCookiesForSite, replaceSiteCookies } from '../lib/cookies.js';
import { getProfiles, upsertProfile, deleteProfile, renameProfile } from '../lib/storage.js';
import { probePageStorage, capturePageStorage, restorePageStorage } from '../lib/pageStorage.js';
import { isRelatedDomain, extractRootDomain } from '../lib/domain.js';

let profiles = {};
let openMenu = null;

// ---------------- 保存表单 ----------------

const form = () => $('#save-form');

function suggestName() {
  const root = extractRootDomain(ctx.hostname) || ctx.hostname;
  const n = Object.values(profiles).filter(p => isRelatedDomain(p.domain, ctx.hostname)).length + 1;
  return `${root} #${n}`;
}

async function openSaveForm() {
  if (!ctx.hostname) { toast(t('no_site'), 'error'); return; }
  const f = form();
  $('#btn-save').hidden = true;
  f.hidden = false;
  $('#save-name').value = suggestName();
  $('#save-subdomains').checked = ctx.settings.includeSubdomains;
  $('#save-ls').checked = ctx.settings.captureLocalStorage;
  $('#save-ss').checked = ctx.settings.captureSessionStorage;
  $('#save-idb').checked = ctx.settings.captureIndexedDB;
  $('#save-name-warn').hidden = true;
  ['ls', 'ss', 'idb'].forEach(k => { $(`#save-${k}-count`).textContent = ''; });
  $('#save-name').focus();
  $('#save-name').select();

  // 探测页面存储规模；检测到 IndexedDB 时自动勾上并展开高级区
  const probe = await probePageStorage(ctx.tab?.id);
  if (f.hidden) return;
  $('#save-ls-count').textContent = probe.localStorageKeys || '';
  $('#save-ss-count').textContent = probe.sessionStorageKeys || '';
  $('#save-idb-count').textContent = probe.idbDatabases ? t('capture_idb_hint', { n: probe.idbDatabases }) : '';
  if (probe.idbDatabases > 0) { $('#save-idb').checked = true; f.querySelector('details').open = true; }
}

function closeSaveForm() {
  form().hidden = true;
  $('#btn-save').hidden = false;
}

function checkNameWarn() {
  const name = $('#save-name').value.trim();
  const warn = $('#save-name-warn');
  if (name && profiles[name]) { warn.textContent = t('name_exists'); warn.hidden = false; }
  else warn.hidden = true;
}

/**
 * 真正执行保存：抓 Cookie（+ 页面存储）→ 写入 storage。
 * 保存失败（含配额超限）会 toast 报错，绝不静默——这是 issue #2 的修复点。
 * @returns {Promise<boolean>} 是否成功
 */
async function doSave(name, includeSubdomains, opts) {
  toast(t('saving'), 'progress');
  try {
    await setSetting({ includeSubdomains });
    const cookies = await getCookiesForSite(ctx.hostname, includeSubdomains);
    const storage = (opts.ls || opts.ss || opts.idb) ? await capturePageStorage(ctx.tab?.id, opts) : null;
    const now = new Date().toISOString();
    const profile = {
      domain: ctx.hostname,
      includesSubdomains: includeSubdomains,
      cookies,
      createdAt: profiles[name]?.createdAt || now,
      updatedAt: now,
    };
    if (storage && !storage.unavailable) {
      if (opts.ls) profile.localStorage = storage.localStorage;
      if (opts.ss) profile.sessionStorage = storage.sessionStorage;
      if (opts.idb && storage.indexedDB.length) profile.indexedDB = storage.indexedDB;
    }
    await upsertProfile(name, profile);
    const skipped = storage ? storage.skipped.entries + storage.skipped.records + storage.skipped.databases.length : 0;
    toast(t('saved', { name }) + (skipped ? `（${t('skipped_notice', { n: skipped })}）` : ''), 'success');
    notify('profiles');
    return true;
  } catch (err) {
    const msg = String(err?.message || err);
    toast(/quota|QUOTA/i.test(msg) ? t('save_failed_quota') : t('save_failed', { error: msg }), 'error');
    return false;
  }
}

async function submitSave(e) {
  e.preventDefault();
  const name = $('#save-name').value.trim();
  if (!name) { toast(t('name_required'), 'error'); $('#save-name').focus(); return; }
  const includeSubdomains = $('#save-subdomains').checked;
  const opts = { ls: $('#save-ls').checked, ss: $('#save-ss').checked, idb: $('#save-idb').checked };
  const btn = $('#save-submit');
  btn.disabled = true;
  const ok = await doSave(name, includeSubdomains, opts);
  btn.disabled = false;
  if (ok) closeSaveForm();
}

// ---------------- 切换 / 覆盖 / 删除 / 重命名 ----------------

async function switchTo(name, card) {
  const p = profiles[name];
  if (!p) return;
  if (!ctx.hostname) { toast(t('no_site'), 'error'); return; }
  if (!isRelatedDomain(p.domain, ctx.hostname)) {
    const r = await inlineConfirm(card, t('switch_other_site', { domain: p.domain, current: ctx.hostname }));
    if (!r.ok) return;
  }
  toast(t('switching', { name }), 'progress');
  const stat = await replaceSiteCookies(ctx.hostname, p.includesSubdomains !== false, p.cookies || []);
  let idbBlocked = 0;
  if (p.localStorage || p.sessionStorage || p.indexedDB) {
    const rep = await restorePageStorage(ctx.tab?.id, { localStorage: p.localStorage, sessionStorage: p.sessionStorage, indexedDB: p.indexedDB });
    idbBlocked = (rep.idbBlocked || []).length + (rep.idbFailed || []).length;
  }
  await reloadTargetTab();
  const allOk = stat.ok === stat.total;
  let msg = allOk ? t('switched', { name }) : t('switched_partial', { name, ok: stat.ok, total: stat.total });
  if (idbBlocked) msg += ' · ' + t('idb_blocked', { n: idbBlocked });
  toast(msg, allOk && !idbBlocked ? 'success' : 'info', { duration: 5000 });
  notify('cookies');
}

async function overwrite(name, card) {
  if (!ctx.settings.skipReplaceConfirm) {
    const r = await inlineConfirm(card, t('overwrite_confirm', { name }), { checkboxLabel: t('dont_ask_again'), okLabel: t('overwrite') });
    if (!r.ok) return;
    if (r.checked) await setSetting({ skipReplaceConfirm: true });
  }
  if (!ctx.hostname) { toast(t('no_site'), 'error'); return; }
  const old = profiles[name];
  // 沿用该账号原来的抓取范围
  await doSave(name, old.includesSubdomains !== false, { ls: !!old.localStorage, ss: !!old.sessionStorage, idb: !!old.indexedDB });
}

async function remove(name, card) {
  const r = await inlineConfirm(card, t('delete_confirm', { name }), { danger: true, okLabel: t('delete') });
  if (!r.ok) return;
  const removed = await deleteProfile(name);
  notify('profiles');
  toast(t('deleted', { name }), 'info', {
    duration: 6000,
    action: { label: t('undo'), onClick: async () => { await upsertProfile(name, removed); notify('profiles'); toast(t('restored', { name }), 'success'); } },
  });
}

function rename(name, card) {
  const nameEl = card.querySelector('.profile-name');
  const input = h('input', { type: 'text', value: name, class: 'rename-input', maxlength: 60 });
  nameEl.replaceWith(input);
  input.focus(); input.select();
  let done = false;
  const finish = async (commit) => {
    if (done) return; done = true;
    const next = input.value.trim();
    if (commit && next && next !== name) {
      try { await renameProfile(name, next); notify('profiles'); return; }
      catch { toast(t('name_exists'), 'error'); }
    }
    notify('profiles');
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') finish(true); if (e.key === 'Escape') finish(false); });
  input.addEventListener('blur', () => finish(true));
}

function exportOne(name) {
  const p = profiles[name];
  downloadJson({ type: 'cookie_profiles', profiles: { [name]: p }, totalProfiles: 1, exportedAt: new Date().toISOString() }, `switchcookies-${name}-${todayStamp()}.json`);
}

// ---------------- 渲染 ----------------

function closeMenu() { if (openMenu) { openMenu.remove(); openMenu = null; } }

function card(name, p, match) {
  const el = h('div', { class: `profile${match ? ' match' : ''}`, dataset: { name } });
  const meta = h('div', { class: 'profile-meta' },
    h('span', {}, t('cookies_count', { n: (p.cookies || []).length })),
    !match ? h('span', { class: 'tag' }, p.domain) : null,
    p.includesSubdomains !== false ? h('span', { class: 'tag' }, '*.' + extractRootDomain(p.domain)) : null,
    p.localStorage ? h('span', { class: 'tag' }, 'LS') : null,
    p.sessionStorage ? h('span', { class: 'tag' }, 'SS') : null,
    p.indexedDB ? h('span', { class: 'tag' }, 'IDB') : null,
    h('span', {}, t('saved_at', { time: formatTime(p.updatedAt || p.createdAt) })),
  );
  const menuBtn = h('button', { class: 'icon-btn', 'aria-label': 'more' }, '⋯');
  const menuWrap = h('div', { class: 'menu-wrap' }, menuBtn);
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = openMenu && openMenu.parentElement === menuWrap;
    closeMenu();
    if (wasOpen) return;
    const menu = h('div', { class: 'menu' },
      h('button', { onclick: () => { closeMenu(); overwrite(name, el); } }, '🔁 ' + t('overwrite')),
      h('button', { onclick: () => { closeMenu(); rename(name, el); } }, '✏️ ' + t('rename')),
      h('button', { onclick: () => { closeMenu(); exportOne(name); } }, '⬇️ ' + t('export_one')),
      h('button', { class: 'danger', onclick: () => { closeMenu(); remove(name, el); } }, '🗑 ' + t('delete')),
    );
    menuWrap.append(menu);
    openMenu = menu;
  });
  el.append(
    h('div', { class: 'profile-main' }, h('div', { class: 'profile-name', title: name }, name), meta),
    h('div', { class: 'profile-actions' },
      h('button', { class: `btn btn-switch ${match ? 'btn-primary' : ''}`, onclick: () => switchTo(name, el) }, t('switch')),
      menuWrap,
    ),
  );
  return el;
}

function render() {
  closeMenu();
  const q = $('#profile-search').value.trim().toLowerCase();
  const entries = Object.entries(profiles).filter(([n, p]) => !q || n.toLowerCase().includes(q) || (p.domain || '').toLowerCase().includes(q));
  const site = [], other = [];
  for (const [n, p] of entries) (ctx.hostname && isRelatedDomain(p.domain, ctx.hostname) ? site : other).push([n, p]);
  const byTime = (a, b) => (b[1].updatedAt || b[1].createdAt || '').localeCompare(a[1].updatedAt || a[1].createdAt || '');
  site.sort(byTime); other.sort(byTime);

  const total = Object.keys(profiles).length;
  $('#profiles-empty').hidden = total > 0;
  $('#profiles-nomatch').hidden = !(total > 0 && entries.length === 0);

  const siteGroup = $('#profiles-site');
  siteGroup.hidden = site.length === 0;
  const siteList = siteGroup.querySelector('.list');
  siteList.replaceChildren(...site.map(([n, p]) => card(n, p, true)));

  const otherGroup = $('#profiles-other');
  otherGroup.hidden = other.length === 0;
  otherGroup.querySelector('.count').textContent = other.length ? `(${other.length})` : '';
  otherGroup.querySelector('.list').replaceChildren(...other.map(([n, p]) => card(n, p, false)));
  // 没有本站账号时，其他网站自动展开，避免"看起来是空的"
  if (site.length === 0 && other.length > 0) otherGroup.open = true;
}

export async function refreshProfiles() {
  profiles = await getProfiles();
  render();
}

// ---------------- 初始化 ----------------

export function initProfilesView() {
  $('#btn-save').addEventListener('click', openSaveForm);
  $('#save-cancel').addEventListener('click', closeSaveForm);
  form().addEventListener('submit', submitSave);
  form().addEventListener('keydown', e => { if (e.key === 'Escape') closeSaveForm(); });
  $('#save-name').addEventListener('input', checkNameWarn);
  $('#profile-search').addEventListener('input', debounce(render, 120));
  document.addEventListener('click', closeMenu);
  onChange(what => { if (what === 'profiles' || what === 'data' || what === 'lang') refreshProfiles(); });
  return refreshProfiles();
}