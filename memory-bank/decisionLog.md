# 项目重构决策与进展日志

## 模块 1: 国际化 (i18n) - ✅ 已完成 (2025/5/9)

**子任务概述:**
将 `popup.js` 中的国际化功能 (包括 `LANGUAGES` 常量, `getUserLang()`, `setUserLang()`, `applyI18n()` 函数及相关UI初始化逻辑) 提取到一个新的独立模块 `src/popup/i18n.js`。

**关键决策与实现细节:**
*   **模块创建**: 新建 `src/popup/i18n.js` 文件。
*   **代码迁移**: 成功将所有i18n相关代码从 `popup.js` 迁移至 `src/popup/i18n.js`。
*   **模块化访问方式**: 考虑到Chrome扩展弹出窗口脚本的执行环境，未使用ES6 `import/export`。而是将核心功能 (`applyI18n`, `getUserLang`, `setUserLang`, `initI18nUI`, `LANGUAGES`) 挂载到全局的 `window.i18nUtils` 对象上，供 `popup.js` 及其他模块调用。
*   **脚本加载顺序**:
    *   **问题**: 初期遇到 `popup.js` 无法访问 `window.i18nUtils` 的问题，原因是 `i18n.js` 可能尚未加载完毕。
    *   **解决方案**:
        1.  在 `popup.html` 中，明确将 `<script src="src/popup/i18n.js"></script>` 的引入置于 `<script src="popup.js"></script>` 之前。
        2.  在 `popup.js` 中实现 `waitForModulesAndInit` 机制，通过 `setInterval` 检查所需模块是否已定义，确保在它们加载完成后再执行依赖其功能的初始化代码。
*   **`popup.js` 修改**: 删除了已迁移的i18n代码，并更新为通过 `window.i18nUtils` 调用相关功能。

**状态:**
*   子任务由 "💻 Code" 模式执行。
*   详细工作过程记录于该子任务执行期间的 `memory-bank/activeContext.md` (现已归档/清空)。
*   用户已于 2025/5/9 上午9:07:59 确认此模块功能完整并满足所有要求。

---

## 模块 2: UI 工具函数 (UI Utilities) - ✅ 已完成 (2025/5/9)

**子任务概述:**
将 `popup.js` 中的通用UI辅助函数 (`centerModalInViewport`, `updateQuickToggleIcon`, `ensureVisible`) 提取到一个新的独立模块 `src/popup/uiUtils.js`。

**关键决策与实现细节:**
*   **模块创建**: 新建 `src/popup/uiUtils.js` 文件。
*   **代码迁移**: 成功将 `centerModalInViewport`, `updateQuickToggleIcon`, `ensureVisible` 函数从 `popup.js` 迁移至 `src/popup/uiUtils.js`。
*   **模块化访问方式**: 与i18n模块类似，将核心功能挂载到全局的 `window.uiUtils` 对象上。
*   **脚本加载顺序**:
    *   在 `popup.html` 中，将 `<script src="src/popup/uiUtils.js"></script>` 的引入置于 `src/popup/i18n.js` 之后，但在 `popup.js` 之前。
*   **`popup.js` 修改**:
    *   删除了已迁移的UI工具函数定义。
    *   更新了对这些函数的调用，改为通过 `window.uiUtils` 对象。
    *   `waitForModulesAndInit` 函数已更新，使其等待 `window.i18nUtils` 和 `window.uiUtils` 均定义完毕后再执行后续初始化逻辑。

**状态:**
*   子任务由 "💻 Code" 模式执行。
*   详细工作过程记录于该子任务执行期间的 `memory-bank/activeContext.md` (现已归档/清空)。
*   用户已于 2025/5/9 上午9:13:59 (预估) 确认此模块功能完整并满足所有要求。

---

## 模块 3: Cookie 基础信息与加载 (Cookie Info & Loading) - ✅ 已完成 (2025/5/9)

**子任务概述:**
将 `popup.js` 中的 Cookie 基础信息获取、域名提取、加载及显示相关函数 (`getCurrentTab`, `extractDomain`, `extractRootDomain`, `loadCurrentCookies`, `displayCookies`) 提取到新的独立模块 `src/popup/cookieLoader.js`。

