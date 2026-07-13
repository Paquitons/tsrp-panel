import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Nav from "./components/Nav";
import ThemeSwitcher from "./components/ThemeSwitcher";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import HrPanel from "./pages/HrPanel";
import { loadSavedTheme } from "./themes";

function AppShell() {
  const { user, loading } = useAuth();

  useEffect(() => { loadSavedTheme(); }, []);

  if (loading) {
    return <div className="login-screen">Loading...</div>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="layout">
      <Nav />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/hr" element={<HrPanel />} />
      </Routes>
      <ThemeSwitcher />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
