# Backend

Python: scoring engine, gameweek jobs, and the public API.

## Files
- `scoring.py` — pure scoring engine (11 self-tests: `python scoring.py`).
- `calc_gameweek.py` — computes player + user scores for a gameweek and writes them to Supabase. Run: `python calc_gameweek.py <gw> [--final]`.
- `import_fixtures.py` — pulls the 104 World Cup fixtures from API-Football into `fixtures`.
- `public_api.py` — **FastAPI** public read API (no auth): GO bounty verification + `/public/stream/state` for the overlay. Boots and serves; reads Supabase via REST.

## Env (`.env.example`)
- `SUPABASE_URL`, `SUPABASE_KEY` — Supabase REST. Use **service_role** for the write jobs (they bypass RLS), **anon** is fine for `public_api`.
- `API_FOOTBALL_KEY` — only for the fixtures/scoring jobs.

## Run locally
```bash
pip install -r requirements.txt
uvicorn public_api:app --reload --port 8000   # http://localhost:8000/health
python scoring.py                              # run the engine tests
```

## Deploy (Railway)
Root directory `backend`; the `Procfile` runs `uvicorn public_api:app`. Set the env vars in Railway → Variables.
