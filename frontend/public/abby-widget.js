/**
 * WebChatSales - Abby Widget Embed Script
 * Place this script on any website to embed the Abby chat widget
 */
(function() {
  'use strict';

  const currentScript = document.currentScript;
  const scriptWidgetKey =
    (currentScript && currentScript.getAttribute('data-widget-key')) ||
    (window.AbbyWidgetConfig && window.AbbyWidgetConfig.widgetKey) ||
    '';
  const scriptClientId =
    (currentScript && currentScript.getAttribute('data-client-id')) ||
    (window.AbbyWidgetConfig && window.AbbyWidgetConfig.clientId) ||
    '';

  function getBaseUrl() {
    const override =
      (currentScript && currentScript.getAttribute('data-base-url')) ||
      (window.AbbyWidgetConfig && window.AbbyWidgetConfig.baseUrl);
    if (override) {
      return override.replace(/\/$/, '');
    }
    if (currentScript && currentScript.src) {
      try {
        return new URL(currentScript.src).origin;
      } catch (e) {}
    }
    return window.location.origin;
  }

  function getApiUrl() {
    const override =
      (currentScript && currentScript.getAttribute('data-api-url')) ||
      (window.AbbyWidgetConfig && window.AbbyWidgetConfig.apiUrl);
    if (override) {
      return override.replace(/\/$/, '');
    }
    return getBaseUrl().replace(':3000', ':9000');
  }

  const CONFIG = {
    baseUrl: getBaseUrl(),
    apiUrl: getApiUrl(),
    widgetId: 'abby-widget-' + Date.now(),
    position: 'bottom-right',
    primaryColor: '#22c55e',
    agentName: 'Abby',
    widgetKey: scriptWidgetKey,
    clientId: scriptClientId,
  };

  function positionStyles(position) {
    if (position === 'bottom-left') {
      return 'bottom: 24px; left: 24px; right: auto;';
    }
    return 'bottom: 24px; right: 24px; left: auto;';
  }

  async function loadWidgetConfig() {
    if (!CONFIG.widgetKey) return;
    try {
      const res = await fetch(
        CONFIG.apiUrl + '/api/widget/config?widgetKey=' + encodeURIComponent(CONFIG.widgetKey)
      );
      const data = await res.json();
      if (data.success && data.config) {
        CONFIG.position = data.config.position || CONFIG.position;
        CONFIG.primaryColor = data.config.primaryColor || CONFIG.primaryColor;
        CONFIG.agentName = data.config.agentName || CONFIG.agentName;
      }
    } catch (e) {}
  }

  async function sendInstallPing() {
    if (!CONFIG.widgetKey) return;
    try {
      await fetch(CONFIG.apiUrl + '/api/widget/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetKey: CONFIG.widgetKey,
          domain: window.location.hostname,
          pageUrl: window.location.href,
        }),
      });
    } catch (e) {}
  }

  function createWidget() {
    if (document.getElementById(CONFIG.widgetId)) {
      return;
    }

    const container = document.createElement('div');
    container.id = CONFIG.widgetId;
    container.style.cssText =
      'position: fixed; z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; ' +
      positionStyles(CONFIG.position);

    const iframe = document.createElement('iframe');
    iframe.id = CONFIG.widgetId + '-iframe';
    const iframeUrl = new URL(CONFIG.baseUrl + '/widget');
    iframeUrl.searchParams.set('embed', 'true');
    if (CONFIG.widgetKey) {
      iframeUrl.searchParams.set('widgetKey', CONFIG.widgetKey);
    }
    if (CONFIG.clientId) {
      iframeUrl.searchParams.set('clientId', CONFIG.clientId);
    }
    iframe.src = iframeUrl.toString();
    iframe.style.cssText =
      'width: 384px; height: 600px; max-width: calc(100vw - 48px); max-height: calc(100vh - 48px); border: none; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); display: none;';
    iframe.allow = 'microphone';

    const button = document.createElement('button');
    button.id = CONFIG.widgetId + '-button';
    button.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>' +
      '<span style="margin-left: 8px; font-weight: 500;">Chat with ' + CONFIG.agentName + '</span>';
    button.style.cssText =
      'display: flex; align-items: center; justify-content: center; padding: 12px 20px; color: #000; border: none; border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 500; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); transition: all 0.2s; background: linear-gradient(135deg, ' +
      CONFIG.primaryColor +
      ' 0%, ' +
      CONFIG.primaryColor +
      'dd 100%);';
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

    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'abby-close') {
        isOpen = false;
        iframe.style.display = 'none';
        button.style.display = 'flex';
      }
    });

    container.appendChild(button);
    container.appendChild(iframe);
    document.body.appendChild(container);

    const style = document.createElement('style');
    style.textContent =
      '#' + CONFIG.widgetId + ' * { box-sizing: border-box; } #' + CONFIG.widgetId + ' { all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }';
    document.head.appendChild(style);
  }

  async function init() {
    await loadWidgetConfig();
    createWidget();
    sendInstallPing();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.AbbyWidget = {
    init: init,
    open: function() {
      const button = document.getElementById(CONFIG.widgetId + '-button');
      if (button) button.click();
    },
    close: function() {
      const iframe = document.getElementById(CONFIG.widgetId + '-iframe');
      const button = document.getElementById(CONFIG.widgetId + '-button');
      if (iframe) iframe.style.display = 'none';
      if (button) button.style.display = 'flex';
    },
  };
})();

