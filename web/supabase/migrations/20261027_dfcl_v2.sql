-- DFCL V2: pessoa, vencimento, natureza e portador nos lançamentos; cadastro de portadores,
-- de contas do DFCL e metas (previsto) por conta, mês e pessoa.
-- Só acrescenta: não altera nem apaga dado existente. Idempotente.
-- NÃO APLICADA em produção: revisar e aplicar manualmente (ver docs/superpowers/verificacao-v2.md).

-- 1. Lançamentos ---------------------------------------------------------------------

alter table public.transactions
  add column if not exists pessoa text,
  add column if not exists vencimento date,
  add column if not exists natureza text not null default 'resultado',
  add column if not exists portador_id uuid;

alter table public.transactions
  drop constraint if exists transactions_pessoa_check,
  add constraint transactions_pessoa_check
    check (pessoa is null or pessoa in ('Pedro', 'Daniele', 'Conjunto', 'PHF'));

alter table public.transactions
  drop constraint if exists transactions_natureza_check,
  add constraint transactions_natureza_check
    check (natureza in ('resultado', 'movimento'));

comment on column public.transactions.pessoa is
  'DFCL: de quem é o lançamento (rótulo, não usuário). Null nos lançamentos anteriores.';
comment on column public.transactions.natureza is
  'resultado entra no DFCL; movimento (saldo inicial, transferência, aplicação, pagamento de fatura) só mexe no saldo do portador.';

-- 2. Portadores (conta ou cartão) ----------------------------------------------------

create table if not exists public.portadores (
  id uuid primary key,
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  dono text not null,
  instituicao text not null,
  tipo text not null,
  nome text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint portadores_dono_check check (dono in ('Pedro', 'Daniele', 'Conjunto', 'PHF')),
  constraint portadores_tipo_check check (tipo in ('conta', 'cartao'))
);

create unique index if not exists portadores_wallet_nome_idx
  on public.portadores (wallet_id, nome)
  where deleted_at is null;

-- 3. Contas do DFCL (classificação Entrada/Saída e Fixo/Variável) --------------------

create table if not exists public.dfcl_contas (
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  nome text not null,
  tipo text not null,
  classe text not null,
  primary key (wallet_id, nome),
  constraint dfcl_contas_tipo_check check (tipo in ('Entrada', 'Saída')),
  constraint dfcl_contas_classe_check check (classe in ('Fixo', 'Variavel'))
);

-- 4. Metas (previsto): conta, mês e pessoa --------------------------------------------

create table if not exists public.dfcl_metas (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  cenario text not null default 'C01',
  competencia text not null,
  conta text not null,
  pessoa text not null,
  valor_centavos integer not null,
  constraint dfcl_metas_competencia_check check (competencia ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  constraint dfcl_metas_pessoa_check check (pessoa in ('Pedro', 'Daniele', 'Conjunto', 'PHF')),
  constraint dfcl_metas_unica unique (wallet_id, cenario, competencia, conta, pessoa)
);

-- 5. RLS: membros da carteira ---------------------------------------------------------

alter table public.portadores enable row level security;
alter table public.dfcl_contas enable row level security;
alter table public.dfcl_metas enable row level security;

drop policy if exists portadores_all on public.portadores;
create policy portadores_all on public.portadores
  for all to authenticated
  using (public.e_membro(wallet_id))
  with check (public.e_membro(wallet_id));

drop policy if exists dfcl_contas_all on public.dfcl_contas;
create policy dfcl_contas_all on public.dfcl_contas
  for all to authenticated
  using (public.e_membro(wallet_id))
  with check (public.e_membro(wallet_id));

drop policy if exists dfcl_metas_all on public.dfcl_metas;
create policy dfcl_metas_all on public.dfcl_metas
  for all to authenticated
  using (public.e_membro(wallet_id))
  with check (public.e_membro(wallet_id));

revoke all on table public.portadores from anon;
revoke all on table public.dfcl_contas from anon;
revoke all on table public.dfcl_metas from anon;
grant select, insert, update, delete on table public.portadores to authenticated;
grant select, insert, update, delete on table public.dfcl_contas to authenticated;
grant select, insert, update, delete on table public.dfcl_metas to authenticated;
