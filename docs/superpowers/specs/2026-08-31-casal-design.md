# ca$al — Design

**Data:** 2026-08-31
**Status:** Aprovado, pronto para planejamento do M1

---

## 1. O que é

App iOS de finanças para casal. Registra gastos em dois toques, organiza dinheiro em carteiras com privacidade configurável, controla cartão de crédito com faturas e parcelas, acompanha metas, e captura automaticamente compras feitas por aproximação com Apple Pay.

Mercado: Brasil. O v1 roda em TestFlight, privado, para os dois autores. Publicação na App Store é objetivo posterior, não deste ciclo.

## 2. Problema

Casais que dividem despesas mantêm hoje três registros incompatíveis: o que cada um lembra, a planilha que ninguém atualiza, e o extrato do banco que chega tarde demais para mudar decisão. Nenhum responde a pergunta que aparece no caixa do mercado — *dá pra gastar isso?*

Três agravantes específicos do Brasil:

- **Parcelamento** é a norma. Uma compra em 12x compromete doze meses de orçamento e some do extrato do mês seguinte. Sem modelar parcelas, qualquer previsão mente.
- **Fatura de cartão** tem fechamento e vencimento em dias diferentes. Compra feita depois do fechamento cai na fatura seguinte, e quem não sabe disso erra o mês inteiro.
- **Privacidade** é assunto delicado. Casal que precisa de transparência total num pote e sigilo em outro não é exceção — é o caso comum.

## 3. Objetivos

1. Lançar um gasto em dois toques, sempre, mesmo sem internet.
2. Separar dinheiro nosso, meu, teu e PJ com regra de visibilidade explícita e verificável.
3. Mostrar o compromisso real do mês — incluindo faturas e parcelas futuras — e não só o que já foi gasto.
4. Transformar meta em comportamento: o limite aparece na hora de gastar, não no relatório do fim do mês.
5. Eliminar digitação onde o telefone já sabe a resposta: compra por aproximação vira lançamento com um toque.

## 4. Não-objetivos

Decididos fora do escopo, com motivo:

| Fora | Por quê |
|---|---|
| Open Finance / sincronização bancária | R$ 2.500/mês (Pluggy) a R$ 6.000/mês (Belvo) de custo fixo, independente do número de usuários. Não se paga em produto privado. Reavaliar no v2, com receita. |
| FinanceKit da Apple | Disponível apenas em EUA e Reino Unido. Brasil não é suportado. |
| Funcionalidade fiscal de PJ (DAS, NF, pró-labore) | Produto próprio. No v1, PJ é apenas um rótulo de carteira. |
| Entrada por linguagem natural e ditado | Ganho marginal sobre o teclado de dois toques; erro de parse custa confiança no número. |
| Juros de rotativo e financiamento | O app registra o que aconteceu; não simula crédito. |
| Assinatura, paywall, App Store | O v1 é privado. Entra quando houver decisão de publicar. |

## 5. Decisões travadas

| # | Decisão | Alternativa descartada |
|---|---|---|
| 01 | V1 privado em TestFlight | Publicar direto na App Store |
| 02 | Captura por Atalhos + manual + OFX | Open Finance desde o v1 |
| 03 | Carteira = dono + membros + visibilidade | Tipos fixos de carteira |
| 04 | Três tipos de meta | Só orçamento mensal |
| 05 | Motor de cartão completo | Só fatura atual, sem parcelamento |
| 06 | SwiftUI nativo, iOS 17+ | React Native |
| 07 | Supabase + SwiftData local-first | CloudKit (não recebe webhook; bloqueia o v2), Firebase (NoSQL para dado relacional) |
| 08 | Lista como entrada de Cartões, carrossel no detalhe | Pilha estilo Wallet |
| 09 | Lançamento com teclado primeiro | Formulário completo |
| 10 | Home responde "posso gastar?" | Feed de atividade, lista de carteiras |

## 6. Arquitetura

Quatro camadas, cada uma testável isoladamente.

