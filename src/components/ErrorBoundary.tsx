import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-card border border-destructive/20 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              
              <h1 className="text-2xl font-bold text-foreground mb-4">
                Application Error
              </h1>
              
              <p className="text-muted-foreground mb-6">
                Something went wrong. The error has been logged and you can now access the browser console for debugging.
              </p>

              <div className="flex gap-4 justify-center mb-8">
                <button
                  onClick={this.handleReload}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload App
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </button>
              </div>

              {/* Error Details for Debugging */}
              <details className="text-left bg-muted/50 rounded-lg p-4">
                <summary className="cursor-pointer font-medium text-sm mb-2">
                  Error Details (for debugging)
                </summary>
                <div className="space-y-4 text-xs">
                  {this.state.error && (
                    <div>
                      <h4 className="font-medium text-destructive">Error Message:</h4>
                      <pre className="bg-background p-2 rounded border overflow-auto">
                        {this.state.error.message}
                      </pre>
                    </div>
                  )}
                  
                  {this.state.error?.stack && (
                    <div>
                      <h4 className="font-medium text-destructive">Stack Trace:</h4>
                      <pre className="bg-background p-2 rounded border overflow-auto max-h-40">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <h4 className="font-medium text-destructive">Component Stack:</h4>
                      <pre className="bg-background p-2 rounded border overflow-auto max-h-40">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-left">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                  🔧 Debugging Tips:
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Open browser console (F12) to see detailed error logs</li>
                  <li>• Check Network tab for failed API requests</li>
                  <li>• Verify Supabase credentials in environment variables</li>
                  <li>• Check if all required Edge Functions are deployed</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;