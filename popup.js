// Global variables
let currentUrl = '';
let currentDomain = '';
let currentTab = null;
let includeSubdomains = true; // Default to true
let allCookies = []; // Store all cookies for search functionality
let searchTimeout = null; // For debouncing search input
// Initialize the popup
function initializeApp() {
  console.log('initializeApp: Called');
  // Initialize i18n
  window.i18nUtils.applyI18n(window.i18nUtils.getUserLang());
  window.i18nUtils.initI18nUI();

  // Get the current tab information
  window.cookieLoaderUtils.getCurrentTab().then(tab => {
    if (tab && tab.id && typeof tab.url === 'string') { // Validate tab object
      currentTab = tab; // Module-scoped
      window.currentTab = tab; // Make globally accessible for other modules
      currentUrl = tab.url;
      currentDomain = window.cookieLoaderUtils.extractDomain(currentUrl);
      window.currentDomain = currentDomain; // Make globally accessible
      document.getElementById('current-site').textContent = currentDomain;
      
      // Load cookies for the current site only if domain is valid
      if (currentDomain) {
        window.cookieLoaderUtils.loadCurrentCookies();
      } else {
        document.getElementById('current-site').textContent = 'N/A (Domain could not be determined)';
        const cookiesList = document.getElementById('cookies-list');
        if (cookiesList) cookiesList.innerHTML = '<div class="no-cookies" data-i18n="no_cookies_found">Domain not determined, cookies cannot be displayed.</div>';
      }
    } else {
      console.warn("Could not get valid current tab information. UI and some features might be limited. Tab:", tab);
      document.getElementById('current-site').textContent = 'N/A (No active tab?)';
      window.currentTab = null; // Ensure it's null if tab info is bad
      window.currentDomain = null; // Ensure it's null
      const cookiesList = document.getElementById('cookies-list');
      if (cookiesList) cookiesList.innerHTML = '<div class="no-cookies" data-i18n="no_cookies_found">No active tab, cookies cannot be displayed.</div>';
    }
    // These should run regardless of tab status, as they might not depend on currentDomain/currentTab
    // or have their own internal fallbacks.
    // loadProfiles(); // Moved to profileManagerUtils
    if (window.profileManagerUtils && typeof window.profileManagerUtils.loadProfiles === 'function') {
      window.profileManagerUtils.loadProfiles();
    } else {
      console.warn('initializeApp: profileManagerUtils.loadProfiles not available yet.');
    }
    loadIpInfoAndRiskAssessment();
  }).catch(error => {
    console.error("Failed to get current tab information:", error);
    document.getElementById('current-site').textContent = 'Error loading tab info';
    window.currentTab = null; // Ensure null on error
    window.currentDomain = null; // Ensure null on error
    const cookiesList = document.getElementById('cookies-list');
    if (cookiesList) cookiesList.innerHTML = '<div class="no-cookies" data-i18n="no_cookies_found">Error loading tab, cookies cannot be displayed.</div>';
    
    // Still attempt to load non-tab-dependent parts
    // loadProfiles(); // Moved to profileManagerUtils
    if (window.profileManagerUtils && typeof window.profileManagerUtils.loadProfiles === 'function') {
      window.profileManagerUtils.loadProfiles();
    } else {
      console.warn('initializeApp catch: profileManagerUtils.loadProfiles not available yet.');
    }
    loadIpInfoAndRiskAssessment();
  });

  // Set up event listeners
  document.getElementById('save-profile').addEventListener('click', () => window.profileManagerUtils.saveCurrentProfile());
  document.getElementById('export-all-profiles').addEventListener('click', () => window.profileManagerUtils.exportAllProfiles());
  document.getElementById('export-cookies').addEventListener('click', () => window.cookieDataHandlerUtils.exportCookies());
  document.getElementById('export-all-cookies').addEventListener('click', exportAllCookies);
  document.getElementById('import-cookies').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', window.cookieDataHandlerUtils.importCookies);

  // Set up subdomain checkbox event listener
  const includeSubdomainsCheckbox = document.getElementById('include-subdomains');

  // Load saved preference
  chrome.storage.local.get('includeSubdomains', result => {
    if (result.includeSubdomains !== undefined) {
      includeSubdomains = result.includeSubdomains;
      window.includeSubdomains = includeSubdomains; // Make includeSubdomains globally accessible
      includeSubdomainsCheckbox.checked = includeSubdomains;
    }
  });

  // Add event listener for the checkbox
  includeSubdomainsCheckbox.addEventListener('change', function() {
    includeSubdomains = this.checked;
    window.includeSubdomains = includeSubdomains; // Update global includeSubdomains
    // Save the preference
    chrome.storage.local.set({ includeSubdomains: includeSubdomains }, () => {
      // Reload cookies with the new setting
      window.cookieLoaderUtils.loadCurrentCookies();
    });
  });

  // Set up cookie search functionality
  const cookieSearch = document.getElementById('cookie-search');
  const clearSearch = document.getElementById('clear-search');
  const searchAutocomplete = document.getElementById('search-autocomplete');

  // Hide clear button by default
  clearSearch.style.display = 'none';

  // Add event listeners for search input
  cookieSearch.addEventListener('input', handleSearchInput);
  cookieSearch.addEventListener('keydown', handleSearchKeydown);
  clearSearch.addEventListener('click', clearSearchInput);

  // Close autocomplete when clicking outside
  document.addEventListener('click', function(e) {
    if (!cookieSearch.contains(e.target) && !searchAutocomplete.contains(e.target)) {
      searchAutocomplete.style.display = 'none';
    }
  });

  // Cookie editor modal event listeners
  const modal = document.getElementById('cookie-editor-modal');
  const closeBtn = modal.querySelector('.close');
  const saveCookieBtn = document.getElementById('save-cookie-btn');
  const cancelCookieBtn = document.getElementById('cancel-cookie-btn');

  closeBtn.addEventListener('click', window.cookieEditorUtils.closeCookieEditor);
  saveCookieBtn.addEventListener('click', window.cookieEditorUtils.saveCookieChanges);
  cancelCookieBtn.addEventListener('click', window.cookieEditorUtils.closeCookieEditor);

  // Clear cookies modal event listeners
  const clearCookiesBtn = document.getElementById('clear-cookies');
  const clearCookiesModal = document.getElementById('clear-cookies-modal');
  const clearCookiesCloseBtn = clearCookiesModal.querySelector('.clear-cookies-close');
  const confirmClearBtn = document.getElementById('confirm-clear-btn');
  const cancelClearBtn = document.getElementById('cancel-clear-btn');

  clearCookiesBtn.addEventListener('click', window.cookieClearerUtils.showClearCookiesConfirmation);
  clearCookiesCloseBtn.addEventListener('click', window.cookieClearerUtils.closeClearCookiesModal);
  confirmClearBtn.addEventListener('click', window.cookieClearerUtils.clearAllCookies);
  cancelClearBtn.addEventListener('click', window.cookieClearerUtils.closeClearCookiesModal);

  // Close modals when clicking outside of them
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      window.cookieEditorUtils.closeCookieEditor();
    }
    if (event.target === clearCookiesModal) {
      window.cookieClearerUtils.closeClearCookiesModal();
    }
  });

  // 监听窗口大小变化，重新调整模态窗口位置
  window.addEventListener('resize', () => {
    // 使用防抖动处理，避免频繁调整
    if (window._resizeTimer) {
      clearTimeout(window._resizeTimer);
    }

    window._resizeTimer = setTimeout(() => {
      if (modal.style.display === 'block') {
        window.uiUtils.centerModalInViewport(modal);
      }
      if (clearCookiesModal.style.display === 'block') {
        window.uiUtils.centerModalInViewport(clearCookiesModal);
      }
    }, 100); // 100ms延迟
  });

  // 初始化夜间模式 - 现在通过 nightModeManagerUtils 调用
  if (window.nightModeManagerUtils && typeof window.nightModeManagerUtils.initNightMode === 'function') {
    window.nightModeManagerUtils.initNightMode();
  } else {
    console.warn('initializeApp: nightModeManagerUtils.initNightMode not available yet.');
  }

  // ===== WebDAV UI 初始化与事件绑定 =====
  // WebDAV functions are now in webdavManager.js
  if (window.webdavManagerUtils) {
    window.webdavManagerUtils.loadWebDAVConfig();
    const webdavSaveBtn = document.getElementById('webdav-save');
    const webdavUploadBtn = document.getElementById('webdav-upload');
    const webdavDownloadBtn = document.getElementById('webdav-download');

    if (webdavSaveBtn) webdavSaveBtn.addEventListener('click', window.webdavManagerUtils.saveWebDAVConfig);
    if (webdavUploadBtn) webdavUploadBtn.addEventListener('click', window.webdavManagerUtils.handleWebDAVUpload);
    if (webdavDownloadBtn) webdavDownloadBtn.addEventListener('click', window.webdavManagerUtils.handleWebDAVDownload);
  } else {
    console.warn('initializeApp: webdavManagerUtils not available yet. WebDAV UI might not work.');
  }
  // ===== WebDAV 支持 (Moved to src/popup/webdavManager.js) =====
  // initNightMode function has been moved to src/popup/nightModeManager.js
  // updateScrollbarStyles function has been moved to src/popup/nightModeManager.js
}

