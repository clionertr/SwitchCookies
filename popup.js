// Global variables
let currentUrl = '';
let currentDomain = '';
let currentTab = null;
let currentEditingCookie = null;
let includeSubdomains = true; // Default to true
let allCookies = []; // Store all cookies for search functionality
let searchTimeout = null; // For debouncing search input
// ===== 多语言支持 =====
const LANGUAGES = {
  "zh-CN": {
    title: "SwitchCookies",
    current_site: "当前站点",
    current_site_loading: "加载中...",
    cookie_profiles: "Cookie 配置",
    profile_name_placeholder: "配置名称",
    save_current_cookies: "保存当前Cookies",
    no_saved_profiles: "暂无已保存配置",
    cookie_management: "Cookie 管理",
    include_all_subdomains: "包含所有子域名（如：www.example.com 和 login.example.com）",
    export_cookies: "导出Cookies",
    import_cookies: "导入Cookies",
    clear_all_cookies: "清除当前网站及其所有子域名的Cookies",
    export_all_cookies: "导出全部Cookies",
    export_all_warning: "警告：导出全部Cookies存在安全风险，可能导致账户泄露，请谨慎操作。",
    current_cookies: "当前Cookies",
    search_cookies_placeholder: "搜索Cookies...",
    clear_search_btn: "×",
    loading_cookies: "正在加载Cookies...",
    no_cookies_found: "未找到该站点的Cookies",
    no_matching_cookies: "未找到匹配的Cookies",
    edit: "编辑",
    matches_current_site: "匹配当前站点",
    all_subdomains: "全部子域名",
    includes_cookies_from_subdomains: "包含来自子域名的Cookies",
    ip_info: "IP信息",
    loading_ip_info: "正在加载IP信息...",
    risk_assessment: "风险评估",
    loading_risk_assessment: "正在加载风险评估...",
    night_mode: "夜间模式",
    enable_night_mode: "启用夜间模式",
    brightness: "亮度",
    contrast: "对比度",
    edit_cookie: "编辑Cookie",
    cookie_name: "名称",
    cookie_value: "值",
    cookie_domain: "域名",
    cookie_path: "路径",
    cookie_expiration: "过期时间",
    cookie_same_site: "Same Site",
    no_restriction: "无限制",
    lax: "Lax",
    strict: "Strict",
    host_only: "仅主机",
    session: "会话",
    secure: "安全",
    http_only: "Http Only",
    save: "保存",
    cancel: "取消",
    clear_all_cookies_modal: "清除当前网站及其所有子域名的Cookies",
    clear_all_cookies_confirm: "确定要清除 <span id=\"clear-domain\" class=\"highlight-text\"></span> 及其所有子域名的Cookies吗？",
    cookies_to_be_removed: "以下Cookies将被移除：",
    include_all_subdomains_modal: "包含所有子域名（推荐）",
    clear_all: "全部清除",
    only_current_site: "仅当前网站",
    clear_only_current_site: "清除当前网站Cookies",
    clear_only_current_site_modal: "清除当前网站Cookies",
    clear_only_current_site_confirm: "确定要清除 <span id=\"clear-domain\" class=\"highlight-text\"></span> 的Cookies吗？",
    clear_only: "仅清除当前网站",
  },
  "en-US": {
    title: "SwitchCookies",
    current_site: "Current Site",
    current_site_loading: "Loading...",
    cookie_profiles: "Cookie Profiles",
    profile_name_placeholder: "Profile name",
    save_current_cookies: "Save Current Cookies",
    no_saved_profiles: "No saved profiles",
    cookie_management: "Cookie Management",
    include_all_subdomains: "Include all subdomains (e.g., www.example.com and login.example.com)",
    export_cookies: "Export Cookies",
    import_cookies: "Import Cookies",
    clear_all_cookies: "Clear cookies for this site and all its subdomains",
    export_all_cookies: "Export All Cookies",
    export_all_warning: "Warning: Exporting all cookies is a security risk and may lead to account leakage. Please proceed with caution.",
    current_cookies: "Current Cookies",
    search_cookies_placeholder: "Search cookies...",
    clear_search_btn: "×",
    loading_cookies: "Loading cookies...",
    no_cookies_found: "No cookies found for this site",
    no_matching_cookies: "No matching cookies found",
    edit: "Edit",
    matches_current_site: "Matches current site",
    all_subdomains: "All Subdomains",
    includes_cookies_from_subdomains: "Includes cookies from subdomains",
    ip_info: "IP Information",
    loading_ip_info: "Loading IP information...",
    risk_assessment: "Risk Assessment",
    loading_risk_assessment: "Loading risk assessment...",
    night_mode: "Night Mode",
    enable_night_mode: "Enable Night Mode",
    brightness: "Brightness",
    contrast: "Contrast",
    edit_cookie: "Edit Cookie",
    cookie_name: "Name",
    cookie_value: "Value",
    cookie_domain: "Domain",
    cookie_path: "Path",
    cookie_expiration: "Expiration",
    cookie_same_site: "Same Site",
    no_restriction: "No Restriction",
    lax: "Lax",
    strict: "Strict",
    host_only: "Host Only",
    session: "Session",
    secure: "Secure",
    http_only: "Http Only",
    save: "Save",
    cancel: "Cancel",
    clear_all_cookies_modal: "Clear cookies for this site and all its subdomains",
    clear_all_cookies_confirm: "Are you sure you want to clear cookies for <span id=\"clear-domain\" class=\"highlight-text\"></span> and all its subdomains?",
    cookies_to_be_removed: "The following cookies will be removed:",
    include_all_subdomains_modal: "Include all subdomains (recommended)",
    clear_all: "Clear All",
    only_current_site: "Only current site",
    clear_only_current_site: "Clear cookies for this site only",
    clear_only_current_site_modal: "Clear cookies for this site only",
    clear_only_current_site_confirm: "Are you sure you want to clear cookies for <span id=\"clear-domain\" class=\"highlight-text\"></span> only?",
    clear_only: "Clear only current site",
  }
};

