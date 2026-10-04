import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import HospitalPortalPage from "./pages/auth/HospitalPortalPage";
import SsoPage from "./pages/auth/SsoPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* path="/" is the landing route: the main sign-in screen. */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/hospital-portal" element={<HospitalPortalPage />} />
        <Route path="/sso" element={<SsoPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Placeholder so the sign-in buttons have somewhere to go.
        Replace this when the dashboard is built. */}
        <Route
          path="/dashboard"
          element={<h1 style={{ padding: 40 }}>Dashboard coming soon</h1>}
        />
      </Routes>
    </BrowserRouter>
  );
}