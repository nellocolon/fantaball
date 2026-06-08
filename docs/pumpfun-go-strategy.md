# pump.fun GO — Side-Quest Strategy

> How Fantaball uses **go.pump.fun** (launched 04 Jun 2026) to keep the long tail engaged during the tournament.

## The problem it solves

The World Cup runs ~4 weeks. After the group stage, mid-table managers know they're out of the top 100 and stop opening the app. Fewer opens → less hype → less volume → fewer fees → the prize pool grows slower. Negative spiral.

**Side-quests give everyone — not just the top 100 — a reason to come back every matchday.**

```
side-quests → users stay active → more opens/clips → more token volume
→ more creator fees → top-100 pool grows → more hype → (repeat)
```

## What pump.fun GO is

A bounty marketplace: "pay anyone to do anything". Auth via X + Solana wallet. Funds locked in escrow on publish ($5 min). **pump.fun has final say** on which submission wins — the creator can only *recommend*. Submissions judged on requirements, originality, quality, fraud signals, compliance.

## Key constraints (these shape the design)

1. **We don't pick the winner** → GO can't be the payout engine for the top 100. The main prize pool stays in OUR system/smart contract.
2. **Objective deliverables only** → every bounty must be verifiable by a stranger (`screenshot + public link/endpoint`). Never "the best/nicest" — subjective bounties risk ambiguous rejects.
3. **Capital locked in escrow on publish** → as a solo founder, prefer many micro-bounties at high frequency over few large ones.
4. **Brand-new feature** → expect bugs, changing ToS. Verify the dispute window before relying on it.

## Fee allocation (decided)

Creator fees are split: **60% prize pool / 30% side-quest GO funding / 10% marketing.**
The 30% funds the bounties below from a separate wallet — never mixed with the top-100 pool.

## The bounty set (reach-first)

The 30% slice is **performance marketing**, not a consolation prize for the long tail. Its primary job is to widen the project's reach; a secondary slice rewards the competition itself. Two categories:

**REACH (primary) — spread the project, paid in SOL:**

| Bounty | Objective threshold (deliverable) | Example reward |
|---|---|---|
| **Spotlight Stream** | Public VOD ≥30 min with the $FANTABALL ticker banner on screen throughout + avg viewers ≥ threshold | ~1 SOL (scaling to 5–10) |
| **Viral Post** | X post about the project with **≥20k real views** (analytics screenshot) + $FANTABALL tag | ~1 SOL |
| **TikTok Drop** | TikTok explaining the project, ticker visible, view count ≥ threshold | ~1 SOL |
| **Thread of the Week** | Explainer thread, impressions ≥ threshold | ~0.5 SOL |

**LADDER (secondary) — reward the competition's long tail:**

| Bounty | Objective threshold (deliverable) | Example reward |
|---|---|---|
| **Bracket Oracle** | Most correct knockout-round predictions, bracket submitted before kickoff | ~0.5 SOL |
| **Man of the Matchday** | Highest single-matchday score + public profile link | ~0.3 SOL |

Rewards start around **1 SOL** and are meant to **scale to 5–10 SOL** per bounty as the founder raises the requirements (bigger audience thresholds, longer streams, etc.).

**Why reach-first beats the old "raffle" model:** small prizes ($10–50) open to everyone attract hundreds of entrants for one winner → felt like a lottery, near-zero expected value, demotivating. Reach bounties instead target creators who already have an audience; even though only one wins, **every losing submission still produces content that puts the project in front of new people**. We pay one winner but harvest N pieces of reach.

Orchestration: weekly

## Anti-fraud

Dual-auth: the X username + wallet used on GO must match the in-app account. Timestamps must fall inside the quest window. Deliverables always reconstructable from a public endpoint.

## Technical dependencies (to build)

1. **Public read endpoint** (FastAPI + Supabase) exposing *matchday score* and *leaderboard position* per user, so quests 1/2/3 are verifiable by anyone. See `backend/public_api.py` (stub).
2. **One winner per quest (decided)**: every side-quest pays exactly ONE winner, and **pump.fun makes the final decision** on who wins. We design each quest to have a single, unambiguous winner (e.g. *highest* score, *most* correct predictions, *first* to a milestone, *most* views). We never run multi-winner side-quests on GO — that removes any need for multi-payout and keeps every quest clean and verifiable.

## In-app implementation (done)

- New **Quests** tab (bottom nav) listing live/upcoming bounties with reward, pool, time left, entrants, deliverable, and "ENTER ON GO".
- **Pool** tab shows the 60/30/10 fee split with the 30% labelled "Side Quests · daily GO bounties".
- **Ranks** tab has a banner for sub-top-100 players: "Not top 100 yet? Win anyway." → opens Quests.
