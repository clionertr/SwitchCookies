// src/popup/profileManager.js
// Manages Cookie Profiles

(function() {
    'use_strict';

    let allLoadedProfiles = {}; // To store all profiles for filtering
    let profileSearchTimeout = null; // For debouncing profile search

    // Internal function to check if a profile matches the current domain
    function isProfileMatchingCurrentDomainInternal(profile) {
        // Exact domain match
        if (profile.domain === window.currentDomain) {
            return true;
        }

        // Check if profile domain is a subdomain of current domain or vice versa
        // Ensure window.cookieLoaderUtils and window.currentDomain are available
        if (window.cookieLoaderUtils && typeof window.cookieLoaderUtils.extractRootDomain === 'function' && typeof window.currentDomain === 'string') {
            const profileRootDomain = window.cookieLoaderUtils.extractRootDomain(profile.domain);
            const currentRootDomain = window.cookieLoaderUtils.extractRootDomain(window.currentDomain);

            // If root domains match and profile includes subdomains
            if (profileRootDomain === currentRootDomain && profile.includesSubdomains) {
                return true;
            }

            // Check if profile domain is a parent domain of current domain
            if (window.currentDomain.endsWith('.' + profile.domain)) {
                return true;
            }

            // Check if current domain is a parent domain of profile domain
            if (profile.domain.endsWith('.' + window.currentDomain)) {
                return true;
            }
        } else {
            console.warn('isProfileMatchingCurrentDomainInternal: window.cookieLoaderUtils or window.currentDomain not fully available.');
        }

        return false;
    }

    // Internal function to render profiles to the list
    function renderProfiles(profilesToRender) {
        const profilesList = document.getElementById('profiles-list');
        if (!profilesList) {
            console.error('renderProfiles: profilesList element not found.');
            return;
        }
        profilesList.innerHTML = ''; // Clear existing list

        const i18n = window.i18nUtils; // Cache for easier access
        const userLang = i18n && i18n.getUserLang ? i18n.getUserLang() : 'en-US';
        const langPack = i18n && i18n.LANGUAGES ? (i18n.LANGUAGES[userLang] || i18n.LANGUAGES['en-US']) : {};


        if (Object.keys(profilesToRender).length === 0) {
            profilesList.innerHTML = '<div class="no-profiles">' + (langPack.no_saved_profiles || 'No saved profiles.') + '</div>';
            if (i18n && i18n.applyI18nToElement && profilesList.firstChild) {
                i18n.applyI18nToElement(profilesList.firstChild);
            }
            return;
        }

        const profilesArray = Object.entries(profilesToRender).map(([name, profile]) => ({
            name,
            profileData: profile, // Renamed to avoid conflict with profile keyword in forEach
            isMatching: isProfileMatchingCurrentDomainInternal(profile)
        }));

        profilesArray.sort((a, b) => {
            if (a.isMatching && !b.isMatching) return -1;
            if (!a.isMatching && b.isMatching) return 1;
            return a.name.localeCompare(b.name);
        });

        profilesArray.forEach(({ name, profileData, isMatching }) => {
            const profileItem = document.createElement('div');
            profileItem.className = 'profile-item';

            if (isMatching) {
                profileItem.classList.add('matching');
            }

            const profileInfoDiv = document.createElement('div');
            profileInfoDiv.className = 'profile-info';

            const profileNameSpan = document.createElement('span');
            profileNameSpan.className = 'profile-name';
            profileNameSpan.textContent = name;
            profileInfoDiv.appendChild(profileNameSpan);

            if (isMatching) {
                const matchingBadge = document.createElement('span');
                matchingBadge.className = 'matching-badge';
                matchingBadge.title = langPack.matches_current_site || 'Matches current site';
                matchingBadge.textContent = langPack.current_site || 'Current Site';
                profileInfoDiv.appendChild(matchingBadge);
            }

            if (profileData.includesSubdomains) {
                const subdomainBadge = document.createElement('span');
                subdomainBadge.className = 'subdomain-badge';
                subdomainBadge.title = langPack.includes_cookies_from_subdomains || 'Includes cookies from subdomains';
                subdomainBadge.textContent = langPack.all_subdomains || 'All Subdomains';
                profileInfoDiv.appendChild(subdomainBadge);
            }

            const cookieCount = document.createElement('span');
            cookieCount.className = 'cookie-count';
            cookieCount.textContent = `${profileData.cookies.length} cookies`; // Use profileData
            profileInfoDiv.appendChild(cookieCount);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'profile-actions';

            const applyButton = document.createElement('button');
            applyButton.textContent = langPack.apply_profile || 'Apply';
            applyButton.addEventListener('click', () => applyProfileInternal(name));

            const deleteButton = document.createElement('button');
            deleteButton.textContent = langPack.delete_profile || 'Delete';
            deleteButton.addEventListener('click', () => deleteProfileInternal(name));

            actionsDiv.appendChild(applyButton);
            actionsDiv.appendChild(deleteButton);

            profileItem.appendChild(profileInfoDiv);
            profileItem.appendChild(actionsDiv);

            profilesList.appendChild(profileItem);
        });
    }

    // Internal function to filter profiles based on search term and then render them
    function filterAndRenderProfiles(searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase().trim();
        if (!lowerSearchTerm) {
            renderProfiles(allLoadedProfiles); // Render all if search term is empty
            return;
        }

        const filteredProfiles = {};
        for (const name in allLoadedProfiles) {
            if (name.toLowerCase().includes(lowerSearchTerm)) {
                filteredProfiles[name] = allLoadedProfiles[name];
            }
            // Optionally, search in profile.domain or other fields
            // else if (allLoadedProfiles[name].domain.toLowerCase().includes(lowerSearchTerm)) {
            //     filteredProfiles[name] = allLoadedProfiles[name];
            // }
        }
        renderProfiles(filteredProfiles);
    }

    // Internal function to load saved profiles
    function loadProfilesInternal() {
        chrome.storage.local.get('cookieProfiles', result => {
            allLoadedProfiles = result.cookieProfiles || {};
            // Initially render all loaded profiles
            // Check if a search term already exists (e.g. if popup was re-opened)
            const profileSearchInput = document.getElementById('profile-search-input');
            if (profileSearchInput && profileSearchInput.value.trim()) {
                filterAndRenderProfiles(profileSearchInput.value.trim());
            } else {
                renderProfiles(allLoadedProfiles);
            }
        });
    }

    // Internal function to save current cookies as a profile
    function saveCurrentProfileInternal() {
        const i18n = window.i18nUtils; // Cache for easier access
        const userLang = i18n && i18n.getUserLang ? i18n.getUserLang() : 'en-US';
        const langPack = i18n && i18n.LANGUAGES ? (i18n.LANGUAGES[userLang] || i18n.LANGUAGES['en-US']) : {};

        const profileName = window.prompt(langPack.enter_profile_name_prompt || 'Enter a name for this profile:');

        if (profileName === null) { // User pressed Cancel
            return;
        }
        
        const trimmedProfileName = profileName.trim();
        if (!trimmedProfileName) {
            alert(langPack.profile_name_cannot_be_empty || 'Profile name cannot be empty.');
            return;
        }

        if (typeof window.currentDomain !== 'string' || !window.currentDomain) {
            alert('Cannot save profile: Current domain is not identified.');
            return;
        }
        
        let domainFilter;
        const shouldUseSubdomains = window.settingsManagerUtils && typeof window.settingsManagerUtils.getIncludeSubdomainsState === 'function'
                                  ? window.settingsManagerUtils.getIncludeSubdomainsState()
                                  : true; // Default to true if manager is not available

        if (shouldUseSubdomains) {
            if (window.cookieLoaderUtils && typeof window.cookieLoaderUtils.extractRootDomain === 'function') {
                const rootDomain = window.cookieLoaderUtils.extractRootDomain(window.currentDomain);
                domainFilter = rootDomain;
            } else {
                console.warn('saveCurrentProfileInternal: cookieLoaderUtils.extractRootDomain not available.');
                domainFilter = window.currentDomain; // Fallback
            }
        } else {
            domainFilter = window.currentDomain;
        }

        chrome.cookies.getAll({ domain: domainFilter }, cookies => {
            const relevantCookies = shouldUseSubdomains
                ? cookies
                : cookies.filter(cookie => cookie.domain === window.currentDomain || cookie.domain === '.' + window.currentDomain);

            if (relevantCookies.length === 0) {
                alert('No cookies found to save for the specified domain criteria.');
                return;
            }

            chrome.storage.local.get('cookieProfiles', result => {
                const profiles = result.cookieProfiles || {};

                profiles[profileName] = {
                    domain: window.currentDomain, // Save the specific domain the profile was created on
                    cookies: relevantCookies,
                    includesSubdomains: shouldUseSubdomains, // Save the state of includeSubdomains with the profile
                    createdAt: new Date().toISOString()
                };

                chrome.storage.local.set({ cookieProfiles: profiles }, () => {
                    alert((langPack.profile_saved_successfully || `Profile "${trimmedProfileName}" saved successfully with ${relevantCookies.length} cookies!`).replace('${profileName}', trimmedProfileName).replace('${count}', relevantCookies.length));
                    loadProfilesInternal();
                });
            });
        });
    }

    // Internal function to apply a saved profile
    function applyProfileInternal(profileName) {
        chrome.storage.local.get('cookieProfiles', result => {
            const profiles = result.cookieProfiles || {};
            const profile = profiles[profileName];

            if (!profile) {
                alert('Profile not found');
                return;
            }
            
            if (typeof window.currentDomain !== 'string' || !window.currentDomain) {
                alert('Cannot apply profile: Current domain is not identified.');
                return;
            }

            if (profile.domain !== window.currentDomain) {
                if (!confirm(`This profile was saved for ${profile.domain}, but you're currently on ${window.currentDomain}. Apply anyway?`)) {
                    return;
                }
            }

            // Determine domain for clearing cookies based on profile's includeSubdomains setting
            let domainToClear;
            if (profile.includesSubdomains && window.cookieLoaderUtils && typeof window.cookieLoaderUtils.extractRootDomain === 'function') {
                domainToClear = window.cookieLoaderUtils.extractRootDomain(window.currentDomain);
            } else {
                domainToClear = window.currentDomain;
            }
            
            chrome.cookies.getAll({ domain: domainToClear }, existingCookies => {
                const removalPromises = existingCookies.map(cookie => {
                    const url = (cookie.secure ? "https://" : "http://") +
                                (cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain) +
                                cookie.path;
                    return new Promise((resolve) => {
                        chrome.cookies.remove({ url: url, name: cookie.name }, () => resolve());
                    });
                });

                Promise.all(removalPromises).then(() => {
                    const setPromises = profile.cookies.map(cookie => {
                        const newCookie = {
                            url: (cookie.secure ? "https://" : "http://") + (cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain) + cookie.path,
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
                        return new Promise((resolve) => {
                            chrome.cookies.set(newCookie, () => resolve());
                        });
                    });

                    Promise.all(setPromises).then(() => {
                        if (window.currentTab && window.currentTab.id) {
                            chrome.tabs.reload(window.currentTab.id, {}, () => {
                                alert(`Profile "${profileName}" applied successfully! The page has been refreshed.`);
                                if (window.cookieLoaderUtils && typeof window.cookieLoaderUtils.loadCurrentCookies === 'function') {
                                    window.cookieLoaderUtils.loadCurrentCookies();
                                }
                                loadProfilesInternal();
                            });
                        } else {
                            alert(`Profile "${profileName}" applied successfully! Please refresh the page manually.`);
                            if (window.cookieLoaderUtils && typeof window.cookieLoaderUtils.loadCurrentCookies === 'function') {
                                window.cookieLoaderUtils.loadCurrentCookies();
                            }
                            loadProfilesInternal();
                            console.warn('applyProfileInternal: window.currentTab.id not available for reload.');
                        }
                    });
                });
            });
        });
    }

    // Internal function to delete a profile
    function deleteProfileInternal(profileName) {
        if (confirm(`Are you sure you want to delete the profile "${profileName}"?`)) {
            chrome.storage.local.get('cookieProfiles', result => {
                const profiles = result.cookieProfiles || {};
                if (profiles[profileName]) {
                    delete profiles[profileName];
                    chrome.storage.local.set({ cookieProfiles: profiles }, () => {
                        alert(`Profile "${profileName}" deleted successfully!`);
                        loadProfilesInternal();
                    });
                } else {
                    alert(`Profile "${profileName}" not found.`);
                }
            });
        }
    }

    // Internal function to export ALL cookie profiles
    function exportAllProfilesInternal() {
        chrome.storage.local.get('cookieProfiles', result => {
            const profiles = result.cookieProfiles || {};

            if (Object.keys(profiles).length === 0) {
                alert(window.i18nUtils && window.i18nUtils.LANGUAGES && window.i18nUtils.getUserLang ? window.i18nUtils.LANGUAGES[window.i18nUtils.getUserLang()].no_saved_profiles : 'No saved profiles to export.');
                return;
            }

            const profilesData = {
                type: 'cookie_profiles',
                profiles: profiles,
                totalProfiles: Object.keys(profiles).length,
                exportedAt: new Date().toISOString()
            };

            const dataStr = JSON.stringify(profilesData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const exportFileDefaultName = `cookie-profiles-${new Date().toISOString().slice(0, 10)}.json`;

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            document.body.appendChild(linkElement); // Required for Firefox
            linkElement.click();
            document.body.removeChild(linkElement); // Clean up
        });
    }

    // Expose functions to global scope
    window.profileManagerUtils = {
        loadProfiles: loadProfilesInternal,
        isProfileMatchingCurrentDomain: isProfileMatchingCurrentDomainInternal, // Exposed as requested
        saveCurrentProfile: saveCurrentProfileInternal,
        applyProfile: applyProfileInternal,
        deleteProfile: deleteProfileInternal,
        exportAllProfiles: exportAllProfilesInternal
    };

    // Add event listeners for the profile search functionality
    // Ensure this runs after the DOM is ready, or elements might not be found.
    // Since this script is likely loaded at the end of body or defer, DOM should be ready.
    // However, for robustness, can wrap in DOMContentLoaded if issues arise,
    // but typically for popups, scripts run after HTML is parsed.
    
    const profileSearchInput = document.getElementById('profile-search-input');
    const clearProfileSearchButton = document.getElementById('clear-profile-search');

    if (profileSearchInput) {
        profileSearchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value;
            // Show/hide clear button
            if (clearProfileSearchButton) {
                clearProfileSearchButton.style.display = searchTerm ? 'flex' : 'none';
            }
            // Debounce search
            if (profileSearchTimeout) {
                clearTimeout(profileSearchTimeout);
            }
            profileSearchTimeout = setTimeout(() => {
                filterAndRenderProfiles(searchTerm);
            }, 300); // 300ms debounce
        });
    } else {
        console.warn('Profile search input (#profile-search-input) not found.');
    }

    if (clearProfileSearchButton) {
        clearProfileSearchButton.addEventListener('click', () => {
            if (profileSearchInput) {
                profileSearchInput.value = '';
            }
            clearProfileSearchButton.style.display = 'none';
            filterAndRenderProfiles(''); // Render all profiles
            if (profileSearchInput) {
                profileSearchInput.focus();
            }
        });
    } else {
        console.warn('Clear profile search button (#clear-profile-search) not found.');
    }

})();