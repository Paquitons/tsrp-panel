// Source of truth is changelogs.json (a plain JSON array, newest entry
// first) so the release tooling in highrock-bot/scripts/releaseChangelog.js
// can prepend a new entry programmatically without parsing JS.
import entries from "./changelogs.json";

export const CHANGELOGS = entries;
