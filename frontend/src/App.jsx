import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { authStatus } from "./api";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import JournalPage from "./pages/JournalPage";
import RemindersPage from "./pages/RemindersPage";
import CalendarPage from "./pages/CalendarPage";
import BudgetPage from "./pages/BudgetPage";
import { supabase } from "./utils/supabase";

function ProtectedRoutes() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const status = await authStatus();
        setAuthed(Boolean(status.logged_in));
      } catch {
        setAuthed(false);
      } finally {
        setLoading(false);
      }
    };
    load();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(Boolean(session));
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <p className="no-entries">Checking session...</p>;
  if (!authed) return <Navigate to="/login" replace />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/journal" element={<JournalPage />} />
        <Route path="/reminders" element={<RemindersPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/budget" element={<BudgetPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  const [todos, setTodos] = useState([]);

  useEffect(() => {
    const getTodos = async () => {
      const { data } = await supabase.from("todos").select();
      if (data) setTodos(data);
    };
    getTodos();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<LandingPage todos={todos} />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  );
}
