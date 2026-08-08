import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Nav from "./components/Nav";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Leaderboards from "./pages/Leaderboards";
import Roster from "./pages/Roster";
import Economy from "./pages/Economy";
import StockMarket from "./pages/StockMarket";
import StockDetail from "./pages/StockDetail";
import EconomyNews from "./pages/EconomyNews";
import Dashboard from "./pages/Dashboard";
import HrPanel from "./pages/HrPanel";
import InternalAffairs from "./pages/InternalAffairs";
import SuperAdmin from "./pages/SuperAdmin";
import Changelog from "./pages/Changelog";
import ChangelogEntry from "./pages/ChangelogEntry";
import Verification from "./pages/Verification";
import Tickets from "./pages/Tickets";
import TicketTranscript from "./pages/TicketTranscript";
import Strike3Prompt from "./components/Strike3Prompt";

// Every page that exists both at its normal public URL AND, for a
// logged-in staff member who followed "Back to Website," at the same
// path under /site -- see the embeddedPublicSite branch below. Defined
// once here instead of twice so the two never drift out of sync.
const PUBLIC_PAGES = [
  { path: "/", element: <Home /> },
  { path: "/leaderboards", element: <Leaderboards /> },
  { path: "/roster", element: <Roster /> },
  { path: "/economy", element: <Economy /> },
  { path: "/stocks", element: <StockMarket /> },
  { path: "/stocks/:ticker", element: <StockDetail /> },
  { path: "/economy/news", element: <EconomyNews /> },
  { path: "/changelog", element: <Changelog standalone /> },
  { path: "/changelog/:slug", element: <ChangelogEntry standalone /> },
];

function AppShell() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="login-screen">Loading...</div>;
  }

  // A logged-in staff member can still browse the public site (see the
  // "Back to Website" sidebar link in Nav.jsx) without logging out --
  // those live at /site/* so they don't collide with the authenticated
  // routes below ("/" is Dashboard once logged in, for instance).
  const embeddedPublicSite = !!user && location.pathname.startsWith("/site");

  if (!user || embeddedPublicSite) {
    return (
      <div className="public-shell">
        <Routes>
          {PUBLIC_PAGES.map(({ path, element }) => (
            <Route key={path} path={path} element={element} />
          ))}
          <Route path="/login" element={<Login />} />
          {PUBLIC_PAGES.map(({ path, element }) => (
            <Route key={`site${path}`} path={path === "/" ? "/site" : `/site${path}`} element={element} />
          ))}
          <Route path="*" element={user ? <Navigate to="/" replace /> : <Login />} />
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
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/transcripts/:ticketNumber" element={<TicketTranscript />} />
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