function getUserLang() {
  return localStorage.getItem('switchcookies_lang') || (navigator.language === 'zh-CN' ? 'zh-CN' : 'en-US');
}

function setUserLang(lang) {
  localStorage.setItem('switchcookies_lang', lang);
}

function applyI18n(lang) {
  const dict = LANGUAGES[lang] || LANGUAGES['en-US'];
  // 普通文本
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        el.value = dict[key];
      } else if (el.tagName === 'P' || el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'LABEL' || el.tagName === 'BUTTON' || el.tagName === 'SPAN' || el.tagName === 'DIV') {
        // 特殊处理带HTML的内容
        if (dict[key].includes('<span')) {
          el.innerHTML = dict[key];
        } else {
          el.textContent = dict[key];
        }
      }
    }
  });
  // placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) {
      el.setAttribute('placeholder', dict[key]);
    }
  });
  // select下拉选项
  document.querySelectorAll('option[data-i18n]').forEach(opt => {
    const key = opt.getAttribute('data-i18n');
    if (dict[key]) {
      opt.textContent = dict[key];
    }
  });
}

// 语言切换按钮逻辑
document.addEventListener('DOMContentLoaded', function() {
  const langBtn = document.getElementById('lang-switch-btn');
  const langSelect = document.getElementById('lang-select');
  if (langBtn && langSelect) {
    // 初始化下拉框
    const userLang = getUserLang();
    langSelect.value = userLang;
    applyI18n(userLang);

    langBtn.addEventListener('click', () => {
      langSelect.style.display = langSelect.style.display === 'none' ? 'inline-block' : 'none';
    });
    langSelect.addEventListener('change', () => {
      setUserLang(langSelect.value);
      applyI18n(langSelect.value);
      langSelect.style.display = 'none';
    });
    // 点击页面其他地方关闭下拉
    document.addEventListener('click', (e) => {
      if (e.target !== langBtn && e.target !== langSelect) {
        langSelect.style.display = 'none';
      }
    });
  } else {
    // 兜底：直接应用语言
    applyI18n(getUserLang());
  }
});

