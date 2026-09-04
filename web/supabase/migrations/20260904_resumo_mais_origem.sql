-- Combina ve_detalhe_carteira (nível carteira `resumo`) com
-- transacao_visivel (nível origem pessoal/conjunta/ambas).

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
