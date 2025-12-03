// BetterBudgyt - Global State Management
// Centralized state for the extension

(function() {
  'use strict';

  window.BetterBudgyt = window.BetterBudgyt || {};

  // Global state object
  const state = {
    // Feature toggles
    calculatorEnabled: true,
    comparisonModeEnabled: false,
    debugModeEnabled: false,

    // Variance settings
    currentSettings: {
      variance1: { minuend: 0, subtrahend: 1 },
      variance2: { minuend: 0, subtrahend: 2 },
      varianceThreshold: '',
      varianceHighlightEnabled: false,
      colorGradientEnabled: true
    },

    // Calculator state
    selectedCells: new Map(),

    // Comparison mode state
    comparisonSelectedCells: new Map(),
    comparisonSelectionOrder: [],

    // Cache for store/class name mappings (storeUID -> name)
    storeNameCache: new Map(),

    // Column selectors with dynamic scenario names
    columnSelectors: {},

    // Modal counter for unique IDs
    comparisonModalCounter: 0,

    // URL tracking for navigation detection
    lastUrl: window.location.href
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

  // Update column selectors with scenario names
  function updateColumnSelectors(scenarios) {
    state.columnSelectors = {
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

  // Clear store name cache (useful when navigating to different budgets)
  function clearStoreNameCache() {
    state.storeNameCache.clear();
    console.log('Store name cache cleared');
  }

  // Export to namespace
  window.BetterBudgyt.state = state;
  window.BetterBudgyt.selectors = {
    variance: varianceSelectors,
    percentage: percentageSelectors
  };
  window.BetterBudgyt.updateColumnSelectors = updateColumnSelectors;
  window.BetterBudgyt.clearStoreNameCache = clearStoreNameCache;

})();
