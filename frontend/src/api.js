import { supabase } from "./utils/supabase";

const jsonHeaders = { "Content-Type": "application/json" };
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
const apiBaseUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

function buildUrl(path) {
  if (!path) return apiBaseUrl;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

async function request(url, options = {}) {
  if (!apiBaseUrl) {
    throw new Error("VITE_API_BASE_URL is not configured");
  }
  const response = await fetch(buildUrl(url), {
    credentials: "include",
    ...options
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response;
}

export async function getJson(url) {
  const response = await request(url);
  return response.json();
}

export async function postJson(url, body) {
  await request(url, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(body)
  });
}

export async function authStatus() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return { logged_in: Boolean(data.session) };
}

export async function login(email) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/dashboard`
    }
  });
  if (error) throw error;
  return { logged_in: Boolean(data?.session), magic_link_sent: true };
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
