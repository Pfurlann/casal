-- Programa de pontos do cartão. RLS continua sendo a de cards (por wallet).
-- Saldo é o que a pessoa informa hoje — o app não consulta o banco.
-- Pontos em inteiro. Métrica racional × 100: pontos ganhos a cada 1 USD
-- (default, fatura IOF) ou 1 BRL. 220 = 2,20 pts por unidade.

alter table public.cards
  add column if not exists programa_pontos text,
  add column if not exists saldo_pontos integer,
  add column if not exists pontos_por_unidade_x100 integer,
  add column if not exists moeda_acumulo text,
  add column if not exists valor_ponto_centavos integer;

alter table public.cards
  drop constraint if exists cards_moeda_acumulo_check;

alter table public.cards
  add constraint cards_moeda_acumulo_check
  check (moeda_acumulo is null or moeda_acumulo in ('usd', 'brl'));

comment on column public.cards.programa_pontos is
  'Nome do programa (Livelo, Azul…). Null ou vazio = sem pontos.';
comment on column public.cards.saldo_pontos is
  'Saldo informado pela pessoa hoje. Inteiro. Não é calculado pelo app.';
comment on column public.cards.pontos_por_unidade_x100 is
  'Métrica racional × 100: pontos a cada 1 USD ou 1 BRL. 220 = 2,20 pts.';
comment on column public.cards.moeda_acumulo is
  'usd (default) ou brl — moeda da regra de acúmulo.';
comment on column public.cards.valor_ponto_centavos is
  'Estimativa: centavos de real por 1 ponto. Null = sem equivalente em R$.';
