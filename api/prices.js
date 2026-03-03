import YahooFinance from 'yahoo-finance2';
import { getSheets } from './_sheets.js';

const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] });

const TICKERS = ['AAPL', 'BTC-USD', 'CC=F', 'ETH-USD', 'GC=F', 'KC=F', 'TSLA', 'USDUAH=X', 'VNQ', '^GSPC'];
const CACHE_TAB = '_price_cache';

// --------------- Markowitz optimization ---------------

function computeMarkowitz(prices, midpoint) {
  const tickers = Object.keys(prices);
  const n = tickers.length;

  const dailyReturns = {};
  for (const t of tickers) {
    const p = prices[t].slice(0, midpoint);
    dailyReturns[t] = [];
    for (let i = 1; i < p.length; i++) {
      dailyReturns[t].push((p[i] - p[i - 1]) / p[i - 1]);
    }
  }

  const numDays = dailyReturns[tickers[0]].length;

  const meanReturns = tickers.map(t => {
    const sum = dailyReturns[t].reduce((a, b) => a + b, 0);
    return (sum / numDays) * 252;
  });

  const cov = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const mi = dailyReturns[tickers[i]].reduce((a, b) => a + b, 0) / numDays;
      const mj = dailyReturns[tickers[j]].reduce((a, b) => a + b, 0) / numDays;
      let s = 0;
      for (let k = 0; k < numDays; k++) {
        s += (dailyReturns[tickers[i]][k] - mi) * (dailyReturns[tickers[j]][k] - mj);
      }
      cov[i][j] = (s / (numDays - 1)) * 252;
    }
  }

  const riskFreeRate = 0.02;
  let bestWeights = Array(n).fill(1 / n);
  let bestSharpe = -Infinity;

  function calcSharpe(w) {
    let portReturn = 0;
    for (let i = 0; i < n; i++) portReturn += w[i] * meanReturns[i];
    let portVar = 0;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        portVar += w[i] * w[j] * cov[i][j];
    const portVol = Math.sqrt(portVar);
    return portVol > 0 ? (portReturn - riskFreeRate) / portVol : -Infinity;
  }

  for (let iter = 0; iter < 5000; iter++) {
    const raw = Array.from({ length: n }, () => Math.random());
    const sum = raw.reduce((a, b) => a + b, 0);
    const w = raw.map(v => v / sum);
    const s = calcSharpe(w);
    if (s > bestSharpe) { bestSharpe = s; bestWeights = w; }
  }

  for (let iter = 0; iter < 2000; iter++) {
    const perturbation = Array.from({ length: n }, () => (Math.random() - 0.5) * 0.1);
    const candidate = bestWeights.map((w, i) => Math.max(0, w + perturbation[i]));
    const sum = candidate.reduce((a, b) => a + b, 0);
    const w = candidate.map(v => v / sum);
    const s = calcSharpe(w);
    if (s > bestSharpe) { bestSharpe = s; bestWeights = w; }
  }

  const result = {};
  tickers.forEach((t, i) => {
    result[t] = Math.round(bestWeights[i] * 1000000) / 1000000;
  });
  return result;
}

// --------------- Google Sheets cache ---------------

async function ensureCacheTab(sheets, spreadsheetId) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties.title' });
    const titles = meta.data.sheets.map(s => s.properties.title);
    if (titles.includes(CACHE_TAB)) return;

    // Create the tab
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: CACHE_TAB } } }],
      },
    });

    // Write header row
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${CACHE_TAB}'!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [['date', ...TICKERS]] },
    });
  } catch (e) {
    console.error('ensureCacheTab error:', e.message);
  }
}

async function readCache(sheets, spreadsheetId) {
  try {
    await ensureCacheTab(sheets, spreadsheetId);

    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${CACHE_TAB}'!A:K`,
    });

    const rows = resp.data.values || [];
    if (rows.length < 2) return { dates: [], priceMap: {} };

    const header = rows[0]; // ['date', 'AAPL', ...]
    const tickerCols = header.slice(1);
    const dates = [];
    const priceMap = {}; // { ticker: { date: price } }

    for (const t of TICKERS) priceMap[t] = {};

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const date = row[0];
      if (!date) continue;
      dates.push(date);

      for (let j = 0; j < tickerCols.length; j++) {
        const ticker = tickerCols[j];
        const val = parseFloat(row[j + 1]);
        if (!isNaN(val) && TICKERS.includes(ticker)) {
          priceMap[ticker][date] = val;
        }
      }
    }

    return { dates: dates.sort(), priceMap };
  } catch (e) {
    console.error('readCache error:', e.message);
    return { dates: [], priceMap: {} };
  }
}

async function appendToCache(sheets, spreadsheetId, newRows) {
  if (newRows.length === 0) return;
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${CACHE_TAB}'!A:K`,
      valueInputOption: 'RAW',
      requestBody: { values: newRows },
    });
  } catch (e) {
    console.error('appendToCache error:', e.message);
  }
}

// --------------- Yahoo Finance fetch ---------------

