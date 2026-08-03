import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Nav from "./components/Nav";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import HrPanel from "./pages/HrPanel";
import InternalAffairs from "./pages/InternalAffairs";
import SuperAdmin from "./pages/SuperAdmin";
import Strike3Prompt from "./components/Strike3Prompt";

function AppShell() {
  const { user, loading } = useAuth();

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
        <Route path="/internalaffairs" element={<InternalAffairs />} />
        {user?.isSuperAdmin && <Route path="/super-admin" element={<SuperAdmin />} />}
      </Routes>
      <Strike3Prompt />
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
