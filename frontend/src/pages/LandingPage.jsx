import { Link } from "react-router-dom";

export default function LandingPage({ todos = [] }) {
  return (
    <div className="landing">
      <div className="landing-orb landing-orb-1" />
      <div className="landing-orb landing-orb-2" />
      <div className="landing-orb landing-orb-3" />
      <nav className="landing-nav">
        <span className="landing-logo">Scott Adams</span>
        <div className="landing-nav-links">
          <a href="#about">About</a>
          <a href="#work">Work</a>
          <a href="#contact">Contact</a>
          <Link to="/login" className="landing-nav-cta">
            Sign In
          </Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-inner">
          <p className="landing-badge">Available for opportunities</p>
          <h1>
            Builder. Creator.
            <br />
            Product Engineer.
          </h1>
          <p>
            I build software, launch products, and solve problems. Turning ideas into real things that
            work.
          </p>
          <div className="landing-metrics">
            <div>
              <strong>4+</strong>
              <span>products built</span>
            </div>
            <div>
              <strong>13+</strong>
              <span>weekly hikes hosted</span>
            </div>
            <div>
              <strong>100%</strong>
              <span>owner-operator mindset</span>
            </div>
          </div>
          <div className="landing-actions">
            <a href="#work" className="btn">
              See My Work
            </a>
            <Link to="/login" className="btn btn-secondary">
              Open Planner
            </Link>
          </div>
        </div>
      </section>

      <section id="about" className="landing-section">
        <h2>About</h2>
        <p>
          I am an entrepreneur and developer who loves building things from scratch. I work across the
          full stack and focus on useful, clean products.
        </p>
        <div className="landing-skill-row">
          <span>Python</span>
          <span>Flask</span>
          <span>React</span>
          <span>Product Strategy</span>
          <span>Design Systems</span>
          <span>Growth</span>
        </div>
      </section>

      <section id="work" className="landing-section">
        <h2>Work</h2>
        <div className="landing-cards">
          <article className="landing-card">
            <h3>Never86</h3>
            <p>Restaurant management platform for day-to-day operations.</p>
          </article>
          <article className="landing-card">
            <h3>St. John&apos;s Hike Club</h3>
            <p>Community organization focused on weekly hikes and local trail culture.</p>
          </article>
          <article className="landing-card">
            <h3>My Planner</h3>
            <p>Task, journal, calendar, and budgeting app built full stack.</p>
          </article>
        </div>
      </section>

      <section id="contact" className="landing-section">
        <div className="landing-contact-card">
          <h2>Let&apos;s Build Something Real</h2>
          <p>For startup ideas, product design, or engineering collaborations.</p>
          <a className="btn" href="mailto:scott@example.com">
            Send Email
          </a>
        </div>
      </section>

      <section className="landing-section">
        <h2>Live Todos (Supabase)</h2>
        <div className="landing-cards">
          {todos.length === 0 ? (
            <article className="landing-card">
              <p>No todos found yet.</p>
            </article>
          ) : (
            todos.map((todo) => (
              <article className="landing-card" key={todo.id}>
                <h3>{todo.name || `Todo #${todo.id}`}</h3>
              </article>
            ))
          )}
        </div>
      </section>

      <footer className="landing-footer">&copy; 2026 Scott Adams. Built with care.</footer>
    </div>
  );
}
