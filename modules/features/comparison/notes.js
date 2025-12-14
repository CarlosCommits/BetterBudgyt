// BetterBudgyt - Comparison Notes
// Handles adding/viewing notes (row-based) in the comparison modal
// Notes are different from comments - they attach to the entire transaction row, not individual cells

(function() {
  'use strict';

  window.BetterBudgyt = window.BetterBudgyt || {};
  window.BetterBudgyt.features = window.BetterBudgyt.features || {};
  window.BetterBudgyt.features.comparison = window.BetterBudgyt.features.comparison || {};

  const { escapeHtml } = window.BetterBudgyt.utils;
  const FULL_STORES_FALLBACK = '567,568,569,570,571,572,573,574,575,576,577,578,579,582,580';

  // Get current user name from the page (used for note attribution)
  function getCurrentUserName() {
    // Try to get from the page header/menu
    const userNameEl = document.querySelector('.username, .user-name, #userName, .nav-user-name');
    if (userNameEl) return userNameEl.textContent.trim();
    
    // Try from dropdown menu
    const dropdownUser = document.querySelector('.dropdown-user .username, .user-dropdown .name');
    if (dropdownUser) return dropdownUser.textContent.trim();
    
    // Default fallback
    return 'User';
  }

  // Format current date for note
  function formatNoteDate() {
    const now = new Date();
    return `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
  }

  // Build the HTML-formatted note string (matches Budgyt's format)
  function formatNoteHtml(noteText, existingNotes = '') {
    const userName = getCurrentUserName();
    const date = formatNoteDate();
    
    // Format: <br/><img class='img-circle layout-menu-image' src=/assets/admin/layout/img/user-male-placeholder.png /><b>Username Date</b> : note text
    const newNote = `<br/><img class='img-circle layout-menu-image' src=/assets/admin/layout/img/user-male-placeholder.png /><b>${userName} ${date}</b> : ${noteText}`;
    
    // Append to existing notes
    return existingNotes + newNote;
  }

  // Prefer the first non-empty, non "-1" identifier in the list
  function resolveId(...candidates) {
    for (const candidate of candidates) {
      if (candidate === undefined || candidate === null) continue;
      const str = String(candidate).trim();
      if (str && str !== '-1' && str.toLowerCase() !== 'nan') return str;
    }
    return null;
  }

  // Show the add note modal
  function showAddNoteModal(transactionData, datasetInfo) {
    // Remove any existing modal
    const existingModal = document.querySelector('.betterbudgyt-add-note-overlay');
    if (existingModal) existingModal.remove();
    
    const overlay = document.createElement('div');
    overlay.className = 'betterbudgyt-add-note-overlay';
    overlay.innerHTML = `
      <div class="betterbudgyt-add-note-modal">
        <div class="betterbudgyt-add-note-header">
          <span class="betterbudgyt-add-note-title">Add Note</span>
          <button class="betterbudgyt-add-note-close">&times;</button>
        </div>
        <div class="betterbudgyt-add-note-content">
          <div class="betterbudgyt-add-note-info">
            <div class="betterbudgyt-add-note-info-row">
              <span class="betterbudgyt-add-note-info-label">Transaction:</span>
              <span class="betterbudgyt-add-note-info-value">${escapeHtml(transactionData.description || 'No Description')}</span>
            </div>
            <div class="betterbudgyt-add-note-info-row">
              <span class="betterbudgyt-add-note-info-label">Dataset:</span>
              <span class="betterbudgyt-add-note-info-value">${escapeHtml(datasetInfo.dataType || 'Unknown')}</span>
            </div>
            ${transactionData.note ? `
            <div class="betterbudgyt-add-note-existing">
              <span class="betterbudgyt-add-note-info-label">Existing Note:</span>
              <div class="betterbudgyt-add-note-existing-content">${escapeHtml(transactionData.note)}</div>
            </div>
            ` : ''}
          </div>
          
          <div class="betterbudgyt-add-note-field">
            <label>Note <span class="required">*</span></label>
            <textarea class="betterbudgyt-add-note-text" placeholder="Enter your note..." rows="4"></textarea>
          </div>
        </div>
        <div class="betterbudgyt-add-note-footer">
          <div class="betterbudgyt-add-note-status"></div>
          <div class="betterbudgyt-add-note-actions">
            <button class="betterbudgyt-add-note-cancel">Close</button>
            <button class="betterbudgyt-add-note-save">Save Note</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Focus the textarea
    const textarea = overlay.querySelector('.betterbudgyt-add-note-text');
    textarea.focus();
    
    // Event handlers
    const closeModal = () => overlay.remove();
    
    overlay.querySelector('.betterbudgyt-add-note-close').addEventListener('click', closeModal);
    overlay.querySelector('.betterbudgyt-add-note-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    
    // Escape key closes
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Save button
    overlay.querySelector('.betterbudgyt-add-note-save').addEventListener('click', async () => {
      const noteText = textarea.value.trim();
      if (!noteText) {
        showStatus(overlay, 'Please enter a note.', 'error');
        return;
      }
      
      const saveBtn = overlay.querySelector('.betterbudgyt-add-note-save');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      showStatus(overlay, 'Saving note...', 'info');
      
      try {
        const result = await saveNote(transactionData, datasetInfo, noteText);
        showStatus(overlay, 'Note saved successfully!', 'success');
        
        // Update the visual indicator and cached data with the FULL note HTML (including all previous notes)
        updateNoteIndicator(transactionData.plElementUID, datasetInfo, result.fullNoteHtml);
        
        setTimeout(closeModal, 1500);
      } catch (error) {
        console.error('Failed to save note:', error);
        showStatus(overlay, `Failed to save: ${error.message}`, 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Note';
      }
    });
  }

  function showStatus(overlay, message, type) {
    const statusEl = overlay.querySelector('.betterbudgyt-add-note-status');
    statusEl.textContent = message;
    statusEl.className = `betterbudgyt-add-note-status ${type}`;
  }

  // Update the note indicator in the UI after saving
  function updateNoteIndicator(plElementUID, datasetInfo, displayNoteText) {
    try {
      // Update cached comparison data so future renders include the note
      const state = window.BetterBudgyt.state;
      const data = state?.currentComparisonData;
      if (data) {
        const targetDatasets = [];
        if (datasetInfo?.datasetIndex === 1) targetDatasets.push(data.dataset1);
        else if (datasetInfo?.datasetIndex === 2) targetDatasets.push(data.dataset2);
        else targetDatasets.push(data.dataset1, data.dataset2);
        
        targetDatasets.forEach(ds => {
          if (!ds?.departments) return;
          ds.departments.forEach(dept => {
            const tx = dept.transactions?.find(t => String(t.plElementUID) === String(plElementUID));
            if (tx) {
              tx.note = displayNoteText || tx.note || 'Note added';
            }
          });
        });
      }
      
      // Update the open modal DOM (if present)
      const modal = document.querySelector('.betterbudgyt-comparison-modal');
      if (modal) {
        const descCells = modal.querySelectorAll(`.betterbudgyt-mini-desc[data-pl-element-uid="${plElementUID}"]`);
        descCells.forEach(cell => {
          const row = cell.closest('tr');
          if (row) row.classList.add('has-note');
          
          let icon = cell.querySelector('.betterbudgyt-note-icon');
          if (!icon) {
            icon = document.createElement('span');
            icon.className = 'betterbudgyt-note-icon';
            icon.textContent = '📝';
            icon.dataset.pluid = plElementUID;
            cell.insertBefore(icon, cell.firstChild);
          }
          icon.dataset.note = displayNoteText || icon.dataset.note || 'Note added';
          icon.dataset.desc = cell.dataset.desc || icon.dataset.desc || (cell.textContent || '').trim();
          icon.title = 'Click to view note';
        });
      }
      
      console.log('Note indicator updated for plElementUID:', plElementUID);
    } catch (e) {
      console.warn('Failed to update note indicator UI:', e);
    }
  }

  // Activate the budget session before saving
  // This must call CheckBudgetInSession (like comments.js does) for SaveDataInput to work
  async function activateBudgetSession(datasetInfo) {
    const budgetId = parseInt(datasetInfo.budgetId);
    const budgetYear = parseInt(datasetInfo.budgetYear);
    
    if (!budgetId || !budgetYear) {
      console.warn('Missing budget session info for notes');
      return;
    }
    
    console.log('Activating budget session for notes:', { budgetId, budgetYear, dataHref: datasetInfo.dataHref });
    
    // Step 1: Use the data-fetcher's primeBudgetSession function for initial session priming (GET request)
    const dataFetcher = window.BetterBudgyt.features.comparison.dataFetcher;
    if (dataFetcher && datasetInfo.dataHref) {
      await dataFetcher.primeBudgetSession(datasetInfo.dataHref);
    }
    
    // Step 2: Call CheckBudgetInSession to activate the budget for modification (like comments.js does)
    // IMPORTANT: Use "BudgetId" (not "BudgetUID") - this matches the working comments implementation
    try {
      const response = await fetch('/Budget/CheckBudgetInSession', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json, text/javascript, */*; q=0.01'
        },
        body: JSON.stringify({
          BudgetId: budgetId,
          BudgetYear: budgetYear
        })
      });
      
      if (response.ok) {
        console.log('Budget session activated via CheckBudgetInSession');
      } else {
        // Don't throw - the session might still work (302 redirect in extension context is common)
        console.warn('CheckBudgetInSession returned:', response.status, '- continuing anyway');
      }
    } catch (e) {
      console.warn('CheckBudgetInSession call failed:', e, '- continuing anyway');
    }
  }

  // Fetch the current row data from Budgyt to get the full transaction info
  async function fetchRowDataForTransaction(transactionData, datasetInfo) {
    // Use level 2 to expand the department and get transaction rows (data-level="3")
    const parameters = {
      level: '2',
      StoreUID: resolveId(transactionData.storeUID, datasetInfo.storeUID, (datasetInfo.stores || '').split(',')[0], '-1'),
      DeptUID: resolveId(datasetInfo.deptUID, '3') || '3',
      CategoryUID: resolveId(datasetInfo.categoryUID, '-1') || '-1',
      groupedcategory: datasetInfo.groupedcategory,
      CompNonCompfilter: '',
      Stores: datasetInfo.stores || FULL_STORES_FALLBACK,
      viewLevel: 'CATEGORY',
      vendorIdCSV: '-2',
      showInGlobal: 'true',
      bsMode: '',
      categoryType: 'PL',
      localoffset: new Date().getTimezoneOffset().toString()
    };
    
    console.log('Fetching row data with parameters:', parameters);
    
    // Build the proper referer URL
    const budgetId = parseInt(datasetInfo.budgetId);
    const budgetYear = parseInt(datasetInfo.budgetYear);
    const refererUrl = datasetInfo.dataHref 
      ? `${window.location.origin}${datasetInfo.dataHref}` 
      : `${window.location.origin}/Budget/DataInput/${budgetId}/${budgetYear}`;

    const response = await fetch('/Budget/GetRowData', {
      method: 'POST',
      credentials: 'same-origin',
      referrer: refererUrl,
      referrerPolicy: 'unsafe-url',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'text/html, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(parameters)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch row data: HTTP ${response.status}`);
    }
    
    const html = await response.text();
    console.log('GetRowData response length:', html.length, 'First 500 chars:', html.substring(0, 500));
    return html;
  }

  // Parse the raw HTML to extract transaction data needed for SaveDataInput
  function parseRawTransactionData(html, targetPlElementUID, datasetInfo) {
    // Wrap HTML in table tags - DOMParser needs proper table context for <tr> elements
    const wrappedHtml = `<table><tbody>${html}</tbody></table>`;
    const parser = new DOMParser();
    const doc = parser.parseFromString(wrappedHtml, 'text/html');
    
    const transactions = [];
    // Get all rows with data-level="3" which are transaction rows
    const rows = doc.querySelectorAll('tr[data-level="3"]');
    
    console.log('Found', rows.length, 'rows with data-level="3"');
    
    let netSalesData = { Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0, Jan: 0, Feb: 0, Mar: 0 };

    // First pass: find Net Sales row for DATNetSalesM* values (look across all rows)
    const allRows = doc.querySelectorAll('tr');
    allRows.forEach(row => {
      const title = row.querySelector('td')?.getAttribute('title') || '';
      if (title && title.toLowerCase().includes('net sales')) {
        const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
        months.forEach((month, i) => {
          const cell = row.querySelector(`td.data[data-period="P${i + 1}"], td.data[data-Period="P${i + 1}"]`);
          if (cell) {
            const span = cell.querySelector('span');
            const raw = (span?.textContent || cell.textContent || '0').replace(/,/g, '');
            const val = parseFloat(raw) || 0;
            netSalesData[month] = val;
          }
        });
      }
    });
    
    // Second pass: extract all transaction data
    rows.forEach(row => {
      // Prefer the hidden PLElementUID (numeric) over the row id (GUID)
      const plHiddenCell = row.querySelector('td#hdnPLElementUID, td[id="hdnPLElementUID"]');
      let plElementUID = plHiddenCell ? (plHiddenCell.textContent || plHiddenCell.innerText || '').trim() : '';
      if (!plElementUID) {
        plElementUID = row.id || '';
      }
      
      // Skip rows without a valid id
      if (!plElementUID || plElementUID.length < 2) return;
      
      // Skip non-transaction rows (totals, net sales, %LY, %LLY, historical data)
      // Transaction rows have class "bottomLevel" - we want those
      // Skip rows that are specifically for display only (doNotExpand, LevelPercentLY, historicaldata)
      if (row.classList.contains('doNotExpand') || 
          row.classList.contains('netsales') || 
          row.classList.contains('LevelPercentLY') ||
          row.classList.contains('historicaldata')) {
        return;
      }
      
      // Must be an actual transaction row (has bottomLevel class)
      if (!row.classList.contains('bottomLevel')) return;
      
      const transaction = {
        plElementUID: plElementUID,
        description: '',
        vendor: '',
        monthly: {},
        monthlyPercent: {},
        storeUID: '-1',
        deptUID: '-1',
        catUID: '-1',
        vendorUIDCSV: '',
        existingNotes: ''
      };
      
      // Description - try multiple sources
      const descInput = row.querySelector('input.isDescription');
      if (descInput && descInput.value) {
        transaction.description = descInput.value.trim();
      } else {
        const descSpan = row.querySelector('span.desc-field, span.approved-row-desc');
        if (descSpan) {
          transaction.description = descSpan.getAttribute('data-value') || descSpan.textContent.trim();
        } else {
          const descCell = row.querySelector('td[title]');
          if (descCell) {
            transaction.description = descCell.getAttribute('title') || descCell.textContent.trim();
          }
        }
      }
      
      // Monthly values
      const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
      months.forEach((month, i) => {
        // Dollar values - prefer input value, then span data-value, then span text
        const dataCell = row.querySelector(`td.data[data-period="P${i + 1}"]`);
        if (dataCell) {
          const input = dataCell.querySelector('input');
          const span = dataCell.querySelector('span');
          let val = 0;
          if (input && input.value) {
            val = parseFloat(input.value.replace(/,/g, '')) || 0;
          } else if (span) {
            val = parseFloat(span.getAttribute('data-value') || span.textContent.replace(/,/g, '')) || 0;
          }
          transaction.monthly[month] = val;
        } else {
          transaction.monthly[month] = 0;
        }
        
        // Percentage values - prefer input value
        const pctCell = row.querySelector(`td.percentage[data-period="P${i + 1}"]`);
        if (pctCell) {
          const pctInput = pctCell.querySelector('input');
          let pctVal = 0;
          if (pctInput && pctInput.value) {
            pctVal = parseFloat(pctInput.value.replace(/,/g, '')) || 0;
          } else {
            pctVal = parseFloat(pctCell.getAttribute('data-percentval') || pctCell.textContent.replace(/,/g, '')) || 0;
          }
          transaction.monthlyPercent[month] = pctVal / 100; // Convert to decimal
        } else {
          transaction.monthlyPercent[month] = 0;
        }
      });
      
      // Hidden fields
      const storeCell = row.querySelector('td#hdnStoreUID, td[id="hdnStoreUID"]');
      const rawStore = storeCell ? (storeCell.textContent.trim() || storeCell.getAttribute('data-id')) : null;
      const fallbackStore = resolveId(rawStore, datasetInfo?.storeUID, (datasetInfo?.stores || '').split(',')[0]);
      transaction.storeUID = fallbackStore || '-1';
      
      const deptCell = row.querySelector('td#hdnDeptUID, td[id="hdnDeptUID"]');
      const rawDept = deptCell ? deptCell.textContent.trim() : null;
      transaction.deptUID = resolveId(rawDept, datasetInfo?.deptUID, '3') || '3';
      
      const catCell = row.querySelector('td#hdnCatUID, td[id="hdnCatUID"]');
      const rawCat = catCell ? catCell.textContent.trim() : null;
      transaction.catUID = resolveId(rawCat, datasetInfo?.categoryUID, datasetInfo?.catUID) || datasetInfo?.categoryUID || '-1';
      
      // Vendor - look for span.vendor in vendorLst cell
      const vendorSpan = row.querySelector('span.vendor');
      if (vendorSpan) {
        transaction.vendor = vendorSpan.getAttribute('title') || vendorSpan.textContent.trim() || '';
      }
      
      // VendorUIDCSV from hidden field
      const vendorUIDCell = row.querySelector('td#hdnVendorUIDCSV, td[id="hdnVendorUIDCSV"]');
      if (vendorUIDCell) {
        transaction.vendorUIDCSV = vendorUIDCell.textContent.trim() || '';
      }
      
      // Existing notes (hdnComment)
      // The server stores note HTML in this hidden cell, but it may be entity-encoded
      // We need to decode it to get the raw HTML for appending new notes
      const commentCell = row.querySelector('td#hdnComment, td[id="hdnComment"]');
      if (commentCell) {
        // Use textContent to get the decoded text value
        // If the server stored "&lt;br/&gt;", textContent gives us "<br/>"
        // If the server stored "<br/>", textContent also gives us "<br/>" (strips tags)
        // So we try innerHTML first and decode if needed
        let rawContent = commentCell.innerHTML || '';
        
        // Check if content looks HTML-encoded (contains &lt; or &gt;)
        if (rawContent.includes('&lt;') || rawContent.includes('&gt;')) {
          // Decode HTML entities
          const decoder = document.createElement('textarea');
          decoder.innerHTML = rawContent;
          rawContent = decoder.value;
        }
        
        transaction.existingNotes = rawContent;
      }
      
      transactions.push(transaction);
    });
    
    return { transactions, netSalesData };
  }

  // Fetch Net Sales row (level 0) to get monthly net sales values
  async function fetchNetSalesData(datasetInfo) {
    // Build the proper referer URL
    const budgetId = parseInt(datasetInfo.budgetId);
    const budgetYear = parseInt(datasetInfo.budgetYear);
    const refererUrl = datasetInfo.dataHref 
      ? `${window.location.origin}${datasetInfo.dataHref}` 
      : `${window.location.origin}/Budget/DataInput/${budgetId}/${budgetYear}`;
    
    const parameters = {
      level: '0',
      StoreUID: '-1',
      DeptUID: '-1',
      CategoryUID: '-1',
      groupedcategory: datasetInfo.groupedcategory,
      CompNonCompfilter: '',
      Stores: datasetInfo.storesFull || datasetInfo.stores || FULL_STORES_FALLBACK,
      viewLevel: 'STORE',
      vendorIdCSV: '-2',
      showInGlobal: true,
      bsMode: '',
      categoryType: 'PL',
      localoffset: new Date().getTimezoneOffset().toString()
    };

    const response = await fetch('/Budget/GetRowData', {
      method: 'POST',
      credentials: 'same-origin',
      referrer: refererUrl,
      referrerPolicy: 'unsafe-url',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'text/html, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(parameters)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch net sales: HTTP ${response.status}`);
    }

    const html = await response.text();
    const wrapped = `<table><tbody>${html}</tbody></table>`;
    const doc = new DOMParser().parseFromString(wrapped, 'text/html');
    const netSalesRow = Array.from(doc.querySelectorAll('tr')).find(r => {
      const title = r.querySelector('td')?.getAttribute('title') || '';
      return title && title.toLowerCase().includes('net sales');
    });

    const result = { Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0, Jan: 0, Feb: 0, Mar: 0 };
    if (netSalesRow) {
      const months = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
      months.forEach((month, i) => {
        const cell = netSalesRow.querySelector(`td.data[data-period="P${i+1}"], td.data[data-Period="P${i+1}"]`);
        if (cell) {
          const span = cell.querySelector('span');
          const val = parseFloat((span?.textContent || cell.textContent || '0').replace(/,/g,'')) || 0;
          result[month] = val;
        }
      });
    }
    return result;
  }

  // Prime Budgyt session with level 0 and level 1 GetRowData (mirrors native flow)
  async function primeDataInputContext(datasetInfo) {
    // Build the proper referer URL
    const budgetId = parseInt(datasetInfo.budgetId);
    const budgetYear = parseInt(datasetInfo.budgetYear);
    const refererUrl = datasetInfo.dataHref 
      ? `${window.location.origin}${datasetInfo.dataHref}` 
      : `${window.location.origin}/Budget/DataInput/${budgetId}/${budgetYear}`;
    
    const baseHeaders = {
      'Content-Type': 'application/json; charset=UTF-8',
      'Accept': 'text/html, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest'
    };
    const storesCsv = datasetInfo.storesFull || datasetInfo.stores || FULL_STORES_FALLBACK;

    // Level 0
    const level0 = {
      level: '0',
      StoreUID: '-1',
      DeptUID: '-1',
      CategoryUID: '-1',
      groupedcategory: datasetInfo.groupedcategory,
      CompNonCompfilter: '',
      Stores: storesCsv,
      viewLevel: 'STORE',
      vendorIdCSV: '-2',
      showInGlobal: true,
      bsMode: '',
      categoryType: 'PL',
      localoffset: new Date().getTimezoneOffset().toString()
    };
    // Level 1
    const level1 = {
      ...level0,
      level: '1'
    };

    for (const body of [level0, level1]) {
      try {
        const resp = await fetch('/Budget/GetRowData', {
          method: 'POST',
          credentials: 'same-origin',
          referrer: refererUrl,
          referrerPolicy: 'unsafe-url',
          headers: baseHeaders,
          body: JSON.stringify(body)
        });
        console.log('Prime GetRowData level', body.level, 'status', resp.status);
      } catch (e) {
        console.warn('Prime GetRowData failed for level', body.level, e);
      }
    }
  }

  // Helper to decode HTML entities (in case innerHTML returns encoded content)
  function decodeHtmlEntities(str) {
    if (!str) return str;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
  }

  // Build the SaveDataInput payload
  function buildSaveDataInputPayload(transactions, netSalesData, datasetInfo, targetPlElementUID, newNoteHtml) {
    const monthsOrdered = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const storeCsvFallback = Array.from(new Set(transactions.map(tx => resolveId(tx.storeUID)).filter(Boolean))).join(',');

    const data = transactions.map(tx => {
      const isTarget = tx.plElementUID === targetPlElementUID;
      const resolvedStoreUID = resolveId(tx.storeUID, datasetInfo.storeUID, (datasetInfo.stores || '').split(',')[0], '-1') || '-1';
      const resolvedDeptUID = resolveId(tx.deptUID, datasetInfo.deptUID, '3') || '3';
      const resolvedCatUID = resolveId(datasetInfo.categoryUID, tx.catUID, '-1') || '-1';
      // Compute percentage values based on net sales
      const monthlyPercent = {};
      monthsOrdered.forEach((m) => {
        const net = netSalesData[m] || 0;
        const val = tx.monthly[m] || 0;
        // Budgyt percent fields are (value / netSales) * 100
        monthlyPercent[m] = net !== 0 ? (val / net) * 100 : 0;
      });

      // Determine the Comments value for this row
      // - For the target row: use the new note HTML
      // - For other rows: use existing notes if they have any
      // IMPORTANT: Decode HTML entities to ensure raw HTML is sent (not &lt; &gt; etc.)
      let commentsValue = null;
      if (isTarget) {
        commentsValue = newNoteHtml;
      } else if (tx.existingNotes && tx.existingNotes.trim()) {
        // Decode any HTML entities that may have been encoded
        commentsValue = decodeHtmlEntities(tx.existingNotes);
      }

      // Build the row object
      const row = {
        DATValueM1: tx.monthly.Apr || 0,
        DATValueM2: tx.monthly.May || 0,
        DATValueM3: tx.monthly.Jun || 0,
        DATValueM4: tx.monthly.Jul || 0,
        DATValueM5: tx.monthly.Aug || 0,
        DATValueM6: tx.monthly.Sep || 0,
        DATValueM7: tx.monthly.Oct || 0,
        DATValueM8: tx.monthly.Nov || 0,
        DATValueM9: tx.monthly.Dec || 0,
        DATValueM10: tx.monthly.Jan || 0,
        DATValueM11: tx.monthly.Feb || 0,
        DATValueM12: tx.monthly.Mar || 0,
        DATValueM1P: monthlyPercent.Apr || 0,
        DATValueM2P: monthlyPercent.May || 0,
        DATValueM3P: monthlyPercent.Jun || 0,
        DATValueM4P: monthlyPercent.Jul || 0,
        DATValueM5P: monthlyPercent.Aug || 0,
        DATValueM6P: monthlyPercent.Sep || 0,
        DATValueM7P: monthlyPercent.Oct || 0,
        DATValueM8P: monthlyPercent.Nov || 0,
        DATValueM9P: monthlyPercent.Dec || 0,
        DATValueM10P: monthlyPercent.Jan || 0,
        DATValueM11P: monthlyPercent.Feb || 0,
        DATValueM12P: monthlyPercent.Mar || 0,
        DATNetSalesM1: netSalesData.Apr || 0,
        DATNetSalesM2: netSalesData.May || 0,
        DATNetSalesM3: netSalesData.Jun || 0,
        DATNetSalesM4: netSalesData.Jul || 0,
        DATNetSalesM5: netSalesData.Aug || 0,
        DATNetSalesM6: netSalesData.Sep || 0,
        DATNetSalesM7: netSalesData.Oct || 0,
        DATNetSalesM8: netSalesData.Nov || 0,
        DATNetSalesM9: netSalesData.Dec || 0,
        DATNetSalesM10: netSalesData.Jan || 0,
        DATNetSalesM11: netSalesData.Feb || 0,
        DATNetSalesM12: netSalesData.Mar || 0,
        VENDescription: '', // match Budgyt payload (blank)
        DATDescription: tx.description || '',
        DATPLCategoryUID: resolvedCatUID,
        DATDepartmentUID: resolvedDeptUID,
        DATStoreUID: resolvedStoreUID,
        DATVendorUID: '0',
        PLElementUID: tx.plElementUID,
        LoadFromExcel: false,
        ExcelRowNumber: -1,
        ExcelFolderName: '',
        AttachedSubCategoryFolderName: '',
        VendorUIDCSV: tx.vendorUIDCSV || '',
        CurrencyUID: '1',
        TransactionDate: new Date().toISOString(),
        DayOfPeriod: 15,
        TermUID: -1,
        AmortizePeriod: 1
      };

      // Only include Comments field if there's actually a note (matches native Budgyt behavior)
      if (commentsValue) {
        row.Comments = commentsValue;
      }

      return row;
    });
    
    // Build audit data (simplified - just the target row)
    const auditData = [];
    transactions.forEach(tx => {
      const monthValues = monthsOrdered.map(m => String(tx.monthly[m] || 0));
      const totalVal = String(Object.values(tx.monthly).reduce((a, b) => a + b, 0));
      auditData.push(['-', tx.description || '', tx.vendorUIDCSV || '', ...monthValues, totalVal, tx.plElementUID]);
      auditData.push(['+', tx.description || '', tx.vendorUIDCSV || '', ...monthValues, totalVal, tx.plElementUID]);
    });
    
    return {
      data: data,
      level: '0',
      StoreUID: '-1',
      DeptUID: '-1',
      CategoryUID: '-1',
      groupedcategory: datasetInfo.groupedcategory || '',
      Stores: datasetInfo.storesFull || datasetInfo.stores || storeCsvFallback || FULL_STORES_FALLBACK,
      CompNonCompfilter: '',
      viewLevel: 'STORE',
      AuditData: auditData,
      VendorUIDs: '-2',
      showInGlobal: true,
      growthRate: [],
      bsMode: '',
      categoryType: 'PL'
    };
  }

  // Save a note via SaveDataInput API
  async function saveNote(transactionData, datasetInfo, noteText) {
    const plElementUID = transactionData.plElementUID;
    if (!plElementUID || plElementUID === '-1') {
      throw new Error('Cannot add note - invalid transaction ID');
    }
    
    // Validate required datasetInfo fields
    if (!datasetInfo.budgetId || !datasetInfo.budgetYear) {
      console.error('Missing required datasetInfo fields:', datasetInfo);
      throw new Error('Cannot add note - missing budget context (budgetId or budgetYear). Please try reopening the comparison.');
    }
    
    console.log('Saving note for transaction:', plElementUID);
    console.log('Transaction data:', JSON.stringify(transactionData, null, 2));
    console.log('Dataset info:', JSON.stringify(datasetInfo, null, 2));
    
    // Step 1: Activate the budget session (GET DataInput)
    await activateBudgetSession(datasetInfo);

    // Step 2: Prime context similar to Budgyt native flow (level 0 + level 1)
    await primeDataInputContext(datasetInfo);

    // Step 3: Fetch Net Sales from level 0 (authoritative for percents)
    let netSalesData = {};
    try {
      netSalesData = await fetchNetSalesData(datasetInfo);
      console.log('Net sales (level 0):', netSalesData);
    } catch (e) {
      console.warn('Failed to fetch level 0 net sales:', e);
      netSalesData = { Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0, Jan: 0, Feb: 0, Mar: 0 };
    }

    // Step 4: Prepare session context
    const budgetId = parseInt(datasetInfo.budgetId);
    const budgetYear = parseInt(datasetInfo.budgetYear);
    // Build the proper referer URL that matches what the native DataInput page would use
    const refererUrl = datasetInfo.dataHref 
      ? `${window.location.origin}${datasetInfo.dataHref}` 
      : `${window.location.origin}/Budget/DataInput/${budgetId}/${budgetYear}`;
    
    console.log('Using referer URL for SaveDataInput:', refererUrl);
    
    // Step 5: Fetch fresh row data to get current state
    console.log('Fetching current row data...');
    const rowHtml = await fetchRowDataForTransaction(transactionData, datasetInfo);
    
    // Step 6: Parse the row data
    let { transactions } = parseRawTransactionData(rowHtml, plElementUID, datasetInfo);
    
    console.log('Parsed transactions count:', transactions.length);
    if (transactions.length > 0) {
      console.log('First transaction:', transactions[0]);
    }
    
    if (transactions.length === 0) {
      throw new Error('No transactions found in the response');
    }
    
    // Find the target transaction
    const targetTx = transactions.find(tx => tx.plElementUID === plElementUID);
    if (!targetTx) {
      throw new Error('Target transaction not found in response');
    }
    
    // Step 7: Build the new note HTML
    // Ensure existing notes are properly decoded before appending
    let existingNotesDecoded = targetTx.existingNotes || '';
    console.log('Existing notes (raw):', existingNotesDecoded.substring(0, 200));
    if (existingNotesDecoded.includes('&lt;') || existingNotesDecoded.includes('&gt;')) {
      console.log('Decoding HTML entities in existing notes...');
      existingNotesDecoded = decodeHtmlEntities(existingNotesDecoded);
      console.log('Existing notes (decoded):', existingNotesDecoded.substring(0, 200));
    }
    const newNoteHtml = formatNoteHtml(noteText, existingNotesDecoded);
    console.log('New note HTML (first 300 chars):', newNoteHtml.substring(0, 300));
    
    // Step 8: Build the SaveDataInput payload
    const payload = buildSaveDataInputPayload(transactions, netSalesData, datasetInfo, plElementUID, newNoteHtml);

    // Validate required identifiers before sending
    const missingIds = payload.data.find(item => item.DATStoreUID === '-1' || item.DATDepartmentUID === '-1' || item.DATPLCategoryUID === '-1');
    if (missingIds) {
      throw new Error('Missing store/department/category identifiers required to save notes');
    }
    
    console.log('Sending SaveDataInput request...');
    
    // Step 9: Send the request
    // Use referrer option to set the proper DataInput page URL as the referrer
    // Use redirect: 'error' to catch 302 redirects as errors instead of following them
    const response = await fetch('/Budget/SaveDataInput', {
      method: 'POST',
      credentials: 'same-origin',
      referrer: refererUrl,
      referrerPolicy: 'unsafe-url',
      redirect: 'manual', // Don't follow redirects - a 302 means an error occurred
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'text/html, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'localoffset': new Date().getTimezoneOffset().toString()
      },
      body: JSON.stringify(payload)
    });
    
    console.log('SaveDataInput response status:', response.status, 'type:', response.type);
    
    // Check for redirect (302) - this indicates an error on the server side
    if (response.type === 'opaqueredirect' || response.status === 302 || response.status === 301) {
      throw new Error('Server rejected the request (redirect to error page)');
    }
    
    if (!response.ok) {
      throw new Error(`Server error: HTTP ${response.status}`);
    }
    
    const responseText = await response.text();
    console.log('SaveDataInput response received, length:', responseText.length);
    
    // Check for error indicators in response
    if (responseText.includes('error') || responseText.includes('Error') || responseText.toLowerCase().includes('locked')) {
      // Try to extract error message
      const errorMatch = responseText.match(/class="error[^"]*"[^>]*>([^<]+)/i);
      if (errorMatch) {
        throw new Error(errorMatch[1]);
      }
      // Check for locked datasheet
      if (responseText.toLowerCase().includes('locked')) {
        throw new Error('This datasheet is locked for editing');
      }
      if (responseText.toLowerCase().includes('read only')) {
        throw new Error('This datasheet is read-only');
      }
    }
    
    // Check for CustomError page content (server error page)
    if (responseText.includes('CustomError') || responseText.includes('aspxerrorpath')) {
      throw new Error('Server error occurred while saving note');
    }
    
    // Return the full note HTML so the caller can update the cache
    return { success: true, fullNoteHtml: newNoteHtml };
  }

  // Parse cell/row data from click event for context menu
  function parseTransactionFromClick(element, comparisonData) {
    const row = element.closest('tr');
    if (!row) return null;
    
    const plElementUID = row.dataset.plElementUid;
    if (!plElementUID) return null;
    
    // Determine which dataset this belongs to
    const section = element.closest('.betterbudgyt-transactions-section');
    const isDataset1 = section?.classList.contains('betterbudgyt-transactions-section-1');
    const datasetIndex = isDataset1 ? 1 : 2;
    const dataset = datasetIndex === 1 ? comparisonData.dataset1 : comparisonData.dataset2;
    
    // Find the transaction in the dataset
    let transaction = null;
    let department = null;
    
    if (dataset?.departments) {
      for (const dept of dataset.departments) {
        const found = dept.transactions?.find(tx => tx.plElementUID === plElementUID);
        if (found) {
          transaction = found;
          department = dept;
          break;
        }
      }
    }
    
    if (!transaction) return null;
    
    return {
      transactionData: {
        ...transaction,
        storeUID: department?.storeUID,
        deptUID: department?.deptUID
      },
      datasetInfo: {
        datasetIndex,
        dataType: dataset.dataType,
        budgetId: dataset.budgetId,
        budgetYear: dataset.budgetYear,
        dataHref: dataset.dataHref,
        categoryUID: dataset.categoryUID,
        groupedcategory: dataset.groupedcategory,
        stores: dataset.stores,
        storesFull: dataset.storesFull || dataset.stores,
        storeUID: department?.storeUID,
        deptUID: department?.deptUID
      }
    };
  }

  // Export to namespace
  window.BetterBudgyt.features.comparison.notes = {
    showAddNoteModal,
    saveNote,
    parseTransactionFromClick,
    formatNoteHtml,
    getCurrentUserName
  };

})();
