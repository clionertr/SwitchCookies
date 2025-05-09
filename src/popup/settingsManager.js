// src/popup/settingsManager.js

(function(window) {
  'use strict';

  let currentIncludeSubdomainsState = true; // Default value, will be updated from storage

  /**
   * Initializes the 'include subdomains' setting.
   * Loads the saved preference from chrome.storage, updates the UI checkbox,
   * and sets up an event listener for changes.
   */
  function initIncludeSubdomainsSetting() {
    const includeSubdomainsCheckbox = document.getElementById('include-subdomains');

    if (!includeSubdomainsCheckbox) {
      console.error('Error: Could not find the #include-subdomains checkbox.');
      return;
    }

    // Load saved preference from chrome.storage.local
    chrome.storage.local.get('includeSubdomains', function(data) {
      if (chrome.runtime.lastError) {
        console.error('Error loading includeSubdomains setting:', chrome.runtime.lastError);
        // Keep default or handle error appropriately
      } else {
        if (typeof data.includeSubdomains === 'boolean') {
          currentIncludeSubdomainsState = data.includeSubdomains;
          includeSubdomainsCheckbox.checked = currentIncludeSubdomainsState;
        } else {
          // If not set, initialize with the default state and save it
          includeSubdomainsCheckbox.checked = currentIncludeSubdomainsState;
          chrome.storage.local.set({ includeSubdomains: currentIncludeSubdomainsState }, function() {
            if (chrome.runtime.lastError) {
              console.error('Error saving initial includeSubdomains setting:', chrome.runtime.lastError);
            }
          });
        }
      }
      console.log('settingsManager.js: includeSubdomains initial state loaded:', currentIncludeSubdomainsState);
    });

    // Add change event listener to the checkbox
    includeSubdomainsCheckbox.addEventListener('change', function() {
      currentIncludeSubdomainsState = includeSubdomainsCheckbox.checked;
      chrome.storage.local.set({ includeSubdomains: currentIncludeSubdomainsState }, function() {
        if (chrome.runtime.lastError) {
          console.error('Error saving includeSubdomains setting:', chrome.runtime.lastError);
        } else {
          console.log('settingsManager.js: includeSubdomains setting saved:', currentIncludeSubdomainsState);
          // Call window.cookieLoaderUtils.loadCurrentCookies() to reload cookies
          if (window.cookieLoaderUtils && typeof window.cookieLoaderUtils.loadCurrentCookies === 'function') {
            window.cookieLoaderUtils.loadCurrentCookies();
          } else {
            console.warn('settingsManager.js: cookieLoaderUtils.loadCurrentCookies is not available.');
          }
        }
      });
    });

    console.log('settingsManager.js: initIncludeSubdomainsSetting completed and listener attached.');
  }

  /**
   * Returns the current state of the 'include subdomains' setting.
   * @returns {boolean} The current state.
   */
  function getIncludeSubdomainsState() {
    return currentIncludeSubdomainsState;
  }

  // Expose functions to the global window object
  if (!window.settingsManagerUtils) {
    window.settingsManagerUtils = {};
  }
  window.settingsManagerUtils.initIncludeSubdomainsSetting = initIncludeSubdomainsSetting;
  window.settingsManagerUtils.getIncludeSubdomainsState = getIncludeSubdomainsState;

  console.log('settingsManager.js loaded');

})(window);