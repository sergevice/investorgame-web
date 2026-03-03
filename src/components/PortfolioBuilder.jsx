import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ASSETS, TOTAL_INVESTMENT, CATEGORY_COLORS } from '../data/assets';

function AllocationSlider({ asset, value, onChange }) {
  const color = CATEGORY_COLORS[asset.category] || '#25aae2';
  const amount = (value / 100) * TOTAL_INVESTMENT;

  return (
    <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-white/5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">{asset.icon}</span>
          <span className="text-sm font-medium text-white truncate">{asset.name}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-bold tabular-nums" style={{ color }}>
            {value}%
          </span>
          <span className="text-xs text-slate-500 tabular-nums w-16 text-right">
            {amount.toLocaleString('uk-UA')} ₴
          </span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className="w-full"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${value}%, #0d3a66 ${value}%, #0d3a66 100%)`,
        }}
      />
    </div>
  );
}

export default function PortfolioBuilder({ onSubmit }) {
  const [allocations, setAllocations] = useState(() => {
    const initial = {};
    ASSETS.forEach(a => { initial[a.ticker] = 10; });
    return initial;
  });

  const total = useMemo(
    () => Object.values(allocations).reduce((s, v) => s + v, 0),
    [allocations]
  );

  const isValid = total === 100;

  const handleChange = (ticker, value) => {
    setAllocations(prev => ({ ...prev, [ticker]: value }));
  };

  const handleEqualSplit = () => {
    const equal = Math.floor(100 / ASSETS.length);
    const remainder = 100 - equal * ASSETS.length;
    const next = {};
    ASSETS.forEach((a, i) => {
      next[a.ticker] = equal + (i === 0 ? remainder : 0);
    });
    setAllocations(next);
  };

  const handleAllIn = (ticker) => {
    const next = {};
    ASSETS.forEach(a => { next[a.ticker] = a.ticker === ticker ? 100 : 0; });
    setAllocations(next);
  };

  const handleReset = () => {
    const next = {};
    ASSETS.forEach(a => { next[a.ticker] = 0; });
    setAllocations(next);
  };

  const handleSubmit = () => {
    if (!isValid) return;
    const weights = {};
    ASSETS.forEach(a => {
      weights[a.ticker] = allocations[a.ticker] / 100;
    });
    onSubmit(weights);
  };

  return (
    <div className="px-4 sm:px-6 py-6 pb-28 max-w-3xl mx-auto w-full">
      <div className="mb-5">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Збери портфель
        </h2>
        <p className="text-slate-400 text-sm">
          Розподіл {TOTAL_INVESTMENT.toLocaleString('uk-UA')} ₴ між активами. Сума має бути 100%.
        </p>
      </div>

      {/* Total indicator */}
      <div className={`sticky top-2 z-40 mb-4 p-3 rounded-xl backdrop-blur-md border transition-colors ${
        isValid
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : total > 100
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-white/5 border-white/10'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">Розподілено</span>
          <span className={`text-lg font-bold tabular-nums ${
            isValid ? 'text-emerald-400' : total > 100 ? 'text-red-400' : 'text-white'
          }`}>
            {total}% / 100%
          </span>
        </div>
        <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              isValid ? 'bg-emerald-500' : total > 100 ? 'bg-red-500' : 'bg-nmu-sky'
            }`}
            animate={{ width: `${Math.min(total, 100)}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        <button
          onClick={handleEqualSplit}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
        >
          Порівну
        </button>
        <button
          onClick={handleReset}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
        >
          Скинути
        </button>
        {ASSETS.slice(0, 4).map(a => (
          <button
            key={a.ticker}
            onClick={() => handleAllIn(a.ticker)}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
          >
            Все в {a.icon}
          </button>
        ))}
      </div>

      {/* Sliders */}
      <div className="space-y-2 mb-6">
        {ASSETS.map(asset => (
          <AllocationSlider
            key={asset.ticker}
            asset={asset}
            value={allocations[asset.ticker]}
            onChange={v => handleChange(asset.ticker, v)}
          />
        ))}
      </div>

      {!isValid && total !== 0 && (
        <p className="text-center text-sm text-slate-500">
          {total < 100
            ? `Розподіл ще ${100 - total}%`
            : `Перевищення на ${total - 100}%`}
        </p>
      )}

      {/* Fixed bottom submit button */}
      <AnimatePresence>
        {isValid && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-bottom"
            style={{ background: 'linear-gradient(to top, rgba(6,30,56,0.95) 60%, transparent)' }}
          >
            <div className="max-w-3xl mx-auto">
              <button
                onClick={handleSubmit}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-nmu-sky to-nmu-mid text-white font-bold text-base shadow-lg shadow-nmu-sky/30 cursor-pointer"
              >
                Інвестувати
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
