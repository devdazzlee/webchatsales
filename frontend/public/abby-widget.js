/**
 * WebChatSales - Abby Widget Embed Script
 * Place this script on any website to embed the Abby chat widget
 */
(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    apiUrl: 'https://yahir-unscorched-pierre.ngrok-free.dev',
    widgetId: 'abby-widget-' + Date.now(),
    position: 'bottom-right',
  };

  // Create widget container
  function createWidget() {
    // Check if widget already exists
    if (document.getElementById(CONFIG.widgetId)) {
      return;
    }

    // Create container
    const container = document.createElement('div');
    container.id = CONFIG.widgetId;
    container.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    `;

    // Create iframe for the chat widget
    const iframe = document.createElement('iframe');
    iframe.id = CONFIG.widgetId + '-iframe';
    iframe.src = `${CONFIG.apiUrl.replace('/api', '')}/widget?embed=true`;
    iframe.style.cssText = `
      width: 384px;
      height: 600px;
      max-width: calc(100vw - 48px);
      max-height: calc(100vh - 48px);
      border: none;
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      display: none;
    `;
    iframe.allow = 'microphone';

    // Create toggle button
    const button = document.createElement('button');
    button.id = CONFIG.widgetId + '-button';
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <span style="margin-left: 8px; font-weight: 500;">Chat with Abby</span>
    `;
    button.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px 20px;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      color: #000;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      transition: all 0.2s;
    `;
    button.onmouseover = function() {
      this.style.transform = 'scale(1.05)';
      this.style.opacity = '0.9';
    };
    button.onmouseout = function() {
      this.style.transform = 'scale(1)';
      this.style.opacity = '1';
    };

    let isOpen = false;
    button.onclick = function() {
      isOpen = !isOpen;
      if (isOpen) {
        iframe.style.display = 'block';
        button.style.display = 'none';
      } else {
        iframe.style.display = 'none';
        button.style.display = 'flex';
      }
    };

    // Close button inside iframe (handled by iframe content)
    // Add close functionality via postMessage
    window.addEventListener('message', function(event) {
      if (event.data.type === 'abby-close') {
        isOpen = false;
        iframe.style.display = 'none';
        button.style.display = 'flex';
      }
    });

    container.appendChild(button);
    container.appendChild(iframe);
    document.body.appendChild(container);

    // Prevent conflicts with existing styles
    const style = document.createElement('style');
    style.textContent = `
      #${CONFIG.widgetId} * {
        box-sizing: border-box;
      }
      #${CONFIG.widgetId} {
        all: initial;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }

  // Export for manual initialization
  window.AbbyWidget = {
    init: createWidget,
    open: function() {
      const button = document.getElementById(CONFIG.widgetId + '-button');
      if (button) button.click();
    },
    close: function() {
      const iframe = document.getElementById(CONFIG.widgetId + '-iframe');
      const button = document.getElementById(CONFIG.widgetId + '-button');
      if (iframe) iframe.style.display = 'none';
      if (button) button.style.display = 'flex';
    }
  };
})();

