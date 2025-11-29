// Format number with commas, no unnecessary decimals
function formatNumber(number) {
  const num = Number(number);
  // If it's a whole number, don't show decimals
  if (Number.isInteger(num)) {
    return num.toLocaleString('en-US');
  }
  // Otherwise show up to 2 decimal places
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

// Strip number prefix from names (e.g., "1001 - ADMIN" -> "ADMIN")
function stripNumberPrefix(name) {
  if (!name) return name;
  // Match patterns like "1001 - Name" or "526 - Vendor"
  return name.replace(/^\d+\s*[-–]\s*/i, '').trim();
}

// Show month columns in DataInput view
function showMonthColumns() {
  if (!isDatasheetPage()) return;

  console.log('Restoring month columns view');
  
  const elementsToRestore = document.querySelectorAll('[data-original-style]');
  elementsToRestore.forEach(element => {
    element.setAttribute('style', element.getAttribute('data-original-style'));
    element.removeAttribute('data-original-style');
  });
}

// Helper function to check if scenarios have changed
function scenariosChanged(oldScenarios, newScenarios) {
  return !oldScenarios || 
         oldScenarios.length !== newScenarios.length ||
         oldScenarios.some((s, i) => s !== newScenarios[i]);
}

// Scenario detection observer
const scenarioObserver = new MutationObserver(() => {
  // Get scenario names from specific span elements
  const scenario1Element = document.querySelector('span#select2-chosen-52');
  const scenario2Element = document.querySelector('span#select2-chosen-54');
  
  // For Scenario 3, find all spans matching the structure but exclude scenario 2's span
  const scenario3Element = Array.from(
    document.querySelectorAll('div.select2-container.select2me.comp-budget-list.select2me-large a span.select2-chosen')
  ).find(span => span.id !== 'select2-chosen-54');
  
  const newScenarios = [
    scenario1Element?.textContent.trim() || 'Scenario 1',
    scenario2Element?.textContent.trim() || 'Scenario 2',
    scenario3Element?.textContent.trim() || 'Scenario 3'
  ];
  
  console.log('Found scenario elements:', {
    scenario1: scenario1Element?.id,
    scenario2: scenario2Element?.id,
    scenario3: scenario3Element?.id,
    names: newScenarios
  });
  
  // Only update if we found at least one scenario
  if (newScenarios.some(name => name !== 'Scenario 1' && name !== 'Scenario 2' && name !== 'Scenario 3')) {
    chrome.storage.local.get('scenarios', ({scenarios}) => {
      if (scenariosChanged(scenarios?.names, newScenarios)) {
        chrome.storage.local.set({ 
          scenarios: {
            names: newScenarios,
            timestamp: Date.now()
          }
        });
        chrome.runtime.sendMessage({type: 'SCENARIOS_UPDATED'});
        console.log('Updated scenarios:', newScenarios);
      }
    });
  }
});

// Function to initialize scenario observer
function initializeScenarioObserver(maxAttempts = 20) {
  let attempts = 0;
  
  function tryObserve() {
    // Get all three containers
    const container1 = document.querySelector('.dashboardLabels.year-list');
    const container2 = document.querySelector('.dashboardLabels.comparisionBudget1Year');
    const container3 = document.querySelector('.dashboardLabels.comparisionBudget2Year');
    
    if (container1 && container2 && container3) {
      // Observe all three containers
      scenarioObserver.observe(container1, {
        childList: true,
        subtree: true
      });
      scenarioObserver.observe(container2, {
        childList: true,
        subtree: true
      });
      scenarioObserver.observe(container3, {
        childList: true,
        subtree: true
      });
      
      // Trigger initial scan
      const scenario1Element = document.querySelector('span#select2-chosen-52');
      const scenario2Element = document.querySelector('span#select2-chosen-54');
      
      // For Scenario 3, find all spans matching the structure but exclude scenario 2's span
      const scenario3Element = Array.from(
        document.querySelectorAll('div.select2-container.select2me.comp-budget-list.select2me-large a span.select2-chosen')
      ).find(span => span.id !== 'select2-chosen-54');
      
      const initialScenarios = [
        scenario1Element?.textContent.trim() || 'Scenario 1',
        scenario2Element?.textContent.trim() || 'Scenario 2',
        scenario3Element?.textContent.trim() || 'Scenario 3'
      ];
      
      console.log('Initial scenario elements:', {
        scenario1: scenario1Element?.id,
        scenario2: scenario2Element?.id,
        scenario3: scenario3Element?.id,
        names: initialScenarios
      });
      
      if (initialScenarios.some(name => name !== 'Scenario 1' && name !== 'Scenario 2' && name !== 'Scenario 3')) {
        chrome.storage.local.set({ 
          scenarios: {
            names: initialScenarios,
            timestamp: Date.now()
          }
        });
        console.log('Initial scenarios set:', initialScenarios);
      }
    } else if (attempts < maxAttempts) {
      attempts++;
      setTimeout(tryObserve, 500);
    } else {
      console.warn('Max attempts reached waiting for scenario container');
    }
  }
  
  tryObserve();
}

// Initialize scenario observer
initializeScenarioObserver();

// Column selectors with dynamic scenario names
let columnSelectors = {};

function updateColumnSelectors(scenarios) {
  columnSelectors = {
    0: {
      header: `th:has(a.sort-both):contains("${scenarios[0] || 'Scenario 1'}")`,
      cells: ['.actualbudgetVal-toprow', '.actual-budgetVal', '[class*="catTopRow-actualBudget"]']
    },
    1: {
      header: `th:has(a.sort-both):contains("${scenarios[1] || 'Scenario 2'}")`,
      cells: ['.comparebudgetVal-toprow', '.compare-budgetVal', '[class*="catTopRow-compareBudget"]']
    },
    2: {
      header: `th:has(a.sort-both):contains("${scenarios[2] || 'Scenario 3'}")`,
      cells: ['.lybudgetVal-toprow', '.actual-budgetLYVal', '[class*="catTopRow-LYBudget"]']
    }
  };
}

// Initialize with current scenarios
chrome.storage.local.get('scenarios', ({scenarios}) => {
  updateColumnSelectors(scenarios?.names || []);
});

// Variance column selectors
const varianceSelectors = {
  variance1: [
    '.variance1',
    '.varbudgetVal-toprow',
    '.catTopRow-varBudgetVal',
    '.var-budgetVal'
  ],
  variance2: [
    '.variance2',
    '.budgetVal-toprow',
    '.catTopRow-BudgetVal',
    '.Ly-budgetVal'
  ]
};

// Percentage column selectors
const percentageSelectors = {
  percentage1: [
    '.varbudgetPercent-toprow',
    '.catTopRow-varBudgetPercent',
    '.var-budgetPercent'
  ],
  percentage2: [
    '.budgetPercent-toprow',
    '.catTopRow-BudgetPercent',
    '.Ly-budgetPercent'
  ]
};

// Validate if a cell is a valid variance2 cell
function isValidVariance2Cell(cell) {
  return cell && 
         cell.getAttribute('title') === 'Variance 2' &&
         cell.classList.contains('hideVarianceInBudgetComp') &&
         cell.classList.contains('hideThirdBudgetInBudgetComp');
}

// Validate if a cell is a valid percentage cell
function isValidPercentageCell(cell, type) {
  return cell && 
         cell.getAttribute('title') === `Variance ${type}` &&
         cell.classList.contains('hideVarianceInBudgetComp') &&
         (type === 2 ? cell.classList.contains('hideThirdBudgetInBudgetComp') : true);
}

// Get abbreviated name for scenario
function getAbbreviatedName(scenarioIndex) {
  return new Promise((resolve) => {
    chrome.storage.local.get('scenarios', ({scenarios}) => {
      if (!scenarios?.names?.[scenarioIndex]) {
        resolve(`S${scenarioIndex + 1}`);
        return;
      }
      
      const name = scenarios.names[scenarioIndex];
      // Take just first letter and any numbers
      const firstLetter = name.match(/\b\w/)?.[0] || 'S';
      const numbers = name.match(/\d+/)?.[0] || '';
      const abbr = (firstLetter + numbers).toUpperCase();
      resolve(abbr || `S${scenarioIndex + 1}`);
    });
  });
}

// Generate header text based on variance settings
async function generateHeaderText(varianceNum, minuend, subtrahend) {
  const [minAbbr, subAbbr] = await Promise.all([
    getAbbreviatedName(minuend),
    getAbbreviatedName(subtrahend)
  ]);
  return `V${varianceNum}: ${minAbbr} - ${subAbbr}`;
}

// Update variance headers based on current settings
async function updateVarianceHeaders() {
  // Find variance headers using their classes
  const headers = document.querySelectorAll('th.hideVarianceInBudgetComp');
  
  // Initialize headers if needed
  initializeVarianceHeaders();
  
  for (const header of headers) {
    const varianceType = header.getAttribute('data-variance-type');
    const sortButton = header.querySelector('a.sort-both');
    if (!sortButton) continue;
    
    let newText;
    if (varianceType === 'variance1') {
      newText = await generateHeaderText(1, currentSettings.variance1.minuend, currentSettings.variance1.subtrahend);
      // Keep original text in title for tooltip
      header.title = `Variance 1 (${newText})`;
    } else if (varianceType === 'variance2') {
      newText = await generateHeaderText(2, currentSettings.variance2.minuend, currentSettings.variance2.subtrahend);
      // Keep original text in title for tooltip
      header.title = `Variance 2 (${newText})`;
    }

    if (newText) {
      // Clear existing content
      header.innerHTML = '';
      // Add new text and sort button
      header.appendChild(document.createTextNode(newText + ' '));
      header.appendChild(sortButton);
    }
  }
}

// Initialize variance headers with data attributes
function initializeVarianceHeaders() {
  const headers = document.querySelectorAll('th.hideVarianceInBudgetComp');
  
  headers.forEach(header => {
    const headerText = header.textContent.trim();
    
    // Only initialize if not already initialized
    if (!header.hasAttribute('data-variance-type')) {
      if (headerText.includes('Variance 1')) {
        header.setAttribute('data-variance-type', 'variance1');
      } else if (headerText.includes('Variance 2')) {
        header.setAttribute('data-variance-type', 'variance2');
      }
    }
  });
}


// Global variables for calculator, comparison mode, and debug mode states
let calculatorEnabled = true;
let comparisonModeEnabled = false;
let debugModeEnabled = false; // Debug mode for datasheet comparison

// Store selected cells for comparison mode
let comparisonSelectedCells = new Map();
let comparisonSelectionOrder = [];

// Cache for store/class name mappings (storeUID -> name)
let storeNameCache = new Map();

// Fetch store/class names from the page's DOM or API
async function fetchStoreNamesFromPage() {
  // Return cached values if available
  if (storeNameCache.size > 0) {
    console.log('Using cached store names:', storeNameCache.size, 'entries');
    return storeNameCache;
  }
  
  console.log('Fetching store names from page...');
  
  // Try multiple selectors for store/class filter dropdowns commonly used in Budgyt
  const dropdownSelectors = [
    // Store filter dropdown options
    '#storeFilter option',
    '#classFilter option',
    'select[name="store"] option',
    'select[name="class"] option',
    'select.store-filter option',
    'select.class-filter option',
    // Select2 dropdown results (common in Budgyt)
    '.store-select .select2-results__option',
    '.class-select .select2-results__option',
    '#select2-storeFilter-results .select2-results__option',
    // Multi-select checkboxes (another common pattern)
    '.store-checkbox-list input[type="checkbox"]',
    '.class-checkbox-list input[type="checkbox"]',
    // Data attributes that might contain store info
    '[data-store-id]',
    '[data-class-id]',
    // Generic dropdown in filter area
    '.dashboardFilters select option',
    '.filter-section select option'
  ];
  
  for (const selector of dropdownSelectors) {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        elements.forEach(el => {
          let storeUID = el.value || el.getAttribute('data-store-id') || el.getAttribute('data-class-id') || el.getAttribute('data-id');
          let storeName = el.textContent?.trim() || el.getAttribute('data-name') || el.getAttribute('title');
          
          // Skip empty or placeholder options
          if (storeUID && storeName && storeUID !== '-1' && storeUID !== '' && !storeName.toLowerCase().includes('select') && !storeName.toLowerCase().includes('all')) {
            storeNameCache.set(storeUID, storeName);
          }
        });
        
        if (storeNameCache.size > 0) {
          console.log(`Extracted ${storeNameCache.size} store names from DOM`);
          return storeNameCache;
        }
      }
    } catch (e) {
      console.warn(`Error querying selector ${selector}:`, e);
    }
  }
  
  // Try to find store names from DataInput table rows (level 1 and level 2 rows contain department/class info)
  try {
    // Look for department/class rows in the DataInput table - check both level 1 and level 2
    const deptRows = document.querySelectorAll('tr[data-level="1"], tr[data-level="2"], tr.level1, tr.level2, tr.store-row, tr.class-row');
    console.log(`Found ${deptRows.length} potential department rows in page DOM`);
    
    deptRows.forEach(row => {
      const storeCell = row.querySelector('td#hdnStoreUID');
      if (!storeCell) return;
      
      const storeUID = storeCell.textContent?.trim();
      if (!storeUID || storeUID === '-1') return;
      
      // Get department name - try multiple sources
      let storeName = '';
      
      // 1. Try div.label (common in level-1 rows)
      const labelDiv = row.querySelector('div.label');
      if (labelDiv) {
        storeName = labelDiv.textContent?.trim();
      }
      
      // 2. Try first td's title attribute (common in level-2 rows)
      if (!storeName) {
        const firstTd = row.querySelector('td:first-child');
        if (firstTd) {
          const title = firstTd.getAttribute('title');
          // Skip month names
          if (title && !['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Total', '%LY', '%LLY'].includes(title)) {
            storeName = title;
          }
        }
      }
      
      // 3. Try first td's text content
      if (!storeName) {
        const firstTd = row.querySelector('td:first-child');
        if (firstTd) {
          storeName = firstTd.textContent?.trim();
        }
      }
      
      if (storeName) {
        // Decode HTML entities
        const textarea = document.createElement('textarea');
        textarea.innerHTML = storeName;
        storeName = textarea.value.trim();
      }
      
      if (storeUID && storeName) {
        storeNameCache.set(storeUID, storeName);
        console.log(`Cached store name: ${storeUID} -> ${storeName}`);
      }
    });
    
    if (storeNameCache.size > 0) {
      console.log(`Extracted ${storeNameCache.size} store names from DataInput table rows`);
      return storeNameCache;
    }
  } catch (e) {
    console.warn('Error extracting store names from table rows:', e);
  }
  
  // Try to fetch store list from Budgyt API
  try {
    console.log('Attempting to fetch store list from API...');
    const response = await fetch('/Budget/GetStoreList', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({})
    });
    
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        data.forEach(store => {
          const storeUID = String(store.StoreUID || store.storeUID || store.Id || store.id);
          const storeName = store.StoreName || store.storeName || store.Name || store.name;
          if (storeUID && storeName) {
            storeNameCache.set(storeUID, storeName);
          }
        });
        console.log(`Fetched ${storeNameCache.size} store names from API`);
        return storeNameCache;
      }
    }
  } catch (e) {
    console.warn('GetStoreList API not available:', e);
  }
  
  // Try GetClassList as alternative
  try {
    const response = await fetch('/Budget/GetClassList', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({})
    });
    
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        data.forEach(cls => {
          const classUID = String(cls.ClassUID || cls.classUID || cls.StoreUID || cls.Id || cls.id);
          const className = cls.ClassName || cls.className || cls.StoreName || cls.Name || cls.name;
          if (classUID && className) {
            storeNameCache.set(classUID, className);
          }
        });
        console.log(`Fetched ${storeNameCache.size} class names from API`);
        return storeNameCache;
      }
    }
  } catch (e) {
    console.warn('GetClassList API not available:', e);
  }
  
  console.log('Could not find store/class names from page or API');
  return storeNameCache;
}

// Clear store name cache (useful when navigating to different budgets)
function clearStoreNameCache() {
  storeNameCache.clear();
  console.log('Store name cache cleared');
}

// Log HTML in chunks to avoid console truncation
function logHtmlInChunks(html, prefix = 'HTML Chunk') {
  if (!debugModeEnabled) return;
  
  const chunkSize = 10000; // Characters per chunk
  const chunks = Math.ceil(html.length / chunkSize);
  
  console.log(`${prefix}: Full HTML length: ${html.length} characters, splitting into ${chunks} chunks`);
  
  for (let i = 0; i < chunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, html.length);
    console.log(`${prefix} ${i+1}/${chunks}:`, html.substring(start, end));
  }
}

// Log DOM structure for debugging
function logDomStructure(element, maxDepth = 3, currentDepth = 0) {
  if (!debugModeEnabled) return;
  if (!element || currentDepth > maxDepth) return;
  
  const indent = '  '.repeat(currentDepth);
  const tagName = element.tagName?.toLowerCase() || 'text';
  const id = element.id ? `#${element.id}` : '';
  const classes = element.className ? `.${element.className.split(' ').join('.')}` : '';
  const dataLevel = element.getAttribute?.('data-level') ? `[data-level="${element.getAttribute('data-level')}"]` : '';
  
  console.log(`${indent}${tagName}${id}${classes}${dataLevel}`);
  
  if (element.children) {
    Array.from(element.children).forEach(child => {
      logDomStructure(child, maxDepth, currentDepth + 1);
    });
  }
}

// Store current settings
let currentSettings = {
  variance1: {
    minuend: 0,
    subtrahend: 1
  },
  variance2: {
    minuend: 0,
    subtrahend: 2
  },
  varianceThreshold: '',
  varianceHighlightEnabled: false,
  // calculatorEnabled is managed separately but initialized here for consistency
};

// Load saved settings when content script initializes
chrome.storage.sync.get({
  variance1: {
    minuend: 0,
    subtrahend: 1
  },
  variance2: {
    minuend: 0,
    subtrahend: 2
  },
  colorGradientEnabled: true,
  varianceThreshold: '',
  varianceHighlightEnabled: false,
  calculatorEnabled: true, // Default to true
  comparisonModeEnabled: false, // Default to false
  debugModeEnabled: false, // Default for debug mode
  comparisonHideMonths: false,
  comparisonClassTotalsOnly: false
}, async (settings) => {
  currentSettings = { // Explicitly set currentSettings, excluding calculatorEnabled
    variance1: settings.variance1,
    variance2: settings.variance2,
    colorGradientEnabled: settings.colorGradientEnabled,
    varianceThreshold: settings.varianceThreshold,
    varianceHighlightEnabled: settings.varianceHighlightEnabled
  };
  calculatorEnabled = settings.calculatorEnabled; // Set global variable
  comparisonModeEnabled = settings.comparisonModeEnabled; // Set comparison mode variable
  debugModeEnabled = settings.debugModeEnabled; // Set debug mode variable
  
  console.log(`Debug mode is ${debugModeEnabled ? 'enabled' : 'disabled'} on startup`);

  updateVarianceCalculations();
  await updateVarianceHeaders(); // Update headers when settings are loaded
});

