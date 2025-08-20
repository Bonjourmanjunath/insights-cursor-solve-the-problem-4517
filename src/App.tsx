import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import React from "react";

// Import only essential components to avoid crashes
import Landing from "./pages/Landing";
import Features from "./pages/Features";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Contact from "./pages/Contact";
import MarketingLayout from "./components/MarketingLayout";
import LandingGuard from "./components/LandingGuard";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Projects from "./pages/Projects";
import Transcripts from "./pages/Transcripts";
import ProjectAnalysis from "./pages/ProjectAnalysis";
import ContentAnalysis from "./pages/ContentAnalysis";
import ProAdvancedAnalysis from "./pages/ProAdvancedAnalysis";
import ProjectChat from "./pages/ProjectChat";
import ProjectTranscripts from "./pages/ProjectTranscripts";
import DashboardLayout from "./components/DashboardLayout";
import AuthGuard from "./components/AuthGuard";
import SpeechStudio from "./pages/SpeechStudio";

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


const App = () => {
  return (
    <SimpleErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              {/* Marketing Routes */}
              <Route path="/" element={
                <LandingGuard>
                  <MarketingLayout>
                    <Landing />
                  </MarketingLayout>
                </LandingGuard>
              } />
              <Route path="/features" element={
                <MarketingLayout>
                  <Features />
                </MarketingLayout>
              } />
              <Route path="/pricing" element={
                <MarketingLayout>
                  <Pricing />
                </MarketingLayout>
              } />
              <Route path="/about" element={
                <MarketingLayout>
                  <About />
                </MarketingLayout>
              } />
              <Route path="/contact" element={
                <MarketingLayout>
                  <Contact />
                </MarketingLayout>
              } />
              
              {/* Authentication */}
              <Route path="/auth" element={<Auth />} />
              
              {/* Dashboard Routes - UNCHANGED */}
              <Route path="/dashboard" element={
                <AuthGuard>
                  <DashboardLayout />
                </AuthGuard>
              }>
                <Route index element={<Dashboard />} />
                <Route path="projects" element={<Projects />} />
                <Route path="projects/:projectId/transcripts" element={<ProjectTranscripts />} />
                <Route path="projects/:projectId/analysis" element={<ProjectAnalysis />} />
                <Route path="projects/:projectId/analysis/content" element={<ContentAnalysis />} />
                <Route path="projects/:projectId/pro-advanced-analysis" element={<ProAdvancedAnalysis />} />
                <Route path="projects/:projectId/chat" element={<ProjectChat />} />
                <Route path="transcripts" element={<Transcripts />} />
              </Route>
              
              {/* Speech Studio - Additional Feature */}
              <Route path="/speech" element={<SpeechStudio />} />
              
              {/* Fallback */}
              <Route path="*" element={
                <LandingGuard>
                  <MarketingLayout>
                    <Landing />
                  </MarketingLayout>
                </LandingGuard>
              } />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </SimpleErrorBoundary>
  );
};

export default App;