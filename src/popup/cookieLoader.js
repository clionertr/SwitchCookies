// src/popup/cookieLoader.js
window.cookieLoaderUtils = {
  getCurrentTab: async function() {
    let queryOptions = { active: true, currentWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
  },

  extractDomain: function(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      console.error("Error extracting domain from URL:", url, e);
      return '';
    }
  },

  extractRootDomain: function(hostname) {
    if (!hostname || typeof hostname !== 'string') {
        console.warn("extractRootDomain called with invalid hostname:", hostname);
        return '';
    }
    const parts = hostname.split('.');
    if (parts.length <= 1) { // Handles single part hostnames (e.g., "localhost") or empty strings after split
        return hostname;
    }
    if (parts.length === 2) { // Handles "example.com"
      return hostname;
    }

    // Handle common public suffixes like co.uk, com.au.
    // This is a simplified approach. For comprehensive public suffix handling,
    // a library based on the Public Suffix List would be needed.
    const sldCandidate = parts[parts.length - 2];
    const tldCandidate = parts[parts.length - 1];

    // List of common second-level domains that are part of a public suffix.
    // This list is not exhaustive and might need to be expanded.
    const commonSecondLevelSuffixes = ['co', 'com', 'org', 'net', 'gov', 'edu', 'ac', 'ltd', 'plc'];

    if (tldCandidate.length === 2 && commonSecondLevelSuffixes.includes(sldCandidate) && parts.length >= 3) {
      // e.g., example.co.uk (3 parts)
      return parts.slice(-3).join('.');
    }

    // Regular case like sub.example.com (take last 2 parts)
    // or if it's example.co.uk but co.uk is not recognized as a unit above,
    // this will correctly return example.co.uk if parts.length >=2
    return parts.slice(-2).join('.');
  },

  loadCurrentCookies: function() {
    const cookiesList = document.getElementById('cookies-list');
    if (!cookiesList) {
        console.error("Element with ID 'cookies-list' not found.");
        return;
    }

    if (!window.i18nUtils || typeof window.i18nUtils.getUserLang !== 'function' || !window.i18nUtils.LANGUAGES) {
        console.error('i18nUtils not fully loaded for loadCurrentCookies');
        cookiesList.innerHTML = 'Error: Localization utilities not available.';
        return;
    }
    const userLang = window.i18nUtils.getUserLang();
    const langPack = window.i18nUtils.LANGUAGES[userLang] || window.i18nUtils.LANGUAGES['en']; // Fallback to 'en'

    cookiesList.innerHTML = langPack.loading_cookies || 'Loading cookies...';

    let domainFilter;
    // Ensure currentDomain is a string and not empty before processing
    if (typeof currentDomain !== 'string' || !currentDomain) { // Global variable
        console.warn("loadCurrentCookies: currentDomain is not a valid string or is empty.", currentDomain);
        cookiesList.innerHTML = '<div class="no-cookies">' + (langPack.no_cookies_found || 'Cannot load cookies: current domain not identified.') + '</div>';
        allCookies = []; // Global variable
        return;
    }

    if (includeSubdomains) { // Global variable
      const rootDomain = this.extractRootDomain(currentDomain); // Global variable
      domainFilter = rootDomain;
    } else {
      domainFilter = currentDomain; // Global variable
    }

    if (!domainFilter) {
        console.warn("loadCurrentCookies: domainFilter could not be determined. currentDomain:", currentDomain, "includeSubdomains:", includeSubdomains);
        cookiesList.innerHTML = '<div class="no-cookies">' + (langPack.no_cookies_found || 'No cookies found (domain filter issue).') + '</div>';
        allCookies = []; // Global variable
        return;
    }

    chrome.cookies.getAll({ domain: domainFilter }, cookies => {
      if (chrome.runtime.lastError) {
        console.error("Error getting cookies for domain", domainFilter, ":", chrome.runtime.lastError.message);
        cookiesList.innerHTML = '<div class="no-cookies">' + (langPack.error_loading_cookies || 'Error loading cookies.') + '</div>';
        allCookies = []; // Global variable
        return;
      }

      if (!cookies || cookies.length === 0) {
        cookiesList.innerHTML = '<div class="no-cookies">' + (langPack.no_cookies_found || 'No cookies found.') + '</div>';
        allCookies = []; // Global variable
        return;
      }

      // Filter cookies:
      // If includeSubdomains is true, domainFilter is already the root domain, so chrome.cookies.getAll should return all relevant cookies.
      // If includeSubdomains is false, domainFilter is the exact domain. We still might get cookies for '.exact.domain'.
      const relevantCookies = includeSubdomains
        ? cookies // Already filtered by rootDomain by chrome.cookies.getAll
        : cookies.filter(cookie => {
            return cookie.domain === currentDomain || cookie.domain === `.${currentDomain}`;
          });


      if (relevantCookies.length === 0) {
        cookiesList.innerHTML = '<div class="no-cookies">' + (langPack.no_cookies_found_for_domain || 'No cookies found for this specific domain/subdomain setting.') + '</div>';
        allCookies = []; // Global variable
        return;
      }

      allCookies = relevantCookies; // Global variable

      const searchInput = document.getElementById('cookie-search');
      if (searchInput && searchInput.value.trim()) {
        if (typeof window.filterCookies === 'function') { // Assumes filterCookies is global in popup.js
            window.filterCookies(searchInput.value.trim());
        } else {
            console.warn('filterCookies function not found on window. Displaying all relevant cookies instead.');
            this.displayCookies(relevantCookies);
        }
        return;
      }
      this.displayCookies(relevantCookies);
    });
  },

  displayCookies: function(cookiesToDisplay) {
    const cookiesList = document.getElementById('cookies-list');
     if (!cookiesList) {
        console.error("Element with ID 'cookies-list' not found for display.");
        return;
    }
    cookiesList.innerHTML = ''; // Clear previous content

    if (!window.i18nUtils || typeof window.i18nUtils.getUserLang !== 'function' || !window.i18nUtils.LANGUAGES) {
        console.error('i18nUtils not fully loaded for displayCookies');
        cookiesList.innerHTML = 'Error: Localization utilities not available.';
        return;
    }
    const userLang = window.i18nUtils.getUserLang();
    const langPack = window.i18nUtils.LANGUAGES[userLang] || window.i18nUtils.LANGUAGES['en']; // Fallback to 'en'

    if (!cookiesToDisplay || cookiesToDisplay.length === 0) {
      cookiesList.innerHTML = '<div class="no-cookies">' + (langPack.no_matching_cookies || 'No matching cookies found.') + '</div>';
      return;
    }

    cookiesToDisplay.forEach(cookie => {
      const cookieItem = document.createElement('div');
      cookieItem.className = 'cookie-item';

      const cookieText = document.createElement('div');
      cookieText.className = 'cookie-item-text';

      const safeCurrentDomain = (typeof currentDomain === 'string' && currentDomain) ? currentDomain : ""; // Global variable
      
      let domainPrefix = '';
      if (cookie.domain && safeCurrentDomain) {
          const normalizedCookieDomain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
          const normalizedSafeCurrentDomain = safeCurrentDomain.startsWith('.') ? safeCurrentDomain.substring(1) : safeCurrentDomain;
          
          if (normalizedCookieDomain !== normalizedSafeCurrentDomain) {
              domainPrefix = `[${cookie.domain}] `;
          }
      }

      const cookieName = cookie.name || "[No Name]";
      const cookieValue = cookie.value || ""; 
      cookieText.textContent = `${domainPrefix}${cookieName}: ${String(cookieValue).substring(0, 30)}${String(cookieValue).length > 30 ? '...' : ''}`;

      const cookieActions = document.createElement('div');
      cookieActions.className = 'cookie-item-actions';

      const editButton = document.createElement('button');
      editButton.textContent = langPack.edit || 'Edit';
      if (window.cookieEditorUtils && typeof window.cookieEditorUtils.openCookieEditor === 'function') {
          editButton.addEventListener('click', () => window.cookieEditorUtils.openCookieEditor(cookie));
      } else {
          console.warn('cookieEditorUtils.openCookieEditor function not found on window.');
          editButton.disabled = true;
          editButton.title = "Edit function unavailable";
      }

      cookieActions.appendChild(editButton);
      cookieItem.appendChild(cookieText);
      cookieItem.appendChild(cookieActions);

      cookiesList.appendChild(cookieItem);
    });
  }
};