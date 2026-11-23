import { useApiQuery } from "../hooks/useApiQuery";

// Warnings and strikes are separate, and the moderator picks which one an
// offense gets. A warning can go to somebody already on strikes, and a
// strike can be issued with no warnings first. Each kind holds up to
// three active at once.

export const KIND_LABEL = { warning: "Warning", strike: "Strike" };

/** A picked staff member's current counts and the slot each kind would fill. */
export function useDisciplineStanding(discordId) {
  return useApiQuery(["strikes", "person", discordId], discordId && `/strikes/${discordId}`, {
    select: d => ({
      warnings: d.activeWarnings?.length ?? 0,
      strikes: d.active?.length ?? 0,
      nextWarningSlot: d.nextWarningSlot ?? null,
      nextStrikeSlot: d.nextStrikeSlot ?? null,
    }),
  });
}

/** "Warning 2" / "Strike 1" for the chosen kind, or null when that kind is full. */
export function issueLabel(standing, kind) {
  if (!standing) return null;
  const slot = kind === "warning" ? standing.nextWarningSlot : standing.nextStrikeSlot;
  return slot ? `${KIND_LABEL[kind]} ${slot}` : null;
}

export function DisciplineCounts({ warnings, strikes }) {
  return (
    <span className="discipline-counts">
      <span className={`discipline-pill warning${warnings ? "" : " empty"}`}>Warnings {warnings} / 3</span>
      <span className={`discipline-pill strike${strikes ? "" : " empty"}`}>Strikes {strikes} / 3</span>
    </span>
  );
}

/**
 * Warning or Strike, chosen per offense. Behaves as a radio group.
 * `options` narrows the choice, for an Internal Affairs rank that may
 * warn but not strike.
 */
export function DisciplineKindPicker({ value, onChange, options = ["warning", "strike"] }) {
  function onKeyDown(e) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const next = options[(options.indexOf(value) + 1) % options.length];
    onChange(next);
    e.currentTarget.parentElement?.querySelector(`[data-kind="${next}"]`)?.focus();
  }
  return (
    <div className="discipline-kind" role="radiogroup" aria-label="Warning or strike">
      {options.map(kind => (
        <button
          key={kind}
          type="button"
          role="radio"
          data-kind={kind}
          aria-checked={value === kind}
          tabIndex={value === kind ? 0 : -1}
          className={`discipline-kind-option ${kind}${value === kind ? " selected" : ""}`}
          onClick={() => onChange(kind)}
          onKeyDown={onKeyDown}
        >
          {KIND_LABEL[kind]}
        </button>
      ))}
    </div>
  );
}

export default function DisciplinePreview({ query, kind }) {
  if (!query?.data) return null;
  const standing = query.data;
  const label = issueLabel(standing, kind);
  const isThirdStrike = kind === "strike" && standing.nextStrikeSlot === 3;
  return (
    <div className="discipline-preview">
      <DisciplineCounts warnings={standing.warnings} strikes={standing.strikes} />
      <span className="discipline-next">
        {label
          ? <>This will be <strong>{label}</strong>.{isThirdStrike ? " That is their third active strike and goes to the termination or demotion decision." : ""}</>
          : <>They already have 3 active {kind === "warning" ? "warnings" : "strikes"}. Remove one first{kind === "warning" ? ", or issue a strike instead" : ""}.</>}
      </span>
    </div>
  );
}
