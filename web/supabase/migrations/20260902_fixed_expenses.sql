-- Despesas fixas mensais da carteira. Soft-delete. RLS por e_membro.

create table if not exists public.fixed_expenses (
  id uuid primary key,
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  nome text not null,
  valor_centavos integer not null check (valor_centavos > 0),
  category_id text not null,
  dia_vencimento integer not null check (dia_vencimento between 1 and 31),
  account_id uuid references public.accounts (id),
  card_id uuid references public.cards (id),
  tipo text not null default 'despesa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  device_id text,
  constraint fixed_expenses_origem check (
    (account_id is not null and card_id is null)
    or (account_id is null and card_id is not null)
  ),
  constraint fixed_expenses_tipo_check check (tipo in ('despesa', 'receita'))
);

create index if not exists fixed_expenses_wallet_id_idx
  on public.fixed_expenses (wallet_id)
  where deleted_at is null;

create unique index if not exists transactions_hash_dedup_fixa
  on public.transactions (hash_dedup)
  where deleted_at is null and hash_dedup like 'fixa|%';

alter table public.fixed_expenses enable row level security;

drop policy if exists fixed_expenses_all on public.fixed_expenses;
create policy fixed_expenses_all on public.fixed_expenses
  for all to authenticated
  using (public.e_membro(wallet_id))
  with check (public.e_membro(wallet_id));

revoke all on table public.fixed_expenses from anon;
grant select, insert, update, delete on table public.fixed_expenses to authenticated;
