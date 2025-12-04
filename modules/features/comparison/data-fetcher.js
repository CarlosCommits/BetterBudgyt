// BetterBudgyt - Comparison Data Fetcher
// Handles AJAX requests to fetch datasheet data

(function() {
  'use strict';

  window.BetterBudgyt = window.BetterBudgyt || {};
  window.BetterBudgyt.features = window.BetterBudgyt.features || {};
  window.BetterBudgyt.features.comparison = window.BetterBudgyt.features.comparison || {};

  const state = window.BetterBudgyt.state;
  const { logHtmlInChunks } = window.BetterBudgyt.utils;

  // Cache constants
  const CACHE_STORAGE_KEY = 'betterbudgyt_datasheet_cache';
  const CACHE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

  // Get cache from storage
  async function getDatasheetCache() {
    return new Promise((resolve) => {
      chrome.storage.local.get([CACHE_STORAGE_KEY], (result) => {
        const cache = result[CACHE_STORAGE_KEY] || {};
        const entryCount = Object.keys(cache).length;
        console.log(`📂 Loaded cache: ${entryCount} entries`);
        resolve(cache);
      });
    });
  }

  // Set cache in storage
  async function setDatasheetCache(cache) {
    return new Promise((resolve, reject) => {
      const cacheStr = JSON.stringify(cache);
      const cacheSizeKB = (cacheStr.length / 1024).toFixed(1);
      const entryCount = Object.keys(cache).length;
      console.log(`💾 Saving cache: ${entryCount} entries, ${cacheSizeKB} KB`);
      
      chrome.storage.local.set({ [CACHE_STORAGE_KEY]: cache }, () => {
        if (chrome.runtime.lastError) {
          console.error('❌ Cache storage failed:', chrome.runtime.lastError.message);
          if (chrome.runtime.lastError.message.includes('QUOTA')) {
            console.warn('Storage quota exceeded, pruning oldest cache entries...');
            pruneOldestCacheEntries(cache, 5);
          }
          resolve();
        } else {
          resolve();
        }
      });
    });
  }

  // Prune oldest cache entries
  async function pruneOldestCacheEntries(cache, countToRemove) {
    const entries = Object.entries(cache);
    if (entries.length <= countToRemove) {
      await setDatasheetCache({});
      return;
    }
    
    entries.sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0));
    
    const toRemove = entries.slice(0, countToRemove);
    toRemove.forEach(([key]) => {
      console.log(`Pruning old cache entry: ${key}`);
      delete cache[key];
    });
    
    await setDatasheetCache(cache);
  }

  // Clear specific cache entry
  async function clearCacheEntry(cacheKey) {
    const cache = await getDatasheetCache();
    delete cache[cacheKey];
    await setDatasheetCache(cache);
    console.log(`Cleared cache for: ${cacheKey}`);
  }

  // Clear all datasheet cache
  async function clearAllDatasheetCache() {
    await setDatasheetCache({});
    console.log('Cleared all datasheet cache');
  }

  // Fetch store/class names from the page's DOM or API
  async function fetchStoreNamesFromPage() {
    if (state.storeNameCache.size > 0) {
      console.log('Using cached store names:', state.storeNameCache.size, 'entries');
      return state.storeNameCache;
    }
    
    console.log('Fetching store names from page...');
    
    // Try department/class rows in the DataInput table
    try {
      const deptRows = document.querySelectorAll('tr[data-level="1"], tr[data-level="2"], tr.level1, tr.level2');
      console.log(`Found ${deptRows.length} potential department rows in page DOM`);
      
      deptRows.forEach(row => {
        const storeCell = row.querySelector('td#hdnStoreUID');
        if (!storeCell) return;
        
        const storeUID = storeCell.textContent?.trim();
        if (!storeUID || storeUID === '-1') return;
        
        let storeName = '';
        
        const labelDiv = row.querySelector('div.label');
        if (labelDiv) {
          storeName = labelDiv.textContent?.trim();
        }
        
        if (!storeName) {
          const firstTd = row.querySelector('td:first-child');
          if (firstTd) {
            const title = firstTd.getAttribute('title');
            if (title && !['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Total', '%LY', '%LLY'].includes(title)) {
              storeName = title;
            }
          }
        }
        
        if (!storeName) {
          const firstTd = row.querySelector('td:first-child');
          if (firstTd) {
            storeName = firstTd.textContent?.trim();
          }
        }
        
        if (storeName) {
          const textarea = document.createElement('textarea');
          textarea.innerHTML = storeName;
          storeName = textarea.value.trim();
        }
        
        if (storeUID && storeName) {
          state.storeNameCache.set(storeUID, storeName);
          console.log(`Cached store name: ${storeUID} -> ${storeName}`);
        }
      });
      
      if (state.storeNameCache.size > 0) {
        console.log(`Extracted ${state.storeNameCache.size} store names from DataInput table rows`);
        return state.storeNameCache;
      }
    } catch (e) {
      console.warn('Error extracting store names from table rows:', e);
    }
    
    // Try to fetch from API
    try {
      const response = await fetch('/Budget/GetStoreList', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          data.forEach(store => {
            const storeUID = String(store.StoreUID || store.storeUID || store.Id || store.id);
            const storeName = store.StoreName || store.storeName || store.Name || store.name;
            if (storeUID && storeName) {
              state.storeNameCache.set(storeUID, storeName);
            }
          });
          console.log(`Fetched ${state.storeNameCache.size} store names from API`);
          return state.storeNameCache;
        }
      }
    } catch (e) {
      console.warn('GetStoreList API not available:', e);
    }
    
    console.log('Could not find store/class names from page or API');
    return state.storeNameCache;
  }

  // Prime budget session with GET request
  async function primeBudgetSession(dataHref) {
    if (!dataHref) return;
    
    console.log(`Priming budget session with GET request to: ${dataHref}`);
    
    try {
      const response = await fetch(dataHref, {
        method: 'GET',
        credentials: 'include'
      });
      
      console.log(`Prime session response status: ${response.status}`);
      await new Promise(r => setTimeout(r, 250));
      
      return true;
    } catch (error) {
      console.error('Error priming budget session:', error);
      throw new Error(`Failed to prime budget session: ${error.message}`);
    }
  }

  // Initialize budget session context
  async function fetchPercentApprovedValues(groupedcategory, dataHref, storeCsv) {
    try {
      console.log(`Initializing budget session with FetchPercentApprovedValues for ${groupedcategory}`);
      
      const baseUrl = window.location.origin;
      const refererUrl = dataHref ? `${baseUrl}${dataHref}` : null;
      
      const headers = {
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest'
      };
      
      if (refererUrl) {
        headers['Referer'] = refererUrl;
      }
      
      const payload = {
        StoreUIDCSV: storeCsv || '567,568,569,570,571,572,573,574,575,576,577,578,579,582,580',
        groupedcategory: groupedcategory
      };
      
      const response = await fetch('/Budget/FetchPercentApprovedValues', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error initializing budget session! Status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('FetchPercentApprovedValues response:', result);
      
      return true;
    } catch (error) {
      console.error('Error initializing budget session:', error);
      throw new Error(`Failed to initialize budget session: ${error.message}`);
    }
  }

  // Extract all StoreUIDs from Level 0 response
  function extractStoreUIDFromLevel0(htmlResponse, accountName) {
    console.log(`Extracting StoreUIDs from Level 0 response for ${accountName}`);
    
    if (state.debugModeEnabled) {
      logHtmlInChunks(htmlResponse, 'COMPLETE Level 0 HTML Response');
    }
    
    const parser = new DOMParser();
    const wrappedHtml = `<table>${htmlResponse}</table>`;
    const doc = parser.parseFromString(wrappedHtml, 'text/html');
    const uniqueStoreUIDs = new Map();
    
    const normalizeName = (name) => (name || '').replace(/\s+/g, ' ').trim();
    
    const candidateRows = Array.from(doc.querySelectorAll('tr'));
    console.log(`Found ${candidateRows.length} total TR rows in the Level 0 response`);
    
    let rowsWithStoreCell = 0;
    let rowsWithValidUID = 0;
    
    candidateRows.forEach((row, index) => {
      const storeCell = row.querySelector('td#hdnStoreUID');
      if (!storeCell) return;
      rowsWithStoreCell++;
      
      const storeUID = storeCell.textContent.trim();
      if (!storeUID || storeUID === '-1' || uniqueStoreUIDs.has(storeUID)) return;
      rowsWithValidUID++;
      
      let departmentName = '';
      
      const labelDiv = row.querySelector('div.label');
      if (labelDiv) {
        departmentName = labelDiv.textContent;
      }
      
      if (!departmentName) {
        const firstTd = row.querySelector('td:first-child');
        if (firstTd) {
          departmentName = firstTd.getAttribute('title') || firstTd.textContent;
        }
      }
      
      if (!departmentName) {
        const allTitleCells = row.querySelectorAll('td[title]');
        for (const cell of allTitleCells) {
          const title = cell.getAttribute('title');
          if (title && !['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Total', '%LY', '%LLY'].includes(title)) {
            departmentName = title;
            break;
          }
        }
      }
      
      if (departmentName) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = departmentName;
        departmentName = normalizeName(textarea.value || textarea.innerHTML || departmentName);
      }
      
      if (!departmentName) {
        departmentName = state.storeNameCache.get(storeUID) || `Class ${storeUID}`;
      }
      
      const deptCandidate = row.querySelector('[data-deptid]') || row.querySelector('[data-id]');
      const deptUID = deptCandidate ? (deptCandidate.getAttribute('data-deptid') || deptCandidate.getAttribute('data-id')) : null;
      
      // Extract monthly values
      const monthly = {};
      const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
      months.forEach((month, i) => {
        const periodNum = i + 1;
        const monthCell = row.querySelector(`td[data-period="P${periodNum}"]`) || 
                          row.querySelector(`td[data-Period="P${periodNum}"]`) ||
                          row.querySelector(`td[title="${month}"].data`);
        if (monthCell) {
          const spanVal = monthCell.querySelector('span.showCol, span');
          const valText = spanVal ? spanVal.textContent.trim() : monthCell.textContent.trim();
          monthly[month] = parseFloat(valText.replace(/[^0-9.-]+/g, '')) || 0;
        } else {
          monthly[month] = 0;
        }
      });
      
      // Extract total
      const totalCell = row.querySelector('td[title="Total"].data, td.DATValueTotalF');
      let total = 0;
      if (totalCell) {
        const spanVal = totalCell.querySelector('span.showCol, span');
        const valText = spanVal ? spanVal.textContent.trim() : totalCell.textContent.trim();
        total = parseFloat(valText.replace(/[^0-9.-]+/g, '')) || 0;
      }
      
      uniqueStoreUIDs.set(storeUID, {
        storeUID,
        departmentName,
        deptUID: deptUID || '-1',
        monthly,
        total,
        source: 'hdnStoreUID row',
        rowIndex: index
      });
    });
    
    console.log(`Summary: ${candidateRows.length} total rows, ${rowsWithStoreCell} with hdnStoreUID cell, ${rowsWithValidUID} with valid UID`);
    
    // Regex fallback
    if (uniqueStoreUIDs.size === 0) {
      const regex = /id="hdnStoreUID">([0-9]+)<\/td>/g;
      let match;
      while ((match = regex.exec(htmlResponse)) !== null) {
        const uid = match[1];
        if (!uniqueStoreUIDs.has(uid)) {
          const cachedName = state.storeNameCache.get(uid);
          uniqueStoreUIDs.set(uid, {
            storeUID: uid,
            departmentName: cachedName || `Class ${uid}`,
            deptUID: '-1',
            source: cachedName ? 'regex + cache' : 'regex fallback'
          });
        }
      }
    }
    
    const departmentStoreUIDs = Array.from(uniqueStoreUIDs.values());
    console.log(`Found ${departmentStoreUIDs.length} unique StoreUID/class pairs for ${accountName}`);
    
    if (departmentStoreUIDs.length > 0) return departmentStoreUIDs;
    
    console.warn(`Could not find any StoreUID in the response, falling back to default 579`);
    return [{
      storeUID: '579',
      departmentName: 'SGA',
      deptUID: '3',
      source: 'default fallback'
    }];
  }

  // Fetch StoreUIDs for department using Level 0 request
  async function fetchStoreUIDForDepartment(parameters, accountName, dataHref) {
    try {
      console.log(`Fetching StoreUIDs for ${accountName} with groupedcategory: ${parameters.groupedcategory}`);
      
      await fetchStoreNamesFromPage();
      
      const level0Params = {
        level: '0',
        StoreUID: '-1',
        DeptUID: '-1',
        CategoryUID: '-1',
        groupedcategory: parameters.groupedcategory,
        CompNonCompfilter: '',
        Stores: parameters.Stores || '567,568,569,570,571,572,573,574,575,576,577,578,579,582,580',
        viewLevel: 'STORE',
        vendorIdCSV: '-2',
        showInGlobal: true,
        bsMode: '',
        categoryType: 'PL',
        localoffset: new Date().getTimezoneOffset().toString()
      };
      
      const baseUrl = window.location.origin;
      const refererUrl = dataHref ? `${baseUrl}${dataHref}` : null;
      
      const headers = {
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'text/html, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest'
      };
      
      if (refererUrl) {
        headers['Referer'] = refererUrl;
      }
      
      const response = await fetch('/Budget/GetRowData', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(level0Params)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error fetching StoreUIDs! Status: ${response.status}`);
      }
      
      const responseText = await response.text();
      console.log('Level 0 response (first 200 chars):', responseText.substring(0, 200) + '...');
      
      const level0StoreUIDs = extractStoreUIDFromLevel0(responseText, accountName);
      
      // Additional Level 1 request for names
      const level1Params = { ...level0Params, level: '1' };
      
      let level1StoreUIDs = [];
      try {
        const level1Response = await fetch('/Budget/GetRowData', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(level1Params)
        });
        const level1Text = await level1Response.text();
        level1StoreUIDs = extractStoreUIDFromLevel0(level1Text, `${accountName} (Level 1)`);
      } catch (err) {
        console.warn('Level 1 request for store names failed:', err);
      }
      
      // Merge results
      const merged = new Map();
      [...level0StoreUIDs, ...level1StoreUIDs].forEach(entry => {
        if (!merged.has(entry.storeUID)) {
          merged.set(entry.storeUID, entry);
        } else {
          const existing = merged.get(entry.storeUID);
          if ((!existing.departmentName || existing.departmentName.startsWith('Class ')) && entry.departmentName) {
            merged.set(entry.storeUID, { ...existing, departmentName: entry.departmentName });
          }
        }
      });
      
      if (merged.size === 0 && level0Params.Stores) {
        console.log('No store UIDs found in HTML response, extracting from Stores parameter...');
        const storeIds = level0Params.Stores.split(',').filter(id => id && id !== '-1');
        storeIds.forEach(storeUID => {
          const cachedName = state.storeNameCache.get(storeUID);
          merged.set(storeUID, {
            storeUID,
            departmentName: cachedName || `Class ${storeUID}`,
            deptUID: '-1',
            source: cachedName ? 'Stores param + cache' : 'Stores param'
          });
        });
      }
      
      const departmentStoreUIDs = Array.from(merged.values());
      console.log(`✓ Successfully extracted ${departmentStoreUIDs.length} StoreUIDs for ${accountName}`);
      
      return departmentStoreUIDs;
    } catch (error) {
      console.error('Error fetching StoreUIDs:', error);
      return [{
        storeUID: '579',
        departmentName: 'SGA',
        source: 'default fallback'
      }];
    }
  }

  // Fetch datasheet data via AJAX
  async function fetchDatasheetData(parameters, accountName, dataType, dataHref) {
    const { parseDatasheetHtml } = window.BetterBudgyt.features.comparison.parser;
    
    try {
      console.log(`Fetching datasheet data for ${accountName} (${dataType})`);
      
      let budgetId = '86';
      let budgetYear = '2026';
      
      if (dataHref) {
        const pathMatch = dataHref.match(/\/Budget\/DataInput\/(\d+)\/(\d+)/);
        if (pathMatch && pathMatch.length >= 3) {
          budgetId = pathMatch[1];
          budgetYear = pathMatch[2];
        }
      }
      
      // STEP 1: Prime session
      console.log("STEP 1: Priming budget session with GET request");
      await primeBudgetSession(dataHref);
      
      // STEP 2: Fetch StoreUIDs
      console.log(`STEP 2: Fetching StoreUIDs for ${accountName} using Level 0 request`);
      const departmentStoreUIDs = await fetchStoreUIDForDepartment(parameters, accountName, dataHref);
      
      const storeCsv = departmentStoreUIDs.map(d => d.storeUID).join(',');
      
      // STEP 3: Initialize session
      console.log(`STEP 3: Initializing budget session with FetchPercentApprovedValues`);
      await fetchPercentApprovedValues(parameters.groupedcategory, dataHref, storeCsv);
      
      const result = {
        accountName,
        dataType,
        budgetId,
        budgetYear,
        categoryUID: parameters.CategoryUID || parameters.categoryUID,
        groupedcategory: parameters.groupedcategory,
        departments: [],
        transactions: [],
        totals: {},
        grandTotals: {},
        failedDepartments: []
      };
      
      // STEP 4: Process departments
      console.log(`STEP 4: Fetching Level 2 transaction data for departments`);
      
      const baseUrl = window.location.origin;
      const refererUrl = dataHref ? `${baseUrl}${dataHref}` : null;
      
      const headers = {
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'text/html, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest'
      };
      if (refererUrl) headers['Referer'] = refererUrl;
      
      // Filter departments with non-zero totals
      const deptsToFetch = departmentStoreUIDs.filter(deptInfo => {
        const level0Total = deptInfo.total || 0;
        const level0HasData = deptInfo.monthly 
          ? Object.values(deptInfo.monthly).some(v => Math.abs(v) > 0.0001)
          : false;
        
        if (Math.abs(level0Total) < 0.0001 && !level0HasData) {
          console.log(`Skipping ${deptInfo.departmentName} - Level 0 totals are zero`);
          return false;
        }
        return true;
      });
      
      console.log(`Fetching ${deptsToFetch.length} departments in PARALLEL...`);
      const deptFetchStart = performance.now();
      
      // Fetch all departments in parallel
      const deptPromises = deptsToFetch.map(async (deptInfo) => {
        try {
          const deptParameters = {
            level: '2',
            StoreUID: deptInfo.storeUID,
            DeptUID: parameters.DeptUID || '3',
            CategoryUID: parameters.CategoryUID || '-1',
            groupedcategory: parameters.groupedcategory,
            CompNonCompfilter: parameters.CompNonCompfilter || '',
            Stores: storeCsv,
            viewLevel: 'CATEGORY',
            vendorIdCSV: parameters.vendoridCSV || parameters.vendorIdCSV || '-2',
            showInGlobal: true,
            bsMode: parameters.bsMode || '',
            categoryType: parameters.categoryType || 'PL',
            localoffset: parameters.localoffset || new Date().getTimezoneOffset().toString()
          };
          
          const response = await fetch('/Budget/GetRowData', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(deptParameters)
          });
          
          if (response.ok) {
            const responseText = await response.text();
            const deptData = await parseDatasheetHtml(responseText, deptInfo.departmentName);
            deptData.departmentName = deptInfo.departmentName;
            deptData.storeUID = deptInfo.storeUID;
            deptData.deptUID = deptInfo.deptUID;
            
            const hasTransactions = (deptData.transactions || []).length > 0;
            const deptTotalVal = deptData.totals.total || 0;
            
            if (hasTransactions || Math.abs(deptTotalVal) > 0.0001) {
              return { success: true, deptData, deptInfo };
            } else {
              return { success: false, skipped: true };
            }
          } else {
            return { success: false, error: `HTTP ${response.status}`, deptInfo };
          }
        } catch (error) {
          return { success: false, error: error.message, deptInfo };
        }
      });
      
      const deptResults = await Promise.all(deptPromises);
      
      const deptFetchTime = performance.now() - deptFetchStart;
      console.log(`All ${deptsToFetch.length} departments fetched in ${deptFetchTime.toFixed(0)}ms (parallel)`);
      
      // Process results
      for (const res of deptResults) {
        if (res.success && res.deptData) {
          result.departments.push(res.deptData);
          res.deptData.transactions.forEach(t => {
            result.transactions.push({ 
              ...t, 
              departmentName: res.deptInfo.departmentName, 
              storeUID: res.deptInfo.storeUID 
            });
          });
        } else if (res.error && res.deptInfo) {
          result.failedDepartments.push({
            departmentName: res.deptInfo.departmentName,
            storeUID: res.deptInfo.storeUID,
            error: res.error
          });
        }
      }
      
      // Calculate grand totals
      const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
      
      months.forEach(month => {
        result.grandTotals[month] = 0;
      });
      result.grandTotals.total = 0;
      
      result.departments.forEach(dept => {
        months.forEach(month => {
          result.grandTotals[month] += (dept.totals[month] || 0);
        });
        result.grandTotals.total += (dept.totals.total || 0);
      });
      
      // Deduplicate transactions
      const seen = new Set();
      result.transactions = result.transactions.filter(tx => {
        const key = `${tx.vendor || ''}|${tx.description || ''}|${tx.total || 0}|${tx.storeUID || ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      
      console.log('Successfully fetched datasheet data:', {
        accountName,
        dataType,
        departmentCount: result.departments.length,
        totalTransactionCount: result.transactions.length,
        grandTotal: result.grandTotals.total
      });
      
      return result;
    } catch (error) {
      console.error('Error fetching datasheet data:', error);
      throw new Error(`Failed to fetch datasheet data: ${error.message}`);
    }
  }

  // Open datasheets with caching
  async function openDatasheetsParallel(cell1Data, cell2Data, forceRefresh = false) {
    const { extractCellParameters, buildAjaxParameters } = window.BetterBudgyt.features.comparison.cellUtils;
    
    const comparisonData = {
      dataset1: {
        accountName: cell1Data.description,
        dataType: cell1Data.columnType,
        transactions: [],
        totals: {},
        failedDepartments: []
      },
      dataset2: {
        accountName: cell2Data.description,
        dataType: cell2Data.columnType,
        transactions: [],
        totals: {},
        failedDepartments: []
      }
    };
    
    try {
      const cell1Params = extractCellParameters(cell1Data.cell);
      const cell2Params = extractCellParameters(cell2Data.cell);
      
      if (!cell1Params || !cell2Params) {
        throw new Error('Failed to extract cell parameters for comparison');
      }
      
      const ajaxParams1 = buildAjaxParameters(cell1Params.categoryUID, cell1Params.groupedcategory);
      const ajaxParams2 = buildAjaxParameters(cell2Params.categoryUID, cell2Params.groupedcategory);
      
      // Fetch with caching
      const fetchWithCache = async (ajaxParams, cellData, cellParams, forceRefresh = false) => {
        const cacheKey = `${cellParams.dataHref}|${ajaxParams.groupedcategory}`;
        const cellTotal = cellData.value;
        const cache = await getDatasheetCache();
        const cached = cache[cacheKey];
        const now = Date.now();
        
        if (cached && !forceRefresh) {
          const isExpired = (now - cached.timestamp) > CACHE_MAX_AGE_MS;
          const totalMatches = Math.abs(cached.cellTotal - cellTotal) < 0.01;
          
          if (!isExpired && totalMatches) {
            console.log(`✓ Cache HIT for ${cellData.description} (${cellData.columnType})`);
            return cached.data;
          }
        }
        
        const data = await fetchDatasheetData(
          ajaxParams,
          cellData.description,
          cellData.columnType,
          cellParams.dataHref
        );
        
        cache[cacheKey] = {
          cellTotal: cellTotal,
          data: data,
          timestamp: now
        };
        await setDatasheetCache(cache);
        
        return data;
      };
      
      console.log('Fetching datasheets with caching...');
      const startTime = performance.now();
      
      comparisonData.dataset1 = await fetchWithCache(ajaxParams1, cell1Data, cell1Params, forceRefresh);
      comparisonData.dataset2 = await fetchWithCache(ajaxParams2, cell2Data, cell2Params, forceRefresh);
      
      const elapsed = performance.now() - startTime;
      console.log(`Both datasheets fetched in ${elapsed.toFixed(0)}ms`);
      
      return comparisonData;
    } catch (error) {
      console.error('Error in datasheet comparison:', error);
      throw new Error(`Failed to compare datasheets: ${error.message}`);
    }
  }

  // Legacy alias
  async function openDatasheetSequentially(cell1Data, cell2Data, forceRefresh = false) {
    return openDatasheetsParallel(cell1Data, cell2Data, forceRefresh);
  }

  // Export to namespace
  window.BetterBudgyt.features.comparison.dataFetcher = {
    getDatasheetCache,
    setDatasheetCache,
    clearCacheEntry,
    clearAllDatasheetCache,
    fetchStoreNamesFromPage,
    primeBudgetSession,
    fetchPercentApprovedValues,
    extractStoreUIDFromLevel0,
    fetchStoreUIDForDepartment,
    fetchDatasheetData,
    openDatasheetsParallel,
    openDatasheetSequentially
  };

})();
