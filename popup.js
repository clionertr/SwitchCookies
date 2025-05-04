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

  // Reset the file input
  event.target.value = '';
}

// Open the cookie editor modal
function openCookieEditor(cookie) {
  currentEditingCookie = cookie;

  // Fill the form with cookie data
  document.getElementById('cookie-name').value = cookie.name;
  document.getElementById('cookie-value').value = cookie.value;
  document.getElementById('cookie-domain').value = cookie.domain;
  document.getElementById('cookie-path').value = cookie.path;

  // Handle expiration date
  if (cookie.session) {
    document.getElementById('cookie-session').checked = true;
    document.getElementById('cookie-expiration').value = '';
    document.getElementById('cookie-expiration').disabled = true;
  } else if (cookie.expirationDate) {
    document.getElementById('cookie-session').checked = false;
    document.getElementById('cookie-expiration').disabled = false;

    // Convert UNIX timestamp to local datetime string
    const expirationDate = new Date(cookie.expirationDate * 1000);
    const isoString = expirationDate.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
    document.getElementById('cookie-expiration').value = isoString;
  }

  // Set other cookie properties
  document.getElementById('cookie-sameSite').value = cookie.sameSite || 'no_restriction';
  document.getElementById('cookie-hostOnly').checked = cookie.hostOnly || false;
  document.getElementById('cookie-secure').checked = cookie.secure || false;
  document.getElementById('cookie-httpOnly').checked = cookie.httpOnly || false;

  // Add event listener for session checkbox
  document.getElementById('cookie-session').addEventListener('change', function() {
    document.getElementById('cookie-expiration').disabled = this.checked;
  });

  // Show the modal
  document.getElementById('cookie-editor-modal').style.display = 'block';
}

// Close the cookie editor modal
function closeCookieEditor() {
  document.getElementById('cookie-editor-modal').style.display = 'none';
  currentEditingCookie = null;
}

// Save cookie changes
function saveCookieChanges() {
  if (!currentEditingCookie) {
    return;
  }

  // First, remove the existing cookie
  const oldUrl = (currentEditingCookie.secure ? "https://" : "http://") +
                (currentEditingCookie.domain.charAt(0) === '.' ? currentEditingCookie.domain.substr(1) : currentEditingCookie.domain) +
                currentEditingCookie.path;

  chrome.cookies.remove({
    url: oldUrl,
    name: currentEditingCookie.name
  }, () => {
    // Get values from the form
    const name = document.getElementById('cookie-name').value;
    const value = document.getElementById('cookie-value').value;
    const domain = document.getElementById('cookie-domain').value;
    const path = document.getElementById('cookie-path').value;
    const secure = document.getElementById('cookie-secure').checked;
    const httpOnly = document.getElementById('cookie-httpOnly').checked;
    const sameSite = document.getElementById('cookie-sameSite').value;
    const session = document.getElementById('cookie-session').checked;

    // Create URL for the cookie
    const url = (secure ? "https://" : "http://") +
                (domain.charAt(0) === '.' ? domain.substr(1) : domain) +
                path;

    // Create the cookie object
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

    // Add expiration if it's not a session cookie
    if (!session) {
      const expirationStr = document.getElementById('cookie-expiration').value;
      if (expirationStr) {
        const expirationDate = new Date(expirationStr);
        newCookie.expirationDate = Math.floor(expirationDate.getTime() / 1000);
      }
    }

    // Set the new cookie
    chrome.cookies.set(newCookie, (cookie) => {
      if (cookie) {
        // Refresh the cookies list
        loadCurrentCookies();

        // Close the modal
        closeCookieEditor();

        // Refresh the current tab
        chrome.tabs.reload(currentTab.id);
      } else {
        alert('Error saving cookie: ' + chrome.runtime.lastError?.message || 'Unknown error');
      }
    });
  });
}

// Show clear cookies confirmation modal
function showClearCookiesConfirmation() {
  // Set the domain in the confirmation message
  document.getElementById('clear-domain').textContent = currentDomain;

  // Set the clear subdomains checkbox to match the include subdomains setting
  document.getElementById('clear-subdomains').checked = includeSubdomains;

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

  // Get all cookies for the current domain (and subdomains if enabled)
  chrome.cookies.getAll({ domain: domainFilter }, cookies => {
    // Filter cookies to only show those relevant to the current domain or its subdomains
    const relevantCookies = includeSubdomains
      ? cookies
      : cookies.filter(cookie => cookie.domain === currentDomain || cookie.domain === '.' + currentDomain);

    if (relevantCookies.length === 0) {
      alert('No cookies found for this site');
      return;
    }

    // Display the list of cookies to be cleared
    const cookiesToClearList = document.getElementById('cookies-to-clear-list');
    cookiesToClearList.innerHTML = '';

    relevantCookies.forEach(cookie => {
      const cookieItem = document.createElement('div');
      cookieItem.className = 'cookie-to-clear-item';

      // Show domain for subdomain cookies
      const domainPrefix = includeSubdomains && cookie.domain !== currentDomain && cookie.domain !== '.' + currentDomain
        ? `[${cookie.domain}] `
        : '';

      cookieItem.textContent = `${domainPrefix}${cookie.name}`;
      cookiesToClearList.appendChild(cookieItem);
    });

    // Show the modal
    document.getElementById('clear-cookies-modal').style.display = 'block';

    // Add event listener for the clear subdomains checkbox
    document.getElementById('clear-subdomains').addEventListener('change', function() {
      // Update the list of cookies to clear based on the checkbox
      showClearCookiesConfirmation();
    });
  });
}

// Close clear cookies modal
function closeClearCookiesModal() {
  document.getElementById('clear-cookies-modal').style.display = 'none';
}

// Clear all cookies for the current domain
function clearAllCookies() {
  // Get the state of the clear subdomains checkbox
  const clearSubdomains = document.getElementById('clear-subdomains').checked;

  // Determine which domain to use for cookie retrieval
  let domainFilter;
  if (clearSubdomains) {
    // Get the root domain to include all subdomains
    const rootDomain = extractRootDomain(currentDomain);
    domainFilter = rootDomain;
  } else {
    // Use the exact current domain
    domainFilter = currentDomain;
  }

  chrome.cookies.getAll({ domain: domainFilter }, cookies => {
    // Filter cookies to only clear those relevant to the current domain or its subdomains
    const relevantCookies = clearSubdomains
      ? cookies
      : cookies.filter(cookie => cookie.domain === currentDomain || cookie.domain === '.' + currentDomain);

    if (relevantCookies.length === 0) {
      alert('No cookies found for this site');
      closeClearCookiesModal();
      return;
    }

    // Create a counter to track when all cookies are removed
    let removedCount = 0;
    const totalCount = relevantCookies.length;

    // Remove each cookie
    relevantCookies.forEach(cookie => {
      const url = (cookie.secure ? "https://" : "http://") +
                  (cookie.domain.charAt(0) === '.' ? cookie.domain.substr(1) : cookie.domain) +
                  cookie.path;

      chrome.cookies.remove({
        url: url,
        name: cookie.name
      }, () => {
        removedCount++;

        // When all cookies are removed
        if (removedCount === totalCount) {
          // Refresh the current tab
          chrome.tabs.reload(currentTab.id, {}, () => {
            // Close the modal
            closeClearCookiesModal();

            // Refresh the cookies list
            loadCurrentCookies();

            // Show success message
            const subdomainText = clearSubdomains ? ' and subdomains' : '';
            alert(`Successfully cleared ${totalCount} cookies for ${currentDomain}${subdomainText}. The page has been refreshed.`);
          });
        }
      });
    });
  });
}
