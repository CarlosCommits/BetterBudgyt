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
      let note = '';
      const commentCell = row.querySelector('td#hdnComment, td[id="hdnComment"]');
      if (commentCell) {
        const rawComment = commentCell.innerHTML || commentCell.textContent;
        if (rawComment && rawComment.trim()) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = rawComment;
          const decodedHtml = tempDiv.textContent || tempDiv.innerText;
          
          const noteMatch = decodedHtml.match(/<b>([^<]+)<\/b>\s*(.+)$/i);
          let noteText = '';
          if (noteMatch) {
            noteText = noteMatch[2].trim();
          } else {
            const stripDiv = document.createElement('div');
            stripDiv.innerHTML = decodedHtml;
            noteText = stripDiv.textContent || stripDiv.innerText || '';
            noteText = noteText.trim();
          }
          noteText = noteText.replace(/^:\s*/, '');
          
          let author = '';
          let modifiedDate = '';
          const modifiedByDiv = row.querySelector('.modifiedByUserName-modal, #modifiedByUserNameDiv');
          if (modifiedByDiv) {
            const authorEl = modifiedByDiv.querySelector('.datModifiedBy, b.datModifiedBy');
            const dateEl = modifiedByDiv.querySelector('.datModifiedDate');
            if (authorEl) {
              author = authorEl.textContent.replace(/:$/, '').trim();
            }
            if (dateEl) {
              const dateStr = dateEl.textContent;
              try {
                const date = new Date(dateStr);
                modifiedDate = date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
              } catch (e) {
                modifiedDate = dateStr;
              }
            }
          }
          
          if (noteText) {
            if (author && modifiedDate) {
              note = `[${author} ${modifiedDate}] ${noteText}`;
            } else if (author) {
              note = `[${author}] ${noteText}`;
            } else {
              note = noteText;
            }
          }
        }
      }
      
      // Extract PLElementUID for comment API calls
      let plElementUID = null;
      const plElementCell = row.querySelector('td#hdnPLElementUID, td[id="hdnPLElementUID"]');
      if (plElementCell) {
        plElementUID = plElementCell.textContent.trim();
      }
      
      // Extract comments info
      const comments = {};
      
      const descCell = row.querySelector('td.hasComment:first-child, td:first-child.hasComment');
      if (descCell) {
        comments.description = true;
      }
      
      const vendorCellComment = row.querySelector('td.vendorLst.hasComment, td.vendor-wrap.hasComment');
      if (vendorCellComment) {
        comments.vendor = true;
      }
      
      const monthNames = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
      monthNames.forEach((month, index) => {
        const periodNum = index + 1;
        const monthCell = row.querySelector(`td.data[data-period="P${periodNum}"].hasComment, td.DATValueM${periodNum}F.hasComment`);
        if (monthCell) {
          comments[month] = true;
        }
      });
      
      const result = {
        description,
        vendor,
        monthly,
        total,
        note,
        plElementUID,
        comments
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
      totals: {}
    };
    
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
