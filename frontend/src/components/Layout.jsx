import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout } from "../api";

export default function Layout() {
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink to="/dashboard" className="header-logo">
          <h1>
            <i className="fa-solid fa-calendar-check" /> Planner
          </h1>
        </NavLink>
        <nav className="desktop-nav">
          <NavLink to="/dashboard">
            <i className="fa-solid fa-house" /> Dashboard
          </NavLink>
          <NavLink to="/journal">
            <i className="fa-solid fa-book" /> Journal
          </NavLink>
          <NavLink to="/reminders">
            <i className="fa-solid fa-list-check" /> Tasks
          </NavLink>
          <NavLink to="/calendar">
            <i className="fa-solid fa-calendar-days" /> Calendar
          </NavLink>
          <NavLink to="/budget">
            <i className="fa-solid fa-wallet" /> Budget
          </NavLink>
          <button type="button" className="logout-btn" onClick={onLogout}>
            <i className="fa-solid fa-right-from-bracket" />{" "}
            Logout
          </button>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="app-footer">
        <p>&copy; 2026 Scott Adams. Built for productivity.</p>
      </footer>
    </div>
  );
}
