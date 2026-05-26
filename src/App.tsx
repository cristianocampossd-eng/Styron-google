import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Financial from "./pages/Financial";
import FinancialOverview from "./pages/financial/FinancialOverview";
import FinancialProjects from "./pages/financial/FinancialProjects";
import FinancialAccounts from "./pages/financial/FinancialAccounts";
import FinancialCategories from "./pages/financial/FinancialCategories";
import FinancialRecurring from "./pages/financial/FinancialRecurring";
import FinancialTransactions from "./pages/financial/FinancialTransactions";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import ServiceOrders from "./pages/ServiceOrders";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";
import CompanySettings from "./pages/settings/CompanySettings";
import PasswordSettings from "./pages/settings/PasswordSettings";
import AccountsSettings from "./pages/settings/AccountsSettings";
import Passwords from "./pages/Passwords";
import Sales from "./pages/Sales";
import Products from "./pages/Products";
import Systems from "./pages/Systems";
import FinancialSystems from "./pages/financial/FinancialSystems";
import { ServiceOrderProvider } from "./contexts/ServiceOrderContext";
import { AppProvider } from "./contexts/AppContext";

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }
  if (!user) return <Auth />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="*"
              element={
                <AppProvider>
                  <ServiceOrderProvider>
                    <Toaster />
                    <Sonner />
                    <AuthGate>
                      <Routes>
                        <Route element={<AppLayout />}>
                          <Route path="/" element={<ProtectedRoute module="dashboard"><Dashboard /></ProtectedRoute>} />
                          <Route path="/projects" element={<Projects />} />
                          <Route path="/projects/:id" element={<ProjectDetail />} />
                          <Route path="/service-orders" element={<ServiceOrders />} />
                          <Route path="/financial" element={<ProtectedRoute module="financial"><Financial /></ProtectedRoute>}>
                            <Route index element={<FinancialOverview />} />
                            <Route path="projects" element={<FinancialProjects />} />
                            <Route path="systems" element={<FinancialSystems />} />
                            <Route path="accounts" element={<FinancialAccounts />} />
                            <Route path="categories" element={<FinancialCategories />} />
                            <Route path="recurring" element={<FinancialRecurring />} />
                            <Route path="transactions" element={<FinancialTransactions />} />
                          </Route>
                          <Route path="/settings" element={<Settings />}>
                            <Route index element={<ProtectedRoute module="settings"><CompanySettings /></ProtectedRoute>} />
                            <Route path="company" element={<ProtectedRoute module="settings"><CompanySettings /></ProtectedRoute>} />
                            <Route path="password" element={<PasswordSettings />} />
                            <Route path="accounts" element={<ProtectedRoute module="settings"><AccountsSettings /></ProtectedRoute>} />
                            <Route path="passwords" element={<ProtectedRoute module="passwords"><Passwords /></ProtectedRoute>} />
                          </Route>
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/passwords" element={<ProtectedRoute module="passwords"><Passwords /></ProtectedRoute>} />
                          <Route path="/sales" element={<ProtectedRoute module="sales"><Sales /></ProtectedRoute>} />
                          <Route path="/products" element={<ProtectedRoute module="products"><Products /></ProtectedRoute>} />
                          <Route path="/systems" element={<ProtectedRoute module="systems"><Systems /></ProtectedRoute>} />
                        </Route>
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </AuthGate>
                  </ServiceOrderProvider>
                </AppProvider>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
