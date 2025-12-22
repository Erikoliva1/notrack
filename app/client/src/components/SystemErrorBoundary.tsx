/**
 * SYSTEM ERROR BOUNDARY
 * 
 * Cyberpunk-themed error boundary that catches React component crashes
 * and displays a stylish "System Malfunction" UI instead of white screen.
 * 
 * Features:
 * - Catches component errors at any level
 * - Displays hacker-themed error UI
 * - Provides error details in dev mode
 * - Logs to Sentry (if configured)
 * - Reload module functionality
 * 
 * Usage:
 * Wrap any component that might crash:
 * 
 * <SystemErrorBoundary>
 *   <YourComponent />
 * </SystemErrorBoundary>
 */

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

class SystemErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('🚨 System Error Boundary caught an error:', error, errorInfo);

    // Update state with error info
    this.setState((prevState) => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Log to Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  handleReload = () => {
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleFullReload = () => {
    // Full page reload
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorCount } = this.state;
      const { fallbackTitle, fallbackMessage } = this.props;

      return (
        <div className="min-h-screen bg-void-300 flex items-center justify-center p-4">
          {/* Glitch overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="glitch absolute inset-0 bg-alert-500/20" />
          </div>

          {/* Error Card */}
          <div
            className="
              relative z-10 max-w-2xl w-full
              rounded-apple-lg
              bg-void-200/80 backdrop-blur-glass
              border-2 border-alert-500
              shadow-glow-alert-lg
              p-8
              animate-slide-in
            "
          >
            {/* Animated corner decorations */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-alert-500 rounded-tl-apple animate-pulse" />
            <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-alert-500 rounded-tr-apple animate-pulse" />
            <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-alert-500 rounded-bl-apple animate-pulse" />
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-alert-500 rounded-br-apple animate-pulse" />

            {/* Header */}
            <div className="text-center mb-8">
              {/* Icon */}
              <div className="text-6xl mb-4 animate-pulse">
                ⚠️
              </div>

              {/* Title */}
              <h1 className="font-mono text-3xl font-bold text-alert-500 text-shadow-glow-alert mb-2">
                {fallbackTitle || '[SYSTEM_MALFUNCTION]'}
              </h1>

              {/* Subtitle */}
              <p className="font-mono text-sm text-alert-500/70 uppercase tracking-wider">
                ERROR_CODE: {errorCount > 1 ? 'RECURRING_FAILURE' : 'COMPONENT_CRASH'}
              </p>
            </div>

            {/* Error message */}
            <div className="mb-6">
              <p className="font-sans text-gray-300 text-center leading-relaxed">
                {fallbackMessage || 
                  'A critical system component has encountered an unexpected error. The security of your connection remains intact, but this module requires reinitialization.'}
              </p>
            </div>

            {/* Error details (dev mode only) */}
            {import.meta.env.MODE === 'development' && error && (
              <div className="mb-6 p-4 rounded-apple bg-void-300/50 border border-alert-500/30">
                <h3 className="font-mono text-xs text-alert-500 uppercase tracking-wider mb-2">
                  DEBUG_INFO:
                </h3>
                <div className="font-mono text-xs text-gray-400 space-y-2">
                  <div>
                    <span className="text-alert-500">Error:</span> {error.toString()}
                  </div>
                  {errorInfo && (
                    <div className="max-h-32 overflow-y-auto">
                      <span className="text-alert-500">Stack:</span>
                      <pre className="mt-1 text-[10px] text-gray-500">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Reload module button */}
              <button
                onClick={this.handleReload}
                className="
                  flex-1
                  rounded-apple
                  bg-terminal-500
                  text-black
                  font-mono font-bold
                  px-6 py-3
                  transition-all duration-400 ease-spring-bounce
                  hover:scale-105 hover:shadow-glow-terminal-lg
                  active:scale-95
                "
              >
                [RELOAD_MODULE]
              </button>

              {/* Full reload button */}
              {errorCount > 1 && (
                <button
                  onClick={this.handleFullReload}
                  className="
                    flex-1
                    rounded-apple
                    bg-void-200
                    border border-terminal-500
                    text-terminal-500
                    font-mono font-bold
                    px-6 py-3
                    transition-all duration-400 ease-spring-bounce
                    hover:scale-105 hover:shadow-glow-terminal
                    active:scale-95
                  "
                >
                  [FULL_SYSTEM_RELOAD]
                </button>
              )}
            </div>

            {/* Status indicator */}
            <div className="mt-6 pt-6 border-t border-glass-300">
              <div className="flex items-center justify-center space-x-2 text-xs font-mono text-gray-500">
                <div className="w-2 h-2 bg-alert-500 rounded-full animate-pulse" />
                <span>SECURE_CONNECTION: MAINTAINED</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SystemErrorBoundary;

/**
 * USAGE EXAMPLES
 */

// 1. Wrap entire app (App.tsx)
// import SystemErrorBoundary from './components/SystemErrorBoundary';
// 
// <SystemErrorBoundary>
//   <App />
// </SystemErrorBoundary>

// 2. Wrap specific components (risky third-party or complex components)
// <SystemErrorBoundary
//   fallbackTitle="[CHART_MODULE_ERROR]"
//   fallbackMessage="The data visualization module encountered an error. Your data is safe."
// >
//   <ComplexChart data={data} />
// </SystemErrorBoundary>

// 3. Multiple error boundaries for granular control
// <div>
//   <Header />
//   <SystemErrorBoundary>
//     <CallLogTable />
//   </SystemErrorBoundary>
//   <SystemErrorBoundary>
//     <DialPad />
//   </SystemErrorBoundary>
// </div>
