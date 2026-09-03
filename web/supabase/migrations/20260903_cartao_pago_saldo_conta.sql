-- Compra no cartão já está paga no cartão. O a_pagar fica só no total da fatura.

update public.transactions
set status = 'liquidado', updated_at = now()
where deleted_at is null
  and card_id is not null
  and coalesce(hash_dedup, '') not like 'fatura|%'
  and coalesce(hash_dedup, '') not like 'pagamento|%';
