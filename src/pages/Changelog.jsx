import { Link } from "react-router-dom";
import { CHANGELOGS } from "../data/changelogs";
import { colorForIndex } from "../data/changelogColors";
import PublicNav from "../components/PublicNav";

export default function Changelog({ standalone = false }) {
  return (
    <div className={standalone ? "home-page" : "content changelog-page"}>
      {standalone && <PublicNav />}
      <div className="page-header">
        <h1>Changelog</h1>
        <p className="muted">Everything shipped on GSRP, most recent first.</p>
      </div>

      {CHANGELOGS.length === 0 && <p className="muted">No updates yet.</p>}
      <div className="changelog-grid">
        {CHANGELOGS.map((entry, i) => (
          <Link to={`/changelog/${entry.slug}`} className="changelog-card" key={entry.slug}>
            <div className="changelog-thumb" style={{ background: colorForIndex(i) }}>
              <span>v{entry.version}</span>
            </div>
            <div className="changelog-card-body">
              <h3>{entry.title}, v{entry.version}</h3>
              <p className="muted">{entry.date}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
