// Night Mode Manager Module
// This module will handle night mode switching and style updates.

(function() {
    'use strict';

    /**
     * Initializes night mode functionality, including loading saved settings,
     * setting up event listeners for toggles and sliders, and responding
     * to browser theme changes.
     */
    function initNightModeInternal() {
        const nightModeToggle = document.getElementById('night-mode-toggle');
        const brightnessSlider = document.getElementById('brightness');
        const contrastSlider = document.getElementById('contrast');
        const quickToggleButton = document.getElementById('quick-night-mode-toggle');

        // Check browser theme preference
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

        // Load saved night mode settings, or use browser theme if none saved
        chrome.storage.local.get(['nightMode', 'brightness', 'contrast'], result => {
            let initialNightMode = prefersDarkMode;
            if (result.nightMode !== undefined) {
                initialNightMode = result.nightMode;
            }
            if (nightModeToggle) {
                nightModeToggle.checked = initialNightMode;
            }
            document.body.classList.toggle('night-mode', initialNightMode);
            if (window.uiUtils && typeof window.uiUtils.updateQuickToggleIcon === 'function') {
                window.uiUtils.updateQuickToggleIcon(initialNightMode);
            } else {
                console.warn('nightModeManager: uiUtils.updateQuickToggleIcon not available.');
            }
            updateScrollbarStylesInternal(initialNightMode); // Call internal function

            if (brightnessSlider) {
                if (result.brightness !== undefined) {
                    brightnessSlider.value = result.brightness;
                    document.body.style.filter = `brightness(${result.brightness}%)`;
                } else {
                    brightnessSlider.value = 80; // Default value
                    document.body.style.filter = `brightness(80%)`;
                }
            }

            if (contrastSlider) {
                if (result.contrast !== undefined) {
                    contrastSlider.value = result.contrast;
                    document.body.style.filter += ` contrast(${result.contrast}%)`;
                } else {
                    contrastSlider.value = 100; // Default value
                    document.body.style.filter += ` contrast(100%)`;
                }
            }
        });

        // Night mode toggle event listener
        if (nightModeToggle) {
            nightModeToggle.addEventListener('change', function() {
                const isNightMode = this.checked;
                document.body.classList.toggle('night-mode', isNightMode);
                if (window.uiUtils && typeof window.uiUtils.updateQuickToggleIcon === 'function') {
                    window.uiUtils.updateQuickToggleIcon(isNightMode);
                }
                updateScrollbarStylesInternal(isNightMode); // Call internal function
                chrome.storage.local.set({ nightMode: isNightMode });
            });
        }

        // Quick toggle button event listener
        if (quickToggleButton) {
            quickToggleButton.addEventListener('click', function() {
                if (!nightModeToggle) return;
                const currentState = nightModeToggle.checked;
                const newState = !currentState;
                nightModeToggle.checked = newState;
                document.body.classList.toggle('night-mode', newState);
                if (window.uiUtils && typeof window.uiUtils.updateQuickToggleIcon === 'function') {
                    window.uiUtils.updateQuickToggleIcon(newState);
                }
                updateScrollbarStylesInternal(newState); // Call internal function
                chrome.storage.local.set({ nightMode: newState });
            });
        }

        // Brightness slider event listener
        if (brightnessSlider) {
            brightnessSlider.addEventListener('input', function() {
                const brightness = this.value;
                const currentContrast = contrastSlider ? contrastSlider.value : '100';
                document.body.style.filter = `brightness(${brightness}%) contrast(${currentContrast}%)`;
                chrome.storage.local.set({ brightness: brightness });
            });
        }

        // Contrast slider event listener
        if (contrastSlider) {
            contrastSlider.addEventListener('input', function() {
                const contrast = this.value;
                const currentBrightness = brightnessSlider ? brightnessSlider.value : '80';
                document.body.style.filter = `brightness(${currentBrightness}%) contrast(${contrast}%)`;
                chrome.storage.local.set({ contrast: contrast });
            });
        }

        // Listen for browser theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            chrome.storage.local.get(['nightMode'], result => {
                // Only follow system changes if user hasn't explicitly set night mode
                if (result.nightMode === undefined) {
                    const newNightMode = e.matches;
                    if (nightModeToggle) {
                        nightModeToggle.checked = newNightMode;
                    }
                    document.body.classList.toggle('night-mode', newNightMode);
                    if (window.uiUtils && typeof window.uiUtils.updateQuickToggleIcon === 'function') {
                        window.uiUtils.updateQuickToggleIcon(newNightMode);
                    }
                    updateScrollbarStylesInternal(newNightMode); // Call internal function
                    // Optionally, save this system-derived state if desired, or leave it to be non-persistent
                    // chrome.storage.local.set({ nightMode: newNightMode });
                }
            });
        });
    }

    /**
     * Updates scrollbar styles based on whether night mode is active.
     * This involves dynamically adding and removing a <style> element
     * to override default scrollbar appearances.
     * @param {boolean} isNightMode - True if night mode is active, false otherwise.
     */
    function updateScrollbarStylesInternal(isNightMode) {
        // Also toggle class on HTML element for broader CSS targeting if needed
        document.documentElement.classList.toggle('night-mode', isNightMode);

        // Remove any existing dynamic scrollbar style element to prevent duplicates
        const existingStyleEl = document.getElementById('dynamic-scrollbar-styles');
        if (existingStyleEl) {
            existingStyleEl.remove();
        }

        const styleEl = document.createElement('style');
        styleEl.id = 'dynamic-scrollbar-styles'; // Add an ID for easy removal

        if (isNightMode) {
            // Night mode scrollbar styles
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
                }

                ::-webkit-scrollbar-thumb,
                *::-webkit-scrollbar-thumb {
                    background: #111 !important; /* Darker thumb for night mode */
                    border-radius: 4px !important;
                }

                ::-webkit-scrollbar-thumb:hover,
                *::-webkit-scrollbar-thumb:hover {
                    background: #222 !important; /* Slightly lighter on hover */
                }

                ::-webkit-scrollbar-corner,
                *::-webkit-scrollbar-corner {
                    background: #2d2d2d !important;
                }
            `;
        } else {
            // Day mode scrollbar styles
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
                    background: #ccc !important; /* Lighter thumb for day mode */
                    border-radius: 4px !important;
                }

                ::-webkit-scrollbar-thumb:hover,
                *::-webkit-scrollbar-thumb:hover {
                    background: #aaa !important; /* Darker on hover */
                }
                 ::-webkit-scrollbar-corner,
                *::-webkit-scrollbar-corner {
                    background: #f1f1f1 !important;
                }
            `;
        }

        document.head.appendChild(styleEl);

        // The original code had a setTimeout to remove the styleEl,
        // which seems counterintuitive if the styles are meant to persist.
        // For persistent scrollbar styles based on mode, the styleEl should remain.
        // If it was for a one-time force-refresh, that's a different mechanism.
        // Assuming persistent styles are desired:
        // setTimeout(() => {
        //   document.head.removeChild(styleEl);
        // }, 100);

        // Force repaint of scrollable elements (this part might still be useful)
        const scrollableElements = document.querySelectorAll('.profiles-list, .cookies-container, .modal-content, .cookies-list-confirm, #search-autocomplete, #cookies-list, #debug-log-content');
        scrollableElements.forEach(el => {
            if (el) { // Check if element exists
                const originalDisplay = el.style.display;
                el.style.display = 'none';
                void el.offsetHeight; // Force reflow
                el.style.display = originalDisplay;
            }
        });
    }

    window.nightModeManagerUtils = {
        initNightMode: initNightModeInternal,
        updateScrollbarStyles: updateScrollbarStylesInternal
    };

    // Log loading for debugging
    console.log('Night Mode Manager (nightModeManager.js) loaded and initialized.');

})();