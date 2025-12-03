// BetterBudgyt - Observers
// MutationObservers for table changes, scenarios, and URL tracking

(function() {
  'use strict';

  window.BetterBudgyt = window.BetterBudgyt || {};

  const { safeStorageGet, isDatasheetPage, isDataInputPage } = window.BetterBudgyt.utils;
  const state = window.BetterBudgyt.state;
  const { updateColumnSelectors } = window.BetterBudgyt;

  // Helper function to check if scenarios have changed
  function scenariosChanged(oldScenarios, newScenarios) {
    return !oldScenarios || 
           oldScenarios.length !== newScenarios.length ||
           oldScenarios.some((s, i) => s !== newScenarios[i]);
  }

  // Scenario detection observer
  const scenarioObserver = new MutationObserver(() => {
    const scenario1Element = document.querySelector('span#select2-chosen-52');
    const scenario2Element = document.querySelector('span#select2-chosen-54');
    
    const scenario3Element = Array.from(
      document.querySelectorAll('div.select2-container.select2me.comp-budget-list.select2me-large a span.select2-chosen')
    ).find(span => span.id !== 'select2-chosen-54');
    
    const newScenarios = [
      scenario1Element?.textContent.trim() || 'Scenario 1',
      scenario2Element?.textContent.trim() || 'Scenario 2',
      scenario3Element?.textContent.trim() || 'Scenario 3'
    ];
    
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

  // Initialize scenario observer
  function initializeScenarioObserver(maxAttempts = 20) {
    let attempts = 0;
    
    function tryObserve() {
      const container1 = document.querySelector('.dashboardLabels.year-list');
      const container2 = document.querySelector('.dashboardLabels.comparisionBudget1Year');
      const container3 = document.querySelector('.dashboardLabels.comparisionBudget2Year');
      
      if (container1 && container2 && container3) {
        scenarioObserver.observe(container1, { childList: true, subtree: true });
        scenarioObserver.observe(container2, { childList: true, subtree: true });
        scenarioObserver.observe(container3, { childList: true, subtree: true });
        
        // Trigger initial scan
        const scenario1Element = document.querySelector('span#select2-chosen-52');
        const scenario2Element = document.querySelector('span#select2-chosen-54');
        
        const scenario3Element = Array.from(
          document.querySelectorAll('div.select2-container.select2me.comp-budget-list.select2me-large a span.select2-chosen')
        ).find(span => span.id !== 'select2-chosen-54');
        
        const initialScenarios = [
          scenario1Element?.textContent.trim() || 'Scenario 1',
          scenario2Element?.textContent.trim() || 'Scenario 2',
          scenario3Element?.textContent.trim() || 'Scenario 3'
        ];
        
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

  // Table mutation observer
  let tableObserver = null;

  function createTableObserver() {
    return new MutationObserver(async (mutations) => {
      const { updateVarianceCalculations, updateVarianceHeaders } = window.BetterBudgyt.features.variance;
      const { hideMonthColumns } = window.BetterBudgyt.features.compactView;
      
      mutations.forEach(async mutation => {
        if (mutation.addedNodes.length) {
          updateVarianceCalculations();
          await updateVarianceHeaders();
          
          safeStorageGet({ showTotalOnlyEnabled: false }, (settings) => {
            if (settings.showTotalOnlyEnabled && isDatasheetPage()) {
              console.log('Table mutation detected - applying compact view');
              hideMonthColumns();
            }
          });
        }
      });
    });
  }

  // Initialize table observer
  function initializeTableObserver() {
    const dashboardTable = document.querySelector('table.table');
    if (dashboardTable) {
      if (!tableObserver) {
        tableObserver = createTableObserver();
      }
      tableObserver.observe(dashboardTable, {
        childList: true,
        subtree: true
      });
      
      const { updateVarianceCalculations } = window.BetterBudgyt.features.variance;
      updateVarianceCalculations();
    }
  }

  // Wait for table to load
  function waitForTable(callback, maxAttempts = 20) {
    let attempts = 0;
    
    function checkTable() {
      const table = document.querySelector('table');
      const varianceColumns = document.querySelectorAll('th.hideVarianceInBudgetComp');
      const dataRows = document.querySelectorAll('.lybudgetVal-toprow, .actualbudgetVal-toprow, .comparebudgetVal-toprow');
      
      if (table && varianceColumns.length > 0 && dataRows.length > 0) {
        console.log('Table fully loaded with variance columns and data rows');
        callback();
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(checkTable, 500);
      } else {
        console.warn('Max attempts reached waiting for table elements');
      }
    }
    
    checkTable();
  }

  // URL change detection
  function setupUrlChangeDetection() {
    console.log('Setting up URL change detection');
    const { applyCompactViewWithDelay } = window.BetterBudgyt.features.compactView;
    
    function handleUrlChange() {
      if (state.lastUrl !== window.location.href) {
        console.log(`URL changed from ${state.lastUrl} to ${window.location.href}`);
        state.lastUrl = window.location.href;
        
        safeStorageGet({ showTotalOnlyEnabled: false }, (settings) => {
          if (settings.showTotalOnlyEnabled && isDatasheetPage()) {
            console.log('Show total only is enabled and we are on a datasheet page');
            applyCompactViewWithDelay();
          }
        });
      }
    }
    
    const urlObserver = new MutationObserver(() => {
      handleUrlChange();
    });
    
    urlObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    window.addEventListener('popstate', () => {
      console.log('Popstate event detected');
      handleUrlChange();
    });
    
    setInterval(() => {
      handleUrlChange();
    }, 2000);
    
    // Total cell observer
    const totalCellObserver = new MutationObserver(() => {
      const { hideMonthColumns } = window.BetterBudgyt.features.compactView;
      
      const totalCells = document.querySelectorAll('td[title="Total"], th[title="Total"]');
      if (totalCells.length > 0) {
        safeStorageGet({ showTotalOnlyEnabled: false }, (settings) => {
          if (settings.showTotalOnlyEnabled && isDatasheetPage()) {
            hideMonthColumns();
          }
        });
      }
    });
    
    totalCellObserver.observe(document, {
      childList: true,
      subtree: true
    });
  }

  // Zoom/resize detection
  function setupZoomDetection() {
    console.log('Setting up zoom detection');
    const { hideMonthColumns } = window.BetterBudgyt.features.compactView;
    
    window.addEventListener('resize', () => {
      safeStorageGet({ showTotalOnlyEnabled: false }, (settings) => {
        if (settings.showTotalOnlyEnabled && isDatasheetPage()) {
          console.log('Zoom/resize detected - reapplying compact view');
          hideMonthColumns();
        }
      });
    });
    
    setInterval(() => {
      safeStorageGet({ showTotalOnlyEnabled: false }, (settings) => {
        if (settings.showTotalOnlyEnabled && isDatasheetPage()) {
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
    }, 5000);
  }

  // Export to namespace
  window.BetterBudgyt.observers = {
    scenariosChanged,
    initializeScenarioObserver,
    createTableObserver,
    initializeTableObserver,
    waitForTable,
    setupUrlChangeDetection,
    setupZoomDetection
  };

})();
