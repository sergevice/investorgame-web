import { motion } from 'framer-motion';
import { ASSETS } from '../data/assets';

export default function WelcomeScreen({ onStart }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center min-h-dvh">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-6xl sm:text-7xl mb-6"
        style={{ animation: 'float 3s ease-in-out infinite' }}
      >
        📈
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-3xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4"
      >
        Інвестиційна гра
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-slate-400 text-base sm:text-lg max-w-md mb-8 leading-relaxed"
      >
        У тебе є <span className="text-white font-semibold">10 000 грн</span>.
        Розподіл їх між реальними активами й порівняй свій результат із алгоритмами оптимізації.
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-wrap justify-center gap-2 mb-10 max-w-sm"
      >
        {ASSETS.map((a, i) => (
          <motion.span
            key={a.ticker}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 + i * 0.05 }}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-slate-300"
          >
            {a.icon} {a.name}
          </motion.span>
        ))}
      </motion.div>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onStart}
        className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-shadow cursor-pointer"
      >
        Почати гру
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mt-12 text-xs text-slate-500"
      >
        Кафедра економіки та економічної кібернетики НТУ «ДП»
      </motion.p>
    </div>
  );
}
