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
    },
    colorGradientEnabled: true,
    varianceThreshold: '',
    varianceHighlightEnabled: false
  }, (settings) => {
    // Set color gradient toggle
    document.getElementById('color-gradient-toggle').checked = settings.colorGradientEnabled;
    // Populate dropdowns with saved settings
    document.getElementById('variance1-minuend').value = settings.variance1.minuend;
    document.getElementById('variance1-subtrahend').value = settings.variance1.subtrahend;
    document.getElementById('variance2-minuend').value = settings.variance2.minuend;
    document.getElementById('variance2-subtrahend').value = settings.variance2.subtrahend;
    
    // Set variance threshold input
    document.getElementById('variance-threshold').value = settings.varianceThreshold;
    // Update toggle button text based on state
    const toggleBtn = document.getElementById('toggle-threshold');
    toggleBtn.textContent = settings.varianceHighlightEnabled ? 'Disable' : 'Enable';
    toggleBtn.classList.toggle('active', settings.varianceHighlightEnabled);
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

// Handle color gradient toggle
document.getElementById('color-gradient-toggle').addEventListener('change', (e) => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'UPDATE_COLOR_GRADIENT',
      enabled: e.target.checked
    });
  });
});

// Handle variance threshold toggle
document.getElementById('toggle-threshold').addEventListener('click', () => {
  const thresholdInput = document.getElementById('variance-threshold');
  const threshold = thresholdInput.value;
  
  if (!threshold) {
    thresholdInput.style.borderColor = 'red';
    setTimeout(() => thresholdInput.style.borderColor = '', 2000);
    return;
  }

  chrome.storage.sync.get(['varianceHighlightEnabled'], (result) => {
    const newState = !result.varianceHighlightEnabled;
    
    chrome.storage.sync.set({
      varianceHighlightEnabled: newState,
      varianceThreshold: threshold
    }, () => {
      const toggleBtn = document.getElementById('toggle-threshold');
      toggleBtn.textContent = newState ? 'Disable' : 'Enable';
      toggleBtn.classList.toggle('active', newState);

      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'TOGGLE_VARIANCE_HIGHLIGHT',
          enabled: newState,
          threshold: threshold
        });
      });
    });
  });
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
  chrome.storage.sync.set({
    ...settings,
    colorGradientEnabled: document.getElementById('color-gradient-toggle').checked,
    varianceThreshold: document.getElementById('variance-threshold').value
  }, () => {
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