// Initialize the popup
document.addEventListener('DOMContentLoaded', function() {
  // Get the current tab information
  getCurrentTab().then(tab => {
    currentTab = tab;
    currentUrl = tab.url;
    currentDomain = extractDomain(currentUrl);
    document.getElementById('current-site').textContent = currentDomain;

    // Load cookies for the current site
    loadCurrentCookies();

    // Load saved profiles
    loadProfiles();

    // Load IP information and risk assessment
    loadIpInfoAndRiskAssessment();
  });

  // Set up event listeners
  document.getElementById('save-profile').addEventListener('click', saveCurrentProfile);
  document.getElementById('export-cookies').addEventListener('click', exportCookies);
  document.getElementById('export-all-cookies').addEventListener('click', exportAllCookies);
  document.getElementById('import-cookies').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', importCookies);

  // Set up subdomain checkbox event listener
  const includeSubdomainsCheckbox = document.getElementById('include-subdomains');

  // Load saved preference
  chrome.storage.local.get('includeSubdomains', result => {
    if (result.includeSubdomains !== undefined) {
      includeSubdomains = result.includeSubdomains;
      includeSubdomainsCheckbox.checked = includeSubdomains;
    }
  });

  // Add event listener for the checkbox
  includeSubdomainsCheckbox.addEventListener('change', function() {
    includeSubdomains = this.checked;
    // Save the preference
    chrome.storage.local.set({ includeSubdomains: includeSubdomains }, () => {
      // Reload cookies with the new setting
      loadCurrentCookies();
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

  closeBtn.addEventListener('click', closeCookieEditor);
  saveCookieBtn.addEventListener('click', saveCookieChanges);
  cancelCookieBtn.addEventListener('click', closeCookieEditor);

  // Clear cookies modal event listeners
  const clearCookiesBtn = document.getElementById('clear-cookies');
  const clearCookiesModal = document.getElementById('clear-cookies-modal');
  const clearCookiesCloseBtn = clearCookiesModal.querySelector('.clear-cookies-close');
  const confirmClearBtn = document.getElementById('confirm-clear-btn');
  const cancelClearBtn = document.getElementById('cancel-clear-btn');

  clearCookiesBtn.addEventListener('click', showClearCookiesConfirmation);
  clearCookiesCloseBtn.addEventListener('click', closeClearCookiesModal);
  confirmClearBtn.addEventListener('click', clearAllCookies);
  cancelClearBtn.addEventListener('click', closeClearCookiesModal);

  // Close modals when clicking outside of them
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeCookieEditor();
    }
    if (event.target === clearCookiesModal) {
      closeClearCookiesModal();
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
        centerModalInViewport(modal);
      }
      if (clearCookiesModal.style.display === 'block') {
        centerModalInViewport(clearCookiesModal);
      }
    }, 100); // 100ms延迟
  });

  // 初始化夜间模式
  initNightMode();

  // 夜间模式初始化和事件监听
  function initNightMode() {
    const nightModeToggle = document.getElementById('night-mode-toggle');
    const brightnessSlider = document.getElementById('brightness');
    const contrastSlider = document.getElementById('contrast');
    const quickToggleButton = document.getElementById('quick-night-mode-toggle');

    // 检测浏览器主题设置
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // 加载保存的夜间模式设置，如果没有则使用浏览器主题设置
    chrome.storage.local.get(['nightMode', 'brightness', 'contrast'], result => {
      let initialNightMode = prefersDarkMode;
      if (result.nightMode !== undefined) {
        initialNightMode = result.nightMode;
      }
      nightModeToggle.checked = initialNightMode;
      document.body.classList.toggle('night-mode', initialNightMode);
      updateQuickToggleIcon(initialNightMode);
      updateScrollbarStyles(initialNightMode);

      if (result.brightness !== undefined) {
        brightnessSlider.value = result.brightness;
        document.body.style.filter = `brightness(${result.brightness}%)`;
      } else {
        document.body.style.filter = `brightness(80%)`;
      }
      if (result.contrast !== undefined) {
        contrastSlider.value = result.contrast;
        document.body.style.filter += ` contrast(${result.contrast}%)`;
      } else {
        document.body.style.filter += ` contrast(100%)`;
      }
    });

    // 夜间模式开关事件监听
    nightModeToggle.addEventListener('change', function() {
      const isNightMode = this.checked;
      document.body.classList.toggle('night-mode', isNightMode);
      updateQuickToggleIcon(isNightMode);
      updateScrollbarStyles(isNightMode);
      chrome.storage.local.set({ nightMode: isNightMode });
    });

    // 快速切换按钮事件监听
    quickToggleButton.addEventListener('click', function() {
      const currentState = nightModeToggle.checked;
      const newState = !currentState;
      nightModeToggle.checked = newState;
      document.body.classList.toggle('night-mode', newState);
      updateQuickToggleIcon(newState);
      updateScrollbarStyles(newState);
      chrome.storage.local.set({ nightMode: newState });
    });

    // 亮度调整事件监听
    brightnessSlider.addEventListener('input', function() {
      const brightness = this.value;
      document.body.style.filter = `brightness(${brightness}%) contrast(${contrastSlider.value}%)`;
      chrome.storage.local.set({ brightness: brightness });
    });

    // 对比度调整事件监听
    contrastSlider.addEventListener('input', function() {
      const contrast = this.value;
      document.body.style.filter = `brightness(${brightnessSlider.value}%) contrast(${contrast}%)`;
      chrome.storage.local.set({ contrast: contrast });
    });

    // 监听浏览器主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      chrome.storage.local.get(['nightMode'], result => {
        // 只有当用户没有明确设置夜间模式时才跟随系统变化
        if (result.nightMode === undefined) {
          const newNightMode = e.matches;
          nightModeToggle.checked = newNightMode;
          document.body.classList.toggle('night-mode', newNightMode);
          updateQuickToggleIcon(newNightMode);
        }
      });
    });
  }

  // 更新快速切换按钮图标
  function updateQuickToggleIcon(isNightMode) {
    const quickToggleButton = document.getElementById('quick-night-mode-toggle');
    quickToggleButton.textContent = isNightMode ? '☀️' : '🌙';
  }

  // 强制更新滚动条样式
  function updateScrollbarStyles(isNightMode) {
    // 同时更新HTML元素的类
    document.documentElement.classList.toggle('night-mode', isNightMode);

    // 创建一个临时样式元素强制刷新滚动条样式
    const styleEl = document.createElement('style');

    if (isNightMode) {
      // 夜间模式滚动条样式
      styleEl.textContent = `
        ::-webkit-scrollbar,
        *::-webkit-scrollbar {
          width: 8px !important;
          height: 8px !important;
        }

        ::-webkit-scrollbar-track,
        *::-webkit-scrollbar-track {
          background: #2d2d2d !important;
          border-radius: 4px !important;
          border-left: none !important;
          border: none !important;
          box-shadow: none !important;
        }

        ::-webkit-scrollbar-thumb,
        *::-webkit-scrollbar-thumb {
          background: #111 !important;
          border-radius: 4px !important;
          border: none !important;
          box-shadow: none !important;
        }

        ::-webkit-scrollbar-thumb:hover,
        *::-webkit-scrollbar-thumb:hover {
          background: #222 !important;
        }

        ::-webkit-scrollbar-corner,
        *::-webkit-scrollbar-corner {
          background: #2d2d2d !important;
        }
      `;
    } else {
      // 日间模式滚动条样式
      styleEl.textContent = `
        ::-webkit-scrollbar,
        *::-webkit-scrollbar {
          width: 8px !important;
          height: 8px !important;
        }

        ::-webkit-scrollbar-track,
        *::-webkit-scrollbar-track {
          background: #f1f1f1 !important;
          border-radius: 4px !important;
        }

        ::-webkit-scrollbar-thumb,
        *::-webkit-scrollbar-thumb {
          background: #ccc !important;
          border-radius: 4px !important;
        }

        ::-webkit-scrollbar-thumb:hover,
        *::-webkit-scrollbar-thumb:hover {
          background: #aaa !important;
        }
      `;
    }

    // 添加到文档中
    document.head.appendChild(styleEl);

    // 短暂延迟后移除，以确保样式已被应用
    setTimeout(() => {
      document.head.removeChild(styleEl);
    }, 100);

    // 强制重绘所有可滚动元素
    const scrollableElements = document.querySelectorAll('.profiles-list, .cookies-container, .modal-content, .cookies-list-confirm, .search-autocomplete');
    scrollableElements.forEach(el => {
      // 临时修改样式触发重绘
      const originalDisplay = el.style.display;
      el.style.display = 'none';
      // 强制重排/重绘
      void el.offsetHeight;
      el.style.display = originalDisplay;
    });
  }
});

