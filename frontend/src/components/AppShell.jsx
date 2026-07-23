import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Camera, BookOpen, BarChart3, Sparkles, Hand } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import BottomNav from './BottomNav';

export const AppShell = ({ onOpenAssistant }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900 dark:bg-slate-900 text-slate-100 dark:text-slate-100 bg-noise selection:bg-cyan-500 selection:text-white transition-colors duration-300">
      {/* Sticky Desktop Glass Header */}
      <header className="sticky top-0 z-30 bg-slate-900/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-4 md:px-8 py-3.5 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-cyan-glow group-hover:scale-105 transition-transform">
            <Hand className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight font-outfit bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent">
              SignAI
            </span>
            <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider ml-1.5 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
              ISL
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-800/40 p-1 rounded-2xl border border-white/5">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`
            }
            data-testid="header-nav-home"
          >
            Home
          </NavLink>

          <NavLink
            to="/translator"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`
            }
            data-testid="header-nav-translator"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Translator</span>
          </NavLink>

          <NavLink
            to="/learn"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`
            }
            data-testid="header-nav-learn"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Learn ISL</span>
          </NavLink>

          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`
            }
            data-testid="header-nav-dashboard"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </NavLink>
        </nav>

        {/* Right Header Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Page Body Container */}
      <main className="flex-1 pb-24 md:pb-12">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav onOpenAssistant={onOpenAssistant} />
    </div>
  );
};

export default AppShell;
