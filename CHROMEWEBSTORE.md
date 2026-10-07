# Chrome Web Store Listing — RMB Scroll Zoom

> Last Updated: 2026-09-04

## Store Listing

**Extension Name** [REQUIRED]
RMB Scroll Zoom

**Short Description** [REQUIRED]
Zoom web pages easily using Right Mouse Button + Scroll Wheel for one-handed mouse navigation without touching the keyboard.

**Detailed Description** [REQUIRED]
Zoom web pages effortlessly with one hand! RMB Scroll Zoom allows you to adjust page zoom levels simply by holding down your Right Mouse Button (RMB) and rolling your scroll wheel up or down—eliminating the need to reach for Ctrl on your keyboard.

Key Features:
- Seamless one-handed zoom: Hold RMB and scroll up to zoom in, scroll down to zoom out.
- Smart context menu handling: Automatically prevents the right-click menu when you zoom, but keeps normal right-click menus intact when you just click.
- Instant 100% Reset: Hold RMB and left-click (or middle-click) to snap right back to standard 100% zoom.
- Floating Visual HUD: Subtle, elegant on-screen badge confirms the new zoom level with smooth fade-out.
- Customizable Zoom Steps: Choose between standard Chrome zoom steps (25%, 33%, 50%, 75%, 100%, 125%, 150%...) or custom linear percentage steps (5%, 10%, 15%, 20%).
- Invert Direction Option: Customize wheel direction to your preference.
- 100% Local & Lightweight: Zero external requests, zero analytics, minimal CPU footprint.

How to Use:
1. Open any web page.
2. Hold down the Right Mouse Button.
3. Roll the scroll wheel up to zoom in, or down to zoom out.
4. Release the Right Mouse Button. Notice that the context menu does not appear.
5. To reset zoom to 100%, hold RMB and click the Left Mouse Button.

Privacy & Permissions Note:
RMB Scroll Zoom operates entirely on your computer. It does not collect, store, or transmit any user browsing activity or personal data.

**Category** [REQUIRED]
Accessibility

**Single Purpose** [REQUIRED]
Enables users to adjust webpage zoom levels using right mouse button plus scroll wheel gestures.

**Primary Language** [REQUIRED]
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | icons/icon-128.png |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | |

### Screenshot Notes
- Screenshot 1: Webpage showing RMB + Scroll action with the floating zoom HUD pill visible ("Zoom: 125%").
- Screenshot 2: Extension popup settings menu showing zoom controls, step mode, and gesture options.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `tabs` | permissions | Used to read and adjust tab zoom levels via chrome.tabs.getZoom and chrome.tabs.setZoom when the user performs the zoom gesture. |
| `storage` | permissions | Used to save user preferences (step mode, linear step size, scroll inversion, reset gesture, and HUD display) via chrome.storage.sync. |
| `<all_urls>` | host_permissions | Allows the content script to listen for the RMB + scroll wheel mouse gesture on any webpage where the user wants to adjust zoom. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

The extension operates completely on-device. No telemetry, no external network requests, and no personal data is collected or transmitted.

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL** [REQUIRED if collecting data, RECOMMENDED otherwise]
https://github.com/david/rmb-scroll-zoom/blob/main/PRIVACY.md

## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free

## Developer Info

**Publisher Name** [REQUIRED]
David

**Contact Email** [REQUIRED]
david@example.com

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-09-04 | Initial release: RMB+scroll zoom, context menu suppression, HUD overlay, popup settings. | Draft |

## Review Notes

### Known Issues / Limitations
- Chrome internal pages (`chrome://*`, Web Store pages) block content scripts by browser design. The extension functions on all normal web content (`http://*`, `https://*`, and `file://*` if granted in extension details).
