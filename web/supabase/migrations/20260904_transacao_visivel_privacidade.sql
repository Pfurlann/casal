-- §18 endurecimento: transações respeitam visibilidade da origem (conta/cartão).
-- Parceiro membro deixa de ler lançamentos em conta/cartão pessoal alheio.
-- Carteira `resumo` compartilha origem conjunta/ambas (como aberta); pessoal continua só do dono.
-- Projeto live: lxatvhjhywctnpcexfqg. Não aplicar no LEO.

create or replace function public.origem_visivel(p_wallet_id uuid, p_dono uuid, p_vis text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.e_membro(p_wallet_id)
    and (
      p_dono is null
      or p_dono = auth.uid()
      or (
        p_vis in ('conjunta', 'ambas')
        and exists (
          select 1
          from public.wallets w
          where w.id = p_wallet_id
            and w.deleted_at is null
            and w.visibilidade in ('aberta', 'resumo')
        )
      )
    );
$$;

create or replace function public.transacao_visivel(
  p_wallet_id uuid,
  p_account_id uuid,
  p_card_id uuid,
  p_pagador_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.e_membro(p_wallet_id)
    and case
      when p_card_id is not null then exists (
        select 1 from public.cards c
        where c.id = p_card_id
          and public.origem_visivel(c.wallet_id, c.dono_id, c.visibilidade)
      )
      when p_account_id is not null then exists (
        select 1 from public.accounts a
        where a.id = p_account_id
          and public.origem_visivel(a.wallet_id, a.dono_id, a.visibilidade)
      )
      else (
        p_pagador_id is null
        or p_pagador_id = auth.uid()
        or exists (
          select 1 from public.wallets w
          where w.id = p_wallet_id
            and w.deleted_at is null
            and w.visibilidade in ('aberta', 'resumo')
        )
      )
    end;
$$;

revoke all on function public.transacao_visivel(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.transacao_visivel(uuid, uuid, uuid, uuid) to authenticated;

drop policy if exists transactions_all on public.transactions;
drop policy if exists transactions_select on public.transactions;
drop policy if exists transactions_insert on public.transactions;
drop policy if exists transactions_update on public.transactions;
drop policy if exists transactions_delete on public.transactions;

create policy transactions_select on public.transactions
  for select to authenticated
  using (
    public.transacao_visivel(wallet_id, account_id, card_id, pagador_id)
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
  using (public.transacao_visivel(wallet_id, account_id, card_id, pagador_id))
  with check (public.transacao_visivel(wallet_id, account_id, card_id, pagador_id));

create policy transactions_delete on public.transactions
  for delete to authenticated
  using (public.transacao_visivel(wallet_id, account_id, card_id, pagador_id));
