/**
 * RMB Scroll Zoom - Background Service Worker
 * Manages page zoom via chrome.tabs API in response to mouse gestures from content scripts.
 *
 * Zoom scope
 * ----------
 * chrome.tabs.setZoom() defaults to Chrome's "per-origin" scope, which means zooming
 * one tab silently zooms every other tab on the same domain. With zoomScope set to
 * 'per-tab' each tab keeps its own zoom factor and no longer writes to the shared
 * per-origin zoom level for that site.
 *
 * Two Chrome quirks make this more than a one-liner:
 *   1. Zoom settings are reset to defaults whenever a tab navigates, so the per-tab
 *      scope has to be re-applied on every navigation.
 *   2. Per-tab zoom is intentionally not persisted by Chrome - navigating or reloading
 *      loads the page at its per-origin factor - so we remember each tab's factor in
 *      chrome.storage.session and restore it ourselves.
 */

const ZOOM_PRESETS = [
  0.25, 0.33, 0.50, 0.67, 0.75, 0.80, 0.90,
  1.00, 1.10, 1.25, 1.50, 1.75, 2.00, 2.50,
  3.00, 4.00, 5.00
];

const DEFAULT_SETTINGS = {
  enabled: true,
  stepMode: 'preset',      // 'preset' or 'linear'
  linearStep: 10,          // % step for linear mode
  invertDirection: false,  // false: wheel up = zoom in, wheel down = zoom out
  resetGesture: 'rmb_left',// 'rmb_left', 'rmb_middle', or 'disabled'
  showHud: true,
  hudDuration: 1200,       // ms
  zoomScope: 'per-tab',    // 'per-tab': each tab zooms alone. 'per-origin': Chrome's default, shared per domain.
  restoreOnReload: true    // re-apply a tab's own zoom after navigation/reload (per-tab scope only)
};

// chrome.storage.session key holding { [tabId]: zoomFactor } for tabs we manage.
const TAB_ZOOM_KEY = 'tabZoom';

async function getSettings() {
  const stored = await chrome.storage.sync.get('settings');
  return Object.assign({}, DEFAULT_SETTINGS, stored.settings || {});
}

async function getTabZoomMap() {
  try {
    const stored = await chrome.storage.session.get(TAB_ZOOM_KEY);
    return stored[TAB_ZOOM_KEY] || {};
  } catch (err) {
    return {};
  }
}

async function rememberTabZoom(tabId, zoomFactor) {
  const map = await getTabZoomMap();
  map[tabId] = zoomFactor;
  try {
    await chrome.storage.session.set({ [TAB_ZOOM_KEY]: map });
  } catch (err) {
    // Session storage is best-effort; losing it only costs zoom restoration.
  }
}

async function forgetTabZoom(tabId) {
  const map = await getTabZoomMap();
  if (!(tabId in map)) return;
  delete map[tabId];
  try {
    await chrome.storage.session.set({ [TAB_ZOOM_KEY]: map });
  } catch (err) {
    // Ignore.
  }
}

/**
 * Applies the requested zoom scope to a tab, but only when it differs from what the
 * tab already has. Checking first avoids a redundant setZoomSettings call on every
 * wheel notch, which would otherwise make the page flicker.
 * @param {number} tabId
 * @param {'per-tab'|'per-origin'} scope
 */
async function ensureZoomScope(tabId, scope) {
  try {
    const current = await chrome.tabs.getZoomSettings(tabId);
    if (current.scope === scope) return;
    // 'per-origin' is only valid in automatic mode, so pin the mode explicitly.
    await chrome.tabs.setZoomSettings(tabId, { mode: 'automatic', scope });
  } catch (err) {
    // Tab may be a restricted page (chrome://, Web Store) - nothing we can do.
  }
}

/**
 * Calculates the next zoom factor based on direction and settings.
 * @param {number} currentZoom
 * @param {number} direction 1 for Zoom In, -1 for Zoom Out
 * @param {object} settings
 * @returns {number}
 */
function calculateNextZoom(currentZoom, direction, settings) {
  const mode = settings.stepMode || 'preset';

  if (mode === 'preset') {
    if (direction > 0) {
      // Zoom In: find smallest preset strictly greater than current
      const next = ZOOM_PRESETS.find(p => p > currentZoom + 0.005);
      return next !== undefined ? next : ZOOM_PRESETS[ZOOM_PRESETS.length - 1];
    } else {
      // Zoom Out: find largest preset strictly less than current
      for (let i = ZOOM_PRESETS.length - 1; i >= 0; i--) {
        if (ZOOM_PRESETS[i] < currentZoom - 0.005) {
          return ZOOM_PRESETS[i];
        }
      }
      return ZOOM_PRESETS[0];
    }
  } else {
    // Linear mode
    const step = (settings.linearStep || 10) / 100;
    let next = currentZoom + (direction * step);
    // Clamp between 0.25 and 5.0
    next = Math.max(0.25, Math.min(5.0, next));
    return Math.round(next * 100) / 100;
  }
}

