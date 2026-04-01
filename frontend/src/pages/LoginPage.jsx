import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authStatus, login } from "../api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    authStatus()
      .then((status) => {
        if (status.logged_in) navigate("/dashboard");
      })
      .catch(() => undefined);
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const result = await login(email);
      if (result.logged_in) navigate("/dashboard");
      setInfo("Magic link sent. Check your email and open the login link.");
    } catch (err) {
      const message = String(err?.message || "");
      if (
        message.includes("Invalid login credentials")
      ) {
        setError("Use a valid email address.");
      } else if (
        message.includes("VITE_API_BASE_URL is not configured") ||
        message.includes("Failed to fetch") ||
        message.includes("NetworkError") ||
        message.includes("Unable to connect")
      ) {
        setError("Cannot reach Supabase auth. Check VITE_SUPABASE_URL and key in .env.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2>Planner Login</h2>
        <form onSubmit={submit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          {info && <p className="success-message">{info}</p>}
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Sending link..." : "Send Magic Link"}
          </button>
        </form>
      </div>
    </div>
  );
}
