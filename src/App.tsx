import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useRoutes } from "react-router-dom";
import DashboardLayout from "./components/DashboardLayout";
import MarketingLayout from "./components/MarketingLayout";
import Dashboard from "./pages/Dashboard";
import Transcripts from "./pages/Transcripts";
import Projects from "./pages/Projects";
import Chat from "./pages/Chat";
import Auth from "./pages/Auth";
import AuthGuard from "./components/AuthGuard";
import LandingGuard from "./components/LandingGuard";
import NotFound from "./pages/NotFound";
import ProjectTranscripts from "./pages/ProjectTranscripts";
import ProjectAnalysis from "./pages/ProjectAnalysis";
import ProjectChat from "./pages/ProjectChat";
import Landing from "./pages/Landing";
import AppleLanding from "./pages/AppleLanding";
import Features from "./pages/Features";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Contact from "./pages/Contact";
import routes from "tempo-routes";
import React, { Suspense } from "react";

import ContentAnalysis from "./pages/ContentAnalysis";

const ProAdvancedAnalysis = React.lazy(
  () => import("@/pages/ProAdvancedAnalysis"),
);

const queryClient = new QueryClient();

// Component to handle Tempo routes - must be used inside Router context
const TempoRoutes = () => {
  try {
    // This hook will only be called when the component is rendered inside BrowserRouter
    return useRoutes(routes);
  } catch (error) {
    console.error("Error in TempoRoutes:", error);
    return null;
  }
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {/* Tempo routes - only rendered when inside Router context */}
        {import.meta.env.VITE_TEMPO && <TempoRoutes />}
        <Suspense fallback={null}>
          <Routes>
            {/* Marketing Website Routes */}
            <Route path="/" element={<AppleLanding />} />
            <Route
              path="/features"
              element={
                <MarketingLayout>
                  <Features />
                </MarketingLayout>
              }
            />
            <Route
              path="/pricing"
              element={
                <MarketingLayout>
                  <Pricing />
                </MarketingLayout>
              }
            />
            <Route
              path="/about"
              element={
                <MarketingLayout>
                  <About />
                </MarketingLayout>
              }
            />
            <Route
              path="/contact"
              element={
                <MarketingLayout>
                  <Contact />
                </MarketingLayout>
              }
            />

            {/* Auth Route */}
            <Route path="/auth" element={<Auth />} />

            {/* Dashboard Routes - Protected */}
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <DashboardLayout />
                </AuthGuard>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="transcripts" element={<Transcripts />} />
              <Route path="projects" element={<Projects />} />
              <Route
                path="projects/:projectId/transcripts"
                element={<ProjectTranscripts />}
              />
              <Route
                path="projects/:projectId/analysis"
                element={<ProjectAnalysis />}
              />
              <Route
                path="projects/:projectId/analysis/basic"
                element={<ProjectAnalysis />}
              />
              <Route
                path="projects/:projectId/analysis/advanced"
                element={<ProAdvancedAnalysis />}
              />
              <Route
                path="projects/:projectId/analysis/content"
                element={<ContentAnalysis />}
              />
              <Route
                path="projects/:projectId/pro-advanced-analysis"
                element={<ProAdvancedAnalysis />}
              />
              <Route
                path="projects/:projectId/chat"
                element={<ProjectChat />}
              />
              <Route path="chat" element={<Chat />} />
            </Route>

            {/* Tempo route before catch-all */}
            {import.meta.env.VITE_TEMPO && <Route path="/tempobook/*" />}

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
