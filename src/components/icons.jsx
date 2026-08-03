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
