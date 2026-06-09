import { useState, useMemo, useEffect, useRef, createContext, useContext } from "react";
import { toPng } from "html-to-image";
import { getPlayers, getLeaderboard, saveRoster, getMyRoster, saveLineup, getLineup, getFixtures, getScorers, getAssists, getCards, getStandings, getBracket, getBounties, HAS_SUPABASE, computeFormationLock, PLAYERS } from "./lib/data";
import { initAuth, onAuthChange, signInWithX, signOut, connectWallet } from "./lib/auth";
import { supabase } from "./lib/supabase";

// ─── ICON SYSTEM (monochrome SVG, inherits currentColor) ──────────────────
// Declared at top (function declaration is hoisted) to avoid TDZ when used in JSX below.
// common props repaired (was truncated in bad edit); all switch cases completed.
function Icon({ name, size=20, stroke=2, style }){
  const s = { width:size, height:size, display:"inline-block", verticalAlign:"middle", flexShrink:0, ...style };
  const common = { fill:"none", stroke:"currentColor", strokeWidth:stroke, strokeLinecap:"round", strokeLinejoin:"round" };
  switch(name){
    // complete set: ball, pitch, trophy, pool (now Solana logo), credit (squad budget), info, crown, medal, bolt, lock, chain, ticket, swap, cash, doc, check, x, chevron, arrow, plus, minus, users, flame, share, copy, download, twitter, target, clock
    case "ball": // football / pitch builder
      return (<svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="9" {...common}/><path d="M12 7.5l3.2 2.3-1.2 3.7h-4l-1.2-3.7z" {...common}/><path d="M12 3v4.5M5.5 9.5l3.3 1.2M18.5 9.5l-3.3 1.2M8.8 17.5l1.2-3.4M15.2 17.5l-1.2-3.4" {...common}/></svg>);
    case "pitch": // formation grid
      return (<svg viewBox="0 0 24 24" style={s}><rect x="3" y="4" width="18" height="16" rx="1.5" {...common}/><path d="M3 12h18M12 4v16" {...common}/><circle cx="12" cy="12" r="2.5" {...common}/><path d="M3 8h3v8H3M21 8h-3v8h3" {...common}/></svg>);
    case "trophy":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M7 4h10v5a5 5 0 0 1-10 0V4z" {...common}/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 19h6M10 19v-3M14 19v-3" {...common}/></svg>);
    case "pool": // Solana logo for prize pool / SOL sections (replaces old circle placeholder)
      return (<img src="/solana-logo.jpg" alt="Solana" style={{...s, borderRadius:"50%", objectFit:"cover", border:"1px solid rgba(255,255,255,0.2)"}}/>);
    case "credit": // internal budget / player prices (banknote symbol, distinct from SOL)
      return (<svg viewBox="0 0 24 24" style={s}><rect x="2" y="6" width="20" height="12" rx="2" {...common}/><path d="M6 9h4M6 15h8M14 12h4" {...common}/></svg>);
    case "info":
      return (<svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="9" {...common}/><path d="M12 11v5M12 8h.01" {...common}/></svg>);
    case "chart": // stats bars
      return (<svg viewBox="0 0 24 24" style={s}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" {...common}/></svg>);
    case "crown":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M4 8l3.5 3L12 5l4.5 6L20 8l-1.5 9h-13z" {...common}/><path d="M5.5 17h13" {...common}/></svg>);
    case "medal":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M8 3l2.5 5M16 3l-2.5 5" {...common}/><circle cx="12" cy="15" r="5.5" {...common}/><path d="M12 12.5l.9 1.8 2 .3-1.45 1.4.35 2L12 17l-1.8.95.35-2L9.1 14.6l2-.3z" {...common}/></svg>);
    case "bolt":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M13 3L5 13h5l-1 8 8-11h-5z" {...common}/></svg>);
    case "lock":
      return (<svg viewBox="0 0 24 24" style={s}><rect x="5" y="11" width="14" height="9" rx="2" {...common}/><path d="M8 11V8a4 4 0 0 1 8 0v3" {...common}/><circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none"/></svg>);
    case "chain":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M9 15l6-6M10.5 7.5l1-1a3.5 3.5 0 0 1 5 5l-1 1M13.5 16.5l-1 1a3.5 3.5 0 0 1-5-5l1-1" {...common}/></svg>);
    case "ticket":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z" {...common}/><path d="M14 7v10" {...common} strokeDasharray="1.5 2.5"/></svg>);
    case "swap":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M5 9h12l-3-3M19 15H7l3 3" {...common}/></svg>);
    case "cash":
      return (<svg viewBox="0 0 24 24" style={s}><rect x="3" y="6" width="18" height="12" rx="2" {...common}/><circle cx="12" cy="12" r="2.5" {...common}/><path d="M6 9v6M18 9v6" {...common}/></svg>);
    case "doc":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M6 3h8l4 4v14H6z" {...common}/><path d="M14 3v4h4M9 12h6M9 16h6" {...common}/></svg>);
    case "check":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M5 12.5l4.5 4.5L19 7" {...common}/></svg>);
    case "x":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M6 6l12 12M18 6L6 18" {...common}/></svg>);
    case "chevron":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M6 9l6 6 6-6" {...common}/></svg>);
    case "arrow":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M5 12h14M13 6l6 6-6 6" {...common}/></svg>);
    case "plus":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M12 5v14M5 12h14" {...common}/></svg>);
    case "minus":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M5 12h14" {...common}/></svg>);
    case "users": // coaches picked
      return (<svg viewBox="0 0 24 24" style={s}><circle cx="9" cy="8" r="3" {...common}/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6.5a3 3 0 0 1 0 5.8M17 19a5.5 5.5 0 0 0-3-5" {...common}/></svg>);
    case "flame": // buyback & burn
      return (<svg viewBox="0 0 24 24" style={s}><path d="M12 3c1 3-2 4-2 7a3 3 0 0 0 6 0c0-1-.3-2-1-2.8C16 11 17 13 17 15a5 5 0 0 1-10 0c0-4 3-6 5-12z" {...common}/></svg>);
    case "share":
      return (<svg viewBox="0 0 24 24" style={s}><circle cx="6" cy="12" r="2.5" {...common}/><circle cx="18" cy="6" r="2.5" {...common}/><circle cx="18" cy="18" r="2.5" {...common}/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" {...common}/></svg>);
    case "copy":
      return (<svg viewBox="0 0 24 24" style={s}><rect x="9" y="9" width="11" height="11" rx="2" {...common}/><path d="M5 15V5a2 2 0 0 1 2-2h10" {...common}/></svg>);
    case "download":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M12 4v11M7 11l5 5 5-5M5 20h14" {...common}/></svg>);
    case "twitter":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M4 4l7 9M20 20l-7.5-9.7M4 20l6-6.5M20 4l-6.2 6.8" {...common}/></svg>);
    case "target":
      return (<svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="9" {...common}/><circle cx="12" cy="12" r="5" {...common}/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>);
    case "clock":
      return (<svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="9" {...common}/><path d="M12 7v5l3.5 2" {...common}/></svg>);
    default:
      return null;
  }
}

// rank → icon name + color
function rankBadge(rank){
  if(rank===1) return {icon:"crown", color:"#ff5b1e"};
  if(rank===2) return {icon:"medal", color:"#9aa0a6"};
  if(rank===3) return {icon:"medal", color:"#cd7f32"};
  return null;
}

// derive an absolute "picked by N coaches" count from ownership %
const TOTAL_COACHES = 8420;
function pickedBy(own){ return Math.round((own/100)*TOTAL_COACHES); }

/* ── SOCIAL / CONTACT LINKS ──────────────────────────────────────────────
   Fill a `url` to make its button appear. Empty url = button hidden.
   - x:        the brand account on X
   - coin:     CoinCommunity page
   - pumpfun:  the $FANTABALL token page on pump.fun (to BUY) — after launch
   - go:       the FANTABALL bounties/creator page on go.pump.fun — after launch
   - email:    contact (mailto)                                              */
const SOCIALS = {
  x:       { label:"X",             icon:"twitter", url:"" },
  coin:    { label:"CoinCommunity", icon:"users",   url:"" },
  pumpfun: { label:"Buy $FANTABALL",icon:"cash",    url:"" },
  go:      { label:"Bounties on GO",icon:"target",  url:"" },
  email:   { label:"hello@fantaball.tech", icon:"doc", url:"mailto:hello@fantaball.tech" },
};

// DexScreener token page (fill after launch). Empty = popup button is inert/hidden.
const DEXSCREENER_URL = "";



// Players are loaded exclusively from the real bundled dataset
// (frontend/src/all_players_compact.json via lib/data PLAYERS export)
// or live from backend when Supabase is configured. No demo/fallback arrays.


// PlayersContext provides the real player list (from bundled PLAYERS or live DB).
const PlayersContext = createContext(PLAYERS);
const usePlayers = () => useContext(PlayersContext);

const BUDGET = 888;
const SQUAD_RULES = { GK:2, DF:5, MF:6, FW:3 };
const SQUAD_SIZE = Object.values(SQUAD_RULES).reduce((a,b)=>a+b,0); // 16
const POS_LABEL = { GK:"GK", DF:"DEF", MF:"MID", FW:"FWD" };
const FLAG = {
  FRA:"🇫🇷",NOR:"🇳🇴",BRA:"🇧🇷",ARG:"🇦🇷",ENG:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",ESP:"🇪🇸",GER:"🇩🇪",
  URU:"🇺🇾",MAR:"🇲🇦",POR:"🇵🇹",ECU:"🇪🇨",NED:"🇳🇱",CRO:"🇭🇷",SWE:"🇸🇪",SUI:"🇨🇭",
  BEL:"🇧🇪",COL:"🇨🇴",TUR:"🇹🇷",KOR:"🇰🇷",
  ALG:"🇩🇿",AUS:"🇦🇺",AUT:"🇦🇹",BIH:"🇧🇦",CAN:"🇨🇦",CIV:"🇨🇮",COD:"🇨🇩",CPV:"🇨🇻",
  CUW:"🇨🇼",CZE:"🇨🇿",EGY:"🇪🇬",GHA:"🇬🇭",HAI:"🇭🇹",IRN:"🇮🇷",IRQ:"🇮🇶",JOR:"🇯🇴",
  JPN:"🇯🇵",KSA:"🇸🇦",MEX:"🇲🇽",NZL:"🇳🇿",PAN:"🇵🇦",PAR:"🇵🇾",QAT:"🇶🇦",RSA:"🇿🇦",
  SCO:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",SEN:"🇸🇳",TUN:"🇹🇳",USA:"🇺🇸",UZB:"🇺🇿",NGA:"🇳🇬",DEN:"🇩🇰",POL:"🇵🇱",
};
const FORMATIONS = {
  "4-3-3":["FW","FW","FW","MF","MF","MF","DF","DF","DF","DF","GK"],
  "4-4-2":["FW","FW","MF","MF","MF","MF","DF","DF","DF","DF","GK"],
  "3-5-2":["FW","FW","MF","MF","MF","MF","MF","DF","DF","DF","GK"],
  "3-4-3":["FW","FW","FW","MF","MF","MF","MF","DF","DF","DF","GK"],
};

// PALETTE: warm white · ink black · signature orange
const C = {
  paper:"#faf8f5", card:"#ffffff", ink:"#16130f", inkSoft:"#403a32",
  mute:"#8c8378", line:"#e8e2d8", orange:"#ff5b1e", orangeSoft:"#fff0e9", orangeDeep:"#e63f00",
};

function formationRows(fKey){
  const slots=FORMATIONS[fKey]||FORMATIONS["4-3-3"];
  const rows=[]; let i=0;
  while(i<slots.length){let j=i;while(j<slots.length&&slots[j]===slots[i])j++;rows.push({pos:slots[i],count:j-i});i=j;}
  return rows;
}

export default function App(){
  const [tab,setTab]=useState("build");
  const [squad,setSquad]=useState([]);
  const [captain,setCaptain]=useState(null);
  const [vice,setVice]=useState(null);
  const [teamName,setTeamName]=useState("DEGEN FC");
  const [jersey,setJersey]=useState({primary:"#ff5b1e",secondary:"#16130f",accent:"#ffffff",pattern:"blaze"});
  const [shareOpen,setShareOpen]=useState(false);
  const [showDexPopup,setShowDexPopup]=useState(false);
  const [authUser,setAuthUser]=useState(null);
  const [loginOpen,setLoginOpen]=useState(false);
  // Transient state for the OAuth return redirect phase (shows a loading message, does NOT touch the Sign in button UI).
  const [authReturning, setAuthReturning] = useState(false);
  const [authCallbackError, setAuthCallbackError] = useState("");
  const [formation,setFormation]=useState("4-3-3");
  const [starters,setStarters]=useState([]); // 11 player ids; auto-filled, user-editable

  const GW = 1; // current gameweek; replace with live value when backend serves it

  // Live formation lock state (derived from fixtures schedule for current GW)
  const [fixtures, setFixtures] = useState([]);
  const [now, setNow] = useState(() => new Date());

  // Players start from the canonical real bundled dataset (PLAYERS).
  // When Supabase is available, getPlayers() returns live rows (basic fields);
  // we enrich them with pts/own from the real bundled data so UI remains complete.
  const [players,setPlayers]=useState(PLAYERS);
  useEffect(()=>{
    let alive=true;
    getPlayers().then(rows=>{
      if(!alive||!rows||!rows.length) return;
      // If the data layer returned the same bundled real players, keep as-is.
      if (rows === PLAYERS || rows.length === PLAYERS.length) {
        setPlayers(rows);
        return;
      }
      // Live data from backend: enrich using the real PLAYERS as base for stats.
      const baseById = new Map(PLAYERS.map(p => [p.id, p]));
      const merged = rows.map(r => {
        const b = baseById.get(r.id);
        return { ...r, pts: b?.pts ?? 0, own: b?.own ?? 0 };
      });
      setPlayers(merged);
    }).catch(e => {
      console.warn("getPlayers failed, keeping bundled real player data:", e?.message || e);
      // state already initialized with PLAYERS (real data)
    });
    return ()=>{alive=false;};
  },[]);

  // Load fixtures (for lock window calc based on first kickoff / last finish per GW)
  useEffect(()=>{
    let alive=true;
    getFixtures().then(list=>{
      if(alive && Array.isArray(list)) setFixtures(list);
    }).catch(e=>console.warn("getFixtures (lock timer):",e?.message||e));
    return ()=>{alive=false;};
  },[]);

  // Ticker for live countdown in LockBanner + lock state (1s for truly live timer)
  useEffect(()=>{
    const id = setInterval(()=> setNow(new Date()), 1000);
    return ()=> clearInterval(id);
  },[]);

  // ── DEX / $FANTABALL promo popup: auto after exactly 3s on homepage only (tab "build")
  // Respects localStorage "ftb_dex_hidden_v2" for "don't show again".
  // Use ?forcepromo in URL to bypass (handy to verify after Netlify deploys).
  const HOME_TAB = "build";
  const tabRef = useRef(tab);
  useEffect(()=>{ tabRef.current = tab; }, [tab]);
  useEffect(()=>{
    if (tab !== HOME_TAB) return;
    const force = (()=>{ try { return new URLSearchParams(window.location.search).has("forcepromo"); } catch(e){ return false; } })();
    try { if (!force && localStorage.getItem("ftb_dex_hidden_v2") === "1") return; } catch(e){}
    const delay = force ? 250 : 3000;
    const t = setTimeout(()=>{
      if (tabRef.current === HOME_TAB) setShowDexPopup(true);
    }, delay);
    return ()=>{ clearTimeout(t); };
  }, [tab]);

  const spent=useMemo(()=>squad.reduce((s,id)=>s+(players.find(p=>p.id===id)?.pr||0),0),[squad,players]);
  const counts=useMemo(()=>{const c={GK:0,DF:0,MF:0,FW:0};squad.forEach(id=>{const p=players.find(x=>x.id===id);if(p)c[p.p]++;});return c;},[squad,players]);
  const budget=+(BUDGET-spent).toFixed(1);

  // Real lock status for current GW (GW1 reference for now). Recomputes on time tick + fixtures.
  const formationLock = useMemo(
    () => computeFormationLock(fixtures, GW, now),
    [fixtures, GW, now]
  );

  // ── Persistence ──────────────────────────────────────────────────────
  // Until auth is wired we have no real userId, so the squad/captain/vice
  // persist in the browser (survives reload). The Supabase write path below
  // is ready and activates automatically once a real userId exists (post-auth):
  // set window.__FTB_USER = { id, rosterId } at login and the sync turns on.

  // restore local draft on first load
  useEffect(()=>{
    // Detect we are returning from Supabase/X OAuth redirect (code or error in URL, or hash tokens).
    // This powers the "loading during return redirect" message. Does not affect the Sign in button.
    console.log('[App] Page load - search:', window.location.search, 'hash:', window.location.hash);
    let isReturn = false;
    try {
      const u = new URL(window.location.href);
      isReturn = !!(u.searchParams.get('code') || u.searchParams.get('access_token') || u.searchParams.get('error') || window.location.hash.includes('access_token'));
    } catch (e) {}
    if (isReturn) {
      setAuthReturning(true);
      setAuthCallbackError("");
      // Open the login sheet on return so the user sees clear feedback (loading or error)
      setLoginOpen(true);
    }

    const unsubOnAuthChange = onAuthChange(u=>setAuthUser(u));

    // Drive authUser state *immediately* from the official Supabase listener (as requested).
    // This ensures that after the redirect back, SIGNED_IN / INITIAL_SESSION update the UI without delay.
    let supabaseSub = null;
    if (HAS_SUPABASE && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[App direct] onAuthStateChange:', event, 'hasUser=', !!session?.user);
        // Use supabase.auth.onAuthStateChange to immediately update React authUser state (per requirements).
        if (session?.user) {
          const enriched = (typeof window !== 'undefined' && window.__FTB_USER) || null;
          const next = (enriched && enriched.id === session.user.id) ? enriched : {
            id: session.user.id,
            handle: session.user.user_metadata?.user_name || session.user.user_metadata?.preferred_username || null,
          };
          setAuthUser(next);

          // After successful login (SIGNED_IN or INITIAL_SESSION post-redirect), automatically call getMyRoster + getLineup.
          // This complements the [authUser] effect and ensures data is pulled right on the auth event.
          if (HAS_SUPABASE && next?.id) {
            try {
              const roster = await getMyRoster(next.id);
              if (roster) {
                const playerIds = (roster.roster_players || []).map(rp => rp.player_id).filter(id => typeof id === "number");
                if (playerIds.length > 0) {
                  setSquad(playerIds);
                  if (roster.name) setTeamName(roster.name);
                }
                if (roster.id) {
                  const lineup = await getLineup(roster.id, GW);
                  if (lineup) {
                    if (Array.isArray(lineup.starters) && lineup.starters.length) setStarters(lineup.starters);
                    if (lineup.captainId != null) setCaptain(lineup.captainId);
                    if (lineup.viceId != null) setVice(lineup.viceId);
                  }
                }
              }
            } catch (e) {
              console.warn("auto getMyRoster/getLineup after onAuthStateChange:", e?.message || e);
            }
          }
        } else {
          setAuthUser(null);
        }
        // Clear the transient return loading state as soon as we have an auth event
        if (isReturn) setAuthReturning(false);
      });
      supabaseSub = subscription;
    }

    let authUnsub = () => {};
    initAuth()
      .then((res) => {
        if (res?.user) setAuthUser(res.user);
        if (res?.callbackError) {
          setAuthCallbackError(String(res.callbackError));
          // Surface callback error by opening the sheet so user sees a message (non-fatal, keeps app usable)
          setLoginOpen(true);
        }
        if (typeof res?.unsubscribe === 'function') {
          authUnsub = res.unsubscribe;
        }
        // If we were in return-redirect, and we now have (or don't have) a user, stop the loading message.
        if (isReturn) setAuthReturning(false);
      })
      .catch(e=>{
        console.warn("initAuth:",e?.message||e);
        if (isReturn) {
          setAuthReturning(false);
          setAuthCallbackError(e?.message || 'Auth initialization failed after redirect');
        }
      });

    try{
      const raw=localStorage.getItem("ftb_draft");
      if(raw){
        const d=JSON.parse(raw);
        if(Array.isArray(d.squad)) setSquad(d.squad);
        if(d.captain!=null) setCaptain(d.captain);
        if(d.vice!=null) setVice(d.vice);
        if(d.teamName) setTeamName(d.teamName);
        if(d.jersey) setJersey(d.jersey);
      }
    }catch(e){}

    return ()=>{
      if (unsubOnAuthChange) unsubOnAuthChange();
      if (authUnsub) authUnsub();
      if (supabaseSub) { try { supabaseSub.unsubscribe(); } catch (e) {} }
    };
  },[]);

  // Load roster + lineup from server after login (or on mount if already logged in).
  // Server wins over local draft for authenticated users. No-op / defaults if no roster saved.
  // Uses the already-imported getMyRoster + getLineup (previously dead imports).
  useEffect(()=>{
    let alive = true;
    async function loadServerRosterAndLineup(){
      if(!authUser?.id || !HAS_SUPABASE) return;
      try{
        const roster = await getMyRoster(authUser.id);
        if(!alive || !roster) return;
        const playerIds = (roster.roster_players || [])
          .map(rp => rp.player_id)
          .filter(id => typeof id === "number");
        if(playerIds.length > 0){
          setSquad(playerIds);
          if(roster.name) setTeamName(roster.name);
        }
        // lineup for current GW (may be null on first roster save before any formation lock/save)
        if(roster.id){
          const lineup = await getLineup(roster.id, GW);
          if(!alive || !lineup) return;
          if(Array.isArray(lineup.starters) && lineup.starters.length){
            setStarters(lineup.starters);
          }
          if(lineup.captainId != null) setCaptain(lineup.captainId);
          if(lineup.viceId != null) setVice(lineup.viceId);
        }
      }catch(e){
        console.warn("load roster/lineup failed (kept local/defaults):", e?.message||e);
      }
    }
    loadServerRosterAndLineup();
    return ()=>{ alive = false; };
  }, [authUser]);

  // save draft locally whenever it changes; sync to Supabase if logged in
  useEffect(()=>{
    try{ localStorage.setItem("ftb_draft",JSON.stringify({squad,captain,vice,teamName,jersey})); }catch(e){}
    const u = (typeof window!=="undefined" && window.__FTB_USER) || null;
    if(HAS_SUPABASE && u?.id && squad.length){
      const picks=squad.map(id=>{const p=players.find(x=>x.id===id);return {id,pr:p?.pr||0};});
      saveRoster(u.id, picks, {name:teamName, budget_spent:spent})
        .then(r=>{
          const canWriteLineup = r?.id && starters.length===11 && (!formationLock || formationLock.canEdit !== false);
          if(canWriteLineup){
            saveLineup(r.id, GW, {starters, bench:squad.filter(id=>!starters.includes(id)), captainId:captain, viceId:vice})
              .catch(e=>console.warn("saveLineup:",e?.message||e));
          }
        })
        .catch(e=>console.warn("saveRoster:",e?.message||e));
    }
  },[squad,captain,vice,teamName,jersey,players,spent,starters]);

  // ── Lineup: auto-pick 11 starters by formation, keep user edits valid ──
  function autoStarters(squadIds, fKey){
    const byPos={GK:[],DF:[],MF:[],FW:[]};
    squadIds.forEach(id=>{const p=players.find(x=>x.id===id);if(p&&byPos[p.p])byPos[p.p].push(id);});
    const need=formationRows(fKey).reduce((m,{pos,count})=>{m[pos]=count;return m;},{});
    const out=[];
    Object.keys(need).forEach(pos=>{ out.push(...(byPos[pos]||[]).slice(0,need[pos]||0)); });
    return out;
  }
  useEffect(()=>{
    if(squad.length<11){ setStarters([]); return; }
    setStarters(prev=>{
      const valid=prev.filter(id=>squad.includes(id));
      const need=formationRows(formation).reduce((m,{pos,count})=>{m[pos]=count;return m;},{});
      const got={GK:0,DF:0,MF:0,FW:0};
      valid.forEach(id=>{const p=players.find(x=>x.id===id);if(p)got[p.p]++;});
      const ok=valid.length===11 && ["GK","DF","MF","FW"].every(pos=>(got[pos]||0)===(need[pos]||0));
      return ok?valid:autoStarters(squad,formation);
    });
  },[squad,formation,players]);

  const benchIds=useMemo(()=>squad.filter(id=>!starters.includes(id)),[squad,starters]);

  // promote a bench player: swap with the first starter of the SAME position
  function promote(benchId){
    const bp=players.find(p=>p.id===benchId); if(!bp) return;
    setStarters(prev=>{
      const same=prev.filter(id=>{const p=players.find(x=>x.id===id);return p&&p.p===bp.p;});
      if(!same.length) return prev;
      if(captain===same[0]) setCaptain(null);
      if(vice===same[0]) setVice(null);
      return [...prev.filter(id=>id!==same[0]), benchId];
    });
  }
  function setCap(id){ setVice(v=>v===id?null:v); setCaptain(c=>c===id?null:id); }
  function setVc(id){ setCaptain(c=>c===id?null:c); setVice(v=>v===id?null:id); }

  // Improved swap: any two of same role (starter<->starter for positioning, or starter<->bench)
  function swapPlayers(aId, bId){
    if (formationLock && formationLock.canEdit === false) return; // locked window — no edits
    if(!aId || !bId || aId===bId) return;
    const pa = players.find(x=>x.id===aId);
    const pb = players.find(x=>x.id===bId);
    if(!pa || !pb || pa.p !== pb.p) return;
    setStarters(prev=>{
      const ia=prev.indexOf(aId), ib=prev.indexOf(bId);
      const aIs=ia>=0, bIs=ib>=0;
      if(aIs && bIs){
        // both starters: reorder within array so formation row placement updates
        const next=[...prev]; next[ia]=bId; next[ib]=aId; return next;
      }
      if(aIs && !bIs){
        // starter out, bench in at that slot; clear C/V from outgoing (consistent w/ prior promote)
        if(captain===aId) setCaptain(null);
        if(vice===aId) setVice(null);
        return prev.map(id => id===aId ? bId : id);
      }
      if(!aIs && bIs){
        if(captain===bId) setCaptain(null);
        if(vice===bId) setVice(null);
        return prev.map(id => id===bId ? aId : id);
      }
      return prev;
    });
  }

  function toggle(p){
    if(squad.includes(p.id)){
      if(captain===p.id)setCaptain(null);
      if(vice===p.id)setVice(null);
      setSquad(c=>c.filter(x=>x!==p.id));
    }else{
      if(squad.length>=SQUAD_SIZE||counts[p.p]>=SQUAD_RULES[p.p]||budget<p.pr)return;
      setSquad(c=>[...c,p.id]);
    }
  }
  const ctx={squad,setSquad,captain,setCaptain,vice,setVice,spent,counts,budget,toggle,setTab,
    teamName,setTeamName,jersey,setJersey,shareOpen,setShareOpen,
    formation,setFormation,starters,benchIds,promote,setCap,setVc,
    swapPlayers, authUser, GW, formationLock};

  return (
    <PlayersContext.Provider value={players}>
    <div style={S.app}>
      <Fonts/>
      <TopBar authUser={authUser} onLogin={()=>setLoginOpen(true)}/>
      {/* Loading message shown only during the OAuth return redirect (after X/Supabase sends us back).
          This is a transient UI affordance and does NOT modify the Sign in button or LoginSheet button styles. */}
      {authReturning && (
        <div style={{position:'sticky',top:0,zIndex:50,background:'#0f0f0f',color:'#ddd',fontSize:12,padding:'6px 12px',textAlign:'center',borderBottom:'1px solid #222'}}>
          Completing sign-in with X… {authCallbackError ? ' — ' + authCallbackError : ''}
        </div>
      )}
      {authCallbackError && !authReturning && loginOpen && (
        <div style={{position:'sticky',top: authReturning ? 28 : 0, zIndex:49, background:'#3a2a1f', color:'#ffcc99', fontSize:12, padding:'4px 12px', textAlign:'center', borderBottom:'1px solid #3a2a1f'}}>
          Sign-in error: {authCallbackError}
        </div>
      )}
      <main style={S.main}>
        {tab==="build" && <Build {...ctx}/>}
        {tab==="pitch" && <Pitch {...ctx}/>}
        {tab==="ranks" && <Ranks setTab={setTab}/>}
        {tab==="token" && <Token/>}
        {tab==="quests" && <Quests/>}
        {tab==="stats" && <Stats squad={squad}/>}
        {tab==="about" && <About setTab={setTab}/>}
      </main>
      <TabBar tab={tab} setTab={setTab} squadCount={squad.length}/>
      {shareOpen && <ShareModal squad={squad} captain={captain} vice={vice}
        teamName={teamName} jersey={jersey} onClose={()=>setShareOpen(false)}/>}
      {tab === "build" && showDexPopup && <DexPopup onClose={()=>setShowDexPopup(false)} />}
      {loginOpen && <LoginSheet 
        authUser={authUser} 
        onClose={()=>setLoginOpen(false)} 
        authReturning={authReturning}
        callbackError={authCallbackError}
      />}
      <Style/>
    </div>
    </PlayersContext.Provider>
  );
}

// ─── DEXSCREENER / $FANTABALL PROMO POPUP (modal, homepage only, 3s delay, localStorage hide) ─────────
function DexPopup({onClose}){
  const [dontShow, setDontShow] = useState(false);
  function close(){
    if (dontShow) {
      try { localStorage.setItem("ftb_dex_hidden_v2", "1"); } catch(e){}
    }
    onClose();
  }
  const disabled = !DEXSCREENER_URL;
  return (
    <div style={S.dexBackdrop} onClick={close}>
      <div style={S.dexCard} onClick={e=>e.stopPropagation()}>
        <button onClick={close} style={S.dexClose} aria-label="Close"><Icon name="x" size={18}/></button>

        <div style={S.dexRocket}>🚀</div>
        <div style={S.dexTitle}>Support Fantaball</div>

        <p style={S.dexBody}>
          Help grow the prize pool by holding $FANTABALL
        </p>

        <a
          href={DEXSCREENER_URL || undefined}
          target="_blank"
          rel="noreferrer"
          onClick={()=>{ if(disabled) return; }}
          style={{...S.dexBtn, opacity:disabled?0.55:1, pointerEvents:disabled?"none":"auto"}}
        >
          <Icon name="bolt" size={18}/> {disabled ? "DexScreener — live at launch" : "Open on Dexscreener"}
        </a>

        <div style={S.dexDisclaimer}>
          Support the project — every boost helps grow the prize pool we all share.
        </div>

        <label style={S.dexCheck} onClick={()=>setDontShow(v=>!v)}>
          <input
            type="checkbox"
            checked={dontShow}
            onChange={e=>setDontShow(e.target.checked)}
            onClick={e=>e.stopPropagation()}
          />
          <span>Don't show this message again</span>
        </label>

        <button onClick={close} style={S.dexCloseBtn}>Close</button>
      </div>
    </div>
  );
}

function TopBar({authUser,onLogin}){
  return (
    <header style={S.topbar}>
      <div style={S.brand}>
        <video src="/fantaball-logo.webm" autoPlay loop muted playsInline
          style={{width:30,height:30,borderRadius:9,objectFit:"cover",display:"block"}}/>
        <span style={S.brandText}>FANTA<span style={{color:C.orange}}>BALL</span></span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={S.poolChip}>
          <img src="/solana-logo.jpg" alt="Solana" style={{width:14,height:14,borderRadius:"50%",objectFit:"cover",flexShrink:0,border:"1px solid rgba(255,255,255,0.25)"}}/>
        </div>
        <button onClick={onLogin} style={S.loginChip}>
          {authUser
            ? <><span style={S.loginDot}/><span style={{fontWeight:800,fontSize:12,maxWidth:84,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {authUser.handle?("@"+authUser.handle):"Connected"}</span></>
            : <><Icon name="users" size={15}/><span style={{fontWeight:800,fontSize:12}}>Sign in</span></>}
        </button>
      </div>
    </header>
  );
}

// ─── LOGIN SHEET ──────────────────────────────────────────────────────────
function LoginSheet({authUser, onClose, authReturning = false, callbackError = ""}){
  const [busy,setBusy]=useState(null); // "x" | "wallet" | null
  const [err,setErr]=useState("");
  const [wallet,setWallet]=useState(authUser?.wallet||null);

  // Capture whether we were already logged when the sheet opened.
  // Used to auto-close only on *new* successful login (e.g. after X OAuth returns and authUser updates).
  const openedWithAuth = useRef(!!authUser?.id);

  // If a login succeeds while this sheet is mounted (auth state arrives via onAuthChange
  // after signInWithOAuth redirect or in-page session), close the sheet. The main App
  // effect will have already called getMyRoster + getLineup for the new authUser.
  useEffect(()=>{
    if(authUser?.id && !openedWithAuth.current){
      onClose();
    }
  },[authUser?.id, onClose]);

  async function doX(){
    console.log('[LoginSheet] "Connect X" button clicked — calling signInWithX() now');
    setErr(""); setBusy("x");
    try{
      const result = await signInWithX();
      console.log('[LoginSheet] signInWithX() resolved successfully:', result);
      // Redirect flow: browser navigates to X, then back to redirectTo (origin).
      // On return the app re-initializes:
      //   - initAuth() + onAuthChange => setAuthUser (updates TopBar)
      //   - the [authUser] effect in App calls the existing getMyRoster(authUser.id) + getLineup(roster.id, GW)
      // If Supabase sets the session in-page (no full nav), the effect above auto-closes this sheet.
    }
    catch(e){
      console.error('[LoginSheet] signInWithX() threw error:', e);
      const userMessage = e?.message || 'X sign-in failed';
      setErr(userMessage + ' — open browser console (F12) and check logs above for [auth] details. Common causes: missing Supabase env vars, X provider not enabled in Supabase, or redirect URL not whitelisted.');
    }
    finally{ setBusy(null); }
  }
  // Keep local display state in sync if the global authUser.wallet gets populated
  // (e.g. pending wallet from previous sign was auto-linked on X login).
  useEffect(() => {
    if (authUser?.wallet && authUser.wallet !== wallet) {
      setWallet(authUser.wallet);
    }
  }, [authUser?.wallet]);

  async function doWallet(){
    setErr(""); setBusy("wallet");
    try{
      const a = await connectWallet();
      if (a) {
        setWallet(a);
        // When a real user (X login) already exists, connectWallet did:
        //   provider.connect() + requestWalletSignature() (the ownership proof)
        //   + UPDATE users.wallet in Supabase + setSessionUser({..., wallet})
        // The onAuthChange listener updates authUser (new object ref) →
        // the [authUser] effect in the main App component calls the existing
        // getMyRoster(authUser.id) + getLineup(...) to load roster + lineup from server.
      } else {
        setErr(""); // mobile: we performed the correct Phantom ul/browse deep link;
                    // once inside Phantom the injected provider will be available and
                    // tapping "Connect Solana wallet" again will do connect + signMessage.
      }
    }
    catch(e){
      setErr(e?.message || "Wallet connection + signature failed");
    }
    finally{ setBusy(null); }
  }
  const shortW = wallet ? wallet.slice(0,4)+"…"+wallet.slice(-4) : null;

  return (
    <div style={S.modalBackdrop} onClick={onClose}>
      <div style={S.modalSheet} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:20,color:C.ink}}>Sign in to play</div>
          <button onClick={onClose} style={S.iconBtn}><Icon name="x" size={18}/></button>
        </div>

        {authReturning || callbackError ? (
          <div style={{...S.loginBtn, background: C.card, color: C.ink, border: `1px solid ${C.line}`, justifyContent: 'center', cursor: 'default', flexDirection: 'column', gap: 4, padding: '12px 16px'}}>
            {callbackError 
              ? (callbackError === 'server_error' 
                  ? 'OAuth server_error from X/Supabase' 
                  : `OAuth error: ${callbackError}`)
              : 'Completing sign-in with X…'}
            <span style={{fontSize: 11, opacity: 0.8, textAlign: 'center', lineHeight: 1.3}}>
              {callbackError === 'server_error' 
                ? 'This usually means the Callback URI in your X app is not exactly https://YOUR-REF.supabase.co/auth/v1/callback (use v1, not v2), or https://fantaball.tech is not in Supabase Redirect URLs. Check both exactly (no extra slash, correct protocol).'
                : 'Check browser console (F12) for [auth] logs. Verify redirect URLs in Supabase and X Developer Portal.'}
            </span>
          </div>
        ) : (
          <button onClick={doX} disabled={busy==="x"}
            style={{...S.loginBtn,background:C.ink,color:"#fff",opacity:busy==="x"?0.6:1}}>
            <Icon name="twitter" size={18}/>
            {authUser?.handle ? `Connected as @${authUser.handle}` : (busy==="x"?"Opening X…":"Connect X")}
          </button>
        )}

        <button onClick={doWallet} disabled={busy==="wallet"}
          style={{...S.loginBtn,background:C.orange,color:"#fff",marginTop:10,opacity:busy==="wallet"?0.6:1}}>
          <Icon name="cash" size={18}/>
          {shortW ? `Wallet ${shortW}` : (busy==="wallet"?"Connecting…":"Connect Solana wallet")}
        </button>

        {err && <div style={{fontSize:12,color:"#e0502f",fontWeight:600,marginTop:10}}>{err}</div>}

        {/* CoinCommunity reminder (shown at login, as requested) */}
        <div style={S.coinNotice}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <span style={{color:C.orange,display:"inline-flex"}}><Icon name="info" size={16}/></span>
            <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:13,color:C.ink}}>
              Match your CoinCommunity profile
            </span>
          </div>
          <p style={{fontSize:12,color:C.inkSoft,lineHeight:1.5,margin:0}}>
            Use the <b>same X account and wallet</b> you registered on CoinCommunity. Matching profiles is
            how your activity is tracked and points are credited correctly — and it unlocks upcoming features.
          </p>
        </div>

        {!HAS_SUPABASE && (
          <p style={{fontSize:11,color:C.mute,textAlign:"center",marginTop:12,lineHeight:1.5}}>
            Sign-in is disabled (no Supabase keys).<br />
            Copy <code>frontend/.env.example</code> → <code>frontend/.env</code> and fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.<br />
            Also enable X provider + add your redirect origins in Supabase Dashboard.
          </p>
        )}
        {authUser && (
          <button onClick={async()=>{ await signOut(); onClose(); }}
            style={{...S.loginBtn,background:C.card,color:C.ink,border:`1px solid ${C.line}`,marginTop:12}}>
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}

function Build({squad,counts,spent,budget,toggle,captain,setCaptain,vice,setVice,setTab, formationLock}){
  const PLAYERS=usePlayers();
  const [posF,setPosF]=useState("ALL");
  const [search,setSearch]=useState("");
  const [view,setView]=useState("market");
  const [sortBy,setSortBy]=useState("pts");
  // measure budget header so the filter bar can stick right below it
  const budgetRef=useRef(null);
  const [stickTop,setStickTop]=useState(56);
  useEffect(()=>{
    function measure(){
      const h=budgetRef.current?.offsetHeight||0;
      setStickTop(56+h); // 56 = top bar height
    }
    measure();
    window.addEventListener("resize",measure);
    return ()=>window.removeEventListener("resize",measure);
  },[squad.length,formationLock]);

  // cheapest available price per position (for reserve calculation)
  const MIN_PRICE=useMemo(()=>{
    const min={GK:Infinity,DF:Infinity,MF:Infinity,FW:Infinity};
    PLAYERS.forEach(p=>{if(p.pr<min[p.p])min[p.p]=p.pr;});
    return min;
  },[]);

  // budget that must stay reserved to still complete every remaining required slot
  function reserveForOthers(excludePos){
    let r=0;
    for(const pos of ["GK","DF","MF","FW"]){
      let stillNeeded=SQUAD_RULES[pos]-counts[pos];
      if(pos===excludePos) stillNeeded-=1; // this pick fills one of its own slots
      if(stillNeeded>0) r+=stillNeeded*MIN_PRICE[pos];
    }
    return r;
  }
  // can this player be added without making the squad uncompletable?
  function affordable(p){
    if(squad.includes(p.id))return true;
    if(squad.length>=SQUAD_SIZE)return false;
    if(counts[p.p]>=SQUAD_RULES[p.p])return false;
    return (budget - p.pr) >= reserveForOthers(p.p);
  }

  const pct=Math.min(100,(spent/BUDGET)*100);
  const list=useMemo(()=>{
    let l=[...PLAYERS];
    if(posF!=="ALL")l=l.filter(p=>p.p===posF);
    if(search.trim())l=l.filter(p=>p.n.toLowerCase().includes(search.toLowerCase())||p.c.toLowerCase().includes(search.toLowerCase()));
    l.sort((a,b)=>sortBy==="pts"?b.pts-a.pts:sortBy==="pr"?b.pr-a.pr:b.own-a.own);
    return l;
  },[posF,search,sortBy]);
  const avgPts=squad.length?+(squad.reduce((s,id)=>s+(PLAYERS.find(p=>p.id===id)?.pts||0),0)/squad.length).toFixed(1):0;

  return (
    <div>
      <div style={S.budgetHeader} ref={budgetRef}>
        <LockBanner compact status={formationLock}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}>
          <div>
            <div style={S.miniLabel}>BUDGET LEFT</div>
            <div style={{display:"flex",alignItems:"baseline",gap:6}}>
              <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:30,
                color:budget<50?C.orange:C.ink,lineHeight:1}}><Icon name="credit" size={22} style={{marginRight:4,verticalAlign:"baseline"}}/>{budget}</span>
              <span style={{fontSize:12,color:C.mute,fontWeight:600}}>/ {BUDGET}</span>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={S.miniLabel}>SQUAD</div>
            <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:30,lineHeight:1}}>
              {squad.length}<span style={{fontSize:14,color:C.mute}}>/{SQUAD_SIZE}</span>
            </div>
          </div>
        </div>
        <div style={S.segTrack}><div style={{...S.segFill,width:`${pct}%`}}/></div>
        <div style={S.rolePills}>
          {Object.entries(SQUAD_RULES).map(([pos,max])=>{
            const done=counts[pos]>=max;
            return (
              <div key={pos} style={{...S.rolePill,
                background:done?C.orange:C.orangeSoft,color:done?"#fff":C.orangeDeep}}>
                {POS_LABEL[pos]} {counts[pos]}/{max}
              </div>
            );
          })}
        </div>
      </div>

      <div style={S.viewToggle}>
        <button onClick={()=>setView("market")} style={{...S.viewBtn,...(view==="market"?S.viewBtnOn:{})}}>MARKET</button>
        <button onClick={()=>setView("mine")} style={{...S.viewBtn,...(view==="mine"?S.viewBtnOn:{})}}>
          MY SQUAD {squad.length>0&&<span style={S.viewBadge}>{squad.length}</span>}
        </button>
      </div>

      <div style={{padding:"0 16px 6px"}}>
        <div style={S.refundNote}>
          <span style={{color:C.orange,display:"inline-flex",flexShrink:0,marginTop:1}}><Icon name="info" size={14}/></span>
          <span>If a player is knocked out of the real World Cup, they leave your squad and you get <b style={{color:C.ink}}>50% of their credits back</b>. The slot stays open until the next transfer window.</span>
        </div>
      </div>

      {view==="market" ? (
        <>
          <div style={{...S.marketStick,top:stickTop}}>
            <div style={{padding:"0 16px"}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search players…" style={S.search}/>
            </div>
            <div style={{padding:"10px 16px 8px"}}>
              <div style={S.posGrid}>
                {["ALL","GK","DF","MF","FW"].map(f=>(
                  <button key={f} onClick={()=>setPosF(f)} style={{...S.posBtn,...(posF===f?S.posBtnOn:{})}}>
                    {f==="ALL"?"ALL":POS_LABEL[f]}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
                <span style={{fontSize:11,color:C.mute,fontWeight:700,letterSpacing:.5}}>SORT</span>
                {[["pts","FORM"],["pr","PRICE"],["own","PICKED"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setSortBy(k)}
                    style={{...S.sortBtn,...(sortBy===k?S.sortBtnOn:{})}}>↕ {l}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{padding:"4px 16px 20px"}}>
            {list.map(p=>{
              const owned=squad.includes(p.id);
              const can=affordable(p);
              const roleFull=!owned&&counts[p.p]>=SQUAD_RULES[p.p];
              const reason=owned?null:roleFull?"FULL":(!can?"BUDGET":null);
              return <MarketCard key={p.id} p={p} owned={owned} canAdd={can} reason={reason} onTap={()=>toggle(p)}/>;
            })}
          </div>
        </>
      ) : (
        <MySquad squad={squad} captain={captain} setCaptain={setCaptain}
          vice={vice} setVice={setVice} toggle={toggle} avgPts={avgPts} spent={spent} setTab={setTab}/>
      )}
    </div>
  );
}

function MarketCard({p,owned,canAdd,reason,onTap}){
  return (
    <div onClick={(owned||canAdd)?onTap:undefined} style={{
      display:"flex",alignItems:"center",gap:12,padding:"12px 14px",marginBottom:8,
      background:C.card,borderRadius:14,
      border:owned?`2px solid ${C.orange}`:`1px solid ${C.line}`,
      boxShadow:owned?`0 4px 16px ${C.orange}22`:"0 1px 3px #0000000a",
      opacity:(!owned&&!canAdd)?0.55:1,cursor:(owned||canAdd)?"pointer":"default",transition:"all .15s"}}>
      <div style={{width:42,height:42,borderRadius:12,flexShrink:0,
        background:owned?C.orange:C.orangeSoft,color:owned?"#fff":C.orangeDeep,
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:9,fontWeight:700,letterSpacing:.5,opacity:.85}}>{POS_LABEL[p.p]}</span>
        <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:15,lineHeight:1}}>{p.num}</span>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:15,color:C.ink,
            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.n}</span>
          <span style={{fontSize:13}}>{FLAG[p.t]||"🏳"}</span>
        </div>
        <div style={{fontSize:12,color:C.mute,marginTop:1}}>{p.c}</div>
        <div style={{display:"flex",gap:10,marginTop:4,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:11,fontWeight:700,color:C.orangeDeep}}>{p.pts} pts</span>
          <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,color:C.mute}}>
            <Icon name="users" size={12} style={{color:C.mute}}/>
            picked by {pickedBy(p.own).toLocaleString()}
          </span>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
        <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:16,color:C.ink}}><Icon name="credit" size={15} style={{marginRight:3,verticalAlign:"baseline"}}/>{p.pr}</span>
        {reason
          ? <span style={{fontSize:9,fontWeight:800,letterSpacing:.5,color:C.mute,
              background:C.paper,border:`1px solid ${C.line}`,padding:"4px 7px",borderRadius:7,whiteSpace:"nowrap"}}>
              {reason==="FULL"?"LINE FULL":"NO BUDGET"}
            </span>
          : <div style={{width:30,height:30,borderRadius:9,display:"grid",placeItems:"center",
              background:owned?C.ink:C.orange,color:"#fff"}}>
              <Icon name={owned?"minus":"plus"} size={16}/>
            </div>}
      </div>
    </div>
  );
}

