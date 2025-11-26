import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AppLayout from "@/components/layout/AppLayout";
import RoomsPage from "@/pages/rooms";
import RoomDetailsPage from "@/pages/room-details";
import MyBookingsPage from "@/pages/my-bookings";
import BookingsPage from "@/pages/bookings";
import NewBookingPage from "@/pages/new-booking";
import TherapistProfilePage from "@/pages/therapist-profile";
import ProfilePage from "@/pages/profile";
import AuthPage from "@/pages/auth-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import SystemConfigPage from "@/pages/system-config";
import TestRoute from "@/pages/test-route";
import TestAuth from "@/pages/test-auth";
import AccountHistoryPage from "@/pages/account-history";

// Importación de páginas de administración
import AdminRoomsPage from "@/pages/admin/rooms";
import AdminConfigPage from "@/pages/admin/config";
import AdminConfigSimplePage from "@/pages/admin/config-simple";
import AdminBookingsPage from "@/pages/admin/bookings-list.tsx";
import BookingRulesCombinedPage from "@/pages/admin/booking-rules-combined";
import BookingRulesPage from "@/pages/admin/booking-rules-fixed";
import TrustLevelRulesPage from "@/pages/admin/trust-level-rules";
import SpecialRulesPage from "@/pages/admin/special-rules";
import MonitoringPage from "@/pages/admin/monitoring";
import UsersListPage from "@/pages/admin/users-list";
import PaymentsPage from "@/pages/admin/payments";
import AccessPage from "@/pages/admin/access";
import DocumentsPage from "@/pages/documents";
import AdminLogsPage from "@/pages/admin/logs";
import AccountSummaryPage from "@/pages/account-summary";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={RoomsPage} />
      <ProtectedRoute path="/rooms/:id" component={RoomDetailsPage} />
      <ProtectedRoute path="/my-bookings" component={MyBookingsPage} />
      <ProtectedRoute path="/bookings" component={BookingsPage} />
      <ProtectedRoute path="/new-booking" component={NewBookingPage} />
      <ProtectedRoute path="/my-payments" component={() => <PaymentsPage userOnly={true} />} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/documents" component={DocumentsPage} />
      <ProtectedRoute path="/therapist-profile/:id" component={TherapistProfilePage} />
      <ProtectedRoute path="/system-config" component={SystemConfigPage} />
      <ProtectedRoute path="/account-summary" component={AccountSummaryPage} />
      <ProtectedRoute path="/account-history" component={AccountHistoryPage} />

      {/* Rutas de administración */}
      <ProtectedRoute path="/admin/rooms" component={AdminRoomsPage} adminOnly />
      <ProtectedRoute path="/admin/config" component={BookingRulesCombinedPage} adminOnly />
      <ProtectedRoute path="/admin/config-legacy" component={BookingRulesPage} adminOnly />
      <ProtectedRoute path="/admin/trust-level" component={TrustLevelRulesPage} adminOnly />
      <ProtectedRoute path="/admin/special-rules" component={SpecialRulesPage} adminOnly />
      <ProtectedRoute path="/admin/monitoring" component={MonitoringPage} adminOnly />
      <ProtectedRoute path="/admin/config-full" component={AdminConfigPage} adminOnly />
      <ProtectedRoute path="/admin/config-simple" component={AdminConfigSimplePage} adminOnly />
      <ProtectedRoute path="/admin/booking" component={AdminBookingsPage} adminOnly />
      <ProtectedRoute path="/admin/users" component={UsersListPage} adminOnly />
      <ProtectedRoute path="/admin/bookings" component={BookingsPage} adminOnly />
      <ProtectedRoute path="/admin/payments" component={PaymentsPage} adminOnly />
      <ProtectedRoute path="/admin/access" component={AccessPage} adminOnly />
      <ProtectedRoute path="/admin/logs" component={AdminLogsPage} adminOnly />
      <ProtectedRoute path="/admin/reports" component={NotFound} adminOnly />
      
      <Route path="/auth" component={AuthPage} />
      <Route path="/test-route" component={TestRoute} />
      <Route path="/test-auth" component={TestAuth} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppLayout>
          <Router />
        </AppLayout>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
