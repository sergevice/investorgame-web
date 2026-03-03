import { useState } from 'react';
import { motion } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { ASSETS, CATEGORY_COLORS } from '../data/assets';
import { getTrainDates, getTrainPrices } from '../data/gameData';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

function MiniChart({ asset }) {
  const dates = getTrainDates();
  const prices = getTrainPrices(asset.ticker);
  const color = CATEGORY_COLORS[asset.category] || '#818cf8';
  const change = ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;

  const labels = dates.map(d => {
    const date = new Date(d);
    return `${date.getDate()}.${date.getMonth() + 1}`;
  });

  const data = {
    labels,
    datasets: [{
      data: prices,
      borderColor: color,
      backgroundColor: color + '15',
      borderWidth: 2,
      fill: true,
      pointRadius: 0,
      tension: 0.3,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { tooltip: { enabled: false }, legend: { display: false } },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    animation: { duration: 800 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{asset.icon}</span>
          <div>
            <p className="text-sm font-semibold text-white">{asset.name}</p>
            <p className="text-xs text-slate-500">{asset.ticker}</p>
          </div>
        </div>
        <span className={`text-sm font-bold ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
        </span>
      </div>
      <div className="h-20">
        <Line data={data} options={options} />
      </div>
    </motion.div>
  );
}

export default function AssetCharts({ onNext }) {
  const [showAll, setShowAll] = useState(false);
  const visibleAssets = showAll ? ASSETS : ASSETS.slice(0, 6);

  return (
    <div className="px-4 sm:px-6 py-6 pb-28 max-w-3xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Динаміка цін активів
        </h2>
        <p className="text-slate-400 text-sm sm:text-base">
          Ознайомся з динамікою цін за останні 6 місяців. На основі цих даних — збери свій портфель.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {visibleAssets.map((asset, i) => (
          <MiniChart key={asset.ticker} asset={asset} />
        ))}
      </div>

      {!showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-3 rounded-xl text-sm text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer mb-4"
        >
          Показати всі активи ({ASSETS.length - 6} ще)
        </button>
      )}

      {/* Fixed bottom CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-bottom"
        style={{ background: 'linear-gradient(to top, rgba(15,10,46,0.95) 60%, transparent)' }}
      >
        <div className="max-w-3xl mx-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={onNext}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-base shadow-lg shadow-indigo-500/30 cursor-pointer"
          >
            Зібрати портфель
          </motion.button>
        </div>
      </div>
    </div>
  );
}