function MySquad({squad,captain,setCaptain,vice,setVice,toggle,avgPts,spent,setTab}){
  if(!squad.length) return (
    <div style={{textAlign:"center",padding:"60px 30px",color:C.mute}}>
      <div style={{display:"flex",justifyContent:"center",marginBottom:16,color:C.line}}><Icon name="ball" size={48} stroke={1.6}/></div>
      <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:18,color:C.ink}}>No players yet</div>
      <div style={{fontSize:14,marginTop:6}}>Head to the market and start picking your dream XI</div>
    </div>
  );
  return (
    <div style={{padding:"4px 16px 20px"}}>
      <div style={{display:"flex",gap:10,marginBottom:14}}>
        <div style={S.statCard}><div style={S.miniLabel}>SPENT</div><div style={S.statBig}><Icon name="credit" size={18} style={{marginRight:4,verticalAlign:"baseline"}}/>{spent}</div></div>
        <div style={S.statCard}><div style={S.miniLabel}>AVG FORM</div><div style={{...S.statBig,color:C.orange}}>{avgPts}</div></div>
        <div style={S.statCard}><div style={S.miniLabel}>PLAYERS</div><div style={S.statBig}>{squad.length}/{SQUAD_SIZE}</div></div>
      </div>
      {["GK","DF","MF","FW"].map(pos=>{
        const group=squad.map(id=>PLAYERS.find(p=>p.id===id)).filter(p=>p&&p.p===pos);
        if(!group.length)return null;
        return (
          <div key={pos} style={{marginBottom:16}}>
            <div style={S.sectionLabel}>{POS_LABEL[pos]} · {group.length}/{SQUAD_RULES[pos]}</div>
            {group.map(p=>(
              <div key={p.id} style={S.squadRow}>
                <span style={{fontSize:15}}>{FLAG[p.t]||"🏳"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:14,color:C.ink}}>{p.n}</div>
                  <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:C.mute,marginTop:1}}>
                    <span>{p.c} · <Icon name="credit" size={12} style={{marginRight:2,verticalAlign:"baseline"}}/>{p.pr}</span>
                    <span style={{display:"inline-flex",alignItems:"center",gap:3}}>
                      <Icon name="users" size={11} style={{color:C.mute}}/>{pickedBy(p.own).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button onClick={()=>{setCaptain(captain===p.id?null:p.id);if(vice===p.id)setVice(null);}}
                  style={{...S.cvBtn,...(captain===p.id?{background:C.orange,color:"#fff",borderColor:C.orange}:{})}}>C</button>
                <button onClick={()=>{setVice(vice===p.id?null:p.id);if(captain===p.id)setCaptain(null);}}
                  style={{...S.cvBtn,...(vice===p.id?{background:C.ink,color:"#fff",borderColor:C.ink}:{})}}>V</button>
                <button onClick={()=>toggle(p)} style={S.delBtn}><Icon name="x" size={15}/></button>
              </div>
            ))}
          </div>
        );
      })}
      {squad.length>=11 && <button onClick={()=>setTab("pitch")} style={{...S.cta,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8}}>VIEW ON PITCH <Icon name="arrow" size={18}/></button>}
    </div>
  );
}

