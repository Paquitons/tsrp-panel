import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import DiscordAvatar from "../components/DiscordAvatar";

export default function Roster() {
  const [staff, setStaff] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/public/staff", { auth: false })
      .then(data => setStaff(data.staff))
      .catch(err => setError(err.message));
  }, []);

  const groups = groupByRank(staff ?? []);

  return (
    <div className="home-page">
      <div className="board-header">
        <Link to="/" className="board-back">&larr; Texas State RP</Link>
        <h1>Staff Roster</h1>
        <p className="muted">Everyone currently on the Texas State RP staff team.</p>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {!staff && !error && <p className="muted">Loading…</p>}

      {staff && groups.map(([rankLabel, members]) => (
        <section className="roster-group" key={rankLabel}>
          <h2>{rankLabel}</h2>
          <div className="roster-grid">
            {members.map(m => (
              <div className="roster-card" key={m.discordId}>
                <DiscordAvatar discordId={m.discordId} avatarHash={m.avatarHash} size={40} />
                <span>{m.username}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// Roster arrives pre-sorted by seniority (see publicShared.getStaffRoster) --
// this just clusters consecutive same-rank entries into their own section
// without re-sorting or otherwise second-guessing that order.
function groupByRank(staff) {
  const groups = [];
  for (const member of staff) {
    const last = groups[groups.length - 1];
    if (last && last[0] === member.rankLabel) {
      last[1].push(member);
    } else {
      groups.push([member.rankLabel, [member]]);
    }
  }
  return groups;
}
