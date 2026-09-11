// src/popup/moreView.js —— "更多"标签页：数据 / WebDAV / 网络 / 外观 / 高级

import { ctx, notify, onChange, setSetting } from './context.js';
import { t, setLang, resolveLang, applyI18n } from '../lib/i18n.js';
import { $, $$, h, toast, downloadJson, todayStamp } from '../lib/ui.js';
import { getProfiles, mergeProfiles, getStorageUsage, formatBytes } from '../lib/storage.js';
import { getWebdavConfig, saveWebdavConfig, uploadProfiles, downloadProfiles } from '../lib/webdav.js';
import { fetchIpInfo } from '../lib/ipinfo.js';
import { setTheme } from '../lib/theme.js';
import { importSwitchCookiesFile } from '../lib/importFile.js';
import { exportSiteCookies } from './cookiesView.js';

// ---------------- 导入 / 导出 ----------------

async function exportProfiles() {
  const profiles = await getProfiles();
  if (!Object.keys(profiles).length) { toast(t('empty_title'), 'error'); return; }
  downloadJson({ type: 'cookie_profiles', profiles, totalProfiles: Object.keys(profiles).length, exportedAt: new Date().toISOString() },
    `switchcookies-profiles-${todayStamp()}.json`);
}

async function handleImport(file) {
  try {
    const r = await importSwitchCookiesFile(file, { hostname: ctx.hostname, tabId: ctx.tab?.id });
    toast(t(r.key, r.vars), r.kind);
    if (r.notify) notify(r.notify);
  } catch (e) {
    toast(t('save_failed', { error: e.message }), 'error');
  }
}

/** 弹窗失焦即销毁；系统文件框会抢走焦点，必须换到独立窗口才能选文件。 */
async function openImportWindow() {
  const url = chrome.runtime.getURL(`import.html?tabId=${ctx.tab?.id ?? ''}`);
  await chrome.windows.create({ url, type: 'popup', width: 420, height: 340, focused: true });
}

// ---------------- WebDAV ----------------

async function loadWebdav() {
  const cfg = await getWebdavConfig();
  $('#webdav-url').value = cfg.url || '';
  $('#webdav-user').value = cfg.username || '';
  $('#webdav-pass').value = cfg.password || '';
}

function readWebdavForm() {
  return { url: $('#webdav-url').value.trim(), username: $('#webdav-user').value.trim(), password: $('#webdav-pass').value };
}

async function webdavSave() {
  const cfg = readWebdavForm();
  if (!cfg.url) { toast(t('webdav_url_required'), 'error'); return; }
  await saveWebdavConfig(cfg);
  toast(t('webdav_saved'), 'success');
}

function webdavErr(r) {
  if (r.code === 'no_url') return t('webdav_url_required');
  if (r.code === 'auth') return t('webdav_auth_failed');
  if (r.code === 'not_found') return t('webdav_not_found');
  if (r.code === 'format') return t('import_invalid');
  return t('webdav_error', { error: r.detail || r.code });
}

async function webdavUpload() {
  const cfg = readWebdavForm();
  await saveWebdavConfig(cfg);
  toast(t('webdav_uploading'), 'progress');
  const r = await uploadProfiles(cfg, await getProfiles());
  toast(r.ok ? t('webdav_uploaded') : webdavErr(r), r.ok ? 'success' : 'error');
}

async function webdavDownload() {
  const cfg = readWebdavForm();
  await saveWebdavConfig(cfg);
  toast(t('webdav_downloading'), 'progress');
  const r = await downloadProfiles(cfg);
  if (!r.ok) { toast(webdavErr(r), 'error'); return; }
  try {
    const m = await mergeProfiles(r.profiles);
    toast(t('imported_profiles', m), 'success');
    notify('profiles');
  } catch (e) {
    toast(t('save_failed', { error: e.message }), 'error');
  }
}

// ---------------- IP ----------------

