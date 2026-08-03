import { Link } from "react-router-dom";
import { CHANGELOGS } from "../data/changelogs";

export default function Changelog() {
  return (
    <div className="changelog-page">
      <div className="page-header">
        <h1>Changelog</h1>
        <p className="muted">Everything shipped on TSRP, most recent first.</p>
      </div>

      <div className="changelog-grid">
        {CHANGELOGS.map(entry => (
          <Link to={`/changelog/${entry.slug}`} className="changelog-card" key={entry.slug}>
            <img src={entry.image} alt="" className="changelog-thumb" />
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
