// Small, dependency-free stroke icon set used by the sidebar nav. Kept as
// plain inline SVG (no icon library) to match the rest of the app, which
// has zero UI dependencies beyond react-router.
function Icon({ children, className, ...props }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.8" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8" />
    </Icon>
  );
}

export function ShieldIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 2.5l7.5 3.4v5.4c0 5-3.2 8.7-7.5 10.2-4.3-1.5-7.5-5.2-7.5-10.2V5.9L12 2.5z" />
    </Icon>
  );
}

export function UsersIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M2.5 20.5c0-3.6 2.9-6.2 6.5-6.2s6.5 2.6 6.5 6.2" />
      <circle cx="17" cy="8.8" r="2.4" />
      <path d="M15.3 14.8c2.6.5 4.2 2.6 4.2 5.7" />
    </Icon>
  );
}

export function CrownIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3.5 8.5l3.8 2.8L12 4.5l4.7 6.8 3.8-2.8-1.4 9.5H4.9L3.5 8.5z" />
      <path d="M4.9 18h14.2" />
    </Icon>
  );
}

export function ScrollIcon(props) {
  return (
    <Icon {...props}>
      <path d="M6.5 2.5h8l3 3v14.5a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z" />
      <path d="M9 9.5h6M9 13h6M9 16.5h4" />
    </Icon>
  );
}

export function MenuIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
    </Icon>
  );
}

export function CloseIcon(props) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}

export function LogoutIcon(props) {
  return (
    <Icon {...props}>
      <path d="M9.5 21H5.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 16.5l4.5-4.5-4.5-4.5" />
      <path d="M20.5 12h-12" />
    </Icon>
  );
}

export function SearchIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.8-4.8" />
    </Icon>
  );
}

export function CalendarIcon(props) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17M8 2.5v4M16 2.5v4" />
    </Icon>
  );
}

export function TrophyIcon(props) {
  return (
    <Icon {...props}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 5.5H4a1 1 0 0 0-1 1c0 2.5 1.8 4.2 4 4.6M17 5.5h3a1 1 0 0 1 1 1c0 2.5-1.8 4.2-4 4.6" />
      <path d="M12 14v3.5M8.5 21.5h7M9.5 17.5h5l.6 4h-6.2l.6-4z" />
    </Icon>
  );
}

export function HistoryIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.7-6.2" />
      <path d="M3.5 4v4.5H8" />
      <path d="M12 8v4.5l3 2" />
    </Icon>
  );
}

export function DoorExitIcon(props) {
  return (
    <Icon {...props}>
      <path d="M13.5 3.5H7a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h6.5" />
      <path d="M15 8.5l4 3.5-4 3.5M19 12h-9.5" />
    </Icon>
  );
}

export function TerminalIcon(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9.5l3.5 2.5L7 14.5M12.5 15h4.5" />
    </Icon>
  );
}

export function MegaphoneIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3 10v4a1 1 0 0 0 1 1h2l4.5 3.5v-13L6 9H4a1 1 0 0 0-1 1z" />
      <path d="M15.5 8.5a4 4 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" />
    </Icon>
  );
}