```
┌─────────────────────────────────────────┐
│  Apresentação — SwiftUI                 │  lê só do local
├─────────────────────────────────────────┤
│  Domínio — Swift puro, sem dependências │  toda regra de negócio
├─────────────────────────────────────────┤
│  Persistência local — SwiftData         │  fonte da verdade para leitura
├─────────────────────────────────────────┤
│  Sincronização — outbox + pull          │  fora do caminho crítico
├─────────────────────────────────────────┤
│  Remoto — Supabase (Postgres, RLS, Auth)│  autoridade sobre permissão
└─────────────────────────────────────────┘
```

**Domínio** não importa `SwiftUI` nem `Supabase`. Structs e funções puras: fatura, parcelamento, orçamento, metas, deduplicação. É onde vai a maior parte dos testes.

**Persistência local** guarda o espelho completo dos dados do usuário. Toda tela lê daqui. Nenhuma tela espera rede.

**Sincronização** enfileira cada escrita numa fila persistente e drena quando há conectividade. Falha de rede não é erro visível para o usuário — o dado já está salvo.

**Remoto** decide quem pode ver o quê. O servidor é autoridade sobre permissão, nunca sobre experiência.

**Invariante central:** lançar um gasto nunca toca a rede no caminho crítico. É isso que entrega a velocidade percebida.

## 7. Modelo de dados

```
profile        id, nome, avatar_url

wallet         id, nome, cor, ícone, dono_id, visibilidade, rótulo, arquivada
               visibilidade ∈ { aberta, resumo, fechada }
               rótulo       ∈ { pessoal, compartilhada, pj }   — apenas apresentação

wallet_member  wallet_id, user_id, papel, created_at
               papel ∈ { dono, membro }

account        id, wallet_id, nome, tipo, saldo_inicial
               tipo ∈ { corrente, poupança, dinheiro }

card           id, wallet_id, apelido, banco, bandeira, últimos4, cor,
               limite, dia_fechamento, dia_vencimento, conta_pagamento_id

invoice        id, card_id, competência, fecha_em, vence_em, status, valor_pago
               status ∈ { aberta, fechada, paga, parcial }

category       id, wallet_id?, nome, ícone, cor, parent_id, tipo
               wallet_id nulo = categoria global do sistema
               tipo ∈ { despesa, receita }

transaction    id, wallet_id, tipo, valor, data, categoria_id?, descrição,
               account_id?, card_id?, invoice_id?, criado_por, estado,
               origem, id_externo?, hash_dedup,
               grupo_parcela?, parcela_n, parcela_total
               tipo   ∈ { despesa, receita, transferência }
               estado ∈ { confirmada, pendente }
               origem ∈ { manual, wallet_shortcut, ofx, open_finance }
               categoria_id é nulo em transferência

goal           id, wallet_id?, tipo, nome, valor_alvo, categoria_id?,
               período, data_alvo?, ativa
               tipo    ∈ { teto_categoria, objetivo, economia_mensal }
               período ∈ { mensal }   — único valor no v1
               wallet_id nulo = meta do casal, agregando todas as
               carteiras visíveis ao usuário

aporte         id, goal_id, transaction_id, valor, data
               transaction_id aponta para a transferência que moveu o
               dinheiro; o aporte não cria saldo por conta própria

invite         id, wallet_id, código, criado_por, expira_em, aceito_por?
```

Toda tabela sincronizada carrega ainda os campos de sincronização:
`created_at`, `updated_at` (carimbado pelo servidor), `deleted_at`, `device_id`.

### Decisões do modelo

**`wallet_member` é a única fonte de permissão.** Nenhuma outra tabela repete quem pode ver o quê. Toda política RLS parte daqui: um lugar para errar, um lugar para testar.

**`origem` + `id_externo` + `hash_dedup` existem desde o dia 1.** Permitem ingestão externa no v2 sem migração dolorosa, e já resolvem um problema do v1: quando a automação do Wallet captura uma compra e o import de OFX traz a mesma compra, o app precisa reconhecer a duplicata.

