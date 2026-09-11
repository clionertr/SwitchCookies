// src/popup/importPage.js —— 独立导入窗口
// Chrome 扩展弹窗一旦失焦就会销毁，系统文件框会抢走焦点，导致「导入文件」看起来没反应。
// 这个页面跑在 chrome.windows popup 里，选文件 / 拖入都能活到导入结束。

import { t, setLang, resolveLang, applyI18n } from '../lib/i18n.js';
import { toast } from '../lib/ui.js';
import { getSettings } from '../lib/storage.js';
import { setTheme } from '../lib/theme.js';
import { extractHostname } from '../lib/domain.js';
import { importSwitchCookiesFile } from '../lib/importFile.js';

function isWebUrl(url) {
  return /^https?:\/\//i.test(url || '');
}

async function resolveTarget() {
  const id = Number(new URLSearchParams(location.search).get('tabId'));
  if (id) {
    try {
      const tab = await chrome.tabs.get(id);
      const url = tab?.url || '';
      return {
        hostname: isWebUrl(url) ? extractHostname(url) : '',
        tabId: tab?.id,
      };
    } catch { /* 原标签已关，不改用其他网页 */ }
  }
  return {};
}

let importing = false;

async function handleFile(file, target) {
  if (importing) return;
  importing = true;
  const input = document.getElementById('import-file');
  input.disabled = true;
  try {
    const r = await importSwitchCookiesFile(file, target);
    toast(t(r.key, r.vars), r.kind, { duration: 0 });
  } catch (e) {
    toast(t('save_failed', { error: e.message }), 'error', { duration: 0 });
  } finally {
    importing = false;
    input.disabled = false;
  }
}

async function boot() {
  const settings = await getSettings();
  setTheme(settings.theme);
  setLang(resolveLang(settings.lang));
  applyI18n();
  document.title = t('import_file');

  const target = await resolveTarget();
  const input = document.getElementById('import-file');
  const zone = document.getElementById('drop-zone');

  input.addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) await handleFile(f, target);
  });

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', async (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const f = e.dataTransfer?.files?.[0];
    if (f) await handleFile(f, target);
  });
}

boot().catch((err) => {
  console.error('[SwitchCookies] import page failed', err);
  toast(t('save_failed', { error: err.message }), 'error', { duration: 0 });
});
