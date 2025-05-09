# 子任务: 模块化 "include-subdomains" 设置

**目标:** 将 `popup.js` 中与 "include-subdomains" 复选框相关的逻辑提取到新的 `src/popup/settingsManager.js` 模块。

**涉及的逻辑 (popup.js 中 initializeApp 内约 89-109 行):**
- 从 `chrome.storage.local` 加载 `includeSubdomains` 偏好。
- 为 `#include-subdomains` 复选框设置 `change` 事件监听器。
- 在事件监听器中：
    - 更新 `includeSubdomains` 状态。
    - 保存新偏好到 `chrome.storage.local`。
    - 调用 `window.cookieLoaderUtils.loadCurrentCookies()`。

**新模块接口:** `window.settingsManagerUtils`
- 核心函数: `initIncludeSubdomainsSetting()`
- 建议: `settingsManager.js` 内部管理 `includeSubdomains` 状态，并通过 `settingsManagerUtils.getIncludeSubdomainsState()` (或类似名称) 暴露给其他模块。

**预期步骤:**
1. 创建 `src/popup/settingsManager.js`。
2. 迁移上述逻辑到新模块的 `initIncludeSubdomainsSetting` 函数中。
3. 实现 `includeSubdomains` 状态的内部管理和 getter 函数。
4. 更新 `popup.js`：移除旧代码和 `includeSubdomains` 全局变量，在 `initializeApp` 中调用 `window.settingsManagerUtils.initIncludeSubdomainsSetting()`，更新 `waitForModulesAndInit`。
5. 如果其他模块（如 `cookieLoader.js`）之前直接访问 `window.includeSubdomains`，更新它们以使用 `window.settingsManagerUtils.getIncludeSubdomainsState()`。
6. 更新 `popup.html`：添加对 `src/popup/settingsManager.js` 的脚本引用。
7. 详细记录操作过程于此文件。

---
## 工作日志 (任务执行于 2025/5/9)

### 1. 创建新文件 `src/popup/settingsManager.js`
- **操作:** 使用 `write_to_file` 工具创建了 [`src/popup/settingsManager.js`](src/popup/settingsManager.js)。
- **初始内容:**
  ```javascript
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
      // TODO: Load from chrome.storage.local
      // TODO: Update checkbox state
      // TODO: Add event listener to checkbox
      // TODO: Inside event listener:
      //   - Update currentIncludeSubdomainsState
      //   - Save to chrome.storage.local
      //   - Call window.cookieLoaderUtils.loadCurrentCookies()
      console.log('settingsManager.js: initIncludeSubdomainsSetting called');
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
  ```

### 2. 实现 `settingsManager.js` 中的逻辑
- **操作:** 使用 `apply_diff` 工具更新了 [`src/popup/settingsManager.js`](src/popup/settingsManager.js) 中的 `initIncludeSubdomainsSetting` 函数。
- **主要实现点:**
    - 获取 `#include-subdomains` 复选框元素。
    - 从 `chrome.storage.local.get('includeSubdomains', ...)` 加载设置。
    - 如果设置存在，则更新模块内部状态 `currentIncludeSubdomainsState` 和复选框的 `checked` 状态。
    - 如果设置不存在，则使用默认值初始化复选框并保存到 `chrome.storage.local`。
    - 添加 `change` 事件监听器到复选框：
        - 更新 `currentIncludeSubdomainsState`。
        - 保存新状态到 `chrome.storage.local.set({ includeSubdomains: ... })`。
        - 调用 `window.cookieLoaderUtils.loadCurrentCookies()`。
- **代码片段 (核心逻辑):**
  ```javascript
  // Inside initIncludeSubdomainsSetting:
  const includeSubdomainsCheckbox = document.getElementById('include-subdomains');
  // ... (error handling for checkbox not found) ...

  chrome.storage.local.get('includeSubdomains', function(data) {
    // ... (error handling for storage get) ...
    if (typeof data.includeSubdomains === 'boolean') {
      currentIncludeSubdomainsState = data.includeSubdomains;
      includeSubdomainsCheckbox.checked = currentIncludeSubdomainsState;
    } else {
      includeSubdomainsCheckbox.checked = currentIncludeSubdomainsState; // Use default
      chrome.storage.local.set({ includeSubdomains: currentIncludeSubdomainsState }, /* ... */);
    }
  });

  includeSubdomainsCheckbox.addEventListener('change', function() {
    currentIncludeSubdomainsState = includeSubdomainsCheckbox.checked;
    chrome.storage.local.set({ includeSubdomains: currentIncludeSubdomainsState }, function() {
      // ... (error handling for storage set) ...
      if (window.cookieLoaderUtils && typeof window.cookieLoaderUtils.loadCurrentCookies === 'function') {
        window.cookieLoaderUtils.loadCurrentCookies();
      }
    });
  });
  ```

### 3. 更新 `popup.js`
- **操作:** 使用 `apply_diff` 工具修改了 [`popup.js`](popup.js)。
- **主要更改:**
    - 移除了全局变量 `includeSubdomains` (原第 5 行)。
    - 在 `initializeApp()` 函数中，移除了原有的 "include-subdomains" 复选框相关逻辑 (原第 89-109 行)。
    - 在 `initializeApp()` 中添加了对新模块初始化函数的调用: `window.settingsManagerUtils.initIncludeSubdomainsSetting();` (带有存在性检查)。
    - 在 `waitForModulesAndInit()` 函数中，添加了对 `window.settingsManagerUtils` 是否已定义的检查。
