-- Privacidade resumo + origem: detalhe só se ve_detalhe; linhas filtradas por origem.
-- Compõe com 20260904_transacao_visivel_privacidade (já no live lxatvhjhywctnpcexfqg).
-- NÃO aplicar no LEO.

create or replace function public.ve_detalhe_carteira(p_wallet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wallets w
    where w.id = p_wallet_id
      and w.deleted_at is null
      and public.e_membro(w.id)
      and (
        w.visibilidade = 'aberta'
        or w.dono_id = auth.uid()
        or w.visibilidade = 'fechada'
      )
  );
$$;

revoke all on function public.ve_detalhe_carteira(uuid) from public, anon;
grant execute on function public.ve_detalhe_carteira(uuid) to authenticated;

drop policy if exists transactions_all on public.transactions;
drop policy if exists transactions_select on public.transactions;
drop policy if exists transactions_insert on public.transactions;
drop policy if exists transactions_update on public.transactions;
drop policy if exists transactions_delete on public.transactions;

create policy transactions_select on public.transactions
  for select to authenticated
  using (
    public.ve_detalhe_carteira(wallet_id)
    and public.transacao_visivel(wallet_id, account_id, card_id, pagador_id)
  );

create policy transactions_insert on public.transactions
  for insert to authenticated
  with check (
    public.e_membro(wallet_id)
    and (
      (account_id is null and card_id is null)
      or (account_id is not null and exists (
        select 1 from public.accounts a
        where a.id = account_id
          and public.origem_visivel(a.wallet_id, a.dono_id, a.visibilidade)
      ))
      or (card_id is not null and exists (
        select 1 from public.cards c
        where c.id = card_id
          and public.origem_visivel(c.wallet_id, c.dono_id, c.visibilidade)
      ))
    )
  );

create policy transactions_update on public.transactions
  for update to authenticated
  using (
    public.ve_detalhe_carteira(wallet_id)
    and public.transacao_visivel(wallet_id, account_id, card_id, pagador_id)
  )
  with check (
    public.e_membro(wallet_id)
    and public.transacao_visivel(wallet_id, account_id, card_id, pagador_id)
  );

create policy transactions_delete on public.transactions
  for delete to authenticated
  using (
    public.ve_detalhe_carteira(wallet_id)
    and public.transacao_visivel(wallet_id, account_id, card_id, pagador_id)
  );

-- Agregado mensal para membro em carteira `resumo` (sem detalhe).
drop view if exists public.resumo_mensal_carteira;
create view public.resumo_mensal_carteira
with (security_invoker = true)
as
select
  t.wallet_id,
  (extract(year from timezone('America/Sao_Paulo', t.data)))::int as ano,
  (extract(month from timezone('America/Sao_Paulo', t.data)))::int as mes,
  coalesce(sum(case when t.tipo = 'despesa' then t.valor_centavos else 0 end), 0)::bigint as despesas_centavos,
  coalesce(sum(case when t.tipo = 'receita' then t.valor_centavos else 0 end), 0)::bigint as receitas_centavos,
  count(*)::int as qtd
from public.transactions t
where t.deleted_at is null
  and public.e_membro(t.wallet_id)
group by 1, 2, 3;

-- security_invoker=true faz a view respeitar RLS — parceiro em resumo não lê detalhe,
-- então o agregado viria vazio. Função security definer só para membro autenticado.
create or replace function public.resumo_mensal_da_carteira(p_wallet_id uuid)
returns table (
  ano int,
  mes int,
  despesas_centavos bigint,
  receitas_centavos bigint,
  qtd int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (extract(year from timezone('America/Sao_Paulo', t.data)))::int,
    (extract(month from timezone('America/Sao_Paulo', t.data)))::int,
    coalesce(sum(case when t.tipo = 'despesa' then t.valor_centavos else 0 end), 0)::bigint,
    coalesce(sum(case when t.tipo = 'receita' then t.valor_centavos else 0 end), 0)::bigint,
    count(*)::int
  from public.transactions t
  where t.deleted_at is null
    and t.wallet_id = p_wallet_id
    and public.e_membro(p_wallet_id)
  group by 1, 2
  order by 1 desc, 2 desc;
$$;

revoke all on function public.resumo_mensal_da_carteira(uuid) from public, anon;
grant execute on function public.resumo_mensal_da_carteira(uuid) to authenticated;

grant select on public.resumo_mensal_carteira to authenticated;

comment on function public.resumo_mensal_da_carteira(uuid) is
  'Agregado mensal. Usar em carteira resumo no lugar do detalhe de transactions.';
