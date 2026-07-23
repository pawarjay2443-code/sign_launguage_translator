import React, { useState, useEffect } from 'react';
import { BarChart3, Clock, CheckCircle, Activity, History, MessageSquareQuote, ShieldAlert } from 'lucide-react';
import { getStatus } from '../lib/api';

export const Dashboard = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await getStatus();
      if (res) setStatus(res);
    } catch (e) {
      console.error('Error fetching status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const stats = status?.stats || {
    total_gestures: 0,
    confirmed: 0,
    attempts: 0,
    accuracy: 0.0,
    session_seconds: 0,
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-outfit text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-cyan-400" />
            <span>Session Dashboard & Analytics</span>
          </h1>
          <p className="text-xs text-slate-400 font-plex mt-1">
            Real-time ISL recognition metrics, gesture accuracy, and historical transcriptions.
          </p>
        </div>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl p-5 border border-white/10 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Session Time</div>
            <div className="text-2xl font-bold font-outfit text-slate-100 mt-0.5" data-testid="stat-session-time">
              {formatSeconds(stats.session_seconds)}
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-white/10 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Total Gestures</div>
            <div className="text-2xl font-bold font-outfit text-slate-100 mt-0.5" data-testid="stat-total-gestures">
              {stats.total_gestures}
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-white/10 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Accuracy %</div>
            <div className="text-2xl font-bold font-outfit text-emerald-400 mt-0.5" data-testid="stat-accuracy">
              {stats.accuracy}%
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-white/10 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Confirmed Words</div>
            <div className="text-2xl font-bold font-outfit text-slate-100 mt-0.5" data-testid="stat-confirmed-words">
              {stats.confirmed}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Detections & Translated Sentences */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Detections Feed (5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
          <h3 className="font-bold text-base font-outfit text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Recent Detections Feed</span>
          </h3>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {status?.recent_detections && status.recent_detections.length > 0 ? (
              status.recent_detections.map((det, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold font-outfit text-base flex items-center justify-center">
                      {det.value}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-200">Letter Confirmed</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(det.ts).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {Math.round(det.confidence * 100)}% conf
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs italic">
                No gestures committed in this session yet.
              </div>
            )}
          </div>
        </div>

        {/* Translated Sentences History (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
          <h3 className="font-bold text-base font-outfit text-slate-100 flex items-center gap-2">
            <MessageSquareQuote className="w-4 h-4 text-blue-400" />
            <span>Translated Sentences History</span>
          </h3>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {status?.translated_sentences && status.translated_sentences.length > 0 ? (
              status.translated_sentences.map((st, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-sm font-plex text-slate-200 leading-relaxed"
                >
                  "{st}"
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs italic">
                Cleared sentences will be archived here for reference.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
