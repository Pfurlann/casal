-- DDL base (greenfield). Inferido de ALTER existentes + web/src/lib + CasalDomain.
-- Timestamp anterior a 20260902_* para supabase db reset teórico só com o git.
-- Colunas extras dos ALTER usam IF NOT EXISTS — rodar a cadeia completa continua idempotente.
-- Estado canônico de transactions.status: liquidado | a_pagar
--   (legado iOS confirmada→liquidado, pendente→a_pagar — ver AVISO-CONTRATO-ESTADO-TX.md).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- wallets
-- ---------------------------------------------------------------------------
create table if not exists public.wallets (
  id uuid primary key,
  nome text not null,
  cor text not null default '#7C5CFF',
  rotulo text not null default 'pessoal',
  visibilidade text not null default 'aberta',
  dono_id uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  device_id text,
  constraint wallets_rotulo_check check (rotulo in ('pessoal', 'compartilhada', 'pj')),
  constraint wallets_visibilidade_check check (visibilidade in ('aberta', 'resumo', 'fechada'))
);

create index if not exists wallets_dono_id_idx on public.wallets (dono_id)
  where deleted_at is null;

alter table public.wallets enable row level security;

-- ---------------------------------------------------------------------------
-- accounts
-- ---------------------------------------------------------------------------
create table if not exists public.accounts (
  id uuid primary key,
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  nome text not null,
  tipo text not null default 'corrente',
  saldo_inicial_centavos integer not null default 0,
  arquivada boolean not null default false,
  cor text,
  dono_id uuid references auth.users (id),
  visibilidade text not null default 'pessoal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  device_id text,
  constraint accounts_tipo_check check (tipo in ('corrente', 'poupanca', 'dinheiro')),
  constraint accounts_visibilidade_check check (visibilidade in ('pessoal', 'conjunta', 'ambas'))
);

create index if not exists accounts_wallet_id_idx on public.accounts (wallet_id)
  where deleted_at is null;

alter table public.accounts enable row level security;

-- ---------------------------------------------------------------------------
-- cards
-- ---------------------------------------------------------------------------
create table if not exists public.cards (
  id uuid primary key,
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  apelido text not null,
  banco text not null default '',
  ultimos4 text not null default '',
  bandeira text not null default 'outra',
  cor text not null default '#7C5CFF',
  limite_centavos integer not null default 0,
  dia_fechamento integer not null default 1,
  dia_vencimento integer not null default 10,
  arquivado boolean not null default false,
  programa_pontos text,
  saldo_pontos integer,
  pontos_por_unidade_x100 integer,
  moeda_acumulo text,
  valor_ponto_centavos integer,
  dono_id uuid references auth.users (id),
  visibilidade text not null default 'pessoal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  device_id text,
  constraint cards_bandeira_check check (
    bandeira in ('visa', 'mastercard', 'elo', 'amex', 'hipercard', 'outra')
  ),
  constraint cards_dia_fechamento_check check (dia_fechamento between 1 and 31),
  constraint cards_dia_vencimento_check check (dia_vencimento between 1 and 31),
  constraint cards_moeda_acumulo_check check (moeda_acumulo is null or moeda_acumulo in ('usd', 'brl')),
  constraint cards_visibilidade_check check (visibilidade in ('pessoal', 'conjunta', 'ambas'))
);

create index if not exists cards_wallet_id_idx on public.cards (wallet_id)
  where deleted_at is null;

alter table public.cards enable row level security;

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key,
  card_id uuid not null references public.cards (id) on delete cascade,
  competencia_ano integer not null,
  competencia_mes integer not null,
  fecha_em date not null,
  vence_em date not null,
  status text not null default 'aberta',
  valor_pago_centavos integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  device_id text,
  constraint invoices_competencia_mes_check check (competencia_mes between 1 and 12),
  constraint invoices_status_check check (status in ('aberta', 'fechada', 'parcial', 'paga')),
  constraint invoices_valor_pago_check check (valor_pago_centavos >= 0)
);

create index if not exists invoices_card_id_idx on public.invoices (card_id)
  where deleted_at is null;

alter table public.invoices enable row level security;

-- ---------------------------------------------------------------------------
-- categories (wallet_id null = catálogo do sistema)
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id text primary key,
  wallet_id uuid references public.wallets (id) on delete cascade,
  nome text not null,
  icone text not null default 'outros',
  cor text not null default '#8E8E93',
  tipo text not null default 'despesa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  device_id text,
  constraint categories_tipo_check check (tipo in ('despesa', 'receita'))
);

create index if not exists categories_wallet_id_idx on public.categories (wallet_id)
  where deleted_at is null;

alter table public.categories enable row level security;

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key,
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  tipo text not null,
  valor_centavos integer not null,
  data timestamptz not null,
  category_id text,
  descricao text not null default '',
  account_id uuid references public.accounts (id),
  card_id uuid references public.cards (id),
  invoice_id uuid references public.invoices (id),
  pagador_id uuid references auth.users (id),
  hash_dedup text not null default '',
  grupo_parcela uuid,
  parcela_n integer not null default 1,
  parcela_total integer not null default 1,
  status text not null default 'liquidado',
  goal_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  device_id text,
  constraint transactions_tipo_check check (tipo in ('despesa', 'receita', 'transferencia')),
  constraint transactions_status_check check (status in ('liquidado', 'a_pagar')),
  constraint transactions_parcela_check check (
    parcela_n >= 1 and parcela_total >= 1 and parcela_n <= parcela_total
  )
);

create index if not exists transactions_wallet_id_idx on public.transactions (wallet_id)
  where deleted_at is null;

create index if not exists transactions_account_id_idx on public.transactions (account_id)
  where deleted_at is null;

create index if not exists transactions_card_id_idx on public.transactions (card_id)
  where deleted_at is null;

-- Índices únicos de dedup (também recriados com IF NOT EXISTS nas migrations posteriores)
create unique index if not exists transactions_hash_dedup_fixa
  on public.transactions (hash_dedup)
  where deleted_at is null and hash_dedup like 'fixa|%';

create unique index if not exists transactions_hash_dedup_ofx
  on public.transactions (hash_dedup)
  where deleted_at is null and hash_dedup like 'ofx|%';

create unique index if not exists transactions_hash_dedup_compromisso
  on public.transactions (hash_dedup)
  where deleted_at is null and hash_dedup like 'compromisso|%';

alter table public.transactions enable row level security;

comment on column public.transactions.status is
  'Canônico: liquidado | a_pagar. Legado iOS: confirmada→liquidado, pendente→a_pagar.';
