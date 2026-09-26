import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { UserProvider } from "./context/UserContext";
import IntroCarousel from "./features/onboarding/IntroCarousel";
import OnboardingGate from "./features/onboarding/OnboardingGate";
import ProfileSetup from "./features/onboarding/ProfileSetup";
import ProfilePage from "./features/profile/ProfilePage";
import AppLayout from "./layouts/AppLayout";
import ListingDetail from "./pages/ListingDetail/ListingDetail";
import Home from "./pages/Home/Home";
import SearchResults from "./pages/Search/SearchResults";

export default function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<IntroCarousel />} />
              <Route path="/profile-setup" element={<ProfileSetup />} />

              <Route element={<OnboardingGate />}>
                <Route path="/listing/:id" element={<ListingDetail />} />
                <Route element={<AppLayout />}>
                  <Route path="/home" element={<Home />} />
                  <Route path="/search" element={<SearchResults />} />
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