// Listen for settings updates from popup
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'UPDATE_VARIANCE_SETTINGS') {
    currentSettings = message.settings;
    updateVarianceCalculations();
    await updateVarianceHeaders();
  } else if (message.type === 'UPDATE_COLOR_GRADIENT') {
    chrome.storage.sync.set({ colorGradientEnabled: message.enabled });
    updatePercentageColors();
  } else if (message.type === 'TOGGLE_VARIANCE_HIGHLIGHT') {
    currentSettings.varianceHighlightEnabled = message.enabled;
    currentSettings.varianceThreshold = parseFloat(message.threshold);
    updateVarianceHighlights();
  } else if (message.type === 'TOGGLE_CALCULATOR') {
    calculatorEnabled = message.enabled;
    if (!calculatorEnabled) {
      const sumPanel = document.querySelector('.betterbudgyt-sum-panel');
      if (sumPanel) {
        sumPanel.remove();
      }
      // Clear the map of selected cells
      selectedCells.clear();
      
      // Unhighlight any currently selected cells
      const highlightedCells = document.querySelectorAll('.betterbudgyt-cell-selected');
      highlightedCells.forEach(cell => {
        cell.classList.remove('betterbudgyt-cell-selected');
      });
      
      // Update the sum panel (to clear its display, even if hidden)
      updateSumPanel();
    }
  } else if (message.type === 'TOGGLE_COMPARISON_MODE') {
    comparisonModeEnabled = message.enabled;
    if (!comparisonModeEnabled) {
      // Remove compare button if it exists
      const compareButton = document.querySelector('.betterbudgyt-compare-button');
      if (compareButton) {
        compareButton.remove();
      }
      
      // Clear comparison selections
      comparisonSelectedCells.clear();
      comparisonSelectionOrder = [];
      
      // Remove comparison highlighting
      const comparisonCells = document.querySelectorAll('.betterbudgyt-compare-cell-1, .betterbudgyt-compare-cell-2');
      comparisonCells.forEach(cell => {
        cell.classList.remove('betterbudgyt-compare-cell-1', 'betterbudgyt-compare-cell-2');
      });
    }
  } else if (message.type === 'TOGGLE_DEBUG_MODE') {
    debugModeEnabled = message.enabled;
    console.log(`Debug mode ${debugModeEnabled ? 'enabled' : 'disabled'}`);
  }
  // Send response after async operations complete
  sendResponse();
  return true; // Keep message channel open for async response
});

// Update variance highlighting based on threshold
function updateVarianceHighlights() {
  const varianceCells = document.querySelectorAll([
    ...varianceSelectors.variance1,
    ...varianceSelectors.variance2
  ].join(','));

  varianceCells.forEach(cell => {
    if (!cell) return;
    
    // Remove existing highlight
    cell.classList.remove('variance-highlight-active');
    
    if (currentSettings.varianceHighlightEnabled && currentSettings.varianceThreshold) {
      const value = parseFloat(cell.textContent.replace(/,/g, ''));
      if (!isNaN(value) && Math.abs(value) >= currentSettings.varianceThreshold) {
        cell.classList.add('variance-highlight-active');
      }
    }
  });
}

// Calculate hue based on percentage value
function getPercentageHue(percent) {
    if (percent < 0) {
        return 0; // Red for negative values
    } else if (percent <= 50) {
        // More dramatic transition from red to orange/yellow in first half
        return percent * 0.8; // Slower transition from red (0°) to orange (~40°)
    } else if (percent <= 100) {
        // Faster transition from orange/yellow to green in second half
        return 40 + ((percent - 50) * 1.6); // Faster transition to green (120°)
    } else if (percent <= 200) {
        // More dramatic difference for values over 100%
        return Math.max(0, 120 - ((percent - 100) * 1.5)); // Faster transition back to red
    } else {
        return 0; // Red for values over 200%
    }
}

// Apply color gradient to percentage cells
function updatePercentageColors() {
  chrome.storage.sync.get({ colorGradientEnabled: true }, ({ colorGradientEnabled }) => {
    const percentageCells = document.querySelectorAll([
      ...percentageSelectors.percentage1,
      ...percentageSelectors.percentage2
    ].join(','));

    percentageCells.forEach(cell => {
      if (!cell) return;
      
      // Remove all styling classes first
      cell.classList.remove('betterbudgyt-percentage-cell', 'betterbudgyt-percentage-neutral');
      cell.style.removeProperty('--percentage-hue');
      
      if (colorGradientEnabled) {
        const percentText = cell.textContent.trim();
        
        if (percentText === 'N/A') {
          cell.classList.add('betterbudgyt-percentage-neutral');
        } else {
          const percentValue = parseFloat(percentText);
          if (!isNaN(percentValue)) {
            const hue = getPercentageHue(percentValue);
            cell.classList.add('betterbudgyt-percentage-cell');
            cell.style.setProperty('--percentage-hue', hue);
          }
        }
      }
    });
  });
}

// Find cell value based on column type
function findCellValue(row, columnType) {
  // Try each possible cell selector for the column type
  for (const selector of columnSelectors[columnType].cells) {
    const cell = row.querySelector(selector);
    if (cell) {
      // Try to find value in link first
      const link = cell.querySelector('a');
      if (link) {
        const text = link.textContent.trim();
        return parseFloat(text.replace(/,/g, '')) || 0;
      }
      // Otherwise get direct text content
      const text = cell.textContent.trim();
      return parseFloat(text.replace(/,/g, '')) || 0;
    }
  }
  return 0;
}

// Calculate variance between two columns
function calculateVariance(row, minuendCol, subtrahendCol) {
  const minuendValue = findCellValue(row, minuendCol);
  const subtrahendValue = findCellValue(row, subtrahendCol);
  return (minuendValue - subtrahendValue).toFixed(2);
}

// Calculate percentage between two columns
function calculatePercentage(row, minuendCol, subtrahendCol) {
  const minuendValue = findCellValue(row, minuendCol);
  const subtrahendValue = findCellValue(row, subtrahendCol);
  
  // Debug logging
  console.log('Calculating percentage:', {
    minuendCol,
    subtrahendCol,
    minuendValue,
    subtrahendValue,
    calculation: subtrahendValue !== 0 ? 
      `(${minuendValue} / ${subtrahendValue}) * 100` : 
      'Division by zero'
  });
  
  if (subtrahendValue === 0) return 'N/A';
  const percentage = ((minuendValue / subtrahendValue) * 100).toFixed(2) + '%';
  
  console.log('Calculated percentage:', percentage);
  return percentage;
}

// Update cell content handling both span and non-span structures
function updateCellContent(cell, value) {
  if (!cell) return;
  
  // Mark as managed by our extension
  cell.setAttribute('data-betterbudgyt', 'true');
  
  // Try to find and update span content first (Variance 1 structure)
  const span = cell.querySelector('span');
  if (span) {
    const link = span.querySelector('a');
    if (link) {
      link.textContent = value;
    } else {
      span.textContent = value;
    }
    return;
  }
  
  // If no span, update cell content directly (Variance 2 structure)
  cell.textContent = value;
}

// Update variance calculations for all rows
function updateVarianceCalculations() {
  updatePercentageColors(); // Add color gradient update
  updateVarianceHighlights(); // Add variance highlighting update
  // Find all rows
  const rows = document.querySelectorAll('tr');
  
  rows.forEach(row => {
    // Skip header row
    if (row.querySelector('th')) return;
    
    // Try each variance1 selector
    let variance1Cell = null;
    for (const selector of varianceSelectors.variance1) {
      const cell = row.querySelector(selector);
      if (cell) {
        variance1Cell = cell;
        break;
      }
    }
    
    // Try each variance2 selector
    let variance2Cell = null;
    for (const selector of varianceSelectors.variance2) {
      const cell = row.querySelector(selector);
      if (cell && isValidVariance2Cell(cell)) {
        variance2Cell = cell;
        break;
      }
    }
    
    if (variance1Cell) {
      const variance1 = calculateVariance(
        row,
        currentSettings.variance1.minuend,
        currentSettings.variance1.subtrahend
      );
      
      // Update variance cell content with formatted number
      const formattedValue = formatNumber(variance1);
      updateCellContent(variance1Cell, formattedValue);
    }
    
    if (variance2Cell) {
      const variance2 = calculateVariance(
        row,
        currentSettings.variance2.minuend,
        currentSettings.variance2.subtrahend
      );
      
      // Update variance cell content with formatted number
      const formattedValue = formatNumber(variance2);
      updateCellContent(variance2Cell, formattedValue);
    }

    // Update percentage cells
    // Try each percentage1 selector
    let percentage1Cell = null;
    for (const selector of percentageSelectors.percentage1) {
      const cell = row.querySelector(selector);
      if (cell && isValidPercentageCell(cell, 1)) {
        percentage1Cell = cell;
        break;
      }
    }

    // Try each percentage2 selector
    let percentage2Cell = null;
    for (const selector of percentageSelectors.percentage2) {
      const cell = row.querySelector(selector);
      if (cell && isValidPercentageCell(cell, 2)) {
        percentage2Cell = cell;
        break;
      }
    }

    // Add console logging for debugging
    console.log('Processing row:', {
      rowContent: row.textContent.trim().substring(0, 50) + '...',
      foundCells: {
        percentage1: percentage1Cell ? {
          found: true,
          class: percentage1Cell.className,
          title: percentage1Cell.getAttribute('title')
        } : 'not found',
        percentage2: percentage2Cell ? {
          found: true,
          class: percentage2Cell.className,
          title: percentage2Cell.getAttribute('title')
        } : 'not found'
      }
    });

    // Update percentage cells
    if (percentage1Cell) {
      const percentage1 = calculatePercentage(
        row,
        currentSettings.variance1.minuend,
        currentSettings.variance1.subtrahend
      );
      updateCellContent(percentage1Cell, percentage1);
    }

    if (percentage2Cell) {
      const percentage2 = calculatePercentage(
        row,
        currentSettings.variance2.minuend,
        currentSettings.variance2.subtrahend
      );
      updateCellContent(percentage2Cell, percentage2);
    }
  });
}

// Store selected cells and their data
let selectedCells = new Map();

// Create and initialize sum panel
function createSumPanel() {
  if (!calculatorEnabled) return; // Do not create panel if calculator is disabled

  const panel = document.createElement('div');
  panel.className = 'betterbudgyt-sum-panel';
  
  // Set initial position (will be adjusted after content is added)
  panel.style.visibility = 'hidden';
  panel.style.right = '20px';
  
  panel.innerHTML = `
    <div class="betterbudgyt-sum-panel-header">
      <div class="betterbudgyt-sum-panel-title">Selected Cells Sum</div>
      <div class="betterbudgyt-sum-panel-controls">
        <button class="betterbudgyt-sum-panel-button" id="clearSum">Clear</button>
        <button class="betterbudgyt-sum-panel-button" id="minimizeSum">−</button>
      </div>
    </div>
    <div class="betterbudgyt-sum-panel-content">
      <table class="betterbudgyt-sum-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
      <div class="betterbudgyt-sum-total">
        <span>Total:</span>
        <span id="sumTotal">$0.00</span>
      </div>
    </div>
  `;

  // Add panel to document
  document.body.appendChild(panel);

  // Store last position before minimizing
  let lastPosition = { top: null, left: null, right: '20px' };

  // Center panel vertically after it's added to get proper height
  requestAnimationFrame(() => {
    const panelHeight = panel.offsetHeight;
    const centerY = Math.max(20, (window.innerHeight - panelHeight) / 2);
    panel.style.top = `${centerY}px`;
    lastPosition.top = `${centerY}px`;
    // Make panel visible after positioning
    panel.style.visibility = 'visible';
  });

  // Initialize drag functionality
  initializeDrag(panel, lastPosition);

  // Add event listeners for controls
  panel.querySelector('#clearSum').addEventListener('click', () => {
    selectedCells.forEach((_, cell) => cell.classList.remove('betterbudgyt-cell-selected'));
    selectedCells.clear();
    updateSumPanel();
  });

  panel.querySelector('#minimizeSum').addEventListener('click', () => {
    if (!panel.classList.contains('minimized')) {
      // Store current position before minimizing
      lastPosition = {
        top: panel.style.top,
        left: panel.style.left,
        right: panel.style.right
      };
    } else {
      // Restore position when maximizing
      if (lastPosition.left) {
        panel.style.left = lastPosition.left;
        panel.style.right = 'auto';
      } else {
        panel.style.right = lastPosition.right;
        panel.style.left = 'auto';
      }
      panel.style.top = lastPosition.top;
    }
    
    panel.classList.toggle('minimized');
    const button = panel.querySelector('#minimizeSum');
    button.textContent = panel.classList.contains('minimized') ? '+' : '−';
  });

  // Handle click on minimized panel
  panel.addEventListener('click', (e) => {
    if (panel.classList.contains('minimized') && !e.target.closest('.betterbudgyt-sum-panel-button')) {
      panel.classList.remove('minimized');
      panel.querySelector('#minimizeSum').textContent = '−';
      
      // Restore position
      if (lastPosition.left) {
        panel.style.left = lastPosition.left;
        panel.style.right = 'auto';
      } else {
        panel.style.right = lastPosition.right;
        panel.style.left = 'auto';
      }
      panel.style.top = lastPosition.top;
    }
  });

  return panel;
}

// Initialize drag functionality
function initializeDrag(panel, lastPosition) {
  let isDragging = false;
  let startX;
  let startY;
  let startLeft;
  let startTop;

  const dragStart = (e) => {
    if (e.target.closest('.betterbudgyt-sum-panel-button') || panel.classList.contains('minimized')) return;
    
    if (e.target.closest('.betterbudgyt-sum-panel-header')) {
      isDragging = true;
      panel.classList.add('dragging');
      
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = panel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      
      // Convert right position to left if needed
      if (panel.style.right && !panel.style.left) {
        panel.style.left = (window.innerWidth - rect.right) + 'px';
        panel.style.right = 'auto';
      }
    }
  };

  const drag = (e) => {
    if (!isDragging) return;
    
    e.preventDefault();
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    let newLeft = startLeft + deltaX;
    let newTop = startTop + deltaY;
    
    // Constrain to viewport bounds
    const rect = panel.getBoundingClientRect();
    if (newLeft < 0) newLeft = 0;
    if (newLeft + rect.width > window.innerWidth) newLeft = window.innerWidth - rect.width;
    if (newTop < 0) newTop = 0;
    if (newTop + rect.height > window.innerHeight) newTop = window.innerHeight - rect.height;
    
    panel.style.left = newLeft + 'px';
    panel.style.top = newTop + 'px';
    panel.style.right = 'auto'; // Clear right positioning when dragging
    
    // Update last position
    lastPosition.top = panel.style.top;
    lastPosition.left = panel.style.left;
    lastPosition.right = 'auto';
  };

  const dragEnd = () => {
    if (isDragging) {
      isDragging = false;
      panel.classList.remove('dragging');
    }
  };

  panel.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);
}

