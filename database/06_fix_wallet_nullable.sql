-- ════════════════════════════════════════════════════════════════════
-- 06_fix_wallet_nullable.sql
-- Fix: users.wallet was NOT NULL, but X (Twitter) login creates the user
-- row BEFORE a wallet is connected. Make wallet nullable so OAuth sign-in
-- can create the row; the wallet is linked later via "Connect Wallet".
-- The UNIQUE constraint stays (Postgres allows multiple NULLs under UNIQUE).
-- Idempotent: safe to run on the live database.
-- ════════════════════════════════════════════════════════════════════

alter table users alter column wallet drop not null;

-- (optional sanity) confirm the column is now nullable:
--   select is_nullable from information_schema.columns
--   where table_name='users' and column_name='wallet';