// Get the current active tab
async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

// Extract domain from URL
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return '';
  }
}

// Extract root domain from hostname
function extractRootDomain(hostname) {
  const parts = hostname.split('.');
  if (parts.length <= 2) {
    return hostname; // Already a root domain like "example.com"
  }

  // Handle special cases like co.uk, com.au, etc.
  const tld = parts[parts.length - 1];
  const sld = parts[parts.length - 2];

  // Check if it's a country code TLD with a second-level domain
  if (tld.length === 2 && sld.length <= 3) {
    // This might be something like example.co.uk
    return parts.slice(-3).join('.');
  }

  // Regular case like sub.example.com
  return parts.slice(-2).join('.');
}

// Load cookies for the current site
function loadCurrentCookies() {
  const cookiesList = document.getElementById('cookies-list');
  cookiesList.innerHTML = LANGUAGES[getUserLang()].loading_cookies;

  // Determine which domain to use for cookie retrieval
  let domainFilter;
  if (includeSubdomains) {
    // Get the root domain to include all subdomains
    const rootDomain = extractRootDomain(currentDomain);
    domainFilter = rootDomain;
  } else {
    // Use the exact current domain
    domainFilter = currentDomain;
  }

  chrome.cookies.getAll({ domain: domainFilter }, cookies => {
    if (cookies.length === 0) {
      cookiesList.innerHTML = '<div class="no-cookies">' + LANGUAGES[getUserLang()].no_cookies_found + '</div>';
      allCookies = []; // Clear stored cookies
      return;
    }

    // Filter cookies to only show those relevant to the current domain or its subdomains
    const relevantCookies = includeSubdomains
      ? cookies
      : cookies.filter(cookie => cookie.domain === currentDomain || cookie.domain === '.' + currentDomain);

    if (relevantCookies.length === 0) {
      cookiesList.innerHTML = '<div class="no-cookies">' + LANGUAGES[getUserLang()].no_cookies_found + '</div>';
      allCookies = []; // Clear stored cookies
      return;
    }

    // Store cookies for search functionality
    allCookies = relevantCookies;

    // Check if there's an active search
    const searchInput = document.getElementById('cookie-search');
    if (searchInput.value.trim()) {
      // If there's a search term, filter cookies
      filterCookies(searchInput.value.trim());
      return;
    }

    // Otherwise display all cookies
    displayCookies(relevantCookies);
  });
}

// Display cookies in the list
function displayCookies(cookiesToDisplay) {
  const cookiesList = document.getElementById('cookies-list');
  cookiesList.innerHTML = '';

  if (cookiesToDisplay.length === 0) {
    cookiesList.innerHTML = '<div class="no-cookies">' + LANGUAGES[getUserLang()].no_matching_cookies + '</div>';
    return;
  }

  cookiesToDisplay.forEach(cookie => {
    const cookieItem = document.createElement('div');
    cookieItem.className = 'cookie-item';

    const cookieText = document.createElement('div');
    cookieText.className = 'cookie-item-text';

    // Show domain for subdomain cookies
    const domainPrefix = cookie.domain !== currentDomain && cookie.domain !== '.' + currentDomain
      ? `[${cookie.domain}] `
      : '';

    cookieText.textContent = `${domainPrefix}${cookie.name}: ${cookie.value.substring(0, 30)}${cookie.value.length > 30 ? '...' : ''}`;

    const cookieActions = document.createElement('div');
    cookieActions.className = 'cookie-item-actions';

    const editButton = document.createElement('button');
    editButton.textContent = LANGUAGES[getUserLang()].edit;
    editButton.addEventListener('click', () => openCookieEditor(cookie));

    cookieActions.appendChild(editButton);
    cookieItem.appendChild(cookieText);
    cookieItem.appendChild(cookieActions);

    cookiesList.appendChild(cookieItem);
  });
}

