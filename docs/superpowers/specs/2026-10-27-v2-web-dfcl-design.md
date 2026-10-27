# ca$al V2 — Web first, DFCL previsto x realizado

**Data:** 2026-10-27
**Status:** Rascunho para aprovação (nada foi construído)

## 1. Por quê

Pedro e a namorada (Daniele) controlam as finanças em duas planilhas. O problema não é a análise, é o trabalho de preencher a planilha toda vez. A V2 existe para que lançar seja o mais rápido possível e para que a visão que Pedro mais usa, o DFCL previsto x realizado, saia pronta dos lançamentos.

Fontes (na pasta do projeto):
- `Orçamento _ Planejamento Pessoal.xlsx`, aba **Lançamentos - Realizados**: gastos e entradas reais (191 linhas na data da análise).
- `Orçamento _ Planejamento_Casal.C03.xlsx`: aba **Lançamentos** (metas: ano, mês, conta, pessoa, valor), aba **Configurações** (classifica cada conta como Entrada/Saída e Fixo/Variável), aba **DFCL** (a visão-alvo) e aba **Cenários** (cenário "C01 Cenário Padrão").

## 2. Objetivos

1. **Lançar com o mínimo de digitação**, por Pedro e por Daniele, cada um com o próprio login.
2. **DFCL previsto x realizado**: meses lado a lado, cada mês com Prev | Real | %, na árvore da planilha (1. Entradas / 2. Saídas → pessoa → Fixas/Variáveis → conta), com saldo acumulado. Filtro por pessoa (Todos, Pedro, Daniele, Conjunto).
3. **Saldo por portador**: saldo de hoje e saldo projetado mês a mês para cada portador, somado por pessoa e no total.
4. **Interface web fácil e moderna**, pensada primeiro para navegador. Deve funcionar bem no celular.

## 3. Não-objetivos

- App iOS nativo. O repositório tem código Swift; a V2 não o evolui.
- Open Finance e sincronização bancária.
- Funcionalidade fiscal de PJ.
- Distribuir as metas entre portadores para projetar saldo.
- Chave competência/caixa no DFCL (pode vir depois).

## 4. Anti-objetivos (seria falha mesmo se "funcionasse")

- Lançar exigir mais do que valor e descrição no caso comum.
- O DFCL contar a mesma despesa de cartão duas vezes (compra e pagamento da fatura).
- Misturar previsto com realizado: um nunca vira o outro automaticamente.

## 5. Decisões do Pedro

| # | Decisão |
|---|---|
| D1 | Aproveitar o app web existente (`web/`: Next.js + Supabase, login, convite do casal, cartões, faturas, importação OFX) em vez de recomeçar. |
| D2 | O DFCL usa o layout **A**: meses lado a lado, cada um com Prev, Real e %. |
| D3 | A tela de portadores mostra **saldo de hoje e saldo projetado**, por portador, por pessoa e no total. |
| D4 | Lançamento com o mínimo possível de campos. |
| D5 | **Previsto e realizado sempre separados.** O previsto vem das metas; o realizado vem só dos lançamentos. Não há lista "a confirmar" que transforme previsto em realizado. |
| D6 | Compras no cartão entram no DFCL **no mês da compra** (competência). O saldo do portador segue o **caixa**: a fatura paga reduz o saldo da conta. |
| D7 | Pedro e Daniele lançam, cada um com o próprio login. |

## 6. Decisões minhas (a confirmar na leitura)

- **M1:** Lançamento novo pede só **valor** e **descrição**. Conta (categoria), portador e pessoa são sugeridos a partir de lançamentos parecidos; data é hoje; status é Pago. O usuário corrige a sugestão quando errar. Parcelado: informar "em Nx" cria as parcelas futuras.
- **M2:** O saldo projetado por portador considera **apenas lançamentos com data futura** (parcelas, faturas em aberto, contas cadastradas adiantadas). As metas ficam de fora porque não têm portador.
- **M3:** Dados iniciais vêm de importação única das duas planilhas: realizados, metas e configurações de contas.
- **M4:** Hospedagem e banco seguem o que o app já usa (Supabase; Vercel para o web).
- **M5:** O pagamento da fatura é um movimento entre conta e cartão. Ele mexe no saldo, mas não entra em Entradas/Saídas do DFCL.

### 6.1 Decisões minhas adicionais (Pedro estava ausente; conferir)

