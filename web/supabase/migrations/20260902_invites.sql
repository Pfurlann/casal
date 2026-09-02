-- Convite para carteira conjunta. Código gerado pelo dono; aceite cria wallet_member.

alter table public.wallet_members
  add column if not exists email text not null default '';

update public.wallet_members m
set email = coalesce(u.email, m.email)
from auth.users u
where u.id = m.user_id
  and (m.email is null or m.email = '');

create or replace function public.wallet_members_antes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null or new.email = '' then
    select coalesce(email, '') into new.email from auth.users where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists wallet_members_antes on public.wallet_members;
create trigger wallet_members_antes
  before insert or update on public.wallet_members
  for each row
  execute function public.wallet_members_antes();

drop policy if exists members_insert on public.wallet_members;
drop policy if exists members_select on public.wallet_members;
create policy members_select on public.wallet_members
  for select to authenticated
  using (user_id = auth.uid() or public.e_membro(wallet_id));

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  codigo text not null,
  criado_por uuid not null references auth.users (id),
  expira_em timestamptz not null,
  aceito_por uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists invites_codigo_idx on public.invites (codigo);
create index if not exists invites_wallet_id_idx on public.invites (wallet_id);

alter table public.invites enable row level security;

drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites
  for select to authenticated
  using (public.e_membro(wallet_id));

revoke all on table public.invites from anon;
grant select on table public.invites to authenticated;

create or replace function public.codigo_convite()
returns text
language plpgsql
as $$
declare
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
  saida text := '';
begin
  for i in 1..6 loop
    saida := saida || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
  end loop;
  return saida;
end;
$$;

revoke all on function public.codigo_convite() from public, anon, authenticated;

create or replace function public.criar_convite(p_wallet_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_vis text;
  v_codigo text;
  v_expira timestamptz;
  v_atual record;
  v_tentativa int;
begin
  if v_uid is null then
    raise exception 'nao autenticado';
  end if;
  if not public.e_membro(p_wallet_id) then
    raise exception 'sem permissao';
  end if;
  if not exists (
    select 1 from public.wallet_members
    where wallet_id = p_wallet_id and user_id = v_uid and papel = 'dono'
  ) then
    raise exception 'so o dono convida';
  end if;
  select visibilidade into v_vis from public.wallets where id = p_wallet_id and deleted_at is null;
  if v_vis is null then
    raise exception 'carteira inexistente';
  end if;
  if v_vis = 'fechada' then
    raise exception 'carteira fechada nao aceita convite';
  end if;

  select codigo, expira_em into v_atual
  from public.invites
  where wallet_id = p_wallet_id
    and aceito_por is null
    and expira_em > now()
    and deleted_at is null
  order by created_at desc
  limit 1;

  if found then
    return jsonb_build_object('codigo', v_atual.codigo, 'expira_em', v_atual.expira_em);
  end if;

  v_expira := now() + interval '7 days';
  for v_tentativa in 1..8 loop
    v_codigo := public.codigo_convite();
    begin
      insert into public.invites (wallet_id, codigo, criado_por, expira_em)
      values (p_wallet_id, v_codigo, v_uid, v_expira);
      return jsonb_build_object('codigo', v_codigo, 'expira_em', v_expira);
    exception when unique_violation then
      null;
    end;
  end loop;
  raise exception 'nao foi possivel gerar codigo';
end;
$$;

create or replace function public.aceitar_convite(p_codigo text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_codigo text;
  v_inv public.invites%rowtype;
  v_vis text;
begin
  if v_uid is null then
    raise exception 'nao autenticado';
  end if;
  v_codigo := upper(regexp_replace(trim(p_codigo), '[^a-zA-Z0-9]', '', 'g'));
  if length(v_codigo) < 6 then
    raise exception 'codigo invalido';
  end if;

  select * into v_inv
  from public.invites
  where codigo = v_codigo
    and aceito_por is null
    and deleted_at is null
  for update;

  if not found then
    raise exception 'codigo invalido';
  end if;
  if v_inv.expira_em <= now() then
    raise exception 'convite expirado';
  end if;
  if v_inv.criado_por = v_uid then
    raise exception 'nao pode aceitar o proprio convite';
  end if;
  if exists (
    select 1 from public.wallet_members
    where wallet_id = v_inv.wallet_id and user_id = v_uid
  ) then
    raise exception 'ja e membro';
  end if;

  select visibilidade into v_vis from public.wallets where id = v_inv.wallet_id;
  if v_vis = 'fechada' then
    raise exception 'carteira fechada nao aceita membros';
  end if;

  insert into public.wallet_members (wallet_id, user_id, papel)
  values (v_inv.wallet_id, v_uid, 'membro');

  update public.invites
  set aceito_por = v_uid, updated_at = now()
  where id = v_inv.id;

  return v_inv.wallet_id;
end;
$$;

revoke all on function public.criar_convite(uuid) from public, anon;
revoke all on function public.aceitar_convite(text) from public, anon;
grant execute on function public.criar_convite(uuid) to authenticated;
grant execute on function public.aceitar_convite(text) to authenticated;

revoke all on function public.wallet_members_antes() from public, anon, authenticated;