**关键决策与实现细节:**
*   **模块创建**: 新建 `src/popup/cookieLoader.js` 文件。
*   **代码迁移**: 成功将指定函数从 `popup.js` 迁移至 `src/popup/cookieLoader.js`。
*   **模块化访问方式**: 将核心功能挂载到全局的 `window.cookieLoaderUtils` 对象上。
*   **依赖处理**:
    *   新模块内部函数对 `window.i18nUtils` (如 `LANGUAGES`, `getUserLang`) 的访问已确保。
    *   新模块对 `popup.js` 中定义的全局变量 (如 `currentDomain`, `includeSubdomains`, `allCookies`) 的访问保持不变（通过全局 `window` 对象）。
    *   `loadCurrentCookies` 继续调用自身模块内的 `displayCookies`。对 `filterCookies` (仍在 `popup.js`) 的调用保持不变。
*   **脚本加载顺序**:
    *   在 `popup.html` 中，将 `<script src="src/popup/cookieLoader.js"></script>` 的引入置于 `src/popup/uiUtils.js` 之后，但在 `popup.js` 之前。
*   **`popup.js` 修改**:
    *   删除了已迁移的函数定义。
    *   更新了对这些函数的调用，改为通过 `window.cookieLoaderUtils` 对象。
    *   `waitForModulesAndInit` 函数已更新，使其等待 `window.i18nUtils`, `window.uiUtils`, 和 `window.cookieLoaderUtils` 均定义完毕后再执行后续初始化逻辑。
*   **错误修复**: 解决了多轮关于 `extractRootDomain` 调用点遗漏、`i18nUtils.LANGUAGES` 访问以及其他函数调用更新的问题。

**状态:**
*   子任务由 "💻 Code" 模式执行。
*   详细工作过程（包括错误修复）记录于该子任务执行期间的 `memory-bank/activeContext.md` (现已归档/清空)。
*   用户已于 2025/5/9 上午9:32:19 确认此模块功能完整并满足所有要求。

---

## 模块 4: Cookie 编辑器 (Cookie Editor) - ✅ 已完成 (2025/5/9)

**子任务概述:**
将 `popup.js` 中的 Cookie 编辑器相关功能 (`openCookieEditor`, `closeCookieEditor`, `saveCookieChanges` 函数和 `currentEditingCookie` 状态变量) 提取到新的独立模块 `src/popup/cookieEditor.js`。

**关键决策与实现细节:**
*   **模块创建**: 新建 `src/popup/cookieEditor.js` 文件。
*   **代码与状态迁移**:
    *   成功将 `openCookieEditor`, `closeCookieEditor`, `saveCookieChanges` 函数从 `popup.js` 迁移至 `src/popup/cookieEditor.js`。
    *   全局变量 `currentEditingCookie` 从 `popup.js` 移除，并作为模块内部状态变量定义在 `src/popup/cookieEditor.js` 中。
*   **模块化访问方式**: 将核心功能挂载到全局的 `window.cookieEditorUtils` 对象上。
*   **依赖处理**:
    *   `openCookieEditorInternal` 调用 `window.uiUtils.centerModalInViewport()`。
    *   `saveCookieChangesInternal` 调用模块内部的 `closeCookieEditorInternal()` 和 `window.cookieLoaderUtils.loadCurrentCookies()`。对 `filterCookies()` 和 `showAutocomplete()` (仍在 `popup.js`) 的调用保持不变。
*   **脚本加载顺序**:
    *   在 `popup.html` 中，将 `<script src="src/popup/cookieEditor.js"></script>` 的引入置于 `src/popup/cookieLoader.js` 之后，但在 `popup.js` 之前。
*   **`popup.js` 修改**:
    *   删除了已迁移的函数定义和 `currentEditingCookie` 变量。
    *   更新了对这些函数的调用，改为通过 `window.cookieEditorUtils` 对象。
    *   `waitForModulesAndInit` 函数已更新，使其等待 `window.i18nUtils`, `window.uiUtils`, `window.cookieLoaderUtils`, 和 `window.cookieEditorUtils` 均定义完毕后再执行后续初始化逻辑。
*   **错误修复 (`sameSite` 属性问题)**:
    *   **问题**: `chrome.cookies.set` 调用时因 `sameSite` 属性值无效导致错误。
    *   **解决方案**:
        1.  在 `popup.html` 的 `id="cookie-sameSite"` 下拉列表中添加了 `value="unspecified"` 的选项。
        2.  在 `src/popup/cookieEditor.js` 的 `openCookieEditorInternal` 函数中，将 `sameSite` 的默认值更正为 `unspecified`。