`hash_dedup = f(wallet_id, valor, data ±2 dias, estabelecimento normalizado)`.

**Parcelamento vive na própria transação** (`grupo_parcela`, `parcela_n`, `parcela_total`), sem tabela intermediária. Compra em 12x cria doze linhas, uma por fatura futura. É o que dá número real à curva de próximas faturas e o que permite estornar uma parcela sem quebrar as outras.

**Transferência é um `tipo`, não uma tabela.** Pagamento de fatura, movimentação entre carteiras e distribuição PJ→PF são todos transferências, e nenhuma conta como despesa em relatório ou meta.

**`deleted_at` em vez de `DELETE`.** Sincronização entre dois devices precisa distinguir "apagado" de "ainda não chegou".

**IDs são UUID gerados no device**, o que torna toda escrita um `upsert` idempotente.

## 8. Motor de cartão

O único bloco onde erro numérico é fatal. Todas as regras são funções puras, testadas isoladamente.

### Alocação de fatura

Cartão com fechamento no dia `F` e vencimento no dia `V`. Para uma compra na data `D`:

- Se `dia(D) <= F` → fatura que fecha em `F` no mês de `D`.
- Se `dia(D) > F` → fatura do mês seguinte.

Meses curtos truncam: fechamento no dia 31 ocorre no dia 28 ou 29 em fevereiro.

### Vencimento

- Se `V > F` → vence no mesmo mês do fechamento. *(fecha 02, vence 10)*
- Se `V <= F` → vence no mês seguinte. *(fecha 28, vence 05)*

Essa inversão é o erro mais comum em apps de finanças brasileiros.

### Parcelamento

Compra de valor `T` em `N` parcelas gera `N` transações. A parcela 1 cai na fatura da compra; a parcela `n` cai na fatura `n-1` meses depois.

Arredondamento: sobra na **primeira** parcela, seguindo a prática dos cartões brasileiros. `R$ 100,00 em 3x = 33,34 + 33,33 + 33,33`.

### Pagamento de fatura

Transferência `conta → fatura`, nunca despesa. Pagamento integral marca a fatura como `paga`; pagamento parcial grava `valor_pago` e marca `parcial`. Juros de rotativo estão fora do escopo.

### Limite disponível

```
limite_disponível = limite
                  − Σ faturas não pagas
                  − Σ parcelas futuras já comprometidas
```

## 9. Privacidade

Três níveis, definidos por quem cria a carteira:

| Nível | Membro vê lançamentos | Membro vê total | Entra em meta do casal |
|---|---|---|---|
| **aberta** | sim | sim | sim |
| **resumo** | não | sim | sim, apenas no agregado |
| **fechada** | não | não | não |

### Implementação

A política de `SELECT` em `transaction` exige ser membro da carteira **e** (`visibilidade = 'aberta'` **ou** ser o dono).

O nível `resumo` não é política de tabela: é uma view agregada `resumo_mensal_carteira`, exposta a membros quando a visibilidade é `aberta` ou `resumo`. O detalhe fica fisicamente inalcançável, não apenas escondido pela interface.

### Regras de coerência

- **Carteira fechada não aceita outros membros.** Membro que não vê nada é membro fantasma e fonte garantida de confusão. A interface bloqueia; o banco também.
- **Metas conjuntas ignoram carteiras fechadas por construção.** A tela da meta declara isso explicitamente em vez de exibir um número incompleto em silêncio.
- Cada carteira exibe um cadeado permanente com o nível atual, e existe uma tela única "quem vê o quê" listando cada carteira e seu alcance.

### Convite

Entrar numa carteira compartilhada acontece por convite: o dono gera um código com prazo de validade (`invite`), a outra pessoa aceita, e a aceitação cria a linha em `wallet_member`. Convite não altera visibilidade — carteira fechada não emite convite.

## 10. Captura de transações

### Apple Pay via Atalhos

