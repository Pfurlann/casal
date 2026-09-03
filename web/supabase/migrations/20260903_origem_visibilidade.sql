-- Visibilidade de contas e cartões: pessoal | conjunta | ambas.
-- Dono = quem cadastrou. Projeto novo (lxatvhjhywctnpcexfqg). Não aplicar no LEO.

alter table public.accounts
  add column if not exists dono_id uuid references auth.users (id);
alter table public.accounts
  add column if not exists visibilidade text;

alter table public.cards
  add column if not exists dono_id uuid references auth.users (id);
alter table public.cards
  add column if not exists visibilidade text;

update public.accounts a
set
  dono_id = coalesce(
    a.dono_id,
    w.dono_id,
    (
      select m.user_id
      from public.wallet_members m
      where m.wallet_id = a.wallet_id and m.papel = 'dono'
      limit 1
    )
  ),
  visibilidade = coalesce(
    nullif(a.visibilidade, ''),
    case when w.visibilidade = 'fechada' then 'pessoal' else 'conjunta' end
  )
from public.wallets w
where w.id = a.wallet_id;

update public.cards c
set
  dono_id = coalesce(
    c.dono_id,
    w.dono_id,
    (
      select m.user_id
      from public.wallet_members m
      where m.wallet_id = c.wallet_id and m.papel = 'dono'
      limit 1
    )
  ),
  visibilidade = coalesce(
    nullif(c.visibilidade, ''),
    case when w.visibilidade = 'fechada' then 'pessoal' else 'conjunta' end
  )
from public.wallets w
where w.id = c.wallet_id;

alter table public.accounts
  alter column visibilidade set default 'pessoal';
update public.accounts set visibilidade = 'pessoal' where visibilidade is null;
alter table public.accounts
  alter column visibilidade set not null;
alter table public.accounts
  drop constraint if exists accounts_visibilidade_check;
alter table public.accounts
  add constraint accounts_visibilidade_check
  check (visibilidade in ('pessoal', 'conjunta', 'ambas'));

alter table public.cards
  alter column visibilidade set default 'pessoal';
update public.cards set visibilidade = 'pessoal' where visibilidade is null;
alter table public.cards
  alter column visibilidade set not null;
alter table public.cards
  drop constraint if exists cards_visibilidade_check;
alter table public.cards
  add constraint cards_visibilidade_check
  check (visibilidade in ('pessoal', 'conjunta', 'ambas'));

comment on column public.accounts.dono_id is
  'Quem cadastrou a conta. Default = auth.uid().';
comment on column public.accounts.visibilidade is
  'pessoal | conjunta | ambas. Controla em quais carteiras do dono a conta aparece.';
comment on column public.cards.dono_id is
  'Quem cadastrou o cartão. Default = auth.uid().';
comment on column public.cards.visibilidade is
  'pessoal | conjunta | ambas. Controla em quais carteiras do dono o cartão aparece.';

create or replace function public.origem_antes_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vis text;
begin
  if new.dono_id is null then
    new.dono_id := auth.uid();
  end if;
  if new.visibilidade is null or new.visibilidade = '' then
    select case when visibilidade = 'fechada' then 'pessoal' else 'conjunta' end
      into v_vis
    from public.wallets
    where id = new.wallet_id;
    new.visibilidade := coalesce(v_vis, 'pessoal');
  end if;
  return new;
end;
$$;

drop trigger if exists accounts_origem_antes on public.accounts;
create trigger accounts_origem_antes
  before insert on public.accounts
  for each row
  execute function public.origem_antes_insert();

drop trigger if exists cards_origem_antes on public.cards;
create trigger cards_origem_antes
  before insert on public.cards
  for each row
  execute function public.origem_antes_insert();

create or replace function public.origem_visivel(p_wallet_id uuid, p_dono uuid, p_vis text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.e_membro(p_wallet_id)
    and (
      p_dono = auth.uid()
      or (
        p_vis in ('conjunta', 'ambas')
        and exists (
          select 1
          from public.wallets w
          where w.id = p_wallet_id
            and w.deleted_at is null
            and w.visibilidade = 'aberta'
        )
      )
    );
$$;

revoke all on function public.origem_antes_insert() from public, anon, authenticated;
revoke all on function public.origem_visivel(uuid, uuid, text) from public, anon;
grant execute on function public.origem_visivel(uuid, uuid, text) to authenticated;

drop policy if exists accounts_all on public.accounts;
drop policy if exists accounts_select on public.accounts;
drop policy if exists accounts_insert on public.accounts;
drop policy if exists accounts_update on public.accounts;
drop policy if exists accounts_delete on public.accounts;

create policy accounts_select on public.accounts
  for select to authenticated
  using (public.origem_visivel(wallet_id, dono_id, visibilidade));

create policy accounts_insert on public.accounts
  for insert to authenticated
  with check (public.e_membro(wallet_id) and (dono_id = auth.uid() or dono_id is null));

create policy accounts_update on public.accounts
  for update to authenticated
  using (dono_id = auth.uid() or (dono_id is null and public.e_membro(wallet_id)))
  with check (dono_id = auth.uid() or (dono_id is null and public.e_membro(wallet_id)));

create policy accounts_delete on public.accounts
  for delete to authenticated
  using (dono_id = auth.uid() or (dono_id is null and public.e_membro(wallet_id)));

drop policy if exists cards_all on public.cards;
drop policy if exists cards_select on public.cards;
drop policy if exists cards_insert on public.cards;
drop policy if exists cards_update on public.cards;
drop policy if exists cards_delete on public.cards;

create policy cards_select on public.cards
  for select to authenticated
  using (public.origem_visivel(wallet_id, dono_id, visibilidade));

create policy cards_insert on public.cards
  for insert to authenticated
  with check (public.e_membro(wallet_id) and (dono_id = auth.uid() or dono_id is null));

create policy cards_update on public.cards
  for update to authenticated
  using (dono_id = auth.uid() or (dono_id is null and public.e_membro(wallet_id)))
  with check (dono_id = auth.uid() or (dono_id is null and public.e_membro(wallet_id)));

create policy cards_delete on public.cards
  for delete to authenticated
  using (dono_id = auth.uid() or (dono_id is null and public.e_membro(wallet_id)));

drop policy if exists invoices_all on public.invoices;
create policy invoices_all on public.invoices
  for all to authenticated
  using (
    exists (
      select 1 from public.cards c
      where c.id = invoices.card_id
        and public.origem_visivel(c.wallet_id, c.dono_id, c.visibilidade)
    )
  )
  with check (
    exists (
      select 1 from public.cards c
      where c.id = invoices.card_id
        and public.origem_visivel(c.wallet_id, c.dono_id, c.visibilidade)
    )
  );
