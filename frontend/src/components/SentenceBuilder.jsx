import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Space, Delete, Trash2, RotateCcw, Copy, Check } from 'lucide-react';
import { sendSpace, sendBackspace, sendClear, sendSpeak, sendReset } from '../lib/api';

export const SentenceBuilder = ({
  currentWord = '',
  sentence = '',
  onStateUpdate,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const fullText = (sentence + ' ' + currentWord).strip ? (sentence + ' ' + currentWord).trim() : `${sentence} ${currentWord}`.trim();

  const handleSpace = async () => {
    try {
      const res = await sendSpace();
      if (onStateUpdate) onStateUpdate(res);
    } catch (e) {
      console.error('Space failed:', e);
    }
  };

  const handleBackspace = async () => {
    try {
      const res = await sendBackspace();
      if (onStateUpdate) onStateUpdate(res);
    } catch (e) {
      console.error('Backspace failed:', e);
    }
  };

  const handleClear = async () => {
    try {
      const res = await sendClear();
      if (onStateUpdate) onStateUpdate(res);
    } catch (e) {
      console.error('Clear failed:', e);
    }
  };

  const handleReset = async () => {
    try {
      const res = await sendReset();
      if (onStateUpdate) onStateUpdate(res);
    } catch (e) {
      console.error('Reset failed:', e);
    }
  };

  const handleSpeak = async () => {
    try {
      setIsSpeaking(true);
      const res = await sendSpeak(fullText);
      const textToSpeak = res.text || fullText || 'No text to speak';
      
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
      }
    } catch (e) {
      console.error('Speak failed:', e);
      setIsSpeaking(false);
    }
  };

  const handleCopy = () => {
    if (!fullText) return;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
          Live Translation Output
        </span>
        <div className="flex items-center gap-2">
          {fullText && (
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
              title="Copy translation"
              data-testid="copy-text-btn"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Sentence & Word Box */}
      <div className="min-h-[100px] p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 flex flex-col justify-between">
        <div className="text-lg md:text-xl font-medium tracking-wide leading-relaxed text-slate-100 font-plex break-words">
          {sentence ? (
            <span className="text-slate-100">{sentence}</span>
          ) : (
            <span className="text-slate-600 italic">Translated sentence will appear here...</span>
          )}
          {currentWord && (
            <motion.span
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 1 }}
              className="ml-2 font-bold text-cyan-400 underline decoration-cyan-500/50 decoration-2 underline-offset-4"
            >
              {currentWord}
            </motion.span>
          )}
          <span className="inline-block w-2 h-5 bg-cyan-400 ml-1 animate-pulse" />
        </div>

        {/* Current Word Indicator Pill */}
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 border-t border-slate-800/60 pt-2">
          <span>Building Word:</span>
          <span className="font-mono bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/20">
            {currentWord || '(waiting)'}
          </span>
        </div>
      </div>

      {/* Control Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
        <button
          onClick={handleSpeak}
          disabled={!fullText || isSpeaking}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
            isSpeaking
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
              : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 active:scale-95'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
          data-testid="speak-text-btn"
        >
          <Volume2 className="w-4 h-4" />
          <span>Speak</span>
        </button>

        <button
          onClick={handleSpace}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-medium text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 active:scale-95 transition-all"
          data-testid="space-btn"
        >
          <Space className="w-4 h-4" />
          <span>Space</span>
        </button>

        <button
          onClick={handleBackspace}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-medium text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 active:scale-95 transition-all"
          data-testid="backspace-btn"
        >
          <Delete className="w-4 h-4" />
          <span>Backspace</span>
        </button>

        <button
          onClick={handleClear}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-medium text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 active:scale-95 transition-all"
          data-testid="clear-text-btn"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear</span>
        </button>

        <button
          onClick={handleReset}
          className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-medium text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 active:scale-95 transition-all"
          data-testid="reset-session-btn"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};

export default SentenceBuilder;