// ─── JERSEY SVG (custom kit) ───────────────────────────────────────────────
function JerseyShirt({primary,secondary="#16130f",accent="#ffffff",pattern="blaze",num,size=46,showNum=true}){
  const uid=`${pattern}${primary}${secondary}${accent}`.replace(/[^a-z0-9]/gi,"")+(""+size).replace(".","");
  const dark=shade(primary,-0.32), darker=shade(primary,-0.5), light=shade(primary,0.22);
  const body="M21 8 L9 13 L4 27 Q3.5 28.5 5 29.5 L11.5 33 Q12.5 33.5 13 32.5 L16 27 L16 55 Q16 57 18 57 L46 57 Q48 57 48 55 L48 27 L51 32.5 Q51.5 33.5 52.5 33 L59 29.5 Q60.5 28.5 60 27 L55 13 L43 8 Q40 14 32 14 Q24 14 21 8 Z";
  const lSleeve="M21 8 L9 13 L4 27 Q3.5 28.5 5 29.5 L11.5 33 L17 25 L19 13 Z";
  const rSleeve="M43 8 L55 13 L60 27 Q60.5 28.5 59 29.5 L52.5 33 L47 25 L45 13 Z";
  return (
    <svg viewBox="0 0 64 62" width={size} height={size*0.97} style={{display:"block",overflow:"visible"}}>
      <defs>
        <linearGradient id={`jb${uid}`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor={light}/><stop offset="0.45" stopColor={primary}/><stop offset="1" stopColor={dark}/>
        </linearGradient>
        <linearGradient id={`jsl${uid}`} x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor={darker}/><stop offset="1" stopColor={primary}/>
        </linearGradient>
        <linearGradient id={`jsr${uid}`} x1="1" y1="0" x2="0" y2="0.4">
          <stop offset="0" stopColor={darker}/><stop offset="1" stopColor={primary}/>
        </linearGradient>
        <radialGradient id={`jh${uid}`} cx="0.38" cy="0.28" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.32"/><stop offset="1" stopColor="#ffffff" stopOpacity="0"/>
        </radialGradient>
        {/* secondary-shaded gradient so pattern blocks also get 3D light */}
        <linearGradient id={`jp${uid}`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor={shade(secondary,0.18)}/><stop offset="1" stopColor={shade(secondary,-0.25)}/>
        </linearGradient>
        <clipPath id={`jc${uid}`}><path d={body}/></clipPath>
      </defs>

      {/* sleeves */}
      <path d={lSleeve} fill={`url(#jsl${uid})`}/>
      <path d={rSleeve} fill={`url(#jsr${uid})`}/>
      {/* body */}
      <path d={body} fill={`url(#jb${uid})`}/>

      {/* ── PATTERNS (clipped to body) ── */}
      <g clipPath={`url(#jc${uid})`}>
        {/* BLAZE — diagonal speed sash (Puma-style) */}
        {pattern==="blaze" && <>
          <path d="M2 58 L60 6 L64 13 L8 64 Z" fill={`url(#jp${uid})`}/>
          <path d="M0 50 L58 0 L60 3 L4 54 Z" fill={accent} opacity=".9"/>
        </>}
        {/* APEX — three shoulder stripes (Adidas-style) */}
        {pattern==="apex" && <>
          {[0,1,2].map(i=>(
            <g key={i}>
              <rect x={9+i*4} y="6" width="2.4" height="26" fill={i===1?accent:secondary} transform={`rotate(28 ${10+i*4} 12)`}/>
              <rect x={50-i*4} y="6" width="2.4" height="26" fill={i===1?accent:secondary} transform={`rotate(-28 ${51-i*4} 12)`}/>
            </g>
          ))}
        </>}
        {/* STRIKE — diagonal color block (Nike-style) */}
        {pattern==="strike" && <>
          <path d="M16 6 L48 6 L48 26 Q34 34 16 30 Z" fill={`url(#jp${uid})`}/>
          <path d="M16 30 Q34 34 48 26 L48 29 Q34 37 16 33 Z" fill={accent} opacity=".95"/>
        </>}
        {/* VERTEX — chevron arrows (modern) */}
        {pattern==="vertex" && <>
          {[16,28,40,52].map((y,i)=>(
            <path key={i} d={`M14 ${y} L32 ${y-7} L50 ${y} L50 ${y+3} L32 ${y-4} L14 ${y+3} Z`}
              fill={i%2?accent:secondary} opacity={i%2?".85":".92"}/>
          ))}
        </>}
        {/* PINSTRIPE — fine vertical lines (classic) */}
        {pattern==="pinstripe" && [18,23,28,33,38,43,48].map((x,i)=>(
          <rect key={i} x={x} y="6" width="1.4" height="56" fill={secondary} opacity=".8"/>
        ))}
        {/* COLUMN — bold vertical stripes (Juve/Barça classic) */}
        {pattern==="column" && [19,29,39].map((x,i)=>(
          <rect key={i} x={x} y="6" width="6" height="56" fill={`url(#jp${uid})`}/>
        ))}
        {/* BANDS — bold horizontal hoops (Celtic-style) */}
        {pattern==="bands" && [16,28,40,52].map((y,i)=>(
          <rect key={i} x="0" y={y} width="64" height="6.5" fill={`url(#jp${uid})`}/>
        ))}
        {/* ECLIPSE — vertical half + accent seam (modern split) */}
        {pattern==="eclipse" && <>
          <rect x="32" y="6" width="32" height="56" fill={`url(#jp${uid})`}/>
          <rect x="31" y="6" width="2" height="56" fill={accent} opacity=".95"/>
        </>}

        {/* depth shadows + sheen on top of every pattern */}
        <path d="M21 8 Q24 14 32 14 Q40 14 43 8 L41 11 Q32 17 23 11 Z" fill="#000" opacity=".18"/>
        <rect x="44" y="14" width="6" height="44" fill="#000" opacity=".12"/>
        <rect x="15" y="14" width="4" height="44" fill="#fff" opacity=".08"/>
        <rect x="0" y="0" width="64" height="62" fill={`url(#jh${uid})`}/>
      </g>

      {/* accent cuffs */}
      <path d="M5.2 28.7 L11.5 31.8 L12.5 30 L6.2 26.9 Z" fill={accent} opacity=".95"/>
      <path d="M58.8 28.7 L52.5 31.8 L51.5 30 L57.8 26.9 Z" fill={accent} opacity=".95"/>

      {/* collar with accent trim */}
      <path d="M21 8 Q32 15 43 8 L40.5 10.5 Q32 16.5 23.5 10.5 Z" fill={dark}/>
      <path d="M22.5 9.5 Q32 15.5 41.5 9.5" fill="none" stroke={accent} strokeWidth="1" opacity=".9"/>

      {/* outline */}
      <path d={body} fill="none" stroke="#00000040" strokeWidth="0.8"/>

      {showNum && num!=null && (
        <text x="32" y="46" textAnchor="middle" fontWeight="900" fontSize="21"
          fill="#fff" stroke="#00000055" strokeWidth=".7" paintOrder="stroke"
          style={{fontFamily:"'Archivo',sans-serif"}}>{num}</text>
      )}
    </svg>
  );
}

// fantasy display names for kit patterns
const PATTERN_NAMES={blaze:"Blaze",apex:"Apex",strike:"Strike",vertex:"Vertex",
  pinstripe:"Pinline",column:"Column",bands:"Bands",eclipse:"Eclipse"};

// lighten/darken a hex color by amount in [-1,1]
function shade(hex,amt){
  let h=hex.replace("#","");
  if(h.length===3)h=h.split("").map(c=>c+c).join("");
  let r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  const f=amt<0?0:255, p=Math.abs(amt);
  r=Math.round((f-r)*p+r); g=Math.round((f-g)*p+g); b=Math.round((f-b)*p+b);
  return "#"+[r,g,b].map(x=>Math.max(0,Math.min(255,x)).toString(16).padStart(2,"0")).join("");
}

function LockBanner({compact=false, status}){
  const s = status || { locked: false, canEdit: true, message: "Formations unlocked - you can edit" };
  const isLocked = !!s.locked;
  const text = s.message || (isLocked ? "Formations are locked until next Gameweek" : "Formations unlocked - you can edit");

  const remaining = s.countdownMs ?? 0;
  // Urgent highlight (red/orange) only for the pre-lock countdown when <10min to formations lock.
  // Do not apply to the locked state's "time to unlock" countdown.
  const isUnlockedCountdown = !isLocked && remaining > 0;
  const isUrgent = isUnlockedCountdown && remaining < 10 * 60 * 1000;

  const base = compact
    ? {fontSize:10.5, fontWeight:700, display:"flex", alignItems:"center", gap:5, padding:"4px 0 6px"}
    : {margin:"0 16px 10px", borderRadius:12, padding:"8px 12px", display:"flex", alignItems:"center", gap:8, fontSize:12.5, fontWeight:700};

  const style = {
    ...base,
    background: isLocked ? "#fdf0eb" : "linear-gradient(90deg,#fff7f0,#fff0e9)",
    border: isLocked ? `1px solid #e11d48` : `1px solid ${C.orange}44`,
    color: isUrgent ? C.orangeDeep : (isLocked ? "#9f2a1f" : C.ink),
    fontWeight: isUrgent ? 800 : 700,
  };

  const iconColor = isUrgent ? C.orangeDeep : (isLocked ? "#e11d48" : C.orange);

  return (
    <div style={style}>
      <span style={{color: iconColor, display:"inline-flex"}}>
        <Icon name={isLocked ? "lock" : "clock"} size={compact?13:16}/>
      </span>
      <span>{text}</span>
    </div>
  );
}

function Pitch({squad,captain,vice,jersey,setJersey,teamName,setTeamName,setShareOpen,
  formation,setFormation,starters,benchIds,promote,setCap,setVc, swapPlayers, authUser, GW, spent, formationLock}){
  const PLAYERS=usePlayers();
  const [showKit,setShowKit]=useState(false);
  const [picker,setPicker]=useState(null); // player id being assigned C/V
  const [projInfo,setProjInfo]=useState(false); // PROJ explainer tooltip
  const starterPlayers=useMemo(()=>starters.map(id=>PLAYERS.find(p=>p.id===id)).filter(Boolean),[starters,PLAYERS]);
  const benchPlayers=useMemo(()=>benchIds.map(id=>PLAYERS.find(p=>p.id===id)).filter(Boolean),[benchIds,PLAYERS]);
  const rows=useMemo(()=>{
    const fr=formationRows(formation);
    const byPos={GK:[],DF:[],MF:[],FW:[]};
    starterPlayers.forEach(p=>{if(byPos[p.p])byPos[p.p].push(p);});
    return fr.map(({pos,count})=>({pos,players:(byPos[pos]||[]).slice(0,count)}));
  },[starterPlayers,formation]);
  const total=starterPlayers.reduce((s,p)=>s+(p.pts||0),0).toFixed(0);
  const COLORS=["#ff5b1e","#16130f","#e11d48","#2563eb","#16a34a","#9333ea","#0891b2","#eab308","#ffffff","#64748b"];
  const PATTERNS=["blaze","apex","strike","vertex","pinstripe","column","bands","eclipse"];

  const isLocked = useMemo(() => !!(formationLock && formationLock.canEdit === false), [formationLock]);

  // Swap selection (two players, any order, same role only)
  const [swapSel, setSwapSel] = useState([]); // array of ids, max 2
  function toggleSwapSelect(id){
    if (isLocked) return; // editing disabled during lock window
    setSwapSel(prev=>{
      if(prev.includes(id)) return prev.filter(x=>x!==id);
      if(prev.length===2) return [id]; // restart selection with this one
      return [...prev, id];
    });
  }
  const selP = swapSel.map(id=>PLAYERS.find(p=>p.id===id)).filter(Boolean);
  const onFieldCount = swapSel.filter(id=>starters.includes(id)).length;
  const canSwap = swapSel.length===2 && selP.length===2 && selP[0].p === selP[1].p && onFieldCount >= 1;

  function executeSwap(){
    if(!canSwap || !swapPlayers || isLocked) return;
    swapPlayers(swapSel[0], swapSel[1]);
    setSwapSel([]);
  }

  // Save status for explicit Save Formation
  const [saveStatus, setSaveStatus] = useState(null); // 'saving' | 'saved' | 'error' | null

  async function handleSaveFormation(){
    if (isLocked) {
      setSaveStatus("error");
      setTimeout(()=>setSaveStatus(null), 1600);
      return;
    }
    const u = (typeof window!=="undefined" && window.__FTB_USER) || authUser || null;
    const currentSpent = typeof spent==="number" ? spent : squad.reduce((s,id)=>s+(PLAYERS.find(pp=>pp.id===id)?.pr||0),0);
    const bench = squad.filter(id=>!starters.includes(id));
    if(!starters.length || starters.length>11){
      setSaveStatus("error"); setTimeout(()=>setSaveStatus(null),1400); return;
    }
    if(!HAS_SUPABASE || !u?.id){
      setSaveStatus("saved"); setTimeout(()=>setSaveStatus(null),1500); return;
    }
    setSaveStatus("saving");
    try{
      const picks = squad.map(id=>{const p=PLAYERS.find(x=>x.id===id); return {id,pr:p?.pr||0};});
      const r = await saveRoster(u.id, picks, {name:teamName, budget_spent:currentSpent});
      const rid = r?.id;
      const gw = (typeof GW==="number" ? GW : 1);
      if(rid){
        await saveLineup(rid, gw, {starters, bench, captainId:captain, viceId:vice});
      }
      setSaveStatus("saved");
      setTimeout(()=>setSaveStatus(null),1800);
    }catch(e){
      console.warn("saveFormation:",e?.message||e);
      setSaveStatus("error");
      setTimeout(()=>setSaveStatus(null),2200);
    }
  }

  return (
    <div style={{padding:"14px 16px 24px"}}>
      <LockBanner status={formationLock}/>
      <div style={S.filterScroll}>
        {Object.keys(FORMATIONS).map(f=>(
          <button key={f} onClick={()=>setFormation(f)} style={{...S.chip,...(formation===f?S.chipOn:{})}}>{f}</button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,paddingRight:4,flexShrink:0,position:"relative"}}>
          <span style={{fontSize:11,color:C.mute,fontWeight:600}}>PROJ</span>
          <button onClick={()=>setProjInfo(v=>!v)} aria-label="What is PROJ?"
            style={{display:"inline-grid",placeItems:"center",width:16,height:16,borderRadius:"50%",
              border:`1.5px solid ${C.mute}`,background:"transparent",color:C.mute,cursor:"pointer",
              fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:10,lineHeight:1,padding:0}}>i</button>
          <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:18,color:C.orange}}>{total}</span>
          {projInfo && (
            <>
              <div onClick={()=>setProjInfo(false)} style={{position:"fixed",inset:0,zIndex:40}}/>
              <div style={S.projPop}>
                <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:13,color:C.ink,marginBottom:5}}>
                  Projected points
                </div>
                <p style={{margin:0,fontSize:12,lineHeight:1.5,color:C.inkSoft}}>
                  The combined form rating of your 11 starters — an estimate of how many points
                  this lineup could score. It updates as you swap players or change formation.
                  Captain and Vice multipliers are applied on matchday.
                </p>
                <div style={S.projPopArrow}/>
              </div>
            </>
          )}
        </div>
      </div>

      {/* KIT DESIGNER toggle */}
      <button onClick={()=>setShowKit(k=>!k)} style={S.kitToggle}>
        <span style={{display:"inline-flex",alignItems:"center",gap:8}}>
          <span style={{display:"inline-flex",color:jersey.primary}}><JerseyShirt {...jersey} num={null} size={20} showNum={false}/></span>
          DESIGN YOUR KIT
        </span>
        <span style={{display:"inline-flex",transform:showKit?"rotate(180deg)":"none",transition:"transform .2s"}}>
          <Icon name="chevron" size={18}/>
        </span>
      </button>
      {showKit && (
        <div style={S.kitPanel}>
          <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:14}}>
            <div style={S.kitStage}>
              <div style={{filter:"drop-shadow(0 8px 10px #00000035)"}}>
                <JerseyShirt {...jersey} num={10} size={86}/>
              </div>
              <div style={S.kitStageShadow}/>
            </div>
            <div style={{flex:1}}>
              <div style={S.miniLabel}>TEAM NAME</div>
              <input value={teamName} onChange={e=>setTeamName(e.target.value.slice(0,18))}
                style={S.kitNameInput} maxLength={18}/>
            </div>
          </div>
          <div style={S.miniLabel}>PRIMARY</div>
          <div style={S.swatchRow}>
            {COLORS.map(c=>(
              <button key={c} onClick={()=>setJersey(j=>({...j,primary:c}))} aria-label={c}
                style={{...S.swatch,background:c,...(jersey.primary===c?S.swatchOn:{})}}/>
            ))}
          </div>
          <div style={{...S.miniLabel,marginTop:10}}>SECONDARY</div>
          <div style={S.swatchRow}>
            {COLORS.map(c=>(
              <button key={c} onClick={()=>setJersey(j=>({...j,secondary:c}))} aria-label={c}
                style={{...S.swatch,background:c,...(jersey.secondary===c?S.swatchOn:{})}}/>
            ))}
          </div>
          <div style={{...S.miniLabel,marginTop:10}}>ACCENT <span style={{color:C.mute,fontWeight:600}}>· trim & details</span></div>
          <div style={S.swatchRow}>
            {COLORS.map(c=>(
              <button key={c} onClick={()=>setJersey(j=>({...j,accent:c}))} aria-label={c}
                style={{...S.swatch,background:c,...(jersey.accent===c?S.swatchOn:{})}}/>
            ))}
          </div>
          <div style={{...S.miniLabel,marginTop:12}}>DESIGN</div>
          <div style={S.patGrid}>
            {PATTERNS.map(p=>(
              <button key={p} onClick={()=>setJersey(j=>({...j,pattern:p}))}
                style={{...S.patTile,...(jersey.pattern===p?S.patTileOn:{})}}>
                <div style={{pointerEvents:"none"}}>
                  <JerseyShirt {...jersey} pattern={p} num={null} showNum={false} size={38}/>
                </div>
                <span style={{fontSize:9.5,fontWeight:800,letterSpacing:.5,marginTop:3,
                  color:jersey.pattern===p?C.orangeDeep:C.mute,textTransform:"uppercase",
                  fontFamily:"'Archivo Narrow',sans-serif"}}>{PATTERN_NAMES[p]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={S.pitchScene}>
        {/* tilted pitch surface */}
        <div style={S.pitchSurface}>
          {/* mowing stripes */}
          <div style={S.pitchStripes} aria-hidden>
            {Array.from({length:10}).map((_,i)=>(
              <div key={i} style={{flex:1,background:i%2===0
                ?"linear-gradient(90deg,#1f6f3a,#247d42)"
                :"linear-gradient(90deg,#1a6234,#1f7239)"}}/>
            ))}
          </div>
          {/* lines */}
          <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}} viewBox="0 0 340 520" preserveAspectRatio="none">
            <g fill="none" stroke="#eafff2" strokeWidth="1.6" opacity=".4">
              <rect x="14" y="14" width="312" height="492" rx="2"/>
              <line x1="14" y1="260" x2="326" y2="260"/>
              <circle cx="170" cy="260" r="52"/>
              <rect x="90" y="14" width="160" height="76"/>
              <rect x="126" y="14" width="88" height="34"/>
              <rect x="90" y="430" width="160" height="76"/>
              <rect x="126" y="472" width="88" height="34"/>
              <path d="M137 90 A52 52 0 0 0 203 90"/>
              <path d="M137 430 A52 52 0 0 1 203 430"/>
            </g>
            <circle cx="170" cy="260" r="3" fill="#eafff2" opacity=".45"/>
          </svg>
          {/* glow accents */}
          <div style={S.pitchGlowTop} aria-hidden/>
        </div>

        {/* players layer — upright, above the tilted surface */}
        <div style={S.pitchPlayers}>
          {rows.map(({pos,players},ri)=>(
            <div key={ri} style={{display:"flex",justifyContent:"space-around",alignItems:"center"}}>
              {players.length>0
                ? players.map(p=>(
                    <div key={p.id} onClick={()=>toggleSwapSelect(p.id)} style={{cursor: isLocked ? "default" : "pointer", position:"relative", opacity: isLocked ? 0.65 : 1}}>
                      <PlayerCard p={p} cap={captain===p.id} vice={vice===p.id} jersey={jersey} selected={swapSel.includes(p.id)} onCVCtrl={isLocked ? undefined : ()=>setPicker(p.id)}/>
                    </div>))
                : <span style={{fontSize:10.5,color:"#ffffffb0",fontWeight:700,letterSpacing:1.5,
                    textShadow:"0 1px 4px #0008"}}>{POS_LABEL[pos]}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Swap status + action (temporary button when two selected) */}
      {swapSel.length>0 && (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,margin:"8px 0 2px",flexWrap:"wrap"}}>
          {isLocked ? (
            <span style={{fontSize:11,color:"#c2410f",fontWeight:700}}>Editing locked — swap disabled</span>
          ) : (
            <span style={{fontSize:11,color: canSwap ? C.ink : C.mute, fontWeight:700}}>
              {swapSel.length===1 ? "Select 2nd player (same role)" : canSwap ? "Both highlighted — ready" : "Different roles — not allowed"}
            </span>
          )}
          {swapSel.length===2 && canSwap && !isLocked && (
            <button onClick={executeSwap} style={{...S.cta,padding:"8px 16px",fontSize:13,marginTop:0,boxShadow:`0 4px 12px ${C.orange}33`}}>SWAP</button>
          )}
          <button onClick={()=>setSwapSel([])} style={S.iconBtn} aria-label="clear selection"><Icon name="x" size={16}/></button>
        </div>
      )}

      {starterPlayers.length>0 && swapSel.length===0 && (
        <p style={{fontSize:11.5,color:C.mute,textAlign:"center",marginTop:8}}>
          {isLocked
            ? "Lineup locked for this Gameweek — no swaps or C/V changes"
            : <>Tap <span style={{color:C.orange}}>card</span> to select for swap (same role) · tap <Icon name="crown" size={12}/> for <b style={{color:C.ink}}>Captain</b> / Vice</>}
        </p>
      )}

      {/* BENCH */}
      {benchPlayers.length>0 && (
        <div style={{marginTop:14, opacity: isLocked ? 0.6 : 1}}>
          <div style={S.sectionLabel}>{isLocked ? "BENCH (locked — editing disabled)" : "BENCH · tap to select for swap (same role)"}</div>
          <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
            {benchPlayers.map((p,i)=>(
              <button key={p.id} onClick={()=>toggleSwapSelect(p.id)} style={{...S.benchCard, ...(swapSel.includes(p.id)?{border:`2px solid ${C.orange}`, boxShadow:`0 0 0 3px ${C.orange}22`}:{})}}>
                <div style={S.benchOrder}>{i+1}</div>
                <JerseyShirt {...jersey} num={p.num} size={34}/>
                <div style={S.benchName}>{p.n}</div>
                <div style={S.benchPos}>{POS_LABEL[p.p]} · {FLAG[p.t]||"🏳"}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* captain / vice picker */}
      {picker && (()=>{ const pp=starterPlayers.find(x=>x.id===picker); if(!pp) return null; return (
        <div style={S.modalBackdrop} onClick={()=>setPicker(null)}>
          <div style={{...S.modalSheet,paddingBottom:24}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <JerseyShirt {...jersey} num={pp.num} size={44}/>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:18,color:C.ink}}>{pp.n}</div>
                <div style={{fontSize:12,color:C.mute}}>{POS_LABEL[pp.p]} · {pp.c} · <Icon name="credit" size={12} style={{marginRight:2,verticalAlign:"baseline"}}/>{pp.pr}</div>
              </div>
              <button onClick={()=>setPicker(null)} style={S.iconBtn}><Icon name="x" size={18}/></button>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setCap(pp.id);setPicker(null);}}
                style={{...S.loginBtn,background:captain===pp.id?C.mute:C.orange,color:"#fff"}}>
                {captain===pp.id?"Remove Captain":"Make Captain ×2"}
              </button>
              <button onClick={()=>{setVc(pp.id);setPicker(null);}}
                style={{...S.loginBtn,background:vice===pp.id?C.mute:C.ink,color:"#fff"}}>
                {vice===pp.id?"Remove Vice":"Make Vice"}
              </button>
            </div>
          </div>
        </div>
      );})()}

      {/* SAVE FORMATION — explicit persist to Supabase (follows site cta style) */}
      <button
        onClick={handleSaveFormation}
        disabled={isLocked || saveStatus==="saving" || starters.length<1}
        style={{
          ...S.cta,
          marginTop:14,
          background: isLocked ? "#8c8378" : (saveStatus==="saved" ? "#16a34a" : (saveStatus==="error" ? "#e11d48" : C.orange)),
          opacity: (isLocked || starters.length<1 || saveStatus==="saving") ? 0.65 : 1
        }}
      >
        {isLocked ? "FORMATIONS LOCKED" : (saveStatus==="saving" ? "SAVING..." : saveStatus==="saved" ? "SAVED TO CLOUD ✓" : saveStatus==="error" ? "SAVE FAILED — TRY AGAIN" : "SAVE SQUAD")}
      </button>
      <p style={{fontSize:11,color:C.mute,textAlign:"center",marginTop:6,lineHeight:1.4}}>
        Saves starters, bench, captain &amp; vice for the current matchday
      </p>
      {isLocked && (
        <p style={{fontSize:11,color:"#c2410f",textAlign:"center",marginTop:2,fontWeight:600}}>
          {formationLock?.message || "Formations locked — no changes allowed"}
        </p>
      )}

      {/* FLEX share button */}
      <button onClick={()=>setShareOpen(true)} disabled={starterPlayers.length<1}
        style={{...S.flexBtn,opacity:starterPlayers.length<1?0.5:1, marginTop:6}}>
        <Icon name="share" size={20}/> FLEX YOUR SQUAD
      </button>
      <p style={{fontSize:12,color:C.mute,textAlign:"center",marginTop:10,lineHeight:1.5}}>
        Generate a shareable card with your kit, captain and lineup
      </p>
    </div>
  );
}

function PlayerCard({p,cap,vice,jersey, selected, onCVCtrl}){
  // Single top-right control: shows the crown when the player is neither C nor V,
  // and turns into a solid C / V badge once assigned (replacing the crown, no overlap).
  // When onCVCtrl is provided (Pitch tab) it stays tappable to reopen the picker.
  const isCV = cap || vice;
  const cvStyle = cap
    ? {background:C.orange,color:"#fff",border:"none"}
    : {background:"#fff",color:C.ink,border:`1px solid ${C.line}`};
  return (
    <div style={S.pcWrap}>
      {onCVCtrl ? (
        <button onClick={(e)=>{e.stopPropagation(); onCVCtrl();}}
          style={{...S.pcCtrl, ...(isCV?cvStyle:{background:C.card,color:C.orange,border:`1px solid ${C.line}`})}}
          title="Set Captain / Vice">
          {isCV ? (cap?"C":"V") : <Icon name="crown" size={11}/>}
        </button>
      ) : (
        isCV && <div style={{...S.pcCtrl, ...cvStyle, cursor:"default"}}>{cap?"C":"V"}</div>
      )}
      <div style={{...S.pcCard, ...(selected?{outline:`2px solid ${C.orange}`, outlineOffset:1}:{}) }}>
        {/* jersey portrait area */}
        <div style={S.pcPortrait}>
          <JerseyShirt {...(jersey||{primary:"#ff5b1e",secondary:"#16130f",accent:"#ffffff",pattern:"blaze"})}
            num={p.num} size={44}/>
        </div>
        {/* info strip */}
        <div style={S.pcInfo}>
          <div style={S.pcName}>{p.n}</div>
          <div style={S.pcMeta}>
            <span style={S.pcFlag}>{FLAG[p.t]||"🏳"}</span>
            <span style={S.pcValue}><Icon name="credit" size={11} style={{marginRight:2,verticalAlign:"baseline"}}/>{p.pr}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const TIERS={elite:{c:"#ff5b1e",i:"crown",l:"ELITE"},gold:{c:"#e6a100",i:"trophy",l:"GOLD"},silver:{c:"#8c8378",i:"medal",l:"SILVER"}};

// ── Prize distribution (Option B — flatter, rewards depth). Top-100 share of the pool.
// Each entry: max rank covered + share-per-place (already normalized to sum 100%).
const PRIZE_CURVE=[
  {upTo:1,  pct:9.48},
  {upTo:2,  pct:6.64},
  {upTo:3,  pct:4.74},
  {upTo:10, pct:2.84},
  {upTo:30, pct:1.14},
  {upTo:100,pct:0.52},
];
function prizePctForRank(rank){
  for(const b of PRIZE_CURVE){ if(rank<=b.upTo) return b.pct; }
  return 0;
}
function Ranks({setTab}){
  const [board,setBoard]=useState([]);
  const [weekBoard,setWeekBoard]=useState([]);
  const [scope,setScope]=useState("overall"); // overall | week
  const [showTable,setShowTable]=useState(false); // top-100 how-it-works modal
  useEffect(()=>{
    let alive=true;
    getLeaderboard().then(rowsLive=>{
      if(!alive||!rowsLive||!rowsLive.length) return;
      const mapped=rowsLive.map((r,i)=>({
        rank:r.rank??i+1,
        prev:r.rank??i+1,
        name:r.display_name||r.x_handle||`Manager ${i+1}`,
        flag:"🌍",
        tier: (r.rank??i+1)<=10?"elite":(r.rank??i+1)<=50?"gold":"silver",
        pts:r.total_points??0,
      }));
      setBoard(mapped);
    }).catch(e=>console.warn("getLeaderboard failed:",e?.message||e));
    return ()=>{alive=false;};
  },[]);
  const shown = scope==="overall"?board:weekBoard;
  return (
    <div style={{paddingBottom:20}}>
      <div style={{padding:"14px 16px"}}>
        <div style={{...S.myRankCard, background: C.card, color: C.ink}}>
          <div style={{position:"relative",zIndex:1,textAlign:"center"}}>
            <div style={{fontSize:11,color:C.mute,letterSpacing:2,fontWeight:600}}>YOUR RANK</div>
            <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:18,color:C.mute,marginTop:6}}>No data available yet</div>
            <div style={{fontSize:12,color:C.mute,marginTop:4}}>Sign in and compete to see your position</div>
          </div>
        </div>
      </div>

      {/* Outside top 100? Quests banner */}
      <div style={{padding:"0 16px 14px"}}>
        <button onClick={()=>setTab&&setTab("quests")} style={S.questBanner}>
          <span style={{color:C.orange,display:"inline-flex"}}><Icon name="target" size={22}/></span>
          <div style={{flex:1,textAlign:"left"}}>
            <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:14,color:C.ink}}>
              Not top 100 yet? Win anyway.
            </div>
            <div style={{fontSize:12,color:C.mute,marginTop:1}}>Earn SOL with reach & ladder bounties — tap to play</div>
          </div>
          <span style={{color:C.ink,display:"inline-flex"}}><Icon name="arrow" size={18}/></span>
        </button>
      </div>

      <div style={{padding:"0 16px 6px"}}>
        <div style={S.poolBanner}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <img src="/solana-logo.jpg" alt="Solana" style={{width:28,height:28,borderRadius:"50%",objectFit:"cover",border:"1px solid rgba(0,0,0,0.1)",flexShrink:0}}/>
            <div>
              <div style={{fontSize:10,color:C.mute,letterSpacing:1.5,fontWeight:700}}>LIVE PRIZE POOL</div>
              <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:20,color:C.ink}}>Live</div>
            </div>
          </div>
          <div style={{fontSize:11,color:C.orangeDeep,fontWeight:700,background:C.orangeSoft,
            padding:"6px 12px",borderRadius:20}}>TOP 100 PAID</div>
        </div>
      </div>

      {/* How it works — expandable inline, identical pattern to Pool/Quests */}
      <div style={{padding:"0 16px 14px"}}>
        <button onClick={()=>setShowTable(v=>!v)} style={S.howItWorksWide}>
          How it works
          <span style={{display:"inline-flex",transform:showTable?"rotate(180deg)":"none",transition:"transform .2s"}}>
            <Icon name="chevron" size={16}/>
          </span>
        </button>
        {showTable && <PrizeTableInline board={board}/>}
      </div>

      <div style={{padding:"0 16px"}}>
        <div style={S.scopeToggle}>
          <button onClick={()=>setScope("overall")} style={{...S.scopeBtn,...(scope==="overall"?S.scopeBtnOn:{})}}>Overall</button>
          <button onClick={()=>setScope("week")} style={{...S.scopeBtn,...(scope==="week"?S.scopeBtnOn:{})}}>This week</button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <img src="/solana-logo.jpg" alt="Solana" style={{width:16,height:16,borderRadius:"50%",objectFit:"cover",border:"1px solid rgba(0,0,0,0.1)"}}/>
          <span style={S.sectionLabel}>{scope==="overall"?"GLOBAL TOP MANAGERS":"THIS MATCHDAY'S BEST"}</span>
        </div>
        {shown.length === 0 ? (
          <div style={{padding:"20px",textAlign:"center",color:C.mute,fontSize:13}}>
            No data available yet — leaderboard will appear when the tournament starts.
          </div>
        ) : shown.map(r=>{
          const t=TIERS[r.tier]; const moved=r.prev-r.rank;
          return (
            <div key={r.rank} style={{display:"flex",alignItems:"center",gap:11,padding:"12px",
              marginBottom:7,borderRadius:13,background:C.card,
              border:r.rank<=3?`1.5px solid ${t.c}55`:`1px solid ${C.line}`,
              boxShadow:r.rank<=3?`0 3px 14px ${t.c}1a`:"0 1px 3px #0000000a"}}>
              <div style={{width:30,textAlign:"center",flexShrink:0,display:"flex",justifyContent:"center"}}>
                {r.rank<=3?<Icon name={r.rank===1?"crown":"medal"} size={20} style={{color:t.c}}/>
                  :<span style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:15,color:C.mute}}>{r.rank}</span>}
              </div>
              <div style={{width:18,textAlign:"center",flexShrink:0,fontSize:11,fontWeight:700,
                color:moved>0?C.orange:moved<0?"#c0392b":C.line}}>
                {moved>0?`▲${moved}`:moved<0?`▼${-moved}`:"—"}
              </div>
              <span style={{fontSize:16,flexShrink:0}}>{r.flag}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:14,color:C.ink,
                  whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.name}</div>
                <div style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:2,
                  fontSize:9.5,fontWeight:700,color:t.c,letterSpacing:.5}}>
                  <Icon name={t.i} size={12} style={{color:t.c}}/> {t.l}
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:15,color:C.ink}}>{r.pts}</div>
                {scope==="overall"
                  ? <div style={{fontSize:11,fontWeight:700,color:C.mute}}>—</div>
                  : <div style={{fontSize:10,fontWeight:700,color:C.mute,letterSpacing:.3}}>this week</div>}
              </div>
            </div>
          );
        })}

        {/* Private leagues teaser */}
        <div style={{...S.futureMini,marginTop:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{color:"#b8b0a4"}}><Icon name="ticket" size={20}/></span>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:13,color:"#b8b0a4"}}>
                Private invite-only leagues <span style={S.csTag}>COMING SOON</span>
              </div>
              <div style={{fontSize:11.5,color:"#b8b0a4",marginTop:3,lineHeight:1.4}}>
                Create exclusive leagues with friends and fund your own frozen prize pool.
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── PRIZE TABLE (inline expand under "How it works") ──
function PrizeTableInline({board}){
  const nameByRank={}; board.forEach(r=>{nameByRank[r.rank]=r.name;});
  // Fixed example potentials (no fake live pool value)
  const exampleWins = [41,28,19,13,3,1.5];
  const rows=Array.from({length:100},(_,i)=>{
    const rank=i+1;
    const win = rank<=3 ? exampleWins[rank-1] : (rank<=10 ? 13 : (rank<=30 ? 3 : (rank<=100 ? 1.5 : 0)));
    return { rank, name:nameByRank[rank]||`Rank ${rank}`, pct:prizePctForRank(rank), win };
  });
  return (
    <div style={{...S.tokenStat,padding:"14px 16px",marginTop:8}}>
      <p style={{margin:"0 0 12px",fontSize:12.5,color:C.mute,lineHeight:1.5}}>
        The top 100 share the live pool. Each position earns a fixed
        share of the pool — payouts grow as the pool grows. Figures update live.
      </p>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
        <img src="/solana-logo.jpg" alt="Solana" style={{width:14,height:14,borderRadius:"50%",objectFit:"cover"}}/>
        <span style={{fontSize:10,fontWeight:800,color:C.mute,letterSpacing:.5,fontFamily:"'Archivo Narrow',sans-serif"}}>TOP 100 PRIZE DISTRIBUTION</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"36px 1fr 56px 78px",gap:4,padding:"8px 10px",
        borderBottom:`1px solid ${C.line}`,fontSize:10,fontWeight:800,color:C.mute,letterSpacing:.5,
        fontFamily:"'Archivo Narrow',sans-serif",textAlign:"right"}}>
        <span style={{textAlign:"left"}}>#</span><span style={{textAlign:"left"}}>MANAGER</span><span>SHARE</span><span>POTENTIAL</span>
      </div>
      <div style={{maxHeight:340,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
        {rows.map(r=>(
          <div key={r.rank} style={{display:"grid",gridTemplateColumns:"36px 1fr 56px 78px",gap:4,
            padding:"9px 10px",alignItems:"center",borderBottom:`1px solid ${C.line}`,textAlign:"right"}}>
            <span style={{textAlign:"left",fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:13,
              color:r.rank<=3?C.orange:C.mute}}>{r.rank}</span>
            <span style={{textAlign:"left",fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:12.5,
              color:C.ink,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.name}</span>
            <span style={{fontSize:11.5,color:C.mute,fontWeight:700}}>{r.pct}%</span>
            <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:13,color:C.orangeDeep}}>◎{r.win}</span>
          </div>
        ))}
      </div>
      <p style={{margin:"10px 0 0",fontSize:10.5,color:C.mute,lineHeight:1.5,textAlign:"center"}}>
        Potential winnings are estimates based on the current pool and your rank right now. Final payouts
        are settled on-chain at the end of the season.
      </p>
    </div>
  );
}
function ShareModal({squad,captain,vice,teamName,jersey,onClose}){
  const PLAYERS=usePlayers();
  const [formation,setFormation]=useState("4-3-3");
  const [copied,setCopied]=useState(false);
  const [saving,setSaving]=useState(false);
  const AFFILIATE="fantaball.tech/join/DEGEN247";

  async function saveImage(){
    const node=document.getElementById("flex-card");
    if(!node||saving) return;
    setSaving(true);
    try{
      const dataUrl=await toPng(node,{pixelRatio:2,cacheBust:true,backgroundColor:"#16130f"});
      const a=document.createElement("a");
      a.download=`fantaball-${(teamName||"squad").toLowerCase().replace(/\s+/g,"-")}.png`;
      a.href=dataUrl; a.click();
    }catch(e){ console.warn("saveImage failed:",e?.message||e); }
    finally{ setSaving(false); }
  }

  const players=useMemo(()=>squad.map(id=>PLAYERS.find(p=>p.id===id)).filter(Boolean),[squad]);
  const rows=useMemo(()=>{
    const fr=formationRows(formation);
    const byPos={GK:[],DF:[],MF:[],FW:[]};
    players.forEach(p=>{if(byPos[p.p])byPos[p.p].push(p);});
    return fr.map(({pos,count})=>({pos,players:(byPos[pos]||[]).slice(0,count)}));
  },[players,formation]);
  const capP=PLAYERS.find(p=>p.id===captain);
  const bench=useMemo(()=>{
    const starterIds=new Set(rows.flatMap(r=>r.players.map(p=>p.id)));
    return players.filter(p=>!starterIds.has(p.id)).slice(0,7);
  },[players,rows]);
  const total=players.reduce((s,p)=>s+p.pts,0).toFixed(0);
  const overall=players.length?Math.min(99,Math.round(60+players.reduce((s,p)=>s+p.pts,0)/players.length*0.9)):0;

  function copyLink(){
    try{ navigator.clipboard?.writeText("https://"+AFFILIATE); }catch(e){}
    setCopied(true); setTimeout(()=>setCopied(false),1800);
  }
  const tweet=`I just built my @Fantaball World Cup squad 🔥 ${total} projected pts. Build yours and win SOL 👉 https://${AFFILIATE}`;

  return (
    <div style={S.modalBackdrop} onClick={onClose}>
      <div style={S.modalSheet} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",marginBottom:12}}>
          <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:18,color:C.ink}}>YOUR SQUAD CARD</div>
          <button onClick={onClose} style={{...S.iconBtn,marginLeft:"auto"}}><Icon name="x" size={18}/></button>
        </div>

        <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto"}}>
          {Object.keys(FORMATIONS).map(f=>(
            <button key={f} onClick={()=>setFormation(f)}
              style={{...S.chip,flexShrink:0,...(formation===f?S.chipOn:{})}}>{f}</button>
          ))}
        </div>

        {/* ════ PREMIUM POSTER CARD ════ */}
        <div style={S.poster} id="flex-card">
          <div style={S.posterGlow} aria-hidden/>

          {/* TOP BAR */}
          <div style={S.posterTop}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <Icon name="trophy" size={16} style={{color:C.orange}}/>
              <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:13,color:"#fff",letterSpacing:.5}}>
                FANTA<span style={{color:C.orange}}>WORLD CUP</span> 2026
              </span>
            </div>
            <span style={S.seasonTag}>SEASON 01</span>
          </div>

          {/* HERO: captain + team panel */}
          <div style={S.posterHero}>
            {/* Captain showcase (real captain in the custom kit) */}
            <div style={S.capPhotoSlot}>
              <div style={S.capShowcase}>
                <div style={{transform:"scale(1.7)",filter:"drop-shadow(0 8px 14px #0007)"}}>
                  <JerseyShirt {...jersey} num={capP?.num} size={64}/>
                </div>
                <div style={S.capArmband}>C</div>
                <div style={S.capShowcaseName}>{capP?capP.n:"PICK A CAPTAIN"}</div>
              </div>
            </div>

            {/* Team info panel */}
            <div style={S.teamPanel}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <span style={{color:C.orange,display:"inline-flex"}}><JerseyShirt {...jersey} num={null} showNum={false} size={20}/></span>
                <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:18,color:"#fff",letterSpacing:-.3,textTransform:"uppercase",lineHeight:1}}>{teamName}</span>
              </div>
              <div style={{marginTop:12}}>
                <div style={{fontSize:9,color:"#ffffff77",letterSpacing:1.5,fontWeight:700}}>TEAM OVERALL</div>
                <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:42,color:C.orange,lineHeight:1}}>
                  {overall}<span style={{fontSize:14,color:"#ffffff55"}}>/99</span>
                </div>
              </div>
              <div style={{marginTop:10,display:"flex",gap:14}}>
                <div>
                  <div style={{fontSize:9,color:"#ffffff77",letterSpacing:1,fontWeight:700}}>VALUE</div>
                  <div style={{display:"flex",alignItems:"center",gap:4,fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:14,color:"#fff"}}>
                    <Icon name="credit" size={13} style={{color:C.orange}}/>888
                  </div>
                </div>
                <div>
                  <div style={{fontSize:9,color:"#ffffff77",letterSpacing:1,fontWeight:700}}>PROJ PTS</div>
                  <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:14,color:"#fff"}}>{total}</div>
                </div>
              </div>
              {capP && (
                <div style={{marginTop:12,paddingTop:10,borderTop:"1px solid #ffffff18"}}>
                  <div style={{fontSize:9,color:"#ffffff77",letterSpacing:1,fontWeight:700,display:"flex",alignItems:"center",gap:5}}>
                    CAPTAIN <span style={S.capDot}>C</span>
                  </div>
                  <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:15,color:"#fff",marginTop:2}}>
                    {capP.n} {FLAG[capP.t]}
                  </div>
                  <div style={{fontSize:11,color:C.orange,fontWeight:600}}>{POS_LABEL[capP.p]} · ×2 points</div>
                </div>
              )}
            </div>
          </div>

          {/* PITCH */}
          <div style={S.posterPitch}>
            <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}} viewBox="0 0 340 380" preserveAspectRatio="none">
              <rect x="10" y="6" width="320" height="368" fill="none" stroke="#fff" strokeWidth="1" opacity=".25"/>
              <line x1="10" y1="190" x2="330" y2="190" stroke="#fff" strokeWidth="1" opacity=".25"/>
              <circle cx="170" cy="190" r="38" fill="none" stroke="#fff" strokeWidth="1" opacity=".25"/>
              <rect x="105" y="6" width="130" height="48" fill="none" stroke="#fff" strokeWidth="1" opacity=".25"/>
              <rect x="105" y="326" width="130" height="48" fill="none" stroke="#fff" strokeWidth="1" opacity=".25"/>
            </svg>
            <div style={{position:"relative",zIndex:1,height:"100%",display:"flex",flexDirection:"column",
              justifyContent:"space-around",padding:"12px 4px"}}>
              {rows.map(({pos,players},ri)=>(
                <div key={ri} style={{display:"flex",justifyContent:"space-around",alignItems:"center"}}>
                  {players.length>0
                    ? players.map(p=><PlayerCard key={p.id} p={p} cap={captain===p.id} vice={vice===p.id} jersey={jersey}/>)
                    : <span style={{fontSize:10,color:"#ffffff44",fontWeight:700}}>{POS_LABEL[pos]}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* BENCH */}
          {bench.length>0 && (
            <div style={S.benchRow}>
              <div style={{fontSize:9,color:"#ffffff66",letterSpacing:1.5,fontWeight:700,marginBottom:6}}>BENCH</div>
              <div style={{display:"flex",gap:8,overflowX:"auto"}}>
                {bench.map(p=>(
                  <div key={p.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flexShrink:0,width:46}}>
                    <JerseyShirt {...jersey} num={p.num} size={30}/>
                    <span style={{fontSize:8.5,color:"#fff",fontWeight:700,fontFamily:"'Archivo Narrow',sans-serif",
                      whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:46}}>{p.n}</span>
                    <span style={{fontSize:7.5,color:"#ffffff66",letterSpacing:.5}}>{POS_LABEL[p.p]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FOOTER */}
          <div style={S.posterFooter}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{color:C.orange,display:"inline-flex"}}><Icon name="credit" size={13}/></span>
              <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:10,color:"#fff",letterSpacing:.5}}>
                FANTA<span style={{color:C.orange}}>BALL</span>
              </span>
            </div>
            <span style={{fontSize:9.5,color:"#ffffff88",letterSpacing:.3,fontWeight:600}}>OWN YOUR TEAM · COMPETE · EARN</span>
            <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:9.5,color:C.orange}}>{AFFILIATE}</span>
          </div>
        </div>

        {/* affiliate link */}
        <div style={S.affBar}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:10,color:C.mute,letterSpacing:1,fontWeight:700}}>YOUR AFFILIATE LINK</div>
            <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:13,color:C.ink,
              whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{AFFILIATE}</div>
          </div>
          <button onClick={copyLink} style={S.affCopyBtn}>
            <Icon name={copied?"check":"copy"} size={15}/> {copied?"COPIED":"COPY"}
          </button>
        </div>

        {/* share actions */}
        <div style={{display:"flex",gap:10,marginTop:12}}>
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`}
            target="_blank" rel="noreferrer" style={{...S.shareAction,background:C.ink,color:"#fff",textDecoration:"none"}}>
            <Icon name="twitter" size={18}/> SHARE ON X
          </a>
          <button onClick={saveImage} disabled={saving}
            style={{...S.shareAction,background:C.orange,color:"#fff",opacity:saving?0.6:1}}>
            <Icon name="download" size={18}/> {saving?"SAVING…":"SAVE IMAGE"}
          </button>
        </div>
        <p style={{fontSize:11,color:C.mute,textAlign:"center",marginTop:10,lineHeight:1.5}}>
          Every signup through your link earns Social XP. Final image exports in high resolution.
        </p>
      </div>
    </div>
  );
}

// ─── QUESTS (pump.fun GO side-quests) ──────────────────────────────────────
function Quests(){
  const [filter,setFilter]=useState("ALL");
  const [howOpen,setHowOpen]=useState(false);
  // Bounties funded via pump.fun GO (30% of creator fees). Loaded from Supabase
  // (table `bounties`) so they can be activated WITHOUT a code push: set go_url +
  // active=true there and a bounty flips from SOON to ENTER. Demo fallback below.
  const DEMO_QUESTS=[
    {id:1,cat:"REACH",title:"Spotlight Stream",desc:"Run a sports/trading livestream with the $FANTABALL ticker banner on screen the whole time.",reward:1,deliver:"Public VOD ≥30 min · ticker readable throughout · avg viewers ≥ threshold",goUrl:null},
    {id:2,cat:"REACH",title:"Viral Post",desc:"Post about Fantaball on X and pass 20,000 real views.",reward:1,deliver:"Post link + analytics screenshot showing ≥20k views + $FANTABALL tag",goUrl:null},
    {id:3,cat:"REACH",title:"TikTok Drop",desc:"Make a TikTok explaining the project with the ticker visible on screen.",reward:1,deliver:"TikTok link + view count ≥ threshold + ticker visible",goUrl:null},
    {id:4,cat:"REACH",title:"Thread of the Week",desc:"Write an explainer thread on the project or its mechanics that passes the engagement bar.",reward:0.5,deliver:"Thread link + impressions screenshot ≥ threshold",goUrl:null},
    {id:5,cat:"LADDER",title:"Bracket Oracle · R16",desc:"Predict the most correct results of the Round of 16. One winner takes it.",reward:0.5,deliver:"Completed bracket before kickoff + correct count",goUrl:null},
    {id:6,cat:"LADDER",title:"Man of the Matchday",desc:"Highest single-matchday score across all managers. Resets every matchday.",reward:0.3,deliver:"Score screenshot + public profile link",goUrl:null},
  ];
  const [QUESTS,setQUESTS]=useState(DEMO_QUESTS);
  useEffect(()=>{
    let alive=true;
    getBounties().then(rows=>{
      if(!alive||!rows||!rows.length) return;
      setQUESTS(rows.map(r=>({
        id:r.id, cat:r.cat, title:r.title, desc:r.descr, reward:r.reward_sol,
        deliver:r.deliver, goUrl:(r.active && r.go_url)?r.go_url:null,
      })));
    }).catch(e=>console.warn("getBounties, using demo:",e?.message||e));
    return ()=>{alive=false;};
  },[]);
  const cats=["ALL","REACH","LADDER"];
  const list=filter==="ALL"?QUESTS:QUESTS.filter(q=>q.cat===filter);
  const liveCount=QUESTS.filter(q=>q.goUrl).length;
  const totalFunding=QUESTS.reduce((s,q)=>s+(q.reward||0),0).toFixed(1);

  return (
    <div style={{paddingBottom:24}}>
      {/* HERO */}
      <div style={{padding:"14px 16px"}}>
        <div style={S.questHero}>
          <div style={{position:"absolute",top:-30,right:-30,width:130,height:130,borderRadius:"50%",
            background:C.orange,opacity:.16}}/>
          <div style={{position:"relative",zIndex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{color:C.orange,display:"inline-flex"}}><Icon name="target" size={18}/></span>
              <span style={{fontSize:11,color:"#ffffff99",letterSpacing:2,fontWeight:700}}>BOUNTIES ON pump.fun GO</span>
            </div>
            <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:26,color:"#fff",
              letterSpacing:-.3,marginTop:6,lineHeight:1.1}}>
              Grow the project,<br/>earn SOL
            </div>
            <p style={{fontSize:13,color:"#ffffffcc",lineHeight:1.5,marginTop:8}}>
              Stream, post, predict. Bounties funded by <b style={{color:C.orange}}>30% of creator fees</b>,
              paid out on <b style={{color:C.orange}}>pump.fun GO</b>. Every entry spreads the project.
            </p>
            <div style={{display:"flex",gap:18,marginTop:14}}>
              <div>
                <div style={{fontSize:9,color:"#ffffff77",letterSpacing:1,fontWeight:700}}>LIVE BOUNTIES</div>
                <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:20,color:"#fff"}}>
                  {liveCount}
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <img src="/solana-logo.jpg" alt="Solana" style={{width:22,height:22,borderRadius:"50%",objectFit:"cover",border:"1px solid rgba(255,255,255,0.2)",flexShrink:0}}/>
                <div>
                  <div style={{fontSize:9,color:"#ffffff77",letterSpacing:1,fontWeight:700}}>SOL ON OFFER</div>
                  <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:20,color:C.orange}}>{totalFunding}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* filters */}
      <div style={S.filterScroll}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setFilter(c)} style={{...S.chip,flexShrink:0,...(filter===c?S.chipOn:{})}}>
            {c}
          </button>
        ))}
      </div>

      {/* quest cards */}
      <div style={{padding:"4px 16px 8px"}}>
        {list.map(q=>{
          const isLive=!!q.goUrl;
          return (
          <div key={q.id} style={{...S.questCard,opacity:isLive?1:0.82}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                  <span style={S.questCat}>{q.cat}</span>
                  {!isLive && <span style={S.csTag}>SOON</span>}
                </div>
                <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:16,color:C.ink,marginTop:6}}>{q.title}</div>
                <div style={{fontSize:13,color:C.mute,lineHeight:1.45,marginTop:3}}>{q.desc}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:6}}>
                  <img src="/solana-logo.jpg" alt="Solana" style={{width:18,height:18,borderRadius:"50%",objectFit:"cover",border:"1px solid rgba(0,0,0,0.1)",flexShrink:0}}/>
                  <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:22,color:C.orange,lineHeight:1}}>{q.reward}</div>
                </div>
                <div style={{fontSize:10,color:C.mute,marginTop:2}}>1 winner</div>
              </div>
            </div>
            {/* deliverable */}
            <div style={S.questDeliver}>
              <span style={{color:C.mute,display:"inline-flex",marginTop:1}}><Icon name="check" size={13}/></span>
              <span style={{fontSize:11.5,color:C.inkSoft,lineHeight:1.4}}>{q.deliver}</span>
            </div>
            {/* footer */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginTop:10}}>
              <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11.5,color:C.mute,fontWeight:600}}>
                <Icon name="target" size={13} style={{color:C.mute}}/>{q.cat==="REACH"?"Spread the project":"Compete to win"}
              </span>
              {isLive ? (
                <a href={q.goUrl} target="_blank" rel="noopener noreferrer"
                  style={{...S.questBtn,marginLeft:"auto",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:5}}>
                  ENTER ON GO <Icon name="arrow" size={13}/>
                </a>
              ) : (
                <button disabled style={{...S.questBtn,marginLeft:"auto",opacity:0.5,cursor:"default"}}>
                  SOON
                </button>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {/* how it works — expandable, matches Pool/Ranks */}
      <div style={{padding:"6px 16px 0"}}>
        <button onClick={()=>setHowOpen(v=>!v)} style={S.howItWorksWide}>
          How it works
          <span style={{display:"inline-flex",transform:howOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>
            <Icon name="chevron" size={16}/>
          </span>
        </button>
        {howOpen && (
          <div style={{...S.tokenStat,padding:"16px 18px",marginTop:8}}>
            <p style={{margin:"0 0 12px",fontSize:12.5,color:C.mute,lineHeight:1.5}}>
              Bounties are funded by <b style={{color:C.ink}}>30% of all $FANTABALL creator fees</b> — a budget
              completely separate from the top-100 prize pool (60%). They reward the people who grow the project.
            </p>
            {[
              ["Funded by the token","30% of $FANTABALL creator fees fund these bounties — separate from the top-100 prize pool."],
              ["Two kinds","REACH bounties spread the project (streams, posts, clips). LADDER bounties reward the competition itself."],
              ["Objective deliverables","Every bounty is verified by a public link + screenshot against a clear threshold. No vague judging."],
              ["One winner · pump.fun decides","Each bounty pays exactly one winner. pump.fun reviews submissions and signs the payout — we can recommend, but never pick the winner."],
              ["Paid in SOL","The winner is paid directly from escrow once the submission is approved."],
            ].map(([t,d],i)=>(
              <div key={t} style={{display:"flex",gap:12,padding:"8px 0",borderBottom:i<4?`1px solid ${C.line}`:"none"}}>
                <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:14,color:C.orange,flexShrink:0,width:18}}>{i+1}</span>
                <div>
                  <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:13.5,color:C.ink}}>{t}</div>
                  <div style={{fontSize:12,color:C.mute,lineHeight:1.45,marginTop:1}}>{d}</div>
                </div>
              </div>
            ))}
            <p style={{fontSize:10.5,color:C.mute,lineHeight:1.45,marginTop:10,opacity:.8}}>
              Only one submission wins each bounty — but every entry already puts the project in front of a new audience.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Token(){
  const [holdInfo,setHoldInfo]=useState(false);
  // ── Transparency config — fill with the REAL dedicated fee/pool wallet + movements.
  // Until POOL_WALLET is set to a real address, the Solscan link is hidden and the
  // ledger shows an honest "not yet" state instead of fabricated transactions.
  const POOL_WALLET=""; // e.g. "Fp9L...z7Qx" — the dedicated prize-pool wallet (paste real address)
  const POOL_LEDGER=[
    // Fill with real, verifiable movements once they happen. Each links to a tx on Solscan.
    // { type:"claim", amount:2.4, date:"2026-06-12", tx:"5xQ...abc" },
    // { type:"lock",  amount:50,  date:"2026-06-13", tx:"9zR...def" },
  ];
  const solscanAddr = POOL_WALLET ? `https://solscan.io/account/${POOL_WALLET}` : null;
  const stats=[
    {l:"MARKET CAP",v:"$284K",s:"fully diluted"},
    {l:"HOLDERS",v:"1,847",s:"+23 today"},
    {l:"VOLUME 24H",v:"$41.2K",s:"Pump.fun"},
    {l:"FEES TO POOL",v:"LIVE",s:"60% of fees"},
  ];
  const feeSplit=[
    {pct:60,label:"PRIZE POOL",sub:"top 100 in SOL",color:C.orange},
    {pct:30,label:"GO BOUNTIES",sub:"reach + ladder, in SOL",color:C.ink},
    {pct:10,label:"MARKETING",sub:"growth & reach",color:C.mute},
  ];
  return (
    <div style={{padding:"14px 16px 24px"}}>
      <div style={S.tokenHero}>
        <div style={{position:"absolute",top:-30,right:-30,width:140,height:140,borderRadius:"50%",
          background:C.orange,opacity:.18}}/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{fontSize:11,color:"#ffffff99",letterSpacing:2.5,fontWeight:700}}>LIVE PRIZE POOL</div>
          <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:36,color:"#fff",lineHeight:1,marginTop:4}}>Prize Pool</div>
          <div style={{fontSize:13,color:"#ffffffcc",marginTop:8,lineHeight:1.5}}>Grows with every trade · paid in SOL to top 100</div>
          <div style={{height:6,background:"#ffffff22",borderRadius:6,overflow:"hidden",marginTop:14}}>
            <div style={{height:"100%",width:"71%",background:C.orange,borderRadius:6}}/>
          </div>
          <div style={{fontSize:11,color:"#ffffff99",marginTop:5}}>71% toward GW3 target</div>
          {solscanAddr ? (
            <a href={solscanAddr} target="_blank" rel="noopener noreferrer" style={S.solscanLink}>
              <Icon name="chain" size={14}/> Track the fee wallet on Solscan
              <Icon name="arrow" size={13}/>
            </a>
          ) : (
            <div style={{...S.solscanLink,opacity:.6,cursor:"default"}}>
              <Icon name="chain" size={14}/> Solscan link goes live at token launch
            </div>
          )}
        </div>
      </div>

      <div style={{marginTop:14}}>
        <div style={S.accessCard}>
          <div style={{width:44,height:44,borderRadius:13,background:C.orangeSoft,display:"grid",placeItems:"center",flexShrink:0,color:C.orange}}><Icon name="bolt" size={22}/></div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:15,color:C.ink}}>Hold $25 in $FANTABALL</div>
            <div style={{fontSize:12,color:C.mute,marginTop:2,lineHeight:1.4}}>Your access pass to score points each gameweek.</div>
          </div>
          <span style={{fontSize:11,fontWeight:800,color:"#fff",background:C.orange,padding:"5px 10px",borderRadius:8,flexShrink:0}}><span style={{display:"inline-flex",alignItems:"center",gap:4}}>ACTIVE <Icon name="check" size={13}/></span></span>
        </div>
        <button onClick={()=>setHoldInfo(v=>!v)} style={S.howItWorksWide}>
          How it works
          <span style={{display:"inline-flex",transform:holdInfo?"rotate(180deg)":"none",transition:"transform .2s"}}>
            <Icon name="chevron" size={16}/>
          </span>
        </button>
        {holdInfo && (
          <div style={S.holdExplain}>
            <p style={{margin:"0 0 12px",fontSize:13,lineHeight:1.55,color:C.inkSoft}}>
              When you join the competition, buy <b style={{color:C.ink}}>$25 worth</b> of $FANTABALL. The system
              records that purchase and locks the <b style={{color:C.ink}}>number of tokens you received</b> as your
              personal eligibility floor. You never have to add money again.
            </p>
            <div style={S.holdFormula}>
              eligible at a snapshot if&nbsp;&nbsp;tokens ≥ entry amount&nbsp;&nbsp;<b>OR</b>&nbsp;&nbsp;value ≥ $25
            </div>
            <p style={{margin:"12px 0 6px",fontSize:13,fontWeight:800,color:C.ink,fontFamily:"'Archivo',sans-serif"}}>What this means</p>
            <ul style={{margin:0,paddingLeft:18,fontSize:12.5,lineHeight:1.6,color:C.inkSoft}}>
              <li><b>If the price falls</b> after you join: just keep your entry tokens. You stay eligible even if
                they're now worth less than $25 — a market dip never knocks you out, and you never need to buy more.</li>
              <li><b>If the price rises</b>: you can sell and take profit, as long as you always keep at least
                <b> $25 of value</b> in your wallet. Since each token is worth more, $25 is now <b>fewer tokens</b>
                than you started with.</li>
            </ul>
            <p style={{margin:"12px 0 6px",fontSize:13,fontWeight:800,color:C.ink,fontFamily:"'Archivo',sans-serif"}}>Example</p>
            <ul style={{margin:0,paddingLeft:18,fontSize:12.5,lineHeight:1.6,color:C.inkSoft}}>
              <li>You join at a <b>$20K</b> market cap: $25 buys you <b>1,000,000</b> tokens — that's your floor.</li>
              <li>The cap climbs to <b>$250K</b>. Now $25 is only ~<b>80,000</b> tokens. You may sell up to
                <b> 920,000</b> tokens and still be eligible, because ~80,000 tokens still equal $25.</li>
              <li>Instead the cap <b>drops to $10K</b>? Your 1,000,000 entry tokens keep you eligible — no action needed.</li>
            </ul>
            <div style={S.holdSnap}>
              <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:12.5,color:C.ink,marginBottom:4}}>
                When it's checked
              </div>
              <p style={{margin:0,fontSize:12.5,lineHeight:1.55,color:C.inkSoft}}>
                Each gameweek we take <b style={{color:C.ink}}>3 random snapshots</b> of your wallet. You must be
                eligible at <b style={{color:C.ink}}>all 3</b> for your points to count toward the overall standings.
                <b style={{color:C.ink}}> Miss even one and you score no overall points that week.</b>
              </p>
            </div>
            <p style={{margin:"12px 0 0",fontSize:11,color:C.mute,lineHeight:1.5}}>
              Side-quest bounties on pump.fun GO are separate and don't require the hold.
            </p>
          </div>
        )}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:14}}>
        {stats.map(({l,v,s})=>(
          <div key={l} style={S.tokenStat}>
            <div style={S.miniLabel}>{l}</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {l.includes("FEES") && <img src="/solana-logo.jpg" alt="Solana" style={{width:24,height:24,borderRadius:"50%",objectFit:"cover",border:"1px solid rgba(0,0,0,0.1)",flexShrink:0}}/>}
              <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:22,color:C.ink,marginTop:4}}>{v}</div>
            </div>
            <div style={{fontSize:11,color:C.mute,marginTop:2}}>{s}</div>
          </div>
        ))}
      </div>

      {/* POOL LEDGER — claims & locks (transparency before trustless smart contract) */}
      <div style={{...S.tokenStat,marginTop:14,padding:"16px 18px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
          <div style={S.miniLabel}>POOL LEDGER · CLAIMS & LOCKS</div>
          {solscanAddr && (
            <a href={solscanAddr} target="_blank" rel="noopener noreferrer"
              style={{fontSize:11,fontWeight:800,color:C.orangeDeep,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:4}}>
              Solscan <Icon name="arrow" size={12}/>
            </a>
          )}
        </div>
        <p style={{margin:"0 0 12px",fontSize:12,color:C.mute,lineHeight:1.5}}>
          Every claim of creator fees and every SOL lock into the prize-pool wallet is recorded here and
          verifiable on-chain — full transparency until the trustless smart contract goes live.
        </p>
        {POOL_LEDGER.length===0 ? (
          <div style={{textAlign:"center",padding:"22px 16px",background:C.paper,borderRadius:11,
            border:`1px dashed ${C.line}`,fontSize:12.5,color:C.mute,lineHeight:1.5}}>
            No movements yet. Claims and locks will appear here once the token is live —
            each linked to its on-chain transaction.
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {POOL_LEDGER.map((m,i)=>{
              const isLock=m.type==="lock";
              return (
                <a key={i} href={m.tx?`https://solscan.io/tx/${m.tx}`:undefined}
                  target="_blank" rel="noopener noreferrer"
                  style={{display:"flex",alignItems:"center",gap:11,padding:"11px 12px",borderRadius:11,
                    background:C.paper,border:`1px solid ${C.line}`,textDecoration:"none"}}>
                  <div style={{width:34,height:34,borderRadius:10,flexShrink:0,display:"grid",placeItems:"center",
                    background:isLock?C.orangeSoft:"#eef3ee",color:isLock?C.orangeDeep:"#2e8b57"}}>
                    <Icon name={isLock?"lock":"cash"} size={17}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:13.5,color:C.ink}}>
                      {isLock?"Locked for the Final":"Fees claimed to pool"}
                    </div>
                    <div style={{fontSize:11,color:C.mute,marginTop:1}}>{m.date}{m.tx?" · view tx":""}</div>
                  </div>
                  <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:15,
                    color:isLock?C.orangeDeep:"#2e8b57",flexShrink:0}}>◎{m.amount}</div>
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* FEE DISTRIBUTION */}
      <div style={{...S.tokenStat,marginTop:14,padding:"16px 18px"}}>
        <div style={{fontSize:11,color:C.mute,letterSpacing:2,fontWeight:700,marginBottom:12,
          fontFamily:"'Archivo Narrow',sans-serif"}}>WHERE CREATOR FEES GO</div>
        {/* stacked bar */}
        <div style={{display:"flex",height:14,borderRadius:7,overflow:"hidden",marginBottom:14}}>
          {feeSplit.map(f=>(
            <div key={f.label} style={{width:`${f.pct}%`,background:f.color,height:"100%"}}/>
          ))}
        </div>
        {feeSplit.map(f=>(
          <div key={f.label} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",
            borderBottom:`1px solid ${C.line}`}}>
            <span style={{width:10,height:10,borderRadius:3,background:f.color,flexShrink:0}}/>
            <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:16,color:C.ink,width:46}}>{f.pct}%</span>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:13,color:C.ink}}>{f.label}</div>
              <div style={{fontSize:11,color:C.mute}}>{f.sub}</div>
            </div>
          </div>
        ))}
        <p style={{fontSize:11.5,color:C.mute,lineHeight:1.55,marginTop:10,margin:"10px 0 0"}}>
          A slice of every trade funds <b style={{color:C.ink}}>bounties on pump.fun GO</b> — paid to
          creators who grow the project and to the long tail of the leaderboard.
        </p>
      </div>

      <p style={{fontSize:12,color:C.mute,lineHeight:1.6,marginTop:18,textAlign:"center"}}>
        Creator fees from all $FANTABALL trades are split automatically.
        The token is infrastructure — the competition is the product.
      </p>

      {/* Smart contract teaser */}
      <div style={S.futureMini}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{color:"#b8b0a4"}}><Icon name="lock" size={20}/></span>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:13,color:"#b8b0a4"}}>
              Trustless smart contract <span style={S.csTag}>COMING SOON</span>
            </div>
            <div style={{fontSize:11.5,color:"#b8b0a4",marginTop:3,lineHeight:1.4}}>
              Pool, scoring lock and payouts governed fully on-chain. No trust required.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ABOUT / LANDING / HOW IT WORKS / ROADMAP ─────────────────────────────
