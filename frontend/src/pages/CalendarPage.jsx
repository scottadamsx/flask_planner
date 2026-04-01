import { useEffect, useMemo, useState } from "react";
import { getJson, postJson } from "../api";
import { expandReminders, toDateStr } from "../utils";

function monthLabel(year, month) {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [reminders, setReminders] = useState([]);
  const [events, setEvents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const load = async () => {
    const [r, e, t] = await Promise.all([getJson("/loadData"), getJson("/loadEvents"), getJson("/loadTransactions")]);
    setReminders(r);
    setEvents(e);
    setTransactions(t);
  };

  useEffect(() => {
    load();
  }, []);

  const itemsByDate = useMemo(() => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const expanded = expandReminders(reminders, toDateStr(first), toDateStr(last));
    const map = {};

    expanded.forEach((item) => {
      map[item.date] = map[item.date] || [];
      map[item.date].push({ kind: "reminder", label: item.name || item.text });
    });
    events.forEach((item) => {
      map[item.date] = map[item.date] || [];
      map[item.date].push({ kind: "event", label: item.title });
    });
    transactions.filter((t) => t.type === "future").forEach((item) => {
      map[item.date] = map[item.date] || [];
      map[item.date].push({ kind: "future", label: item.description });
    });
    return map;
  }, [year, month, reminders, events, transactions]);

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDayIndex; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);

  const openAddEvent = (day) => {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(date);
  };

  const saveEvent = async () => {
    if (!selectedDate || !title.trim()) return;
    await postJson("/newEvent", { title: title.trim(), description: description.trim(), date: selectedDate });
    setSelectedDate("");
    setTitle("");
    setDescription("");
    await load();
  };

  return (
    <div className="module-page">
      <div className="module-header">
        <h1>Calendar</h1>
        <div>
          <button className="btn-sm btn-secondary" onClick={() => (month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1))}>
            Prev
          </button>
          <button className="btn-sm btn-secondary" onClick={() => (month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1))}>
            Next
          </button>
        </div>
      </div>

      <div className="db-card">
        <h3>{monthLabel(year, month)}</h3>
        <div className="calendar-grid-react">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((name) => (
            <div key={name} className="calendar-day-name">
              {name}
            </div>
          ))}
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} className="calendar-cell empty" />;
            const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            return (
              <button key={date} type="button" className="calendar-cell" onClick={() => openAddEvent(day)}>
                <span className="day-number">{day}</span>
                {(itemsByDate[date] || []).slice(0, 3).map((item, idx) => (
                  <span key={`${date}-${idx}`} className={`calendar-item ${item.kind}-item`}>
                    {item.label}
                  </span>
                ))}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="event-overlay" onClick={(e) => e.target.className === "event-overlay" && setSelectedDate("")}>
          <div className="event-card">
            <h3>Add Event - {selectedDate}</h3>
            <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="budget-widget-actions">
              <button className="btn" onClick={saveEvent}>
                Save
              </button>
              <button className="btn btn-secondary" onClick={() => setSelectedDate("")}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
