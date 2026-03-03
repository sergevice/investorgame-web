import fallbackData from '../../gamedata.json';

// Reactive game data — starts with fallback, gets replaced by live data
let GAME_DATA = fallbackData;
let dataLoadPromise = null;
let dataLoaded = false;
let listeners = [];

function notifyListeners() {
  listeners.forEach(fn => fn());
}

export function onDataUpdate(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

export function isLiveData() {
  return GAME_DATA.live === true;
}

export function isDataLoaded() {
  return dataLoaded;
}

export function loadLiveData() {
  if (dataLoadPromise) return dataLoadPromise;

  dataLoadPromise = fetch('/api/prices')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (data.dates && data.prices && data.midpoint) {
        GAME_DATA = data;
        dataLoaded = true;
        console.log(`Live data loaded: ${data.dates.length} days, fetched at ${data.fetchedAt}`);
        notifyListeners();
      }
    })
    .catch(err => {
      console.warn('Live data unavailable, using fallback:', err.message);
      dataLoaded = true;
      notifyListeners();
    });

  return dataLoadPromise;
}

export { GAME_DATA };

export function getTrainDates() {
  return GAME_DATA.dates.slice(0, GAME_DATA.midpoint);
}

export function getAllDates() {
  return GAME_DATA.dates;
}

export function getTrainPrices(ticker) {
  return GAME_DATA.prices[ticker].slice(0, GAME_DATA.midpoint);
}

export function getAllPrices(ticker) {
  return GAME_DATA.prices[ticker];
}

export function getInvestmentDatePrice(ticker) {
  return GAME_DATA.prices[ticker][GAME_DATA.midpoint - 1];
}

export function getEndDatePrice(ticker) {
  return GAME_DATA.prices[ticker][GAME_DATA.prices[ticker].length - 1];
}

export function getAssetReturn(ticker) {
  const start = getInvestmentDatePrice(ticker);
  const end = getEndDatePrice(ticker);
  return (end - start) / start;
}

export function getPortfolioReturn(weights) {
  let totalReturn = 0;
  for (const ticker of GAME_DATA.tickers) {
    const w = weights[ticker] || 0;
    totalReturn += w * getAssetReturn(ticker);
  }
  return totalReturn;
}

export function getMarkowitzWeights() {
  return GAME_DATA.markowitz_weights;
}

export function getGrokWeights() {
  return GAME_DATA.grok_weights;
}

export function getForecastedWeights() {
  return GAME_DATA.forecasted_weights;
}
