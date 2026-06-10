#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scoring.py — Motore di calcolo punti del Fantaball.

Due livelli:
  1) score_player(stats, position)  -> punti GREZZI del giocatore (no capitano)
  2) score_user_gameweek(...)       -> punti UTENTE per giornata (auto-sub + capitano)

La funzione score_player e' PURA: prende un dizionario di statistiche
(nel formato che ricaviamo da API-Football fixtures/players) e restituisce
punti + breakdown dettagliato. Facile da testare e verificare.

Regolamento di riferimento: versione "Lancio Sicuro" (solo eventi VERDI).
"""
from __future__ import annotations
from dataclasses import dataclass, field

# ----------------------------------------------------------------------
# Tabelle punti per ruolo
# ----------------------------------------------------------------------
GOAL   = {"GK": 0, "DF": 8, "MF": 6, "FW": 5}   # gol per ruolo (GK gol = raro, gestito come DF se capita)
ASSIST = {"GK": 0, "DF": 5, "MF": 4, "FW": 3}
CLEAN  = {"GK": 5, "DF": 4, "MF": 0, "FW": 0}   # clean sheet
GK_GOAL_FALLBACK = 6                            # se un GK segnasse, trattalo come bonus alto

@dataclass
class Score:
    points: float = 0.0
    breakdown: dict = field(default_factory=dict)
    def add(self, key, pts):
        if pts:
            self.points += pts
            self.breakdown[key] = self.breakdown.get(key, 0) + pts


def score_player(stats: dict, position: str) -> Score:
    """
    stats attesi (tutti opzionali, default 0/False):
      started: bool         titolare
      minutes: int          minuti giocati
      goals: int            gol segnati (inclusi rigori segnati)
      assists: int          assist
      conceded: int         gol subiti (per GK)
      clean_sheet: bool     porta inviolata (calcolato a monte: 0 subiti & min>=60)
      saves: int            parate (GK)
      pen_saved: int        rigori parati (GK)
      pen_missed: int       rigori sbagliati
      yellow: int           ammonizioni (0/1)
      red: int              espulsioni (0/1)
      own_goals: int        autogol
    position: 'GK' | 'DF' | 'MF' | 'FW'
    """
    s = Score()
    g = lambda k, d=0: stats.get(k, d)
    pos = position

    # --- Presenza ---
    if g("started"): s.add("titolare", 1)
    if g("minutes", 0) >= 60: s.add("min60", 1)

    # --- Gol ---
    goals = g("goals", 0)
    if goals:
        per = GOAL.get(pos, 0) or (GK_GOAL_FALLBACK if pos == "GK" else 5)
        s.add("gol", per * goals)
        # bonus attaccante: tripletta/poker (non cumulativi)
        if pos == "FW":
            if goals >= 4:   s.add("poker", 6)
            elif goals == 3: s.add("tripletta", 3)

    # --- Assist ---
    if g("assists", 0):
        s.add("assist", ASSIST.get(pos, 0) * g("assists"))

    # --- Clean sheet (solo GK/DF, gia' validato min>=60 a monte) ---
    if g("clean_sheet") and CLEAN.get(pos, 0):
        s.add("clean_sheet", CLEAN[pos])

    # --- Portiere: parate e rigori parati ---
    if pos == "GK":
        if g("pen_saved", 0): s.add("rig_parato", 8 * g("pen_saved"))
        saves = g("saves", 0)
        if saves >= 4:        s.add("parate", saves // 4)         # +1 ogni 4
        if g("conceded", 0):  s.add("gol_subiti", -1 * g("conceded"))

    # --- Malus comuni ---
    if g("pen_missed", 0): s.add("rig_sbagliato", -2 * g("pen_missed"))
    if g("yellow", 0):     s.add("giallo", -1)
    if g("red", 0):        s.add("rosso", -4)
    if g("own_goals", 0):  s.add("autogol", -4 * g("own_goals"))

    return s


# ----------------------------------------------------------------------
# Livello utente: auto-sostituzione + capitano
# ----------------------------------------------------------------------
def apply_captain(raw_points: float, role: str) -> float:
    """role: 'C' (capitano x2), 'V' (vice x1.5), o '' (nessuno).
       Floor a 0 sul totale moltiplicato: il capitano non puo' togliere punti."""
    if role == "C": return max(0.0, raw_points) * 2.0
    if role == "V": return max(0.0, raw_points) * 1.5
    return raw_points


