// src/popup/searchManager.js - Manages cookie search functionality
console.log('searchManager.js loaded');

let searchTimeout = null; // Migrated from popup.js
let allCookiesRef = []; // Reference to allCookies from popup.js, set by initSearchFunctionality

// Internal helper to display cookies, ensuring the utility is available
function displayCookiesInternal(cookiesToShow) {
  if (window.cookieLoaderUtils && typeof window.cookieLoaderUtils.displayCookies === 'function') {
    window.cookieLoaderUtils.displayCookies(cookiesToShow);
  } else {
    console.error('searchManager.js: cookieLoaderUtils.displayCookies is not available.');
    // Fallback or error message for the user if necessary
    const cookiesList = document.getElementById('cookies-list');
    if (cookiesList) {
        cookiesList.innerHTML = '<div class="no-cookies" data-i18n="error_loading_cookies">Error displaying cookies. Required module missing.</div>';
        if (window.i18nUtils && window.i18nUtils.applyI18nToElement) {
            window.i18nUtils.applyI18nToElement(cookiesList.firstChild);
        }
    }
  }
}

// Migrated and renamed: Original handleSearchInput from popup.js
function handleSearchInputInternal(e) {
  const searchTerm = e.target.value.trim();
  const clearSearchButton = document.getElementById('clear-search');

  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  if (clearSearchButton) {
    clearSearchButton.style.display = searchTerm ? 'flex' : 'none';
  }

  searchTimeout = setTimeout(() => {
    if (searchTerm) {
      filterCookiesInternal(searchTerm);
      showAutocompleteInternal(searchTerm);
    } else {
      displayCookiesInternal(allCookiesRef);
      const searchAutocompleteElement = document.getElementById('search-autocomplete');
      if (searchAutocompleteElement) {
        searchAutocompleteElement.style.display = 'none';
      }
    }
  }, 300);
}

// Migrated and renamed: Original handleSearchKeydown from popup.js
function handleSearchKeydownInternal(e) {
  const autocomplete = document.getElementById('search-autocomplete');
  const cookieSearchInput = document.getElementById('cookie-search');

  if (!autocomplete || autocomplete.style.display !== 'block') return;

  const items = autocomplete.querySelectorAll('.autocomplete-item');
  const selectedItem = autocomplete.querySelector('.selected');
  let selectedIndex = -1;

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
      if (selectedIndex < items.length - 1) {
        if (selectedItem) selectedItem.classList.remove('selected');
        items[selectedIndex + 1].classList.add('selected');
        if (window.uiUtils && window.uiUtils.ensureVisible) window.uiUtils.ensureVisible(items[selectedIndex + 1], autocomplete);
      } else if (items.length > 0 && selectedIndex === -1) {
        items[0].classList.add('selected');
        if (window.uiUtils && window.uiUtils.ensureVisible) window.uiUtils.ensureVisible(items[0], autocomplete);
      }
      break;

    case 'ArrowUp':
      e.preventDefault();
      if (selectedIndex > 0) {
        if (selectedItem) selectedItem.classList.remove('selected');
        items[selectedIndex - 1].classList.add('selected');
        if (window.uiUtils && window.uiUtils.ensureVisible) window.uiUtils.ensureVisible(items[selectedIndex - 1], autocomplete);
      } else if (items.length > 0 && selectedIndex === -1) {
        items[items.length - 1].classList.add('selected');
        if (window.uiUtils && window.uiUtils.ensureVisible) window.uiUtils.ensureVisible(items[items.length - 1], autocomplete);
      }
      break;

    case 'Enter':
      if (selectedItem) {
        e.preventDefault();
        const cookieName = selectedItem.getAttribute('data-name');
        if (cookieSearchInput) cookieSearchInput.value = cookieName;
        filterCookiesInternal(cookieName);
        autocomplete.style.display = 'none';
      }
      break;

    case 'Escape':
      autocomplete.style.display = 'none';
      break;
  }
}

// Migrated and renamed: Original clearSearchInput from popup.js
function clearSearchInputInternal() {
  const searchInput = document.getElementById('cookie-search');
  const clearSearchButton = document.getElementById('clear-search');
  const searchAutocompleteElement = document.getElementById('search-autocomplete');

  if (searchInput) searchInput.value = '';
  if (clearSearchButton) clearSearchButton.style.display = 'none';
  if (searchAutocompleteElement) searchAutocompleteElement.style.display = 'none';
  
  displayCookiesInternal(allCookiesRef);
  if (searchInput) searchInput.focus();
}

// Migrated and renamed: Original filterCookies from popup.js
function filterCookiesInternal(searchTerm) {
  if (!searchTerm) {
    displayCookiesInternal(allCookiesRef);
    return;
  }

  const term = searchTerm.toLowerCase();
  const filteredCookies = allCookiesRef.filter(cookie => {
    if (!cookie || typeof cookie.name !== 'string' || typeof cookie.domain !== 'string' || typeof cookie.value !== 'string') {
        // console.warn('Skipping invalid cookie object during filtering:', cookie);
        return false;
    }
    if (cookie.name.toLowerCase().includes(term)) return true;
    if (cookie.domain.toLowerCase().includes(term)) return true;
    if (cookie.value.toLowerCase().includes(term)) return true;
    return false;
  });

  displayCookiesInternal(filteredCookies);
}

