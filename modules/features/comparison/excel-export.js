// BetterBudgyt - Comparison Excel Export
// Generates stacked dataset exports for comparison modal

(function() {
  'use strict';

  window.BetterBudgyt = window.BetterBudgyt || {};
  window.BetterBudgyt.features = window.BetterBudgyt.features || {};
  window.BetterBudgyt.features.comparison = window.BetterBudgyt.features.comparison || {};

  const { stripNumberPrefix } = window.BetterBudgyt.utils;

  const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

  // ─────────────────────────────────────────────────────────────────────────────
  // Utility functions
  // ─────────────────────────────────────────────────────────────────────────────

  function safeString(value) {
    if (value === null || value === undefined) return '';
    return String(value);
  }

  function sanitizeFilenamePart(value) {
    const str = safeString(value).trim();
    if (!str) return 'comparison';
    return str.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  }

  function decodeHtmlEntities(value) {
    const str = safeString(value);
    if (!str) return '';

    if (!str.includes('&lt;') && !str.includes('&gt;') && !str.includes('&amp;')) {
      return str;
    }

    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
  }

  function noteHtmlToPlainText(noteHtml) {
    const raw = safeString(noteHtml);
    if (!raw) return '';

    const decoded = decodeHtmlEntities(raw);

    const div = document.createElement('div');
    div.innerHTML = decoded.replace(/<img[^>]*>/gi, '');

    const text = (div.innerText || div.textContent || '').trim();

    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function padRow(row, length) {
    const padded = row.slice();
    while (padded.length < length) padded.push('');
    return padded;
  }

  function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function downloadCsvFromAoA(aoa, filename) {
    const maxLen = aoa.reduce((m, row) => Math.max(m, row.length), 0);
    const normalized = aoa.map(row => padRow(row, maxLen));
    const csvContent = normalized
      .map(row => row.map(escapeCSV).join(','))
      .join('\r\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Data helpers
  // ─────────────────────────────────────────────────────────────────────────────

  function getDatasetTotal(dataset) {
    if (!dataset) return 0;
    if (dataset.grandTotals?.total !== undefined) return dataset.grandTotals.total;
    if (dataset.totals?.total !== undefined) return dataset.totals.total;

    let sum = 0;
    (dataset.departments || []).forEach(dept => {
      (dept.transactions || []).forEach(t => {
        sum += t.total || 0;
      });
    });
    return sum;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Layout helpers
  // ─────────────────────────────────────────────────────────────────────────────

  function buildLayout({ includeMonths }) {
    // Columns: Department | Description | Vendor | (Months...) | Total | Notes
    const layout = {
      deptCol: 0,
      descCol: 1,
      vendorCol: 2,
      monthsStart: null,
      totalCol: null,
      notesCol: null,
      columnCount: 0
    };

    let c = 3;

    if (includeMonths) {
      layout.monthsStart = c;
      c += MONTHS.length;
    }

    layout.totalCol = c++;
    layout.notesCol = c++;
    layout.columnCount = c;

    return layout;
  }

  function buildColumnHeaders({ layout, includeMonths }) {
    const headers = new Array(layout.columnCount).fill('');
    headers[layout.deptCol] = 'Department';
    headers[layout.descCol] = 'Description';
    headers[layout.vendorCol] = 'Vendor';

    if (includeMonths && layout.monthsStart !== null) {
      MONTHS.forEach((m, i) => {
        headers[layout.monthsStart + i] = m;
      });
    }

    headers[layout.totalCol] = 'Total';
    headers[layout.notesCol] = 'Notes';

    return headers;
  }

  function applyWorksheetColumnWidths(ws, layout, includeMonths) {
    const cols = [];

    for (let c = 0; c < layout.columnCount; c++) {
      if (c === layout.deptCol) {
        cols.push({ wch: 24 });
      } else if (c === layout.descCol) {
        cols.push({ wch: 44 });
      } else if (c === layout.vendorCol) {
        cols.push({ wch: 26 });
      } else if (c === layout.totalCol) {
        cols.push({ wch: 14 });
      } else if (c === layout.notesCol) {
        cols.push({ wch: 36 });
      } else if (includeMonths && layout.monthsStart !== null && c >= layout.monthsStart && c < layout.monthsStart + MONTHS.length) {
        cols.push({ wch: 11 });
      } else {
        cols.push({ wch: 14 });
      }
    }

    ws['!cols'] = cols;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Sheet model builder
  // ─────────────────────────────────────────────────────────────────────────────

  function buildSheetModel(comparisonData, { sheetName, includeMonths, filterMode }) {
    const accountName = stripNumberPrefix(comparisonData?.accountName || 'Comparison') || 'Comparison';

    const includeDataset1 = filterMode === 'all' || filterMode === 'dataset1';
    const includeDataset2 = filterMode === 'all' || filterMode === 'dataset2';

    const dataset1Label = safeString(comparisonData?.dataset1?.dataType || 'Dataset 1');
    const dataset2Label = safeString(comparisonData?.dataset2?.dataType || 'Dataset 2');

    const dataset1Total = getDatasetTotal(comparisonData?.dataset1);
    const dataset2Total = getDatasetTotal(comparisonData?.dataset2);

    const layout = buildLayout({ includeMonths });
    const columnHeaders = buildColumnHeaders({ layout, includeMonths });

    const aoa = [];
    const rowMeta = [];
    const merges = [];

    const pushRow = (row, level = 0) => {
      aoa.push(padRow(row, layout.columnCount));
      rowMeta.push({ level });
    };

    // ─── Summary block ───
    const exportDate = new Date();
    pushRow(['Datasheet Comparison Export', sheetName]);
    pushRow(['Account', accountName]);
    pushRow(['Filter', filterMode]);
    pushRow(['Export Date', exportDate.toLocaleString()]);
    pushRow([]);

    if (includeDataset1) pushRow([dataset1Label, dataset1Total]);
    if (includeDataset2) pushRow([dataset2Label, dataset2Total]);
    if (includeDataset1 && includeDataset2) pushRow(['Total Variance', dataset1Total - dataset2Total]);

    pushRow([]);

    // ─── Column headers ───
    const headerRowIndex = aoa.length;
    pushRow(columnHeaders);

    // ─── Helper to add a dataset section ───
    const addDatasetSection = (dataset, datasetLabel, datasetTotal) => {
      if (!dataset) return;

      const departments = dataset.departments || [];

      // Scenario header row (merged across all columns)
      const scenarioHeaderRowIndex = aoa.length;
      const scenarioHeaderRow = new Array(layout.columnCount).fill('');
      scenarioHeaderRow[0] = datasetLabel;
      pushRow(scenarioHeaderRow, 0);

      // Merge the scenario header row
      if (layout.columnCount > 1) {
        merges.push({
          s: { r: scenarioHeaderRowIndex, c: 0 },
          e: { r: scenarioHeaderRowIndex, c: layout.columnCount - 1 }
        });
      }

      // Transaction rows grouped by department
      departments.forEach(dept => {
        const deptName = stripNumberPrefix(safeString(dept.departmentName)) || 'Department';
        const transactions = dept.transactions || [];

        transactions.forEach(t => {
          const row = new Array(layout.columnCount).fill('');

          row[layout.deptCol] = deptName;
          row[layout.descCol] = safeString(t.description || 'No Description');
          row[layout.vendorCol] = stripNumberPrefix(safeString(t.vendor)) || '-';

          if (includeMonths && layout.monthsStart !== null) {
            MONTHS.forEach((m, i) => {
              row[layout.monthsStart + i] = t.monthly?.[m] || 0;
            });
          }

          row[layout.totalCol] = t.total || 0;
          row[layout.notesCol] = noteHtmlToPlainText(t.note);

          pushRow(row, 1);
        });
      });

      // Scenario subtotal row
      const subtotalRow = new Array(layout.columnCount).fill('');
      subtotalRow[layout.deptCol] = `${datasetLabel} Total`;
      subtotalRow[layout.totalCol] = datasetTotal;
      pushRow(subtotalRow, 0);

      // Blank separator
      pushRow([]);
    };

    // ─── Add dataset sections ───
    if (includeDataset1) {
      addDatasetSection(comparisonData?.dataset1, dataset1Label, dataset1Total);
    }

    if (includeDataset2) {
      addDatasetSection(comparisonData?.dataset2, dataset2Label, dataset2Total);
    }

    // ─── Total Variance row (only when both datasets included) ───
    if (includeDataset1 && includeDataset2) {
      const varianceRow = new Array(layout.columnCount).fill('');
      varianceRow[layout.deptCol] = 'TOTAL VARIANCE';
      varianceRow[layout.totalCol] = dataset1Total - dataset2Total;
      pushRow(varianceRow, 0);
    }

    return {
      aoa,
      rowMeta,
      merges,
      layout,
      includeMonths,
      headerRowIndex
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Apply worksheet features
  // ─────────────────────────────────────────────────────────────────────────────

  function applyWorksheetFeatures(ws, model) {
    if (!window.XLSX || !window.XLSX.utils) return;

    const { layout, merges, rowMeta, headerRowIndex, includeMonths } = model;

    // Column widths
    applyWorksheetColumnWidths(ws, layout, includeMonths);

    // Merged cells (scenario headers)
    if (merges.length > 0) {
      ws['!merges'] = merges;
    }

    // Outline groups (transaction rows are level 1, headers/subtotals are level 0)
    ws['!outline'] = { above: true, left: true };
    ws['!rows'] = rowMeta.map(m => ({ level: m.level || 0 }));

    // Autofilter on column headers
    const lastCol = layout.columnCount - 1;
    const start = window.XLSX.utils.encode_cell({ r: headerRowIndex, c: 0 });
    const end = window.XLSX.utils.encode_cell({ r: headerRowIndex, c: lastCol });
    ws['!autofilter'] = { ref: `${start}:${end}` };

    // Freeze panes: keep summary + column headers visible
    const ySplit = headerRowIndex + 1;
    ws['!freeze'] = {
      xSplit: 0,
      ySplit,
      topLeftCell: window.XLSX.utils.encode_cell({ r: ySplit, c: 0 }),
      activePane: 'bottomRight',
      state: 'frozen'
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Main export function
  // ─────────────────────────────────────────────────────────────────────────────

  function exportComparisonToExcel(comparisonData, filterMode = 'all') {
    const includeDataset1 = filterMode === 'all' || filterMode === 'dataset1';
    const includeDataset2 = filterMode === 'all' || filterMode === 'dataset2';

    if (!includeDataset1 && !includeDataset2) {
      alert('Nothing to export: unknown filter mode.');
      return;
    }

    const accountName = stripNumberPrefix(comparisonData?.accountName || 'Comparison') || 'Comparison';

    const filterSuffix = filterMode === 'all' ? '' : `_${sanitizeFilenamePart(filterMode)}`;
    const baseFilename = `comparison_${sanitizeFilenamePart(accountName)}${filterSuffix}_${new Date().toISOString().split('T')[0]}`;

    const totalModel = buildSheetModel(comparisonData, { sheetName: 'Total', includeMonths: false, filterMode });
    const monthsModel = buildSheetModel(comparisonData, { sheetName: 'Months', includeMonths: true, filterMode });

    if (window.XLSX && window.XLSX.utils && window.XLSX.writeFile) {
      const wb = window.XLSX.utils.book_new();

      const totalWs = window.XLSX.utils.aoa_to_sheet(totalModel.aoa);
      const monthsWs = window.XLSX.utils.aoa_to_sheet(monthsModel.aoa);

      applyWorksheetFeatures(totalWs, totalModel);
      applyWorksheetFeatures(monthsWs, monthsModel);

      window.XLSX.utils.book_append_sheet(wb, totalWs, 'Total');
      window.XLSX.utils.book_append_sheet(wb, monthsWs, 'Months');

      window.XLSX.writeFile(wb, `${baseFilename}.xlsx`);
      return;
    }

    // CSV fallback: two files
    downloadCsvFromAoA(totalModel.aoa, `${baseFilename}_Total.csv`);
    downloadCsvFromAoA(monthsModel.aoa, `${baseFilename}_Months.csv`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Export to namespace
  // ─────────────────────────────────────────────────────────────────────────────

  window.BetterBudgyt.features.comparison.excelExport = {
    exportComparisonToExcel
  };

})();
