import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ProStock UI Error caught by boundary:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 m-4 rounded-xl bg-bg-1 border border-rose-500/30 text-fg-0 space-y-4">
          <div className="flex items-center gap-3 text-rose-400">
            <AlertTriangle size={24} />
            <h3 className="text-lg font-bold">
              {this.props.fallbackTitle || 'A rendering error occurred in this view'}
            </h3>
          </div>
          <p className="text-xs font-mono text-fg-2 bg-bg-2 p-3 rounded border border-border overflow-x-auto">
            {this.state.error?.message || 'Unknown runtime error'}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-mono font-semibold transition-colors"
          >
            <RefreshCw size={14} />
            <span>Retry Component</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
