# RMB Scroll Zoom (Chrome Extension)

A lightweight Manifest V3 Chrome Extension that allows you to adjust page zoom levels with **Right Mouse Button + Scroll Wheel**—ideal for one-handed mouse navigation when your left hand isn't on the keyboard to press <kbd>Ctrl</kbd>.

---

## Features

- **One-Handed Zoom**: Hold **Right Mouse Button (RMB)** and scroll the mouse wheel up or down to zoom in and out.
- **Smart Context Menu Suppression**: Prevents the browser's right-click context menu when you've scrolled to zoom, but leaves normal right-clicks completely intact.
- **Instant Zoom Reset**: Hold **RMB** and **Left-Click** (or Middle-Click) to instantly reset the page zoom back to 100%.
- **Isolated Shadow DOM HUD**: Shows a floating, stylish zoom badge (`🔍 125%`) that automatically fades away without conflicting with webpage styles.
- **Customizable Step Modes**:
  - **Standard Chrome Presets**: 25%, 33%, 50%, 67%, 75%, 80%, 90%, 100%, 110%, 125%, 150%, 175%, 200%, 250%, 300%, 400%, 500%.
  - **Linear Percentage**: Step by 5%, 10%, 15%, 20%, or 25% per wheel notch.
- **Invert Direction**: Toggle whether wheel up zooms in or out.
- **Per-Tab Zoom (default)**: Zooming one tab no longer drags every other tab on the same domain with it — see below.
- **Zero Bloat & 100% Private**: No analytics, no external network requests, zero tracking.

---

## Per-Tab vs Per-Site Zoom

Chrome's zoom is **per-origin** by default: set `x.com` to 90% in one tab and every other `x.com` tab jumps to 90% too. That is Chrome's own behaviour, not a quirk of this extension — `chrome.tabs.setZoom()` writes to the same shared zoom level the built-in <kbd>Ctrl</kbd>+<kbd>+</kbd> control does.

This extension defaults to **This tab only** (`per-tab` scope), so each tab keeps its own zoom factor and side-by-side tabs on the same site are independent.

Two details worth knowing:

- Chrome **resets a tab's zoom settings on every navigation**, and per-tab zoom is deliberately not persisted, so the extension re-applies the scope and restores the tab's factor after each page load. Turn this off with **Keep Zoom On Reload** if you'd rather a fresh page start at 100%.
- Zoom levels you saved **before** switching to per-tab mode are still stored by Chrome, so new tabs on those sites keep opening zoomed. Clear them once via **Clear saved site zoom levels** in the popup footer (`chrome://settings/zoomLevels`).

Prefer the old behaviour? Set **Zoom Applies To → All tabs on the site**.

---

## Installation (Developer Mode)

1. Open Google Chrome.
2. In the address bar, type `chrome://extensions` and press <kbd>Enter</kbd>.
3. In the top-right corner, toggle **Developer mode** to **ON**.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the folder:
   ```
   C:\dev\rmb-scroll-zoom
   ```
6. The extension is now active! Pin it to your toolbar if you want quick access to the settings popup.

---

## Usage

| Gesture | Action |
|---|---|
| **Hold RMB + Scroll Up** | Zoom In |
| **Hold RMB + Scroll Down** | Zoom Out |
| **Hold RMB + Left Click** | Reset Zoom to 100% |
| **Single Right Click (No scroll)** | Open Context Menu as normal |

> **Note**: Chrome restricts extension content scripts on internal pages such as `chrome://` and the Chrome Web Store site itself. Test on regular websites (e.g. Wikipedia, GitHub, Reddit, news sites).

---

## Settings

Click the extension icon in Chrome's toolbar to open settings:
- **Enable / Disable**: Master switch.
- **Current Tab Zoom**: Live zoom percentage with `+`, `-`, and `Reset (100%)` buttons.
- **Zoom Applies To**: `This tab only` (default) or `All tabs on the site` (Chrome's default behaviour).
- **Keep Zoom On Reload**: Re-apply the tab's own zoom after navigating or reloading. Per-tab mode only.
- **Zoom Steps**: Toggle between Chrome presets and linear percentage.
- **Invert Scroll**: Flip scroll direction.
- **Instant Reset Gesture**: Choose between RMB + Left Click, RMB + Middle Click, or Disabled.
- **On-screen HUD**: Toggle badge display and duration.