**状态:**
*   子任务由 "💻 Code" 模式执行 (部分由用户在中断后接续完成)。
*   详细工作过程（包括错误分析与修复）记录于该子任务执行期间的 `memory-bank/activeContext.md` (现已归档/清空)。
*   用户已于 2025/5/9 上午10:42:40 (用户报告时间) 确认此模块功能完整并满足所有要求。

---

## 模块 5: Cookie 清除 (Cookie Clearing) - ✅ 已完成 (2025/5/9)

**子任务概述:**
将 `popup.js` 中的 Cookie 清除相关功能 (`showClearCookiesConfirmation`, `closeClearCookiesModal`, `clearAllCookies` 函数及其辅助函数) 提取到新的独立模块 `src/popup/cookieClearer.js`。

**关键决策与实现细节:**
*   **模块创建**: 新建 `src/popup/cookieClearer.js` 文件。
*   **代码迁移**: 成功将指定函数及其内部辅助函数 (如 `getLangPack`, `updateClearModalTexts`, `updateCookiesList`) 从 `popup.js` 迁移至 `src/popup/cookieClearer.js`。
*   **模块化访问方式**: 将主要功能挂载到全局的 `window.cookieClearerUtils` 对象上。内部辅助函数保持模块私有。
*   **依赖处理**:
    *   新模块内部函数对 `window.i18nUtils`, `window.uiUtils`, `window.cookieLoaderUtils` 的访问已确保。
    *   新模块对 `popup.js` 中定义的全局变量 (如 `currentDomain`, `currentTab`) 和仍存在于 `popup.js` 的函数 (如 `loadProfiles`, `filterCookies`, `showAutocomplete`) 的访问保持不变。
*   **脚本加载顺序**:
    *   在 `popup.html` 中，将 `<script src="src/popup/cookieClearer.js"></script>` 的引入置于 `src/popup/cookieEditor.js` 之后，但在 `popup.js` 之前。
*   **`popup.js` 修改**:
    *   删除了已迁移的函数定义。
    *   更新了对这些函数的调用，改为通过 `window.cookieClearerUtils` 对象。
    *   `waitForModulesAndInit` 函数已更新，使其等待包括 `window.cookieClearerUtils` 在内的所有已拆分模块均定义完毕后再执行后续初始化逻辑。
*   **错误修复 (选择器问题)**:
    *   **问题**: `showClearCookiesConfirmationInternal` 中获取 `confirmTextEl` 的选择器错误。
    *   **解决方案**: 在 `src/popup/cookieClearer.js` 中将 `confirmTextEl` 的选择器修正为 `modalEl.querySelector('p[data-i18n]')`。

**状态:**
*   子任务由 "💻 Code" 模式执行。
*   详细工作过程（包括错误分析与修复）记录于该子任务执行期间的 `memory-bank/activeContext.md` (现已归档/清空)。
*   用户已于 2025/5/9 上午10:55:52 (用户报告时间) 确认此模块功能完整并满足所有要求。

---

## 模块 6: Cookie 数据处理 (Cookie Export & Import) - ✅ 已完成 (2025/5/9)

**子任务概述:**
1.  将原 `src/popup/cookieExporter.js` (仅含 `exportCookies`) 重命名为 `src/popup/cookieDataHandler.js`。
2.  将 `popup.js` 中的 `importCookies` 函数完整迁移到 `src/popup/cookieDataHandler.js`。

**关键决策与实现细节:**
*   **模块重命名与整合**:
    *   文件 `src/popup/cookieExporter.js` 重命名为 `src/popup/cookieDataHandler.js`。
    *   全局访问对象从 `window.cookieExporterUtils` 更新为 `window.cookieDataHandlerUtils`。
*   **代码迁移 (`importCookies`)**:
    *   `importCookies(event)` 函数完整迁移至 `cookieDataHandler.js` 并暴露于 `window.cookieDataHandlerUtils`。
*   **依赖处理**:
    *   `exportCookiesInternal` 依赖全局变量 `currentDomain`, `includeSubdomains`, `window.cookieLoaderUtils.extractRootDomain()`, `window.i18nUtils`。
    *   `importCookiesInternal` 依赖全局变量 `currentDomain`, `currentTab` (通过 `window.currentTab` 访问，并在 `popup.js` 中确保其被正确设置到 `window` 对象上)，`window.cookieLoaderUtils.loadCurrentCookies()`，以及 `window.profileManagerUtils.loadProfiles()`。
