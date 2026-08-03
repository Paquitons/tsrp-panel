import { Link, useParams } from "react-router-dom";
import { CHANGELOGS } from "../data/changelogs";
import { colorForIndex } from "../data/changelogColors";

export default function ChangelogEntry({ standalone = false }) {
  const { slug } = useParams();
  const index = CHANGELOGS.findIndex(e => e.slug === slug);
  const entry = CHANGELOGS[index];
  const wrapClass = `content changelog-page changelog-entry-page ${standalone ? "standalone-content" : ""}`;

  if (!entry) {
    return (
      <div className={wrapClass}>
        <p>That changelog entry doesn't exist.</p>
        <Link to="/changelog">&larr; Back to changelog</Link>
      </div>
    );
  }

  return (
    <div className={wrapClass}>
      <Link to="/changelog" className="muted changelog-back-link">&larr; All changelog posts</Link>

      <div className="changelog-entry-banner" style={{ background: colorForIndex(index) }}>
        <span>v{entry.version}</span>
      </div>

      <div className="page-header">
        <h1>{entry.title}, v{entry.version}</h1>
        <p className="muted">{entry.date}</p>
      </div>

      <div className="card">
        <p>{entry.summary}</p>

        {entry.sections.map(section => (
          <div className="changelog-section" key={section.heading}>
            <h3>{section.heading}</h3>
            <ul>
              {section.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
