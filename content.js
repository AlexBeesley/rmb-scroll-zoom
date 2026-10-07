/**
 * RMB Scroll Zoom - Content Script
 * Intercepts RMB + Scroll Wheel events to control page zoom.
 * Provides instant feedback via a sleek, isolated Shadow DOM HUD.
 */

(function () {
  'use strict';

  // Avoid multiple injections in the same frame
  if (window.__RMB_SCROLL_ZOOM_INJECTED__) return;
  window.__RMB_SCROLL_ZOOM_INJECTED__ = true;

  const DEFAULT_SETTINGS = {
    enabled: true,
    stepMode: 'preset',
    linearStep: 10,
    invertDirection: false,
    resetGesture: 'rmb_left',
    showHud: true,
    hudDuration: 1200
  };

  let settings = Object.assign({}, DEFAULT_SETTINGS);

  // Load initial settings
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get('settings', (data) => {
      if (data && data.settings) {
        settings = Object.assign({}, DEFAULT_SETTINGS, data.settings);
      }
    });

    // Listen for real-time setting updates
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes.settings) {
        settings = Object.assign({}, DEFAULT_SETTINGS, changes.settings.newValue);
      }
    });
  }

  // State Tracking
  let isRmbHeld = false;
  let hasScrolledWithRmb = false;
  let wheelAccumulator = 0;
  let lastZoomTime = 0;
  let contextMenuClearTimer = null;
  const ZOOM_THROTTLE_MS = 45; // Minimum interval between zoom steps

  // --- Shadow DOM HUD Overlay ---
  let hudHost = null;
  let hudShadow = null;
  let hudElement = null;
  let hudTextElement = null;
  let hudHideTimer = null;

  function initHud() {
    if (hudHost) return;
    if (!document.documentElement) return;

    try {
      hudHost = document.createElement('rmb-zoom-hud');
      hudHost.style.cssText = 'all: initial !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 0 !important; height: 0 !important; z-index: 2147483647 !important; pointer-events: none !important;';
      hudShadow = hudHost.attachShadow({ mode: 'closed' });

      const style = document.createElement('style');
      style.textContent = `
        .hud-container {
          position: fixed;
          top: 24px;
          left: 50%;
          transform: translateX(-50%) translateY(-10px) scale(0.94);
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 8px 18px;
          background: rgba(15, 23, 42, 0.88);
          backdrop-filter: blur(12px) saturate(160%);
          -webkit-backdrop-filter: blur(12px) saturate(160%);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 9999px;
          box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.2);
          color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.02em;
          opacity: 0;
          transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
          user-select: none;
        }

        .hud-container.visible {
          opacity: 1;
          transform: translateX(-50%) translateY(0) scale(1);
        }

        .hud-icon {
          width: 16px;
          height: 16px;
          fill: none;
          stroke: #38bdf8;
          stroke-width: 2.2;
          stroke-linecap: round;
          stroke-linejoin: round;
          flex-shrink: 0;
        }

        .hud-label {
          color: #94a3b8;
          font-weight: 500;
          font-size: 13px;
        }

        .hud-value {
          color: #ffffff;
          min-width: 42px;
          text-align: right;
          font-feature-settings: "tnum";
          font-variant-numeric: tabular-nums;
        }
      `;

      hudElement = document.createElement('div');
      hudElement.className = 'hud-container';
      hudElement.innerHTML = `
        <svg class="hud-icon" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="11" y1="8" x2="11" y2="14"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
        <span class="hud-label">Zoom</span>
        <span class="hud-value" id="val">100%</span>
      `;

      hudTextElement = hudElement.querySelector('#val');

      hudShadow.appendChild(style);
      hudShadow.appendChild(hudElement);

      document.documentElement.appendChild(hudHost);
    } catch (e) {
      console.warn('RMB Scroll Zoom HUD init failed:', e);
    }
  }

  function showZoomHud(zoomFactor) {
    if (!settings.showHud) return;
    initHud();
    if (!hudElement || !hudTextElement) return;

    const percent = Math.round(zoomFactor * 100);
    hudTextElement.textContent = percent + '%';

    hudElement.classList.add('visible');

    if (hudHideTimer) clearTimeout(hudHideTimer);
    hudHideTimer = setTimeout(() => {
      if (hudElement) hudElement.classList.remove('visible');
    }, settings.hudDuration || 1200);
  }

  // --- Zoom Execution via Background ---

  function requestZoomDelta(delta) {
    const now = Date.now();
    if (now - lastZoomTime < ZOOM_THROTTLE_MS) return;
    lastZoomTime = now;

    chrome.runtime.sendMessage({ type: 'ZOOM_DELTA', delta: delta }, (response) => {
      if (chrome.runtime.lastError) {
        // Background might be waking up or unavailable
        return;
      }
      if (response && response.success && response.zoom) {
        showZoomHud(response.zoom);
      }
    });
  }

  function requestZoomReset() {
    chrome.runtime.sendMessage({ type: 'ZOOM_RESET' }, (response) => {
      if (chrome.runtime.lastError) return;
      if (response && response.success && response.zoom) {
        showZoomHud(response.zoom);
      }
    });
  }

  // --- Mouse & Gesture Event Listeners ---

  function onMouseDown(e) {
    // RMB press
    if (e.button === 2) {
      isRmbHeld = true;
      hasScrolledWithRmb = false;
      wheelAccumulator = 0;
    } else if (isRmbHeld || (e.buttons & 2) !== 0) {
      // User held RMB and clicked another button
      if (settings.resetGesture === 'rmb_left' && e.button === 0) {
        // RMB + Left Click = Reset Zoom
        e.preventDefault();
        e.stopImmediatePropagation();
        hasScrolledWithRmb = true;
        requestZoomReset();
      } else if (settings.resetGesture === 'rmb_middle' && e.button === 1) {
        // RMB + Middle Click = Reset Zoom
        e.preventDefault();
        e.stopImmediatePropagation();
        hasScrolledWithRmb = true;
        requestZoomReset();
      }
    }
  }

  function onWheel(e) {
    if (!settings.enabled) return;

    // Check if RMB is held down
    const rmbActive = isRmbHeld || ((e.buttons & 2) !== 0);
    if (!rmbActive) return;

    // Prevent native page scroll
    e.preventDefault();
    e.stopImmediatePropagation();

    hasScrolledWithRmb = true;

    // Accumulate wheel ticks to handle smooth and notched wheels
    wheelAccumulator += e.deltaY;

    // Threshold: standard notch is ~100 or line delta
    const threshold = e.deltaMode === 1 ? 1 : 40;

    if (Math.abs(wheelAccumulator) >= threshold) {
      // deltaY < 0 is scroll up (Zoom In: +1), deltaY > 0 is scroll down (Zoom Out: -1)
      const delta = wheelAccumulator < 0 ? 1 : -1;
      wheelAccumulator = 0;
      requestZoomDelta(delta);
    }
  }

  function onMouseUp(e) {
    if (e.button === 2) {
      isRmbHeld = false;

      if (hasScrolledWithRmb) {
        // Keep hasScrolledWithRmb true briefly so contextmenu event is caught and suppressed
        if (contextMenuClearTimer) clearTimeout(contextMenuClearTimer);
        contextMenuClearTimer = setTimeout(() => {
          hasScrolledWithRmb = false;
        }, 300);
      }
    }
  }

  function onContextMenu(e) {
    // Suppress context menu if the user scrolled or performed a zoom reset with RMB
    if (hasScrolledWithRmb) {
      e.preventDefault();
      e.stopImmediatePropagation();
      hasScrolledWithRmb = false;
      if (contextMenuClearTimer) clearTimeout(contextMenuClearTimer);
    }
  }

  function onBlur() {
    isRmbHeld = false;
    hasScrolledWithRmb = false;
    wheelAccumulator = 0;
  }

  // Register event listeners in capture phase to intercept before webpage scripts
  window.addEventListener('mousedown', onMouseDown, { capture: true, passive: false });
  window.addEventListener('wheel', onWheel, { capture: true, passive: false });
  window.addEventListener('mouseup', onMouseUp, { capture: true, passive: false });
  window.addEventListener('contextmenu', onContextMenu, { capture: true, passive: false });
  window.addEventListener('blur', onBlur, { capture: true });

})();
