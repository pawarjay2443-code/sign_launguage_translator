import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, BookOpen, Sparkles, ShieldCheck, Cpu, Zap, Activity } from 'lucide-react';

export const Landing = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-16 space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold"
        >
          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>Real-Time Indian Sign Language (ISL) Translation Engine</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-extrabold font-outfit tracking-tight leading-tight"
        >
          Bridge Communication with{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 bg-clip-text text-transparent drop-shadow-cyan-letter">
            AI-Powered Sign Language
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 font-plex leading-relaxed"
        >
          Recognize Indian Sign Language gestures live in your mobile browser using MediaPipe HandLandmarker, 
          rule-based sentence building, and Gemini 3 Flash intelligent assistance.
        </motion.p>

        {/* CTA Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        >
          <Link
            to="/translator"
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-glow transition-all active:scale-95"
            data-testid="launch-translator-cta"
          >
            <Camera className="w-5 h-5" />
            <span>Launch Live Translator</span>
          </Link>

          <Link
            to="/learn"
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base glass-panel hover:bg-slate-800 text-slate-200 border border-white/10 transition-all active:scale-95"
            data-testid="explore-learn-cta"
          >
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <span>Explore ISL Dictionary</span>
          </Link>
        </motion.div>
      </section>

      {/* Feature Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          whileHover={{ y: -5 }}
          className="glass-panel rounded-2xl p-6 border border-white/10 space-y-3"
        >
          <div className="p-3 w-fit rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold font-outfit text-slate-100">MediaPipe Vision Engine</h3>
          <p className="text-xs text-slate-300 font-plex leading-relaxed">
            Detects 21 3D hand landmarks per hand at up to 30 FPS locally in the browser with zero latency.
          </p>
        </motion.div>

        <motion.div
          whileHover={{ y: -5 }}
          className="glass-panel rounded-2xl p-6 border border-white/10 space-y-3"
        >
          <div className="p-3 w-fit rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold font-outfit text-slate-100">Smart Sentence Builder</h3>
          <p className="text-xs text-slate-300 font-plex leading-relaxed">
            Auto-confirmation frames, spell correction, space insertion, backspace, and text-to-speech engine.
          </p>
        </motion.div>

        <motion.div
          whileHover={{ y: -5 }}
          className="glass-panel rounded-2xl p-6 border border-white/10 space-y-3"
        >
          <div className="p-3 w-fit rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold font-outfit text-slate-100">Gemini 3 Flash AI Tutor</h3>
          <p className="text-xs text-slate-300 font-plex leading-relaxed">
            Interactive AI assistant guiding sign practice, answering questions, and offering phrase corrections.
          </p>
        </motion.div>
      </section>

      {/* Safety & Emergency Section */}
      <section className="glass-panel rounded-3xl p-8 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/30">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Built-in Safety Layer</span>
          </div>
          <h3 className="text-2xl font-bold font-outfit text-slate-100">
            Automated Emergency & Distress Recognition
          </h3>
          <p className="text-xs text-slate-300 font-plex max-w-xl">
            Detects critical distress phrases (e.g. HELP, EMERGENCY, POLICE, FIRE) in real-time and triggers instant alert banners.
          </p>
        </div>

        <Link
          to="/translator"
          className="shrink-0 px-6 py-3 rounded-xl font-bold text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-colors"
        >
          Test Live Detection
        </Link>
      </section>
    </div>
  );
};

export default Landing;
