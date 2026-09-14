// popup.js - Handles UI interactions in the extension popup

// DOM elements
const subfolderInput = document.getElementById('subfolder');
const saveButton = document.getElementById('save');
const backupButton = document.getElementById('backup');
const statusDiv = document.getElementById('status');

// Load saved subfolder on popup open
chrome.storage.local.get(['subfolder'], (result) => {
  if (result.subfolder) {
    subfolderInput.value = result.subfolder;
  }
});

// Show status message
function showStatus(message, isError = false) {
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + (isError ? 'error' : 'success');
  setTimeout(() => {
    statusDiv.textContent = '';
    statusDiv.className = 'status';
  }, 3000);
}

// Save subfolder preference
saveButton.addEventListener('click', () => {
  const subfolder = subfolderInput.value.trim();
  if (!subfolder) {
    showStatus('Please enter a subfolder name', true);
    return;
  }

  chrome.storage.local.set({ subfolder }, () => {
    showStatus('Folder saved: ' + subfolder);
  });
});

// Generate backup payload and request download
backupButton.addEventListener('click', () => {
  const subfolder = subfolderInput.value.trim();
  if (!subfolder) {
    showStatus('Please enter a subfolder name first', true);
    return;
  }

  // Generate backup JSON payload
  const backupData = {
    timestamp: Date.now(),
    data: {
      // Replace with your actual data source
      message: 'Backup from Auto Backup Downloader',
      date: new Date().toISOString(),
    },
  };

  // Send to background service worker
  chrome.runtime.sendMessage(
    {
      action: 'downloadBackup',
      subfolder: subfolder,
      backupData: backupData,
    },
    (response) => {
      if (chrome.runtime.lastError) {
        showStatus('Error: ' + chrome.runtime.lastError.message, true);
        return;
      }
      if (response && response.success) {
        showStatus('Backup downloaded successfully!');
      } else {
        showStatus('Download failed: ' + (response?.error || 'Unknown error'), true);
      }
    }
  );
});