import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/AuthGuard";
import { useSettingsStore } from "@/hooks/useSiteSettings";
import Index from "./pages/Index.tsx";
import Stadiums from "./pages/Stadiums.tsx";
import StadiumDetail from "./pages/StadiumDetail.tsx";
import Matchmaking from "./pages/Matchmaking.tsx";
import Owner from "./pages/Owner.tsx";
import OwnerDashboard from "./pages/OwnerDashboard.tsx";
import Checkout from "./pages/Checkout.tsx";
import Events from "./pages/Events.tsx";
import Auth from "./pages/Auth.tsx";
import MyBookings from "./pages/MyBookings.tsx";
import Admin from "./pages/Admin.tsx";
import Verify from "./pages/Verify.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const AppInner = () => {
  const loadSettings = useSettingsStore((s) => s.load);
  useEffect(() => { loadSettings(); }, [loadSettings]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppInner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/stadiums" element={<Stadiums />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/stadium/:id" element={<StadiumDetail />} />
            <Route path="/matchmaking" element={<Matchmaking />} />
            <Route path="/events" element={<Events />} />
            <Route path="/checkout" element={<AuthGuard><Checkout /></AuthGuard>} />
            <Route path="/my-bookings" element={<AuthGuard><MyBookings /></AuthGuard>} />
            <Route path="/owner" element={<AuthGuard role="owner"><Owner /></AuthGuard>} />
            <Route path="/owner/dashboard" element={<AuthGuard role="owner"><OwnerDashboard /></AuthGuard>} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/reset-password" element={<Auth />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
