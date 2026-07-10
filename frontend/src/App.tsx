import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { UserProfileProvider } from "@/lib/userProfile";
import ProtectedRoute from "@/components/ProtectedRoute";
import RecoveryHashRedirect from "@/components/RecoveryHashRedirect";
import { authenticatedRouteDefs } from "@/lib/router/authenticatedRoutes";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <UserProfileProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <RecoveryHashRedirect />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/reset_pw" element={<ResetPassword />} />
              <Route element={<ProtectedRoute />}>
                {authenticatedRouteDefs.map((route) => (
                  <Route
                    key={route.path}
                    path={route.path}
                    element={route.element}
                    handle={{ requiresAuth: true }}
                  />
                ))}
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </UserProfileProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
