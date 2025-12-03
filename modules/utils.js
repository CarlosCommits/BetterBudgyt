// BetterBudgyt - Utility Functions
// Core utility functions used across the extension

(function() {
  'use strict';

  // Initialize namespace
  window.BetterBudgyt = window.BetterBudgyt || {};

  // Check if extension context is still valid
  function isExtensionContextValid() {
    try {
      return chrome.runtime && chrome.runtime.id;
    } catch (e) {
      return false;
    }
  }

  // Safely call chrome.storage.sync.get with error handling
  function safeStorageGet(keys, callback) {
    if (!isExtensionContextValid()) {
      console.log('Extension context invalidated - skipping storage call');
      return;
    }
    try {
      chrome.storage.sync.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          console.log('Storage error:', chrome.runtime.lastError.message);
          return;
        }
        callback(result);
      });
    } catch (e) {
      console.log('Extension context invalidated:', e.message);
    }
  }

  // Format number with commas, no unnecessary decimals
  function formatNumber(number) {
    const num = Number(number);
    if (Number.isInteger(num)) {
      return num.toLocaleString('en-US');
    }
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  // Strip number prefix from names (e.g., "1001 - ADMIN" -> "ADMIN")
  function stripNumberPrefix(name) {
    if (!name) return name;
    return name.replace(/^\d+\s*[-–]\s*/i, '').trim();
  }

  // Escape HTML special characters to prevent XSS in tooltips
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Check if current page is a DataInput page
  function isDataInputPage() {
    return window.location.href.includes('/Budget/DataInput/');
  }

  // Check if current page is a datasheet page
  function isDatasheetPage() {
    return window.location.href.includes('/Budget/DataInput/') && 
           !window.location.href.includes('/Budget/DataInput/Edit/');
  }

  // Log HTML in chunks to avoid console truncation (debug helper)
  function logHtmlInChunks(html, prefix = 'HTML Chunk') {
    if (!window.BetterBudgyt.state?.debugModeEnabled) return;
    
    const chunkSize = 10000;
    const chunks = Math.ceil(html.length / chunkSize);
    
    console.log(`${prefix}: Full HTML length: ${html.length} characters, splitting into ${chunks} chunks`);
    
    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, html.length);
      console.log(`${prefix} ${i+1}/${chunks}:`, html.substring(start, end));
    }
  }

  // Log DOM structure for debugging
  function logDomStructure(element, maxDepth = 3, currentDepth = 0) {
    if (!window.BetterBudgyt.state?.debugModeEnabled) return;
    if (!element || currentDepth > maxDepth) return;
    
    const indent = '  '.repeat(currentDepth);
    const tagName = element.tagName?.toLowerCase() || 'text';
    const id = element.id ? `#${element.id}` : '';
    const classes = element.className ? `.${element.className.split(' ').join('.')}` : '';
    const dataLevel = element.getAttribute?.('data-level') ? `[data-level="${element.getAttribute('data-level')}"]` : '';
    
    console.log(`${indent}${tagName}${id}${classes}${dataLevel}`);
    
    if (element.children) {
      Array.from(element.children).forEach(child => {
        logDomStructure(child, maxDepth, currentDepth + 1);
      });
    }
  }

  // Export to namespace
  window.BetterBudgyt.utils = {
    isExtensionContextValid,
    safeStorageGet,
    formatNumber,
    stripNumberPrefix,
    escapeHtml,
    isDataInputPage,
    isDatasheetPage,
    logHtmlInChunks,
    logDomStructure
  };

})();