// Update sum panel with current selections
function updateSumPanel() {
  const panel = document.querySelector('.betterbudgyt-sum-panel');
  if (!panel) return;

  const tbody = panel.querySelector('tbody');
  tbody.innerHTML = '';

  let total = 0;

  selectedCells.forEach((data, cell) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${data.description}</td>
      <td>${formatNumber(data.value)}</td>
    `;
    tbody.appendChild(row);
    total += data.value;
  });

  panel.querySelector('#sumTotal').textContent = formatNumber(total);
}

// Find parent category row by traversing up the DOM
function findParentCategory(row) {
  // Get current row's level
  const currentLevel = parseInt(row.getAttribute('data-level') || '0');
  
  // If this is already a top-level row, return it
  if (currentLevel <= 3) {
    return row;
  }
  
  // Look for parent rows with level 3 (category level)
  let currentRow = row;
  while (currentRow) {
    // Move to previous sibling
    currentRow = currentRow.previousElementSibling;
    
    // Check if this is a level 3 row
    if (currentRow && parseInt(currentRow.getAttribute('data-level') || '0') === 3) {
      return currentRow;
    }
  }
  
  // If no parent found, return null
  return null;
}

// Extract cell parameters for AJAX requests
function extractCellParameters(cell) {
  console.log('Extracting cell parameters from:', cell);
  
  // Track scenario metadata derived from data-href (if present)
  let extractedScenarioId = null;
  let extractedYear = null;
  
  // Get the row containing the cell
  const row = cell.closest('tr');
  if (!row) {
    console.error('No parent row found for cell');
    return null;
  }
  
  // Get category UID from row
  let categoryUID = row.getAttribute('data-val');
  
  // Find parent category by traversing up to level 3
  const parentRow = findParentCategory(row);
  let parentCategoryUID = parentRow ? parentRow.getAttribute('data-val') : null;
  
  // Get the cell's data-href attribute if it has a link
  const link = cell.querySelector('a.linkToDataPage');
  let dataHref = link ? link.getAttribute('data-href') : null;
  
  // If no linkToDataPage found, try looking for any link with data-href
  if (!dataHref) {
    const anyLink = cell.querySelector('a[data-href]');
    dataHref = anyLink ? anyLink.getAttribute('data-href') : null;
    
    if (dataHref) {
      console.log('Found data-href from generic link:', dataHref);
    }
  }
  
  // If we have a data-href, try to extract parameters from it
  if (dataHref) {
    console.log('Found data-href:', dataHref);
    
    // Extract scenario ID from the data-href URL path
    // Format is typically: /Budget/DataInput/86/2026 or similar
    const pathMatch = dataHref.match(/\/Budget\/DataInput\/(\d+)\/(\d+)/);
    if (pathMatch && pathMatch.length >= 3) {
      extractedScenarioId = pathMatch[1];
      extractedYear = pathMatch[2];
      console.log(`Extracted scenario ID: ${extractedScenarioId}, year: ${extractedYear} from data-href`);
    }
    
    try {
      // Extract parameters from the URL
      const hrefParts = dataHref.split('?');
      if (hrefParts.length > 1) {
        const hrefParams = new URLSearchParams(hrefParts[1]);
        const hrefCategoryUID = hrefParams.get('CategoryUID');
        const hrefGroupedCategory = hrefParams.get('groupedcategory');
        
        if (hrefCategoryUID) {
          categoryUID = hrefCategoryUID;
          console.log('Extracted CategoryUID from data-href:', categoryUID);
        }
        
        if (hrefGroupedCategory) {
          console.log('Extracted groupedcategory from data-href:', hrefGroupedCategory);
          
          // If we have a complete groupedcategory, return it directly
          const groupedParts = hrefGroupedCategory.split('|');
          if (groupedParts.length === 2) {
            parentCategoryUID = groupedParts[0];
            categoryUID = groupedParts[1];
            
            console.log('Extracted complete parameters from data-href:', {
              parentCategoryUID,
              categoryUID,
              groupedcategory: hrefGroupedCategory
            });
            
            // Determine column type
            const columnType = getColumnType(cell);
            
            // Use extracted scenario ID if available, otherwise get from column type
            const scenarioId = extractedScenarioId || getScenarioId(columnType);
            
            return {
              categoryUID,
              groupedcategory: hrefGroupedCategory,
              scenarioId,
              columnType,
              dataHref,
              year: extractedYear
            };
          }
        }
      } else if (extractedScenarioId) {
        // If we have a scenario ID from the path but no query parameters
        // Determine column type
        const columnType = getColumnType(cell);
        
        return {
          categoryUID,
          groupedcategory: parentCategoryUID && categoryUID ? `${parentCategoryUID}|${categoryUID}` : null,
          scenarioId: extractedScenarioId,
          columnType,
          dataHref,
          year: extractedYear
        };
      }
    } catch (error) {
      console.error('Error parsing data-href:', error);
    }
  }
  
  // If categoryUID still not found, try to get from cell or its parent elements
  if (!categoryUID) {
    console.warn('No data-val attribute found on row, trying to find it in cell');
    const cellWithData = cell.closest('[data-val]');
    if (cellWithData) {
      categoryUID = cellWithData.getAttribute('data-val');
    }
  }
  
  // If parent category not found, try to extract from URL or use default
  if (!parentCategoryUID) {
    // Try to extract from URL
    const urlMatch = window.location.href.match(/\/Budget\/DataInput\/\d+\/\d+\/(\d+)/);
    if (urlMatch && urlMatch[1]) {
      parentCategoryUID = urlMatch[1];
    } else {
      // Default to SGA CONSULTANTS if not found
      parentCategoryUID = '430';
    }
  }
  
  // If categoryUID still not found, use default
  if (!categoryUID) {
    categoryUID = '4022'; // Default to ARIZONA if not found
  }
  
  // Determine column type
  const columnType = getColumnType(cell);
  
  // Prefer scenario ID/year derived from data-href path; otherwise fall back by column type
  const scenarioId = extractedScenarioId || getScenarioId(columnType);
  const year = extractedYear || null;
  
  // Create groupedcategory
  const groupedcategory = `${parentCategoryUID}|${categoryUID}`;
  
  const result = {
    categoryUID,
    groupedcategory,
    scenarioId,
    columnType,
    dataHref,
    year
  };
  
  console.log('Extracted cell parameters:', result);
  return result;
}

// Get scenario ID based on column type
function getScenarioId(columnType) {
  switch (columnType) {
    case 'Actuals':
      return '86';
    case 'Budget':
      return '89';
    case 'Previous Year':
      return '86'; // Assuming previous year uses same scenario ID as actuals
    default:
      return '86'; // Default to actuals
  }
}

// Check if a cell has a datasheet link
function hasDatasheetLink(cell) {
  return cell.querySelector('a.linkToDataPage') !== null;
}

// Get datasheet URL from cell
function getDatasheetUrl(cell) {
  const link = cell.querySelector('a.linkToDataPage');
  return link ? link.getAttribute('data-href') : null;
}

// Get column type from cell
function getColumnType(cell) {
  if (cell.classList.contains('actual-budgetVal')) return 'Actuals';
  if (cell.classList.contains('compare-budgetVal')) return 'Budget';
  if (cell.classList.contains('actual-budgetLYVal')) return 'Previous Year';
  return 'Unknown';
}

// Handle comparison mode cell selection
function handleComparisonModeClick(cell) {
  // Only allow selection of cells with datasheet links
  if (!hasDatasheetLink(cell)) {
    return;
  }

  // Remove orange highlighting if present
  cell.classList.remove('betterbudgyt-cell-selected');

  // Check if cell is already selected
  if (comparisonSelectedCells.has(cell)) {
    // Remove from selection
    comparisonSelectedCells.delete(cell);
    comparisonSelectionOrder = comparisonSelectionOrder.filter(c => c !== cell);
    cell.classList.remove('betterbudgyt-compare-cell-1', 'betterbudgyt-compare-cell-2');
  } else {
    // Add to selection
    if (comparisonSelectionOrder.length >= 2) {
      // Remove oldest selection
      const oldestCell = comparisonSelectionOrder.shift();
      comparisonSelectedCells.delete(oldestCell);
      oldestCell.classList.remove('betterbudgyt-compare-cell-1', 'betterbudgyt-compare-cell-2');
    }

    // Add new selection
    comparisonSelectionOrder.push(cell);
    const selectionIndex = comparisonSelectionOrder.length;
    
    // Get cell data
    const row = cell.closest('tr');
    const descriptionCell = row.querySelector('td[style*="z-index: 1"]');
    const description = descriptionCell ? descriptionCell.textContent.trim() : 'Unknown';
    const value = parseFloat(cell.textContent.replace(/[^0-9.-]+/g, '')) || 0;
    const url = getDatasheetUrl(cell);
    const columnType = getColumnType(cell);

    comparisonSelectedCells.set(cell, {
      description,
      value,
      url,
      columnType,
      selectionIndex
    });

    // Apply highlighting
    cell.classList.add(`betterbudgyt-compare-cell-${selectionIndex}`);
  }

  // Update compare button
  updateCompareButton();
}

// Create compare button
function createCompareButton() {
  if (!comparisonModeEnabled) return;

  const button = document.createElement('div');
  button.className = 'betterbudgyt-compare-button';
  
  button.innerHTML = `
    <div class="betterbudgyt-compare-button-header">
      <div class="betterbudgyt-compare-button-title">Compare Datasheets</div>
    </div>
    <div class="betterbudgyt-compare-selections">
      <div class="betterbudgyt-compare-selection betterbudgyt-compare-selection-1">
        <div class="betterbudgyt-compare-selection-indicator"></div>
        <div class="betterbudgyt-compare-selection-text" id="selection-1-text">Select first cell...</div>
      </div>
      <div class="betterbudgyt-compare-selection betterbudgyt-compare-selection-2">
        <div class="betterbudgyt-compare-selection-indicator"></div>
        <div class="betterbudgyt-compare-selection-text" id="selection-2-text">Select second cell...</div>
      </div>
    </div>
    <div class="betterbudgyt-compare-actions">
      <button class="betterbudgyt-compare-btn betterbudgyt-compare-btn-secondary" id="clearCompare">Clear</button>
      <button class="betterbudgyt-compare-btn betterbudgyt-compare-btn-primary" id="compareDatasheets" disabled>Compare</button>
    </div>
  `;

  // Add button to document
  document.body.appendChild(button);

  // Add event listeners
  button.querySelector('#clearCompare').addEventListener('click', () => {
    clearComparisonSelections();
  });

  button.querySelector('#compareDatasheets').addEventListener('click', () => {
    performComparison();
  });

  return button;
}

// Update compare button content
function updateCompareButton() {
  let button = document.querySelector('.betterbudgyt-compare-button');
  
  if (comparisonSelectionOrder.length === 0) {
    // Remove button if no selections
    if (button) {
      button.remove();
    }
    return;
  }

  // Create button if it doesn't exist
  if (!button) {
    button = createCompareButton();
  }

  // Update selection texts
  const selection1Text = button.querySelector('#selection-1-text');
  const selection2Text = button.querySelector('#selection-2-text');
  const compareBtn = button.querySelector('#compareDatasheets');

  if (comparisonSelectionOrder.length >= 1) {
    const cell1Data = comparisonSelectedCells.get(comparisonSelectionOrder[0]);
    selection1Text.textContent = `${cell1Data.description} - ${cell1Data.columnType}`;
  } else {
    selection1Text.textContent = 'Select first cell...';
  }

  if (comparisonSelectionOrder.length >= 2) {
    const cell2Data = comparisonSelectedCells.get(comparisonSelectionOrder[1]);
    selection2Text.textContent = `${cell2Data.description} - ${cell2Data.columnType}`;
    compareBtn.disabled = false;
  } else {
    selection2Text.textContent = 'Select second cell...';
    compareBtn.disabled = true;
  }
}

// Clear comparison selections
function clearComparisonSelections() {
  comparisonSelectedCells.clear();
  comparisonSelectionOrder = [];
  
  // Remove highlighting
  const comparisonCells = document.querySelectorAll('.betterbudgyt-compare-cell-1, .betterbudgyt-compare-cell-2');
  comparisonCells.forEach(cell => {
    cell.classList.remove('betterbudgyt-compare-cell-1', 'betterbudgyt-compare-cell-2');
  });

  // Update button
  updateCompareButton();
}

// Perform comparison using AJAX
function performComparison() {
  console.log('Performing comparison with:', comparisonSelectedCells);
  
  if (comparisonSelectionOrder.length < 2) {
    alert('Please select two cells to compare.');
    return;
  }
  
  // Get data from selected cells
  const cell1 = comparisonSelectionOrder[0];
  const cell2 = comparisonSelectionOrder[1];
  const cell1Data = comparisonSelectedCells.get(cell1);
  const cell2Data = comparisonSelectedCells.get(cell2);
  
  // Add cell references to the data objects
  cell1Data.cell = cell1;
  cell2Data.cell = cell2;
  
  // Show loading indicator
  showComparisonLoadingIndicator();
  
  // Start AJAX-based data fetching
  openDatasheetSequentially(cell1Data, cell2Data)
    .then(comparisonData => {
      hideComparisonLoadingIndicator();
      showComparisonModal(comparisonData);
      console.log('Comparison completed successfully');
    })
    .catch(error => {
      hideComparisonLoadingIndicator();
      console.error('Comparison error:', error);
      const msg = error?.message || 'Unknown error';
      if (msg.includes('Extension context invalidated')) {
        alert('Comparison failed because Chrome discarded the extension context (usually after a tab reload). Please reload the Budgyt page and try again.');
      } else {
        alert('Error comparing datasheets: ' + msg);
      }
    });
}

// ===== ROW HOVER COMPARE BUTTON FEATURE =====

// Check if Scenario 3 is set to "Do Not Show"
function isScenario3Hidden() {
  // Check the Scn 3 dropdown (budgetToCompareD3)
  const scn3Select = document.querySelector('select[name="budgetToCompareD3"]');
  if (scn3Select) {
    // Value of -2 means "Do Not Show"
    if (scn3Select.value === '-2') return true;
  }
  
  // Also check the Select2 display text as backup
  const scn3Display = document.querySelector('.comparisionBudget2Year .select2-chosen');
  if (scn3Display && scn3Display.textContent.trim() === 'Do Not Show') {
    return true;
  }
  
  return false;
}

// Get available comparison columns from a row
function getAvailableColumns(row) {
  const columns = [];
  const scn3Hidden = isScenario3Hidden();
  
  // Check for Actuals column (Scn 1)
  const actualsCell = row.querySelector('td.actual-budgetVal');
  if (actualsCell && hasDatasheetLink(actualsCell)) {
    columns.push({
      type: 'actual-budgetVal',
      name: actualsCell.getAttribute('title') || 'Actuals',
      cell: actualsCell
    });
  }
  
  // Check for Budget column (Scn 2 - compare-budgetVal)
  const budgetCell = row.querySelector('td.compare-budgetVal');
  if (budgetCell && hasDatasheetLink(budgetCell)) {
    columns.push({
      type: 'compare-budgetVal',
      name: budgetCell.getAttribute('title') || 'Budget',
      cell: budgetCell
    });
  }
  
  // Check for Third column (Scn 3 - actual-budgetLYVal) - only if not hidden
  if (!scn3Hidden) {
    const lyCell = row.querySelector('td.actual-budgetLYVal');
    if (lyCell && hasDatasheetLink(lyCell)) {
      columns.push({
        type: 'actual-budgetLYVal',
        name: lyCell.getAttribute('title') || 'Previous Year',
        cell: lyCell
      });
    }
  }
  
  return columns;
}

// Show column selector modal
function showColumnSelectorModal(row) {
  const columns = getAvailableColumns(row);
  
  if (columns.length < 2) {
    alert('This row needs at least 2 comparable columns to perform a comparison.');
    return;
  }
  
  // Get row description
  const descriptionCell = row.querySelector('td .label a, td .label span');
  const description = descriptionCell ? descriptionCell.textContent.trim() : 'Unknown Account';
  
  // Remove existing modal if any
  const existingModal = document.querySelector('.betterbudgyt-column-selector-modal');
  if (existingModal) existingModal.remove();
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'betterbudgyt-column-selector-modal';
  
  modal.innerHTML = `
    <div class="betterbudgyt-column-selector-content">
      <div class="betterbudgyt-column-selector-header">
        <h3>Compare Datasheets</h3>
        <button class="betterbudgyt-column-selector-close">&times;</button>
      </div>
      <div class="betterbudgyt-column-selector-body">
        <div class="betterbudgyt-column-selector-account">
          <span class="betterbudgyt-column-selector-label">Account:</span>
          <span class="betterbudgyt-column-selector-value">${description}</span>
        </div>
        <div class="betterbudgyt-column-selector-instruction">
          Select two columns to compare:
        </div>
        <div class="betterbudgyt-column-checkboxes">
          ${columns.map((col, index) => `
            <label class="betterbudgyt-column-checkbox">
              <input type="checkbox" name="column" value="${index}" data-column-type="${col.type}">
              <span class="betterbudgyt-column-checkbox-indicator"></span>
              <span class="betterbudgyt-column-checkbox-label">${col.name}</span>
            </label>
          `).join('')}
        </div>
      </div>
      <div class="betterbudgyt-column-selector-footer">
        <button class="betterbudgyt-column-selector-btn betterbudgyt-column-selector-btn-cancel">Cancel</button>
        <button class="betterbudgyt-column-selector-btn betterbudgyt-column-selector-btn-compare" disabled>Compare</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Get elements
  const checkboxes = modal.querySelectorAll('input[name="column"]');
  const compareBtn = modal.querySelector('.betterbudgyt-column-selector-btn-compare');
  const cancelBtn = modal.querySelector('.betterbudgyt-column-selector-btn-cancel');
  const closeBtn = modal.querySelector('.betterbudgyt-column-selector-close');
  
  // Handle checkbox changes - only allow 2 selections
  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = modal.querySelectorAll('input[name="column"]:checked');
      
      // If more than 2 selected, uncheck the oldest one
      if (checked.length > 2) {
        checkboxes.forEach(c => {
          if (c !== cb && c.checked) {
            c.checked = false;
            return;
          }
        });
      }
      
      // Enable/disable compare button
      const currentChecked = modal.querySelectorAll('input[name="column"]:checked');
      compareBtn.disabled = currentChecked.length !== 2;
    });
  });
  
  // Handle compare button click
  compareBtn.addEventListener('click', () => {
    const checked = Array.from(modal.querySelectorAll('input[name="column"]:checked'));
    if (checked.length !== 2) return;
    
    const col1Index = parseInt(checked[0].value);
    const col2Index = parseInt(checked[1].value);
    
    modal.remove();
    performRowComparison(row, columns[col1Index], columns[col2Index]);
  });
  
  // Handle cancel/close
  const closeModal = () => modal.remove();
  cancelBtn.addEventListener('click', closeModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  // Handle escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

// Perform comparison from row with selected columns
function performRowComparison(row, column1, column2) {
  // Get row description
  const descriptionCell = row.querySelector('td .label a, td .label span');
  const description = descriptionCell ? descriptionCell.textContent.trim() : 'Unknown Account';
  
  // Build cell data objects similar to the existing flow
  const cell1Data = {
    description: description,
    value: parseFloat(column1.cell.textContent.replace(/[^0-9.-]+/g, '')) || 0,
    url: getDatasheetUrl(column1.cell),
    columnType: column1.name,
    cell: column1.cell
  };
  
  const cell2Data = {
    description: description,
    value: parseFloat(column2.cell.textContent.replace(/[^0-9.-]+/g, '')) || 0,
    url: getDatasheetUrl(column2.cell),
    columnType: column2.name,
    cell: column2.cell
  };
  
  console.log('Row comparison - Cell 1:', cell1Data);
  console.log('Row comparison - Cell 2:', cell2Data);
  
  // Show loading indicator
  showComparisonLoadingIndicator();
  
  // Start AJAX-based data fetching (reuse existing function)
  openDatasheetSequentially(cell1Data, cell2Data)
    .then(comparisonData => {
      // Add account name to comparison data for display in modal header
      comparisonData.accountName = description;
      hideComparisonLoadingIndicator();
      showComparisonModal(comparisonData);
      console.log('Row comparison completed successfully');
    })
    .catch(error => {
      hideComparisonLoadingIndicator();
      console.error('Row comparison error:', error);
      const msg = error?.message || 'Unknown error';
      if (msg.includes('Extension context invalidated')) {
        alert('Comparison failed because Chrome discarded the extension context. Please reload the page and try again.');
      } else {
        alert('Error comparing datasheets: ' + msg);
      }
    });
}

// Inject compare button into a level 4 row
function injectRowCompareButton(row) {
  // Skip if already has a compare button
  if (row.querySelector('.betterbudgyt-row-compare-btn')) return;
  
  // Check if row has at least 2 comparable columns
  const columns = getAvailableColumns(row);
  if (columns.length < 2) return;
  
  // Find the description cell (first td with the label)
  const descriptionCell = row.querySelector('td[style*="z-index: 1"]');
  if (!descriptionCell) return;
  
  // Find the row-icons div or the label div to append to
  let targetContainer = descriptionCell.querySelector('.row-icons');
  if (!targetContainer) {
    targetContainer = descriptionCell.querySelector('.label');
  }
  if (!targetContainer) return;
  
  // Create compare button
  const compareBtn = document.createElement('a');
  compareBtn.href = 'javascript:void(0)';
  compareBtn.className = 'betterbudgyt-row-compare-btn';
  compareBtn.title = 'Compare datasheets';
  compareBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="8" height="18" rx="1"></rect>
      <rect x="13" y="3" width="8" height="18" rx="1"></rect>
      <path d="M7 12h2"></path>
      <path d="M15 12h2"></path>
    </svg>
  `;
  
  // Add click handler
  compareBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check how many columns are available
    const columns = getAvailableColumns(row);
    
    if (columns.length === 2) {
      // Only 2 columns available - skip modal and compare directly
      performRowComparison(row, columns[0], columns[1]);
    } else if (columns.length > 2) {
      // More than 2 columns - show selector modal
      showColumnSelectorModal(row);
    } else {
      // Less than 2 columns - shouldn't happen since button wouldn't be injected
      alert('This row needs at least 2 comparable columns.');
    }
  });
  
  // Insert button
  if (targetContainer.classList.contains('row-icons')) {
    targetContainer.insertBefore(compareBtn, targetContainer.firstChild);
  } else {
    // Create row-icons container if it doesn't exist
    const rowIcons = document.createElement('div');
    rowIcons.className = 'row-icons';
    rowIcons.appendChild(compareBtn);
    targetContainer.appendChild(rowIcons);
  }
}

// Setup observer to inject compare buttons into level 4 rows
function setupRowCompareButtons() {
  // Initial injection for existing rows
  const level4Rows = document.querySelectorAll('tr.data-row[data-level="4"]');
  level4Rows.forEach(row => injectRowCompareButton(row));
  
  // Observer for dynamically added rows
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if the added node is a level 4 row
          if (node.matches && node.matches('tr.data-row[data-level="4"]')) {
            injectRowCompareButton(node);
          }
          // Also check children
          const childRows = node.querySelectorAll ? node.querySelectorAll('tr.data-row[data-level="4"]') : [];
          childRows.forEach(row => injectRowCompareButton(row));
        }
      });
    });
  });
  
  // Observe the entire document for new rows
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('Row compare buttons setup complete');
}

// Initialize row compare buttons when on comparison page
function initRowCompareButtons() {
  // Check if we're on a P&L or comparison page
  const isPnLPage = window.location.href.includes('comp-ytd') || 
                    window.location.href.includes('comparison') ||
                    document.querySelector('table.table.table-striped');
  
  if (isPnLPage) {
    // Wait a bit for the table to load
    setTimeout(() => {
      setupRowCompareButtons();
    }, 1000);
  }
}

// Call init on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRowCompareButtons);
} else {
  initRowCompareButtons();
}

// ===== END ROW HOVER COMPARE BUTTON FEATURE =====

// Show loading indicator
function showComparisonLoadingIndicator() {
  // Remove any existing loading indicator
  hideComparisonLoadingIndicator();
  
  // Create loading indicator
  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'betterbudgyt-loading-indicator';
  loadingIndicator.innerHTML = `
    <div class="betterbudgyt-loading-spinner"></div>
    <div class="betterbudgyt-loading-text">Loading comparison data...</div>
  `;
  
  // Add to document
  document.body.appendChild(loadingIndicator);
}

// Hide loading indicator
function hideComparisonLoadingIndicator() {
  const loadingIndicator = document.querySelector('.betterbudgyt-loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.remove();
  }
}

// Wait for datasheet table to be fully loaded
function waitForDatasheetTable(doc, callback, maxAttempts = 40) { // Longer timeout for iframes
  let attempts = 0;
  
  function checkDatasheetTable() {
    const table = doc.querySelector('table');
    const transactionRows = doc.querySelectorAll('tr[data-level="3"].budgetdata.bottomLevel');
    const totalRow = doc.querySelector('tr[data-level="3"].totals');
    const titleRow = doc.querySelector('tr[data-level="2"].showyear.level2');
    const dataCells = doc.querySelectorAll('td.data[data-period], td.data[title]');
    
    console.log('Checking datasheet table elements:', {
      attempt: attempts + 1,
      tablePresent: !!table,
      transactionRowsCount: transactionRows.length,
      totalRowPresent: !!totalRow,
      titleRowPresent: !!titleRow,
      dataCellsCount: dataCells.length
    });
    
    if (table && transactionRows.length > 0 && totalRow && titleRow && dataCells.length > 0) {
      // All required elements are loaded
      console.log('Datasheet table fully loaded with all required elements');
      callback();
    } else if (attempts < maxAttempts) {
      attempts++;
      setTimeout(checkDatasheetTable, 500);
    } else {
      throw new Error('Timeout waiting for datasheet table elements to load');
    }
  }
  
  checkDatasheetTable();
}

// Build AJAX parameters for datasheet request
function buildAjaxParameters(categoryUID, groupedcategory) {
  // Get timezone offset in minutes
  const localOffset = new Date().getTimezoneOffset();
  
  return {
    level: '2', // For transaction-level data
    StoreUID: '-1', // This will be replaced with the correct StoreUID from fetchStoreUIDForDepartment
    DeptUID: '3',
    CategoryUID: categoryUID,
    groupedcategory: groupedcategory,
    CompNonCompfilter: '',
    Stores: '567,568,569,570,571,572,573,574,575,576,577,578,579,582,580',
    viewLevel: 'CATEGORY',
    vendoridCSV: '-2',
    showInGlobal: true,
    bsMode: '',
    categoryType: 'PL',
    localoffset: localOffset.toString()
  };
}

// Open response in new tab for debugging
function openResponseInNewTab(html) {
  const newTab = window.open();
  newTab.document.write(html);
  newTab.document.close();
}

// Parse JSON response if the server returns JSON instead of HTML
function parseJsonResponse(jsonData, accountName, dataType) {
  try {
    console.log('Parsing JSON response:', jsonData);
    
    // Create result object
    const result = {
      accountName,
      dataType,
      transactions: [],
      totals: {}
    };
    
    // Different possible JSON structures
    
    // Structure 1: Array of rows with data
    if (Array.isArray(jsonData)) {
      console.log('JSON is an array, processing as row array');
      
      // Find transaction rows (level 3 and bottomLevel)
      const transactionRows = jsonData.filter(row => 
        row.level === 3 && row.isBottomLevel === true
      );
      
      // Process transaction rows
      transactionRows.forEach(row => {
        const transaction = {
          description: row.description || row.Description || 'Unknown',
          vendor: row.vendor || row.Vendor || '',
          monthly: {},
          total: 0
        };
        
        // Extract monthly values
        const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
        months.forEach((month, index) => {
          // Try different possible period keys
          const periodNum = index + 1;
          const possibleKeys = [
            `P${periodNum}`,
            `p${periodNum}`,
            `Period${periodNum}`,
            month,
            month.toLowerCase()
          ];
          
          let value = 0;
          for (const key of possibleKeys) {
            if (row[key] !== undefined) {
              value = parseFloat(row[key]) || 0;
              break;
            }
          }
          
          transaction.monthly[month] = value;
        });
        
        // Extract total
        transaction.total = parseFloat(row.total || row.Total || 0) || 0;
        
        result.transactions.push(transaction);
      });
      
      // Find total row
      const totalRow = jsonData.find(row => 
        (row.isTotal === true) || (row.level === 3 && row.description === 'TOTAL')
      );
      
      if (totalRow) {
        const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
        months.forEach((month, index) => {
          // Try different possible period keys
          const periodNum = index + 1;
          const possibleKeys = [
            `P${periodNum}`,
            `p${periodNum}`,
            `Period${periodNum}`,
            month,
            month.toLowerCase()
          ];
          
          let value = 0;
          for (const key of possibleKeys) {
            if (totalRow[key] !== undefined) {
              value = parseFloat(totalRow[key]) || 0;
              break;
            }
          }
          
          result.totals[month] = value;
        });
        
        result.totals.total = parseFloat(totalRow.total || totalRow.Total || 0) || 0;
      }
    }
    // Structure 2: Object with rows property
    else if (jsonData.rows && Array.isArray(jsonData.rows)) {
      console.log('JSON has rows property, processing rows');
      
      // Process each row
      jsonData.rows.forEach(row => {
        // Skip non-transaction rows
        if (row.level !== 3 || !row.isBottomLevel) return;
        
        const transaction = {
          description: row.description || row.Description || 'Unknown',
          vendor: row.vendor || row.Vendor || '',
          monthly: {},
          total: 0
        };
        
        // Extract monthly values
        const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
        months.forEach((month, index) => {
          const periodNum = index + 1;
          const possibleKeys = [
            `P${periodNum}`,
            `p${periodNum}`,
            `Period${periodNum}`,
            month,
            month.toLowerCase()
          ];
          
          let value = 0;
          for (const key of possibleKeys) {
            if (row[key] !== undefined) {
              value = parseFloat(row[key]) || 0;
              break;
            }
          }
          
          transaction.monthly[month] = value;
        });
        
        // Extract total
        transaction.total = parseFloat(row.total || row.Total || 0) || 0;
        
        result.transactions.push(transaction);
      });
      
      // Extract totals if available
      const totalRow = jsonData.rows.find(row => 
        (row.isTotal === true) || (row.level === 3 && row.description === 'TOTAL')
      );
      
      if (totalRow) {
        const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
        months.forEach((month, index) => {
          const periodNum = index + 1;
          const possibleKeys = [
            `P${periodNum}`,
            `p${periodNum}`,
            `Period${periodNum}`,
            month,
            month.toLowerCase()
          ];
          
          let value = 0;
          for (const key of possibleKeys) {
            if (totalRow[key] !== undefined) {
              value = parseFloat(totalRow[key]) || 0;
              break;
            }
          }
          
          result.totals[month] = value;
        });
        
        result.totals.total = parseFloat(totalRow.total || totalRow.Total || 0) || 0;
      }
    }
    // Structure 3: Object with data property
    else if (jsonData.data) {
      console.log('JSON has data property, processing data');
      
      // Try to process data property (could be array or object)
      if (Array.isArray(jsonData.data)) {
        // Process as array
        jsonData.data.forEach(item => {
          if (item.description || item.Description) {
            const transaction = {
              description: item.description || item.Description || 'Unknown',
              vendor: item.vendor || item.Vendor || '',
              monthly: {},
              total: 0
            };
            
            // Extract monthly values
            const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
            months.forEach((month, index) => {
              const periodNum = index + 1;
              const possibleKeys = [
                `P${periodNum}`,
                `p${periodNum}`,
                `Period${periodNum}`,
                month,
                month.toLowerCase()
              ];
              
              let value = 0;
              for (const key of possibleKeys) {
                if (item[key] !== undefined) {
                  value = parseFloat(item[key]) || 0;
                  break;
                }
              }
              
              transaction.monthly[month] = value;
            });
            
            // Extract total
            transaction.total = parseFloat(item.total || item.Total || 0) || 0;
            
            result.transactions.push(transaction);
          }
        });
      }
    }
    
    // If we still have no transactions, try to extract data from any structure
    if (result.transactions.length === 0) {
      console.log('No transactions found with standard parsing, attempting generic extraction');
      
      // Try to find any arrays in the JSON
      const findArrays = (obj, path = '') => {
        const arrays = [];
        
        if (Array.isArray(obj)) {
          arrays.push({ path, array: obj });
        } else if (obj && typeof obj === 'object') {
          Object.keys(obj).forEach(key => {
            const newPath = path ? `${path}.${key}` : key;
            if (Array.isArray(obj[key])) {
              arrays.push({ path: newPath, array: obj[key] });
            } else if (obj[key] && typeof obj[key] === 'object') {
              arrays.push(...findArrays(obj[key], newPath));
            }
          });
        }
        
        return arrays;
      };
      
      const arrays = findArrays(jsonData);
      console.log('Found arrays in JSON:', arrays);
      
      // Try each array to see if it contains transaction-like data
      for (const { path, array } of arrays) {
        if (array.length > 0 && array.some(item => 
          (item.description || item.Description) && 
          (item.total || item.Total || Object.keys(item).some(key => key.match(/^[pP]?\d+$/)))
        )) {
          console.log(`Found potential transaction data in array at path: ${path}`);
          
          array.forEach(item => {
            const transaction = {
              description: item.description || item.Description || 'Unknown',
              vendor: item.vendor || item.Vendor || '',
              monthly: {},
              total: 0
            };
            
            // Extract monthly values
            const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
            months.forEach((month, index) => {
              const periodNum = index + 1;
              const possibleKeys = [
                `P${periodNum}`,
                `p${periodNum}`,
                `Period${periodNum}`,
                month,
                month.toLowerCase()
              ];
              
              let value = 0;
              for (const key of possibleKeys) {
                if (item[key] !== undefined) {
                  value = parseFloat(item[key]) || 0;
                  break;
                }
              }
              
              transaction.monthly[month] = value;
            });
            
            // Extract total
            transaction.total = parseFloat(item.total || item.Total || 0) || 0;
            
            result.transactions.push(transaction);
          });
          
          // If we found transactions, break out of the loop
          if (result.transactions.length > 0) {
            break;
          }
        }
      }
    }
    
    console.log('Parsed JSON data:', result);
    return result;
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    throw new Error(`Failed to parse JSON response: ${error.message}`);
  }
}

// Prime the budget session with a GET request to set the correct BudgetId in session
async function primeBudgetSession(dataHref) {
  if (!dataHref) return;  // safety check
  
  console.log(`Priming budget session with GET request to: ${dataHref}`);
  
  try {
    const response = await fetch(dataHref, {
      method: 'GET',
      credentials: 'include'  // send ASP.NET_SessionId
    });
    
    console.log(`Prime session response status: ${response.status}`);
    
    // give IIS/Redis a beat to commit the session
    await new Promise(r => setTimeout(r, 250));
    
    return true;
  } catch (error) {
    console.error('Error priming budget session:', error);
    throw new Error(`Failed to prime budget session: ${error.message}`);
  }
}

// Initialize budget session context before fetching data
async function fetchPercentApprovedValues(groupedcategory, dataHref, storeCsv) {
  try {
    console.log(`Initializing budget session with FetchPercentApprovedValues for ${groupedcategory}`);
    
    // Construct the full Referer URL
    const baseUrl = window.location.origin; // e.g., https://theesa.budgyt.com
    const refererUrl = dataHref ? `${baseUrl}${dataHref}` : null;
    
    // Headers for the request
    const headers = {
      'Content-Type': 'application/json; charset=UTF-8',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest'
    };
    
    // Add Referer header if we have a data-href
    if (refererUrl) {
      headers['Referer'] = refererUrl;
    }
    
    console.log('Using data-href for Referer:', dataHref);
    
    // Payload for FetchPercentApprovedValues
    const payload = {
      StoreUIDCSV: storeCsv || '567,568,569,570,571,572,573,574,575,576,577,578,579,582,580',
      groupedcategory: groupedcategory
    };
    
    console.log('FetchPercentApprovedValues request:', {
      url: '/Budget/FetchPercentApprovedValues',
      headers: headers,
      payload: payload
    });
    
    // Make POST request to FetchPercentApprovedValues endpoint
    const response = await fetch('/Budget/FetchPercentApprovedValues', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error initializing budget session! Status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('FetchPercentApprovedValues response:', result);
    
    return true;
  } catch (error) {
    console.error('Error initializing budget session:', error);
    throw new Error(`Failed to initialize budget session: ${error.message}`);
  }
}

// Fetch Level 0 data to extract the correct StoreUIDs for all departments
async function fetchStoreUIDForDepartment(parameters, accountName, dataHref) {
  try {
    console.log(`Fetching StoreUIDs for ${accountName} with groupedcategory: ${parameters.groupedcategory}`);
    
    // Pre-populate store name cache from page DOM or API
    await fetchStoreNamesFromPage();
    
    // Create Level 0 parameters to get department/StoreUID mapping
    const level0Params = {
      level: '0',
      StoreUID: '-1',
      DeptUID: '-1',
      CategoryUID: '-1',
      groupedcategory: parameters.groupedcategory,
      CompNonCompfilter: '',
      Stores: parameters.Stores || '567,568,569,570,571,572,573,574,575,576,577,578,579,582,580',
      viewLevel: 'STORE',
      vendorIdCSV: '-2',
      showInGlobal: true,
      bsMode: '',
      categoryType: 'PL',
      localoffset: new Date().getTimezoneOffset().toString()
    };
    
    console.log('Level 0 request parameters:', JSON.stringify(level0Params, null, 2));
    
    // Construct the full Referer URL
    const baseUrl = window.location.origin;
    const refererUrl = dataHref ? `${baseUrl}${dataHref}` : null;
    
    // Headers for the request
    const headers = {
      'Content-Type': 'application/json; charset=UTF-8',
      'Accept': 'text/html, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest'
    };
    
    // Add Referer header if we have a data-href
    if (refererUrl) {
      headers['Referer'] = refererUrl;
    }
    
    console.log('Level 0 request headers:', JSON.stringify(headers, null, 2));
    
    // Make POST request to GetRowData endpoint for Level 0
    const response = await fetch('/Budget/GetRowData', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(level0Params)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error fetching StoreUIDs! Status: ${response.status}`);
    }
    
    // Get response text
    const responseText = await response.text();
    
    // Log the first part of the response for debugging
    console.log('Level 0 response (first 200 chars):', responseText.substring(0, 200) + '...');
    
    // Extract StoreUIDs from the response
    const level0StoreUIDs = extractStoreUIDFromLevel0(responseText, accountName);
    
    // Additional Level 1 request to capture names (rows with data-level="1")
    const level1Params = {
      ...level0Params,
      level: '1'
    };
    
    let level1StoreUIDs = [];
    try {
      const level1Response = await fetch('/Budget/GetRowData', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(level1Params)
      });
      const level1Text = await level1Response.text();
      console.log('Level 1 response (first 200 chars):', level1Text.substring(0, 200) + '...');
      level1StoreUIDs = extractStoreUIDFromLevel0(level1Text, `${accountName} (Level 1)`);
    } catch (err) {
      console.warn('Level 1 request for store names failed:', err);
    }
    
    // Merge Level0 and Level1 results, prefer names from Level1
    const merged = new Map();
    [...level0StoreUIDs, ...level1StoreUIDs].forEach(entry => {
      if (!merged.has(entry.storeUID)) {
        merged.set(entry.storeUID, entry);
      } else {
        const existing = merged.get(entry.storeUID);
        if ((!existing.departmentName || existing.departmentName.startsWith('Class ')) && entry.departmentName) {
          merged.set(entry.storeUID, { ...existing, departmentName: entry.departmentName });
        }
      }
    });
    
    // If no store UIDs were found in the HTML, extract them from the Stores parameter
    if (merged.size === 0 && level0Params.Stores) {
      console.log('No store UIDs found in HTML response, extracting from Stores parameter...');
      const storeIds = level0Params.Stores.split(',').filter(id => id && id !== '-1');
      storeIds.forEach(storeUID => {
        const cachedName = storeNameCache.get(storeUID);
        merged.set(storeUID, {
          storeUID,
          departmentName: cachedName || `Class ${storeUID}`,
          deptUID: '-1',
          source: cachedName ? 'Stores param + cache' : 'Stores param'
        });
      });
      console.log(`Extracted ${merged.size} store UIDs from Stores parameter`);
    }
    
    const departmentStoreUIDs = Array.from(merged.values());
    
    if (departmentStoreUIDs.length === 1 && departmentStoreUIDs[0].storeUID === '579' && departmentStoreUIDs[0].source === 'default fallback') {
      console.warn(`⚠️ Using default StoreUID '579' for ${accountName}. This may cause issues if this is not the correct StoreUID.`);
    } else {
      console.log(`✓ Successfully extracted ${departmentStoreUIDs.length} StoreUIDs for ${accountName}:`, 
        departmentStoreUIDs.map(d => `${d.storeUID} (${d.departmentName})`).join(', '));
    }
    
    return departmentStoreUIDs;
  } catch (error) {
    console.error('Error fetching StoreUIDs:', error);
    if (debugModeEnabled) {
      console.warn(`Could not find StoreUIDs for account ${accountName}, falling back to default 579`);
    }
    return [{
      storeUID: '579',
      departmentName: 'SGA',
      source: 'default fallback'
    }];
  }
}

