// BetterBudgyt - Modal Components
// Note modals, comment modals, and related UI

(function() {
  'use strict';

  window.BetterBudgyt = window.BetterBudgyt || {};
  window.BetterBudgyt.ui = window.BetterBudgyt.ui || {};

  const { escapeHtml } = window.BetterBudgyt.utils;

  // Show note in a modal
  // Parses Budgyt HTML note format and displays notes nicely
  function showNoteModal(description, note, targetDoc = document) {
    // Remove any existing note modal
    const existingModal = targetDoc.querySelector('.betterbudgyt-note-modal-overlay');
    if (existingModal) existingModal.remove();
    
    // Parse Budgyt note HTML format: <br/><img.../><b>Author Date</b> : note text
    // Each note starts with <br/> followed by <img.../><b>Author Date</b> : text
    
    // First, decode any HTML entities in the note (in case it was double-encoded)
    let decodedNote = note;
    if (note.includes('&lt;') || note.includes('&gt;')) {
      const decoder = targetDoc.createElement('textarea');
      decoder.innerHTML = note;
      decodedNote = decoder.value;
    }
    
    // Build the notes content HTML - render the Budgyt format properly
    let notesHtml = '';
    
    // Split notes by the <br/> pattern that precedes each note entry
    // Pattern: <br/><img class='img-circle layout-menu-image' src=... /><b >Author Date</b > : text
    // Note: Budgyt sometimes adds spaces inside tags like <b > and </b >
    const notePattern = /<br\s*\/?><img[^>]*>\s*<b\s*>([^<]+)<\/b\s*>\s*:\s*/gi;
    const parts = decodedNote.split(notePattern);
    
    // If we have matches, parts will be: ['', 'Author1 Date1', 'text1', 'Author2 Date2', 'text2', ...]
    if (parts.length > 1) {
      // Skip first empty part, then process pairs of (author, text)
      for (let i = 1; i < parts.length; i += 2) {
        const author = (parts[i] || '').trim();
        const text = (parts[i + 1] || '').trim();
        // Get just the text until the next note starts (or end)
        const cleanText = text.split(/<br\s*\/?>\s*<img/i)[0].trim();
        notesHtml += `
          <div class="betterbudgyt-note-entry">
            <div class="betterbudgyt-note-author">
              <img class="betterbudgyt-note-avatar" src="/assets/admin/layout/img/user-male-placeholder.png" />
              <strong>${escapeHtml(author)}</strong>
            </div>
            <div class="betterbudgyt-note-text">${escapeHtml(cleanText)}</div>
          </div>
        `;
      }
    } else {
      // Fallback: just show the note content as-is (escaped for safety)
      notesHtml = `<div class="betterbudgyt-note-entry"><div class="betterbudgyt-note-text">${escapeHtml(decodedNote)}</div></div>`;
    }
    
    const overlay = targetDoc.createElement('div');
    overlay.className = 'betterbudgyt-note-modal-overlay';
    overlay.innerHTML = `
      <div class="betterbudgyt-note-modal">
        <div class="betterbudgyt-note-modal-header">
          <div class="betterbudgyt-note-modal-title">📝 Notes</div>
          <button class="betterbudgyt-note-modal-close">&times;</button>
        </div>
        <div class="betterbudgyt-note-modal-body">
          <div class="betterbudgyt-note-modal-item"><strong>Item:</strong> ${escapeHtml(description)}</div>
          <div class="betterbudgyt-note-modal-content">${notesHtml}</div>
        </div>
      </div>
    `;
    
    // Close on overlay click or close button
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.closest('.betterbudgyt-note-modal-close')) {
        overlay.remove();
      }
    });
    
    // Close on Escape key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        targetDoc.removeEventListener('keydown', escHandler);
      }
    };
    targetDoc.addEventListener('keydown', escHandler);
    
    targetDoc.body.appendChild(overlay);
  }

  // Show comment modal with optional Add Comment button
  function showCommentModal(desc, field, content, options = {}) {
    // Remove any existing modal
    const existingModal = document.querySelector('.betterbudgyt-comment-modal-overlay');
    if (existingModal) {
      existingModal.remove();
    }
    
    const fieldLabel = field === 'description' ? 'Description' : 
                       field === 'vendor' ? 'Vendor' : 
                       field === 'total' ? 'Total' :
                       `${field} Value`;
    
    const overlay = document.createElement('div');
    overlay.className = 'betterbudgyt-comment-modal-overlay';
    overlay.innerHTML = `
      <div class="betterbudgyt-comment-modal">
        <div class="betterbudgyt-comment-modal-header">
          <div class="betterbudgyt-comment-modal-title">💬 Comment on ${fieldLabel}</div>
          <button class="betterbudgyt-comment-modal-close">&times;</button>
        </div>
        <div class="betterbudgyt-comment-modal-body">
          <div class="betterbudgyt-comment-desc">${escapeHtml(desc)}</div>
          <div class="betterbudgyt-comment-content">${content}</div>
        </div>
        <div class="betterbudgyt-comment-modal-footer">
          <button class="betterbudgyt-comment-add-btn">+ Add Comment</button>
        </div>
      </div>
    `;
    
    // Close handlers
    const closeModal = () => overlay.remove();
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.closest('.betterbudgyt-comment-modal-close')) {
        closeModal();
      }
    });
    
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    });
    
    // Add Comment button handler
    overlay.querySelector('.betterbudgyt-comment-add-btn').addEventListener('click', () => {
      closeModal();
      if (options.onAddComment) {
        options.onAddComment();
      }
    });
    
    document.body.appendChild(overlay);
    return overlay;
  }

  // Fetch comment from Budgyt API and display it
  // options.onAddComment: callback when Add Comment button is clicked
  async function fetchAndShowComment(plElementUID, field, desc, options = {}) {
    const { escapeHtml } = window.BetterBudgyt.utils;
    
    // Map field names to API field values
    const fieldMapping = {
      'description': 'Description',
      'vendor': 'Vendor',
      'Apr': 'P1', 'May': 'P2', 'Jun': 'P3', 'Jul': 'P4',
      'Aug': 'P5', 'Sep': 'P6', 'Oct': 'P7', 'Nov': 'P8',
      'Dec': 'P9', 'Jan': 'P10', 'Feb': 'P11', 'Mar': 'P12'
    };
    
    const apiField = fieldMapping[field] || field;
    
    // Show loading modal with Add Comment callback
    showCommentModal(desc, field, '<div style="text-align: center; padding: 20px;"><i>Loading comment...</i></div>', options);
    
    try {
      const response = await fetch('/Budget/GetUserComments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          PlElementUID: parseInt(plElementUID),
          CommentDoneOnField: apiField
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch comment');
      }
      
      const html = await response.text();
      
      // Parse the response HTML to extract comment content
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const comments = [];
      const seenTexts = new Set();
      
      const commentItems = doc.querySelectorAll('.comment-details > ul > li');
      
      commentItems.forEach(item => {
        const authorEl = item.querySelector('.commented-by');
        const author = authorEl?.textContent?.trim();
        
        if (!author) return;
        
        const dateEl = item.querySelector('.commented-on');
        let date = '';
        if (dateEl) {
          const dateStr = dateEl.getAttribute('data-datetimefromserver') || dateEl.textContent;
          try {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
              date = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
            } else {
              date = dateEl.textContent?.trim() || '';
            }
          } catch (e) {
            date = dateEl.textContent?.trim() || '';
          }
        }
        
        const textEl = item.querySelector('.comment-text');
        const text = textEl?.textContent?.trim() || '';
        
        const dedupeKey = `${author}|${text}`;
        if (seenTexts.has(dedupeKey)) return;
        seenTexts.add(dedupeKey);
        
        if (author && text) {
          comments.push({ author, date, text });
        }
      });
      
      // Build display HTML
      let contentHtml = '';
      if (comments.length > 0) {
        comments.forEach(c => {
          contentHtml += `
            <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">
              <div style="font-weight: 600; color: #1e293b;">${escapeHtml(c.author)}</div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${escapeHtml(c.date)}</div>
              <div style="color: #334155;">${escapeHtml(c.text)}</div>
            </div>
          `;
        });
      } else {
        contentHtml = '<i>No comments found</i>';
      }
      
      // Update modal with content
      const modalBody = document.querySelector('.betterbudgyt-comment-modal-body .betterbudgyt-comment-content');
      if (modalBody) {
        modalBody.innerHTML = contentHtml;
      }
    } catch (error) {
      console.error('Error fetching comment:', error);
      const modalBody = document.querySelector('.betterbudgyt-comment-modal-body .betterbudgyt-comment-content');
      if (modalBody) {
        modalBody.innerHTML = '<div style="color: #dc2626;">Failed to load comment. Please try again.</div>';
      }
    }
  }

  // Show comparison loading indicator
  function showComparisonLoadingIndicator() {
    hideComparisonLoadingIndicator();
    
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'betterbudgyt-loading-indicator';
    loadingIndicator.innerHTML = `
      <div class="betterbudgyt-loading-spinner"></div>
      <div class="betterbudgyt-loading-text">Loading comparison data...</div>
    `;
    
    document.body.appendChild(loadingIndicator);
  }

  // Hide comparison loading indicator
  function hideComparisonLoadingIndicator() {
    const loadingIndicator = document.querySelector('.betterbudgyt-loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.remove();
    }
  }

  // Cleanup minimized tabs container if empty
  function cleanupMinimizedTabsContainer() {
    const container = document.querySelector('.betterbudgyt-minimized-tabs-container');
    if (container && container.children.length === 0) {
      container.remove();
    }
  }

  // Export to namespace
  window.BetterBudgyt.ui.modals = {
    showNoteModal,
    showCommentModal,
    fetchAndShowComment,
    showComparisonLoadingIndicator,
    hideComparisonLoadingIndicator,
    cleanupMinimizedTabsContainer
  };

})();
