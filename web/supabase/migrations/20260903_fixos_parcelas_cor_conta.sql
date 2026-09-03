-- Parcelas no fixo (valor por competência) e cor na conta.
-- Projeto novo (lxatvhjhywctnpcexfqg). Não aplicar no LEO / PRESIDENTE.

alter table public.accounts
  add column if not exists cor text;

alter table public.fixed_expenses
  add column if not exists parcelas integer not null default 1;

alter table public.fixed_expenses
  add column if not exists valores_parcelas integer[];

alter table public.fixed_expenses
  drop constraint if exists fixed_expenses_parcelas_check;
alter table public.fixed_expenses
  add constraint fixed_expenses_parcelas_check check (parcelas >= 1 and parcelas <= 48);

comment on column public.accounts.cor is
  'Cor da paleta dos cartões. Lista e lançar usam bolinha/faixa.';
comment on column public.fixed_expenses.parcelas is
  '1 = todo mês no horizonte; N = N competências.';
comment on column public.fixed_expenses.valores_parcelas is
  'Centavos de cada parcela quando parcelas > 1.';
