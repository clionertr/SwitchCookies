window.uiUtils = {
  ensureVisible: function(element, container) {
    const containerTop = container.scrollTop;
    const containerBottom = containerTop + container.clientHeight;
    const elementTop = element.offsetTop;
    const elementBottom = elementTop + element.clientHeight;

    if (elementTop < containerTop) {
      container.scrollTop = elementTop;
    } else if (elementBottom > containerBottom) {
      container.scrollTop = elementBottom - container.clientHeight;
    }
  },

  updateQuickToggleIcon: function(isNightMode) {
    const quickToggleButton = document.getElementById('quick-night-mode-toggle');
    quickToggleButton.textContent = isNightMode ? '☀️' : '🌙';
  },

  centerModalInViewport: function(modal) {
    if (!modal) return;

    const modalContent = modal.querySelector('.modal-content');
    if (!modalContent) return;

    // 获取当前滚动位置
    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    // 获取视口高度
    const viewportHeight = window.innerHeight;

    // 重置之前的样式以便获取自然高度
    modalContent.style.top = '';
    modalContent.style.transform = 'translateX(-50%)';

    // 获取模态窗口内容的高度
    const modalHeight = modalContent.offsetHeight;

    // 计算模态窗口的理想位置
    let topPosition;

    // 如果模态窗口高度小于视口高度，则居中显示
    if (modalHeight < viewportHeight - 40) { // 留出一些边距
      topPosition = Math.max(scrollTop + (viewportHeight - modalHeight) / 2, scrollTop + 20);
    } else {
      // 如果模态窗口高度大于视口高度，则将其顶部放在视口顶部附近
      topPosition = scrollTop + 20; // 顶部留20px边距
    }

    // 设置模态窗口位置
    modalContent.style.top = topPosition + 'px';

    // 在模态窗口打开时，禁用主滚动条
    document.body.style.overflow = 'hidden';

    // 当模态窗口关闭时，恢复主滚动条并移除事件监听器
    const closeHandler = function() {
      // 移除这个一次性的事件监听器
      modal.removeEventListener('click', closeHandler);
    };

    // 添加一次性事件监听器
    modal.addEventListener('click', closeHandler);
  }
};