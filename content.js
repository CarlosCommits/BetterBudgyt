// BetterBudgyt - Main Entry Point
// This file coordinates all modules and initializes the extension

(function() {
  'use strict';

  // Ensure namespace is available
  const BetterBudgyt = window.BetterBudgyt;
  if (!BetterBudgyt) {
    console.error('BetterBudgyt namespace not found - modules may not have loaded correctly');
    return;
  }

  // Shorthand references
  const state = BetterBudgyt.state;
  const utils = BetterBudgyt.utils;
  const modals = BetterBudgyt.ui.modals;
  const panels = BetterBudgyt.ui.panels;
  const variance = BetterBudgyt.features.variance;
  const compactView = BetterBudgyt.features.compactView;
  const comparison = BetterBudgyt.features.comparison;
  const observers = BetterBudgyt.observers;

  // ==================== Global Click Handler ====================

  // Global click handler for note icons
  document.addEventListener('click', (event) => {
    const noteIcon = event.target.closest('.betterbudgyt-note-icon');
    if (noteIcon) {
      const note = noteIcon.dataset.note;
      const desc = noteIcon.dataset.desc;
      if (note) {
        event.stopPropagation();
        event.preventDefault();
        modals.showNoteModal(desc, note);
        return;
      }
    }
    
    // Check for file attachment icon click
    const fileIcon = event.target.closest('.betterbudgyt-file-icon');
    if (fileIcon) {
      const folderName = fileIcon.dataset.folder;
      const dataHref = fileIcon.dataset.href;
      if (folderName) {
        event.stopPropagation();
        event.preventDefault();
        comparison.modal.downloadAttachedFile(folderName, dataHref);
        return;
      }
    }
    
    // Check for clickable comment cell click
    const commentCell = event.target.closest('.clickable-comment');
    if (commentCell) {
      const plElementUID = commentCell.dataset.plElementUid;
      const field = commentCell.dataset.field;
      const desc = commentCell.dataset.desc;
      if (plElementUID && field) {
        event.stopPropagation();
        // Get context for Add Comment button using comparison module
        const comparisonData = state.currentComparisonData;
        const comments = comparison.comments;
        
        modals.fetchAndShowComment(plElementUID, field, desc, {
          onAddComment: () => {
            // Parse cell data and open add comment modal
            if (comparisonData && comments) {
              const parsed = comments.parseCellFromClick(commentCell, comparisonData);
              if (parsed) {
                comments.showAddCommentModal(parsed.cellData, parsed.transactionData, parsed.datasetInfo);
              }
            }
          }
        });
      }
    }
  });

  // Global click handler for table cells
  document.addEventListener('click', (event) => {
    // First check if click is within a table that has both classes
    const dashboardTable = event.target.closest('table.table.table-striped');
    if (!dashboardTable) return;
    
    // Find the closest td element from the click target
    const cell = event.target.closest('td');
    if (!cell) return;

    // Skip the account name/description cells
    const cellStyle = cell.getAttribute('style') || '';
    if (cellStyle.includes('z-index: 1') || cellStyle.includes('position: absolute')) {
      return;
    }

    // Check for interactive elements
    const hasExpander = cell.querySelector('.expander');
    const hasFormElements = cell.querySelector('input, select');
    const clickedLink = event.target.closest('a');
    const hasButton = cell.querySelector('button');
    const hasCursorPointer = cell.querySelector('span.cursor-pointer');
    
    if (hasExpander || hasFormElements || hasButton || clickedLink || hasCursorPointer) {
      return;
    }
    
    event.preventDefault();
    event.stopPropagation();

    // Handle comparison mode
    if (state.comparisonModeEnabled) {
      comparison.selection.handleComparisonModeClick(cell);
      return;
    }

    // Handle calculator mode
    cell.classList.toggle('betterbudgyt-cell-selected');

    if (!state.calculatorEnabled) return;

    const value = parseFloat(cell.textContent.replace(/[^0-9.-]+/g, '')) || 0;
    
    const row = cell.closest('tr');
    const descriptionCell = row.querySelector('td[style*="z-index: 1"]');
    const description = descriptionCell ? descriptionCell.textContent.trim() : 'Unknown';

    if (state.calculatorEnabled && !document.querySelector('.betterbudgyt-sum-panel')) {
      panels.createSumPanel();
    }

    if (cell.classList.contains('betterbudgyt-cell-selected')) {
      state.selectedCells.set(cell, { value, description });
    } else {
      state.selectedCells.delete(cell);
    }

    panels.updateSumPanel();
  }, true);

  // Global click handler for refresh button
  document.addEventListener('click', (event) => {
    const refreshButton = event.target.closest('#btnDisplayData');
    if (refreshButton) {
      console.log('Refresh button clicked - waiting to reapply settings');
      setTimeout(async () => {
        console.log('Reapplying variance settings after refresh');
        variance.updateVarianceCalculations();
        await variance.updateVarianceHeaders();
      }, 3000);
    }
  });

  // ==================== Message Listeners ====================

  // Load initial settings
  chrome.storage.sync.get({
    variance1: { minuend: 0, subtrahend: 1 },
    variance2: { minuend: 0, subtrahend: 2 },
    colorGradientEnabled: true,
    varianceThreshold: '',
    varianceHighlightEnabled: false,
    calculatorEnabled: false,
    comparisonModeEnabled: false,
    debugModeEnabled: false,
    comparisonHideMonths: false,
    comparisonClassTotalsOnly: false
  }, async (settings) => {
    state.currentSettings = {
      variance1: settings.variance1,
      variance2: settings.variance2,
      colorGradientEnabled: settings.colorGradientEnabled,
      varianceThreshold: settings.varianceThreshold,
      varianceHighlightEnabled: settings.varianceHighlightEnabled
    };
    state.calculatorEnabled = settings.calculatorEnabled;
    state.comparisonModeEnabled = settings.comparisonModeEnabled;
    state.debugModeEnabled = settings.debugModeEnabled;
    
    console.log(`Debug mode is ${state.debugModeEnabled ? 'enabled' : 'disabled'} on startup`);

    variance.updateVarianceCalculations();
    await variance.updateVarianceHeaders();
  });

  // Initialize column selectors with current scenarios
  chrome.storage.local.get('scenarios', ({scenarios}) => {
    BetterBudgyt.updateColumnSelectors(scenarios?.names || []);
  });

  // Listen for settings updates from popup
  chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === 'UPDATE_VARIANCE_SETTINGS') {
      state.currentSettings = message.settings;
      variance.updateVarianceCalculations();
      await variance.updateVarianceHeaders();
    } else if (message.type === 'UPDATE_COLOR_GRADIENT') {
      chrome.storage.sync.set({ colorGradientEnabled: message.enabled });
      variance.updatePercentageColors();
    } else if (message.type === 'TOGGLE_VARIANCE_HIGHLIGHT') {
      state.currentSettings.varianceHighlightEnabled = message.enabled;
      state.currentSettings.varianceThreshold = parseFloat(message.threshold);
      variance.updateVarianceHighlights();
    } else if (message.type === 'TOGGLE_CALCULATOR') {
      state.calculatorEnabled = message.enabled;
      if (!state.calculatorEnabled) {
        panels.removeSumPanel();
        state.selectedCells.clear();
        
        const highlightedCells = document.querySelectorAll('.betterbudgyt-cell-selected');
        highlightedCells.forEach(cell => {
          cell.classList.remove('betterbudgyt-cell-selected');
        });
        
        panels.updateSumPanel();
      }
    } else if (message.type === 'TOGGLE_COMPARISON_MODE') {
      state.comparisonModeEnabled = message.enabled;
      if (!state.comparisonModeEnabled) {
        const compareButton = document.querySelector('.betterbudgyt-compare-button');
        if (compareButton) {
          compareButton.remove();
        }
        
        comparison.selection.clearComparisonSelections();
      }
    } else if (message.type === 'TOGGLE_DEBUG_MODE') {
      state.debugModeEnabled = message.enabled;
      console.log(`Debug mode ${state.debugModeEnabled ? 'enabled' : 'disabled'}`);
    } else if (message.type === 'TOGGLE_SHOW_TOTAL_ONLY') {
      chrome.storage.sync.set({ showTotalOnlyEnabled: message.enabled });
      
      if (utils.isDataInputPage()) {
        if (message.enabled) {
          compactView.hideMonthColumns();
        } else {
          compactView.showMonthColumns();
        }
      } else if (utils.isDatasheetPage() && message.enabled) {
        compactView.applyCompactViewWithDelay(1000);
      }
      
      sendResponse({status: "Show total only toggled"});
    }
    
    sendResponse();
    return true;
  });

  // ==================== Initialization ====================

  // Initialize settings
  async function initializeSettings() {
    console.log('Initializing settings...');
    
    chrome.storage.sync.get({
      variance1: { minuend: 0, subtrahend: 1 },
      variance2: { minuend: 0, subtrahend: 2 }
    }, async (settings) => {
      console.log('Loaded settings:', settings);
      state.currentSettings = settings;
      
      variance.initializeVarianceHeaders();
      variance.updateVarianceCalculations();
      await variance.updateVarianceHeaders();
      
      console.log('Settings applied successfully');
    });
  }

  // Initialize all components
  async function initializeAll() {
    console.log('Initializing BetterBudgyt components...');
    
    // Set up URL change detection
    observers.setupUrlChangeDetection();
    
    // Set up zoom detection
    observers.setupZoomDetection();
    
    // Initialize scenario observer
    observers.initializeScenarioObserver();
    
    // Initialize row compare buttons
    comparison.selection.initRowCompareButtons();
    
    // Initialize comments feature
    if (comparison.comments && comparison.comments.init) {
      comparison.comments.init();
    }
    
    // Wait for table to be ready
    await new Promise((resolve) => {
      observers.waitForTable(() => {
        console.log('Table ready - initializing settings...');
        initializeSettings();
        observers.initializeTableObserver();
        
        // Load "Show Total Only" setting on page load
        utils.safeStorageGet({ showTotalOnlyEnabled: false }, (settings) => {
          if (settings.showTotalOnlyEnabled) {
            if (utils.isDataInputPage()) {
              console.log('Initial "Show Total Only" is enabled, hiding month columns.');
              compactView.hideMonthColumns();
            } else if (utils.isDatasheetPage()) {
              console.log('Initial "Show Total Only" is enabled and we are on a datasheet page.');
              compactView.applyCompactViewWithDelay();
            }
          }
        });
        
        resolve();
      });
    });
    
    console.log('All BetterBudgyt components initialized');
  }

  // Initialize as soon as possible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAll);
  } else {
    initializeAll();
  }

})();
