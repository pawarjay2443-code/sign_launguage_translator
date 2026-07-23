import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2.5 rounded-full glass-panel hover:border-cyan-500/50 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      data-testid="theme-toggle-btn"
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 0 : 180 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="text-cyan-400 dark:text-cyan-400 text-amber-500"
      >
        {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-cyan-600" />}
      </motion.div>
    </button>
  );
};

export default ThemeToggle;