```
tap na maquininha
  → automação "Wallet" do app Atalhos dispara
  → chama App Intent do ca$al com valor + estabelecimento + cartão
  → grava transação: origem = wallet_shortcut, estado = pendente
  → notificação acionável com valor, estabelecimento e 2 categorias sugeridas
  → 1 toque confirma e aloca na fatura aberta do cartão
```

**Toda captura nasce pendente.** O gatilho do sistema dispara também em compra recusada, então nada é confirmado sem ação humana. Pendência não resolvida aparece na caixa de entrada da home e desaparece se descartada.

As duas categorias sugeridas vêm do histórico do próprio estabelecimento. Sem isso, a captura economiza digitação mas não economiza decisão.

**Limitações conhecidas, documentadas na interface:**

- Funciona apenas em compra por aproximação (NFC). Compra em app, site ou boleto não dispara.
- Dispara também em transação recusada.
- Timeouts do gatilho são reportados na plataforma (FB14035016, FB16379100). A confirmação manual é a rede de segurança.
- Não traz histórico: vale a partir do dia em que for configurada.
- Cada pessoa configura a automação uma vez, manualmente.

**Onboarding faz parte do recurso.** Tela dedicada, passo a passo, com deep link abrindo o Atalhos. Sem ela o recurso não existe na prática.

### Import de OFX

Caminho paralelo, e a única fonte de histórico retroativo: escolher arquivo, mapear conta ou cartão, prévia com duplicatas já marcadas por `hash_dedup`, confirmar.

## 11. Metas

**Teto por categoria.** Limite mensal por categoria, preso a uma carteira (`wallet_id` preenchido) ou ao casal inteiro (`wallet_id` nulo, agregando as carteiras visíveis). Alerta em 80% e ao estourar. Aparece **no momento do lançamento**: selecionar "Restaurante" no teclado mostra o saldo restante ali mesmo.

**Objetivo tangível.** Valor alvo, data alvo e aportes explícitos. Calcula quanto falta e quanto por mês para cumprir o prazo, e avisa quando o ritmo não fecha. Aporte é uma transferência declarada, nunca inferida.

**Economia mensal.** `receitas − despesas` do período contra uma meta em reais ou percentual. Sem cofre e sem transferência: é medição de hábito.

## 12. Sincronização

- **Escrita local primeiro**, sempre. Operação enfileirada em fila persistente que sobrevive a reinício do app e do aparelho.
- **Idempotência por UUID de device.** Toda escrita é `upsert` por id; retry após queda de rede não duplica.
- **Conflito resolve por última escrita**, com `updated_at` carimbado pelo servidor e `device_id` como desempate. Aceitável porque o dado é quase todo append — dois lançamentos distintos não conflitam. O caso real é edição simultânea do mesmo lançamento, raro, e perder a edição mais antiga é consequência tolerável.
- **Exceção: apagar vence editar.** Tombstone sempre ganha, senão um registro apagado ressuscita na próxima sincronização.
- **Pull incremental** por cursor de `updated_at`. Realtime apenas notifica que há novidade; não transporta dado.

## 13. Interface

### Navegação

`Início · Cartões · [＋] · Metas · Mais`

O botão de lançar fica no centro, alcançável com o polegar, presente em todas as telas. Quatro abas porque cinco viram gaveta. "Mais" guarda carteiras, categorias, relatórios e ajustes.

### Home — responde "posso gastar?"

Número único e grande no topo: sobra segura do período, já descontados tetos, faturas e parcelas comprometidas. Abaixo, alertas de teto próximos do limite, caixa de entrada de capturas pendentes, e o feed do casal em ordem cronológica com avatar de quem lançou.

### Lançamento — teclado primeiro

Abre no valor, com teclado numérico ocupando a metade inferior. Carteira e categoria vêm pré-selecionadas pelo hábito, exibidas como chips editáveis. Salvar fica no próprio teclado: dois toques no caso comum.