*   **脚本加载顺序**:
    *   在 `popup.html` 中，原 `cookieExporter.js` 的引用更新为 `cookieDataHandler.js`，加载顺序保持在其他 Utils 模块之后、`popup.js` 之前。
*   **`popup.js` 修改**:
    *   删除了 `importCookies` 的原始定义。
    *   更新了 `import-file` 事件监听器以调用 `window.cookieDataHandlerUtils.importCookies`。
    *   `waitForModulesAndInit` 更新为检查 `window.cookieDataHandlerUtils`。
*   **错误修复**:
    *   解决了 `importCookies` 迁移后 `this` 上下文问题。
    *   修复了 `__Host-` 前缀 cookie 导入失败的问题。
    *   通过在 `popup.js` 的 `initializeApp` 中确保 `window.currentTab = tab;` 并进行更严格的 `tab` 对象校验，解决了 `tabIdToReload was undefined` 的问题，增强了标签页刷新逻辑的健壮性。
    *   确保了文件输入字段在操作后被正确重置。

**状态:**
*   子任务由 "💻 Code" 模式执行。
*   详细工作过程（包括多次错误分析与修复）记录于该子任务执行期间的 `memory-bank/activeContext.md` (现已归档/清空)。
*   用户已于 2025/5/9 下午3:36:28 (用户报告时间) 确认此模块功能完整并满足所有要求。

---

## 模块 7: Cookie 配置管理 (Profile Management) - ✅ 已完成 (2025/5/9)

**子任务概述:**
将 `popup.js` 中的 Cookie 配置管理相关功能 (`loadProfiles`, `isProfileMatchingCurrentDomain`, `saveCurrentProfile`, `applyProfile`, `deleteProfile`, `exportAllProfiles`) 提取到新的独立模块 `src/popup/profileManager.js`。

**关键决策与实现细节:**
*   **模块创建**: 新建 `src/popup/profileManager.js` 文件。
*   **代码迁移**: 成功将所有指定函数从 `popup.js` 迁移至 `src/popup/profileManager.js`。
*   **模块化访问方式**: 将核心功能挂载到全局的 `window.profileManagerUtils` 对象上。
*   **依赖处理**:
    *   新模块内部函数对 `window.i18nUtils`, `window.uiUtils`, `window.cookieLoaderUtils` 的访问已确保。
    *   新模块对 `popup.js` 中定义的全局变量 (如 `window.currentDomain`, `window.currentTab`, `window.includeSubdomains`, `window.allCookies`) 和仍存在于 `popup.js` 的函数 (如 `filterCookies`, `showAutocomplete`) 的访问通过 `window` 对象进行。
    *   `isProfileMatchingCurrentDomainInternal` 依赖 `window.cookieLoaderUtils.extractRootDomain` 和 `window.currentDomain`。
    *   `loadProfilesInternal` 依赖模块内部的 `isProfileMatchingCurrentDomainInternal`、`applyProfileInternal` 和 `deleteProfileInternal`。
    *   `saveCurrentProfileInternal` 依赖 `window.currentDomain`, `window.includeSubdomains`, `window.allCookies`, 和 `window.cookieLoaderUtils.extractRootDomain`。
    *   `applyProfileInternal` 依赖 `window.currentDomain`, `window.currentTab`, 和 `window.cookieLoaderUtils.loadCurrentCookies`。
*   **脚本加载顺序**:
    *   在 `popup.html` 中，将 `<script src="src/popup/profileManager.js"></script>` 的引入置于 `src/popup/cookieDataHandler.js` 之后，但在 `popup.js` 之前。
*   **`popup.js` 修改**:
    *   删除了已迁移的函数定义。
    *   更新了对这些函数的调用，改为通过 `window.profileManagerUtils` 对象。
    *   `waitForModulesAndInit` 函数已更新，使其等待包括 `window.profileManagerUtils` 在内的所有已拆分模块均定义完毕后再执行后续初始化逻辑。

**状态:**
*   子任务由 "💻 Code" 模式执行。
*   详细工作过程记录于该子任务执行期间的 `memory-bank/activeContext.md` (现已归档/清空)。
*   用户已于 2025/5/9 下午3:44:00 (用户报告时间) 确认此模块功能完整并满足所有要求。

---

## 模块 8: WebDAV 功能模块 - ✅ 已完成 (2025/5/9)

