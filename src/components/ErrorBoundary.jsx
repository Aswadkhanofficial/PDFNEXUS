import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  state = { hasError: false, message: '' };

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error, info) {
    console.error('Uncaught error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-6 dark:bg-slate-950 dark:text-slate-200">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-10 shadow-2xl flex flex-col items-center text-center dark:bg-slate-900 dark:border-slate-800">
            <div className="w-16 h-16 bg-red-500/15 text-red-600 rounded-full flex items-center justify-center mb-4 dark:text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight dark:text-white">Something went wrong</h2>
            <p className="text-sm text-slate-600 mt-2 mb-6 dark:text-slate-400">
              An unexpected error occurred. Please try again.
            </p>
            {this.state.message && (
              <p className="text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6 w-full break-words dark:text-red-400">
                {this.state.message}
              </p>
            )}
            <button
              onClick={this.handleReset}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/20"
            >
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}