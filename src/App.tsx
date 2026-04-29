import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import SourcePage from "./pages/SourcePage";
import Statistics from "./pages/Statistics";
import AIAnalysis from "./pages/AIAnalysis";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/statistics" replace />} />
            <Route path="/fabrication" element={<SourcePage source="fabrication" />} />
            <Route path="/sortie" element={<SourcePage source="sortie" />} />
            <Route path="/montage" element={<SourcePage source="montage" />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/ai-analysis" element={<AIAnalysis />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
