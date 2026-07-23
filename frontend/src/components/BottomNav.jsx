import React from 'react';
import { NavLink } from 'react-router-dom';
import { Camera, BookOpen, BarChart3, Sparkles } from 'lucide-react';

export const BottomNav = ({ onOpenAssistant }) => {
  const navItems = [
    { to: '/translator', label: 'Translator', icon: Camera, testId: 'nav-translator' },
    { to: '/learn', label: 'Learn ISL', icon: BookOpen, testId: 'nav-learn' },
    { to: '/dashboard', label: 'Dashboard', icon: BarChart3, testId: 'nav-dashboard' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-white/10 px-4 py-2 flex items-center justify-around">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            data-testid={item.testId}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all relative ${
                isActive
                  ? 'text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 w-8 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                )}
              </>
            )}
          </NavLink>
        );
      })}

      {/* Assistant Trigger Button */}
      <button
        onClick={onOpenAssistant}
        data-testid="nav-assistant"
        className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-slate-400 hover:text-cyan-400 transition-all"
      >
        <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
        <span className="text-[10px] font-medium">AI Assistant</span>
      </button>
    </nav>
  );
};

export default BottomNav;
