import { useState } from "react";
import { formatDuration } from "../utils";
import DiscordIdentity from "../components/DiscordIdentity";
import Tabs from "../components/Tabs";
import Banner from "../components/primitives/Banner";
import { useApiQuery } from "../hooks/useApiQuery";

const ADMIN_POLL_MS = 15_000;

const FILTERS = [
  { value: "all", label: "Everyone" },
  { value: "met", label: "Met Quota" },
  { value: "not_met", label: "Did Not Meet Quota" },
  { value: "zero", label: "0 Hours" },
  { value: "on_loa", label: "On LOA" },
];

function matchesFilter(member, filter) {
  if (filter === "met") return member.metQuota;
  if (filter === "not_met") return !member.metQuota;
  if (filter === "zero") return member.totalSeconds === 0;
  if (filter === "on_loa") return member.onLoa;
  return true;
}

export default function HrQuotas() {
  const [filter, setFilter] = useState("all");

  const query = useApiQuery(["shifts", "quotas"], "/shifts/quotas", { refetchInterval: ADMIN_POLL_MS });
  const data = query.data;

  if (query.isError) return <Banner style={{ marginTop: 16 }}>{query.error.message}</Banner>;
  if (query.isLoading) return <p className="muted" style={{ marginTop: 16 }}>Loading…</p>;

  const quotaSeconds = data.quotaHours * 3600;
  const filtered = data.staff.filter(m => matchesFilter(m, filter));
  const metCount = data.staff.filter(m => m.metQuota).length;

  return (
    <>
      <p className="muted card-subtitle">
        On-duty time for the same period as the shift leaderboard{data.lastReset ? ` (since it was last reset)` : ` (all-time -- the leaderboard has never been reset)`}, against a {data.quotaHours}-hour quota. Every current staff member appears here, even with 0 hours.
      </p>

      <div className="card-grid" style={{ marginTop: 8 }}>
        <div className="stat-tile"><div className="muted">Staff</div><div className="verification-identity-name">{data.staff.length}</div></div>
        <div className="stat-tile"><div className="muted">Met Quota</div><div className="verification-identity-name loa-status-approved">{metCount}</div></div>
        <div className="stat-tile"><div className="muted">Did Not Meet Quota</div><div className="verification-identity-name loa-status-denied">{data.staff.length - metCount}</div></div>
      </div>

      <div style={{ marginTop: 16 }}>
        <Tabs tabs={FILTERS} active={filter} onChange={setFilter} />
      </div>

      <div className="loa-list" style={{ marginTop: 12 }}>
        {filtered.map(member => {
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
                  <span className={`badge ${member.metQuota ? "loa-status-approved" : "loa-status-denied"}`}>
                    {member.metQuota ? "Met Quota" : "Did Not Meet Quota"}
                  </span>
                </div>
              </div>
              <div className="log-card-field">
                {formatDuration(member.totalSeconds)} / {data.quotaHours}h
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
