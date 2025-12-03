// BetterBudgyt - Panel Components
// Sum panel (calculator) and related UI

(function() {
  'use strict';

  window.BetterBudgyt = window.BetterBudgyt || {};
  window.BetterBudgyt.ui = window.BetterBudgyt.ui || {};

  const { formatNumber } = window.BetterBudgyt.utils;
  const state = window.BetterBudgyt.state;

  // Create and initialize sum panel
  function createSumPanel() {
    if (!state.calculatorEnabled) return;

    const panel = document.createElement('div');
    panel.className = 'betterbudgyt-sum-panel';
    
    // Set initial position (will be adjusted after content is added)
    panel.style.visibility = 'hidden';
    panel.style.right = '20px';
    
    panel.innerHTML = `
      <div class="betterbudgyt-sum-panel-header">
        <div class="betterbudgyt-sum-panel-title">Selected Cells Sum</div>
        <div class="betterbudgyt-sum-panel-controls">
          <button class="betterbudgyt-sum-panel-button" id="clearSum">Clear</button>
          <button class="betterbudgyt-sum-panel-button" id="minimizeSum">−</button>
        </div>
      </div>
      <div class="betterbudgyt-sum-panel-content">
        <table class="betterbudgyt-sum-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
        <div class="betterbudgyt-sum-total">
          <span>Total:</span>
          <span id="sumTotal">$0.00</span>
        </div>
      </div>
    `;

    // Add panel to document
    document.body.appendChild(panel);

    // Store last position before minimizing
    let lastPosition = { top: null, left: null, right: '20px' };

    // Center panel vertically after it's added to get proper height
    requestAnimationFrame(() => {
      const panelHeight = panel.offsetHeight;
      const centerY = Math.max(20, (window.innerHeight - panelHeight) / 2);
      panel.style.top = `${centerY}px`;
      lastPosition.top = `${centerY}px`;
      // Make panel visible after positioning
      panel.style.visibility = 'visible';
    });

    // Initialize drag functionality
    initializeDrag(panel, lastPosition);

    // Add event listeners for controls
    panel.querySelector('#clearSum').addEventListener('click', () => {
      state.selectedCells.forEach((_, cell) => cell.classList.remove('betterbudgyt-cell-selected'));
      state.selectedCells.clear();
      updateSumPanel();
    });

    panel.querySelector('#minimizeSum').addEventListener('click', () => {
      if (!panel.classList.contains('minimized')) {
        // Store current position before minimizing
        lastPosition = {
          top: panel.style.top,
          left: panel.style.left,
          right: panel.style.right
        };
      } else {
        // Restore position when maximizing
        if (lastPosition.left) {
          panel.style.left = lastPosition.left;
          panel.style.right = 'auto';
        } else {
          panel.style.right = lastPosition.right;
          panel.style.left = 'auto';
        }
        panel.style.top = lastPosition.top;
      }
      
      panel.classList.toggle('minimized');
      const button = panel.querySelector('#minimizeSum');
      button.textContent = panel.classList.contains('minimized') ? '+' : '−';
    });

    // Handle click on minimized panel
    panel.addEventListener('click', (e) => {
      if (panel.classList.contains('minimized') && !e.target.closest('.betterbudgyt-sum-panel-button')) {
        panel.classList.remove('minimized');
        panel.querySelector('#minimizeSum').textContent = '−';
        
        // Restore position
        if (lastPosition.left) {
          panel.style.left = lastPosition.left;
          panel.style.right = 'auto';
        } else {
          panel.style.right = lastPosition.right;
          panel.style.left = 'auto';
        }
        panel.style.top = lastPosition.top;
      }
    });

    return panel;
  }

  // Initialize drag functionality
  function initializeDrag(panel, lastPosition) {
    let isDragging = false;
    let startX;
    let startY;
    let startLeft;
    let startTop;

    const dragStart = (e) => {
      if (e.target.closest('.betterbudgyt-sum-panel-button') || panel.classList.contains('minimized')) return;
      
      if (e.target.closest('.betterbudgyt-sum-panel-header')) {
        isDragging = true;
        panel.classList.add('dragging');
        
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = panel.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
        
        // Convert right position to left if needed
        if (panel.style.right && !panel.style.left) {
          panel.style.left = (window.innerWidth - rect.right) + 'px';
          panel.style.right = 'auto';
        }
      }
    };

    const drag = (e) => {
      if (!isDragging) return;
      
      e.preventDefault();
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      let newLeft = startLeft + deltaX;
      let newTop = startTop + deltaY;
      
      // Constrain to viewport bounds
      const rect = panel.getBoundingClientRect();
      if (newLeft < 0) newLeft = 0;
      if (newLeft + rect.width > window.innerWidth) newLeft = window.innerWidth - rect.width;
      if (newTop < 0) newTop = 0;
      if (newTop + rect.height > window.innerHeight) newTop = window.innerHeight - rect.height;
      
      panel.style.left = newLeft + 'px';
      panel.style.top = newTop + 'px';
      panel.style.right = 'auto';
      
      // Update last position
      lastPosition.top = panel.style.top;
      lastPosition.left = panel.style.left;
      lastPosition.right = 'auto';
    };

    const dragEnd = () => {
      if (isDragging) {
        isDragging = false;
        panel.classList.remove('dragging');
      }
    };

    panel.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
  }

  // Update sum panel with current selections
  function updateSumPanel() {
    const panel = document.querySelector('.betterbudgyt-sum-panel');
    if (!panel) return;

    const tbody = panel.querySelector('tbody');
    tbody.innerHTML = '';

    let total = 0;

    state.selectedCells.forEach((data, cell) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${data.description}</td>
        <td>${formatNumber(data.value)}</td>
      `;
      tbody.appendChild(row);
      total += data.value;
    });

    panel.querySelector('#sumTotal').textContent = formatNumber(total);
  }

  // Remove sum panel
  function removeSumPanel() {
    const sumPanel = document.querySelector('.betterbudgyt-sum-panel');
    if (sumPanel) {
      sumPanel.remove();
    }
  }

  // Export to namespace
  window.BetterBudgyt.ui.panels = {
    createSumPanel,
    updateSumPanel,
    removeSumPanel
  };

})();