function waitForModulesAndInit() {
  const modules = {
    i18nUtils: window.i18nUtils,
    uiUtils: window.uiUtils,
    cookieLoaderUtils: window.cookieLoaderUtils,
    cookieEditorUtils: window.cookieEditorUtils,
    cookieClearerUtils: window.cookieClearerUtils,
    cookieDataHandlerUtils: window.cookieDataHandlerUtils,
    profileManagerUtils: window.profileManagerUtils,
    webdavManagerUtils: window.webdavManagerUtils, // Added new module
    nightModeManagerUtils: window.nightModeManagerUtils // Added night mode module
  };

  const allModulesLoaded = Object.values(modules).every(module => module !== undefined);
  const i18nReady = modules.i18nUtils && typeof modules.i18nUtils.applyI18n === 'function';

  console.log('waitForModulesAndInit: Checking for modules...', modules);

  if (allModulesLoaded && i18nReady) {
    console.log('All modules are defined, proceeding with initialization.');
    initializeApp(); // Proceed with initialization
  } else {
    const missingModules = Object.keys(modules).filter(key => modules[key] === undefined);
    if (!i18nReady && modules.i18nUtils === undefined) missingModules.push('i18nUtils (applyI18n)');
    console.log(`Waiting for one or more modules to be defined: ${missingModules.join(', ')}...`);
    setTimeout(waitForModulesAndInit, 100); // Check again after 100ms
  }
}