async function fetchFromYahoo(startDate, endDate) {
  const allPrices = {};
  const allDates = new Set();

  for (const ticker of TICKERS) {
    try {
      const result = await yf.chart(ticker, {
        period1: startDate,
        period2: endDate,
        interval: '1d',
      });

      const quotes = result.quotes || [];
      for (const row of quotes) {
        if (!row.date || row.close == null) continue;
        const dateStr = new Date(row.date).toISOString().split('T')[0];
        allDates.add(dateStr);
        if (!allPrices[ticker]) allPrices[ticker] = {};
        allPrices[ticker][dateStr] = Math.round(row.close * 100) / 100;
      }
    } catch (e) {
      console.error(`Yahoo fetch failed for ${ticker}:`, e.message);
    }
  }

  return { allDates: [...allDates].sort(), allPrices };
}

// --------------- Check if date is recent enough ---------------

function isRecentEnough(lastDate) {
  if (!lastDate) return false;
  const last = new Date(lastDate);
  const now = new Date();
  const diffMs = now - last;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  // Markets are closed on weekends, so allow up to 3 days gap
  // (Friday → Monday = 3 calendar days)
  return diffDays <= 3;
}

// --------------- Main handler ---------------

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');

  try {
    const sheetsClient = getSheets();
    let cachedDates = [];
    let cachedPriceMap = {}; // { ticker: { date: price } }

    // Step 1: Try reading from Google Sheets cache
    if (sheetsClient) {
      const cache = await readCache(sheetsClient.sheets, sheetsClient.spreadsheetId);
      cachedDates = cache.dates;
      cachedPriceMap = cache.priceMap;
      console.log(`Cache: ${cachedDates.length} days, last: ${cachedDates[cachedDates.length - 1] || 'none'}`);
    }

    const lastCachedDate = cachedDates.length > 0 ? cachedDates[cachedDates.length - 1] : null;
    let yahooFetched = false;

    // Step 2: Determine if we need to fetch from Yahoo
    if (!isRecentEnough(lastCachedDate)) {
      // Compute fetch window: from day after last cached, or 365 days ago
      const endDate = new Date().toISOString().split('T')[0];
      let startDate;
      if (lastCachedDate) {
        // Fetch only missing days (day after last cached)
        const d = new Date(lastCachedDate);
        d.setDate(d.getDate() + 1);
        startDate = d.toISOString().split('T')[0];
      } else {
        // No cache — fetch full 365 days
        const d = new Date();
        d.setDate(d.getDate() - 365);
        startDate = d.toISOString().split('T')[0];
      }

      console.log(`Fetching Yahoo: ${startDate} → ${endDate}`);

      try {
        const { allDates: newDates, allPrices: newPrices } = await fetchFromYahoo(startDate, endDate);

        if (newDates.length > 0) {
          yahooFetched = true;

          // Merge new data into cache
          const newRows = [];
          for (const date of newDates) {
            // Only add if we have data for this date and it's not already cached
            if (cachedDates.includes(date)) continue;

            const hasAllTickers = TICKERS.every(t => newPrices[t] && newPrices[t][date] != null);
            if (!hasAllTickers) continue;

            // Add to in-memory cache
            cachedDates.push(date);
            for (const t of TICKERS) {
              if (!cachedPriceMap[t]) cachedPriceMap[t] = {};
              cachedPriceMap[t][date] = newPrices[t][date];
            }

            // Build row for Sheets append
            newRows.push([date, ...TICKERS.map(t => newPrices[t][date])]);
          }

          cachedDates.sort();

          // Step 3: Append new rows to Google Sheets cache
          if (sheetsClient && newRows.length > 0) {
            console.log(`Appending ${newRows.length} new rows to cache`);
            await appendToCache(sheetsClient.sheets, sheetsClient.spreadsheetId, newRows);
          }
        }
      } catch (e) {
        console.error('Yahoo fetch failed entirely:', e.message);
        // Continue with whatever we have in cache
      }
    } else {
      console.log('Cache is fresh, skipping Yahoo fetch');
    }

    // Step 4: Build response from combined data
    // Trim to last 365 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 365);
    const cutoff = cutoffDate.toISOString().split('T')[0];

    const completeDates = cachedDates
      .filter(d => d >= cutoff)
      .filter(d => TICKERS.every(t => cachedPriceMap[t] && cachedPriceMap[t][d] != null));

    // If we still have no data after cache + Yahoo, return error
    if (completeDates.length < 10) {
      console.error(`Insufficient data: only ${completeDates.length} complete dates`);
      return res.status(503).json({
        error: 'Insufficient price data',
        cached: cachedDates.length,
        complete: completeDates.length,
      });
    }

    const prices = {};
    for (const t of TICKERS) {
      prices[t] = completeDates.map(d => cachedPriceMap[t][d]);
    }

    const midpoint = Math.floor(completeDates.length / 2);
    const markowitz_weights = computeMarkowitz(prices, midpoint);

    res.status(200).json({
      dates: completeDates,
      tickers: TICKERS,
      prices,
      midpoint,
      markowitz_weights,
      grok_weights: {
        AAPL: 0.232, 'GC=F': 0.153, 'KC=F': 0.165, TSLA: 0.095,
        'USDUAH=X': 0.137, VNQ: 0.141, '^GSPC': 0.075,
      },
      forecasted_weights: {
        AAPL: 0.02, 'BTC-USD': 0, 'CC=F': 0.012, 'ETH-USD': 0,
        'GC=F': 0.461, 'KC=F': 0, TSLA: 0, 'USDUAH=X': 0,
        VNQ: 0.168, '^GSPC': 0.339,
      },
      live: true,
      cached: !yahooFetched,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Prices API error:', error);
    res.status(500).json({ error: 'Failed to fetch prices', details: error.message });
  }
}
