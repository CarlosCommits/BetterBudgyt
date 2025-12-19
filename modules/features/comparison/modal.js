// BetterBudgyt - Comparison Modal
// Modal display and table generation for datasheet comparison

(function() {
  'use strict';

  window.BetterBudgyt = window.BetterBudgyt || {};
  window.BetterBudgyt.features = window.BetterBudgyt.features || {};
  window.BetterBudgyt.features.comparison = window.BetterBudgyt.features.comparison || {};

  const { formatNumber, stripNumberPrefix, escapeHtml } = window.BetterBudgyt.utils;
  const { cleanupMinimizedTabsContainer, showNoteModal } = window.BetterBudgyt.ui.modals;
  const state = window.BetterBudgyt.state;

  const MONTH_ORDER = { 'Apr': 1, 'May': 2, 'Jun': 3, 'Jul': 4, 'Aug': 5, 'Sep': 6, 'Oct': 7, 'Nov': 8, 'Dec': 9, 'Jan': 10, 'Feb': 11, 'Mar': 12 };

  function getFirstActiveMonthIndex(monthly) {
    if (!monthly) return 14;
    const activeCount = Object.keys(MONTH_ORDER).filter(m => monthly[m] && monthly[m] !== 0).length;
    if (activeCount === 12) return 13;
    for (const month of Object.keys(MONTH_ORDER)) {
      if (monthly[month] && monthly[month] !== 0) {
        return MONTH_ORDER[month];
      }
    }
    return 14;
  }

  function sortTransactions(transactions, sortField, sortDirection) {
    if (!sortField || !transactions) return transactions;
    
    const sorted = [...transactions];
    const dir = sortDirection === 'desc' ? -1 : 1;
    
    sorted.sort((a, b) => {
      let valA, valB;
      
      if (sortField === 'description') {
        valA = (a.description || '').toLowerCase();
        valB = (b.description || '').toLowerCase();
        return dir * valA.localeCompare(valB);
      } else if (sortField === 'vendor') {
        valA = stripNumberPrefix(a.vendor || '').toLowerCase();
        valB = stripNumberPrefix(b.vendor || '').toLowerCase();
        return dir * valA.localeCompare(valB);
      } else if (sortField === 'total') {
        valA = a.total || 0;
        valB = b.total || 0;
        return dir * (valA - valB);
      } else if (sortField === 'month') {
        valA = getFirstActiveMonthIndex(a.monthly);
        valB = getFirstActiveMonthIndex(b.monthly);
        return dir * (valA - valB);
      }
      return 0;
    });
    
    return sorted;
  }

  function buildSortableHeader(field, label, currentSort, datasetNum, extraClass = '') {
    const isActive = currentSort.field === field;
    const direction = isActive ? currentSort.direction : 'none';
    const arrow = direction === 'asc' ? ' ▲' : direction === 'desc' ? ' ▼' : '';
    const activeClass = isActive ? ' sortable-active' : '';
    return `<th class="sortable-header${activeClass}${extraClass ? ' ' + extraClass : ''}" data-sort-field="${field}" data-dataset="${datasetNum}">${label}${arrow}</th>`;
  }

  // Download attached file - primes session then opens download URL
  async function downloadAttachedFile(folderName, dataHref) {
    try {
      // Prime the budget session first if we have dataHref
      if (dataHref) {
        const baseUrl = window.location.origin;
        await fetch(baseUrl + dataHref, { method: 'GET', credentials: 'same-origin' });
      }
      // Open download - correct URL format is /Budget/DownloadSubCatDocument/{uuid}
      const downloadUrl = '/Budget/DownloadSubCatDocument/' + encodeURIComponent(folderName);
      window.open(downloadUrl, '_blank');
    } catch (e) {
      console.error('Failed to download file:', e);
      alert('Failed to download file. Please try again.');
    }
  }

  const NO_SORT = { field: null, direction: 'asc' };
  const MONTH_SORT_DEFAULT = { field: 'month', direction: 'asc' };

  // Get 3-letter month abbreviations for months with non-zero values
  // Returns 'All' if all 12 months have values (cleaner display)
  function getActiveMonths(monthly, months) {
    if (!monthly) return '';
    const activeMonths = months.filter(m => monthly[m] && monthly[m] !== 0);
    if (activeMonths.length === 12) return 'All';
    return activeMonths.join(', ');
  }

  function generateTransactionRowsHtml(transactions, datasetInfo, months, hideMonths) {
    let html = '';
    transactions.forEach(t => {
      const noteIcon = t.note ? `<span class="betterbudgyt-note-icon" data-note="${escapeHtml(t.note)}" data-desc="${escapeHtml(t.description || 'No Description')}" title="Click to view note">📝</span>` : '';
      const fileIcon = t.fileAttachment?.hasFile ? `<span class="betterbudgyt-file-icon" data-folder="${escapeHtml(t.fileAttachment.folderName)}" data-href="${escapeHtml(datasetInfo.dataHref || '')}" title="Click to download file">📎</span>` : '';
      const hasUID = !!t.plElementUID;
      const descHasComment = t.comments?.description && hasUID;
      const vendorHasComment = t.comments?.vendor && hasUID;
      const totalHasComment = t.comments?.total && hasUID;
      const descAttrs = hasUID ? ` data-pl-element-uid="${t.plElementUID}" data-field="description" data-desc="${escapeHtml(t.description || 'No Description')}"` : '';
      const vendorAttrs = hasUID ? ` data-pl-element-uid="${t.plElementUID}" data-field="vendor" data-desc="${escapeHtml(t.description || 'No Description')}"` : '';
      const totalAttrs = hasUID ? ` data-pl-element-uid="${t.plElementUID}" data-field="total" data-desc="${escapeHtml(t.description || 'No Description')}"` : '';
      const rowClasses = [t.note ? 'has-note' : '', t.fileAttachment?.hasFile ? 'has-file' : ''].filter(Boolean).join(' ');
      html += `
        <tr${rowClasses ? ` class="${rowClasses}"` : ''}>
          <td class="betterbudgyt-mini-desc${hasUID ? ' clickable-comment' : ''}${descHasComment ? ' has-comment' : ''}"${descAttrs}>${fileIcon}${noteIcon}${t.description || 'No Description'}</td>
          <td class="betterbudgyt-mini-vendor${hasUID ? ' clickable-comment' : ''}${vendorHasComment ? ' has-comment' : ''}"${vendorAttrs}>${stripNumberPrefix(t.vendor) || '-'}</td>
          ${hideMonths ? `<td class="betterbudgyt-mini-month">${getActiveMonths(t.monthly, months)}</td>` : months.map(m => {
            const val = Math.abs(t.monthly?.[m] || 0);
            const isCompact = val >= 10000;
            const hasComment = t.comments?.[m] && hasUID;
            const monthAttrs = hasUID ? ` data-pl-element-uid="${t.plElementUID}" data-field="${m}" data-desc="${escapeHtml(t.description || 'No Description')}"` : '';
            return `<td class="betterbudgyt-mini-value${isCompact ? ' compact-value' : ''}${hasUID ? ' clickable-comment' : ''}${hasComment ? ' has-comment' : ''}"${monthAttrs}>${formatNumber(t.monthly?.[m] || 0)}</td>`;
          }).join('')}
          <td class="betterbudgyt-mini-total${hasUID ? ' clickable-comment' : ''}${totalHasComment ? ' has-comment' : ''}"${totalAttrs}>${formatNumber(t.total || 0)}</td>
        </tr>
      `;
    });
    return html;
  }

  // Generate transaction details for a department
  function generateDeptTransactionsHtml(deptData, comparisonData, months, hideMonths, sortState1 = NO_SORT, sortState2 = NO_SORT) {
    let html = '<div class="betterbudgyt-transactions-grid">';
    
    // Check editability and lock status for each dataset
    const dataset1Editable = comparisonData.dataset1.isEditable;
    const dataset2Editable = comparisonData.dataset2.isEditable;
    const dataset1LockedMonths = comparisonData.dataset1.lockedMonths || [];
    const dataset2LockedMonths = comparisonData.dataset2.lockedMonths || [];
    const dataset1AllLocked = dataset1LockedMonths.length >= 12;
    const dataset2AllLocked = dataset2LockedMonths.length >= 12;
    const dataset1HasLocks = dataset1LockedMonths.length > 0;
    const dataset2HasLocks = dataset2LockedMonths.length > 0;
    
    // Helper to build add transaction button
    function buildAddTxBtn(datasetNum, isEditable, allLocked, hasLocks, lockedMonths, dataType, deptData) {
      if (!isEditable) {
        // Not editable - no button
        return '';
      }
      
      if (allLocked) {
        // All months locked - show disabled button with tooltip
        return `
          <button class="betterbudgyt-section-add-tx-btn disabled" 
                  disabled
                  title="All months are locked - cannot add transactions">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        `;
      }
      
      // Some or no months locked - show enabled button
      const lockInfo = hasLocks ? ` (${12 - lockedMonths.length} months unlocked)` : '';
      return `
        <button class="betterbudgyt-section-add-tx-btn" 
                data-dataset="${datasetNum}" 
                data-store-uid="${deptData.storeUID}" 
                data-dept-name="${escapeHtml(deptData.name || deptData['dataset' + datasetNum]?.departmentName || '')}"
                title="Add transaction to ${escapeHtml(dataType)}${lockInfo}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      `;
    }
    
    // Helper to build lock indicator
    function buildLockIndicator(lockedMonths, allLocked) {
      if (allLocked) {
        return `<span class="betterbudgyt-section-lock-indicator all-locked" title="All months locked">&#128274;</span>`;
      } else if (lockedMonths.length > 0) {
        return `<span class="betterbudgyt-section-lock-indicator partial-locked" title="${lockedMonths.length} month(s) locked: ${lockedMonths.join(', ')}">&#128274;</span>`;
      }
      return '';
    }
    
    // Build components for dataset 1
    const addTxBtn1 = buildAddTxBtn(1, dataset1Editable, dataset1AllLocked, dataset1HasLocks, dataset1LockedMonths, comparisonData.dataset1.dataType, deptData);
    const lockIndicator1 = buildLockIndicator(dataset1LockedMonths, dataset1AllLocked);
    
    // Dataset 1 transactions
    html += `
      <div class="betterbudgyt-transactions-section betterbudgyt-transactions-section-1">
        <div class="betterbudgyt-transactions-section-header">
          <span class="betterbudgyt-section-header-title">${comparisonData.dataset1.dataType}${lockIndicator1}</span>
          ${addTxBtn1}
        </div>
    `;
    
    if (deptData.dataset1?.transactions?.length > 0) {
      const sortedTxns1 = sortTransactions(deptData.dataset1.transactions, sortState1.field, sortState1.direction);
      html += `
        <table class="betterbudgyt-mini-table${hideMonths ? ' hide-months-mode' : ''}" data-dataset="1" data-dept="${deptData.storeUID}">
          <thead>
            <tr>
              ${buildSortableHeader('description', 'Description', sortState1, 1)}
              ${buildSortableHeader('vendor', 'Vendor', sortState1, 1)}
              ${hideMonths ? buildSortableHeader('month', 'Month', sortState1, 1) : months.map(m => `<th>${m}</th>`).join('')}
              ${buildSortableHeader('total', 'Total', sortState1, 1, 'betterbudgyt-total-col')}
            </tr>
          </thead>
          <tbody>
            ${generateTransactionRowsHtml(sortedTxns1, comparisonData.dataset1, months, hideMonths)}
          </tbody>
        </table>
      `;
    } else {
      html += '<div class="betterbudgyt-no-transactions">No transactions</div>';
    }
    html += '</div>';
    
    // Build components for dataset 2
    const addTxBtn2 = buildAddTxBtn(2, dataset2Editable, dataset2AllLocked, dataset2HasLocks, dataset2LockedMonths, comparisonData.dataset2.dataType, deptData);
    const lockIndicator2 = buildLockIndicator(dataset2LockedMonths, dataset2AllLocked);
    
    // Dataset 2 transactions
    html += `
      <div class="betterbudgyt-transactions-section betterbudgyt-transactions-section-2">
        <div class="betterbudgyt-transactions-section-header">
          <span class="betterbudgyt-section-header-title">${comparisonData.dataset2.dataType}${lockIndicator2}</span>
          ${addTxBtn2}
        </div>
    `;
    
    if (deptData.dataset2?.transactions?.length > 0) {
      const sortedTxns2 = sortTransactions(deptData.dataset2.transactions, sortState2.field, sortState2.direction);
      html += `
        <table class="betterbudgyt-mini-table${hideMonths ? ' hide-months-mode' : ''}" data-dataset="2" data-dept="${deptData.storeUID}">
          <thead>
            <tr>
              ${buildSortableHeader('description', 'Description', sortState2, 2)}
              ${buildSortableHeader('vendor', 'Vendor', sortState2, 2)}
              ${hideMonths ? buildSortableHeader('month', 'Month', sortState2, 2) : months.map(m => `<th>${m}</th>`).join('')}
              ${buildSortableHeader('total', 'Total', sortState2, 2, 'betterbudgyt-total-col')}
            </tr>
          </thead>
          <tbody>
            ${generateTransactionRowsHtml(sortedTxns2, comparisonData.dataset2, months, hideMonths)}
          </tbody>
        </table>
      `;
    } else {
      html += '<div class="betterbudgyt-no-transactions">No transactions</div>';
    }
    html += '</div>';
    
    html += '</div>';
    return html;
  }

  // Generate comparison table HTML
  function generateComparisonTable(comparisonData, hideMonths = false, classTotalsOnly = false) {
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    
    // Build department map
    const departmentMap = new Map();
    
    (comparisonData.dataset1.departments || []).forEach(dept => {
      const key = dept.departmentName || dept.storeUID;
      departmentMap.set(key, {
        name: dept.departmentName,
        storeUID: dept.storeUID,
        dataset1: dept,
        dataset2: null
      });
    });
    
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
    
    const getDeptTotal = (dept) => {
      if (!dept) return 0;
      if (dept.totals?.total) return dept.totals.total;
      return (dept.transactions || []).reduce((sum, t) => sum + (t.total || 0), 0);
    };
    
    const isSingleDepartment = departmentMap.size === 1;
    
    let tableHtml = `<div class="betterbudgyt-dept-comparison-list">`;
    
    departmentMap.forEach((deptData, deptName) => {
      const d1Total = getDeptTotal(deptData.dataset1);
      const d2Total = getDeptTotal(deptData.dataset2);
      const variance = d1Total - d2Total;
      const varianceClass = variance > 0 ? 'positive' : variance < 0 ? 'negative' : 'zero';
      
      const d1Count = deptData.dataset1?.transactions?.length || 0;
      const d2Count = deptData.dataset2?.transactions?.length || 0;
      
      if (isSingleDepartment) {
        const defaultSort = hideMonths ? MONTH_SORT_DEFAULT : NO_SORT;
        tableHtml += `
          <div class="betterbudgyt-dept-card betterbudgyt-single-dept expanded" data-dept="${deptData.storeUID}">
            <div class="betterbudgyt-single-dept-header">
              <span class="betterbudgyt-dept-name">${stripNumberPrefix(deptName)}</span>
            </div>

            <div class="betterbudgyt-dept-card-body" style="display: block;">
              ${!classTotalsOnly ? generateDeptTransactionsHtml(deptData, comparisonData, months, hideMonths, defaultSort, defaultSort) : '<div class="betterbudgyt-no-transactions">Class totals only mode</div>'}
            </div>
          </div>
        `;
      } else {
        const defaultSort = hideMonths ? MONTH_SORT_DEFAULT : NO_SORT;
        tableHtml += `
          <div class="betterbudgyt-dept-card" data-dept="${deptData.storeUID}">
            <div class="betterbudgyt-dept-card-header">
              <div class="betterbudgyt-dept-card-title">
                <span class="betterbudgyt-dept-expand-btn">▶</span>
                <span class="betterbudgyt-dept-name">${stripNumberPrefix(deptName)}</span>
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
              ${!classTotalsOnly ? generateDeptTransactionsHtml(deptData, comparisonData, months, hideMonths, defaultSort, defaultSort) : '<div class="betterbudgyt-no-transactions">Class totals only mode</div>'}
            </div>
          </div>
        `;
      }
    });
    
    tableHtml += `</div>`;
    return tableHtml;
  }

  // Export comparison to Excel/CSV
  function exportComparisonToExcel(comparisonData, hideMonths = false, filterMode = 'all') {
    const excelExport = window.BetterBudgyt.features.comparison.excelExport;
    if (!excelExport || !excelExport.exportComparisonToExcel) {
      alert('Excel export module not loaded. Please reload the page and try again.');
      return;
    }

    // New export always creates two tabs (Total + Months).
    // We keep `hideMonths` for backward compatibility with callers.
    excelExport.exportComparisonToExcel(comparisonData, filterMode);
  }


  // Show comparison modal

  function showComparisonModal(comparisonData) {
    const modalId = `comparison-modal-${++state.comparisonModalCounter}`;
    
    // Store comparison data in Map keyed by modalId for multi-modal support
    state.comparisonDataByModal.set(modalId, comparisonData);
    
    // Also set legacy global reference (points to last opened modal)
    state.currentComparisonData = comparisonData;
    
    const modal = document.createElement('div');
    modal.className = 'betterbudgyt-comparison-modal';
    modal.dataset.modalId = modalId;
    
    const dataset1DeptCount = comparisonData.dataset1.departments?.length || 0;
    const dataset2DeptCount = comparisonData.dataset2.departments?.length || 0;
    
    const dataset1Total = comparisonData.dataset1.grandTotals?.total || comparisonData.dataset1.totals?.total || 0;
    const dataset2Total = comparisonData.dataset2.grandTotals?.total || comparisonData.dataset2.totals?.total || 0;
    const difference = dataset1Total - dataset2Total;
    
    chrome.storage.sync.get({ hideMonthsDefault: true }, (settings) => {
      const hideMonths = settings.hideMonthsDefault;
      
      const headerTitle = comparisonData.accountName 
        ? `📊 Datasheet Comparison - ${stripNumberPrefix(comparisonData.accountName)}`
        : '📊 Datasheet Comparison';
      
      modal.innerHTML = `
        <div class="betterbudgyt-comparison-modal-content">
          <div class="betterbudgyt-comparison-modal-header">
            <h2>${headerTitle}</h2>
            <div class="betterbudgyt-refresh-indicator" style="display: none;">
              <svg class="betterbudgyt-refresh-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                <path d="M16 21h5v-5"></path>
              </svg>
              <span>Refreshing data...</span>
            </div>
            <div class="betterbudgyt-comparison-modal-controls">
              <button class="betterbudgyt-comparison-modal-export" title="Export to Excel">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </button>
              <button class="betterbudgyt-comparison-modal-refresh" title="Refresh data">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                  <path d="M16 21h5v-5"></path>
                </svg>
              </button>
              <button class="betterbudgyt-comparison-modal-minimize" title="Minimize">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14"></path>
                </svg>
              </button>
              <button class="betterbudgyt-comparison-modal-close" title="Close">&times;</button>
            </div>
          </div>
          <div class="betterbudgyt-comparison-modal-body">
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
            
            <div class="betterbudgyt-comparison-toolbar">
              <div class="betterbudgyt-search-wrapper">
                <div class="betterbudgyt-search-container">
                  <svg class="betterbudgyt-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                  <input type="text" class="betterbudgyt-search-input" id="comparisonSearch" placeholder="Search departments, descriptions, vendors...">
                  <button class="betterbudgyt-search-clear" type="button" title="Clear search" style="display: none;">&times;</button>
                </div>
                <span class="betterbudgyt-search-counter" style="display: none;"></span>
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
            
            <div class="betterbudgyt-comparison-table-container">
              ${generateComparisonTable(comparisonData, hideMonths, false)}
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Auto-expand single department
      const deptCards = modal.querySelectorAll('.betterbudgyt-dept-card');
      if (deptCards.length === 1) {
        const card = deptCards[0];
        card.classList.add('expanded');
        const body = card.querySelector('.betterbudgyt-dept-card-body');
        if (body) body.style.display = 'block';
      }
      
      // Setup search functionality
      setupModalSearch(modal);
      
      // Setup filter chips
      setupFilterChips(modal);
      
      // Setup card expand/collapse
      setupCardToggle(modal);
      
      // Setup sortable headers
      setupSortableHeaders(modal, comparisonData);
      
      // Setup hide months toggle
      setupHideMonthsToggle(modal, comparisonData, hideMonths);
      
      // Setup control buttons
      setupModalControls(modal, modalId, comparisonData, hideMonths);
      
      // Setup context menu
      const contextMenu = window.BetterBudgyt.features.comparison.contextMenu;
      if (contextMenu?.setupContextMenuHandlers) {
        contextMenu.setupContextMenuHandlers(modal, comparisonData);
      }
      
      // Handle background refresh if data was served from cache
      if (comparisonData._refreshPromise) {
        const refreshIndicator = modal.querySelector('.betterbudgyt-refresh-indicator');
        if (refreshIndicator) {
          refreshIndicator.style.display = 'flex';
        }
        
        comparisonData._refreshPromise
          .then(freshData => {
            // Check if modal is still open
            if (!document.body.contains(modal)) {
              console.log('Modal closed, skipping refresh update');
              return;
            }
            
            // Update the comparison data
            comparisonData.dataset1 = freshData.dataset1;
            comparisonData.dataset2 = freshData.dataset2;
            state.comparisonDataByModal.set(modalId, comparisonData);
            state.currentComparisonData = comparisonData;
            
            // Update summary cards with fresh totals and counts
            const summaryCards = modal.querySelectorAll('.betterbudgyt-summary-card');
            if (summaryCards.length >= 3) {
              // Dataset 1 totals
              const d1Value = summaryCards[0].querySelector('.betterbudgyt-summary-card-value');
              const d1Subtitle = summaryCards[0].querySelector('.betterbudgyt-summary-card-subtitle');
              const d1Total = freshData.dataset1.grandTotals?.total || freshData.dataset1.totals?.total || 0;
              const d1DeptCount = freshData.dataset1.departments?.length || 0;
              const d1TxCount = freshData.dataset1.transactions?.length || 0;
              if (d1Value) d1Value.textContent = formatNumber(d1Total);
              if (d1Subtitle) d1Subtitle.textContent = `${d1DeptCount} departments · ${d1TxCount} transactions`;
              
              // Dataset 2 totals
              const d2Value = summaryCards[1].querySelector('.betterbudgyt-summary-card-value');
              const d2Subtitle = summaryCards[1].querySelector('.betterbudgyt-summary-card-subtitle');
              const d2Total = freshData.dataset2.grandTotals?.total || freshData.dataset2.totals?.total || 0;
              const d2DeptCount = freshData.dataset2.departments?.length || 0;
              const d2TxCount = freshData.dataset2.transactions?.length || 0;
              if (d2Value) d2Value.textContent = formatNumber(d2Total);
              if (d2Subtitle) d2Subtitle.textContent = `${d2DeptCount} departments · ${d2TxCount} transactions`;
              
              // Variance
              const diffValue = summaryCards[2].querySelector('.betterbudgyt-summary-card-value');
              if (diffValue) diffValue.textContent = formatNumber(d1Total - d2Total);
            }
            
            // Re-render the table content
            const tableContainer = modal.querySelector('.betterbudgyt-comparison-table-container');
            if (tableContainer) {
              // Preserve expanded department states
              const expandedDepts = [];
              modal.querySelectorAll('.betterbudgyt-dept-card.expanded').forEach(card => {
                expandedDepts.push(card.dataset.dept);
              });
              
              const currentHideMonths = modal.querySelector('#hideMonthsToggle')?.checked ?? hideMonths;
              const currentClassTotalsOnly = modal.querySelector('#classTotalsOnlyToggle')?.checked ?? false;
              tableContainer.innerHTML = generateComparisonTable(comparisonData, currentHideMonths, currentClassTotalsOnly);
              
              // Restore expanded states
              expandedDepts.forEach(deptId => {
                const card = tableContainer.querySelector(`.betterbudgyt-dept-card[data-dept="${deptId}"]`);
                if (card) {
                  card.classList.add('expanded');
                  const body = card.querySelector('.betterbudgyt-dept-card-body');
                  if (body) body.style.display = 'block';
                }
              });
              
              // Note: Card toggle listener is already on modal (event delegation), no need to re-add
              
              // Re-setup context menu handlers
              const { setupContextMenuHandlers } = window.BetterBudgyt.features.comparison.contextMenu;
              if (setupContextMenuHandlers) {
                setupContextMenuHandlers(modal, comparisonData);
              }
            }
            
            // Hide the refresh indicator
            if (refreshIndicator) {
              refreshIndicator.style.display = 'none';
            }
            
            console.log('✓ Modal updated with fresh data');
          })
          .catch(error => {
            console.error('Background refresh failed:', error);
            // Hide indicator on error too
            const refreshIndicator = modal.querySelector('.betterbudgyt-refresh-indicator');
            if (refreshIndicator) {
              refreshIndicator.style.display = 'none';
            }
          });
      }
    });
  }

  // Setup modal search
  function setupModalSearch(modal) {
    const searchInput = modal.querySelector('#comparisonSearch');
    const searchCounter = modal.querySelector('.betterbudgyt-search-counter');
    const clearBtn = modal.querySelector('.betterbudgyt-search-clear');
    let currentMatchIndex = 0;
    let allMatches = [];
    
    const clearHighlights = () => {
      modal.querySelectorAll('.betterbudgyt-search-highlight').forEach(el => {
        const parent = el.parentNode;
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize();
      });
      allMatches = [];
      currentMatchIndex = 0;
    };
    
    const highlightText = (element, searchTerm) => {
      if (!searchTerm || !element) return;
      
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        if (node.textContent.toLowerCase().includes(searchTerm.toLowerCase())) {
          textNodes.push(node);
        }
      }
      
      textNodes.forEach(textNode => {
        const text = textNode.textContent;
        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        
        if (parts.length > 1) {
          const fragment = document.createDocumentFragment();
          parts.forEach(part => {
            if (part.toLowerCase() === searchTerm.toLowerCase()) {
              const mark = document.createElement('mark');
              mark.className = 'betterbudgyt-search-highlight';
              mark.textContent = part;
              fragment.appendChild(mark);
              allMatches.push(mark);
            } else {
              fragment.appendChild(document.createTextNode(part));
            }
          });
          textNode.parentNode.replaceChild(fragment, textNode);
        }
      });
    };
    
    const scrollToMatch = (index) => {
      if (allMatches.length === 0) return;
      
      allMatches.forEach(m => m.classList.remove('current'));
      currentMatchIndex = ((index % allMatches.length) + allMatches.length) % allMatches.length;
      
      const match = allMatches[currentMatchIndex];
      if (match) {
        match.classList.add('current');
        
        const card = match.closest('.betterbudgyt-dept-card');
        if (card && !card.classList.contains('expanded')) {
          card.classList.add('expanded');
          const body = card.querySelector('.betterbudgyt-dept-card-body');
          if (body) body.style.display = 'block';
        }
        
        match.scrollIntoView({ behavior: 'smooth', block: 'center' });
        updateMatchCounter();
      }
    };
    
    const updateMatchCounter = () => {
      if (allMatches.length > 0) {
        searchCounter.textContent = `${currentMatchIndex + 1} of ${allMatches.length}`;
        searchCounter.style.display = '';
      } else if (searchInput.value.trim()) {
        searchCounter.textContent = 'No matches';
        searchCounter.style.display = '';
      } else {
        searchCounter.style.display = 'none';
      }
    };
    
    const updateClearButton = () => {
      clearBtn.style.display = searchInput.value.trim() ? '' : 'none';
    };
    
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearHighlights();
      modal.querySelectorAll('.betterbudgyt-dept-card').forEach(card => card.style.display = '');
      updateMatchCounter();
      updateClearButton();
      searchInput.focus();
    });
    
    searchInput.addEventListener('input', (event) => {
      const searchTerm = event.target.value.trim();
      updateClearButton();
      clearHighlights();
      
      const cards = modal.querySelectorAll('.betterbudgyt-dept-card');
      
      if (searchTerm === '') {
        cards.forEach(card => card.style.display = '');
        updateMatchCounter();
        return;
      }
      
      cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        const matches = text.includes(searchTerm.toLowerCase());
        card.style.display = matches ? '' : 'none';
        
        if (matches) {
          card.querySelectorAll('.betterbudgyt-mini-desc, .betterbudgyt-mini-vendor, .betterbudgyt-dept-name').forEach(cell => {
            highlightText(cell, searchTerm);
          });
        }
      });
      
      if (allMatches.length > 0) {
        scrollToMatch(0);
      }
      updateMatchCounter();
    });
    
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (event.shiftKey) {
          scrollToMatch(currentMatchIndex - 1);
        } else {
          scrollToMatch(currentMatchIndex + 1);
        }
      }
    });
  }

  // Setup filter chips
  function setupFilterChips(modal) {
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
  }

  // Setup card expand/collapse
  function setupCardToggle(modal) {
    modal.addEventListener('click', (event) => {
      const cardHeader = event.target.closest('.betterbudgyt-dept-card-header');
      if (cardHeader) {
        const card = cardHeader.closest('.betterbudgyt-dept-card');
        const body = card.querySelector('.betterbudgyt-dept-card-body');
        
        card.classList.toggle('expanded');
        body.style.display = card.classList.contains('expanded') ? 'block' : 'none';
      }
    });
  }

  function setupSortableHeaders(modal, comparisonData) {
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const sortStates = new Map();
    
    const getSortKey = (dataset, dept) => `${dataset}-${dept}`;
    
    const getSortState = (dataset, dept) => {
      const key = getSortKey(dataset, dept);
      if (!sortStates.has(key)) {
        const hideMonths = modal.querySelector('#hideMonthsToggle')?.checked ?? false;
        const defaultSort = hideMonths ? { field: 'month', direction: 'asc' } : { field: null, direction: 'asc' };
        sortStates.set(key, defaultSort);
      }
      return sortStates.get(key);
    };
    
    const toggleSortState = (dataset, dept, field) => {
      const state = getSortState(dataset, dept);
      if (state.field === field) {
        state.direction = state.direction === 'asc' ? 'desc' : 'asc';
      } else {
        state.field = field;
        state.direction = 'asc';
      }
      return state;
    };
    
    modal.addEventListener('click', (event) => {
      const header = event.target.closest('.sortable-header');
      if (!header) return;
      
      const table = header.closest('.betterbudgyt-mini-table');
      if (!table) return;
      
      const dataset = table.dataset.dataset;
      const dept = table.dataset.dept;
      const field = header.dataset.sortField;
      
      const newSortState = toggleSortState(dataset, dept, field);
      const hideMonths = modal.querySelector('#hideMonthsToggle')?.checked ?? false;
      
      const datasetInfo = dataset === '1' ? comparisonData.dataset1 : comparisonData.dataset2;
      const deptData = datasetInfo.departments?.find(d => d.storeUID === dept);
      
      if (!deptData?.transactions) return;
      
      const sortedTxns = sortTransactions(deptData.transactions, newSortState.field, newSortState.direction);
      
      const tbody = table.querySelector('tbody');
      if (tbody) {
        tbody.innerHTML = generateTransactionRowsHtml(sortedTxns, datasetInfo, months, hideMonths);
      }
      
      table.querySelectorAll('.sortable-header').forEach(th => {
        const thField = th.dataset.sortField;
        const isActive = thField === newSortState.field;
        th.classList.toggle('sortable-active', isActive);
        
        const labelOnly = th.textContent.replace(/[▲▼]/g, '').trim();
        if (isActive) {
          th.textContent = labelOnly + (newSortState.direction === 'asc' ? ' ▲' : ' ▼');
        } else {
          th.textContent = labelOnly;
        }
      });
    });
  }

  // Setup hide months toggle
  function setupHideMonthsToggle(modal, comparisonData, hideMonths) {
    const toggleCheckbox = modal.querySelector('#hideMonthsToggle');
    let currentHideMonths = hideMonths;
    
    toggleCheckbox.addEventListener('change', (event) => {
      currentHideMonths = event.target.checked;
      chrome.storage.sync.set({ hideMonthsDefault: currentHideMonths });
      
      const expandedDepts = [];
      modal.querySelectorAll('.betterbudgyt-dept-card.expanded').forEach(card => {
        expandedDepts.push(card.dataset.dept);
      });
      
      const activeChip = modal.querySelector('.betterbudgyt-filter-chip.active');
      const currentFilter = activeChip ? activeChip.dataset.filter : 'all';
      
      const tableContainer = modal.querySelector('.betterbudgyt-comparison-table-container');
      tableContainer.innerHTML = generateComparisonTable(comparisonData, currentHideMonths, false);
      
      expandedDepts.forEach(deptId => {
        const card = tableContainer.querySelector(`.betterbudgyt-dept-card[data-dept="${deptId}"]`);
        if (card) {
          card.classList.add('expanded');
          const body = card.querySelector('.betterbudgyt-dept-card-body');
          if (body) body.style.display = 'block';
        }
      });
      
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

  // Setup modal control buttons
  function setupModalControls(modal, modalId, comparisonData, hideMonths) {
    const { openDatasheetsParallel } = window.BetterBudgyt.features.comparison.dataFetcher;
    
    // Close button
    modal.querySelector('.betterbudgyt-comparison-modal-close').addEventListener('click', () => {
      const minimizedTab = document.querySelector(`.betterbudgyt-minimized-tab[data-modal-id="${modalId}"]`);
      if (minimizedTab) minimizedTab.remove();
      state.comparisonDataByModal.delete(modalId);
      modal.remove();
      cleanupMinimizedTabsContainer();
    });
    
    // Refresh button
    const refreshBtn = modal.querySelector('.betterbudgyt-comparison-modal-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        if (!comparisonData._refreshData) {
          alert('Cannot refresh: original cell data not available');
          return;
        }
        
        const { cell1Data, cell2Data } = comparisonData._refreshData;
        
        refreshBtn.classList.add('spinning');
        refreshBtn.disabled = true;
        
        try {
          const result = await openDatasheetsParallel(cell1Data, cell2Data, true);
          const newComparisonData = result.data;
          newComparisonData.accountName = comparisonData.accountName;
          newComparisonData._refreshData = comparisonData._refreshData;
          
          const tableContainer = modal.querySelector('.betterbudgyt-comparison-table-container');
          if (tableContainer) {
            tableContainer.innerHTML = generateComparisonTable(newComparisonData, hideMonths);
          }
          
          const newDataset1Total = newComparisonData.dataset1.grandTotals?.total || newComparisonData.dataset1.totals?.total || 0;
          const newDataset2Total = newComparisonData.dataset2.grandTotals?.total || newComparisonData.dataset2.totals?.total || 0;
          
          const summaryCards = modal.querySelectorAll('.betterbudgyt-summary-card-value');
          if (summaryCards[0]) summaryCards[0].textContent = formatNumber(newDataset1Total);
          if (summaryCards[1]) summaryCards[1].textContent = formatNumber(newDataset2Total);
          if (summaryCards[2]) summaryCards[2].textContent = formatNumber(newDataset1Total - newDataset2Total);
          
          Object.assign(comparisonData, newComparisonData);
          state.comparisonDataByModal.set(modalId, comparisonData);
        } catch (error) {
          alert('Failed to refresh: ' + (error.message || 'Unknown error'));
        } finally {
          refreshBtn.classList.remove('spinning');
          refreshBtn.disabled = false;
        }
      });
    }
    
    // Export button
    const exportBtn = modal.querySelector('.betterbudgyt-comparison-modal-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const hideMonthsToggle = modal.querySelector('#hideMonthsToggle');
        const currentHideMonths = hideMonthsToggle ? hideMonthsToggle.checked : false;
        
        const activeChip = modal.querySelector('.betterbudgyt-filter-chip.active');
        const currentFilter = activeChip ? activeChip.dataset.filter : 'all';
        
        exportComparisonToExcel(comparisonData, currentHideMonths, currentFilter);
      });
    }
    
    // Minimize button
    modal.querySelector('.betterbudgyt-comparison-modal-minimize').addEventListener('click', () => {
      modal.style.display = 'none';
      
      let tabsContainer = document.querySelector('.betterbudgyt-minimized-tabs-container');
      if (!tabsContainer) {
        tabsContainer = document.createElement('div');
        tabsContainer.className = 'betterbudgyt-minimized-tabs-container';
        document.body.appendChild(tabsContainer);
      }
      
      let minimizedTab = document.querySelector(`.betterbudgyt-minimized-tab[data-modal-id="${modalId}"]`);
      if (!minimizedTab) {
        minimizedTab = document.createElement('div');
        minimizedTab.className = 'betterbudgyt-minimized-tab';
        minimizedTab.dataset.modalId = modalId;
        const tabTitle = comparisonData.accountName 
          ? stripNumberPrefix(comparisonData.accountName) 
          : 'Comparison';
        minimizedTab.innerHTML = `
          <div class="betterbudgyt-minimized-tab-content">
            <span class="betterbudgyt-minimized-tab-icon">📊</span>
            <span class="betterbudgyt-minimized-tab-title">${tabTitle}</span>
            <button class="betterbudgyt-minimized-tab-close" title="Close">&times;</button>
          </div>
        `;
        tabsContainer.appendChild(minimizedTab);
        
        minimizedTab.querySelector('.betterbudgyt-minimized-tab-content').addEventListener('click', (e) => {
          if (!e.target.classList.contains('betterbudgyt-minimized-tab-close')) {
            modal.style.display = '';
            minimizedTab.remove();
            cleanupMinimizedTabsContainer();
          }
        });
        
        minimizedTab.querySelector('.betterbudgyt-minimized-tab-close').addEventListener('click', (e) => {
          e.stopPropagation();
          minimizedTab.remove();
          modal.remove();
          cleanupMinimizedTabsContainer();
        });
      }
    });
    
    // Close on overlay click
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        const minimizedTab = document.querySelector(`.betterbudgyt-minimized-tab[data-modal-id="${modalId}"]`);
        if (minimizedTab) minimizedTab.remove();
        state.comparisonDataByModal.delete(modalId);
        modal.remove();
        cleanupMinimizedTabsContainer();
      }
    });
    
    // Escape key closes
    const handleEscape = (event) => {
      if (event.key === 'Escape' && modal.style.display !== 'none') {
        const minimizedTab = document.querySelector(`.betterbudgyt-minimized-tab[data-modal-id="${modalId}"]`);
        if (minimizedTab) minimizedTab.remove();
        state.comparisonDataByModal.delete(modalId);
        modal.remove();
        cleanupMinimizedTabsContainer();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    

    // Add Transaction button handler (section-level buttons)
    modal.addEventListener('click', (event) => {
      const addTxBtn = event.target.closest('.betterbudgyt-section-add-tx-btn');
      if (addTxBtn) {
        event.stopPropagation();
        
        const datasetIndex = parseInt(addTxBtn.dataset.dataset);
        const storeUID = addTxBtn.dataset.storeUid;
        const deptName = addTxBtn.dataset.deptName;
        
        const hideMonthsToggle = modal.querySelector('#hideMonthsToggle');
        const currentHideMonths = hideMonthsToggle ? hideMonthsToggle.checked : false;
        
        // Find department info from the appropriate dataset
        const targetDataset = datasetIndex === 1 ? comparisonData.dataset1 : comparisonData.dataset2;
        const dept = targetDataset.departments?.find(d => d.storeUID === storeUID);
        
        const departmentInfo = {
          storeUID: storeUID,
          departmentName: deptName || dept?.departmentName || 'Unknown Department',
          deptUID: dept?.deptUID
        };
        
        // Use the specific dataset that was clicked
        const datasetInfo = { ...targetDataset, datasetIndex: datasetIndex };
        
        const transactions = window.BetterBudgyt.features.comparison.transactions;
        if (transactions) {
          // Pass false for allowDatasetSwitch since user clicked on a specific dataset section
          transactions.showAddTransactionModal(departmentInfo, datasetInfo, comparisonData, currentHideMonths, false);
        }
      }
    });


  }

  function getComparisonDataForElement(element) {
    const modal = element?.closest('.betterbudgyt-comparison-modal');
    if (!modal) return state.currentComparisonData;
    
    const modalId = modal.dataset.modalId;
    return state.comparisonDataByModal.get(modalId) || state.currentComparisonData;
  }

  function getComparisonDataForModal(modal) {
    if (!modal) return state.currentComparisonData;
    const modalId = modal.dataset.modalId;
    return state.comparisonDataByModal.get(modalId) || state.currentComparisonData;
  }

  // Export to namespace
  window.BetterBudgyt.features.comparison.modal = {
    generateDeptTransactionsHtml,
    generateComparisonTable,
    exportComparisonToExcel,
    showComparisonModal,
    getComparisonDataForElement,
    getComparisonDataForModal,
    downloadAttachedFile
  };

})();
