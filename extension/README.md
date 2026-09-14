# Auto Backup Downloader - Chrome Extension

A Manifest V3 Chrome extension that downloads backup files into a specific subfolder inside the user's Downloads directory without prompting the download dialog.

## Files

- `manifest.json` - Manifest V3 configuration
- `popup.html` - Extension popup UI
- `popup.js` - Popup logic (save folder, backup now)
- `background.js` - Service worker handling downloads
- `icon16.svg`, `icon48.svg` - Extension icons

## How to Load

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `extension` folder

## Features

- Type or select a subfolder name (e.g., "MEGA downloads")
- Save folder preference to `chrome.storage.local`
- Click "Backup Now" to generate a JSON backup and download it to `<Downloads>/<subfolder>/backup-<timestamp>.json`
- `saveAs: false` ensures no file picker dialog

## Path Handling

Chrome's `chrome.downloads.download()` treats the `filename` parameter as a path **relative to the default Downloads folder**. So `filename: "MEGA downloads/backup-123.json"` will download to:

```
<Downloads>/MEGA downloads/backup-123.json
```

## Sanitization

The subfolder name is sanitized to remove:
- Invalid characters: `\ / : * ? " < > |`
- Leading/trailing spaces and dots
- Path traversal attempts (`..`)

## Permissions

- `downloads` - Required for `chrome.downloads.download()`
- `storage` - Required for `chrome.storage.local`