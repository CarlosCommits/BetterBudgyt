// BetterBudgyt - Comparison Selection
// Handles cell selection and compare button UI for comparison mode

(function() {
  'use strict';

  window.BetterBudgyt = window.BetterBudgyt || {};
  window.BetterBudgyt.features = window.BetterBudgyt.features || {};
  window.BetterBudgyt.features.comparison = window.BetterBudgyt.features.comparison || {};

  const state = window.BetterBudgyt.state;
  const { hasDatasheetLink, getDatasheetUrl, getColumnType, getAvailableColumns } = 
    window.BetterBudgyt.features.comparison.cellUtils;

  // Handle comparison mode cell selection
  function handleComparisonModeClick(cell) {
    if (!hasDatasheetLink(cell)) {
      return;
    }

    // Remove orange highlighting if present
    cell.classList.remove('betterbudgyt-cell-selected');

    if (state.comparisonSelectedCells.has(cell)) {
      // Remove from selection
      state.comparisonSelectedCells.delete(cell);
      state.comparisonSelectionOrder = state.comparisonSelectionOrder.filter(c => c !== cell);
      cell.classList.remove('betterbudgyt-compare-cell-1', 'betterbudgyt-compare-cell-2');
    } else {
      // Add to selection
      if (state.comparisonSelectionOrder.length >= 2) {
        const oldestCell = state.comparisonSelectionOrder.shift();
        state.comparisonSelectedCells.delete(oldestCell);
        oldestCell.classList.remove('betterbudgyt-compare-cell-1', 'betterbudgyt-compare-cell-2');
      }

      state.comparisonSelectionOrder.push(cell);
      const selectionIndex = state.comparisonSelectionOrder.length;
      
      const row = cell.closest('tr');
      const descriptionCell = row.querySelector('td[style*="z-index: 1"]');
      const description = descriptionCell ? descriptionCell.textContent.trim() : 'Unknown';
      const value = parseFloat(cell.textContent.replace(/[^0-9.-]+/g, '')) || 0;
      const url = getDatasheetUrl(cell);
      const columnType = getColumnType(cell);

      state.comparisonSelectedCells.set(cell, {
        description,
        value,
        url,
        columnType,
        selectionIndex
      });

      cell.classList.add(`betterbudgyt-compare-cell-${selectionIndex}`);
    }

    updateCompareButton();
  }

  // Create compare button
  function createCompareButton() {
    if (!state.comparisonModeEnabled) return;

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

    document.body.appendChild(button);

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
    
    if (state.comparisonSelectionOrder.length === 0) {
      if (button) {
        button.remove();
      }
      return;
    }

    if (!button) {
      button = createCompareButton();
    }

    const selection1Text = button.querySelector('#selection-1-text');
    const selection2Text = button.querySelector('#selection-2-text');
    const compareBtn = button.querySelector('#compareDatasheets');

    if (state.comparisonSelectionOrder.length >= 1) {
      const cell1Data = state.comparisonSelectedCells.get(state.comparisonSelectionOrder[0]);
      selection1Text.textContent = `${cell1Data.description} - ${cell1Data.columnType}`;
    } else {
      selection1Text.textContent = 'Select first cell...';
    }

    if (state.comparisonSelectionOrder.length >= 2) {
      const cell2Data = state.comparisonSelectedCells.get(state.comparisonSelectionOrder[1]);
      selection2Text.textContent = `${cell2Data.description} - ${cell2Data.columnType}`;
      compareBtn.disabled = false;
    } else {
      selection2Text.textContent = 'Select second cell...';
      compareBtn.disabled = true;
    }
  }

  // Clear comparison selections
  function clearComparisonSelections() {
    state.comparisonSelectedCells.clear();
    state.comparisonSelectionOrder = [];
    
    const comparisonCells = document.querySelectorAll('.betterbudgyt-compare-cell-1, .betterbudgyt-compare-cell-2');
    comparisonCells.forEach(cell => {
      cell.classList.remove('betterbudgyt-compare-cell-1', 'betterbudgyt-compare-cell-2');
    });

    updateCompareButton();
  }

  // Perform comparison
  function performComparison() {
    const { showComparisonLoadingIndicator, hideComparisonLoadingIndicator } = window.BetterBudgyt.ui.modals;
    const { openDatasheetsParallel } = window.BetterBudgyt.features.comparison.dataFetcher;
    const { showComparisonModal } = window.BetterBudgyt.features.comparison.modal;
    
    console.log('Performing comparison with:', state.comparisonSelectedCells);
    
    if (state.comparisonSelectionOrder.length < 2) {
      alert('Please select two cells to compare.');
      return;
    }
    
    const cell1 = state.comparisonSelectionOrder[0];
    const cell2 = state.comparisonSelectionOrder[1];
    const cell1Data = state.comparisonSelectedCells.get(cell1);
    const cell2Data = state.comparisonSelectedCells.get(cell2);
    
    cell1Data.cell = cell1;
    cell2Data.cell = cell2;
    
    showComparisonLoadingIndicator();
    
    openDatasheetsParallel(cell1Data, cell2Data)
      .then(result => {
        const comparisonData = result.data;
        comparisonData._refreshData = { cell1Data, cell2Data };
        comparisonData._refreshPromise = result.refreshPromise;
        hideComparisonLoadingIndicator();
        showComparisonModal(comparisonData);
        console.log('Comparison completed successfully' + (result.refreshPromise ? ' (background refresh in progress)' : ''));
      })
      .catch(error => {
        hideComparisonLoadingIndicator();
        console.error('Comparison error:', error);
        const msg = error?.message || 'Unknown error';
        if (msg.includes('Extension context invalidated')) {
          alert('Comparison failed because Chrome discarded the extension context. Please reload the page and try again.');
        } else {
          alert('Error comparing datasheets: ' + msg);
        }
      });
  }

  // Show column selector modal
  function showColumnSelectorModal(row) {
    const columns = getAvailableColumns(row);
    
    if (columns.length < 2) {
      alert('This row needs at least 2 comparable columns to perform a comparison.');
      return;
    }
    
    const descriptionCell = row.querySelector('td .label a, td .label span');
    const description = descriptionCell ? descriptionCell.textContent.trim() : 'Unknown Account';
    
    const existingModal = document.querySelector('.betterbudgyt-column-selector-modal');
    if (existingModal) existingModal.remove();
    
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
    
    const checkboxes = modal.querySelectorAll('input[name="column"]');
    const compareBtn = modal.querySelector('.betterbudgyt-column-selector-btn-compare');
    const cancelBtn = modal.querySelector('.betterbudgyt-column-selector-btn-cancel');
    const closeBtn = modal.querySelector('.betterbudgyt-column-selector-close');
    
    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        const checked = modal.querySelectorAll('input[name="column"]:checked');
        
        if (checked.length > 2) {
          checkboxes.forEach(c => {
            if (c !== cb && c.checked) {
              c.checked = false;
              return;
            }
          });
        }
        
        const currentChecked = modal.querySelectorAll('input[name="column"]:checked');
        compareBtn.disabled = currentChecked.length !== 2;
      });
    });
    
    compareBtn.addEventListener('click', () => {
      const checked = Array.from(modal.querySelectorAll('input[name="column"]:checked'));
      if (checked.length !== 2) return;
      
      const col1Index = parseInt(checked[0].value);
      const col2Index = parseInt(checked[1].value);
      
      modal.remove();
      performRowComparison(row, columns[col1Index], columns[col2Index]);
    });
    
    const closeModal = () => modal.remove();
    cancelBtn.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
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
    const { showComparisonLoadingIndicator, hideComparisonLoadingIndicator } = window.BetterBudgyt.ui.modals;
    const { openDatasheetsParallel } = window.BetterBudgyt.features.comparison.dataFetcher;
    const { showComparisonModal } = window.BetterBudgyt.features.comparison.modal;
    
    const descriptionCell = row.querySelector('td .label a, td .label span');
    const description = descriptionCell ? descriptionCell.textContent.trim() : 'Unknown Account';
    
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
    
    showComparisonLoadingIndicator();
    
    openDatasheetsParallel(cell1Data, cell2Data)
      .then(result => {
        const comparisonData = result.data;
        comparisonData.accountName = description;
        comparisonData._refreshData = { cell1Data, cell2Data };
        comparisonData._refreshPromise = result.refreshPromise;
        hideComparisonLoadingIndicator();
        showComparisonModal(comparisonData);
        console.log('Row comparison completed successfully' + (result.refreshPromise ? ' (background refresh in progress)' : ''));
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
    if (row.querySelector('.betterbudgyt-row-compare-btn')) return;
    
    const columns = getAvailableColumns(row);
    if (columns.length < 2) return;
    
    const descriptionCell = row.querySelector('td[style*="z-index: 1"]');
    if (!descriptionCell) return;
    
    let targetContainer = descriptionCell.querySelector('.row-icons');
    if (!targetContainer) {
      targetContainer = descriptionCell.querySelector('.label');
    }
    if (!targetContainer) return;
    
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
    
    compareBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const columns = getAvailableColumns(row);
      
      if (columns.length === 2) {
        performRowComparison(row, columns[0], columns[1]);
      } else if (columns.length > 2) {
        showColumnSelectorModal(row);
      } else {
        alert('This row needs at least 2 comparable columns.');
      }
    });
    
    if (targetContainer.classList.contains('row-icons')) {
      targetContainer.insertBefore(compareBtn, targetContainer.firstChild);
    } else {
      const rowIcons = document.createElement('div');
      rowIcons.className = 'row-icons';
      rowIcons.appendChild(compareBtn);
      targetContainer.appendChild(rowIcons);
    }
  }

  // Setup observer to inject compare buttons into level 4 rows
  function setupRowCompareButtons() {
    const level4Rows = document.querySelectorAll('tr.data-row[data-level="4"]');
    level4Rows.forEach(row => injectRowCompareButton(row));
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches && node.matches('tr.data-row[data-level="4"]')) {
              injectRowCompareButton(node);
            }
            const childRows = node.querySelectorAll ? node.querySelectorAll('tr.data-row[data-level="4"]') : [];
            childRows.forEach(row => injectRowCompareButton(row));
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    console.log('Row compare buttons setup complete');
  }

  // Initialize row compare buttons when on comparison page
  function initRowCompareButtons() {
    const isPnLPage = window.location.href.includes('comp-ytd') || 
                      window.location.href.includes('comparison') ||
                      document.querySelector('table.table.table-striped');
    
    if (isPnLPage) {
      setTimeout(() => {
        setupRowCompareButtons();
      }, 1000);
    }
  }

  // Export to namespace
  window.BetterBudgyt.features.comparison.selection = {
    handleComparisonModeClick,
    createCompareButton,
    updateCompareButton,
    clearComparisonSelections,
    performComparison,
    showColumnSelectorModal,
    performRowComparison,
    injectRowCompareButton,
    setupRowCompareButtons,
    initRowCompareButtons
  };

})();
