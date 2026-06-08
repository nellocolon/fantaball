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
    if (path.includes("/standings")) return {};
    if (path.includes("/bracket")) return {};
    if (path.includes("/stats/")) return [];
    if (path.includes("/bounties")) return [];
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

// ─── STATS (World Cup) ───────────────────────────────────────────────────
// gw optional (filter by gameweek), nation optional (3-letter code)
export async function getStatScorers({ gw = null, nation = null, limit = 50 } = {}) {
  const p = { limit }; if (gw) p.gw = gw; if (nation) p.nation = nation;
  return get("/public/stats/scorers", p);     // [{player_id,name,team,club,value}]
}
export async function getStatAssists({ gw = null, nation = null, limit = 50 } = {}) {
  const p = { limit }; if (gw) p.gw = gw; if (nation) p.nation = nation;
  return get("/public/stats/assists", p);
}
export async function getStatCards({ gw = null, nation = null, type = null, limit = 50 } = {}) {
  const p = { limit }; if (gw) p.gw = gw; if (nation) p.nation = nation; if (type) p.type = type;
  return get("/public/stats/cards", p);        // [{player_id,name,team,club,yellow,red}]
}
export async function getStandings() {
  return get("/public/standings");             // {A:[{team,played,won,drawn,lost,gf,ga,gd,points}], ...}
}
export async function getBracket() {
  return get("/public/bracket");               // {"Round of 32":[{home,away,home_score,away_score,pens,done}], ...}
}
export async function getBounties() {
  return get("/public/bounties");              // [{id,cat,title,descr,reward_sol,deliver,go_url,active}]
}

export const API_URL = API_BASE || null;
