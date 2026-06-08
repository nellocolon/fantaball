// ─── AUTH SCAFFOLD ──────────────────────────────────────────────────────
// Login with X (Twitter) via Supabase Auth, plus Solana wallet linking.
// This wires the *logic*; before it works end-to-end you must:
//   1. In Supabase → Authentication → Providers → enable Twitter/X, paste the
//      X app's Client ID + Secret (create the app at developer.x.com).
//   2. Set the redirect URL to your site (e.g. https://fantaball.tech).
// Until then HAS_SUPABASE is false and these functions are safe no-ops.
//
// On a successful session we set window.__FTB_USER = { id, handle, wallet }
// which App.jsx already reads to turn on roster/lineup sync.

import { supabase, HAS_SUPABASE } from "./supabase";

// keep listeners so the app can react to login/logout
const listeners = new Set();
export function onAuthChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(user) { for (const fn of listeners) { try { fn(user); } catch (e) {} } }

function setSessionUser(user) {
  if (typeof window !== "undefined") window.__FTB_USER = user || null;
  emit(user);
}

// ── X OAuth 2.0 via Supabase ──
// Supabase's provider key for X OAuth 2.0 is "x" (not "twitter", which is the
// legacy OAuth 1.0a provider being deprecated).
export async function signInWithX() {
  if (!HAS_SUPABASE) { console.warn("Auth disabled (no Supabase env)"); return null; }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "x",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
  return data; // browser redirects to X; session resolves on return
}

export async function signOut() {
  if (HAS_SUPABASE) { try { await supabase.auth.signOut(); } catch (e) {} }
  setSessionUser(null);
}

// Ensure a row exists in our `users` table for the authenticated session,
// keyed by auth.uid() so the RLS owner-checks (05_rls.sql) line up.
async function ensureUserRow(authUser) {
  if (!HAS_SUPABASE || !authUser) return null;
  const meta = authUser.user_metadata || {};
  const handle = meta.user_name || meta.preferred_username || meta.name || null;
  const payload = {
    id: authUser.id,                 // == auth.uid() → satisfies RLS
    x_handle: handle,
    x_id: meta.provider_id || meta.sub || null,
    display_name: meta.full_name || meta.name || handle,
  };
  const { data, error } = await supabase
    .from("users").upsert(payload, { onConflict: "id" }).select("id, x_handle, wallet").single();
  if (error) { console.warn("ensureUserRow:", error.message); return null; }
  // find (or rely on) the user's roster id for lineup writes
  let rosterId = null;
  const { data: r } = await supabase
    .from("rosters").select("id").eq("user_id", data.id).maybeSingle();
  rosterId = r?.id || null;
  return { id: data.id, handle: data.x_handle, wallet: data.wallet || null, rosterId };
}

// Call once on app start: picks up an existing session and subscribes.
export async function initAuth() {
  if (!HAS_SUPABASE) return null;
  const { data } = await supabase.auth.getSession();
  let user = null;
  if (data?.session?.user) {
    user = await ensureUserRow(data.session.user);
    if (user?.id) {
      const linked = await tryLinkPendingWallet(user.id);
      if (linked) user = { ...user, wallet: linked };
    }
    setSessionUser(user);
  }
  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      let u = await ensureUserRow(session.user);
      if (u?.id) {
        const linked = await tryLinkPendingWallet(u.id);
        if (linked) u = { ...u, wallet: linked };
      }
      setSessionUser(u);
    } else {
      setSessionUser(null);
    }
  });
  return user;
}

// ── Solana wallet linking ──
// Desktop & in-app browsers expose an injected provider (window.solana /
// window.phantom.solana). Mobile web browsers (Safari/Chrome) do NOT — there,
// we deeplink into Phantom's in-app browser (the "Browse" deeplink), where the
// site reloads *with the provider injected* and connect+signMessage work in
// Phantom's secure context.
function getInjectedProvider() {
  if (typeof window === "undefined") return null;
  const phantom = window.phantom?.solana;
  if (phantom?.isPhantom) return phantom;
  if (window.solana?.isPhantom) return window.solana;
  return window.solana || window.backpack || window.solflare || null;
}