// Extract all StoreUIDs from Level 0 response
function extractStoreUIDFromLevel0(htmlResponse, accountName) {
  console.log(`Extracting StoreUIDs from Level 0 response for ${accountName}`);
  
  if (debugModeEnabled) {
    logHtmlInChunks(htmlResponse, 'COMPLETE Level 0 HTML Response');
  }
  
  const parser = new DOMParser();
  // Wrap the HTML in a table element since the response contains raw <tr> elements
  // Without a table wrapper, DOMParser discards orphan <tr> elements
  const wrappedHtml = `<table>${htmlResponse}</table>`;
  const doc = parser.parseFromString(wrappedHtml, 'text/html');
  const uniqueStoreUIDs = new Map();
  
  // Helper to normalize a department/class name
  const normalizeName = (name) => (name || '').replace(/\s+/g, ' ').trim();
  
  // Walk rows that carry store info
  const candidateRows = Array.from(doc.querySelectorAll('tr'));
  console.log(`Found ${candidateRows.length} total TR rows in the Level 0 response`);
  
  let rowsWithStoreCell = 0;
  let rowsWithValidUID = 0;
  
  candidateRows.forEach((row, index) => {
    const storeCell = row.querySelector('td#hdnStoreUID');
    if (!storeCell) return;
    rowsWithStoreCell++;
    
    const storeUID = storeCell.textContent.trim();
    if (!storeUID || storeUID === '-1' || uniqueStoreUIDs.has(storeUID)) return;
    rowsWithValidUID++;
    
    console.log(`Row ${index}: Found valid storeUID=${storeUID}, data-level=${row.getAttribute('data-level')}`);
    
    // Department/Class label: prefer div.label, then first td's title attribute
    let departmentName = '';
    
    // First try div.label which contains the department name
    const labelDiv = row.querySelector('div.label');
    if (labelDiv) {
      departmentName = labelDiv.textContent;
    }
    
    // If not found, try the first td's title attribute (not the month cells)
    if (!departmentName) {
      const firstTd = row.querySelector('td:first-child');
      if (firstTd) {
        departmentName = firstTd.getAttribute('title') || firstTd.textContent;
      }
    }
    
    // Last resort: any td with a title that looks like a department name (contains numbers or letters, not month names)
    if (!departmentName) {
      const allTitleCells = row.querySelectorAll('td[title]');
      for (const cell of allTitleCells) {
        const title = cell.getAttribute('title');
        // Skip month names and common non-department titles
        if (title && !['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Total', '%LY', '%LLY'].includes(title)) {
          departmentName = title;
          break;
        }
      }
    }
    
    if (departmentName) {
      const textarea = document.createElement('textarea'); // quick HTML entity decode
      textarea.innerHTML = departmentName;
      departmentName = normalizeName(textarea.value || textarea.innerHTML || departmentName);
    }
    // If no name found, try the store name cache, else fall back to "Class {uid}"
    if (!departmentName) {
      departmentName = storeNameCache.get(storeUID) || `Class ${storeUID}`;
    }
    
    // DeptUID if present
    const deptCandidate = row.querySelector('[data-deptid]') || row.querySelector('[data-id]');
    const deptUID = deptCandidate ? (deptCandidate.getAttribute('data-deptid') || deptCandidate.getAttribute('data-id')) : null;
    
    // Extract monthly values from the Level 0 row (department totals)
    const monthly = {};
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    months.forEach((month, i) => {
      const periodNum = i + 1;
      // Try multiple selectors for month cells
      const monthCell = row.querySelector(`td[data-period="P${periodNum}"]`) || 
                        row.querySelector(`td[data-Period="P${periodNum}"]`) ||
                        row.querySelector(`td[title="${month}"].data`);
      if (monthCell) {
        const spanVal = monthCell.querySelector('span.showCol, span');
        const valText = spanVal ? spanVal.textContent.trim() : monthCell.textContent.trim();
        monthly[month] = parseFloat(valText.replace(/[^0-9.-]+/g, '')) || 0;
      } else {
        monthly[month] = 0;
      }
    });
    
    // Extract total
    const totalCell = row.querySelector('td[title="Total"].data, td.DATValueTotalF');
    let total = 0;
    if (totalCell) {
      const spanVal = totalCell.querySelector('span.showCol, span');
      const valText = spanVal ? spanVal.textContent.trim() : totalCell.textContent.trim();
      total = parseFloat(valText.replace(/[^0-9.-]+/g, '')) || 0;
    }
    
    console.log(`Row ${index}: Extracted departmentName="${departmentName}" for storeUID=${storeUID}, total=${total}`);
    
    uniqueStoreUIDs.set(storeUID, {
      storeUID,
      departmentName,
      deptUID: deptUID || '-1',
      monthly,
      total,
      source: 'hdnStoreUID row',
      rowIndex: index
    });
  });
  
  console.log(`Summary: ${candidateRows.length} total rows, ${rowsWithStoreCell} with hdnStoreUID cell, ${rowsWithValidUID} with valid UID`);
  console.log(`Extracted ${uniqueStoreUIDs.size} unique store UIDs from DOM parsing`);
  
  // Last resort: regex fallback if nothing parsed
  if (uniqueStoreUIDs.size === 0) {
    const regex = /id="hdnStoreUID">([0-9]+)<\/td>/g;
    let match;
    while ((match = regex.exec(htmlResponse)) !== null) {
      const uid = match[1];
      if (!uniqueStoreUIDs.has(uid)) {
        // Try to get name from cache, else fall back to "Class {uid}"
        const cachedName = storeNameCache.get(uid);
        uniqueStoreUIDs.set(uid, {
          storeUID: uid,
          departmentName: cachedName || `Class ${uid}`,
          deptUID: '-1',
          source: cachedName ? 'regex + cache' : 'regex fallback'
        });
      }
    }
  }
  
  const departmentStoreUIDs = Array.from(uniqueStoreUIDs.values());
  console.log(`Found ${departmentStoreUIDs.length} unique StoreUID/class pairs for ${accountName}:`, 
    departmentStoreUIDs.map(d => `${d.storeUID}:${d.departmentName}`).join('; '));
  
  if (departmentStoreUIDs.length > 0) return departmentStoreUIDs;
  
  console.warn(`Could not find any StoreUID in the response, falling back to default 579`);
  return [{
    storeUID: '579',
    departmentName: 'SGA',
    deptUID: '3',
    source: 'default fallback'
  }];
}

