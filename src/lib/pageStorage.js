// src/lib/pageStorage.js —— 页面端存储（localStorage / sessionStorage / IndexedDB）
// 比喻：Cookie 是网站发给你的"会员卡"，而 localStorage / IndexedDB 是网站
// 寄放在你浏览器里的"储物柜"。有些网站（issue #1）把登录态放在储物柜而不是卡上，
// 所以切换账号也得把储物柜里的东西一起换掉。
//
// 实现方式：通过 chrome.scripting.executeScript 把函数"空投"到网页里执行。
// 注意：被注入的函数必须自包含（不能引用本文件其他变量），返回值必须可 JSON 序列化。

/** 单条 localStorage/sessionStorage 值的上限，超过则跳过（issue #2 防御措施）。 */
export const MAX_ENTRY_BYTES = 512 * 1024;
/** IndexedDB 单个数据库序列化后的上限，超过则跳过并提示。 */
export const MAX_IDB_DB_BYTES = 20 * 1024 * 1024;

// ============ 注入函数 1：探测（决定保存表单里 IndexedDB 复选框默认值） ============
function probeInPage() {
  const out = { localStorageKeys: localStorage.length, sessionStorageKeys: sessionStorage.length, idbDatabases: 0 };
  if (!('indexedDB' in window) || typeof indexedDB.databases !== 'function') return Promise.resolve(out);
  return indexedDB.databases().then(list => {
    out.idbDatabases = (list || []).filter(d => d.name).length;
    return out;
  }).catch(() => out);
}

// ============ 注入函数 2：抓取 ============
function captureInPage(opts) {
  const { ls, ss, idb, maxEntryBytes, maxDbBytes } = opts;
  const result = { localStorage: {}, sessionStorage: {}, indexedDB: [], skipped: { entries: 0, records: 0, databases: [] } };

  const byteLen = (s) => { try { return new TextEncoder().encode(s).length; } catch { return s.length * 2; } };

  const dumpStorage = (store) => {
    const o = {};
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      const v = store.getItem(k);
      if (v !== null && byteLen(v) > maxEntryBytes) { result.skipped.entries++; continue; }
      o[k] = v;
    }
    return o;
  };
  if (ls) result.localStorage = dumpStorage(localStorage);
  if (ss) result.sessionStorage = dumpStorage(sessionStorage);
  if (!idb || !('indexedDB' in window) || typeof indexedDB.databases !== 'function') return Promise.resolve(result);

  // ---- IndexedDB 值序列化：Date / ArrayBuffer / TypedArray 打标签，Blob 等无法序列化的整条记录跳过 ----
  const bufToB64 = (buf) => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
  class Unsupported extends Error {}
  const encode = (v) => {
    if (v === null || typeof v !== 'object') {
      if (typeof v === 'undefined') return { __t: 'undef' };
      if (typeof v === 'bigint') return { __t: 'bigint', v: v.toString() };
      return v;
    }
    if (v instanceof Date) return { __t: 'date', v: v.toISOString() };
    if (v instanceof ArrayBuffer) return { __t: 'bin', k: 'ArrayBuffer', v: bufToB64(v) };
    if (ArrayBuffer.isView(v)) return { __t: 'bin', k: v.constructor.name, v: bufToB64(v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength)) };
    if (v instanceof Blob || v instanceof File || v instanceof ImageBitmap) throw new Unsupported('blob');
    if (v instanceof Map) return { __t: 'map', v: Array.from(v.entries()).map(([k, x]) => [encode(k), encode(x)]) };
    if (v instanceof Set) return { __t: 'set', v: Array.from(v).map(encode) };
    if (Array.isArray(v)) return v.map(encode);
    const o = {};
    for (const k of Object.keys(v)) o[k] = encode(v[k]);
    return o;
  };

  const dumpDb = (info) => new Promise((resolve) => {
    const req = indexedDB.open(info.name);
    const done = (val) => { try { req.result && req.result.close(); } catch {} resolve(val); };
    req.onerror = () => done(null);
    req.onblocked = () => done(null);
    req.onsuccess = () => {
      const db = req.result;
      const names = Array.from(db.objectStoreNames);
      const dump = { name: db.name, version: db.version, stores: [] };
      if (names.length === 0) return done(dump);
      const tx = db.transaction(names, 'readonly');
      let pending = names.length;
      tx.onerror = () => done(null);
      names.forEach(sn => {
        const st = tx.objectStore(sn);
        const meta = {
          name: sn, keyPath: st.keyPath, autoIncrement: st.autoIncrement,
          indexes: Array.from(st.indexNames).map(ix => { const i = st.index(ix); return { name: i.name, keyPath: i.keyPath, unique: i.unique, multiEntry: i.multiEntry }; }),
          records: []
        };
        const rk = st.getAllKeys(); const rv = st.getAll();
        let got = 0; let keys, vals;
        const finish = () => {
          if (++got < 2) return;
          for (let i = 0; i < vals.length; i++) {
            try { meta.records.push({ k: encode(keys[i]), v: encode(vals[i]) }); }
            catch { result.skipped.records++; }
          }
          dump.stores.push(meta);
          if (--pending === 0) done(dump);
        };
        rk.onsuccess = () => { keys = rk.result; finish(); };
        rv.onsuccess = () => { vals = rv.result; finish(); };
        rk.onerror = rv.onerror = () => { if (--pending === 0) done(dump); };
      });
    };
  });

  return indexedDB.databases().then(list => Promise.all((list || []).filter(d => d.name).map(dumpDb))).then(dbs => {
    for (const db of dbs) {
      if (!db) continue;
      if (byteLen(JSON.stringify(db)) > maxDbBytes) { result.skipped.databases.push(db.name); continue; }
      result.indexedDB.push(db);
    }
    return result;
  }).catch(() => result);
}