**子任务概述:**
将 `popup.js` 中与 WebDAV 配置和操作相关的功能 (`loadWebDAVConfig`, `saveWebDAVConfig`, `setWebDAVStatus`, `handleWebDAVUpload`, `handleWebDAVDownload`) 从 `initializeApp` 函数内部提取到新的独立模块 `src/popup/webdavManager.js`。

**关键决策与实现细节:**
*   **模块创建**: 新建 `src/popup/webdavManager.js` 文件。
*   **代码迁移**: 成功将所有指定函数从 `popup.js` (原位于 `initializeApp` 内部) 迁移至 `src/popup/webdavManager.js` 的顶层作用域。
*   **模块化访问方式**: 将核心功能挂载到全局的 `window.webdavManagerUtils` 对象上。
*   **依赖处理**:
    *   新模块内部函数对 `chrome.storage.local`, `document.getElementById`, `fetch`, `btoa` 的直接使用已确认。
    *   `handleWebDAVDownload` 依赖 `window.profileManagerUtils.loadProfiles`。
    *   对 `window.i18nUtils` 的潜在依赖（例如通过 `setWebDAVStatus` 间接设置国际化文本）已通过保持 `setWebDAVStatus` 接受文本参数的方式处理。
*   **脚本加载顺序**:
    *   在 `popup.html` 中，将 `<script src="src/popup/webdavManager.js"></script>` 的引入置于 `src/popup/profileManager.js` 之后，但在 `popup.js` 之前。
*   **`popup.js` 修改**:
    *   从 `initializeApp` 函数内部删除了已迁移的 WebDAV 函数定义。
    *   更新了 `initializeApp` 内部对这些函数的调用，改为通过 `window.webdavManagerUtils` 对象。
    *   `waitForModulesAndInit` 函数已更新，使其等待包括 `window.webdavManagerUtils` 在内的所有已拆分模块均定义完毕后再执行后续初始化逻辑。

**状态:**
*   子任务由 "💻 Code" 模式执行。
*   详细工作过程记录于该子任务执行期间的 `memory-bank/activeContext.md` (现已归档/清空)。
*   用户已于 2025/5/9 下午3:53:00 (用户报告时间) 确认此模块功能完整并满足所有要求。

---

## 模块 9: 夜间模式功能模块 - ✅ 已完成 (2025/5/9)

**子任务概述:**
将 `popup.js` 中与夜间模式切换和样式更新相关的功能 (`initNightMode`, `updateScrollbarStyles`) 从 `initializeApp` 函数内部提取到新的独立模块 `src/popup/nightModeManager.js`。

**关键决策与实现细节:**
*   **模块创建**: 新建 `src/popup/nightModeManager.js` 文件。
*   **代码迁移**: 成功将 `initNightMode` 和 `updateScrollbarStyles` 函数从 `popup.js` (原位于 `initializeApp` 内部) 迁移至 `src/popup/nightModeManager.js` 的顶层作用域。
*   **模块化访问方式**: 将核心功能 (`initNightMode`, `updateScrollbarStyles`) 挂载到全局的 `window.nightModeManagerUtils` 对象上。
*   **依赖处理**:
    *   `initNightModeInternal` 内部对 `updateScrollbarStylesInternal` 的调用已更新。
    *   对 `document`, `chrome.storage.local`, `window.matchMedia`, `window.uiUtils.updateQuickToggleIcon` 的原生API和外部模块调用已确认。
    *   `updateScrollbarStylesInternal` 中动态添加/删除 `<style id="dynamic-scrollbar-styles">` 标签以管理滚动条样式，并进行了元素存在性检查。
*   **脚本加载顺序**:
    *   在 `popup.html` 中，将 `<script src="src/popup/nightModeManager.js"></script>` 的引入置于 `src/popup/webdavManager.js` 之后，但在 `popup.js` 之前。
*   **`popup.js` 修改**:
    *   从 `initializeApp` 函数内部删除了已迁移的夜间模式函数定义。
    *   更新了 `initializeApp` 内部对 `initNightMode` 的调用，改为通过 `window.nightModeManagerUtils.initNightMode()`。
    *   `waitForModulesAndInit` 函数已更新，使其等待包括 `window.nightModeManagerUtils` 在内的所有已拆分模块均定义完毕后再执行后续初始化逻辑。

**状态:**
*   子任务由 "💻 Code" 模式执行。
*   详细工作过程记录于该子任务执行期间的 `memory-bank/activeContext.md` (现已归档/清空)。
*   用户已于 2025/5/9 下午3:58:00 (用户报告时间) 确认此模块功能完整并满足所有要求。

---