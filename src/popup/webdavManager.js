// src/popup/webdavManager.js
// Manages WebDAV configuration and operations.

(function() {
  'use strict';

  // Internal helper function, also exposed
  function setWebDAVStatusInternal(msg, isError) {
    const statusEl = document.getElementById('webdav-status');
    if (statusEl) { // Check if element exists
      statusEl.textContent = msg;
      statusEl.style.color = isError ? '#d9534f' : '#28a745'; // Red for error, Green for success
      setTimeout(() => { statusEl.textContent = ''; }, 4000);
    } else {
      console.warn('setWebDAVStatusInternal: webdav-status element not found.');
    }
  }

  // Reads WebDAV configuration and populates the form
  function loadWebDAVConfigInternal() {
    chrome.storage.local.get('webdavConfig', (result) => {
      const config = result.webdavConfig || {};
      const urlEl = document.getElementById('webdav-url');
      const usernameEl = document.getElementById('webdav-username');
      const passwordEl = document.getElementById('webdav-password');

      if (urlEl) urlEl.value = config.url || '';
      if (usernameEl) usernameEl.value = config.username || '';
      if (passwordEl) passwordEl.value = config.password || '';
    });
  }

  // Saves WebDAV configuration
  function saveWebDAVConfigInternal() {
    const urlEl = document.getElementById('webdav-url');
    const usernameEl = document.getElementById('webdav-username');
    const passwordEl = document.getElementById('webdav-password');

    const url = urlEl ? urlEl.value.trim() : '';
    const username = usernameEl ? usernameEl.value.trim() : '';
    const password = passwordEl ? passwordEl.value : '';

    if (!url) {
      // Try to use i18n for messages if available, otherwise fallback
      const message = window.i18nUtils && typeof window.i18nUtils.getMessage === 'function'
                      ? window.i18nUtils.getMessage('webdav_error_url_required')
                      : 'WebDAV server address is required.';
      setWebDAVStatusInternal(message, true);
      return;
    }
    chrome.storage.local.set({ webdavConfig: { url, username, password } }, () => {
      const message = window.i18nUtils && typeof window.i18nUtils.getMessage === 'function'
                      ? window.i18nUtils.getMessage('webdav_config_saved')
                      : 'WebDAV configuration saved.';
      setWebDAVStatusInternal(message, false);
    });
  }

  // Handles WebDAV upload of all cookie profiles
  async function handleWebDAVUploadInternal() {
    const statusMsgPreparing = window.i18nUtils && typeof window.i18nUtils.getMessage === 'function'
                               ? window.i18nUtils.getMessage('webdav_status_upload_preparing')
                               : 'Preparing to upload...';
    setWebDAVStatusInternal(statusMsgPreparing, false);

    chrome.storage.local.get('webdavConfig', (cfgResult) => {
      const config = cfgResult.webdavConfig || {};
      const url = (config.url || '').replace(/\/+$/, ''); // Remove trailing slashes
      const username = config.username || '';
      const password = config.password || '';

      if (!url) {
        const message = window.i18nUtils && typeof window.i18nUtils.getMessage === 'function'
                        ? window.i18nUtils.getMessage('webdav_error_url_required_for_op')
                        : 'Please set WebDAV server address first.';
        setWebDAVStatusInternal(message, true);
        return;
      }

      chrome.storage.local.get('cookieProfiles', (result) => {
        const profiles = result.cookieProfiles || {};
        if (Object.keys(profiles).length === 0) {
          const message = window.i18nUtils && typeof window.i18nUtils.getMessage === 'function'
                          ? window.i18nUtils.getMessage('webdav_error_no_profiles_to_upload')
                          : 'No cookie profiles to upload.';
          setWebDAVStatusInternal(message, true);
          return;
        }

        const profilesData = {
          type: 'cookie_profiles',
          profiles: profiles,
          totalProfiles: Object.keys(profiles).length,
          exportedAt: new Date().toISOString()
        };
        const dataStr = JSON.stringify(profilesData, null, 2);
        const fileName = 'switchcookies-profiles.json';

        fetch(url + '/' + fileName, {
          method: 'PUT',
          headers: {
            'Authorization': 'Basic ' + btoa(username + ':' + password),
            'Content-Type': 'application/json'
          },
          body: dataStr
        }).then(async (resp) => {
          if (resp.ok) {
            const message = window.i18nUtils && typeof window.i18nUtils.getMessage === 'function'
                            ? window.i18nUtils.getMessage('webdav_status_upload_success')
                            : 'Upload successful.';
            setWebDAVStatusInternal(message, false);
          } else if (resp.status === 401 || resp.status === 403) {
            const message = window.i18nUtils && typeof window.i18nUtils.getMessage === 'function'
                            ? window.i18nUtils.getMessage('webdav_error_auth_failed')
                            : 'Authentication failed. Check username/password.';
            setWebDAVStatusInternal(message, true);
          } else {
            const text = await resp.text();
            const message = (window.i18nUtils && typeof window.i18nUtils.getMessage === 'function'
                            ? window.i18nUtils.getMessage('webdav_error_upload_failed_status', [resp.status, text])
                            : `Upload failed: ${resp.status} ${text}`);
            setWebDAVStatusInternal(message, true);
          }
        }).catch((err) => {
          const message = (window.i18nUtils && typeof window.i18nUtils.getMessage === 'function'
                          ? window.i18nUtils.getMessage('webdav_error_network', [err.message])
                          : `Network error: ${err.message}`);
          setWebDAVStatusInternal(message, true);
        });
      });
    });
  }

  // Handles WebDAV download of cookie profiles and imports them
  async function handleWebDAVDownloadInternal() {
    const statusMsgDownloading = window.i18nUtils && typeof window.i18nUtils.getMessage === 'function'
                                 ? window.i18nUtils.getMessage('webdav_status_downloading')
                                 : 'Downloading from server...';
    setWebDAVStatusInternal(statusMsgDownloading, false);

    chrome.storage.local.get('webdavConfig', (cfgResult) => {
      const config = cfgResult.webdavConfig || {};
      const url = (config.url || '').replace(/\/+$/, ''); // Remove trailing slashes
      const username = config.username || '';
      const password = config.password || '';

      if (!url) {
        const message = window.i18nUtils && typeof window.i18nUtils.getMessage === 'function'
                        ? window.i18nUtils.getMessage('webdav_error_url_required_for_op')
                        : 'Please set WebDAV server address first.';
        setWebDAVStatusInternal(message, true);
        return;
      }

      const fileName = 'switchcookies-profiles.json';
      fetch(url + '/' + fileName, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(username + ':' + password)
        }
      }).then(async (resp) => {
        if (resp.ok) {
          const json = await resp.json();
          if (json.type === 'cookie_profiles' && json.profiles) {
            chrome.storage.local.get('cookieProfiles', result => {
              const existingProfiles = result.cookieProfiles || {};
              const newProfiles = json.profiles;
              const mergedProfiles = { ...existingProfiles, ...newProfiles }; // Merge, new profiles overwrite existing ones with the same name
              chrome.storage.local.set({ cookieProfiles: mergedProfiles }, () => {
                const message = window.i18nUtils && typeof window.i18nUtils.getMessage === 'function'
                                ? window.i18nUtils.getMessage('webdav_status_import_success', [Object.keys(newProfiles).length])
                                : `Import successful. ${Object.keys(newProfiles).length} profiles imported/updated.`;
                setWebDAVStatusInternal(message, false);
                if (window.profileManagerUtils && typeof window.profileManagerUtils.loadProfiles === 'function') {
                  window.profileManagerUtils.loadProfiles(); // Refresh profile list in UI
                }
              });
            });
          } else {
            const message = window.i18nUtils && typeof window.i18nUtils.getMessage === 'function'
                            ? window.i18nUtils.getMessage('webdav_error_file_format_invalid')
                            : 'Invalid file format, cannot import.';
            setWebDAVStatusInternal(message, true);
          }
        } else if (resp.status === 401 || resp.status === 403) {
          const message = window.i18nUtils && typeof window.i18nUtils.getMessage === 'function'
                          ? window.i18nUtils.getMessage('webdav_error_auth_failed')
                          : 'Authentication failed. Check username/password.';
          setWebDAVStatusInternal(message, true);
        } else if (resp.status === 404) {
          const message = window.i18nUtils && typeof window.i18nUtils.getMessage === 'function'
                          ? window.i18nUtils.getMessage('webdav_error_config_not_found')
                          : 'Configuration file not found on server.';
          setWebDAVStatusInternal(message, true);
        } else {
          const text = await resp.text();
          const message = (window.i18nUtils && typeof window.i18nUtils.getMessage === 'function'
                          ? window.i18nUtils.getMessage('webdav_error_download_failed_status', [resp.status, text])
                          : `Download failed: ${resp.status} ${text}`);
          setWebDAVStatusInternal(message, true);
        }
      }).catch((err) => {
        const message = (window.i18nUtils && typeof window.i18nUtils.getMessage === 'function'
                        ? window.i18nUtils.getMessage('webdav_error_network', [err.message])
                        : `Network error: ${err.message}`);
        setWebDAVStatusInternal(message, true);
      });
    });
  }

  window.webdavManagerUtils = {
    loadWebDAVConfig: loadWebDAVConfigInternal,
    saveWebDAVConfig: saveWebDAVConfigInternal,
    setWebDAVStatus: setWebDAVStatusInternal, // Exposing it as per requirement
    handleWebDAVUpload: handleWebDAVUploadInternal,
    handleWebDAVDownload: handleWebDAVDownloadInternal
  };

  console.log('webdavManager.js loaded and webdavManagerUtils prepared.');
})();