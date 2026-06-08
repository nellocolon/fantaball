import { useState, useMemo, useEffect, useRef, createContext, useContext } from "react";
import { toPng } from "html-to-image";
import { getPlayers, getLeaderboard, saveRoster, getMyRoster, saveLineup, getLineup, getFixtures, getScorers, getAssists, getCards, getStandings, getBracket, getBounties, HAS_SUPABASE, computeFormationLock } from "./lib/data";
import { initAuth, onAuthChange, signInWithX, signOut, connectWallet } from "./lib/auth";
import { supabase } from "./lib/supabase";

// ─── ICON SYSTEM (monochrome SVG, inherits currentColor) ──────────────────
// Declared at top (function declaration is hoisted) to avoid TDZ when used in JSX below.
// common props repaired (was truncated in bad edit); all switch cases completed.
function Icon({ name, size=20, stroke=2, style }){
  const s = { width:size, height:size, display:"inline-block", verticalAlign:"middle", flexShrink:0, ...style };
  const common = { fill:"none", stroke:"currentColor", strokeWidth:stroke, strokeLinecap:"round", strokeLinejoin:"round" };
  switch(name){
    // complete set: ball, pitch, trophy, pool, info, crown, medal, bolt, lock, chain, ticket, swap, cash, doc, check, x, chevron, arrow, plus, minus, users, flame, share, copy, download, twitter, target, clock
    case "ball": // football / pitch builder
      return (<svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="9" {...common}/><path d="M12 7.5l3.2 2.3-1.2 3.7h-4l-1.2-3.7z" {...common}/><path d="M12 3v4.5M5.5 9.5l3.3 1.2M18.5 9.5l-3.3 1.2M8.8 17.5l1.2-3.4M15.2 17.5l-1.2-3.4" {...common}/></svg>);
    case "pitch": // formation grid
      return (<svg viewBox="0 0 24 24" style={s}><rect x="3" y="4" width="18" height="16" rx="1.5" {...common}/><path d="M3 12h18M12 4v16" {...common}/><circle cx="12" cy="12" r="2.5" {...common}/><path d="M3 8h3v8H3M21 8h-3v8h3" {...common}/></svg>);
    case "trophy":
      return (<svg viewBox="0 0 24 24" style={s}><path d="M7 4h10v5a5 5 0 0 1-10 0V4z" {...common}/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 19h6M10 19v-3M14 19v-3" {...common}/></svg>);
    case "pool": // coin / prize pool
      return (<svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="9" {...common}/><path d="M12 7v10M9.5 9.2a2.5 2 0 0 1 5 0M9.5 14.8a2.5 2 0 0 0 5 0M9 12h6" {...common}/></svg>);
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



// ─── PLAYER DATA ──────────────────────────────────────────────────────────
const DEMO_PLAYERS=[
{id:1,n:"MASTIL",t:"ALG",p:"GK",c:"Stade Nyonnais",pr:23.5,num:1,pts:9.6,own:23.6},
{id:2,n:"MANDI",t:"ALG",p:"DF",c:"Lille OSC",pr:37.0,num:2,pts:15.2,own:22.6},
{id:3,n:"ABADA",t:"ALG",p:"DF",c:"USM Alger",pr:30.0,num:3,pts:12.9,own:27.4},
{id:4,n:"TOUGAI",t:"ALG",p:"DF",c:"Espérance De Tunis",pr:29.0,num:4,pts:11.5,own:20.4},
{id:5,n:"BELAID",t:"ALG",p:"DF",c:"JS Kabylie",pr:30.0,num:5,pts:12.7,own:26.4},
{id:6,n:"ZERROUKI",t:"ALG",p:"MF",c:"Twente",pr:31.5,num:6,pts:10.5,own:27.3},
{id:7,n:"MAHREZ",t:"ALG",p:"FW",c:"Al Ahli",pr:46.5,num:7,pts:18.0,own:33.3},
{id:8,n:"AOUAR",t:"ALG",p:"MF",c:"Al Ittihad",pr:58.0,num:8,pts:23.9,own:38.1},
{id:9,n:"GOUIRI",t:"ALG",p:"FW",c:"Olympique Marseill",pr:60.5,num:9,pts:21.4,own:41.9},
{id:10,n:"CHAIBI",t:"ALG",p:"MF",c:"Eintracht Frankfur",pr:53.5,num:10,pts:22.3,own:33.4},
{id:11,n:"HADJ MOUSSA",t:"ALG",p:"FW",c:"Feyenoord Rotterda",pr:61.5,num:11,pts:22.6,own:37.3},
{id:12,n:"BENBOUALI",t:"ALG",p:"FW",c:"Györi ETO",pr:35.0,num:12,pts:14.3,own:19.3},
{id:13,n:"HADJAM",t:"ALG",p:"DF",c:"BSC Young Boys",pr:25.5,num:13,pts:10.5,own:21.7},
{id:14,n:"BOUDAOUI",t:"ALG",p:"MF",c:"OGC Nice",pr:53.5,num:14,pts:21.3,own:30.3},
{id:15,n:"AIT NOURI",t:"ALG",p:"DF",c:"Man City",pr:67.5,num:15,pts:26.5,own:44.5},
{id:16,n:"BENBOT",t:"ALG",p:"GK",c:"USM Alger",pr:16.0,num:16,pts:6.6,own:11.2},
{id:17,n:"BELGHALI",t:"ALG",p:"DF",c:"Hellas Verona",pr:24.5,num:17,pts:9.1,own:14.1},
{id:18,n:"AMOURA",t:"ALG",p:"FW",c:"VfL Wolfsburg",pr:57.5,num:18,pts:21.4,own:37.1},
{id:19,n:"BENTALEB",t:"ALG",p:"MF",c:"Lille OSC",pr:42.5,num:19,pts:14.3,own:25.8},
{id:20,n:"BOULBINA",t:"ALG",p:"FW",c:"Al Duhail SC",pr:30.0,num:20,pts:11.7,own:15.2},
{id:21,n:"BENSEBAINI",t:"ALG",p:"DF",c:"Dortmund",pr:55.0,num:21,pts:19.2,own:30.5},
{id:22,n:"MAZA",t:"ALG",p:"MF",c:"Leverkusen",pr:63.0,num:22,pts:25.5,own:38.0},
{id:23,n:"ZIDANE",t:"ALG",p:"GK",c:"Granada",pr:17.0,num:23,pts:5.9,own:11.6},
{id:24,n:"TITRAOUI",t:"ALG",p:"MF",c:"Sporting Charleroi",pr:25.5,num:24,pts:8.6,own:24.1},
{id:25,n:"GHEDJEMIS",t:"ALG",p:"FW",c:"Frosinone",pr:30.0,num:25,pts:11.6,own:20.8},
{id:26,n:"CHRGUI",t:"ALG",p:"DF",c:"Paris",pr:24.5,num:26,pts:8.8,own:13.7},
{id:27,n:"MUSSO",t:"ARG",p:"GK",c:"Atlético",pr:48.5,num:1,pts:15.7,own:37.6},
{id:28,n:"BALERDI",t:"ARG",p:"DF",c:"Olympique Marseill",pr:47.0,num:2,pts:16.3,own:25.2},
{id:29,n:"TAGLIAFICO",t:"ARG",p:"DF",c:"Olympique Lyonnais",pr:35.5,num:3,pts:13.2,own:19.3},
{id:30,n:"MONTIEL",t:"ARG",p:"DF",c:"CA River Plate",pr:31.0,num:4,pts:10.7,own:25.2},
{id:31,n:"PAREDES",t:"ARG",p:"MF",c:"CA Boca Juniors",pr:30.5,num:5,pts:12.5,own:24.9},
{id:32,n:"MARTINEZ",t:"ARG",p:"DF",c:"Man Utd",pr:79.0,num:6,pts:29.0,own:52.1},
{id:33,n:"DE PAUL",t:"ARG",p:"MF",c:"Inter Miami",pr:28.0,num:7,pts:9.3,own:26.6},
{id:34,n:"BARCO",t:"ARG",p:"MF",c:"RC Strasbourg",pr:54.0,num:8,pts:22.9,own:30.1},
{id:35,n:"J. ALVAREZ",t:"ARG",p:"FW",c:"Atlético",pr:106.5,num:9,pts:35.7,own:62.7},
{id:36,n:"MESSI",t:"ARG",p:"FW",c:"Inter Miami",pr:31.5,num:10,pts:10.5,own:17.2},
{id:37,n:"LO CELSO",t:"ARG",p:"MF",c:"Real Betis",pr:51.5,num:11,pts:20.4,own:40.2},
{id:38,n:"RULLI",t:"ARG",p:"GK",c:"Olympique Marseill",pr:22.5,num:12,pts:8.9,own:17.6},
{id:39,n:"ROMERO",t:"ARG",p:"DF",c:"Tottenham",pr:77.5,num:13,pts:32.4,own:51.5},
{id:40,n:"PALACIOS",t:"ARG",p:"MF",c:"Leverkusen",pr:84.5,num:14,pts:35.4,own:48.3},
{id:41,n:"N. GONZALEZ",t:"ARG",p:"MF",c:"Atlético",pr:78.5,num:15,pts:27.2,own:45.1},
{id:42,n:"ALMADA",t:"ARG",p:"FW",c:"Atlético",pr:86.5,num:16,pts:34.2,own:57.6},
{id:43,n:"SIMEONE",t:"ARG",p:"FW",c:"Atlético",pr:74.5,num:17,pts:24.9,own:48.5},
{id:44,n:"NICO PAZ",t:"ARG",p:"FW",c:"Como",pr:56.5,num:18,pts:24.5,own:30.6},
{id:45,n:"OTAMENDI",t:"ARG",p:"DF",c:"SL Benfica",pr:35.5,num:19,pts:13.2,own:26.8},
{id:46,n:"MAC ALLISTER",t:"ARG",p:"MF",c:"Liverpool",pr:85.0,num:20,pts:35.7,own:55.2},
{id:47,n:"LOPEZ",t:"ARG",p:"FW",c:"SE Palmeiras",pr:32.0,num:21,pts:11.8,own:25.8},
{id:48,n:"L. MARTINEZ",t:"ARG",p:"FW",c:"Inter",pr:97.5,num:22,pts:35.8,own:59.4},
{id:49,n:"E. MARTINEZ",t:"ARG",p:"GK",c:"Aston Villa",pr:23.0,num:23,pts:9.9,own:20.8},
{id:50,n:"E. FERNANDEZ",t:"ARG",p:"MF",c:"Chelsea",pr:84.0,num:24,pts:34.3,own:48.7},
{id:51,n:"MEDINA",t:"ARG",p:"DF",c:"Olympique Marseill",pr:41.0,num:25,pts:14.0,own:26.5},
{id:52,n:"MOLINA",t:"ARG",p:"DF",c:"Atlético",pr:64.0,num:26,pts:25.1,own:32.5},
{id:53,n:"RYAN",t:"AUS",p:"GK",c:"Levante UD",pr:17.5,num:1,pts:7.3,own:9.2},
{id:54,n:"DEGENEK",t:"AUS",p:"DF",c:"APOEL",pr:26.0,num:2,pts:10.3,own:20.5},
{id:55,n:"CIRCATI",t:"AUS",p:"DF",c:"Parma",pr:27.0,num:3,pts:10.9,own:17.5},
{id:56,n:"ITALIANO",t:"AUS",p:"DF",c:"Grazer AK",pr:29.0,num:4,pts:11.4,own:14.7},
{id:57,n:"BOS",t:"AUS",p:"DF",c:"Feyenoord Rotterda",pr:44.5,num:5,pts:16.6,own:36.0},
{id:58,n:"GERIA",t:"AUS",p:"DF",c:"Albirex Niigata",pr:21.0,num:6,pts:7.7,own:25.3},
{id:59,n:"LECKIE",t:"AUS",p:"FW",c:"Melbourne City",pr:25.5,num:7,pts:8.3,own:15.7},
{id:60,n:"METCALFE",t:"AUS",p:"MF",c:"St. Pauli",pr:31.0,num:8,pts:10.1,own:22.3},
{id:61,n:"TOURE",t:"AUS",p:"FW",c:"Norwich City",pr:33.5,num:9,pts:12.7,own:26.4},
{id:62,n:"HRUSTIC",t:"AUS",p:"FW",c:"SC Heracles Almelo",pr:35.5,num:10,pts:12.6,own:19.0},
{id:63,n:"MABIL",t:"AUS",p:"FW",c:"CD Castellón",pr:31.0,num:11,pts:10.1,own:22.8},
{id:64,n:"IZZO",t:"AUS",p:"GK",c:"Randers",pr:16.5,num:12,pts:7.1,own:21.5},
{id:65,n:"O'NEILL",t:"AUS",p:"MF",c:"New York City",pr:32.5,num:13,pts:14.1,own:19.2},
{id:66,n:"DEVLIN",t:"AUS",p:"MF",c:"Heart Of Midlothia",pr:29.5,num:14,pts:10.2,own:27.1},
{id:67,n:"TREWIN",t:"AUS",p:"DF",c:"New York City",pr:26.5,num:15,pts:9.9,own:23.4},
{id:68,n:"BEHICH",t:"AUS",p:"DF",c:"Melbourne City",pr:20.0,num:16,pts:7.9,own:22.2},
{id:69,n:"IRANKUNDA",t:"AUS",p:"FW",c:"Watford",pr:27.0,num:17,pts:9.0,own:28.3},
{id:70,n:"BEACH",t:"AUS",p:"GK",c:"Melbourne City",pr:16.0,num:18,pts:6.1,own:10.4},
{id:71,n:"SOUTTAR",t:"AUS",p:"DF",c:"Leicester City",pr:26.5,num:19,pts:11.2,own:16.4},
{id:72,n:"VOLPATO",t:"AUS",p:"FW",c:"US Sassuolo",pr:28.5,num:20,pts:9.8,own:26.6},
{id:73,n:"BURGESS",t:"AUS",p:"DF",c:"Swansea City",pr:23.5,num:21,pts:9.8,own:25.8},
{id:74,n:"IRVINE",t:"AUS",p:"MF",c:"St. Pauli",pr:22.0,num:22,pts:8.8,own:15.0},
{id:75,n:"VELUPILLAY",t:"AUS",p:"FW",c:"Melbourne Victory",pr:33.5,num:23,pts:13.9,own:25.6},
{id:76,n:"OKON-ENGSTLER",t:"AUS",p:"MF",c:"Sydney",pr:28.5,num:24,pts:12.4,own:29.2},
{id:77,n:"HERRINGTON",t:"AUS",p:"DF",c:"Colorado Rapids",pr:20.5,num:25,pts:7.0,own:16.4},
{id:78,n:"YENGI",t:"AUS",p:"FW",c:"Machida Zelvia",pr:31.5,num:26,pts:10.9,own:19.4},
{id:79,n:"SCHLAGER",t:"AUT",p:"GK",c:"Red Bull Salzburg",pr:21.5,num:1,pts:9.0,own:19.4},
{id:80,n:"AFFENGRUBER",t:"AUT",p:"DF",c:"Elche",pr:30.0,num:2,pts:12.9,own:26.7},
{id:81,n:"DANSO",t:"AUT",p:"DF",c:"Tottenham",pr:69.5,num:3,pts:24.6,own:37.2},
{id:82,n:"XAVER",t:"AUT",p:"MF",c:"RB Leipzig",pr:56.5,num:4,pts:22.1,own:35.2},
{id:83,n:"POSCH",t:"AUT",p:"DF",c:"1. FSV Mainz 05",pr:51.5,num:5,pts:22.5,own:33.6},
{id:84,n:"SEIWALD",t:"AUT",p:"MF",c:"RB Leipzig",pr:55.5,num:6,pts:20.5,own:32.7},
{id:85,n:"ARNAUTOVIC",t:"AUT",p:"FW",c:"FK Crvena Zvezda",pr:26.5,num:7,pts:9.3,own:21.9},
{id:86,n:"ALABA",t:"AUT",p:"DF",c:"Real Madrid",pr:53.5,num:8,pts:20.8,own:35.7},
{id:87,n:"SABITZER",t:"AUT",p:"MF",c:"Dortmund",pr:76.5,num:9,pts:31.5,own:52.6},
{id:88,n:"GRILLITSCH",t:"AUT",p:"MF",c:"SC Braga",pr:28.5,num:10,pts:9.7,own:21.8},
{id:89,n:"GREGORITSCH",t:"AUT",p:"FW",c:"Augsburg",pr:56.0,num:11,pts:21.0,own:30.2},
{id:90,n:"WIEGELE",t:"AUT",p:"GK",c:"Viktoria Plzeň",pr:17.5,num:12,pts:6.7,own:22.0},
{id:91,n:"PENTZ",t:"AUT",p:"GK",c:"Brøndby IF",pr:17.0,num:13,pts:6.1,own:22.4},
{id:92,n:"KALAJDZIC",t:"AUT",p:"FW",c:"LASK Linz",pr:34.5,num:14,pts:13.4,own:27.4},
{id:93,n:"LIENHART",t:"AUT",p:"DF",c:"SC Freiburg",pr:46.0,num:15,pts:18.0,own:37.6},
{id:94,n:"MWENE",t:"AUT",p:"DF",c:"1. FSV Mainz 05",pr:43.0,num:16,pts:18.6,own:24.8},
{id:95,n:"CHUKWUEMEKA",t:"AUT",p:"MF",c:"Dortmund",pr:70.5,num:17,pts:26.8,own:49.1},
{id:96,n:"SCHMID",t:"AUT",p:"MF",c:"SV Werder Bremen",pr:29.5,num:18,pts:10.0,own:20.9},
{id:97,n:"BAUMGARTNER",t:"AUT",p:"MF",c:"RB Leipzig",pr:52.0,num:19,pts:22.1,own:37.8},
{id:98,n:"LAIMER",t:"AUT",p:"MF",c:"Bayern",pr:76.5,num:20,pts:32.8,own:44.2},
{id:99,n:"WIMMER",t:"AUT",p:"FW",c:"VfL Wolfsburg",pr:56.0,num:21,pts:22.4,own:42.1},
{id:100,n:"PRASS",t:"AUT",p:"MF",c:"TSG Hoffenheim",pr:52.5,num:22,pts:22.8,own:36.2},
{id:101,n:"FRIEDL",t:"AUT",p:"DF",c:"SV Werder Bremen",pr:24.5,num:23,pts:8.5,own:21.8},
{id:102,n:"WANNER",t:"AUT",p:"MF",c:"PSV Eindhoven",pr:43.5,num:24,pts:18.6,own:24.0},
{id:103,n:"SVOBODA",t:"AUT",p:"DF",c:"Venezia",pr:25.0,num:25,pts:9.2,own:18.1},
{id:104,n:"SCHÖPF",t:"AUT",p:"MF",c:"Wolfsberger AC",pr:27.0,num:26,pts:11.1,own:19.7},
{id:105,n:"COURTOIS",t:"BEL",p:"GK",c:"Real Madrid",pr:47.0,num:1,pts:17.3,own:31.0},
{id:106,n:"DEBAST",t:"BEL",p:"DF",c:"Sporting CP",pr:47.0,num:2,pts:20.2,own:30.2},
{id:107,n:"THEATE",t:"BEL",p:"DF",c:"Eintracht Frankfur",pr:49.5,num:3,pts:19.7,own:30.4},
{id:108,n:"MECHELE",t:"BEL",p:"DF",c:"Club Brugge",pr:21.5,num:4,pts:8.5,own:13.3},
{id:109,n:"DE CUYPER",t:"BEL",p:"DF",c:"Brighton",pr:46.5,num:5,pts:15.8,own:34.8},
{id:110,n:"WITSEL",t:"BEL",p:"MF",c:"Girona",pr:41.0,num:6,pts:15.0,own:34.3},
{id:111,n:"DE BRUYNE",t:"BEL",p:"MF",c:"Napoli",pr:67.5,num:7,pts:25.0,own:39.3},
{id:112,n:"TIELEMANS",t:"BEL",p:"MF",c:"Aston Villa",pr:56.0,num:8,pts:21.3,own:28.5},
{id:113,n:"LUKAKU",t:"BEL",p:"FW",c:"Napoli",pr:75.5,num:9,pts:28.3,own:50.5},
{id:114,n:"TROSSARD",t:"BEL",p:"FW",c:"Arsenal",pr:91.0,num:10,pts:33.3,own:50.0},
{id:115,n:"DOKU",t:"BEL",p:"FW",c:"Man City",pr:98.5,num:11,pts:33.7,own:58.7},
{id:116,n:"LAMMENS",t:"BEL",p:"GK",c:"Man Utd",pr:41.5,num:12,pts:17.0,own:22.6},
{id:117,n:"PENDERS",t:"BEL",p:"GK",c:"RC Strasbourg",pr:26.0,num:13,pts:11.1,own:24.8},
{id:118,n:"LUKEBAKIO",t:"BEL",p:"FW",c:"SL Benfica",pr:57.0,num:14,pts:20.8,own:32.1},
{id:119,n:"MEUNIER",t:"BEL",p:"DF",c:"Lille OSC",pr:31.5,num:15,pts:10.3,own:16.1},
{id:120,n:"DE WINTER",t:"BEL",p:"DF",c:"AC Milan",pr:64.0,num:16,pts:26.9,own:45.8},
{id:121,n:"DE KETELAERE",t:"BEL",p:"FW",c:"Atalanta Bergamo",pr:56.5,num:17,pts:20.2,own:35.2},
{id:122,n:"SEYS",t:"BEL",p:"DF",c:"Club Brugge",pr:25.0,num:18,pts:9.9,own:24.8},
{id:123,n:"MOREIRA",t:"BEL",p:"MF",c:"RC Strasbourg",pr:43.5,num:19,pts:14.7,own:30.9},
{id:124,n:"VANAKEN",t:"BEL",p:"MF",c:"Club Brugge",pr:22.5,num:20,pts:9.3,own:12.8},
{id:125,n:"CASTAGNE",t:"BEL",p:"DF",c:"Fulham",pr:37.5,num:21,pts:13.1,own:24.7},
{id:126,n:"SAELEMAEKERS",t:"BEL",p:"MF",c:"AC Milan",pr:68.5,num:22,pts:22.3,own:43.6},
{id:127,n:"RASKIN",t:"BEL",p:"MF",c:"Rangers",pr:52.0,num:23,pts:22.3,own:26.1},
{id:128,n:"ONANA",t:"BEL",p:"MF",c:"Aston Villa",pr:49.5,num:24,pts:18.6,own:32.2},
{id:129,n:"NGOY",t:"BEL",p:"DF",c:"Lille OSC",pr:41.0,num:25,pts:17.1,own:24.4},
{id:130,n:"FERNANDEZ-PARDO",t:"BEL",p:"FW",c:"Lille OSC",pr:51.5,num:26,pts:20.2,own:29.1},
{id:131,n:"VASILJ",t:"BIH",p:"GK",c:"St. Pauli",pr:19.5,num:1,pts:6.5,own:9.8},
{id:132,n:"MUJAKIĆ",t:"BIH",p:"DF",c:"Gaziantep FK",pr:28.0,num:2,pts:10.3,own:27.1},
{id:133,n:"HADŽIKADUNIĆ",t:"BIH",p:"DF",c:"UC Sampdoria",pr:29.0,num:3,pts:11.4,own:15.6},
{id:134,n:"MUHAREMOVIĆ",t:"BIH",p:"DF",c:"US Sassuolo",pr:24.5,num:4,pts:7.9,own:13.1},
{id:135,n:"KOLAŠINAC",t:"BIH",p:"DF",c:"Atalanta Bergamo",pr:43.5,num:5,pts:16.5,own:31.6},
{id:136,n:"TAHIROVIĆ",t:"BIH",p:"MF",c:"Brøndby IF",pr:29.5,num:6,pts:10.4,own:23.2},
{id:137,n:"DEDIĆ",t:"BIH",p:"DF",c:"SL Benfica",pr:43.0,num:7,pts:15.0,own:22.1},
{id:138,n:"GIGOVIĆ",t:"BIH",p:"MF",c:"BSC Young Boys",pr:31.0,num:8,pts:10.0,own:18.0},
{id:139,n:"BAŽDAR",t:"BIH",p:"FW",c:"Jagiellonia Białys",pr:35.0,num:9,pts:14.8,own:27.2},
{id:140,n:"DEMIROVIĆ",t:"BIH",p:"FW",c:"VfB Stuttgart",pr:59.0,num:10,pts:19.6,own:37.8},
{id:141,n:"DŽEKO",t:"BIH",p:"FW",c:"Schalke 04",pr:25.5,num:11,pts:8.4,own:17.0},
{id:142,n:"JURKAS",t:"BIH",p:"GK",c:"FK Borac Banja Luk",pr:15.0,num:12,pts:6.0,own:21.7},
{id:143,n:"BAŠIĆ",t:"BIH",p:"MF",c:"Astana",pr:31.0,num:13,pts:12.0,own:22.9},
{id:144,n:"ŠUNJIĆ",t:"BIH",p:"MF",c:"Pafos",pr:29.0,num:14,pts:9.5,own:24.4},
{id:145,n:"MEMIĆ",t:"BIH",p:"MF",c:"Viktoria Plzeň",pr:29.5,num:15,pts:10.1,own:18.0},
{id:146,n:"HADŽIAHMETOVIĆ",t:"BIH",p:"MF",c:"Hull City",pr:31.5,num:16,pts:12.5,own:26.3},
{id:147,n:"BURNIĆ",t:"BIH",p:"MF",c:"Karlsruher SC",pr:31.0,num:17,pts:12.0,own:17.2},
{id:148,n:"KATIĆ",t:"BIH",p:"DF",c:"Schalke 04",pr:26.0,num:18,pts:9.2,own:15.5},
{id:149,n:"ALAJBEGOVIĆ",t:"BIH",p:"FW",c:"Red Bull Salzburg",pr:28.5,num:19,pts:12.3,own:15.9},
{id:150,n:"BAJRAKTAREVIĆ",t:"BIH",p:"FW",c:"PSV Eindhoven",pr:50.5,num:20,pts:19.2,own:31.6},
{id:151,n:"RADELJIĆ",t:"BIH",p:"DF",c:"HNK Rijeka",pr:25.5,num:21,pts:10.2,own:13.1},
{id:152,n:"ZLOMISLIĆ",t:"BIH",p:"GK",c:"HNK Rijeka",pr:17.0,num:22,pts:5.9,own:9.7},
{id:153,n:"TABAKOVIĆ",t:"BIH",p:"FW",c:"Borussia Mönchengl",pr:51.0,num:23,pts:20.6,own:36.2},
{id:154,n:"ČELIK",t:"BIH",p:"DF",c:"RC Lens",pr:34.5,num:24,pts:11.6,own:28.3},
{id:155,n:"LUKIĆ",t:"BIH",p:"FW",c:"Universitatea Cluj",pr:31.0,num:25,pts:10.6,own:23.2},
{id:156,n:"MAHMIĆ",t:"BIH",p:"MF",c:"Slovan Liberec",pr:25.5,num:26,pts:8.6,own:13.2},
{id:157,n:"A. BECKER",t:"BRA",p:"GK",c:"Liverpool",pr:47.0,num:1,pts:17.4,own:38.2},
{id:158,n:"WESLEY",t:"BRA",p:"DF",c:"AS Roma",pr:42.0,num:2,pts:13.7,own:29.9},
{id:159,n:"GABRIEL",t:"BRA",p:"DF",c:"Arsenal",pr:68.0,num:3,pts:22.6,own:41.4},
{id:160,n:"MARQUINHOS",t:"BRA",p:"DF",c:"PSG",pr:66.0,num:4,pts:26.7,own:38.2},
{id:161,n:"CASEMIRO",t:"BRA",p:"MF",c:"Man Utd",pr:62.5,num:5,pts:25.5,own:31.3},
{id:162,n:"ALEX SANDRO",t:"BRA",p:"DF",c:"CR Flamengo",pr:21.0,num:6,pts:8.0,own:13.7},
{id:163,n:"VINI JR.",t:"BRA",p:"FW",c:"Real Madrid",pr:105.5,num:7,pts:34.4,own:54.0},
{id:164,n:"BRUNO G.",t:"BRA",p:"MF",c:"Newcastle",pr:87.0,num:8,pts:37.8,own:53.1},
{id:165,n:"CUNHA",t:"BRA",p:"FW",c:"Man Utd",pr:103.5,num:9,pts:40.4,own:53.6},
{id:166,n:"NEYMAR JR",t:"BRA",p:"FW",c:"Santos",pr:27.0,num:10,pts:10.2,own:28.0},
{id:167,n:"RAPHINHA",t:"BRA",p:"FW",c:"Barcelona",pr:109.5,num:11,pts:39.7,own:66.0},
{id:168,n:"WEVERTON",t:"BRA",p:"GK",c:"Grêmio FBPA",pr:12.0,num:12,pts:3.9,own:13.6},
{id:169,n:"DANILO",t:"BRA",p:"DF",c:"CR Flamengo",pr:19.0,num:13,pts:6.6,own:12.8},
{id:170,n:"BREMER",t:"BRA",p:"DF",c:"Juventus",pr:63.0,num:14,pts:20.9,own:40.3},
{id:171,n:"LEO PEREIRA",t:"BRA",p:"DF",c:"CR Flamengo",pr:24.5,num:15,pts:9.7,own:20.7},
{id:172,n:"DOUGLAS SANTOS",t:"BRA",p:"DF",c:"Zenit St. Petersbu",pr:23.0,num:16,pts:7.8,own:19.9},
{id:173,n:"FABINHO",t:"BRA",p:"MF",c:"Al Ittihad",pr:49.5,num:17,pts:21.5,own:25.0},
{id:174,n:"DANILO S.",t:"BRA",p:"MF",c:"Botafogo",pr:31.5,num:18,pts:12.9,own:30.5},
{id:175,n:"ENDRICK",t:"BRA",p:"FW",c:"Olympique Lyonnais",pr:46.5,num:19,pts:17.7,own:27.7},
{id:176,n:"L. PAQUETA",t:"BRA",p:"MF",c:"CR Flamengo",pr:28.0,num:20,pts:9.8,own:26.1},
{id:177,n:"L. HENRIQUE",t:"BRA",p:"FW",c:"Zenit St. Petersbu",pr:32.5,num:21,pts:12.7,own:22.6},
{id:178,n:"MARTINELLI",t:"BRA",p:"FW",c:"Arsenal",pr:91.5,num:22,pts:35.4,own:59.7},
{id:179,n:"EDERSON",t:"BRA",p:"GK",c:"Fenerbahçe SK",pr:27.0,num:23,pts:10.4,own:22.4},
{id:180,n:"IBAÑEZ",t:"BRA",p:"DF",c:"Al Ahli",pr:40.5,num:24,pts:13.2,own:23.2},
{id:181,n:"THIAGO",t:"BRA",p:"FW",c:"Brentford",pr:58.5,num:25,pts:25.5,own:38.5},
{id:182,n:"RAYAN",t:"BRA",p:"FW",c:"ABournemouth",pr:45.0,num:26,pts:16.1,own:32.0},
{id:183,n:"VOZINHA",t:"CPV",p:"GK",c:"GD Chaves",pr:17.5,num:1,pts:7.3,own:20.9},
{id:184,n:"STOPIRA",t:"CPV",p:"DF",c:"SCU Torreense",pr:21.0,num:2,pts:7.8,own:11.1},
{id:185,n:"BORGES",t:"CPV",p:"DF",c:"Al Bataeh Club",pr:27.0,num:3,pts:11.6,own:18.7},
{id:186,n:"LOPES",t:"CPV",p:"DF",c:"Shamrock Rovers",pr:21.5,num:4,pts:8.4,own:21.8},
{id:187,n:"LOGAN",t:"CPV",p:"DF",c:"Villarreal",pr:47.0,num:5,pts:16.2,own:33.2},
{id:188,n:"KEVIN L.",t:"CPV",p:"MF",c:"Krasnodar",pr:33.5,num:6,pts:13.2,own:16.9},
{id:189,n:"JOVANE",t:"CPV",p:"MF",c:"Estrela Da Amadora",pr:33.5,num:7,pts:13.2,own:17.2},
{id:190,n:"JOÃO PAULO",t:"CPV",p:"MF",c:"FCSB",pr:34.0,num:8,pts:14.1,own:24.8},
{id:191,n:"BENCHIMOL",t:"CPV",p:"FW",c:"Akron Tolyatti",pr:34.5,num:9,pts:11.3,own:18.1},
{id:192,n:"MONTEIRO",t:"CPV",p:"MF",c:"PEC Zwolle",pr:29.0,num:10,pts:10.5,own:22.3},
{id:193,n:"RODRIGUES",t:"CPV",p:"MF",c:"Apollon Limassol",pr:25.0,num:11,pts:10.2,own:15.7},
{id:194,n:"MARCIO",t:"CPV",p:"GK",c:"PMontana",pr:18.0,num:12,pts:7.1,own:15.9},
{id:195,n:"LOPES CABRAL",t:"CPV",p:"DF",c:"SL Benfica",pr:39.0,num:13,pts:12.7,own:27.3},
{id:196,n:"D. DUARTE",t:"CPV",p:"MF",c:"PLudogorets Razgra",pr:29.0,num:14,pts:9.5,own:27.8},
{id:197,n:"DUARTE",t:"CPV",p:"MF",c:"Puskás Akadémia",pr:31.0,num:15,pts:11.9,own:17.8},
{id:198,n:"Y. SEMEDO",t:"CPV",p:"MF",c:"SC Farense",pr:26.0,num:16,pts:8.6,own:26.8},
{id:199,n:"SEMEDO",t:"CPV",p:"MF",c:"AC Omonia",pr:27.5,num:17,pts:10.5,own:21.2},
{id:200,n:"ARCANJO",t:"CPV",p:"MF",c:"Vitória SC",pr:29.5,num:18,pts:10.2,own:20.9},
{id:201,n:"LIVRAMENTO",t:"CPV",p:"FW",c:"Casa Pia AC",pr:32.0,num:19,pts:12.0,own:16.5},
{id:202,n:"RYAN",t:"CPV",p:"FW",c:"Iğdır FK",pr:24.0,num:20,pts:9.2,own:22.4},
{id:203,n:"DA COSTA",t:"CPV",p:"MF",c:"Başakşehir FK",pr:22.5,num:21,pts:9.5,own:17.8},
{id:204,n:"MOREIRA",t:"CPV",p:"DF",c:"Columbus Crew",pr:22.0,num:22,pts:7.5,own:24.8},
{id:205,n:"DOS SANTOS",t:"CPV",p:"GK",c:"San Diego",pr:18.5,num:23,pts:7.9,own:10.5},
{id:206,n:"WAGNER P.",t:"CPV",p:"DF",c:"Trabzonspor",pr:23.0,num:24,pts:8.7,own:20.4},
{id:207,n:"KELVIN",t:"CPV",p:"DF",c:"SJK",pr:25.0,num:25,pts:9.3,own:24.4},
{id:208,n:"HÉLIO",t:"CPV",p:"MF",c:"Maccabi Tel-Aviv",pr:27.5,num:26,pts:9.0,own:17.2},
{id:209,n:"ST. CLAIR",t:"CAN",p:"GK",c:"Inter Miami",pr:23.5,num:1,pts:9.5,own:15.9},
{id:210,n:"JOHNSTON",t:"CAN",p:"DF",c:"Celtic",pr:48.0,num:2,pts:17.9,own:29.9},
{id:211,n:"JONES",t:"CAN",p:"DF",c:"Middlesbrough",pr:30.0,num:3,pts:12.8,own:28.7},
{id:212,n:"DE FOUGEROLLES",t:"CAN",p:"DF",c:"FCV Dender EH",pr:23.0,num:4,pts:7.6,own:22.8},
{id:213,n:"WATERMAN",t:"CAN",p:"DF",c:"Chicago Fire",pr:26.0,num:5,pts:10.2,own:26.9},
{id:214,n:"CHOINIÈRE",t:"CAN",p:"MF",c:"LAFC",pr:34.0,num:6,pts:14.0,own:17.4},
{id:215,n:"EUSTÀQUIO",t:"CAN",p:"MF",c:"LAFC",pr:32.0,num:7,pts:11.2,own:27.1},
{id:216,n:"KONÉ",t:"CAN",p:"MF",c:"US Sassuolo",pr:29.5,num:8,pts:10.4,own:15.8},
{id:217,n:"LARIN",t:"CAN",p:"FW",c:"Southampton",pr:32.5,num:9,pts:11.9,own:17.4},
{id:218,n:"J. DAVID",t:"CAN",p:"FW",c:"Juventus",pr:96.0,num:10,pts:41.0,own:60.3},
{id:219,n:"MILLAR",t:"CAN",p:"MF",c:"Hull City",pr:34.0,num:11,pts:13.9,own:26.2},
{id:220,n:"OLUWASEYI",t:"CAN",p:"FW",c:"Villarreal",pr:61.0,num:12,pts:26.1,own:37.1},
{id:221,n:"CORNELIUS",t:"CAN",p:"DF",c:"Rangers",pr:42.5,num:13,pts:13.8,own:28.1},
{id:222,n:"SHAFFELBURG",t:"CAN",p:"MF",c:"LAFC",pr:31.5,num:14,pts:12.8,own:20.9},
{id:223,n:"BOMBITO",t:"CAN",p:"DF",c:"OGC Nice",pr:43.0,num:15,pts:14.2,own:27.9},
{id:224,n:"CRÉPEAU",t:"CAN",p:"GK",c:"Orlando City SC",pr:15.0,num:16,pts:5.0,own:16.6},
{id:225,n:"BUCHANAN",t:"CAN",p:"FW",c:"Villarreal",pr:60.5,num:17,pts:25.2,own:41.4},
{id:226,n:"GOODMAN",t:"CAN",p:"GK",c:"Barnsley",pr:16.5,num:18,pts:6.5,own:21.5},
{id:227,n:"DAVIES",t:"CAN",p:"DF",c:"Bayern",pr:62.5,num:19,pts:23.3,own:33.6},
{id:228,n:"AHMED",t:"CAN",p:"FW",c:"Norwich City",pr:32.0,num:20,pts:12.0,own:21.1},
{id:229,n:"OSORIO",t:"CAN",p:"MF",c:"Toronto",pr:21.0,num:21,pts:7.6,own:10.6},
{id:230,n:"LARYEA",t:"CAN",p:"DF",c:"Toronto",pr:22.5,num:22,pts:8.4,own:16.1},
{id:231,n:"SIGUR",t:"CAN",p:"DF",c:"HNK Hajduk Split",pr:23.5,num:23,pts:9.2,own:21.8},
{id:232,n:"PROMISE",t:"CAN",p:"FW",c:"Royale Union Saint",pr:33.5,num:24,pts:13.7,own:21.8},
{id:233,n:"SALIBA",t:"CAN",p:"MF",c:"RSC Anderlecht",pr:28.0,num:25,pts:11.9,own:17.0},
{id:234,n:"MARCELO",t:"CAN",p:"MF",c:"Tigres UANL",pr:25.5,num:26,pts:8.7,own:27.0},
{id:235,n:"OSPINA",t:"COL",p:"GK",c:"Atlético Nacional",pr:16.5,num:1,pts:6.0,own:21.6},
{id:236,n:"D. MUÑOZ",t:"COL",p:"DF",c:"Crystal Palace",pr:41.0,num:2,pts:13.3,own:32.4},
{id:237,n:"J. LUCUMI",t:"COL",p:"DF",c:"Bologna",pr:47.5,num:3,pts:17.1,own:32.3},
{id:238,n:"ARIAS",t:"COL",p:"DF",c:"CA Independiente",pr:21.5,num:4,pts:8.6,own:10.9},
{id:239,n:"K. CASTAÑO",t:"COL",p:"MF",c:"CA River Plate",pr:32.5,num:5,pts:11.7,own:19.6},
{id:240,n:"RICHARD RIOS",t:"COL",p:"MF",c:"SL Benfica",pr:60.5,num:6,pts:20.9,own:33.8},
{id:241,n:"LUIS DIAZ",t:"COL",p:"FW",c:"Bayern",pr:108.0,num:7,pts:46.6,own:59.7},
{id:242,n:"CARRASCAL",t:"COL",p:"MF",c:"CR Flamengo",pr:34.5,num:8,pts:14.7,own:17.7},
{id:243,n:"CORDOBA",t:"COL",p:"FW",c:"Krasnodar",pr:28.0,num:9,pts:11.6,own:20.4},
{id:244,n:"JAMES",t:"COL",p:"MF",c:"Minnesota United",pr:27.5,num:10,pts:10.7,own:15.3},
{id:245,n:"J. ARIAS",t:"COL",p:"MF",c:"SE Palmeiras",pr:31.0,num:11,pts:10.0,own:15.7},
{id:246,n:"C. VARGAS",t:"COL",p:"GK",c:"Atlas",pr:12.5,num:12,pts:4.4,own:17.6},
{id:247,n:"Y. MINA",t:"COL",p:"DF",c:"Cagliari",pr:23.0,num:13,pts:8.1,own:23.1},
{id:248,n:"PUERTA",t:"COL",p:"DF",c:"Racing Santander",pr:24.0,num:14,pts:8.8,own:26.9},
{id:249,n:"PORTILLA",t:"COL",p:"MF",c:"Athletico Paranaen",pr:29.0,num:15,pts:9.5,own:29.0},
{id:250,n:"J. LERMA",t:"COL",p:"MF",c:"Crystal Palace",pr:46.5,num:16,pts:17.3,own:36.0},
{id:251,n:"J. MOJICA",t:"COL",p:"DF",c:"RCD Mallorca",pr:19.0,num:17,pts:6.4,own:14.2},
{id:252,n:"W. DITTA",t:"COL",p:"DF",c:"Cruz Azul",pr:25.0,num:18,pts:8.1,own:24.7},
{id:253,n:"C. HERNANDEZ",t:"COL",p:"FW",c:"Real Betis",pr:57.0,num:19,pts:23.3,own:38.2},
{id:254,n:"QUINTERO",t:"COL",p:"MF",c:"CA River Plate",pr:22.5,num:20,pts:9.2,own:21.7},
{id:255,n:"CAMPAZ",t:"COL",p:"FW",c:"CA Rosario Central",pr:34.5,num:21,pts:15.0,own:20.4},
{id:256,n:"MACHADO",t:"COL",p:"DF",c:"Nantes",pr:24.0,num:22,pts:10.4,own:20.2},
{id:257,n:"SANCHEZ",t:"COL",p:"DF",c:"Galatasaray SK",pr:44.5,num:23,pts:18.7,own:34.8},
{id:258,n:"MONTERO",t:"COL",p:"GK",c:"CA Vélez Sarsfield",pr:15.5,num:24,pts:5.6,own:21.2},
{id:259,n:"SUAREZ",t:"COL",p:"FW",c:"Sporting CP",pr:57.0,num:25,pts:23.7,own:43.0},
{id:260,n:"A. GOMEZ",t:"COL",p:"FW",c:"CR Vasco Da Gama",pr:30.5,num:26,pts:12.1,own:29.2},
{id:261,n:"MPASI",t:"COD",p:"GK",c:"Le Havre AC",pr:21.0,num:1,pts:8.4,own:18.9},
{id:262,n:"WAN BISSAKA",t:"COD",p:"DF",c:"West Ham",pr:47.0,num:2,pts:16.3,own:23.9},
{id:263,n:"KAPUADI",t:"COD",p:"DF",c:"Widzew Łódź",pr:28.5,num:3,pts:11.0,own:17.6},
{id:264,n:"TUANZEBE",t:"COD",p:"DF",c:"Burnley",pr:29.5,num:4,pts:12.3,own:22.2},
{id:265,n:"BATUBINSIKA",t:"COD",p:"DF",c:"AEL",pr:27.0,num:5,pts:11.5,own:20.7},
{id:266,n:"MUKAU",t:"COD",p:"MF",c:"Lille OSC",pr:54.5,num:6,pts:23.6,own:31.4},
{id:267,n:"MBUKU",t:"COD",p:"MF",c:"Montpellier HSC",pr:34.5,num:7,pts:14.8,own:30.0},
{id:268,n:"MOUTOUSSAMY",t:"COD",p:"MF",c:"Atromitos",pr:33.0,num:8,pts:12.8,own:22.3},
{id:269,n:"CIPENGA",t:"COD",p:"FW",c:"CD Castellón",pr:34.5,num:9,pts:11.2,own:30.1},
{id:270,n:"BONGONDA",t:"COD",p:"MF",c:"Spartak Moscow",pr:28.5,num:10,pts:9.9,own:16.2},
{id:271,n:"KAKUTA",t:"COD",p:"FW",c:"AEL",pr:27.0,num:11,pts:10.2,own:14.0},
{id:272,n:"J. KAYEMBE",t:"COD",p:"DF",c:"KRC Genk",pr:24.0,num:12,pts:9.1,own:24.4},
{id:273,n:"ELIA",t:"COD",p:"FW",c:"Alanyaspor",pr:33.0,num:13,pts:11.7,own:25.1},
{id:274,n:"SADIKI",t:"COD",p:"MF",c:"Sunderland",pr:29.5,num:14,pts:12.4,own:28.1},
{id:275,n:"TSHIBOLA",t:"COD",p:"MF",c:"Kilmarnock",pr:27.5,num:15,pts:10.1,own:20.0},
{id:276,n:"FAYULU",t:"COD",p:"GK",c:"Noah",pr:18.0,num:16,pts:7.6,own:9.9},
{id:277,n:"BAKAMBU",t:"COD",p:"FW",c:"Real Betis",pr:41.0,num:17,pts:13.8,own:24.6},
{id:278,n:"PICKEL",t:"COD",p:"MF",c:"RCD Espanyol",pr:29.0,num:18,pts:9.5,own:15.3},
{id:279,n:"MAYELE",t:"COD",p:"FW",c:"Pyramids",pr:30.5,num:19,pts:12.7,own:16.6},
{id:280,n:"WISSA",t:"COD",p:"FW",c:"Newcastle",pr:81.5,num:20,pts:31.7,own:49.3},
{id:281,n:"EPOLO",t:"COD",p:"GK",c:"Standard Liège",pr:17.0,num:21,pts:7.2,own:12.8},
{id:282,n:"MBEMBA",t:"COD",p:"DF",c:"Lille OSC",pr:38.5,num:22,pts:14.3,own:27.0},
{id:283,n:"BANZA",t:"COD",p:"FW",c:"Al Jazira",pr:30.5,num:23,pts:10.1,own:29.8},
{id:284,n:"G. KALULU",t:"COD",p:"DF",c:"Aris Limassol",pr:24.5,num:24,pts:8.7,own:21.4},
{id:285,n:"KAYEMBE",t:"COD",p:"MF",c:"Watford",pr:27.5,num:25,pts:9.1,own:15.1},
{id:286,n:"MASUAKU",t:"COD",p:"DF",c:"RC Lens",pr:36.5,num:26,pts:12.2,own:23.2},
{id:287,n:"Y. FOFANA",t:"CIV",p:"GK",c:"Çaykur Rizespor",pr:23.0,num:1,pts:8.9,own:17.6},
{id:288,n:"O. DIOMANDE",t:"CIV",p:"DF",c:"Sporting CP",pr:43.5,num:2,pts:15.5,own:26.0},
{id:289,n:"G. KONAN",t:"CIV",p:"DF",c:"Gil Vicente",pr:25.5,num:3,pts:9.7,own:25.1},
{id:290,n:"SERI",t:"CIV",p:"MF",c:"NK Maribor",pr:26.0,num:4,pts:11.3,own:22.4},
{id:291,n:"SINGO",t:"CIV",p:"DF",c:"Galatasaray SK",pr:49.0,num:5,pts:19.2,own:26.8},
{id:292,n:"FOFANA",t:"CIV",p:"MF",c:"Porto",pr:48.0,num:6,pts:16.0,own:38.0},
{id:293,n:"KOSSOUNOU",t:"CIV",p:"DF",c:"Atalanta Bergamo",pr:47.5,num:7,pts:17.1,own:32.5},
{id:294,n:"KESSIE",t:"CIV",p:"MF",c:"Al Ahli",pr:62.0,num:8,pts:22.9,own:34.1},
{id:295,n:"BONNY",t:"CIV",p:"FW",c:"Inter",pr:82.0,num:9,pts:29.2,own:46.1},
{id:296,n:"ADINGRA",t:"CIV",p:"FW",c:"AS Monaco",pr:64.5,num:10,pts:26.9,own:33.3},
{id:297,n:"YAN DIOMANDE",t:"CIV",p:"FW",c:"RB Leipzig",pr:53.0,num:11,pts:20.9,own:29.8},
{id:298,n:"WAHI",t:"CIV",p:"FW",c:"OGC Nice",pr:51.0,num:12,pts:17.4,own:29.8},
{id:299,n:"OPERI",t:"CIV",p:"DF",c:"Başakşehir FK",pr:28.0,num:13,pts:12.0,own:24.5},
{id:300,n:"DIAKITE",t:"CIV",p:"FW",c:"Cercle Brugge",pr:31.5,num:14,pts:12.3,own:24.1},
{id:301,n:"AMAD",t:"CIV",p:"FW",c:"Man Utd",pr:76.0,num:15,pts:26.3,own:47.9},
{id:302,n:"KONE",t:"CIV",p:"GK",c:"Sporting Charleroi",pr:17.0,num:16,pts:6.2,own:22.4},
{id:303,n:"G. DOUE",t:"CIV",p:"DF",c:"RC Strasbourg",pr:39.5,num:17,pts:13.1,own:20.2},
{id:304,n:"SANGARE",t:"CIV",p:"MF",c:"Nottingham Forest",pr:50.5,num:18,pts:17.6,own:34.5},
{id:305,n:"PEPE",t:"CIV",p:"FW",c:"Villarreal",pr:48.5,num:19,pts:17.3,own:33.0},
{id:306,n:"AGBADOU",t:"CIV",p:"DF",c:"Beşiktaş JK",pr:44.0,num:20,pts:17.7,own:23.3},
{id:307,n:"NDICKA",t:"CIV",p:"DF",c:"AS Roma",pr:43.0,num:21,pts:16.6,own:28.4},
{id:308,n:"GUESSAND",t:"CIV",p:"FW",c:"Crystal Palace",pr:56.0,num:22,pts:22.3,own:38.1},
{id:309,n:"LAFONT",t:"CIV",p:"GK",c:"Panathinaikos",pr:18.5,num:23,pts:7.9,own:13.0},
{id:310,n:"TOURE",t:"CIV",p:"FW",c:"TSG Hoffenheim",pr:43.5,num:24,pts:14.2,own:27.1},
{id:311,n:"GUIAGON",t:"CIV",p:"MF",c:"Sporting Charleroi",pr:29.5,num:25,pts:11.6,own:18.7},
{id:312,n:"INAO",t:"CIV",p:"MF",c:"Trabzonspor",pr:24.5,num:26,pts:9.5,own:20.5},
{id:313,n:"LIVAKOVIĆ",t:"CRO",p:"GK",c:"GNK Dinamo Zagreb",pr:19.5,num:1,pts:6.5,own:12.7},
{id:314,n:"STANIŠIĆ",t:"CRO",p:"DF",c:"Bayern",pr:71.0,num:2,pts:26.6,own:47.4},
{id:315,n:"PONGRAČIĆ",t:"CRO",p:"DF",c:"AFiorentina",pr:49.5,num:3,pts:19.8,own:29.9},
{id:316,n:"GVARDIOL",t:"CRO",p:"DF",c:"Man City",pr:77.5,num:4,pts:27.2,own:49.8},
{id:317,n:"ĆALETA-CAR",t:"CRO",p:"DF",c:"Real Sociedad",pr:47.5,num:5,pts:17.3,own:38.0},
{id:318,n:"ŠUTALO",t:"CRO",p:"DF",c:"AAjax",pr:47.0,num:6,pts:16.6,own:31.6},
{id:319,n:"MORO",t:"CRO",p:"MF",c:"Bologna",pr:56.5,num:7,pts:21.8,own:38.0},
{id:320,n:"KOVAČIĆ",t:"CRO",p:"MF",c:"Man City",pr:80.0,num:8,pts:27.6,own:50.8},
{id:321,n:"KRAMARIĆ",t:"CRO",p:"FW",c:"TSG Hoffenheim",pr:47.5,num:9,pts:19.6,own:35.8},
{id:322,n:"MODRIĆ",t:"CRO",p:"MF",c:"AC Milan",pr:60.0,num:10,pts:21.7,own:36.5},
{id:323,n:"BUDIMIR",t:"CRO",p:"FW",c:"CA Osasuna",pr:28.0,num:11,pts:11.4,own:28.9},
{id:324,n:"PANDUR",t:"CRO",p:"GK",c:"Hull City",pr:18.5,num:12,pts:8.0,own:15.7},
{id:325,n:"VLAŠIĆ",t:"CRO",p:"MF",c:"Torino",pr:52.5,num:13,pts:20.2,own:37.5},
{id:326,n:"PERIŠIĆ",t:"CRO",p:"FW",c:"PSV Eindhoven",pr:43.5,num:14,pts:17.3,own:24.6},
{id:327,n:"PAŠALIĆ",t:"CRO",p:"MF",c:"Atalanta Bergamo",pr:48.5,num:15,pts:19.6,own:27.0},
{id:328,n:"BATURINA",t:"CRO",p:"MF",c:"Como",pr:50.0,num:16,pts:20.7,own:39.6},
{id:329,n:"P. SUČIĆ",t:"CRO",p:"MF",c:"Inter",pr:70.0,num:17,pts:26.1,own:41.1},
{id:330,n:"JAKIĆ",t:"CRO",p:"DF",c:"Augsburg",pr:48.0,num:18,pts:20.9,own:27.1},
{id:331,n:"FRUK",t:"CRO",p:"MF",c:"HNK Rijeka",pr:29.0,num:19,pts:10.8,own:22.1},
{id:332,n:"MATANOVIĆ",t:"CRO",p:"FW",c:"SC Freiburg",pr:52.0,num:20,pts:21.2,own:26.2},
{id:333,n:"SUČIĆ",t:"CRO",p:"MF",c:"Real Sociedad",pr:44.0,num:21,pts:15.2,own:25.8},
{id:334,n:"VUŠKOVIĆ",t:"CRO",p:"DF",c:"Hamburger SV",pr:20.5,num:22,pts:7.1,own:13.9},
{id:335,n:"KOTARSKI",t:"CRO",p:"GK",c:"København",pr:18.5,num:23,pts:8.0,own:14.4},
{id:336,n:"M. PAŠALIĆ",t:"CRO",p:"FW",c:"Orlando City SC",pr:32.0,num:24,pts:11.8,own:19.4},
{id:337,n:"ERLIĆ",t:"CRO",p:"DF",c:"Midtjylland",pr:24.5,num:25,pts:8.5,own:22.8},
{id:338,n:"MUSA",t:"CRO",p:"FW",c:"Dallas",pr:32.5,num:26,pts:12.4,own:28.9},
{id:339,n:"ROOM",t:"CUW",p:"GK",c:"Miami",pr:16.0,num:1,pts:5.2,own:9.2},
{id:340,n:"SAMBO",t:"CUW",p:"DF",c:"Sparta Rotterdam",pr:27.5,num:2,pts:9.7,own:25.4},
{id:341,n:"GAARI",t:"CUW",p:"DF",c:"Abha Club",pr:25.0,num:3,pts:8.8,own:12.6},
{id:342,n:"VAN EIJMA",t:"CUW",p:"DF",c:"RKC Waalwijk",pr:28.0,num:4,pts:10.1,own:14.7},
{id:343,n:"FLORANUS",t:"CUW",p:"DF",c:"PEC Zwolle",pr:27.5,num:5,pts:9.6,own:23.0},
{id:344,n:"ROEMERATOE",t:"CUW",p:"MF",c:"RKC Waalwijk",pr:33.5,num:6,pts:13.5,own:30.8},
{id:345,n:"J. BACUNA",t:"CUW",p:"MF",c:"Volendam",pr:34.5,num:7,pts:14.5,own:20.5},
{id:346,n:"COMENENCIA",t:"CUW",p:"MF",c:"Zürich",pr:29.0,num:8,pts:9.6,own:15.6},
{id:347,n:"LOCADIA",t:"CUW",p:"FW",c:"Miami",pr:34.0,num:9,pts:14.0,own:25.3},
{id:348,n:"L. BACUNA",t:"CUW",p:"MF",c:"Iğdır FK",pr:23.0,num:10,pts:7.4,own:19.2},
{id:349,n:"ANTONISSE",t:"CUW",p:"FW",c:"AE Kifisia",pr:34.5,num:11,pts:11.3,own:23.6},
{id:350,n:"HANSEN",t:"CUW",p:"FW",c:"Middlesbrough",pr:34.5,num:12,pts:13.6,own:32.0},
{id:351,n:"NOSLIN",t:"CUW",p:"FW",c:"SC Telstar",pr:33.0,num:13,pts:14.2,own:26.5},
{id:352,n:"GORRE",t:"CUW",p:"FW",c:"Maccabi Haifa",pr:29.5,num:14,pts:10.3,own:26.0},
{id:353,n:"MARTHA",t:"CUW",p:"MF",c:"Rotherham United",pr:27.0,num:15,pts:9.0,own:27.1},
{id:354,n:"MARGARITHA",t:"CUW",p:"FW",c:"SK Beveren",pr:34.5,num:16,pts:13.3,own:22.1},
{id:355,n:"KUWAS",t:"CUW",p:"FW",c:"Volendam",pr:25.5,num:17,pts:9.7,own:24.2},
{id:356,n:"OBISPO",t:"CUW",p:"DF",c:"PSV Eindhoven",pr:45.0,num:18,pts:16.7,own:22.5},
{id:357,n:"KASTANEER",t:"CUW",p:"FW",c:"Terengganu",pr:34.5,num:19,pts:15.0,own:28.2},
{id:358,n:"BRENET",t:"CUW",p:"DF",c:"Kayserispor",pr:23.0,num:20,pts:9.2,own:20.6},
{id:359,n:"CHONG",t:"CUW",p:"MF",c:"Sheffield United",pr:30.0,num:21,pts:12.3,own:20.6},
{id:360,n:"FELIDA",t:"CUW",p:"MF",c:"Den Bosch",pr:30.5,num:22,pts:13.0,own:15.5},
{id:361,n:"BAZOER",t:"CUW",p:"DF",c:"Konyaspor",pr:24.5,num:23,pts:8.8,own:24.4},
{id:362,n:"FONVILLE",t:"CUW",p:"DF",c:"NEC Nijmegen",pr:24.0,num:24,pts:9.8,own:12.7},
{id:363,n:"BODAK",t:"CUW",p:"GK",c:"SC Telstar",pr:16.5,num:25,pts:5.3,own:20.8},
{id:364,n:"DOORNBUSCH",t:"CUW",p:"GK",c:"VVV Venlo",pr:18.0,num:26,pts:7.3,own:12.9},
{id:365,n:"KOVÁŘ",t:"CZE",p:"GK",c:"PSV Eindhoven",pr:39.5,num:1,pts:15.5,own:21.9},
{id:366,n:"ZIMA",t:"CZE",p:"DF",c:"SK Slavia Praha",pr:28.0,num:2,pts:10.2,own:29.0},
{id:367,n:"HOLEŠ",t:"CZE",p:"DF",c:"SK Slavia Praha",pr:20.0,num:3,pts:6.5,own:20.2},
{id:368,n:"HRANÁČ",t:"CZE",p:"DF",c:"TSG Hoffenheim",pr:50.5,num:4,pts:21.0,own:39.7},
{id:369,n:"COUFAL",t:"CZE",p:"DF",c:"TSG Hoffenheim",pr:34.0,num:5,pts:11.2,own:18.2},
{id:370,n:"CHALOUPEK",t:"CZE",p:"DF",c:"SK Slavia Praha",pr:27.5,num:6,pts:11.5,own:26.1},
{id:371,n:"KREJČÍ",t:"CZE",p:"DF",c:"Wolverhampton Wand",pr:27.5,num:7,pts:9.7,own:21.9},
{id:372,n:"DARIDA",t:"CZE",p:"MF",c:"Hradec Králové",pr:23.5,num:8,pts:8.0,own:21.1},
{id:373,n:"HLOŽEK",t:"CZE",p:"FW",c:"TSG Hoffenheim",pr:64.5,num:9,pts:28.2,own:43.3},
{id:374,n:"SCHICK",t:"CZE",p:"FW",c:"Leverkusen",pr:89.0,num:10,pts:35.6,own:44.6},
{id:375,n:"KUCHTA",t:"CZE",p:"FW",c:"AC Sparta Praha",pr:38.5,num:11,pts:16.7,own:23.9},
{id:376,n:"ČERV",t:"CZE",p:"MF",c:"Viktoria Plzeň",pr:29.0,num:12,pts:9.6,own:25.7},
{id:377,n:"CHYTIL",t:"CZE",p:"FW",c:"SK Slavia Praha",pr:35.5,num:13,pts:14.8,own:18.1},
{id:378,n:"JURÁSEK",t:"CZE",p:"DF",c:"SK Slavia Praha",pr:27.0,num:14,pts:10.4,own:26.4},
{id:379,n:"ŠULC",t:"CZE",p:"FW",c:"Olympique Lyonnais",pr:59.0,num:15,pts:23.3,own:32.9},
{id:380,n:"STANĚK",t:"CZE",p:"GK",c:"SK Slavia Praha",pr:16.0,num:16,pts:6.5,own:16.4},
{id:381,n:"PROVOD",t:"CZE",p:"MF",c:"SK Slavia Praha",pr:29.0,num:17,pts:9.4,own:27.3},
{id:382,n:"SADÍLEK",t:"CZE",p:"MF",c:"SK Slavia Praha",pr:30.0,num:18,pts:10.8,own:26.7},
{id:383,n:"CHORÝ",t:"CZE",p:"FW",c:"SK Slavia Praha",pr:30.0,num:19,pts:12.2,own:24.4},
{id:384,n:"ZELENÝ",t:"CZE",p:"DF",c:"AC Sparta Praha",pr:17.5,num:20,pts:5.7,own:14.0},
{id:385,n:"DOUDĚRA",t:"CZE",p:"DF",c:"SK Slavia Praha",pr:26.5,num:21,pts:11.2,own:27.7},
{id:386,n:"SOUČEK",t:"CZE",p:"MF",c:"West Ham",pr:45.5,num:22,pts:15.9,own:29.4},
{id:387,n:"HORNÍČEK",t:"CZE",p:"GK",c:"SC Braga",pr:16.0,num:23,pts:6.2,own:10.4},
{id:388,n:"SOJKA",t:"CZE",p:"MF",c:"Viktoria Plzeň",pr:28.0,num:24,pts:11.8,own:15.2},
{id:389,n:"SOCHŮREK",t:"CZE",p:"MF",c:"AC Sparta Praha",pr:22.5,num:25,pts:9.3,own:25.8},
{id:390,n:"VIŠINSKÝ",t:"CZE",p:"FW",c:"Viktoria Plzeň",pr:30.0,num:26,pts:11.8,own:28.4},
{id:391,n:"GALINDEZ",t:"ECU",p:"GK",c:"CA Huracán",pr:16.5,num:1,pts:6.0,own:19.0},
{id:392,n:"TORRES",t:"ECU",p:"DF",c:"SC Internacional",pr:30.0,num:2,pts:13.0,own:18.1},
{id:393,n:"HINCAPIE",t:"ECU",p:"DF",c:"Arsenal",pr:71.0,num:3,pts:26.5,own:37.0},
{id:394,n:"ORDÓÑEZ",t:"ECU",p:"DF",c:"Club Brugge",pr:25.0,num:4,pts:8.5,own:20.1},
{id:395,n:"ALCIVAR",t:"ECU",p:"MF",c:"Independiente Del ",pr:31.5,num:5,pts:10.5,own:21.9},
{id:396,n:"PACHO",t:"ECU",p:"DF",c:"PSG",pr:84.5,num:6,pts:36.7,own:53.3},
{id:397,n:"ESTUPIÑÁN",t:"ECU",p:"DF",c:"AC Milan",pr:83.5,num:7,pts:35.5,own:46.4},
{id:398,n:"A. VALENCIA",t:"ECU",p:"MF",c:"Royal Antwerp",pr:31.0,num:8,pts:12.5,own:26.5},
{id:399,n:"YEBOAH ZAMORA",t:"ECU",p:"FW",c:"Venezia",pr:35.5,num:9,pts:12.3,own:26.0},
{id:400,n:"PAEZ",t:"ECU",p:"MF",c:"CA River Plate",pr:26.5,num:10,pts:8.9,own:27.6},
{id:401,n:"RODRIGUEZ",t:"ECU",p:"FW",c:"Royale Union Saint",pr:36.5,num:11,pts:13.9,own:19.0},
{id:402,n:"RAMÍREZ",t:"ECU",p:"GK",c:"AE Kifisia",pr:17.5,num:12,pts:6.5,own:18.7},
{id:403,n:"E. VALENCIA",t:"ECU",p:"FW",c:"Pachuca",pr:26.0,num:13,pts:10.6,own:14.0},
{id:404,n:"MINDA",t:"ECU",p:"MF",c:"Atlético Mineiro",pr:27.5,num:14,pts:9.9,own:15.1},
{id:405,n:"VITE",t:"ECU",p:"MF",c:"Pumas UNAM",pr:31.5,num:15,pts:12.8,own:26.6},
{id:406,n:"J. CAICEDO",t:"ECU",p:"FW",c:"CA Huracán",pr:34.5,num:16,pts:13.3,own:18.1},
{id:407,n:"PRECIADO",t:"ECU",p:"DF",c:"Atlético Mineiro",pr:28.0,num:17,pts:12.1,own:20.0},
{id:408,n:"CASTILLO",t:"ECU",p:"MF",c:"Midtjylland",pr:26.5,num:18,pts:8.7,own:17.2},
{id:409,n:"PLATA",t:"ECU",p:"FW",c:"CR Flamengo",pr:33.0,num:19,pts:13.1,own:24.9},
{id:410,n:"ANGULO",t:"ECU",p:"FW",c:"Sunderland",pr:28.0,num:20,pts:9.2,own:17.8},
{id:411,n:"FRANCO",t:"ECU",p:"MF",c:"Atlético Mineiro",pr:27.5,num:21,pts:9.2,own:26.1},
{id:412,n:"VALLE",t:"ECU",p:"GK",c:"LDU Quito",pr:16.0,num:22,pts:6.5,own:15.4},
{id:413,n:"M. CAICEDO",t:"ECU",p:"MF",c:"Chelsea",pr:69.0,num:23,pts:22.7,own:45.2},
{id:414,n:"AREVALO",t:"ECU",p:"FW",c:"VfB Stuttgart",pr:50.0,num:24,pts:18.4,own:38.2},
{id:415,n:"POROZO",t:"ECU",p:"DF",c:"Club Tijuana",pr:24.5,num:25,pts:8.6,own:26.8},
{id:416,n:"MEDINA",t:"ECU",p:"DF",c:"KRC Genk",pr:23.5,num:26,pts:9.1,own:26.4},
{id:417,n:"M. ELSHENAWY",t:"EGY",p:"GK",c:"Al Ahly",pr:16.5,num:1,pts:5.8,own:11.8},
{id:418,n:"YASSER",t:"EGY",p:"DF",c:"Al Ahly",pr:22.0,num:2,pts:9.2,own:13.2},
{id:419,n:"M. HANY",t:"EGY",p:"DF",c:"Al Ahly",pr:25.5,num:3,pts:9.7,own:19.2},
{id:420,n:"HOSSAM",t:"EGY",p:"DF",c:"Zamalek SC",pr:29.5,num:4,pts:11.9,own:16.2},
{id:421,n:"R. RABIAA",t:"EGY",p:"DF",c:"Al Ain",pr:22.0,num:5,pts:9.3,own:19.3},
{id:422,n:"M. ABDELMONIEM",t:"EGY",p:"DF",c:"OGC Nice",pr:51.5,num:6,pts:22.3,own:32.7},
{id:423,n:"M. TREZEGUET",t:"EGY",p:"FW",c:"Al Ahly",pr:35.0,num:7,pts:15.2,own:32.0},
{id:424,n:"E. ASHOUR",t:"EGY",p:"MF",c:"Al Ahly",pr:32.0,num:8,pts:11.2,own:22.0},
{id:425,n:"ABDELKARIM",t:"EGY",p:"FW",c:"Barcelona",pr:73.5,num:9,pts:25.0,own:38.9},
{id:426,n:"M. SALAH",t:"EGY",p:"FW",c:"Liverpool",pr:82.0,num:10,pts:30.5,own:41.1},
{id:427,n:"ZICO",t:"EGY",p:"MF",c:"Pyramids",pr:31.5,num:11,pts:10.5,own:25.4},
{id:428,n:"H. HASSAN",t:"EGY",p:"FW",c:"Real Oviedo",pr:34.5,num:12,pts:13.3,own:30.2},
{id:429,n:"A. FATOUH",t:"EGY",p:"DF",c:"Zamalek SC",pr:26.5,num:13,pts:10.0,own:15.4},
{id:430,n:"H. FATHY",t:"EGY",p:"MF",c:"Al Wakrah SC",pr:29.0,num:14,pts:12.6,own:29.3},
{id:431,n:"K. HAFEZ",t:"EGY",p:"DF",c:"Pyramids",pr:23.5,num:15,pts:8.7,own:13.1},
{id:432,n:"M. SOLIMAN",t:"EGY",p:"GK",c:"Zamalek SC",pr:12.5,num:16,pts:4.2,own:20.2},
{id:433,n:"M. LASHIN",t:"EGY",p:"MF",c:"Pyramids",pr:26.0,num:17,pts:8.4,own:22.9},
{id:434,n:"DONGA",t:"EGY",p:"MF",c:"Al Najmah SC",pr:28.0,num:18,pts:11.1,own:15.3},
{id:435,n:"M. ATTIA",t:"EGY",p:"MF",c:"Al Ahly",pr:30.5,num:19,pts:12.9,own:26.6},
{id:436,n:"I. ADEL",t:"EGY",p:"FW",c:"Nordsjælland",pr:31.0,num:20,pts:10.5,own:16.7},
{id:437,n:"M. SABER",t:"EGY",p:"MF",c:"ZED",pr:31.0,num:21,pts:13.5,own:20.5},
{id:438,n:"MARMOUSH",t:"EGY",p:"FW",c:"Man City",pr:81.5,num:22,pts:27.1,own:46.8},
{id:439,n:"SHOUBIR",t:"EGY",p:"GK",c:"Al Ahly",pr:18.5,num:23,pts:7.9,own:10.8},
{id:440,n:"T. ALAA",t:"EGY",p:"DF",c:"ZED",pr:25.5,num:24,pts:10.2,own:21.8},
{id:441,n:"ZIZO",t:"EGY",p:"FW",c:"Al Ahly",pr:27.5,num:25,pts:9.1,own:22.9},
{id:442,n:"M. ALAA",t:"EGY",p:"GK",c:"El Gouna",pr:18.0,num:26,pts:7.4,own:21.5},
{id:443,n:"PICKFORD",t:"ENG",p:"GK",c:"Everton",pr:33.5,num:1,pts:11.1,own:31.2},
{id:444,n:"KONSA",t:"ENG",p:"DF",c:"Aston Villa",pr:47.5,num:2,pts:17.1,own:32.4},
{id:445,n:"O'REILLY",t:"ENG",p:"DF",c:"Man City",pr:65.0,num:3,pts:24.0,own:41.2},
{id:446,n:"RICE",t:"ENG",p:"MF",c:"Arsenal",pr:83.0,num:4,pts:27.8,own:45.8},
{id:447,n:"STONES",t:"ENG",p:"DF",c:"Man City",pr:69.0,num:5,pts:27.0,own:47.9},
{id:448,n:"GUEHI",t:"ENG",p:"DF",c:"Man City",pr:72.5,num:6,pts:28.4,own:43.9},
{id:449,n:"SAKA",t:"ENG",p:"FW",c:"Arsenal",pr:116.0,num:7,pts:48.5,own:60.2},
{id:450,n:"ANDERSON",t:"ENG",p:"MF",c:"Nottingham Forest",pr:54.5,num:8,pts:23.6,own:31.2},
{id:451,n:"KANE",t:"ENG",p:"FW",c:"Bayern",pr:83.0,num:9,pts:32.3,own:53.7},
{id:452,n:"BELLINGHAM",t:"ENG",p:"MF",c:"Real Madrid",pr:93.5,num:10,pts:36.4,own:54.2},
{id:453,n:"RASHFORD",t:"ENG",p:"FW",c:"Barcelona",pr:89.0,num:11,pts:31.7,own:53.4},
{id:454,n:"LIVRAMENTO",t:"ENG",p:"DF",c:"Newcastle",pr:64.0,num:12,pts:27.2,own:32.2},
{id:455,n:"D. HENDERSON",t:"ENG",p:"GK",c:"Crystal Palace",pr:29.5,num:13,pts:11.2,own:19.5},
{id:456,n:"J. HENDERSON",t:"ENG",p:"MF",c:"Brentford",pr:37.0,num:14,pts:12.6,own:22.4},
{id:457,n:"BURN",t:"ENG",p:"DF",c:"Newcastle",pr:48.0,num:15,pts:16.9,own:38.2},
{id:458,n:"MAINOO",t:"ENG",p:"MF",c:"Man Utd",pr:73.5,num:16,pts:30.6,own:42.9},
{id:459,n:"ROGERS",t:"ENG",p:"MF",c:"Aston Villa",pr:48.0,num:17,pts:18.2,own:37.6},
{id:460,n:"GORDON",t:"ENG",p:"FW",c:"Newcastle",pr:91.5,num:18,pts:35.8,own:55.8},
{id:461,n:"WATKINS",t:"ENG",p:"FW",c:"Aston Villa",pr:49.5,num:19,pts:16.1,own:32.7},
{id:462,n:"MADUEKE",t:"ENG",p:"FW",c:"Arsenal",pr:84.0,num:20,pts:30.2,own:54.9},
{id:463,n:"EZE",t:"ENG",p:"MF",c:"Arsenal",pr:75.0,num:21,pts:26.4,own:39.7},
{id:464,n:"TONEY",t:"ENG",p:"FW",c:"Al Ahli",pr:55.5,num:22,pts:23.9,own:36.1},
{id:465,n:"TRAFFORD",t:"ENG",p:"GK",c:"Man City",pr:39.5,num:23,pts:14.6,own:33.8},
{id:466,n:"JAMES",t:"ENG",p:"DF",c:"Chelsea",pr:74.0,num:24,pts:31.6,own:38.9},
{id:467,n:"SPENCE",t:"ENG",p:"DF",c:"Tottenham",pr:64.5,num:25,pts:25.8,own:34.5},
{id:468,n:"QUANSAH",t:"ENG",p:"DF",c:"Leverkusen",pr:58.5,num:26,pts:22.4,own:34.8},
{id:469,n:"SAMBA",t:"FRA",p:"GK",c:"Stade Rennais",pr:36.5,num:1,pts:15.4,own:23.5},
{id:470,n:"GUSTO",t:"FRA",p:"DF",c:"Chelsea",pr:63.0,num:2,pts:21.4,own:38.3},
{id:471,n:"DIGNE",t:"FRA",p:"DF",c:"Aston Villa",pr:44.0,num:3,pts:17.0,own:34.2},
{id:472,n:"UPAMECANO",t:"FRA",p:"DF",c:"Bayern",pr:75.0,num:4,pts:32.2,own:49.8},
{id:473,n:"KOUNDE",t:"FRA",p:"DF",c:"Barcelona",pr:68.0,num:5,pts:22.9,own:40.5},
{id:474,n:"KONE",t:"FRA",p:"MF",c:"AS Roma",pr:53.5,num:6,pts:18.2,own:35.4},
{id:475,n:"DEMBELE",t:"FRA",p:"FW",c:"PSG",pr:110.0,num:7,pts:40.2,own:69.5},
{id:476,n:"TCHOUAMENI",t:"FRA",p:"MF",c:"Real Madrid",pr:90.5,num:8,pts:32.8,own:58.5},
{id:477,n:"THURAM",t:"FRA",p:"FW",c:"Inter",pr:102.0,num:9,pts:38.2,own:64.8},
{id:478,n:"MBAPPE",t:"FRA",p:"FW",c:"Real Madrid",pr:116.0,num:10,pts:48.2,own:60.0},
{id:479,n:"OLISE",t:"FRA",p:"FW",c:"Bayern",pr:116.0,num:11,pts:48.3,own:65.3},
{id:480,n:"BARCOLA",t:"FRA",p:"FW",c:"PSG",pr:78.0,num:12,pts:29.0,own:48.7},
{id:481,n:"KANTE",t:"FRA",p:"MF",c:"Fenerbahçe SK",pr:43.5,num:13,pts:16.9,own:33.2},
{id:482,n:"RABIOT",t:"FRA",p:"MF",c:"AC Milan",pr:73.0,num:14,pts:31.6,own:44.3},
{id:483,n:"KONATE",t:"FRA",p:"DF",c:"Liverpool",pr:69.5,num:15,pts:29.4,own:46.2},
{id:484,n:"MAIGNAN",t:"FRA",p:"GK",c:"AC Milan",pr:46.0,num:16,pts:19.7,own:28.0},
{id:485,n:"SALIBA",t:"FRA",p:"DF",c:"Arsenal",pr:63.5,num:17,pts:21.5,own:36.8},
{id:486,n:"ZAIRE EMERY",t:"FRA",p:"MF",c:"PSG",pr:64.5,num:18,pts:24.4,own:35.0},
{id:487,n:"T. HERNANDEZ",t:"FRA",p:"DF",c:"Al Hilal SC",pr:43.5,num:19,pts:17.2,own:23.4},
{id:488,n:"DOUE",t:"FRA",p:"FW",c:"PSG",pr:77.0,num:20,pts:31.6,own:41.6},
{id:489,n:"L. HERNANDEZ",t:"FRA",p:"DF",c:"PSG",pr:57.0,num:21,pts:21.8,own:39.1},
{id:490,n:"MATETA",t:"FRA",p:"FW",c:"Crystal Palace",pr:57.0,num:22,pts:23.4,own:35.3},
{id:491,n:"RISSER",t:"FRA",p:"GK",c:"RC Lens",pr:27.0,num:23,pts:9.8,own:13.9},
{id:492,n:"CHERKI",t:"FRA",p:"MF",c:"Man City",pr:65.5,num:24,pts:23.7,own:36.3},
{id:493,n:"AKLIOUCHE",t:"FRA",p:"MF",c:"AS Monaco",pr:47.5,num:25,pts:16.3,own:35.9},
{id:494,n:"LACROIX",t:"FRA",p:"DF",c:"Crystal Palace",pr:41.0,num:26,pts:13.8,own:25.9},
{id:495,n:"NEUER",t:"GER",p:"GK",c:"Bayern",pr:43.5,num:1,pts:15.1,own:32.4},
{id:496,n:"RÜDIGER",t:"GER",p:"DF",c:"Real Madrid",pr:57.5,num:2,pts:23.2,own:31.1},
{id:497,n:"ANTON",t:"GER",p:"DF",c:"Dortmund",pr:71.0,num:3,pts:26.6,own:46.0},
{id:498,n:"TAH",t:"GER",p:"DF",c:"Bayern",pr:64.0,num:4,pts:20.8,own:45.6},
{id:499,n:"PAVLOVIĆ",t:"GER",p:"MF",c:"Bayern",pr:73.5,num:5,pts:25.7,own:51.7},
{id:500,n:"KIMMICH",t:"GER",p:"DF",c:"Bayern",pr:70.5,num:6,pts:29.3,own:37.9},
{id:501,n:"HAVERTZ",t:"GER",p:"FW",c:"Arsenal",pr:95.5,num:7,pts:34.7,own:51.1},
{id:502,n:"GORETZKA",t:"GER",p:"MF",c:"Bayern",pr:80.5,num:8,pts:32.5,own:53.5},
{id:503,n:"LEWELING",t:"GER",p:"MF",c:"VfB Stuttgart",pr:57.0,num:9,pts:19.4,own:29.0},
{id:504,n:"MUSIALA",t:"GER",p:"MF",c:"Bayern",pr:94.5,num:10,pts:38.1,own:57.1},
{id:505,n:"WOLTEMADE",t:"GER",p:"FW",c:"Newcastle",pr:96.0,num:11,pts:41.0,own:49.0},
{id:506,n:"BAUMANN",t:"GER",p:"GK",c:"TSG Hoffenheim",pr:23.5,num:12,pts:10.3,own:15.4},
{id:507,n:"GROß",t:"GER",p:"MF",c:"Brighton",pr:37.0,num:13,pts:12.7,own:23.8},
{id:508,n:"BEIER",t:"GER",p:"FW",c:"Dortmund",pr:80.5,num:14,pts:28.0,own:42.8},
{id:509,n:"SCHLOTTERBECK",t:"GER",p:"DF",c:"Dortmund",pr:74.0,num:15,pts:31.4,own:51.3},
{id:510,n:"STILLER",t:"GER",p:"MF",c:"VfB Stuttgart",pr:49.5,num:16,pts:16.2,own:28.1},
{id:511,n:"WIRTZ",t:"GER",p:"MF",c:"Liverpool",pr:88.0,num:17,pts:35.0,own:57.8},
{id:512,n:"BROWN",t:"GER",p:"DF",c:"Eintracht Frankfur",pr:39.5,num:18,pts:13.1,own:25.6},
{id:513,n:"SANÉ",t:"GER",p:"MF",c:"Galatasaray SK",pr:46.0,num:19,pts:16.1,own:35.2},
{id:514,n:"AMIRI",t:"GER",p:"MF",c:"1. FSV Mainz 05",pr:51.5,num:20,pts:18.7,own:26.2},
{id:515,n:"NÜBEL",t:"GER",p:"GK",c:"VfB Stuttgart",pr:28.5,num:21,pts:9.8,own:19.2},
{id:516,n:"RAUM",t:"GER",p:"DF",c:"RB Leipzig",pr:45.5,num:22,pts:19.6,own:25.3},
{id:517,n:"NMECHA",t:"GER",p:"MF",c:"Dortmund",pr:74.5,num:23,pts:25.9,own:48.2},
{id:518,n:"THIAW",t:"GER",p:"DF",c:"Newcastle",pr:66.5,num:24,pts:28.5,own:39.4},
{id:519,n:"KARL",t:"GER",p:"MF",c:"Bayern",pr:60.5,num:25,pts:22.2,own:38.1},
{id:520,n:"UNDAV",t:"GER",p:"FW",c:"VfB Stuttgart",pr:57.0,num:26,pts:23.7,own:29.7},
{id:521,n:"ZIGI",t:"GHA",p:"GK",c:"St. Gallen",pr:21.5,num:1,pts:7.0,own:25.1},
{id:522,n:"SEIDU",t:"GHA",p:"DF",c:"Stade Rennais",pr:47.5,num:2,pts:17.1,own:27.0},
{id:523,n:"CALEB",t:"GHA",p:"MF",c:"Nordsjælland",pr:26.5,num:3,pts:9.1,own:25.8},
{id:524,n:"ADJETEY",t:"GHA",p:"DF",c:"VfL Wolfsburg",pr:46.0,num:4,pts:18.7,own:23.9},
{id:525,n:"THOMAS",t:"GHA",p:"MF",c:"Villarreal",pr:50.0,num:5,pts:18.5,own:27.4},
{id:526,n:"SULEMAN",t:"GHA",p:"DF",c:"Rayo Vallecano",pr:28.5,num:6,pts:10.9,own:27.3},
{id:527,n:"FATAWU",t:"GHA",p:"FW",c:"Leicester City",pr:32.0,num:7,pts:10.6,own:27.5},
{id:528,n:"SIBO",t:"GHA",p:"MF",c:"Real Oviedo",pr:35.0,num:8,pts:15.1,own:20.5},
{id:529,n:"AYEW",t:"GHA",p:"FW",c:"Leicester City",pr:26.0,num:9,pts:9.0,own:18.9},
{id:530,n:"ASANTE",t:"GHA",p:"FW",c:"Coventry City",pr:38.0,num:10,pts:15.9,own:24.5},
{id:531,n:"SEMENYO",t:"GHA",p:"MF",c:"Man City",pr:78.0,num:11,pts:25.7,own:46.3},
{id:532,n:"ANANG",t:"GHA",p:"GK",c:"St Patrick's Athle",pr:17.0,num:12,pts:5.8,own:13.6},
{id:533,n:"BAAH",t:"GHA",p:"FW",c:"Al Qadsiah",pr:56.0,num:13,pts:23.7,own:37.1},
{id:534,n:"MENSAH",t:"GHA",p:"DF",c:"AJ Auxerre",pr:27.5,num:14,pts:11.3,own:15.1},
{id:535,n:"OWUSU",t:"GHA",p:"MF",c:"AJ Auxerre",pr:29.5,num:15,pts:10.2,own:22.1},
{id:536,n:"ASARE",t:"GHA",p:"GK",c:"Hearts Of Oak SC",pr:13.0,num:16,pts:4.8,own:14.1},
{id:537,n:"BABA",t:"GHA",p:"DF",c:"PAOK Saloniki",pr:23.5,num:17,pts:8.6,own:20.7},
{id:538,n:"OPOKU",t:"GHA",p:"DF",c:"Başakşehir FK",pr:26.5,num:18,pts:10.0,own:19.1},
{id:539,n:"WILLIAMS",t:"GHA",p:"FW",c:"Athletic Club",pr:48.5,num:19,pts:17.5,own:38.1},
{id:540,n:"BOAKYE",t:"GHA",p:"MF",c:"AS Saint-Etienne",pr:29.5,num:20,pts:11.6,own:26.4},
{id:541,n:"PEPRAH",t:"GHA",p:"DF",c:"OGC Nice",pr:37.5,num:21,pts:12.5,own:27.0},
{id:542,n:"KAMALDEEN",t:"GHA",p:"FW",c:"Atalanta Bergamo",pr:55.0,num:22,pts:20.8,own:39.5},
{id:543,n:"LUCKASSEN",t:"GHA",p:"DF",c:"Pafos",pr:22.5,num:23,pts:8.6,own:11.4},
{id:544,n:"NUAMAH",t:"GHA",p:"FW",c:"Olympique Lyonnais",pr:51.0,num:24,pts:19.9,own:32.9},
{id:545,n:"ADU",t:"GHA",p:"FW",c:"Viktoria Plzeň",pr:29.5,num:25,pts:10.8,own:23.5},
{id:546,n:"SENEYA",t:"GHA",p:"DF",c:"AJ Auxerre",pr:26.5,num:26,pts:11.4,own:27.5},
{id:547,n:"PLACIDE",t:"HAI",p:"GK",c:"SC Bastia",pr:17.5,num:1,pts:7.2,own:14.3},
{id:548,n:"ARCUS",t:"HAI",p:"DF",c:"Angers SCO",pr:28.5,num:2,pts:11.0,own:15.5},
{id:549,n:"THERMONCY",t:"HAI",p:"DF",c:"BSC Young Boys",pr:25.0,num:3,pts:10.4,own:13.5},
{id:550,n:"ADE",t:"HAI",p:"DF",c:"LDU Quito",pr:20.0,num:4,pts:6.5,own:16.5},
{id:551,n:"DELCROIX",t:"HAI",p:"DF",c:"Lugano",pr:28.5,num:5,pts:10.8,own:15.9},
{id:552,n:"SAINTE",t:"HAI",p:"MF",c:"El Paso Locomotive",pr:30.5,num:6,pts:11.9,own:18.7},
{id:553,n:"ETIENNE JR",t:"HAI",p:"FW",c:"Toronto",pr:38.5,num:7,pts:16.6,own:29.2},
{id:554,n:"EXPERIENCE",t:"HAI",p:"DF",c:"AS Nancy",pr:28.0,num:8,pts:10.2,own:19.2},
{id:555,n:"NAZON",t:"HAI",p:"FW",c:"Esteghlal Tehran",pr:31.5,num:9,pts:10.5,own:20.3},
{id:556,n:"BELLEGARDE",t:"HAI",p:"MF",c:"Wolverhampton Wand",pr:31.0,num:10,pts:10.3,own:23.9},
{id:557,n:"DEEDSON",t:"HAI",p:"FW",c:"Dallas",pr:36.5,num:11,pts:13.6,own:19.6},
{id:558,n:"A. PIERRE",t:"HAI",p:"GK",c:"Sochaux-Montbéliar",pr:16.5,num:12,pts:5.5,own:20.2},
{id:559,n:"LACROIX",t:"HAI",p:"DF",c:"Colorado Springs S",pr:23.0,num:13,pts:8.0,own:24.4},
{id:560,n:"L. PIERRE",t:"HAI",p:"MF",c:"Vizela",pr:31.5,num:14,pts:12.6,own:24.8},
{id:561,n:"PROVIDENCE",t:"HAI",p:"FW",c:"Almere City",pr:33.5,num:15,pts:12.1,own:29.7},
{id:562,n:"JOSEPH",t:"HAI",p:"FW",c:"Ferencvárosi TC",pr:33.5,num:16,pts:12.0,own:24.9},
{id:563,n:"JEAN JACQUES",t:"HAI",p:"MF",c:"Philadelphia Union",pr:31.0,num:17,pts:12.0,own:25.4},
{id:564,n:"ISIDOR",t:"HAI",p:"FW",c:"Sunderland",pr:32.5,num:18,pts:10.8,own:28.1},
{id:565,n:"FORTUNE",t:"HAI",p:"FW",c:"Vizela",pr:33.5,num:19,pts:13.9,own:30.3},
{id:566,n:"PIERROT",t:"HAI",p:"FW",c:"Çaykur Rizespor",pr:30.5,num:20,pts:12.8,own:28.7},
{id:567,n:"CASIMIR",t:"HAI",p:"FW",c:"AJ Auxerre",pr:33.0,num:21,pts:12.9,own:30.6},
{id:568,n:"DUVERNE",t:"HAI",p:"DF",c:"KAA Gent",pr:26.5,num:22,pts:11.2,own:28.2},
{id:569,n:"DUVERGER",t:"HAI",p:"GK",c:"Cosmos Koblenz",pr:17.5,num:23,pts:6.7,own:18.6},
{id:570,n:"PAUGIN",t:"HAI",p:"DF",c:"SV Zulte Waregem",pr:25.5,num:24,pts:10.1,own:27.6},
{id:571,n:"SIMON",t:"HAI",p:"MF",c:"Tatran Prešov",pr:30.0,num:25,pts:12.4,own:24.9},
{id:572,n:"W. PIERRE",t:"HAI",p:"MF",c:"Violette AC",pr:28.0,num:26,pts:11.9,own:16.2},
{id:573,n:"BEIRANVAND",t:"IRN",p:"GK",c:"Tractor Sazi Tabri",pr:18.0,num:1,pts:7.7,own:9.4},
{id:574,n:"SALEH",t:"IRN",p:"DF",c:"Esteghlal Tehran",pr:30.0,num:2,pts:12.9,own:26.7},
{id:575,n:"E. HAJISAFI",t:"IRN",p:"DF",c:"Sepahan SC",pr:22.5,num:3,pts:9.8,own:15.4},
{id:576,n:"SHOJA",t:"IRN",p:"DF",c:"Tractor Sazi Tabri",pr:21.5,num:4,pts:8.5,own:19.8},
{id:577,n:"M. MOHAMMADI",t:"IRN",p:"DF",c:"Persepolis",pr:27.0,num:5,pts:11.8,own:27.9},
{id:578,n:"S. EZATOLAHI",t:"IRN",p:"MF",c:"Shabab Al Ahli Clu",pr:33.5,num:6,pts:13.3,own:26.7},
{id:579,n:"A. JAHANBAKHSH",t:"IRN",p:"MF",c:"FCV Dender EH",pr:28.5,num:7,pts:9.7,own:19.9},
{id:580,n:"M. MOHEBBI",t:"IRN",p:"MF",c:"Rostov",pr:31.0,num:8,pts:10.1,own:22.4},
{id:581,n:"TAREMI",t:"IRN",p:"FW",c:"Olympiacos",pr:31.5,num:9,pts:13.0,own:28.6},
{id:582,n:"MEHDI GHAYEDI",t:"IRN",p:"FW",c:"Al Nasr SC",pr:35.5,num:10,pts:12.6,own:20.6},
{id:583,n:"A. ALIPOUR",t:"IRN",p:"FW",c:"Persepolis",pr:33.5,num:11,pts:13.1,own:17.3},
{id:584,n:"PAYAM",t:"IRN",p:"GK",c:"Persepolis",pr:16.5,num:12,pts:7.1,own:11.3},
{id:585,n:"KANANI",t:"IRN",p:"DF",c:"Persepolis",pr:24.5,num:13,pts:9.8,own:25.1},
{id:586,n:"GHODDOS",t:"IRN",p:"MF",c:"Al Ittihad Kalba S",pr:27.0,num:14,pts:9.9,own:23.6},
{id:587,n:"ROOZBEH",t:"IRN",p:"MF",c:"Esteghlal Tehran",pr:27.5,num:15,pts:10.3,own:14.2},
{id:588,n:"M. TORABI",t:"IRN",p:"MF",c:"Tractor Sazi Tabri",pr:29.0,num:16,pts:12.2,own:14.8},
{id:589,n:"ARYA",t:"IRN",p:"DF",c:"Sepahan SC",pr:25.5,num:17,pts:8.8,own:23.2},
{id:590,n:"AMIRHOSSEIN",t:"IRN",p:"FW",c:"Tractor Sazi Tabri",pr:32.0,num:18,pts:10.5,own:16.5},
{id:591,n:"ALI",t:"IRN",p:"DF",c:"Foolad Khuzestan",pr:22.0,num:19,pts:7.6,own:17.3},
{id:592,n:"SHAHRIYAR",t:"IRN",p:"FW",c:"Al Ittihad Kalba S",pr:30.5,num:20,pts:12.8,own:18.3},
{id:593,n:"MOHAMMAD",t:"IRN",p:"MF",c:"Al Wahda SC",pr:30.0,num:21,pts:12.0,own:27.5},
{id:594,n:"HOSSEINI",t:"IRN",p:"GK",c:"Sepahan SC",pr:12.0,num:22,pts:3.9,own:16.5},
{id:595,n:"RAMIN",t:"IRN",p:"DF",c:"Foolad Khuzestan",pr:17.5,num:23,pts:5.7,own:20.2},
{id:596,n:"DARGAHI",t:"IRN",p:"FW",c:"Standard Liège",pr:33.0,num:24,pts:13.3,own:29.2},
{id:597,n:"DANIAL",t:"IRN",p:"DF",c:"Malavan Anzali",pr:22.0,num:25,pts:7.2,own:20.2},
{id:598,n:"RAZAGH",t:"IRN",p:"MF",c:"Esteghlal Tehran",pr:24.0,num:26,pts:8.9,own:23.4},
{id:599,n:"FAHAD",t:"IRQ",p:"GK",c:"Al Talaba SC",pr:20.0,num:1,pts:6.9,own:14.0},
{id:600,n:"REBIN",t:"IRQ",p:"DF",c:"Port",pr:22.0,num:2,pts:9.2,own:23.9},
{id:601,n:"HUSSEIN",t:"IRQ",p:"DF",c:"Pogoń Szczecin",pr:29.0,num:3,pts:11.7,own:23.5},
{id:602,n:"ZAID T.",t:"IRQ",p:"DF",c:"Pakhtakor Tashkent",pr:29.5,num:4,pts:12.1,own:27.4},
{id:603,n:"AKAM",t:"IRQ",p:"DF",c:"Al Zawra'a SC",pr:29.5,num:5,pts:12.4,own:14.8},
{id:604,n:"MUNAF",t:"IRQ",p:"DF",c:"Al Shorta SC",pr:29.0,num:6,pts:11.4,own:22.9},
{id:605,n:"YOUSSEF",t:"IRQ",p:"MF",c:"AEK Larnaca",pr:31.5,num:7,pts:12.9,own:30.2},
{id:606,n:"IBRAHIM",t:"IRQ",p:"MF",c:"Al Dhafra SCC",pr:32.0,num:8,pts:11.3,own:30.2},
{id:607,n:"AL-HAMADI",t:"IRQ",p:"FW",c:"Luton Town",pr:38.0,num:9,pts:16.0,own:26.8},
{id:608,n:"MOHANAD",t:"IRQ",p:"FW",c:"Dibba",pr:37.0,num:10,pts:14.5,own:23.7},
{id:609,n:"AHMED Q.",t:"IRQ",p:"FW",c:"Nashville SC",pr:35.0,num:11,pts:14.7,own:24.5},
{id:610,n:"JALAL",t:"IRQ",p:"GK",c:"Al Zawra'a SC",pr:12.0,num:12,pts:3.9,own:11.5},
{id:611,n:"ALI Y.",t:"IRQ",p:"FW",c:"Al Talaba SC",pr:31.0,num:13,pts:12.0,own:29.3},
{id:612,n:"Z.IQBAL",t:"IRQ",p:"MF",c:"Utrecht",pr:30.0,num:14,pts:13.0,own:27.1},
{id:613,n:"AHMED",t:"IRQ",p:"DF",c:"Al Shorta SC",pr:25.5,num:15,pts:11.0,own:23.5},
{id:614,n:"AL-AMMARI",t:"IRQ",p:"MF",c:"KS Cracovia",pr:31.0,num:16,pts:11.9,own:23.4},
{id:615,n:"ALI J.",t:"IRQ",p:"FW",c:"Al Najmah SC",pr:31.0,num:17,pts:11.2,own:18.8},
{id:616,n:"AYMEN",t:"IRQ",p:"FW",c:"Al Karma SC",pr:30.5,num:18,pts:11.5,own:25.0},
{id:617,n:"K. YAKOB",t:"IRQ",p:"MF",c:"Aarhus GF",pr:28.5,num:19,pts:10.4,own:18.5},
{id:618,n:"AIMAR",t:"IRQ",p:"MF",c:"Sarpsborg 08 FF",pr:28.0,num:20,pts:12.0,own:16.1},
{id:619,n:"MARKO",t:"IRQ",p:"FW",c:"Venezia",pr:31.0,num:21,pts:12.9,own:19.6},
{id:620,n:"AHMED B.",t:"IRQ",p:"GK",c:"Al Shorta SC",pr:18.0,num:22,pts:7.3,own:10.4},
{id:621,n:"DOSKI",t:"IRQ",p:"DF",c:"Viktoria Plzeň",pr:25.5,num:23,pts:9.8,own:16.7},
{id:622,n:"ZAID I.",t:"IRQ",p:"MF",c:"Al Talaba SC",pr:28.0,num:24,pts:9.7,own:14.3},
{id:623,n:"MUSTAFA",t:"IRQ",p:"DF",c:"Al Shorta SC",pr:25.5,num:25,pts:10.1,own:21.9},
{id:624,n:"FRANS",t:"IRQ",p:"DF",c:"Persib Bandung",pr:22.0,num:26,pts:7.8,own:21.8},
{id:625,n:"Z. SUZUKI",t:"JPN",p:"GK",c:"Parma",pr:20.0,num:1,pts:6.8,own:20.1},
{id:626,n:"SUGAWARA",t:"JPN",p:"DF",c:"SV Werder Bremen",pr:28.0,num:2,pts:9.9,own:16.3},
{id:627,n:"TANIGUCHI",t:"JPN",p:"DF",c:"Sint-Truiden VV",pr:20.0,num:3,pts:6.7,own:16.1},
{id:628,n:"ITAKURA",t:"JPN",p:"DF",c:"AAjax",pr:47.0,num:4,pts:16.6,own:29.7},
{id:629,n:"NAGATOMO",t:"JPN",p:"DF",c:"Tokyo",pr:20.0,num:5,pts:6.5,own:21.6},
{id:630,n:"ENDO",t:"JPN",p:"MF",c:"Liverpool",pr:62.0,num:6,pts:24.4,own:40.7},
{id:631,n:"TANAKA",t:"JPN",p:"MF",c:"Leeds United",pr:34.0,num:7,pts:13.8,own:21.5},
{id:632,n:"KUBO",t:"JPN",p:"MF",c:"Real Sociedad",pr:64.0,num:8,pts:25.6,own:32.9},
{id:633,n:"GOTO",t:"JPN",p:"FW",c:"Sint-Truiden VV",pr:32.5,num:9,pts:11.1,own:20.9},
{id:634,n:"DOAN",t:"JPN",p:"MF",c:"Eintracht Frankfur",pr:55.5,num:10,pts:20.5,own:33.8},
{id:635,n:"MAEDA",t:"JPN",p:"MF",c:"Celtic",pr:55.5,num:11,pts:20.5,own:30.2},
{id:636,n:"OSAKO",t:"JPN",p:"GK",c:"Sanfrecce Hiroshim",pr:18.0,num:12,pts:7.4,own:18.1},
{id:637,n:"NAKAMURA",t:"JPN",p:"MF",c:"Stade Reims",pr:31.5,num:13,pts:12.5,own:24.0},
{id:638,n:"J. ITO",t:"JPN",p:"MF",c:"KRC Genk",pr:22.0,num:14,pts:7.9,own:16.5},
{id:639,n:"KAMADA",t:"JPN",p:"MF",c:"Crystal Palace",pr:49.5,num:15,pts:16.3,own:25.7},
{id:640,n:"WATANABE",t:"JPN",p:"DF",c:"Feyenoord Rotterda",pr:44.5,num:16,pts:16.0,own:25.1},
{id:641,n:"Y. SUZUKI",t:"JPN",p:"MF",c:"SC Freiburg",pr:51.5,num:17,pts:19.0,own:29.7},
{id:642,n:"AYASE",t:"JPN",p:"FW",c:"Feyenoord Rotterda",pr:55.5,num:18,pts:18.9,own:32.8},
{id:643,n:"OGAWA",t:"JPN",p:"FW",c:"NEC Nijmegen",pr:33.0,num:19,pts:12.9,own:24.5},
{id:644,n:"SEKO",t:"JPN",p:"DF",c:"Le Havre AC",pr:25.5,num:20,pts:9.8,own:17.8},
{id:645,n:"H. ITO",t:"JPN",p:"DF",c:"Bayern",pr:62.0,num:21,pts:22.6,own:33.9},
{id:646,n:"TOMIYASU",t:"JPN",p:"DF",c:"AAjax",pr:40.5,num:22,pts:13.4,own:34.0},
{id:647,n:"HAYAKAWA",t:"JPN",p:"GK",c:"Kashima Antlers",pr:17.0,num:23,pts:5.9,own:18.5},
{id:648,n:"SANO",t:"JPN",p:"MF",c:"1. FSV Mainz 05",pr:48.0,num:24,pts:17.0,own:27.6},
{id:649,n:"J. SUZUKI",t:"JPN",p:"DF",c:"København",pr:23.0,num:25,pts:8.3,own:13.7},
{id:650,n:"SHIOGAI",t:"JPN",p:"FW",c:"VfL Wolfsburg",pr:51.0,num:26,pts:19.6,own:36.1},
{id:651,n:"YAZEED",t:"JOR",p:"GK",c:"Al Hussein SC",pr:16.5,num:1,pts:6.0,own:11.0},
{id:652,n:"ABU HASHEESH",t:"JOR",p:"DF",c:"Al Karma SC",pr:24.5,num:2,pts:8.4,own:13.2},
{id:653,n:"NASIB",t:"JOR",p:"DF",c:"Al Zawra'a SC",pr:27.0,num:3,pts:11.5,own:19.6},
{id:654,n:"ABU DAHAB",t:"JOR",p:"DF",c:"Al Faisaly SC",pr:29.0,num:4,pts:11.6,own:17.9},
{id:655,n:"ALARAB",t:"JOR",p:"DF",c:"Seoul",pr:25.0,num:5,pts:8.8,own:23.6},
{id:656,n:"JAMOUS",t:"JOR",p:"MF",c:"Al Zawra'a SC",pr:29.0,num:6,pts:9.9,own:22.4},
{id:657,n:"ABU ZRAIQ",t:"JOR",p:"FW",c:"Raja Casablanca",pr:37.5,num:7,pts:15.1,own:20.8},
{id:658,n:"ALRAWABDEH",t:"JOR",p:"MF",c:"Selangor",pr:31.5,num:8,pts:10.8,own:23.5},
{id:659,n:"OLWAN",t:"JOR",p:"FW",c:"Al Sailiya SC",pr:34.5,num:9,pts:11.4,own:31.9},
{id:660,n:"ALTAMARI",t:"JOR",p:"FW",c:"Stade Rennais",pr:61.5,num:10,pts:22.7,own:41.4},
{id:661,n:"ODEH",t:"JOR",p:"FW",c:"Pyramids",pr:29.5,num:11,pts:10.3,own:16.2},
{id:662,n:"BANI ATEYAH",t:"JOR",p:"GK",c:"Al Faisaly SC",pr:13.5,num:12,pts:5.5,own:12.1},
{id:663,n:"ALMARDI",t:"JOR",p:"FW",c:"Al Hussein SC",pr:31.0,num:13,pts:11.9,own:16.9},
{id:664,n:"RAJA'EI",t:"JOR",p:"MF",c:"Al Hussein SC",pr:26.5,num:14,pts:9.0,own:18.7},
{id:665,n:"SA'DEH",t:"JOR",p:"MF",c:"Al Karma SC",pr:31.0,num:15,pts:11.8,own:18.2},
{id:666,n:"ABU ALNADI",t:"JOR",p:"DF",c:"Selangor",pr:28.0,num:16,pts:12.2,own:23.3},
{id:667,n:"SALEEM",t:"JOR",p:"DF",c:"Al Hussein SC",pr:20.0,num:17,pts:8.1,own:10.8},
{id:668,n:"SABRA",t:"JOR",p:"FW",c:"NK Lokomotiva Zagr",pr:27.5,num:18,pts:9.2,own:22.2},
{id:669,n:"SA'ED",t:"JOR",p:"DF",c:"Al Hussein SC",pr:25.0,num:19,pts:9.1,own:25.4},
{id:670,n:"ABU TAHA",t:"JOR",p:"MF",c:"Al-Quwa Al-Jawiya",pr:25.5,num:20,pts:8.5,own:19.4},
{id:671,n:"NIZAR",t:"JOR",p:"MF",c:"Qatar SC",pr:28.5,num:21,pts:10.4,own:23.6},
{id:672,n:"ALFAKHORI",t:"JOR",p:"GK",c:"Al Wahdat SC",pr:17.0,num:22,pts:5.8,own:20.4},
{id:673,n:"EHSAN",t:"JOR",p:"DF",c:"Al Hussein SC",pr:23.0,num:23,pts:9.1,own:26.3},
{id:674,n:"AZAIZEH",t:"JOR",p:"FW",c:"Al Shabab",pr:28.0,num:24,pts:9.2,own:15.3},
{id:675,n:"ALDAOUD",t:"JOR",p:"MF",c:"Al Wahdat SC",pr:21.5,num:25,pts:8.3,own:11.3},
{id:676,n:"BADAWI",t:"JOR",p:"DF",c:"Al Faisaly SC",pr:26.5,num:26,pts:11.2,own:15.4},
{id:677,n:"SEUNGGYU",t:"KOR",p:"GK",c:"Tokyo",pr:17.0,num:1,pts:6.4,own:13.5},
{id:678,n:"HANBEOM",t:"KOR",p:"DF",c:"Midtjylland",pr:26.5,num:2,pts:10.4,own:16.2},
{id:679,n:"GIHYUK",t:"KOR",p:"MF",c:"Gangwon",pr:34.0,num:3,pts:14.0,own:18.0},
{id:680,n:"MINJAE",t:"KOR",p:"DF",c:"Bayern",pr:84.5,num:4,pts:36.8,own:49.7},
{id:681,n:"TAEHYEON",t:"KOR",p:"DF",c:"Kashima Antlers",pr:27.0,num:5,pts:9.0,own:28.0},
{id:682,n:"INBEOM",t:"KOR",p:"MF",c:"Feyenoord Rotterda",pr:53.0,num:6,pts:17.3,own:26.9},
{id:683,n:"HEUNGMIN",t:"KOR",p:"FW",c:"LAFC",pr:29.0,num:7,pts:9.8,own:25.8},
{id:684,n:"SEUNGHO",t:"KOR",p:"MF",c:"Birmingham City",pr:32.5,num:8,pts:11.7,own:17.2},
{id:685,n:"GUESUNG",t:"KOR",p:"FW",c:"Midtjylland",pr:35.5,num:9,pts:12.3,own:31.2},
{id:686,n:"JAESUNG",t:"KOR",p:"MF",c:"1. FSV Mainz 05",pr:39.5,num:10,pts:13.1,own:24.7},
{id:687,n:"HEECHAN",t:"KOR",p:"MF",c:"Wolverhampton Wand",pr:29.5,num:11,pts:11.2,own:19.7},
{id:688,n:"BUMKEUN",t:"KOR",p:"GK",c:"Jeonbuk Hyundai Mo",pr:18.5,num:12,pts:8.0,own:22.7},
{id:689,n:"TAESEOK",t:"KOR",p:"DF",c:"FK Austria Wien",pr:23.0,num:13,pts:7.5,own:12.2},
{id:690,n:"WIJE",t:"KOR",p:"DF",c:"Jeonbuk Hyundai Mo",pr:27.5,num:14,pts:11.2,own:21.8},
{id:691,n:"MOONHWAN",t:"KOR",p:"DF",c:"Daejeon Hana Citiz",pr:22.5,num:15,pts:7.4,own:20.3},
{id:692,n:"JINSEOB",t:"KOR",p:"DF",c:"Zhejiang",pr:25.0,num:16,pts:10.6,own:22.8},
{id:693,n:"JUNHO",t:"KOR",p:"MF",c:"Stoke City",pr:27.5,num:17,pts:9.9,own:27.2},
{id:694,n:"HYEONGYU",t:"KOR",p:"FW",c:"Beşiktaş JK",pr:57.0,num:18,pts:20.6,own:39.1},
{id:695,n:"KANGIN",t:"KOR",p:"MF",c:"PSG",pr:85.5,num:19,pts:36.3,own:53.2},
{id:696,n:"HYUNJUN",t:"KOR",p:"MF",c:"Celtic",pr:47.0,num:20,pts:15.4,own:36.1},
{id:697,n:"HYEONWOO",t:"KOR",p:"GK",c:"Ulsan HD",pr:13.0,num:21,pts:5.0,own:20.9},
{id:698,n:"YOUNGWOO",t:"KOR",p:"DF",c:"FK Crvena Zvezda",pr:25.5,num:22,pts:10.0,own:17.1},
{id:699,n:"JENS",t:"KOR",p:"DF",c:"Borussia Mönchengl",pr:40.5,num:23,pts:16.3,own:29.4},
{id:700,n:"JINGYU",t:"KOR",p:"MF",c:"Jeonbuk Hyundai Mo",pr:30.5,num:24,pts:13.0,own:19.9},
{id:701,n:"JISUNG",t:"KOR",p:"MF",c:"Swansea City",pr:30.0,num:25,pts:12.1,own:25.2},
{id:702,n:"DONGGYEONG",t:"KOR",p:"MF",c:"Ulsan HD",pr:30.0,num:26,pts:12.1,own:16.8},
{id:703,n:"R. RANGEL",t:"MEX",p:"GK",c:"CD Guadalajara",pr:24.0,num:1,pts:10.0,own:25.5},
{id:704,n:"J. SÁNCHEZ",t:"MEX",p:"DF",c:"PAOK Saloniki",pr:30.0,num:2,pts:13.0,own:20.7},
{id:705,n:"C. MONTES",t:"MEX",p:"DF",c:"Lokomotiv Moscow",pr:28.0,num:3,pts:10.0,own:15.5},
{id:706,n:"E. ÁLVAREZ",t:"MEX",p:"DF",c:"Fenerbahçe SK",pr:49.0,num:4,pts:19.2,own:25.0},
{id:707,n:"J. VÁSQUEZ",t:"MEX",p:"DF",c:"GenoaC",pr:28.0,num:5,pts:10.0,own:26.3},
{id:708,n:"E. LIRA",t:"MEX",p:"MF",c:"Cruz Azul",pr:33.5,num:6,pts:13.4,own:25.1},
{id:709,n:"L. ROMO",t:"MEX",p:"MF",c:"CD Guadalajara",pr:28.5,num:7,pts:9.6,own:27.8},
{id:710,n:"FIDALGO",t:"MEX",p:"MF",c:"Real Betis",pr:58.5,num:8,pts:24.9,own:36.3},
{id:711,n:"RAÚL",t:"MEX",p:"FW",c:"Fulham",pr:45.5,num:9,pts:16.7,own:27.5},
{id:712,n:"A. VEGA",t:"MEX",p:"FW",c:"Deportivo Toluca",pr:35.0,num:10,pts:11.7,own:20.0},
{id:713,n:"S. GIMENEZ",t:"MEX",p:"FW",c:"AC Milan",pr:86.5,num:11,pts:28.2,own:48.8},
{id:714,n:"C. ACEVEDO",t:"MEX",p:"GK",c:"Club Santos Laguna",pr:16.5,num:12,pts:6.9,own:18.3},
{id:715,n:"G. OCHOA",t:"MEX",p:"GK",c:"AEL Limassol",pr:13.0,num:13,pts:5.0,own:18.3},
{id:716,n:"A. GONZÁLEZ",t:"MEX",p:"FW",c:"CD Guadalajara",pr:33.0,num:14,pts:14.1,own:17.0},
{id:717,n:"I. REYES",t:"MEX",p:"DF",c:"Club América",pr:26.5,num:15,pts:10.0,own:20.7},
{id:718,n:"J. QUIÑONES",t:"MEX",p:"FW",c:"Al Qadsiah",pr:57.0,num:16,pts:20.5,own:36.2},
{id:719,n:"ORBELÍN",t:"MEX",p:"MF",c:"AEK Athens",pr:26.5,num:17,pts:9.1,own:14.0},
{id:720,n:"O. VARGAS",t:"MEX",p:"MF",c:"Atlético",pr:63.5,num:18,pts:23.2,own:46.5},
{id:721,n:"G. MORA",t:"MEX",p:"MF",c:"Club Tijuana",pr:22.0,num:19,pts:8.8,own:23.5},
{id:722,n:"M. CHÁVEZ",t:"MEX",p:"DF",c:"AZ Alkmaar",pr:24.0,num:20,pts:9.9,own:17.1},
{id:723,n:"C. HUERTA",t:"MEX",p:"FW",c:"RSC Anderlecht",pr:30.5,num:21,pts:10.0,own:27.8},
{id:724,n:"G. MARTÍNEZ",t:"MEX",p:"FW",c:"Pumas UNAM",pr:29.0,num:22,pts:11.0,own:19.8},
{id:725,n:"J. GALLARDO",t:"MEX",p:"DF",c:"Deportivo Toluca",pr:23.0,num:23,pts:8.8,own:22.4},
{id:726,n:"L. CHÁVEZ",t:"MEX",p:"MF",c:"Dynamo Moscow",pr:25.0,num:24,pts:8.2,own:18.8},
{id:727,n:"R. ALVARADO",t:"MEX",p:"FW",c:"CD Guadalajara",pr:34.5,num:25,pts:15.0,own:30.9},
{id:728,n:"B. GUTIÉRREZ",t:"MEX",p:"MF",c:"CD Guadalajara",pr:28.0,num:26,pts:11.7,own:20.4},
{id:729,n:"BONO",t:"MAR",p:"GK",c:"Al Hilal SC",pr:28.5,num:1,pts:10.3,own:20.6},
{id:730,n:"HAKIMI",t:"MAR",p:"DF",c:"PSG",pr:83.0,num:2,pts:34.7,own:51.2},
{id:731,n:"MAZRAOUI",t:"MAR",p:"DF",c:"Man Utd",pr:70.0,num:3,pts:25.4,own:37.0},
{id:732,n:"AMRABAT",t:"MAR",p:"MF",c:"Real Betis",pr:57.5,num:4,pts:23.3,own:41.8},
{id:733,n:"AGUERD",t:"MAR",p:"DF",c:"Olympique Marseill",pr:43.5,num:5,pts:16.1,own:35.7},
{id:734,n:"BOUADDI",t:"MAR",p:"MF",c:"Lille OSC",pr:49.5,num:6,pts:21.1,own:27.5},
{id:735,n:"TALBI",t:"MAR",p:"MF",c:"Sunderland",pr:30.0,num:7,pts:11.1,own:28.7},
{id:736,n:"OUNAHI",t:"MAR",p:"MF",c:"Girona",pr:55.5,num:8,pts:20.6,own:33.2},
{id:737,n:"RAHIMI",t:"MAR",p:"FW",c:"Al Ain",pr:33.5,num:9,pts:13.3,own:17.1},
{id:738,n:"BRAHIM",t:"MAR",p:"FW",c:"Real Madrid",pr:87.5,num:10,pts:29.6,own:49.3},
{id:739,n:"SAIBARI",t:"MAR",p:"MF",c:"PSV Eindhoven",pr:58.5,num:11,pts:24.7,own:30.7},
{id:740,n:"EL KAJOUI",t:"MAR",p:"GK",c:"RS Berkane",pr:13.5,num:12,pts:5.8,own:15.0},
{id:741,n:"EL OUAHDI",t:"MAR",p:"DF",c:"KRC Genk",pr:25.5,num:13,pts:8.8,own:26.1},
{id:742,n:"ISSA",t:"MAR",p:"DF",c:"Fulham",pr:47.5,num:14,pts:20.3,own:34.1},
{id:743,n:"EL MOURABET",t:"MAR",p:"MF",c:"RC Strasbourg",pr:43.0,num:15,pts:15.7,own:31.9},
{id:744,n:"YASSINE",t:"MAR",p:"MF",c:"RC Strasbourg",pr:41.5,num:16,pts:13.5,own:29.3},
{id:745,n:"EZZALZOULI",t:"MAR",p:"FW",c:"Real Betis",pr:57.0,num:17,pts:20.8,own:38.0},
{id:746,n:"RIAD",t:"MAR",p:"DF",c:"Crystal Palace",pr:39.5,num:18,pts:13.2,own:26.3},
{id:747,n:"BELAMMARI",t:"MAR",p:"DF",c:"Al Ahly",pr:25.5,num:19,pts:9.8,own:20.7},
{id:748,n:"EL KAABI",t:"MAR",p:"FW",c:"Olympiacos",pr:30.5,num:20,pts:13.0,own:27.2},
{id:749,n:"AMAIMOUNI",t:"MAR",p:"FW",c:"Eintracht Frankfur",pr:52.0,num:21,pts:20.9,own:28.4},
{id:750,n:"TAGNAOUTI",t:"MAR",p:"GK",c:"ASFAR",pr:16.0,num:22,pts:6.4,own:12.2},
{id:751,n:"EL KHANNOUSS",t:"MAR",p:"MF",c:"VfB Stuttgart",pr:46.0,num:23,pts:17.8,own:34.2},
{id:752,n:"EL AYNAOUI",t:"MAR",p:"MF",c:"AS Roma",pr:50.5,num:24,pts:20.0,own:39.9},
{id:753,n:"HALHAL",t:"MAR",p:"DF",c:"KV Mechelen",pr:23.0,num:25,pts:8.6,own:14.1},
{id:754,n:"SALAH-EDDINE",t:"MAR",p:"DF",c:"PSV Eindhoven",pr:43.0,num:26,pts:16.5,own:29.5},
{id:755,n:"VERBRUGGEN",t:"NED",p:"GK",c:"Brighton",pr:37.0,num:1,pts:15.3,own:18.9},
{id:756,n:"J. TIMBER",t:"NED",p:"DF",c:"Arsenal",pr:68.5,num:2,pts:23.3,own:48.3},
{id:757,n:"DE ROON",t:"NED",p:"MF",c:"Atalanta Bergamo",pr:40.5,num:3,pts:14.4,own:25.4},
{id:758,n:"VIRGIL",t:"NED",p:"DF",c:"Liverpool",pr:61.0,num:4,pts:24.9,own:43.2},
{id:759,n:"AKÉ",t:"NED",p:"DF",c:"Man City",pr:68.0,num:5,pts:29.5,own:42.8},
{id:760,n:"VAN HECKE",t:"NED",p:"DF",c:"Brighton",pr:46.5,num:6,pts:15.9,own:37.4},
{id:761,n:"KLUIVERT",t:"NED",p:"MF",c:"ABournemouth",pr:56.0,num:7,pts:21.5,own:31.4},
{id:762,n:"GRAVENBERCH",t:"NED",p:"MF",c:"Liverpool",pr:82.5,num:8,pts:26.9,own:43.6},
{id:763,n:"WEGHORST",t:"NED",p:"FW",c:"AAjax",pr:48.5,num:9,pts:20.8,own:28.9},
{id:764,n:"MEMPHIS",t:"NED",p:"FW",c:"SC Corinthians",pr:32.5,num:10,pts:11.8,own:27.0},
{id:765,n:"GAKPO",t:"NED",p:"FW",c:"Liverpool",pr:101.0,num:11,pts:42.3,own:63.9},
{id:766,n:"WIEFFER",t:"NED",p:"DF",c:"Brighton",pr:45.5,num:12,pts:17.7,own:30.6},
{id:767,n:"ROEFS",t:"NED",p:"GK",c:"Sunderland",pr:17.0,num:13,pts:7.3,own:13.1},
{id:768,n:"REIJNDERS",t:"NED",p:"MF",c:"Man City",pr:79.0,num:14,pts:27.6,own:50.8},
{id:769,n:"VAN DE VEN",t:"NED",p:"DF",c:"Tottenham",pr:64.0,num:15,pts:21.8,own:40.2},
{id:770,n:"TIL",t:"NED",p:"MF",c:"PSV Eindhoven",pr:51.0,num:16,pts:18.3,own:39.7},
{id:771,n:"LANG",t:"NED",p:"FW",c:"Galatasaray SK",pr:59.5,num:17,pts:24.1,own:42.9},
{id:772,n:"MALEN",t:"NED",p:"FW",c:"AS Roma",pr:61.0,num:18,pts:25.9,own:36.6},
{id:773,n:"BROBBEY",t:"NED",p:"FW",c:"Sunderland",pr:32.5,num:19,pts:12.4,own:26.1},
{id:774,n:"KOOPMEINERS",t:"NED",p:"MF",c:"Juventus",pr:75.5,num:20,pts:27.0,own:44.4},
{id:775,n:"F. DE JONG",t:"NED",p:"MF",c:"Barcelona",pr:79.5,num:21,pts:32.5,own:46.5},
{id:776,n:"DUMFRIES",t:"NED",p:"DF",c:"Inter",pr:60.5,num:22,pts:23.3,own:36.7},
{id:777,n:"FLEKKEN",t:"NED",p:"GK",c:"Leverkusen",pr:41.5,num:23,pts:17.9,own:35.5},
{id:778,n:"SUMMERVILLE",t:"NED",p:"FW",c:"West Ham",pr:57.5,num:24,pts:24.3,own:33.1},
{id:779,n:"HATO",t:"NED",p:"DF",c:"Chelsea",pr:52.5,num:25,pts:19.4,own:32.0},
{id:780,n:"Q. TIMBER",t:"NED",p:"MF",c:"Olympique Marseill",pr:50.5,num:26,pts:20.1,own:28.4},
{id:781,n:"CROCOMBE",t:"NZL",p:"GK",c:"Millwall",pr:20.5,num:1,pts:7.7,own:21.6},
{id:782,n:"PAYNE",t:"NZL",p:"DF",c:"Wellington Phoenix",pr:25.5,num:2,pts:9.5,own:18.8},
{id:783,n:"DE VRIES",t:"NZL",p:"DF",c:"Auckland",pr:25.5,num:3,pts:9.5,own:15.4},
{id:784,n:"BINDON",t:"NZL",p:"DF",c:"Sheffield United",pr:28.0,num:4,pts:12.2,own:27.1},
{id:785,n:"BOXALL",t:"NZL",p:"DF",c:"Minnesota United",pr:20.5,num:5,pts:7.3,own:19.1},
{id:786,n:"BELL",t:"NZL",p:"MF",c:"Viking Stavanger",pr:32.5,num:6,pts:11.9,own:29.1},
{id:787,n:"GARBETT",t:"NZL",p:"MF",c:"Peterborough Unite",pr:32.0,num:7,pts:11.1,own:23.6},
{id:788,n:"STAMENIC",t:"NZL",p:"MF",c:"Swansea City",pr:34.0,num:8,pts:13.9,own:24.3},
{id:789,n:"WOOD",t:"NZL",p:"FW",c:"Nottingham Forest",pr:45.5,num:9,pts:16.8,own:25.9},
{id:790,n:"SINGH",t:"NZL",p:"MF",c:"Wellington Phoenix",pr:31.5,num:10,pts:10.8,own:26.9},
{id:791,n:"JUST",t:"NZL",p:"MF",c:"Motherwell",pr:34.5,num:11,pts:14.6,own:26.5},
{id:792,n:"PAULSEN",t:"NZL",p:"GK",c:"Lechia Gdańsk",pr:16.0,num:12,pts:6.2,own:10.4},
{id:793,n:"CACACE",t:"NZL",p:"DF",c:"Wrexham",pr:28.0,num:13,pts:11.8,own:21.2},
{id:794,n:"RUFER",t:"NZL",p:"MF",c:"Wellington Phoenix",pr:31.0,num:14,pts:11.8,own:17.0},
{id:795,n:"PIJNAKER",t:"NZL",p:"DF",c:"Auckland",pr:26.5,num:15,pts:10.0,own:14.3},
{id:796,n:"SURMAN",t:"NZL",p:"DF",c:"Portland Timbers",pr:23.5,num:16,pts:8.2,own:13.3},
{id:797,n:"BARBAROUSES",t:"NZL",p:"FW",c:"WS Wanderers",pr:26.0,num:17,pts:10.6,own:25.9},
{id:798,n:"WAINE",t:"NZL",p:"FW",c:"Port Vale",pr:34.5,num:18,pts:13.6,own:25.0},
{id:799,n:"OLD",t:"NZL",p:"MF",c:"AS Saint-Etienne",pr:25.5,num:19,pts:8.7,own:25.3},
{id:800,n:"MCCOWATT",t:"NZL",p:"MF",c:"Silkeborg IF",pr:29.0,num:20,pts:10.9,own:21.0},
{id:801,n:"RANDALL",t:"NZL",p:"FW",c:"Auckland",pr:28.5,num:21,pts:9.5,own:24.1},
{id:802,n:"WOUD",t:"NZL",p:"GK",c:"Auckland",pr:16.5,num:22,pts:5.5,own:11.2},
{id:803,n:"THOMAS",t:"NZL",p:"MF",c:"PEC Zwolle",pr:25.0,num:23,pts:8.4,own:23.2},
{id:804,n:"ELLIOT",t:"NZL",p:"DF",c:"Auckland",pr:26.5,num:24,pts:11.2,own:19.3},
{id:805,n:"BAYLISS",t:"NZL",p:"MF",c:"Newcastle United J",pr:27.0,num:25,pts:10.3,own:21.1},
{id:806,n:"SMITH",t:"NZL",p:"DF",c:"Braintree Town",pr:19.5,num:26,pts:8.2,own:22.9},
{id:807,n:"NYLAND",t:"NOR",p:"GK",c:"Sevilla",pr:28.5,num:1,pts:10.6,own:23.1},
{id:808,n:"THORSBY",t:"NOR",p:"MF",c:"US Cremonese",pr:30.0,num:2,pts:11.9,own:21.7},
{id:809,n:"VASSBAKK AJER",t:"NOR",p:"DF",c:"Brentford",pr:47.0,num:3,pts:16.2,own:27.5},
{id:810,n:"ØSTIGÅRD",t:"NOR",p:"DF",c:"GenoaC",pr:29.5,num:4,pts:11.9,own:17.7},
{id:811,n:"MØLLER WOLFE",t:"NOR",p:"DF",c:"Wolverhampton Wand",pr:28.0,num:5,pts:10.3,own:28.1},
{id:812,n:"BERG",t:"NOR",p:"MF",c:"FK Bodø/Glimt",pr:33.0,num:6,pts:12.6,own:20.0},
{id:813,n:"SØRLOTH",t:"NOR",p:"FW",c:"Atlético",pr:96.5,num:7,pts:40.8,own:61.5},
{id:814,n:"BERGE",t:"NOR",p:"MF",c:"Fulham",pr:56.5,num:8,pts:22.0,own:32.3},
{id:815,n:"BRAUT HAALAND",t:"NOR",p:"FW",c:"Man City",pr:111.0,num:9,pts:41.5,own:65.8},
{id:816,n:"ØDEGAARD",t:"NOR",p:"MF",c:"Arsenal",pr:80.0,num:10,pts:28.3,own:45.8},
{id:817,n:"STRAND LARSEN",t:"NOR",p:"FW",c:"Crystal Palace",pr:60.0,num:11,pts:20.7,own:36.1},
{id:818,n:"TANGVIK",t:"NOR",p:"GK",c:"Hamburger SV",pr:17.0,num:12,pts:7.3,own:21.0},
{id:819,n:"SELVIK",t:"NOR",p:"GK",c:"Watford",pr:17.0,num:13,pts:5.9,own:15.6},
{id:820,n:"AURSNES",t:"NOR",p:"MF",c:"SL Benfica",pr:49.0,num:14,pts:20.8,own:39.2},
{id:821,n:"BJØRKAN",t:"NOR",p:"DF",c:"FK Bodø/Glimt",pr:26.0,num:15,pts:9.2,own:24.4},
{id:822,n:"HOLMGREN",t:"NOR",p:"DF",c:"Torino",pr:46.5,num:16,pts:18.7,own:35.3},
{id:823,n:"HEGGEM",t:"NOR",p:"DF",c:"Bologna",pr:44.5,num:17,pts:16.3,own:30.6},
{id:824,n:"THORSTVEDT",t:"NOR",p:"MF",c:"US Sassuolo",pr:30.5,num:18,pts:11.3,own:28.4},
{id:825,n:"AASGAARD",t:"NOR",p:"MF",c:"Rangers",pr:51.5,num:19,pts:21.5,own:32.4},
{id:826,n:"NUSA",t:"NOR",p:"FW",c:"RB Leipzig",pr:56.5,num:20,pts:21.3,own:28.3},
{id:827,n:"SCHJELDERUP",t:"NOR",p:"MF",c:"SL Benfica",pr:48.0,num:21,pts:20.9,own:26.8},
{id:828,n:"BOBB",t:"NOR",p:"MF",c:"Fulham",pr:47.0,num:22,pts:19.2,own:28.0},
{id:829,n:"HAUGE",t:"NOR",p:"MF",c:"FK Bodø/Glimt",pr:30.0,num:23,pts:12.4,own:25.1},
{id:830,n:"LANGÅS",t:"NOR",p:"DF",c:"Derby County",pr:25.5,num:24,pts:9.9,own:23.1},
{id:831,n:"FALCHENER",t:"NOR",p:"DF",c:"Viking Stavanger",pr:24.5,num:25,pts:10.4,own:26.8},
{id:832,n:"RYERSON",t:"NOR",p:"FW",c:"Dortmund",pr:80.5,num:26,pts:30.1,own:48.7},
{id:833,n:"MEJÍA",t:"PAN",p:"GK",c:"Club Nacional",pr:16.0,num:1,pts:5.2,own:22.7},
{id:834,n:"BLACKMAN",t:"PAN",p:"DF",c:"ŠK Slovan Bratisla",pr:27.5,num:2,pts:9.5,own:13.9},
{id:835,n:"CORDOBA",t:"PAN",p:"DF",c:"Norwich City",pr:28.0,num:3,pts:10.0,own:28.8},
{id:836,n:"F. ESCOBAR",t:"PAN",p:"DF",c:"Deportivo Saprissa",pr:26.0,num:4,pts:10.4,own:16.6},
{id:837,n:"FARIÑA",t:"PAN",p:"DF",c:"Pari Nizhny Novgor",pr:29.0,num:5,pts:11.6,own:28.2},
{id:838,n:"MARTÍNEZ",t:"PAN",p:"MF",c:"Hapoel Kiryat Shmo",pr:35.0,num:6,pts:15.2,own:28.3},
{id:839,n:"J.L. RODRÍGUEZ",t:"PAN",p:"MF",c:"Juárez",pr:33.0,num:7,pts:12.8,own:24.3},
{id:840,n:"CARRASQUILLA",t:"PAN",p:"MF",c:"Pumas UNAM",pr:35.0,num:8,pts:15.2,own:31.8},
{id:841,n:"T. RODRÍGUEZ",t:"PAN",p:"FW",c:"Deportivo Saprissa",pr:34.5,num:9,pts:11.2,own:20.4},
{id:842,n:"ISMAEL",t:"PAN",p:"MF",c:"Club León",pr:35.0,num:10,pts:15.2,own:32.4},
{id:843,n:"BÁRCENAS",t:"PAN",p:"MF",c:"Mazatlán",pr:28.5,num:11,pts:10.0,own:16.1},
{id:844,n:"SAMUDIO",t:"PAN",p:"GK",c:"CD Marathón",pr:16.5,num:12,pts:7.0,own:16.9},
{id:845,n:"RAMOS",t:"PAN",p:"DF",c:"Puerto Cabello",pr:27.5,num:13,pts:11.1,own:15.8},
{id:846,n:"HARVEY",t:"PAN",p:"DF",c:"Minnesota United",pr:26.5,num:14,pts:10.1,own:23.6},
{id:847,n:"DAVIS",t:"PAN",p:"DF",c:"CD Plaza Amador",pr:21.0,num:15,pts:9.1,own:25.0},
{id:848,n:"ANDRADE",t:"PAN",p:"DF",c:"LASK Linz",pr:25.5,num:16,pts:8.9,own:22.9},
{id:849,n:"FAJARDO",t:"PAN",p:"FW",c:"CD Universidad Cat",pr:32.5,num:17,pts:14.2,own:24.5},
{id:850,n:"WATERMAN",t:"PAN",p:"FW",c:"CD Universidad De ",pr:24.0,num:18,pts:8.1,own:19.8},
{id:851,n:"QUINTERO",t:"PAN",p:"MF",c:"CD Plaza Amador",pr:22.0,num:19,pts:8.5,own:20.8},
{id:852,n:"GODOY",t:"PAN",p:"MF",c:"San Diego",pr:20.5,num:20,pts:6.9,own:12.7},
{id:853,n:"YANIS",t:"PAN",p:"MF",c:"CD Cobresal",pr:27.0,num:21,pts:10.8,own:28.3},
{id:854,n:"MOSQUERA",t:"PAN",p:"GK",c:"Al Fayha",pr:16.5,num:22,pts:7.2,own:22.9},
{id:855,n:"A. MURILLO",t:"PAN",p:"DF",c:"Beşiktaş JK",pr:39.5,num:23,pts:15.8,own:25.3},
{id:856,n:"LONDOÑO",t:"PAN",p:"FW",c:"CD Universidad Cat",pr:32.5,num:24,pts:12.5,own:17.8},
{id:857,n:"MILLER",t:"PAN",p:"DF",c:"Turan Tovuz",pr:18.5,num:25,pts:7.1,own:11.1},
{id:858,n:"GUTIÉRREZ",t:"PAN",p:"DF",c:"Deportivo La Guair",pr:25.5,num:26,pts:10.1,own:16.2},
{id:859,n:"FERNANDEZ",t:"PAR",p:"GK",c:"Cerro Porteño",pr:16.5,num:1,pts:5.6,own:20.1},
{id:860,n:"VELAZQUEZ",t:"PAR",p:"DF",c:"Cerro Porteño",pr:22.5,num:2,pts:9.8,own:25.2},
{id:861,n:"ALDERETE",t:"PAR",p:"DF",c:"Sunderland",pr:30.0,num:3,pts:13.0,own:28.0},
{id:862,n:"CACERES",t:"PAR",p:"DF",c:"Dynamo Moscow",pr:28.0,num:4,pts:10.2,own:18.3},
{id:863,n:"BALBUENA",t:"PAR",p:"DF",c:"Grêmio FBPA",pr:20.0,num:5,pts:6.7,own:12.0},
{id:864,n:"ALONSO",t:"PAR",p:"DF",c:"Atlético Mineiro",pr:20.0,num:6,pts:6.7,own:20.2},
{id:865,n:"SOSA",t:"PAR",p:"MF",c:"SE Palmeiras",pr:32.0,num:7,pts:11.2,own:20.0},
{id:866,n:"D. GOMEZ",t:"PAR",p:"MF",c:"Brighton",pr:53.5,num:8,pts:22.1,own:35.7},
{id:867,n:"SANABRIA",t:"PAR",p:"FW",c:"US Cremonese",pr:34.5,num:9,pts:14.8,own:22.1},
{id:868,n:"M. ALMIRON",t:"PAR",p:"MF",c:"Atlanta United",pr:31.0,num:10,pts:13.1,own:19.9},
{id:869,n:"MAURICIO",t:"PAR",p:"MF",c:"SE Palmeiras",pr:32.0,num:11,pts:11.4,own:22.1},
{id:870,n:"O. GILL",t:"PAR",p:"GK",c:"CA San Lorenzo",pr:16.5,num:12,pts:5.6,own:11.4},
{id:871,n:"CANALE",t:"PAR",p:"DF",c:"CA Lanús",pr:27.0,num:13,pts:10.8,own:26.5},
{id:872,n:"CUBAS",t:"PAR",p:"MF",c:"Vancouver Whitecap",pr:27.0,num:14,pts:9.5,own:26.0},
{id:873,n:"G. GOMEZ",t:"PAR",p:"DF",c:"SE Palmeiras",pr:20.0,num:15,pts:7.8,own:11.8},
{id:874,n:"BOBADILLA",t:"PAR",p:"MF",c:"São Paulo",pr:30.0,num:16,pts:10.8,own:21.9},
{id:875,n:"R. GAMARRA",t:"PAR",p:"FW",c:"Al Ain",pr:30.0,num:17,pts:10.7,own:21.3},
{id:876,n:"ARCE",t:"PAR",p:"FW",c:"CS Independiente R",pr:30.5,num:18,pts:11.3,own:17.2},
{id:877,n:"ENCISO",t:"PAR",p:"FW",c:"RC Strasbourg",pr:49.0,num:19,pts:17.0,own:25.9},
{id:878,n:"OJEDA",t:"PAR",p:"MF",c:"Orlando City SC",pr:30.5,num:20,pts:12.9,own:16.1},
{id:879,n:"AVALOS",t:"PAR",p:"FW",c:"CA Independiente",pr:25.0,num:21,pts:10.4,own:19.1},
{id:880,n:"OLVEIRA",t:"PAR",p:"GK",c:"Club Olimpia",pr:12.5,num:22,pts:4.2,own:13.6},
{id:881,n:"GALARZA",t:"PAR",p:"MF",c:"Atlanta United",pr:29.0,num:23,pts:10.9,own:15.1},
{id:882,n:"CABALLERO",t:"PAR",p:"MF",c:"Portsmouth",pr:29.0,num:24,pts:10.8,own:14.9},
{id:883,n:"PITTA",t:"PAR",p:"FW",c:"Red Bull Bragantin",pr:31.0,num:25,pts:10.5,own:15.6},
{id:884,n:"MAIDANA",t:"PAR",p:"DF",c:"CA Talleres",pr:20.0,num:26,pts:6.7,own:22.2},
{id:885,n:"DIOGO COSTA",t:"POR",p:"GK",c:"Porto",pr:37.0,num:1,pts:12.2,own:29.9},
{id:886,n:"N. SEMEDO",t:"POR",p:"DF",c:"Fenerbahçe SK",pr:43.5,num:2,pts:16.2,own:34.3},
{id:887,n:"RÚBEN DIAS",t:"POR",p:"DF",c:"Man City",pr:80.0,num:3,pts:30.3,own:44.4},
{id:888,n:"TOMÁS A.",t:"POR",p:"DF",c:"SL Benfica",pr:46.0,num:4,pts:15.1,own:24.9},
{id:889,n:"DALOT",t:"POR",p:"DF",c:"Man Utd",pr:67.5,num:5,pts:22.0,own:34.1},
{id:890,n:"MATHEUS N.",t:"POR",p:"MF",c:"Man City",pr:77.5,num:6,pts:25.1,own:43.8},
{id:891,n:"RONALDO",t:"POR",p:"FW",c:"Al Nassr",pr:58.5,num:7,pts:24.3,own:39.0},
{id:892,n:"B. FERNANDES",t:"POR",p:"MF",c:"Man Utd",pr:76.5,num:8,pts:31.3,own:38.3},
{id:893,n:"G. RAMOS",t:"POR",p:"FW",c:"PSG",pr:95.0,num:9,pts:39.7,own:57.6},
{id:894,n:"BERNARDO",t:"POR",p:"MF",c:"Man City",pr:72.5,num:10,pts:25.8,own:44.3},
{id:895,n:"JOÃO FÉLIX",t:"POR",p:"FW",c:"Al Nassr",pr:59.5,num:11,pts:20.1,own:40.5},
{id:896,n:"JOSÉ SÁ",t:"POR",p:"GK",c:"Wolverhampton Wand",pr:12.0,num:12,pts:3.9,own:16.0},
{id:897,n:"RENATO VEIGA",t:"POR",p:"DF",c:"Villarreal",pr:41.0,num:13,pts:14.8,own:34.8},
{id:898,n:"G. INÁCIO",t:"POR",p:"DF",c:"Sporting CP",pr:46.0,num:14,pts:18.3,own:37.4},
{id:899,n:"JOÃO NEVES",t:"POR",p:"MF",c:"PSG",pr:66.5,num:15,pts:21.5,own:45.0},
{id:900,n:"TRINCÃO",t:"POR",p:"FW",c:"Sporting CP",pr:59.5,num:16,pts:23.8,own:35.5},
{id:901,n:"RAFA LEÃO",t:"POR",p:"FW",c:"AC Milan",pr:85.5,num:17,pts:32.8,own:50.9},
{id:902,n:"NETO",t:"POR",p:"FW",c:"Chelsea",pr:87.5,num:18,pts:35.4,own:53.4},
{id:903,n:"G. GUEDES",t:"POR",p:"FW",c:"Real Sociedad",pr:56.0,num:19,pts:22.3,own:41.2},
{id:904,n:"JOÃO CANCELO",t:"POR",p:"DF",c:"Barcelona",pr:60.0,num:20,pts:25.9,own:40.6},
{id:905,n:"R. NEVES",t:"POR",p:"MF",c:"Al Hilal SC",pr:52.5,num:21,pts:22.7,own:28.7},
{id:906,n:"RUI SILVA",t:"POR",p:"GK",c:"Sporting CP",pr:27.5,num:22,pts:11.3,own:21.9},
{id:907,n:"VITINHA",t:"POR",p:"MF",c:"PSG",pr:72.0,num:23,pts:26.4,own:42.9},
{id:908,n:"SAMÚ",t:"POR",p:"DF",c:"RCD Mallorca",pr:25.5,num:24,pts:9.8,own:14.9},
{id:909,n:"N. MENDES",t:"POR",p:"DF",c:"PSG",pr:59.0,num:25,pts:23.4,own:31.6},
{id:910,n:"F. CONCEIÇÃO",t:"POR",p:"FW",c:"Juventus",pr:78.0,num:26,pts:33.0,own:51.8},
{id:911,n:"ABUNADA",t:"QAT",p:"GK",c:"Al Rayyan SC",pr:23.5,num:1,pts:9.5,own:13.5},
{id:912,n:"PEDRO",t:"QAT",p:"DF",c:"Al Sadd SC",pr:20.5,num:2,pts:7.0,own:13.9},
{id:913,n:"L.MENDES",t:"QAT",p:"DF",c:"Al Wakrah SC",pr:21.0,num:3,pts:8.1,own:16.9},
{id:914,n:"GUEYE",t:"QAT",p:"DF",c:"Al Arabi SC",pr:28.5,num:4,pts:10.7,own:18.2},
{id:915,n:"JASSEM",t:"QAT",p:"DF",c:"Al Rayyan SC",pr:27.5,num:5,pts:9.3,own:25.7},
{id:916,n:"A. AZIZ",t:"QAT",p:"MF",c:"Al Rayyan SC",pr:23.5,num:6,pts:8.0,own:23.2},
{id:917,n:"ALAAELDIN",t:"QAT",p:"FW",c:"Al Rayyan SC",pr:28.0,num:7,pts:11.8,own:25.2},
{id:918,n:"EDMILSON JR.",t:"QAT",p:"FW",c:"Al Duhail SC",pr:31.5,num:8,pts:10.6,own:23.2},
{id:919,n:"MUNTARI",t:"QAT",p:"FW",c:"Al Gharafa SC",pr:32.0,num:9,pts:11.2,own:27.9},
{id:920,n:"ALHAYDOS",t:"QAT",p:"FW",c:"Al Sadd SC",pr:27.0,num:10,pts:10.0,own:15.3},
{id:921,n:"AFIF",t:"QAT",p:"FW",c:"Al Sadd SC",pr:35.5,num:11,pts:12.5,own:30.0},
{id:922,n:"KARIM",t:"QAT",p:"MF",c:"Al Duhail SC",pr:23.5,num:12,pts:9.7,own:12.5},
{id:923,n:"AYOUB",t:"QAT",p:"DF",c:"Al Gharafa SC",pr:25.5,num:13,pts:10.5,own:14.4},
{id:924,n:"HOMAM",t:"QAT",p:"DF",c:"Cultural Leonesa",pr:27.5,num:14,pts:11.2,own:23.1},
{id:925,n:"YUSUF",t:"QAT",p:"FW",c:"Al Wakrah SC",pr:34.0,num:15,pts:12.9,own:29.4},
{id:926,n:"KHOUKHI",t:"QAT",p:"DF",c:"Al Sadd SC",pr:20.5,num:16,pts:8.5,own:10.5},
{id:927,n:"A. ALGANEHI",t:"QAT",p:"MF",c:"Al Gharafa SC",pr:29.5,num:17,pts:9.9,own:19.3},
{id:928,n:"SULTAN",t:"QAT",p:"DF",c:"Al Duhail SC",pr:25.0,num:18,pts:10.4,own:26.1},
{id:929,n:"ALMOEZ",t:"QAT",p:"FW",c:"Al Duhail SC",pr:30.5,num:19,pts:10.0,own:23.7},
{id:930,n:"A. FATHY",t:"QAT",p:"MF",c:"Al Arabi SC",pr:20.5,num:20,pts:6.9,own:21.0},
{id:931,n:"SALAH",t:"QAT",p:"GK",c:"Al Duhail SC",pr:19.0,num:21,pts:7.5,own:16.3},
{id:932,n:"BARSHAM",t:"QAT",p:"GK",c:"Al Sadd SC",pr:18.0,num:22,pts:7.5,own:12.6},
{id:933,n:"MADIBO",t:"QAT",p:"MF",c:"Al Wakrah SC",pr:27.5,num:23,pts:8.9,own:22.0},
{id:934,n:"TAHSIN",t:"QAT",p:"FW",c:"Al Duhail SC",pr:26.5,num:24,pts:9.5,own:21.8},
{id:935,n:"ALHASHMI",t:"QAT",p:"DF",c:"Al Arabi SC",pr:24.5,num:25,pts:10.4,own:22.9},
{id:936,n:"MANAI",t:"QAT",p:"FW",c:"Al Shamal SC",pr:30.0,num:26,pts:11.6,own:17.8},
{id:937,n:"ALAQIDI",t:"KSA",p:"GK",c:"Al Nassr",pr:40.0,num:1,pts:16.2,own:25.9},
{id:938,n:"MAJRASHI",t:"KSA",p:"DF",c:"Al Ahli",pr:48.5,num:2,pts:18.2,own:28.7},
{id:939,n:"LAJAMI",t:"KSA",p:"DF",c:"Al Hilal SC",pr:42.5,num:3,pts:14.9,own:33.0},
{id:940,n:"ALAMRI",t:"KSA",p:"DF",c:"Al Nassr",pr:49.0,num:4,pts:18.9,own:36.0},
{id:941,n:"ALTAMBAKTI",t:"KSA",p:"DF",c:"Al Hilal SC",pr:49.0,num:5,pts:19.0,own:29.7},
{id:942,n:"NASSER",t:"KSA",p:"MF",c:"Al Hilal SC",pr:57.5,num:6,pts:23.2,own:32.3},
{id:943,n:"MUSAB",t:"KSA",p:"MF",c:"Al Qadsiah",pr:49.5,num:7,pts:17.0,own:34.3},
{id:944,n:"AIMAN",t:"KSA",p:"FW",c:"Al Nassr",pr:61.5,num:8,pts:22.6,own:32.4},
{id:945,n:"FERAS",t:"KSA",p:"FW",c:"Al Ahli",pr:60.5,num:9,pts:21.6,own:43.8},
{id:946,n:"SALEM",t:"KSA",p:"FW",c:"Al Hilal SC",pr:47.5,num:10,pts:19.6,own:32.3},
{id:947,n:"ALSHEHRI",t:"KSA",p:"FW",c:"Al Ittihad",pr:58.0,num:11,pts:23.8,own:34.8},
{id:948,n:"SAUD",t:"KSA",p:"DF",c:"RC Lens",pr:44.5,num:12,pts:16.1,own:36.3},
{id:949,n:"NAWAF",t:"KSA",p:"DF",c:"Al Nassr",pr:44.0,num:13,pts:15.4,own:23.3},
{id:950,n:"KADISH",t:"KSA",p:"DF",c:"Al Ittihad",pr:34.0,num:14,pts:13.5,own:19.6},
{id:951,n:"ALKHAIBARI",t:"KSA",p:"MF",c:"Al Nassr",pr:50.0,num:15,pts:16.8,own:37.3},
{id:952,n:"ZIYAD",t:"KSA",p:"MF",c:"Al Ahli",pr:55.0,num:16,pts:23.4,own:28.4},
{id:953,n:"KHALID",t:"KSA",p:"FW",c:"Al Ettifaq",pr:34.5,num:17,pts:13.4,own:21.2},
{id:954,n:"ALHAJJI",t:"KSA",p:"MF",c:"Neom SC",pr:27.5,num:18,pts:10.1,own:26.3},
{id:955,n:"ALHAMDDAN",t:"KSA",p:"FW",c:"Al Nassr",pr:58.0,num:19,pts:24.9,own:34.4},
{id:956,n:"MANDASH",t:"KSA",p:"FW",c:"Al Hilal SC",pr:47.0,num:20,pts:15.7,own:25.2},
{id:957,n:"ALOWAIS",t:"KSA",p:"GK",c:"Al Ula Saudi",pr:12.5,num:21,pts:4.3,own:13.8},
{id:958,n:"ALKASSAR",t:"KSA",p:"GK",c:"Al Qadsiah",pr:23.0,num:22,pts:9.6,own:25.5},
{id:959,n:"KANNO",t:"KSA",p:"MF",c:"Al Hilal SC",pr:42.0,num:23,pts:13.9,own:25.6},
{id:960,n:"MOTEB",t:"KSA",p:"DF",c:"Al Hilal SC",pr:41.5,num:24,pts:14.7,own:27.1},
{id:961,n:"JEHAD",t:"KSA",p:"DF",c:"Al Qadsiah",pr:44.5,num:25,pts:18.6,own:30.6},
{id:962,n:"MOHAMMED",t:"KSA",p:"DF",c:"Al Qadsiah",pr:39.0,num:26,pts:14.2,own:33.1},
{id:963,n:"GUNN",t:"SCO",p:"GK",c:"Nottingham Forest",pr:33.5,num:1,pts:11.3,own:24.8},
{id:964,n:"HICKEY",t:"SCO",p:"DF",c:"Brentford",pr:44.5,num:2,pts:16.9,own:28.2},
{id:965,n:"ROBERTSON",t:"SCO",p:"DF",c:"Liverpool",pr:67.5,num:3,pts:29.0,own:45.1},
{id:966,n:"MCTOMINAY",t:"SCO",p:"MF",c:"Napoli",pr:80.5,num:4,pts:28.8,own:52.1},
{id:967,n:"HANLEY",t:"SCO",p:"DF",c:"Hibernian",pr:21.0,num:5,pts:7.8,own:14.4},
{id:968,n:"TIERNEY",t:"SCO",p:"DF",c:"Celtic",pr:49.0,num:6,pts:19.0,own:33.1},
{id:969,n:"MCGINN",t:"SCO",p:"MF",c:"Aston Villa",pr:53.0,num:7,pts:22.6,own:35.6},
{id:970,n:"FLETCHER",t:"SCO",p:"MF",c:"Man Utd",pr:69.5,num:8,pts:26.7,own:46.7},
{id:971,n:"DYKES",t:"SCO",p:"FW",c:"Charlton Athletic",pr:32.5,num:9,pts:12.0,own:18.8},
{id:972,n:"ADAMS",t:"SCO",p:"FW",c:"Torino",pr:64.0,num:10,pts:26.2,own:43.4},
{id:973,n:"CHRISTIE",t:"SCO",p:"MF",c:"ABournemouth",pr:52.0,num:11,pts:21.5,own:38.6},
{id:974,n:"KELLY",t:"SCO",p:"GK",c:"Rangers",pr:26.0,num:12,pts:9.2,own:15.4},
{id:975,n:"HENDRY",t:"SCO",p:"DF",c:"Al Ettifaq",pr:24.0,num:13,pts:9.3,own:26.9},
{id:976,n:"STEWART",t:"SCO",p:"FW",c:"Southampton",pr:34.5,num:14,pts:13.5,own:23.5},
{id:977,n:"SOUTTAR",t:"SCO",p:"DF",c:"Rangers",pr:47.0,num:15,pts:19.5,own:36.2},
{id:978,n:"HYAM",t:"SCO",p:"DF",c:"Wrexham",pr:23.0,num:16,pts:7.9,own:16.5},
{id:979,n:"GANNON DOAK",t:"SCO",p:"FW",c:"ABournemouth",pr:50.5,num:17,pts:20.7,own:40.2},
{id:980,n:"HIRST",t:"SCO",p:"FW",c:"Ipswich Town",pr:35.5,num:18,pts:14.9,own:30.8},
{id:981,n:"FERGUSON",t:"SCO",p:"MF",c:"Bologna",pr:47.5,num:19,pts:16.2,own:32.7},
{id:982,n:"SHANKLAND",t:"SCO",p:"FW",c:"Heart Of Midlothia",pr:31.0,num:20,pts:13.5,own:24.9},
{id:983,n:"GORDON",t:"SCO",p:"GK",c:"Heart Of Midlothia",pr:13.5,num:21,pts:5.0,own:11.4},
{id:984,n:"PATTERSON",t:"SCO",p:"DF",c:"Everton",pr:44.5,num:22,pts:18.7,own:28.4},
{id:985,n:"MCLEAN",t:"SCO",p:"MF",c:"Norwich City",pr:21.0,num:23,pts:7.6,own:18.4},
{id:986,n:"RALSTON",t:"SCO",p:"DF",c:"Celtic",pr:45.5,num:24,pts:19.9,own:30.0},
{id:987,n:"CURTIS",t:"SCO",p:"FW",c:"Kilmarnock",pr:28.5,num:25,pts:12.0,own:22.9},
{id:988,n:"MCKENNA",t:"SCO",p:"DF",c:"GNK Dinamo Zagreb",pr:25.5,num:26,pts:10.0,own:15.3},
{id:989,n:"Y. DIOUF",t:"SEN",p:"GK",c:"OGC Nice",pr:39.5,num:1,pts:15.6,own:20.4},
{id:990,n:"SARR",t:"SEN",p:"DF",c:"Chelsea",pr:58.5,num:2,pts:21.0,own:43.1},
{id:991,n:"KOULIBALY",t:"SEN",p:"DF",c:"Al Hilal SC",pr:40.0,num:3,pts:14.8,own:29.1},
{id:992,n:"SECK",t:"SEN",p:"DF",c:"Maccabi Haifa",pr:21.0,num:4,pts:8.0,own:21.2},
{id:993,n:"GANA",t:"SEN",p:"MF",c:"Everton",pr:41.5,num:5,pts:15.7,own:30.7},
{id:994,n:"P.I. CISS",t:"SEN",p:"MF",c:"Rayo Vallecano",pr:30.0,num:6,pts:11.7,own:25.8},
{id:995,n:"DIAO",t:"SEN",p:"FW",c:"Como",pr:50.0,num:7,pts:17.1,own:39.7},
{id:996,n:"LAMINE",t:"SEN",p:"MF",c:"AS Monaco",pr:48.5,num:8,pts:15.9,own:34.2},
{id:997,n:"B. DIENG",t:"SEN",p:"FW",c:"Lorient",pr:38.5,num:9,pts:16.5,own:34.2},
{id:998,n:"MANÉ",t:"SEN",p:"FW",c:"Al Nassr",pr:52.0,num:10,pts:20.4,own:28.1},
{id:999,n:"JACKSON",t:"SEN",p:"FW",c:"Bayern",pr:105.0,num:11,pts:42.5,own:61.1},
{id:1000,n:"CHERIF",t:"SEN",p:"FW",c:"Samsunspor",pr:31.5,num:12,pts:12.6,own:28.4},
{id:1001,n:"NDIAYE",t:"SEN",p:"FW",c:"Everton",pr:59.5,num:13,pts:24.1,own:31.0},
{id:1002,n:"JAKOBS",t:"SEN",p:"DF",c:"Galatasaray SK",pr:48.0,num:14,pts:20.9,own:26.9},
{id:1003,n:"KRÉPIN",t:"SEN",p:"DF",c:"AS Monaco",pr:46.0,num:15,pts:18.3,own:24.8},
{id:1004,n:"MENDY",t:"SEN",p:"GK",c:"Al Ahli",pr:23.5,num:16,pts:10.3,own:19.2},
{id:1005,n:"P.M. SARR",t:"SEN",p:"MF",c:"Tottenham",pr:67.5,num:17,pts:22.9,own:48.0},
{id:1006,n:"SARR",t:"SEN",p:"FW",c:"Crystal Palace",pr:58.5,num:18,pts:22.7,own:35.5},
{id:1007,n:"NIAKHATE",t:"SEN",p:"DF",c:"Olympique Lyonnais",pr:40.0,num:19,pts:16.8,own:26.9},
{id:1008,n:"MBAYE",t:"SEN",p:"FW",c:"PSG",pr:64.5,num:20,pts:21.5,own:34.7},
{id:1009,n:"H. DIARRA",t:"SEN",p:"MF",c:"Sunderland",pr:26.0,num:21,pts:9.0,own:13.5},
{id:1010,n:"BARA",t:"SEN",p:"MF",c:"Bayern",pr:58.5,num:22,pts:19.7,own:34.7},
{id:1011,n:"DIAW",t:"SEN",p:"GK",c:"Le Havre AC",pr:15.5,num:23,pts:5.9,own:21.8},
{id:1012,n:"A. MENDY",t:"SEN",p:"DF",c:"OGC Nice",pr:41.5,num:24,pts:17.9,own:21.0},
{id:1013,n:"DIOUF",t:"SEN",p:"DF",c:"West Ham",pr:39.0,num:25,pts:14.5,own:25.5},
{id:1014,n:"GUEYE",t:"SEN",p:"MF",c:"Villarreal",pr:49.5,num:26,pts:18.6,own:25.2},
{id:1015,n:"WILLIAMS",t:"RSA",p:"GK",c:"Mamelodi Sundowns",pr:16.5,num:1,pts:5.6,own:16.9},
{id:1016,n:"MATULUDI",t:"RSA",p:"DF",c:"Polokwane City",pr:27.0,num:2,pts:8.8,own:25.6},
{id:1017,n:"NDAMANE",t:"RSA",p:"DF",c:"Mamelodi Sundowns",pr:26.0,num:3,pts:9.5,own:13.1},
{id:1018,n:"MOKOENA",t:"RSA",p:"MF",c:"Mamelodi Sundowns",pr:34.5,num:4,pts:14.8,own:24.9},
{id:1019,n:"MBATHA",t:"RSA",p:"MF",c:"Orlando Pirates",pr:31.0,num:5,pts:10.1,own:17.6},
{id:1020,n:"MODIBA",t:"RSA",p:"DF",c:"Mamelodi Sundowns",pr:25.5,num:6,pts:9.4,own:20.7},
{id:1021,n:"APPOLLIS",t:"RSA",p:"FW",c:"Orlando Pirates",pr:34.5,num:7,pts:11.3,own:20.5},
{id:1022,n:"MOREMI",t:"RSA",p:"FW",c:"Orlando Pirates",pr:37.0,num:8,pts:14.4,own:26.3},
{id:1023,n:"FOSTER",t:"RSA",p:"FW",c:"Burnley",pr:38.0,num:9,pts:15.8,own:32.4},
{id:1024,n:"MOFOKENG",t:"RSA",p:"FW",c:"Orlando Pirates",pr:31.5,num:10,pts:10.2,own:26.1},
{id:1025,n:"ZWANE",t:"RSA",p:"MF",c:"Mamelodi Sundowns",pr:24.5,num:11,pts:9.3,own:21.2},
{id:1026,n:"MASEKO",t:"RSA",p:"FW",c:"AEL Limassol",pr:30.0,num:12,pts:10.2,own:28.2},
{id:1027,n:"SITHOLE",t:"RSA",p:"MF",c:"CD Tondela",pr:31.0,num:13,pts:11.9,own:26.6},
{id:1028,n:"MBOKAZI",t:"RSA",p:"DF",c:"Chicago Fire",pr:21.5,num:14,pts:7.5,own:20.3},
{id:1029,n:"RAYNERS",t:"RSA",p:"FW",c:"Mamelodi Sundowns",pr:31.0,num:15,pts:11.8,own:23.2},
{id:1030,n:"CHAINE",t:"RSA",p:"GK",c:"Orlando Pirates",pr:18.5,num:16,pts:7.9,own:23.2},
{id:1031,n:"MAKGPA",t:"RSA",p:"FW",c:"Orlando Pirates",pr:35.0,num:17,pts:14.0,own:23.9},
{id:1032,n:"KABINI",t:"RSA",p:"DF",c:"Molde FK",pr:25.0,num:18,pts:9.8,own:14.8},
{id:1033,n:"SIBISI",t:"RSA",p:"DF",c:"Orlando Pirates",pr:24.0,num:19,pts:10.2,own:16.9},
{id:1034,n:"MUDAU",t:"RSA",p:"DF",c:"Mamelodi Sundowns",pr:23.5,num:20,pts:9.6,own:24.4},
{id:1035,n:"OKON",t:"RSA",p:"DF",c:"Hannover 96",pr:23.5,num:21,pts:9.3,own:20.8},
{id:1036,n:"GOSS",t:"RSA",p:"GK",c:"Siwelele",pr:15.5,num:22,pts:5.9,own:18.6},
{id:1037,n:"ADAMS",t:"RSA",p:"MF",c:"Mamelodi Sundowns",pr:30.5,num:23,pts:13.1,own:16.2},
{id:1038,n:"MAKHANYA",t:"RSA",p:"DF",c:"Philadelphia Union",pr:23.0,num:24,pts:8.5,own:20.9},
{id:1039,n:"SEBELEBELE",t:"RSA",p:"FW",c:"Orlando Pirates",pr:28.5,num:25,pts:9.7,own:15.5},
{id:1040,n:"CROSS",t:"RSA",p:"DF",c:"Kaizer Chiefs",pr:24.5,num:26,pts:8.8,own:14.2},
{id:1041,n:"RAYA",t:"ESP",p:"GK",c:"Arsenal",pr:53.5,num:1,pts:22.4,own:34.1},
{id:1042,n:"MARC PUBILL",t:"ESP",p:"DF",c:"Atlético",pr:66.5,num:2,pts:26.1,own:38.5},
{id:1043,n:"GRIMALDO",t:"ESP",p:"DF",c:"Leverkusen",pr:66.0,num:3,pts:26.8,own:37.7},
{id:1044,n:"ERIC",t:"ESP",p:"DF",c:"Barcelona",pr:67.5,num:4,pts:22.3,own:37.8},
{id:1045,n:"M. LLORENTE",t:"ESP",p:"DF",c:"Atlético",pr:65.0,num:5,pts:25.7,own:46.8},
{id:1046,n:"MERINO",t:"ESP",p:"MF",c:"Arsenal",pr:78.5,num:6,pts:26.1,own:46.7},
{id:1047,n:"FERRAN",t:"ESP",p:"FW",c:"Barcelona",pr:87.5,num:7,pts:29.5,own:56.6},
{id:1048,n:"FABIÁN",t:"ESP",p:"MF",c:"PSG",pr:74.0,num:8,pts:28.0,own:41.9},
{id:1049,n:"GAVI",t:"ESP",p:"MF",c:"Barcelona",pr:90.5,num:9,pts:32.8,own:49.7},
{id:1050,n:"OLMO",t:"ESP",p:"FW",c:"Barcelona",pr:89.5,num:10,pts:32.1,own:57.4},
{id:1051,n:"YEREMY",t:"ESP",p:"FW",c:"Crystal Palace",pr:55.5,num:11,pts:19.6,own:38.3},
{id:1052,n:"PEDRO PORRO",t:"ESP",p:"DF",c:"Tottenham",pr:70.0,num:12,pts:30.2,own:39.3},
{id:1053,n:"JOAN GARCIA",t:"ESP",p:"GK",c:"Barcelona",pr:43.5,num:13,pts:16.5,own:24.2},
{id:1054,n:"LAPORTE",t:"ESP",p:"DF",c:"Athletic Club",pr:42.5,num:14,pts:17.9,own:31.1},
{id:1055,n:"ALEX B.",t:"ESP",p:"MF",c:"Atlético",pr:75.0,num:15,pts:27.0,own:49.5},
{id:1056,n:"RODRIGO",t:"ESP",p:"MF",c:"Man City",pr:91.5,num:16,pts:32.7,own:52.1},
{id:1057,n:"WILLIAMS JR",t:"ESP",p:"FW",c:"Athletic Club",pr:55.5,num:17,pts:23.3,own:29.8},
{id:1058,n:"ZUBIMENDI",t:"ESP",p:"MF",c:"Arsenal",pr:78.5,num:18,pts:31.7,own:48.7},
{id:1059,n:"LAMINE YAMAL",t:"ESP",p:"FW",c:"Barcelona",pr:81.0,num:19,pts:28.8,own:44.5},
{id:1060,n:"PEDRI",t:"ESP",p:"MF",c:"Barcelona",pr:78.5,num:20,pts:26.8,own:42.2},
{id:1061,n:"OYARZABAL",t:"ESP",p:"FW",c:"Real Sociedad",pr:56.0,num:21,pts:22.3,own:32.9},
{id:1062,n:"CUBARSÍ",t:"ESP",p:"DF",c:"Barcelona",pr:55.0,num:22,pts:22.8,own:42.3},
{id:1063,n:"UNAI SIMÓN",t:"ESP",p:"GK",c:"Athletic Club",pr:29.5,num:23,pts:10.9,own:27.7},
{id:1064,n:"CUCURELLA",t:"ESP",p:"DF",c:"Chelsea",pr:60.5,num:24,pts:20.5,own:31.8},
{id:1065,n:"VICTOR M.V.",t:"ESP",p:"FW",c:"CA Osasuna",pr:30.5,num:25,pts:12.1,own:24.7},
{id:1066,n:"B. IGLESIAS",t:"ESP",p:"FW",c:"RC Celta Vigo",pr:23.5,num:26,pts:8.3,own:15.1},
{id:1067,n:"ZETTERSTRÖM",t:"SWE",p:"GK",c:"Derby County",pr:22.0,num:1,pts:7.6,own:17.6},
{id:1068,n:"LAGERBIELKE",t:"SWE",p:"DF",c:"SC Braga",pr:28.0,num:2,pts:10.1,own:18.1},
{id:1069,n:"LINDELÖF",t:"SWE",p:"DF",c:"Aston Villa",pr:46.0,num:3,pts:20.0,own:31.1},
{id:1070,n:"HIEN",t:"SWE",p:"DF",c:"Atalanta Bergamo",pr:50.5,num:4,pts:21.3,own:25.6},
{id:1071,n:"GUDMUNDSSON",t:"SWE",p:"DF",c:"Leeds United",pr:27.0,num:5,pts:9.0,own:18.3},
{id:1072,n:"H. JOHANSSON",t:"SWE",p:"DF",c:"Dallas",pr:29.0,num:6,pts:11.5,own:18.5},
{id:1073,n:"BERGVALL",t:"SWE",p:"MF",c:"Tottenham",pr:67.0,num:7,pts:23.3,own:40.2},
{id:1074,n:"SVENSSON",t:"SWE",p:"DF",c:"Dortmund",pr:71.0,num:8,pts:26.5,own:38.7},
{id:1075,n:"ISAK",t:"SWE",p:"FW",c:"Liverpool",pr:108.5,num:9,pts:38.4,own:61.8},
{id:1076,n:"NYGREN",t:"SWE",p:"MF",c:"Celtic",pr:56.5,num:10,pts:21.7,own:41.7},
{id:1077,n:"ELANGA",t:"SWE",p:"FW",c:"Newcastle",pr:86.5,num:11,pts:28.2,own:52.6},
{id:1078,n:"V. JOHANSSON",t:"SWE",p:"GK",c:"Stoke City",pr:17.0,num:12,pts:6.1,own:13.1},
{id:1079,n:"SEMA",t:"SWE",p:"MF",c:"Pafos",pr:27.0,num:13,pts:9.5,own:26.2},
{id:1080,n:"EKDAL",t:"SWE",p:"DF",c:"Burnley",pr:26.5,num:14,pts:9.9,own:22.8},
{id:1081,n:"STARFELT",t:"SWE",p:"DF",c:"RC Celta Vigo",pr:23.0,num:15,pts:8.0,own:21.9},
{id:1082,n:"KARLSTRÖM",t:"SWE",p:"MF",c:"Udinese",pr:27.5,num:16,pts:10.5,own:14.0},
{id:1083,n:"GYÖKERES",t:"SWE",p:"FW",c:"Arsenal",pr:89.5,num:17,pts:38.1,own:52.9},
{id:1084,n:"AYARI",t:"SWE",p:"MF",c:"Brighton",pr:49.0,num:18,pts:19.3,own:31.4},
{id:1085,n:"SVANBERG",t:"SWE",p:"MF",c:"VfL Wolfsburg",pr:48.5,num:19,pts:17.4,own:30.5},
{id:1086,n:"SMITH",t:"SWE",p:"DF",c:"St. Pauli",pr:26.5,num:20,pts:11.1,own:19.4},
{id:1087,n:"BERNHARDSSON",t:"SWE",p:"DF",c:"Holstein Kiel",pr:25.5,num:21,pts:10.1,own:16.6},
{id:1088,n:"ZENELI",t:"SWE",p:"MF",c:"Royale Union Saint",pr:27.5,num:22,pts:11.1,own:26.3},
{id:1089,n:"NORDFELDT",t:"SWE",p:"GK",c:"AIK Stockholm",pr:12.0,num:23,pts:3.9,own:10.6},
{id:1090,n:"STROUD",t:"SWE",p:"DF",c:"Mjällby AIF",pr:23.5,num:24,pts:9.0,own:24.6},
{id:1091,n:"NILSSON",t:"SWE",p:"FW",c:"Club Brugge",pr:32.0,num:25,pts:12.0,own:25.7},
{id:1092,n:"ALI",t:"SWE",p:"FW",c:"Malmö FF",pr:32.0,num:26,pts:11.8,own:25.4},
{id:1093,n:"KOBEL",t:"SUI",p:"GK",c:"Dortmund",pr:56.5,num:1,pts:20.9,own:30.0},
{id:1094,n:"MUHEIM",t:"SUI",p:"DF",c:"Hamburger SV",pr:27.5,num:2,pts:9.7,own:25.4},
{id:1095,n:"WIDMER",t:"SUI",p:"DF",c:"1. FSV Mainz 05",pr:37.5,num:3,pts:15.7,own:30.4},
{id:1096,n:"ELVEDI",t:"SUI",p:"DF",c:"Borussia Mönchengl",pr:47.5,num:4,pts:17.0,own:33.8},
{id:1097,n:"AKANJI",t:"SUI",p:"DF",c:"Inter",pr:75.0,num:5,pts:31.5,own:42.0},
{id:1098,n:"ZAKARIA",t:"SUI",p:"MF",c:"AS Monaco",pr:60.5,num:6,pts:24.0,own:40.5},
{id:1099,n:"EMBOLO",t:"SUI",p:"FW",c:"Stade Rennais",pr:67.0,num:7,pts:26.4,own:45.3},
{id:1100,n:"FREULER",t:"SUI",p:"MF",c:"Bologna",pr:42.0,num:8,pts:14.1,own:34.5},
{id:1101,n:"MANZAMBI",t:"SUI",p:"MF",c:"SC Freiburg",pr:48.5,num:9,pts:20.0,own:35.1},
{id:1102,n:"XHAKA",t:"SUI",p:"MF",c:"Sunderland",pr:26.5,num:10,pts:10.9,own:21.6},
{id:1103,n:"NODYE",t:"SUI",p:"FW",c:"Nottingham Forest",pr:63.5,num:11,pts:25.3,own:34.4},
{id:1104,n:"MVOGO",t:"SUI",p:"GK",c:"Lorient",pr:15.5,num:12,pts:5.5,own:18.4},
{id:1105,n:"RODRIGUEZ",t:"SUI",p:"DF",c:"Real Betis",pr:34.0,num:13,pts:13.6,own:18.9},
{id:1106,n:"JASHARI",t:"SUI",p:"MF",c:"AC Milan",pr:73.0,num:14,pts:30.1,own:45.7},
{id:1107,n:"SOW",t:"SUI",p:"MF",c:"Sevilla",pr:54.5,num:15,pts:23.2,own:39.8},
{id:1108,n:"FASSNACHT",t:"SUI",p:"FW",c:"BSC Young Boys",pr:31.5,num:16,pts:12.8,own:29.0},
{id:1109,n:"VARGAS",t:"SUI",p:"FW",c:"Sevilla",pr:62.0,num:17,pts:24.0,own:44.0},
{id:1110,n:"CÖMERT",t:"SUI",p:"DF",c:"Valencia",pr:25.5,num:18,pts:8.7,own:13.6},
{id:1111,n:"OKAFOR",t:"SUI",p:"FW",c:"Leeds United",pr:35.0,num:19,pts:14.1,own:29.1},
{id:1112,n:"AEBISCHER",t:"SUI",p:"MF",c:"Pisa SC",pr:29.5,num:20,pts:10.0,own:22.6},
{id:1113,n:"KELLER",t:"SUI",p:"GK",c:"BSC Young Boys",pr:16.5,num:21,pts:6.5,own:19.9},
{id:1114,n:"RIEDER",t:"SUI",p:"MF",c:"Augsburg",pr:51.5,num:22,pts:21.6,own:29.2},
{id:1115,n:"AMDOUNI",t:"SUI",p:"FW",c:"Burnley",pr:34.0,num:23,pts:14.4,own:20.5},
{id:1116,n:"AMENDA",t:"SUI",p:"DF",c:"Eintracht Frankfur",pr:41.0,num:24,pts:17.3,own:23.1},
{id:1117,n:"JAQUEZ",t:"SUI",p:"DF",c:"VfB Stuttgart",pr:37.5,num:25,pts:12.4,own:30.4},
{id:1118,n:"ITTEN",t:"SUI",p:"FW",c:"Fortuna Düsseldorf",pr:33.5,num:26,pts:13.8,own:28.1},
{id:1119,n:"CHAMAKH",t:"TUN",p:"GK",c:"Club Africain",pr:23.0,num:1,pts:8.8,own:26.5},
{id:1120,n:"ABDI",t:"TUN",p:"DF",c:"OGC Nice",pr:45.0,num:2,pts:18.5,own:28.6},
{id:1121,n:"TALBI",t:"TUN",p:"DF",c:"Lorient",pr:27.5,num:3,pts:9.6,own:17.5},
{id:1122,n:"REKIK",t:"TUN",p:"DF",c:"NK Maribor",pr:27.5,num:4,pts:9.6,own:19.9},
{id:1123,n:"AROUS",t:"TUN",p:"DF",c:"Kasımpaşa SK",pr:25.0,num:5,pts:8.6,own:16.8},
{id:1124,n:"BRONN",t:"TUN",p:"DF",c:"Servette",pr:26.5,num:6,pts:10.9,own:28.2},
{id:1125,n:"ACHOURI",t:"TUN",p:"FW",c:"København",pr:37.5,num:7,pts:15.4,own:23.9},
{id:1126,n:"SAAD",t:"TUN",p:"FW",c:"Hannover 96",pr:39.0,num:8,pts:17.0,own:34.3},
{id:1127,n:"MASTOURI",t:"TUN",p:"FW",c:"Dynamo Makhachkala",pr:36.0,num:9,pts:13.3,own:25.3},
{id:1128,n:"MEJBRI",t:"TUN",p:"MF",c:"Burnley",pr:29.5,num:10,pts:10.4,own:29.6},
{id:1129,n:"GHARBI",t:"TUN",p:"MF",c:"Augsburg",pr:51.0,num:11,pts:18.9,own:29.7},
{id:1130,n:"BEN OUANES",t:"TUN",p:"DF",c:"Kasımpaşa SK",pr:23.5,num:12,pts:8.4,own:19.3},
{id:1131,n:"KHEDIRA",t:"TUN",p:"MF",c:"1. Union Berlin",pr:29.5,num:13,pts:12.9,own:26.2},
{id:1132,n:"AYARI",t:"TUN",p:"MF",c:"PSG",pr:69.5,num:14,pts:25.1,own:36.2},
{id:1133,n:"BELHADJ MAHMOUD",t:"TUN",p:"MF",c:"Lugano",pr:32.5,num:15,pts:14.2,own:23.9},
{id:1134,n:"DAHMEN",t:"TUN",p:"GK",c:"CS Sfaxien",pr:17.5,num:16,pts:6.6,own:23.3},
{id:1135,n:"SKHIRI",t:"TUN",p:"MF",c:"Eintracht Frankfur",pr:50.0,num:17,pts:21.8,own:33.3},
{id:1136,n:"ELLOUMI",t:"TUN",p:"FW",c:"Vancouver Whitecap",pr:28.0,num:18,pts:9.9,own:15.9},
{id:1137,n:"CHAOUAT",t:"TUN",p:"FW",c:"Club Africain",pr:29.0,num:19,pts:11.0,own:18.6},
{id:1138,n:"VALERY",t:"TUN",p:"DF",c:"BSC Young Boys",pr:26.0,num:20,pts:10.7,own:27.9},
{id:1139,n:"BEN HMIDA",t:"TUN",p:"DF",c:"Espérance De Tunis",pr:21.5,num:21,pts:7.2,own:18.8},
{id:1140,n:"BEN HSAN",t:"TUN",p:"GK",c:"Étoile Du Sahel",pr:17.5,num:22,pts:6.7,own:18.2},
{id:1141,n:"NEFFATI",t:"TUN",p:"DF",c:"IFK Norrköping FK",pr:24.5,num:23,pts:10.6,own:25.3},
{id:1142,n:"CHIKHAOUI",t:"TUN",p:"DF",c:"US Monastir",pr:23.5,num:24,pts:9.1,own:12.3},
{id:1143,n:"SLIMANE",t:"TUN",p:"MF",c:"Norwich City",pr:28.0,num:25,pts:9.4,own:16.5},
{id:1144,n:"TOUNEKTI",t:"TUN",p:"MF",c:"Celtic",pr:44.5,num:26,pts:15.8,own:36.4},
{id:1145,n:"MERT",t:"TUR",p:"GK",c:"Fenerbahçe SK",pr:30.5,num:1,pts:13.3,own:19.3},
{id:1146,n:"ZEKİ ÇELİK",t:"TUR",p:"DF",c:"AS Roma",pr:49.0,num:2,pts:18.8,own:29.5},
{id:1147,n:"DEMİRAL",t:"TUR",p:"DF",c:"Al Ahli",pr:49.5,num:3,pts:19.6,own:38.4},
{id:1148,n:"ÇAĞLAR",t:"TUR",p:"DF",c:"Fenerbahçe SK",pr:45.5,num:4,pts:19.2,own:25.1},
{id:1149,n:"ÖZCAN",t:"TUR",p:"MF",c:"Dortmund",pr:78.0,num:5,pts:25.5,own:52.3},
{id:1150,n:"ORKUN KÖKÇÜ",t:"TUR",p:"MF",c:"Beşiktaş JK",pr:54.0,num:6,pts:18.5,own:36.9},
{id:1151,n:"AKTÜRKOĞLU",t:"TUR",p:"FW",c:"Fenerbahçe SK",pr:65.5,num:7,pts:28.2,own:33.5},
{id:1152,n:"ARDA GÜLER",t:"TUR",p:"FW",c:"Real Madrid",pr:91.5,num:8,pts:32.4,own:47.1},
{id:1153,n:"DENİZ GÜL",t:"TUR",p:"FW",c:"Porto",pr:56.0,num:9,pts:20.2,own:36.0},
{id:1154,n:"ÇALHANOĞLU",t:"TUR",p:"MF",c:"Inter",pr:87.0,num:10,pts:37.1,own:46.8},
{id:1155,n:"YILDIZ",t:"TUR",p:"FW",c:"Juventus",pr:90.5,num:11,pts:30.9,own:55.3},
{id:1156,n:"ALTAY",t:"TUR",p:"GK",c:"Man Utd",pr:45.5,num:12,pts:19.3,own:29.2},
{id:1157,n:"EREN ELMALI",t:"TUR",p:"DF",c:"Galatasaray SK",pr:46.0,num:13,pts:18.3,own:23.1},
{id:1158,n:"ABDÜLKERİM",t:"TUR",p:"DF",c:"Galatasaray SK",pr:38.5,num:14,pts:12.6,own:28.9},
{id:1159,n:"OZAN KABAK",t:"TUR",p:"DF",c:"TSG Hoffenheim",pr:43.0,num:15,pts:14.3,own:22.4},
{id:1160,n:"İSMAİL",t:"TUR",p:"MF",c:"Fenerbahçe SK",pr:52.5,num:16,pts:20.1,own:35.5},
{id:1161,n:"KAHVECİ",t:"TUR",p:"FW",c:"Kasımpaşa SK",pr:29.5,num:17,pts:10.3,own:17.5},
{id:1162,n:"MERT MÜLDÜR",t:"TUR",p:"DF",c:"Fenerbahçe SK",pr:46.0,num:18,pts:18.4,own:24.8},
{id:1163,n:"YUNUS",t:"TUR",p:"FW",c:"Galatasaray SK",pr:54.5,num:19,pts:20.3,own:30.9},
{id:1164,n:"F. KADIOĞLU",t:"TUR",p:"DF",c:"Brighton",pr:40.5,num:20,pts:13.1,own:29.7},
{id:1165,n:"BARIŞ",t:"TUR",p:"FW",c:"Galatasaray SK",pr:56.0,num:21,pts:22.2,own:31.2},
{id:1166,n:"KAAN",t:"TUR",p:"MF",c:"Galatasaray SK",pr:42.0,num:22,pts:13.8,own:21.6},
{id:1167,n:"UĞURCAN",t:"TUR",p:"GK",c:"Galatasaray SK",pr:27.0,num:23,pts:10.6,own:16.6},
{id:1168,n:"OĞUZ",t:"TUR",p:"FW",c:"Fenerbahçe SK",pr:53.0,num:24,pts:18.2,own:27.9},
{id:1169,n:"SAMET AKAYDIN",t:"TUR",p:"DF",c:"Çaykur Rizespor",pr:21.5,num:25,pts:7.2,own:20.6},
{id:1170,n:"CAN UZUN",t:"TUR",p:"FW",c:"Eintracht Frankfur",pr:45.0,num:26,pts:15.8,own:30.2},
{id:1171,n:"S. ROCHET",t:"URU",p:"GK",c:"SC Internacional",pr:17.0,num:1,pts:6.7,own:15.9},
{id:1172,n:"J.M. GIMÉNEZ",t:"URU",p:"DF",c:"Atlético",pr:62.0,num:2,pts:21.5,own:43.8},
{id:1173,n:"S. CACERES",t:"URU",p:"DF",c:"Club América",pr:27.0,num:3,pts:8.8,own:20.0},
{id:1174,n:"R. ARAUJO",t:"URU",p:"DF",c:"Barcelona",pr:69.0,num:4,pts:23.9,own:37.0},
{id:1175,n:"M. UGARTE",t:"URU",p:"MF",c:"Man Utd",pr:78.5,num:5,pts:26.2,own:53.6},
{id:1176,n:"R. BENTANCUR",t:"URU",p:"MF",c:"Tottenham",pr:84.0,num:6,pts:33.4,own:42.8},
{id:1177,n:"N. DE LA CRUZ",t:"URU",p:"MF",c:"CR Flamengo",pr:33.0,num:7,pts:12.6,own:25.4},
{id:1178,n:"F. VALVERDE",t:"URU",p:"MF",c:"Real Madrid",pr:92.0,num:8,pts:34.9,own:51.1},
{id:1179,n:"D. NUÑEZ",t:"URU",p:"FW",c:"Al Hilal SC",pr:65.0,num:9,pts:27.3,own:35.0},
{id:1180,n:"G. DE ARRASCAETA",t:"URU",p:"MF",c:"CR Flamengo",pr:29.5,num:10,pts:11.0,own:19.4},
{id:1181,n:"F. PELLISTRI",t:"URU",p:"FW",c:"Panathinaikos",pr:35.0,num:11,pts:12.0,own:29.0},
{id:1182,n:"S. MELE",t:"URU",p:"GK",c:"Monterrey",pr:18.5,num:12,pts:8.0,own:16.9},
{id:1183,n:"G. VARELA",t:"URU",p:"DF",c:"CR Flamengo",pr:18.5,num:13,pts:6.1,own:10.5},
{id:1184,n:"A. CANOBBIO",t:"URU",p:"MF",c:"Fluminense",pr:31.0,num:14,pts:12.1,own:25.9},
{id:1185,n:"E. MARTINEZ",t:"URU",p:"MF",c:"SE Palmeiras",pr:30.0,num:15,pts:10.8,own:19.8},
{id:1186,n:"M. OLIVERA",t:"URU",p:"DF",c:"Napoli",pr:64.0,num:16,pts:21.9,own:41.0},
{id:1187,n:"M. VIÑA",t:"URU",p:"DF",c:"CA River Plate",pr:26.0,num:17,pts:9.3,own:22.6},
{id:1188,n:"B. RODRIGUEZ",t:"URU",p:"FW",c:"Club América",pr:35.0,num:18,pts:14.4,own:17.6},
{id:1189,n:"R. AGUIRRE",t:"URU",p:"FW",c:"Tigres UANL",pr:29.0,num:19,pts:11.1,own:23.6},
{id:1190,n:"M. ARAUJO",t:"URU",p:"MF",c:"Sporting CP",pr:47.0,num:20,pts:15.6,own:33.7},
{id:1191,n:"F. VIÑAS",t:"URU",p:"FW",c:"Real Oviedo",pr:33.0,num:21,pts:13.3,own:28.1},
{id:1192,n:"J. PIQUEREZ",t:"URU",p:"MF",c:"SE Palmeiras",pr:28.5,num:22,pts:10.2,own:18.8},
{id:1193,n:"F. MUSLERA",t:"URU",p:"GK",c:"Estudiantes LP",pr:13.0,num:23,pts:5.1,own:21.4},
{id:1194,n:"S. BUENO",t:"URU",p:"DF",c:"Wolverhampton Wand",pr:25.5,num:24,pts:10.1,own:19.6},
{id:1195,n:"J.M. SANABRIA",t:"URU",p:"MF",c:"Real Salt Lake",pr:27.5,num:25,pts:8.9,own:14.9},
{id:1196,n:"R. ZALAZAR",t:"URU",p:"MF",c:"SC Braga",pr:29.5,num:26,pts:11.6,own:19.0},
{id:1197,n:"TURNER",t:"USA",p:"GK",c:"New England Revolu",pr:21.0,num:1,pts:8.4,own:25.2},
{id:1198,n:"DEST",t:"USA",p:"DF",c:"PSV Eindhoven",pr:50.0,num:2,pts:20.5,own:35.6},
{id:1199,n:"RICHARDS",t:"USA",p:"DF",c:"Crystal Palace",pr:47.5,num:3,pts:17.0,own:24.9},
{id:1200,n:"ADAMS",t:"USA",p:"MF",c:"ABournemouth",pr:59.5,num:4,pts:26.0,own:34.3},
{id:1201,n:"A. ROBINSON",t:"USA",p:"DF",c:"Fulham",pr:48.5,num:5,pts:18.2,own:33.9},
{id:1202,n:"TRUSTY",t:"USA",p:"DF",c:"Celtic",pr:46.0,num:6,pts:15.3,own:30.4},
{id:1203,n:"REYNA",t:"USA",p:"MF",c:"Borussia Mönchengl",pr:50.0,num:7,pts:17.8,own:39.5},
{id:1204,n:"MCKENNIE",t:"USA",p:"MF",c:"Juventus",pr:87.0,num:8,pts:37.8,own:45.9},
{id:1205,n:"PEPI",t:"USA",p:"FW",c:"PSV Eindhoven",pr:58.5,num:9,pts:23.6,own:38.6},
{id:1206,n:"PULISIC",t:"USA",p:"FW",c:"AC Milan",pr:87.0,num:10,pts:28.9,own:46.5},
{id:1207,n:"AARONSON",t:"USA",p:"FW",c:"Leeds United",pr:36.0,num:11,pts:12.9,own:29.8},
{id:1208,n:"M. ROBINSON",t:"USA",p:"DF",c:"Cincinnatti",pr:27.0,num:12,pts:10.7,own:23.2},
{id:1209,n:"REAM",t:"USA",p:"DF",c:"Charlotte",pr:19.5,num:13,pts:7.4,own:13.1},
{id:1210,n:"BERHALTER",t:"USA",p:"MF",c:"Vancouver Whitecap",pr:32.5,num:14,pts:14.1,own:22.5},
{id:1211,n:"ROLDAN",t:"USA",p:"MF",c:"Seattle Sounders",pr:26.5,num:15,pts:9.0,own:17.0},
{id:1212,n:"FREEMAN",t:"USA",p:"DF",c:"Villarreal",pr:42.5,num:16,pts:16.8,own:23.5},
{id:1213,n:"TILLMAN",t:"USA",p:"MF",c:"Leverkusen",pr:74.0,num:17,pts:25.6,own:47.4},
{id:1214,n:"ARFSTEN",t:"USA",p:"DF",c:"Columbus Crew",pr:27.5,num:18,pts:11.3,own:15.5},
{id:1215,n:"WRIGHT",t:"USA",p:"FW",c:"Coventry City",pr:33.0,num:19,pts:13.1,own:19.9},
{id:1216,n:"BALOGUN",t:"USA",p:"FW",c:"AS Monaco",pr:53.0,num:20,pts:18.5,own:30.5},
{id:1217,n:"WEAH",t:"USA",p:"FW",c:"Olympique Marseill",pr:54.5,num:21,pts:20.2,own:33.4},
{id:1218,n:"MCKENZIE",t:"USA",p:"DF",c:"Toulouse",pr:24.5,num:22,pts:8.6,own:14.5},
{id:1219,n:"SCALLY",t:"USA",p:"DF",c:"Borussia Mönchengl",pr:38.0,num:23,pts:12.9,own:21.9},
{id:1220,n:"FREESE",t:"USA",p:"GK",c:"New York City",pr:18.0,num:24,pts:7.2,own:20.5},
{id:1221,n:"BRADY",t:"USA",p:"GK",c:"Chicago Fire",pr:15.5,num:25,pts:5.2,own:21.6},
{id:1222,n:"ZENDEJAS",t:"USA",p:"FW",c:"Club América",pr:31.5,num:26,pts:11.0,own:18.6},
{id:1223,n:"YUSUPOV",t:"UZB",p:"GK",c:"PNavbahor Namangan",pr:16.5,num:1,pts:5.8,own:12.1},
{id:1224,n:"KHUSANOV",t:"UZB",p:"DF",c:"Man City",pr:65.0,num:2,pts:24.0,own:38.8},
{id:1225,n:"ALIJONOV",t:"UZB",p:"DF",c:"Pakhtakor Tashkent",pr:27.5,num:3,pts:9.3,own:27.2},
{id:1226,n:"SAYFIEV",t:"UZB",p:"DF",c:"FK Neftchi Farg'on",pr:20.5,num:4,pts:7.1,own:23.4},
{id:1227,n:"ASHURMATOV",t:"UZB",p:"DF",c:"Esteghlal Tehran",pr:29.5,num:5,pts:12.1,own:22.4},
{id:1228,n:"MOZGOVOY",t:"UZB",p:"MF",c:"Pakhtakor Tashkent",pr:34.5,num:6,pts:14.8,own:26.2},
{id:1229,n:"SHUKUROV",t:"UZB",p:"MF",c:"Baniyas Club",pr:31.5,num:7,pts:10.9,own:23.0},
{id:1230,n:"ISKANDEROV",t:"UZB",p:"MF",c:"FK Neftchi Farg'on",pr:29.0,num:8,pts:10.2,own:24.5},
{id:1231,n:"XAMROBEKOV",t:"UZB",p:"MF",c:"Tractor Sazi Tabri",pr:29.5,num:9,pts:10.9,own:27.1},
{id:1232,n:"MASHARIPOV",t:"UZB",p:"MF",c:"Esteghlal Tehran",pr:31.0,num:10,pts:13.2,own:26.0},
{id:1233,n:"URUNOV",t:"UZB",p:"MF",c:"Persepolis",pr:34.5,num:11,pts:14.6,own:27.2},
{id:1234,n:"NEMATOV",t:"UZB",p:"GK",c:"Nasaf Qarshi",pr:17.5,num:12,pts:6.7,own:10.4},
{id:1235,n:"NASRULLAEV",t:"UZB",p:"DF",c:"Pakhtakor Tashkent",pr:27.0,num:13,pts:10.6,own:16.2},
{id:1236,n:"SHOMURODOV",t:"UZB",p:"FW",c:"Başakşehir FK",pr:30.5,num:14,pts:11.5,own:28.5},
{id:1237,n:"ESHMURODOV",t:"UZB",p:"DF",c:"Nasaf Qarshi",pr:20.0,num:15,pts:8.0,own:12.6},
{id:1238,n:"ERGASHEV",t:"UZB",p:"GK",c:"FK Neftchi Farg'on",pr:16.5,num:16,pts:6.9,own:13.8},
{id:1239,n:"KHAMDAMOV",t:"UZB",p:"MF",c:"Pakhtakor Tashkent",pr:31.5,num:17,pts:12.7,own:24.2},
{id:1240,n:"ABDULLAEV",t:"UZB",p:"DF",c:"Dibba",pr:27.0,num:18,pts:10.8,own:27.0},
{id:1241,n:"GANIEV",t:"UZB",p:"MF",c:"Al Bataeh Club",pr:28.0,num:19,pts:9.4,own:17.4},
{id:1242,n:"AMONOV",t:"UZB",p:"FW",c:"FK Dinamo Samarkan",pr:31.0,num:20,pts:10.6,own:18.1},
{id:1243,n:"SERGEEV",t:"UZB",p:"FW",c:"Persepolis",pr:25.0,num:21,pts:10.6,own:20.1},
{id:1244,n:"FAYZULLAEV",t:"UZB",p:"MF",c:"Başakşehir FK",pr:26.0,num:22,pts:8.9,own:20.7},
{id:1245,n:"ESANOV",t:"UZB",p:"MF",c:"FK Buxoro",pr:26.5,num:23,pts:9.7,own:22.8},
{id:1246,n:"KARIMOV",t:"UZB",p:"DF",c:"Surkhon FK",pr:21.5,num:24,pts:8.3,own:21.3},
{id:1247,n:"ULMASALIYEV",t:"UZB",p:"DF",c:"OKMK FK",pr:26.5,num:25,pts:11.3,own:21.2},
{id:1248,n:"UROZOV",t:"UZB",p:"DF",c:"FK Dinamo Samarkan",pr:22.5,num:26,pts:7.8,own:14.8}
];

// Players come from this context: live DB data when Supabase is configured,
// otherwise the DEMO_PLAYERS above. Components read it via usePlayers().
const PlayersContext = createContext(DEMO_PLAYERS);
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

  // Load players from Supabase when configured; fall back to DEMO_PLAYERS.
  // Live rows have no pts/own, so we merge those from DEMO when ids match,
  // keeping the projection/ownership UI populated until the backend serves them.
  const [players,setPlayers]=useState(DEMO_PLAYERS);
  useEffect(()=>{
    let alive=true;
    getPlayers().then(rows=>{
      if(!alive||!rows||!rows.length) return;
      if(rows===DEMO_PLAYERS) return; // demo mode, nothing to merge
      const demoById=new Map(DEMO_PLAYERS.map(p=>[p.id,p]));
      const merged=rows.map(r=>{
        const d=demoById.get(r.id);
        return {...r, pts:d?.pts??0, own:d?.own??0};
      });
      setPlayers(merged);
    }).catch(e=>console.warn("getPlayers failed, using demo data:",e?.message||e));
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
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
          <span style={S.poolDot}/>
          <span style={{fontWeight:800,fontSize:13}}>◎312.4 SOL</span>
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
          <div style={{...S.loginBtn, background: C.card, color: C.ink, border: `1px solid ${C.line}`, justifyContent: 'center', cursor: 'default', flexDirection: 'column', gap: 4}}>
            {callbackError 
              ? `OAuth error: ${callbackError}` 
              : 'Completing sign-in with X…'}
            <span style={{fontSize: 11, opacity: 0.7}}>Check browser console for details. Common cause: redirect URL not whitelisted in Supabase/X settings.</span>
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
  const DEMO_PLAYERS=usePlayers();
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
    DEMO_PLAYERS.forEach(p=>{if(p.pr<min[p.p])min[p.p]=p.pr;});
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
    let l=[...DEMO_PLAYERS];
    if(posF!=="ALL")l=l.filter(p=>p.p===posF);
    if(search.trim())l=l.filter(p=>p.n.toLowerCase().includes(search.toLowerCase())||p.c.toLowerCase().includes(search.toLowerCase()));
    l.sort((a,b)=>sortBy==="pts"?b.pts-a.pts:sortBy==="pr"?b.pr-a.pr:b.own-a.own);
    return l;
  },[posF,search,sortBy]);
  const avgPts=squad.length?+(squad.reduce((s,id)=>s+(DEMO_PLAYERS.find(p=>p.id===id)?.pts||0),0)/squad.length).toFixed(1):0;

  return (
    <div>
      <div style={S.budgetHeader} ref={budgetRef}>
        <LockBanner compact status={formationLock}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}>
          <div>
            <div style={S.miniLabel}>BUDGET LEFT</div>
            <div style={{display:"flex",alignItems:"baseline",gap:6}}>
              <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:30,
                color:budget<50?C.orange:C.ink,lineHeight:1}}>◎{budget}</span>
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
        <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:16,color:C.ink}}>◎{p.pr}</span>
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
        <div style={S.statCard}><div style={S.miniLabel}>SPENT</div><div style={S.statBig}>◎{spent}</div></div>
        <div style={S.statCard}><div style={S.miniLabel}>AVG FORM</div><div style={{...S.statBig,color:C.orange}}>{avgPts}</div></div>
        <div style={S.statCard}><div style={S.miniLabel}>PLAYERS</div><div style={S.statBig}>{squad.length}/{SQUAD_SIZE}</div></div>
      </div>
      {["GK","DF","MF","FW"].map(pos=>{
        const group=squad.map(id=>DEMO_PLAYERS.find(p=>p.id===id)).filter(p=>p&&p.p===pos);
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
                    <span>{p.c} · ◎{p.pr}</span>
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
  const DEMO_PLAYERS=usePlayers();
  const [showKit,setShowKit]=useState(false);
  const [picker,setPicker]=useState(null); // player id being assigned C/V
  const [projInfo,setProjInfo]=useState(false); // PROJ explainer tooltip
  const starterPlayers=useMemo(()=>starters.map(id=>DEMO_PLAYERS.find(p=>p.id===id)).filter(Boolean),[starters,DEMO_PLAYERS]);
  const benchPlayers=useMemo(()=>benchIds.map(id=>DEMO_PLAYERS.find(p=>p.id===id)).filter(Boolean),[benchIds,DEMO_PLAYERS]);
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
  const selP = swapSel.map(id=>DEMO_PLAYERS.find(p=>p.id===id)).filter(Boolean);
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
    const currentSpent = typeof spent==="number" ? spent : squad.reduce((s,id)=>s+(DEMO_PLAYERS.find(pp=>pp.id===id)?.pr||0),0);
    const bench = squad.filter(id=>!starters.includes(id));
    if(!starters.length || starters.length>11){
      setSaveStatus("error"); setTimeout(()=>setSaveStatus(null),1400); return;
    }
    if(!HAS_SUPABASE || !u?.id){
      setSaveStatus("saved"); setTimeout(()=>setSaveStatus(null),1500); return;
    }
    setSaveStatus("saving");
    try{
      const picks = squad.map(id=>{const p=DEMO_PLAYERS.find(x=>x.id===id); return {id,pr:p?.pr||0};});
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
                <div style={{fontSize:12,color:C.mute}}>{POS_LABEL[pp.p]} · {pp.c} · ◎{pp.pr}</div>
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
            <span style={S.pcValue}>◎{p.pr}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const LB=[
  {rank:1,prev:2,name:"CRYPTO WIZARD",pts:847,flag:"🇩🇪",tier:"elite"},
  {rank:2,prev:1,name:"DEGEN FC",pts:831,flag:"🇦🇷",tier:"elite"},
  {rank:3,prev:4,name:"SOL UNITED",pts:818,flag:"🇧🇷",tier:"elite"},
  {rank:4,prev:3,name:"MOON SHOTS",pts:804,flag:"🇫🇷",tier:"gold"},
  {rank:5,prev:7,name:"ALPHA PICKS",pts:796,flag:"🇪🇸",tier:"gold"},
  {rank:6,prev:5,name:"PUMP IT FC",pts:783,flag:"🇳🇱",tier:"gold"},
  {rank:7,prev:9,name:"DEFI DREAMS",pts:771,flag:"🇵🇹",tier:"gold"},
  {rank:8,prev:8,name:"GAS LEGENDS",pts:764,flag:"🇲🇦",tier:"gold"},
  {rank:9,prev:12,name:"BULL MARKET",pts:758,flag:"🇩🇪",tier:"gold"},
  {rank:10,prev:6,name:"SATOSHI SC",pts:749,flag:"🇧🇷",tier:"gold"},
  {rank:11,prev:14,name:"LEDGER FC",pts:741,flag:"🇦🇷",tier:"silver"},
  {rank:12,prev:10,name:"NFT STRIKERS",pts:736,flag:"🇫🇷",tier:"silver"},
];
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
// potential winnings in SOL for a given rank, given the live pool total
function potentialWin(rank,pool){
  if(rank>100||!pool) return 0;
  return +(pool*prizePctForRank(rank)/100).toFixed(2);
}

// Demo weekly leaderboard (this matchday) — used when backend has no weekly rows yet
const LB_WEEK=[
  {rank:1,prev:3,name:"GAS LEGENDS",pts:96,flag:"🇲🇦",tier:"elite"},
  {rank:2,prev:1,name:"DEGEN FC",pts:92,flag:"🇦🇷",tier:"elite"},
  {rank:3,prev:8,name:"MOON SHOTS",pts:89,flag:"🇫🇷",tier:"elite"},
  {rank:4,prev:2,name:"CRYPTO WIZARD",pts:87,flag:"🇩🇪",tier:"gold"},
  {rank:5,prev:11,name:"LEDGER FC",pts:84,flag:"🇦🇷",tier:"gold"},
  {rank:6,prev:4,name:"SOL UNITED",pts:82,flag:"🇧🇷",tier:"gold"},
  {rank:7,prev:5,name:"ALPHA PICKS",pts:80,flag:"🇪🇸",tier:"gold"},
  {rank:8,prev:9,name:"DEFI DREAMS",pts:78,flag:"🇵🇹",tier:"gold"},
];

function Ranks({setTab}){
  // Live leaderboard when Supabase is configured; otherwise the demo LB.
  // Live rows (x_handle, total_points, rank) are mapped into the demo shape
  // so the existing card render works unchanged.
  const [board,setBoard]=useState(LB);
  const [weekBoard,setWeekBoard]=useState(LB_WEEK);
  const [scope,setScope]=useState("overall"); // overall | week
  const [pool,setPool]=useState(312.4);        // live prize pool (SOL)
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
    }).catch(e=>console.warn("getLeaderboard failed, using demo:",e?.message||e));
    return ()=>{alive=false;};
  },[]);
  const shown = scope==="overall"?board:weekBoard;
  return (
    <div style={{paddingBottom:20}}>
      <div style={{padding:"14px 16px"}}>
        <div style={S.myRankCard}>
          <div style={{position:"absolute",top:-20,right:-20,width:120,height:120,borderRadius:"50%",
            background:C.orange,opacity:.16}}/>
          <div style={{position:"relative",zIndex:1,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:11,color:"#ffffff99",letterSpacing:2,fontWeight:600}}>YOUR RANK</div>
              <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:44,color:"#fff",lineHeight:1}}>#247</div>
              <div style={{fontSize:12,color:C.orange,fontWeight:700,marginTop:4}}>▲ +34 this matchday</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,color:"#ffffff99",letterSpacing:1}}>421 PTS</div>
              <div style={{marginTop:8,fontSize:11,color:"#ffffff99"}}>to top 100</div>
              <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:18,color:"#fff"}}>+328</div>
            </div>
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
          <div>
            <div style={{fontSize:10,color:C.mute,letterSpacing:1.5,fontWeight:700}}>LIVE PRIZE POOL</div>
            <div style={{display:"flex",alignItems:"baseline",gap:6}}>
              <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:26,color:C.ink}}>◎{pool}</div>
              <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:800,fontSize:14,color:C.mute,letterSpacing:.5}}>SOL</div>
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
        {showTable && <PrizeTableInline pool={pool} board={board}/>}
      </div>

      <div style={{padding:"0 16px"}}>
        <div style={S.scopeToggle}>
          <button onClick={()=>setScope("overall")} style={{...S.scopeBtn,...(scope==="overall"?S.scopeBtnOn:{})}}>Overall</button>
          <button onClick={()=>setScope("week")} style={{...S.scopeBtn,...(scope==="week"?S.scopeBtnOn:{})}}>This week</button>
        </div>
        <div style={S.sectionLabel}>{scope==="overall"?"GLOBAL TOP MANAGERS":"THIS MATCHDAY'S BEST"}</div>
        {shown.map(r=>{
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
                  ? <div style={{fontSize:11,fontWeight:700,color:C.orangeDeep}}>◎{potentialWin(r.rank,pool)} SOL</div>
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
function PrizeTableInline({pool,board}){
  const nameByRank={}; board.forEach(r=>{nameByRank[r.rank]=r.name;});
  const rows=Array.from({length:100},(_,i)=>{
    const rank=i+1;
    return { rank, name:nameByRank[rank]||`Rank ${rank}`, pct:prizePctForRank(rank), win:potentialWin(rank,pool) };
  });
  return (
    <div style={{...S.tokenStat,padding:"14px 16px",marginTop:8}}>
      <p style={{margin:"0 0 12px",fontSize:12.5,color:C.mute,lineHeight:1.5}}>
        The top 100 share the live pool of <b style={{color:C.ink}}>◎{pool} SOL</b>. Each position earns a fixed
        share of the pool — payouts grow as the pool grows. Figures update live.
      </p>
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
  const DEMO_PLAYERS=usePlayers();
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

  const players=useMemo(()=>squad.map(id=>DEMO_PLAYERS.find(p=>p.id===id)).filter(Boolean),[squad]);
  const rows=useMemo(()=>{
    const fr=formationRows(formation);
    const byPos={GK:[],DF:[],MF:[],FW:[]};
    players.forEach(p=>{if(byPos[p.p])byPos[p.p].push(p);});
    return fr.map(({pos,count})=>({pos,players:(byPos[pos]||[]).slice(0,count)}));
  },[players,formation]);
  const capP=DEMO_PLAYERS.find(p=>p.id===captain);
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
                    <Icon name="pool" size={13} style={{color:C.orange}}/>888
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
              <span style={{color:C.orange,display:"inline-flex"}}><Icon name="pool" size={13}/></span>
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
              <div>
                <div style={{fontSize:9,color:"#ffffff77",letterSpacing:1,fontWeight:700}}>SOL ON OFFER</div>
                <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:20,color:C.orange}}>◎{totalFunding} SOL</div>
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
                <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:22,color:C.orange,lineHeight:1}}>◎{q.reward} SOL</div>
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
    {l:"FEES TO POOL",v:"◎312 SOL",s:"60% of fees"},
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
          <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:54,color:"#fff",lineHeight:1,marginTop:4}}>◎312.4 <span style={{fontSize:24}}>SOL</span></div>
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
            <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:900,fontSize:22,color:C.ink,marginTop:4}}>{v}</div>
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
                    color:isLock?C.orangeDeep:"#2e8b57",flexShrink:0}}>◎{m.amount} SOL</div>
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
        {[["48","NATIONS"],["1,248","PLAYERS"],["◎312 SOL","LIVE POOL"],["30+","YRS TRADITION"]].map(([n,l],i)=>(
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

// Demo data used only when the backend returns nothing (local preview / pre-launch)
const DEMO_SCORERS = [
  {player_id:"d1",name:"K. Mbappé",team:"FRA",club:"Real Madrid",value:6},
  {player_id:"d2",name:"H. Kane",team:"ENG",club:"Bayern",value:5},
  {player_id:"d3",name:"L. Messi",team:"ARG",club:"Inter Miami",value:5},
  {player_id:"d4",name:"Vinícius Jr",team:"BRA",club:"Real Madrid",value:4},
  {player_id:"d5",name:"O. Dembélé",team:"FRA",club:"PSG",value:3},
  {player_id:"d6",name:"C. Ronaldo",team:"POR",club:"Al-Nassr",value:3},
];
const DEMO_ASSISTS = [
  {player_id:"a1",name:"K. De Bruyne",team:"BEL",club:"Napoli",value:5},
  {player_id:"a2",name:"L. Messi",team:"ARG",club:"Inter Miami",value:4},
  {player_id:"a3",name:"Raphinha",team:"BRA",club:"Barcelona",value:3},
];
const DEMO_CARDS = [
  {player_id:"c1",name:"C. Romero",team:"ARG",club:"Tottenham",yellow:3,red:0},
  {player_id:"c2",name:"Casemiro",team:"BRA",club:"Man United",yellow:2,red:1},
];
const DEMO_STANDINGS = {
  A:[{team:"MEX",played:2,won:2,drawn:0,lost:0,gf:5,ga:1,points:6},
     {team:"NED",played:2,won:1,drawn:1,lost:0,gf:4,ga:2,points:4},
     {team:"USA",played:2,won:0,drawn:1,lost:1,gf:2,ga:4,points:1},
     {team:"JPN",played:2,won:0,drawn:0,lost:2,gf:1,ga:5,points:0}],
  B:[{team:"ARG",played:2,won:2,drawn:0,lost:0,gf:6,ga:1,points:6},
     {team:"CRO",played:2,won:1,drawn:0,lost:1,gf:3,ga:3,points:3},
     {team:"MAR",played:2,won:1,drawn:0,lost:1,gf:2,ga:2,points:3},
     {team:"SEN",played:2,won:0,drawn:0,lost:2,gf:1,ga:6,points:0}],
};
const DEMO_BRACKET = {
  "Round of 32":[
    {home:"ARG",away:"3 B/E/F",home_score:2,away_score:0,done:true},
    {home:"NOR",away:"3 A/C/D",home_score:1,away_score:0,done:true},
    {home:"MEX",away:"URU",home_score:1,away_score:1,pens:"5-4",done:true},
    {home:"GER",away:"SUI",home_score:2,away_score:2,pens:"3-4",done:true},
    {home:"FRA",away:"3 D/E/F",home_score:3,away_score:1,done:true},
    {home:"COL",away:"JPN",home_score:0,away_score:1,done:true},
    {home:"ENG",away:"SEN",home_score:2,away_score:0,done:true},
    {home:"NED",away:"ECU",home_score:3,away_score:2,done:true},
    {home:"BRA",away:"3 E/H/I",home_score:null,away_score:null,done:false},
    {home:"KOR",away:"BEL",home_score:null,away_score:null,done:false},
    {home:"POR",away:"MAR",home_score:null,away_score:null,done:false},
    {home:"CRO",away:"USA",home_score:null,away_score:null,done:false},
    {home:"ESP",away:"3 F/G/H",home_score:null,away_score:null,done:false},
    {home:"AUT",away:"SEN",home_score:null,away_score:null,done:false},
    {home:"URU",away:"DEN",home_score:null,away_score:null,done:false},
    {home:"CAN",away:"NGA",home_score:null,away_score:null,done:false},
  ],
  "Round of 16":[
    {home:"ARG",away:"NOR",home_score:2,away_score:1,done:true},
    {home:"MEX",away:"SUI",home_score:1,away_score:0,done:true},
    {home:"FRA",away:"JPN",home_score:3,away_score:1,done:true},
    {home:"ENG",away:"NED",home_score:1,away_score:1,pens:"4-3",done:true},
    {home:"W41",away:"W42",home_score:null,away_score:null,done:false},
    {home:"W43",away:"W44",home_score:null,away_score:null,done:false},
    {home:"W45",away:"W46",home_score:null,away_score:null,done:false},
    {home:"W47",away:"W48",home_score:null,away_score:null,done:false},
  ],
  "Quarterfinals":[
    {home:"ARG",away:"MEX",home_score:2,away_score:0,done:true},
    {home:"FRA",away:"ENG",home_score:null,away_score:null,done:false},
    {home:"W57",away:"W58",home_score:null,away_score:null,done:false},
    {home:"W59",away:"W60",home_score:null,away_score:null,done:false},
  ],
  "Semifinals":[
    {home:"ARG",away:"—",home_score:null,away_score:null,done:false},
    {home:"—",away:"—",home_score:null,away_score:null,done:false},
  ],
  "Final":[{home:"—",away:"—",home_score:null,away_score:null,done:false}],
};

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
      let list = (data&&data.length) ? data
        : (stat==="goals"?DEMO_SCORERS : stat==="assists"?DEMO_ASSISTS : DEMO_CARDS);
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
  useEffect(()=>{let live=true;getStandings().then(d=>{if(live)setGroups(d&&Object.keys(d).length?d:DEMO_STANDINGS);});return ()=>{live=false;};},[]);
  if(!groups) return <div style={{textAlign:"center",padding:"40px",color:C.mute}}>Loading…</div>;
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
  useEffect(()=>{let live=true;getBracket().then(d=>{if(live)setBracket(d&&Object.keys(d).length?d:DEMO_BRACKET);});return ()=>{live=false;};},[]);

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

  if(!bracket) return <div style={{textAlign:"center",padding:"40px",color:C.mute}}>Loading…</div>;
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
  const DEMO_PLAYERS=usePlayers();
  // map squad ids → set of {id, name} so "my players" can match backend rows by id or name
  const mySet=useMemo(()=>{
    const s=new Set();
    squad.forEach(id=>{ s.add(id); const p=DEMO_PLAYERS.find(x=>x.id===id); if(p){s.add(p.n);s.add(p.name);} });
    return s;
  },[squad,DEMO_PLAYERS]);
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
