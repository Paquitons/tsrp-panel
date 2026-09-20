import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Nav from "./components/Nav";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Roster from "./pages/Roster";
import IdentityGate from "./components/IdentityGate";
import Permissions from "./pages/Permissions";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Dashboard from "./pages/Dashboard";
import InternalAffairs from "./pages/InternalAffairs";
import Changelog from "./pages/Changelog";
import Handbook from "./pages/Handbook";
import ChangelogEntry from "./pages/ChangelogEntry";
import Tickets from "./pages/Tickets";
import TicketTranscript from "./pages/TicketTranscript";
import Supervisory from "./pages/Supervisory";
import NotFound, { PublicNotFound } from "./pages/NotFound";
import Strike3Prompt from "./components/Strike3Prompt";
import NoticeCenter from "./components/NoticeCenter";
import CommandPalette from "./components/CommandPalette";
import { NoticesProvider } from "./context/NoticesContext";

// SuperAdmin statically imports SuperAdminEconomy.jsx (2,151 lines) and
// StockMarketAdmin.jsx (1,224 lines) -- together the single largest chunk
// of code in the whole panel, previously bundled into the same JS file
// every visitor downloads on first load (including the public homepage,
// before Vite's route-based splitting even applies) even though only one
// hardcoded account can ever reach this route. React.lazy here means it's
// its own chunk, fetched only when a super admin actually navigates here.
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));

// Management is lazy for the same reason the Director Console was before
// it absorbed it: it pulls in the HR pages and every Director section,
// and only Management and above can open it. Loading it eagerly would
// have put all of that back into the bundle the public homepage
// downloads, quietly undoing the split.
const Management = lazy(() => import("./pages/Management"));

// Every page that exists both at its normal public URL AND, for a
// logged-in staff member who followed "Back to Website," at the same
// path under /site -- see the embeddedPublicSite branch below. Defined
// once here instead of twice so the two never drift out of sync.
const PUBLIC_PAGES = [
  { path: "/", element: <Home /> },
  { path: "/roster", element: <Roster /> },
  { path: "/changelog", element: <Changelog standalone /> },
  { path: "/changelog/:slug", element: <ChangelogEntry standalone /> },
  { path: "/privacy", element: <Privacy /> },
  { path: "/terms", element: <Terms /> },
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
          <Route path="*" element={<PublicNotFound />} />
        </Routes>
      </div>
    );
  }

  // Wraps the whole authenticated panel, so "Is this you?" is answered
  // before any staff page renders rather than being a screen somebody can
  // click past.
  return (
    <IdentityGate>
    {/* Above the router, so a Director Console announcement or private
        message reaches somebody wherever they are in the panel rather
        than only on whichever page happened to subscribe. It also owns
        the one shared connection to the live stream, which is what keeps
        a quick notice tied to "the panel is open" and nothing else. */}
    <NoticesProvider>
    <div className="layout">
      <Nav />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        {/* The bot's alternative-verification DM sends people to /login,
            since that is where they need to be when signed out, which is
            the usual case. Somebody who is already signed in should land
            on the panel rather than on a 404. */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route
          path="/management"
          element={
            <Suspense fallback={<div className="content"><p className="muted">Loading…</p></div>}>
              <Management />
            </Suspense>
          }
        />
        {/* HR Panel and the Director Console merged into Management.
            Redirects rather than removals: these paths are in people's
            bookmarks and in older messages. */}
        <Route path="/hr" element={<Navigate to="/management" replace />} />
        <Route path="/director" element={<Navigate to="/management" replace />} />
        <Route path="/verification" element={<Navigate to="/management" replace />} />
        <Route path="/supervisory" element={<Supervisory />} />
        <Route path="/internalaffairs" element={<InternalAffairs />} />
        {/* Deliberately not in the sidebar: reached by link, not by a tab. */}
        <Route path="/staff-handbook" element={<Handbook />} />
        <Route path="/changelog" element={<Changelog />} />
        <Route path="/changelog/:slug" element={<ChangelogEntry />} />
        {/* Reachable by URL, deliberately not in the sidebar: a rarely
            needed screen was holding a permanent slot. Same arrangement
            as the Staff Handbook. */}
        {user?.isManagementOrAbove && <Route path="/permissions" element={<Permissions />} />}
        {user?.isSuperAdmin && (
          <Route
            path="/super-admin"
            element={
              <Suspense fallback={<div className="content"><p className="muted">Loading…</p></div>}>
                <SuperAdmin />
              </Suspense>
            }
          />
        )}
        {(user?.isSupportStaff || user?.canViewStaffComplaints) && <Route path="/tickets" element={<Tickets />} />}
        {(user?.isSupportStaff || user?.canViewStaffComplaints) && <Route path="/transcripts/:ticketNumber" element={<TicketTranscript />} />}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Strike3Prompt />
      <NoticeCenter />
      {/* Above the router so the shortcut works on every page, and inside
          it so a command can navigate. */}
      <CommandPalette />
    </div>
    </NoticesProvider>
    </IdentityGate>
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