- **M6 Árvore do DFCL:** reproduz a aba DFCL do C03: `1. Entradas` e `2. Saídas`; dentro de cada, por pessoa (Entradas: Daniele, Pedro; Saídas: Conjunto, Daniele, Pedro); dentro de cada pessoa, Fixas e Variáveis (vem de Fixo/Variável da conta); dentro disso, uma linha por conta. "Grupo no DFCL" não é um nível extra: é derivado de tipo + pessoa + Fixo/Variável. PHF aparece como mais uma pessoa na árvore e no filtro (Todos, Pedro, Daniele, Conjunto, PHF).
- **M7 Cenário:** uma coluna `cenario` nas metas. A V2 usa só o cenário padrão (C01), sem seletor.
- **M8 Sem meta / sem realizado:** a linha aparece com previsto 0 ou realizado 0; o % fica em branco quando o previsto é 0.
- **M9 Saldo acumulado:** parte da soma dos lançamentos "Saldo Inicial" (natureza movimento). No Real, acumula resultado realizado mês a mês. No Prev, acumula o previsto mês a mês a partir do mesmo saldo inicial. Nunca se mistura um com o outro.
- **M10 Parcelas futuras e contas lançadas adiantadas:** são lançamentos com status Em Aberto. Contam no **Real do DFCL pelo mês da data da compra/competência**, só quando a data do lançamento já chegou; lançamentos com data futura entram apenas no saldo projetado por portador. A fatura em aberto entra no saldo projetado pelo **vencimento da fatura**.
- **M11 Fatura sem compras detalhadas na importação:** se o histórico só tem a fatura, ela é importada como despesa na conta "Fatura de Cartão" com um aviso de que não há detalhe; quando houver compras daquela fatura, vale a regra compras OU fatura.
- **M12 Fonte das metas:** vale o C03. O importador gera um relatório de divergências com a aba "Lançamentos - Previsões" do arquivo pessoal, sem bloquear.
- **M13 Importação:** deduplica por (data, valor, descrição, portador). Portadores viram dono + instituição + tipo por uma tabela de mapeamento fixa escrita pelo construtor, a partir dos 7 nomes existentes, e revisável na tela de cadastros.
- **M14 Telas atuais:** as telas de metas por categoria, carteiras e compromissos ficam escondidas da navegação da V2, sem apagar tabelas nem dados.
- **M15 Sugestão no lançamento:** usa os lançamentos de ambos, por prefixo/palavra da descrição, mais recente primeiro. Se não achar nada, deixa os campos para escolher.
- **M16 Acesso:** os dois veem todos os lançamentos e portadores do casal e editam metas e cadastros. "Pessoa" é um rótulo do lançamento, não uma conta de usuário (exceto Pedro e Daniele, ligados aos logins).
- **M17 Segurança de execução:** nenhuma migração é aplicada ao banco de produção sem Pedro. As migrações são escritas e testadas só localmente.

## 7. Modelo de dados necessário para o DFCL

Cada lançamento realizado precisa de:

| Campo | Observação |
|---|---|
| data | data do fato |
| vencimento | separado da data (a planilha já tem os dois) |
| tipo | Entrada ou Saída |
| conta | categoria; define Fixo/Variável e o grupo do DFCL |
| pessoa | **Pedro, Daniele, Conjunto ou PHF** (hoje o app só guarda o usuário pagador) |
| portador | conta ou cartão; ver abaixo |
| forma de pagamento | Pix, Cartão de Crédito, Débito em Conta, Crédito em Conta |
| status | Pago ou Em Aberto |
| parcela | n de total |
| natureza | **resultado** (entra no DFCL) ou **movimento** (só mexe no saldo: Saldo Inicial, Transferência, Aplicação, Resgate, pagamento de fatura) |

Metas (previsto): uma linha por **ano, mês, conta, pessoa, valor**, mais cenário (o C03 tem "C01 Cenário Padrão").

Cadastro de contas: nome, Entrada/Saída, Fixo/Variável, grupo no DFCL.

Cadastro de portadores: dono (Pedro, PHF, ...), instituição (Pagbank, Itaú, Nubank, Alelo, Caixa, Sicoob...), tipo (conta ou cartão). Os nomes atuais são inconsistentes ("Nubank - Pedro", "Nanquim Elo - Pedro" parecem cartões; "PHF - Nubank", "Pedro - Pagbank" são contas).

## 8. Lacunas encontradas nos dados atuais

1. **15 contas do realizado não existem nas Configurações do C03**: Mercado, Roupas, Barbeiro, Limpeza Casa, Mecânica - Carro, INSS, Rendimentos, Pacote Bancário, Juros Bancários, Saldo Inicial, Transferência - Entrada/Saída, Aplicação - Entrada/Saída/Resgate. Precisam ser cadastradas e classificadas, senão o realizado fica sem meta e sem grupo no DFCL.
2. Saldo Inicial, Transferências, Aplicação e Resgate precisam da natureza "movimento".
3. Existem 91 compras no cartão e também lançamentos "Fatura de Cartão - Nubank/Caixa". O app já segue a regra "compras OU fatura, nunca os dois" (há teste); o DFCL deve respeitá-la.
4. Daniele não tem nenhum lançamento realizado (só metas). Entra quando ela começar a lançar.
5. A aba de metas do arquivo pessoal ("Lançamentos - Previsões", 322 linhas) tem o mesmo formato da aba Lançamentos do C03; a fonte de verdade das metas deve ser decidida na importação.

## 9. Fica para o construtor

Esquema exato das tabelas e migrações a partir do que existe em `web/supabase/migrations`; regra de sugestão de conta/portador; desenho das telas além do DFCL; estratégia de importação e deduplicação; testes. Reaproveitar o que o app já tem (login, convite, cartões, faturas, OFX, componentes e sistema de design) e remover ou esconder o que não serve à V2.

## 10. Pontos sem resposta do Pedro

- Fonte de verdade das metas, se os dois arquivos divergirem.
- Se a V2 deve manter as telas atuais de metas por categoria, carteiras e compromissos, ou enxugar para o escopo acima.
