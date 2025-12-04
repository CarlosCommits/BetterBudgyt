// BetterBudgyt - Comparison Comments
// Handles adding/viewing comments in the comparison modal

(function() {
  'use strict';

  window.BetterBudgyt = window.BetterBudgyt || {};
  window.BetterBudgyt.features = window.BetterBudgyt.features || {};
  window.BetterBudgyt.features.comparison = window.BetterBudgyt.features.comparison || {};

  const { escapeHtml, formatNumber } = window.BetterBudgyt.utils;

  // Field mapping for API calls
  const FIELD_MAPPING = {
    'description': 'Description',
    'vendor': 'Vendor',
    'total': 'Total',
    'Apr': 'P1', 'May': 'P2', 'Jun': 'P3', 'Jul': 'P4',
    'Aug': 'P5', 'Sep': 'P6', 'Oct': 'P7', 'Nov': 'P8',
    'Dec': 'P9', 'Jan': 'P10', 'Feb': 'P11', 'Mar': 'P12'
  };

  // Cached users list
  let cachedUsers = null;

  // Create and show the context menu
  function showContextMenu(event, cellData, transactionData, datasetInfo) {
    event.preventDefault();
    
    // Remove any existing context menu
    hideContextMenu();
    
    const menu = document.createElement('div');
    menu.className = 'betterbudgyt-context-menu';
    menu.innerHTML = `
      <div class="betterbudgyt-context-menu-item" data-action="add-comment">
        <span class="betterbudgyt-context-menu-icon">💬</span>
        Add Comment
      </div>
      <div class="betterbudgyt-context-menu-item" data-action="view-comments">
        <span class="betterbudgyt-context-menu-icon">👁️</span>
        View Comments
      </div>
    `;
    
    // Position the menu
    menu.style.left = `${event.pageX}px`;
    menu.style.top = `${event.pageY}px`;
    
    // Store the context data
    menu.dataset.cellData = JSON.stringify(cellData);
    menu.dataset.transactionData = JSON.stringify(transactionData);
    menu.dataset.datasetInfo = JSON.stringify(datasetInfo);
    
    document.body.appendChild(menu);
    
    // Handle menu item clicks
    menu.addEventListener('click', (e) => {
      const item = e.target.closest('.betterbudgyt-context-menu-item');
      if (!item) return;
      
      const action = item.dataset.action;
      hideContextMenu();
      
      if (action === 'add-comment') {
        showAddCommentModal(cellData, transactionData, datasetInfo);
      } else if (action === 'view-comments') {
        viewExistingComments(cellData, transactionData, datasetInfo);
      }
    });
    
    // Close menu when clicking elsewhere
    setTimeout(() => {
      document.addEventListener('click', hideContextMenuOnClick);
      document.addEventListener('contextmenu', hideContextMenu);
    }, 0);
  }

  function hideContextMenuOnClick(e) {
    if (!e.target.closest('.betterbudgyt-context-menu')) {
      hideContextMenu();
    }
  }

  function hideContextMenu() {
    const menu = document.querySelector('.betterbudgyt-context-menu');
    if (menu) menu.remove();
    document.removeEventListener('click', hideContextMenuOnClick);
    document.removeEventListener('contextmenu', hideContextMenu);
  }

  // Fetch users list for the "To" dropdown
  // Users are only available from the GetUserComments response or the DataInput page
  async function fetchUsersList(plElementUID, field) {
    if (cachedUsers && cachedUsers.length > 0) return cachedUsers;
    
    try {
      // If we have plElementUID, try to get users from GetUserComments response
      if (plElementUID && field) {
        const apiField = FIELD_MAPPING[field] || field;
        const response = await fetch('/Budget/GetUserComments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'text/html, */*; q=0.01'
          },
          body: JSON.stringify({
            PlElementUID: parseInt(plElementUID),
            CommentDoneOnField: apiField
          })
        });
        
        if (response.ok) {
          const html = await response.text();
          // Parse user list from the response HTML
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const userSelect = doc.querySelector('select[name="lstUsers"], select.multiselectLst.group');
          
          if (userSelect) {
            cachedUsers = Array.from(userSelect.options).map(opt => {
              // Format: username|userId|displayName
              const parts = opt.value.split('|');
              return {
                value: opt.value,
                label: opt.textContent.trim() || parts[2] || parts[0],
                userId: parts[1] || '',
                username: parts[0] || ''
              };
            }).filter(u => u.userId); // Filter out empty entries
            
            console.log('Fetched users from GetUserComments:', cachedUsers.length);
            return cachedUsers;
          }
        }
      }
      
      // Fallback: Try to get from page's existing user dropdown (not class dropdown)
      // Use more specific selector to avoid class/department dropdowns
      const existingSelect = document.querySelector('select[name="lstUsers"]');
      if (existingSelect) {
        cachedUsers = Array.from(existingSelect.options).map(opt => {
          const parts = opt.value.split('|');
          return {
            value: opt.value,
            label: opt.textContent.trim() || parts[2] || parts[0],
            userId: parts[1] || '',
            username: parts[0] || ''
          };
        }).filter(u => u.userId);
        return cachedUsers;
      }
      
      // No users found - return empty array
      cachedUsers = [];
      return cachedUsers;
    } catch (e) {
      console.error('Failed to fetch users list:', e);
      return [];
    }
  }

  // Show the Add Comment modal
  async function showAddCommentModal(cellData, transactionData, datasetInfo) {
    // Remove any existing modal
    const existingModal = document.querySelector('.betterbudgyt-add-comment-overlay');
    if (existingModal) existingModal.remove();
    
    const fieldLabel = getFieldLabel(cellData.field);
    // Fetch users list from GetUserComments API (requires plElementUID)
    const users = await fetchUsersList(transactionData.plElementUID, cellData.field);
    
    const overlay = document.createElement('div');
    overlay.className = 'betterbudgyt-add-comment-overlay';
    overlay.innerHTML = `
      <div class="betterbudgyt-add-comment-modal">
        <div class="betterbudgyt-add-comment-header">
          <div class="betterbudgyt-add-comment-title">💬 Add Comment</div>
          <button class="betterbudgyt-add-comment-close">&times;</button>
        </div>
        <div class="betterbudgyt-add-comment-body">
          <div class="betterbudgyt-add-comment-context">
            <div class="betterbudgyt-add-comment-context-item">
              <strong>Category:</strong> ${escapeHtml(datasetInfo.accountName || 'N/A')}
            </div>
            <div class="betterbudgyt-add-comment-context-item">
              <strong>Department:</strong> ${escapeHtml(transactionData.departmentName || 'N/A')}
            </div>
            <div class="betterbudgyt-add-comment-context-item">
              <strong>Field:</strong> ${escapeHtml(fieldLabel)}
              ${cellData.value !== undefined ? ` <span class="betterbudgyt-add-comment-value">(${formatNumber(cellData.value)})</span>` : ''}
            </div>
            <div class="betterbudgyt-add-comment-context-item">
              <strong>Item:</strong> ${escapeHtml(transactionData.description || 'N/A')}
            </div>
            <div class="betterbudgyt-add-comment-context-item betterbudgyt-add-comment-dataset">
              <strong>Dataset:</strong> ${escapeHtml(datasetInfo.dataType || 'N/A')}
            </div>
          </div>
          
          ${users.length > 0 ? `
          <div class="betterbudgyt-add-comment-field">
            <label>To (optional)</label>
            <select class="betterbudgyt-add-comment-to" multiple>
              ${users.map(u => `<option value="${escapeHtml(u.value)}">${escapeHtml(u.label)}</option>`).join('')}
            </select>
            <div class="betterbudgyt-add-comment-to-hint">Hold Ctrl/Cmd to select multiple</div>
          </div>
          ` : ''}
          
          <div class="betterbudgyt-add-comment-field">
            <label>Comment <span class="required">*</span></label>
            <textarea class="betterbudgyt-add-comment-text" placeholder="Enter your comment..." rows="4"></textarea>
          </div>
        </div>
        <div class="betterbudgyt-add-comment-footer">
          <div class="betterbudgyt-add-comment-status"></div>
          <div class="betterbudgyt-add-comment-actions">
            <button class="betterbudgyt-add-comment-cancel">Close</button>
            <button class="betterbudgyt-add-comment-save">Save</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Focus the textarea
    const textarea = overlay.querySelector('.betterbudgyt-add-comment-text');
    textarea.focus();
    
    // Event handlers
    const closeModal = () => overlay.remove();
    
    overlay.querySelector('.betterbudgyt-add-comment-close').addEventListener('click', closeModal);
    overlay.querySelector('.betterbudgyt-add-comment-cancel').addEventListener('click', closeModal);
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
    overlay.querySelector('.betterbudgyt-add-comment-save').addEventListener('click', async () => {
      const commentText = textarea.value.trim();
      if (!commentText) {
        showStatus(overlay, 'Please enter a comment.', 'error');
        return;
      }
      
      const toSelect = overlay.querySelector('.betterbudgyt-add-comment-to');
      const selectedUsers = toSelect ? Array.from(toSelect.selectedOptions).map(opt => ({
        value: opt.value,
        userId: opt.value.split('|')[1] || '',
        username: opt.value.split('|')[0] || ''
      })) : [];
      
      const saveBtn = overlay.querySelector('.betterbudgyt-add-comment-save');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      showStatus(overlay, 'Saving comment...', 'info');
      
      try {
        await saveComment(cellData, transactionData, datasetInfo, commentText, selectedUsers);
        showStatus(overlay, 'Comment saved successfully!', 'success');
        
        // Add has-comment class to all matching cells (visual feedback without refresh)
        const cellSelector = `[data-pl-element-uid="${transactionData.plElementUID}"][data-field="${cellData.field}"]`;
        document.querySelectorAll(cellSelector).forEach(cell => {
          cell.classList.add('has-comment');
        });
        
        // Update the cached comparison data so the comment persists on modal reopen
        updateCachedCommentFlag(transactionData.plElementUID, cellData.field, datasetInfo);
        
        setTimeout(closeModal, 1500);
      } catch (error) {
        console.error('Failed to save comment:', error);
        showStatus(overlay, `Failed to save: ${error.message}`, 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
      }
    });
  }

  function showStatus(overlay, message, type) {
    const statusEl = overlay.querySelector('.betterbudgyt-add-comment-status');
    statusEl.textContent = message;
    statusEl.className = `betterbudgyt-add-comment-status ${type}`;
  }

  // Update cached comparison data to mark a cell as having a comment
  function updateCachedCommentFlag(plElementUID, field, datasetInfo) {
    const state = window.BetterBudgyt.state;
    const comparisonData = state.currentComparisonData;
    if (!comparisonData) return;
    
    // Determine which dataset to update
    const datasetKey = datasetInfo.datasetIndex === 1 ? 'dataset1' : 'dataset2';
    const departments = comparisonData[datasetKey]?.departments;
    if (!departments) return;
    
    // Find the transaction with matching plElementUID and update its comments
    for (const dept of departments) {
      if (!dept.transactions) continue;
      for (const tx of dept.transactions) {
        if (tx.plElementUID === plElementUID) {
          // Initialize comments object if needed
          tx.comments = tx.comments || {};
          tx.comments[field] = true;
          console.log(`Updated cached comment flag: ${datasetKey}, plElementUID=${plElementUID}, field=${field}`);
          return;
        }
      }
    }
  }

  function getFieldLabel(field) {
    const labels = {
      'description': 'Description',
      'vendor': 'Vendor',
      'total': 'Total',
      'Apr': 'April', 'May': 'May', 'Jun': 'June', 'Jul': 'July',
      'Aug': 'August', 'Sep': 'September', 'Oct': 'October', 'Nov': 'November',
      'Dec': 'December', 'Jan': 'January', 'Feb': 'February', 'Mar': 'March'
    };
    return labels[field] || field;
  }

  // Activate the correct budget session before making API calls
  // This must be called with CheckBudgetInSession POST before SaveUserComments
  async function activateBudgetSession(datasetInfo) {
    const budgetId = parseInt(datasetInfo.budgetId);
    const budgetYear = parseInt(datasetInfo.budgetYear);
    
    if (!budgetId || !budgetYear) {
      console.warn('Missing budget session info, skipping session activation');
      return;
    }
    
    console.log('Activating budget session with CheckBudgetInSession:', { budgetId, budgetYear });
    
    // Call CheckBudgetInSession to activate the correct budget session
    const response = await fetch('/Budget/CheckBudgetInSession', {
      method: 'POST',
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
    
    if (!response.ok) {
      console.warn('CheckBudgetInSession failed:', response.status);
    } else {
      console.log('Budget session activated successfully');
    }
  }

  // Initialize comment session by calling GetUserComments first (like Budgyt does)
  async function initializeCommentSession(plElementUID, field) {
    const apiField = FIELD_MAPPING[field] || field;
    
    console.log('Initializing comment session with GetUserComments:', { plElementUID, apiField });
    
    try {
      const response = await fetch('/Budget/GetUserComments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'text/html, */*; q=0.01'
        },
        body: JSON.stringify({
          PlElementUID: parseInt(plElementUID),
          CommentDoneOnField: apiField
        })
      });
      
      if (response.ok) {
        console.log('Comment session initialized');
      }
    } catch (e) {
      console.warn('GetUserComments call failed, continuing anyway:', e);
    }
  }

  // Save a comment via the API
  async function saveComment(cellData, transactionData, datasetInfo, commentText, selectedUsers) {
    // First, activate the correct budget session via CheckBudgetInSession
    await activateBudgetSession(datasetInfo);
    
    const plElementUID = transactionData.plElementUID;
    if (!plElementUID) {
      throw new Error('Missing PlElementUID - cannot save comment');
    }
    
    const apiField = FIELD_MAPPING[cellData.field] || cellData.field;
    
    // Initialize comment session by calling GetUserComments first (like Budgyt does natively)
    await initializeCommentSession(plElementUID, cellData.field);
    
    // Build notification data - use -1 when no users selected (not empty string)
    const userIds = selectedUsers.map(u => u.userId).filter(id => id);
    const notifyUserIdCSV = userIds.length > 0 ? userIds.join(',') : '-1';
    const notificationText = 'mentioned you in a comment about ';
    
    // Build the comment text with @mentions prepended (like Budgyt does natively)
    let finalCommentText = commentText;
    if (selectedUsers.length > 0) {
      // Prepend @username for each selected user
      const mentions = selectedUsers.map(u => `@${u.username}`).join(' ');
      finalCommentText = `${mentions} ${commentText}`;
    }
    
    // Extract category UID from groupedcategory if available
    let categoryUID = datasetInfo.categoryUID;
    if (!categoryUID && datasetInfo.groupedcategory) {
      const parts = datasetInfo.groupedcategory.split('|');
      categoryUID = parts[parts.length - 1];
    }
    
    // Build the DataInput referer URL
    const budgetId = parseInt(datasetInfo.budgetId) || 86;
    const budgetYear = parseInt(datasetInfo.budgetYear) || new Date().getFullYear();
    const refererUrl = `${window.location.origin}/Budget/DataInput/${budgetId}/${budgetYear}`;
    
    const requestBody = {
      PlElementUID: parseInt(plElementUID),
      CommentDoneOnField: apiField,
      CommentText: finalCommentText,  // Include @mentions if users selected
      NotifyUserIdCSV: notifyUserIdCSV,
      NotificationText: notificationText,
      StoreUID: parseInt(transactionData.storeUID) || 0,
      CategoryUID: parseInt(categoryUID) || 0,
      BudgetUID: budgetId,
      BudgetYear: budgetYear
    };
    
    console.log('Saving comment with request:', requestBody);
    
    const response = await fetch('/Budget/SaveUserComments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'text/html, */*; q=0.01',
        'localoffset': new Date().getTimezoneOffset().toString(),
        'Referer': refererUrl
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok && response.status !== 302) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log('Comment saved, response:', html.substring(0, 200));
    
    return html;
  }

  // View existing comments
  async function viewExistingComments(cellData, transactionData, datasetInfo) {
    const plElementUID = transactionData.plElementUID;
    if (!plElementUID) {
      alert('Cannot view comments - missing element ID');
      return;
    }
    
    // Use the existing fetchAndShowComment function from modals
    const { fetchAndShowComment } = window.BetterBudgyt.ui.modals;
    fetchAndShowComment(plElementUID, cellData.field, transactionData.description || 'Item', {
      onAddComment: () => {
        // Open the add comment modal with the same context
        showAddCommentModal(cellData, transactionData, datasetInfo);
      }
    });
  }

  // Parse cell data from a clicked element in the comparison table
  function parseCellFromClick(element, comparisonData) {
    // Find the transaction row
    const row = element.closest('tr');
    if (!row) return null;
    
    // Find the department card
    const card = element.closest('.betterbudgyt-dept-card');
    const deptId = card ? card.dataset.dept : null;
    
    // Find the dataset section (1 or 2)
    const section = element.closest('.betterbudgyt-transactions-section');
    const isDataset1 = section?.classList.contains('betterbudgyt-transactions-section-1');
    const isDataset2 = section?.classList.contains('betterbudgyt-transactions-section-2');
    
    // Determine which dataset
    const datasetIndex = isDataset1 ? 1 : isDataset2 ? 2 : null;
    const datasetSource = isDataset1 ? comparisonData.dataset1 : 
                          isDataset2 ? comparisonData.dataset2 : null;
    
    if (!datasetSource || !datasetIndex) return null;
    
    // Create datasetInfo with index for cache updates
    const datasetInfo = { ...datasetSource, datasetIndex };
    
    // Find department data
    const department = datasetInfo.departments?.find(d => d.storeUID === deptId) || {};
    
    // Determine field type
    let field = 'description';
    let value;
    
    if (element.classList.contains('betterbudgyt-mini-desc')) {
      field = 'description';
      value = element.textContent.trim();
    } else if (element.classList.contains('betterbudgyt-mini-vendor')) {
      field = 'vendor';
      value = element.textContent.trim();
    } else if (element.classList.contains('betterbudgyt-mini-total')) {
      field = 'total';
      value = parseFloat(element.textContent.replace(/,/g, '')) || 0;
    } else if (element.classList.contains('betterbudgyt-mini-value')) {
      // Monthly value - get month from column position
      const cells = Array.from(row.querySelectorAll('td'));
      const cellIndex = cells.indexOf(element);
      const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
      // Account for desc and vendor columns
      const monthIndex = cellIndex - 2;
      if (monthIndex >= 0 && monthIndex < months.length) {
        field = months[monthIndex];
        value = parseFloat(element.textContent.replace(/,/g, '')) || 0;
      }
    }
    
    // Get transaction data from the row
    const descCell = row.querySelector('.betterbudgyt-mini-desc');
    const vendorCell = row.querySelector('.betterbudgyt-mini-vendor');
    const totalCell = row.querySelector('.betterbudgyt-mini-total');
    
    // Try to find plElementUID from existing data attributes
    let plElementUID = element.dataset.plElementUid || 
                       descCell?.dataset.plElementUid || 
                       null;
    
    // If not found, try to match against transactions
    if (!plElementUID && department.transactions) {
      const descText = descCell?.textContent?.replace(/📝\s*/, '').trim();
      const vendorText = vendorCell?.textContent?.trim();
      const totalValue = parseFloat(totalCell?.textContent?.replace(/,/g, '') || '0');
      
      const matchingTx = department.transactions.find(t => 
        t.description === descText || 
        (t.vendor === vendorText && Math.abs((t.total || 0) - totalValue) < 0.01)
      );
      
      if (matchingTx) {
        plElementUID = matchingTx.plElementUID;
      }
    }
    
    const transactionData = {
      description: descCell?.textContent?.replace(/📝\s*/, '').trim() || '',
      vendor: vendorCell?.textContent?.trim() || '',
      total: parseFloat(totalCell?.textContent?.replace(/,/g, '') || '0'),
      plElementUID: plElementUID,
      storeUID: deptId,
      departmentName: department.departmentName || deptId
    };
    
    const cellData = {
      field,
      value
    };
    
    return { cellData, transactionData, datasetInfo };
  }

  // Setup context menu handlers on a modal
  function setupContextMenuHandlers(modal, comparisonData) {
    modal.addEventListener('contextmenu', (event) => {
      const target = event.target;
      
      // Check if clicked on a valid cell
      const cell = target.closest('.betterbudgyt-mini-desc, .betterbudgyt-mini-vendor, .betterbudgyt-mini-value, .betterbudgyt-mini-total');
      if (!cell) return;
      
      // Parse the cell context
      const parsed = parseCellFromClick(cell, comparisonData);
      if (!parsed) return;
      
      const { cellData, transactionData, datasetInfo } = parsed;
      
      // Check if we have the required plElementUID
      if (!transactionData.plElementUID) {
        console.warn('No plElementUID found for this cell, comments may not work');
      }
      
      showContextMenu(event, cellData, transactionData, datasetInfo);
    });
  }

  // Add CSS styles for context menu and modal
  function injectStyles() {
    if (document.getElementById('betterbudgyt-comments-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'betterbudgyt-comments-styles';
    style.textContent = `
      /* Context Menu */
      .betterbudgyt-context-menu {
        position: fixed;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        padding: 4px 0;
        min-width: 160px;
        z-index: 10002;
        border: 1px solid #e2e8f0;
      }
      
      .betterbudgyt-context-menu-item {
        padding: 8px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #334155;
        transition: background 0.15s;
      }
      
      .betterbudgyt-context-menu-item:hover {
        background: #f1f5f9;
      }
      
      .betterbudgyt-context-menu-icon {
        font-size: 14px;
      }
      
      /* Add Comment Modal */
      .betterbudgyt-add-comment-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10003;
      }
      
      .betterbudgyt-add-comment-modal {
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      
      .betterbudgyt-add-comment-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        background: #eff6ff;
        border-bottom: 1px solid #bfdbfe;
      }
      
      .betterbudgyt-add-comment-title {
        font-size: 16px;
        font-weight: 600;
        color: #1e40af;
      }
      
      .betterbudgyt-add-comment-close {
        background: none;
        border: none;
        font-size: 24px;
        color: #64748b;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        line-height: 1;
      }
      
      .betterbudgyt-add-comment-close:hover {
        background: #dbeafe;
        color: #1e40af;
      }
      
      .betterbudgyt-add-comment-body {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
      }
      
      .betterbudgyt-add-comment-context {
        background: #f8fafc;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 16px;
        font-size: 13px;
      }
      
      .betterbudgyt-add-comment-context-item {
        margin-bottom: 6px;
        color: #475569;
      }
      
      .betterbudgyt-add-comment-context-item:last-child {
        margin-bottom: 0;
      }
      
      .betterbudgyt-add-comment-context-item strong {
        color: #1e293b;
      }
      
      .betterbudgyt-add-comment-value {
        color: #3b82f6;
        font-weight: 500;
      }
      
      .betterbudgyt-add-comment-dataset {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid #e2e8f0;
      }
      
      .betterbudgyt-add-comment-field {
        margin-bottom: 16px;
      }
      
      .betterbudgyt-add-comment-field label {
        display: block;
        font-size: 14px;
        font-weight: 500;
        color: #334155;
        margin-bottom: 6px;
      }
      
      .betterbudgyt-add-comment-field label .required {
        color: #dc2626;
      }
      
      .betterbudgyt-add-comment-to {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        min-height: 80px;
      }
      
      .betterbudgyt-add-comment-to-hint {
        font-size: 11px;
        color: #64748b;
        margin-top: 4px;
      }
      
      .betterbudgyt-add-comment-text {
        width: 100%;
        padding: 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        resize: vertical;
        font-family: inherit;
        box-sizing: border-box;
      }
      
      .betterbudgyt-add-comment-text:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      
      .betterbudgyt-add-comment-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
      }
      
      .betterbudgyt-add-comment-status {
        font-size: 13px;
        flex: 1;
      }
      
      .betterbudgyt-add-comment-status.info {
        color: #3b82f6;
      }
      
      .betterbudgyt-add-comment-status.success {
        color: #16a34a;
      }
      
      .betterbudgyt-add-comment-status.error {
        color: #dc2626;
      }
      
      .betterbudgyt-add-comment-actions {
        display: flex;
        gap: 8px;
      }
      
      .betterbudgyt-add-comment-cancel {
        padding: 8px 16px;
        border: 1px solid #d1d5db;
        background: #fff;
        color: #374151;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.15s;
      }
      
      .betterbudgyt-add-comment-cancel:hover {
        background: #f3f4f6;
      }
      
      .betterbudgyt-add-comment-save {
        padding: 8px 20px;
        border: none;
        background: #16a34a;
        color: #fff;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
      }
      
      .betterbudgyt-add-comment-save:hover {
        background: #15803d;
      }
      
      .betterbudgyt-add-comment-save:disabled {
        background: #9ca3af;
        cursor: not-allowed;
      }
    `;
    
    document.head.appendChild(style);
  }

  // Initialize comments functionality
  function init() {
    injectStyles();
  }

  // Export to namespace
  window.BetterBudgyt.features.comparison.comments = {
    init,
    showContextMenu,
    hideContextMenu,
    showAddCommentModal,
    saveComment,
    viewExistingComments,
    parseCellFromClick,
    setupContextMenuHandlers,
    fetchUsersList
  };

})();
