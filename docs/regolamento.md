# Regolamento — Fantaball

**Versione 1.0 — "Lancio Sicuro"**
Sistema di punteggio basato **esclusivamente** su eventi oggettivi forniti da una singola API calcistica (API-Football, endpoint `fixtures`, `fixtures/lineups`, `fixtures/events`, `fixtures/players`).

Ogni punteggio è ricostruibile in automatico e verificabile. Nessuna metrica soggettiva, nessun voto giornalistico, nessuna stima.

---

## 1. Principi

Il punteggio di ogni giocatore si calcola solo da eventi che l'API espone come dati strutturati e affidabili per tutte le 48 nazionali:

- presenza e minuti giocati
- gol, assist, autogol
- cartellini (giallo, rosso, doppio giallo)
- rigori (segnati, sbagliati, parati)
- parate del portiere
- gol subiti e clean sheet
- risultato finale della partita

Non vengono usati: rigori procurati/causati, gol su punizione, gol da fuori area, MVP, gol decisivo, né alcuna metrica avanzata (xG, xA, possesso, passaggi, rating). Questi eventi non sono forniti in modo affidabile da una singola fonte e sono esclusi per garantire l'incontestabilità.

---

## 2. Presenza

Vale per qualsiasi ruolo.

| Evento | Punti | Campo API |
|---|---|---|
| Titolare (presente nella formazione iniziale) | **+1** | `lineups` → `startXI` |
| Almeno 60 minuti giocati | **+1** | `players` → `games.minutes >= 60` |

Un titolare che gioca ≥60' ottiene quindi +2 di base. Un subentrato che gioca <60' ottiene 0 di presenza ma può comunque accumulare bonus evento.

---

## 3. Portieri (GK)

