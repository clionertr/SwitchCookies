// src/popup/cookieClearer.js

(function() {
  // --- Helper functions (module-internal) ---

  function getLangPackInternal() {
    // Access i18n utils:
    const lang = window.i18nUtils.getUserLang();
    return window.i18nUtils.LANGUAGES[lang] || window.i18nUtils.LANGUAGES['zh-CN'];
  }

  function updateClearModalTextsInternal(clearSubdomainsCheckbox, modalEl, confirmTextEl, confirmBtnEl) {
    const langPack = getLangPackInternal();
    // currentDomain is a global variable expected to be available from popup.js
    const domainToClear = clearSubdomainsCheckbox.checked ? window.cookieLoaderUtils.extractRootDomain(currentDomain) : currentDomain;
    
    const modalTitleEl = modalEl.querySelector('h2'); 
    if (modalTitleEl) {
      modalTitleEl.textContent = (langPack.clear_cookies_for || 'Clear Cookies for {domain}').replace('{domain}', domainToClear);
    }
    
    confirmTextEl.textContent = (langPack.confirm_clear_cookies_text || 'Are you sure you want to clear all cookies for {domain}? This action cannot be undone.').replace('{domain}', domainToClear);
    confirmBtnEl.textContent = langPack.confirm_clear_button || 'Confirm Clear';
    
    const cancelBtnEl = modalEl.querySelector('#cancel-clear-btn');
    if (cancelBtnEl) {
      cancelBtnEl.textContent = langPack.cancel_button || 'Cancel';
    }
  }

  function updateCookiesListInternal(cookiesToClearListEl, clearSubdomainsCheckbox) {
    const langPack = getLangPackInternal();
    cookiesToClearListEl.innerHTML = `<p>${langPack.loading_cookies_to_clear || 'Loading cookies...'}</p>`;
    // currentDomain is a global variable expected to be available from popup.js
    const domainToFilter = clearSubdomainsCheckbox.checked ? window.cookieLoaderUtils.extractRootDomain(currentDomain) : currentDomain;

    chrome.cookies.getAll({ domain: domainToFilter }, cookies => {
      const relevantCookies = clearSubdomainsCheckbox.checked
        ? cookies.filter(cookie => {
            const cookieRootDomain = window.cookieLoaderUtils.extractRootDomain(cookie.domain);
            return cookieRootDomain === domainToFilter;
          })
        : cookies.filter(cookie => cookie.domain === domainToFilter || cookie.domain === '.' + domainToFilter);

      if (relevantCookies.length === 0) {
        cookiesToClearListEl.innerHTML = `<p>${langPack.no_cookies_to_clear_for_domain || 'No cookies to clear for this domain.'}</p>`;
      } else {
        cookiesToClearListEl.innerHTML = '';
        const ul = document.createElement('ul');
        relevantCookies.forEach(cookie => {
          const li = document.createElement('li');
          li.textContent = `${cookie.name} (${cookie.domain})`;
          ul.appendChild(li);
        });
        cookiesToClearListEl.appendChild(ul);
      }
    });
  }

  // Promisified version of chrome.cookies.remove
  function removeCookieInternal(cookieDetail) {
    return new Promise((resolve, reject) => {
      chrome.cookies.remove(cookieDetail, (details) => {
        if (chrome.runtime.lastError) {
          console.error('Error removing cookie:', chrome.runtime.lastError.message, cookieDetail);
          reject(chrome.runtime.lastError);
        } else {
          resolve(details);
        }
      });
    });
  }

  // --- Main functions (to be exposed) ---
  function showClearCookiesConfirmationInternal() {
    const clearDomainSpan = document.getElementById('clear-domain');
    // currentDomain is a global variable expected to be available from popup.js
    if (clearDomainSpan) clearDomainSpan.textContent = currentDomain;

    const cookiesToClearListEl = document.getElementById('cookies-to-clear-list');
    const clearSubdomainsCheckbox = document.getElementById('clear-subdomains');
    const modalEl = document.getElementById('clear-cookies-modal');
    const confirmTextEl = modalEl.querySelector('p[data-i18n]');
    const confirmBtnEl = document.getElementById('confirm-clear-btn');

    if (!modalEl || !cookiesToClearListEl || !clearSubdomainsCheckbox || !confirmTextEl || !confirmBtnEl) {
        console.error("Clear cookies modal elements not found.");
        return;
    }
    
    updateClearModalTextsInternal(clearSubdomainsCheckbox, modalEl, confirmTextEl, confirmBtnEl);
    updateCookiesListInternal(cookiesToClearListEl, clearSubdomainsCheckbox);

    // Using onchange to simplify event listener management for the checkbox
    clearSubdomainsCheckbox.onchange = () => {
      updateClearModalTextsInternal(clearSubdomainsCheckbox, modalEl, confirmTextEl, confirmBtnEl);
      updateCookiesListInternal(cookiesToClearListEl, clearSubdomainsCheckbox);
    };
    
    modalEl.style.display = 'block';
    window.uiUtils.centerModalInViewport(modalEl);
  }

  function closeClearCookiesModalInternal() {
    const modalEl = document.getElementById('clear-cookies-modal');
    if (modalEl) {
      modalEl.style.display = 'none';
    }
  }

  async function clearAllCookiesInternal() {
    const langPack = getLangPackInternal();
    const clearSubdomainsCheckbox = document.getElementById('clear-subdomains');
    // currentDomain and currentTab are global variables expected to be available from popup.js
    const domainToClear = clearSubdomainsCheckbox.checked ? window.cookieLoaderUtils.extractRootDomain(currentDomain) : currentDomain;

    chrome.cookies.getAll({ domain: domainToClear }, async (cookies) => {
      const relevantCookies = clearSubdomainsCheckbox.checked
        ? cookies.filter(cookie => {
            const cookieRootDomain = window.cookieLoaderUtils.extractRootDomain(cookie.domain);
            return cookieRootDomain === domainToClear;
          })
        : cookies.filter(cookie => cookie.domain === domainToClear || cookie.domain === '.' + domainToClear);

      if (relevantCookies.length === 0) {
        alert(langPack.no_cookies_to_clear || 'No cookies to clear.');
        closeClearCookiesModalInternal();
        return;
      }

      try {
        for (const cookie of relevantCookies) {
          const url = (cookie.secure ? "https://" : "http://") +
                     (cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain) +
                     cookie.path;
          await removeCookieInternal({ url: url, name: cookie.name });
        }

        // All cookies removed, now reload
        // currentTab is a global variable
        if (currentTab && currentTab.id) {
            chrome.tabs.reload(currentTab.id, {}, () => {
                alert((langPack.cookies_cleared_successfully || '{count} cookies cleared successfully! The page has been refreshed.').replace('{count}', relevantCookies.length));
                closeClearCookiesModalInternal();

                const searchInput = document.getElementById('cookie-search');
                const searchTerm = searchInput ? searchInput.value.trim() : '';

                window.cookieLoaderUtils.loadCurrentCookies();
                
                // These are still global in popup.js as per instructions
                if (typeof loadProfiles === 'function') loadProfiles(); 
                
                if (searchTerm && typeof filterCookies === 'function' && typeof showAutocomplete === 'function') {
                  setTimeout(() => {
                    filterCookies(searchTerm);
                    showAutocomplete(searchTerm);
                  }, 100);
                }
            });
        } else {
            console.error("currentTab is not defined, cannot reload.");
            alert((langPack.cookies_cleared_successfully_no_reload || '{count} cookies cleared successfully! Please refresh the page manually.').replace('{count}', relevantCookies.length));
            closeClearCookiesModalInternal();
            window.cookieLoaderUtils.loadCurrentCookies();
            if (typeof loadProfiles === 'function') loadProfiles();
        }
      } catch (error) {
        console.error("Error clearing cookies:", error);
        alert(langPack.error_clearing_cookies || "Error clearing cookies. See console for details.");
        closeClearCookiesModalInternal();
      }
    });
  }

  window.cookieClearerUtils = {
    showClearCookiesConfirmation: showClearCookiesConfirmationInternal,
    closeClearCookiesModal: closeClearCookiesModalInternal,
    clearAllCookies: clearAllCookiesInternal
  };

})();