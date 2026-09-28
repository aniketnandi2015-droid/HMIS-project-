import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in PharmaAssist application:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetData = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToClear = [
        'pharmaassist_drugs',
        'pharmaassist_batches',
        'pharmaassist_contraindications',
        'pharmaassist_transactions',
        'pharmaassist_suppliers',
        'pharmaassist_purchase_orders',
        'pharmaassist_supplier_events',
        'pharmaassist_cross_sell_events',
        'pharmaassist_unmet_demand',
        'pharmaassist_sync_queue',
        'pharmaassist_discrepancies',
      ];
      keysToClear.forEach((k) => window.localStorage.removeItem(k));
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h1 className="text-xl font-bold text-white">Application Recovery Mode</h1>
              <p className="text-xs text-slate-400 mt-1">
                PharmaAssist encountered an unexpected startup issue.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-rose-300 max-h-32 overflow-y-auto">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-blue-600/30"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>

              <button
                onClick={this.handleResetData}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-700"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Reset Local Cache & Re-seed Defaults</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
