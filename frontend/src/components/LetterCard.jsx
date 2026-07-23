import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const LetterCard = ({ currentGesture, gestureProgress = 0, confirmationFrames = 10, lastAddedLetter }) => {
  const percentage = Math.min(100, Math.round((gestureProgress / confirmationFrames) * 100));

  return (
    <div className="relative glass-panel rounded-2xl p-6 flex flex-col items-center justify-center min-h-[180px] overflow-hidden border border-white/10 shadow-xl">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 pointer-events-none" />

      <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-2">
        Active Gesture Detection
      </span>

      <div className="relative flex items-center justify-center my-2">
        <AnimatePresence mode="wait">
          {currentGesture ? (
            <motion.div
              key={currentGesture}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="text-7xl font-extrabold font-outfit text-cyan-400 drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]"
              data-testid="current-gesture-display"
            >
              {currentGesture}
            </motion.div>
          ) : (
            <motion.div
              key="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              className="text-5xl font-bold font-outfit text-slate-500"
            >
              —
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress Bar for confirmation frames */}
      <div className="w-full max-w-[200px] mt-3">
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium mb-1">
          <span>Confirmation Progress</span>
          <span>{percentage}% ({gestureProgress}/{confirmationFrames} frames)</span>
        </div>
        <div className="h-2 w-full bg-slate-800 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          />
        </div>
      </div>

      {lastAddedLetter && (
        <div className="mt-3 text-xs text-slate-400">
          Committed: <span className="font-bold text-cyan-300 ml-1">{lastAddedLetter}</span>
        </div>
      )}
    </div>
  );
};

export default LetterCard;