def score_user_gameweek(lineup, player_scores, player_minutes, schema_min=None):
    """
    Calcola i punti utente per una giornata applicando auto-sostituzione e capitano.

    lineup: lista di dict per tutti i 16 giocatori della GW:
        {player_id, position, slot:'starter'|'sub'|'unselected',
         bench_order:int|None, is_captain:bool, is_vice:bool}
    player_scores:  dict player_id -> punti grezzi (da score_player)
    player_minutes: dict player_id -> minuti giocati
    schema_min: ignorato (mantenuto per compatibilità firma)

    Auto-sub §1.3: stesso ruolo, ordine bench_order; slot='unselected' ignorato.
    Ritorna: (gw_points, captain_points, detail)
    """
    starters = [p for p in lineup if p["slot"] == "starter"]
    # slot='unselected' è ignorato: solo i 3 sostituti ordinati entrano nel calcolo
    bench = sorted(
        [p for p in lineup if p["slot"] == "sub"],
        key=lambda p: (p.get("bench_order") or 99),
    )

    pts    = lambda pid: player_scores.get(pid, 0.0)
    played = lambda pid: player_minutes.get(pid, 0) > 0

    # --- Auto-sostituzione per ruolo (§1.3) ---
    # Titolare che non ha giocato → primo sub STESSO RUOLO non ancora usato che ha giocato.
    # Nessun sub stesso ruolo disponibile → slot fa 0 punti (non aggiunto a final_eleven).
    used_bench: set = set()
    final_eleven: list = []

    for s in starters:
        if played(s["player_id"]):
            final_eleven.append(s)
        else:
            repl = next(
                (b for b in bench
                 if b["position"] == s["position"]
                 and b["player_id"] not in used_bench
                 and played(b["player_id"])),
                None,
            )
            if repl:
                used_bench.add(repl["player_id"])
                final_eleven.append(repl)
            # altrimenti: slot vuoto, 0 punti

    # --- Capitano ×2 / Vice ×1.5 ---
    # Vice subentra come capitano (×2) solo se il capitano non ha giocato.
    captain = next((p for p in lineup if p.get("is_captain")), None)
    vice    = next((p for p in lineup if p.get("is_vice")), None)
    captain_played = captain and played(captain["player_id"])

    total = 0.0
    captain_points = 0.0
    detail = []
    for p in final_eleven:
        pid = p["player_id"]
        raw = pts(pid)
        role = ""
        if captain and pid == captain["player_id"] and captain_played:
            role = "C"
        elif not captain_played and vice and pid == vice["player_id"] and played(pid):
            role = "V"
        final_pts = apply_captain(raw, role)
        if role in ("C", "V"):
            captain_points = final_pts
        total += final_pts
        detail.append({"player_id": pid, "raw": raw, "role": role, "final": final_pts})

    return round(total, 1), round(captain_points, 1), detail


