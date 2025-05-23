// Tab switching functionality
document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked button and corresponding content
      button.classList.add('active');
      const tabId = `${button.getAttribute('data-tab')}-tab`;
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // Get scenario select dropdowns
  const scenarioSelects = document.querySelectorAll('.scenario-select');
  
  // Load scenarios and settings
  chrome.storage.local.get('scenarios', ({scenarios}) => {
    const scenarioNames = scenarios?.names || [];
    console.log('Loaded scenario names:', scenarioNames);
    
    // Only use default names if we don't have any stored scenarios
    const hasValidScenarios = scenarioNames.length === 3 && 
                            scenarioNames.some(name => name && name !== 'Scenario 1' && 
                                                           name !== 'Scenario 2' && 
                                                           name !== 'Scenario 3');
    
    // Populate dropdown options with proper fallback
    const options = Array(3).fill(null).map((_, index) => {
      const name = hasValidScenarios ? scenarioNames[index] : `Scenario ${index + 1}`;
      return `<option value="${index}">${name}</option>`;
    });
    
    scenarioSelects.forEach(select => select.innerHTML = options.join(''));

    // Load saved settings
    chrome.storage.sync.get({
      variance1: { minuend: 0, subtrahend: 1 },
      variance2: { minuend: 0, subtrahend: 2 },
      colorGradientEnabled: true,
      varianceThreshold: '',
      varianceHighlightEnabled: false,
      calculatorEnabled: true, // Default to true
      showTotalOnlyEnabled: false, // Default for the toggle
      comparisonModeEnabled: false // Default for comparison mode
    }, (settings) => {
      document.getElementById('color-gradient-toggle').checked = settings.colorGradientEnabled;
      document.getElementById('calculator-toggle').checked = settings.calculatorEnabled;
      document.getElementById('show-total-only-toggle').checked = settings.showTotalOnlyEnabled;
      document.getElementById('comparison-mode-toggle').checked = settings.comparisonModeEnabled;
      document.getElementById('variance1-minuend').value = settings.variance1.minuend;
      document.getElementById('variance1-subtrahend').value = settings.variance1.subtrahend;
      document.getElementById('variance2-minuend').value = settings.variance2.minuend;
      document.getElementById('variance2-subtrahend').value = settings.variance2.subtrahend;
      document.getElementById('variance-threshold').value = settings.varianceThreshold;
      
      const toggleBtn = document.getElementById('toggle-threshold');
      toggleBtn.textContent = settings.varianceHighlightEnabled ? 'Disable' : 'Enable';
      toggleBtn.classList.toggle('active', settings.varianceHighlightEnabled);
    });
  });
});

// Calculator toggle event listener
document.getElementById('calculator-toggle').addEventListener('change', (e) => {
  const enabled = e.target.checked;
  
  // If calculator is being enabled, disable comparison mode
  if (enabled) {
    document.getElementById('comparison-mode-toggle').checked = false;
    chrome.storage.sync.set({ comparisonModeEnabled: false });
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'TOGGLE_COMPARISON_MODE',
        enabled: false
      });
    });
  }
  
  chrome.storage.sync.set({ calculatorEnabled: enabled });
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'TOGGLE_CALCULATOR',
      enabled: enabled
    });
  });
});

// Comparison mode toggle event listener
document.getElementById('comparison-mode-toggle').addEventListener('change', (e) => {
  const enabled = e.target.checked;
  
  // If comparison mode is being enabled, disable calculator
  if (enabled) {
    document.getElementById('calculator-toggle').checked = false;
    chrome.storage.sync.set({ calculatorEnabled: false });
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'TOGGLE_CALCULATOR',
        enabled: false
      });
    });
  }
  
  chrome.storage.sync.set({ comparisonModeEnabled: enabled });
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'TOGGLE_COMPARISON_MODE',
      enabled: enabled
    });
  });
});

// Listen for scenario updates
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SCENARIOS_UPDATED') {
    chrome.storage.local.get('scenarios', ({scenarios}) => {
      const scenarioNames = scenarios.names;
      
      // Only update if we have valid scenario names
      if (scenarioNames && scenarioNames.length === 3 && 
          scenarioNames.some(name => name && name !== 'Scenario 1' && 
                                         name !== 'Scenario 2' && 
                                         name !== 'Scenario 3')) {
        console.log('Updating scenario dropdowns with:', scenarioNames);
        const options = scenarioNames.map((name, index) => 
          `<option value="${index}">${name}</option>`
        );
        document.querySelectorAll('.scenario-select').forEach(select => {
          select.innerHTML = options.join('');
        });
      }
    });
  }
});

// Event listener for the "Show Total Only" toggle
document.getElementById('show-total-only-toggle').addEventListener('change', (e) => {
  const enabled = e.target.checked;
  chrome.storage.sync.set({ showTotalOnlyEnabled: enabled });
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'TOGGLE_SHOW_TOTAL_ONLY',
      enabled: enabled
    });
  });
});

// Color gradient toggle
document.getElementById('color-gradient-toggle').addEventListener('change', (e) => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'UPDATE_COLOR_GRADIENT',
      enabled: e.target.checked
    });
  });
});

// Variance threshold toggle
document.getElementById('toggle-threshold').addEventListener('click', () => {
  const threshold = document.getElementById('variance-threshold').value;
  if (!threshold) {
    document.getElementById('variance-threshold').style.borderColor = 'red';
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

// Save settings handler
document.getElementById('save').addEventListener('click', () => {
  const settings = {
    variance1: {
      minuend: parseInt(document.getElementById('variance1-minuend').value),
      subtrahend: parseInt(document.getElementById('variance1-subtrahend').value)
    },
    variance2: {
      minuend: parseInt(document.getElementById('variance2-minuend').value),
      subtrahend: parseInt(document.getElementById('variance2-subtrahend').value)
    }
  };

  chrome.storage.sync.set({
    ...settings,
    colorGradientEnabled: document.getElementById('color-gradient-toggle').checked,
    calculatorEnabled: document.getElementById('calculator-toggle').checked,
    showTotalOnlyEnabled: document.getElementById('show-total-only-toggle').checked,
    comparisonModeEnabled: document.getElementById('comparison-mode-toggle').checked,
    varianceThreshold: document.getElementById('variance-threshold').value
  }, () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'UPDATE_VARIANCE_SETTINGS',
        settings: settings
      });
    });
    showStatus('Settings saved!');
  });
});

function showStatus(message) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.classList.add('success');
  status.style.display = 'block';
  setTimeout(() => status.style.display = 'none', 2000);
}
