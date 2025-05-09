// src/popup/i18n.js

const LANGUAGES = {
  "zh-CN": {
    title: "SwitchCookies",
    current_site: "当前站点",
    current_site_loading: "加载中...",
    cookie_profiles: "Cookie 配置",
    profile_name_placeholder: "配置名称",
    save_current_cookies: "保存当前Cookies",
    no_saved_profiles: "暂无已保存配置",
    export_all_profiles: "导出全部配置",
    export_all_profiles_warning: "导出全部Cookie配置，可用于备份或迁移到其他设备。",
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
    export_all_profiles: "Export All Profiles",
    export_all_profiles_warning: "Export all cookie profiles for backup or migration to another device.",
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

function initI18nUI() {
  const langBtn = document.getElementById('lang-switch-btn');
  const langSelect = document.getElementById('lang-select');
  if (langBtn && langSelect) {
    // 初始化下拉框
    const userLang = getUserLang();
    langSelect.value = userLang;
    // applyI18n(userLang); // Initial application will be handled by popup.js after import

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
    // Fallback: apply language directly if UI elements are not found
    // applyI18n(getUserLang()); // Initial application will be handled by popup.js
  }
}

window.i18nUtils = {
  LANGUAGES: LANGUAGES, // Add this line
  applyI18n: applyI18n,
  getUserLang: getUserLang,
  setUserLang: setUserLang,
  initI18nUI: initI18nUI
};
console.log('src/popup/i18n.js executed, window.i18nUtils:', window.i18nUtils);