// BetterBudgyt - Variance Calculations Feature
// Handles variance calculations, highlighting, and percentage colors

(function() {
  'use strict';

  window.BetterBudgyt = window.BetterBudgyt || {};
  window.BetterBudgyt.features = window.BetterBudgyt.features || {};

  const { formatNumber, safeStorageGet } = window.BetterBudgyt.utils;
  const state = window.BetterBudgyt.state;
  const selectors = window.BetterBudgyt.selectors;

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

  // Initialize variance headers with data attributes
  function initializeVarianceHeaders() {
    const headers = document.querySelectorAll('th.hideVarianceInBudgetComp');
    
    headers.forEach(header => {
      const headerText = header.textContent.trim();
      
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
  async function updateVarianceHeaders() {
    const headers = document.querySelectorAll('th.hideVarianceInBudgetComp');
    
    initializeVarianceHeaders();
    
    for (const header of headers) {
      const varianceType = header.getAttribute('data-variance-type');
      const sortButton = header.querySelector('a.sort-both');
      if (!sortButton) continue;
      
      let newText;
      if (varianceType === 'variance1') {
        newText = await generateHeaderText(1, state.currentSettings.variance1.minuend, state.currentSettings.variance1.subtrahend);
        header.title = `Variance 1 (${newText})`;
      } else if (varianceType === 'variance2') {
        newText = await generateHeaderText(2, state.currentSettings.variance2.minuend, state.currentSettings.variance2.subtrahend);
        header.title = `Variance 2 (${newText})`;
      }

      if (newText) {
        header.innerHTML = '';
        header.appendChild(document.createTextNode(newText + ' '));
        header.appendChild(sortButton);
      }
    }
  }

  // Update variance highlighting based on threshold
  function updateVarianceHighlights() {
    const varianceCells = document.querySelectorAll([
      ...selectors.variance.variance1,
      ...selectors.variance.variance2
    ].join(','));

    varianceCells.forEach(cell => {
      if (!cell) return;
      
      cell.classList.remove('variance-highlight-active');
      
      if (state.currentSettings.varianceHighlightEnabled && state.currentSettings.varianceThreshold) {
        const value = parseFloat(cell.textContent.replace(/,/g, ''));
        if (!isNaN(value) && Math.abs(value) >= state.currentSettings.varianceThreshold) {
          cell.classList.add('variance-highlight-active');
        }
      }
    });
  }

  // Calculate hue based on percentage value
  function getPercentageHue(percent) {
    if (percent < 0) {
      return 0;
    } else if (percent <= 50) {
      return percent * 0.8;
    } else if (percent <= 100) {
      return 40 + ((percent - 50) * 1.6);
    } else if (percent <= 200) {
      return Math.max(0, 120 - ((percent - 100) * 1.5));
    } else {
      return 0;
    }
  }

  // Apply color gradient to percentage cells
  function updatePercentageColors() {
    safeStorageGet({ colorGradientEnabled: true }, ({ colorGradientEnabled }) => {
      const percentageCells = document.querySelectorAll([
        ...selectors.percentage.percentage1,
        ...selectors.percentage.percentage2
      ].join(','));

      percentageCells.forEach(cell => {
        if (!cell) return;
        
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
    for (const selector of state.columnSelectors[columnType].cells) {
      const cell = row.querySelector(selector);
      if (cell) {
        const link = cell.querySelector('a');
        if (link) {
          const text = link.textContent.trim();
          return parseFloat(text.replace(/,/g, '')) || 0;
        }
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
    
    if (subtrahendValue === 0) return 'N/A';
    const percentage = ((minuendValue / subtrahendValue) * 100).toFixed(2) + '%';
    return percentage;
  }

  // Update cell content handling both span and non-span structures
  function updateCellContent(cell, value) {
    if (!cell) return;
    
    cell.setAttribute('data-betterbudgyt', 'true');
    
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
    
    cell.textContent = value;
  }

  // Update variance calculations for all rows
  function updateVarianceCalculations() {
    updatePercentageColors();
    updateVarianceHighlights();
    
    const rows = document.querySelectorAll('tr');
    
    rows.forEach(row => {
      if (row.querySelector('th')) return;
      
      // Find variance1 cell
      let variance1Cell = null;
      for (const selector of selectors.variance.variance1) {
        const cell = row.querySelector(selector);
        if (cell) {
          variance1Cell = cell;
          break;
        }
      }
      
      // Find variance2 cell
      let variance2Cell = null;
      for (const selector of selectors.variance.variance2) {
        const cell = row.querySelector(selector);
        if (cell && isValidVariance2Cell(cell)) {
          variance2Cell = cell;
          break;
        }
      }
      
      if (variance1Cell) {
        const variance1 = calculateVariance(
          row,
          state.currentSettings.variance1.minuend,
          state.currentSettings.variance1.subtrahend
        );
        const formattedValue = formatNumber(variance1);
        updateCellContent(variance1Cell, formattedValue);
      }
      
      if (variance2Cell) {
        const variance2 = calculateVariance(
          row,
          state.currentSettings.variance2.minuend,
          state.currentSettings.variance2.subtrahend
        );
        const formattedValue = formatNumber(variance2);
        updateCellContent(variance2Cell, formattedValue);
      }

      // Find percentage1 cell
      let percentage1Cell = null;
      for (const selector of selectors.percentage.percentage1) {
        const cell = row.querySelector(selector);
        if (cell && isValidPercentageCell(cell, 1)) {
          percentage1Cell = cell;
          break;
        }
      }

      // Find percentage2 cell
      let percentage2Cell = null;
      for (const selector of selectors.percentage.percentage2) {
        const cell = row.querySelector(selector);
        if (cell && isValidPercentageCell(cell, 2)) {
          percentage2Cell = cell;
          break;
        }
      }

      if (percentage1Cell) {
        const percentage1 = calculatePercentage(
          row,
          state.currentSettings.variance1.minuend,
          state.currentSettings.variance1.subtrahend
        );
        updateCellContent(percentage1Cell, percentage1);
      }

      if (percentage2Cell) {
        const percentage2 = calculatePercentage(
          row,
          state.currentSettings.variance2.minuend,
          state.currentSettings.variance2.subtrahend
        );
        updateCellContent(percentage2Cell, percentage2);
      }
    });
  }

  // Export to namespace
  window.BetterBudgyt.features.variance = {
    isValidVariance2Cell,
    isValidPercentageCell,
    getAbbreviatedName,
    generateHeaderText,
    initializeVarianceHeaders,
    updateVarianceHeaders,
    updateVarianceHighlights,
    getPercentageHue,
    updatePercentageColors,
    findCellValue,
    calculateVariance,
    calculatePercentage,
    updateCellContent,
    updateVarianceCalculations
  };

})();
