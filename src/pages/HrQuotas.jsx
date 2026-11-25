import { useState } from "react";
import { formatDuration } from "../utils";
import DiscordIdentity from "../components/DiscordIdentity";
import Tabs from "../components/Tabs";
import Banner from "../components/primitives/Banner";
import Skeleton from "../components/primitives/Skeleton";
import { useApiQuery } from "../hooks/useApiQuery";

const ADMIN_POLL_MS = 15_000;

const FILTERS = [
  { value: "all", label: "Everyone" },
  { value: "met", label: "Met Quota" },
  { value: "not_met", label: "Did Not Meet Quota" },
  { value: "zero", label: "0 Hours" },
  { value: "on_loa", label: "On LOA" },
  { value: "exempt", label: "Quota Exempt" },
];

function matchesFilter(member, filter) {
  if (filter === "met") return member.metQuota;
  if (filter === "not_met") return !member.metQuota && !member.quotaExempt;
  if (filter === "exempt") return member.quotaExempt;
  if (filter === "zero") return member.totalSeconds === 0;
  if (filter === "on_loa") return member.onLoa;
  return true;
}

export default function HrQuotas() {
  const [filter, setFilter] = useState("all");

  const query = useApiQuery(["shifts", "quotas"], "/shifts/quotas", { refetchInterval: ADMIN_POLL_MS });
  const data = query.data;

  if (query.isError) return <Banner style={{ marginTop: 16 }}>{query.error.message}</Banner>;
  if (query.isLoading) return <Skeleton variant="rows" />;

  const filtered = data.staff.filter(m => matchesFilter(m, filter));
  const metCount = data.staff.filter(m => m.metQuota).length;
  // Quota Exempt staff who are short are neither met nor missed.
  const exemptShortCount = data.staff.filter(m => m.quotaExempt && !m.metQuota).length;
  const notMetCount = data.staff.length - metCount - exemptShortCount;
  const exemptCount = data.staff.filter(m => m.quotaExempt).length;

  return (
    <>
      <p className="muted card-subtitle">
        On-duty time for the same period as the shift leaderboard{data.lastReset ? ` (since it was last reset)` : ` (all time, since the leaderboard has never been reset)`}, against a {data.quotaHours}-hour quota, or {data.iaQuotaHours} hours for Internal Affairs. Every current staff member appears here, even with 0 hours.
      </p>

      <div className="card-grid" style={{ marginTop: 8 }}>
        <div className="stat-tile"><div className="muted">Staff</div><div className="verification-identity-name">{data.staff.length}</div></div>
        <div className="stat-tile"><div className="muted">Met Quota</div><div className="verification-identity-name loa-status-approved">{metCount}</div></div>
        <div className="stat-tile"><div className="muted">Did Not Meet Quota</div><div className="verification-identity-name loa-status-denied">{notMetCount}</div></div>
        {exemptCount > 0 && <div className="stat-tile"><div className="muted">Quota Exempt</div><div className="verification-identity-name">{exemptCount}</div></div>}
      </div>

      <div style={{ marginTop: 16 }}>
        <Tabs tabs={FILTERS} active={filter} onChange={setFilter} />
      </div>

      <div className="loa-list" style={{ marginTop: 12 }}>
        {filtered.map(member => {
          // Each row carries its own quota: Internal Affairs has a
          // lower one, so a single shared figure would draw their bars
          // against the wrong target.
          const quotaSeconds = member.quotaHours * 3600;
          const percent = quotaSeconds > 0 ? Math.min(100, Math.round((member.totalSeconds / quotaSeconds) * 100)) : 100;
          return (
            <div className="loa-card" key={member.discordId}>
              <div className="loa-card-top loa-card-top-stack">
                <DiscordIdentity
                  variant="row"
                  nickname={member.nickname} username={member.username}
                  discordId={member.discordId} avatarHash={member.avatarHash}
                  size={26}
                />
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {member.onLoa && <span className="badge loa-status-pending">On LOA</span>}
                  {member.quotaExempt && !member.metQuota
                    ? <span className="badge">Quota Exempt</span>
                    : (
                      <span className={`badge ${member.metQuota ? "loa-status-approved" : "loa-status-denied"}`}>
                        {member.metQuota ? "Met Quota" : "Did Not Meet Quota"}
                      </span>
                    )}
                </div>
              </div>
              <div className="log-card-field">
                {formatDuration(member.totalSeconds)} / {member.quotaHours}h
              </div>
              <div className="quota-progress-track">
                <div
                  className={`quota-progress-fill ${member.metQuota ? "quota-progress-met" : ""}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="muted">No staff match this filter.</p>}
      </div>
    </>
  );
}
