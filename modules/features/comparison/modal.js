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

  // Generate transaction details for a department
  function generateDeptTransactionsHtml(deptData, comparisonData, months, hideMonths) {
    let html = '<div class="betterbudgyt-transactions-grid">';
    
    // Dataset 1 transactions
    html += `
      <div class="betterbudgyt-transactions-section betterbudgyt-transactions-section-1">
        <div class="betterbudgyt-transactions-section-header">${comparisonData.dataset1.dataType}</div>
    `;
    
    if (deptData.dataset1?.transactions?.length > 0) {
      html += `
        <table class="betterbudgyt-mini-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Vendor</th>
              ${hideMonths ? '' : months.map(m => `<th>${m}</th>`).join('')}
              <th class="betterbudgyt-total-col">Total</th>
            </tr>
          </thead>
          <tbody>
      `;
      deptData.dataset1.transactions.forEach(t => {
        const noteIcon = t.note ? `<span class="betterbudgyt-note-icon" data-note="${escapeHtml(t.note)}" data-desc="${escapeHtml(t.description || 'No Description')}" title="Click to view note">📝</span>` : '';
        const fileIcon = t.fileAttachment?.hasFile ? `<a href="/Budget/DownloadSubCategoryDocument?folderName=${encodeURIComponent(t.fileAttachment.folderName)}" class="betterbudgyt-file-icon" title="Download attached file" target="_blank">📎</a>` : '';
        const hasUID = !!t.plElementUID;
        const descHasComment = t.comments?.description && hasUID;
        const vendorHasComment = t.comments?.vendor && hasUID;
        const totalHasComment = t.comments?.total && hasUID;
        // Make all cells with plElementUID clickable for comments (right-click menu)
        const descAttrs = hasUID ? ` data-pl-element-uid="${t.plElementUID}" data-field="description" data-desc="${escapeHtml(t.description || 'No Description')}"` : '';
        const vendorAttrs = hasUID ? ` data-pl-element-uid="${t.plElementUID}" data-field="vendor" data-desc="${escapeHtml(t.description || 'No Description')}"` : '';
        const totalAttrs = hasUID ? ` data-pl-element-uid="${t.plElementUID}" data-field="total" data-desc="${escapeHtml(t.description || 'No Description')}"` : '';
        const rowClasses = [t.note ? 'has-note' : '', t.fileAttachment?.hasFile ? 'has-file' : ''].filter(Boolean).join(' ');
        html += `
          <tr${rowClasses ? ` class="${rowClasses}"` : ''}>
            <td class="betterbudgyt-mini-desc${hasUID ? ' clickable-comment' : ''}${descHasComment ? ' has-comment' : ''}"${descAttrs}>${fileIcon}${noteIcon}${t.description || 'No Description'}</td>
            <td class="betterbudgyt-mini-vendor${hasUID ? ' clickable-comment' : ''}${vendorHasComment ? ' has-comment' : ''}"${vendorAttrs}>${stripNumberPrefix(t.vendor) || '-'}</td>
            ${hideMonths ? '' : months.map(m => {
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
      html += '</tbody></table>';
    } else {
      html += '<div class="betterbudgyt-no-transactions">No transactions</div>';
    }
    html += '</div>';
    
    // Dataset 2 transactions
    html += `
      <div class="betterbudgyt-transactions-section betterbudgyt-transactions-section-2">
        <div class="betterbudgyt-transactions-section-header">${comparisonData.dataset2.dataType}</div>
    `;
    
    if (deptData.dataset2?.transactions?.length > 0) {
      html += `
        <table class="betterbudgyt-mini-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Vendor</th>
              ${hideMonths ? '' : months.map(m => `<th>${m}</th>`).join('')}
              <th class="betterbudgyt-total-col">Total</th>
            </tr>
          </thead>
          <tbody>
      `;
      deptData.dataset2.transactions.forEach(t => {
        const noteIcon = t.note ? `<span class="betterbudgyt-note-icon" data-note="${escapeHtml(t.note)}" data-desc="${escapeHtml(t.description || 'No Description')}" title="Click to view note">📝</span>` : '';
        const fileIcon = t.fileAttachment?.hasFile ? `<a href="/Budget/DownloadSubCategoryDocument?folderName=${encodeURIComponent(t.fileAttachment.folderName)}" class="betterbudgyt-file-icon" title="Download attached file" target="_blank">📎</a>` : '';
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
            ${hideMonths ? '' : months.map(m => {
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
      html += '</tbody></table>';
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
        tableHtml += `
          <div class="betterbudgyt-dept-card betterbudgyt-single-dept expanded" data-dept="${deptData.storeUID}">
            <div class="betterbudgyt-single-dept-header">
              <span class="betterbudgyt-dept-name">${stripNumberPrefix(deptName)}</span>
              <button class="betterbudgyt-dept-popout-btn" title="Open in new tab" data-dept="${deptData.storeUID}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </button>
            </div>
            <div class="betterbudgyt-dept-card-body" style="display: block;">
              ${!classTotalsOnly ? generateDeptTransactionsHtml(deptData, comparisonData, months, hideMonths) : '<div class="betterbudgyt-no-transactions">Class totals only mode</div>'}
            </div>
          </div>
        `;
      } else {
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
              ${!classTotalsOnly ? generateDeptTransactionsHtml(deptData, comparisonData, months, hideMonths) : '<div class="betterbudgyt-no-transactions">Class totals only mode</div>'}
            </div>
          </div>
        `;
      }
    });
    
    tableHtml += `</div>`;
    return tableHtml;
  }

  // Export comparison to Excel/CSV
  async function exportComparisonToExcel(comparisonData, hideMonths = false, filterMode = 'all') {
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const accountName = comparisonData.accountName || 'Comparison';
    
    const includeDataset1 = filterMode === 'all' || filterMode === 'dataset1';
    const includeDataset2 = filterMode === 'all' || filterMode === 'dataset2';
    
    const departmentMap = new Map();
    (comparisonData.dataset1.departments || []).forEach(dept => {
      const key = dept.departmentName || dept.storeUID;
      departmentMap.set(key, { name: dept.departmentName, dataset1: dept, dataset2: null });
    });
    (comparisonData.dataset2.departments || []).forEach(dept => {
      const key = dept.departmentName || dept.storeUID;
      if (departmentMap.has(key)) {
        departmentMap.get(key).dataset2 = dept;
      } else {
        departmentMap.set(key, { name: dept.departmentName, dataset1: null, dataset2: dept });
      }
    });
    
    const baseHeaders = ['Department', 'Dataset', 'Description', 'Vendor'];
    const monthHeaders = hideMonths ? [] : months;
    const headers = [...baseHeaders, ...monthHeaders, 'Total', 'Notes'];
    
    const allRows = [headers];
    
    departmentMap.forEach((deptData, deptName) => {
      if (includeDataset1 && deptData.dataset1?.transactions?.length > 0) {
        deptData.dataset1.transactions.forEach(t => {
          const row = [
            stripNumberPrefix(deptName),
            comparisonData.dataset1.dataType,
            t.description || 'No Description',
            stripNumberPrefix(t.vendor) || '-'
          ];
          if (!hideMonths) {
            months.forEach(m => row.push(t.monthly?.[m] || 0));
          }
          row.push(t.total || 0);
          row.push(t.note || '');
          allRows.push(row);
        });
      }
      
      if (includeDataset2 && deptData.dataset2?.transactions?.length > 0) {
        deptData.dataset2.transactions.forEach(t => {
          const row = [
            stripNumberPrefix(deptName),
            comparisonData.dataset2.dataType,
            t.description || 'No Description',
            stripNumberPrefix(t.vendor) || '-'
          ];
          if (!hideMonths) {
            months.forEach(m => row.push(t.monthly?.[m] || 0));
          }
          row.push(t.total || 0);
          row.push(t.note || '');
          allRows.push(row);
        });
      }
    });
    
    // Use bundled SheetJS library, fallback to CSV if unavailable
    const useXlsx = !!window.XLSX;
    
    const filterSuffix = filterMode === 'all' ? '' : `_${filterMode === 'dataset1' ? 'actuals' : 'budget'}`;
    const baseFilename = `comparison_${accountName.replace(/[^a-z0-9]/gi, '_')}${filterSuffix}_${new Date().toISOString().split('T')[0]}`;
    
    if (useXlsx && window.XLSX) {
      const wb = XLSX.utils.book_new();
      
      const dataset1Total = comparisonData.dataset1.grandTotals?.total || comparisonData.dataset1.totals?.total || 0;
      const dataset2Total = comparisonData.dataset2.grandTotals?.total || comparisonData.dataset2.totals?.total || 0;
      
      const summaryData = [
        ['Datasheet Comparison'],
        ['Account', accountName],
        ['Export Date', new Date().toLocaleDateString()],
        [],
        ['Summary']
      ];
      if (includeDataset1) summaryData.push([comparisonData.dataset1.dataType, dataset1Total]);
      if (includeDataset2) summaryData.push([comparisonData.dataset2.dataType, dataset2Total]);
      if (includeDataset1 && includeDataset2) summaryData.push(['Variance', dataset1Total - dataset2Total]);
      
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(allRows), 'Transactions');
      
      XLSX.writeFile(wb, `${baseFilename}.xlsx`);
    } else {
      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      
      const csvContent = allRows.map(row => row.map(escapeCSV).join(',')).join('\r\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseFilename}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  // Open department details in a new tab
  async function openDepartmentInNewTab(deptId, originalComparisonData, hideMonths) {
    const dept1 = originalComparisonData.dataset1.departments?.find(d => d.storeUID === deptId);
    const dept2 = originalComparisonData.dataset2.departments?.find(d => d.storeUID === deptId);
    
    if (!dept1 && !dept2) return;
    
    const deptName = dept1?.departmentName || dept2?.departmentName || 'Department Detail';
    
    const d1Total = dept1 ? (dept1.totals?.total || dept1.transactions?.reduce((s, t) => s + (t.total || 0), 0) || 0) : 0;
    const d2Total = dept2 ? (dept2.totals?.total || dept2.transactions?.reduce((s, t) => s + (t.total || 0), 0) || 0) : 0;
    const variance = d1Total - d2Total;
    
    const d1Count = dept1?.transactions?.length || 0;
    const d2Count = dept2?.transactions?.length || 0;

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

    const tableHtml = generateComparisonTable(singleDeptData, hideMonths, false);
    
    let extensionCss = '';
    try {
      const cssUrl = chrome.runtime.getURL('styles.css');
      const response = await fetch(cssUrl);
      extensionCss = await response.text();
    } catch (e) {
      console.error('Failed to load extension CSS:', e);
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Datasheet Comparison${originalComparisonData.accountName ? ` - ${stripNumberPrefix(originalComparisonData.accountName)}` : ''} - ${stripNumberPrefix(deptName)}</title>
  <meta charset="UTF-8">
  <style>${extensionCss}</style>
  <style>
    html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
    .betterbudgyt-comparison-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #f8fafc; display: flex; justify-content: center; align-items: center; z-index: 1; }
    .betterbudgyt-comparison-modal-content { background: #fff; width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
    .betterbudgyt-comparison-modal-close { display: none !important; }
    .betterbudgyt-dept-popout-btn { display: none !important; }
    .betterbudgyt-dept-card { border-color: #e2e8f0 !important; }
    .betterbudgyt-dept-card-body { display: block !important; }
    .betterbudgyt-dept-card .betterbudgyt-dept-expand-btn { transform: rotate(90deg); background: #3b82f6; color: #fff; }
    .betterbudgyt-comparison-toolbar { display: flex !important; flex-wrap: nowrap !important; align-items: center !important; gap: 16px !important; padding: 8px 20px !important; }
    .betterbudgyt-search-container { flex: 0 0 250px !important; max-width: 250px !important; overflow: hidden !important; position: relative !important; }
    .betterbudgyt-search-input { width: 100% !important; box-sizing: border-box !important; }
    .betterbudgyt-filter-chips { flex-shrink: 0 !important; display: flex !important; gap: 8px !important; margin-left: 16px !important; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important; font-size: 14px !important; }
    .betterbudgyt-mini-table { font-size: 13px !important; }
    .betterbudgyt-mini-table th, .betterbudgyt-mini-table td { padding: 8px 10px !important; }
    .betterbudgyt-dept-card-header { font-size: 14px !important; }
    .betterbudgyt-summary-card-value { font-size: 1.5rem !important; }
    .betterbudgyt-note-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 10001; }
    .betterbudgyt-note-modal { background: #fff; border-radius: 12px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3); max-width: 500px; width: 90%; max-height: 80vh; overflow: hidden; }
    .betterbudgyt-note-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .betterbudgyt-note-modal-title { font-size: 16px; font-weight: 600; color: #1e293b; }
    .betterbudgyt-note-modal-close { background: none; border: none; font-size: 24px; color: #64748b; cursor: pointer; padding: 4px 8px; border-radius: 4px; }
    .betterbudgyt-note-modal-close:hover { background: #e2e8f0; color: #1e293b; }
    .betterbudgyt-note-modal-body { padding: 20px; }
    .betterbudgyt-note-modal-item { font-size: 14px; color: #334155; margin-bottom: 8px; }
    .betterbudgyt-note-modal-content { background: #fefce8; border-left: 4px solid #eab308; padding: 16px; border-radius: 0 8px 8px 0; margin-top: 16px; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap; }
    .betterbudgyt-note-icon { cursor: pointer; font-size: 13px; margin-right: 6px; opacity: 0.85; display: inline-block; vertical-align: middle; }
    .betterbudgyt-note-icon:hover { opacity: 1; }
    .betterbudgyt-mini-table tr.has-note { background: #fefce8 !important; }
    .betterbudgyt-mini-table tr.has-note:hover { background: #fef9c3 !important; }
    .betterbudgyt-mini-value.compact-value { font-size: 10px; letter-spacing: -0.3px; }
    .clickable-comment { position: relative; cursor: pointer; }
    .clickable-comment:hover { background: #eff6ff !important; }
    .has-comment::after { content: ''; position: absolute; top: 0; right: 0; width: 0; height: 0; border-style: solid; border-width: 0 10px 10px 0; border-color: transparent #3b82f6 transparent transparent; pointer-events: none; }
    .betterbudgyt-comment-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 10001; }
    .betterbudgyt-comment-modal { background: #fff; border-radius: 12px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3); max-width: 500px; width: 90%; max-height: 80vh; overflow: hidden; }
    .betterbudgyt-comment-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: #eff6ff; border-bottom: 1px solid #bfdbfe; }
    .betterbudgyt-comment-modal-title { font-size: 16px; font-weight: 600; color: #1e40af; }
    .betterbudgyt-comment-modal-close { background: none; border: none; font-size: 24px; color: #64748b; cursor: pointer; padding: 4px 8px; border-radius: 4px; line-height: 1; }
    .betterbudgyt-comment-modal-close:hover { background: #dbeafe; color: #1e40af; }
    .betterbudgyt-comment-modal-body { padding: 20px; max-height: 60vh; overflow-y: auto; }
    .betterbudgyt-comment-desc { font-size: 13px; color: #64748b; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
    .betterbudgyt-comment-content { font-size: 14px; line-height: 1.6; color: #1e293b; }
  </style>
</head>
<body>
  <div class="betterbudgyt-comparison-modal">
    <div class="betterbudgyt-comparison-modal-content">
      <div class="betterbudgyt-comparison-modal-header">
        <h2>📊 Datasheet Comparison${originalComparisonData.accountName ? ` - ${stripNumberPrefix(originalComparisonData.accountName)}` : ''}</h2>
        <div class="betterbudgyt-comparison-subtitle" style="font-size: 14px; color: #64748b; margin-top: 4px;">${stripNumberPrefix(deptName)}</div>
      </div>
      <div class="betterbudgyt-comparison-modal-body">
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
        <div class="betterbudgyt-comparison-toolbar">
          <div class="betterbudgyt-search-container">
            <svg class="betterbudgyt-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input type="text" class="betterbudgyt-search-input" id="comparisonSearch" placeholder="Search descriptions, vendors...">
            <button class="betterbudgyt-search-clear" type="button" title="Clear search" style="display: none;">&times;</button>
          </div>
          <span class="betterbudgyt-search-counter" style="display: none;"></span>
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
        <div class="betterbudgyt-comparison-table-container">
          ${tableHtml}
        </div>
      </div>
    </div>
  </div>
  <script>
    const comparisonData = ${JSON.stringify(singleDeptData).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')};
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    
    function formatNumber(num) {
      if (num === null || num === undefined || isNaN(num)) return '0';
      return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
    }
    
    function stripNumberPrefix(str) {
      if (!str) return str;
      return str.replace(/^\\d+[-.]?\\s*/, '');
    }
    
    function escapeForModal(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    function showNoteModal(description, note) {
      const existingModal = document.querySelector('.betterbudgyt-note-modal-overlay');
      if (existingModal) existingModal.remove();
      
      let author = '', noteContent = note;
      const match = note.match(/^\\[([^\\]]+)\\]\\s*(.*)$/s);
      if (match) { author = match[1]; noteContent = match[2]; }
      
      const overlay = document.createElement('div');
      overlay.className = 'betterbudgyt-note-modal-overlay';
      overlay.innerHTML = '<div class="betterbudgyt-note-modal"><div class="betterbudgyt-note-modal-header"><div class="betterbudgyt-note-modal-title">📝 Note</div><button class="betterbudgyt-note-modal-close">&times;</button></div><div class="betterbudgyt-note-modal-body"><div class="betterbudgyt-note-modal-item"><strong>Item:</strong> ' + escapeForModal(description) + '</div>' + (author ? '<div class="betterbudgyt-note-modal-item"><strong>By:</strong> ' + escapeForModal(author) + '</div>' : '') + '<div class="betterbudgyt-note-modal-content">' + escapeForModal(noteContent) + '</div></div></div>';
      
      overlay.addEventListener('click', (e) => { if (e.target === overlay || e.target.closest('.betterbudgyt-note-modal-close')) overlay.remove(); });
      document.addEventListener('keydown', function escHandler(e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); } });
      document.body.appendChild(overlay);
    }
    
    document.addEventListener('click', (event) => {
      const noteIcon = event.target.closest('.betterbudgyt-note-icon');
      if (noteIcon) {
        const note = noteIcon.dataset.note;
        const desc = noteIcon.dataset.desc;
        if (note) { event.stopPropagation(); event.preventDefault(); showNoteModal(desc, note); return; }
      }
      
      const commentCell = event.target.closest('.clickable-comment');
      if (commentCell) {
        const plElementUID = commentCell.dataset.plElementUid;
        const field = commentCell.dataset.field;
        const desc = commentCell.dataset.desc;
        if (plElementUID && field) { event.stopPropagation(); fetchAndShowComment(plElementUID, field, desc); }
      }
    });
    
    async function fetchAndShowComment(plElementUID, field, desc) {
      const fieldMapping = { 'description': 'Description', 'vendor': 'Vendor', 'Apr': 'P1', 'May': 'P2', 'Jun': 'P3', 'Jul': 'P4', 'Aug': 'P5', 'Sep': 'P6', 'Oct': 'P7', 'Nov': 'P8', 'Dec': 'P9', 'Jan': 'P10', 'Feb': 'P11', 'Mar': 'P12' };
      const apiField = fieldMapping[field] || field;
      showCommentModal(desc, field, '<div style="text-align:center;padding:20px;"><i>Loading...</i></div>');
      try {
        const response = await fetch('/Budget/GetUserComments', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: JSON.stringify({ PlElementUID: parseInt(plElementUID), CommentDoneOnField: apiField }) });
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const comments = [];
        doc.querySelectorAll('.comment-details > ul > li').forEach(item => {
          const author = item.querySelector('.commented-by')?.textContent?.trim();
          if (!author) return;
          const dateEl = item.querySelector('.commented-on');
          let date = dateEl?.textContent?.trim() || '';
          if (dateEl?.getAttribute('data-datetimefromserver')) { try { const d = new Date(dateEl.getAttribute('data-datetimefromserver')); if (!isNaN(d.getTime())) date = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch(e) {} }
          const text = item.querySelector('.comment-text')?.textContent?.trim() || '';
          if (author && text) comments.push({ author, date, text });
        });
        let contentHtml = comments.length > 0 ? comments.map(c => '<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;"><div style="font-weight:600;color:#1e293b;">' + escapeForModal(c.author) + '</div><div style="font-size:11px;color:#64748b;margin-bottom:6px;">' + escapeForModal(c.date) + '</div><div style="color:#334155;">' + escapeForModal(c.text) + '</div></div>').join('') : '<i>No comments found</i>';
        const modalBody = document.querySelector('.betterbudgyt-comment-modal-body .betterbudgyt-comment-content');
        if (modalBody) modalBody.innerHTML = contentHtml;
      } catch (e) {
        const modalBody = document.querySelector('.betterbudgyt-comment-modal-body .betterbudgyt-comment-content');
        if (modalBody) modalBody.innerHTML = '<div style="color:#dc2626;">Failed to load comment.</div>';
      }
    }
    
    function showCommentModal(desc, field, content) {
      const existing = document.querySelector('.betterbudgyt-comment-modal-overlay');
      if (existing) existing.remove();
      const fieldLabel = field === 'description' ? 'Description' : field === 'vendor' ? 'Vendor' : field + ' Value';
      const overlay = document.createElement('div');
      overlay.className = 'betterbudgyt-comment-modal-overlay';
      overlay.innerHTML = '<div class="betterbudgyt-comment-modal"><div class="betterbudgyt-comment-modal-header"><div class="betterbudgyt-comment-modal-title">💬 Comment on ' + fieldLabel + '</div><button class="betterbudgyt-comment-modal-close">&times;</button></div><div class="betterbudgyt-comment-modal-body"><div class="betterbudgyt-comment-desc">' + escapeForModal(desc) + '</div><div class="betterbudgyt-comment-content">' + content + '</div></div></div>';
      overlay.addEventListener('click', (e) => { if (e.target === overlay || e.target.closest('.betterbudgyt-comment-modal-close')) overlay.remove(); });
      document.addEventListener('keydown', function escHandler(e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); } });
      document.body.appendChild(overlay);
    }
    
    function generateDeptTransactionsHtml(deptData, comparisonData, months, hideMonths) {
      let html = '<div class="betterbudgyt-transactions-grid">';
      function escapeHtml(text) { if (!text) return ''; const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
      
      if (deptData.dataset1?.transactions?.length > 0) {
        html += '<div class="betterbudgyt-transactions-section betterbudgyt-transactions-section-1">';
        html += '<div class="betterbudgyt-transactions-section-header">' + comparisonData.dataset1.dataType + '</div>';
        html += '<table class="betterbudgyt-mini-table"><thead><tr><th>Description</th><th>Vendor</th>';
        if (!hideMonths) months.forEach(m => html += '<th>' + m + '</th>');
        html += '<th class="betterbudgyt-total-col">Total</th></tr></thead><tbody>';
        deptData.dataset1.transactions.forEach(t => {
          const noteIcon = t.note ? '<span class="betterbudgyt-note-icon" data-note="' + escapeHtml(t.note) + '" data-desc="' + escapeHtml(t.description || 'No Description') + '" title="Click to view note">📝</span>' : '';
          const fileIcon = t.fileAttachment?.hasFile ? '<a href="/Budget/DownloadSubCategoryDocument?folderName=' + encodeURIComponent(t.fileAttachment.folderName) + '" class="betterbudgyt-file-icon" title="Download attached file" target="_blank">📎</a>' : '';
          const hasUID = !!t.plElementUID;
          const descHasComment = t.comments?.description && hasUID;
          const vendorHasComment = t.comments?.vendor && hasUID;
          const totalHasComment = t.comments?.total && hasUID;
          const descAttrs = hasUID ? ' data-pl-element-uid="' + t.plElementUID + '" data-field="description" data-desc="' + escapeHtml(t.description || 'No Description') + '"' : '';
          const vendorAttrs = hasUID ? ' data-pl-element-uid="' + t.plElementUID + '" data-field="vendor" data-desc="' + escapeHtml(t.description || 'No Description') + '"' : '';
          const totalAttrs = hasUID ? ' data-pl-element-uid="' + t.plElementUID + '" data-field="total" data-desc="' + escapeHtml(t.description || 'No Description') + '"' : '';
          const rowClasses = [t.note ? 'has-note' : '', t.fileAttachment?.hasFile ? 'has-file' : ''].filter(Boolean).join(' ');
          html += '<tr' + (rowClasses ? ' class="' + rowClasses + '"' : '') + '>';
          html += '<td class="betterbudgyt-mini-desc' + (hasUID ? ' clickable-comment' : '') + (descHasComment ? ' has-comment' : '') + '"' + descAttrs + '>' + fileIcon + noteIcon + (t.description || 'No Description') + '</td>';
          html += '<td class="betterbudgyt-mini-vendor' + (hasUID ? ' clickable-comment' : '') + (vendorHasComment ? ' has-comment' : '') + '"' + vendorAttrs + '>' + (stripNumberPrefix(t.vendor) || '-') + '</td>';
          if (!hideMonths) months.forEach(m => { const val = Math.abs(t.monthly?.[m] || 0); const isCompact = val >= 10000; const hasComment = t.comments?.[m] && hasUID; const monthAttrs = hasUID ? ' data-pl-element-uid="' + t.plElementUID + '" data-field="' + m + '" data-desc="' + escapeHtml(t.description || 'No Description') + '"' : ''; html += '<td class="betterbudgyt-mini-value' + (isCompact ? ' compact-value' : '') + (hasUID ? ' clickable-comment' : '') + (hasComment ? ' has-comment' : '') + '"' + monthAttrs + '>' + formatNumber(t.monthly?.[m] || 0) + '</td>'; });
          html += '<td class="betterbudgyt-mini-total' + (hasUID ? ' clickable-comment' : '') + (totalHasComment ? ' has-comment' : '') + '"' + totalAttrs + '>' + formatNumber(t.total || 0) + '</td></tr>';
        });
        html += '</tbody></table></div>';
      }
      
      if (deptData.dataset2?.transactions?.length > 0) {
        html += '<div class="betterbudgyt-transactions-section betterbudgyt-transactions-section-2">';
        html += '<div class="betterbudgyt-transactions-section-header">' + comparisonData.dataset2.dataType + '</div>';
        html += '<table class="betterbudgyt-mini-table"><thead><tr><th>Description</th><th>Vendor</th>';
        if (!hideMonths) months.forEach(m => html += '<th>' + m + '</th>');
        html += '<th class="betterbudgyt-total-col">Total</th></tr></thead><tbody>';
        deptData.dataset2.transactions.forEach(t => {
          const noteIcon = t.note ? '<span class="betterbudgyt-note-icon" data-note="' + escapeHtml(t.note) + '" data-desc="' + escapeHtml(t.description || 'No Description') + '" title="Click to view note">📝</span>' : '';
          const fileIcon = t.fileAttachment?.hasFile ? '<a href="/Budget/DownloadSubCategoryDocument?folderName=' + encodeURIComponent(t.fileAttachment.folderName) + '" class="betterbudgyt-file-icon" title="Download attached file" target="_blank">📎</a>' : '';
          const hasUID = !!t.plElementUID;
          const descHasComment = t.comments?.description && hasUID;
          const vendorHasComment = t.comments?.vendor && hasUID;
          const totalHasComment = t.comments?.total && hasUID;
          const descAttrs = hasUID ? ' data-pl-element-uid="' + t.plElementUID + '" data-field="description" data-desc="' + escapeHtml(t.description || 'No Description') + '"' : '';
          const vendorAttrs = hasUID ? ' data-pl-element-uid="' + t.plElementUID + '" data-field="vendor" data-desc="' + escapeHtml(t.description || 'No Description') + '"' : '';
          const totalAttrs = hasUID ? ' data-pl-element-uid="' + t.plElementUID + '" data-field="total" data-desc="' + escapeHtml(t.description || 'No Description') + '"' : '';
          const rowClasses = [t.note ? 'has-note' : '', t.fileAttachment?.hasFile ? 'has-file' : ''].filter(Boolean).join(' ');
          html += '<tr' + (rowClasses ? ' class="' + rowClasses + '"' : '') + '>';
          html += '<td class="betterbudgyt-mini-desc' + (hasUID ? ' clickable-comment' : '') + (descHasComment ? ' has-comment' : '') + '"' + descAttrs + '>' + fileIcon + noteIcon + (t.description || 'No Description') + '</td>';
          html += '<td class="betterbudgyt-mini-vendor' + (hasUID ? ' clickable-comment' : '') + (vendorHasComment ? ' has-comment' : '') + '"' + vendorAttrs + '>' + (stripNumberPrefix(t.vendor) || '-') + '</td>';
          if (!hideMonths) months.forEach(m => { const val = Math.abs(t.monthly?.[m] || 0); const isCompact = val >= 10000; const hasComment = t.comments?.[m] && hasUID; const monthAttrs = hasUID ? ' data-pl-element-uid="' + t.plElementUID + '" data-field="' + m + '" data-desc="' + escapeHtml(t.description || 'No Description') + '"' : ''; html += '<td class="betterbudgyt-mini-value' + (isCompact ? ' compact-value' : '') + (hasUID ? ' clickable-comment' : '') + (hasComment ? ' has-comment' : '') + '"' + monthAttrs + '>' + formatNumber(t.monthly?.[m] || 0) + '</td>'; });
          html += '<td class="betterbudgyt-mini-total' + (hasUID ? ' clickable-comment' : '') + (totalHasComment ? ' has-comment' : '') + '"' + totalAttrs + '>' + formatNumber(t.total || 0) + '</td></tr>';
        });
        html += '</tbody></table></div>';
      }
      
      if (!deptData.dataset1?.transactions?.length && !deptData.dataset2?.transactions?.length) html += '<div class="betterbudgyt-no-transactions">No transactions</div>';
      html += '</div>';
      return html;
    }
    
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
      
      return '<div class="betterbudgyt-dept-comparison-list"><div class="betterbudgyt-dept-card expanded" data-dept="' + storeUID + '"><div class="betterbudgyt-dept-card-header"><div class="betterbudgyt-dept-card-title"><span class="betterbudgyt-dept-expand-btn">▶</span><span class="betterbudgyt-dept-name">' + stripNumberPrefix(deptName) + '</span></div><div class="betterbudgyt-dept-card-totals"><div class="betterbudgyt-dept-total betterbudgyt-dept-total-1"><span class="betterbudgyt-dept-total-label">' + comparisonData.dataset1.dataType + '</span><span class="betterbudgyt-dept-total-value">' + formatNumber(d1Total) + '</span><span class="betterbudgyt-dept-total-count">' + d1Count + ' items</span></div><div class="betterbudgyt-dept-total betterbudgyt-dept-total-2"><span class="betterbudgyt-dept-total-label">' + comparisonData.dataset2.dataType + '</span><span class="betterbudgyt-dept-total-value">' + formatNumber(d2Total) + '</span><span class="betterbudgyt-dept-total-count">' + d2Count + ' items</span></div><div class="betterbudgyt-dept-total betterbudgyt-dept-variance ' + varianceClass + '"><span class="betterbudgyt-dept-total-label">Variance</span><span class="betterbudgyt-dept-total-value">' + formatNumber(variance) + '</span></div></div></div><div class="betterbudgyt-dept-card-body" style="display: block;">' + generateDeptTransactionsHtml(deptData, comparisonData, months, hideMonths) + '</div></div></div>';
    }

    (function initPopout() {
      if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', setupInteractivity); }
      else { setupInteractivity(); }
      
      function setupInteractivity() {
        const modal = document.querySelector('.betterbudgyt-comparison-modal');
        if (!modal) return;
        
        let currentHideMonths = ${hideMonths};
        const searchInput = modal.querySelector('#comparisonSearch');
        const searchCounter = modal.querySelector('.betterbudgyt-search-counter');
        const clearBtn = modal.querySelector('.betterbudgyt-search-clear');
        let currentMatchIndex = 0, allMatches = [];
        
        const clearHighlights = () => { modal.querySelectorAll('.betterbudgyt-search-highlight').forEach(el => { const parent = el.parentNode; parent.replaceChild(document.createTextNode(el.textContent), el); parent.normalize(); }); allMatches = []; currentMatchIndex = 0; };
        const escapeRegex = (str) => { const specials = '-/\\\\^$*+?.()|[]{}'; let result = ''; for (let i = 0; i < str.length; i++) result += specials.indexOf(str[i]) !== -1 ? '\\\\' + str[i] : str[i]; return result; };
        const highlightText = (element, searchTerm) => { if (!searchTerm || !element) return; const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false); const textNodes = []; let node; while (node = walker.nextNode()) if (node.textContent.toLowerCase().includes(searchTerm.toLowerCase())) textNodes.push(node); textNodes.forEach(textNode => { const text = textNode.textContent; const regex = new RegExp('(' + escapeRegex(searchTerm) + ')', 'gi'); const parts = text.split(regex); if (parts.length > 1) { const fragment = document.createDocumentFragment(); parts.forEach(part => { if (part.toLowerCase() === searchTerm.toLowerCase()) { const mark = document.createElement('mark'); mark.className = 'betterbudgyt-search-highlight'; mark.textContent = part; fragment.appendChild(mark); allMatches.push(mark); } else fragment.appendChild(document.createTextNode(part)); }); textNode.parentNode.replaceChild(fragment, textNode); } }); };
        const scrollToMatch = (index) => { if (allMatches.length === 0) return; allMatches.forEach(m => m.classList.remove('current')); currentMatchIndex = ((index % allMatches.length) + allMatches.length) % allMatches.length; const match = allMatches[currentMatchIndex]; if (match) { match.classList.add('current'); const card = match.closest('.betterbudgyt-dept-card'); if (card && !card.classList.contains('expanded')) { card.classList.add('expanded'); const body = card.querySelector('.betterbudgyt-dept-card-body'); if (body) body.style.display = 'block'; } match.scrollIntoView({ behavior: 'smooth', block: 'center' }); updateMatchCounter(); } };
        const updateMatchCounter = () => { if (allMatches.length > 0) { searchCounter.textContent = (currentMatchIndex + 1) + ' of ' + allMatches.length; searchCounter.style.display = ''; } else if (searchInput.value.trim()) { searchCounter.textContent = 'No matches'; searchCounter.style.display = ''; } else searchCounter.style.display = 'none'; };
        const updateClearButton = () => { clearBtn.style.display = searchInput.value.trim() ? '' : 'none'; };
        
        if (clearBtn) clearBtn.addEventListener('click', () => { searchInput.value = ''; clearHighlights(); updateMatchCounter(); updateClearButton(); searchInput.focus(); });
        if (searchInput) {
          searchInput.addEventListener('input', (event) => { const searchTerm = event.target.value.trim(); updateClearButton(); clearHighlights(); if (searchTerm === '') { updateMatchCounter(); return; } const rows = modal.querySelectorAll('.betterbudgyt-mini-table tbody tr'); rows.forEach(row => row.querySelectorAll('.betterbudgyt-mini-desc, .betterbudgyt-mini-vendor').forEach(cell => highlightText(cell, searchTerm))); if (allMatches.length > 0) scrollToMatch(0); updateMatchCounter(); });
          searchInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); if (event.shiftKey) scrollToMatch(currentMatchIndex - 1); else scrollToMatch(currentMatchIndex + 1); } });
        }
        
        const filterChips = modal.querySelectorAll('.betterbudgyt-filter-chip');
        filterChips.forEach(chip => { chip.addEventListener('click', (e) => { e.preventDefault(); filterChips.forEach(c => c.classList.remove('active')); chip.classList.add('active'); const filter = chip.dataset.filter; const grids = modal.querySelectorAll('.betterbudgyt-transactions-grid'); grids.forEach(grid => { const section1 = grid.querySelector('.betterbudgyt-transactions-section-1'); const section2 = grid.querySelector('.betterbudgyt-transactions-section-2'); if (filter === 'all') { grid.style.gridTemplateColumns = '1fr 1fr'; grid.classList.remove('single-column-mode'); if (section1) section1.style.display = ''; if (section2) section2.style.display = ''; } else if (filter === 'dataset1') { grid.style.gridTemplateColumns = '1fr'; grid.classList.add('single-column-mode'); if (section1) section1.style.display = ''; if (section2) section2.style.display = 'none'; } else if (filter === 'dataset2') { grid.style.gridTemplateColumns = '1fr'; grid.classList.add('single-column-mode'); if (section1) section1.style.display = 'none'; if (section2) section2.style.display = ''; } }); }); });
        
        modal.addEventListener('click', (event) => { const cardHeader = event.target.closest('.betterbudgyt-dept-card-header'); if (cardHeader) { const card = cardHeader.closest('.betterbudgyt-dept-card'); const body = card.querySelector('.betterbudgyt-dept-card-body'); const isExpanded = body.style.display !== 'none'; body.style.display = isExpanded ? 'none' : 'block'; const expandBtn = card.querySelector('.betterbudgyt-dept-expand-btn'); if (expandBtn) { expandBtn.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(90deg)'; expandBtn.style.background = isExpanded ? '#e2e8f0' : '#3b82f6'; expandBtn.style.color = isExpanded ? '#3b82f6' : '#fff'; } } });
        
        const toggleCheckbox = modal.querySelector('#hideMonthsToggle');
        if (toggleCheckbox) toggleCheckbox.addEventListener('change', (event) => { currentHideMonths = event.target.checked; const activeChip = modal.querySelector('.betterbudgyt-filter-chip.active'); const currentFilter = activeChip ? activeChip.dataset.filter : 'all'; const tableContainer = modal.querySelector('.betterbudgyt-comparison-table-container'); tableContainer.innerHTML = generateComparisonTable(comparisonData, currentHideMonths); if (currentFilter !== 'all') { const grids = tableContainer.querySelectorAll('.betterbudgyt-transactions-grid'); grids.forEach(grid => { const section1 = grid.querySelector('.betterbudgyt-transactions-section-1'); const section2 = grid.querySelector('.betterbudgyt-transactions-section-2'); grid.style.gridTemplateColumns = '1fr'; grid.classList.add('single-column-mode'); if (currentFilter === 'dataset1') { if (section1) section1.style.display = ''; if (section2) section2.style.display = 'none'; } else if (currentFilter === 'dataset2') { if (section1) section1.style.display = 'none'; if (section2) section2.style.display = ''; } }); } });
      }
    })();
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');
    
    if (!win) {
      alert('Please allow pop-ups to view department details.');
      URL.revokeObjectURL(blobUrl);
    }
  }

  // Show comparison modal
  function showComparisonModal(comparisonData) {
    const modalId = `comparison-modal-${++state.comparisonModalCounter}`;
    
    // Store comparison data in state for click handlers
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
      
      // Setup hide months toggle
      setupHideMonthsToggle(modal, comparisonData, hideMonths);
      
      // Setup control buttons
      setupModalControls(modal, modalId, comparisonData, hideMonths);
      
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
              
              // Re-setup context menu handlers for comments
              const { setupContextMenuHandlers } = window.BetterBudgyt.features.comparison.comments;
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
        modal.remove();
        cleanupMinimizedTabsContainer();
      }
    });
    
    // Escape key closes
    const handleEscape = (event) => {
      if (event.key === 'Escape' && modal.style.display !== 'none') {
        const minimizedTab = document.querySelector(`.betterbudgyt-minimized-tab[data-modal-id="${modalId}"]`);
        if (minimizedTab) minimizedTab.remove();
        modal.remove();
        cleanupMinimizedTabsContainer();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Pop-out button handler
    modal.addEventListener('click', (event) => {
      const popoutBtn = event.target.closest('.betterbudgyt-dept-popout-btn');
      if (popoutBtn) {
        event.stopPropagation();
        const deptId = popoutBtn.dataset.dept;
        const hideMonthsToggle = modal.querySelector('#hideMonthsToggle');
        const currentHideMonths = hideMonthsToggle ? hideMonthsToggle.checked : false;
        openDepartmentInNewTab(deptId, comparisonData, currentHideMonths);
      }
    });
    
    // Setup right-click context menu for comments
    if (window.BetterBudgyt.features.comparison.comments) {
      window.BetterBudgyt.features.comparison.comments.setupContextMenuHandlers(modal, comparisonData);
    }
  }

  // Export to namespace
  window.BetterBudgyt.features.comparison.modal = {
    generateDeptTransactionsHtml,
    generateComparisonTable,
    exportComparisonToExcel,
    openDepartmentInNewTab,
    showComparisonModal
  };

})();