O botão `···` revela parcelas, cartão, data, anexo e observação. É o formulário completo, disponível sem custo para quem não precisa dele.

### Cartões

Entrada: lista compacta com todos os cartões, total consolidado a pagar no mês e curva de parcelas comprometidas nos próximos seis meses.

Detalhe: cartão grande em formato de cartão, swipe horizontal entre cartões, abas para fatura atual, próxima e futuras, com os lançamentos abaixo e ação de pagar.

## 14. Testes

**Domínio — testes unitários puros, sem I/O.** Alocação de fatura incluindo virada de mês, mês curto e o caso `V <= F`. Divisão de parcelas com arredondamento. Pagamento de fatura não contando como despesa. `hash_dedup` reconhecendo a duplicata vinda do OFX. Cálculo de sobra segura.

**RLS — testes de integração contra Postgres local** (`supabase start`), um por nível de visibilidade, escritos para provar que o vazamento falha: usuário B consultando transação de carteira fechada de A recebe conjunto vazio no banco, sem o app no meio.

**Sincronização** — fila offline→online, retry idempotente, conflito, precedência do tombstone.

**Interface** — mínima, concentrada no fluxo de lançamento e na renderização do motor de fatura.

Desenvolvimento segue TDD: teste vermelho antes de qualquer implementação.

## 15. Milestones

Cada milestone tem spec, plano e execução próprios.

| # | Milestone | Escopo | Estado ao terminar |
|---|---|---|---|
| **M1** | Fundação | Projeto Xcode, SwiftData, domínio de transações, lançamento em dois toques, categorias, carteira local | Registra gasto de verdade, offline, sem servidor |
| **M2** | Cartões e faturas | Motor completo, lista de entrada, carrossel de detalhe | Responde "quanto sai este mês" com parcelas |
| **M3** | Nuvem e casal | Supabase, auth, RLS, sincronização, convite, três níveis de visibilidade | Duas pessoas no mesmo dado |
| **M4** | Metas e home | Três tipos de meta, sobra segura, alertas | App vira conselheiro |
| **M5** | Captura | App Intent, automação Atalhos, notificação acionável, onboarding, import OFX | Para de digitar o que o cartão já sabe |

M1 e M2 entregam um app completo para uma pessoa antes de qualquer servidor existir. A parte cara e arriscada — sincronização distribuída — só é paga depois que o produto provar uso real.

## 16. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Gatilho do Wallet falha ou dispara em compra recusada | Lançamentos errados corroem confiança nos números | Toda captura nasce pendente e exige confirmação humana |
| Erro no motor de fatura | O app mente sobre dinheiro; perda total de credibilidade | Domínio puro com cobertura de teste alta, incluindo casos de borda de calendário |
| Vazamento entre carteiras privadas | Quebra de confiança irreparável entre os usuários | Permissão no banco via RLS, com testes que provam a negativa |
| Custo de Open Finance no v2 | R$ 2.500/mês fixos sem receita correspondente | Modelo já preparado; decisão adiada até haver assinantes |
| Xcode ausente na máquina | Bloqueia toda a execução | Instalar antes de iniciar o M1 |

## 17. Pré-requisitos

1. **Xcode** instalado. Bloqueia o M1 inteiro.
2. **Conta Apple Developer** ($99/ano) para rodar em iPhone real e distribuir via TestFlight.
3. **Projeto Supabase** (free tier) — necessário apenas a partir do M3.

## 18. Glossário

| Termo | Significado |
|---|---|
| **Carteira** | Pote de dinheiro com dono, membros e nível de visibilidade |
| **Fechamento** | Dia em que a fatura para de receber compras |
| **Vencimento** | Dia em que a fatura precisa ser paga |
| **Sobra segura** | Quanto ainda pode ser gasto no período sem estourar tetos nem comprometer faturas |
| **Captura pendente** | Transação vinda da automação do Wallet, ainda não confirmada |
| **Tombstone** | Registro marcado como apagado, preservado para a sincronização |
