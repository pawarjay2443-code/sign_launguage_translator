import React from 'react';

export const StatPill = ({ icon: Icon, label, value, color = 'cyan', active = true }) => {
  const colorMap = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border backdrop-blur-md text-xs font-medium transition-all ${colorMap[color] || colorMap.cyan}`}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span className="opacity-75">{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
};

export default StatPill;