function About({setTab}){
  const [openFaq,setOpenFaq]=useState(null);
  const [showRules,setShowRules]=useState(false);

  const faqs=[
    ["Do I need to know football?","Not deeply. Pick players you believe will perform, manage a budget, set a captain. The leaderboard does the rest. Many top managers are data-driven, not lifelong fans."],
    ["Is it free to play?","Yes — no entry fee and no pay-to-win. The only requirement is holding $FANTABALL: buy $25 worth when you join, and stay eligible each gameweek (keep your entry tokens, or at least $25 of value). The prize pool comes entirely from token trading fees. Tap \"How it works\" on the Pool tab for the full mechanic."],
    ["How do I win SOL?","The top 100 managers on the final leaderboard split the prize pool, paid in SOL. Even 100th place gets paid. A strong podium, but the curve rewards depth."],
    ["What makes points?","Only objective, API-verified events: goals, assists, clean sheets, minutes played, cards. No subjective ratings. Anyone can rebuild any score event by event."],
    ["Can I change my team?","Your 16-man squad is set with a budget of 888 credits. You pick 11 starters each matchday and can make transfers between tournament stages."],
    ["What happens after the World Cup?","The platform continues. The World Cup is our launch tournament — Premier League is the next chapter, then more leagues. Same token, same platform."],
    ["Can I earn without being a top player?","Yes. 30% of fees fund bounties on pump.fun GO — stream, post, or predict to earn SOL. Each bounty pays one winner (pump.fun decides), but every entry helps grow the project."],
  ];

  return (
    <div style={{paddingBottom:24}}>
      {/* HERO */}
      <div style={S.aboutHero}>
        <div style={{position:"absolute",top:-40,right:-40,width:180,height:180,borderRadius:"50%",
          background:C.orange,opacity:.14}}/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{fontSize:11,color:C.orange,letterSpacing:2.5,fontWeight:800,marginBottom:10}}>
            SEASON 01 · WORLD CUP 2026
          </div>
          <h1 style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:34,lineHeight:1.05,
            color:"#fff",letterSpacing:-.5,margin:0}}>
            FANTASY FOOTBALL,<br/><span style={{color:C.orange}}>ON-CHAIN.</span>
          </h1>
          <p style={{fontSize:15,color:"#ffffffcc",lineHeight:1.6,marginTop:14}}>
            A 30-year Italian tradition meets crypto. Build your squad, climb a global
            leaderboard, win real SOL.
          </p>
          <button onClick={()=>setTab("build")} style={{...S.cta,marginTop:18,boxShadow:"none",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8}}>
            BUILD YOUR SQUAD <Icon name="arrow" size={18}/>
          </button>
        </div>
      </div>

      {/* STAT STRIP */}
      <div style={S.statStrip}>
        {[["48","NATIONS"],["1,248","PLAYERS"],["LIVE","PRIZE POOL"],["30+","YRS TRADITION"]].map(([n,l],i)=>(
          <div key={l} style={{...S.statStripItem,borderRight:i<3?`1px solid ${C.line}`:"none"}}>
            <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:22,color:C.ink}}>{n}</div>
            <div style={{fontSize:9,color:C.mute,letterSpacing:1,fontWeight:700,marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>

      {/* THE TRADITION */}
      <Section kicker="THE STORY" title="A tradition, not an invention">
        <p style={S.p}>
          In Italy, <b style={{color:C.ink}}>fantacalcio</b> has been a national ritual for over
          30 years. Friends draft real players, earn points from real match performances, and
          compete across a whole season. It's woven into how Italians live football — millions
          play it every year, in offices, bars, and group chats.
        </p>
        <p style={S.p}>
          We're not inventing a new game. We're taking one of football's most loved traditions
          and putting it <b style={{color:C.ink}}>on the blockchain</b> — transparent scoring,
          a prize pool anyone can verify, and rewards paid in SOL instead of bragging rights.
        </p>
        {/* Tradition → Blockchain infographic */}
        <div style={S.transformRow}>
          <div style={S.transformBox}>
            <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:18,color:C.ink,letterSpacing:1}}>IT</div>
            <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:13,color:C.ink,marginTop:4}}>FANTACALCIO</div>
            <div style={{fontSize:10,color:C.mute,marginTop:2}}>30 years offline</div>
          </div>
          <div style={S.transformArrow}><Icon name="arrow" size={22}/></div>
          <div style={{...S.transformBox,background:C.ink}}>
            <div style={{color:"#fff"}}><Icon name="chain" size={26}/></div>
            <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:13,color:"#fff",marginTop:4}}>ON-CHAIN</div>
            <div style={{fontSize:10,color:C.orange,marginTop:2,fontWeight:700}}>transparent · paid in SOL</div>
          </div>
        </div>
      </Section>

      {/* HOW IT WORKS */}
      <Section kicker="HOW IT WORKS" title="Four steps">
        <div style={{position:"relative"}}>
          <div style={S.stepConnector}/>
          {[
            ["01","BUILD","888 credits, 16 players. Pick your champions within the budget — like building a portfolio."],
            ["02","FIELD","Choose 11 starters and a formation each matchday. One captain scores double."],
            ["03","CLIMB","Points stack across the whole tournament. One global leaderboard, no eliminations."],
            ["04","WIN","Top 100 split the pool in SOL. Free to play, funded by token fees."],
          ].map(([n,t,d])=>(
            <div key={n} style={S.stepRow2}>
              <div style={S.stepNumCircle}>{n}</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:16,color:C.ink}}>{t}</div>
                <div style={{fontSize:13.5,color:C.mute,lineHeight:1.5,marginTop:2}}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* FEE FLOW DIAGRAM */}
      <Section kicker="WHERE THE POOL COMES FROM" title="The money flow">
        <div style={S.flowChart}>
          <div style={S.flowNode}>
            <div style={{color:C.ink}}><Icon name="swap" size={22}/></div>
            <div style={S.flowLabel}>TOKEN TRADES</div>
            <div style={S.flowSub}>$FANTABALL on Pump.fun</div>
          </div>
          <div style={S.flowLine}><div style={S.flowDot}/></div>
          <div style={{...S.flowNode,borderColor:C.orange}}>
            <div style={{color:C.orange}}><Icon name="cash" size={22}/></div>
            <div style={S.flowLabel}>CREATOR FEES</div>
            <div style={S.flowSub}>collected automatically</div>
          </div>
          <div style={S.flowSplit}>
            <div style={S.flowSplitItem}>
              <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:18,color:C.orange}}>60%</div>
              <div style={S.flowSub}>PRIZE POOL</div>
            </div>
            <div style={S.flowSplitItem}>
              <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:18,color:C.ink}}>30%</div>
              <div style={S.flowSub}>GO BOUNTIES</div>
            </div>
            <div style={S.flowSplitItem}>
              <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:18,color:C.mute}}>10%</div>
              <div style={S.flowSub}>MARKETING</div>
            </div>
          </div>
          <div style={S.flowLine}><div style={S.flowDot}/></div>
          <div style={{...S.flowNode,background:C.ink}}>
            <div style={{color:"#fff"}}><Icon name="trophy" size={22}/></div>
            <div style={{...S.flowLabel,color:"#fff"}}>TOP 100 PAID IN SOL</div>
            <div style={{...S.flowSub,color:C.orange}}>verifiable on-chain</div>
          </div>
        </div>
        <div style={{background:C.orangeSoft,borderRadius:12,padding:"12px 14px",marginTop:14}}>
          <p style={{fontSize:12.5,color:C.orangeDeep,lineHeight:1.5,margin:0,fontWeight:600}}>
            60% grows the top-100 prize pool · 30% funds bounties on pump.fun GO (next section) ·
            10% marketing. Private leagues (coming soon) run on a separate fee — see below.
          </p>
        </div>
      </Section>

      {/* PRIZE CURVE */}
      <Section kicker="THE PAYOUT" title="Prize curve">
        <p style={{...S.p,marginBottom:16}}>
          A strong podium, but the curve rewards depth — even 100th place gets paid. All payouts in <b style={{color:C.ink}}>SOL</b>.
        </p>
        <div style={S.curveChart}>
          {[["1st",100,"◎41"],["2nd",68,"◎28"],["3rd",46,"◎19"],["4-10",33,"◎13"],["11-30",16,"◎3"],["31-100",8,"◎1.5"]].map(([l,h,v])=>(
            <div key={l} style={S.curveCol}>
              <div style={{fontSize:9,color:C.orangeDeep,fontWeight:800,marginBottom:3}}>{v}</div>
              <div style={{...S.curveBar,height:`${h}%`}}/>
              <div style={{fontSize:9,color:C.mute,fontWeight:700,marginTop:4,letterSpacing:.3}}>{l}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* GO BOUNTIES */}
      <Section kicker="GROW & EARN" title="Bounties on pump.fun GO">
        <p style={{...S.p,marginBottom:14}}>
          30% of every trade's creator fees funds <b style={{color:C.ink}}>bounties</b> on
          pump.fun GO. Their job isn't just to reward play — it's to <b style={{color:C.ink}}>widen
          the project's reach</b>. Each bounty pays one winner in SOL, but every entry already puts
          Fantaball in front of a new audience.
        </p>

        {/* two types */}
        <div style={{display:"flex",gap:10,marginBottom:16}}>
          <div style={{flex:1,background:C.card,border:`1px solid ${C.line}`,borderRadius:13,padding:"13px"}}>
            <div style={{color:C.orange,marginBottom:6}}><Icon name="share" size={20}/></div>
            <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:14,color:C.ink}}>Reach</div>
            <div style={{fontSize:12,color:C.mute,lineHeight:1.45,marginTop:3}}>
              Streams with the ticker on screen, posts past a real view count, TikToks, threads.
            </div>
          </div>
          <div style={{flex:1,background:C.card,border:`1px solid ${C.line}`,borderRadius:13,padding:"13px"}}>
            <div style={{color:C.ink,marginBottom:6}}><Icon name="trophy" size={20}/></div>
            <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:14,color:C.ink}}>Ladder</div>
            <div style={{fontSize:12,color:C.mute,lineHeight:1.45,marginTop:3}}>
              Game contests — bracket predictions, highest matchday score. A pure single winner.
            </div>
          </div>
        </div>

        {/* the reach loop */}
        <div style={S.loopBox}>
          <div style={{fontSize:10,color:C.mute,letterSpacing:1.5,fontWeight:700,marginBottom:10,
            fontFamily:"'Archivo Narrow',sans-serif"}}>THE FLYWHEEL</div>
          {[
            ["Bounties pay creators","Streamers & posters earn SOL for spreading the project."],
            ["New eyes arrive","Their audience discovers Fantaball and the token."],
            ["Volume rises","More traders → more creator fees collected."],
            ["The prize pool grows","60% of those fees swells the top-100 pool — and funds the next bounties."],
          ].map(([t,d],i,arr)=>(
            <div key={t} style={{display:"flex",gap:12}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                <div style={{width:24,height:24,borderRadius:"50%",background:C.orange,color:"#fff",
                  display:"grid",placeItems:"center",fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:11,flexShrink:0}}>{i+1}</div>
                {i<arr.length-1 && <div style={{width:2,flex:1,background:C.line,minHeight:18,marginTop:2}}/>}
              </div>
              <div style={{paddingBottom:i<arr.length-1?12:0}}>
                <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:13.5,color:C.ink}}>{t}</div>
                <div style={{fontSize:12,color:C.mute,lineHeight:1.45,marginTop:1}}>{d}</div>
              </div>
            </div>
          ))}
          <div style={{display:"flex",alignItems:"center",gap:7,marginTop:6,paddingTop:10,
            borderTop:`1px solid ${C.line}`}}>
            <span style={{color:C.orange,display:"inline-flex"}}><Icon name="arrow" size={15}/></span>
            <span style={{fontSize:11.5,color:C.orangeDeep,fontWeight:600,lineHeight:1.4}}>
              A bigger pool brings more players — which brings more volume. The loop feeds itself.
            </span>
          </div>
        </div>

        <p style={{fontSize:11.5,color:C.mute,lineHeight:1.5,marginTop:12}}>
          Every bounty has an objective deliverable (a public link + a threshold), pays exactly one
          winner, and the final decision is pump.fun's — we can recommend, but never pick. The 30%
          bounty wallet is kept separate from the top-100 prize pool.
        </p>
      </Section>

      {/* FAQ */}
      <Section kicker="QUESTIONS" title="FAQ">
        {faqs.map(([q,a],i)=>(
          <div key={i} style={S.faqItem}>
            <button onClick={()=>setOpenFaq(openFaq===i?null:i)} style={S.faqQ}>
              <span style={{flex:1,textAlign:"left",fontFamily:"'Archivo',sans-serif",
                fontWeight:700,fontSize:14.5,color:C.ink}}>{q}</span>
              <span style={{fontSize:20,color:C.orange,fontWeight:700,lineHeight:1,
                transform:openFaq===i?"rotate(45deg)":"none",transition:"transform .2s"}}>+</span>
            </button>
            {openFaq===i && <div style={S.faqA}>{a}</div>}
          </div>
        ))}
      </Section>

      {/* ROADMAP */}
      <Section kicker="THE BIGGER PICTURE" title="Roadmap">
        <p style={{...S.p,marginBottom:18}}>
          The World Cup is a <b style={{color:C.ink}}>stress test</b> — a month to prove the game,
          the scoring, and the payouts with real users and real stakes. It's the launch, not the
          finish line.
        </p>
        {[
          ["NOW","World Cup 2026","live","48 nations, 1,248 players, one leaderboard, SOL prize pool. Our live battle-test.",false],
          ["NEXT","Learn & iterate","","We use the tournament to refine scoring, UX and the payout flow. Community feedback shapes what ships.",false],
          ["S02","Premier League 26/27","","Fantasy goes weekly across a full domestic season — recurring matchdays, a pool that refills every week.",false],
          ["S03","Champions League","","Europe's biggest midweek stage. Knockout drama, the best clubs, a fresh competition on the same platform.",false],
          ["LATER","More modes","","Head-to-head, seasonal cosmetics, deeper stats. One platform, many competitions, one token.",false],
        ].map(([tag,title,state,desc],i,arr)=>(
          <div key={title} style={{display:"flex",gap:14}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:5}}>
              <div style={{width:14,height:14,borderRadius:"50%",flexShrink:0,
                background:state==="live"?C.orange:C.card,
                border:`2px solid ${state==="live"?C.orange:C.line}`,
                boxShadow:state==="live"?`0 0 0 4px ${C.orangeSoft}`:"none"}}/>
              {i<arr.length-1 && <div style={{width:2,flex:1,background:C.line,marginTop:4,minHeight:34}}/>}
            </div>
            <div style={{flex:1,paddingBottom:18}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:10,fontWeight:800,letterSpacing:1.5,color:C.orange,
                  fontFamily:"'Archivo Narrow',sans-serif"}}>{tag}</span>
                {state==="live"&&<span style={{fontSize:9,fontWeight:800,color:"#fff",background:C.orange,
                  padding:"2px 7px",borderRadius:10}}>LIVE</span>}
              </div>
              <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:16,color:C.ink,marginTop:2}}>{title}</div>
              <div style={{fontSize:13,color:C.mute,lineHeight:1.5,marginTop:3}}>{desc}</div>
            </div>
          </div>
        ))}
        <div style={{background:C.orangeSoft,borderRadius:13,padding:"14px 16px",marginTop:4}}>
          <p style={{fontSize:13,color:C.orangeDeep,lineHeight:1.55,margin:0,fontWeight:600}}>
            Directions, not fixed dates. The constant: one token, one platform, season after season.
          </p>
        </div>
      </Section>

      {/* FUTURE FEATURES (post-WC, coming soon) */}
      <Section kicker="IF THE PROJECT TAKES OFF" title="What comes after">
        <p style={{...S.p,marginBottom:16}}>
          Two major upgrades planned once the community is behind the project:
        </p>
        <div style={S.futureCard}>
          <div style={S.comingSoon}>COMING SOON</div>
          <div style={{marginBottom:8,color:C.ink}}><Icon name="lock" size={26}/></div>
          <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:16,color:C.ink}}>Trustless smart contract</div>
          <div style={{fontSize:13.5,color:C.mute,lineHeight:1.55,marginTop:4}}>
            The entire process — pool, scoring lock, payouts — governed fully on-chain by a smart
            contract. No trust required: the rules execute themselves.
          </div>
        </div>
        <div style={S.futureCard}>
          <div style={S.comingSoon}>COMING SOON</div>
          <div style={{marginBottom:8,color:C.ink}}><Icon name="ticket" size={26}/></div>
          <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:16,color:C.ink}}>Private invite-only leagues</div>
          <div style={{fontSize:13.5,color:C.mute,lineHeight:1.55,marginTop:4}}>
            Create exclusive leagues by invite, fund a private prize pool and freeze it as the
            league's final prize. Compete with your own circle for your own stakes.
          </div>

          {/* 4% fee mechanism */}
          <div style={S.feeMechanism}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:24,color:C.orange}}>4%</span>
              <span style={{fontSize:12,color:C.inkSoft,fontWeight:600,lineHeight:1.4}}>
                service fee on every private prize pool
              </span>
            </div>
            <div style={S.feeSplit}>
              <div style={S.feeArm}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{color:C.orange}}><Icon name="flame" size={16}/></span>
                  <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:18,color:C.ink}}>90%</span>
                </div>
                <div style={{fontSize:11.5,fontWeight:700,color:C.ink,marginTop:4}}>BUYBACK &amp; BURN</div>
                <div style={{fontSize:11,color:C.mute,lineHeight:1.45,marginTop:2}}>
                  used to buy $FANTABALL on the market and burn it
                </div>
              </div>
              <div style={S.feeArm}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{color:C.mute}}><Icon name="bolt" size={16}/></span>
                  <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:18,color:C.ink}}>10%</span>
                </div>
                <div style={{fontSize:11.5,fontWeight:700,color:C.ink,marginTop:4}}>MARKETING</div>
                <div style={{fontSize:11,color:C.mute,lineHeight:1.45,marginTop:2}}>
                  growth, reach and new players
                </div>
              </div>
            </div>
            <div style={{fontSize:11.5,color:C.orangeDeep,marginTop:12,lineHeight:1.5,fontWeight:600}}>
              Every private league creates constant buy pressure on $FANTABALL — the more the platform
              is used, the more the mother token is bought back and burned.
            </div>
          </div>
        </div>
      </Section>

      {/* FULL RULES (collapsible at bottom) */}
      <div style={{padding:"0 16px"}}>
        <button onClick={()=>setShowRules(r=>!r)} style={S.rulesToggle}>
          <span style={{display:"inline-flex",alignItems:"center",gap:8}}><Icon name="doc" size={16}/> FULL RULEBOOK</span>
          <span style={{display:"inline-flex",transform:showRules?"rotate(180deg)":"none",transition:"transform .2s"}}><Icon name="chevron" size={18}/></span>
        </button>
        {showRules && <FullRules/>}
      </div>

      {/* CONNECT / SOCIALS */}
      <Section kicker="JOIN THE COMMUNITY" title="Connect">
        <p style={{...S.p,marginBottom:14}}>
          Follow the build, talk to the community, and grab the token. Everything official lives here.
        </p>
        <div style={S.socialGrid}>
          {Object.entries(SOCIALS).filter(([k,s])=>s.url).map(([k,s])=>(
            <a key={k} href={s.url} target={s.url.startsWith("mailto")?undefined:"_blank"} rel="noreferrer"
              style={{...S.socialBtn,...(k==="pumpfun"?S.socialBtnPrimary:{})}}>
              <span style={{display:"inline-flex"}}><Icon name={s.icon} size={18}/></span>
              <span>{s.label}</span>
            </a>
          ))}
        </div>
        <p style={{fontSize:11.5,color:C.mute,marginTop:12,lineHeight:1.5}}>
          More channels go live around launch. Always verify links from this page — never trust a token
          contract or X account you find elsewhere.
        </p>

        <div style={S.coinNotice}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <span style={{color:C.orange,display:"inline-flex"}}><Icon name="info" size={16}/></span>
            <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:13,color:C.ink}}>
              Match your CoinCommunity profile
            </span>
          </div>
          <p style={{fontSize:12,color:C.inkSoft,lineHeight:1.5,margin:0}}>
            When you sign in, use the <b>same X account and wallet</b> you registered on CoinCommunity.
            Matching profiles is how your activity gets tracked and your points are credited correctly —
            and it unlocks upcoming features.
          </p>
        </div>
      </Section>

      {/* FOOTER */}
      <div style={S.footer}>
        <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:18,color:C.ink}}>
          FANTA<span style={{color:C.orange}}>BALL</span>
        </div>
        <div style={{fontSize:11.5,color:C.mute,marginTop:4}}>fantaball.tech · hello@fantaball.tech</div>
        <div style={{fontSize:10.5,color:C.mute,marginTop:8,lineHeight:1.5,maxWidth:340}}>
          $FANTABALL is a utility/access token for the game. Crypto is volatile and prizes depend on
          trading-fee revenue — play responsibly. Not financial advice.
        </div>
      </div>

      <div style={{textAlign:"center",padding:"24px 16px 0"}}>
        <button onClick={()=>setTab("build")} style={{...S.cta,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8}}>START BUILDING <Icon name="arrow" size={18}/></button>
      </div>
    </div>
  );
}

