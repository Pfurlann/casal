-- Privacidade resumo: parceiro vê agregado, não detalhe das transactions.
-- Dono e carteira aberta continuam vendo linha a linha.

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
  using (public.ve_detalhe_carteira(wallet_id));

create policy transactions_insert on public.transactions
  for insert to authenticated
  with check (public.e_membro(wallet_id));

create policy transactions_update on public.transactions
  for update to authenticated
  using (public.ve_detalhe_carteira(wallet_id))
  with check (public.e_membro(wallet_id));

create policy transactions_delete on public.transactions
  for delete to authenticated
  using (public.ve_detalhe_carteira(wallet_id));

-- View como owner (sem security_invoker): agrega por baixo do RLS de detalhe,
-- mas só linhas de carteiras em que o caller é membro.
create or replace view public.resumo_mensal_carteira as
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

grant select on public.resumo_mensal_carteira to authenticated;

comment on view public.resumo_mensal_carteira is
  'Agregado mensal por carteira. Membros com visibilidade resumo usam isto no lugar do detalhe.';