document.addEventListener('DOMContentLoaded', waitForModulesAndInit);

// Functions getCurrentTab, extractDomain, extractRootDomain, loadCurrentCookies, and displayCookies
// have been moved to src/popup/cookieLoader.js and are accessible via window.cookieLoaderUtils

// Functions loadProfiles, isProfileMatchingCurrentDomain, saveCurrentProfile, applyProfile, deleteProfile, and exportAllProfiles
// have been moved to src/popup/profileManager.js and are accessible via window.profileManagerUtils

// Export ALL cookies from the browser
function exportAllCookies() {
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
}

// Import cookies function has been moved to src/popup/cookieDataHandler.js
// and is accessible via window.cookieDataHandlerUtils.importCookies()

// Functions openCookieEditor, closeCookieEditor, and saveCookieChanges
// have been moved to src/popup/cookieEditor.js and are accessible via window.cookieEditorUtils

// Functions showClearCookiesConfirmation, closeClearCookiesModal, and clearAllCookies
// have been moved to src/popup/cookieClearer.js and are accessible via window.cookieClearerUtils

// Handle search input
function handleSearchInput(e) {
  const searchTerm = e.target.value.trim();

  // Clear any existing timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  // Show/hide clear button based on input
  document.getElementById('clear-search').style.display = searchTerm ? 'flex' : 'none';

  // Debounce the search to avoid excessive filtering
  searchTimeout = setTimeout(() => {
    if (searchTerm) {
      // Filter cookies and show autocomplete
      filterCookies(searchTerm);
      showAutocomplete(searchTerm);
    } else {
      // If search is cleared, show all cookies and hide autocomplete
      displayCookies(allCookies);
      document.getElementById('search-autocomplete').style.display = 'none';
    }
  }, 300);
}

