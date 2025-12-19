// BetterBudgyt - Comparison Context Menu
// Handles the right-click context menu in the comparison modal
// Dispatches actions to appropriate modules (comments, notes, transactions)

(function() {
  'use strict';

  window.BetterBudgyt = window.BetterBudgyt || {};
  window.BetterBudgyt.features = window.BetterBudgyt.features || {};
  window.BetterBudgyt.features.comparison = window.BetterBudgyt.features.comparison || {};

  function showContextMenu(event, cellData, transactionData, datasetInfo) {
    event.preventDefault();
    
    hideContextMenu();
    
    const transactions = window.BetterBudgyt.features.comparison.transactions;
    const isEditable = transactions?.isDatasetEditable(datasetInfo);
    const unlockedMonths = transactions?.getUnlockedMonths(datasetInfo) || [];
    const canAddTransaction = isEditable && unlockedMonths.length > 0;
    
    const menu = document.createElement('div');
    menu.className = 'betterbudgyt-context-menu';
    menu.innerHTML = `
      <div class="betterbudgyt-context-menu-item" data-action="add-comment">Add Comment</div>
      <div class="betterbudgyt-context-menu-item" data-action="view-comments">View Comments</div>
      <div class="betterbudgyt-context-menu-divider"></div>
      <div class="betterbudgyt-context-menu-item" data-action="add-note">Add Note</div>
      ${canAddTransaction ? `
      <div class="betterbudgyt-context-menu-divider"></div>
      <div class="betterbudgyt-context-menu-item" data-action="add-transaction">Add Transaction</div>
      ` : ''}
    `;
    
    menu.dataset.cellData = JSON.stringify(cellData);
    menu.dataset.transactionData = JSON.stringify(transactionData);
    menu.dataset.datasetInfo = JSON.stringify(datasetInfo);
    
    document.body.appendChild(menu);
    
    const menuRect = menu.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    let left = event.pageX;
    let top = event.pageY;
    
    if (event.clientX + menuRect.width > viewportWidth) {
      left = event.pageX - menuRect.width;
    }
    
    if (event.clientY + menuRect.height > viewportHeight) {
      top = event.pageY - menuRect.height;
    }
    
    if (left < window.scrollX) left = window.scrollX + 5;
    if (top < window.scrollY) top = window.scrollY + 5;
    
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    
    menu.addEventListener('click', (e) => {
      const item = e.target.closest('.betterbudgyt-context-menu-item');
      if (!item) return;
      
      const action = item.dataset.action;
      hideContextMenu();
      
      handleAction(action, cellData, transactionData, datasetInfo, event);
    });
    
    setTimeout(() => {
      document.addEventListener('click', hideContextMenuOnClick);
      document.addEventListener('contextmenu', hideContextMenu);
    }, 0);
  }

  function handleAction(action, cellData, transactionData, datasetInfo, originalEvent) {
    const comments = window.BetterBudgyt.features.comparison.comments;
    const notes = window.BetterBudgyt.features.comparison.notes;
    const transactions = window.BetterBudgyt.features.comparison.transactions;
    const modalModule = window.BetterBudgyt.features.comparison.modal;
    
    if (action === 'add-comment') {
      comments?.showAddCommentModal(cellData, transactionData, datasetInfo);
    } else if (action === 'view-comments') {
      comments?.viewExistingComments(cellData, transactionData, datasetInfo);
    } else if (action === 'add-note') {
      const comparisonData = modalModule?.getComparisonDataForElement(originalEvent.target);
      notes?.showAddNoteModal(transactionData, datasetInfo, comparisonData);
    } else if (action === 'add-transaction') {
      const comparisonData = modalModule?.getComparisonDataForElement(originalEvent.target);
      
      if (transactions && comparisonData) {
        const modal = originalEvent.target.closest('.betterbudgyt-comparison-modal');
        const hideMonthsToggle = modal?.querySelector('#hideMonthsToggle');
        const hideMonths = hideMonthsToggle ? hideMonthsToggle.checked : false;
        
        const departmentInfo = {
          storeUID: transactionData.storeUID,
          departmentName: transactionData.departmentName,
          deptUID: datasetInfo.deptUID
        };
        
        transactions.showAddTransactionModal(departmentInfo, datasetInfo, comparisonData, hideMonths);
      }
    }
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

  function parseCellFromClick(element, comparisonData) {
    const row = element.closest('tr');
    if (!row) return null;
    
    const card = element.closest('.betterbudgyt-dept-card');
    const deptId = card ? card.dataset.dept : null;
    
    const section = element.closest('.betterbudgyt-transactions-section');
    const isDataset1 = section?.classList.contains('betterbudgyt-transactions-section-1');
    const isDataset2 = section?.classList.contains('betterbudgyt-transactions-section-2');
    
    const datasetIndex = isDataset1 ? 1 : isDataset2 ? 2 : null;
    const datasetSource = isDataset1 ? comparisonData.dataset1 : 
                          isDataset2 ? comparisonData.dataset2 : null;
    
    if (!datasetSource || !datasetIndex) return null;
    
    const datasetInfo = { ...datasetSource, datasetIndex };
    
    const department = datasetInfo.departments?.find(d => d.storeUID === deptId) || {};
    
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
      const cells = Array.from(row.querySelectorAll('td'));
      const cellIndex = cells.indexOf(element);
      const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
      const monthIndex = cellIndex - 2;
      if (monthIndex >= 0 && monthIndex < months.length) {
        field = months[monthIndex];
        value = parseFloat(element.textContent.replace(/,/g, '')) || 0;
      }
    }
    
    const descCell = row.querySelector('.betterbudgyt-mini-desc');
    const vendorCell = row.querySelector('.betterbudgyt-mini-vendor');
    const totalCell = row.querySelector('.betterbudgyt-mini-total');
    
    let plElementUID = element.dataset.plElementUid || 
                       descCell?.dataset.plElementUid || 
                       null;
    
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

  function setupContextMenuHandlers(modal, comparisonData) {
    if (!modal) return;

    injectStyles();

    modal._betterBudgytComparisonDataForContextMenu = comparisonData;

    if (modal._betterBudgytContextMenuAttached) return;
    modal._betterBudgytContextMenuAttached = true;

    modal.addEventListener('contextmenu', (event) => {
      const target = event.target;

      const cell = target.closest('.betterbudgyt-mini-desc, .betterbudgyt-mini-vendor, .betterbudgyt-mini-value, .betterbudgyt-mini-total');
      if (!cell) return;

      const currentComparisonData = modal._betterBudgytComparisonDataForContextMenu || comparisonData;
      const parsed = parseCellFromClick(cell, currentComparisonData);
      if (!parsed) return;

      const { cellData, transactionData, datasetInfo } = parsed;

      if (!transactionData.plElementUID) {
        console.warn('No plElementUID found for this cell, comments may not work');
      }

      showContextMenu(event, cellData, transactionData, datasetInfo);
    });
  }

  function injectStyles() {
    if (document.getElementById('betterbudgyt-context-menu-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'betterbudgyt-context-menu-styles';
    style.textContent = `
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

      .betterbudgyt-context-menu-divider {
        height: 1px;
        background: #e2e8f0;
        margin: 4px 0;
      }
    `;
    
    document.head.appendChild(style);
  }

  function init() {
    injectStyles();
  }

  window.BetterBudgyt.features.comparison.contextMenu = {
    init,
    showContextMenu,
    hideContextMenu,
    parseCellFromClick,
    setupContextMenuHandlers
  };

})();
