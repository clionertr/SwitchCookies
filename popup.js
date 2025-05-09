// Global variables
let currentUrl = '';
let currentDomain = '';
let currentTab = null;
// let includeSubdomains = true; // Default to true - Moved to settingsManager.js
let allCookies = []; // Store all cookies for search functionality
// searchTimeout has been moved to src/popup/searchManager.js
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
    // loadIpInfoAndRiskAssessment(); // Moved to ipInfoManagerUtils
    if (window.ipInfoManagerUtils && typeof window.ipInfoManagerUtils.loadIpInfoAndRiskAssessment === 'function') {
      window.ipInfoManagerUtils.loadIpInfoAndRiskAssessment();
    } else {
      console.warn('initializeApp: ipInfoManagerUtils.loadIpInfoAndRiskAssessment not available yet.');
    }
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
    // loadIpInfoAndRiskAssessment(); // Moved to ipInfoManagerUtils
    if (window.ipInfoManagerUtils && typeof window.ipInfoManagerUtils.loadIpInfoAndRiskAssessment === 'function') {
      window.ipInfoManagerUtils.loadIpInfoAndRiskAssessment();
    } else {
      console.warn('initializeApp catch: ipInfoManagerUtils.loadIpInfoAndRiskAssessment not available yet.');
    }
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

  // "include-subdomains" checkbox logic is now handled by settingsManager.js
  if (window.settingsManagerUtils && typeof window.settingsManagerUtils.initIncludeSubdomainsSetting === 'function') {
    window.settingsManagerUtils.initIncludeSubdomainsSetting();
  } else {
    console.warn('initializeApp: settingsManagerUtils.initIncludeSubdomainsSetting not available yet.');
  }

  // Cookie search functionality is now initialized by searchManager.js
  // Ensure allCookies is initialized before calling initSearchFunctionality
  if (window.searchManagerUtils && typeof window.searchManagerUtils.initSearchFunctionality === 'function') {
    // We need to ensure allCookies is populated before this call.
    // For now, we pass the reference. The actual population happens in cookieLoaderUtils.loadCurrentCookies
    // which updates this allCookies array.
    window.searchManagerUtils.initSearchFunctionality(allCookies);
  } else {
    console.warn('initializeApp: searchManagerUtils.initSearchFunctionality not available yet.');
  }

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
    nightModeManagerUtils: window.nightModeManagerUtils, // Added night mode module
    ipInfoManagerUtils: window.ipInfoManagerUtils, // Added IP info module
    searchManagerUtils: window.searchManagerUtils, // Added search manager module
    settingsManagerUtils: window.settingsManagerUtils // Added settings manager module
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

// Search functions (handleSearchInput, handleSearchKeydown, clearSearchInput, filterCookies, showAutocomplete)
// have been moved to src/popup/searchManager.js and are accessible via window.searchManagerUtils.initSearchFunctionality

// Functions loadIpInfoAndRiskAssessment and getRiskColor
// have been moved to src/popup/ipInfoManager.js and are accessible via window.ipInfoManagerUtils