# ----------------------------------------------------------------------
# SELF-TEST: casi limite del regolamento
# ----------------------------------------------------------------------
if __name__ == "__main__":
    def check(name, got, exp):
        ok = abs(got - exp) < 1e-6
        print(f"[{'OK ' if ok else 'XX '}] {name}: atteso {exp}, ottenuto {got}")
        return ok

    allok = True
    # FW titolare 90', tripletta, 1 assist: 1+1 +5*3 +3(tripl) +3(assist) = 23
    allok &= check("FW tripletta",
        score_player({"started":1,"minutes":90,"goals":3,"assists":1},"FW").points, 23)
    # FW poker (4 gol), titolare 90': 1+1 +5*4 +6 = 28
    allok &= check("FW poker",
        score_player({"started":1,"minutes":90,"goals":4},"FW").points, 28)
    # DF titolare 90', clean sheet, 1 giallo: 1+1 +4 -1 = 5
    allok &= check("DF clean+giallo",
        score_player({"started":1,"minutes":90,"clean_sheet":True,"yellow":1},"DF").points, 5)
    # GK titolare 90', clean sheet, 8 parate: 1+1 +5 +2(=8//4) = 9
    allok &= check("GK clean 8 parate",
        score_player({"started":1,"minutes":90,"clean_sheet":True,"saves":8},"GK").points, 9)
    # GK tartassato: 90', 3 subiti, 9 parate, 1 rig parato: 1+1 +8 +2(9//4) -3 = 9
    allok &= check("GK assediato",
        score_player({"started":1,"minutes":90,"conceded":3,"saves":9,"pen_saved":1},"GK").points, 9)
    # MF titolare 90', 1 gol 1 assist 1 giallo: 1+1 +6 +4 -1 = 11
    allok &= check("MF gol+assist+giallo",
        score_player({"started":1,"minutes":90,"goals":1,"assists":1,"yellow":1},"MF").points, 11)
    # Capitano con netto +1 -> x2 = 2
    allok &= check("Capitano netto +1 x2", apply_captain(1, "C"), 2)
    # Capitano con netto -4 (autogol) -> max(0,-4)*2 = 0
    allok &= check("Capitano netto -4 floor", apply_captain(-4, "C"), 0)
    # Vice con netto +6 -> x1.5 = 9
    allok &= check("Vice netto +6 x1.5", apply_captain(6, "V"), 9)

    # Test livello utente: capitano FW che fa tripletta(23), un titolare DF non gioca,
    # entra sub DF (bench_order=1) che fa +2. Capitano 23*2=46.
    lineup = [
        {"player_id":1,"position":"FW","slot":"starter","is_captain":True,"is_vice":False,"bench_order":None},
        {"player_id":2,"position":"DF","slot":"starter","is_captain":False,"is_vice":False,"bench_order":None},
        {"player_id":3,"position":"GK","slot":"starter","is_captain":False,"is_vice":False,"bench_order":None},
        {"player_id":4,"position":"DF","slot":"sub",    "is_captain":False,"is_vice":False,"bench_order":1},
        {"player_id":5,"position":"MF","slot":"unselected","is_captain":False,"is_vice":False,"bench_order":None},
    ]
    pscore = {1:23, 2:0, 3:6, 4:2, 5:99}  # player 5 unselected: ignorato
    pmin   = {1:90, 2:0, 3:90, 4:70, 5:90}
    gw, cap, det = score_user_gameweek(lineup, pscore, pmin)
    # totale = cap 46 + GK 6 + sub DF 2 = 54 ; capitano = 46 ; player 5 ignorato
    allok &= check("Utente con auto-sub+capitano (tot)", gw, 54)
    allok &= check("Utente capitano_points", cap, 46)

    # Test auto-sub NO stesso ruolo: MF titolare non gioca, sub è DF -> nessun subentro
    lineup2 = [
        {"player_id":1,"position":"GK","slot":"starter","is_captain":True, "is_vice":False,"bench_order":None},
        {"player_id":2,"position":"MF","slot":"starter","is_captain":False,"is_vice":False,"bench_order":None},
        {"player_id":3,"position":"DF","slot":"sub",    "is_captain":False,"is_vice":False,"bench_order":1},
    ]
    pscore2 = {1:4, 2:0, 3:8}
    pmin2   = {1:90, 2:0, 3:90}  # player 2 non gioca, sub è DF -> nessun rimpiazzo MF
    gw2, _, _ = score_user_gameweek(lineup2, pscore2, pmin2)
    allok &= check("Auto-sub ruolo diverso: slot vuoto (solo GK conta)", gw2, 8.0)  # GK cap x2=8

    print("\nTUTTI I TEST PASSATI" if allok else "\n!! ALCUNI TEST FALLITI")
