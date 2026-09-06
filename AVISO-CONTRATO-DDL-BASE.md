# AVISO — Contrato: DDL base no git

**Data:** 2026-09-06

## O que faltava

`web/supabase/migrations/` só tinha ALTER/policy sobre `wallets`, `accounts`, `cards`, `invoices`, `transactions`, `categories` — sem `CREATE TABLE` dessas bases. Greenfield (`supabase db reset` só com o git) quebrava.

## O que entrou

Arquivo: `web/supabase/migrations/20260801_base_schema.sql` (timestamp **antes** de `20260902_*`).

CREATE TABLE canônico (colunas usadas pelo código TS/Swift + ALTERs), com:

- PKs / FKs óbvias (`wallet_id`, `card_id`, …)
- CHECKs de enums alinhados (incl. `transactions.status` ∈ `liquidado`|`a_pagar`)
- índices únicos de `hash_dedup` (`fixa|%`, `ofx|%`, `compromisso|%`) já referenciados nas migrations posteriores

Migrations posteriores continuam com `IF NOT EXISTS` / `drop … if exists` — cadeia completa segue idempotente.

## Não inventado

Sem colunas que o código não lê/escreve (ex.: sem `icone` em `wallets` no SQL — só no SwiftData local; sem FK de `category_id` → `categories`, igual `fixed_expenses`/`goals` que usam `text` solto).
