// BetterBudgyt - Compact View Feature
// Show/hide month columns functionality

(function() {
  'use strict';

  window.BetterBudgyt = window.BetterBudgyt || {};
  window.BetterBudgyt.features = window.BetterBudgyt.features || {};

  const { isDatasheetPage, isDataInputPage } = window.BetterBudgyt.utils;

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

  // Export to namespace
  window.BetterBudgyt.features.compactView = {
    hideMonthColumns,
    showMonthColumns,
    applyCompactViewWithDelay
  };

})();