// Handle keyboard navigation in search
function handleSearchKeydown(e) {
  const autocomplete = document.getElementById('search-autocomplete');

  // Only process if autocomplete is visible
  if (autocomplete.style.display !== 'block') return;

  const items = autocomplete.querySelectorAll('.autocomplete-item');
  const selectedItem = autocomplete.querySelector('.selected');
  let selectedIndex = -1;

  // Find the currently selected item index
  if (selectedItem) {
    for (let i = 0; i < items.length; i++) {
      if (items[i] === selectedItem) {
        selectedIndex = i;
        break;
      }
    }
  }

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      // Select next item or first if none selected
      if (selectedIndex < items.length - 1) {
        if (selectedItem) selectedItem.classList.remove('selected');
        items[selectedIndex + 1].classList.add('selected');
        window.uiUtils.ensureVisible(items[selectedIndex + 1], autocomplete);
      } else if (items.length > 0 && selectedIndex === -1) {
        items[0].classList.add('selected');
        window.uiUtils.ensureVisible(items[0], autocomplete);
      }
      break;

    case 'ArrowUp':
      e.preventDefault();
      // Select previous item or last if none selected
      if (selectedIndex > 0) {
        if (selectedItem) selectedItem.classList.remove('selected');
        items[selectedIndex - 1].classList.add('selected');
        window.uiUtils.ensureVisible(items[selectedIndex - 1], autocomplete);
      } else if (items.length > 0 && selectedIndex === -1) {
        items[items.length - 1].classList.add('selected');
        window.uiUtils.ensureVisible(items[items.length - 1], autocomplete);
      }
      break;

    case 'Enter':
      // Apply the selected suggestion
      if (selectedItem) {
        e.preventDefault();
        const cookieName = selectedItem.getAttribute('data-name');
        document.getElementById('cookie-search').value = cookieName;
        filterCookies(cookieName);
        autocomplete.style.display = 'none';
      }
      break;

    case 'Escape':
      // Hide autocomplete
      autocomplete.style.display = 'none';
      break;
  }
}


// Clear search input
function clearSearchInput() {
  const searchInput = document.getElementById('cookie-search');
  searchInput.value = '';
  document.getElementById('clear-search').style.display = 'none';
  document.getElementById('search-autocomplete').style.display = 'none';
  displayCookies(allCookies);
  searchInput.focus();
}

// Filter cookies based on search term
function filterCookies(searchTerm) {
  if (!searchTerm) {
    displayCookies(allCookies);
    return;
  }

  // Convert search term to lowercase for case-insensitive matching
  const term = searchTerm.toLowerCase();

  // Filter cookies that match the search term
  const filteredCookies = allCookies.filter(cookie => {
    // Check cookie name
    if (cookie.name.toLowerCase().includes(term)) return true;

    // Check cookie domain
    if (cookie.domain.toLowerCase().includes(term)) return true;

    // Check cookie value (partial match)
    if (cookie.value.toLowerCase().includes(term)) return true;

    return false;
  });

  // Display filtered cookies
  window.cookieLoaderUtils.displayCookies(filteredCookies);
}

