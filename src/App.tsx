import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import React from "react";

// Import only essential components to avoid crashes
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Disable retries to prevent infinite loops
      refetchOnWindowFocus: false,
    },
  },
});

// Minimal error boundary that won't crash
class SimpleErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f5f5f5',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '40px', 
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            maxWidth: '600px'
          }}>
            <h1 style={{ color: '#dc2626', marginBottom: '20px' }}>
              🚨 Application Error
            </h1>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              The application encountered an error. You can now safely open the browser console (F12) to see details.
            </p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Reload App
            </button>
            <button 
              onClick={() => window.location.href = '/auth'}
              style={{
                backgroundColor: '#6b7280',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Go to Auth
            </button>
            {this.state.error && (
              <details style={{ marginTop: '20px', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                  Error Details
                </summary>
                <pre style={{ 
                  backgroundColor: '#f3f4f6', 
                  padding: '10px', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  overflow: 'auto',
                  marginTop: '10px'
                }}>
                  {this.state.error.message}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Minimal Speech Studio component that won't crash
const MinimalSpeechStudio = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Speech Studio - Safe Mode</h1>
      <p>This is a minimal version to test if the app loads.</p>
      <div style={{ 
        backgroundColor: '#f0f9ff', 
        padding: '20px', 
        borderRadius: '8px',
        border: '1px solid #0ea5e9',
        marginTop: '20px'
      }}>
        <h3>✅ App is Loading Successfully!</h3>
        <p>If you can see this, the basic app structure is working.</p>
        <p>Now we can safely add Speech Studio features one by one.</p>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <SimpleErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              {/* Minimal routes to test basic functionality */}
              <Route path="/" element={<MinimalSpeechStudio />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/speech" element={<MinimalSpeechStudio />} />
              <Route path="*" element={<MinimalSpeechStudio />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </SimpleErrorBoundary>
  );
};

export default App;