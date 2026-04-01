import { useEffect, useMemo, useState } from "react";
import { getJson, postJson } from "../api";
import { formatDisplayDate } from "../utils";

const emptyForm = { name: "", date: "", recurrence: "none" };

export default function RemindersPage() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setList(await getJson("/loadData"));
  };

  useEffect(() => {
    load();
  }, []);

  const active = useMemo(() => list.filter((r) => !r.completed), [list]);
  const completed = useMemo(() => list.filter((r) => r.completed), [list]);

  const addReminder = async (e) => {
    e.preventDefault();
    if (!form.name || !form.date) return;
    await postJson("/newReminder", form);
    setForm(emptyForm);
    await load();
  };

  const completeReminder = async (id) => {
    await postJson("/completeReminder", { id });
    await load();
  };

  const deleteReminder = async (id) => {
    await postJson("/deleteReminder", { id });
    await load();
  };

  return (
    <div className="module-page">
      <div className="module-header">
        <h1>Reminders</h1>
      </div>

      <form className="form-card" onSubmit={addReminder}>
        <input
          placeholder="Task name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        <select
          value={form.recurrence}
          onChange={(e) => setForm({ ...form, recurrence: e.target.value })}
        >
          <option value="none">One-time</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        <button className="btn" type="submit">
          Add Reminder
        </button>
      </form>

      <div className="db-card">
        <h3>Active</h3>
        {active.length === 0 && <p className="no-entries">No active reminders.</p>}
        {active.map((r) => (
          <div className="completed-item" key={r.id}>
            <span>
              <strong>{r.name || r.text}</strong> - {formatDisplayDate(r.date)}
            </span>
            <span>
              <button type="button" className="btn-sm btn-complete" onClick={() => completeReminder(r.id)}>
                Complete
              </button>
              <button type="button" className="btn-sm btn-delete" onClick={() => deleteReminder(r.id)}>
                Delete
              </button>
            </span>
          </div>
        ))}
      </div>

      <div className="db-card">
        <h3>Completed</h3>
        {completed.length === 0 && <p className="no-entries">Nothing completed yet.</p>}
        {completed.map((r) => (
          <div className="completed-item" key={r.id}>
            <span>{r.name || r.text}</span>
            <span>{formatDisplayDate(r.completedDate || r.date)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
