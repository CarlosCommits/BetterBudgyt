// BetterBudgyt - Comparison Comments
// Handles adding/viewing comments in the comparison modal

(function() {
  'use strict';

  window.BetterBudgyt = window.BetterBudgyt || {};
  window.BetterBudgyt.features = window.BetterBudgyt.features || {};
  window.BetterBudgyt.features.comparison = window.BetterBudgyt.features.comparison || {};

  const { escapeHtml, formatNumber } = window.BetterBudgyt.utils;

  const FIELD_MAPPING = {
    'description': 'Description',
    'vendor': 'Vendor',
    'total': 'Total',
    'Apr': 'P1', 'May': 'P2', 'Jun': 'P3', 'Jul': 'P4',
    'Aug': 'P5', 'Sep': 'P6', 'Oct': 'P7', 'Nov': 'P8',
    'Dec': 'P9', 'Jan': 'P10', 'Feb': 'P11', 'Mar': 'P12'
  };

  let cachedUsers = null;

  async function fetchUsersList(plElementUID, field) {
    if (cachedUsers && cachedUsers.length > 0) return cachedUsers;
    
    try {
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
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const userSelect = doc.querySelector('select[name="lstUsers"], select.multiselectLst.group');
          
          if (userSelect) {
            cachedUsers = Array.from(userSelect.options).map(opt => {
              const parts = opt.value.split('|');
              return {
                value: opt.value,
                label: opt.textContent.trim() || parts[2] || parts[0],
                userId: parts[1] || '',
                username: parts[0] || ''
              };
            }).filter(u => u.userId);
            
            console.log('Fetched users from GetUserComments:', cachedUsers.length);
            return cachedUsers;
          }
        }
      }
      
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
      
      cachedUsers = [];
      return cachedUsers;
    } catch (e) {
      console.error('Failed to fetch users list:', e);
      return [];
    }
  }

  async function showAddCommentModal(cellData, transactionData, datasetInfo) {
    const existingModal = document.querySelector('.betterbudgyt-add-comment-overlay');
    if (existingModal) existingModal.remove();
    
    const fieldLabel = getFieldLabel(cellData.field);
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
    
    const textarea = overlay.querySelector('.betterbudgyt-add-comment-text');
    textarea.focus();
    
    const closeModal = () => overlay.remove();
    
    overlay.querySelector('.betterbudgyt-add-comment-close').addEventListener('click', closeModal);
    overlay.querySelector('.betterbudgyt-add-comment-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
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
        
        const cellSelector = `[data-pl-element-uid="${transactionData.plElementUID}"][data-field="${cellData.field}"]`;
        document.querySelectorAll(cellSelector).forEach(cell => {
          cell.classList.add('has-comment');
        });
        
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

  function updateCachedCommentFlag(plElementUID, field, datasetInfo) {
    const state = window.BetterBudgyt.state;
    const comparisonData = state.currentComparisonData;
    if (!comparisonData) return;
    
    const datasetKey = datasetInfo.datasetIndex === 1 ? 'dataset1' : 'dataset2';
    const departments = comparisonData[datasetKey]?.departments;
    if (!departments) return;
    
    for (const dept of departments) {
      if (!dept.transactions) continue;
      for (const tx of dept.transactions) {
        if (tx.plElementUID === plElementUID) {
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

  async function activateBudgetSession(datasetInfo) {
    const budgetId = parseInt(datasetInfo.budgetId);
    const budgetYear = parseInt(datasetInfo.budgetYear);
    
    if (!budgetId || !budgetYear) {
      console.warn('Missing budget session info, skipping session activation');
      return;
    }
    
    console.log('Activating budget session with CheckBudgetInSession:', { budgetId, budgetYear });
    
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

  async function saveComment(cellData, transactionData, datasetInfo, commentText, selectedUsers) {
    await activateBudgetSession(datasetInfo);
    
    const plElementUID = transactionData.plElementUID;
    if (!plElementUID) {
      throw new Error('Missing PlElementUID - cannot save comment');
    }
    
    const apiField = FIELD_MAPPING[cellData.field] || cellData.field;
    
    await initializeCommentSession(plElementUID, cellData.field);
    
    const userIds = selectedUsers.map(u => u.userId).filter(id => id);
    const notifyUserIdCSV = userIds.length > 0 ? userIds.join(',') : '-1';
    const notificationText = 'mentioned you in a comment about ';
    
    let finalCommentText = commentText;
    if (selectedUsers.length > 0) {
      const mentions = selectedUsers.map(u => `@${u.username}`).join(' ');
      finalCommentText = `${mentions} ${commentText}`;
    }
    
    let categoryUID = datasetInfo.categoryUID;
    if (!categoryUID && datasetInfo.groupedcategory) {
      const parts = datasetInfo.groupedcategory.split('|');
      categoryUID = parts[parts.length - 1];
    }
    
    const budgetId = parseInt(datasetInfo.budgetId) || 86;
    const budgetYear = parseInt(datasetInfo.budgetYear) || new Date().getFullYear();
    const refererUrl = `${window.location.origin}/Budget/DataInput/${budgetId}/${budgetYear}`;
    
    const requestBody = {
      PlElementUID: parseInt(plElementUID),
      CommentDoneOnField: apiField,
      CommentText: finalCommentText,
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

  async function viewExistingComments(cellData, transactionData, datasetInfo) {
    const plElementUID = transactionData.plElementUID;
    if (!plElementUID) {
      alert('Cannot view comments - missing element ID');
      return;
    }
    
    const { fetchAndShowComment } = window.BetterBudgyt.ui.modals;
    fetchAndShowComment(plElementUID, cellData.field, transactionData.description || 'Item', {
      onAddComment: () => {
        showAddCommentModal(cellData, transactionData, datasetInfo);
      }
    });
  }

  function injectStyles() {
    if (document.getElementById('betterbudgyt-comments-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'betterbudgyt-comments-styles';
    style.textContent = `
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

  function init() {
    injectStyles();
  }

  window.BetterBudgyt.features.comparison.comments = {
    init,
    showAddCommentModal,
    saveComment,
    viewExistingComments,
    fetchUsersList
  };

})();
