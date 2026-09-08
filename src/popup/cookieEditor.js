// src/popup/cookieEditor.js —— Cookie 编辑抽屉（底部滑出）
// 同一个表单负责"编辑已有 Cookie"和"新增 Cookie"。
// 编辑时若改了名称/域名/路径，等于换了一把"钥匙"，需要先删旧的再写新的。

import { t } from '../lib/i18n.js';
import { $, toast } from '../lib/ui.js';
import { setCookie, removeCookie } from '../lib/cookies.js';
import { notify } from './context.js';

let editing = null;   // 正在编辑的原 Cookie（新增时为 null）
let onSaved = null;

const sheet = () => $('#sheet');

function secondsToLocalInput(sec) {
  if (!sec) return '';
  const d = new Date(sec * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToSeconds(v) {
  if (!v) return undefined;
  const ms = new Date(v).getTime();
  return Number.isNaN(ms) ? undefined : Math.floor(ms / 1000);
}

function fill(cookie) {
  $('#ck-name').value = cookie?.name || '';
  $('#ck-value').value = cookie?.value || '';
  $('#ck-domain').value = cookie?.domain || '';
  $('#ck-path').value = cookie?.path || '/';
  $('#ck-session').checked = cookie ? !!cookie.session : false;
  $('#ck-expires').value = cookie?.expirationDate ? secondsToLocalInput(cookie.expirationDate)
    : secondsToLocalInput(Math.floor(Date.now() / 1000) + 365 * 86400);
  $('#ck-secure').checked = cookie ? !!cookie.secure : true;
  $('#ck-httponly').checked = cookie ? !!cookie.httpOnly : false;
  $('#ck-samesite').value = cookie?.sameSite || 'unspecified';
  toggleExpires();
}

function toggleExpires() {
  $('#ck-expires-field').hidden = $('#ck-session').checked;
}

/**
 * 打开抽屉。
 * @param {object|null} cookie 已有 Cookie；null 表示新增
 * @param {object} defaults 新增时的默认值（如 { domain }）
 * @param {Function} cb 保存成功后的回调
 */
export function openCookieEditor(cookie, defaults = {}, cb) {
  editing = cookie || null;
  onSaved = cb || null;
  $('#sheet-title').textContent = cookie ? t('edit_cookie') : t('new_cookie');
  fill(cookie || { ...defaults, path: '/', secure: true });
  sheet().hidden = false;
  $('#ck-name').focus();
}

export function closeCookieEditor() {
  sheet().hidden = true;
  editing = null;
}

async function submit(e) {
  e.preventDefault();
  const name = $('#ck-name').value.trim();
  if (!name) { $('#ck-name').focus(); return; }
  const domainRaw = $('#ck-domain').value.trim();
  const session = $('#ck-session').checked;
  const next = {
    name,
    value: $('#ck-value').value,
    domain: domainRaw,
    // 用户输入的域名不带前导点 → 视为 hostOnly
    hostOnly: !!domainRaw && !domainRaw.startsWith('.'),
    path: $('#ck-path').value.trim() || '/',
    secure: $('#ck-secure').checked,
    httpOnly: $('#ck-httponly').checked,
    sameSite: $('#ck-samesite').value,
    session,
    expirationDate: session ? undefined : localInputToSeconds($('#ck-expires').value),
    storeId: editing?.storeId,
    partitionKey: editing?.partitionKey,
  };
  if (next.sameSite === 'no_restriction') next.secure = true; // Chrome 要求 None 必须 Secure

  // 钥匙变了 → 先删旧的
  if (editing && (editing.name !== next.name || editing.domain !== next.domain || editing.path !== next.path)) {
    await removeCookie(editing);
  }
  const r = await setCookie(next);
  if (!r.ok) { toast(t('cookie_save_failed', { error: r.error }), 'error'); return; }
  toast(t('cookie_saved'), 'success');
  closeCookieEditor();
  onSaved?.();
  notify('cookies');
}

export function initCookieEditor() {
  $('#cookie-form').addEventListener('submit', submit);
  $('#sheet-close').addEventListener('click', closeCookieEditor);
  $('#sheet-cancel').addEventListener('click', closeCookieEditor);
  $('.sheet-backdrop').addEventListener('click', closeCookieEditor);
  $('#ck-session').addEventListener('change', toggleExpires);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet().hidden) closeCookieEditor(); });
}