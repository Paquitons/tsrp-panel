// One component for the "bordered box, page background, subtle shadow"
// look that had drifted into ~6 near-identical CSS classes (.card,
// .board-card, .home-stat-tile, .roster-leader-card, .econ-link-card,
// .changelog-card) with slightly different padding/radius/shadow values
// by accident of history rather than intent. `variant` maps to the
// existing class so current visual identity is preserved exactly --
// this consolidates the *component*, not a redesign of how any of them
// look.
const VARIANT_CLASS = {
  default: "card",
  board: "board-card",
  stat: "home-stat-tile",
  leader: "roster-leader-card",
  link: "econ-link-card",
};

export default function Card({ variant = "default", as: Tag = "div", className = "", children, ...rest }) {
  return (
    <Tag className={`${VARIANT_CLASS[variant] ?? VARIANT_CLASS.default} ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}
