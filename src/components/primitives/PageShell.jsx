// Unifies the page-level wrapper, which had drifted into three shapes:
// public pages use "home-page", authenticated pages use "content" +
// a separate "page-header" div around the <h1>, and a few pages skip the
// header wrapper entirely. `variant` picks the right outer class;
// `title`/`actions` build the header row so pages stop hand-rolling
// `<div className="page-header"><h1>...</h1></div>` themselves.
const VARIANT_CLASS = {
  authenticated: "content",
  public: "home-page",
};

export default function PageShell({ variant = "authenticated", title, actions, className = "", children }) {
  return (
    <div className={`${VARIANT_CLASS[variant] ?? VARIANT_CLASS.authenticated} ${className}`.trim()}>
      {title && (
        <div className="page-header">
          <h1>{title}</h1>
          {actions && <div className="button-row">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
