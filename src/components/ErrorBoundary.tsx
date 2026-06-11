import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="bg-white/80 backdrop-blur-md border border-rose-200/60 rounded-2xl p-8 max-w-md text-center shadow-xl">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-50 border border-rose-200/50 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-rose-500" />
            </div>
            <h2 className="text-base font-black text-slate-800 mb-2">頁面發生錯誤</h2>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              系統偵測到異常狀況，請嘗試重新整理或返回上一頁。
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              重試
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