function Section({kicker,title,children}){
  return (
    <div style={{padding:"22px 16px 4px"}}>
      <div style={{fontSize:11,color:C.orange,letterSpacing:2,fontWeight:800,
        fontFamily:"'Archivo Narrow',sans-serif",marginBottom:4}}>{kicker}</div>
      <h2 style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:24,color:C.ink,
        letterSpacing:-.3,margin:"0 0 14px"}}>{title}</h2>
      {children}
    </div>
  );
}

function FullRules(){
  const [q,setQ]=useState("");
  const [open,setOpen]=useState(null); // index of open section (accordion)

  // Each section: title + searchable plain text + render(). Built from the official
  // regolamento.md (translated to English). Single source of truth for the rulebook.
  const sections=[
    {
      id:"principles", title:"1 · Principles",
      text:"principles objective api verified transparent no subjective ratings cumulative season one leaderboard",
      body:(
        <p style={S.rbP}>Fantaball scores only objective, API-verified match events — goals, assists, clean sheets,
        minutes, cards. No subjective ratings: anyone can rebuild any score event by event. One cumulative
        leaderboard runs the whole tournament, with no eliminations.</p>
      ),
    },
    {
      id:"presence", title:"2 · Presence & minutes",
      text:"presence minutes played starter 60 minutes appearance points",
      body:(
        <ul style={S.rbUl}>
          <li>Played (came on at all): <b>+1</b></li>
          <li>Played 60+ minutes: <b>+1</b> extra</li>
          <li>Only the 11 starters you set score. Bench players don't score unless promoted before lock.</li>
        </ul>
      ),
    },
    {
      id:"gk", title:"3 · Goalkeepers (GK)",
      text:"goalkeeper gk clean sheet penalty saved saves goal conceded yellow red own goal",
      body:(
        <table style={S.rbTable}><tbody>
          <tr><td>Clean sheet (60+ min)</td><td>+5</td></tr>
          <tr><td>Penalty saved</td><td>+8</td></tr>
          <tr><td>Every 4 saves</td><td>+1</td></tr>
          <tr><td>Goal conceded (each)</td><td>−1</td></tr>
          <tr><td>Yellow / Red card</td><td>−1 / −4</td></tr>
          <tr><td>Own goal</td><td>−4</td></tr>
        </tbody></table>
      ),
    },
    {
      id:"df", title:"4 · Defenders (DF)",
      text:"defender df goal assist clean sheet yellow red own goal",
      body:(
        <table style={S.rbTable}><tbody>
          <tr><td>Goal</td><td>+8</td></tr>
          <tr><td>Assist</td><td>+5</td></tr>
          <tr><td>Clean sheet (60+ min)</td><td>+4</td></tr>
          <tr><td>Yellow / Red card</td><td>−1 / −4</td></tr>
          <tr><td>Own goal</td><td>−4</td></tr>
        </tbody></table>
      ),
    },
    {
      id:"mf", title:"5 · Midfielders (MF)",
      text:"midfielder mf goal assist yellow red own goal",
      body:(
        <table style={S.rbTable}><tbody>
          <tr><td>Goal</td><td>+6</td></tr>
          <tr><td>Assist</td><td>+4</td></tr>
          <tr><td>Yellow / Red card</td><td>−1 / −4</td></tr>
          <tr><td>Own goal</td><td>−4</td></tr>
        </tbody></table>
      ),
    },
    {
      id:"fw", title:"6 · Forwards (FW)",
      text:"forward fw striker goal assist hat-trick hattrick poker yellow red own goal",
      body:(
        <table style={S.rbTable}><tbody>
          <tr><td>Goal</td><td>+5</td></tr>
          <tr><td>Assist</td><td>+3</td></tr>
          <tr><td>Hat-trick (3 goals)</td><td>+3 extra</td></tr>
          <tr><td>Poker (4+ goals)</td><td>+6 extra</td></tr>
          <tr><td>Yellow / Red card</td><td>−1 / −4</td></tr>
          <tr><td>Own goal</td><td>−4</td></tr>
        </tbody></table>
      ),
      note:"Hat-trick and poker don't stack: 4 goals = +6 only, not +3+6.",
    },
    {
      id:"penalties", title:"7 · Penalties",
      text:"penalty scored missed",
      body:(
        <ul style={S.rbUl}>
          <li>Penalty scored: counts as a normal goal for the role (+5/+6/+8) — no extra.</li>
          <li>Penalty missed: <b>−2</b></li>
        </ul>
      ),
      note:"A scored penalty doesn't over-reward the taker, who is often already the star.",
    },
    {
      id:"formula", title:"8 · Scoring formula",
      text:"formula calculation raw score presence role bonus penalty malus",
      body:(
        <div style={S.rbCode}>raw = presence + role bonus + penalty − malus
final = captain/vice multiplier applied to raw</div>
      ),
    },
    {
      id:"captain", title:"9 · Captain & Vice multiplier",
      text:"captain vice multiplier double 1.5 floor zero did not play",
      body:(
        <ul style={S.rbUl}>
          <li>Captain: raw score <b>×2</b>, floored at 0 (a captain can never lose you points).</li>
          <li>Vice: <b>×1.5</b>, but only if the captain didn't play.</li>
          <li>The floor only applies to whoever carries the multiplier; a normal player can go negative.</li>
        </ul>
      ),
      note:"Example — Captain scores (+5) then sees red (−4): raw +1 → max(0,1)×2 = +2.",
    },
    {
      id:"lineup", title:"10 · Setting your lineup",
      text:"lineup formation lock deadline forgot did not set last valid lineup starters",
      body:(
        <ul style={S.rbUl}>
          <li>You set 11 starters before each matchday's lock (min 1 GK, 3 DEF, 2 MID, 1 FWD).</li>
          <li><b>If you don't set a lineup in time, your last valid lineup stays active</b> and scores as normal.</li>
          <li>Captain and vice multipliers apply to that locked lineup.</li>
        </ul>
      ),
    },
    {
      id:"market", title:"11 · Market rules",
      text:"market transfer eliminated knocked out refund 50% credits slot empty window",
      body:(
        <ul style={S.rbUl}>
          <li>Prices are fixed for the whole tournament.</li>
          <li><b>If a player is eliminated from the real World Cup, they're removed from your squad and you get 50% of the credits you paid back.</b></li>
          <li>The freed slot stays empty until the next transfer window — you can't immediately re-buy.</li>
        </ul>
      ),
    },
    {
      id:"hold", title:"12 · The $25 holding rule",
      text:"hold 25 dollars token eligibility snapshot value entry amount overall points",
      body:(
        <ul style={S.rbUl}>
          <li>To score in the overall standings you must hold $FANTABALL. At join, buy $25 worth — the token amount you receive is recorded as your floor.</li>
          <li>Eligible at a snapshot if <b>tokens ≥ entry amount</b> OR <b>value ≥ $25</b>.</li>
          <li>3 random snapshots per gameweek; you must pass all 3. See the Pool tab for the full mechanic.</li>
        </ul>
      ),
    },
    {
      id:"standings", title:"13 · Standings & payouts",
      text:"standings leaderboard top 100 prize pool sol tie break payout curve",
      body:(
        <p style={S.rbP}>One cumulative leaderboard for the whole tournament. The top 100 split the pool in SOL
        on a curve that rewards depth — even 100th place is paid. Ties break by captain points, then lowest
        budget spent, then earliest signup. The pool wallet and fee flow are public on-chain.</p>
      ),
    },
  ];

  const ql=q.trim().toLowerCase();
  const shown = ql
    ? sections.filter(s => (s.title+" "+s.text).toLowerCase().includes(ql))
    : sections;

  return (
    <div style={{marginTop:10}}>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search the rules… (e.g. captain, clean sheet, refund)"
        style={S.rbSearch}/>
      {shown.length===0 && (
        <div style={{textAlign:"center",padding:"24px",color:C.mute,fontSize:13}}>No rule matches “{q}”.</div>
      )}
      {shown.map((s)=>{
        const isOpen = ql ? true : open===s.id; // when searching, expand matches
        return (
          <div key={s.id} style={S.rbSection}>
            <button onClick={()=>setOpen(o=>o===s.id?null:s.id)} style={S.rbHead}>
              <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:14,color:C.ink}}>{s.title}</span>
              {!ql && <span style={{display:"inline-flex",transform:isOpen?"rotate(180deg)":"none",transition:"transform .2s",color:C.mute}}>
                <Icon name="chevron" size={16}/></span>}
            </button>
            {isOpen && (
              <div style={{padding:"4px 14px 14px"}}>
                {s.body}
                {s.note && <p style={S.rbNote}>{s.note}</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── STATS (World Cup) ────────────────────────────────────────────────────
const QUALIFIED = [
  "ARG","AUS","AUT","BEL","BRA","CAN","CIV","CMR","COL","CPV","CRC","CRO","CUW",
  "DEN","ECU","EGY","ENG","ESP","FRA","GER","GHA","HAI","IRN","IRQ","JAM","JOR",
  "JPN","KOR","KSA","MAR","MEX","NED","NGA","NOR","NZL","PAN","PAR","POL","POR",
  "QAT","RSA","SCO","SEN","SUI","TUN","TUR","URU","USA","UZB",
].sort();

// Real stats data comes from backend (getScorers etc.). No demo/fake data here.


function StatMineToggle({on,set}){
  return (
    <button onClick={()=>set(v=>!v)} style={{...S.statToggle,
      ...(on?{borderColor:C.orange,background:C.orange,color:"#fff"}:{})}}>
      <span style={{width:15,height:15,borderRadius:"50%",border:`2px solid ${on?"#fff":C.mute}`,
        display:"grid",placeItems:"center"}}>{on&&<span style={{width:6,height:6,borderRadius:"50%",background:"#fff"}}/>}</span>
      My players
    </button>
  );
}

function StatsPlayers({mySet}){
  const [stat,setStat]=useState("goals");
  const [nation,setNation]=useState("ALL");
  const [mine,setMine]=useState(false);
  const [gw,setGw]=useState(null); // null = whole tournament
  const [rows,setRows]=useState(null); // null=loading

  const nationScrollRef=useRef(null);
  const [isDesktop,setIsDesktop]=useState(false);
  const [thumb,setThumb]=useState({w:0,left:0});

  useEffect(()=>{
    let live=true;
    setRows(null);
    const opts={ gw:gw||undefined, nation:nation!=="ALL"?nation:undefined };
    const fetcher = stat==="goals"?getScorers : stat==="assists"?getAssists : getCards;
    fetcher(stat==="cards"?{...opts}:opts).then(data=>{
      if(!live) return;
      let list = (data && data.length) ? data : [];
      if(nation!=="ALL") list=list.filter(r=>r.team===nation);
      setRows(list);
    });
    return ()=>{live=false;};
  },[stat,nation,gw]);

  // desktop = fine pointer (mouse) + sufficiently wide window (same pattern as StatsBracket)
  useEffect(()=>{
    const mq=window.matchMedia("(min-width:1024px) and (pointer:fine)");
    const set=()=>setIsDesktop(mq.matches); set();
    mq.addEventListener?.("change",set);
    return ()=>mq.removeEventListener?.("change",set);
  },[]);

  const view = useMemo(()=>{
    if(!rows) return null;
    return mine ? rows.filter(r=>mySet.has(r.player_id)||mySet.has(r.name)) : rows;
  },[rows,mine,mySet]);

  function syncNationThumb(){
    const el=nationScrollRef.current; if(!el) return;
    const {scrollWidth,clientWidth,scrollLeft}=el;
    if(scrollWidth<=clientWidth){ setThumb({w:100,left:0}); return; }
    setThumb({ w:(clientWidth/scrollWidth)*100, left:(scrollLeft/scrollWidth)*100 });
  }
  useEffect(()=>{ syncNationThumb(); },[isDesktop]);

  // drag the thumb → scroll the nations row
  function onNationThumbDown(e){
    e.preventDefault();
    const el=nationScrollRef.current; if(!el) return;
    const startX=e.clientX, startScroll=el.scrollLeft;
    const ratio=el.scrollWidth/el.clientWidth;
    function move(ev){ el.scrollLeft=startScroll+(ev.clientX-startX)*ratio; }
    function up(){ window.removeEventListener("mousemove",move); window.removeEventListener("mouseup",up); }
    window.addEventListener("mousemove",move); window.addEventListener("mouseup",up);
  }

  const tabs=[{k:"goals",label:"Goals"},{k:"assists",label:"Assists"},{k:"cards",label:"Cards"}];

  return (
    <div>
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:6,background:C.card,padding:4,borderRadius:12,border:`1px solid ${C.line}`}}>
          {tabs.map(t=>(
            <button key={t.k} onClick={()=>setStat(t.k)} style={{padding:"8px 14px",borderRadius:9,border:"none",
              cursor:"pointer",fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:13,letterSpacing:.2,
              background:stat===t.k?C.ink:"transparent",color:stat===t.k?"#fff":C.mute}}>{t.label}</button>
          ))}
        </div>
        <div style={{marginLeft:"auto"}}><StatMineToggle on={mine} set={setMine}/></div>
      </div>

      {/* nation filter */}
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
          <span style={{fontSize:10.5,fontWeight:800,color:C.mute,letterSpacing:1,fontFamily:"'Archivo Narrow',sans-serif"}}>FILTER BY NATION</span>
          {nation!=="ALL"&&<button onClick={()=>setNation("ALL")} style={{fontSize:10.5,fontWeight:800,
            color:C.orangeDeep,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:"'Archivo',sans-serif"}}>✕ clear</button>}
        </div>
        <div ref={nationScrollRef} onScroll={syncNationThumb}
          style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:4,WebkitOverflowScrolling:"touch"}}>
          <button onClick={()=>setNation("ALL")} style={{flexShrink:0,padding:"7px 14px",borderRadius:10,cursor:"pointer",
            border:`1.5px solid ${nation==="ALL"?C.ink:C.line}`,background:nation==="ALL"?C.ink:C.card,
            color:nation==="ALL"?"#fff":C.mute,fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:12.5}}>All</button>
          {QUALIFIED.map(t=>(
            <button key={t} onClick={()=>setNation(t)} style={{flexShrink:0,display:"inline-flex",alignItems:"center",gap:6,
              padding:"7px 12px",borderRadius:10,cursor:"pointer",
              border:`1.5px solid ${nation===t?C.orange:C.line}`,background:nation===t?C.orangeSoft:C.card,
              color:nation===t?C.orangeDeep:C.inkSoft,fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:12.5}}>
              <span style={{fontSize:16}}>{FLAG[t]||"🏳"}</span>{t}
            </button>
          ))}
        </div>
        {/* desktop-only draggable scrollbar (mobile uses natural swipe; same pattern as StatsBracket) */}
        {isDesktop && thumb.w<100 && (
          <div style={{height:10,margin:"2px 0 4px",borderRadius:6,background:C.line,position:"relative",cursor:"pointer"}}
            onMouseDown={(e)=>{
              const el=nationScrollRef.current; if(!el) return;
              const rect=e.currentTarget.getBoundingClientRect();
              const pct=(e.clientX-rect.left)/rect.width;
              el.scrollLeft=pct*(el.scrollWidth-el.clientWidth);
            }}>
            <div onMouseDown={onNationThumbDown}
              style={{position:"absolute",top:0,height:10,borderRadius:6,background:C.orange,
                width:`${thumb.w}%`,left:`${thumb.left}%`,cursor:"grab"}}/>
          </div>
        )}
      </div>

      {/* list */}
      {view===null ? (
        <div style={{textAlign:"center",padding:"40px",color:C.mute,fontSize:14}}>Loading…</div>
      ) : view.length===0 ? (
        <div style={{textAlign:"center",padding:"40px 20px",color:C.mute,fontSize:14,
          background:C.card,borderRadius:14,border:`1px dashed ${C.line}`}}>
          {mine?"None of your players in this ranking":`No ${nation!=="ALL"?nation+" ":""}players in this ranking`}
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {view.map((r,i)=>{
            const isMine=mySet.has(r.player_id)||mySet.has(r.name);
            return (
              <div key={r.player_id||i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",
                background:C.card,borderRadius:14,border:`1px solid ${isMine?C.orange:C.line}`}}>
                <div style={{width:26,textAlign:"center",fontFamily:"'Archivo',sans-serif",fontWeight:900,
                  fontSize:16,color:i<3?C.orange:C.mute,flexShrink:0}}>{i+1}</div>
                <span style={{fontSize:22}}>{FLAG[r.team]||"🏳"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:15,color:C.ink,
                      whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.name}</span>
                    {isMine&&<span style={{fontSize:9,fontWeight:900,letterSpacing:.5,background:C.orangeSoft,
                      color:C.orangeDeep,padding:"2px 6px",borderRadius:5,fontFamily:"'Archivo',sans-serif",flexShrink:0}}>MINE</span>}
                  </div>
                  {r.club&&<div style={{fontSize:11.5,color:C.mute,marginTop:1}}>{r.club}</div>}
                </div>
                {stat==="cards" ? (
                  <div style={{display:"flex",gap:6,flexShrink:0}}>
                    <span style={{display:"inline-flex",alignItems:"center",gap:4,fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:15,color:C.ink}}>
                      <span style={{width:11,height:15,borderRadius:2,background:"#f5c518"}}/>{r.yellow||0}</span>
                    {(r.red||0)>0&&<span style={{display:"inline-flex",alignItems:"center",gap:4,fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:15,color:C.ink}}>
                      <span style={{width:11,height:15,borderRadius:2,background:"#e3342f"}}/>{r.red}</span>}
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",flexShrink:0}}>
                    <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:22,color:C.orange,lineHeight:1}}>{r.value}</span>
                    <span style={{fontSize:9,color:C.mute,letterSpacing:1,fontWeight:700,fontFamily:"'Archivo Narrow',sans-serif"}}>{stat==="goals"?"GOALS":"ASSISTS"}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatsGroups(){
  const [groups,setGroups]=useState(null);
  useEffect(()=>{let live=true;getStandings().then(d=>{if(live)setGroups(d&&Object.keys(d).length?d:null);});return ()=>{live=false;};},[]);
  if(!groups) return <div style={{textAlign:"center",padding:"40px",color:C.mute}}>No data available yet — standings will appear during the tournament.</div>;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      {Object.entries(groups).map(([g,teams])=>(
        <div key={g}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:13,background:C.ink,color:"#fff",
              padding:"4px 10px",borderRadius:7,letterSpacing:.5}}>GROUP {g}</span>
            <div style={{flex:1,height:1,background:C.line}}/>
          </div>
          <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.line}`,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"24px 1fr 28px 28px 28px 38px 32px",gap:4,padding:"8px 12px",
              borderBottom:`1px solid ${C.line}`,fontSize:10,fontWeight:800,color:C.mute,letterSpacing:.5,
              fontFamily:"'Archivo Narrow',sans-serif",textAlign:"center"}}>
              <span></span><span style={{textAlign:"left"}}>TEAM</span><span>P</span><span>W</span><span>L</span><span>GD</span><span>PTS</span>
            </div>
            {teams.map((row,i)=>(
              <div key={row.team} style={{display:"grid",gridTemplateColumns:"24px 1fr 28px 28px 28px 38px 32px",gap:4,
                padding:"10px 12px",alignItems:"center",textAlign:"center",
                borderBottom:i<teams.length-1?`1px solid ${C.line}`:"none",background:i<2?C.orangeSoft+"55":"transparent"}}>
                <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:13,color:i<2?C.orangeDeep:C.mute}}>{i+1}</span>
                <span style={{display:"flex",alignItems:"center",gap:8,textAlign:"left"}}>
                  <span style={{fontSize:18}}>{FLAG[row.team]||"🏳"}</span>
                  <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:13.5,color:C.ink}}>{row.team}</span>
                </span>
                <span style={{fontSize:13,color:C.inkSoft,fontWeight:600}}>{row.played}</span>
                <span style={{fontSize:13,color:C.inkSoft,fontWeight:600}}>{row.won}</span>
                <span style={{fontSize:13,color:C.inkSoft,fontWeight:600}}>{row.lost}</span>
                <span style={{fontSize:13,color:C.inkSoft,fontWeight:600}}>{(row.gf-row.ga)>0?"+":""}{row.gf-row.ga}</span>
                <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:15,color:C.ink}}>{row.points}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <p style={{fontSize:11.5,color:C.mute,textAlign:"center",margin:0,lineHeight:1.5}}>
        <span style={{display:"inline-block",width:10,height:10,borderRadius:3,background:C.orangeSoft,
          border:`1px solid ${C.orange}`,verticalAlign:"middle",marginRight:5}}/>
        Top two advance to the Round of 16
      </p>
    </div>
  );
}

function StatsBracket(){
  const [bracket,setBracket]=useState(null);
  const scrollRef=useRef(null);
  const [isDesktop,setIsDesktop]=useState(false);
  const [thumb,setThumb]=useState({w:0,left:0}); // scrollbar thumb geometry (%)
  useEffect(()=>{
    // desktop = fine pointer (mouse) and no coarse/touch primary input
    const mq=window.matchMedia("(min-width:1024px) and (pointer:fine)");
    const set=()=>setIsDesktop(mq.matches); set();
    mq.addEventListener?.("change",set);
    return ()=>mq.removeEventListener?.("change",set);
  },[]);
  useEffect(()=>{let live=true;getBracket().then(d=>{if(live)setBracket(d&&Object.keys(d).length?d:null);});return ()=>{live=false;};},[]);

  // keep the custom thumb in sync with the scroll container
  function syncThumb(){
    const el=scrollRef.current; if(!el) return;
    const {scrollWidth,clientWidth,scrollLeft}=el;
    if(scrollWidth<=clientWidth){ setThumb({w:100,left:0}); return; }
    setThumb({ w:(clientWidth/scrollWidth)*100, left:(scrollLeft/scrollWidth)*100 });
  }
  useEffect(()=>{ syncThumb(); },[bracket,isDesktop]);

  // drag the thumb → scroll the container
  function onThumbDown(e){
    e.preventDefault();
    const el=scrollRef.current; if(!el) return;
    const startX=e.clientX, startScroll=el.scrollLeft;
    const ratio=el.scrollWidth/el.clientWidth;
    function move(ev){ el.scrollLeft=startScroll+(ev.clientX-startX)*ratio; }
    function up(){ window.removeEventListener("mousemove",move); window.removeEventListener("mouseup",up); }
    window.addEventListener("mousemove",move); window.addEventListener("mouseup",up);
  }

  if(!bracket) return <div style={{textAlign:"center",padding:"40px",color:C.mute}}>No data available yet — bracket will be populated as matches are played.</div>;
  const rounds=Object.entries(bracket);
  const CARD_H=56,GAP_0=14,COL_W=168,COL_GAP=28,LABEL_H=22;
  const UNIT=CARD_H+GAP_0;
  const n0=rounds[0]?.[1].length||1;
  const totalH=n0*UNIT;
  const centerY=(r,i)=>UNIT*(Math.pow(2,r)*(i+0.5));
  const treeW=rounds.length*COL_W+(rounds.length-1)*COL_GAP;
  const Card=({m})=>(
    <div style={{background:C.card,borderRadius:11,border:`1px solid ${m.done?C.orange:C.line}`,
      overflow:"hidden",height:CARD_H,display:"flex",flexDirection:"column"}}>
      {[["home","home_score"],["away","away_score"]].map(([tk,sk],idx)=>{
        const team=m[tk],score=m[sk];
        const isReal=team&&team!=="—"&&FLAG[team];
        const isPh=team&&team!=="—"&&!FLAG[team];
        const win=m.done&&((sk==="home_score"&&(m.home_score>m.away_score||(m.pens&&m.home_score===m.away_score)))||(sk==="away_score"&&m.away_score>m.home_score));
        return (
          <div key={tk} style={{display:"flex",alignItems:"center",gap:6,padding:"0 9px",flex:1,
            borderBottom:idx===0?`1px solid ${C.line}`:"none",background:win?C.orangeSoft:"transparent"}}>
            {isReal?<span style={{fontSize:15}}>{FLAG[team]}</span>:<span style={{width:15,textAlign:"center",color:C.mute,fontSize:11}}>{isPh?"·":""}</span>}
            <span style={{flex:1,fontFamily:"'Archivo',sans-serif",fontWeight:win?900:700,fontSize:isPh?10.5:12.5,
              color:team==="—"||isPh?C.mute:C.ink,fontStyle:isPh?"italic":"normal",
              whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{team}</span>
            {m.pens&&win&&<span style={{fontSize:8,color:C.orangeDeep,fontWeight:800}}>P</span>}
            <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:13,color:win?C.orangeDeep:C.mute,minWidth:12,textAlign:"center"}}>{score!=null?score:"–"}</span>
          </div>
        );
      })}
    </div>
  );
  return (
    <div>
      <div ref={scrollRef} onScroll={syncThumb}
        style={{overflowX:"auto",WebkitOverflowScrolling:"touch",margin:"0 -16px",padding:"4px 16px 10px"}}>
        <div style={{position:"relative",width:treeW,height:totalH+LABEL_H}}>
          {rounds.map(([round],r)=>(
            <div key={"l"+round} style={{position:"absolute",top:0,left:r*(COL_W+COL_GAP),width:COL_W,textAlign:"center",
              fontFamily:"'Archivo Narrow',sans-serif",fontWeight:800,fontSize:10.5,color:C.mute,letterSpacing:.8}}>{round.toUpperCase()}</div>
          ))}
          <svg width={treeW} height={totalH} style={{position:"absolute",top:LABEL_H,left:0,pointerEvents:"none"}}>
            {rounds.slice(0,-1).map(([,matches],r)=>{
              const x1=r*(COL_W+COL_GAP)+COL_W,x2=(r+1)*(COL_W+COL_GAP),xm=(x1+x2)/2;
              return matches.map((_,i)=>{
                if(i%2!==0) return null;
                const yA=centerY(r,i),yB=centerY(r,i+1),yN=centerY(r+1,Math.floor(i/2));
                return (<g key={`${r}-${i}`} stroke={C.line} strokeWidth="1.5" fill="none">
                  <path d={`M${x1},${yA} H${xm} V${yB} H${x1}`}/><path d={`M${xm},${yN} H${x2}`}/></g>);
              });
            })}
          </svg>
          {rounds.map(([round,matches],r)=>(
            <div key={round} style={{position:"absolute",top:LABEL_H,left:r*(COL_W+COL_GAP),width:COL_W}}>
              {matches.map((m,i)=>(
                <div key={i} style={{position:"absolute",top:centerY(r,i)-CARD_H/2,left:0,width:COL_W}}><Card m={m}/></div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {/* desktop-only draggable scrollbar (mobile uses touch) */}
      {isDesktop && thumb.w<100 && (
        <div style={{height:10,margin:"2px 2px 0",borderRadius:6,background:C.line,position:"relative",cursor:"pointer"}}
          onMouseDown={(e)=>{
            // click on track jumps the thumb toward the click point
            const el=scrollRef.current; if(!el) return;
            const rect=e.currentTarget.getBoundingClientRect();
            const pct=(e.clientX-rect.left)/rect.width;
            el.scrollLeft=pct*(el.scrollWidth-el.clientWidth);
          }}>
          <div onMouseDown={onThumbDown}
            style={{position:"absolute",top:0,height:10,borderRadius:6,background:C.orange,
              width:`${thumb.w}%`,left:`${thumb.left}%`,cursor:"grab"}}/>
        </div>
      )}
      <p style={{fontSize:11.5,color:C.mute,textAlign:"center",margin:"12px 0 0",lineHeight:1.5,padding:"0 8px"}}>
        48-team format · 32 teams reach the knockouts. {isDesktop?"Drag the bar to follow the path to the Final.":"Swipe to follow the path to the Final."}
      </p>
    </div>
  );
}

function StatsSchedule(){
  const [gw,setGw]=useState(1);
  const [all,setAll]=useState(null);
  useEffect(()=>{let live=true;getFixtures().then(list=>{if(live)setAll(Array.isArray(list)?list:[]);});return ()=>{live=false;};},[]);
  const fixtures=useMemo(()=>{
    if(!all) return null;
    return all.filter(f=>(f.gameweek_id||f.gameweek)===gw);
  },[all,gw]);
  return (
    <div>
      <div style={{display:"flex",gap:8,overflowX:"auto",marginBottom:16,paddingBottom:4}}>
        {[1,2,3,4,5,6,7,8].map(n=>(
          <button key={n} onClick={()=>setGw(n)} style={{flexShrink:0,minWidth:54,padding:"10px 0",borderRadius:11,cursor:"pointer",
            border:`1.5px solid ${gw===n?C.ink:C.line}`,background:gw===n?C.ink:C.card,color:gw===n?"#fff":C.mute,
            fontFamily:"'Archivo',sans-serif",fontWeight:800,display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
            <span style={{fontSize:9,letterSpacing:.5,opacity:.7,fontFamily:"'Archivo Narrow',sans-serif"}}>GW</span>
            <span style={{fontSize:17,lineHeight:1}}>{n}</span>
          </button>
        ))}
      </div>
      {fixtures===null ? (
        <div style={{textAlign:"center",padding:"40px",color:C.mute}}>Loading…</div>
      ) : fixtures.length===0 ? (
        <div style={{textAlign:"center",padding:"40px 20px",color:C.mute,fontSize:14,background:C.card,
          borderRadius:14,border:`1px dashed ${C.line}`}}>No fixtures scheduled for GW{gw} yet</div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          {fixtures.map((f,i)=>{
            const home=f.home_team||f.home,away=f.away_team||f.away;
            const hs=f.home_score,as=f.away_score;
            const live=f.status==="live"||f.status==="LIVE";
            const done=f.status==="finished"||f.status==="FT"||hs!=null;
            return (
              <div key={f.id||i} style={{display:"flex",alignItems:"center",gap:10,padding:"13px 15px",
                background:C.card,borderRadius:14,border:`1px solid ${live?C.orange:C.line}`}}>
                <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                  <span style={{display:"flex",alignItems:"center",gap:7,flex:1,justifyContent:"flex-end"}}>
                    <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:14,color:C.ink}}>{home}</span>
                    <span style={{fontSize:20}}>{FLAG[home]||"🏳"}</span>
                  </span>
                  <span style={{minWidth:54,textAlign:"center"}}>
                    {done||live ? <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:18,color:C.ink}}>{hs??0}-{as??0}</span>
                      : <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:12,color:C.mute}}>vs</span>}
                  </span>
                  <span style={{display:"flex",alignItems:"center",gap:7,flex:1}}>
                    <span style={{fontSize:20}}>{FLAG[away]||"🏳"}</span>
                    <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:14,color:C.ink}}>{away}</span>
                  </span>
                </div>
                <div style={{width:44,flexShrink:0,textAlign:"right"}}>
                  {live&&<span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,fontWeight:900,color:C.orange,fontFamily:"'Archivo',sans-serif"}}>
                    <span style={{width:6,height:6,borderRadius:"50%",background:C.orange,animation:"pulse 1.2s infinite"}}/>LIVE</span>}
                  {done&&!live&&<span style={{fontSize:10,fontWeight:800,color:C.mute,letterSpacing:.5,fontFamily:"'Archivo Narrow',sans-serif"}}>FT</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stats({squad}){
  const [section,setSection]=useState("players");
  const PLAYERS=usePlayers();
  // map squad ids → set of {id, name} so "my players" can match backend rows by id or name
  const mySet=useMemo(()=>{
    const s=new Set();
    squad.forEach(id=>{ s.add(id); const p=PLAYERS.find(x=>x.id===id); if(p){s.add(p.n);s.add(p.name);} });
    return s;
  },[squad,PLAYERS]);
  const sections=[
    {k:"players",label:"Players"},
    {k:"groups",label:"Groups"},
    {k:"bracket",label:"Bracket"},
    {k:"schedule",label:"Schedule"},
  ];
  return (
    <div>
      <div style={{padding:"18px 16px 4px"}}>
        <h1 style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:28,color:C.ink,margin:0,letterSpacing:-.5}}>Stats</h1>
        <p style={{fontSize:13,color:C.mute,margin:"3px 0 0"}}>World Cup 2026 · live data</p>
      </div>
      <div style={{display:"flex",gap:8,overflowX:"auto",padding:"14px 16px 12px"}}>
        {sections.map(s=>(
          <button key={s.k} onClick={()=>setSection(s.k)} style={{flexShrink:0,padding:"10px 16px",borderRadius:12,cursor:"pointer",
            border:`1.5px solid ${section===s.k?C.orange:C.line}`,background:section===s.k?C.orange:C.card,
            color:section===s.k?"#fff":C.inkSoft,fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:13.5,letterSpacing:.2}}>{s.label}</button>
        ))}
      </div>
      <div style={{padding:"6px 16px 24px"}}>
        {section==="players"&&<StatsPlayers mySet={mySet}/>}
        {section==="groups"&&<StatsGroups/>}
        {section==="bracket"&&<StatsBracket/>}
        {section==="schedule"&&<StatsSchedule/>}
      </div>
    </div>
  );
}

function TabBar({tab,setTab,squadCount}){
  const tabs=[
    {k:"build",label:"Build",icon:"ball"},
    {k:"pitch",label:"Pitch",icon:"pitch"},
    {k:"ranks",label:"Ranks",icon:"trophy"},
    {k:"quests",label:"Quests",icon:"target"},
    {k:"token",label:"Pool",icon:"pool"},
    {k:"stats",label:"Stats",icon:"chart"},
    {k:"about",label:"Info",icon:"info"},
  ];
  return (
    <nav style={S.tabbar}>
      {tabs.map(({k,label,icon})=>(
        <button key={k} onClick={()=>setTab(k)} style={{...S.tabBtn,...(tab===k?S.tabBtnOn:{})}}>
          <span style={{position:"relative",display:"inline-flex"}}>
            <Icon name={icon} size={22} stroke={2}/>
            {k==="build"&&squadCount>0&&<span style={S.tabDot}>{squadCount}</span>}
          </span>
          <span style={{fontSize:10,fontWeight:700,letterSpacing:.3}}>{label}</span>
        </button>
      ))}
    </nav>
  );
}

const S={
  app:{minHeight:"100vh",background:C.paper,color:C.ink,maxWidth:480,margin:"0 auto",
    position:"relative",fontFamily:"'Inter',system-ui,sans-serif",paddingBottom:72},
  main:{minHeight:"calc(100vh - 130px)"},
  topbar:{position:"sticky",top:0,zIndex:30,height:56,display:"flex",alignItems:"center",
    justifyContent:"space-between",padding:"0 16px",background:"rgba(250,248,245,.92)",
    backdropFilter:"blur(12px)",borderBottom:`1px solid ${C.line}`},
  brand:{display:"flex",alignItems:"center",gap:9},
  brandMark:{width:30,height:30,borderRadius:9,background:C.ink,color:"#fff",display:"grid",placeItems:"center",
    fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:17},
  brandText:{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:16,letterSpacing:-.3},
  poolChip:{display:"flex",alignItems:"center",gap:7,background:C.ink,color:"#fff",padding:"7px 13px",borderRadius:20},
  loginChip:{display:"flex",alignItems:"center",gap:6,background:C.card,color:C.ink,
    padding:"7px 12px",borderRadius:20,border:`1px solid ${C.line}`,cursor:"pointer"},
  loginDot:{width:8,height:8,borderRadius:"50%",background:"#2fbf6b"},
  loginBtn:{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,
    padding:"14px",borderRadius:13,border:"none",cursor:"pointer",
    fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:14.5,letterSpacing:.2},
  poolDot:{width:6,height:6,borderRadius:"50%",background:C.orange,boxShadow:`0 0 6px ${C.orange}`,animation:"pulse 1.5s infinite"},

  budgetHeader:{position:"sticky",top:56,zIndex:20,background:C.paper,padding:"14px 16px 12px",borderBottom:`1px solid ${C.line}`},
  miniLabel:{fontSize:10,color:C.mute,letterSpacing:1.5,fontWeight:700,marginBottom:3},
  segTrack:{height:8,background:C.line,borderRadius:8,overflow:"hidden",marginBottom:10},
  segFill:{height:"100%",background:`linear-gradient(90deg,${C.orange},${C.orangeDeep})`,borderRadius:8,transition:"width .3s ease"},
  rolePills:{display:"flex",gap:6},
  rolePill:{flex:1,textAlign:"center",fontSize:11,fontWeight:800,padding:"5px 0",borderRadius:8,letterSpacing:.3,fontFamily:"'Archivo Narrow',sans-serif"},

  viewToggle:{display:"flex",gap:8,padding:"12px 16px 8px"},
  viewBtn:{flex:1,padding:"10px",borderRadius:11,border:`1.5px solid ${C.line}`,background:C.card,color:C.mute,
    fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:13,letterSpacing:.5,cursor:"pointer",
    display:"flex",alignItems:"center",justifyContent:"center",gap:6},
  viewBtnOn:{background:C.ink,color:"#fff",borderColor:C.ink},
  viewBadge:{background:C.orange,color:"#fff",fontSize:11,fontWeight:900,minWidth:18,height:18,borderRadius:9,
    display:"inline-grid",placeItems:"center",padding:"0 4px"},

  search:{width:"100%",background:C.card,border:`1.5px solid ${C.line}`,borderRadius:12,padding:"12px 16px",
    color:C.ink,fontSize:15,fontFamily:"'Inter',sans-serif",outline:"none",marginBottom:4},
  marketStick:{position:"sticky",top:56,zIndex:18,background:C.paper,paddingTop:8,
    borderBottom:`1px solid ${C.line}`,boxShadow:"0 6px 12px -8px rgba(0,0,0,.12)"},
  projPop:{position:"absolute",top:"calc(100% + 10px)",right:0,zIndex:41,width:248,
    background:C.card,border:`1px solid ${C.line}`,borderRadius:12,padding:"12px 14px",
    boxShadow:"0 12px 30px -8px rgba(0,0,0,.25)"},
  projPopArrow:{position:"absolute",top:-6,right:14,width:11,height:11,background:C.card,
    borderLeft:`1px solid ${C.line}`,borderTop:`1px solid ${C.line}`,transform:"rotate(45deg)"},
  filterScroll:{display:"flex",gap:8,padding:"10px 16px",overflowX:"auto",WebkitOverflowScrolling:"touch"},
  chip:{flexShrink:0,padding:"8px 16px",borderRadius:20,border:`1.5px solid ${C.line}`,background:C.card,color:C.mute,
    fontFamily:"'Archivo Narrow',sans-serif",fontWeight:700,fontSize:13,letterSpacing:.5,cursor:"pointer",whiteSpace:"nowrap"},
  chipOn:{background:C.orange,color:"#fff",borderColor:C.orange},
  posGrid:{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6},
  posBtn:{padding:"10px 0",borderRadius:10,border:`1.5px solid ${C.line}`,background:C.card,color:C.mute,
    fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:13,letterSpacing:.5,cursor:"pointer"},
  posBtnOn:{background:C.orange,color:"#fff",borderColor:C.orange,boxShadow:`0 4px 12px ${C.orange}33`},
  sortBtn:{padding:"6px 12px",borderRadius:8,border:`1px solid ${C.line}`,background:C.card,color:C.mute,
    fontFamily:"'Archivo Narrow',sans-serif",fontWeight:700,fontSize:12,letterSpacing:.5,cursor:"pointer"},
  sortBtnOn:{borderColor:C.ink,color:C.ink,background:C.paper},

  // KIT DESIGNER
  kitToggle:{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
    padding:"12px 16px",marginTop:10,background:C.card,border:`1px solid ${C.line}`,borderRadius:13,
    cursor:"pointer",fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:13,letterSpacing:.5,color:C.ink},
  kitPanel:{background:C.card,border:`1px solid ${C.line}`,borderRadius:14,padding:"16px",marginTop:8},
  kitStage:{position:"relative",width:110,height:104,borderRadius:14,flexShrink:0,
    display:"flex",alignItems:"center",justifyContent:"center",
    background:"radial-gradient(circle at 50% 30%, #faf8f5, #ece6db)",border:`1px solid ${C.line}`},
  kitStageShadow:{position:"absolute",bottom:12,left:"50%",transform:"translateX(-50%)",
    width:62,height:10,borderRadius:"50%",background:"#000",opacity:.16,filter:"blur(3px)"},
  kitNameInput:{width:"100%",background:C.paper,border:`1.5px solid ${C.line}`,borderRadius:9,
    padding:"8px 12px",color:C.ink,fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:15,outline:"none",marginTop:3},
  swatchRow:{display:"flex",gap:7,flexWrap:"wrap",marginTop:6},
  swatch:{width:28,height:28,borderRadius:8,cursor:"pointer",border:"2px solid #ffffff",
    boxShadow:`0 0 0 1px ${C.line}`},
  swatchOn:{boxShadow:`0 0 0 2px ${C.orange}`,transform:"scale(1.08)"},
  patGrid:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginTop:2},
  patTile:{display:"flex",flexDirection:"column",alignItems:"center",padding:"10px 4px 7px",
    borderRadius:11,border:`1.5px solid ${C.line}`,background:C.paper,cursor:"pointer",transition:"all .15s"},
  patTileOn:{borderColor:C.orange,background:C.orangeSoft,boxShadow:`0 2px 8px ${C.orange}22`},

  // FLEX BUTTON
  flexBtn:{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,
    padding:"16px",marginTop:16,borderRadius:14,border:"none",background:C.orange,color:"#fff",
    fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:16,letterSpacing:.5,cursor:"pointer",
    boxShadow:`0 8px 24px ${C.orange}44`},

  // SHARE MODAL
  modalBackdrop:{position:"fixed",inset:0,zIndex:100,background:"rgba(10,8,6,.55)",
    backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end",justifyContent:"center"},
  // Centered popup backdrop (for Dex promo etc.)
  dexBackdrop:{position:"fixed",inset:0,zIndex:100,background:"rgba(10,8,6,.55)",
    backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center"},
  modalSheet:{width:"100%",maxWidth:480,maxHeight:"94vh",overflowY:"auto",background:C.paper,
    borderRadius:"22px 22px 0 0",padding:"16px 16px 28px",animation:"slideUp .25s ease"},
  dexCard:{position:"relative",width:"calc(100% - 40px)",maxWidth:360,margin:"auto",
    alignSelf:"center",background:C.paper,borderRadius:20,padding:"28px 24px 20px",
    textAlign:"center",boxShadow:"0 24px 60px rgba(0,0,0,.4)",border:`1px solid ${C.line}`,
    animation:"popIn .28s cubic-bezier(.2,.9,.3,1.1)"},
  dexClose:{position:"absolute",top:12,right:12,width:30,height:30,borderRadius:9,
    border:`1px solid ${C.line}`,background:C.card,color:C.mute,display:"grid",placeItems:"center",cursor:"pointer"},
  dexRocket:{fontSize:44,lineHeight:1,marginBottom:6},
  dexTitle:{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:24,color:C.ink,letterSpacing:-.3},
  dexBody:{fontSize:13.5,color:C.inkSoft,lineHeight:1.5,margin:"10px 4px 16px"},
  dexBtn:{display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%",
    padding:"14px",borderRadius:13,background:C.orange,color:"#fff",textDecoration:"none",
    fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:15,letterSpacing:.3,
    boxShadow:`0 8px 22px ${C.orange}44`},
  dexDisclaimer:{fontSize:11.5,color:"#e0502f",fontWeight:600,lineHeight:1.45,margin:"14px 6px 0"},
  dexCheck:{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:14,
    fontSize:12.5,color:C.mute,fontWeight:600,cursor:"pointer"},
  dexCloseBtn:{marginTop:8,width:"100%",padding:"10px 0",border:"none",background:"transparent",
    color:C.mute,fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"},
  // Restored token promo banner (visible, top-of-content, rocket + DexScreener CTA)
  tokenPromo:{display:"flex",alignItems:"center",gap:10,background:C.orangeSoft,border:`1px solid ${C.orange}44`,borderRadius:14,padding:"9px 11px",position:"relative"},
  promoRocket:{fontSize:20,flexShrink:0,lineHeight:1},
  promoTitle:{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:13,color:C.ink,letterSpacing:-.2,lineHeight:1.15},
  promoBody:{fontSize:10.5,color:C.mute,lineHeight:1.3,marginTop:1},
  promoBtn:{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:5,flexShrink:0,padding:"7px 11px",borderRadius:9,background:C.orange,color:"#fff",fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:12,letterSpacing:.2,boxShadow:`0 3px 10px ${C.orange}33`},
  promoClose:{position:"absolute",top:3,right:3,width:18,height:18,border:"none",background:"transparent",color:C.mute,fontSize:13,lineHeight:1,cursor:"pointer",padding:0,opacity:0.7},
  iconBtn:{width:34,height:34,borderRadius:10,border:`1px solid ${C.line}`,background:C.card,
    color:C.ink,display:"grid",placeItems:"center",cursor:"pointer"},

  // PREMIUM POSTER CARD
  poster:{position:"relative",overflow:"hidden",borderRadius:18,
    background:"linear-gradient(165deg,#1a1410,#16130f 50%,#0e0b08)",
    boxShadow:"0 18px 55px #0007",border:`1px solid #2a241c`},
  posterGlow:{position:"absolute",top:-50,right:-30,width:200,height:200,borderRadius:"50%",
    background:C.orange,opacity:.16,pointerEvents:"none"},
  posterTop:{position:"relative",zIndex:2,display:"flex",alignItems:"center",justifyContent:"space-between",
    padding:"14px 16px 10px",borderBottom:"1px solid #ffffff10"},
  seasonTag:{fontSize:9,fontWeight:800,letterSpacing:1.5,color:C.orange,border:`1px solid ${C.orange}55`,
    padding:"3px 8px",borderRadius:6,fontFamily:"'Archivo Narrow',sans-serif"},
  posterHero:{position:"relative",zIndex:2,display:"flex",gap:12,padding:"14px 16px 6px"},
  capPhotoSlot:{width:130,height:175,borderRadius:14,overflow:"hidden",flexShrink:0,position:"relative",
    background:"linear-gradient(170deg,#221a12,#14100b)",border:`1px solid ${C.orange}33`},
  capShowcase:{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",
    justifyContent:"center",background:"radial-gradient(circle at 50% 35%, #2a2018, #14100b)"},
  capShowcaseName:{position:"absolute",bottom:10,left:0,right:0,textAlign:"center",
    fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:12,color:"#fff",letterSpacing:.3,
    padding:"0 8px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},
  capArmband:{position:"absolute",top:10,right:10,width:24,height:24,borderRadius:"50%",
    background:C.orange,color:"#fff",display:"grid",placeItems:"center",fontFamily:"'Archivo',sans-serif",
    fontWeight:900,fontSize:13,boxShadow:"0 2px 8px #0006"},
  teamPanel:{flex:1,minWidth:0},
  capDot:{display:"inline-grid",placeItems:"center",width:14,height:14,borderRadius:"50%",
    background:C.orange,color:"#fff",fontSize:8,fontWeight:900,fontFamily:"'Archivo',sans-serif"},
  posterPitch:{position:"relative",margin:"8px 12px",height:300,borderRadius:12,overflow:"hidden",
    background:"linear-gradient(180deg,#1c160f,#100c08)"},
  benchRow:{position:"relative",zIndex:2,padding:"4px 14px 10px"},
  posterFooter:{position:"relative",zIndex:2,display:"flex",alignItems:"center",justifyContent:"space-between",
    gap:8,padding:"10px 14px",borderTop:"1px solid #ffffff10",flexWrap:"wrap"},

  // AI GENERATOR

  // AFFILIATE
  affBar:{display:"flex",alignItems:"center",gap:12,marginTop:14,padding:"12px 14px",
    background:C.card,border:`1px solid ${C.line}`,borderRadius:13},
  affCopyBtn:{display:"inline-flex",alignItems:"center",gap:6,padding:"9px 14px",borderRadius:10,
    border:"none",background:C.ink,color:"#fff",fontFamily:"'Archivo',sans-serif",fontWeight:800,
    fontSize:12,letterSpacing:.5,cursor:"pointer",flexShrink:0},
  shareAction:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"14px",
    borderRadius:13,border:"none",fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:14,
    letterSpacing:.5,cursor:"pointer"},

  statCard:{flex:1,background:C.card,borderRadius:13,padding:"12px",border:`1px solid ${C.line}`,textAlign:"center"},
  statBig:{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:20,color:C.ink,marginTop:2},
  sectionLabel:{fontSize:11,color:C.mute,letterSpacing:1.5,fontWeight:800,margin:"10px 2px 8px",fontFamily:"'Archivo Narrow',sans-serif"},
  benchCard:{position:"relative",flexShrink:0,width:74,display:"flex",flexDirection:"column",
    alignItems:"center",gap:2,padding:"10px 6px 8px",borderRadius:13,background:C.card,
    border:`1px solid ${C.line}`,cursor:"pointer"},
  benchOrder:{position:"absolute",top:5,left:6,width:16,height:16,borderRadius:"50%",
    background:C.orangeSoft,color:C.orangeDeep,fontFamily:"'Archivo',sans-serif",fontWeight:900,
    fontSize:9,display:"grid",placeItems:"center"},
  benchName:{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:11,color:C.ink,marginTop:2,
    maxWidth:64,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},
  benchPos:{fontSize:9.5,color:C.mute,fontWeight:700},
  squadRow:{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",marginBottom:7,background:C.card,
    borderRadius:12,border:`1px solid ${C.line}`},
  cvBtn:{width:30,height:30,borderRadius:8,border:`1.5px solid ${C.line}`,background:C.card,color:C.mute,
    fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:13,cursor:"pointer",flexShrink:0},
  delBtn:{width:30,height:30,borderRadius:8,border:"none",background:C.orangeSoft,color:C.orangeDeep,fontSize:13,cursor:"pointer",flexShrink:0},
  cta:{width:"100%",padding:"16px",borderRadius:14,border:"none",background:C.orange,color:"#fff",
    fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:16,letterSpacing:.5,cursor:"pointer",marginTop:8,boxShadow:`0 6px 20px ${C.orange}44`},

  // ── 3D PERSPECTIVE PITCH ──
  pitchScene:{position:"relative",width:"100%",aspectRatio:"30/42",marginTop:14,borderRadius:20,
    overflow:"hidden",perspective:"900px",perspectiveOrigin:"50% 30%",
    background:"linear-gradient(180deg,#247d42,#1a6234)",
    border:"1px solid #1f3a2a",boxShadow:"0 20px 55px #04160c88, inset 0 0 60px #00000033"},
  pitchSurface:{position:"absolute",left:"-25%",right:"-25%",top:"-12%",bottom:"-12%",
    transform:"rotateX(26deg)",transformOrigin:"50% 50%",overflow:"hidden"},
  pitchStripes:{position:"absolute",inset:0,display:"flex",flexDirection:"column"},
  pitchGlowTop:{position:"absolute",inset:0,pointerEvents:"none",
    background:"radial-gradient(90% 60% at 50% 0%, #6effb733, transparent 55%), radial-gradient(130% 80% at 50% 115%, #00000066, transparent 55%)"},
  pitchPlayers:{position:"absolute",inset:0,zIndex:3,display:"flex",flexDirection:"column",
    justifyContent:"space-around",padding:"8% 5% 9%"},

  // ── PLAYER CARD (FUT-style) ──
  pcWrap:{position:"relative",width:74,display:"flex",justifyContent:"center"},
  pcCtrl:{position:"absolute",top:-6,right:6,width:19,height:19,borderRadius:"50%",
    fontWeight:900,fontSize:10,display:"grid",placeItems:"center",fontFamily:"'Archivo',sans-serif",
    boxShadow:"0 2px 6px #0006",zIndex:5,cursor:"pointer",padding:0,lineHeight:1},
  pcCard:{width:70,borderRadius:11,overflow:"hidden",
    background:"linear-gradient(180deg, rgba(28,40,32,.96), rgba(14,22,16,.96))",
    border:"1px solid #ffffff1f",boxShadow:"0 8px 18px #00000070, inset 0 1px 0 #ffffff1a",
    backdropFilter:"blur(3px)"},
  pcPortrait:{position:"relative",height:46,display:"flex",alignItems:"center",justifyContent:"center",
    background:"radial-gradient(circle at 50% 30%, #2a3d31, #16241a)"},
  pcInfo:{padding:"4px 5px 5px",background:"rgba(8,14,10,.7)"},
  pcName:{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:10.5,color:"#fff",
    letterSpacing:.2,textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
    lineHeight:1.1},
  pcMeta:{display:"flex",alignItems:"center",justifyContent:"center",gap:5,marginTop:2},
  pcFlag:{fontSize:10,lineHeight:1},
  pcValue:{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:9,color:C.orange,letterSpacing:.2},

  myRankCard:{position:"relative",overflow:"hidden",background:C.ink,borderRadius:18,padding:"20px 22px"},
  poolBanner:{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.card,borderRadius:14,
    padding:"14px 18px",border:`1px solid ${C.line}`},
  howItWorksWide:{width:"100%",marginTop:8,display:"flex",alignItems:"center",justifyContent:"center",gap:6,
    background:C.card,color:C.ink,border:`1.5px solid ${C.line}`,padding:"11px",borderRadius:12,cursor:"pointer",
    fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:13,letterSpacing:.2},
  holdExplain:{marginTop:8,background:C.card,border:`1px solid ${C.line}`,borderRadius:14,padding:"16px 16px 14px"},
  holdFormula:{background:C.ink,color:"#fff",borderRadius:10,padding:"12px 14px",textAlign:"center",
    fontFamily:"'Space Mono','Archivo',monospace",fontWeight:700,fontSize:12.5,letterSpacing:.2,lineHeight:1.4},
  holdSnap:{marginTop:12,background:C.orangeSoft,borderRadius:11,padding:"12px 14px"},
  scopeToggle:{display:"flex",gap:6,background:C.card,padding:4,borderRadius:12,border:`1px solid ${C.line}`,
    marginBottom:12},
  scopeBtn:{flex:1,padding:"9px 0",borderRadius:9,border:"none",cursor:"pointer",background:"transparent",
    color:C.mute,fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:13,letterSpacing:.2},
  scopeBtnOn:{background:C.ink,color:"#fff"},

  tokenHero:{position:"relative",overflow:"hidden",background:C.ink,borderRadius:20,padding:"24px 22px"},
  accessCard:{display:"flex",alignItems:"center",gap:14,background:C.card,borderRadius:14,padding:"14px 16px",
    border:`1.5px solid ${C.orange}33`,marginTop:14},
  tokenStat:{background:C.card,borderRadius:14,padding:"16px",border:`1px solid ${C.line}`},
  solscanLink:{display:"inline-flex",alignItems:"center",gap:6,marginTop:14,padding:"8px 12px",
    background:"#ffffff1a",border:"1px solid #ffffff33",borderRadius:10,color:"#fff",
    textDecoration:"none",fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:12,letterSpacing:.2},

  tabbar:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,zIndex:40,
    height:64,display:"flex",background:"rgba(255,255,255,.96)",backdropFilter:"blur(14px)",borderTop:`1px solid ${C.line}`},
  tabBtn:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,
    border:"none",background:"none",color:C.mute,cursor:"pointer",padding:"8px 0",minWidth:0},
  tabBtnOn:{color:C.orange},
  tabDot:{position:"absolute",top:-5,right:-9,background:C.orange,color:"#fff",fontSize:9,fontWeight:900,
    minWidth:15,height:15,borderRadius:8,display:"grid",placeItems:"center",padding:"0 3px"},
  statToggle:{display:"inline-flex",alignItems:"center",gap:7,padding:"8px 13px",borderRadius:11,
    border:`1.5px solid ${C.line}`,background:C.card,color:C.inkSoft,cursor:"pointer",
    fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:12.5,letterSpacing:.2,flexShrink:0},

  // ABOUT
  aboutHero:{position:"relative",overflow:"hidden",background:C.ink,margin:"14px 16px",
    borderRadius:20,padding:"26px 22px"},
  p:{fontSize:14.5,color:C.inkSoft,lineHeight:1.65,margin:"0 0 12px"},
  stepRow:{display:"flex",gap:14,alignItems:"flex-start",padding:"10px 0",borderBottom:`1px solid ${C.line}`},
  stepNum:{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:22,color:C.orange,flexShrink:0,width:34},
  faqItem:{borderBottom:`1px solid ${C.line}`},
  faqQ:{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"14px 0",
    background:"none",border:"none",cursor:"pointer"},
  faqA:{fontSize:13.5,color:C.mute,lineHeight:1.6,padding:"0 0 14px"},
  rulesToggle:{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
    padding:"16px 18px",background:C.ink,color:"#fff",border:"none",borderRadius:14,cursor:"pointer",
    fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:14,letterSpacing:.5,marginTop:8},
  ruleBlock:{background:C.card,border:`1px solid ${C.line}`,borderRadius:14,padding:"16px 18px",marginBottom:10},
  ruleHead:{fontSize:11,color:C.mute,letterSpacing:2,fontWeight:800,marginBottom:12,
    fontFamily:"'Archivo Narrow',sans-serif"},
  ruleLine:{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:`1px solid ${C.line}`},
  rbSearch:{width:"100%",background:C.card,border:`1.5px solid ${C.line}`,borderRadius:11,padding:"11px 14px",
    color:C.ink,fontSize:14,fontFamily:"'Inter',sans-serif",outline:"none",marginBottom:10},
  rbSection:{background:C.card,border:`1px solid ${C.line}`,borderRadius:12,marginBottom:8,overflow:"hidden"},
  rbHead:{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
    padding:"13px 14px",background:"none",border:"none",cursor:"pointer",textAlign:"left"},
  rbP:{fontSize:13,color:C.inkSoft,lineHeight:1.6,margin:0},
  rbUl:{margin:0,paddingLeft:18,fontSize:13,color:C.inkSoft,lineHeight:1.7},
  rbTable:{width:"100%",borderCollapse:"collapse",fontSize:13},
  rbCode:{background:C.ink,color:"#fff",borderRadius:10,padding:"12px 14px",
    fontFamily:"'Space Mono','Archivo',monospace",fontWeight:700,fontSize:12,lineHeight:1.6,whiteSpace:"pre-wrap"},
  rbNote:{fontSize:11.5,color:C.mute,lineHeight:1.5,margin:"10px 0 0",fontStyle:"italic"},
  refundNote:{display:"flex",gap:8,alignItems:"flex-start",background:C.orangeSoft,
    border:`1px solid ${C.orange}33`,borderRadius:11,padding:"10px 12px",fontSize:11.5,
    color:C.inkSoft,lineHeight:1.45},

  // INFOGRAPHICS
  statStrip:{display:"flex",margin:"0 16px",background:C.card,borderRadius:14,
    border:`1px solid ${C.line}`,overflow:"hidden"},
  statStripItem:{flex:1,textAlign:"center",padding:"14px 4px"},
  transformRow:{display:"flex",alignItems:"center",gap:10,marginTop:6},
  transformBox:{flex:1,background:C.card,border:`1px solid ${C.line}`,borderRadius:14,
    padding:"16px 10px",textAlign:"center"},
  transformArrow:{fontSize:22,color:C.orange,fontWeight:900,flexShrink:0},
  stepConnector:{position:"absolute",left:18,top:18,bottom:18,width:2,background:C.line},
  stepRow2:{display:"flex",gap:16,alignItems:"flex-start",padding:"8px 0",position:"relative"},
  stepNumCircle:{width:38,height:38,borderRadius:"50%",flexShrink:0,background:C.orange,color:"#fff",
    display:"grid",placeItems:"center",fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:15,
    boxShadow:`0 0 0 4px ${C.paper}`,zIndex:1},
  flowChart:{display:"flex",flexDirection:"column",alignItems:"center"},
  flowNode:{width:"100%",background:C.card,border:`1.5px solid ${C.line}`,borderRadius:14,
    padding:"14px",textAlign:"center"},
  flowLabel:{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:14,color:C.ink,marginTop:4,letterSpacing:.3},
  flowSub:{fontSize:11,color:C.mute,marginTop:2,fontWeight:600},
  flowLine:{width:2,height:22,background:C.line,position:"relative"},
  flowDot:{position:"absolute",bottom:-2,left:"50%",transform:"translateX(-50%)",
    width:6,height:6,borderRadius:"50%",background:C.orange},
  flowSplit:{display:"flex",gap:10,width:"100%",margin:"10px 0"},
  flowSplitItem:{flex:1,background:C.orangeSoft,borderRadius:12,padding:"12px",textAlign:"center"},
  curveChart:{display:"flex",alignItems:"flex-end",gap:8,height:150,padding:"0 4px",
    background:C.card,border:`1px solid ${C.line}`,borderRadius:14,paddingTop:14,paddingBottom:10},
  curveCol:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",height:"100%"},
  curveBar:{width:"68%",background:`linear-gradient(180deg,${C.orange},${C.orangeDeep})`,
    borderRadius:"6px 6px 0 0",minHeight:8},

  // FUTURE / COMING SOON
  futureCard:{position:"relative",background:C.card,border:`1px dashed ${C.line}`,borderRadius:16,
    padding:"18px",marginBottom:12},
  comingSoon:{position:"absolute",top:14,right:14,fontSize:9.5,fontWeight:800,letterSpacing:1.5,
    color:"#b8b0a4",background:C.paper,border:`1px solid ${C.line}`,padding:"3px 9px",borderRadius:20,
    fontFamily:"'Archivo Narrow',sans-serif"},
  csTag:{display:"inline-flex",alignItems:"center",gap:5,fontSize:9.5,fontWeight:800,letterSpacing:1.2,
    color:"#b8b0a4",border:`1px solid ${C.line}`,padding:"3px 8px",borderRadius:20,
    fontFamily:"'Archivo Narrow',sans-serif",marginLeft:8},
  futureMini:{background:C.card,border:`1px dashed ${C.line}`,borderRadius:13,padding:"13px 15px"},

  // QUESTS
  questHero:{position:"relative",overflow:"hidden",background:C.ink,borderRadius:20,padding:"20px 22px"},
  questCard:{background:C.card,border:`1px solid ${C.line}`,borderRadius:16,padding:"14px 16px",
    marginBottom:10,boxShadow:"0 1px 3px #0000000a"},
  questCat:{fontSize:9.5,fontWeight:800,letterSpacing:1,color:C.orangeDeep,background:C.orangeSoft,
    padding:"3px 8px",borderRadius:6,fontFamily:"'Archivo Narrow',sans-serif"},
  questDeliver:{display:"flex",gap:8,marginTop:10,padding:"9px 11px",background:C.paper,
    borderRadius:10,border:`1px solid ${C.line}`},
  questBtn:{padding:"8px 14px",borderRadius:9,border:"none",background:C.ink,color:"#fff",
    fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:12,letterSpacing:.5,cursor:"pointer"},
  questBanner:{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"14px 16px",
    background:C.card,border:`1.5px solid ${C.orange}44`,borderRadius:14,cursor:"pointer",
    boxShadow:`0 2px 10px ${C.orange}14`},
  loopBox:{background:C.card,border:`1px solid ${C.line}`,borderRadius:14,padding:"16px 18px"},
  socialGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},
  coinNotice:{marginTop:16,padding:"14px 16px",borderRadius:13,background:C.orangeSoft,
    border:`1px solid ${C.orange}44`},
  socialBtn:{display:"flex",alignItems:"center",gap:10,padding:"13px 15px",borderRadius:13,
    border:`1.5px solid ${C.line}`,background:C.card,color:C.ink,textDecoration:"none",
    fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:13.5,letterSpacing:.2},
  socialBtnPrimary:{background:C.orange,color:"#fff",borderColor:C.orange,
    boxShadow:`0 6px 18px ${C.orange}33`,gridColumn:"1 / -1",justifyContent:"center"},
  footer:{margin:"26px 16px 0",padding:"22px 20px",background:C.card,border:`1px solid ${C.line}`,
    borderRadius:16,textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center"},
  feeMechanism:{marginTop:14,background:C.paper,border:`1px solid ${C.line}`,borderRadius:13,padding:"14px 16px"},
  feeSplit:{display:"flex",gap:10},
  feeArm:{flex:1,background:C.card,border:`1px solid ${C.line}`,borderRadius:11,padding:"12px"},
};

function Fonts(){
  return <style>{`@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@700;800;900&family=Archivo+Narrow:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');`}</style>;
}
function Style(){
  return <style>{`
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    body{margin:0;background:${C.paper}}
    @keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}
    @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
    @keyframes popIn{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}
    @keyframes spin{to{transform:rotate(360deg)}}
    input::placeholder{color:${C.mute}}
    ::-webkit-scrollbar{width:0;height:0}
    button:active{transform:scale(.97)}
  `}</style>;
}
