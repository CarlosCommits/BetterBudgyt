// Format number with commas and 2 decimal places
function formatNumber(number) {
  return Number(number).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Column selectors for each budget type
const columnSelectors = {
  forecast: {
    header: 'th:has(a.sort-both):contains("Forecast FY25")',
    cells: [
      '.actualbudgetVal-toprow',
      '.actual-budgetVal',
      '[class*="catTopRow-actualBudget"]'
    ]
  },
  budget25: {
    header: 'th:has(a.sort-both):contains("Budget FY25")',
    cells: [
      '.comparebudgetVal-toprow',
      '.compare-budgetVal',
      '[class*="catTopRow-compareBudget"]'
    ]
  },
  budget26: {
    header: 'th:has(a.sort-both):contains("Budget FY26")',
    cells: [
      '.lybudgetVal-toprow',
      '.actual-budgetLYVal',
      '[class*="catTopRow-LYBudget"]'
    ]
  }
};

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

// Get abbreviated name for column type
function getAbbreviatedName(columnType) {
  switch (columnType) {
    case 'forecast':
      return 'F25';
    case 'budget25':
      return 'B25';
    case 'budget26':
      return 'B26';
    default:
      return '';
  }
}

// Generate header text based on variance settings
function generateHeaderText(varianceNum, minuend, subtrahend) {
  const minAbbr = getAbbreviatedName(minuend);
  const subAbbr = getAbbreviatedName(subtrahend);
  return `V${varianceNum}: ${minAbbr} - ${subAbbr}`;
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

// Update variance headers based on current settings
function updateVarianceHeaders() {
  // Find variance headers using their classes
  const headers = document.querySelectorAll('th.hideVarianceInBudgetComp');
  
  // Initialize headers if needed
  initializeVarianceHeaders();
  
  headers.forEach(header => {
    const varianceType = header.getAttribute('data-variance-type');
    const sortButton = header.querySelector('a.sort-both');
    if (!sortButton) return;
    
    if (varianceType === 'variance1') {
      const newText = generateHeaderText(1, currentSettings.variance1.minuend, currentSettings.variance1.subtrahend);
      // Keep original text in title for tooltip
      header.title = `Variance 1 (${newText})`;
      // Clear existing content
      header.innerHTML = '';
      // Add new text and sort button
      header.appendChild(document.createTextNode(newText + ' '));
      header.appendChild(sortButton);
    } else if (varianceType === 'variance2') {
      const newText = generateHeaderText(2, currentSettings.variance2.minuend, currentSettings.variance2.subtrahend);
      // Keep original text in title for tooltip
      header.title = `Variance 2 (${newText})`;
      // Clear existing content
      header.innerHTML = '';
      // Add new text and sort button
      header.appendChild(document.createTextNode(newText + ' '));
      header.appendChild(sortButton);
    }
  });
}

// Store current settings
let currentSettings = {
  variance1: {
    minuend: 'forecast',
    subtrahend: 'budget25'
  },
  variance2: {
    minuend: 'forecast',
    subtrahend: 'budget26'
  }
};

// Load saved settings when content script initializes
chrome.storage.sync.get({
  variance1: {
    minuend: 'forecast',
    subtrahend: 'budget25'
  },
  variance2: {
    minuend: 'forecast',
    subtrahend: 'budget26'
  }
}, (settings) => {
  currentSettings = settings;
  updateVarianceCalculations();
  updateVarianceHeaders(); // Update headers when settings are loaded
});

// Listen for settings updates from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_VARIANCE_SETTINGS') {
    currentSettings = message.settings;
    updateVarianceCalculations();
    updateVarianceHeaders();
  }
});

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
      `(${minuendValue} - ${subtrahendValue}) / ${subtrahendValue} * 100` : 
      'Division by zero'
  });
  
  if (subtrahendValue === 0) return '0.00%';
  const percentage = ((minuendValue - subtrahendValue) / subtrahendValue * 100).toFixed(2) + '%';
  
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

// Global click handler for table cells
document.addEventListener('click', (event) => {
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
  if (hasExpander) {
    return;
  }

  // Skip highlighting for cells with special elements
  if (hasFormElements) {
    return;
  }

  // Skip if cell contains any buttons
  if (hasButton) {
    return;
  }
  
  // Skip if click was directly on a link
  if (clickedLink) {
    return;
  }

  // Skip if cell contains a cursor-pointer span
  if (hasCursorPointer) {
    return;
  }
  
  // Otherwise it was a cell click, so prevent default and toggle highlight
  event.preventDefault();
  event.stopPropagation();
  cell.classList.toggle('betterbudgyt-cell-selected');
}, true); // Use capture phase

// Set up mutation observer to watch for table changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    if (mutation.addedNodes.length) {
      // Update calculations and headers for new content
      updateVarianceCalculations();
      updateVarianceHeaders();
    }
  });
});

// Start observing the table for changes
function initializeObserver() {
  const table = document.querySelector('table');
  if (table) {
    observer.observe(table.querySelector('tbody') || table, {
      childList: true,
      subtree: true,
      characterData: true
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
function initializeSettings() {
  console.log('Initializing settings...');
  
  chrome.storage.sync.get({
    variance1: {
      minuend: 'forecast',
      subtrahend: 'budget25'
    },
    variance2: {
      minuend: 'forecast',
      subtrahend: 'budget26'
    }
  }, (settings) => {
    console.log('Loaded settings:', settings);
    currentSettings = settings;
    
    // Initialize headers first
    initializeVarianceHeaders();
    
    // Then update calculations and headers
    updateVarianceCalculations();
    updateVarianceHeaders();
    
    console.log('Settings applied successfully');
  });
}

// Listen for compact view button click
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'COMPACT_VIEW_CLICKED') {
    if (isDataInputPage()) {
      hideMonthColumns();
    }
    sendResponse();
  } else if (message.type === 'UPDATE_VARIANCE_SETTINGS') {
    currentSettings = message.settings;
    updateVarianceCalculations();
    updateVarianceHeaders();
  }
});

// Global click handler for refresh button
document.addEventListener('click', (event) => {
  const refreshButton = event.target.closest('#btnDisplayData');
  if (refreshButton) {
    console.log('Refresh button clicked - waiting 6 seconds to reapply settings');
    setTimeout(() => {
      console.log('Reapplying variance settings after refresh');
      updateVarianceCalculations();
      updateVarianceHeaders();
    }, 3000);
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loading - waiting for table...');
    waitForTable(() => {
    console.log('Table ready - initializing components...');
    initializeSettings();
    initializeObserver();
    });
  });
} else {
  // Same for already loaded pages
  console.log('DOM already loaded - waiting for table...');
  waitForTable(() => {
    console.log('Table ready - initializing components...');
    initializeSettings();
    initializeObserver();
  });
}
