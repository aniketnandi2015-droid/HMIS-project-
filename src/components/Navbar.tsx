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
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="font-extrabold text-base leading-tight tracking-tight text-white flex items-center gap-1.5">
              <span>{t.appTitle}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                POS
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">
              {t.appSubtitle} • Single Operator
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs (Desktop / Tablet) */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all min-h-[44px] cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right utility items */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Online/Offline Status Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
              isOnline
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                : 'bg-amber-950/40 text-amber-300 border-amber-800/60'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400" />}
            <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline Cache'}</span>

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

          {/* Language Switcher (FR-I18N-01) */}
          <button
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer min-h-[44px]"
            title="Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>{lang === 'en' ? 'हिन्दी' : 'EN'}</span>
          </button>

          {/* Guided Walkthrough button */}
          <button
            onClick={onOpenWalkthrough}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Guided Walkthrough (S07)"
          >
            <BookOpen className="w-4 h-4 text-indigo-400" />
          </button>

          {/* Lock Terminal (Single Operator) */}
          <button
            onClick={onLockTerminal}
            className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            title={t.logout}
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (FR-PLT-01, FR-PLT-02, <=360px touch screen) */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800 bg-slate-900/95 backdrop-blur px-2 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-lg text-[10px] font-semibold min-h-[44px] min-w-[44px] cursor-pointer ${
                active ? 'text-blue-400 bg-slate-800/80' : 'text-slate-400 hover:text-slate-200'
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
