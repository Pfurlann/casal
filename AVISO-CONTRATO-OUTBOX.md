# AVISO — Contrato: outbox offline→online (P1 BACK)

**Data:** 2026-09-06  
**Escopo:** fila localStorage por user (`casal-outbox[:userId]`), drain idempotente, soft-delete SQL `deleted_at`, SwiftData upsert in-place.

## Soft-delete no SQL

Campo canônico (DDL `20260801_base_schema.sql` + migrations): **`deleted_at timestamptz`**.

Presente em: `wallets`, `accounts`, `cards`, `invoices`, `categories`, `transactions`, `fixed_expenses`, `goals`, `commitments`, …

No domínio iOS / SwiftData o espelho é **`removidoEm`**.

## Mapa de ops × tabelas (outbox web)

| Op | `transactions` | `cards` | `accounts` | `invoices` |
| --- | --- | --- | --- | --- |
| `insert` | ✅ drain + callers (`lancar`, OFX, … via `enfileirarOutbox`) | ✅ drain + `enfileirarOp` | ✅ drain + `enfileirarOp` | ✅ drain + `enfileirarOp` |
| `update` | ✅ drain + caller `editar` | ✅ drain (API) | ✅ drain (API) | ✅ drain (API) |
| `soft_delete` | ✅ drain + caller `apagar` (`deleted_at`) | ✅ drain + caller `apagarCartao` | ✅ drain (API) | ✅ drain (API) |

- **23505** em `insert` = sucesso (idempotência por id / hash único parcial).
- Item legado (só `linhas`, sem `op`/`tabela`) normaliza para `insert` + `transactions`.
- Contagem `tamanhoOutbox` / `FaixaOffline`: insert conta `linhas.length`; update/soft_delete conta `ids.length`.

API: `web/src/lib/outbox.ts` — `enfileirarOutbox` (legado insert txs), `enfileirarOp`, `drenarOutbox`, `eErroRede`.

## Callers store (este P1)

| Fluxo | Comportamento offline (rede) |
| --- | --- |
| `lancar` / OFX / OFX conta | já enfileirava insert txs |
| `editar` | agora enfileira `update` txs |
| `apagar` | agora enfileira `soft_delete` txs |
| `apagarCartao` | agora enfileira `soft_delete` cards |

## SwiftData (feito neste P1)

`RepositorioTransacoes` / `RepositorioCartoes` (cartão + conta): **update-in-place** no lugar de delete-then-insert.

Regra seção 12: se `removidoEm` local já está setado, **não ressuscita** ao aplicar um domínio sem remoção (`aplicar(dominio:)` em `Mapeamento.swift`).

`RepositorioFaturas.atualizarFatura` já era in-place — sem mudança de estratégia.

## O que ficou para depois

1. **Callers store** de upsert/update/soft-delete para `accounts` e `invoices` (e update de `cards` além do soft-delete) — API de fila já aceita; falta try/catch + `enfileirarOp` nos fluxos `salvarConta` / `pagarFatura` / `salvarCartao`.
2. **Liquidar / compromisso / totais de fatura** — updates online-only; enfileirar se rede cair.
3. **Drain com upsert true** (PostgREST) para cards/accounts quando a linha ainda não existe no servidor — hoje insert trata 23505 como ok sem reaplicar patch.
4. **Domínio Swift** `Cartao` / `Conta` ainda não carregam `removidoEm` — preservamos só o valor local no registro; espelhar no domínio quando o sync M3 precisar round-trip.
5. Soft-delete explícito de **conta** no iOS (hoje só arquivar cartão / remover tx).

## Fora de propósito (este commit)

- `web/src/components/**`, `App/Sources/UI/**`, CSS / SwiftUI.
- Push / PR.
- Não alterar o mapa canônico `liquidado` \| `a_pagar` (P0).