// Load saved profiles
function loadProfiles() {
  const profilesList = document.getElementById('profiles-list');

  chrome.storage.local.get('cookieProfiles', result => {
    const profiles = result.cookieProfiles || {};

    if (Object.keys(profiles).length === 0) {
      profilesList.innerHTML = '<div class="no-profiles">' + LANGUAGES[getUserLang()].no_saved_profiles + '</div>';
      return;
    }

    profilesList.innerHTML = '';

    // Convert profiles object to array for sorting
    const profilesArray = Object.entries(profiles).map(([name, profile]) => ({
      name,
      profile,
      // Check if profile matches current domain
      isMatching: isProfileMatchingCurrentDomain(profile)
    }));

    // Sort profiles: matching profiles first, then by name
    profilesArray.sort((a, b) => {
      // First sort by matching status (matching profiles first)
      if (a.isMatching && !b.isMatching) return -1;
      if (!a.isMatching && b.isMatching) return 1;
      // Then sort alphabetically by name
      return a.name.localeCompare(b.name);
    });

    // Create profile elements
    profilesArray.forEach(({ name, profile, isMatching }) => {
      const profileItem = document.createElement('div');
      profileItem.className = 'profile-item';

      // Add matching class for styling
      if (isMatching) {
        profileItem.classList.add('matching');
      }

      const profileInfoDiv = document.createElement('div');
      profileInfoDiv.className = 'profile-info';

      const profileNameSpan = document.createElement('span');
      profileNameSpan.className = 'profile-name';
      profileNameSpan.textContent = name;

      profileInfoDiv.appendChild(profileNameSpan);

      // Add matching indicator if the profile matches current domain
      if (isMatching) {
        const matchingBadge = document.createElement('span');
        matchingBadge.className = 'matching-badge';
        matchingBadge.title = LANGUAGES[getUserLang()].matches_current_site;
        matchingBadge.textContent = LANGUAGES[getUserLang()].current_site;
        profileInfoDiv.appendChild(matchingBadge);
      }

      // Add subdomain indicator if the profile includes subdomains
      if (profile.includesSubdomains) {
        const subdomainBadge = document.createElement('span');
        subdomainBadge.className = 'subdomain-badge';
        subdomainBadge.title = LANGUAGES[getUserLang()].includes_cookies_from_subdomains;
        subdomainBadge.textContent = LANGUAGES[getUserLang()].all_subdomains;
        profileInfoDiv.appendChild(subdomainBadge);
      }

      // Add cookie count
      const cookieCount = document.createElement('span');
      cookieCount.className = 'cookie-count';
      cookieCount.textContent = `${profile.cookies.length} cookies`;
      profileInfoDiv.appendChild(cookieCount);

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'profile-actions';

      const applyButton = document.createElement('button');
      applyButton.textContent = 'Apply';
      applyButton.addEventListener('click', () => applyProfile(name));

      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => deleteProfile(name));

      actionsDiv.appendChild(applyButton);
      actionsDiv.appendChild(deleteButton);

      profileItem.appendChild(profileInfoDiv);
      profileItem.appendChild(actionsDiv);

      profilesList.appendChild(profileItem);
    });
  });
}

// Check if a profile matches the current domain
function isProfileMatchingCurrentDomain(profile) {
  // Exact domain match
  if (profile.domain === currentDomain) {
    return true;
  }

  // Check if profile domain is a subdomain of current domain or vice versa
  const profileRootDomain = extractRootDomain(profile.domain);
  const currentRootDomain = extractRootDomain(currentDomain);

  // If root domains match and profile includes subdomains
  if (profileRootDomain === currentRootDomain && profile.includesSubdomains) {
    return true;
  }

  // Check if profile domain is a parent domain of current domain
  if (currentDomain.endsWith('.' + profile.domain)) {
    return true;
  }

  // Check if current domain is a parent domain of profile domain
  if (profile.domain.endsWith('.' + currentDomain)) {
    return true;
  }

  return false;
}

// Save current cookies as a profile
function saveCurrentProfile() {
  const profileName = document.getElementById('profile-name').value.trim();

  if (!profileName) {
    alert('Please enter a profile name');
    return;
  }

  // Determine which domain to use for cookie retrieval
  let domainFilter;
  if (includeSubdomains) {
    // Get the root domain to include all subdomains
    const rootDomain = extractRootDomain(currentDomain);
    domainFilter = rootDomain;
  } else {
    // Use the exact current domain
    domainFilter = currentDomain;
  }

  chrome.cookies.getAll({ domain: domainFilter }, cookies => {
    // Filter cookies to only save those relevant to the current domain or its subdomains
    const relevantCookies = includeSubdomains
      ? cookies
      : cookies.filter(cookie => cookie.domain === currentDomain || cookie.domain === '.' + currentDomain);

    if (relevantCookies.length === 0) {
      alert('No cookies found to save');
      return;
    }

    chrome.storage.local.get('cookieProfiles', result => {
      const profiles = result.cookieProfiles || {};

      profiles[profileName] = {
        domain: currentDomain,
        cookies: relevantCookies,
        includesSubdomains: includeSubdomains,
        createdAt: new Date().toISOString()
      };

      chrome.storage.local.set({ cookieProfiles: profiles }, () => {
        alert(`Profile "${profileName}" saved successfully with ${relevantCookies.length} cookies!`);
        document.getElementById('profile-name').value = '';
        loadProfiles();
      });
    });
  });
}

// Apply a saved profile
function applyProfile(profileName) {
  chrome.storage.local.get('cookieProfiles', result => {
    const profiles = result.cookieProfiles || {};
    const profile = profiles[profileName];

    if (!profile) {
      alert('Profile not found');
      return;
    }

    if (profile.domain !== currentDomain) {
      if (!confirm(`This profile was saved for ${profile.domain}, but you're currently on ${currentDomain}. Apply anyway?`)) {
        return;
      }
    }

    // First, remove existing cookies
    chrome.cookies.getAll({ domain: currentDomain }, existingCookies => {
      existingCookies.forEach(cookie => {
        const url = (cookie.secure ? "https://" : "http://") +
                    (cookie.domain.charAt(0) === '.' ? cookie.domain.substr(1) : cookie.domain) +
                    cookie.path;

        chrome.cookies.remove({
          url: url,
          name: cookie.name
        });
      });

      // Then set the new cookies
      profile.cookies.forEach(cookie => {
        const url = (cookie.secure ? "https://" : "http://") +
                    (cookie.domain.charAt(0) === '.' ? cookie.domain.substr(1) : cookie.domain) +
                    cookie.path;

        // Create the cookie object
        const newCookie = {
          url: url,
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite
        };

        // Add expiration if it exists
        if (cookie.expirationDate) {
          newCookie.expirationDate = cookie.expirationDate;
        }

        chrome.cookies.set(newCookie);
      });

      // Refresh the current tab
      chrome.tabs.reload(currentTab.id, {}, () => {
        alert(`Profile "${profileName}" applied successfully! The page has been refreshed.`);
        loadCurrentCookies();
        loadProfiles(); // Reload profiles to update matching status
      });
    });
  });
}

