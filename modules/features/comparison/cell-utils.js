// BetterBudgyt - Comparison Cell Utilities
// Helper functions for cell parameter extraction and column detection

(function() {
  'use strict';

  window.BetterBudgyt = window.BetterBudgyt || {};
  window.BetterBudgyt.features = window.BetterBudgyt.features || {};
  window.BetterBudgyt.features.comparison = window.BetterBudgyt.features.comparison || {};

  // Check if a cell has a datasheet link
  function hasDatasheetLink(cell) {
    return cell.querySelector('a.linkToDataPage') !== null;
  }

  // Get datasheet URL from cell
  function getDatasheetUrl(cell) {
    const link = cell.querySelector('a.linkToDataPage');
    return link ? link.getAttribute('data-href') : null;
  }

  // Get column type from cell
  function getColumnType(cell) {
    if (cell.classList.contains('actual-budgetVal')) return 'Actuals';
    if (cell.classList.contains('compare-budgetVal')) return 'Budget';
    if (cell.classList.contains('actual-budgetLYVal')) return 'Previous Year';
    return 'Unknown';
  }

  // Get scenario ID based on column type
  function getScenarioId(columnType) {
    switch (columnType) {
      case 'Actuals':
        return '86';
      case 'Budget':
        return '89';
      case 'Previous Year':
        return '86';
      default:
        return '86';
    }
  }

  // Find parent category row by traversing up the DOM
  function findParentCategory(row) {
    const currentLevel = parseInt(row.getAttribute('data-level') || '0');
    
    if (currentLevel <= 3) {
      return row;
    }
    
    let currentRow = row;
    while (currentRow) {
      currentRow = currentRow.previousElementSibling;
      
      if (currentRow && parseInt(currentRow.getAttribute('data-level') || '0') === 3) {
        return currentRow;
      }
    }
    
    return null;
  }

  // Extract cell parameters for AJAX requests
  function extractCellParameters(cell) {
    console.log('Extracting cell parameters from:', cell);
    
    let extractedScenarioId = null;
    let extractedYear = null;
    
    const row = cell.closest('tr');
    if (!row) {
      console.error('No parent row found for cell');
      return null;
    }
    
    let categoryUID = row.getAttribute('data-val');
    
    const parentRow = findParentCategory(row);
    let parentCategoryUID = parentRow ? parentRow.getAttribute('data-val') : null;
    
    const link = cell.querySelector('a.linkToDataPage');
    let dataHref = link ? link.getAttribute('data-href') : null;
    
    if (!dataHref) {
      const anyLink = cell.querySelector('a[data-href]');
      dataHref = anyLink ? anyLink.getAttribute('data-href') : null;
      
      if (dataHref) {
        console.log('Found data-href from generic link:', dataHref);
      }
    }
    
    if (dataHref) {
      console.log('Found data-href:', dataHref);
      
      const pathMatch = dataHref.match(/\/Budget\/DataInput\/(\d+)\/(\d+)/);
      if (pathMatch && pathMatch.length >= 3) {
        extractedScenarioId = pathMatch[1];
        extractedYear = pathMatch[2];
        console.log(`Extracted scenario ID: ${extractedScenarioId}, year: ${extractedYear} from data-href`);
      }
      
      try {
        const hrefParts = dataHref.split('?');
        if (hrefParts.length > 1) {
          const hrefParams = new URLSearchParams(hrefParts[1]);
          const hrefCategoryUID = hrefParams.get('CategoryUID');
          const hrefGroupedCategory = hrefParams.get('groupedcategory');
          
          if (hrefCategoryUID) {
            categoryUID = hrefCategoryUID;
            console.log('Extracted CategoryUID from data-href:', categoryUID);
          }
          
          if (hrefGroupedCategory) {
            console.log('Extracted groupedcategory from data-href:', hrefGroupedCategory);
            
            const groupedParts = hrefGroupedCategory.split('|');
            if (groupedParts.length === 2) {
              parentCategoryUID = groupedParts[0];
              categoryUID = groupedParts[1];
              
              console.log('Extracted complete parameters from data-href:', {
                parentCategoryUID,
                categoryUID,
                groupedcategory: hrefGroupedCategory
              });
              
              const columnType = getColumnType(cell);
              const scenarioId = extractedScenarioId || getScenarioId(columnType);
              
              return {
                categoryUID,
                groupedcategory: hrefGroupedCategory,
                scenarioId,
                columnType,
                dataHref,
                year: extractedYear
              };
            }
          }
        } else if (extractedScenarioId) {
          const columnType = getColumnType(cell);
          
          return {
            categoryUID,
            groupedcategory: parentCategoryUID && categoryUID ? `${parentCategoryUID}|${categoryUID}` : null,
            scenarioId: extractedScenarioId,
            columnType,
            dataHref,
            year: extractedYear
          };
        }
      } catch (error) {
        console.error('Error parsing data-href:', error);
      }
    }
    
    if (!categoryUID) {
      console.warn('No data-val attribute found on row, trying to find it in cell');
      const cellWithData = cell.closest('[data-val]');
      if (cellWithData) {
        categoryUID = cellWithData.getAttribute('data-val');
      }
    }
    
    if (!parentCategoryUID) {
      const urlMatch = window.location.href.match(/\/Budget\/DataInput\/\d+\/\d+\/(\d+)/);
      if (urlMatch && urlMatch[1]) {
        parentCategoryUID = urlMatch[1];
      } else {
        parentCategoryUID = '430';
      }
    }
    
    if (!categoryUID) {
      categoryUID = '4022';
    }
    
    const columnType = getColumnType(cell);
    const scenarioId = extractedScenarioId || getScenarioId(columnType);
    const year = extractedYear || null;
    const groupedcategory = `${parentCategoryUID}|${categoryUID}`;
    
    const result = {
      categoryUID,
      groupedcategory,
      scenarioId,
      columnType,
      dataHref,
      year
    };
    
    console.log('Extracted cell parameters:', result);
    return result;
  }

  // Build AJAX parameters for datasheet request
  function buildAjaxParameters(categoryUID, groupedcategory) {
    const localOffset = new Date().getTimezoneOffset();
    
    return {
      level: '2',
      StoreUID: '-1',
      DeptUID: '3',
      CategoryUID: categoryUID,
      groupedcategory: groupedcategory,
      CompNonCompfilter: '',
      Stores: '567,568,569,570,571,572,573,574,575,576,577,578,579,582,580',
      viewLevel: 'CATEGORY',
      vendoridCSV: '-2',
      showInGlobal: true,
      bsMode: '',
      categoryType: 'PL',
      localoffset: localOffset.toString()
    };
  }

  // Check if Scenario 3 is set to "Do Not Show"
  function isScenario3Hidden() {
    const scn3Select = document.querySelector('select[name="budgetToCompareD3"]');
    if (scn3Select) {
      if (scn3Select.value === '-2') return true;
    }
    
    const scn3Display = document.querySelector('.comparisionBudget2Year .select2-chosen');
    if (scn3Display && scn3Display.textContent.trim() === 'Do Not Show') {
      return true;
    }
    
    return false;
  }

  // Get available comparison columns from a row
  function getAvailableColumns(row) {
    const columns = [];
    const scn3Hidden = isScenario3Hidden();
    
    const actualsCell = row.querySelector('td.actual-budgetVal');
    if (actualsCell && hasDatasheetLink(actualsCell)) {
      columns.push({
        type: 'actual-budgetVal',
        name: actualsCell.getAttribute('title') || 'Actuals',
        cell: actualsCell
      });
    }
    
    const budgetCell = row.querySelector('td.compare-budgetVal');
    if (budgetCell && hasDatasheetLink(budgetCell)) {
      columns.push({
        type: 'compare-budgetVal',
        name: budgetCell.getAttribute('title') || 'Budget',
        cell: budgetCell
      });
    }
    
    if (!scn3Hidden) {
      const lyCell = row.querySelector('td.actual-budgetLYVal');
      if (lyCell && hasDatasheetLink(lyCell)) {
        columns.push({
          type: 'actual-budgetLYVal',
          name: lyCell.getAttribute('title') || 'Previous Year',
          cell: lyCell
        });
      }
    }
    
    return columns;
  }

  // Export to namespace
  window.BetterBudgyt.features.comparison.cellUtils = {
    hasDatasheetLink,
    getDatasheetUrl,
    getColumnType,
    getScenarioId,
    findParentCategory,
    extractCellParameters,
    buildAjaxParameters,
    isScenario3Hidden,
    getAvailableColumns
  };

})();
