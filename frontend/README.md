# Planner React Frontend

## Backend setup

Create `frontend/.env` with:

`VITE_API_BASE_URL=https://your-backend-domain.com`
`VITE_SUPABASE_URL=https://your-project.supabase.co`
`VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_anon_or_publishable_key`

You can copy `frontend/env.sample` as a starting point.

## Run

In `frontend`:

- `npm install`
- `npm run dev`

App runs on `http://localhost:5173` and calls your backend using `VITE_API_BASE_URL`.

## Login

Login uses Supabase magic links (email). Enter your email on `/login`, then click the link sent to your inbox.
