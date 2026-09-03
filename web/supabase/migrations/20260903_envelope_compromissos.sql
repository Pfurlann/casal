-- Envelope nas metas (alocado + conta) e compromissos a pagar.
-- Projeto novo (lxatvhjhywctnpcexfqg). Não aplicar no LEO / PRESIDENTE.

alter table public.goals
  drop constraint if exists goals_periodo_check;
alter table public.goals
  add constraint goals_periodo_check check (periodo in ('mensal', 'longo_prazo'));

alter table public.goals
  add column if not exists account_id uuid references public.accounts (id);
alter table public.goals
  add column if not exists alocado_centavos integer not null default 0;

alter table public.goals
  drop constraint if exists goals_alocado_check;
alter table public.goals
  add constraint goals_alocado_check check (alocado_centavos >= 0);

update public.goals
set periodo = 'longo_prazo'
where tipo = 'objetivo' and periodo = 'mensal';

alter table public.transactions
  add column if not exists status text not null default 'liquidado';
alter table public.transactions
  drop constraint if exists transactions_status_check;
alter table public.transactions
  add constraint transactions_status_check check (status in ('liquidado', 'a_pagar'));

alter table public.transactions
  add column if not exists goal_id uuid references public.goals (id);

create table if not exists public.commitments (
  id uuid primary key,
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  nome text not null,
  valor_centavos integer not null check (valor_centavos > 0),
  vence_em date not null,
  category_id text not null,
  transaction_id uuid not null references public.transactions (id),
  status text not null default 'a_pagar',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  device_id text,
  constraint commitments_status_check check (status in ('a_pagar', 'liquidado'))
);

create index if not exists commitments_wallet_id_idx
  on public.commitments (wallet_id)
  where deleted_at is null;

create unique index if not exists transactions_hash_dedup_compromisso
  on public.transactions (hash_dedup)
  where deleted_at is null and hash_dedup like 'compromisso|%';

alter table public.commitments enable row level security;

drop policy if exists commitments_all on public.commitments;
create policy commitments_all on public.commitments
  for all to authenticated
  using (public.e_membro(wallet_id))
  with check (public.e_membro(wallet_id));

revoke all on table public.commitments from anon;
grant select, insert, update, delete on table public.commitments to authenticated;

comment on column public.goals.account_id is
  'Conta do envelope. Sem transferência fantasma.';
comment on column public.goals.alocado_centavos is
  'Centavos reservados nesta conta. Livre = saldo − soma.';
comment on table public.commitments is
  'Conta a pagar. O cadastro já é o lançamento; liquidar só escolhe a origem.';
