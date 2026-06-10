// ─── DATA ACCESS LAYER ──────────────────────────────────────────────────
// Single place the UI talks to for data. If Supabase env vars are set, it
// reads live from the DB; otherwise it returns the bundled real player dataset
// (frontend/src/all_players_compact.json) which contains the canonical 1248 players.
//
// Public backend endpoints (via VITE_API_URL) are used for read-only data
// such as fixtures where we want a single source of truth from the scoring pipeline.
// Leaderboard/rosters still prefer Supabase (RLS + live writes).

import { supabase, HAS_SUPABASE } from "./supabase";
import compact from "../all_players_compact.json";
import * as publicApi from "./api";

// The canonical real player data (1248 players). Always prefer this or live DB data.
export const PLAYERS = compact;

// shape used by the UI: {id, n, t, p, c, pr, num, pts?, own?}
export async function getPlayers() {
  if (HAS_SUPABASE) {
    const { data, error } = await supabase
      .from("players")
      .select("id, name, team, position, club, price, number")
      .order("price", { ascending: false });
    if (error) throw error;
    // map DB columns -> UI schema. Extra fields (pts, own) will be enriched from PLAYERS where available.
    return data.map((r) => ({
      id: r.id, n: r.name, t: r.team, p: r.position,
      c: r.club, pr: Number(r.price), num: r.number,
    }));
  }
  return PLAYERS; // real bundled player data
}

export async function getTeams() {
  if (HAS_SUPABASE) {
    const { data, error } = await supabase.from("teams").select("*");
    if (error) throw error;
    return data;
  }
  // Local bundled copy (copied from root data/teams.json at build time for Netlify self-containment)
  const teams = await import("../teams.json");
  return teams.default;
}

export async function getFixtures() {
  // Uses the public backend (/public/fixtures) when VITE_API_URL is set.
  // Returns [] when no backend or on error (UI stays functional).
  try {
    const list = await publicApi.getFixtures();
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.warn("getFixtures via public API failed:", e?.message || e);
    return [];
  }
}

// Leaderboard (public view — PII-safe). Returns [] when no Supabase / no data yet.
export async function getLeaderboard(gameweekId = null) {
  if (!HAS_SUPABASE) return [];
  let q = supabase.from("public_leaderboard").select("*").order("rank", { ascending: true });
  if (gameweekId) q = q.eq("gameweek_id", gameweekId);
  const { data, error } = await q.limit(100);
  if (error) throw error;
  return data;
}

// ── Authenticated writes — routed through the FastAPI backend ────────────
// players: array of {id, pr} (id + price). meta: {name, budget_spent}
export async function saveRoster(userId, players, meta = {}) {
  if (!HAS_SUPABASE) return { demo: true };
  const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
  if (!apiBase) throw new Error("VITE_API_URL non configurato");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Non autenticato: effettua il login.");
  const res = await fetch(`${apiBase}/me/roster`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      players: players.map((p) => p.id),
      name: meta.name,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || `Errore ${res.status}`);
  }
  const data = await res.json();
  // Normalize: callers use r?.id — map roster_id → id
  return { id: data.roster_id, ...data };
}