// Migrated and renamed: Original showAutocomplete from popup.js
function showAutocompleteInternal(searchTerm) {
  const autocomplete = document.getElementById('search-autocomplete');
  const cookieSearchInput = document.getElementById('cookie-search');

  if (!autocomplete || !cookieSearchInput) return;

  if (!searchTerm) {
    autocomplete.style.display = 'none';
    return;
  }

  const term = searchTerm.toLowerCase();
  const suggestions = [];
  const addedNames = new Set();

  allCookiesRef.forEach(cookie => {
    if (cookie && typeof cookie.name === 'string' && cookie.name.toLowerCase().includes(term) && !addedNames.has(cookie.name)) {
      suggestions.push(cookie.name);
      addedNames.add(cookie.name);
    }
  });

  suggestions.sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    if (aLower === term && bLower !== term) return -1;
    if (bLower === term && aLower !== term) return 1;
    if (aLower.startsWith(term) && !bLower.startsWith(term)) return -1;
    if (bLower.startsWith(term) && !aLower.startsWith(term)) return 1;
    return a.localeCompare(b);
  });

  const topSuggestions = suggestions.slice(0, 10);
  autocomplete.innerHTML = ''; // Clear previous suggestions

  if (topSuggestions.length > 0) {
    topSuggestions.forEach(name => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.setAttribute('data-name', name);

      const index = name.toLowerCase().indexOf(term);
      if (index >= 0) {
        const before = name.substring(0, index);
        const match = name.substring(index, index + term.length);
        const after = name.substring(index + term.length);
        item.innerHTML = `${before}<span class="highlight">${match}</span>${after}`;
      } else {
        item.textContent = name;
      }

      item.addEventListener('click', () => {
        if (cookieSearchInput) cookieSearchInput.value = name;
        filterCookiesInternal(name);
        autocomplete.style.display = 'none';
      });
      autocomplete.appendChild(item);
    });
    autocomplete.style.display = 'block';
  } else {
    autocomplete.innerHTML = '<div class="no-results" data-i18n="no_matching_cookies_found">No matching cookies found</div>';
     if (window.i18nUtils && window.i18nUtils.applyI18nToElement) {
        window.i18nUtils.applyI18nToElement(autocomplete.firstChild);
    }
    autocomplete.style.display = 'block';
  }
}

// Function to refresh search results, typically called when allCookiesRef might have changed
function refreshSearch() {
    console.log('searchManager.js: refreshSearch called. Current allCookiesRef length:', allCookiesRef.length);
    const cookieSearchInput = document.getElementById('cookie-search');
    let searchTerm = '';
    if (cookieSearchInput) {
        searchTerm = cookieSearchInput.value.trim();
    }

    if (searchTerm) {
        filterCookiesInternal(searchTerm);
        showAutocompleteInternal(searchTerm);
    } else {
        displayCookiesInternal(allCookiesRef); // Display all if no search term
        const searchAutocompleteElement = document.getElementById('search-autocomplete');
        if (searchAutocompleteElement) {
            searchAutocompleteElement.style.display = 'none';
        }
    }
}

// Main function to initialize search functionality
function initSearchFunctionality(cookiesArrayRef) {
  console.log('searchManager.js: initSearchFunctionality called with', cookiesArrayRef ? cookiesArrayRef.length : 'null', 'cookies');
  if (!cookiesArrayRef) {
      console.error('searchManager.js: cookiesArrayRef is null or undefined. Search cannot be initialized.');
      allCookiesRef = []; // Ensure it's an array to prevent errors later
  } else {
    allCookiesRef = cookiesArrayRef; // This is the reference that needs to be kept in sync
  }

  const cookieSearch = document.getElementById('cookie-search');
  const clearSearch = document.getElementById('clear-search');
  const searchAutocomplete = document.getElementById('search-autocomplete');

  if (!cookieSearch || !clearSearch || !searchAutocomplete) {
    console.error('Search UI elements (cookie-search, clear-search, or search-autocomplete) not found in searchManager.js. Search functionality will be impaired.');
    return; // Stop initialization if essential elements are missing
  }

  // Ensure clear button is hidden by default
  clearSearch.style.display = 'none';

  // Add event listeners for search input
  cookieSearch.addEventListener('input', handleSearchInputInternal);
  cookieSearch.addEventListener('keydown', handleSearchKeydownInternal);
  clearSearch.addEventListener('click', clearSearchInputInternal);

  // Close autocomplete when clicking outside
  document.addEventListener('click', function(e) {
    if (searchAutocomplete.style.display === 'block' &&
        !cookieSearch.contains(e.target) &&
        !searchAutocomplete.contains(e.target) &&
        !e.target.closest('.autocomplete-item')) { 
      searchAutocomplete.style.display = 'none';
    }
  });
  console.log('searchManager.js: Event listeners successfully set up.');
}

// Expose the functions via window.searchManagerUtils
window.searchManagerUtils = window.searchManagerUtils || {};
window.searchManagerUtils.initSearchFunctionality = initSearchFunctionality;
window.searchManagerUtils.refreshSearch = refreshSearch; // Expose the new function

console.log('searchManager.js: searchManagerUtils initialized and exposed with refreshSearch.');