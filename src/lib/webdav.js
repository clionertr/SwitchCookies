// src/lib/webdav.js —— WebDAV 备份
// 比喻：WebDAV 是"网盘的通用插口"。坚果云、Nextcloud、群晖等都支持，
// 我们只做两件事：PUT 一个 JSON 文件上去，GET 它下来。

const FILE_NAME = 'switchcookies-profiles.json';
const CONFIG_KEY = 'webdavConfig'; // 与 v1 同名，配置无缝迁移

export async function getWebdavConfig() {
  const r = await chrome.storage.local.get(CONFIG_KEY);
  return r[CONFIG_KEY] || { url: '', username: '', password: '' };
}

export async function saveWebdavConfig(cfg) {
  await chrome.storage.local.set({ [CONFIG_KEY]: cfg });
}

function authHeader(cfg) {
  return 'Basic ' + btoa(`${cfg.username || ''}:${cfg.password || ''}`);
}

function fileUrl(cfg) {
  return cfg.url.replace(/\/+$/, '') + '/' + FILE_NAME;
}

/** 把响应状态翻译成错误码，UI 层再翻译成文案。 */
function classify(resp) {
  if (resp.status === 401 || resp.status === 403) return 'auth';
  if (resp.status === 404) return 'not_found';
  return 'http';
}

/** 上传全部配置。成功返回 { ok:true }，失败返回 { ok:false, code, detail }。 */
export async function uploadProfiles(cfg, profiles) {
  if (!cfg.url) return { ok: false, code: 'no_url' };
  const body = JSON.stringify({
    type: 'cookie_profiles',
    profiles,
    totalProfiles: Object.keys(profiles).length,
    exportedAt: new Date().toISOString(),
  }, null, 2);
  try {
    const resp = await fetch(fileUrl(cfg), {
      method: 'PUT',
      headers: { Authorization: authHeader(cfg), 'Content-Type': 'application/json' },
      body,
    });
    if (resp.ok) return { ok: true };
    return { ok: false, code: classify(resp), detail: `${resp.status} ${resp.statusText}` };
  } catch (e) {
    return { ok: false, code: 'network', detail: e?.message || String(e) };
  }
}

/** 下载配置。成功返回 { ok:true, profiles }。 */
export async function downloadProfiles(cfg) {
  if (!cfg.url) return { ok: false, code: 'no_url' };
  try {
    const resp = await fetch(fileUrl(cfg), { headers: { Authorization: authHeader(cfg) } });
    if (!resp.ok) return { ok: false, code: classify(resp), detail: `${resp.status} ${resp.statusText}` };
    const json = await resp.json();
    if (json?.type !== 'cookie_profiles' || !json.profiles) return { ok: false, code: 'format' };
    return { ok: true, profiles: json.profiles };
  } catch (e) {
    return { ok: false, code: 'network', detail: e?.message || String(e) };
  }
}