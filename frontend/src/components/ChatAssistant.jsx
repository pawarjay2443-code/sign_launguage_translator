import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles, Bot, User, RefreshCw, ChevronRight } from 'lucide-react';
import { sendAssistantMessage, getAssistantSuggestions } from '../lib/api';

export const ChatAssistant = ({ currentWord = '', sentence = '', lastLetter = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Namaste! I am your SignAI Tutor powered by Gemini 3 Flash. How can I help you practice or learn Indian Sign Language today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && suggestions.length === 0) {
      getAssistantSuggestions()
        .then((res) => {
          if (res && res.suggestions) setSuggestions(res.suggestions);
        })
        .catch((err) => console.error('Error fetching suggestions:', err));
    }
  }, [isOpen, suggestions.length]);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query || !query.trim() || loading) return;

    const userMsg = { id: Date.now().toString(), sender: 'user', text: query.trim() };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await sendAssistantMessage(query.trim(), sessionId, {
        current_word: currentWord,
        sentence: sentence,
        last_letter: lastLetter,
      });

      if (res && res.session_id) setSessionId(res.session_id);

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: res.reply || 'I am ready to assist with ISL gestures!',
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'Apologies, I ran into an error communicating with Gemini AI. Please check your connection or backend server.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-20 right-5 sm:bottom-6 sm:right-6 z-40 p-4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-glow flex items-center justify-center ${isOpen ? 'hidden' : 'flex'}`}
        title="Open SignAI Assistant"
        data-testid="open-chat-btn"
      >
        <Sparkles className="w-6 h-6 animate-pulse" />
        <span className="sr-only">Open Chat Assistant</span>
      </motion.button>

      {/* Slide-In Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm font-outfit flex items-center gap-1.5">
                    SignAI Assistant
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded font-mono">
                      Gemini 3 Flash
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-plex">
                    Real-time ISL Tutor & Helper
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                data-testid="close-chat-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Suggestions Chips */}
            {suggestions.length > 0 && (
              <div className="p-3 border-b border-slate-800/60 bg-slate-950/30 overflow-x-auto flex gap-2 no-scrollbar">
                {suggestions.map((sugg, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(sugg)}
                    className="shrink-0 text-[11px] px-3 py-1 rounded-full bg-slate-800/80 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-700/60 hover:border-cyan-500/30 transition-all flex items-center gap-1"
                  >
                    <span>{sugg}</span>
                    <ChevronRight className="w-3 h-3 opacity-60" />
                  </button>
                ))}
              </div>
            )}

            {/* Message Feed */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-400'
                  }`}>
                    {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className={`max-w-[80%] rounded-2xl p-3.5 text-xs font-plex leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-slate-800/90 rounded-2xl rounded-tl-none p-3.5 border border-slate-700/60 text-xs text-slate-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>Gemini is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Live Context Banner */}
            {(currentWord || sentence) && (
              <div className="px-4 py-1.5 bg-slate-950/80 border-t border-slate-800/60 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Context:</span>
                <span className="font-mono text-cyan-400 truncate max-w-[240px]">
                  word='{currentWord}' | sentence='{sentence}'
                </span>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/80">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about ISL signs or phrases..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 text-slate-100 text-xs border border-slate-700/70 focus:outline-none focus:border-cyan-500 placeholder-slate-500"
                  data-testid="chat-input"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white disabled:opacity-40 transition-all active:scale-95 shadow-cyan-glow"
                  data-testid="send-chat-btn"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatAssistant;