// ============ 注入函数 3：写回 ============
function restoreInPage(data) {
  const report = { ls: false, ss: false, idbOk: 0, idbBlocked: [], idbFailed: [] };
  try {
    if (data.localStorage) { localStorage.clear(); for (const [k, v] of Object.entries(data.localStorage)) localStorage.setItem(k, v); report.ls = true; }
    if (data.sessionStorage) { sessionStorage.clear(); for (const [k, v] of Object.entries(data.sessionStorage)) sessionStorage.setItem(k, v); report.ss = true; }
  } catch (e) { report.error = String(e); }
  const dbs = data.indexedDB || [];
  if (!dbs.length || !('indexedDB' in window)) return Promise.resolve(report);

  const b64ToBuf = (s) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < u.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
  const decode = (v) => {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(decode);
    if (typeof v.__t === 'string') {
      switch (v.__t) {
        case 'undef': return undefined;
        case 'bigint': return BigInt(v.v);
        case 'date': return new Date(v.v);
        case 'map': return new Map(v.v.map(([k, x]) => [decode(k), decode(x)]));
        case 'set': return new Set(v.v.map(decode));
        case 'bin': { const buf = b64ToBuf(v.v); if (v.k === 'ArrayBuffer') return buf; const C = window[v.k]; return C ? new C(buf) : buf; }
      }
    }
    const o = {};
    for (const k of Object.keys(v)) o[k] = decode(v[k]);
    return o;
  };

  // 写回策略（"不拆房子，只换东西"）：
  //   IndexedDB 只有 deleteDatabase 和版本升级需要独占，页面若握着连接就会 blocked；
  //   而普通 readwrite 事务可以与页面连接并存。因此：
  //   1) 用当前版本打开 → 需要的 store 都在 → clear + put，零阻塞（同站切账号几乎总走这条）；
  //   2) 缺 store 才做版本升级补建，此时向页面连接发 versionchange，规范的库会自动让路；
  //      仍被占用超过 1.5 秒才报 idbBlocked。
  const restoreDb = (db) => new Promise((resolve) => {
    let settled = false;
    const finish = (kind) => { if (settled) return; settled = true; if (kind === 'ok') report.idbOk++; else report[kind].push(db.name); resolve(); };

    const writeRecords = (d) => {
      const names = db.stores.map(s => s.name);
      if (!names.length) { d.close(); return finish('ok'); }
      let tx;
      try { tx = d.transaction(names, 'readwrite'); } catch { d.close(); return finish('idbFailed'); }
      for (const s of db.stores) {
        const st = tx.objectStore(s.name);
        st.clear();
        for (const r of s.records) {
          try { if (s.keyPath !== null && s.keyPath !== undefined) st.put(decode(r.v)); else st.put(decode(r.v), decode(r.k)); } catch {}
        }
      }
      tx.oncomplete = () => { d.close(); finish('ok'); };
      tx.onerror = () => { d.close(); finish('idbFailed'); };
      tx.onabort = () => { d.close(); finish('idbFailed'); };
    };

    const ensureStores = (d) => {
      for (const s of db.stores) {
        if (!d.objectStoreNames.contains(s.name)) {
          const st = d.createObjectStore(s.name, { keyPath: s.keyPath ?? undefined, autoIncrement: !!s.autoIncrement });
          for (const ix of s.indexes || []) { try { st.createIndex(ix.name, ix.keyPath, { unique: !!ix.unique, multiEntry: !!ix.multiEntry }); } catch {} }
        }
      }
    };

    // 第 2 步：需要建 store 时以更高版本打开（可能被页面阻塞）
    const upgradeOpen = (version) => {
      const timer = setTimeout(() => finish('idbBlocked'), 1500);
      const open = indexedDB.open(db.name, version);
      open.onblocked = () => { /* 等页面连接响应 versionchange 让路，或 timer 超时 */ };
      open.onerror = () => { clearTimeout(timer); finish('idbFailed'); };
      open.onupgradeneeded = () => { try { ensureStores(open.result); } catch { /* 在 onsuccess 里会因缺 store 失败 */ } };
      open.onsuccess = () => { clearTimeout(timer); writeRecords(open.result); };
    };

    // 第 1 步：以现有版本打开（不传 version = 不触发升级、不会 blocked）
    const open = indexedDB.open(db.name);
    open.onerror = () => finish('idbFailed');
    open.onupgradeneeded = () => { try { ensureStores(open.result); } catch {} }; // 数据库不存在时首次创建
    open.onsuccess = () => {
      const d = open.result;
      // 若页面稍后要升级版本，我们主动让路
      d.onversionchange = () => d.close();
      const missing = db.stores.some(s => !d.objectStoreNames.contains(s.name));
      if (!missing) return writeRecords(d);
      const nextVersion = Math.max(d.version, db.version || 1) + 1;
      d.close();
      upgradeOpen(nextVersion);
    };
  });

  return dbs.reduce((p, db) => p.then(() => restoreDb(db)), Promise.resolve()).then(() => report);
}

