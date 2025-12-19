// BetterBudgyt - Comparison Transactions
// Handles creating new transaction lines in the comparison modal

(function() {
  'use strict';

  window.BetterBudgyt = window.BetterBudgyt || {};
  window.BetterBudgyt.features = window.BetterBudgyt.features || {};
  window.BetterBudgyt.features.comparison = window.BetterBudgyt.features.comparison || {};

  const { escapeHtml, formatNumber } = window.BetterBudgyt.utils;
  const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  const FULL_STORES_FALLBACK = '567,568,569,570,571,572,573,574,575,576,577,578,579,582,580';

  // Check if a dataset is editable
  function isDatasetEditable(datasetInfo) {
    return datasetInfo?.isEditable === true;
  }

  // Get locked months for a dataset
  function getLockedMonths(datasetInfo) {
    return new Set(datasetInfo?.lockedMonths || []);
  }

  // Get unlocked months
  function getUnlockedMonths(datasetInfo) {
    const locked = getLockedMonths(datasetInfo);
    return MONTHS.filter(m => !locked.has(m));
  }

  // Distribute total amount across unlocked months (integers only)
  function distributeAmountAcrossMonths(total, unlockedMonths) {
    const distribution = {};
    MONTHS.forEach(m => distribution[m] = 0);
    
    if (unlockedMonths.length === 0 || total <= 0) {
      return distribution;
    }
    
    const count = unlockedMonths.length;
    const base = Math.floor(total / count);
    let remainder = total - (base * count);
    
    // Distribute base amount to all unlocked months
    unlockedMonths.forEach(m => {
      distribution[m] = base;
    });
    
    // Distribute remainder starting from last unlocked months
    const reversed = [...unlockedMonths].reverse();
    for (let i = 0; i < remainder; i++) {
      distribution[reversed[i]] += 1;
    }
    
    return distribution;
  }

  // Show the Add Transaction modal
  // showDatasetSelector: if false, never show dataset selector (user already chose)
  function showAddTransactionModal(departmentInfo, datasetInfo, comparisonData, hideMonths = false, allowDatasetSwitch = true) {
    // Validate editability
    if (!isDatasetEditable(datasetInfo)) {
      alert('This scenario is locked and cannot be edited.');
      return;
    }
    
    const lockedMonths = getLockedMonths(datasetInfo);
    const unlockedMonths = getUnlockedMonths(datasetInfo);
    
    if (unlockedMonths.length === 0) {
      alert('All months are locked. Cannot add transactions.');
      return;
    }
    
    // Remove any existing modal
    const existingModal = document.querySelector('.betterbudgyt-add-tx-overlay');
    if (existingModal) existingModal.remove();
    
    // Build both amount entry UIs (toggleable within the modal)
    const totalSectionHtml = `
        <div class="betterbudgyt-add-tx-total-section" style="${hideMonths ? '' : 'display:none;'}">
          <div class="betterbudgyt-add-tx-field">
            <label>Total Amount <span class="required">*</span></label>
            <input type="number" class="betterbudgyt-add-tx-total-input" placeholder="0" min="1" step="1">
            <div class="betterbudgyt-add-tx-distribution-info">
              Will be distributed across ${unlockedMonths.length} unlocked month(s): ${unlockedMonths.join(', ')}
            </div>
            <div class="betterbudgyt-add-tx-distribution-preview" style="display:none;"></div>
          </div>
        </div>
      `;

    const monthsSectionHtml = `
        <div class="betterbudgyt-add-tx-months-section" style="${hideMonths ? 'display:none;' : ''}">
          <div class="betterbudgyt-add-tx-field">
            <label>Monthly Amounts <span class="required">*</span> <small>(at least one required)</small></label>
            <div class="betterbudgyt-add-tx-month-grid">
              ${MONTHS.map(m => {
                const isLocked = lockedMonths.has(m);
                return `
                  <div class="betterbudgyt-add-tx-month-item ${isLocked ? 'locked' : ''}">
                    <label>${m}${isLocked ? ' <span class="lock-icon">&#128274;</span>' : ''}</label>
                    <input type="number" 
                           class="betterbudgyt-add-tx-month-input" 
                           data-month="${m}"
                           placeholder="0"
                           min="0"
                           step="1"
                           ${isLocked ? 'disabled' : ''}>
                  </div>
                `;
              }).join('')}
            </div>
            <div class="betterbudgyt-add-tx-total-display">
              Total: <span class="betterbudgyt-add-tx-calculated-total">0</span>
            </div>
          </div>
        </div>
      `;

    const amountFieldsHtml = `${totalSectionHtml}${monthsSectionHtml}`;
    
    // Check if other dataset is also editable (for selector)
    // Only show selector if allowDatasetSwitch is true AND other dataset is editable
    const otherDataset = datasetInfo.datasetIndex === 1 ? comparisonData.dataset2 : comparisonData.dataset1;
    const otherEditable = isDatasetEditable(otherDataset);
    const showDatasetSelector = allowDatasetSwitch && otherEditable;
    
    const initialDatasetIndex = datasetInfo?.datasetIndex === 1 ? 1 : 2;

    const overlay = document.createElement('div');
    overlay.className = 'betterbudgyt-add-tx-overlay';
    overlay.innerHTML = `
      <div class="betterbudgyt-add-tx-modal bb-addtx-dataset${initialDatasetIndex}">
        <div class="betterbudgyt-add-tx-header">
          <span class="betterbudgyt-add-tx-title">Add Transaction</span>
          <button class="betterbudgyt-add-tx-close">&times;</button>
        </div>
        <div class="betterbudgyt-add-tx-content">
          <div class="betterbudgyt-add-tx-context">
            <div class="betterbudgyt-add-tx-context-item">
              <strong>Account:</strong> ${escapeHtml(comparisonData.accountName || 'N/A')}
            </div>
            <div class="betterbudgyt-add-tx-context-item">
              <strong>Department:</strong> ${escapeHtml(departmentInfo.departmentName || 'N/A')}
            </div>
          </div>
          
          <div class="betterbudgyt-add-tx-row">
            <div class="betterbudgyt-add-tx-field betterbudgyt-add-tx-field--grow">
              <label>${showDatasetSelector ? 'Add to Dataset' : 'Dataset'}</label>
              ${showDatasetSelector ? `
              <select class="betterbudgyt-add-tx-dataset-select">
                <option value="1" ${datasetInfo.datasetIndex === 1 ? 'selected' : ''}>${escapeHtml(comparisonData.dataset1.dataType)}</option>
                <option value="2" ${datasetInfo.datasetIndex === 2 ? 'selected' : ''}>${escapeHtml(comparisonData.dataset2.dataType)}</option>
              </select>
              ` : `
              <div class="betterbudgyt-add-tx-dataset-static">${escapeHtml(datasetInfo.dataType)}</div>
              `}
            </div>
            <div class="betterbudgyt-add-tx-field betterbudgyt-add-tx-field--toggle">
              <label class="betterbudgyt-comparison-toggle-container" title="Toggle between monthly entry and total-only entry">
                <input type="checkbox" class="betterbudgyt-add-tx-hide-months-toggle" ${hideMonths ? 'checked' : ''}>
                <span class="betterbudgyt-comparison-toggle-slider"></span>
                <span class="betterbudgyt-comparison-toggle-label">Hide Months</span>
              </label>
            </div>
          </div>
          
          <div class="betterbudgyt-add-tx-field">
            <label>Description <span class="required">*</span></label>
            <input type="text" class="betterbudgyt-add-tx-desc" placeholder="Enter transaction description..." maxlength="500">
          </div>
          
          ${amountFieldsHtml}
        </div>
        <div class="betterbudgyt-add-tx-footer">
          <div class="betterbudgyt-add-tx-status"></div>
          <div class="betterbudgyt-add-tx-actions">
            <button class="betterbudgyt-add-tx-cancel">Cancel</button>
            <button class="betterbudgyt-add-tx-save">Save Transaction</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Focus description field
    const descInput = overlay.querySelector('.betterbudgyt-add-tx-desc');
    descInput.focus();
    
    // Setup event handlers
    setupAddTransactionModalHandlers(overlay, departmentInfo, datasetInfo, comparisonData, hideMonths);
  }

  // Setup modal event handlers
  function setupAddTransactionModalHandlers(overlay, departmentInfo, datasetInfo, comparisonData, hideMonths) {
    const closeModal = () => overlay.remove();
    
    // Close handlers
    overlay.querySelector('.betterbudgyt-add-tx-close').addEventListener('click', closeModal);
    overlay.querySelector('.betterbudgyt-add-tx-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    
    // Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Theme the Add Transaction modal based on target dataset (1=blue, 2=green)
    const modalEl = overlay.querySelector('.betterbudgyt-add-tx-modal');
    const applyAddTxTheme = (datasetIndex) => {
      if (!modalEl) return;
      const isDataset1 = Number(datasetIndex) === 1;
      modalEl.classList.toggle('bb-addtx-dataset1', isDataset1);
      modalEl.classList.toggle('bb-addtx-dataset2', !isDataset1);
    };

    // Track current target dataset (may change if user switches)
    let currentTargetDataset = datasetInfo;
    applyAddTxTheme(currentTargetDataset?.datasetIndex);

    // Track current input mode within the modal (independent of main modal hideMonths toggle)
    // true = total-only mode ("Hide Months"), false = monthly amounts
    let currentHideMonthsMode = !!hideMonths;
    
    // Total input with distribution preview
    const totalInput = overlay.querySelector('.betterbudgyt-add-tx-total-input');
    if (totalInput) {
      const previewEl = overlay.querySelector('.betterbudgyt-add-tx-distribution-preview');
      totalInput.addEventListener('input', () => {
        const total = parseInt(totalInput.value) || 0;
        if (total > 0 && previewEl) {
          const unlockedMonths = getUnlockedMonths(currentTargetDataset);
          const dist = distributeAmountAcrossMonths(total, unlockedMonths);
          const preview = unlockedMonths.map(m => `${m}: ${formatNumber(dist[m])}`).join(', ');
          previewEl.textContent = `Distribution: ${preview}`;
          previewEl.style.display = '';
        } else if (previewEl) {
          previewEl.style.display = 'none';
        }
      });
    }

    // UX: hide "0" placeholder on focus (prevents caret-over-0)
    const setupZeroPlaceholderHideOnFocus = (inputEl) => {
      if (!inputEl) return;
      if (!('bbOriginalPlaceholder' in inputEl.dataset)) {
        inputEl.dataset.bbOriginalPlaceholder = inputEl.getAttribute('placeholder') || '';
      }

      inputEl.addEventListener('focus', () => {
        inputEl.setAttribute('placeholder', '');
        // If there's a real value, select it for quick overwrite
        if (inputEl.value) {
          try { inputEl.select(); } catch (e) { /* ignore */ }
        }
      });

      inputEl.addEventListener('blur', () => {
        if (!inputEl.value) {
          inputEl.setAttribute('placeholder', inputEl.dataset.bbOriginalPlaceholder || '');
        }
      });
    };

    if (totalInput) setupZeroPlaceholderHideOnFocus(totalInput);
    
    // Month inputs with auto-total
    const monthInputs = overlay.querySelectorAll('.betterbudgyt-add-tx-month-input');
    monthInputs.forEach(setupZeroPlaceholderHideOnFocus);

    const totalDisplay = overlay.querySelector('.betterbudgyt-add-tx-calculated-total');
    const recalcMonthTotal = () => {
      if (!totalDisplay) return 0;
      let sum = 0;
      monthInputs.forEach(mi => {
        if (mi.disabled) return;
        sum += parseInt(mi.value) || 0;
      });
      totalDisplay.textContent = formatNumber(sum);
      return sum;
    };

    if (monthInputs.length > 0 && totalDisplay) {
      monthInputs.forEach(input => {
        input.addEventListener('input', () => {
          recalcMonthTotal();
        });
      });
    }

    // In-modal toggle: switch between total-only and monthly entry
    const modeToggle = overlay.querySelector('.betterbudgyt-add-tx-hide-months-toggle');
    const totalSection = overlay.querySelector('.betterbudgyt-add-tx-total-section');
    const monthsSection = overlay.querySelector('.betterbudgyt-add-tx-months-section');

    const setMode = (newHideMonthsMode) => {
      currentHideMonthsMode = !!newHideMonthsMode;

      if (totalSection) totalSection.style.display = currentHideMonthsMode ? '' : 'none';
      if (monthsSection) monthsSection.style.display = currentHideMonthsMode ? 'none' : '';

      // When switching to total-only mode, derive total from monthly inputs
      if (currentHideMonthsMode) {
        const currentSum = recalcMonthTotal();
        if (totalInput) {
          totalInput.value = currentSum > 0 ? String(currentSum) : (totalInput.value || '');
          totalInput.dispatchEvent(new Event('input'));
        }
        return;
      }

      // When switching to monthly mode, auto-distribute total into unlocked months
      const totalVal = totalInput ? (parseInt(totalInput.value) || 0) : 0;
      if (totalVal > 0 && monthInputs.length > 0) {
        const anyMonthHasValue = Array.from(monthInputs).some(mi => !mi.disabled && (parseInt(mi.value) || 0) > 0);
        if (!anyMonthHasValue) {
          const unlockedMonths = getUnlockedMonths(currentTargetDataset);
          const dist = distributeAmountAcrossMonths(totalVal, unlockedMonths);
          monthInputs.forEach(mi => {
            const month = mi.dataset.month;
            if (!mi.disabled) {
              mi.value = String(dist[month] || 0);
            } else {
              mi.value = '0';
            }
          });
          recalcMonthTotal();
        }
      }
    };

    if (modeToggle) {
      // Ensure checkbox reflects initial mode
      modeToggle.checked = currentHideMonthsMode;
      modeToggle.addEventListener('change', () => {
        setMode(modeToggle.checked);
      });
      // Apply initial visibility (in case styles were overridden)
      setMode(currentHideMonthsMode);
    }
    
    // Dataset selector change handler
    const datasetSelect = overlay.querySelector('.betterbudgyt-add-tx-dataset-select');
    if (datasetSelect) {
      datasetSelect.addEventListener('change', () => {
        // Update target dataset and locked months display based on selected dataset
        const selectedIndex = parseInt(datasetSelect.value);
        currentTargetDataset = selectedIndex === 1 
          ? { ...comparisonData.dataset1, datasetIndex: 1 }
          : { ...comparisonData.dataset2, datasetIndex: 2 };

        applyAddTxTheme(currentTargetDataset?.datasetIndex);
        
        const newLockedMonths = getLockedMonths(currentTargetDataset);
        const newUnlockedMonths = getUnlockedMonths(currentTargetDataset);
        
        // Update month input states (if in months mode)
        monthInputs.forEach(input => {
          const month = input.dataset.month;
          const isLocked = newLockedMonths.has(month);
          input.disabled = isLocked;
          if (isLocked) input.value = '0';
          const itemEl = input.closest('.betterbudgyt-add-tx-month-item');
          if (itemEl) {
            itemEl.classList.toggle('locked', isLocked);
            const label = itemEl.querySelector('label');
            if (label) {
              label.innerHTML = month + (isLocked ? ' <span class="lock-icon">&#128274;</span>' : '');
            }
          }
        });
        
        // Update distribution info (if in total mode)
        const distInfo = overlay.querySelector('.betterbudgyt-add-tx-distribution-info');
        if (distInfo) {
          distInfo.textContent = `Will be distributed across ${newUnlockedMonths.length} unlocked month(s): ${newUnlockedMonths.join(', ')}`;
        }
        
        // Recalculate distribution preview if there's a value
        if (totalInput && totalInput.value) {
          totalInput.dispatchEvent(new Event('input'));
        }

        // Keep totals / auto-distribution consistent with current mode
        recalcMonthTotal();
        if (!currentHideMonthsMode) {
          // If user is in monthly mode and only has a total entered, auto-distribute into unlocked months
          setMode(false);
        }
      });
    }
    
    // Save handler
    overlay.querySelector('.betterbudgyt-add-tx-save').addEventListener('click', async () => {
      const descInput = overlay.querySelector('.betterbudgyt-add-tx-desc');
      const description = descInput.value.trim();
      
      // Validation: description required
      if (!description) {
        showTxStatus(overlay, 'Description is required.', 'error');
        descInput.focus();
        return;
      }
      
      // Get current target dataset (may have been changed by user)
      const targetDatasetInfo = currentTargetDataset;
      
      // Build monthly values
      let monthlyValues = {};
      let total = 0;
      
      if (currentHideMonthsMode) {
        // Total-only mode: distribute
        const totalInput = overlay.querySelector('.betterbudgyt-add-tx-total-input');
        total = parseInt(totalInput.value) || 0;
        
        if (total <= 0) {
          showTxStatus(overlay, 'Amount must be greater than 0.', 'error');
          totalInput.focus();
          return;
        }
        
        const unlockedMonths = getUnlockedMonths(targetDatasetInfo);
        monthlyValues = distributeAmountAcrossMonths(total, unlockedMonths);
      } else {
        // Individual months mode
        monthInputs.forEach(input => {
          const month = input.dataset.month;
          if (!input.disabled) {
            const val = parseInt(input.value) || 0;
            monthlyValues[month] = val;
            total += val;
          } else {
            monthlyValues[month] = 0;
          }
        });
        
        if (total <= 0) {
          showTxStatus(overlay, 'At least one month must have a value greater than 0.', 'error');
          return;
        }
      }
      
      // Disable save button, show loading
      const saveBtn = overlay.querySelector('.betterbudgyt-add-tx-save');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      showTxStatus(overlay, 'Saving transaction...', 'info');
      
      try {
        await saveNewTransaction(description, monthlyValues, departmentInfo, targetDatasetInfo, comparisonData);
        
        showTxStatus(overlay, 'Transaction saved successfully!', 'success');
        
        refreshComparisonModalUI(comparisonData);
        
        // Close modal after brief delay (like notes.js behavior)
        setTimeout(closeModal, 1500);
        
      } catch (error) {
        console.error('Failed to save transaction:', error);
        showTxStatus(overlay, `Failed to save: ${error.message}`, 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Transaction';
      }
    });
  }

  // Show status message in modal
  function showTxStatus(overlay, message, type) {
    const statusEl = overlay.querySelector('.betterbudgyt-add-tx-status');
    statusEl.textContent = message;
    statusEl.className = `betterbudgyt-add-tx-status ${type}`;
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

  // Fetch row data for a department (to get existing transactions)
  async function fetchRowDataForDepartment(departmentInfo, datasetInfo) {
    const budgetId = parseInt(datasetInfo.budgetId);
    const budgetYear = parseInt(datasetInfo.budgetYear);
    const refererUrl = datasetInfo.dataHref 
      ? `${window.location.origin}${datasetInfo.dataHref}` 
      : `${window.location.origin}/Budget/DataInput/${budgetId}/${budgetYear}`;
    
    const parameters = {
      level: '2',
      StoreUID: resolveId(departmentInfo.storeUID, '-1') || '-1',
      // IMPORTANT: Use datasetInfo.deptUID like notes.js does - NOT departmentInfo.deptUID
      // departmentInfo.deptUID often contains the StoreUID by mistake, which returns wrong data
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
    
    console.log('Fetching row data for department:', departmentInfo.departmentName, parameters);
    
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
    console.log('[fetchRowDataForDepartment] GetRowData response length:', html.length);
    console.log('[fetchRowDataForDepartment] First 500 chars:', html.substring(0, 500));
    return parseRawTransactionData(html, datasetInfo);
  }

  // Parse raw HTML to extract transaction data needed for SaveDataInput
  // Returns { transactions, netSalesData } to match notes.js structure
  function parseRawTransactionData(html, datasetInfo) {
    const wrappedHtml = `<table><tbody>${html}</tbody></table>`;
    const parser = new DOMParser();
    const doc = parser.parseFromString(wrappedHtml, 'text/html');
    
    const transactions = [];
    // Use simpler selector like notes.js, then filter inside the loop
    const rows = doc.querySelectorAll('tr[data-level="3"]');
    
    console.log('[parseRawTransactionData] Found', rows.length, 'rows with data-level="3"');
    
    // Initialize net sales data
    let netSalesData = { Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0, Jan: 0, Feb: 0, Mar: 0 };

    // First pass: find Net Sales row for DATNetSalesM* values (look across all rows)
    const allRows = doc.querySelectorAll('tr');
    allRows.forEach(row => {
      const title = row.querySelector('td')?.getAttribute('title') || '';
      if (title && title.toLowerCase().includes('net sales')) {
        MONTHS.forEach((month, i) => {
          const cell = row.querySelector(`td.data[data-period="P${i + 1}"], td.data[data-Period="P${i + 1}"]`);
          if (cell) {
            const span = cell.querySelector('span');
            const raw = (span?.textContent || cell.textContent || '0').replace(/,/g, '');
            const val = parseFloat(raw) || 0;
            netSalesData[month] = val;
          }
        });
        console.log('[parseRawTransactionData] Found Net Sales row:', netSalesData);
      }
    });
    
    // Second pass: extract all transaction data
    rows.forEach(row => {
      // Get PLElementUID - prefer the hidden cell (numeric) over the row id (GUID)
      const plHiddenCell = row.querySelector('td#hdnPLElementUID, td[id="hdnPLElementUID"]');
      let plElementUID = plHiddenCell ? (plHiddenCell.textContent || plHiddenCell.innerText || '').trim() : '';
      if (!plElementUID) {
        plElementUID = row.id || '';
      }
      
      // Skip rows without a valid id
      if (!plElementUID || plElementUID.length < 2) return;
      
      // Skip non-transaction rows (totals, net sales, %LY, %LLY, historical data)
      if (row.classList.contains('doNotExpand') || 
          row.classList.contains('netsales') || 
          row.classList.contains('LevelPercentLY') ||
          row.classList.contains('historicaldata')) {
        return;
      }
      
      // CRITICAL: Must be an actual transaction row (has bottomLevel class)
      // This matches notes.js behavior exactly
      if (!row.classList.contains('bottomLevel')) {
        console.log('[parseRawTransactionData] Skipping row without bottomLevel:', plElementUID);
        return;
      }
      
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
      MONTHS.forEach((month, i) => {
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
      
      // Hidden fields - extract from the row's hidden cells
      const storeCell = row.querySelector('td#hdnStoreUID, td[id="hdnStoreUID"]');
      const rawStore = storeCell ? (storeCell.textContent.trim() || storeCell.getAttribute('data-id')) : null;
      // IMPORTANT: Prioritize the actual row value over fallbacks
      transaction.storeUID = resolveId(rawStore) || resolveId(datasetInfo?.storeUID, (datasetInfo?.stores || '').split(',')[0]) || '-1';
      
      const deptCell = row.querySelector('td#hdnDeptUID, td[id="hdnDeptUID"]');
      const rawDept = deptCell ? deptCell.textContent.trim() : null;
      // CRITICAL: This is DATDepartmentUID - must come from the row, NOT from departmentInfo
      transaction.deptUID = resolveId(rawDept) || '3';
      
      const catCell = row.querySelector('td#hdnCatUID, td[id="hdnCatUID"]');
      const rawCat = catCell ? catCell.textContent.trim() : null;
      transaction.catUID = resolveId(rawCat, datasetInfo?.categoryUID) || datasetInfo?.categoryUID || '-1';
      
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
      const commentCell = row.querySelector('td#hdnComment, td[id="hdnComment"]');
      if (commentCell) {
        let rawContent = commentCell.innerHTML || '';
        // Check if content looks HTML-encoded (contains &lt; or &gt;)
        if (rawContent.includes('&lt;') || rawContent.includes('&gt;')) {
          const decoder = document.createElement('textarea');
          decoder.innerHTML = rawContent;
          rawContent = decoder.value;
        }
        transaction.existingNotes = rawContent;
      }
      
      console.log('[parseRawTransactionData] Parsed transaction:', transaction.plElementUID, transaction.description, 'deptUID:', transaction.deptUID, 'storeUID:', transaction.storeUID);
      transactions.push(transaction);
    });
    
    console.log('[parseRawTransactionData] Total transactions parsed:', transactions.length);
    return { transactions, netSalesData };
  }

  // Fetch Net Sales data for percentage calculations
  async function fetchNetSalesData(datasetInfo) {
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
      console.warn('Failed to fetch net sales:', response.status);
      return { Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0, Jan: 0, Feb: 0, Mar: 0 };
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
      MONTHS.forEach((month, i) => {
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

  // Build the SaveDataInput payload
  function buildSaveDataInputPayload(existingTransactions, newDescription, monthlyValues, netSalesData, departmentInfo, datasetInfo) {
    // CRITICAL: Get the correct deptUID from existing transactions if available
    // The deptUID from departmentInfo might be wrong (could be StoreUID)
    // Use the first existing transaction's deptUID as the authoritative source
    let correctDeptUID = '3'; // Default fallback
    if (existingTransactions.length > 0) {
      const firstTxDeptUID = existingTransactions[0].deptUID;
      if (firstTxDeptUID && firstTxDeptUID !== '-1') {
        correctDeptUID = firstTxDeptUID;
        console.log('[buildSaveDataInputPayload] Using deptUID from existing transaction:', correctDeptUID);
      }
    }
    // Only fall back to departmentInfo if no existing transactions
    if (correctDeptUID === '3' && departmentInfo.deptUID && departmentInfo.deptUID !== '-1') {
      // Verify it's actually a deptUID (should be small number like 3, 4, 5...) not a StoreUID (large like 575)
      const deptNum = parseInt(departmentInfo.deptUID);
      if (deptNum < 100) { // StoreUIDs are typically > 500
        correctDeptUID = departmentInfo.deptUID;
        console.log('[buildSaveDataInputPayload] Using deptUID from departmentInfo:', correctDeptUID);
      }
    }
    
    // Build new transaction entry
    const newTransaction = {
      DATValueM1: monthlyValues.Apr || 0,
      DATValueM2: monthlyValues.May || 0,
      DATValueM3: monthlyValues.Jun || 0,
      DATValueM4: monthlyValues.Jul || 0,
      DATValueM5: monthlyValues.Aug || 0,
      DATValueM6: monthlyValues.Sep || 0,
      DATValueM7: monthlyValues.Oct || 0,
      DATValueM8: monthlyValues.Nov || 0,
      DATValueM9: monthlyValues.Dec || 0,
      DATValueM10: monthlyValues.Jan || 0,
      DATValueM11: monthlyValues.Feb || 0,
      DATValueM12: monthlyValues.Mar || 0,
      // Percentage fields (calculated from net sales)
      DATValueM1P: netSalesData.Apr ? (monthlyValues.Apr || 0) / netSalesData.Apr : 0,
      DATValueM2P: netSalesData.May ? (monthlyValues.May || 0) / netSalesData.May : 0,
      DATValueM3P: netSalesData.Jun ? (monthlyValues.Jun || 0) / netSalesData.Jun : 0,
      DATValueM4P: netSalesData.Jul ? (monthlyValues.Jul || 0) / netSalesData.Jul : 0,
      DATValueM5P: netSalesData.Aug ? (monthlyValues.Aug || 0) / netSalesData.Aug : 0,
      DATValueM6P: netSalesData.Sep ? (monthlyValues.Sep || 0) / netSalesData.Sep : 0,
      DATValueM7P: netSalesData.Oct ? (monthlyValues.Oct || 0) / netSalesData.Oct : 0,
      DATValueM8P: netSalesData.Nov ? (monthlyValues.Nov || 0) / netSalesData.Nov : 0,
      DATValueM9P: netSalesData.Dec ? (monthlyValues.Dec || 0) / netSalesData.Dec : 0,
      DATValueM10P: netSalesData.Jan ? (monthlyValues.Jan || 0) / netSalesData.Jan : 0,
      DATValueM11P: netSalesData.Feb ? (monthlyValues.Feb || 0) / netSalesData.Feb : 0,
      DATValueM12P: netSalesData.Mar ? (monthlyValues.Mar || 0) / netSalesData.Mar : 0,
      // Net sales fields
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
      VENDescription: '',
      DATDescription: newDescription,
      DATPLCategoryUID: resolveId(datasetInfo.categoryUID) || '-1',
      DATDepartmentUID: correctDeptUID,  // Use the correct deptUID
      DATStoreUID: resolveId(departmentInfo.storeUID) || '-1',
      DATVendorUID: '0',
      PLElementUID: '-1',  // IMPORTANT: -1 signals new transaction
      LoadFromExcel: false,
      ExcelRowNumber: -1,
      ExcelFolderName: '',
      AttachedSubCategoryFolderName: '',
      VendorUIDCSV: '',
      CurrencyUID: '1',
      TransactionDate: new Date().toISOString(),
      DayOfPeriod: 15,
      TermUID: -1,
      AmortizePeriod: 1
    };
    
    console.log('[buildSaveDataInputPayload] New transaction:', {
      description: newDescription,
      DATDepartmentUID: newTransaction.DATDepartmentUID,
      DATStoreUID: newTransaction.DATStoreUID,
      DATPLCategoryUID: newTransaction.DATPLCategoryUID
    });
    
    // Convert existing transactions to payload format
    const existingPayload = existingTransactions.map(tx => {
      // CRITICAL: Use tx.deptUID directly - it was parsed from the row's hidden cell
      // Don't fall back to departmentInfo.deptUID which might be wrong
      const txDeptUID = resolveId(tx.deptUID) || correctDeptUID;
      
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
        DATValueM1P: tx.monthlyPercent?.Apr || 0,
        DATValueM2P: tx.monthlyPercent?.May || 0,
        DATValueM3P: tx.monthlyPercent?.Jun || 0,
        DATValueM4P: tx.monthlyPercent?.Jul || 0,
        DATValueM5P: tx.monthlyPercent?.Aug || 0,
        DATValueM6P: tx.monthlyPercent?.Sep || 0,
        DATValueM7P: tx.monthlyPercent?.Oct || 0,
        DATValueM8P: tx.monthlyPercent?.Nov || 0,
        DATValueM9P: tx.monthlyPercent?.Dec || 0,
        DATValueM10P: tx.monthlyPercent?.Jan || 0,
        DATValueM11P: tx.monthlyPercent?.Feb || 0,
        DATValueM12P: tx.monthlyPercent?.Mar || 0,
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
        VENDescription: '',
        DATDescription: tx.description || '',
        DATPLCategoryUID: resolveId(tx.catUID, datasetInfo.categoryUID) || '-1',
        DATDepartmentUID: txDeptUID,  // Use tx.deptUID, NOT departmentInfo.deptUID
        DATStoreUID: resolveId(tx.storeUID, departmentInfo.storeUID) || '-1',
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
      
      // Preserve existing notes if any
      if (tx.existingNotes) {
        row.Comments = tx.existingNotes;
      }
      
      return row;
    });
    
    // Combine: new transaction first, then existing
    const allTransactions = [newTransaction, ...existingPayload];
    
    // Build audit data (before/after for each transaction) - required by Budgyt
    // Format: [sign, description, vendorUIDCSV, M1..M12, total, plElementUID]
    // All values must be strings
    const auditData = [];
    allTransactions.forEach(tx => {
      const monthValues = [
        String(tx.DATValueM1 || 0),
        String(tx.DATValueM2 || 0),
        String(tx.DATValueM3 || 0),
        String(tx.DATValueM4 || 0),
        String(tx.DATValueM5 || 0),
        String(tx.DATValueM6 || 0),
        String(tx.DATValueM7 || 0),
        String(tx.DATValueM8 || 0),
        String(tx.DATValueM9 || 0),
        String(tx.DATValueM10 || 0),
        String(tx.DATValueM11 || 0),
        String(tx.DATValueM12 || 0)
      ];
      const total = String(
        (tx.DATValueM1 || 0) + (tx.DATValueM2 || 0) + (tx.DATValueM3 || 0) +
        (tx.DATValueM4 || 0) + (tx.DATValueM5 || 0) + (tx.DATValueM6 || 0) +
        (tx.DATValueM7 || 0) + (tx.DATValueM8 || 0) + (tx.DATValueM9 || 0) +
        (tx.DATValueM10 || 0) + (tx.DATValueM11 || 0) + (tx.DATValueM12 || 0)
      );
      
      // Add before (-) and after (+) entries for each transaction
      auditData.push(['-', tx.DATDescription || '', tx.VendorUIDCSV || '', ...monthValues, total, String(tx.PLElementUID)]);
      auditData.push(['+', tx.DATDescription || '', tx.VendorUIDCSV || '', ...monthValues, total, String(tx.PLElementUID)]);
    });
    
    console.log('[buildSaveDataInputPayload] Built AuditData with', auditData.length, 'entries for', allTransactions.length, 'transactions');
    
    return {
      data: allTransactions,
      level: '0',
      StoreUID: '-1',
      DeptUID: '-1',
      CategoryUID: '-1',
      groupedcategory: datasetInfo.groupedcategory || '',
      Stores: datasetInfo.storesFull || datasetInfo.stores || FULL_STORES_FALLBACK,
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

  // Save new transaction via API
  async function saveNewTransaction(description, monthlyValues, departmentInfo, datasetInfo, comparisonData) {
    const { primeBudgetSession } = window.BetterBudgyt.features.comparison.dataFetcher;
    
    const budgetId = parseInt(datasetInfo.budgetId);
    const budgetYear = parseInt(datasetInfo.budgetYear);
    
    if (!budgetId || !budgetYear) {
      throw new Error('Missing budget context. Please reopen the comparison.');
    }
    
    console.log('Saving new transaction:', { description, monthlyValues, departmentInfo: departmentInfo.departmentName });
    
    // Step 1: Prime session with GET request
    if (datasetInfo.dataHref) {
      await primeBudgetSession(datasetInfo.dataHref);
    }
    
    // Step 2: Call CheckBudgetInSession
    console.log('Activating budget session...');
    const sessionResponse = await fetch('/Budget/CheckBudgetInSession', {
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
    
    if (!sessionResponse.ok) {
      console.warn('CheckBudgetInSession returned:', sessionResponse.status);
    }
    
    // Step 3: Fetch current transactions for this department
    // This now returns { transactions, netSalesData } to match notes.js structure
    console.log('Fetching existing transactions...');
    const rowDataResult = await fetchRowDataForDepartment(departmentInfo, datasetInfo);
    const existingTransactions = rowDataResult.transactions || [];
    let netSalesData = rowDataResult.netSalesData || {};
    console.log(`Found ${existingTransactions.length} existing transactions`);
    console.log('Net sales from row data:', netSalesData);
    
    // Step 4: If net sales weren't found in the row data, fetch them separately
    const hasNetSales = Object.values(netSalesData).some(v => v !== 0);
    if (!hasNetSales) {
      console.log('Fetching net sales data separately (not found in row data)...');
      netSalesData = await fetchNetSalesData(datasetInfo);
      console.log('Net sales from level 0:', netSalesData);
    }
    
    // Step 5: Build payload with existing + new transaction
    console.log('Building payload...');
    const payload = buildSaveDataInputPayload(
      existingTransactions,
      description,
      monthlyValues,
      netSalesData,
      departmentInfo,
      datasetInfo
    );
    
    console.log('Payload transaction count:', payload.data.length);
    // Log first transaction details for debugging
    if (payload.data.length > 0) {
      const firstTx = payload.data[0];
      console.log('[saveNewTransaction] First transaction in payload:', {
        PLElementUID: firstTx.PLElementUID,
        DATDescription: firstTx.DATDescription,
        DATDepartmentUID: firstTx.DATDepartmentUID,
        DATStoreUID: firstTx.DATStoreUID,
        DATPLCategoryUID: firstTx.DATPLCategoryUID,
        DATValueM6: firstTx.DATValueM6
      });
    }
    if (payload.data.length > 1) {
      const secondTx = payload.data[1];
      console.log('[saveNewTransaction] Second transaction in payload:', {
        PLElementUID: secondTx.PLElementUID,
        DATDescription: secondTx.DATDescription,
        DATDepartmentUID: secondTx.DATDepartmentUID,
        DATStoreUID: secondTx.DATStoreUID
      });
    }
    
    // Step 6: Call SaveDataInput
    const refererUrl = datasetInfo.dataHref 
      ? `${window.location.origin}${datasetInfo.dataHref}` 
      : `${window.location.origin}/Budget/DataInput/${budgetId}/${budgetYear}`;
    
    console.log('Saving to server...');
    const response = await fetch('/Budget/SaveDataInput', {
      method: 'POST',
      credentials: 'same-origin',
      referrer: refererUrl,
      referrerPolicy: 'unsafe-url',
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'text/html, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'localoffset': new Date().getTimezoneOffset().toString()
      },
      body: JSON.stringify(payload)
    });
    
    // Check for errors
    if (response.type === 'opaqueredirect' || response.status === 302 || response.status === 301) {
      throw new Error('Server rejected the request (session expired or locked)');
    }
    
    if (!response.ok) {
      throw new Error(`Server error: HTTP ${response.status}`);
    }
    
    const responseText = await response.text();
    
    // Check for error indicators
    if (responseText.includes('CustomError') || responseText.includes('aspxerrorpath')) {
      throw new Error('Server error occurred while saving');
    }
    
    if (responseText.toLowerCase().includes('locked')) {
      throw new Error('This datasheet is locked for editing');
    }
    
    console.log('Transaction saved successfully');
    
    // Step 7: Update cache
    await updateCacheWithNewTransaction(description, monthlyValues, departmentInfo, datasetInfo, comparisonData);
    
    return { success: true };
  }

  // Update cache with new transaction
  async function updateCacheWithNewTransaction(description, monthlyValues, departmentInfo, datasetInfo, comparisonData) {
    if (!comparisonData) return;
    
    const targetDataset = datasetInfo.datasetIndex === 1 ? comparisonData.dataset1 : comparisonData.dataset2;
    const dept = targetDataset?.departments?.find(d => d.storeUID === departmentInfo.storeUID);
    
    if (dept) {
      const total = Object.values(monthlyValues).reduce((sum, v) => sum + v, 0);
      
      const newTx = {
        description,
        vendor: '',
        monthly: { ...monthlyValues },
        total,
        note: '',
        plElementUID: null, // Will be assigned by server on next refresh
        comments: {},
        fileAttachment: null
      };
      
      dept.transactions = dept.transactions || [];
      dept.transactions.push(newTx);
      
      // Update department totals
      if (dept.totals) {
        MONTHS.forEach(m => {
          dept.totals[m] = (dept.totals[m] || 0) + (monthlyValues[m] || 0);
        });
        dept.totals.total = (dept.totals.total || 0) + total;
      }
      
      // Update dataset grand totals
      if (targetDataset.grandTotals) {
        MONTHS.forEach(m => {
          targetDataset.grandTotals[m] = (targetDataset.grandTotals[m] || 0) + (monthlyValues[m] || 0);
        });
        targetDataset.grandTotals.total = (targetDataset.grandTotals.total || 0) + total;
      }
      
      // Also add to transactions array
      targetDataset.transactions = targetDataset.transactions || [];
      targetDataset.transactions.push({
        ...newTx,
        departmentName: departmentInfo.departmentName,
        storeUID: departmentInfo.storeUID
      });
      
      console.log('Cache updated with new transaction:', description);
    }
  }

  // Refresh the comparison modal UI after adding a transaction
  function refreshComparisonModalUI(comparisonData) {
    if (!comparisonData) {
      console.warn('No comparison data provided to refresh');
      return;
    }
    
    document.querySelectorAll('.betterbudgyt-comparison-modal').forEach(modal => {
      const modalModule = window.BetterBudgyt.features.comparison.modal;
      const modalData = modalModule?.getComparisonDataForModal(modal);
      if (modalData !== comparisonData) return;
      
      const tableContainer = modal.querySelector('.betterbudgyt-comparison-table-container');
      if (!tableContainer) return;

      const summaryCards = modal.querySelectorAll('.betterbudgyt-summary-card');
      if (summaryCards.length >= 3) {
        const d1Value = summaryCards[0].querySelector('.betterbudgyt-summary-card-value');
        const d1Subtitle = summaryCards[0].querySelector('.betterbudgyt-summary-card-subtitle');
        const d1Total = comparisonData.dataset1?.grandTotals?.total ?? comparisonData.dataset1?.totals?.total ?? 0;
        const d1DeptCount = comparisonData.dataset1?.departments?.length || 0;
        const d1TxCount = comparisonData.dataset1?.transactions?.length || 0;
        if (d1Value) d1Value.textContent = formatNumber(d1Total);
        if (d1Subtitle) d1Subtitle.textContent = `${d1DeptCount} departments · ${d1TxCount} transactions`;

        const d2Value = summaryCards[1].querySelector('.betterbudgyt-summary-card-value');
        const d2Subtitle = summaryCards[1].querySelector('.betterbudgyt-summary-card-subtitle');
        const d2Total = comparisonData.dataset2?.grandTotals?.total ?? comparisonData.dataset2?.totals?.total ?? 0;
        const d2DeptCount = comparisonData.dataset2?.departments?.length || 0;
        const d2TxCount = comparisonData.dataset2?.transactions?.length || 0;
        if (d2Value) d2Value.textContent = formatNumber(d2Total);
        if (d2Subtitle) d2Subtitle.textContent = `${d2DeptCount} departments · ${d2TxCount} transactions`;

        const diffValue = summaryCards[2].querySelector('.betterbudgyt-summary-card-value');
        if (diffValue) diffValue.textContent = formatNumber(d1Total - d2Total);
      }
    
      // Preserve expanded department states
      const expandedDepts = [];
      modal.querySelectorAll('.betterbudgyt-dept-card.expanded').forEach(card => {
        expandedDepts.push(card.dataset.dept);
      });
      
      // Get current toggle states
      const currentHideMonths = modal.querySelector('#hideMonthsToggle')?.checked ?? false;
      const currentClassTotalsOnly = modal.querySelector('#classTotalsOnlyToggle')?.checked ?? false;
      
      // Re-render the table using modal.js generateComparisonTable
      const { generateComparisonTable } = window.BetterBudgyt.features.comparison.modal;
      if (!generateComparisonTable) {
        console.error('generateComparisonTable not found in modal module');
        return;
      }
      
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
      
      // Re-setup context menu handlers for comments
      const comments = window.BetterBudgyt.features.comparison.comments;
      if (comments?.setupContextMenuHandlers) {
        comments.setupContextMenuHandlers(modal, comparisonData);
      }
      
      console.log('Comparison modal UI refreshed with new transaction');
    });
  }

  // Export to namespace
  window.BetterBudgyt.features.comparison.transactions = {
    isDatasetEditable,
    getLockedMonths,
    getUnlockedMonths,
    distributeAmountAcrossMonths,
    showAddTransactionModal,
    saveNewTransaction
  };

})();
