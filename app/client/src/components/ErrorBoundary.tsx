import { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Capture exception with Sentry including React component stack
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        errorBoundary: true,
      },
      level: 'error',
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI - Terminal style
      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-black border border-[#ff0055] p-6 box-glow-red">
            <div className="text-center mb-6">
              <div className="text-6xl text-[#ff0055] mb-4 text-glow-red">⚠️</div>
              <h1 className="text-2xl font-bold text-[#ff0055] font-mono mb-2 text-glow-red">
                [SYSTEM_ERROR]
              </h1>
              <p className="text-[#ff0055] font-mono text-sm opacity-75">
                &gt; CRITICAL_EXCEPTION_DETECTED
              </p>
            </div>

            <div className="bg-[#0a0a0a] border border-[#ff0055] p-4 mb-6 max-h-64 overflow-auto">
              <p className="text-[#ff0055] font-mono text-xs mb-2">
                ERROR_MESSAGE:
              </p>
              <p className="text-[#ff0055] font-mono text-sm mb-4">
                {this.state.error?.message || 'Unknown error occurred'}
              </p>

              {this.state.errorInfo && (
                <>
                  <p className="text-[#ff0055] font-mono text-xs mb-2">
                    STACK_TRACE:
                  </p>
                  <pre className="text-[#ff0055] font-mono text-xs whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={this.handleReset}
                className="py-3 bg-black border border-[#00ff41] text-[#00ff41] font-bold font-mono
                         hover:bg-[#00ff41] hover:text-black transition-all duration-200 box-glow"
              >
                [RETRY]
              </button>
              <button
                onClick={() => window.location.reload()}
                className="py-3 bg-black border border-[#ffb000] text-[#ffb000] font-bold font-mono
                         hover:bg-[#ffb000] hover:text-black transition-all duration-200"
              >
                [RELOAD_PAGE]
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-[#ff0055] font-mono text-xs opacity-50">
                If this error persists, please contact support or report the issue.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
