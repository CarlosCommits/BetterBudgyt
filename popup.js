// Retrieve and populate saved settings when popup opens
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get({
    // Default settings
    variance1: {
      minuend: 'forecast',
      subtrahend: 'budget25'
    },
    variance2: {
      minuend: 'forecast',
      subtrahend: 'budget26'
    }
  }, (settings) => {
    // Populate dropdowns with saved settings
    document.getElementById('variance1-minuend').value = settings.variance1.minuend;
    document.getElementById('variance1-subtrahend').value = settings.variance1.subtrahend;
    document.getElementById('variance2-minuend').value = settings.variance2.minuend;
    document.getElementById('variance2-subtrahend').value = settings.variance2.subtrahend;
  });
});

// Handle compact view button
document.getElementById('compact-view-button').addEventListener('click', () => {
  // Show success message
  const status = document.getElementById('status');
  status.classList.add('success');
  status.style.display = 'block';
  
  // Send message to content script
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'COMPACT_VIEW_CLICKED'
    });
  });

  // Hide success message after 2 seconds
  setTimeout(() => {
    status.style.display = 'none';
  }, 2000);
});

// Save settings when button is clicked
document.getElementById('save').addEventListener('click', () => {
  const settings = {
    variance1: {
      minuend: document.getElementById('variance1-minuend').value,
      subtrahend: document.getElementById('variance1-subtrahend').value
    },
    variance2: {
      minuend: document.getElementById('variance2-minuend').value,
      subtrahend: document.getElementById('variance2-subtrahend').value
    }
  };

  // Save to Chrome storage
  chrome.storage.sync.set(settings, () => {
    // Show success message
    const status = document.getElementById('status');
    status.classList.add('success');
    status.style.display = 'block';
    
    // Send message to content script to update calculations
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'UPDATE_VARIANCE_SETTINGS',
        settings: settings
      });
    });

    // Hide success message after 2 seconds
    setTimeout(() => {
      status.style.display = 'none';
    }, 2000);
  });
});
