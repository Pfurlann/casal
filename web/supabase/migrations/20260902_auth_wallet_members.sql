-- Per-user wallets: membership + RLS. Anon loses table access.

alter table public.wallets
  add column if not exists dono_id uuid references auth.users (id);

create table if not exists public.wallet_members (
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  papel text not null default 'dono',
  created_at timestamptz not null default now(),
  primary key (wallet_id, user_id)
);

create index if not exists wallet_members_user_id_idx on public.wallet_members (user_id);

alter table public.wallet_members enable row level security;

create or replace function public.e_membro(wid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wallet_members
    where wallet_id = wid
      and user_id = auth.uid()
  );
$$;

revoke all on function public.e_membro(uuid) from public;
grant execute on function public.e_membro(uuid) to authenticated;

create or replace function public.wallets_antes_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.dono_id is null then
    new.dono_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists wallets_antes_insert on public.wallets;
create trigger wallets_antes_insert
  before insert on public.wallets
  for each row
  execute function public.wallets_antes_insert();

create or replace function public.wallets_depois_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    insert into public.wallet_members (wallet_id, user_id, papel)
    values (new.id, auth.uid(), 'dono')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists wallets_depois_insert on public.wallets;
create trigger wallets_depois_insert
  after insert on public.wallets
  for each row
  execute function public.wallets_depois_insert();

drop policy if exists wallets_anon on public.wallets;
drop policy if exists accounts_anon on public.accounts;
drop policy if exists cards_anon on public.cards;
drop policy if exists invoices_anon on public.invoices;
drop policy if exists transactions_anon on public.transactions;
drop policy if exists categories_anon on public.categories;

drop policy if exists wallets_select on public.wallets;
drop policy if exists wallets_insert on public.wallets;
drop policy if exists wallets_update on public.wallets;
drop policy if exists wallets_delete on public.wallets;
create policy wallets_select on public.wallets
  for select to authenticated using (public.e_membro(id));
create policy wallets_insert on public.wallets
  for insert to authenticated with check (auth.uid() is not null);
create policy wallets_update on public.wallets
  for update to authenticated using (public.e_membro(id)) with check (public.e_membro(id));
create policy wallets_delete on public.wallets
  for delete to authenticated using (public.e_membro(id));

drop policy if exists members_select on public.wallet_members;
drop policy if exists members_insert on public.wallet_members;
create policy members_select on public.wallet_members
  for select to authenticated using (user_id = auth.uid());
create policy members_insert on public.wallet_members
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists accounts_all on public.accounts;
create policy accounts_all on public.accounts
  for all to authenticated
  using (public.e_membro(wallet_id))
  with check (public.e_membro(wallet_id));

drop policy if exists cards_all on public.cards;
create policy cards_all on public.cards
  for all to authenticated
  using (public.e_membro(wallet_id))
  with check (public.e_membro(wallet_id));

drop policy if exists invoices_all on public.invoices;
create policy invoices_all on public.invoices
  for all to authenticated
  using (
    exists (
      select 1 from public.cards c
      where c.id = invoices.card_id and public.e_membro(c.wallet_id)
    )
  )
  with check (
    exists (
      select 1 from public.cards c
      where c.id = invoices.card_id and public.e_membro(c.wallet_id)
    )
  );

drop policy if exists transactions_all on public.transactions;
create policy transactions_all on public.transactions
  for all to authenticated
  using (public.e_membro(wallet_id))
  with check (public.e_membro(wallet_id));

drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
  for select to authenticated using (true);

revoke all on table public.wallets from anon;
revoke all on table public.accounts from anon;
revoke all on table public.cards from anon;
revoke all on table public.invoices from anon;
revoke all on table public.transactions from anon;
revoke all on table public.categories from anon;
revoke all on table public.wallet_members from anon;

grant select, insert, update, delete on table public.wallets to authenticated;
grant select, insert, update, delete on table public.accounts to authenticated;
grant select, insert, update, delete on table public.cards to authenticated;
grant select, insert, update, delete on table public.invoices to authenticated;
grant select, insert, update, delete on table public.transactions to authenticated;
grant select on table public.categories to authenticated;
grant select, insert, update, delete on table public.wallet_members to authenticated;
