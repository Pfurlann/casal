# AVISO — Contrato: outbox offline→online (P1.5 → P1.7 BACK)

**Data:** 2026-09-06  
**Escopo:** fila localStorage por user (`casal-outbox[:userId]`), drain idempotente com reapply pós-23505, soft-delete SQL `deleted_at`, SwiftData upsert in-place + soft-delete de conta/cartão; P1.6: `apagarConta` web + `removidoEm` Conta/Cartao; P1.7: `arquivarCartao` iOS seta `removidoEm`; **M3-prep:** outbox local iOS (SwiftData v3) + contrato drain — ver `AVISO-CONTRATO-IOS-SYNC.md`.

## Soft-delete no SQL

Campo canônico (DDL `20260801_base_schema.sql` + migrations): **`deleted_at timestamptz`**.

Presente em: `wallets`, `accounts`, `cards`, `invoices`, `categories`, `transactions`, `fixed_expenses`, `goals`, `commitments`, …

No domínio iOS / SwiftData o espelho é **`removidoEm`**.

## Mapa de ops × tabelas (outbox web)

| Op | `transactions` | `cards` | `accounts` | `invoices` | `commitments` |
| --- | --- | --- | --- | --- | --- |
| `insert` | ✅ drain + callers | ✅ drain + `salvarCartao` | ✅ drain + `salvarConta` | ✅ drain + `pagarFatura` | ✅ drain + `salvarCompromisso` |
| `update` | ✅ `editar` / `liquidar*` | ✅ `salvarCartao` | ✅ `salvarConta` | ✅ `pagarFatura` | ✅ `liquidarCompromisso` / `salvarCompromisso` |
| `soft_delete` | ✅ `apagar` (+ compromisso a_pagar) | ✅ `apagarCartao` | ✅ `apagarConta` | ✅ drain (API) | ✅ `apagarCompromisso` |

- **23505 em `insert`:** após conflito, o drain **reaplica** linha a linha — insert individual e, se ainda 23505, **`update` by `id`** com o payload da linha (sem `id`). Antes (P1) 23505 = sucesso vazio sem reaplicar patch.
- Item legado (só `linhas`, sem `op`/`tabela`) normaliza para `insert` + `transactions`.
- Contagem `tamanhoOutbox` / `FaixaOffline`: insert conta `linhas.length`; update/soft_delete conta `ids.length`.

API: `web/src/lib/outbox.ts` — `enfileirarOutbox` (legado insert txs), `enfileirarOp`, `drenarOutbox`, `eErroRede`.  
`TabelaOutbox` inclui `commitments` (P1.5).

## Callers store (P1 + P1.5)

| Fluxo | Comportamento offline (rede) |
| --- | --- |
| `lancar` / OFX / OFX conta | insert txs |
| `editar` | `update` txs |
| `apagar` | `soft_delete` txs |
| `apagarCartao` | `soft_delete` cards |
| `apagarConta` | `soft_delete` accounts |
| `salvarCartao` | `insert` ou `update` cards (conforme já existia local) |
| `salvarConta` | `insert` ou `update` accounts |
| `pagarFatura` | `insert`/`update` invoices + `insert` tx transferência |
| `liquidarLancamento` | `update` txs (`status: liquidado` + conta/cartão/meta) |
| `liquidarCompromisso` | `update` commitments + `update` txs |
| `salvarCompromisso` | insert/update txs + insert/update commitments |
| `apagarCompromisso` | `soft_delete` commitments (+ txs se `a_pagar`) |

Payloads derivados do DDL (`accounts` / `cards` / `invoices` / `transactions` / `commitments`).

## SwiftData

`RepositorioTransacoes` / `RepositorioCartoes` (cartão + conta): **update-in-place** (P1).

`RepositorioCartoes.arquivarConta` (P1.5) / `arquivarCartao` (P1.7): soft-delete local — `arquivada|arquivado = true` + `removidoEm = agora` (espelha `deleted_at`).

Regra seção 12: se `removidoEm` local já está setado, **não ressuscita** ao aplicar um domínio sem remoção (`aplicar(dominio:)` em `Mapeamento.swift` — Transacao, Cartao, Conta).

`RepositorioFaturas.atualizarFatura` já era in-place.

### Outbox iOS (M3-prep)

Fila persistente `OutboxItemRegistro` (schema **v3**) + `OutboxFilaSwiftData`. Os repos acima **enfileiram** insert/update/soft_delete ao salvar/arquivar/remover. Drain: stub com pré-req Auth — detalhes em **`AVISO-CONTRATO-IOS-SYNC.md`**.

## O que ficou para depois

1. ~~**Caller web `apagarConta` / soft_delete accounts**~~ — feito em P1.6: `apagarConta` no store espelha `apagarCartao` (`deleted_at` + `arquivada` + outbox).
2. ~~**Domínio Swift `Cartao` / `Conta` + `removidoEm` round-trip**~~ — feito em P1.6 (`Mapeamento` + seção 12 tombstone).
3. **Metas / goals no outbox** — `liquidar*` enfileira txs/commitments; `persistirMetas` continua online-only (goals fora do mapa). Fica pra depois.
4. ~~**`arquivarCartao` iOS**~~ — feito em P1.7: seta `arquivado` + `removidoEm` (espelha `arquivarConta` / `apagarCartao` web); testes tombstone no repo.
5. **AVISO — Totais de fatura** (`persistirTotaisFatura`): updates de `transactions` (valor/status/`invoice_id`) e inserts auxiliares continuam **online-only** (`if (!sb) return`, sem `eErroRede`/outbox nas `alteradas`). OFX já enfileira txs de total novas no insert em lote; gap restante = patch das alteradas offline. Alinhar exige expandir callers — fora de P1.7 / M3-prep curto. (iOS: mesmo gap — ver `AVISO-CONTRATO-IOS-SYNC.md`.)
6. **UI web** — components ainda não chamam `apagarConta` (só API no store; fora de escopo BACK).
7. ~~**Outbox local iOS**~~ — feito em M3-prep: fila SwiftData + enqueue nos repos Conta/Cartao/Transacao + stub de drain. **Auth + ClienteSyncRemoto + disparo de lifecycle** ainda pendentes (`AVISO-CONTRATO-IOS-SYNC.md`).

## Mudança de comportamento (drain)

| Antes (P1) | Agora (P1.5) |
| --- | --- |
| Insert com erro `23505` → item removido da fila **sem** reaplicar campos | Insert com `23505` → para cada linha: tenta insert; se `23505`, **update by id** com o patch da linha |

Motivo: upsert offline→online de cards/accounts/invoices/commitments (e txs com mesmo id) precisa reaplicar o payload enfileirado, não só “já existe = ok”.

## Fora de propósito (este commit)

- `web/src/components/**`, Relatórios, `App/Sources/UI/**`, CSS / SwiftUI.
- Push / PR.
- Goals / `persistirMetas` outbox.
- `persistirTotaisFatura` offline (ver aviso §5).
- Não alterar o mapa canônico `liquidado` \| `a_pagar` (P0).
