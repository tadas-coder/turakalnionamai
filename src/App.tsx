import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Tickets from "./pages/Tickets";
import Voting from "./pages/Voting";
import News from "./pages/News";
import Invoices from "./pages/Invoices";
import Rules from "./pages/Rules";
import Documents from "./pages/Documents";
import Reports from "./pages/Reports";
import FinancialReport from "./pages/FinancialReport";
import TicketStatistics from "./pages/TicketStatistics";
import Schedules from "./pages/Schedules";
import Profile from "./pages/Profile";
import PendingApproval from "./pages/PendingApproval";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/voting" element={<Voting />} />
            <Route path="/news" element={<News />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/financial-report" element={<FinancialReport />} />
            <Route path="/ticket-statistics" element={<TicketStatistics />} />
            <Route path="/schedules" element={<Schedules />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
