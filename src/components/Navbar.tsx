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
}) => {
  const t = translations[lang];

  const navItems = [
    { id: 'counter', label: t.counter, icon: Layers },
    { id: 'insights', label: t.insights, icon: BarChart3 },
    { id: 'inventory', label: t.inventory, icon: Package },
    { id: 'procurement', label: t.procurement, icon: ShoppingCart },
  ];

  return (
    <header className="bg-[#0b1329] text-white border-b border-cyan-950/80 sticky top-0 z-30 shadow-lg shadow-black/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 shrink-0">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-extrabold text-base leading-tight tracking-tight text-white flex items-center gap-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                {t.appTitle}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                v2.1 POS
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">
              Pharmacy Operations Core • Single Operator
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs (Desktop / Tablet) */}
        <nav className="hidden md:flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-2xl border border-slate-800/80">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all min-h-[44px] cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/30'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Utility Items */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Online/Offline Status Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border ${
              isOnline
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400" />}
            <span className="hidden sm:inline font-mono text-[11px]">{isOnline ? 'Cloud' : 'Offline'}</span>

            {pendingSyncCount > 0 && (
              <button
                onClick={onSync}
                title="Sync offline queue"
                className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>{pendingSyncCount}</span>
              </button>
            )}
          </div>

          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition cursor-pointer min-h-[44px]"
            title="Switch Language (FR-I18N-01)"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>{lang === 'en' ? 'हिन्दी' : 'EN'}</span>
          </button>

          {/* Walkthrough Button */}
          <button
            onClick={onOpenWalkthrough}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Guided Walkthrough (S07)"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {/* Lock Terminal Button */}
          <button
            onClick={onLockTerminal}
            className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            title={t.logout}
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800 bg-[#070d1a]/95 backdrop-blur px-2 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-[10px] font-semibold min-h-[44px] min-w-[44px] cursor-pointer ${
                active ? 'text-cyan-400 bg-cyan-950/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