export async function getMyRoster(userId) {
  if (!HAS_SUPABASE) return null;
  const { data, error } = await supabase
    .from("rosters")
    .select("*, roster_players(player_id)")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ── Lineups (per-gameweek snapshot of starters + subs + captain/vice) ──
// rosterId: uuid (kept for signature compat; server derives it from JWT).
// gameweekId: integer. starters: [playerId,...] (11).
// bench: [playerId,...] (5 = squad − starters, in squad order).
//   → first 3 become subs with bench_order 1/2/3
//   → last 2 are unselected and inferred by the server (not sent)
export async function saveLineup(rosterId, gameweekId, { starters = [], bench = [], captainId = null, viceId = null }) {
  if (!HAS_SUPABASE) return { demo: true };
  const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
  if (!apiBase) throw new Error("VITE_API_URL non configurato");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Non autenticato: effettua il login.");
  const res = await fetch(`${apiBase}/me/lineup/${gameweekId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      starters: starters.map((pid) => ({
        player_id: pid,
        is_captain: pid === captainId,
        is_vice: pid === viceId,
      })),
      subs: bench.slice(0, 3).map((pid, i) => ({
        player_id: pid,
        bench_order: i + 1,
      })),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || `Errore ${res.status}`);
  }
  return res.json();
}

export async function getLineup(rosterId, gameweekId) {
  if (!HAS_SUPABASE) return null;
  const { data, error } = await supabase
    .from("lineups")
    .select("player_id, slot, bench_order, is_captain, is_vice")
    .eq("roster_id", rosterId).eq("gameweek_id", gameweekId)
    .order("bench_order", { ascending: true });
  if (error) throw error;
  if (!data || !data.length) return null;
  return {
    starters: data.filter((r) => r.slot === "starter").map((r) => r.player_id),
    // subs in bench_order (1,2,3) + unselected appended → ricostruisce i 5 di panchina
    bench: [
      ...data
        .filter((r) => r.slot === "sub")
        .sort((a, b) => (a.bench_order ?? 99) - (b.bench_order ?? 99))
        .map((r) => r.player_id),
      ...data
        .filter((r) => r.slot === "unselected")
        .map((r) => r.player_id),
    ],
    captainId: (data.find((r) => r.is_captain) || {}).player_id ?? null,
    viceId: (data.find((r) => r.is_vice) || {}).player_id ?? null,
  };
}

// ── Formation lock / edit window calculator (based on fixtures schedule) ──
// Rules:
// - Unlocked until 20min before first kickoff of the GW.
// - Locked from (first-20m) until (last_match_finish + 1h).
// - last_finish estimated as last_kickoff + ~130min (typical WC match incl. HT/ET/buffer).
// Returns: { locked: bool, canEdit: bool, message: string, countdownMs?: number }
export function computeFormationLock(fixtures = [], gameweekId = 1, now = new Date()) {
  const gwFx = (fixtures || []).filter((f) => (f.gameweek_id ?? f.gameweekId) === gameweekId);

  let kickoffs = gwFx
    .map((f) => f.kickoff_time || f.kickoff_at || f.kickoff)
    .map((t) => (t ? new Date(t) : null))
    .filter((d) => d && !isNaN(d.getTime()));

  if (!kickoffs.length) {
    if (gameweekId === 1) {
      // Fallback kickoff times (no backend / VITE_API_URL): realistic WC2026 GW1 schedule.
      // Ensures lock timers work for preview. Real data from /public/fixtures overrides when present.
      kickoffs = [
        new Date("2026-06-11T13:00:00Z"),
        new Date("2026-06-11T20:00:00Z"),
        new Date("2026-06-12T15:00:00Z"),
        new Date("2026-06-17T20:00:00Z"),
      ];
    } else {
      return { locked: false, canEdit: true, message: "Formations unlocked - you can edit", countdownMs: null };
    }
  }

  const first = new Date(Math.min(...kickoffs.map((d) => d.getTime())));
  const lastKick = new Date(Math.max(...kickoffs.map((d) => d.getTime())));

  const MATCH_DURATION_MIN = 130; // 90 + HT + ET + buffer (conservative for WC)
  const lastFinish = new Date(lastKick.getTime() + MATCH_DURATION_MIN * 60 * 1000);

  const lockAt = new Date(first.getTime() - 20 * 60 * 1000);     // 20 min before first
  const unlockAt = new Date(lastFinish.getTime() + 60 * 60 * 1000); // +1h after last

  const nowTs = now.getTime();

  if (nowTs < lockAt.getTime()) {
    const ms = lockAt.getTime() - nowTs;
    return {
      locked: false,
      canEdit: true,
      message: `Formations lock in ${formatCountdown(ms)}`,
      countdownMs: ms,
      nextEventAt: lockAt,
    };
  }

  if (nowTs < unlockAt.getTime()) {
    const ms = unlockAt.getTime() - nowTs;
    return {
      locked: true,
      canEdit: false,
      message: "Formations are locked until next Gameweek",
      countdownMs: ms,
      nextEventAt: unlockAt,
    };
  }

  // Post-unlock for this GW (after last+1h): unlocked again (prep for next GW)
  return {
    locked: false,
    canEdit: true,
    message: "Formations unlocked - you can edit",
    countdownMs: null,
  };
}

function formatCountdown(ms) {
  if (ms <= 0) return "now";
  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);

  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const seconds = totalSeconds % 60;

  const underOneHour = totalMinutes < 60;

  if (underOneHour) {
    // < 1h: show minutes + seconds (or just seconds)
    if (minutes > 0) return `${minutes}min ${seconds}s`;
    return `${seconds}s`;
  }

  // >= 1h: show days/hours/min (no seconds). Supports realistic GW1 multi-day timers.
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}min`);
  return parts.join(" ");
}

// ─── STATS (World Cup) ───────────────────────────────────────────────────
// All read from the public FastAPI; on failure or no backend, callers get []/{}.
// (No demo/fake data — UI shows "No data available yet" messages when empty.)
export async function getScorers(opts = {}) {
  try { return (await publicApi.getStatScorers(opts)) || []; }
  catch (e) { console.warn("getScorers:", e?.message || e); return []; }
}
export async function getAssists(opts = {}) {
  try { return (await publicApi.getStatAssists(opts)) || []; }
  catch (e) { console.warn("getAssists:", e?.message || e); return []; }
}
export async function getCards(opts = {}) {
  try { return (await publicApi.getStatCards(opts)) || []; }
  catch (e) { console.warn("getCards:", e?.message || e); return []; }
}
export async function getStandings() {
  try { return (await publicApi.getStandings()) || {}; }
  catch (e) { console.warn("getStandings:", e?.message || e); return {}; }
}
export async function getBracket() {
  try { return (await publicApi.getBracket()) || {}; }
  catch (e) { console.warn("getBracket:", e?.message || e); return {}; }
}
export async function getBounties() {
  try { return (await publicApi.getBounties()) || []; }
  catch (e) { console.warn("getBounties:", e?.message || e); return []; }
}

export { HAS_SUPABASE };
