import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BookOpen, CheckCircle2, Sparkles, X, Play } from 'lucide-react';
import { getLessons } from '../lib/api';
import GestureCard from '../components/GestureCard';

export const LearnISL = () => {
  const [lessons, setLessons] = useState([]);
  const [supportedCount, setSupportedCount] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // all, vowel, consonant, supported
  const [loading, setLoading] = useState(true);
  const [selectedPractice, setSelectedPractice] = useState(null);

  useEffect(() => {
    getLessons()
      .then((res) => {
        if (res && res.letters) {
          setLessons(res.letters);
          setSupportedCount(res.supported_count || 0);
        }
      })
      .catch((err) => console.error('Error fetching lessons:', err))
      .finally(() => setLoading(false));
  }, []);

  const filteredLetters = lessons.filter((item) => {
    const matchesSearch =
      item.letter.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;

    if (categoryFilter === 'vowel') return item.category === 'vowel';
    if (categoryFilter === 'consonant') return item.category === 'consonant';
    if (categoryFilter === 'supported') return item.rule_supported;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-outfit text-slate-100 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-cyan-400" />
            <span>Learn Indian Sign Language</span>
          </h1>
          <p className="text-xs text-slate-400 font-plex mt-1">
            Master the ISL manual alphabet (A–Z) with hand gesture guides and AI recognition.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50 shrink-0">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <div className="text-xs font-plex">
            <span className="font-bold text-cyan-300">{supportedCount} / 26</span>
            <span className="text-slate-400 ml-1">Letters AI-Recognized</span>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search letter or description..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 text-slate-100 text-xs border border-slate-800 focus:outline-none focus:border-cyan-500 placeholder-slate-500"
            data-testid="learn-search-input"
          />
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Letters (26)' },
            { id: 'vowel', label: 'Vowels (5)' },
            { id: 'consonant', label: 'Consonants (21)' },
            { id: 'supported', label: 'AI Supported (15)' },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setCategoryFilter(chip.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                categoryFilter === chip.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-cyan-glow/30'
                  : 'bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 border border-slate-700/50'
              }`}
              data-testid={`filter-chip-${chip.id}`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Letters Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-slate-800/40 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : filteredLetters.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredLetters.map((item) => (
            <GestureCard
              key={item.letter}
              item={item}
              onPractice={(letterObj) => setSelectedPractice(letterObj)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 glass-panel rounded-2xl border border-slate-800 text-slate-400 text-sm font-plex">
          No letters found matching "{search}". Try clearing search filter.
        </div>
      )}

      {/* Practice Modal Dialog */}
      <AnimatePresence>
        {selectedPractice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel w-full max-w-md rounded-3xl p-6 border border-white/10 shadow-2xl relative space-y-4"
            >
              <button
                onClick={() => setSelectedPractice(null)}
                className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                data-testid="close-practice-modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <span className="text-5xl font-black font-outfit text-cyan-400 drop-shadow-cyan-letter">
                  {selectedPractice.letter}
                </span>
                <div>
                  <h3 className="font-bold text-lg text-slate-100 font-outfit">
                    Practice Sign "{selectedPractice.letter}"
                  </h3>
                  <span className="text-xs text-purple-400 uppercase font-semibold">
                    Category: {selectedPractice.category}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300 font-plex bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                <p className="font-semibold text-slate-200">Instructions:</p>
                <p>{selectedPractice.description}</p>
                {selectedPractice.tip && (
                  <p className="text-cyan-300 pt-2 border-t border-slate-800">
                    💡 Tip: {selectedPractice.tip}
                  </p>
                )}
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => setSelectedPractice(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                >
                  Close
                </button>
                <a
                  href="/translator"
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-glow transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Open Live Camera</span>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LearnISL;
