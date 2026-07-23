import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Info, Play } from 'lucide-react';

export const GestureCard = ({ item, onPractice }) => {
  const { letter, category, description, tip, rule_supported } = item;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col justify-between hover:border-cyan-500/40 hover:shadow-cyan-glow/20 transition-all group"
    >
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
            category === 'vowel'
              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
          }`}>
            {category}
          </span>
          {rule_supported && (
            <span className="flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              <span>AI Supported</span>
            </span>
          )}
        </div>

        {/* Letter & Diagram */}
        <div className="flex items-center justify-between my-2">
          <span className="text-4xl font-black font-outfit text-slate-100 group-hover:text-cyan-400 transition-colors">
            {letter}
          </span>

          {/* SVG Hand Representation Placeholder */}
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-cyan-400 font-mono text-xs">
            <svg className="w-8 h-8 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0 0v2.5m0-2.5h2.5m-2.5 0H4.5M12 6.5V9m0 0v2.5m0-2.5h2.5M12 9H9.5m7-1.5V10m0 0v2.5m0-2.5h2.5M16.5 10H14m2.5 6.5V19m0 0v2.5m0-2.5h2.5m-2.5 0H14" />
            </svg>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 font-plex line-clamp-2 mt-2 leading-relaxed">
          {description}
        </p>

        {tip && (
          <div className="mt-2 text-[11px] text-cyan-300/80 flex items-start gap-1 bg-cyan-950/20 p-2 rounded-lg border border-cyan-500/10">
            <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{tip}</span>
          </div>
        )}
      </div>

      {/* Practice CTA Button */}
      <div className="mt-4 pt-3 border-t border-slate-800/60">
        <button
          onClick={() => onPractice && onPractice(item)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-300 border border-slate-700/60 hover:border-cyan-500/30 transition-all active:scale-95"
          data-testid={`practice-letter-${letter}`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Practice Letter</span>
        </button>
      </div>
    </motion.div>
  );
};

export default GestureCard;
