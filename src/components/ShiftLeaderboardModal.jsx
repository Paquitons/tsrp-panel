import DiscordAvatar from "./DiscordAvatar";
import { formatDuration } from "../utils";

export default function ShiftLeaderboardModal({
  leaderboard,
  leaderboardResetAt,
  onDutyStaff,
  canManage,
  resetting,
  onReset,
  forceEndingId,
  onForceEnd,
  onClose,
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal leaderboard-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title-row">
          <h2>Shift Leaderboard</h2>
          <div className="button-row">
            {canManage && (
              <button className="secondary small" onClick={onReset} disabled={resetting}>
                {resetting ? "Resetting…" : "Reset"}
              </button>
            )}
            <button className="secondary small" onClick={onClose}>Close</button>
          </div>
        </div>

        {leaderboardResetAt && (
          <p className="modal-subheading">Since {new Date(leaderboardResetAt).toLocaleDateString()}</p>
        )}

        {leaderboard.length === 0 ? (
          <p className="muted">No shift activity yet this period.</p>
        ) : (
          <div className="leaderboard-list">
            {leaderboard.map((row, idx) => {
              const isActive = onDutyStaff.some(s => s.discordId === row.discord_id);
              const name = row.staff_username ?? row.discord_id;
              const canEnd = canManage && isActive;
              return (
                <div key={row.discord_id} className="leaderboard-row">
                  <span className="leaderboard-rank">#{idx + 1}</span>
                  <DiscordAvatar discordId={row.discord_id} avatarHash={row.staff_avatar_hash} size={28} />
                  <span className="leaderboard-name">{name}</span>
                  <span className="leaderboard-stat muted">
                    {formatDuration(row.totalSeconds)} · {row.shiftCount} shift{row.shiftCount === 1 ? "" : "s"}
                  </span>
                  {canEnd && (
                    <button
                      className="btn-red small leaderboard-end-btn"
                      onClick={() => onForceEnd(row.discord_id, name)}
                      disabled={forceEndingId === row.discord_id}
                    >
                      {forceEndingId === row.discord_id ? "Ending…" : "End Shift"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