// Delete a profile
function deleteProfile(profileName) {
  if (confirm(`Are you sure you want to delete the profile "${profileName}"?`)) {
    chrome.storage.local.get('cookieProfiles', result => {
      const profiles = result.cookieProfiles || {};

      if (profiles[profileName]) {
        delete profiles[profileName];

        chrome.storage.local.set({ cookieProfiles: profiles }, () => {
          alert(`Profile "${profileName}" deleted successfully!`);
          loadProfiles();
        });
      }
    });
  }
}

// Export cookies to a JSON file
function exportCookies() {
  // Determine which domain to use for cookie retrieval
  let domainFilter;
  if (includeSubdomains) {
    // Get the root domain to include all subdomains
    const rootDomain = extractRootDomain(currentDomain);
    domainFilter = rootDomain;
  } else {
    // Use the exact current domain
    domainFilter = currentDomain;
  }

  chrome.cookies.getAll({ domain: domainFilter }, cookies => {
    // Filter cookies to only export those relevant to the current domain or its subdomains
    const relevantCookies = includeSubdomains
      ? cookies
      : cookies.filter(cookie => cookie.domain === currentDomain || cookie.domain === '.' + currentDomain);

    if (relevantCookies.length === 0) {
      alert('No cookies found to export');
      return;
    }

    const cookiesData = {
      domain: currentDomain,
      cookies: relevantCookies,
      includesSubdomains: includeSubdomains,
      exportedAt: new Date().toISOString()
    };

    const dataStr = JSON.stringify(cookiesData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const subdomainSuffix = includeSubdomains ? '-with-subdomains' : '';
    const exportFileDefaultName = `cookies-${currentDomain}${subdomainSuffix}-${new Date().toISOString().slice(0, 10)}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  });
}

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

// Import cookies from a JSON file
function importCookies(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const cookiesData = JSON.parse(e.target.result);

      // 兼容全部导出格式
      if (cookiesData.allDomains && cookiesData.cookiesByDomain) {
        // 多域名批量导入
        const domains = Object.keys(cookiesData.cookiesByDomain);
        let importedCount = 0;
        let totalCookies = 0;
        domains.forEach(domain => {
          const cookiesArr = cookiesData.cookiesByDomain[domain];
          totalCookies += cookiesArr.length;
          cookiesArr.forEach(cookie => {
            const url = (cookie.secure ? "https://" : "http://") +
                        (cookie.domain.charAt(0) === '.' ? cookie.domain.substr(1) : cookie.domain) +
                        cookie.path;
            const newCookie = {
              url: url,
              name: cookie.name,
              value: cookie.value,
              domain: cookie.domain,
              path: cookie.path,
              secure: cookie.secure,
              httpOnly: cookie.httpOnly,
              sameSite: cookie.sameSite
            };
            if (cookie.expirationDate) {
              newCookie.expirationDate = cookie.expirationDate;
            }
            chrome.cookies.set(newCookie, () => {
              importedCount++;
              // 导入完成后提示
              if (importedCount === totalCookies) {
                alert('全部Cookies已导入，建议刷新相关页面。\\nAll cookies have been imported. Please refresh related pages.');
                loadCurrentCookies();
                loadProfiles();
              }
            });
          });
        });
        return;
      }

      // 单域名导入（原有逻辑）
      if (!cookiesData.domain || !Array.isArray(cookiesData.cookies)) {
        throw new Error('Invalid cookies file format');
      }

      if (cookiesData.domain !== currentDomain) {
        if (!confirm(`This cookies file was exported from ${cookiesData.domain}, but you're currently on ${currentDomain}. Import anyway?`)) {
          return;
        }
      }

      // First, remove existing cookies
      chrome.cookies.getAll({ domain: currentDomain }, existingCookies => {
        existingCookies.forEach(cookie => {
          const url = (cookie.secure ? "https://" : "http://") +
                      (cookie.domain.charAt(0) === '.' ? cookie.domain.substr(1) : cookie.domain) +
                      cookie.path;

          chrome.cookies.remove({
            url: url,
            name: cookie.name
          });
        });

        // Then set the new cookies
        cookiesData.cookies.forEach(cookie => {
          const url = (cookie.secure ? "https://" : "http://") +
                      (cookie.domain.charAt(0) === '.' ? cookie.domain.substr(1) : cookie.domain) +
                      cookie.path;

          // Create the cookie object
          const newCookie = {
            url: url,
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            sameSite: cookie.sameSite
          };

          // Add expiration if it exists
          if (cookie.expirationDate) {
            newCookie.expirationDate = cookie.expirationDate;
          }

          chrome.cookies.set(newCookie);
        });

        // Refresh the current tab
        chrome.tabs.reload(currentTab.id, {}, () => {
          alert('Cookies imported successfully! The page has been refreshed.');
          loadCurrentCookies();
          loadProfiles(); // Reload profiles to update matching status
        });
      });
    } catch (error) {
      alert('Error importing cookies: ' + error.message);
    }
  };

  reader.readAsText(file);
}

