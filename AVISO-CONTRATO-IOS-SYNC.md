# AVISO — Contrato: sync / outbox iOS (M3-prep)

**Data:** 2026-09-06  
**Escopo:** fila outbox local mínima no iOS (SwiftData) + contrato do drain. **Não** implementa Auth/Supabase completo.

Ver também: `AVISO-CONTRATO-OUTBOX.md` (web + soft-delete compartilhado).

## Objetivo

Quebrar o bloqueio **“iOS sem outbox”**: mutações offline de Conta / Cartão / Transação passam a enfileirar ops persistentes com o mesmo vocabulário do web (`insert` | `update` | `soft_delete` × tabelas SQL).

## Shape da fila (espelho web)

| Campo | Tipo | Notas |
| --- | --- | --- |
| `id` | UUID | id do item da fila |
| `criadoEm` | Date | ordem FIFO |
| `tentativas` | Int | incrementa em falha no drain (quando cliente remoto existir) |
| `op` | `insert` \| `update` \| `soft_delete` | igual `OpOutbox` web |
| `tabela` | `transactions` \| `cards` \| `accounts` \| `invoices` \| `commitments` | igual `TabelaOutbox` web |
| `linhas` | JSON array de objetos | **só insert** — payloads SQL-shaped (snake_case) |
| `ids` | JSON array de strings UUID | **update / soft_delete** |
| `patch` | JSON objeto | **update / soft_delete** — soft_delete inclui `deleted_at` + `updated_at` (+ `arquivado`/`arquivada` em cards/accounts) |

Persistência: modelo SwiftData `OutboxItemRegistro` (schema **v3**). API: `OutboxFilaSwiftData` / protocolo `FilaOutbox` em `App/Sources/Persistencia/Outbox.swift`.

### Payloads (campos mínimos iOS hoje)

- **accounts:** `id`, `wallet_id`, `nome`, `tipo`, `saldo_inicial_centavos`, `arquivada`, `updated_at`
- **cards:** `id`, `wallet_id`, `apelido`, `banco`, `ultimos4`, `bandeira`, `cor`, `limite_centavos`, `dia_fechamento`, `dia_vencimento`, `arquivado`, `updated_at`
- **transactions:** alinhado a `linhaDaTransacao` web nos campos presentes no domínio iOS (`wallet_id`, `valor_centavos`, `status` canônico, `category_id`, `account_id`, `card_id`, `invoice_id`, `hash_dedup`, parcelas, `device_id` se houver). Sem `pagador_id` / `goal_id` no domínio iOS atual.

Datas em ISO-8601 com fração (`OutboxCodec.isoString`).

## O que enfileira (callers)

| Fluxo iOS | Op | Tabela |
| --- | --- | --- |
| `RepositorioCartoes.salvarCartao` (novo) | `insert` | `cards` |
| `RepositorioCartoes.salvarCartao` (já existia) | `update` | `cards` |
| `RepositorioCartoes.arquivarCartao` | `soft_delete` | `cards` |
| `RepositorioCartoes.salvarConta` (nova) | `insert` | `accounts` |
| `RepositorioCartoes.salvarConta` (já existia) | `update` | `accounts` |
| `RepositorioCartoes.arquivarConta` | `soft_delete` | `accounts` |
| `RepositorioSwiftData.salvar` (nova) | `insert` | `transactions` |
| `RepositorioSwiftData.salvar` (já existia) | `update` | `transactions` |
| `RepositorioSwiftData.remover` | `soft_delete` | `transactions` |

Como **não há Auth/sessão Supabase no iOS ainda**, os repos **sempre** enfileiram (tudo é “offline” até o drain ter sessão). Soft-delete local continua setando `removidoEm` (+ `arquivado`/`arquivada`).

**Não** enfileira: `Bootstrap` (seed direto no `ModelContext`), faturas (`RepositorioFaturas`), categorias/carteiras.

## Drain — contrato e stub

Arquivos: `DrenadorOutbox` / `DrenadorOutboxStub`, `ProvedorSessaoSync`, `ClienteSyncRemoto` em `Outbox.swift`.

### Quando o drain deve rodar (futuro)

1. App volta a ativo / ganha rede.
2. Após login bem-sucedido (sessão Auth disponível).
3. Manualmente (debug / “sincronizar agora”).

Hoje **ninguém chama** o drain na UI — só o stub + testes. Orquestração de lifecycle fica para o épico de Auth.

### Pré-requisito Auth

- `ProvedorSessaoSync.userId != nil` — sem isso o stub retorna `motivoParada: "sem_sessao"` e **não remove** itens.
- `ClienteSyncRemoto` real (Supabase) — sem isso, com sessão fake, retorna `cliente_remoto_ausente`.
- Com ambos: FIFO, `aplicar(item:)`, remove ok; em erro incrementa `tentativas` (espelha web). Semântica 23505/reapply fica no cliente remoto (igual `drenarOutbox` web).

### O que o stub **faz**

- Lê a fila persistente.
- Respeita pré-req de sessão / cliente.
- Expõe `ResultadoDrain { enviados, restam, motivoParada }`.

### O que o stub **não faz**

- Não instancia Supabase SDK.
- Não faz login / refresh token.
- Não aplica rede nem resolve conflitos além do contrato acima.
- Não drena `invoices` / `commitments` / goals (sem callers iOS ainda).
- Não cobre **totais de fatura** offline (ver abaixo).

## Passos restantes (Auth → drain real)

1. Substituir `IdentidadeLocal` / `SessaoSyncAusente` por sessão Supabase Auth.
2. Implementar `ClienteSyncRemoto` chamando `insert` / `update` / `soft_delete` nas tabelas (copiar semântica do `aplicarItem` web, incl. 23505 → update by id).
3. Disparar `DrenadorOutboxStub` (ou sucessor) no lifecycle + pós-login.
4. (Opcional) chavear outbox por `userId` como `casal-outbox[:userId]` web — hoje a fila é do store local do aparelho.

## Totais de fatura (fora deste prep curto)

Mesmo gap do web (`persistirTotaisFatura` online-only): patches de `transactions` (valor/status/`invoice_id`) gerados por sincronização de totais **não** entram na outbox iOS neste commit. Documentar / alinhar num P seguinte junto com web §5 de `AVISO-CONTRATO-OUTBOX.md`.

## Fora de propósito

- `App/Sources/UI/**`, `web/src/components/**`, Relatórios, CSS.
- Push / PR.
- Auth/Supabase completo, commitments, goals, invoices no outbox iOS.
