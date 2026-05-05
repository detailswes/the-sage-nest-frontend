import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import GuestRoute from "./components/GuestRoute";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/dashboard/Dashboard";
import ExpertDashboard from "./pages/dashboard/ExpertDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import ProfileSection from "./pages/dashboard/sections/ProfileSection";
import ServicesSection from "./pages/dashboard/sections/ServicesSection";
import AvailabilitySection from "./pages/dashboard/sections/AvailabilitySection";
import UpcomingAppointmentsSection from "./pages/dashboard/sections/UpcomingAppointmentsSection";
import PastAppointmentsSection from "./pages/dashboard/sections/PastAppointmentsSection";
import CalendarSection from "./pages/dashboard/sections/CalendarSection";
import SettingsSection from "./pages/dashboard/sections/SettingsSection";
import StripeReturn from "./pages/stripe/StripeReturn";
import StripeRefresh from "./pages/stripe/StripeRefresh";
import VerifyEmail from "./pages/auth/VerifyEmail";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
// ── Parent flows ──────────────────────────────────────────────────────────────
import ParentDashboard from "./pages/parent/ParentDashboard";
import BookPage from "./pages/parent/BookPage";
import MyBookingsPage from "./pages/parent/MyBookingsPage";
import ParentProfilePage from "./pages/parent/ParentProfilePage";
import CheckoutPage from "./pages/parent/CheckoutPage";
import BookingStatusPage from "./pages/parent/BookingStatusPage";
import PrivacyPolicyPage from "./pages/legal/PrivacyPolicyPage";
import TermsConditionsPage from "./pages/legal/TermsConditionsPage";
import ExpertManagementSection from "./pages/dashboard/sections/ExpertManagementSection";
import ParentManagementSection from "./pages/dashboard/sections/ParentManagementSection";
import LegalDocumentsSection from "./pages/dashboard/sections/LegalDocumentsSection";
import BookingsManagementSection from "./pages/dashboard/sections/BookingsManagementSection";
import AdminExpertDetailSection from "./pages/dashboard/sections/AdminExpertDetailSection";
import AdminParentDetailSection from "./pages/dashboard/sections/AdminParentDetailSection";
import PaymentsOverviewSection from "./pages/dashboard/sections/PaymentsOverviewSection";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Guest-only */}
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <Register />
              </GuestRoute>
            }
          />

          {/* Role dispatcher — redirects to role-specific dashboard */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          {/* Expert dashboard — nested section routes */}
          <Route
            path="/dashboard/expert"
            element={
              <PrivateRoute allowedRoles={["EXPERT"]}>
                <ExpertDashboard />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile"       element={<ProfileSection />} />
            <Route path="services"      element={<ServicesSection />} />
            <Route path="availability"  element={<AvailabilitySection />} />
            <Route path="calendar"      element={<CalendarSection />} />
            <Route path="appointments"  element={<UpcomingAppointmentsSection />} />
            <Route path="history"       element={<PastAppointmentsSection />} />
            <Route path="settings"       element={<SettingsSection />} />
          </Route>

          {/* Parent dashboard — nested section routes */}
          <Route
            path="/dashboard/parent"
            element={
              <PrivateRoute allowedRoles={["PARENT"]}>
                <ParentDashboard />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="browse" replace />} />
            <Route path="browse"    element={<BookPage />} />
            <Route path="upcoming"  element={<MyBookingsPage view="upcoming" />} />
            <Route path="past"      element={<MyBookingsPage view="past" />} />
            <Route path="bookings"  element={<Navigate to="upcoming" replace />} />
            <Route path="profile"   element={<ParentProfilePage />} />
          </Route>

          {/* Booking flow — standalone pages (outside dashboard layout) */}
          <Route
            path="/checkout"
            element={
              <PrivateRoute allowedRoles={["PARENT"]}>
                <CheckoutPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/booking/status/:id"
            element={
              <PrivateRoute allowedRoles={["PARENT"]}>
                <BookingStatusPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/booking-confirmed"
            element={
              <PrivateRoute allowedRoles={["PARENT"]}>
                <BookingStatusPage />
              </PrivateRoute>
            }
          />

          {/* Admin dashboard — nested section routes */}
          <Route
            path="/dashboard/admin"
            element={
              <PrivateRoute allowedRoles={["ADMIN"]}>
                <AdminDashboard />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="experts" replace />} />
            <Route path="experts"         element={<ExpertManagementSection />} />
            <Route path="experts/:id"     element={<AdminExpertDetailSection />} />
            <Route path="parents"         element={<ParentManagementSection />} />
            <Route path="parents/:id"     element={<AdminParentDetailSection />} />
            <Route path="bookings"        element={<BookingsManagementSection />} />
            <Route path="payments"        element={<PaymentsOverviewSection />} />
            <Route path="legal-documents" element={<LegalDocumentsSection />} />
          </Route>

          {/* Stripe redirect pages — require EXPERT auth */}
          <Route
            path="/stripe/return"
            element={
              <PrivateRoute allowedRoles={["EXPERT"]}>
                <StripeReturn />
              </PrivateRoute>
            }
          />
          <Route
            path="/stripe/refresh"
            element={
              <PrivateRoute allowedRoles={["EXPERT"]}>
                <StripeRefresh />
              </PrivateRoute>
            }
          />

          {/* Legal pages — public, no auth required */}
          <Route path="/privacy-policy"    element={<PrivacyPolicyPage />} />
          <Route path="/terms-conditions"  element={<TermsConditionsPage />} />

          {/* Email verification — public, no auth required */}
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Password reset — guest-only (redirect to dashboard if logged in) */}
          <Route
            path="/forgot-password"
            element={
              <GuestRoute>
                <ForgotPassword />
              </GuestRoute>
            }
          />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