/**
 * Applies a zoom factor to a tab under the configured scope and records it so the
 * factor can be restored after a reload.
 * @param {number} tabId
 * @param {number} zoomFactor
 * @param {object} settings
 * @returns {Promise<number>} the zoom factor Chrome actually settled on
 */
async function applyZoom(tabId, zoomFactor, settings) {
  const scope = settings.zoomScope === 'per-origin' ? 'per-origin' : 'per-tab';
  await ensureZoomScope(tabId, scope);
  await chrome.tabs.setZoom(tabId, zoomFactor);
  const finalZoom = await chrome.tabs.getZoom(tabId);

  if (scope === 'per-tab') {
    await rememberTabZoom(tabId, finalZoom);
  } else {
    // Per-origin zoom is persisted by Chrome itself; nothing to restore.
    await forgetTabZoom(tabId);
  }
  return finalZoom;
}

/**
 * Handle incoming messages from content scripts and popup UI.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      const tabId = message.tabId || sender.tab?.id;

      switch (message.type) {
        case 'GET_ZOOM': {
          if (!tabId) {
            sendResponse({ success: false, error: 'No tab ID available' });
            return;
          }
          const zoom = await chrome.tabs.getZoom(tabId);
          let scope = 'per-origin';
          try {
            scope = (await chrome.tabs.getZoomSettings(tabId)).scope;
          } catch (err) {
            // Leave the default.
          }
          sendResponse({ success: true, zoom, scope });
          break;
        }

        case 'ZOOM_DELTA': {
          if (!tabId) {
            sendResponse({ success: false, error: 'No tab ID available' });
            return;
          }

          const settings = await getSettings();

          if (!settings.enabled) {
            sendResponse({ success: false, disabled: true });
            return;
          }

          // Direction: 1 = In, -1 = Out
          let direction = message.delta > 0 ? 1 : -1;
          if (settings.invertDirection) {
            direction = -direction;
          }

          // Read the zoom the user can currently see, before any scope switch.
          const currentZoom = await chrome.tabs.getZoom(tabId);
          const nextZoom = calculateNextZoom(currentZoom, direction, settings);
          const finalZoom = await applyZoom(tabId, nextZoom, settings);

          sendResponse({ success: true, zoom: finalZoom });
          break;
        }

        case 'ZOOM_RESET': {
          if (!tabId) {
            sendResponse({ success: false, error: 'No tab ID available' });
            return;
          }
          const settings = await getSettings();
          const finalZoom = await applyZoom(tabId, 1.0, settings);
          sendResponse({ success: true, zoom: finalZoom });
          break;
        }

        case 'OPEN_ZOOM_LEVELS': {
          // Chrome exposes no API to clear saved per-origin zoom levels, so send the
          // user to the settings page that lists them.
          await chrome.tabs.create({ url: 'chrome://settings/zoomLevels' });
          sendResponse({ success: true });
          break;
        }

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (err) {
      console.error('RMB Scroll Zoom Error:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  // Return true to indicate asynchronous sendResponse
  return true;
});

/**
 * Chrome resets a tab's zoom settings on navigation and reloads pages at their
 * per-origin factor, so re-assert both for tabs the user has zoomed themselves.
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  // Run on both phases: 'loading' restores the zoom before the user sees the page, and
  // 'complete' covers the case where the settings reset landed after our first attempt.
  // The zoom comparison below makes the second pass a no-op when the first one worked.
  if (changeInfo.status !== 'loading' && changeInfo.status !== 'complete') return;

  // Cheap session read first - most onUpdated events are for tabs we never touched.
  const map = await getTabZoomMap();
  const remembered = map[tabId];
  if (remembered === undefined) return;

  const settings = await getSettings();
  if (settings.zoomScope !== 'per-tab' || !settings.restoreOnReload) return;

  await ensureZoomScope(tabId, 'per-tab');
  try {
    const currentZoom = await chrome.tabs.getZoom(tabId);
    if (Math.abs(currentZoom - remembered) > 0.005) {
      await chrome.tabs.setZoom(tabId, remembered);
    }
  } catch (err) {
    // Restricted page or tab closed mid-navigation.
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  forgetTabZoom(tabId);
});

// A prerendered page swap replaces the tab's id; drop the stale entry.
chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
  forgetTabZoom(removedTabId);
});

// Set default settings on install, and backfill keys added by later versions.
chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get('settings');
  await chrome.storage.sync.set({
    settings: Object.assign({}, DEFAULT_SETTINGS, stored.settings || {})
  });
});