### Bonus
| Evento | Punti | Campo API |
|---|---|---|
| Clean sheet (nessun gol subito, min. 60' giocati) | **+5** | calcolato: `goals.conceded == 0` e `minutes >= 60` |
| Rigore parato | **+8** | `penalty.saved` |
| Ogni 4 parate effettuate | **+1** | `goals.saves` (parte intera di `saves / 4`) |

### Malus
| Evento | Punti | Campo API |
|---|---|---|
| Gol subito (per ciascuno) | **−1** | `goals.conceded` |
| Ammonizione | **−1** | `cards.yellow` |
| Espulsione | **−4** | `cards.red` |
| Autogol | **−4** | `events` → `detail = "Own Goal"` |

---

## 4. Difensori (DF)

### Bonus
| Evento | Punti | Campo API |
|---|---|---|
| Gol segnato | **+8** | `goals.total` |
| Assist | **+5** | `goals.assists` |
| Clean sheet (min. 60' giocati) | **+4** | calcolato: 0 gol subiti dalla squadra e `minutes >= 60` |

### Malus
| Evento | Punti | Campo API |
|---|---|---|
| Ammonizione | **−1** | `cards.yellow` |
| Espulsione | **−4** | `cards.red` |
| Autogol | **−4** | `events` → `detail = "Own Goal"` |

---

## 5. Centrocampisti (MF)

### Bonus
| Evento | Punti | Campo API |
|---|---|---|
| Gol segnato | **+6** | `goals.total` |
| Assist | **+4** | `goals.assists` |

### Malus
| Evento | Punti | Campo API |
|---|---|---|
| Ammonizione | **−1** | `cards.yellow` |
| Espulsione | **−4** | `cards.red` |
| Autogol | **−4** | `events` → `detail = "Own Goal"` |

---

## 6. Attaccanti (FW)

### Bonus
| Evento | Punti | Campo API |
|---|---|---|
| Gol segnato | **+5** | `goals.total` |
| Assist | **+3** | `goals.assists` |
| Tripletta (3 gol nella stessa partita) | **+3 extra** | calcolato da `goals.total == 3` |
| Poker (4+ gol nella stessa partita) | **+6 extra** | calcolato da `goals.total >= 4` |

I bonus tripletta/poker non sono cumulativi tra loro: con 4 gol si applica solo il +6, non +3+6.

### Malus
| Evento | Punti | Campo API |
|---|---|---|
| Ammonizione | **−1** | `cards.yellow` |
| Espulsione | **−4** | `cards.red` |
| Autogol | **−4** | `events` → `detail = "Own Goal"` |

---

## 7. Rigori (tutti i ruoli)

| Evento | Punti | Campo API |
|---|---|---|
| Rigore segnato | conta come **gol** del ruolo | `penalty.scored` (già incluso in `goals.total`) |
| Rigore sbagliato | **−2** | `penalty.missed` |

Il rigore segnato **non** dà punti extra rispetto a un gol normale: vale come il gol del ruolo (+5/+6/+8). Questo evita di sovra-premiare il rigorista, che è spesso già la stella della squadra.

---

## 8. Formula di calcolo

Per ogni giocatore, in ogni partita:

```
punteggio_grezzo =
      punti_presenza
    + bonus_ruolo
    + bonus_rigore
    − malus

punteggio_finale = applica_moltiplicatore_capitano(punteggio_grezzo)
```

### Moltiplicatore Capitano / Vice
Il moltiplicatore si applica al **totale** del giocatore, con **floor a 0** (il capitano non può mai sottrarre punti):

```
se il giocatore è Capitano e ha giocato:
    punteggio_finale = max(0, punteggio_grezzo) × 2

altrimenti se il Capitano NON ha giocato e il giocatore è Vice Capitano:
    punteggio_finale = max(0, punteggio_grezzo) × 1.5

altrimenti:
    punteggio_finale = punteggio_grezzo   (può essere negativo)
```

**Esempi**
- Capitano: 1 gol (+5) e 1 rosso (−4) → grezzo +1 → `max(0,1)×2` = **+2**
- Capitano: 1 autogol (−4), niente bonus → grezzo −4 → `max(0,−4)×2` = **0**
- Giocatore normale (non capitano): stesso autogol → **−4** (il floor vale solo per chi ha il moltiplicatore)

"Capitano non ha giocato" = non risulta nei minuti giocati (`minutes == 0` o assente dai `players`).

---

## 9. Classifica principale

La classifica principale del torneo somma il `punteggio_finale` di ogni giocatore schierato, partita dopo partita. Si basa **solo** sui capitoli 2–8: prestazioni individuali in campo.

Sono **esclusi** dalla classifica principale, di proposito:
- bonus di avanzamento nel torneo (ottavi, quarti, ecc.)
- bonus per il risultato della nazionale (vittoria/sconfitta)

Questi premiano la scelta della nazionale più della prestazione del giocatore e rompono l'equilibrio prezzo-valore della rosa a budget. Restano disponibili come classifiche separate (vedi §10).

---

## 10. Classifiche speciali (opzionali, premi extra)

Calcolate con gli stessi dati API, ma tenute fuori dalla classifica principale per non distorcerla.

**"Nation Picker"** — premia chi indovina le nazionali che vanno lontano:
| Traguardo raggiunto dalla nazionale | Punti a ogni giocatore in rosa |
|---|---|
| Ottavi | +5 |
| Quarti | +5 |
| Semifinale | +7 |
| Finale | +10 |
| Vittoria del Mondiale | +20 |

**"Team Spirit"** — premia il risultato di squadra:
| Risultato | Punti ai titolari |
|---|---|
| Vittoria | +1 |
| Pareggio | 0 |
| Sconfitta | −1 |

Queste classifiche possono alimentare premi dedicati nel prize pool, separati dal premio della classifica principale.

---

## 11. Side-quest su pump.fun GO

Oltre alla classifica principale (top 100), durante il torneo girano **side-quest** giornaliere e settimanali, finanziate dal **30% delle creator fees** del token e pagate tramite **pump.fun GO**. Servono a premiare anche chi è fuori dalla top 100 e a tenere viva l'app ogni giornata.

**Regole delle side-quest:**

1. **Vince una sola persona per quest.** Ogni side-quest ha un unico vincitore. Non esistono premi condivisi o ex-aequo: la quest è sempre disegnata per avere un vincitore univoco (es. *il punteggio più alto*, *più pronostici esatti*, *il primo a una milestone*, *più visualizzazioni*).
2. **La decisione finale spetta a pump.fun.** Come previsto dal funzionamento di GO, è pump.fun ad approvare la submission vincente e a firmare il pagamento dall'escrow. Noi possiamo *raccomandare* una submission ma **non scegliamo il vincitore**.
3. **Deliverable oggettivi.** Ogni quest richiede una prova verificabile da chiunque (`screenshot + link/endpoint pubblico`), mai un giudizio soggettivo. Questo rende il vincitore inequivocabile e riduce i rischi di reject ambiguo.
4. **Finanziamento separato.** Le side-quest attingono a un budget separato (il 30% delle fees, da un wallet dedicato) e **non toccano mai il montepremi della classifica principale** (il 60%, riservato alla top 100).
5. **Anti-frode.** Username X + wallet usati su GO devono combaciare con l'account in-app; i timestamp devono cadere nella finestra della quest.

Il montepremi principale (top 100) **resta nel nostro sistema** e non passa da GO: GO finanzia esclusivamente le side-quest parallele.

---

## 12. Tabella riepilogo rapida

| | GK | DF | MF | FW |
|---|---|---|---|---|
| Titolare | +1 | +1 | +1 | +1 |
| ≥60 min | +1 | +1 | +1 | +1 |
| Gol | — | +8 | +6 | +5 |
| Assist | — | +5 | +4 | +3 |
| Clean sheet | +5 | +4 | — | — |
| Rigore parato | +8 | — | — | — |
| Ogni 4 parate | +1 | — | — | — |
| Tripletta | — | — | — | +3 extra |
| Poker | — | — | — | +6 extra |
| Gol subito | −1 cad. | — | — | — |
| Rigore sbagliato | −2 | −2 | −2 | −2 |
| Ammonizione | −1 | −1 | −1 | −1 |
| Espulsione | −4 | −4 | −4 | −4 |
| Autogol | −4 | −4 | −4 | −4 |

Capitano ×2 · Vice ×1,5 (solo se il capitano non gioca) · floor a 0 sul totale moltiplicato.

---

## 13. Iscrizione tardiva

Ci si può iscrivere fino all'ultima giornata della fase a gironi. Per ogni giornata di gironi già disputata, all'utente viene accreditato un punteggio di default pari al **floor** di quella giornata: il punteggio più basso ottenuto da una squadra che ha schierato 11 giocatori con voto.

Esempio: se nella 1ª giornata il punteggio minimo tra le squadre con 11 giocatori votati è 80, chi si iscrive dopo riceve 80 punti per quella giornata.

---

*Tutti gli eventi sono ricavati da un'unica fonte (API-Football). Ogni punteggio è ricostruibile in automatico e verificabile evento per evento.*