// Fetch datasheet data via AJAX
async function fetchDatasheetData(parameters, accountName, dataType, dataHref) {
  try {
    console.log(`Fetching datasheet data for ${accountName} (${dataType}):`);
    console.log('Initial parameters:', JSON.stringify(parameters, null, 2));
    console.log('Using data-href for Referer:', dataHref);
    
    // Extract BudgetId and BudgetYear from dataHref
    let budgetId = '86'; // Default to Actuals
    let budgetYear = '2026'; // Default year
    
    if (dataHref) {
      const pathMatch = dataHref.match(/\/Budget\/DataInput\/(\d+)\/(\d+)/);
      if (pathMatch && pathMatch.length >= 3) {
        budgetId = pathMatch[1];
        budgetYear = pathMatch[2];
        console.log(`Extracted from data-href: BudgetId=${budgetId}, BudgetYear=${budgetYear}`);
      }
    }
    
    // STEP 1: Prime the session with a GET request to set the correct BudgetId in session
    console.log("STEP 1: Priming budget session with GET request");
    await primeBudgetSession(dataHref);
    
    // STEP 2: Fetch the correct StoreUIDs for all departments using Level 0 request
    console.log(`STEP 2: Fetching StoreUIDs for ${accountName} using Level 0 request`);
    const departmentStoreUIDs = await fetchStoreUIDForDepartment(parameters, accountName, dataHref);
    
    const storeCsv = departmentStoreUIDs.map(d => d.storeUID).join(',');
    
    // STEP 3: Initialize budget session context using FetchPercentApprovedValues with precise store list
    console.log(`STEP 3: Initializing budget session with FetchPercentApprovedValues for ${parameters.groupedcategory}`);
    await fetchPercentApprovedValues(parameters.groupedcategory, dataHref, storeCsv);
    
    console.log(`Found ${departmentStoreUIDs.length} departments for ${accountName}:`, 
      departmentStoreUIDs.map(d => `${d.storeUID} (${d.departmentName})`).join(', '));
    
    // Create a result object to store all department data
    const result = {
      accountName,
      dataType,
      departments: [],
      transactions: [], // Combined transactions from all departments
      totals: {}, // Will be calculated from all departments
      grandTotals: {}, // Will be calculated from all departments
      failedDepartments: []
    };
    
    // STEP 4 & 5: Process data for each department by fetching Level 2 transaction data
    // Use Level 0 totals as pre-filter - skip departments with zero totals to avoid unnecessary API calls
    console.log(`STEP 4: Fetching Level 2 transaction data for departments with non-zero Level 0 totals`);
    
    const baseUrl = window.location.origin;
    const refererUrl = dataHref ? `${baseUrl}${dataHref}` : null;
    
    const headers = {
      'Content-Type': 'application/json; charset=UTF-8',
      'Accept': 'text/html, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest'
    };
    if (refererUrl) headers['Referer'] = refererUrl;
    
    // Fetch Level 2 transaction data for each department (only if Level 0 totals are non-zero)
    for (const deptInfo of departmentStoreUIDs) {
      try {
        // PRE-CHECK: Use Level 0 totals to skip departments with no data
        // This avoids unnecessary API calls for empty departments
        const level0Total = deptInfo.total || 0;
        const level0HasData = deptInfo.monthly 
          ? Object.values(deptInfo.monthly).some(v => Math.abs(v) > 0.0001)
          : false;
        
        if (Math.abs(level0Total) < 0.0001 && !level0HasData) {
          console.log(`Skipping ${deptInfo.departmentName} (StoreUID: ${deptInfo.storeUID}) - Level 0 totals are zero`);
          continue;
        }
        
        console.log(`Processing department: ${deptInfo.departmentName} (StoreUID: ${deptInfo.storeUID}, Level0 total: ${level0Total})`);
        
        // Clone parameters for this department's Level 2 request
        // IMPORTANT: Keep original DeptUID from parameters, only change StoreUID
        const deptParameters = {
          level: '2',
          StoreUID: deptInfo.storeUID,
          DeptUID: parameters.DeptUID || '3',  // Keep original DeptUID, don't use storeUID
          CategoryUID: parameters.CategoryUID || '-1',
          groupedcategory: parameters.groupedcategory,
          CompNonCompfilter: parameters.CompNonCompfilter || '',
          Stores: storeCsv,
          viewLevel: 'CATEGORY',
          vendorIdCSV: parameters.vendoridCSV || parameters.vendorIdCSV || '-2',
          showInGlobal: true,
          bsMode: parameters.bsMode || '',
          categoryType: parameters.categoryType || 'PL',
          localoffset: parameters.localoffset || new Date().getTimezoneOffset().toString()
        };
        
        console.log(`Level 2 request parameters for ${deptInfo.departmentName}:`, JSON.stringify(deptParameters, null, 2));
        
        const response = await fetch('/Budget/GetRowData', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(deptParameters)
        });
        
        if (response.ok) {
          const responseText = await response.text();
          console.log(`Level 2 response for ${deptInfo.departmentName} (first 300 chars):`, responseText.substring(0, 300));
          
          const deptData = await parseDatasheetHtml(responseText, deptInfo.departmentName);
          deptData.departmentName = deptInfo.departmentName;
          deptData.storeUID = deptInfo.storeUID;
          deptData.deptUID = deptInfo.deptUID;
          
          // Check if we got any transactions with data
          const hasTransactions = (deptData.transactions || []).length > 0;
          const deptTotalVal = deptData.totals.total || 0;
          
          console.log(`${deptInfo.departmentName}: Found ${deptData.transactions?.length || 0} transactions, total=${deptTotalVal}`);
          
          if (hasTransactions || Math.abs(deptTotalVal) > 0.0001) {
            result.departments.push(deptData);
            deptData.transactions.forEach(t => {
              result.transactions.push({ 
                ...t, 
                departmentName: deptInfo.departmentName, 
                storeUID: deptInfo.storeUID 
              });
            });
            console.log(`Successfully processed department ${deptInfo.departmentName}`);
          } else {
            console.log(`Skipping department ${deptInfo.departmentName} (no transactions or zero totals)`);
          }
        } else {
          console.error(`Level 2 request failed for ${deptInfo.departmentName}: ${response.status}`);
        }
      } catch (error) {
        console.error(`Error processing department ${deptInfo.departmentName}:`, error);
        result.failedDepartments.push({
          departmentName: deptInfo.departmentName,
          storeUID: deptInfo.storeUID,
          error: error.message
        });
      }
    }
    
    // Calculate grand totals across all departments
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    
    // Initialize grand totals
    months.forEach(month => {
      result.grandTotals[month] = 0;
    });
    result.grandTotals.total = 0;
    
    // Sum up totals from all departments
    result.departments.forEach(dept => {
      months.forEach(month => {
        result.grandTotals[month] += (dept.totals[month] || 0);
      });
      result.grandTotals.total += (dept.totals.total || 0);
    });
    
    // Deduplicate transactions by vendor/description/total/month sum/storeUID
    const seen = new Set();
    result.transactions = result.transactions.filter(tx => {
      const key = `${tx.vendor || ''}|${tx.description || ''}|${tx.total || 0}|${tx.storeUID || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    console.log('Successfully fetched datasheet data for all departments:', {
      accountName,
      dataType,
      departmentCount: result.departments.length,
      totalTransactionCount: result.transactions.length,
      grandTotal: result.grandTotals.total
    });
    
    return result;
  } catch (error) {
    console.error('Error fetching datasheet data:', error);
    throw new Error(`Failed to fetch datasheet data: ${error.message}`);
  }
}

// Parse datasheet HTML response
async function parseDatasheetHtml(responseText, departmentName) {
  console.log(`Parsing HTML response for ${departmentName}`);
  
  // Wrap the HTML response in a proper table structure before parsing
  const wrappedHtml = `<table><tbody>${responseText}</tbody></table>`;
  
  // Parse HTML response
  const parser = new DOMParser();
  const doc = parser.parseFromString(wrappedHtml, 'text/html');
  
  // Extract data from parsed HTML
  const result = {
    departmentName,
    transactions: [],
    totals: {}
  };
  
  // Find all tr elements with data-level attribute (now inside table > tbody)
  const allRows = doc.querySelectorAll('table > tbody > tr[data-level]');
  console.log(`Found ${allRows.length} total rows with data-level attribute for ${departmentName}`);
  
  // Find transaction rows - try multiple selectors based on the actual HTML structure
  const transactionRowSelectors = [
    'table > tbody > tr[data-level="3"].budgetdata.bottomLevel.showyear.highlight.level3',
    'table > tbody > tr[data-level="3"].budgetdata.bottomLevel.showyear',
    'table > tbody > tr[data-level="3"].budgetdata.bottomLevel',
    'table > tbody > tr.budgetdata.bottomLevel',
    'table > tbody > tr[data-level="3"].bottomLevel',
    'table > tbody > tr[data-level="3"]'
  ];
  
  let transactionRows = [];
  for (const selector of transactionRowSelectors) {
    const rows = doc.querySelectorAll(selector);
    if (rows.length > 0) {
      console.log(`Found ${rows.length} transaction rows using selector: ${selector}`);
      transactionRows = rows;
      break;
    }
  }
  
  // If still no rows, try looking for any row with a vendor cell
  if (transactionRows.length === 0) {
    console.log('No transaction rows found with structured selectors, falling back to vendor cell scan');
    transactionRows = Array.from(doc.querySelectorAll('table > tbody > tr'))
      .filter(row => row.querySelector('.vendor') || row.querySelector('.vendorLst') || row.querySelector('[data-period]'));
    console.log(`Found ${transactionRows.length} transaction rows by vendor/data-period cells`);
  }
  
  // Process transaction rows
  transactionRows.forEach(row => {
    const transaction = extractTransactionData(row);
    if (transaction) {
      result.transactions.push(transaction);
    }
  });
  
  // Find total row - try multiple selectors based on the actual HTML structure
  const totalRowSelectors = [
    'table > tbody > tr[data-level="3"].doNotExpand.showyear.totals.highlight.level3',
    'table > tbody > tr[data-level="3"].doNotExpand.showyear.totals',
    'table > tbody > tr[data-level="3"].totals',
    'table > tbody > tr.totals',
    'table > tbody > tr.doNotExpand.showyear.totals',
    'table > tbody > tr.total-row'
  ];
  
  let totalRow = null;
  for (const selector of totalRowSelectors) {
    const row = doc.querySelector(selector);
    if (row) {
      console.log(`Found total row using selector: ${selector}`);
      totalRow = row;
      break;
    }
  }
  
  // If no total row found, try to find by text content
  if (!totalRow) {
    const allRows = doc.querySelectorAll('table > tbody > tr');
    for (const row of allRows) {
      if (/Total/i.test(row.textContent)) {
        console.log('Found total row by text content containing "Total"');
        totalRow = row;
        break;
      }
    }
  }
  
  if (totalRow) {
    result.totals = extractTotalData(totalRow);
  } else {
    console.warn(`No total row found for ${departmentName}, totals will be empty`);
    
    // Calculate totals from transactions if no total row found
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    months.forEach(month => {
      result.totals[month] = result.transactions.reduce((sum, t) => sum + (t.monthly[month] || 0), 0);
    });
    result.totals.total = result.transactions.reduce((sum, t) => sum + (t.total || 0), 0);
  }
  
  return result;
}

// Open datasheets sequentially using AJAX
async function openDatasheetSequentially(cell1Data, cell2Data) {
  // Create result object
  const comparisonData = {
    dataset1: {
      accountName: cell1Data.description,
      dataType: cell1Data.columnType,
      transactions: [],
      totals: {},
      failedDepartments: []
    },
    dataset2: {
      accountName: cell2Data.description,
      dataType: cell2Data.columnType,
      transactions: [],
      totals: {},
      failedDepartments: []
    }
  };
  
  try {
    // Extract parameters for both cells
    const cell1Params = extractCellParameters(cell1Data.cell);
    const cell2Params = extractCellParameters(cell2Data.cell);
    
    if (!cell1Params || !cell2Params) {
      throw new Error('Failed to extract cell parameters for comparison');
    }
    
    console.log('Extracted cell parameters:', {
      cell1: cell1Params,
      cell2: cell2Params
    });
    
    // Build AJAX parameters
    const ajaxParams1 = buildAjaxParameters(
      cell1Params.categoryUID, 
      cell1Params.groupedcategory
    );
    
    const ajaxParams2 = buildAjaxParameters(
      cell2Params.categoryUID, 
      cell2Params.groupedcategory
    );
    
    console.log('AJAX parameters for comparison:', {
      dataset1: {
        params: ajaxParams1,
        dataHref: cell1Params.dataHref,
        scenarioId: cell1Params.scenarioId
      },
      dataset2: {
        params: ajaxParams2,
        dataHref: cell2Params.dataHref,
        scenarioId: cell2Params.scenarioId
      }
    });
    
    // Fetch data for first datasheet
    console.log('Fetching first datasheet:', cell1Data.description);
    comparisonData.dataset1 = await fetchDatasheetData(
      ajaxParams1, 
      cell1Data.description, 
      cell1Data.columnType, 
      cell1Params.dataHref
    );
    
    // Fetch data for second datasheet
    console.log('Fetching second datasheet:', cell2Data.description);
    comparisonData.dataset2 = await fetchDatasheetData(
      ajaxParams2, 
      cell2Data.description, 
      cell2Data.columnType, 
      cell2Params.dataHref
    );
    
    return comparisonData;
  } catch (error) {
    console.error('Error in datasheet comparison:', error);
    const msg = error?.message || 'Unknown error';
    throw new Error(`Failed to compare datasheets: ${msg}`);
  }
}

// Scrape datasheet data from document
function scrapeDatasheetData(doc, accountName, dataType) {
  // Result object
  const result = {
    accountName,
    dataType,
    transactions: [],
    totals: {}
  };
  
  try {
    // Find title row
    const titleRow = doc.querySelector('tr[data-level="2"].showyear.level2');
    if (titleRow) {
      // Extract account name from title if not provided
      if (!accountName) {
        const titleCell = titleRow.querySelector('td[title]');
        if (titleCell) {
          result.accountName = titleCell.getAttribute('title').trim();
        }
      }
    }
    
    // Find transaction rows
    const transactionRows = doc.querySelectorAll('tr[data-level="3"].budgetdata.bottomLevel');
    transactionRows.forEach(row => {
      const transaction = extractTransactionData(row);
      if (transaction) {
        result.transactions.push(transaction);
      }
    });
    
    // Find total row
    const totalRow = doc.querySelector('tr[data-level="3"].totals');
    if (totalRow) {
      result.totals = extractTotalData(totalRow);
    }
    
    return result;
  } catch (error) {
    console.error('Error scraping datasheet:', error);
    throw new Error('Failed to scrape datasheet data');
  }
}

// Extract transaction data from row
function extractTransactionData(row) {
  try {
    if (debugModeEnabled) {
      console.log('Extracting transaction data from row:', row.outerHTML);
    } else {
      console.log('Extracting transaction data from row:', row.outerHTML.substring(0, 200) + '...');
    }
    
    // Get description - try multiple approaches
    let description = '';
    
    // Approach 1: Try to find the description in a span.desc-field (data-value attribute is most reliable)
    const descSpan = row.querySelector('span.desc-field, span.approved-row-desc');
    if (descSpan) {
      // Prefer data-value attribute as it's more reliable
      description = descSpan.getAttribute('data-value') || descSpan.textContent.trim();
      console.log('Found description in span.desc-field:', description);
    }
    
    // Approach 2: Try input.isDescription
    if (!description) {
      const descInput = row.querySelector('input.isDescription');
      if (descInput && descInput.value) {
        description = descInput.value.trim();
        console.log('Found description in input.isDescription:', description);
      }
    }
    
    // Approach 3: Try to find the description in a td with isDescription attribute
    if (!description) {
      const descCell = row.querySelector('td[isDescription="true"]');
      if (descCell) {
        description = descCell.textContent.trim();
        console.log('Found description in td[isDescription="true"]:', description);
      }
    }
    
    // Approach 4: Try the first td's title attribute
    if (!description) {
      const firstCell = row.querySelector('td:first-child');
      if (firstCell) {
        description = firstCell.getAttribute('title') || firstCell.textContent.trim();
        console.log('Found description from first cell:', description);
      }
    }
    
    // If still no description, use a more descriptive placeholder
    if (!description) {
      description = 'No Description Entered';
    }
    
    // Get vendor - try multiple approaches
    let vendor = '';
    
    // Approach 1: Look for span.vendor (title attribute is most reliable)
    const vendorSpan = row.querySelector('span.vendor');
    if (vendorSpan) {
      vendor = vendorSpan.getAttribute('title') || vendorSpan.textContent.trim();
      console.log('Found vendor in span.vendor:', vendor);
    } 
    // Approach 2: Look for td.vendor or td.vendorLst
    if (!vendor) {
      const vendorCell = row.querySelector('td.vendor, td.vendorLst');
      if (vendorCell) {
        const vendorSpanInCell = vendorCell.querySelector('span.vendor');
        if (vendorSpanInCell) {
          vendor = vendorSpanInCell.getAttribute('title') || vendorSpanInCell.textContent.trim();
        } else {
          vendor = vendorCell.textContent.trim();
        }
        console.log('Found vendor in td.vendor:', vendor);
      }
    }
    
    // Get monthly values
    const monthly = {};
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    
    months.forEach((month, index) => {
      const periodNum = index + 1;
      // Format period number with leading zero if needed
      const periodStr = periodNum < 10 ? `P0${periodNum}` : `P${periodNum}`;
      
      // Try multiple selectors for month cells
      const selectors = [
        `td[data-period="${periodStr}"]`,
        `td[title="${month}"]`,
        `td[data-month="${month}"]`,
        `td.data[data-period="${periodStr}"]`,
        `td.data[title="${month}"]`
      ];
      
      let dataCell = null;
      for (const selector of selectors) {
        dataCell = row.querySelector(selector);
        if (dataCell) {
          if (debugModeEnabled) {
            console.log(`Found ${month} cell using selector: ${selector}`);
          }
          break;
        }
      }
      
      // If still not found, try by position (last resort)
      if (!dataCell) {
        // Month cells typically start at position 3 or 4
        const startPos = 3; // Adjust based on actual table structure
        const cellIndex = startPos + index;
        dataCell = row.querySelector(`td:nth-child(${cellIndex})`);
        
        if (dataCell && debugModeEnabled) {
          console.log(`Found ${month} cell by position: td:nth-child(${cellIndex})`);
        }
      }
      
      if (dataCell) {
        // Try multiple ways to extract the value
        
        // Approach 1: Try to get from span[data-value] attribute
        const valueSpan = dataCell.querySelector('span[data-value]');
        if (valueSpan && valueSpan.hasAttribute('data-value')) {
          const value = valueSpan.getAttribute('data-value');
          monthly[month] = parseFloat(value.replace(/,/g, '')) || 0;
          if (debugModeEnabled) {
            console.log(`Found ${month} value from data-value:`, monthly[month]);
          }
        } 
        // Approach 2: Try to get from input value
        else if (dataCell.querySelector('input[type="text"]')) {
          const input = dataCell.querySelector('input[type="text"]');
          const value = input.value;
          monthly[month] = parseFloat(value.replace(/,/g, '')) || 0;
          if (debugModeEnabled) {
            console.log(`Found ${month} value from input:`, monthly[month]);
          }
        }
        // Approach 3: Try to get from text content
        else {
          // Check if there's a span with the value
          const span = dataCell.querySelector('span');
          if (span) {
            const value = span.textContent.trim();
            monthly[month] = parseFloat(value.replace(/,/g, '')) || 0;
            if (debugModeEnabled) {
              console.log(`Found ${month} value from span:`, monthly[month]);
            }
          } else {
            // Get from cell text content
            const valueText = dataCell.textContent.trim();
            monthly[month] = parseFloat(valueText.replace(/,/g, '')) || 0;
            if (debugModeEnabled) {
              console.log(`Found ${month} value from text:`, monthly[month]);
            }
          }
        }
      } else {
        monthly[month] = 0;
        if (debugModeEnabled) {
          console.log(`No cell found for ${month}, using default value 0`);
        }
      }
    });
    
    // Get total - try multiple approaches
    let total = 0;
    
    // Approach 1: Try to find the cell with title="Total"
    const totalSelectors = [
      'td[title="Total"]',
      'td.data[title="Total"]',
      'td.DATValueTotalF',
      'td.data.DATValueTotalF'
    ];
    
    let totalCell = null;
    for (const selector of totalSelectors) {
      totalCell = row.querySelector(selector);
      if (totalCell) {
        if (debugModeEnabled) {
          console.log(`Found total cell using selector: ${selector}`);
        }
        break;
      }
    }
    
    // Approach 2: If not found by selector, try by position (last cell)
    if (!totalCell) {
      const cells = row.querySelectorAll('td');
      if (cells.length > 0) {
        totalCell = cells[cells.length - 1];
        if (debugModeEnabled) {
          console.log('Found total cell by position (last cell)');
        }
      }
    }
    
    if (totalCell) {
      // Try multiple ways to extract the value
      
      // Approach 1: Try to get from span[data-value] attribute
      const valueSpan = totalCell.querySelector('span[data-value]');
      if (valueSpan && valueSpan.hasAttribute('data-value')) {
        total = parseFloat(valueSpan.getAttribute('data-value').replace(/,/g, '')) || 0;
        if (debugModeEnabled) {
          console.log('Found total from data-value:', total);
        }
      } 
      // Approach 2: Try to get from input value
      else if (totalCell.querySelector('input[type="text"]')) {
        const input = totalCell.querySelector('input[type="text"]');
        total = parseFloat(input.value.replace(/,/g, '')) || 0;
        if (debugModeEnabled) {
          console.log('Found total from input:', total);
        }
      }
      // Approach 3: Try to get from text content
      else {
        // Check if there's a span with the value
        const span = totalCell.querySelector('span');
        if (span) {
          total = parseFloat(span.textContent.replace(/,/g, '')) || 0;
          if (debugModeEnabled) {
            console.log('Found total from span:', total);
          }
        } else {
          // Get from cell text content
          const valueText = totalCell.textContent.trim();
          total = parseFloat(valueText.replace(/,/g, '')) || 0;
          if (debugModeEnabled) {
            console.log('Found total from text:', total);
          }
        }
      }
    } else {
      // If no total cell found, calculate from monthly values
      total = Object.values(monthly).reduce((sum, val) => sum + val, 0);
      if (debugModeEnabled) {
        console.log('Calculated total from monthly values:', total);
      }
    }
    
    const result = {
      description,
      vendor,
      monthly,
      total
    };
    
    console.log('Extracted transaction:', result);
    return result;
  } catch (error) {
    console.error('Error extracting transaction data:', error);
    return null;
  }
}

// Extract total data from row
function extractTotalData(row) {
  try {
    console.log('Extracting total data from row:', row);
    
    const totals = {};
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    
    months.forEach((month, index) => {
      const periodNum = index + 1;
      // Try multiple formats for period cells
      const selectors = [
        `td.data[data-period="P${periodNum}"]`,
        `td.data[data-period="P0${periodNum}"]`,
        `td.data[title="${month}"]`,
        `td[data-month="${month}"]`,
        `td:nth-child(${index + 4})` // Fallback based on position
      ];
      
      let dataCell = null;
      for (const selector of selectors) {
        dataCell = row.querySelector(selector);
        if (dataCell) break;
      }
      
      if (dataCell) {
        // Try multiple ways to extract the value
        const valueSpan = dataCell.querySelector('span[data-value]');
        if (valueSpan && valueSpan.hasAttribute('data-value')) {
          const value = valueSpan.getAttribute('data-value');
          totals[month] = parseFloat(value.replace(/,/g, '')) || 0;
        } else if (dataCell.querySelector('span')) {
          const value = dataCell.querySelector('span').textContent.trim();
          totals[month] = parseFloat(value.replace(/,/g, '')) || 0;
        } else {
          const valueText = dataCell.textContent.trim();
          totals[month] = parseFloat(valueText.replace(/,/g, '')) || 0;
        }
      } else {
        totals[month] = 0;
      }
    });
    
    // Get total - try multiple selectors
    const totalSelectors = [
      'td.data.DATValueTotalF',
      'td.data[title="Total"]',
      'td:last-child'
    ];
    
    let totalCell = null;
    for (const selector of totalSelectors) {
      totalCell = row.querySelector(selector);
      if (totalCell) break;
    }
    
    if (totalCell) {
      const totalSpan = totalCell.querySelector('span[data-value]');
      if (totalSpan && totalSpan.hasAttribute('data-value')) {
        totals.total = parseFloat(totalSpan.getAttribute('data-value').replace(/,/g, '')) || 0;
      } else if (totalCell.querySelector('span')) {
        totals.total = parseFloat(totalCell.querySelector('span').textContent.replace(/,/g, '')) || 0;
      } else {
        totals.total = parseFloat(totalCell.textContent.replace(/,/g, '')) || 0;
      }
    } else {
      // Calculate total from monthly values if not found
      totals.total = Object.values(totals).reduce((sum, val) => sum + val, 0);
    }
    
    console.log('Extracted totals:', totals);
    return totals;
  } catch (error) {
    console.error('Error extracting total data:', error);
    return {};
  }
}

// Utility: check if any departments failed
function hasFailedDepartments(comparisonData) {
  return (comparisonData.dataset1.failedDepartments?.length || 0) > 0 ||
         (comparisonData.dataset2.failedDepartments?.length || 0) > 0;
}

// Utility: render failed department summary HTML
function renderFailedSummary(comparisonData) {
  const failed = [
    ...(comparisonData.dataset1.failedDepartments || []).map(f => `${comparisonData.dataset1.dataType}: ${f.departmentName || f.storeUID}`),
    ...(comparisonData.dataset2.failedDepartments || []).map(f => `${comparisonData.dataset2.dataType}: ${f.departmentName || f.storeUID}`)
  ];
  if (!failed.length) return '';
  return `<div class="betterbudgyt-comparison-failed">Skipped/failed: ${failed.join(', ')}</div>`;
}

// Show comparison modal
function showComparisonModal(comparisonData) {
  // Remove any existing modal
  const existingModal = document.querySelector('.betterbudgyt-comparison-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'betterbudgyt-comparison-modal';
  
  // Get department counts
  const dataset1DeptCount = comparisonData.dataset1.departments?.length || 0;
  const dataset2DeptCount = comparisonData.dataset2.departments?.length || 0;
  
  // Calculate totals for summary cards
  const dataset1Total = comparisonData.dataset1.grandTotals?.total || comparisonData.dataset1.totals?.total || 0;
  const dataset2Total = comparisonData.dataset2.grandTotals?.total || comparisonData.dataset2.totals?.total || 0;
  const difference = dataset1Total - dataset2Total;
  
  // Load the current settings (using v2 key to reset default to true)
  chrome.storage.sync.get({ hideMonthsDefault: true }, (settings) => {
    const hideMonths = settings.hideMonthsDefault;
    const classTotalsOnly = false; // Always false now, toggle removed
    
    // Build header title - include account name if available
    const headerTitle = comparisonData.accountName 
      ? `📊 Datasheet Comparison - ${stripNumberPrefix(comparisonData.accountName)}`
      : '📊 Datasheet Comparison';
    
    // Create modal content with new modern layout
    modal.innerHTML = `
      <div class="betterbudgyt-comparison-modal-content">
        <div class="betterbudgyt-comparison-modal-header">
          <h2>${headerTitle}</h2>
          <button class="betterbudgyt-comparison-modal-close" title="Close">&times;</button>
        </div>
        <div class="betterbudgyt-comparison-modal-body">
          <!-- Summary Cards -->
          <div class="betterbudgyt-comparison-summary-section">
            <div class="betterbudgyt-comparison-summary-cards">
              <div class="betterbudgyt-summary-card betterbudgyt-summary-card-dataset1">
                <div class="betterbudgyt-summary-card-title">${comparisonData.dataset1.dataType}</div>
                <div class="betterbudgyt-summary-card-value">${formatNumber(dataset1Total)}</div>
                <div class="betterbudgyt-summary-card-subtitle">${dataset1DeptCount} departments · ${comparisonData.dataset1.transactions?.length || 0} transactions</div>
              </div>
              <div class="betterbudgyt-summary-card betterbudgyt-summary-card-dataset2">
                <div class="betterbudgyt-summary-card-title">${comparisonData.dataset2.dataType}</div>
                <div class="betterbudgyt-summary-card-value">${formatNumber(dataset2Total)}</div>
                <div class="betterbudgyt-summary-card-subtitle">${dataset2DeptCount} departments · ${comparisonData.dataset2.transactions?.length || 0} transactions</div>
              </div>
              <div class="betterbudgyt-summary-card betterbudgyt-summary-card-diff">
                <div class="betterbudgyt-summary-card-title">Variance</div>
                <div class="betterbudgyt-summary-card-value">${formatNumber(difference)}</div>
                <div class="betterbudgyt-summary-card-subtitle">${comparisonData.dataset1.dataType} − ${comparisonData.dataset2.dataType}</div>
              </div>
            </div>
          </div>
          
          <!-- Search & Filter Toolbar -->
          <div class="betterbudgyt-comparison-toolbar">
            <div class="betterbudgyt-search-container">
              <svg class="betterbudgyt-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input type="text" class="betterbudgyt-search-input" id="comparisonSearch" placeholder="Search departments, descriptions, vendors...">
            </div>
            <div class="betterbudgyt-filter-chips">
              <button class="betterbudgyt-filter-chip active" data-filter="all">All</button>
              <button class="betterbudgyt-filter-chip betterbudgyt-filter-chip-dataset1" data-filter="dataset1">${comparisonData.dataset1.dataType}</button>
              <button class="betterbudgyt-filter-chip betterbudgyt-filter-chip-dataset2" data-filter="dataset2">${comparisonData.dataset2.dataType}</button>
            </div>
            <div class="betterbudgyt-toolbar-divider"></div>
            <label class="betterbudgyt-comparison-toggle-container" title="Hide monthly breakdown columns">
              <input type="checkbox" id="hideMonthsToggle" ${hideMonths ? 'checked' : ''}>
              <span class="betterbudgyt-comparison-toggle-slider"></span>
              <span class="betterbudgyt-comparison-toggle-label">Hide Months</span>
            </label>
          </div>
          
          <!-- Table Container -->
          <div class="betterbudgyt-comparison-table-container">
            ${generateComparisonTable(comparisonData, hideMonths, classTotalsOnly)}
          </div>
        </div>
      </div>
    `;
    
    // Add to document
    document.body.appendChild(modal);
    
    // Auto-expand if only one department
    const deptCards = modal.querySelectorAll('.betterbudgyt-dept-card');
    if (deptCards.length === 1) {
      const card = deptCards[0];
      card.classList.add('expanded');
      const body = card.querySelector('.betterbudgyt-dept-card-body');
      if (body) body.style.display = 'block';
    }
    
    // Setup search functionality for card-based layout
    const searchInput = modal.querySelector('#comparisonSearch');
    searchInput.addEventListener('input', (event) => {
      const searchTerm = event.target.value.toLowerCase();
      const cards = modal.querySelectorAll('.betterbudgyt-dept-card');
      
      cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        const matches = searchTerm === '' || text.includes(searchTerm);
        card.style.display = matches ? '' : 'none';
      });
    });
    
    // Filter chips control layout: All = 2 columns, Actuals/Budget = single column full width
    const filterChips = modal.querySelectorAll('.betterbudgyt-filter-chip');
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        
        const filter = chip.dataset.filter;
        const grids = modal.querySelectorAll('.betterbudgyt-transactions-grid');
        
        grids.forEach(grid => {
          const section1 = grid.querySelector('.betterbudgyt-transactions-section-1');
          const section2 = grid.querySelector('.betterbudgyt-transactions-section-2');
          
          if (filter === 'all') {
            // Two column layout
            grid.style.gridTemplateColumns = '1fr 1fr';
            grid.classList.remove('single-column-mode');
            if (section1) section1.style.display = '';
            if (section2) section2.style.display = '';
          } else if (filter === 'dataset1') {
            // Single column - Actuals only
            grid.style.gridTemplateColumns = '1fr';
            grid.classList.add('single-column-mode');
            if (section1) section1.style.display = '';
            if (section2) section2.style.display = 'none';
          } else if (filter === 'dataset2') {
            // Single column - Budget only
            grid.style.gridTemplateColumns = '1fr';
            grid.classList.add('single-column-mode');
            if (section1) section1.style.display = 'none';
            if (section2) section2.style.display = '';
          }
        });
      });
    });
    
    // Setup department card expand/collapse
    modal.addEventListener('click', (event) => {
      const cardHeader = event.target.closest('.betterbudgyt-dept-card-header');
      if (cardHeader) {
        const card = cardHeader.closest('.betterbudgyt-dept-card');
        const body = card.querySelector('.betterbudgyt-dept-card-body');
        
        card.classList.toggle('expanded');
        body.style.display = card.classList.contains('expanded') ? 'block' : 'none';
      }
    });
    
    // Add event listener for toggle switches
    const toggleCheckbox = modal.querySelector('#hideMonthsToggle');
    toggleCheckbox.addEventListener('change', (event) => {
      const newHideMonths = event.target.checked;
      chrome.storage.sync.set({ hideMonthsDefault: newHideMonths });
      
      // Remember which cards are expanded before regenerating
      const expandedDepts = [];
      modal.querySelectorAll('.betterbudgyt-dept-card.expanded').forEach(card => {
        expandedDepts.push(card.dataset.dept);
      });
      
      // Remember current filter mode
      const activeChip = modal.querySelector('.betterbudgyt-filter-chip.active');
      const currentFilter = activeChip ? activeChip.dataset.filter : 'all';
      
      const tableContainer = modal.querySelector('.betterbudgyt-comparison-table-container');
      tableContainer.innerHTML = generateComparisonTable(comparisonData, newHideMonths, false);
      
      // Restore expanded state
      expandedDepts.forEach(deptId => {
        const card = tableContainer.querySelector(`.betterbudgyt-dept-card[data-dept="${deptId}"]`);
        if (card) {
          card.classList.add('expanded');
          const body = card.querySelector('.betterbudgyt-dept-card-body');
          if (body) body.style.display = 'block';
        }
      });
      
      // Restore filter mode
      if (currentFilter !== 'all') {
        const grids = tableContainer.querySelectorAll('.betterbudgyt-transactions-grid');
        grids.forEach(grid => {
          const section1 = grid.querySelector('.betterbudgyt-transactions-section-1');
          const section2 = grid.querySelector('.betterbudgyt-transactions-section-2');
          
          grid.style.gridTemplateColumns = '1fr';
          grid.classList.add('single-column-mode');
          
          if (currentFilter === 'dataset1') {
            if (section1) section1.style.display = '';
            if (section2) section2.style.display = 'none';
          } else if (currentFilter === 'dataset2') {
            if (section1) section1.style.display = 'none';
            if (section2) section2.style.display = '';
          }
        });
      }
    });
    
    // Add event listener for pop-out buttons
    modal.addEventListener('click', (event) => {
      const popoutBtn = event.target.closest('.betterbudgyt-dept-popout-btn');
      if (popoutBtn) {
        event.stopPropagation(); // Prevent card expansion
        const deptId = popoutBtn.dataset.dept;
        openDepartmentInNewTab(deptId, comparisonData, hideMonths);
      }
    });

    // Add event listener for close button
    modal.querySelector('.betterbudgyt-comparison-modal-close').addEventListener('click', () => {
      modal.remove();
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.remove();
      }
    });
    
    // Escape key to close
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  });
}

// Open department details in a new tab
async function openDepartmentInNewTab(deptId, originalComparisonData, hideMonths) {
  // Find department data in both datasets
  const dept1 = originalComparisonData.dataset1.departments?.find(d => d.storeUID === deptId);
  const dept2 = originalComparisonData.dataset2.departments?.find(d => d.storeUID === deptId);
  
  if (!dept1 && !dept2) return;
  
  const deptName = dept1?.departmentName || dept2?.departmentName || 'Department Detail';
  
  // Calculate totals for this department
  const d1Total = dept1 ? (dept1.totals?.total || dept1.transactions?.reduce((s, t) => s + (t.total || 0), 0) || 0) : 0;
  const d2Total = dept2 ? (dept2.totals?.total || dept2.transactions?.reduce((s, t) => s + (t.total || 0), 0) || 0) : 0;
  const variance = d1Total - d2Total;
  
  const d1Count = dept1?.transactions?.length || 0;
  const d2Count = dept2?.transactions?.length || 0;

  // Create a single-department comparison object
  const singleDeptData = {
    dataset1: {
      dataType: originalComparisonData.dataset1.dataType,
      grandTotals: { total: d1Total },
      departments: dept1 ? [dept1] : [],
      transactions: dept1?.transactions || []
    },
    dataset2: {
      dataType: originalComparisonData.dataset2.dataType,
      grandTotals: { total: d2Total },
      departments: dept2 ? [dept2] : [],
      transactions: dept2?.transactions || []
    }
  };

  // Generate the table HTML using the existing function
  const tableHtml = generateComparisonTable(singleDeptData, hideMonths, false);
  
  // Fetch the extension's CSS file directly
  let extensionCss = '';
  try {
    const cssUrl = chrome.runtime.getURL('styles.css');
    const response = await fetch(cssUrl);
    extensionCss = await response.text();
  } catch (e) {
    console.error('Failed to load extension CSS:', e);
  }

  // Build the full interactive page
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${stripNumberPrefix(deptName)} - Comparison</title>
      <meta charset="UTF-8">
      <style>${extensionCss}</style>
      <style>
        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          overflow: hidden;
        }
        .betterbudgyt-comparison-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #f8fafc;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1;
        }
        .betterbudgyt-comparison-modal-content {
          background: #fff;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        /* Hide close button and popout button in standalone view */
        .betterbudgyt-comparison-modal-close { display: none !important; }
        .betterbudgyt-dept-popout-btn { display: none !important; }
        /* Force card to be expanded in pop-out view */
        .betterbudgyt-dept-card { border-color: #e2e8f0 !important; }
        .betterbudgyt-dept-card-body { display: block !important; }
        .betterbudgyt-dept-card .betterbudgyt-dept-expand-btn { 
          transform: rotate(90deg); 
          background: #3b82f6; 
          color: #fff; 
        }
        /* Fix toolbar layout */
        .betterbudgyt-comparison-toolbar {
          display: flex !important;
          flex-wrap: nowrap !important;
          align-items: center !important;
          gap: 16px !important;
          padding: 8px 20px !important;
        }
        .betterbudgyt-search-container {
          flex: 0 0 250px !important;
          max-width: 250px !important;
          overflow: hidden !important;
          position: relative !important;
        }
        .betterbudgyt-search-input {
          width: 100% !important;
          box-sizing: border-box !important;
        }
        .betterbudgyt-filter-chips {
          flex-shrink: 0 !important;
          display: flex !important;
          gap: 8px !important;
          margin-left: 16px !important;
        }
        /* Match font sizes to main modal */
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          font-size: 14px !important;
        }
        .betterbudgyt-mini-table {
          font-size: 13px !important;
        }
        .betterbudgyt-mini-table th,
        .betterbudgyt-mini-table td {
          padding: 8px 10px !important;
        }
        .betterbudgyt-dept-card-header {
          font-size: 14px !important;
        }
        .betterbudgyt-summary-card-value {
          font-size: 1.5rem !important;
        }
      </style>
    </head>
    <body>
      <div class="betterbudgyt-comparison-modal">
        <div class="betterbudgyt-comparison-modal-content">
          <div class="betterbudgyt-comparison-modal-header">
            <h2>📊 ${stripNumberPrefix(deptName)}</h2>
          </div>
          <div class="betterbudgyt-comparison-modal-body">
            <!-- Summary Cards -->
            <div class="betterbudgyt-comparison-summary-section">
              <div class="betterbudgyt-comparison-summary-cards">
                <div class="betterbudgyt-summary-card betterbudgyt-summary-card-dataset1">
                  <div class="betterbudgyt-summary-card-title">${singleDeptData.dataset1.dataType}</div>
                  <div class="betterbudgyt-summary-card-value">${formatNumber(d1Total)}</div>
                  <div class="betterbudgyt-summary-card-subtitle">1 department · ${d1Count} transactions</div>
                </div>
                <div class="betterbudgyt-summary-card betterbudgyt-summary-card-dataset2">
                  <div class="betterbudgyt-summary-card-title">${singleDeptData.dataset2.dataType}</div>
                  <div class="betterbudgyt-summary-card-value">${formatNumber(d2Total)}</div>
                  <div class="betterbudgyt-summary-card-subtitle">1 department · ${d2Count} transactions</div>
                </div>
                <div class="betterbudgyt-summary-card betterbudgyt-summary-card-diff">
                  <div class="betterbudgyt-summary-card-title">Variance</div>
                  <div class="betterbudgyt-summary-card-value">${formatNumber(variance)}</div>
                  <div class="betterbudgyt-summary-card-subtitle">${singleDeptData.dataset1.dataType} − ${singleDeptData.dataset2.dataType}</div>
                </div>
              </div>
            </div>
            
            <!-- Search & Filter Toolbar -->
            <div class="betterbudgyt-comparison-toolbar">
              <div class="betterbudgyt-search-container">
                <svg class="betterbudgyt-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input type="text" class="betterbudgyt-search-input" id="comparisonSearch" placeholder="Search descriptions, vendors...">
              </div>
              <div class="betterbudgyt-filter-chips">
                <button class="betterbudgyt-filter-chip active" data-filter="all">All</button>
                <button class="betterbudgyt-filter-chip betterbudgyt-filter-chip-dataset1" data-filter="dataset1">${singleDeptData.dataset1.dataType}</button>
                <button class="betterbudgyt-filter-chip betterbudgyt-filter-chip-dataset2" data-filter="dataset2">${singleDeptData.dataset2.dataType}</button>
              </div>
              <div class="betterbudgyt-toolbar-divider"></div>
              <label class="betterbudgyt-comparison-toggle-container" title="Hide monthly breakdown columns">
                <input type="checkbox" id="hideMonthsToggle" ${hideMonths ? 'checked' : ''}>
                <span class="betterbudgyt-comparison-toggle-slider"></span>
                <span class="betterbudgyt-comparison-toggle-label">Hide Months</span>
              </label>
            </div>
            
            <!-- Table Container -->
            <div class="betterbudgyt-comparison-table-container">
              ${tableHtml}
            </div>
          </div>
        </div>
      </div>

      <script>
        // Store the comparison data for regeneration
        // Properly escaped JSON to prevent script injection
        const comparisonData = ${JSON.stringify(singleDeptData).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')};
        const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
        
        console.log('Pop-out initialized with data:', comparisonData);
        
        // Format number helper
        function formatNumber(num) {
          if (num === null || num === undefined || isNaN(num)) return '0';
          return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(num);
        }
        
        // Strip number prefix helper
        function stripNumberPrefix(str) {
          if (!str) return str;
          return str.replace(/^\\d+[-.]?\\s*/, '');
        }
        
        // Generate transactions HTML
        function generateDeptTransactionsHtml(deptData, comparisonData, months, hideMonths) {
          let html = '<div class="betterbudgyt-transactions-grid">';
          
          if (deptData.dataset1?.transactions?.length > 0) {
            html += '<div class="betterbudgyt-transactions-section betterbudgyt-transactions-section-1">';
            html += '<div class="betterbudgyt-transactions-section-header">' + comparisonData.dataset1.dataType + '</div>';
            html += '<table class="betterbudgyt-mini-table"><thead><tr>';
            html += '<th>Description</th><th>Vendor</th>';
            if (!hideMonths) months.forEach(m => html += '<th>' + m + '</th>');
            html += '<th>Total</th></tr></thead><tbody>';
            deptData.dataset1.transactions.forEach(t => {
              html += '<tr><td class="betterbudgyt-mini-desc">' + (t.description || 'No Description') + '</td>';
              html += '<td class="betterbudgyt-mini-vendor">' + (stripNumberPrefix(t.vendor) || '-') + '</td>';
              if (!hideMonths) months.forEach(m => html += '<td class="betterbudgyt-mini-value">' + formatNumber(t.monthly?.[m] || 0) + '</td>');
              html += '<td class="betterbudgyt-mini-total">' + formatNumber(t.total || 0) + '</td></tr>';
            });
            html += '</tbody></table></div>';
          }
          
          if (deptData.dataset2?.transactions?.length > 0) {
            html += '<div class="betterbudgyt-transactions-section betterbudgyt-transactions-section-2">';
            html += '<div class="betterbudgyt-transactions-section-header">' + comparisonData.dataset2.dataType + '</div>';
            html += '<table class="betterbudgyt-mini-table"><thead><tr>';
            html += '<th>Description</th><th>Vendor</th>';
            if (!hideMonths) months.forEach(m => html += '<th>' + m + '</th>');
            html += '<th>Total</th></tr></thead><tbody>';
            deptData.dataset2.transactions.forEach(t => {
              html += '<tr><td class="betterbudgyt-mini-desc">' + (t.description || 'No Description') + '</td>';
              html += '<td class="betterbudgyt-mini-vendor">' + (stripNumberPrefix(t.vendor) || '-') + '</td>';
              if (!hideMonths) months.forEach(m => html += '<td class="betterbudgyt-mini-value">' + formatNumber(t.monthly?.[m] || 0) + '</td>');
              html += '<td class="betterbudgyt-mini-total">' + formatNumber(t.total || 0) + '</td></tr>';
            });
            html += '</tbody></table></div>';
          }
          
          if (!deptData.dataset1?.transactions?.length && !deptData.dataset2?.transactions?.length) {
            html += '<div class="betterbudgyt-no-transactions">No transactions</div>';
          }
          
          html += '</div>';
          return html;
        }
        
        // Generate comparison table
        function generateComparisonTable(comparisonData, hideMonths) {
          const dept1 = comparisonData.dataset1.departments?.[0];
          const dept2 = comparisonData.dataset2.departments?.[0];
          const deptName = dept1?.departmentName || dept2?.departmentName || 'Department';
          const storeUID = dept1?.storeUID || dept2?.storeUID || '';
          
          const deptData = { name: deptName, storeUID, dataset1: dept1, dataset2: dept2 };
          
          const d1Total = dept1?.totals?.total || dept1?.transactions?.reduce((s,t) => s + (t.total||0), 0) || 0;
          const d2Total = dept2?.totals?.total || dept2?.transactions?.reduce((s,t) => s + (t.total||0), 0) || 0;
          const variance = d1Total - d2Total;
          const varianceClass = variance > 0 ? 'positive' : variance < 0 ? 'negative' : 'zero';
          const d1Count = dept1?.transactions?.length || 0;
          const d2Count = dept2?.transactions?.length || 0;
          
          return '<div class="betterbudgyt-dept-comparison-list">' +
            '<div class="betterbudgyt-dept-card expanded" data-dept="' + storeUID + '">' +
              '<div class="betterbudgyt-dept-card-header">' +
                '<div class="betterbudgyt-dept-card-title">' +
                  '<span class="betterbudgyt-dept-expand-btn">▶</span>' +
                  '<span class="betterbudgyt-dept-name">' + stripNumberPrefix(deptName) + '</span>' +
                '</div>' +
                '<div class="betterbudgyt-dept-card-totals">' +
                  '<div class="betterbudgyt-dept-total betterbudgyt-dept-total-1">' +
                    '<span class="betterbudgyt-dept-total-label">' + comparisonData.dataset1.dataType + '</span>' +
                    '<span class="betterbudgyt-dept-total-value">' + formatNumber(d1Total) + '</span>' +
                    '<span class="betterbudgyt-dept-total-count">' + d1Count + ' items</span>' +
                  '</div>' +
                  '<div class="betterbudgyt-dept-total betterbudgyt-dept-total-2">' +
                    '<span class="betterbudgyt-dept-total-label">' + comparisonData.dataset2.dataType + '</span>' +
                    '<span class="betterbudgyt-dept-total-value">' + formatNumber(d2Total) + '</span>' +
                    '<span class="betterbudgyt-dept-total-count">' + d2Count + ' items</span>' +
                  '</div>' +
                  '<div class="betterbudgyt-dept-total betterbudgyt-dept-variance ' + varianceClass + '">' +
                    '<span class="betterbudgyt-dept-total-label">Variance</span>' +
                    '<span class="betterbudgyt-dept-total-value">' + formatNumber(variance) + '</span>' +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<div class="betterbudgyt-dept-card-body" style="display: block;">' +
                generateDeptTransactionsHtml(deptData, comparisonData, months, hideMonths) +
              '</div>' +
            '</div>' +
          '</div>';
        }

        // Initialize interactivity - run immediately or when ready
        (function initPopout() {
          console.log('initPopout called, readyState:', document.readyState);
          
          // Wait for DOM to be ready
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupInteractivity);
          } else {
            setupInteractivity();
          }
          
          function setupInteractivity() {
            console.log('setupInteractivity called');
            const modal = document.querySelector('.betterbudgyt-comparison-modal');
            if (!modal) {
              console.error('Modal not found!');
              return;
            }
            
            let currentHideMonths = ${hideMonths};
            console.log('Initial hideMonths:', currentHideMonths);
            
            // Search functionality
            const searchInput = modal.querySelector('#comparisonSearch');
            if (searchInput) {
              console.log('Search input found');
              searchInput.addEventListener('input', (event) => {
                const searchTerm = event.target.value.toLowerCase();
                const rows = modal.querySelectorAll('.betterbudgyt-mini-table tbody tr');
                rows.forEach(row => {
                  const text = row.textContent.toLowerCase();
                  row.style.display = searchTerm === '' || text.includes(searchTerm) ? '' : 'none';
                });
              });
            }
            
            // Filter chips
            const filterChips = modal.querySelectorAll('.betterbudgyt-filter-chip');
            console.log('Found filter chips:', filterChips.length);
            filterChips.forEach(chip => {
              chip.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Filter chip clicked:', chip.dataset.filter);
                filterChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                
                const filter = chip.dataset.filter;
                const grids = modal.querySelectorAll('.betterbudgyt-transactions-grid');
                console.log('Found grids:', grids.length);
                
                grids.forEach(grid => {
                  const section1 = grid.querySelector('.betterbudgyt-transactions-section-1');
                  const section2 = grid.querySelector('.betterbudgyt-transactions-section-2');
                  
                  if (filter === 'all') {
                    grid.style.gridTemplateColumns = '1fr 1fr';
                    grid.classList.remove('single-column-mode');
                    if (section1) section1.style.display = '';
                    if (section2) section2.style.display = '';
                  } else if (filter === 'dataset1') {
                    grid.style.gridTemplateColumns = '1fr';
                    grid.classList.add('single-column-mode');
                    if (section1) section1.style.display = '';
                    if (section2) section2.style.display = 'none';
                  } else if (filter === 'dataset2') {
                    grid.style.gridTemplateColumns = '1fr';
                    grid.classList.add('single-column-mode');
                    if (section1) section1.style.display = 'none';
                    if (section2) section2.style.display = '';
                  }
                });
              });
            });
            
            // Expand/collapse - disabled since we force expanded in CSS
            // But keep it for consistency
            modal.addEventListener('click', (event) => {
              const cardHeader = event.target.closest('.betterbudgyt-dept-card-header');
              if (cardHeader) {
                const card = cardHeader.closest('.betterbudgyt-dept-card');
                const body = card.querySelector('.betterbudgyt-dept-card-body');
                const isExpanded = body.style.display !== 'none';
                body.style.display = isExpanded ? 'none' : 'block';
                const expandBtn = card.querySelector('.betterbudgyt-dept-expand-btn');
                if (expandBtn) {
                  expandBtn.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(90deg)';
                  expandBtn.style.background = isExpanded ? '#e2e8f0' : '#3b82f6';
                  expandBtn.style.color = isExpanded ? '#3b82f6' : '#fff';
                }
              }
            });
            
            // Hide months toggle
            const toggleCheckbox = modal.querySelector('#hideMonthsToggle');
            console.log('Toggle checkbox found:', !!toggleCheckbox);
            if (toggleCheckbox) {
              toggleCheckbox.addEventListener('change', (event) => {
                console.log('Hide months toggled:', event.target.checked);
                currentHideMonths = event.target.checked;
                const activeChip = modal.querySelector('.betterbudgyt-filter-chip.active');
                const currentFilter = activeChip ? activeChip.dataset.filter : 'all';
                
                const tableContainer = modal.querySelector('.betterbudgyt-comparison-table-container');
                console.log('Regenerating table with hideMonths:', currentHideMonths);
                tableContainer.innerHTML = generateComparisonTable(comparisonData, currentHideMonths);
                
                // Restore filter mode
                if (currentFilter !== 'all') {
                  const grids = tableContainer.querySelectorAll('.betterbudgyt-transactions-grid');
                  grids.forEach(grid => {
                    const section1 = grid.querySelector('.betterbudgyt-transactions-section-1');
                    const section2 = grid.querySelector('.betterbudgyt-transactions-section-2');
                    grid.style.gridTemplateColumns = '1fr';
                    grid.classList.add('single-column-mode');
                    if (currentFilter === 'dataset1') {
                      if (section1) section1.style.display = '';
                      if (section2) section2.style.display = 'none';
                    } else if (currentFilter === 'dataset2') {
                      if (section1) section1.style.display = 'none';
                      if (section2) section2.style.display = '';
                    }
                  });
                }
              });
            }
          }
        })();
      </script>
    </body>
    </html>
  `;
  
  // Use Blob URL to bypass CSP restrictions
  const blob = new Blob([html], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);
  const win = window.open(blobUrl, '_blank');
  
  if (!win) {
    alert('Please allow pop-ups to view department details.');
    URL.revokeObjectURL(blobUrl);
  }
}

// Generate comparison table HTML - Department-first comparison format
function generateComparisonTable(comparisonData, hideMonths = false, classTotalsOnly = false) {
  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  
  // Calculate grand totals
  const dataset1Total = comparisonData.dataset1.grandTotals?.total || comparisonData.dataset1.totals?.total || 0;
  const dataset2Total = comparisonData.dataset2.grandTotals?.total || comparisonData.dataset2.totals?.total || 0;
  
  // Build a map of departments from both datasets for side-by-side comparison
  const departmentMap = new Map();
  
  // Add dataset1 departments
  (comparisonData.dataset1.departments || []).forEach(dept => {
    const key = dept.departmentName || dept.storeUID;
    departmentMap.set(key, {
      name: dept.departmentName,
      storeUID: dept.storeUID,
      dataset1: dept,
      dataset2: null
    });
  });
  
  // Add dataset2 departments
  (comparisonData.dataset2.departments || []).forEach(dept => {
    const key = dept.departmentName || dept.storeUID;
    if (departmentMap.has(key)) {
      departmentMap.get(key).dataset2 = dept;
    } else {
      departmentMap.set(key, {
        name: dept.departmentName,
        storeUID: dept.storeUID,
        dataset1: null,
        dataset2: dept
      });
    }
  });
  
  // Calculate department totals
  const getDeptTotal = (dept) => {
    if (!dept) return 0;
    if (dept.totals?.total) return dept.totals.total;
    return (dept.transactions || []).reduce((sum, t) => sum + (t.total || 0), 0);
  };
  
  // Check if we have only 1 department - if so, skip the card header
  const isSingleDepartment = departmentMap.size === 1;
  
  // Generate simplified table HTML - focused on comparison
  let tableHtml = `
    <div class="betterbudgyt-dept-comparison-list">
  `;
  
  // Process each department
  departmentMap.forEach((deptData, deptName) => {
    const d1Total = getDeptTotal(deptData.dataset1);
    const d2Total = getDeptTotal(deptData.dataset2);
    const variance = d1Total - d2Total;
    const varianceClass = variance > 0 ? 'positive' : variance < 0 ? 'negative' : 'zero';
    
    const d1Count = deptData.dataset1?.transactions?.length || 0;
    const d2Count = deptData.dataset2?.transactions?.length || 0;
    
    if (isSingleDepartment) {
      // Single department - skip the card header, just show transactions directly
      tableHtml += `
        <div class="betterbudgyt-dept-card betterbudgyt-single-dept" data-dept="${deptData.storeUID}">
          <div class="betterbudgyt-dept-card-body" style="display: block;">
            ${!classTotalsOnly ? generateDeptTransactionsHtml(deptData, comparisonData, months, hideMonths) : '<div class="betterbudgyt-no-transactions">Class totals only mode - transactions hidden</div>'}
          </div>
        </div>
      `;
    } else {
      // Multiple departments - show full card with header
      tableHtml += `
        <div class="betterbudgyt-dept-card" data-dept="${deptData.storeUID}">
          <div class="betterbudgyt-dept-card-header">
            <div class="betterbudgyt-dept-card-title">
              <span class="betterbudgyt-dept-expand-btn">▶</span>
              <span class="betterbudgyt-dept-name">${stripNumberPrefix(deptName)}</span>
              <button class="betterbudgyt-dept-popout-btn" title="Open in new tab" data-dept="${deptData.storeUID}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </button>
            </div>
            <div class="betterbudgyt-dept-card-totals">
              <div class="betterbudgyt-dept-total betterbudgyt-dept-total-1">
                <span class="betterbudgyt-dept-total-label">${comparisonData.dataset1.dataType}</span>
                <span class="betterbudgyt-dept-total-value">${formatNumber(d1Total)}</span>
                <span class="betterbudgyt-dept-total-count">${d1Count} items</span>
              </div>
              <div class="betterbudgyt-dept-total betterbudgyt-dept-total-2">
                <span class="betterbudgyt-dept-total-label">${comparisonData.dataset2.dataType}</span>
                <span class="betterbudgyt-dept-total-value">${formatNumber(d2Total)}</span>
                <span class="betterbudgyt-dept-total-count">${d2Count} items</span>
              </div>
              <div class="betterbudgyt-dept-total betterbudgyt-dept-variance ${varianceClass}">
                <span class="betterbudgyt-dept-total-label">Variance</span>
                <span class="betterbudgyt-dept-total-value">${formatNumber(variance)}</span>
              </div>
            </div>
          </div>
          <div class="betterbudgyt-dept-card-body" style="display: none;">
            ${!classTotalsOnly ? generateDeptTransactionsHtml(deptData, comparisonData, months, hideMonths) : '<div class="betterbudgyt-no-transactions">Class totals only mode - transactions hidden</div>'}
          </div>
        </div>
      `;
    }
  });
  
  tableHtml += `</div>`;
  
  return tableHtml;
}

// Generate transaction details for a department
function generateDeptTransactionsHtml(deptData, comparisonData, months, hideMonths) {
  let html = '<div class="betterbudgyt-transactions-grid">';
  
  // Dataset 1 transactions
  if (deptData.dataset1?.transactions?.length > 0) {
    html += `
      <div class="betterbudgyt-transactions-section betterbudgyt-transactions-section-1">
        <div class="betterbudgyt-transactions-section-header">${comparisonData.dataset1.dataType}</div>
        <table class="betterbudgyt-mini-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Vendor</th>
              ${hideMonths ? '' : months.map(m => `<th>${m}</th>`).join('')}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
    `;
    deptData.dataset1.transactions.forEach(t => {
      html += `
        <tr>
          <td class="betterbudgyt-mini-desc">${t.description || 'No Description'}</td>
          <td class="betterbudgyt-mini-vendor">${stripNumberPrefix(t.vendor) || '-'}</td>
          ${hideMonths ? '' : months.map(m => `<td class="betterbudgyt-mini-value">${formatNumber(t.monthly?.[m] || 0)}</td>`).join('')}
          <td class="betterbudgyt-mini-total">${formatNumber(t.total || 0)}</td>
        </tr>
      `;
    });
    html += '</tbody></table></div>';
  }
  
  // Dataset 2 transactions
  if (deptData.dataset2?.transactions?.length > 0) {
    html += `
      <div class="betterbudgyt-transactions-section betterbudgyt-transactions-section-2">
        <div class="betterbudgyt-transactions-section-header">${comparisonData.dataset2.dataType}</div>
        <table class="betterbudgyt-mini-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Vendor</th>
              ${hideMonths ? '' : months.map(m => `<th>${m}</th>`).join('')}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
    `;
    deptData.dataset2.transactions.forEach(t => {
      html += `
        <tr>
          <td class="betterbudgyt-mini-desc">${t.description || 'No Description'}</td>
          <td class="betterbudgyt-mini-vendor">${stripNumberPrefix(t.vendor) || '-'}</td>
          ${hideMonths ? '' : months.map(m => `<td class="betterbudgyt-mini-value">${formatNumber(t.monthly?.[m] || 0)}</td>`).join('')}
          <td class="betterbudgyt-mini-total">${formatNumber(t.total || 0)}</td>
        </tr>
      `;
    });
    html += '</tbody></table></div>';
  }
  
  if (!deptData.dataset1?.transactions?.length && !deptData.dataset2?.transactions?.length) {
    html += '<div class="betterbudgyt-no-transactions">No transactions</div>';
  }
  
  html += '</div>';
  return html;
}

// Global click handler for table cells
document.addEventListener('click', (event) => {
  // First check if click is within a table that has both classes
  const dashboardTable = event.target.closest('table.table.table-striped');
  if (!dashboardTable) return;
  
  // Find the closest td element from the click target
  const cell = event.target.closest('td');
  if (!cell) return; // Not a cell click

  // Check for interactive elements
  const hasExpander = cell.querySelector('.expander');
  const hasFormElements = cell.querySelector('input, select');
  const clickedLink = event.target.closest('a');
  const hasButton = cell.querySelector('button');
  const hasCursorPointer = cell.querySelector('span.cursor-pointer');
  
  // Skip highlighting for cells with special elements
  if (hasExpander || hasFormElements || hasButton || clickedLink || hasCursorPointer) {
    return;
  }
  
  // Otherwise it was a cell click, so prevent default and toggle highlight
  event.preventDefault();
  event.stopPropagation();

  
 // Handle comparison mode
  if (comparisonModeEnabled) {
    handleComparisonModeClick(cell);
    return;
  }

  // Handle calculator mode (existing logic)
  // Toggle cell selection - This should happen regardless of calculatorEnabled
  cell.classList.toggle('betterbudgyt-cell-selected');

  // If calculator is disabled, do nothing further (panel, map, etc.)
  if (!calculatorEnabled) return;

  // Get cell value and description
  const value = parseFloat(cell.textContent.replace(/[^0-9.-]+/g, '')) || 0;
  
  // Find description cell (with z-index: 1) in the same row
  const row = cell.closest('tr');
  const descriptionCell = row.querySelector('td[style*="z-index: 1"]');
  const description = descriptionCell ? descriptionCell.textContent.trim() : 'Unknown';

  // Create sum panel if it doesn't exist and calculator is enabled
  if (calculatorEnabled && !document.querySelector('.betterbudgyt-sum-panel')) {
    createSumPanel();
  }

  // Update selected cells map only if calculator is enabled
  // The check for calculatorEnabled is now done above.
  if (cell.classList.contains('betterbudgyt-cell-selected')) {
    selectedCells.set(cell, { value, description });
  } else {
    selectedCells.delete(cell);
  }

  // Update sum panel
  updateSumPanel();
}, true); // Use capture phase

// Set up mutation observer to watch for table changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach(async mutation => {
    if (mutation.addedNodes.length) {
      // Update calculations and headers for new content
      updateVarianceCalculations();
      await updateVarianceHeaders();
      
      // Check if we should apply compact view when table content changes
      chrome.storage.sync.get({ showTotalOnlyEnabled: false }, (settings) => {
        if (settings.showTotalOnlyEnabled && isDatasheetPage()) {
          console.log('Table mutation detected - applying compact view');
          hideMonthColumns();
        }
      });
    }
  });
});

