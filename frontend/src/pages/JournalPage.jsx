import { useEffect, useState } from "react";
import { getJson, postJson } from "../api";
import { formatDisplayDate, toDateStr } from "../utils";

export default function JournalPage() {
  const [entries, setEntries] = useState([]);
  const [title, setTitle] = useState("");
  const [entry, setEntry] = useState("");

  const load = async () => {
    setEntries(await getJson("/loadJournal"));
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !entry.trim()) return;
    await postJson("/newJournalEntry", {
      title: title.trim(),
      entry: entry.trim(),
      date: toDateStr(new Date())
    });
    setTitle("");
    setEntry("");
    await load();
  };

  return (
    <div className="module-page">
      <div className="module-header">
        <h1>Journal</h1>
      </div>
      <form className="form-card" onSubmit={submit}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Entry title" />
        <textarea value={entry} onChange={(e) => setEntry(e.target.value)} rows={6} placeholder="Write your thoughts..." />
        <button className="btn" type="submit">
          Save Entry
        </button>
      </form>

      <div className="db-card">
        {entries.length === 0 && <p className="no-entries">No journal entries yet.</p>}
        {[...entries].reverse().map((e) => (
          <details className="journal-card" key={`${e.title}-${e.date}-${e.id || "j"}`}>
            <summary className="journal-card-header">
              <h3>{e.title}</h3>
              <span className="journal-date">{formatDisplayDate(e.date)}</span>
            </summary>
            <p className="journal-card-body">{e.entry}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
