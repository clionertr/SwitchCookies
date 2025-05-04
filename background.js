// Background script for SwitchCookies extension

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('SwitchCookies extension installed');
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCookies') {
    chrome.cookies.getAll({ domain: request.domain }, cookies => {
      sendResponse({ cookies: cookies });
    });
    return true; // Required for async response
  }
  
  if (request.action === 'setCookie') {
    chrome.cookies.set(request.cookie, cookie => {
      sendResponse({ success: !!cookie, cookie: cookie });
    });
    return true; // Required for async response
  }
  
  if (request.action === 'removeCookie') {
    const url = (request.cookie.secure ? "https://" : "http://") + 
                (request.cookie.domain.charAt(0) === '.' ? request.cookie.domain.substr(1) : request.cookie.domain) + 
                request.cookie.path;
    
    chrome.cookies.remove({
      url: url,
      name: request.cookie.name
    }, details => {
      sendResponse({ success: !!details });
    });
    return true; // Required for async response
  }
});