// ============ 对外 API ============

/** 在指定标签页执行函数；chrome:// 等受限页面会抛错，这里统一转成 { ok:false }。 */
async function runInTab(tabId, func, args = []) {
  if (!tabId) return { ok: false, error: 'no tab' };
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId }, func, args, world: 'MAIN' });
    return { ok: true, result: res?.result };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

/** 探测页面存储规模。 */
export async function probePageStorage(tabId) {
  const r = await runInTab(tabId, probeInPage);
  return r.ok ? r.result : { localStorageKeys: 0, sessionStorageKeys: 0, idbDatabases: 0, unavailable: true };
}

/** 抓取页面存储。opts: { ls, ss, idb } */
export async function capturePageStorage(tabId, opts) {
  const r = await runInTab(tabId, captureInPage, [{ ...opts, maxEntryBytes: MAX_ENTRY_BYTES, maxDbBytes: MAX_IDB_DB_BYTES }]);
  if (!r.ok) return { localStorage: {}, sessionStorage: {}, indexedDB: [], skipped: { entries: 0, records: 0, databases: [] }, unavailable: true, error: r.error };
  return r.result;
}

/** 写回页面存储。data: { localStorage?, sessionStorage?, indexedDB? } */
export async function restorePageStorage(tabId, data) {
  const r = await runInTab(tabId, restoreInPage, [data]);
  if (!r.ok) return { ls: false, ss: false, idbOk: 0, idbBlocked: [], idbFailed: [], unavailable: true, error: r.error };
  return r.result;
}