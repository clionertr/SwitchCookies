// src/lib/storage.js —— 配置（Profile）与设置的持久化
// 比喻：chrome.storage.local 是扩展自己的"抽屉"。旧版的问题（issue #2）是：
// 抽屉塞满了，塞不进去，却还告诉你"放好了"。这里所有写入都走 Promise，
// 失败会真正抛出异常，由 UI 层提示用户。

const PROFILES_KEY = 'cookieProfiles';   // 与 v1 保持同名，老用户数据无缝迁移
const SETTINGS_KEY = 'settings';

/** 默认设置。 */
export const DEFAULT_SETTINGS = {
  includeSubdomains: true,
  theme: 'system',            // system | light | dark
  lang: 'auto',               // auto | zh-CN | en-US
  captureLocalStorage: true,
  captureSessionStorage: true,
  captureIndexedDB: false,    // 默认关：大数据站点写回慢，用户按需开启
  skipReplaceConfirm: false,
};

// ---------- 底层封装 ----------

async function storageGet(keys) {
  return chrome.storage.local.get(keys);
}

/** 写入并检查 lastError；chrome.storage 的 Promise 版本在超配额时会 reject。 */
async function storageSet(obj) {
  await chrome.storage.local.set(obj);
  if (chrome.runtime.lastError) {
    throw new Error(chrome.runtime.lastError.message);
  }
}

// ---------- 设置 ----------

export async function getSettings() {
  const r = await storageGet(SETTINGS_KEY);
  const saved = r[SETTINGS_KEY] || {};
  // 兼容 v1 的散落键
  const legacy = await storageGet(['includeSubdomains', 'nightMode', 'disableReplaceWarnings']);
  const merged = { ...DEFAULT_SETTINGS, ...saved };
  if (saved.includeSubdomains === undefined && typeof legacy.includeSubdomains === 'boolean') {
    merged.includeSubdomains = legacy.includeSubdomains;
  }
  if (saved.theme === undefined && typeof legacy.nightMode === 'boolean') {
    merged.theme = legacy.nightMode ? 'dark' : 'light';
  }
  if (saved.skipReplaceConfirm === undefined && legacy.disableReplaceWarnings) {
    merged.skipReplaceConfirm = true;
  }
  return merged;
}

export async function updateSettings(patch) {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await storageSet({ [SETTINGS_KEY]: next });
  return next;
}

// ---------- 配置 ----------

/** 返回 { name: profile } 字典。 */
export async function getProfiles() {
  const r = await storageGet(PROFILES_KEY);
  return r[PROFILES_KEY] || {};
}

/** 整体写回；失败抛错。 */
export async function saveProfiles(profiles) {
  await storageSet({ [PROFILES_KEY]: profiles });
}

/** 新增或覆盖一个配置。 */
export async function upsertProfile(name, profile) {
  const profiles = await getProfiles();
  profiles[name] = profile;
  await saveProfiles(profiles);
  return profiles;
}

export async function deleteProfile(name) {
  const profiles = await getProfiles();
  const removed = profiles[name];
  delete profiles[name];
  await saveProfiles(profiles);
  return removed; // 用于"撤销删除"
}

export async function renameProfile(oldName, newName) {
  const profiles = await getProfiles();
  if (!profiles[oldName]) throw new Error('profile not found');
  if (profiles[newName] && newName !== oldName) throw new Error('name exists');
  profiles[newName] = profiles[oldName];
  if (newName !== oldName) delete profiles[oldName];
  await saveProfiles(profiles);
}

/** 导入合并：返回新增/覆盖数量。 */
export async function mergeProfiles(incoming) {
  const profiles = await getProfiles();
  let added = 0, replaced = 0;
  for (const [name, p] of Object.entries(incoming || {})) {
    if (profiles[name]) replaced++; else added++;
    profiles[name] = p;
  }
  await saveProfiles(profiles);
  return { added, replaced };
}

// ---------- 用量 ----------

/** 估算某个对象序列化后的字节数。 */
export function estimateBytes(obj) {
  try {
    return new TextEncoder().encode(JSON.stringify(obj)).length;
  } catch {
    return 0;
  }
}

/** 返回 { used, quota }。声明了 unlimitedStorage 时 quota 为 null（表示无固定上限）。 */
export async function getStorageUsage() {
  const used = await chrome.storage.local.getBytesInUse(null);
  const hasUnlimited = chrome.runtime.getManifest().permissions?.includes('unlimitedStorage');
  const quota = hasUnlimited ? null : (chrome.storage.local.QUOTA_BYTES || 10 * 1024 * 1024);
  return { used, quota };
}

/** 人类可读的字节数。 */
export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}