// Start observing the table for changes
function initializeObserver() {
  const dashboardTable = document.querySelector('table.table');
  if (dashboardTable) {
    observer.observe(dashboardTable, {
      childList: true,
      subtree: true
    });
    updateVarianceCalculations();
  }
}

// Check if current page is a DataInput page
function isDataInputPage() {
  return window.location.href.includes('/Budget/DataInput/');
}

// Check if current page is a datasheet page
function isDatasheetPage() {
  return window.location.href.includes('/Budget/DataInput/') && 
         !window.location.href.includes('/Budget/DataInput/Edit/');
}

// Store original styles before hiding
function storeOriginalStyles(element) {
  if (!element.getAttribute('data-original-style')) {
    element.setAttribute('data-original-style', element.getAttribute('style') || '');
  }
}

// Hide month columns in DataInput view
function hideMonthColumns() {
  if (!isDatasheetPage()) return;

  console.log('Applying compact view to hide month columns');
  
  // First hide headers using data-period
  const headers = document.querySelectorAll('th.data[data-period]');
  headers.forEach(header => {
    storeOriginalStyles(header);
    header.style.display = 'none';
    header.style.width = '0';
    header.style.minWidth = '0';
    header.style.maxWidth = '0';
    header.style.padding = '0';
    header.style.margin = '0';
    header.style.border = 'none';
  });

  // Get all month names (excluding Total)
  const monthTitles = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  
  monthTitles.forEach(month => {
    // Hide all cells with this month's title
    const cells = document.querySelectorAll(`td[title="${month}"]`);
    cells.forEach(cell => {
      storeOriginalStyles(cell);
      
      // Remove the cell from layout flow
      cell.style.display = 'none';
      cell.style.width = '0';
      cell.style.minWidth = '0';
      cell.style.maxWidth = '0';
      cell.style.padding = '0';
      cell.style.margin = '0';
      cell.style.border = 'none';
      
      // Hide any child elements
      const children = cell.querySelectorAll('*');
      children.forEach(child => {
        storeOriginalStyles(child);
        child.style.display = 'none';
        child.style.width = '0';
        child.style.minWidth = '0';
        child.style.maxWidth = '0';
      });
    });
  });

  // Ensure Total column remains visible and properly positioned
  const totalCells = document.querySelectorAll('td[title="Total"], th[title="Total"]');
  totalCells.forEach(cell => {
    cell.style.display = '';
    cell.style.visibility = 'visible';
    
    // Make sure child elements are visible
    const children = cell.querySelectorAll('*');
    children.forEach(child => {
      child.style.display = '';
      child.style.visibility = 'visible';
    });
  });
}

