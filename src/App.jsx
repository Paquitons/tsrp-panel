import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Nav from "./components/Nav";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Leaderboards from "./pages/Leaderboards";
import Roster from "./pages/Roster";
import Dashboard from "./pages/Dashboard";
import HrPanel from "./pages/HrPanel";
import InternalAffairs from "./pages/InternalAffairs";
import SuperAdmin from "./pages/SuperAdmin";
import Changelog from "./pages/Changelog";
import ChangelogEntry from "./pages/ChangelogEntry";
import Verification from "./pages/Verification";
import Strike3Prompt from "./components/Strike3Prompt";

function AppShell() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="login-screen">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="public-shell">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/leaderboards" element={<Leaderboards />} />
          <Route path="/roster" element={<Roster />} />
          <Route path="/changelog" element={<Changelog standalone />} />
          <Route path="/changelog/:slug" element={<ChangelogEntry standalone />} />
          <Route path="*" element={<Login />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="layout">
      <Nav />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/hr" element={<HrPanel />} />
        <Route path="/internalaffairs" element={<InternalAffairs />} />
        <Route path="/changelog" element={<Changelog />} />
        <Route path="/changelog/:slug" element={<ChangelogEntry />} />
        {user?.isManagementOrAbove && <Route path="/verification" element={<Verification />} />}
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
