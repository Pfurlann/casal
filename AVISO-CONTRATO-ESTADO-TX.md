# AVISO — Contrato: estado de transação (iOS ↔ web ↔ SQL)

**Data:** 2026-09-06  
**Escopo:** vocabulário canônico de `transactions.status` / `Transacao.estado` + DDL base no git.

## Decisão

**Canônico:** `liquidado` | `a_pagar`

### Por quê

| Fonte | Vocabulário | Notas |
| --- | --- | --- |
| Postgres (live + CHECK em `envelope_compromissos`) | `liquidado` \| `a_pagar` | Já tem dados e migrations de correção (`pago_so_liquidado`, etc.) |
| web (`StatusLancamento`, `StatusCompromisso`, store, persistir) | `liquidado` \| `a_pagar` | Mesmo par; compromisso compartilha o vocabulário |
| CasalDomain iOS (`EstadoTransacao`) | ~~`confirmada` \| `pendente`~~ | Mesma cardinalidade (2); testes unitários, mas só SwiftData local — ainda sem sync SQL |

Swift não é mais rico que o SQL (ambos 2 valores). O contrato operacional (Postgres + web + compromissos) já convergira em `liquidado`/`a_pagar`. **Escolhemos o Postgres/web** e alinhamos o domínio Swift + SwiftData.

Semântica alinhada (mapa):

| Legado iOS | Canônico (SQL/web/Swift) | Uso |
| --- | --- | --- |
| `confirmada` | `liquidado` | Entra no resumo; quitado / confirmado |
| `pendente` | `a_pagar` | Fora do resumo iOS até liquidar; a pagar no web |

## O que mudou neste commit

1. **CasalDomain** — `EstadoTransacao`: `liquidado`, `aPagar = "a_pagar"` (+ helper de legado).
2. **SwiftData** — default `estadoBruto = "liquidado"`; decode aceita legado.
3. **web/src/lib/domain.ts** — tipo canônico documentado + `estadoCanonico()` na borda.
4. **SQL** — `20260801_base_schema.sql` (CREATE TABLE greenfield) + `20260906_estado_tx_canonico.sql` (remap defensivo + reassert CHECK).

## Fora de propósito

- Components / SwiftUI / CSS (P0 visual em paralelo).
- Push / PR (só commit local na `identidade-design`).
- Renomear coluna SQL `status` → `estado` (nome da coluna permanece `status` no Postgres; domínio Swift continua falando `estado`).
