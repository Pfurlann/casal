-- Categorias da carteira (wallet_id nulo = seed do sistema) e tipo em fixos.

alter table public.categories
  add column if not exists wallet_id uuid references public.wallets (id) on delete cascade;

alter table public.categories
  add column if not exists deleted_at timestamptz;

alter table public.categories
  add column if not exists device_id text;

alter table public.categories
  add column if not exists updated_at timestamptz not null default now();

create index if not exists categories_wallet_id_idx
  on public.categories (wallet_id)
  where deleted_at is null;

drop policy if exists categories_select on public.categories;
drop policy if exists categories_insert on public.categories;
drop policy if exists categories_update on public.categories;
drop policy if exists categories_delete on public.categories;
drop policy if exists categories_all on public.categories;

create policy categories_select on public.categories
  for select to authenticated
  using (wallet_id is null or public.e_membro(wallet_id));

create policy categories_insert on public.categories
  for insert to authenticated
  with check (wallet_id is not null and public.e_membro(wallet_id));

create policy categories_update on public.categories
  for update to authenticated
  using (wallet_id is not null and public.e_membro(wallet_id))
  with check (wallet_id is not null and public.e_membro(wallet_id));

create policy categories_delete on public.categories
  for delete to authenticated
  using (wallet_id is not null and public.e_membro(wallet_id));

grant select, insert, update, delete on table public.categories to authenticated;

alter table public.fixed_expenses
  add column if not exists tipo text not null default 'despesa';

alter table public.fixed_expenses drop constraint if exists fixed_expenses_tipo_check;
alter table public.fixed_expenses
  add constraint fixed_expenses_tipo_check check (tipo in ('despesa', 'receita'));
