// src/lib/theme.js —— 主题（跟随系统 / 浅色 / 深色）
// 实现：在 <html> 上设置 data-theme 属性，CSS 变量随之切换。
// "跟随系统"时监听 prefers-color-scheme 变化，用户改系统主题弹窗立刻跟着变。

const media = window.matchMedia('(prefers-color-scheme: dark)');
let mode = 'system';

function apply() {
  const dark = mode === 'dark' || (mode === 'system' && media.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

media.addEventListener('change', () => { if (mode === 'system') apply(); });

/** @param {'system'|'light'|'dark'} m */
export function setTheme(m) {
  mode = ['system', 'light', 'dark'].includes(m) ? m : 'system';
  apply();
}

export function getTheme() {
  return mode;
}