async function checkIp() {
  const btn = $('#btn-ip');
  const box = $('#ip-result');
  btn.disabled = true; btn.textContent = t('ip_loading');
  const r = await fetchIpInfo();
  btn.disabled = false; btn.textContent = t('ip_check');
  if (!r.ok) { toast(t('ip_failed'), 'error'); return; }
  const ip = r.ip || {};
  const rows = [['IP', ip.ip], ['City', ip.city], ['Country', ip.country], ['Org', ip.organization], ['TZ', ip.timezone]];
  if (r.risk) rows.push([t('ip_risk'), `${r.risk.risk ?? ''} (${r.risk.score ?? '?'}/100)`]);
  box.replaceChildren(...rows.filter(([, v]) => v).flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, String(v))]));
  box.hidden = false;
}

// ---------------- 外观 / 高级 ----------------

function syncThemeSeg() {
  $$('#theme-seg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === ctx.settings.theme));
}

async function refreshUsage() {
  const { used, quota } = await getStorageUsage();
  $('#storage-usage').textContent = quota ? t('storage_usage_quota', { used: formatBytes(used), quota: formatBytes(quota) }) : t('storage_usage', { used: formatBytes(used) });
}

function syncSettingsUI() {
  syncThemeSeg();
  $('#lang-select').value = ctx.settings.lang || 'auto';
  $('#set-ls').checked = ctx.settings.captureLocalStorage;
  $('#set-ss').checked = ctx.settings.captureSessionStorage;
  $('#set-idb').checked = ctx.settings.captureIndexedDB;
  $('#version').textContent = t('version', { v: chrome.runtime.getManifest().version });
  refreshUsage();
}

// ---------------- 初始化 ----------------

export function initMoreView() {
  const fileInput = $('#import-file');
  $('#btn-import').addEventListener('click', async () => {
    // 独立标签页不会因失焦销毁，可以直接唤起系统文件框
    if (ctx.inTab) {
      fileInput.click();
      return;
    }
    try {
      await openImportWindow();
      window.close();
    } catch (e) {
      toast(t('save_failed', { error: e.message }), 'error');
    }
  });
  fileInput.addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) await handleImport(f);
  });

  const dataCard = $('#data-card');
  if (dataCard) {
    dataCard.addEventListener('dragover', (e) => {
      e.preventDefault();
      dataCard.classList.add('dragover');
    });
    dataCard.addEventListener('dragleave', () => dataCard.classList.remove('dragover'));
    dataCard.addEventListener('drop', async (e) => {
      e.preventDefault();
      dataCard.classList.remove('dragover');
      const f = e.dataTransfer?.files?.[0];
      if (f) await handleImport(f);
    });
  }
  $('#btn-export-profiles').addEventListener('click', exportProfiles);
  $('#btn-export-site').addEventListener('click', exportSiteCookies);

  $('#webdav-save').addEventListener('click', webdavSave);
  $('#webdav-upload').addEventListener('click', webdavUpload);
  $('#webdav-download').addEventListener('click', webdavDownload);

  $('#btn-ip').addEventListener('click', checkIp);

  $$('#theme-seg .seg-btn').forEach(b => b.addEventListener('click', async () => {
    await setSetting({ theme: b.dataset.theme });
    setTheme(b.dataset.theme);
    syncThemeSeg();
  }));
  $('#lang-select').addEventListener('change', async (e) => {
    await setSetting({ lang: e.target.value });
    setLang(resolveLang(e.target.value));
    applyI18n();
    notify('lang');
    syncSettingsUI();
  });
  $('#set-ls').addEventListener('change', e => setSetting({ captureLocalStorage: e.target.checked }));
  $('#set-ss').addEventListener('change', e => setSetting({ captureSessionStorage: e.target.checked }));
  $('#set-idb').addEventListener('change', e => setSetting({ captureIndexedDB: e.target.checked }));
  $('#btn-reset-confirms').addEventListener('click', async () => {
    await setSetting({ skipReplaceConfirm: false });
    toast(t('reset_confirms_done'), 'success');
  });

  onChange(what => { if (what === 'profiles' || what === 'data') refreshUsage(); });
  loadWebdav();
  syncSettingsUI();
}