// Show autocomplete suggestions
function showAutocomplete(searchTerm) {
  const autocomplete = document.getElementById('search-autocomplete');

  if (!searchTerm) {
    autocomplete.style.display = 'none';
    return;
  }

  // Get unique cookie names for autocomplete
  const term = searchTerm.toLowerCase();
  const suggestions = [];
  const addedNames = new Set();

  // Find matching cookie names
  allCookies.forEach(cookie => {
    if (cookie.name.toLowerCase().includes(term) && !addedNames.has(cookie.name)) {
      suggestions.push(cookie.name);
      addedNames.add(cookie.name);
    }
  });

  // Sort suggestions by relevance (exact match first, then startsWith, then includes)
  suggestions.sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();

    // Exact match gets highest priority
    if (aLower === term && bLower !== term) return -1;
    if (bLower === term && aLower !== term) return 1;

    // Then startsWith
    if (aLower.startsWith(term) && !bLower.startsWith(term)) return -1;
    if (bLower.startsWith(term) && !aLower.startsWith(term)) return 1;

    // Then alphabetical
    return a.localeCompare(b);
  });

  // Limit to top 10 suggestions
  const topSuggestions = suggestions.slice(0, 10);

  // Display suggestions
  if (topSuggestions.length > 0) {
    autocomplete.innerHTML = '';

    topSuggestions.forEach(name => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.setAttribute('data-name', name);

      // Highlight the matching part
      const index = name.toLowerCase().indexOf(term);
      if (index >= 0) {
        const before = name.substring(0, index);
        const match = name.substring(index, index + term.length);
        const after = name.substring(index + term.length);
        item.innerHTML = `${before}<span class="highlight">${match}</span>${after}`;
      } else {
        item.textContent = name;
      }

      // Add click event to apply the suggestion
      item.addEventListener('click', () => {
        document.getElementById('cookie-search').value = name;
        filterCookies(name);
        autocomplete.style.display = 'none';
      });

      autocomplete.appendChild(item);
    });

    autocomplete.style.display = 'block';
  } else {
    // Show "no results" message
    autocomplete.innerHTML = '<div class="no-results">No matching cookies found</div>';
    autocomplete.style.display = 'block';
  }
}

// Load IP information and risk assessment
function loadIpInfoAndRiskAssessment() {
  // Fetch IP information
  fetch('https://ip234.in/ip.json')
    .then(response => response.json())
    .then(data => {
      const ipInfoDiv = document.getElementById('ip-info');
      ipInfoDiv.innerHTML = `
        <p>IP: ${data.ip}</p>
        <p>City: ${data.city}</p>
        <p>Country: ${data.country}</p>
        <p>Organization: ${data.organization}</p>
        <p>Timezone: ${data.timezone}</p>
      `;
    })
    .catch(error => {
      document.getElementById('ip-info').textContent = 'Failed to load IP information.';
      console.error('Error fetching IP info:', error);
    });

  // Fetch risk assessment
  fetch('https://ip234.in/f.json')
    .then(response => response.json())
    .then(data => {
      const riskAssessmentDiv = document.getElementById('risk-assessment');
      const score = data.data.score;
      const risk = data.data.risk;
      const color = getRiskColor(score);
      riskAssessmentDiv.innerHTML = `
        <p>Risk: <span style="color: ${color}">${risk}</span></p>
        <p>Score: <span style="color: ${color}">${score}/100</span></p>
      `;
    })
    .catch(error => {
      document.getElementById('risk-assessment').textContent = 'Failed to load risk assessment.';
      console.error('Error fetching risk assessment:', error);
    });
}

// Get color based on risk score (0-100)
function getRiskColor(score) {
  // Convert score to a value between 0 and 1
  const normalizedScore = score / 100;

  // Green to Blue gradient
  // Green: rgb(0, 128, 0)
  // Blue: rgb(0, 0, 255)
  const green = Math.round(128 * (1 - normalizedScore));
  const blue = Math.round(255 * normalizedScore);

  return `rgb(0, ${green}, ${blue})`;
}


