-- Quem pagou o lançamento: um user_id, em geral membro da carteira.
-- RLS de transactions já é e_membro(wallet_id) — dono e membro atualizam.

alter table public.transactions
  add column if not exists pagador_id uuid references auth.users (id);

comment on column public.transactions.pagador_id is
  'Membro da carteira que pagou. Null nos lançamentos anteriores à coluna.';
