// Unifies the five hand-rolled variants of "colored box with a message"
// that had drifted across the panel (.error-banner / .success-banner used
// directly and inconsistently, plus ad hoc inline-styled equivalents) into
// one component with a `variant` prop. Also the first place any of these
// carried an ARIA role -- error/warning are `role="alert"` (interrupts a
// screen reader immediately, appropriate for something that just went
// wrong), success/info are the calmer `role="status"`.
const VARIANT_CLASS = {
  error: "error-banner",
  warning: "warning-banner",
  success: "success-banner",
  info: "info-banner",
};

const VARIANT_ROLE = {
  error: "alert",
  warning: "alert",
  success: "status",
  info: "status",
};

export default function Banner({ variant = "error", children, className = "", ...rest }) {
  return (
    <div
      className={`${VARIANT_CLASS[variant] ?? VARIANT_CLASS.error} ${className}`.trim()}
      role={VARIANT_ROLE[variant] ?? "status"}
      {...rest}
    >
      {children}
    </div>
  );
}
