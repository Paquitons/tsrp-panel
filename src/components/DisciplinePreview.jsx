import { useApiQuery } from "../hooks/useApiQuery";

// Discipline runs Warning 1, 2, 3, then Strike 1, 2, 3. Issuing always
// gives the next step, so before anyone presses the button this shows
// which step that is and where the person stands now.

/** "Warning 2", "Strike 1", or null when they are already at 3 strikes. */
export function stepLabel(step) {
  if (!step) return null;
  return `${step.kind === "warning" ? "Warning" : "Strike"} ${step.slot}`;
}

/** Fetches the next step for a picked staff member. */
export function useNextStep(discordId) {
  return useApiQuery(["strikes", "person", discordId], discordId && `/strikes/${discordId}`, {
    select: d => ({
      nextStep: d.nextStep ?? null,
      warnings: d.activeWarnings?.length ?? 0,
      strikes: d.active?.length ?? 0,
    }),
  });
}

export function DisciplineCounts({ warnings, strikes }) {
  return (
    <span className="discipline-counts">
      <span className={`discipline-pill warning${warnings ? "" : " empty"}`}>Warnings {warnings} / 3</span>
      <span className={`discipline-pill strike${strikes ? "" : " empty"}`}>Strikes {strikes} / 3</span>
    </span>
  );
}

export default function DisciplinePreview({ query }) {
  if (!query?.data) return null;
  const { nextStep, warnings, strikes } = query.data;
  return (
    <div className="discipline-preview">
      <DisciplineCounts warnings={warnings} strikes={strikes} />
      <span className="discipline-next">
        {nextStep
          ? <>Issuing now gives them <strong>{stepLabel(nextStep)}</strong>.{nextStep.kind === "strike" && nextStep.slot === 3 ? " This is their third strike and goes to the termination or demotion decision." : ""}</>
          : <>They already have 3 active strikes. Remove one before issuing another.</>}
      </span>
    </div>
  );
}
