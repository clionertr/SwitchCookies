// Module-level state for the cookie editor
let currentEditingCookie = null;

/**
 * Opens the cookie editor modal with the details of the provided cookie.
 * @param {object} cookie - The cookie object to edit.
 */
function openCookieEditorInternal(cookie) {
  currentEditingCookie = cookie;

  // Populate form fields with cookie data
  document.getElementById('cookie-name').value = cookie.name;
  document.getElementById('cookie-value').value = cookie.value;
  document.getElementById('cookie-domain').value = cookie.domain;
  document.getElementById('cookie-path').value = cookie.path;

  // Set expiration date if it exists
  if (cookie.expirationDate) {
    const date = new Date(cookie.expirationDate * 1000);
    document.getElementById('cookie-expiration').value = date.toISOString().slice(0, 16);
  } else {
    document.getElementById('cookie-expiration').value = '';
  }

  // Set sameSite value
  document.getElementById('cookie-sameSite').value = cookie.sameSite || 'unspecified';

  // Set checkbox values
  document.getElementById('cookie-hostOnly').checked = cookie.hostOnly || false;
  document.getElementById('cookie-session').checked = cookie.session || false;
  document.getElementById('cookie-secure').checked = cookie.secure || false;
  document.getElementById('cookie-httpOnly').checked = cookie.httpOnly || false;

  // Show the modal
  const modal = document.getElementById('cookie-editor-modal');
  modal.style.display = 'block';

  // Center the modal in the viewport
  // Dependency: window.uiUtils.centerModalInViewport()
  if (window.uiUtils && typeof window.uiUtils.centerModalInViewport === 'function') {
    window.uiUtils.centerModalInViewport(modal);
  } else {
    console.error('uiUtils.centerModalInViewport is not available.');
    // Fallback or error handling if needed
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
  }
}

/**
 * Closes the cookie editor modal.
 */
function closeCookieEditorInternal() {
  document.getElementById('cookie-editor-modal').style.display = 'none';
  currentEditingCookie = null;

  // 恢复主滚动条
  document.body.style.overflow = '';
}

/**
 * Saves the changes made to the cookie in the editor.
 * This function is async due to chrome.cookies.remove/set operations and loadCurrentCookies.
 */
async function saveCookieChangesInternal() {
  if (!currentEditingCookie) return;

  const name = document.getElementById('cookie-name').value;
  const value = document.getElementById('cookie-value').value;
  const domain = document.getElementById('cookie-domain').value;
  const path = document.getElementById('cookie-path').value;
  const expiration = document.getElementById('cookie-expiration').value;
  const sameSite = document.getElementById('cookie-sameSite').value;
  // 注意：hostOnly 属性在 Chrome 扩展 API 中不直接支持，由 domain 是否以点开头决定
  const session = document.getElementById('cookie-session').checked;
  const secure = document.getElementById('cookie-secure').checked;
  const httpOnly = document.getElementById('cookie-httpOnly').checked;

  // First, remove the existing cookie if it exists
  const oldUrl = (currentEditingCookie.secure ? "https://" : "http://") +
                (currentEditingCookie.domain.charAt(0) === '.' ? currentEditingCookie.domain.substr(1) : currentEditingCookie.domain) +
                currentEditingCookie.path;

  // Wrap chrome.cookies.remove in a Promise for async/await
  await new Promise((resolve, reject) => {
    chrome.cookies.remove({
      url: oldUrl,
      name: currentEditingCookie.name
    }, (details) => {
      if (chrome.runtime.lastError) {
        console.error('Error removing cookie:', chrome.runtime.lastError);
        // Optionally reject or handle error, for now, we proceed
      }
      resolve(details);
    });
  });

  // Now create the new cookie
  const url = (secure ? "https://" : "http://") +
             (domain.charAt(0) === '.' ? domain.substr(1) : domain) +
             path;

  const newCookie = {
    url: url,
    name: name,
    value: value,
    domain: domain,
    path: path,
    secure: secure,
    httpOnly: httpOnly,
    sameSite: sameSite
  };

  // Add expiration date if specified
  if (expiration && !session) {
    const date = new Date(expiration);
    newCookie.expirationDate = Math.floor(date.getTime() / 1000);
  }

  // Wrap chrome.cookies.set in a Promise for async/await
  await new Promise((resolve, reject) => {
    chrome.cookies.set(newCookie, (cookie) => {
      if (chrome.runtime.lastError) {
        console.error('Error setting cookie:', chrome.runtime.lastError);
        alert('Error updating cookie. Check console for details.');
        // Optionally reject or handle error
      } else {
        alert('Cookie updated successfully!');
      }
      resolve(cookie);
    });
  });

  closeCookieEditorInternal(); // Internal call

  // Reload cookies and maintain search if active
  // Dependency: window.cookieLoaderUtils.loadCurrentCookies()
  if (window.cookieLoaderUtils && typeof window.cookieLoaderUtils.loadCurrentCookies === 'function') {
    await window.cookieLoaderUtils.loadCurrentCookies();
  } else {
    console.error('cookieLoaderUtils.loadCurrentCookies is not available.');
  }

  // Re-apply search if there was one
  // These functions (filterCookies, showAutocomplete) are currently in popup.js
  // and will be called globally.
  const searchInput = document.getElementById('cookie-search');
  if (searchInput) { // Ensure searchInput exists
    const searchTerm = searchInput.value.trim();
    if (searchTerm) {
      // Using a timeout as in the original code, though with async/await,
      // it might be possible to integrate more cleanly if those functions were also async.
      setTimeout(() => {
        if (typeof filterCookies === 'function') {
          filterCookies(searchTerm);
        } else {
          console.warn('filterCookies function not found globally.');
        }
        if (typeof showAutocomplete === 'function') {
          showAutocomplete(searchTerm);
        } else {
          console.warn('showAutocomplete function not found globally.');
        }
      }, 100);
    }
  }
}

// Expose the functions to the global scope via window.cookieEditorUtils
window.cookieEditorUtils = {
  openCookieEditor: openCookieEditorInternal,
  closeCookieEditor: closeCookieEditorInternal,
  saveCookieChanges: saveCookieChangesInternal
};

console.log('cookieEditor.js loaded and cookieEditorUtils initialized.');