// background.js - Service worker that handles download requests

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadBackup') {
    handleDownloadBackup(request.subfolder, request.backupData)
      .then((result) => {
        sendResponse({ success: true, downloadId: result });
      })
      .catch((err) => {
        console.error('Download failed:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep the message channel open for async response
  }
});

/**
 * Sanitize subfolder name to prevent path traversal and invalid characters.
 * Removes: \ / : * ? " < > | and leading/trailing dots or spaces.
 */
function sanitizeSubfolder(name) {
  return name
    .replace(/[\\/:*?"<>|]/g, '') // Remove invalid filename characters
    .replace(/^[\s.]+|[\s.]+$/g, '') // Trim leading/trailing spaces and dots
    .replace(/\.\./g, ''); // Remove path traversal attempts
}

/**
 * Generate a safe filename for the backup file.
 */
function generateFilename() {
  const date = new Date();
  const timestamp = date.toISOString().replace(/[:.]/g, '-');
  return `backup-${timestamp}.json`;
}

/**
 * Handle the backup download request.
 * Chrome treats the filename parameter as a path relative to the default downloads folder.
 * So "subfolder/filename.json" will download to <Downloads>/subfolder/filename.json
 */
async function handleDownloadBackup(subfolder, backupData) {
  // Sanitize the subfolder name
  const safeSubfolder = sanitizeSubfolder(subfolder);
  if (!safeSubfolder) {
    throw new Error('Invalid subfolder name after sanitization');
  }

  // Generate filename
  const filename = generateFilename();

  // Convert backup data to JSON string
  const jsonContent = JSON.stringify(backupData, null, 2);

  // Create a Blob and object URL for the data
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const dataUrl = URL.createObjectURL(blob);

  // Construct the download path: subfolder/filename.json
  // Chrome's downloads API treats this as relative to the default downloads folder
  const downloadPath = `${safeSubfolder}/${filename}`;

  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url: dataUrl,
        filename: downloadPath, // Relative to Downloads folder
        saveAs: false, // Don't show file picker - auto-save to folder
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          URL.revokeObjectURL(dataUrl);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (downloadId === undefined) {
          URL.revokeObjectURL(dataUrl);
          reject(new Error('Download ID is undefined - check downloads permission'));
          return;
        }
        resolve(downloadId);
      }
    );
  });
}