import React from 'react';
import {
  Activity,
  Layers,
  BarChart3,
  Package,
  ShoppingCart,
  Lock,
  Wifi,
  WifiOff,
  RefreshCw,
  Globe,
  BookOpen,
} from 'lucide-react';
import { translations, Language } from '../lib/i18n/translations';
import { AnimatedNumber } from './common/AnimatedNumber';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isOnline: boolean;
  pendingSyncCount: number;
  onSync: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  onLockTerminal: () => void;
  onOpenWalkthrough: () => void;
  cartItemCount?: number;
  onOpenCart?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  isOnline,
  pendingSyncCount,
  onSync,
  lang,
  setLang,
  onLockTerminal,
  onOpenWalkthrough,
  cartItemCount = 0,
  onOpenCart,
}) => {
  const t = translations[lang];

  // 4 Primary Mobile Tabs: Counter, Insights, Stock, Orders (Section 4)
  const navItems = [
    { id: 'counter', label: t.counter, icon: Layers, badge: cartItemCount > 0 ? cartItemCount : undefined },
    { id: 'insights', label: t.insights, icon: BarChart3 },
    { id: 'inventory', label: 'Stock', icon: Package },
    { id: 'procurement', label: 'Orders', icon: ShoppingCart },
  ];

  return (
    <>
      {/* Top Application Bar */}
      <header className="bg-[#0b1728] text-white border-b border-[#23455b] sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 flex items-center justify-between h-14 sm:h-16">
          {/* Brand Identity */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 shrink-0">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-black text-sm sm:text-base leading-tight tracking-tight text-white flex items-center gap-1.5">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                  PharmaAssist
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                  POS
                </span>
              </h1>
              <p className="hidden sm:block text-[10px] text-slate-400 font-medium">
                Single Operator • Counter Core
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs (Desktop / Tablet) */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#102236] p-1 rounded-2xl border border-[#23455b]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all min-h-[44px] cursor-pointer touch-active ${
                    active
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/30'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-1 px-1.5 py-0.2 bg-cyan-400 text-slate-950 font-bold rounded-full text-[10px]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Utility Items */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Cart Button */}
            {onOpenCart && (
              <button
                onClick={onOpenCart}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition cursor-pointer min-h-[44px] touch-active"
                title="View Customer Cart"
              >
                <ShoppingCart className="w-4 h-4 text-cyan-400" />
                <span className="font-mono text-xs">
                  <AnimatedNumber value={cartItemCount} durationMs={300} />
                </span>
              </button>
            )}

            {/* Online/Offline Status Indicator */}
            <div
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-medium border ${
                isOnline
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                  : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400" />}
              <span className="hidden sm:inline font-mono text-[10px]">{isOnline ? 'Online' : 'Offline'}</span>

              {pendingSyncCount > 0 && (
                <button
                  onClick={onSync}
                  title="Sync offline queue"
                  className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer touch-active"
                >
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>{pendingSyncCount}</span>
                </button>
              )}
            </div>

            {/* Language Switcher */}
            <button
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-[#102236] hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-[#23455b] transition cursor-pointer min-h-[44px] touch-active"
              title="Switch Language (FR-I18N-01)"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px]">{lang === 'en' ? 'हि' : 'EN'}</span>
            </button>

            {/* Walkthrough Guide */}
            <button
              onClick={onOpenWalkthrough}
              className="hidden sm:flex p-2 rounded-xl bg-[#102236] hover:bg-slate-800 text-cyan-400 border border-[#23455b] transition cursor-pointer min-h-[44px] min-w-[44px] items-center justify-center touch-active"
              title="Guided Walkthrough (S07)"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            {/* Lock Terminal Button */}
            <button
              onClick={onLockTerminal}
              className="p-2 rounded-xl bg-[#102236] hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-[#23455b] transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center touch-active"
              title={t.logout}
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Fixed Mobile Bottom Navigation Bar (Section 4) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b1728]/95 backdrop-blur-md border-t border-[#23455b] safe-bottom flex items-center justify-around px-1 py-1 shadow-2xl shadow-black"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[10px] font-semibold min-h-[44px] transition-all cursor-pointer touch-active relative ${
                active
                  ? 'text-cyan-400 bg-cyan-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {active && (
                <span className="absolute top-0.5 w-6 h-0.5 bg-cyan-400 rounded-full animate-pulse" />
              )}
              <div className="relative">
                <Icon className={`w-5 h-5 mb-0.5 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 bg-cyan-500 text-slate-950 font-black rounded-full text-[9px] min-w-[16px] text-center animate-pulse-once">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
