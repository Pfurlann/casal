-- Metas da carteira: teto por categoria, economia mensal, objetivo.
-- Soft-delete. RLS por e_membro. wallet_id preenchido = desta carteira.

create table if not exists public.goals (
  id uuid primary key,
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  tipo text not null,
  nome text not null,
  valor_alvo_centavos integer not null check (valor_alvo_centavos > 0),
  category_id text,
  periodo text not null default 'mensal',
  data_alvo date,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  device_id text,
  constraint goals_tipo_check check (tipo in ('teto_categoria', 'economia_mensal', 'objetivo')),
  constraint goals_periodo_check check (periodo = 'mensal'),
  constraint goals_teto_categoria check (
    tipo <> 'teto_categoria' or category_id is not null
  )
);

create index if not exists goals_wallet_id_idx
  on public.goals (wallet_id)
  where deleted_at is null;

alter table public.goals enable row level security;

drop policy if exists goals_all on public.goals;
create policy goals_all on public.goals
  for all to authenticated
  using (public.e_membro(wallet_id))
  with check (public.e_membro(wallet_id));

revoke all on table public.goals from anon;
grant select, insert, update, delete on table public.goals to authenticated;