// Wait for table and variance columns to be fully loaded
function waitForTable(callback, maxAttempts = 20) {
  let attempts = 0;
  
  function checkTable() {
    const table = document.querySelector('table');
    const varianceColumns = document.querySelectorAll('th.hideVarianceInBudgetComp');
    const dataRows = document.querySelectorAll('.lybudgetVal-toprow, .actualbudgetVal-toprow, .comparebudgetVal-toprow');
    
    console.log('Checking table elements:', {
      attempt: attempts + 1,
      tablePresent: !!table,
      varianceColumnsCount: varianceColumns.length,
      dataRowsCount: dataRows.length
    });
    
    if (table && varianceColumns.length > 0 && dataRows.length > 0) {
      // Table, variance columns, and data rows are loaded
      console.log('Table fully loaded with variance columns and data rows');
      callback();
    } else if (attempts < maxAttempts) {
      // Try again in 500ms
      attempts++;
      setTimeout(checkTable, 500);
    } else {
      console.warn('Max attempts reached waiting for table elements');
    }
  }
  
  checkTable();
}

// Initialize settings and apply them to the table
async function initializeSettings() {
  console.log('Initializing settings...');
  
  chrome.storage.sync.get({
    variance1: {
      minuend: 0,
      subtrahend: 1
    },
    variance2: {
      minuend: 0,
      subtrahend: 2
    }
  }, async (settings) => {
    console.log('Loaded settings:', settings);
    currentSettings = settings;
    
    // Initialize headers first
    initializeVarianceHeaders();
    
    // Then update calculations and headers
    updateVarianceCalculations();
    await updateVarianceHeaders();
    
    console.log('Settings applied successfully');
  });
}

