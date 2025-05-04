// Global variables
let currentUrl = '';
let currentDomain = '';
let currentTab = null;
let currentEditingCookie = null;
let includeSubdomains = true; // Default to true

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
    const scrollableElements = document.querySelectorAll('.profiles-list, .cookies-container, .modal-content, .cookies-list-confirm');
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
  cookiesList.innerHTML = 'Loading cookies...';

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
      cookiesList.innerHTML = '<div class="no-cookies">No cookies found for this site</div>';
      return;
    }

    // Filter cookies to only show those relevant to the current domain or its subdomains
    const relevantCookies = includeSubdomains
      ? cookies
      : cookies.filter(cookie => cookie.domain === currentDomain || cookie.domain === '.' + currentDomain);

    if (relevantCookies.length === 0) {
      cookiesList.innerHTML = '<div class="no-cookies">No cookies found for this site</div>';
      return;
    }

    cookiesList.innerHTML = '';
    relevantCookies.forEach(cookie => {
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
      editButton.textContent = 'Edit';
      editButton.addEventListener('click', () => openCookieEditor(cookie));

      cookieActions.appendChild(editButton);
      cookieItem.appendChild(cookieText);
      cookieItem.appendChild(cookieActions);

      cookiesList.appendChild(cookieItem);
    });
  });
}

// Load saved profiles
function loadProfiles() {
  const profilesList = document.getElementById('profiles-list');

  chrome.storage.local.get('cookieProfiles', result => {
    const profiles = result.cookieProfiles || {};

    if (Object.keys(profiles).length === 0) {
      profilesList.innerHTML = '<div class="no-profiles">No saved profiles</div>';
      return;
    }

    profilesList.innerHTML = '';

    for (const [profileName, profile] of Object.entries(profiles)) {
      const profileItem = document.createElement('div');
      profileItem.className = 'profile-item';

      const profileInfoDiv = document.createElement('div');
      profileInfoDiv.className = 'profile-info';

      const profileNameSpan = document.createElement('span');
      profileNameSpan.className = 'profile-name';
      profileNameSpan.textContent = profileName;

      profileInfoDiv.appendChild(profileNameSpan);

      // Add subdomain indicator if the profile includes subdomains
      if (profile.includesSubdomains) {
        const subdomainBadge = document.createElement('span');
        subdomainBadge.className = 'subdomain-badge';
        subdomainBadge.title = 'Includes cookies from subdomains';
        subdomainBadge.textContent = 'All Subdomains';
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
      applyButton.addEventListener('click', () => applyProfile(profileName));

      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => deleteProfile(profileName));

      actionsDiv.appendChild(applyButton);
      actionsDiv.appendChild(deleteButton);

      profileItem.appendChild(profileInfoDiv);
      profileItem.appendChild(actionsDiv);

      profilesList.appendChild(profileItem);
    }
  });
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
  document.getElementById('cookie-editor-modal').style.display = 'block';
}

// Close cookie editor modal
function closeCookieEditor() {
  document.getElementById('cookie-editor-modal').style.display = 'none';
  currentEditingCookie = null;
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
      loadCurrentCookies();
    });
  });
}

// Show clear cookies confirmation modal
function showClearCookiesConfirmation() {
  const clearDomainSpan = document.getElementById('clear-domain');
  clearDomainSpan.textContent = currentDomain;

  const cookiesToClearList = document.getElementById('cookies-to-clear-list');
  cookiesToClearList.innerHTML = 'Loading cookies...';

  // Determine which domain to use for cookie retrieval
  let domainFilter;
  const clearSubdomainsCheckbox = document.getElementById('clear-subdomains');

  // Load saved preference for clearing subdomains
  chrome.storage.local.get('includeSubdomains', result => {
    if (result.includeSubdomains !== undefined) {
      clearSubdomainsCheckbox.checked = result.includeSubdomains;
    }
  });

  if (clearSubdomainsCheckbox.checked) {
    // Get the root domain to include all subdomains
    const rootDomain = extractRootDomain(currentDomain);
    domainFilter = rootDomain;
  } else {
    // Use the exact current domain
    domainFilter = currentDomain;
  }

  chrome.cookies.getAll({ domain: domainFilter }, cookies => {
    // Filter cookies to only show those relevant to the current domain or its subdomains
    const relevantCookies = clearSubdomainsCheckbox.checked
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

  // Add event listener for the checkbox
  clearSubdomainsCheckbox.onchange = function() {
    // Reload the list with the new setting
    showClearCookiesConfirmation();
  };

  // Show the modal
  document.getElementById('clear-cookies-modal').style.display = 'block';
}

// Close clear cookies modal
function closeClearCookiesModal() {
  document.getElementById('clear-cookies-modal').style.display = 'none';
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
      loadCurrentCookies();
    });
  });
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
