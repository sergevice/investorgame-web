import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] });

const TICKERS = ['AAPL', 'BTC-USD', 'CC=F', 'ETH-USD', 'GC=F', 'KC=F', 'TSLA', 'USDUAH=X', 'VNQ', '^GSPC'];

function computeMarkowitz(prices, midpoint) {
  const tickers = Object.keys(prices);
  const n = tickers.length;

  // Calculate daily returns for training period
  const dailyReturns = {};
  for (const t of tickers) {
    const p = prices[t].slice(0, midpoint);
    dailyReturns[t] = [];
    for (let i = 1; i < p.length; i++) {
      dailyReturns[t].push((p[i] - p[i - 1]) / p[i - 1]);
    }
  }

  const numDays = dailyReturns[tickers[0]].length;

  // Mean returns (annualized)
  const meanReturns = tickers.map(t => {
    const sum = dailyReturns[t].reduce((a, b) => a + b, 0);
    return (sum / numDays) * 252;
  });

  // Covariance matrix (annualized)
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

  // Simple optimization: random search with refinement
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

  // Random search (5000 iterations)
  for (let iter = 0; iter < 5000; iter++) {
    const raw = Array.from({ length: n }, () => Math.random());
    const sum = raw.reduce((a, b) => a + b, 0);
    const w = raw.map(v => v / sum);
    const s = calcSharpe(w);
    if (s > bestSharpe) {
      bestSharpe = s;
      bestWeights = w;
    }
  }

  // Refine around best solution (2000 iterations)
  for (let iter = 0; iter < 2000; iter++) {
    const perturbation = Array.from({ length: n }, () => (Math.random() - 0.5) * 0.1);
    const candidate = bestWeights.map((w, i) => Math.max(0, w + perturbation[i]));
    const sum = candidate.reduce((a, b) => a + b, 0);
    const w = candidate.map(v => v / sum);
    const s = calcSharpe(w);
    if (s > bestSharpe) {
      bestSharpe = s;
      bestWeights = w;
    }
  }

  const result = {};
  tickers.forEach((t, i) => {
    result[t] = Math.round(bestWeights[i] * 1000000) / 1000000;
  });
  return result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);

    const allPrices = {};
    const allDates = new Set();

    // Fetch each ticker
    for (const ticker of TICKERS) {
      try {
        const result = await yf.chart(ticker, {
          period1: startDate.toISOString().split('T')[0],
          period2: endDate.toISOString().split('T')[0],
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
        console.error(`Failed to fetch ${ticker}:`, e.message);
      }
    }

    // Sort dates and align all tickers
    const sortedDates = [...allDates].sort();

    // Only keep dates where ALL tickers have data
    const completeDates = sortedDates.filter(d =>
      TICKERS.every(t => allPrices[t] && allPrices[t][d] != null)
    );

    const prices = {};
    for (const t of TICKERS) {
      prices[t] = completeDates.map(d => allPrices[t][d]);
    }

    const midpoint = Math.floor(completeDates.length / 2);

    // Compute Markowitz optimal portfolio from training data
    const markowitz_weights = computeMarkowitz(prices, midpoint);

    res.status(200).json({
      dates: completeDates,
      tickers: TICKERS,
      prices,
      midpoint,
      markowitz_weights,
      // Static reference portfolios
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
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Prices API error:', error);
    res.status(500).json({ error: 'Failed to fetch prices', details: error.message });
  }
}