// Open cookie editor modal
function openCookieEditor(cookie) {
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
  document.getElementById('cookie-sameSite').value = cookie.sameSite || 'no_restriction';

  // Set checkbox values
  document.getElementById('cookie-hostOnly').checked = cookie.hostOnly || false;
  document.getElementById('cookie-session').checked = cookie.session || false;
  document.getElementById('cookie-secure').checked = cookie.secure || false;
  document.getElementById('cookie-httpOnly').checked = cookie.httpOnly || false;

  // Show the modal
  const modal = document.getElementById('cookie-editor-modal');
  modal.style.display = 'block';

  // Center the modal in the viewport
  centerModalInViewport(modal);
}

// Close cookie editor modal
function closeCookieEditor() {
  document.getElementById('cookie-editor-modal').style.display = 'none';
  currentEditingCookie = null;

  // 移除滚动事件监听器
  if (window._modalScrollHandler) {
    window.removeEventListener('scroll', window._modalScrollHandler);
    window._modalScrollHandler = null;
  }
}

// Save cookie changes
function saveCookieChanges() {
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

  chrome.cookies.remove({
    url: oldUrl,
    name: currentEditingCookie.name
  }, () => {
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

    chrome.cookies.set(newCookie, () => {
      alert('Cookie updated successfully!');
      closeCookieEditor();

      // Reload cookies and maintain search if active
      const searchInput = document.getElementById('cookie-search');
      const searchTerm = searchInput.value.trim();
      loadCurrentCookies();

      // Re-apply search if there was one
      if (searchTerm) {
        setTimeout(() => {
          filterCookies(searchTerm);
          showAutocomplete(searchTerm);
        }, 100);
      }
    });
  });
}

// Show clear cookies confirmation modal
function showClearCookiesConfirmation() {
  const clearDomainSpan = document.getElementById('clear-domain');
  clearDomainSpan.textContent = currentDomain;

  const cookiesToClearList = document.getElementById('cookies-to-clear-list');
  const clearSubdomainsCheckbox = document.getElementById('clear-subdomains');
  const modal = document.getElementById('clear-cookies-modal');
  const modalTitle = modal.querySelector('h2');
  const confirmText = modal.querySelector('p[data-i18n]');
  const confirmBtn = document.getElementById('confirm-clear-btn');

  // 获取当前语言包
  function getLangPack() {
    const lang = localStorage.getItem('lang') || 'zh-CN';
    return LANGUAGES[lang] || LANGUAGES['zh-CN'];
  }

  // 动态切换弹窗文案
  function updateClearModalTexts() {
    const langPack = getLangPack();
    if (clearSubdomainsCheckbox.checked) {
      modalTitle.textContent = langPack.clear_all_cookies_modal;
      confirmText.innerHTML = langPack.clear_all_cookies_confirm;
      confirmBtn.textContent = langPack.clear_all;
    } else {
      modalTitle.textContent = langPack.clear_only_current_site_modal;
      confirmText.innerHTML = langPack.clear_only_current_site_confirm;
      confirmBtn.textContent = langPack.clear_only;
    }
  }

  // 动态加载 cookies 列表
  function updateCookiesList() {
    cookiesToClearList.innerHTML = 'Loading cookies...';
    let filterDomain = clearSubdomainsCheckbox.checked ? extractRootDomain(currentDomain) : currentDomain;
    chrome.cookies.getAll({ domain: filterDomain }, cookies => {
      let relevantCookies = clearSubdomainsCheckbox.checked
        ? cookies
        : cookies.filter(cookie => cookie.domain === currentDomain || cookie.domain === '.' + currentDomain);

      if (relevantCookies.length === 0) {
        cookiesToClearList.innerHTML = '<div class="no-cookies">No cookies found for this site</div>';
      } else {
        cookiesToClearList.innerHTML = '';
        relevantCookies.forEach(cookie => {
          const cookieItem = document.createElement('div');
          cookieItem.className = 'cookie-item-confirm';
          // Show domain for subdomain cookies
          const domainPrefix = cookie.domain !== currentDomain && cookie.domain !== '.' + currentDomain
            ? `[${cookie.domain}] `
            : '';
          cookieItem.textContent = `${domainPrefix}${cookie.name}: ${cookie.value.substring(0, 30)}${cookie.value.length > 30 ? '...' : ''}`;
          cookiesToClearList.appendChild(cookieItem);
        });
      }
    });
  }

  // 绑定复选框事件
  clearSubdomainsCheckbox.onchange = function() {
    updateClearModalTexts();
    updateCookiesList();
  };

  // 加载本地存储的复选框状态
  chrome.storage.local.get('includeSubdomains', result => {
    if (result.includeSubdomains !== undefined) {
      clearSubdomainsCheckbox.checked = result.includeSubdomains;
    }
    updateClearModalTexts();
    updateCookiesList();
  });

  // 显示弹窗并居中
  modal.style.display = 'block';
  centerModalInViewport(modal);
}

// Close clear cookies modal
function closeClearCookiesModal() {
  document.getElementById('clear-cookies-modal').style.display = 'none';

  // 移除滚动事件监听器
  if (window._modalScrollHandler) {
    window.removeEventListener('scroll', window._modalScrollHandler);
    window._modalScrollHandler = null;
  }
}

