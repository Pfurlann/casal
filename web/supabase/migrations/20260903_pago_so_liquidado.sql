-- Check só depois de liquidar (swipe) ou pagar a fatura.
-- Compra no cartão e fixo gerado sem liquidação voltam para a_pagar.

update public.transactions
set status = 'a_pagar', updated_at = now()
where deleted_at is null
  and card_id is not null
  and coalesce(hash_dedup, '') not like 'fatura|%'
  and coalesce(hash_dedup, '') not like 'pagamento|%';

update public.transactions
set status = 'a_pagar', updated_at = now()
where deleted_at is null
  and hash_dedup like 'fixa|%'
  and status is distinct from 'a_pagar';
