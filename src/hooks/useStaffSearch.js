import { useRef, useState } from "react";
import { apiFetch } from "../api";

/**
 * @param {string} endpoint     Search endpoint (defaults to the staff table).
 * @param {string} responseKey  Key holding the results array in the response.
 */
export function useStaffSearch(endpoint = "/staff/search", responseKey = "staff") {
  const [target, setTarget] = useState(null); // { discordId, username, avatarHash, nickname, rank }
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  function onQueryChange(value) {
    setQuery(value);
    setTarget(null);
    clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await apiFetch(`${endpoint}?q=${encodeURIComponent(value)}`);
        const results = data[responseKey];
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch { setSuggestions([]); }
    }, 250);
  }

  function pick(member) {
    setTarget(member);
    setQuery(member.nickname ?? member.username);
    setShowSuggestions(false);
  }

  function reset() {
    setTarget(null);
    setQuery("");
    setSuggestions([]);
  }

  return { target, query, suggestions, showSuggestions, inputRef, onQueryChange, pick, reset, setShowSuggestions };
}
