// src/lib/ipinfo.js —— 出口 IP 查询（仅用户手动点击时触发）
// 隐私说明：查询会把你的 IP 暴露给 ip234.in。v1 每次打开弹窗都自动查，
// v2 改为按需查询，且结果不落盘。

export async function fetchIpInfo() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const [ipResp, riskResp] = await Promise.all([
      fetch('https://ip234.in/ip.json', { signal: ctrl.signal }),
      fetch('https://ip234.in/f.json', { signal: ctrl.signal }).catch(() => null),
    ]);
    const ip = await ipResp.json();
    let risk = null;
    if (riskResp && riskResp.ok) {
      try { const r = await riskResp.json(); risk = r?.data ?? null; } catch { /* 忽略 */ }
    }
    return { ok: true, ip, risk };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  } finally {
    clearTimeout(timer);
  }
}