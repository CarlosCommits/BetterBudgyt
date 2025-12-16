// BetterBudgyt - Comparison Data Parser
// Parse HTML responses and extract transaction data

(function() {
  'use strict';

  window.BetterBudgyt = window.BetterBudgyt || {};
  window.BetterBudgyt.features = window.BetterBudgyt.features || {};
  window.BetterBudgyt.features.comparison = window.BetterBudgyt.features.comparison || {};

  const state = window.BetterBudgyt.state;

  // Extract transaction data from row
  function extractTransactionData(row) {
    const debugMode = state.debugModeEnabled;
    
    try {
      if (debugMode) {
        console.log('Extracting transaction data from row:', row.outerHTML);
      } else {
        console.log('Extracting transaction data from row:', row.outerHTML.substring(0, 200) + '...');
      }
      
      // Get description
      let description = '';
      
      const descSpan = row.querySelector('span.desc-field, span.approved-row-desc');
      if (descSpan) {
        description = descSpan.getAttribute('data-value') || descSpan.textContent.trim();
      }
      
      if (!description) {
        const descInput = row.querySelector('input.isDescription');
        if (descInput && descInput.value) {
          description = descInput.value.trim();
        }
      }
      
      if (!description) {
        const descCell = row.querySelector('td[isDescription="true"]');
        if (descCell) {
          description = descCell.textContent.trim();
        }
      }
      
      if (!description) {
        const firstCell = row.querySelector('td:first-child');
        if (firstCell) {
          description = firstCell.getAttribute('title') || firstCell.textContent.trim();
        }
      }
      
      if (!description) {
        description = 'No Description Entered';
      }
      
      // Get vendor
      let vendor = '';
      
      const vendorSpan = row.querySelector('span.vendor');
      if (vendorSpan) {
        vendor = vendorSpan.getAttribute('title') || vendorSpan.textContent.trim();
      } 
      
      if (!vendor) {
        const vendorCell = row.querySelector('td.vendor, td.vendorLst');
        if (vendorCell) {
          const vendorSpanInCell = vendorCell.querySelector('span.vendor');
          if (vendorSpanInCell) {
            vendor = vendorSpanInCell.getAttribute('title') || vendorSpanInCell.textContent.trim();
          } else {
            vendor = vendorCell.textContent.trim();
          }
        }
      }
      
      // Get monthly values
      const monthly = {};
      const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
      
      months.forEach((month, index) => {
        const periodNum = index + 1;
        const periodStr = periodNum < 10 ? `P0${periodNum}` : `P${periodNum}`;
        
        const selectors = [
          `td[data-period="${periodStr}"]`,
          `td[title="${month}"]`,
          `td[data-month="${month}"]`,
          `td.data[data-period="${periodStr}"]`,
          `td.data[title="${month}"]`
        ];
        
        let dataCell = null;
        for (const selector of selectors) {
          dataCell = row.querySelector(selector);
          if (dataCell) break;
        }
        
        if (!dataCell) {
          const startPos = 3;
          const cellIndex = startPos + index;
          dataCell = row.querySelector(`td:nth-child(${cellIndex})`);
        }
        
        if (dataCell) {
          const valueSpan = dataCell.querySelector('span[data-value]');
          if (valueSpan && valueSpan.hasAttribute('data-value')) {
            const value = valueSpan.getAttribute('data-value');
            monthly[month] = parseFloat(value.replace(/,/g, '')) || 0;
          } else if (dataCell.querySelector('input[type="text"]')) {
            const input = dataCell.querySelector('input[type="text"]');
            monthly[month] = parseFloat(input.value.replace(/,/g, '')) || 0;
          } else {
            const span = dataCell.querySelector('span');
            if (span) {
              monthly[month] = parseFloat(span.textContent.trim().replace(/,/g, '')) || 0;
            } else {
              monthly[month] = parseFloat(dataCell.textContent.trim().replace(/,/g, '')) || 0;
            }
          }
        } else {
          monthly[month] = 0;
        }
      });
      
      // Get total
      let total = 0;
      
      const totalSelectors = [
        'td[title="Total"]',
        'td.data[title="Total"]',
        'td.DATValueTotalF',
        'td.data.DATValueTotalF'
      ];
      
      let totalCell = null;
      for (const selector of totalSelectors) {
        totalCell = row.querySelector(selector);
        if (totalCell) break;
      }
      
      if (!totalCell) {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
          totalCell = cells[cells.length - 1];
        }
      }
      
      if (totalCell) {
        const valueSpan = totalCell.querySelector('span[data-value]');
        if (valueSpan && valueSpan.hasAttribute('data-value')) {
          total = parseFloat(valueSpan.getAttribute('data-value').replace(/,/g, '')) || 0;
        } else if (totalCell.querySelector('input[type="text"]')) {
          const input = totalCell.querySelector('input[type="text"]');
          total = parseFloat(input.value.replace(/,/g, '')) || 0;
        } else {
          const span = totalCell.querySelector('span');
          if (span) {
            total = parseFloat(span.textContent.replace(/,/g, '')) || 0;
          } else {
            total = parseFloat(totalCell.textContent.trim().replace(/,/g, '')) || 0;
          }
        }
      } else {
        total = Object.values(monthly).reduce((sum, val) => sum + val, 0);
      }
      
      // Extract note from hdnComment hidden field
      // The note is stored as HTML-encoded content that we need to preserve for proper display
      let note = '';
      const commentCell = row.querySelector('td#hdnComment, td[id="hdnComment"]');
      if (commentCell) {
        const rawComment = commentCell.innerHTML || commentCell.textContent;
        if (rawComment && rawComment.trim()) {
          // Decode HTML entities to get the actual HTML structure
          // The content is like: &lt;br/&gt;&lt;img...&gt;&lt;b &gt;Author Date&lt;/b &gt;: text
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = rawComment;
          // textContent decodes entities, giving us the raw HTML string
          const decodedHtml = tempDiv.textContent || tempDiv.innerText;
          
          // Store the full HTML structure for the note modal to parse and display
          // The modal will handle parsing <br/><img.../><b>Author Date</b> : text format
          if (decodedHtml && decodedHtml.trim()) {
            note = decodedHtml.trim();
          }
        }
      }
      
      // Extract PLElementUID for comment API calls
      let plElementUID = null;
      const plElementCell = row.querySelector('td#hdnPLElementUID, td[id="hdnPLElementUID"]');
      if (plElementCell) {
        plElementUID = plElementCell.textContent.trim();
      }
      
      // Extract comments info - find all cells with hasComment class
      const comments = {};
      
      // Get all tds with hasComment class
      const commentCells = row.querySelectorAll('td.hasComment');
      commentCells.forEach(cell => {
        // Check what type of cell this is based on its classes or position
        const classes = cell.className || '';
        const title = cell.getAttribute('title') || '';
        const dataPeriod = cell.getAttribute('data-period');
        
        // Description cell - first td or has desc content
        if (cell === row.querySelector('td') || classes.match(/^\s*hasComment\s*$/)) {
          comments.description = true;
        }
        
        // Vendor cell
        if (classes.includes('vendorLst') || classes.includes('vendor-wrap')) {
          comments.vendor = true;
        }
        
        // Month cells - check by data-period or DATValueM*F class
        if (dataPeriod) {
          const periodMatch = dataPeriod.match(/P(\d+)/);
          if (periodMatch) {
            const monthNames = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
            const periodNum = parseInt(periodMatch[1]);
            if (periodNum >= 1 && periodNum <= 12) {
              comments[monthNames[periodNum - 1]] = true;
            }
          }
        }
        
        // Also check by class DATValueM*F
        const monthClassMatch = classes.match(/DATValueM(\d+)F/);
        if (monthClassMatch) {
          const monthNames = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
          const periodNum = parseInt(monthClassMatch[1]);
          if (periodNum >= 1 && periodNum <= 12) {
            comments[monthNames[periodNum - 1]] = true;
          }
        }
        
        // Total cell
        if (classes.includes('DATValueTotalF') || title === 'Total') {
          comments.total = true;
        }
      });
      
      // Debug log if comments found
      if (Object.keys(comments).length > 0) {
        console.log('Found comments on fields:', comments, 'for transaction:', description?.substring(0, 50));
      }
      
      // Extract file attachment info from hidden field (same pattern as notes from hdnComment)
      let fileAttachment = null;
      const folderCell = row.querySelector('td#hdnAttachedSubCategoryFolderName, td[id="hdnAttachedSubCategoryFolderName"]');
      if (folderCell) {
        const folderName = folderCell.getAttribute('data-attachedfolder') || folderCell.textContent.trim();
        
        if (folderName && folderName.length > 0) {
          fileAttachment = {
            hasFile: true,
            folderName: folderName,
            plElementUID: plElementUID
          };
          console.log('Found file attachment for transaction:', description?.substring(0, 50), fileAttachment);
        }
      }
      
      const result = {
        description,
        vendor,
        monthly,
        total,
        note,
        plElementUID,
        comments,
        fileAttachment
      };
      
      console.log('Extracted transaction:', result);
      return result;
    } catch (error) {
      console.error('Error extracting transaction data:', error);
      return null;
    }
  }

  // Extract total data from row
  function extractTotalData(row) {
    try {
      console.log('Extracting total data from row:', row);
      
      const totals = {};
      const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
      
      months.forEach((month, index) => {
        const periodNum = index + 1;
        const selectors = [
          `td.data[data-period="P${periodNum}"]`,
          `td.data[data-period="P0${periodNum}"]`,
          `td.data[title="${month}"]`,
          `td[data-month="${month}"]`,
          `td:nth-child(${index + 4})`
        ];
        
        let dataCell = null;
        for (const selector of selectors) {
          dataCell = row.querySelector(selector);
          if (dataCell) break;
        }
        
        if (dataCell) {
          const valueSpan = dataCell.querySelector('span[data-value]');
          if (valueSpan && valueSpan.hasAttribute('data-value')) {
            totals[month] = parseFloat(valueSpan.getAttribute('data-value').replace(/,/g, '')) || 0;
          } else if (dataCell.querySelector('span')) {
            totals[month] = parseFloat(dataCell.querySelector('span').textContent.trim().replace(/,/g, '')) || 0;
          } else {
            totals[month] = parseFloat(dataCell.textContent.trim().replace(/,/g, '')) || 0;
          }
        } else {
          totals[month] = 0;
        }
      });
      
      const totalSelectors = [
        'td.data.DATValueTotalF',
        'td.data[title="Total"]',
        'td:last-child'
      ];
      
      let totalCell = null;
      for (const selector of totalSelectors) {
        totalCell = row.querySelector(selector);
        if (totalCell) break;
      }
      
      if (totalCell) {
        const totalSpan = totalCell.querySelector('span[data-value]');
        if (totalSpan && totalSpan.hasAttribute('data-value')) {
          totals.total = parseFloat(totalSpan.getAttribute('data-value').replace(/,/g, '')) || 0;
        } else if (totalCell.querySelector('span')) {
          totals.total = parseFloat(totalCell.querySelector('span').textContent.replace(/,/g, '')) || 0;
        } else {
          totals.total = parseFloat(totalCell.textContent.replace(/,/g, '')) || 0;
        }
      } else {
        totals.total = Object.values(totals).reduce((sum, val) => sum + val, 0);
      }
      
      console.log('Extracted totals:', totals);
      return totals;
    } catch (error) {
      console.error('Error extracting total data:', error);
      return {};
    }
  }

  // Parse datasheet HTML response
  async function parseDatasheetHtml(responseText, departmentName) {
    console.log(`Parsing HTML response for ${departmentName}`);
    
    const wrappedHtml = `<table><tbody>${responseText}</tbody></table>`;
    const parser = new DOMParser();
    const doc = parser.parseFromString(wrappedHtml, 'text/html');
    
    const result = {
      departmentName,
      transactions: [],
      totals: {},
      pagination: null  // Will be set if there are more rows to load
    };
    
    // Check for "show more" pagination link
    const showMoreLink = doc.querySelector('a.show-more-rows');
    if (showMoreLink) {
      const pageIndex = showMoreLink.getAttribute('data-pageIndex') || showMoreLink.getAttribute('data-pageindex');
      if (pageIndex) {
        result.pagination = {
          hasMore: true,
          currentPageIndex: parseInt(pageIndex, 10) || 1
        };
        console.log(`Found pagination indicator for ${departmentName}: pageIndex=${pageIndex}, more pages available`);
      }
    }
    
    const allRows = doc.querySelectorAll('table > tbody > tr[data-level]');
    console.log(`Found ${allRows.length} total rows with data-level attribute for ${departmentName}`);
    
    const transactionRowSelectors = [
      'table > tbody > tr[data-level="3"].budgetdata.bottomLevel.showyear.highlight.level3',
      'table > tbody > tr[data-level="3"].budgetdata.bottomLevel.showyear',
      'table > tbody > tr[data-level="3"].budgetdata.bottomLevel',
      'table > tbody > tr.budgetdata.bottomLevel',
      'table > tbody > tr[data-level="3"].bottomLevel',
      'table > tbody > tr[data-level="3"]'
    ];
    
    let transactionRows = [];
    for (const selector of transactionRowSelectors) {
      const rows = doc.querySelectorAll(selector);
      if (rows.length > 0) {
        console.log(`Found ${rows.length} transaction rows using selector: ${selector}`);
        transactionRows = rows;
        break;
      }
    }
    
    if (transactionRows.length === 0) {
      console.log('No transaction rows found with structured selectors, falling back to vendor cell scan');
      transactionRows = Array.from(doc.querySelectorAll('table > tbody > tr'))
        .filter(row => row.querySelector('.vendor') || row.querySelector('.vendorLst') || row.querySelector('[data-period]'));
      console.log(`Found ${transactionRows.length} transaction rows by vendor/data-period cells`);
    }
    
    transactionRows.forEach(row => {
      const transaction = extractTransactionData(row);
      if (transaction) {
        result.transactions.push(transaction);
      }
    });
    
    const totalRowSelectors = [
      'table > tbody > tr[data-level="3"].doNotExpand.showyear.totals.highlight.level3',
      'table > tbody > tr[data-level="3"].doNotExpand.showyear.totals',
      'table > tbody > tr[data-level="3"].totals',
      'table > tbody > tr.totals',
      'table > tbody > tr.doNotExpand.showyear.totals',
      'table > tbody > tr.total-row'
    ];
    
    let totalRow = null;
    for (const selector of totalRowSelectors) {
      const row = doc.querySelector(selector);
      if (row) {
        console.log(`Found total row using selector: ${selector}`);
        totalRow = row;
        break;
      }
    }
    
    if (!totalRow) {
      const allRowsForTotal = doc.querySelectorAll('table > tbody > tr');
      for (const row of allRowsForTotal) {
        if (/Total/i.test(row.textContent)) {
          console.log('Found total row by text content containing "Total"');
          totalRow = row;
          break;
        }
      }
    }
    
    if (totalRow) {
      result.totals = extractTotalData(totalRow);
    } else {
      console.warn(`No total row found for ${departmentName}, totals will be empty`);
      
      const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
      months.forEach(month => {
        result.totals[month] = result.transactions.reduce((sum, t) => sum + (t.monthly[month] || 0), 0);
      });
      result.totals.total = result.transactions.reduce((sum, t) => sum + (t.total || 0), 0);
    }
    
    return result;
  }

  // Export to namespace
  window.BetterBudgyt.features.comparison.parser = {
    extractTransactionData,
    extractTotalData,
    parseDatasheetHtml
  };

})();