// Clear all cookies for the current domain
function clearAllCookies() {
  const clearSubdomainsCheckbox = document.getElementById('clear-subdomains');
  let domainFilter;

  if (clearSubdomainsCheckbox.checked) {
    // Get the root domain to include all subdomains
    const rootDomain = extractRootDomain(currentDomain);
    domainFilter = rootDomain;
  } else {
    // Use the exact current domain
    domainFilter = currentDomain;
  }

  chrome.cookies.getAll({ domain: domainFilter }, cookies => {
    // Filter cookies to only clear those relevant to the current domain or its subdomains
    const relevantCookies = clearSubdomainsCheckbox.checked
      ? cookies
      : cookies.filter(cookie => cookie.domain === currentDomain || cookie.domain === '.' + currentDomain);

    if (relevantCookies.length === 0) {
      alert('No cookies found to clear');
      closeClearCookiesModal();
      return;
    }

    relevantCookies.forEach(cookie => {
      const url = (cookie.secure ? "https://" : "http://") +
                 (cookie.domain.charAt(0) === '.' ? cookie.domain.substr(1) : cookie.domain) +
                 cookie.path;

      chrome.cookies.remove({
        url: url,
        name: cookie.name
      });
    });

    // Refresh the current tab
    chrome.tabs.reload(currentTab.id, {}, () => {
      alert(`${relevantCookies.length} cookies cleared successfully! The page has been refreshed.`);
      closeClearCookiesModal();

      // Save search term if any
      const searchInput = document.getElementById('cookie-search');
      const searchTerm = searchInput.value.trim();

      loadCurrentCookies();
      loadProfiles(); // Reload profiles to update matching status

      // Re-apply search if there was one
      if (searchTerm) {
        setTimeout(() => {
          filterCookies(searchTerm);
          showAutocomplete(searchTerm);
        }, 100);
      }
    });
  });
}

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
        ensureVisible(items[selectedIndex + 1], autocomplete);
      } else if (items.length > 0 && selectedIndex === -1) {
        items[0].classList.add('selected');
        ensureVisible(items[0], autocomplete);
      }
      break;

    case 'ArrowUp':
      e.preventDefault();
      // Select previous item or last if none selected
      if (selectedIndex > 0) {
        if (selectedItem) selectedItem.classList.remove('selected');
        items[selectedIndex - 1].classList.add('selected');
        ensureVisible(items[selectedIndex - 1], autocomplete);
      } else if (items.length > 0 && selectedIndex === -1) {
        items[items.length - 1].classList.add('selected');
        ensureVisible(items[items.length - 1], autocomplete);
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

// Ensure the selected item is visible in the scrollable container
function ensureVisible(element, container) {
  const containerTop = container.scrollTop;
  const containerBottom = containerTop + container.clientHeight;
  const elementTop = element.offsetTop;
  const elementBottom = elementTop + element.clientHeight;

  if (elementTop < containerTop) {
    container.scrollTop = elementTop;
  } else if (elementBottom > containerBottom) {
    container.scrollTop = elementBottom - container.clientHeight;
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
  displayCookies(filteredCookies);
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

// 更新快速切换按钮图标
function updateQuickToggleIcon(isNightMode) {
  const quickToggleButton = document.getElementById('quick-night-mode-toggle');
  quickToggleButton.textContent = isNightMode ? '☀️' : '🌙';
}

// 根据当前滚动位置显示模态窗口，确保完全可见
function centerModalInViewport(modal) {
  if (!modal) return;

  const modalContent = modal.querySelector('.modal-content');
  if (!modalContent) return;

  // 获取当前滚动位置
  const scrollTop = window.scrollY || document.documentElement.scrollTop;

  // 获取视口高度和宽度
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  // 重置之前的样式以便获取自然高度
  modalContent.style.top = '';
  modalContent.style.transform = 'translateX(-50%)';

  // 获取模态窗口内容的高度
  const modalHeight = modalContent.offsetHeight;

  // 计算模态窗口的理想位置 - 当前滚动位置加上一些偏移
  let topPosition = scrollTop + 100; // 从滚动顶部偏移100px

  // 确保模态窗口不会超出视口底部
  const maxTopPosition = scrollTop + viewportHeight - modalHeight - 20; // 底部留20px边距

  // 如果计算的位置会导致模态窗口超出视口底部，则调整位置
  if (topPosition > maxTopPosition && maxTopPosition > scrollTop) {
    topPosition = maxTopPosition;
  }

  // 确保模态窗口至少部分在视口内
  if (topPosition < scrollTop) {
    topPosition = scrollTop + 20; // 顶部留20px边距
  }

  // 设置模态窗口位置
  modalContent.style.top = topPosition + 'px';

  // 添加滚动事件监听器，使模态窗口跟随滚动
  const scrollHandler = () => {
    const newScrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollDiff = newScrollTop - scrollTop;

    // 更新模态窗口位置，跟随滚动
    const currentTop = parseInt(modalContent.style.top) || topPosition;
    modalContent.style.top = (currentTop + scrollDiff) + 'px';

    // 更新滚动位置记录
    scrollTop = newScrollTop;
  };

  // 清除之前的滚动事件监听器
  window.removeEventListener('scroll', window._modalScrollHandler);

  // 保存当前的滚动事件监听器，以便后续清除
  window._modalScrollHandler = scrollHandler;

  // 添加新的滚动事件监听器
  window.addEventListener('scroll', window._modalScrollHandler);

  // 当模态窗口关闭时，移除滚动事件监听器
  const closeHandler = () => {
    window.removeEventListener('scroll', window._modalScrollHandler);
    window._modalScrollHandler = null;

    // 移除这个一次性的事件监听器
    modal.removeEventListener('click', closeHandler);
  };

  // 添加一次性事件监听器
  modal.addEventListener('click', closeHandler);
}
