import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { UserProvider } from "./context/UserContext";
import IntroCarousel from "./features/onboarding/IntroCarousel";
import OnboardingGate from "./features/onboarding/OnboardingGate";
import ProfileSetup from "./features/onboarding/ProfileSetup";
import ProfilePage from "./features/profile/ProfilePage";
import StartParamRouter from "./features/notifications/StartParamRouter";
import AppLayout from "./layouts/AppLayout";
import ListingDetail from "./pages/ListingDetail/ListingDetail";
import Home from "./pages/Home/Home";
import Requests from "./pages/Requests/Requests";
import Notifications from "./pages/Notifications/Notifications";
import NotificationLaunch from "./pages/Notifications/NotificationLaunch";
import Reviews from "./pages/Reviews/Reviews";

// Search merged into Home (same screen, ?locality_id=... controls the results
// section) — keep old /search links working rather than 404ing them.
function RedirectSearchToHome() {
  const location = useLocation();
  return <Navigate to={{ pathname: "/home", search: location.search }} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <ToastProvider>
          <BrowserRouter>
            <StartParamRouter />
            <Routes>
              <Route path="/" element={<IntroCarousel />} />
              <Route path="/profile-setup" element={<ProfileSetup />} />

              <Route element={<OnboardingGate />}>
                <Route path="/listing/:id" element={<ListingDetail />} />
                <Route path="/notifications/:notificationId" element={<NotificationLaunch />} />
                <Route path="/users/:userId/reviews" element={<Reviews />} />
                <Route element={<AppLayout />}>
                  <Route path="/home" element={<Home />} />
                  <Route path="/search" element={<RedirectSearchToHome />} />
                  <Route path="/requests" element={<Requests />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
