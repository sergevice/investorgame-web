import { motion } from 'framer-motion';

export default function StepIndicator({ current, total }) {
  const progress = ((current) / (total - 1)) * 100;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-[#1e1b4b]/80">
      <motion.div
        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
}
