-- Alinha dados legados (se houver) ao estado canônico liquidado | a_pagar.
-- No-op se a base já estiver canônica (Postgres/web desde envelope_compromissos).
-- Ver AVISO-CONTRATO-ESTADO-TX.md.

update public.transactions
set status = 'liquidado', updated_at = now()
where status = 'confirmada';

update public.transactions
set status = 'a_pagar', updated_at = now()
where status = 'pendente';

update public.commitments
set status = 'liquidado', updated_at = now()
where status = 'confirmada';

update public.commitments
set status = 'a_pagar', updated_at = now()
where status = 'pendente';

alter table public.transactions
  drop constraint if exists transactions_status_check;
alter table public.transactions
  add constraint transactions_status_check check (status in ('liquidado', 'a_pagar'));

alter table public.commitments
  drop constraint if exists commitments_status_check;
alter table public.commitments
  add constraint commitments_status_check check (status in ('a_pagar', 'liquidado'));
