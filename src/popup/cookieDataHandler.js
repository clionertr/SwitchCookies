// src/popup/cookieDataHandler.js

const cookieDataHandlerUtils = {
  exportCookiesInternal: function() {
    // Determine which domain to use for cookie retrieval
    let domainFilter;
    if (window.includeSubdomains) {
      // Get the root domain to include all subdomains
      const rootDomain = window.cookieLoaderUtils.extractRootDomain(window.currentDomain);
      domainFilter = rootDomain;
    } else {
      // Use the exact current domain
      domainFilter = window.currentDomain;
    }

    chrome.cookies.getAll({ domain: domainFilter }, cookies => {
      // Filter cookies to only export those relevant to the current domain or its subdomains
      const relevantCookies = window.includeSubdomains
        ? cookies
        : cookies.filter(cookie => cookie.domain === window.currentDomain || cookie.domain === '.' + window.currentDomain);

      if (relevantCookies.length === 0) {
        // Consider replacing alert with a more user-friendly UI notification in a future step
        alert('No cookies found to export');
        return;
      }

      const cookiesData = {
        domain: window.currentDomain,
        cookies: relevantCookies,
        includesSubdomains: window.includeSubdomains,
        exportedAt: new Date().toISOString()
      };

      const dataStr = JSON.stringify(cookiesData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

      const subdomainSuffix = window.includeSubdomains ? '-with-subdomains' : '';
      // Ensure currentDomain is defined before using it for the filename, providing a fallback.
      const currentDomainForFile = window.currentDomain || "unknown-domain";
      const exportFileDefaultName = `cookies-${currentDomainForFile}${subdomainSuffix}-${new Date().toISOString().slice(0, 10)}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    });
  },

  exportCookies: function() {
    // This public method calls the internal implementation.
    this.exportCookiesInternal();
  },

  exportAllBrowserCookies: function() {
    // Show a confirmation dialog with security warning
    if (!confirm('警告：导出全部Cookies存在安全风险，可能导致账户泄露！\n\n确定要继续导出全部Cookies吗？')) {
      return;
    }

    // Get all cookies from all domains
    chrome.cookies.getAll({}, cookies => {
      if (cookies.length === 0) {
        alert('No cookies found to export');
        return;
      }

      // Group cookies by domain for better organization
      const cookiesByDomain = {};
      cookies.forEach(cookie => {
        const domain = cookie.domain;
        if (!cookiesByDomain[domain]) {
          cookiesByDomain[domain] = [];
        }
        cookiesByDomain[domain].push(cookie);
      });

      const cookiesData = {
        allDomains: true,
        cookiesByDomain: cookiesByDomain,
        totalCookies: cookies.length,
        exportedAt: new Date().toISOString()
      };

      const dataStr = JSON.stringify(cookiesData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

      const exportFileDefaultName = `all-cookies-${new Date().toISOString().slice(0, 10)}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    });
  },

  importCookiesInternal: function(event, tabIdToReload, domainForComparison) {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
      try {
        const importedData = JSON.parse(e.target.result);

        // Case 1: Cookie Profiles Export File
        if (importedData.type === 'cookie_profiles' && importedData.profiles) {
          chrome.storage.local.get('cookieProfiles', result => {
            const existingProfiles = result.cookieProfiles || {};
            const newProfiles = importedData.profiles;
            const mergedProfiles = { ...existingProfiles, ...newProfiles };
            chrome.storage.local.set({ cookieProfiles: mergedProfiles }, () => {
              const newProfilesCount = Object.keys(newProfiles).length;
              alert(`${newProfilesCount} cookie profile(s) have been imported successfully!`);
              if (typeof loadProfiles === 'function') loadProfiles();
            });
          });
          if (event && event.target) event.target.value = null;
          return;
        }

        // Case 2: All Cookies Export File (Multi-Domain)
        if (importedData.allDomains && importedData.cookiesByDomain) {
          const domainKeys = Object.keys(importedData.cookiesByDomain);
          let totalAttemptedSet = 0;
          domainKeys.forEach(key => { totalAttemptedSet += importedData.cookiesByDomain[key].length; });
          
          if (totalAttemptedSet === 0) {
            alert('No cookies found in the multi-domain import file.');
            if (event && event.target) event.target.value = null;
            return;
          }

          let processedSetCount = 0;
          let successfullySetCount = 0;

          domainKeys.forEach(domainKey => {
            const cookiesArr = importedData.cookiesByDomain[domainKey];
            cookiesArr.forEach(cookie => {
              const url = (cookie.secure ? "https://" : "http://") + (cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain) + cookie.path;
              const newCookie = {
                url: url, name: cookie.name, value: cookie.value,
                domain: cookie.domain, path: cookie.path, secure: cookie.secure,
                httpOnly: cookie.httpOnly, sameSite: cookie.sameSite
              };
              if (cookie.expirationDate) newCookie.expirationDate = cookie.expirationDate;
              if (newCookie.name.startsWith('__Host-') || newCookie.name.startsWith('__Secure-')) delete newCookie.domain;

              chrome.cookies.set(newCookie, (setCookieInfo) => {
                processedSetCount++;
                if (chrome.runtime.lastError) {
                  console.error(`Failed to set cookie (multi-domain) ${newCookie.name} for domain ${newCookie.domain || domainKey}: ${chrome.runtime.lastError.message}`, newCookie);
                } else if (setCookieInfo) {
                  successfullySetCount++;
                }
                if (processedSetCount === totalAttemptedSet) {
                  alert(`${successfullySetCount} of ${totalAttemptedSet} cookies from multiple domains imported. Check console for errors. Refresh related pages if necessary.`);
                  if (window.cookieLoaderUtils && typeof window.cookieLoaderUtils.loadCurrentCookies === 'function') window.cookieLoaderUtils.loadCurrentCookies();
                  if (typeof loadProfiles === 'function') loadProfiles();
                }
              });
            });
          });
          if (event && event.target) event.target.value = null;
          return;
        }

        // Case 3: Single Domain Export File
        if (!importedData.domain || !Array.isArray(importedData.cookies)) {
          throw new Error('Invalid cookies file format for single domain import.');
        }

        if (importedData.domain !== domainForComparison) {
          if (!confirm(`This cookies file was exported for ${importedData.domain}, but you are currently on ${domainForComparison}. Import anyway?`)) {
            if (event && event.target) event.target.value = null; // Reset on cancel
            return;
          }
        }

        chrome.cookies.getAll({ domain: domainForComparison }, existingCookies => {
          existingCookies.forEach(cookie => {
            const url = (cookie.secure ? "https://" : "http://") + (cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain) + cookie.path;
            chrome.cookies.remove({ url: url, name: cookie.name });
          });

          const totalToSet = importedData.cookies.length;
          if (totalToSet === 0) {
            alert(`No cookies to import for domain ${domainForComparison} in the file. Existing cookies for this domain (if any) have been cleared.`);
            if (tabIdToReload) { // Attempt to reload to reflect cleared cookies
                chrome.tabs.reload(tabIdToReload);
            }
            // Update UI lists regardless
            if (window.cookieLoaderUtils && typeof window.cookieLoaderUtils.loadCurrentCookies === 'function') window.cookieLoaderUtils.loadCurrentCookies();
            if (typeof loadProfiles === 'function') loadProfiles();
            if (event && event.target) event.target.value = null;
            return;
          }

          let setAttemptCount = 0;
          let setSuccessCount = 0;
          importedData.cookies.forEach(cookie => {
            const url = (cookie.secure ? "https://" : "http://") + (cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain) + cookie.path;
            const newCookie = {
              url: url, name: cookie.name, value: cookie.value,
              domain: cookie.domain, path: cookie.path, secure: cookie.secure,
              httpOnly: cookie.httpOnly, sameSite: cookie.sameSite
            };
            if (cookie.expirationDate) newCookie.expirationDate = cookie.expirationDate;
            if (newCookie.name.startsWith('__Host-') || newCookie.name.startsWith('__Secure-')) delete newCookie.domain;

            chrome.cookies.set(newCookie, (setCookieInfo) => {
              setAttemptCount++;
              if (chrome.runtime.lastError) {
                console.error(`Failed to set cookie (single-domain) ${newCookie.name} for domain ${domainForComparison}: ${chrome.runtime.lastError.message}`, newCookie);
              } else if (setCookieInfo) {
                setSuccessCount++;
              }
              if (setAttemptCount === totalToSet) {
                const message = `${setSuccessCount} of ${totalToSet} cookies imported for ${domainForComparison}.`;
                if (tabIdToReload) {
                  chrome.tabs.reload(tabIdToReload, {}, () => {
                    alert(`${message} The page has been refreshed.`);
                    if (window.cookieLoaderUtils && typeof window.cookieLoaderUtils.loadCurrentCookies === 'function') window.cookieLoaderUtils.loadCurrentCookies();
                    if (typeof loadProfiles === 'function') loadProfiles();
                  });
                } else {
                  alert(`${message} Could not auto-refresh tab (tab ID missing). Please refresh manually.`);
                  console.warn('tabIdToReload was undefined during single domain import completion.');
                  if (window.cookieLoaderUtils && typeof window.cookieLoaderUtils.loadCurrentCookies === 'function') window.cookieLoaderUtils.loadCurrentCookies();
                  if (typeof loadProfiles === 'function') loadProfiles();
                }
              }
            });
          });
        });
      } catch (error) {
        alert('Error importing cookies: ' + error.message);
      } finally {
        // Ensure file input is reset after processing or if an error occurs
        if (event && event.target) {
          event.target.value = null;
        }
      }
    };

    reader.readAsText(file);
  },

  importCookies: function(event) {
    // Capture currentTab and currentDomain AT THE TIME OF THE EVENT TRIGGER
    const tabId = window.currentTab ? window.currentTab.id : null;
    const domain = window.currentDomain || null;

    if (!domain) {
      // Domain is crucial. tabId can be null if no tab is active/focused.
      alert("Cannot import cookies: Current domain information is missing. Please ensure a page is active in the current tab.");
      if (event && event.target) event.target.value = null; // Reset file input
      return;
    }
    // Pass the original event, and the captured tabId and domain
    cookieDataHandlerUtils.importCookiesInternal(event, tabId, domain);
  }
};

// Expose the cookieDataHandlerUtils to the global window object
window.cookieDataHandlerUtils = cookieDataHandlerUtils;