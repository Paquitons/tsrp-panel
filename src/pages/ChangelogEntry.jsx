import { Link, useParams } from "react-router-dom";
import { CHANGELOGS } from "../data/changelogs";

export default function ChangelogEntry() {
  const { slug } = useParams();
  const entry = CHANGELOGS.find(e => e.slug === slug);

  if (!entry) {
    return (
      <div className="changelog-page">
        <p>That changelog entry doesn't exist.</p>
        <Link to="/changelog">&larr; Back to changelog</Link>
      </div>
    );
  }

  return (
    <div className="changelog-page">
      <Link to="/changelog" className="muted changelog-back-link">&larr; All changelog posts</Link>

      <img src={entry.image} alt="" className="changelog-entry-banner" />

      <div className="page-header">
        <h1>{entry.title}, v{entry.version}</h1>
        <p className="muted">{entry.date}</p>
      </div>

      <div className="card">
        <p>{entry.summary}</p>

        {entry.sections.map(section => (
          <div key={section.heading} style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: "var(--text-base)", marginBottom: 8 }}>{section.heading}</h3>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {section.items.map((item, i) => (
                <li key={i} style={{ marginBottom: 6 }}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
