// background.js —— Service Worker（MV3）
// 说明：本扩展绝大多数逻辑运行在弹窗页面内，后台只做两件事：
//   1. 安装/升级时打印版本，便于排查；
//   2. 响应"在独立标签页中打开"的请求（弹窗很小，用户想看大图时用）。

chrome.runtime.onInstalled.addListener((details) => {
  const version = chrome.runtime.getManifest().version;
  console.log(`[SwitchCookies] ${details.reason} -> v${version}`);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'open-in-tab') {
    // 携带原始 tabId，让独立页面知道该操作哪个网站
    const url = chrome.runtime.getURL(`popup.html?tabId=${message.tabId ?? ''}`);
    chrome.tabs.create({ url }).then(() => sendResponse({ ok: true }));
    return true; // 异步响应
  }
  return false;
});