- **代码片段 (waitForModulesAndInit):**
  ```javascript
  // Inside waitForModulesAndInit, in the modules object:
  settingsManagerUtils: window.settingsManagerUtils // Added settings manager module
  ```
- **代码片段 (initializeApp):**
  ```javascript
  // Removed old includeSubdomains logic
  // Added:
  if (window.settingsManagerUtils && typeof window.settingsManagerUtils.initIncludeSubdomainsSetting === 'function') {
    window.settingsManagerUtils.initIncludeSubdomainsSetting();
  } else {
    console.warn('initializeApp: settingsManagerUtils.initIncludeSubdomainsSetting not available yet.');
  }
  ```

### 4. 更新 `src/popup/cookieLoader.js`
- **操作:** 使用 `apply_diff` 工具修改了 [`src/popup/cookieLoader.js`](src/popup/cookieLoader.js)。
- **主要更改:**
    - 将所有对全局 `includeSubdomains` 的引用替换为调用 `window.settingsManagerUtils.getIncludeSubdomainsState()`。
    - 添加了对 `settingsManagerUtils` 存在性的检查，并提供了默认值 (true) 以防模块尚未加载。
- **代码片段 (示例):**
  ```javascript
  // Old:
  // if (includeSubdomains) { ... }
  // const relevantCookies = includeSubdomains ? ... : ...;

  // New:
  const useSubdomains = window.settingsManagerUtils && typeof window.settingsManagerUtils.getIncludeSubdomainsState === 'function'
                        ? window.settingsManagerUtils.getIncludeSubdomainsState()
                        : true; // Default to true if manager is not available
  if (useSubdomains) { /* ... */ }

  const useSubdomainsFiltering = window.settingsManagerUtils && typeof window.settingsManagerUtils.getIncludeSubdomainsState === 'function'
                                 ? window.settingsManagerUtils.getIncludeSubdomainsState()
                                 : true;
  const relevantCookies = useSubdomainsFiltering ? /* ... */ : /* ... */;
  ```

### 5. 更新 `src/popup/profileManager.js`
- **操作:** 使用 `apply_diff` 工具修改了 [`src/popup/profileManager.js`](src/popup/profileManager.js)。
- **主要更改:**
    - 在 `saveCurrentProfileInternal` 函数中，将对 `window.includeSubdomains` 的引用替换为调用 `window.settingsManagerUtils.getIncludeSubdomainsState()`。
    - 添加了对 `settingsManagerUtils` 存在性的检查，并提供了默认值 (true)。
- **代码片段 (saveCurrentProfileInternal):**
  ```javascript
  // Old:
  // if (window.includeSubdomains) { ... }
  // includesSubdomains: window.includeSubdomains,

  // New:
  const shouldUseSubdomains = window.settingsManagerUtils && typeof window.settingsManagerUtils.getIncludeSubdomainsState === 'function'
                                ? window.settingsManagerUtils.getIncludeSubdomainsState()
                                : true;
  if (shouldUseSubdomains) { /* ... */ }
  // ...
  profiles[profileName] = {
      // ...
      includesSubdomains: shouldUseSubdomains, // Save the state
      // ...
  };
  ```

### 6. 更新 `popup.html`
- **操作:** 使用 `apply_diff` 工具修改了 [`popup.html`](popup.html)。
- **主要更改:**
    - 在 `<script src="src/popup/searchManager.js"></script>` 之后、`<script src="popup.js"></script>` 之前添加了 `<script src="src/popup/settingsManager.js"></script>`。
- **代码片段:**
  ```html
  <script src="src/popup/searchManager.js"></script>
  <script src="src/popup/settingsManager.js"></script>
  <script src="popup.js"></script>
  ```

### 7. 问题与解决方案
- **问题:** 暂未遇到特定于此模块化任务的重大问题。
- **解决方案:** 遵循了详细指示，并确保在访问新模块的功能之前检查其是否存在，以增加代码的健壮性。

### 8. 最终代码更改总结
- **`src/popup/settingsManager.js`:** 新建文件，包含 `initIncludeSubdomainsSetting` 和 `getIncludeSubdomainsState` 函数，用于管理 "include subdomains" 设置的加载、保存和状态获取。
- **`popup.js`:** 移除了旧的 "include subdomains" 处理逻辑和全局变量，改为调用 `settingsManagerUtils.initIncludeSubdomainsSetting()`，并在模块加载检查中加入了 `settingsManagerUtils`。
- **`src/popup/cookieLoader.js`:** 更新了对 "include subdomains" 状态的访问方式，改为调用 `settingsManagerUtils.getIncludeSubdomainsState()`。
- **`src/popup/profileManager.js`:** 在保存配置文件时，更新了对 "include subdomains" 状态的访问方式，改为调用 `settingsManagerUtils.getIncludeSubdomainsState()`。
- **`popup.html`:** 添加了对新脚本 `src/popup/settingsManager.js` 的引用，确保其在依赖项之后、主脚本之前加载。

此模块化任务旨在提高代码的可维护性和组织性。