import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import RequireProfile from "./components/RequireProfile/RequireProfile";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { UserProvider } from "./context/UserContext";
import AppLayout from "./layouts/AppLayout";
import ListingDetail from "./pages/ListingDetail/ListingDetail";
import Home from "./pages/Home/Home";
import Onboarding from "./pages/Onboarding/Onboarding";
import Profile from "./pages/Profile/Profile";
import SearchResults from "./pages/Search/SearchResults";
import Welcome from "./pages/Welcome/Welcome";

export default function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Welcome />} />
              <Route path="/onboarding" element={<Onboarding />} />

              <Route element={<RequireProfile />}>
                <Route path="/listing/:id" element={<ListingDetail />} />
                <Route element={<AppLayout />}>
                  <Route path="/home" element={<Home />} />
                  <Route path="/search" element={<SearchResults />} />
                  <Route path="/profile" element={<Profile />} />
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
