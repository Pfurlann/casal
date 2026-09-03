-- Dedup de importação OFX. Projeto novo (lxatvhjhywctnpcexfqg). Não aplicar no LEO / PRESIDENTE.

create unique index if not exists transactions_hash_dedup_ofx
  on public.transactions (hash_dedup)
  where deleted_at is null and hash_dedup like 'ofx|%';
