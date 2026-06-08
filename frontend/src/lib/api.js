// ─── PUBLIC API CLIENT ──────────────────────────────────────────────────
// Thin wrapper around the deployed public FastAPI (Railway).
// Base URL comes from VITE_API_URL (set in Netlify env or .env).
// All endpoints under /public/* are read-only and CORS-open (*).

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

async function get(path, params = {}) {
  if (!API_BASE) {
    // No backend configured → return safe empty shapes the callers expect
    if (path.includes("/fixtures")) return [];
    if (path.includes("/leaderboard")) return { gameweek: null, rows: [] };
    if (path.includes("/stream/state")) return { coaches: null, squads: null, owns: [], caps: [] };
    return null;
  }
  const usp = new URLSearchParams(params);
  const qs = usp.toString() ? `?${usp}` : "";
  const res = await fetch(`${API_BASE}${path}${qs}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${path} ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function getFixtures() {
  // Returns array of {id, gameweek_id, home_team, away_team, kickoff_time, status, home_score, away_score, venue}
  return get("/public/fixtures");
}

export async function getPublicLeaderboard(gameweekId = null) {
  const params = gameweekId ? { gw: gameweekId } : {};
  return get("/public/leaderboard", params); // {gameweek, rows: [...]}
}

export async function getMatchdayTop(gw, limit = 10) {
  return get(`/public/matchday/${gw}/top`, { limit });
}

export async function getUserGameweekScore(handle, gw) {
  return get(`/public/user/${encodeURIComponent(handle)}/gameweek/${gw}`);
}

export async function getUserRank(handle) {
  return get(`/public/user/${encodeURIComponent(handle)}/rank`);
}

export async function getStreamState() {
  return get("/public/stream/state");
}

export const API_URL = API_BASE || null;
