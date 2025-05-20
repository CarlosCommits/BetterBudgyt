// Format number with commas and 2 decimal places
function formatNumber(number) {
  return Number(number).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Show month columns in DataInput view
function showMonthColumns() {
  if (!isDataInputPage()) return;

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


// Global variable for calculator state
let calculatorEnabled = true;

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
  calculatorEnabled: true // Default to true
}, async (settings) => {
  currentSettings = { // Explicitly set currentSettings, excluding calculatorEnabled
    variance1: settings.variance1,
    variance2: settings.variance2,
    colorGradientEnabled: settings.colorGradientEnabled,
    varianceThreshold: settings.varianceThreshold,
    varianceHighlightEnabled: settings.varianceHighlightEnabled
  };
  calculatorEnabled = settings.calculatorEnabled; // Set global variable

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

// Store original styles before hiding
function storeOriginalStyles(element) {
  if (!element.getAttribute('data-original-style')) {
    element.setAttribute('data-original-style', element.getAttribute('style') || '');
  }
}

// Hide month columns in DataInput view
function hideMonthColumns() {
  if (!isDataInputPage()) return;

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
    if (isDataInputPage()) {
      if (message.enabled) {
        hideMonthColumns();
      } else {
        showMonthColumns();
      }
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

// Initialize all components
async function initializeAll() {
  console.log('Initializing components...');
  
  // Wait for table to be ready
  await new Promise((resolve) => {
    waitForTable(() => {
      console.log('Table ready - initializing settings...');
      initializeSettings();
      initializeObserver();
      
      // Load "Show Total Only" setting on page load
      chrome.storage.sync.get({ showTotalOnlyEnabled: false }, (settings) => {
        if (settings.showTotalOnlyEnabled && isDataInputPage()) {
          console.log('Initial "Show Total Only" is enabled, hiding month columns.');
          hideMonthColumns();
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
