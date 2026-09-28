import React, { useState } from 'react';
import { Lock, ShieldCheck, AlertCircle, KeyRound } from 'lucide-react';
import { AuthService } from '../lib/domain/authentication/authService';
import { translations, Language } from '../lib/i18n/translations';

interface LoginModalProps {
  onLoginSuccess: (operatorName: string) => void;
  lang: Language;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, lang }) => {
  const t = translations[lang];
  const [pin, setPin] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | undefined>();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const result = AuthService.attemptLogin(pin, failedAttempts, lockedUntil);

    if (result.success) {
      setErrorMsg(null);
      onLoginSuccess('Pharmacist / Counter Operator');
    } else {
      setFailedAttempts(result.newFailedAttempts);
      setLockedUntil(result.newLockedUntil);
      setErrorMsg(result.errorMessage || 'Authentication failed');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center space-y-5">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-500/30">
          <Lock className="w-7 h-7" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.appTitle} Counter Login</h2>
          <p className="text-xs text-slate-500 mt-1">Single-Operator Pharmacy Terminal Access</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="text-left">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Terminal PIN (Default: 1234)
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                maxLength={8}
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter 4-digit PIN..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono tracking-widest text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Unlock Counter Terminal</span>
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Security: 5-Attempt Lockout (NFR-SEC-02)</span>
          <span className="font-semibold text-blue-600">v2.1 Mobile-First</span>
        </div>
      </div>
    </div>
  );
};