// Listen for compact view button click
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'TOGGLE_SHOW_TOTAL_ONLY') {
    // Store the setting
    chrome.storage.sync.set({ showTotalOnlyEnabled: message.enabled });
    
    // Apply immediately if on a relevant page
    if (isDataInputPage()) {
      if (message.enabled) {
        hideMonthColumns();
      } else {
        showMonthColumns();
      }
    } else if (isDatasheetPage() && message.enabled) {
      // For datasheet pages, apply with delay if enabled
      applyCompactViewWithDelay(1000); // Use shorter delay for direct user action
    }
    
    sendResponse({status: "Show total only toggled"});
  } else if (message.type === 'UPDATE_VARIANCE_SETTINGS') {
    // currentSettings is updated by the primary message listener.
    // This listener primarily handles TOGGLE_SHOW_TOTAL_ONLY.
    // Re-applying settings here is redundant if the first listener caught it.
    // However, to ensure settings apply if this is the only listener for some reason:
    if (message.settings) { // Check if settings are part of this message
        currentSettings = message.settings;
        updateVarianceCalculations();
        await updateVarianceHeaders();
    }
    sendResponse({status: "Settings updated"});
  }
  // TOGGLE_CALCULATOR is handled by the primary message listener.
  // Ensure sendResponse is called for all message types handled by *this* listener.
  // If other specific listeners handle other types, they should call sendResponse themselves.
  return true; // Keep message channel open for async response
});

// Global click handler for refresh button
document.addEventListener('click', (event) => {
  const refreshButton = event.target.closest('#btnDisplayData');
  if (refreshButton) {
    console.log('Refresh button clicked - waiting 6 seconds to reapply settings');
    setTimeout(async () => {
      console.log('Reapplying variance settings after refresh');
      updateVarianceCalculations();
      await updateVarianceHeaders();
    }, 3000);
  }
});

// Apply compact view with a delay to ensure table is loaded
function applyCompactViewWithDelay(delay = 3000) {
  console.log(`Applying compact view with ${delay}ms delay`);
  setTimeout(() => {
    if (isDatasheetPage()) {
      console.log('Applying compact view to datasheet page');
      hideMonthColumns();
    }
  }, delay);
}

// Track URL changes to apply compact view when navigating to datasheet pages
let lastUrl = window.location.href;

// Function to check for URL changes
function setupUrlChangeDetection() {
  console.log('Setting up URL change detection');
  
  // Function to handle URL changes
  function handleUrlChange() {
    if (lastUrl !== window.location.href) {
      console.log(`URL changed from ${lastUrl} to ${window.location.href}`);
      lastUrl = window.location.href;
      
      // Check if we should apply compact view
      chrome.storage.sync.get({ showTotalOnlyEnabled: false }, (settings) => {
        if (settings.showTotalOnlyEnabled && isDatasheetPage()) {
          console.log('Show total only is enabled and we are on a datasheet page');
          applyCompactViewWithDelay();
        }
      });
    }
  }
  
  // Method 1: Use MutationObserver to detect DOM changes that might indicate navigation
  const urlObserver = new MutationObserver(() => {
    handleUrlChange();
  });
  
  // Observe changes to the document body
  urlObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Method 2: Listen for popstate events (browser back/forward navigation)
  window.addEventListener('popstate', () => {
    console.log('Popstate event detected');
    handleUrlChange();
  });
  
  // Method 3: Periodic check as a fallback
  setInterval(() => {
    handleUrlChange();
  }, 2000); // Check every 2 seconds
  
  // Method 4: Check for Total cells as an indicator that table has loaded
  const totalCellObserver = new MutationObserver(() => {
    const totalCells = document.querySelectorAll('td[title="Total"], th[title="Total"]');
    if (totalCells.length > 0) {
      console.log('Total cells detected in the table');
      chrome.storage.sync.get({ showTotalOnlyEnabled: false }, (settings) => {
        if (settings.showTotalOnlyEnabled && isDatasheetPage()) {
          console.log('Show total only is enabled and Total cells are present');
          hideMonthColumns();
        }
      });
    }
  });
  
  // Observe the entire document for Total cells
  totalCellObserver.observe(document, {
    childList: true,
    subtree: true
  });
}

// Add zoom/resize event listener to reapply compact view when zooming
function setupZoomDetection() {
  console.log('Setting up zoom detection');
  
  window.addEventListener('resize', () => {
    chrome.storage.sync.get({ showTotalOnlyEnabled: false }, (settings) => {
      if (settings.showTotalOnlyEnabled && isDatasheetPage()) {
        console.log('Zoom/resize detected - reapplying compact view');
        hideMonthColumns();
      }
    });
  });
  
  // Add a periodic check to detect if month columns become visible when they shouldn't be
  setInterval(() => {
    chrome.storage.sync.get({ showTotalOnlyEnabled: false }, (settings) => {
      if (settings.showTotalOnlyEnabled && isDatasheetPage()) {
        // Check if any month columns are visible when they shouldn't be
        const monthTitles = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
        const visibleMonthCells = document.querySelectorAll(
          monthTitles.map(month => `td[title="${month}"]:not([style*="display: none"])`).join(', ')
        );
        
        if (visibleMonthCells.length > 0) {
          console.log('Detected visible month cells when they should be hidden - reapplying compact view');
          hideMonthColumns();
        }
      }
    });
  }, 5000); // Check every 5 seconds
}

// Initialize all components
async function initializeAll() {
  console.log('Initializing components...');
  
  // Set up URL change detection
  setupUrlChangeDetection();
  
  // Set up zoom detection
  setupZoomDetection();
  
  // Wait for table to be ready
  await new Promise((resolve) => {
    waitForTable(() => {
      console.log('Table ready - initializing settings...');
      initializeSettings();
      initializeObserver();
      
      // Load "Show Total Only" setting on page load
      chrome.storage.sync.get({ showTotalOnlyEnabled: false }, (settings) => {
        if (settings.showTotalOnlyEnabled) {
          if (isDataInputPage()) {
            console.log('Initial "Show Total Only" is enabled, hiding month columns.');
            hideMonthColumns();
          } else if (isDatasheetPage()) {
            console.log('Initial "Show Total Only" is enabled and we are on a datasheet page.');
            applyCompactViewWithDelay();
          }
        }
      });
      
      resolve();
    });
  });
  
  console.log('All components initialized');
}

// Initialize as soon as possible
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAll);
} else {
  // Same for already loaded pages
  initializeAll();
}