// Wait a bit for injected provider (especially after Phantom in-app browse deeplink).
function waitForProvider(timeoutMs = 1200) {
  return new Promise((resolve) => {
    const found = getInjectedProvider();
    if (found) return resolve(found);
    let elapsed = 0;
    const step = 120;
    const t = setInterval(() => {
      const p = getInjectedProvider();
      elapsed += step;
      if (p || elapsed >= timeoutMs) { clearInterval(t); resolve(p || null); }
    }, step);
  });
}

function isMobile() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// Deep link the current page into Phantom's in-app browser.
// Once inside, getInjectedProvider() will succeed and signMessage will be available.
function openInPhantom() {
  const url = window.location.href;
  const enc = encodeURIComponent(url);
  const ref = encodeURIComponent(window.location.origin);
  window.location.href = `https://phantom.app/ul/browse/${enc}?ref=${ref}`;
}

// Ask the connected wallet to sign a clear ownership message.
// Success = user proved control of the private key (desktop or inside Phantom mobile).
async function requestWalletSignature(provider, address) {
  if (!provider || !address) throw new Error("Wallet not ready to sign");

  const nonce = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
  const messageStr = [
    "Sign this message to prove wallet ownership for Fantaball.",
    "",
    `Wallet: ${address}`,
    `Nonce: ${nonce}`,
    "",
    "This signature does not authorize any on-chain transaction and costs nothing."
  ].join("\n");

  const encoded = new TextEncoder().encode(messageStr);

  try {
    const signed = await provider.signMessage(encoded, "utf8");
    if (!signed || !signed.signature) {
      throw new Error("Wallet did not return a signature");
    }
    return { address, signature: signed.signature };
  } catch (err) {
    const m = (err && (err.message || err.toString() || "")).toLowerCase();
    if (m.includes("reject") || m.includes("denied") || err?.code === 4001) {
      throw new Error("Signature request rejected in wallet. Ownership not verified.");
    }
    throw new Error("Failed to sign with wallet: " + (err?.message || "unknown error"));
  }
}

async function tryLinkPendingWallet(userId) {
  if (!HAS_SUPABASE || !userId) return null;
  let addr = null;
  try { addr = localStorage.getItem("ftb_pending_wallet"); } catch (e) {}
  if (!addr) return null;
  try {
    const { error } = await supabase.from("users").update({ wallet: addr }).eq("id", userId);
    if (error) { console.warn("link pending wallet:", error.message); return null; }
    try { localStorage.removeItem("ftb_pending_wallet"); } catch (e) {}
    return addr;
  } catch (e) {
    console.warn("tryLinkPendingWallet error:", e);
    return null;
  }
}

export async function connectWallet() {
  const provider = await waitForProvider();

  // No provider on mobile → deep-link into Phantom (correct "ul/browse" deeplink).
  // Inside Phantom the page reloads with injected provider; user can tap the wallet
  // button again (or we could auto-trigger) and the full connect+sign will run.
  if (!provider) {
    if (isMobile()) {
      openInPhantom();
      return null;
    }
    throw new Error("No Solana wallet found. Install Phantom, Backpack or Solflare.");
  }

  // 1. Connect (user picks account in wallet)
  const resp = await provider.connect();
  const address = resp?.publicKey?.toString?.() || provider.publicKey?.toString?.();
  if (!address) throw new Error("Wallet did not return an address");

  // 2. CRITICAL: require signMessage to prove ownership (fixes "connects without signature")
  // Works on desktop (direct) and inside Phantom's mobile in-app browser.
  await requestWalletSignature(provider, address);

  // 3. Only after successful signature do we persist + update auth state
  const u = (typeof window !== "undefined" && window.__FTB_USER) || null;
  if (HAS_SUPABASE && u?.id) {
    const { error } = await supabase.from("users").update({ wallet: address }).eq("id", u.id);
    if (error) console.warn("link wallet:", error.message);
    setSessionUser({ ...u, wallet: address });
  } else if (address) {
    // Wallet proved (signed) but no X login yet → remember it.
    // Will be auto-linked to the user row on next successful X sign-in.
    try { localStorage.setItem("ftb_pending_wallet", address); } catch (e) {}
  }

  return address;
}

export { HAS_SUPABASE };
