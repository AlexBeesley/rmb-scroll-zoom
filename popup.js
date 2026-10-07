/**
 * RMB Scroll Zoom - Popup Controller
 * Manages settings and live tab zoom controls.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const DEFAULT_SETTINGS = {
    enabled: true,
    stepMode: 'preset',
    linearStep: 10,
    invertDirection: false,
    resetGesture: 'rmb_left',
    showHud: true,
    hudDuration: 1200,
    zoomScope: 'per-tab',
    restoreOnReload: true
  };

  // DOM Elements
  const currentZoomEl = document.getElementById('current-zoom');
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomReset = document.getElementById('btn-zoom-reset');

  const extEnabledInput = document.getElementById('ext-enabled');
  const stepModeSelect = document.getElementById('step-mode');
  const linearStepRow = document.getElementById('linear-step-row');
  const linearStepSelect = document.getElementById('linear-step');
  const invertDirectionInput = document.getElementById('invert-direction');
  const resetGestureSelect = document.getElementById('reset-gesture');
  const resetHintRow = document.getElementById('reset-hint-row');
  const resetKeyLabel = document.getElementById('reset-key-label');
  const showHudInput = document.getElementById('show-hud');
  const hudDurationRow = document.getElementById('hud-duration-row');
  const hudDurationSelect = document.getElementById('hud-duration');
  const zoomScopeSelect = document.getElementById('zoom-scope');
  const zoomScopeSubtitle = document.getElementById('zoom-scope-subtitle');
  const restoreReloadRow = document.getElementById('restore-reload-row');
  const restoreOnReloadInput = document.getElementById('restore-on-reload');
  const btnZoomLevels = document.getElementById('btn-zoom-levels');
  const saveStatusEl = document.getElementById('save-status');

  // Query active tab
  let activeTab = null;
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length > 0) {
      activeTab = tabs[0];
      await updateTabZoomDisplay();
    }
  } catch (err) {
    console.warn('Could not query active tab:', err);
  }

  async function updateTabZoomDisplay() {
    if (!activeTab || !activeTab.id) return;
    try {
      const zoom = await chrome.tabs.getZoom(activeTab.id);
      currentZoomEl.textContent = Math.round(zoom * 100) + '%';
    } catch (err) {
      currentZoomEl.textContent = '100%';
    }
  }

  // Load Settings
  let currentSettings = Object.assign({}, DEFAULT_SETTINGS);
  try {
    const stored = await chrome.storage.sync.get('settings');
    if (stored && stored.settings) {
      currentSettings = Object.assign({}, DEFAULT_SETTINGS, stored.settings);
    }
  } catch (err) {
    console.warn('Error loading settings:', err);
  }

  // Populate UI with loaded settings
  extEnabledInput.checked = currentSettings.enabled;
  stepModeSelect.value = currentSettings.stepMode || 'preset';
  linearStepSelect.value = String(currentSettings.linearStep || 10);
  invertDirectionInput.checked = Boolean(currentSettings.invertDirection);
  resetGestureSelect.value = currentSettings.resetGesture || 'rmb_left';
  showHudInput.checked = Boolean(currentSettings.showHud);
  hudDurationSelect.value = String(currentSettings.hudDuration || 1200);
  zoomScopeSelect.value = currentSettings.zoomScope === 'per-origin' ? 'per-origin' : 'per-tab';
  restoreOnReloadInput.checked = Boolean(currentSettings.restoreOnReload);

  updateConditionalVisibility();
  updateResetHint();

  function updateConditionalVisibility() {
    linearStepRow.style.display = stepModeSelect.value === 'linear' ? 'flex' : 'none';
    hudDurationRow.style.display = showHudInput.checked ? 'flex' : 'none';

    const perTab = zoomScopeSelect.value === 'per-tab';
    restoreReloadRow.style.display = perTab ? 'flex' : 'none';
    zoomScopeSubtitle.textContent = perTab
      ? 'Other tabs on the same site stay put'
      : "Chrome's default - shared across the domain";
  }

  function updateResetHint() {
    const val = resetGestureSelect.value;
    if (val === 'disabled') {
      resetHintRow.style.display = 'none';
    } else {
      resetHintRow.style.display = 'flex';
      resetKeyLabel.textContent = val === 'rmb_left' ? 'LMB' : 'MMB';
    }
  }

  // Save Settings Function
  let saveTimeout = null;
  async function saveSettings() {
    currentSettings = {
      enabled: extEnabledInput.checked,
      stepMode: stepModeSelect.value,
      linearStep: parseInt(linearStepSelect.value, 10) || 10,
      invertDirection: invertDirectionInput.checked,
      resetGesture: resetGestureSelect.value,
      showHud: showHudInput.checked,
      hudDuration: parseInt(hudDurationSelect.value, 10) || 1200,
      zoomScope: zoomScopeSelect.value,
      restoreOnReload: restoreOnReloadInput.checked
    };

    updateConditionalVisibility();
    updateResetHint();

    try {
      await chrome.storage.sync.set({ settings: currentSettings });
      saveStatusEl.textContent = 'Settings saved';
      saveStatusEl.classList.add('saved');

      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        saveStatusEl.textContent = 'Settings saved automatically';
        saveStatusEl.classList.remove('saved');
      }, 1500);
    } catch (err) {
      saveStatusEl.textContent = 'Failed to save settings';
      console.error('Save error:', err);
    }
  }

  // Bind settings change events
  extEnabledInput.addEventListener('change', saveSettings);
  stepModeSelect.addEventListener('change', saveSettings);
  linearStepSelect.addEventListener('change', saveSettings);
  invertDirectionInput.addEventListener('change', saveSettings);
  resetGestureSelect.addEventListener('change', saveSettings);
  showHudInput.addEventListener('change', saveSettings);
  hudDurationSelect.addEventListener('change', saveSettings);
  zoomScopeSelect.addEventListener('change', saveSettings);
  restoreOnReloadInput.addEventListener('change', saveSettings);

  btnZoomLevels.addEventListener('click', async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'OPEN_ZOOM_LEVELS' });
      window.close();
    } catch (err) {
      console.warn('Could not open zoom levels page:', err);
    }
  });

  // Live Zoom Buttons
  btnZoomIn.addEventListener('click', async () => {
    if (!activeTab || !activeTab.id) return;
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ZOOM_DELTA',
        delta: 1,
        tabId: activeTab.id
      });
      if (response && response.zoom) {
        currentZoomEl.textContent = Math.round(response.zoom * 100) + '%';
      }
    } catch (err) {
      console.warn('Zoom In error:', err);
    }
  });

  btnZoomOut.addEventListener('click', async () => {
    if (!activeTab || !activeTab.id) return;
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ZOOM_DELTA',
        delta: -1,
        tabId: activeTab.id
      });
      if (response && response.zoom) {
        currentZoomEl.textContent = Math.round(response.zoom * 100) + '%';
      }
    } catch (err) {
      console.warn('Zoom Out error:', err);
    }
  });

  btnZoomReset.addEventListener('click', async () => {
    if (!activeTab || !activeTab.id) return;
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ZOOM_RESET',
        tabId: activeTab.id
      });
      if (response && response.zoom) {
        currentZoomEl.textContent = Math.round(response.zoom * 100) + '%';
      }
    } catch (err) {
      console.warn('Zoom Reset error:', err);
    }
  });
});
