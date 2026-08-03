import { Link } from "react-router-dom";
import { CHANGELOGS } from "../data/changelogs";
import { colorForIndex } from "../data/changelogColors";

export default function Changelog({ standalone = false }) {
  return (
    <div className={`content changelog-page ${standalone ? "standalone-content" : ""}`}>
      <div className="page-header">
        <h1>Changelog</h1>
        <p className="muted">Everything shipped on TSRP, most recent first.</p>
      </div>

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
