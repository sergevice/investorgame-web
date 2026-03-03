import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { ASSETS, TOTAL_INVESTMENT, CATEGORY_COLORS } from '../data/assets';
import {
  getAllDates,
  getAllPrices,
  getAssetReturn,
  getPortfolioReturn,
  getMarkowitzWeights,
  getGrokWeights,
  getForecastedWeights,
  GAME_DATA,
} from '../data/gameData';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);

function FullChart({ asset }) {
  const dates = getAllDates();
  const prices = getAllPrices(asset.ticker);
  const midpoint = GAME_DATA.midpoint;
  const color = CATEGORY_COLORS[asset.category] || '#25aae2';

  const labels = dates.map(d => {
    const date = new Date(d);
    return `${date.getDate()}.${date.getMonth() + 1}`;
  });

  const beforeData = prices.map((p, i) => i < midpoint ? p : null);
  const afterData = prices.map((p, i) => i >= midpoint - 1 ? p : null);

  const ret = getAssetReturn(asset.ticker);

  const data = {
    labels,
    datasets: [
      {
        label: 'До інвестування',
        data: beforeData,
        borderColor: '#64748b',
        backgroundColor: '#64748b10',
        borderWidth: 2,
        fill: true,
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: 'Після інвестування',
        data: afterData,
        borderColor: color,
        backgroundColor: color + '15',
        borderWidth: 2,
        fill: true,
        pointRadius: 0,
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: { enabled: true, mode: 'index', intersect: false },
      legend: { display: false },
    },
    scales: {
      x: { display: false },
      y: {
        display: true,
        ticks: { color: '#475569', font: { size: 9 }, maxTicksLimit: 3 },
        grid: { color: '#0a2d52' },
        border: { display: false },
      },
    },
    animation: { duration: 1000 },
  };

  return (
    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{asset.icon}</span>
          <span className="text-sm font-semibold text-white">{asset.name}</span>
        </div>
        <span className={`text-sm font-bold ${ret >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {ret >= 0 ? '+' : ''}{(ret * 100).toFixed(1)}%
        </span>
      </div>
      <div className="h-28">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}

function ReturnsBarchart() {
  const data = {
    labels: ASSETS.map(a => a.icon + ' ' + a.ticker),
    datasets: [{
      data: ASSETS.map(a => getAssetReturn(a.ticker) * 100),
      backgroundColor: ASSETS.map(a => {
        const r = getAssetReturn(a.ticker);
        return r >= 0 ? '#22c55e' : '#ef4444';
      }),
      borderRadius: 6,
      barThickness: 20,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.raw.toFixed(2)}%`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#64748b', callback: v => v + '%' },
        grid: { color: '#0a2d52' },
        border: { display: false },
      },
      y: {
        ticks: { color: '#94a3b8', font: { size: 11 } },
        grid: { display: false },
        border: { display: false },
      },
    },
  };

  return (
    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
      <h3 className="text-lg font-bold text-white mb-3">Дохідність активів</h3>
      <div className="h-72 sm:h-80">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}

function PortfolioComparison({ portfolios }) {
  const tickers = ASSETS.map(a => a.ticker);
  const portfolioNames = Object.keys(portfolios);
  const colors = ['#25aae2', '#f59e0b', '#22c55e', '#ec4899'];

  const data = {
    labels: ASSETS.map(a => a.icon),
    datasets: portfolioNames.map((name, i) => ({
      label: name,
      data: tickers.map(t => (portfolios[name][t] || 0) * 100),
      backgroundColor: colors[i % colors.length] + '99',
      borderColor: colors[i % colors.length],
      borderWidth: 1,
      borderRadius: 4,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12 },
      },
      tooltip: {
        callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw.toFixed(1)}%` },
      },
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8', font: { size: 14 } },
        grid: { display: false },
        border: { display: false },
      },
      y: {
        ticks: { color: '#64748b', callback: v => v + '%' },
        grid: { color: '#0a2d52' },
        border: { display: false },
      },
    },
  };

  return (
    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
      <h3 className="text-lg font-bold text-white mb-3">Порівняння портфелів</h3>
      <div className="h-64 sm:h-72">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}

function Leaderboard({ entries, userName }) {
  return (
    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
      <h3 className="text-lg font-bold text-white mb-4">Таблиця лідерів</h3>
      <div className="space-y-2">
        {entries.map((entry, i) => {
          const isUser = entry.name === userName;
          const medals = ['🥇', '🥈', '🥉'];
          return (
            <motion.div
              key={entry.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 }}
              className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                isUser
                  ? 'bg-nmu-sky/20 border border-nmu-sky/30'
                  : 'bg-white/3 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl w-8 text-center">
                  {i < 3 ? medals[i] : <span className="text-sm text-slate-500">{i + 1}</span>}
                </span>
                <div>
                  <p className={`text-sm font-semibold ${isUser ? 'text-nmu-light' : 'text-white'}`}>
                    {entry.name}
                    {isUser && <span className="ml-1.5 text-xs text-nmu-sky">(ти)</span>}
                  </p>
                  <p className="text-xs text-slate-500">{entry.label}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold tabular-nums ${
                  entry.returnPct >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {entry.returnPct >= 0 ? '+' : ''}{entry.returnPct.toFixed(2)}%
                </p>
                <p className="text-xs text-slate-500 tabular-nums">
                  {entry.value.toLocaleString('uk-UA', { maximumFractionDigits: 0 })} ₴
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ResultMessage({ rank, total }) {
  if (rank === 0) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-2xl p-6 border border-yellow-500/30 text-center"
      >
        <div className="text-4xl mb-2">🎉</div>
        <h3 className="text-xl font-bold text-yellow-300 mb-2">
          В тебе талант до інвестицій!
        </h3>
        <p className="text-sm text-yellow-200/80">
          Вступай на кафедру економіки та економічної кібернетики, аби в повній мірі розвинути свої здібності!
        </p>
      </motion.div>
    );
  }
  if (rank === total - 1) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-r from-nmu-sky/20 to-nmu-mid/20 rounded-2xl p-6 border border-nmu-sky/30 text-center"
      >
        <div className="text-4xl mb-2">📉</div>
        <h3 className="text-xl font-bold text-nmu-light mb-2">
          Хочеш покращити свої прибутки?
        </h3>
        <p className="text-sm text-nmu-light/80">
          Вступай на кафедру економіки та економічної кібернетики і дізнайся, як використовувати сучасні моделі для створення оптимальних портфелів!
        </p>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl p-6 border border-emerald-500/30 text-center"
    >
      <div className="text-4xl mb-2">📈</div>
      <h3 className="text-xl font-bold text-emerald-300 mb-2">
        Непогано, але є куди зростати!
      </h3>
      <p className="text-sm text-emerald-200/80">
        Вступай на кафедру економіки та економічної кібернетики і дізнайся, як використовувати сучасні моделі для створення оптимальних портфелів!
      </p>
    </motion.div>
  );
}

export default function Results({ userWeights, userName, onReplay }) {
  const [showCharts, setShowCharts] = useState(false);

  const portfolios = useMemo(() => ({
    [userName]: userWeights,
    'Марковіц': getMarkowitzWeights(),
    'ШІ Grok': getGrokWeights(),
    'NeuralProphet + Марковіц': getForecastedWeights(),
  }), [userWeights, userName]);

  const leaderboard = useMemo(() => {
    const entries = Object.entries(portfolios).map(([name, weights]) => {
      const ret = getPortfolioReturn(weights);
      let label;
      if (name === userName) label = 'Твій портфель';
      else if (name === 'Марковіц') label = 'Оптимізація Марковіца';
      else if (name === 'ШІ Grok') label = 'Штучний інтелект Grok';
      else label = 'ШІ прогноз + Марковіц';
      return {
        name,
        label,
        returnPct: ret * 100,
        value: TOTAL_INVESTMENT * (1 + ret),
      };
    });
    entries.sort((a, b) => b.returnPct - a.returnPct);
    return entries;
  }, [portfolios, userName]);

  const userRank = leaderboard.findIndex(e => e.name === userName);
  const userEntry = leaderboard.find(e => e.name === userName);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto w-full">
      {/* Hero result */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          Результати
        </h2>
        <div className="bg-white/5 rounded-3xl p-6 border border-white/10 inline-block">
          <p className="text-sm text-slate-400 mb-1">Твій портфель</p>
          <p className={`text-4xl sm:text-5xl font-extrabold tabular-nums ${
            userEntry.returnPct >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {userEntry.returnPct >= 0 ? '+' : ''}{userEntry.returnPct.toFixed(2)}%
          </p>
          <p className="text-lg text-slate-300 mt-1 tabular-nums">
            {userEntry.value.toLocaleString('uk-UA', { maximumFractionDigits: 0 })} ₴
          </p>
        </div>
      </motion.div>

      {/* Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <Leaderboard entries={leaderboard} userName={userName} />
      </motion.div>

      {/* Message based on ranking */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-6"
      >
        <ResultMessage rank={userRank} total={leaderboard.length} />
      </motion.div>

      {/* Portfolio comparison chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mb-6"
      >
        <PortfolioComparison portfolios={portfolios} />
      </motion.div>

      {/* Asset returns */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mb-6"
      >
        <ReturnsBarchart />
      </motion.div>

      {/* Full charts toggle */}
      <div className="mb-6">
        <button
          onClick={() => setShowCharts(v => !v)}
          className="w-full py-3 rounded-xl text-sm text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          {showCharts ? 'Приховати' : 'Показати'} повну динаміку цін
        </button>
        {showCharts && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4"
          >
            {ASSETS.map(asset => (
              <FullChart key={asset.ticker} asset={asset} />
            ))}
          </motion.div>
        )}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="space-y-3"
      >
        <a
          href="https://ekit.nmu.org.ua/ua/"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-4 rounded-2xl bg-gradient-to-r from-nmu-sky to-nmu-mid text-white font-bold text-base text-center shadow-lg shadow-nmu-sky/25"
        >
          Дізнатися більше про кафедру
        </a>
        <button
          onClick={onReplay}
          className="w-full py-3 rounded-xl text-sm text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          Зіграти ще раз
        </button>
      </motion.div>
    </div>
  );
}
