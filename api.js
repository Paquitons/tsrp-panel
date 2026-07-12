import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Nav from "./components/Nav";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Shifts from "./pages/Shifts";
import Punishments from "./pages/Punishments";
import PlayerLookup from "./pages/PlayerLookup";
import LOA from "./pages/LOA";
import Activity from "./pages/Activity";

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
        <Route path="/players" element={<PlayerLookup />} />
        <Route path="/loa" element={<LOA />} />
        <Route path="/shifts" element={<Shifts />} />
        <Route path="/punishments" element={<Punishments />} />
        <Route path="/activity" element={<Activity />} />
      </Routes>
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
