import { CHANGELOGS } from "../data/changelogs";

export default function Changelog() {
  return (
    <div className="changelog-page">
      <div className="page-header">
        <h1>Changelog</h1>
        <p className="muted">Everything shipped on TSRP, most recent first.</p>
      </div>

      {CHANGELOGS.map(entry => (
        <div className="card" key={entry.version} id={`v${entry.version}`}>
          <h2>{entry.title}, v{entry.version}</h2>
          <p className="muted" style={{ marginTop: -4, marginBottom: 12 }}>{entry.date}</p>
          <p>{entry.summary}</p>

          {entry.sections.map(section => (
            <div key={section.heading} style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: "var(--text-base)", marginBottom: 8 }}>{section.heading}</h3>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {section.items.map((item, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
