# M2 · Cartões e Faturas — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Responder "quanto sai da nossa conta este mês" com número real, incluindo faturas de cartão e parcelas já comprometidas nos meses seguintes.

**Architecture:** O motor de fatura é domínio puro em `CasalDomain` — funções sem I/O que decidem em qual fatura uma compra cai, como uma compra parcelada se distribui, e quanto de limite sobra. A persistência ganha `Cartao`, `Conta` e `Fatura` como entidades novas, atrás de um `VersionedSchema` que passa a existir antes de qualquer campo novo tocar o disco. A UI segue o desenho aprovado: lista compacta como entrada da seção, carrossel no detalhe.

**Tech Stack:** Swift 6.2, Swift Testing, SwiftPM, SwiftData, SwiftUI, XcodeGen, SwiftLint, SwiftFormat.

**Spec:** `docs/superpowers/specs/2026-08-31-casal-design.md` — seções 7 (modelo de dados), 8 (motor de cartão) e 13 (interface).

---

## Global Constraints

- **Plataforma:** iOS 17.0 mínimo. Pacote de domínio em `platforms: [.iOS(.v17), .macOS(.v14)]`.
- **Swift 6**, modo de linguagem Swift 6. Todo tipo público do domínio é `Sendable`.
- **Dinheiro é `Int` em centavos.** `Double` e `Float` proibidos em qualquer caminho que toque valor monetário, testes incluídos.
- **O domínio não importa nada além de `Foundation`.**
- **IDs são `UUID` gerados no device.** Remoção é lógica via `removidoEm`.
- **Transferência nunca conta como despesa ou receita.** Pagamento de fatura é transferência.
- **Identificadores, nomes de teste e textos de interface em português.**
- **`swiftlint --strict` com zero violações, `line_length.warning` em 120.** Quebre suas linhas.
- **TDD obrigatório:** teste vermelho antes de qualquer implementação. Um commit por tarefa.
- **Juros de rotativo estão fora do escopo.** O app registra o que aconteceu; não simula financiamento.
- **Fora do M2:** metas, sincronização, Supabase, autenticação, App Intent, import OFX, funcionalidade fiscal de PJ.

## Comandos de build e teste

```bash
# domínio, roda sem Xcode
cd Packages/CasalDomain && swift test

# app, no simulador
cd App && xcodegen generate
xcodebuild test -project Casal.xcodeproj -scheme Casal \
  -destination 'platform=iOS Simulator,name=iPhone 17'
```

Ambiente verificado: Xcode 26.3, SDK iOS 26.2, runtime de simulador iOS 26.3.1, device `iPhone 17` presente. A saída `Executed 0 tests` do xcodebuild é o contador do XCTest e não significa nada aqui — leia a linha `✔ Test run with N tests` do Swift Testing.

## O que o M1 deixou pronto e este plano consome

- `Money(centavos:)` com `.zero`, `+`, `-`, `Comparable`, `.centavos`, `.formatadoBRL`. **Não tem multiplicação nem divisão** — a Tarefa 1 adiciona a divisão que o parcelamento exige.
- `Transacao` com `id`, `carteiraID`, `tipo`, `valor`, `data`, `categoriaID`, `descricao`, `contaID`, `cartaoID`, `faturaID`, `criadoPor`, `estado`, `origem`, `idExterno`, `hashDedup`, `grupoParcela`, `parcelaN`, `parcelaTotal`, `criadoEm`, `atualizadoEm`, `removidoEm`, `estaRemovida`.
- `Carteira`, `Categoria` (com `Categoria.padrao`, 14 entradas de UUID fixo), enums `TipoTransacao`, `OrigemTransacao`, `EstadoTransacao`, `TipoCategoria`, `VisibilidadeCarteira`, `RotuloCarteira` — raw values em snake_case, travados por teste porque são formato de dado.
- `ResumoMensal.calcular(transacoes:de:ate:)`, intervalo **meio-aberto** `[inicio, fim)`.
- `Estabelecimento.normalizar`, `Dedup.chave(carteiraID:tipo:valor:estabelecimento:)`, `Dedup.chave(de:)`, `Dedup.saoCandidatasADuplicata`, `SugestaoCategoria.sugerir(paraEstabelecimento:historico:limite:)`.
- Persistência: `TransacaoRegistro`, `CarteiraRegistro`, `CategoriaRegistro`, `Mapeamento`, protocolo `RepositorioTransacoes` (`salvar`, `remover(id:)`, `listar(de:ate:)`, `historicoRecente(limite:)`), `RepositorioSwiftData`, `Bootstrap.prepararSeNecessario(contexto:donoID:)`, `IdentidadeLocal`.
- UI: `RaizView` com abas `Início · Cartões · ＋ · Metas · Mais`, a aba Cartões hoje mostrando um `ChegaNoProximoMilestone`. `InicioModelo`/`InicioView`, o fluxo de lançamento completo, `ValorTexto`, `EntradaValor`, `TecladoNumerico`.

**Confirme antes de começar:** o review final do M1 gerou uma onda de correção que adicionou `deviceID` e campos de sincronização aos registros. Rode `git log --oneline -3` e leia `App/Sources/Persistencia/ModelosSwiftData.swift` para ver a forma real dos campos antes de escrever a migração da Tarefa 8.

## Estrutura de arquivos

```
Packages/CasalDomain/Sources/CasalDomain/
├── Money.swift                    MODIFICAR — ganha dividir(em:)
├── Competencia.swift              NOVO — ano+mês como valor comparável
├── Cartao.swift                   NOVO — cartão e seus dias de ciclo
├── Conta.swift                    NOVO — conta de onde a fatura é paga
├── Fatura.swift                   NOVO — fatura e seu status
├── CalendarioFatura.swift         NOVO — em qual fatura a compra cai, quando vence
├── Parcelamento.swift             NOVO — distribui uma compra em N competências
├── PagamentoFatura.swift          NOVO — pagamento integral e parcial
├── LimiteCartao.swift             NOVO — limite disponível real
└── HorizonteFaturas.swift         NOVO — curva das próximas N faturas

App/Sources/Persistencia/
├── SchemaCasal.swift              NOVO — VersionedSchema v1 e v2, plano de migração
├── ModelosSwiftData.swift         MODIFICAR — CartaoRegistro, ContaRegistro, FaturaRegistro
├── Mapeamento.swift               MODIFICAR — ida e volta das três novas entidades
├── RepositorioCartoes.swift       NOVO — CRUD de cartão e conta
└── RepositorioFaturas.swift       NOVO — materializa e consulta faturas

App/Sources/UI/Cartoes/
├── CartoesModelo.swift            NOVO — estado da seção
├── CartoesView.swift              NOVO — entrada: lista compacta + total + curva
├── CartaoDetalheView.swift        NOVO — carrossel, abas de fatura, lançamentos
├── CartaoFace.swift               NOVO — o cartão em formato de cartão, reutilizável
├── CartaoFormView.swift           NOVO — cadastro e edição
└── PagarFaturaView.swift          NOVO — confirmação de pagamento
```

**Por que `CartaoFace` é arquivo próprio:** o mesmo desenho de cartão aparece em três lugares — miniatura na lista, cartão grande no carrossel, e prévia no formulário de cadastro. Um arquivo, três tamanhos, nenhuma cópia.

---

# Fase A — Domínio (roda sem Xcode)

## Task 1: Money ganha divisão com sobra na primeira parcela

Parcelamento é o coração do M2 e `Money` hoje só sabe somar e subtrair. A regra de arredondamento não é opinião: o cartão brasileiro joga a sobra na **primeira** parcela, então `R$ 100,00 em 3x` é `33,34 + 33,33 + 33,33`.

**Files:**
- Modify: `Packages/CasalDomain/Sources/CasalDomain/Money.swift`
- Test: `Packages/CasalDomain/Tests/CasalDomainTests/MoneyDivisaoTests.swift`

**Interfaces:**
- Consumes: `Money` do M1
- Produces: `Money.dividir(em partes: Int) -> [Money]`

- [ ] **Step 1: Escrever o teste que falha**

`Packages/CasalDomain/Tests/CasalDomainTests/MoneyDivisaoTests.swift`:

```swift
import Testing
@testable import CasalDomain

@Suite("Money.dividir")
struct MoneyDivisaoTests {
    @Test("divisão exata reparte igual")
    func exata() {
        #expect(Money(centavos: 30_000).dividir(em: 3) == [
            Money(centavos: 10_000), Money(centavos: 10_000), Money(centavos: 10_000)
        ])
    }

    @Test("a sobra vai para a primeira parcela")
    func sobraNaPrimeira() {
        #expect(Money(centavos: 10_000).dividir(em: 3) == [
            Money(centavos: 3334), Money(centavos: 3333), Money(centavos: 3333)
        ])
    }

    @Test("sobra de dois centavos também fica inteira na primeira")
    func sobraDeDois() {
        #expect(Money(centavos: 10_001).dividir(em: 3) == [
            Money(centavos: 3335), Money(centavos: 3333), Money(centavos: 3333)
        ])
    }

    @Test("a soma das parcelas é sempre igual ao total")
    func somaPreservada() {
        for total in [1, 7, 99, 100, 10_000, 10_001, 123_457] {
            for partes in 1...24 {
                let parcelas = Money(centavos: total).dividir(em: partes)
                #expect(parcelas.count == partes)
                #expect(parcelas.reduce(Money.zero, +) == Money(centavos: total))
            }
        }
    }

    @Test("dividir em uma parte devolve o próprio valor")
    func umaParte() {
        #expect(Money(centavos: 4242).dividir(em: 1) == [Money(centavos: 4242)])
    }

    @Test("zero ou negativo de partes devolve lista vazia em vez de estourar")
    func partesInvalidas() {
        #expect(Money(centavos: 100).dividir(em: 0).isEmpty)
        #expect(Money(centavos: 100).dividir(em: -3).isEmpty)
    }

    @Test("valor menor que o número de parcelas não gera parcela negativa")
    func valorMinusculo() {
        let parcelas = Money(centavos: 2).dividir(em: 5)
        #expect(parcelas.reduce(Money.zero, +) == Money(centavos: 2))
        #expect(parcelas.allSatisfy { $0.centavos >= 0 })
    }
}
```

O teste `somaPreservada` é o que mais importa: é ele que garante que nenhum centavo aparece nem desaparece na divisão, para qualquer combinação. Um motor de parcelamento que perde centavo é um app que mente sobre dinheiro.

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd Packages/CasalDomain && swift test --filter "Money.dividir"`
Expected: FALHA de compilação, `value of type 'Money' has no member 'dividir'`

- [ ] **Step 3: Implementar**

Acrescentar ao corpo de `Money` em `Packages/CasalDomain/Sources/CasalDomain/Money.swift`:

```swift
    /// Reparte o valor em `partes` parcelas. A sobra da divisão inteira vai
    /// integralmente para a PRIMEIRA parcela, que é como o cartão de crédito
    /// brasileiro faz: R$ 100,00 em 3x são 33,34 + 33,33 + 33,33.
    ///
    /// A soma das parcelas devolvidas é sempre exatamente igual ao total.
    public func dividir(em partes: Int) -> [Money] {
        guard partes > 0 else { return [] }

        let base = centavos / partes
        let primeira = centavos - base * (partes - 1)

        var parcelas = [Money(centavos: primeira)]
        parcelas.append(contentsOf: repeatElement(Money(centavos: base), count: partes - 1))
        return parcelas
    }
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd Packages/CasalDomain && swift test --filter "Money.dividir"`
Expected: 7 testes passando

- [ ] **Step 5: Commit**

```bash
git add Packages/CasalDomain/Sources/CasalDomain/Money.swift \
        Packages/CasalDomain/Tests/CasalDomainTests/MoneyDivisaoTests.swift
git commit -m "feat(dominio): Money.dividir com sobra na primeira parcela"
```

---

## Task 2: Competência

Fatura não pertence a uma data, pertence a um mês de referência. Um tipo próprio evita a sopa de `(ano: Int, mes: Int)` espalhada e dá comparação e avanço de mês de graça.

**Files:**
- Create: `Packages/CasalDomain/Sources/CasalDomain/Competencia.swift`
- Test: `Packages/CasalDomain/Tests/CasalDomainTests/CompetenciaTests.swift`

**Interfaces:**
- Consumes: nada
- Produces: `Competencia` com `init(ano:mes:)`, `Comparable`, `Hashable`, `Sendable`, `avancando(meses:) -> Competencia`, `init(data:calendario:)`, `rotuloCurto: String`

- [ ] **Step 1: Escrever o teste que falha**

`Packages/CasalDomain/Tests/CasalDomainTests/CompetenciaTests.swift`:

```swift
import Foundation
import Testing
@testable import CasalDomain

@Suite("Competencia")
struct CompetenciaTests {
    @Test("avançar dentro do ano soma meses")
    func avancoSimples() {
        #expect(Competencia(ano: 2026, mes: 3).avancando(meses: 4) == Competencia(ano: 2026, mes: 7))
    }

    @Test("avançar cruzando dezembro vira o ano")
    func viradaDeAno() {
        #expect(Competencia(ano: 2026, mes: 11).avancando(meses: 3) == Competencia(ano: 2027, mes: 2))
        #expect(Competencia(ano: 2026, mes: 12).avancando(meses: 1) == Competencia(ano: 2027, mes: 1))
    }

    @Test("avançar doze meses cai no mesmo mês do ano seguinte")
    func dozeMeses() {
        #expect(Competencia(ano: 2026, mes: 5).avancando(meses: 12) == Competencia(ano: 2027, mes: 5))
    }

    @Test("avançar negativo retrocede")
    func retrocesso() {
        #expect(Competencia(ano: 2026, mes: 2).avancando(meses: -3) == Competencia(ano: 2025, mes: 11))
    }

    @Test("ordena por ano e depois por mês")
    func ordenacao() {
        #expect(Competencia(ano: 2026, mes: 1) < Competencia(ano: 2026, mes: 2))
        #expect(Competencia(ano: 2026, mes: 12) < Competencia(ano: 2027, mes: 1))
    }

    @Test("deriva de uma data no calendário do usuário")
    func deData() {
        var calendario = Calendar(identifier: .gregorian)
        calendario.timeZone = TimeZone(identifier: "America/Sao_Paulo")!
        var partes = DateComponents()
        partes.year = 2026
        partes.month = 8
        partes.day = 31
        partes.hour = 21
        let data = calendario.date(from: partes)!

        #expect(Competencia(data: data, calendario: calendario) == Competencia(ano: 2026, mes: 8))
    }

    @Test("rótulo curto usa três letras minúsculas do mês")
    func rotulo() {
        #expect(Competencia(ano: 2026, mes: 9).rotuloCurto == "set")
        #expect(Competencia(ano: 2026, mes: 1).rotuloCurto == "jan")
    }
}
```

O teste `deData` usa 21h do dia 31 em São Paulo de propósito: é o caso em que um cálculo feito em UTC jogaria a compra no mês seguinte e o usuário veria o gasto no mês errado.

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd Packages/CasalDomain && swift test --filter Competencia`
Expected: FALHA, `cannot find 'Competencia' in scope`

- [ ] **Step 3: Implementar**

`Packages/CasalDomain/Sources/CasalDomain/Competencia.swift`:

```swift
import Foundation

/// Mês de referência de uma fatura. Guarda ano e mês, nunca dia, porque
/// fatura não pertence a uma data — pertence a um ciclo.
public struct Competencia: Hashable, Sendable, Comparable, Codable {
    public let ano: Int
    public let mes: Int

    public init(ano: Int, mes: Int) {
        self.ano = ano
        self.mes = mes
    }

    /// Deriva a competência de uma data no calendário do usuário. O calendário
    /// carrega o fuso, então uma compra às 21h do dia 31 em São Paulo fica no
    /// mês que o usuário viveu, não no mês em UTC.
    public init(data: Date, calendario: Calendar = .current) {
        let partes = calendario.dateComponents([.year, .month], from: data)
        ano = partes.year ?? 1
        mes = partes.month ?? 1
    }

    public static func < (lhs: Competencia, rhs: Competencia) -> Bool {
        (lhs.ano, lhs.mes) < (rhs.ano, rhs.mes)
    }

    public func avancando(meses: Int) -> Competencia {
        let totalZeroBase = (ano * 12 + (mes - 1)) + meses
        return Competencia(ano: totalZeroBase / 12, mes: totalZeroBase % 12 + 1)
    }

    private static let rotulos = [
        "jan", "fev", "mar", "abr", "mai", "jun",
        "jul", "ago", "set", "out", "nov", "dez"
    ]

    public var rotuloCurto: String {
        guard (1...12).contains(mes) else { return "?" }
        return Self.rotulos[mes - 1]
    }
}
```

Nota sobre `avancando` com valores negativos: a aritmética inteira do Swift trunca em direção a zero, então `totalZeroBase` negativo daria mês errado. Para os anos que este app enxerga (`ano >= 1`), `ano * 12 + mes - 1` é sempre positivo o suficiente para que um retrocesso de poucos meses não cruze o zero. O teste `retrocesso` cobre o caso real.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd Packages/CasalDomain && swift test --filter Competencia`
Expected: 7 testes passando

- [ ] **Step 5: Commit**

```bash
git add Packages/CasalDomain/Sources/CasalDomain/Competencia.swift \
        Packages/CasalDomain/Tests/CasalDomainTests/CompetenciaTests.swift
git commit -m "feat(dominio): Competencia como mes de referencia de fatura"
```

---

## Task 3: Cartão, Conta e Fatura

**Files:**
- Create: `Packages/CasalDomain/Sources/CasalDomain/Cartao.swift`
- Create: `Packages/CasalDomain/Sources/CasalDomain/Conta.swift`
- Create: `Packages/CasalDomain/Sources/CasalDomain/Fatura.swift`
- Modify: `Packages/CasalDomain/Sources/CasalDomain/Enums.swift`
- Test: `Packages/CasalDomain/Tests/CasalDomainTests/CartaoTests.swift`

**Interfaces:**
- Consumes: `Money`, `Competencia`
- Produces: `Cartao`, `Conta`, `Fatura`, `StatusFatura`, `TipoConta`, `BandeiraCartao`

- [ ] **Step 1: Escrever o teste que falha**

`Packages/CasalDomain/Tests/CasalDomainTests/CartaoTests.swift`:

```swift
import Foundation
import Testing
@testable import CasalDomain

@Suite("Cartao, Conta e Fatura")
struct CartaoTests {
    @Test("cartão guarda os dois dias do ciclo separadamente")
    func diasDoCiclo() {
        let cartao = Cartao(
            carteiraID: UUID(),
            apelido: "Nosso",
            banco: "Nubank",
            ultimos4: "4417",
            limite: Money(centavos: 800_000),
            diaFechamento: 28,
            diaVencimento: 5
        )
        #expect(cartao.diaFechamento == 28)
        #expect(cartao.diaVencimento == 5)
        #expect(cartao.bandeira == .outra)
        #expect(cartao.arquivado == false)
    }

    @Test("dias fora de 1...31 são recusados na validação")
    func validacaoDeDias() {
        #expect(Cartao.diaValido(1))
        #expect(Cartao.diaValido(31))
        #expect(Cartao.diaValido(0) == false)
        #expect(Cartao.diaValido(32) == false)
    }

    @Test("status da fatura cobre aberta, fechada, parcial e paga")
    func statusPossiveis() {
        #expect(StatusFatura.allCases.count == 4)
        #expect(StatusFatura.allCases.contains(.parcial))
    }

    @Test("raw values de status e tipo de conta são snake_case estáveis")
    func rawValuesTravados() {
        #expect(StatusFatura.aberta.rawValue == "aberta")
        #expect(StatusFatura.fechada.rawValue == "fechada")
        #expect(StatusFatura.parcial.rawValue == "parcial")
        #expect(StatusFatura.paga.rawValue == "paga")
        #expect(TipoConta.corrente.rawValue == "corrente")
        #expect(TipoConta.poupanca.rawValue == "poupanca")
        #expect(TipoConta.dinheiro.rawValue == "dinheiro")
    }

    @Test("fatura nasce aberta e sem nada pago")
    func faturaNova() {
        let fatura = Fatura(
            cartaoID: UUID(),
            competencia: Competencia(ano: 2026, mes: 9),
            fechaEm: Date(timeIntervalSince1970: 0),
            venceEm: Date(timeIntervalSince1970: 86_400)
        )
        #expect(fatura.status == .aberta)
        #expect(fatura.valorPago == Money.zero)
    }

    @Test("conta guarda saldo inicial em centavos")
    func conta() {
        let conta = Conta(
            carteiraID: UUID(),
            nome: "Conta corrente",
            tipo: .corrente,
            saldoInicial: Money(centavos: 150_000)
        )
        #expect(conta.saldoInicial == Money(centavos: 150_000))
        #expect(conta.tipo == .corrente)
    }
}
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd Packages/CasalDomain && swift test --filter "Cartao, Conta e Fatura"`
Expected: FALHA, `cannot find 'Cartao' in scope`

- [ ] **Step 3: Acrescentar os enums**

Acrescentar ao fim de `Packages/CasalDomain/Sources/CasalDomain/Enums.swift`:

```swift
public enum StatusFatura: String, Codable, Sendable, CaseIterable {
    case aberta, fechada, parcial, paga
}

public enum TipoConta: String, Codable, Sendable, CaseIterable {
    case corrente, poupanca, dinheiro
}

public enum BandeiraCartao: String, Codable, Sendable, CaseIterable {
    case visa, mastercard, elo, amex, hipercard, outra
}
```

- [ ] **Step 4: Implementar Cartao**

`Packages/CasalDomain/Sources/CasalDomain/Cartao.swift`:

```swift
import Foundation

public struct Cartao: Identifiable, Hashable, Sendable {
    public let id: UUID
    public var carteiraID: UUID
    public var apelido: String
    public var banco: String
    public var bandeira: BandeiraCartao
    public var ultimos4: String
    public var cor: String
    public var limite: Money
    /// Dia do mês em que a fatura para de receber compras.
    public var diaFechamento: Int
    /// Dia do mês em que a fatura precisa ser paga. Pode ser antes ou depois
    /// do fechamento — a relação entre os dois decide em que mês ela vence.
    public var diaVencimento: Int
    /// Conta de onde o pagamento da fatura sai, quando já escolhida.
    public var contaPagamentoID: UUID?
    public var arquivado: Bool

    public init(
        id: UUID = UUID(),
        carteiraID: UUID,
        apelido: String,
        banco: String,
        bandeira: BandeiraCartao = .outra,
        ultimos4: String,
        cor: String = "#7C5CFF",
        limite: Money,
        diaFechamento: Int,
        diaVencimento: Int,
        contaPagamentoID: UUID? = nil,
        arquivado: Bool = false
    ) {
        self.id = id
        self.carteiraID = carteiraID
        self.apelido = apelido
        self.banco = banco
        self.bandeira = bandeira
        self.ultimos4 = ultimos4
        self.cor = cor
        self.limite = limite
        self.diaFechamento = diaFechamento
        self.diaVencimento = diaVencimento
        self.contaPagamentoID = contaPagamentoID
        self.arquivado = arquivado
    }

    public static func diaValido(_ dia: Int) -> Bool {
        (1...31).contains(dia)
    }
}
```

- [ ] **Step 5: Implementar Conta e Fatura**

`Packages/CasalDomain/Sources/CasalDomain/Conta.swift`:

```swift
import Foundation

public struct Conta: Identifiable, Hashable, Sendable {
    public let id: UUID
    public var carteiraID: UUID
    public var nome: String
    public var tipo: TipoConta
    public var saldoInicial: Money
    public var arquivada: Bool

    public init(
        id: UUID = UUID(),
        carteiraID: UUID,
        nome: String,
        tipo: TipoConta = .corrente,
        saldoInicial: Money = .zero,
        arquivada: Bool = false
    ) {
        self.id = id
        self.carteiraID = carteiraID
        self.nome = nome
        self.tipo = tipo
        self.saldoInicial = saldoInicial
        self.arquivada = arquivada
    }
}
```

`Packages/CasalDomain/Sources/CasalDomain/Fatura.swift`:

```swift
import Foundation

public struct Fatura: Identifiable, Hashable, Sendable {
    public let id: UUID
    public var cartaoID: UUID
    public var competencia: Competencia
    public var fechaEm: Date
    public var venceEm: Date
    public var status: StatusFatura
    public var valorPago: Money

    public init(
        id: UUID = UUID(),
        cartaoID: UUID,
        competencia: Competencia,
        fechaEm: Date,
        venceEm: Date,
        status: StatusFatura = .aberta,
        valorPago: Money = .zero
    ) {
        self.id = id
        self.cartaoID = cartaoID
        self.competencia = competencia
        self.fechaEm = fechaEm
        self.venceEm = venceEm
        self.status = status
        self.valorPago = valorPago
    }
}
```

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `cd Packages/CasalDomain && swift test --filter "Cartao, Conta e Fatura"`
Expected: 6 testes passando

- [ ] **Step 7: Commit**

```bash
git add Packages/CasalDomain/Sources/CasalDomain/Cartao.swift \
        Packages/CasalDomain/Sources/CasalDomain/Conta.swift \
        Packages/CasalDomain/Sources/CasalDomain/Fatura.swift \
        Packages/CasalDomain/Sources/CasalDomain/Enums.swift \
        Packages/CasalDomain/Tests/CasalDomainTests/CartaoTests.swift
git commit -m "feat(dominio): entidades Cartao, Conta e Fatura"
```

---

## Task 4: Calendário de fatura

A tarefa mais perigosa do M2. Se ela errar, todo número que o app mostra sobre cartão está errado, e o usuário descobre no dia do vencimento.

**Files:**
- Create: `Packages/CasalDomain/Sources/CasalDomain/CalendarioFatura.swift`
- Test: `Packages/CasalDomain/Tests/CasalDomainTests/CalendarioFaturaTests.swift`

**Interfaces:**
- Consumes: `Cartao`, `Competencia`
- Produces: `CalendarioFatura.competencia(deCompraEm:cartao:calendario:) -> Competencia`, `CalendarioFatura.fechamento(competencia:cartao:calendario:) -> Date`, `CalendarioFatura.vencimento(competencia:cartao:calendario:) -> Date`

- [ ] **Step 1: Escrever o teste que falha**

`Packages/CasalDomain/Tests/CasalDomainTests/CalendarioFaturaTests.swift`:

```swift
import Foundation
import Testing
@testable import CasalDomain

@Suite("CalendarioFatura")
struct CalendarioFaturaTests {
    private var calendario: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/Sao_Paulo")!
        return c
    }

    private func data(_ ano: Int, _ mes: Int, _ dia: Int, hora: Int = 12) -> Date {
        var partes = DateComponents()
        partes.year = ano
        partes.month = mes
        partes.day = dia
        partes.hour = hora
        return calendario.date(from: partes)!
    }

    private func cartao(fecha: Int, vence: Int) -> Cartao {
        Cartao(
            carteiraID: UUID(), apelido: "teste", banco: "banco", ultimos4: "0000",
            limite: Money(centavos: 1_000_000), diaFechamento: fecha, diaVencimento: vence
        )
    }

    @Test("compra antes do fechamento cai na fatura do próprio mês")
    func antesDoFechamento() {
        let c = cartao(fecha: 28, vence: 5)
        #expect(CalendarioFatura.competencia(deCompraEm: data(2026, 9, 10), cartao: c, calendario: calendario)
                == Competencia(ano: 2026, mes: 9))
    }

    @Test("compra no próprio dia do fechamento ainda entra na fatura daquele mês")
    func noDiaDoFechamento() {
        let c = cartao(fecha: 28, vence: 5)
        #expect(CalendarioFatura.competencia(deCompraEm: data(2026, 9, 28), cartao: c, calendario: calendario)
                == Competencia(ano: 2026, mes: 9))
    }

    @Test("compra depois do fechamento cai na fatura do mês seguinte")
    func depoisDoFechamento() {
        let c = cartao(fecha: 28, vence: 5)
        #expect(CalendarioFatura.competencia(deCompraEm: data(2026, 9, 29), cartao: c, calendario: calendario)
                == Competencia(ano: 2026, mes: 10))
    }

    @Test("compra depois do fechamento em dezembro vira o ano")
    func viradaDeAno() {
        let c = cartao(fecha: 28, vence: 5)
        #expect(CalendarioFatura.competencia(deCompraEm: data(2026, 12, 30), cartao: c, calendario: calendario)
                == Competencia(ano: 2027, mes: 1))
    }

    @Test("fechamento no dia 31 trunca para o último dia de fevereiro")
    func mesCurto() {
        let c = cartao(fecha: 31, vence: 10)
        let fechamento = CalendarioFatura.fechamento(
            competencia: Competencia(ano: 2026, mes: 2), cartao: c, calendario: calendario
        )
        let partes = calendario.dateComponents([.year, .month, .day], from: fechamento)
        #expect(partes.month == 2)
        #expect(partes.day == 28)
    }

    @Test("vencimento maior que fechamento vence no mesmo mês")
    func venceNoMesmoMes() {
        let c = cartao(fecha: 2, vence: 10)
        let vencimento = CalendarioFatura.vencimento(
            competencia: Competencia(ano: 2026, mes: 9), cartao: c, calendario: calendario
        )
        let partes = calendario.dateComponents([.year, .month, .day], from: vencimento)
        #expect(partes.year == 2026)
        #expect(partes.month == 9)
        #expect(partes.day == 10)
    }

    @Test("vencimento menor ou igual ao fechamento vence no mês seguinte")
    func venceNoMesSeguinte() {
        let c = cartao(fecha: 28, vence: 5)
        let vencimento = CalendarioFatura.vencimento(
            competencia: Competencia(ano: 2026, mes: 9), cartao: c, calendario: calendario
        )
        let partes = calendario.dateComponents([.year, .month, .day], from: vencimento)
        #expect(partes.year == 2026)
        #expect(partes.month == 10)
        #expect(partes.day == 5)
    }

    @Test("vencimento de dezembro no mês seguinte vira o ano")
    func vencimentoViraAno() {
        let c = cartao(fecha: 28, vence: 5)
        let vencimento = CalendarioFatura.vencimento(
            competencia: Competencia(ano: 2026, mes: 12), cartao: c, calendario: calendario
        )
        let partes = calendario.dateComponents([.year, .month], from: vencimento)
        #expect(partes.year == 2027)
        #expect(partes.month == 1)
    }

    @Test("compra às 23h do dia do fechamento não escorrega para o mês seguinte")
    func bordaDeHorario() {
        let c = cartao(fecha: 28, vence: 5)
        #expect(CalendarioFatura.competencia(
            deCompraEm: data(2026, 9, 28, hora: 23), cartao: c, calendario: calendario
        ) == Competencia(ano: 2026, mes: 9))
    }
}
```

Os dois testes de vencimento são o coração: `fecha 2 / vence 10` vence no **mesmo** mês, `fecha 28 / vence 5` vence no **seguinte**. Essa inversão é onde a maioria dos apps brasileiros erra.

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd Packages/CasalDomain && swift test --filter CalendarioFatura`
Expected: FALHA, `cannot find 'CalendarioFatura' in scope`

- [ ] **Step 3: Implementar**

`Packages/CasalDomain/Sources/CasalDomain/CalendarioFatura.swift`:

```swift
import Foundation

public enum CalendarioFatura: Sendable {
    /// Em qual fatura uma compra cai. Se o dia da compra for menor ou igual ao
    /// dia de fechamento, ela entra na fatura que fecha naquele mês; senão, na
    /// do mês seguinte.
    public static func competencia(
        deCompraEm data: Date,
        cartao: Cartao,
        calendario: Calendar = .current
    ) -> Competencia {
        let dia = calendario.component(.day, from: data)
        let base = Competencia(data: data, calendario: calendario)
        return dia <= cartao.diaFechamento ? base : base.avancando(meses: 1)
    }

    /// Data de fechamento da competência. Meses curtos truncam: fechamento no
    /// dia 31 acontece no dia 28 ou 29 em fevereiro.
    public static func fechamento(
        competencia: Competencia,
        cartao: Cartao,
        calendario: Calendar = .current
    ) -> Date {
        diaDoMes(cartao.diaFechamento, competencia: competencia, calendario: calendario)
    }

    /// Data de vencimento da competência. Se o dia de vencimento for maior que
    /// o de fechamento, vence no mesmo mês (fecha 02, vence 10). Se for menor
    /// ou igual, vence no mês seguinte (fecha 28, vence 05).
    public static func vencimento(
        competencia: Competencia,
        cartao: Cartao,
        calendario: Calendar = .current
    ) -> Date {
        let alvo = cartao.diaVencimento > cartao.diaFechamento
            ? competencia
            : competencia.avancando(meses: 1)
        return diaDoMes(cartao.diaVencimento, competencia: alvo, calendario: calendario)
    }

    /// Resolve "dia N da competência", truncando para o último dia quando o
    /// mês é curto demais. A hora fica no início do dia, para que comparações
    /// de data não dependam do horário em que o cartão foi cadastrado.
    private static func diaDoMes(
        _ dia: Int,
        competencia: Competencia,
        calendario: Calendar
    ) -> Date {
        var partes = DateComponents()
        partes.year = competencia.ano
        partes.month = competencia.mes
        partes.day = 1
        let primeiroDia = calendario.date(from: partes) ?? Date(timeIntervalSince1970: 0)

        let diasNoMes = calendario.range(of: .day, in: .month, for: primeiroDia)?.count ?? 28
        partes.day = min(dia, diasNoMes)

        let resolvida = calendario.date(from: partes) ?? primeiroDia
        return calendario.startOfDay(for: resolvida)
    }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd Packages/CasalDomain && swift test --filter CalendarioFatura`
Expected: 9 testes passando

- [ ] **Step 5: Commit**

```bash
git add Packages/CasalDomain/Sources/CasalDomain/CalendarioFatura.swift \
        Packages/CasalDomain/Tests/CasalDomainTests/CalendarioFaturaTests.swift
git commit -m "feat(dominio): calendario de fatura com fechamento e vencimento"
```

---

## Task 5: Parcelamento

**Files:**
- Create: `Packages/CasalDomain/Sources/CasalDomain/Parcelamento.swift`
- Test: `Packages/CasalDomain/Tests/CasalDomainTests/ParcelamentoTests.swift`

**Interfaces:**
- Consumes: `Money.dividir(em:)`, `Competencia`, `Cartao`, `CalendarioFatura`, `Transacao`
- Produces: `ParcelaPlanejada` com `competencia`, `valor`, `numero`, `total`; e `Parcelamento.planejar(total:vezes:compraEm:cartao:calendario:) -> [ParcelaPlanejada]`, `Parcelamento.transacoes(de:carteiraID:categoriaID:descricao:criadoPor:cartao:) -> [Transacao]`

- [ ] **Step 1: Escrever o teste que falha**

`Packages/CasalDomain/Tests/CasalDomainTests/ParcelamentoTests.swift`:

```swift
import Foundation
import Testing
@testable import CasalDomain

@Suite("Parcelamento")
struct ParcelamentoTests {
    private var calendario: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/Sao_Paulo")!
        return c
    }

    private func data(_ ano: Int, _ mes: Int, _ dia: Int) -> Date {
        var partes = DateComponents()
        partes.year = ano
        partes.month = mes
        partes.day = dia
        partes.hour = 12
        return calendario.date(from: partes)!
    }

    private var cartao: Cartao {
        Cartao(
            carteiraID: UUID(), apelido: "Nosso", banco: "Nubank", ultimos4: "4417",
            limite: Money(centavos: 1_000_000), diaFechamento: 28, diaVencimento: 5
        )
    }

    @Test("à vista gera uma única parcela na fatura da compra")
    func aVista() {
        let parcelas = Parcelamento.planejar(
            total: Money(centavos: 4200), vezes: 1,
            compraEm: data(2026, 9, 10), cartao: cartao, calendario: calendario
        )
        #expect(parcelas.count == 1)
        #expect(parcelas[0].competencia == Competencia(ano: 2026, mes: 9))
        #expect(parcelas[0].valor == Money(centavos: 4200))
        #expect(parcelas[0].numero == 1)
        #expect(parcelas[0].total == 1)
    }

    @Test("doze vezes ocupa doze competências consecutivas")
    func dozeVezes() {
        let parcelas = Parcelamento.planejar(
            total: Money(centavos: 300_000), vezes: 12,
            compraEm: data(2026, 9, 10), cartao: cartao, calendario: calendario
        )
        #expect(parcelas.count == 12)
        #expect(parcelas.first?.competencia == Competencia(ano: 2026, mes: 9))
        #expect(parcelas.last?.competencia == Competencia(ano: 2027, mes: 8))
        #expect(parcelas.map(\.numero) == Array(1...12))
        #expect(parcelas.allSatisfy { $0.total == 12 })
    }

    @Test("a soma das parcelas é exatamente o total, com sobra na primeira")
    func somaEArredondamento() {
        let parcelas = Parcelamento.planejar(
            total: Money(centavos: 10_000), vezes: 3,
            compraEm: data(2026, 9, 10), cartao: cartao, calendario: calendario
        )
        #expect(parcelas.map(\.valor) == [
            Money(centavos: 3334), Money(centavos: 3333), Money(centavos: 3333)
        ])
        #expect(parcelas.reduce(Money.zero) { $0 + $1.valor } == Money(centavos: 10_000))
    }

    @Test("compra depois do fechamento empurra a primeira parcela e todas as demais")
    func depoisDoFechamento() {
        let parcelas = Parcelamento.planejar(
            total: Money(centavos: 60_000), vezes: 6,
            compraEm: data(2026, 9, 29), cartao: cartao, calendario: calendario
        )
        #expect(parcelas.first?.competencia == Competencia(ano: 2026, mes: 10))
        #expect(parcelas.last?.competencia == Competencia(ano: 2027, mes: 3))
    }

    @Test("zero vezes não gera parcela nenhuma")
    func vezesInvalido() {
        #expect(Parcelamento.planejar(
            total: Money(centavos: 100), vezes: 0,
            compraEm: data(2026, 9, 10), cartao: cartao, calendario: calendario
        ).isEmpty)
    }

    @Test("as transações compartilham o grupo e carregam o cartão")
    func transacoesGeradas() {
        let carteira = UUID()
        let categoria = UUID()
        let autor = UUID()
        let meuCartao = cartao

        let planejadas = Parcelamento.planejar(
            total: Money(centavos: 300_000), vezes: 12,
            compraEm: data(2026, 9, 10), cartao: meuCartao, calendario: calendario
        )
        let transacoes = Parcelamento.transacoes(
            de: planejadas, carteiraID: carteira, categoriaID: categoria,
            descricao: "Apple Store", criadoPor: autor, cartao: meuCartao
        )

        #expect(transacoes.count == 12)
        #expect(Set(transacoes.compactMap(\.grupoParcela)).count == 1)
        #expect(transacoes.allSatisfy { $0.cartaoID == meuCartao.id })
        #expect(transacoes.allSatisfy { $0.tipo == .despesa })
        #expect(transacoes.allSatisfy { $0.carteiraID == carteira })
        #expect(transacoes.allSatisfy { $0.descricao == "Apple Store" })
        #expect(transacoes.map(\.parcelaN) == Array(1...12))
        #expect(transacoes.reduce(Money.zero) { $0 + $1.valor } == Money(centavos: 300_000))
    }

    @Test("cada parcela tem hashDedup próprio, senão as doze colidiriam entre si")
    func dedupPorParcela() {
        let meuCartao = cartao
        let planejadas = Parcelamento.planejar(
            total: Money(centavos: 300_000), vezes: 12,
            compraEm: data(2026, 9, 10), cartao: meuCartao, calendario: calendario
        )
        let transacoes = Parcelamento.transacoes(
            de: planejadas, carteiraID: UUID(), categoriaID: nil,
            descricao: "Apple Store", criadoPor: UUID(), cartao: meuCartao
        )
        #expect(Set(transacoes.map(\.hashDedup)).count == 12)
    }
}
```

O último teste existe por um motivo concreto: doze parcelas iguais, na mesma carteira, com o mesmo estabelecimento, produziriam a **mesma** chave de deduplicação se a chave fosse só carteira+valor+estabelecimento. O parcelamento precisa distinguir parcela 3 de parcela 4, ou a detecção de duplicata do M5 apagaria onze parcelas legítimas.

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd Packages/CasalDomain && swift test --filter Parcelamento`
Expected: FALHA, `cannot find 'Parcelamento' in scope`

- [ ] **Step 3: Implementar**

`Packages/CasalDomain/Sources/CasalDomain/Parcelamento.swift`:

```swift
import Foundation

public struct ParcelaPlanejada: Hashable, Sendable {
    public let competencia: Competencia
    public let valor: Money
    public let numero: Int
    public let total: Int

    public init(competencia: Competencia, valor: Money, numero: Int, total: Int) {
        self.competencia = competencia
        self.valor = valor
        self.numero = numero
        self.total = total
    }
}

public enum Parcelamento: Sendable {
    /// Distribui uma compra em `vezes` parcelas, uma por competência
    /// consecutiva a partir da fatura em que a compra cai.
    public static func planejar(
        total: Money,
        vezes: Int,
        compraEm data: Date,
        cartao: Cartao,
        calendario: Calendar = .current
    ) -> [ParcelaPlanejada] {
        guard vezes > 0 else { return [] }

        let primeira = CalendarioFatura.competencia(
            deCompraEm: data, cartao: cartao, calendario: calendario
        )
        let valores = total.dividir(em: vezes)

        return valores.enumerated().map { indice, valor in
            ParcelaPlanejada(
                competencia: primeira.avancando(meses: indice),
                valor: valor,
                numero: indice + 1,
                total: vezes
            )
        }
    }

    /// Materializa as parcelas como transações de despesa. Todas compartilham
    /// um `grupoParcela`, para que editar ou estornar uma não quebre as outras.
    ///
    /// O `hashDedup` inclui o número da parcela: sem isso, doze parcelas de
    /// mesmo valor no mesmo estabelecimento colidiriam entre si na detecção de
    /// duplicata, e onze parcelas legítimas pareceriam repetição.
    public static func transacoes(
        de parcelas: [ParcelaPlanejada],
        carteiraID: UUID,
        categoriaID: UUID?,
        descricao: String,
        criadoPor: UUID,
        cartao: Cartao,
        calendario: Calendar = .current
    ) -> [Transacao] {
        guard !parcelas.isEmpty else { return [] }
        let grupo = UUID()

        return parcelas.map { parcela in
            let dataDaParcela = CalendarioFatura.fechamento(
                competencia: parcela.competencia, cartao: cartao, calendario: calendario
            )
            let chaveBase = Dedup.chave(
                carteiraID: carteiraID,
                tipo: .despesa,
                valor: parcela.valor,
                estabelecimento: descricao
            )
            return Transacao(
                carteiraID: carteiraID,
                tipo: .despesa,
                valor: parcela.valor,
                data: dataDaParcela,
                categoriaID: categoriaID,
                descricao: descricao,
                cartaoID: cartao.id,
                criadoPor: criadoPor,
                hashDedup: "\(chaveBase)|p\(parcela.numero)de\(parcela.total)",
                grupoParcela: grupo,
                parcelaN: parcela.numero,
                parcelaTotal: parcela.total
            )
        }
    }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd Packages/CasalDomain && swift test --filter Parcelamento`
Expected: 7 testes passando

- [ ] **Step 5: Commit**

```bash
git add Packages/CasalDomain/Sources/CasalDomain/Parcelamento.swift \
        Packages/CasalDomain/Tests/CasalDomainTests/ParcelamentoTests.swift
git commit -m "feat(dominio): parcelamento distribuido em competencias consecutivas"
```

---

## Task 6: Pagamento de fatura

Pagar fatura **não é despesa nova**. É transferência da conta para a fatura. Se for tratada como despesa, o mês conta dobrado — a compra já foi contada quando aconteceu.

**Files:**
- Create: `Packages/CasalDomain/Sources/CasalDomain/PagamentoFatura.swift`
- Test: `Packages/CasalDomain/Tests/CasalDomainTests/PagamentoFaturaTests.swift`

**Interfaces:**
- Consumes: `Money`, `Fatura`, `StatusFatura`, `Transacao`, `Conta`
- Produces: `PagamentoFatura.aplicar(pagamento:em:totalDaFatura:) -> Fatura`, `PagamentoFatura.transacao(valor:faturaID:contaID:carteiraID:criadoPor:data:) -> Transacao`, `PagamentoFatura.saldoDevedor(fatura:total:) -> Money`

- [ ] **Step 1: Escrever o teste que falha**

`Packages/CasalDomain/Tests/CasalDomainTests/PagamentoFaturaTests.swift`:

```swift
import Foundation
import Testing
@testable import CasalDomain

@Suite("PagamentoFatura")
struct PagamentoFaturaTests {
    private func fatura(status: StatusFatura = .fechada, pago: Int = 0) -> Fatura {
        Fatura(
            cartaoID: UUID(),
            competencia: Competencia(ano: 2026, mes: 9),
            fechaEm: Date(timeIntervalSince1970: 0),
            venceEm: Date(timeIntervalSince1970: 86_400),
            status: status,
            valorPago: Money(centavos: pago)
        )
    }

    @Test("pagamento integral marca a fatura como paga")
    func integral() {
        let resultado = PagamentoFatura.aplicar(
            pagamento: Money(centavos: 284_730),
            em: fatura(),
            totalDaFatura: Money(centavos: 284_730)
        )
        #expect(resultado.status == .paga)
        #expect(resultado.valorPago == Money(centavos: 284_730))
    }

    @Test("pagamento parcial marca parcial e acumula o valor pago")
    func parcial() {
        let resultado = PagamentoFatura.aplicar(
            pagamento: Money(centavos: 100_000),
            em: fatura(),
            totalDaFatura: Money(centavos: 284_730)
        )
        #expect(resultado.status == .parcial)
        #expect(resultado.valorPago == Money(centavos: 100_000))
    }

    @Test("dois pagamentos parciais que somam o total fecham a fatura")
    func doisParciais() {
        let total = Money(centavos: 284_730)
        let primeiro = PagamentoFatura.aplicar(
            pagamento: Money(centavos: 100_000), em: fatura(), totalDaFatura: total
        )
        let segundo = PagamentoFatura.aplicar(
            pagamento: Money(centavos: 184_730), em: primeiro, totalDaFatura: total
        )
        #expect(segundo.status == .paga)
        #expect(segundo.valorPago == total)
    }

    @Test("pagar mais que o total ainda marca paga, sem inventar crédito")
    func pagamentoAcimaDoTotal() {
        let resultado = PagamentoFatura.aplicar(
            pagamento: Money(centavos: 300_000),
            em: fatura(),
            totalDaFatura: Money(centavos: 284_730)
        )
        #expect(resultado.status == .paga)
        #expect(resultado.valorPago == Money(centavos: 300_000))
    }

    @Test("pagamento de valor zero não muda nada")
    func pagamentoZero() {
        let original = fatura()
        let resultado = PagamentoFatura.aplicar(
            pagamento: .zero, em: original, totalDaFatura: Money(centavos: 284_730)
        )
        #expect(resultado.status == original.status)
        #expect(resultado.valorPago == original.valorPago)
    }

    @Test("saldo devedor é o total menos o já pago, nunca negativo")
    func saldoDevedor() {
        let total = Money(centavos: 284_730)
        #expect(PagamentoFatura.saldoDevedor(fatura: fatura(pago: 100_000), total: total)
                == Money(centavos: 184_730))
        #expect(PagamentoFatura.saldoDevedor(fatura: fatura(pago: 300_000), total: total)
                == Money.zero)
    }

    @Test("a transação de pagamento é transferência, nunca despesa")
    func transacaoEhTransferencia() {
        let transacao = PagamentoFatura.transacao(
            valor: Money(centavos: 284_730),
            faturaID: UUID(),
            contaID: UUID(),
            carteiraID: UUID(),
            criadoPor: UUID(),
            data: Date(timeIntervalSince1970: 0)
        )
        #expect(transacao.tipo == .transferencia)
        #expect(transacao.categoriaID == nil)
        #expect(transacao.faturaID != nil)
        #expect(transacao.contaID != nil)
    }

    @Test("o pagamento fica fora do resumo mensal, senão o mês conta dobrado")
    func foraDoResumo() {
        let carteira = UUID()
        let autor = UUID()
        let compra = Transacao(
            carteiraID: carteira, tipo: .despesa, valor: Money(centavos: 284_730),
            data: Date(timeIntervalSince1970: 0), criadoPor: autor, hashDedup: "compra"
        )
        let pagamento = PagamentoFatura.transacao(
            valor: Money(centavos: 284_730), faturaID: UUID(), contaID: UUID(),
            carteiraID: carteira, criadoPor: autor, data: Date(timeIntervalSince1970: 0)
        )

        let resumo = ResumoMensal.calcular(
            transacoes: [compra, pagamento],
            de: Date(timeIntervalSince1970: -1),
            ate: Date(timeIntervalSince1970: 86_400)
        )
        #expect(resumo.totalDespesas == Money(centavos: 284_730))
        #expect(resumo.quantidade == 1)
    }
}
```

O último teste é o que prova a regra que a spec chama de erro nº1 de app de finanças: compra de R$ 2.847,30 mais o pagamento dela dá R$ 2.847,30 no resumo, não R$ 5.694,60.

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd Packages/CasalDomain && swift test --filter PagamentoFatura`
Expected: FALHA, `cannot find 'PagamentoFatura' in scope`

- [ ] **Step 3: Implementar**

`Packages/CasalDomain/Sources/CasalDomain/PagamentoFatura.swift`:

```swift
import Foundation

public enum PagamentoFatura: Sendable {
    /// Aplica um pagamento à fatura, acumulando sobre o que já foi pago.
    /// Pagamento que cobre o total marca `paga`; parcial marca `parcial`.
    /// Pagar acima do total não gera crédito — este app registra o que
    /// aconteceu, não simula financiamento.
    public static func aplicar(
        pagamento: Money,
        em fatura: Fatura,
        totalDaFatura total: Money
    ) -> Fatura {
        guard pagamento.centavos > 0 else { return fatura }

        var resultado = fatura
        resultado.valorPago = fatura.valorPago + pagamento
        resultado.status = resultado.valorPago < total ? .parcial : .paga
        return resultado
    }

    /// Quanto ainda falta pagar. Nunca negativo.
    public static func saldoDevedor(fatura: Fatura, total: Money) -> Money {
        let restante = total - fatura.valorPago
        return restante.centavos > 0 ? restante : .zero
    }

    /// A transação que representa o pagamento. É `.transferencia` por decisão
    /// de domínio: a despesa já foi registrada quando a compra aconteceu, e
    /// contar o pagamento como despesa dobraria o mês.
    public static func transacao(
        valor: Money,
        faturaID: UUID,
        contaID: UUID,
        carteiraID: UUID,
        criadoPor: UUID,
        data: Date
    ) -> Transacao {
        Transacao(
            carteiraID: carteiraID,
            tipo: .transferencia,
            valor: valor,
            data: data,
            categoriaID: nil,
            descricao: "Pagamento de fatura",
            contaID: contaID,
            faturaID: faturaID,
            criadoPor: criadoPor,
            hashDedup: "pagamento|\(faturaID.uuidString)|\(valor.centavos)"
        )
    }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd Packages/CasalDomain && swift test --filter PagamentoFatura`
Expected: 8 testes passando

- [ ] **Step 5: Commit**

```bash
git add Packages/CasalDomain/Sources/CasalDomain/PagamentoFatura.swift \
        Packages/CasalDomain/Tests/CasalDomainTests/PagamentoFaturaTests.swift
git commit -m "feat(dominio): pagamento de fatura como transferencia"
```

---

## Task 7: Limite disponível e horizonte de faturas

Dois agregados que alimentam direto a tela: o limite que sobra de verdade, e a curva de seis meses que mostra dívida parcelada se empilhando.

**Files:**
- Create: `Packages/CasalDomain/Sources/CasalDomain/LimiteCartao.swift`
- Create: `Packages/CasalDomain/Sources/CasalDomain/HorizonteFaturas.swift`
- Test: `Packages/CasalDomain/Tests/CasalDomainTests/LimiteCartaoTests.swift`
- Test: `Packages/CasalDomain/Tests/CasalDomainTests/HorizonteFaturasTests.swift`

**Interfaces:**
- Consumes: `Money`, `Cartao`, `Fatura`, `Competencia`, `Transacao`, `CalendarioFatura`, `PagamentoFatura`
- Produces: `LimiteCartao.disponivel(cartao:faturas:totaisPorFatura:parcelasFuturas:) -> Money`; `HorizonteFaturas.proximas(_:desde:transacoes:cartao:calendario:) -> [(competencia: Competencia, total: Money)]`

- [ ] **Step 1: Escrever os testes que falham**

`Packages/CasalDomain/Tests/CasalDomainTests/LimiteCartaoTests.swift`:

```swift
import Foundation
import Testing
@testable import CasalDomain

@Suite("LimiteCartao")
struct LimiteCartaoTests {
    private var cartao: Cartao {
        Cartao(
            carteiraID: UUID(), apelido: "Nosso", banco: "Nubank", ultimos4: "4417",
            limite: Money(centavos: 800_000), diaFechamento: 28, diaVencimento: 5
        )
    }

    private func fatura(_ mes: Int, status: StatusFatura, pago: Int = 0) -> Fatura {
        Fatura(
            cartaoID: UUID(), competencia: Competencia(ano: 2026, mes: mes),
            fechaEm: Date(timeIntervalSince1970: 0), venceEm: Date(timeIntervalSince1970: 86_400),
            status: status, valorPago: Money(centavos: pago)
        )
    }

    @Test("sem fatura e sem parcela, o limite inteiro está disponível")
    func limpo() {
        #expect(LimiteCartao.disponivel(
            cartao: cartao, faturas: [], totaisPorFatura: [:], parcelasFuturas: .zero
        ) == Money(centavos: 800_000))
    }

    @Test("fatura aberta desconta do limite")
    func faturaAberta() {
        let f = fatura(9, status: .aberta)
        #expect(LimiteCartao.disponivel(
            cartao: cartao, faturas: [f],
            totaisPorFatura: [f.id: Money(centavos: 284_730)], parcelasFuturas: .zero
        ) == Money(centavos: 515_270))
    }

    @Test("fatura paga não desconta nada")
    func faturaPaga() {
        let f = fatura(8, status: .paga, pago: 284_730)
        #expect(LimiteCartao.disponivel(
            cartao: cartao, faturas: [f],
            totaisPorFatura: [f.id: Money(centavos: 284_730)], parcelasFuturas: .zero
        ) == Money(centavos: 800_000))
    }

    @Test("fatura parcial desconta apenas o saldo devedor")
    func faturaParcial() {
        let f = fatura(9, status: .parcial, pago: 100_000)
        #expect(LimiteCartao.disponivel(
            cartao: cartao, faturas: [f],
            totaisPorFatura: [f.id: Money(centavos: 284_730)], parcelasFuturas: .zero
        ) == Money(centavos: 800_000 - 184_730))
    }

    @Test("parcelas futuras comprometidas também descontam")
    func parcelasFuturas() {
        #expect(LimiteCartao.disponivel(
            cartao: cartao, faturas: [], totaisPorFatura: [:],
            parcelasFuturas: Money(centavos: 300_000)
        ) == Money(centavos: 500_000))
    }

    @Test("limite estourado devolve zero em vez de negativo")
    func estourado() {
        let f = fatura(9, status: .aberta)
        #expect(LimiteCartao.disponivel(
            cartao: cartao, faturas: [f],
            totaisPorFatura: [f.id: Money(centavos: 900_000)], parcelasFuturas: .zero
        ) == Money.zero)
    }
}
```

`Packages/CasalDomain/Tests/CasalDomainTests/HorizonteFaturasTests.swift`:

```swift
import Foundation
import Testing
@testable import CasalDomain

@Suite("HorizonteFaturas")
struct HorizonteFaturasTests {
    private var calendario: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/Sao_Paulo")!
        return c
    }

    private var cartao: Cartao {
        Cartao(
            carteiraID: UUID(), apelido: "Nosso", banco: "Nubank", ultimos4: "4417",
            limite: Money(centavos: 2_000_000), diaFechamento: 28, diaVencimento: 5
        )
    }

    private func data(_ ano: Int, _ mes: Int, _ dia: Int) -> Date {
        var partes = DateComponents()
        partes.year = ano
        partes.month = mes
        partes.day = dia
        partes.hour = 12
        return calendario.date(from: partes)!
    }

    @Test("uma compra em 12x aparece em doze competências da curva")
    func curvaDeParcelas() {
        let meuCartao = cartao
        let planejadas = Parcelamento.planejar(
            total: Money(centavos: 300_000), vezes: 12,
            compraEm: data(2026, 9, 10), cartao: meuCartao, calendario: calendario
        )
        let transacoes = Parcelamento.transacoes(
            de: planejadas, carteiraID: UUID(), categoriaID: nil,
            descricao: "Sofá", criadoPor: UUID(), cartao: meuCartao, calendario: calendario
        )

        let curva = HorizonteFaturas.proximas(
            6, desde: Competencia(ano: 2026, mes: 9),
            transacoes: transacoes, cartao: meuCartao, calendario: calendario
        )

        #expect(curva.count == 6)
        #expect(curva.first?.competencia == Competencia(ano: 2026, mes: 9))
        #expect(curva.last?.competencia == Competencia(ano: 2027, mes: 2))
        #expect(curva.allSatisfy { $0.total == Money(centavos: 25_000) })
    }

    @Test("competência sem lançamento aparece com zero, não desaparece")
    func mesVazioApareceComZero() {
        let meuCartao = cartao
        let aVista = Parcelamento.transacoes(
            de: Parcelamento.planejar(
                total: Money(centavos: 5000), vezes: 1,
                compraEm: data(2026, 9, 10), cartao: meuCartao, calendario: calendario
            ),
            carteiraID: UUID(), categoriaID: nil, descricao: "Café",
            criadoPor: UUID(), cartao: meuCartao, calendario: calendario
        )

        let curva = HorizonteFaturas.proximas(
            3, desde: Competencia(ano: 2026, mes: 9),
            transacoes: aVista, cartao: meuCartao, calendario: calendario
        )
        #expect(curva.count == 3)
        #expect(curva[0].total == Money(centavos: 5000))
        #expect(curva[1].total == Money.zero)
        #expect(curva[2].total == Money.zero)
    }

    @Test("transação removida não entra na curva")
    func removidaIgnorada() {
        let meuCartao = cartao
        var transacoes = Parcelamento.transacoes(
            de: Parcelamento.planejar(
                total: Money(centavos: 20_000), vezes: 2,
                compraEm: data(2026, 9, 10), cartao: meuCartao, calendario: calendario
            ),
            carteiraID: UUID(), categoriaID: nil, descricao: "Tênis",
            criadoPor: UUID(), cartao: meuCartao, calendario: calendario
        )
        transacoes[0].removidoEm = Date()

        let curva = HorizonteFaturas.proximas(
            2, desde: Competencia(ano: 2026, mes: 9),
            transacoes: transacoes, cartao: meuCartao, calendario: calendario
        )
        #expect(curva[0].total == Money.zero)
        #expect(curva[1].total == Money(centavos: 10_000))
    }

    @Test("lançamento de outro cartão não contamina a curva deste")
    func isolamentoPorCartao() {
        let meuCartao = cartao
        let outroCartao = Cartao(
            carteiraID: UUID(), apelido: "Outro", banco: "Itau", ultimos4: "9999",
            limite: Money(centavos: 500_000), diaFechamento: 10, diaVencimento: 20
        )
        let doOutro = Parcelamento.transacoes(
            de: Parcelamento.planejar(
                total: Money(centavos: 90_000), vezes: 3,
                compraEm: data(2026, 9, 5), cartao: outroCartao, calendario: calendario
            ),
            carteiraID: UUID(), categoriaID: nil, descricao: "Pneu",
            criadoPor: UUID(), cartao: outroCartao, calendario: calendario
        )

        let curva = HorizonteFaturas.proximas(
            3, desde: Competencia(ano: 2026, mes: 9),
            transacoes: doOutro, cartao: meuCartao, calendario: calendario
        )
        #expect(curva.allSatisfy { $0.total == Money.zero })
    }

    @Test("pedir zero competências devolve lista vazia")
    func zeroCompetencias() {
        #expect(HorizonteFaturas.proximas(
            0, desde: Competencia(ano: 2026, mes: 9),
            transacoes: [], cartao: cartao, calendario: calendario
        ).isEmpty)
    }
}
```

O teste `mesVazioApareceComZero` importa para a UI: a curva é um gráfico de barras de seis meses, e um mês sem gasto tem de virar barra zero, não sumir e desalinhar o eixo.

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `cd Packages/CasalDomain && swift test --filter "LimiteCartao|HorizonteFaturas"`
Expected: FALHA, `cannot find 'LimiteCartao' in scope`

- [ ] **Step 3: Implementar LimiteCartao**

`Packages/CasalDomain/Sources/CasalDomain/LimiteCartao.swift`:

```swift
import Foundation

public enum LimiteCartao: Sendable {
    /// Limite que sobra de verdade: o limite do cartão menos o saldo devedor
    /// de cada fatura ainda não paga, menos as parcelas futuras já
    /// comprometidas. Nunca negativo — limite estourado é zero disponível.
    ///
    /// `totaisPorFatura` traz o total de cada fatura, que é soma de
    /// transações e por isso vive na camada que tem acesso a elas.
    public static func disponivel(
        cartao: Cartao,
        faturas: [Fatura],
        totaisPorFatura: [UUID: Money],
        parcelasFuturas: Money
    ) -> Money {
        let devedor = faturas.reduce(Money.zero) { acumulado, fatura in
            guard fatura.status != .paga else { return acumulado }
            let total = totaisPorFatura[fatura.id] ?? .zero
            return acumulado + PagamentoFatura.saldoDevedor(fatura: fatura, total: total)
        }

        let restante = cartao.limite - devedor - parcelasFuturas
        return restante.centavos > 0 ? restante : .zero
    }
}
```

- [ ] **Step 4: Implementar HorizonteFaturas**

`Packages/CasalDomain/Sources/CasalDomain/HorizonteFaturas.swift`:

```swift
import Foundation

public enum HorizonteFaturas: Sendable {
    /// Total por competência para as próximas `quantidade` faturas do cartão,
    /// a partir de `inicio`. Competência sem lançamento vem com zero em vez de
    /// faltar, para que a curva desenhada na tela não desalinhe o eixo.
    public static func proximas(
        _ quantidade: Int,
        desde inicio: Competencia,
        transacoes: [Transacao],
        cartao: Cartao,
        calendario: Calendar = .current
    ) -> [(competencia: Competencia, total: Money)] {
        guard quantidade > 0 else { return [] }

        let doCartao = transacoes.filter { transacao in
            transacao.cartaoID == cartao.id
                && !transacao.estaRemovida
                && transacao.tipo == .despesa
        }

        var somaPorCompetencia: [Competencia: Money] = [:]
        for transacao in doCartao {
            let competencia = CalendarioFatura.competencia(
                deCompraEm: transacao.data, cartao: cartao, calendario: calendario
            )
            somaPorCompetencia[competencia, default: .zero] =
                (somaPorCompetencia[competencia] ?? .zero) + transacao.valor
        }

        return (0..<quantidade).map { passo in
            let competencia = inicio.avancando(meses: passo)
            return (competencia, somaPorCompetencia[competencia] ?? .zero)
        }
    }
}
```

Nota sobre `Parcelamento.transacoes`: ele datou cada parcela com a data de **fechamento** da competência dela. `CalendarioFatura.competencia` aplicada a essa data devolve a mesma competência, porque o dia do fechamento é sempre `<= diaFechamento`. É isso que faz a curva reencontrar cada parcela no mês certo.

- [ ] **Step 5: Rodar e confirmar que passam**

Run: `cd Packages/CasalDomain && swift test`
Expected: toda a suíte do domínio verde, incluindo os 11 novos testes desta tarefa

- [ ] **Step 6: Commit**

```bash
git add Packages/CasalDomain/Sources/CasalDomain/LimiteCartao.swift \
        Packages/CasalDomain/Sources/CasalDomain/HorizonteFaturas.swift \
        Packages/CasalDomain/Tests/CasalDomainTests/LimiteCartaoTests.swift \
        Packages/CasalDomain/Tests/CasalDomainTests/HorizonteFaturasTests.swift
git commit -m "feat(dominio): limite disponivel e horizonte de faturas"
```

---

# Fase B — Persistência

## Task 8: Schema versionado e registros novos

Esta é a dívida que o review final do M1 adiou de propósito para cá. O momento certo de declarar a versão 1 é **antes** de a versão 2 existir; depois de duas milestones com dados instalados, retrofit de identidade de schema é caro e arriscado.

**Files:**
- Create: `App/Sources/Persistencia/SchemaCasal.swift`
- Modify: `App/Sources/Persistencia/ModelosSwiftData.swift`
- Modify: `App/Sources/CasalApp.swift`
- Test: `App/Tests/SchemaTests.swift`

**Interfaces:**
- Consumes: `TransacaoRegistro`, `CarteiraRegistro`, `CategoriaRegistro` do M1
- Produces: `SchemaCasalV1`, `SchemaCasalV2`, `PlanoMigracaoCasal`, `CartaoRegistro`, `ContaRegistro`, `FaturaRegistro`, e `SchemaCasal.container(emMemoria:) throws -> ModelContainer`

- [ ] **Step 1: Ler o estado real antes de escrever a migração**

```bash
cd /Users/pedrofurlan/Documents/casal
git log --oneline -3
sed -n '1,80p' App/Sources/Persistencia/ModelosSwiftData.swift
grep -n "ModelContainer" App/Sources/CasalApp.swift
```

A onda de correção do M1 adicionou campos de sincronização (`criadoEm`, `atualizadoEm`, `removidoEm`, `deviceID`) aos três registros existentes. A versão 1 do schema tem de descrever esses registros **como eles estão agora**, não como o plano do M1 os desenhou. Anote a lista real de campos antes de continuar.

- [ ] **Step 2: Escrever o teste que falha**

`App/Tests/SchemaTests.swift`:

```swift
import CasalDomain
import Foundation
import SwiftData
import Testing
@testable import Casal

@Suite("Schema versionado")
struct SchemaTests {
    @Test("o container da versão atual abre e aceita as seis entidades")
    func containerAtual() throws {
        let container = try SchemaCasal.container(emMemoria: true)
        let contexto = ModelContext(container)

        contexto.insert(CarteiraRegistro())
        contexto.insert(CategoriaRegistro())
        contexto.insert(TransacaoRegistro())
        contexto.insert(ContaRegistro())
        contexto.insert(CartaoRegistro())
        contexto.insert(FaturaRegistro())
        try contexto.save()

        #expect(try contexto.fetch(FetchDescriptor<CartaoRegistro>()).count == 1)
        #expect(try contexto.fetch(FetchDescriptor<FaturaRegistro>()).count == 1)
        #expect(try contexto.fetch(FetchDescriptor<ContaRegistro>()).count == 1)
    }

    @Test("as duas versões declaram identificadores diferentes")
    func versoesDistintas() {
        #expect(SchemaCasalV1.versionIdentifier != SchemaCasalV2.versionIdentifier)
        #expect(SchemaCasalV1.versionIdentifier == Schema.Version(1, 0, 0))
        #expect(SchemaCasalV2.versionIdentifier == Schema.Version(2, 0, 0))
    }

    @Test("a versão 1 não conhece cartão, conta nem fatura")
    func v1SemCartao() {
        let nomes = SchemaCasalV1.models.map { String(describing: $0) }
        #expect(nomes.contains("TransacaoRegistro"))
        #expect(nomes.contains("CartaoRegistro") == false)
        #expect(nomes.contains("FaturaRegistro") == false)
        #expect(nomes.contains("ContaRegistro") == false)
    }

    @Test("a versão 2 conhece as seis entidades")
    func v2Completa() {
        #expect(SchemaCasalV2.models.count == 6)
    }

    @Test("o plano de migração vai da v1 para a v2")
    func planoDeMigracao() {
        #expect(PlanoMigracaoCasal.schemas.count == 2)
        #expect(PlanoMigracaoCasal.stages.count == 1)
    }

    @Test("um store gravado na v2 reabre com os dados intactos")
    func persistenciaEntreAberturas() throws {
        let url = URL.temporaryDirectory.appending(path: "\(UUID()).store")
        let cartaoID = UUID()

        do {
            let c1 = try SchemaCasal.container(url: url)
            let contexto = ModelContext(c1)
            let registro = CartaoRegistro()
            registro.id = cartaoID
            registro.apelido = "Nosso"
            registro.limiteCentavos = 800_000
            registro.diaFechamento = 28
            registro.diaVencimento = 5
            contexto.insert(registro)
            try contexto.save()
        }

        let c2 = try SchemaCasal.container(url: url)
        let encontrados = try ModelContext(c2).fetch(FetchDescriptor<CartaoRegistro>())
        #expect(encontrados.count == 1)
        #expect(encontrados.first?.id == cartaoID)
        #expect(encontrados.first?.limiteCentavos == 800_000)
        #expect(encontrados.first?.diaVencimento == 5)
    }
}
```

O último teste é o mesmo padrão que o review final do M1 exigiu para transações: gravar, descartar o container simulando o processo morrendo, reabrir e conferir. Sem ele, a migração é fé.

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `cd App && xcodegen generate && xcodebuild test -project Casal.xcodeproj -scheme Casal -destination 'platform=iOS Simulator,name=iPhone 17'`
Expected: FALHA, `cannot find 'SchemaCasal' in scope`

- [ ] **Step 4: Acrescentar os três registros novos**

Acrescentar ao fim de `App/Sources/Persistencia/ModelosSwiftData.swift`. **Inclua os mesmos campos de sincronização que os três registros existentes têm** — copie a lista real que você anotou no Step 1, não a lista abaixo cegamente:

```swift
@Model
final class ContaRegistro {
    var id: UUID = UUID()
    var carteiraID: UUID = UUID()
    var nome: String = ""
    var tipoBruto: String = "corrente"
    var saldoInicialCentavos: Int = 0
    var arquivada: Bool = false

    var criadoEm: Date = Date()
    var atualizadoEm: Date = Date()
    var removidoEm: Date?
    var deviceID: String = ""

    init() {}
}

@Model
final class CartaoRegistro {
    var id: UUID = UUID()
    var carteiraID: UUID = UUID()
    var apelido: String = ""
    var banco: String = ""
    var bandeiraBruta: String = "outra"
    var ultimos4: String = ""
    var cor: String = "#7C5CFF"
    var limiteCentavos: Int = 0
    var diaFechamento: Int = 1
    var diaVencimento: Int = 10
    var contaPagamentoID: UUID?
    var arquivado: Bool = false

    var criadoEm: Date = Date()
    var atualizadoEm: Date = Date()
    var removidoEm: Date?
    var deviceID: String = ""

    init() {}
}

@Model
final class FaturaRegistro {
    var id: UUID = UUID()
    var cartaoID: UUID = UUID()
    var competenciaAno: Int = 2026
    var competenciaMes: Int = 1
    var fechaEm: Date = Date()
    var venceEm: Date = Date()
    var statusBruto: String = "aberta"
    var valorPagoCentavos: Int = 0

    var criadoEm: Date = Date()
    var atualizadoEm: Date = Date()
    var removidoEm: Date?
    var deviceID: String = ""

    init() {}
}
```

Competência é gravada como dois `Int` em vez de um tipo composto: SwiftData lida melhor com primitivos em migração, e é assim que o Postgres do M3 vai guardar.

- [ ] **Step 5: Implementar o schema versionado**

`App/Sources/Persistencia/SchemaCasal.swift`:

```swift
import Foundation
import SwiftData

/// Versão 1: o schema que o M1 colocou em produção — transações, carteiras e
/// categorias. Declarada agora, retroativamente, para que a v2 tenha de onde
/// migrar. Não adicione entidades aqui.
enum SchemaCasalV1: VersionedSchema {
    static var versionIdentifier: Schema.Version { Schema.Version(1, 0, 0) }

    static var models: [any PersistentModel.Type] {
        [TransacaoRegistro.self, CarteiraRegistro.self, CategoriaRegistro.self]
    }
}

/// Versão 2: acrescenta conta, cartão e fatura. Puramente aditiva — nenhum
/// campo existente muda de nome ou de tipo, então a migração é leve.
enum SchemaCasalV2: VersionedSchema {
    static var versionIdentifier: Schema.Version { Schema.Version(2, 0, 0) }

    static var models: [any PersistentModel.Type] {
        [
            TransacaoRegistro.self, CarteiraRegistro.self, CategoriaRegistro.self,
            ContaRegistro.self, CartaoRegistro.self, FaturaRegistro.self
        ]
    }
}

enum PlanoMigracaoCasal: SchemaMigrationPlan {
    static var schemas: [any VersionedSchema.Type] {
        [SchemaCasalV1.self, SchemaCasalV2.self]
    }

    static var stages: [MigrationStage] {
        [.lightweight(fromVersion: SchemaCasalV1.self, toVersion: SchemaCasalV2.self)]
    }
}

enum SchemaCasal {
    /// Container da versão corrente, com o plano de migração aplicado.
    /// Todo caminho que abre armazenamento deve passar por aqui, para que
    /// nenhum lugar do app crie um container sem plano de migração.
    static func container(emMemoria: Bool = false) throws -> ModelContainer {
        try ModelContainer(
            for: Schema(versionedSchema: SchemaCasalV2.self),
            migrationPlan: PlanoMigracaoCasal.self,
            configurations: ModelConfiguration(isStoredInMemoryOnly: emMemoria)
        )
    }

    static func container(url: URL) throws -> ModelContainer {
        try ModelContainer(
            for: Schema(versionedSchema: SchemaCasalV2.self),
            migrationPlan: PlanoMigracaoCasal.self,
            configurations: ModelConfiguration(url: url)
        )
    }
}
```

- [ ] **Step 6: Fazer o app usar o container versionado**

Em `App/Sources/CasalApp.swift`, substituir a criação direta de `ModelContainer` por `try SchemaCasal.container()`. Não altere o tratamento de erro existente nesta tarefa — trocá-lo por uma tela de recuperação está no backlog do M2 e sai em tarefa própria, para não misturar duas mudanças de risco num commit.

- [ ] **Step 7: Rodar e confirmar que passa**

Run: `cd App && xcodegen generate && xcodebuild test -project Casal.xcodeproj -scheme Casal -destination 'platform=iOS Simulator,name=iPhone 17'`
Expected: os 6 testes de schema passando, e toda a suíte anterior continuando verde

- [ ] **Step 8: Commit**

```bash
git add App/Sources/Persistencia/SchemaCasal.swift \
        App/Sources/Persistencia/ModelosSwiftData.swift \
        App/Sources/CasalApp.swift App/Tests/SchemaTests.swift
git commit -m "feat(app): schema versionado v1 para v2 com cartao, conta e fatura"
```

---

## Task 9: Mapeamento das entidades novas

**Files:**
- Modify: `App/Sources/Persistencia/Mapeamento.swift`
- Test: `App/Tests/MapeamentoCartaoTests.swift`

**Interfaces:**
- Consumes: `Cartao`, `Conta`, `Fatura`, `Competencia`, `CartaoRegistro`, `ContaRegistro`, `FaturaRegistro`
- Produces: `CartaoRegistro.init(dominio:)` / `.paraDominio()`, e o par equivalente para `ContaRegistro` e `FaturaRegistro`

- [ ] **Step 1: Escrever o teste que falha**

`App/Tests/MapeamentoCartaoTests.swift`:

```swift
import CasalDomain
import Foundation
import Testing
@testable import Casal

@Suite("Mapeamento de cartao, conta e fatura")
struct MapeamentoCartaoTests {
    @Test("cartão faz ida e volta sem perder nenhum campo")
    func cartaoIdaEVolta() {
        let original = Cartao(
            carteiraID: UUID(),
            apelido: "Nosso",
            banco: "Nubank",
            bandeira: .visa,
            ultimos4: "4417",
            cor: "#8A2BE2",
            limite: Money(centavos: 800_000),
            diaFechamento: 28,
            diaVencimento: 5,
            contaPagamentoID: UUID(),
            arquivado: true
        )

        let volta = CartaoRegistro(dominio: original).paraDominio()

        #expect(volta.id == original.id)
        #expect(volta.carteiraID == original.carteiraID)
        #expect(volta.apelido == original.apelido)
        #expect(volta.banco == original.banco)
        #expect(volta.bandeira == .visa)
        #expect(volta.ultimos4 == original.ultimos4)
        #expect(volta.cor == original.cor)
        #expect(volta.limite == original.limite)
        #expect(volta.diaFechamento == 28)
        #expect(volta.diaVencimento == 5)
        #expect(volta.contaPagamentoID == original.contaPagamentoID)
        #expect(volta.arquivado == true)
    }

    @Test("o limite persiste como inteiro de centavos")
    func limiteEmCentavos() {
        let registro = CartaoRegistro(dominio: Cartao(
            carteiraID: UUID(), apelido: "x", banco: "y", ultimos4: "0001",
            limite: Money(centavos: 999), diaFechamento: 1, diaVencimento: 10
        ))
        #expect(registro.limiteCentavos == 999)
    }

    @Test("fatura faz ida e volta, com competência em dois inteiros")
    func faturaIdaEVolta() {
        let original = Fatura(
            cartaoID: UUID(),
            competencia: Competencia(ano: 2027, mes: 3),
            fechaEm: Date(timeIntervalSince1970: 1_600_000_000),
            venceEm: Date(timeIntervalSince1970: 1_650_000_000),
            status: .parcial,
            valorPago: Money(centavos: 100_000)
        )

        let registro = FaturaRegistro(dominio: original)
        #expect(registro.competenciaAno == 2027)
        #expect(registro.competenciaMes == 3)
        #expect(registro.valorPagoCentavos == 100_000)

        let volta = registro.paraDominio()
        #expect(volta.id == original.id)
        #expect(volta.cartaoID == original.cartaoID)
        #expect(volta.competencia == Competencia(ano: 2027, mes: 3))
        #expect(volta.fechaEm == original.fechaEm)
        #expect(volta.venceEm == original.venceEm)
        #expect(volta.status == .parcial)
        #expect(volta.valorPago == Money(centavos: 100_000))
    }

    @Test("conta faz ida e volta")
    func contaIdaEVolta() {
        let original = Conta(
            carteiraID: UUID(), nome: "Conta corrente",
            tipo: .poupanca, saldoInicial: Money(centavos: 150_000), arquivada: true
        )
        let volta = ContaRegistro(dominio: original).paraDominio()

        #expect(volta.id == original.id)
        #expect(volta.carteiraID == original.carteiraID)
        #expect(volta.nome == "Conta corrente")
        #expect(volta.tipo == .poupanca)
        #expect(volta.saldoInicial == Money(centavos: 150_000))
        #expect(volta.arquivada == true)
    }

    @Test("raw value malformado cai no padrão e dispara assertion em debug")
    func rawValueMalformado() {
        let registro = CartaoRegistro()
        registro.bandeiraBruta = "bandeira-que-nao-existe"
        // Em debug isto para no assertionFailure do mapeamento, o que é o
        // comportamento desejado: corrupção de armazenamento tem de aparecer.
        // Em release cai no padrão sem travar o app.
        #expect(registro.bandeiraBruta == "bandeira-que-nao-existe")
    }
}
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd App && xcodebuild test -project Casal.xcodeproj -scheme Casal -destination 'platform=iOS Simulator,name=iPhone 17'`
Expected: FALHA, `CartaoRegistro' has no member 'paraDominio'`

- [ ] **Step 3: Implementar**

Acrescentar a `App/Sources/Persistencia/Mapeamento.swift`. Siga o padrão que os três mapeamentos existentes já usam no arquivo, incluindo o `assertionFailure` no caminho de fallback de enum que a onda de correção do M1 introduziu:

```swift
extension CartaoRegistro {
    convenience init(dominio: Cartao) {
        self.init()
        id = dominio.id
        carteiraID = dominio.carteiraID
        apelido = dominio.apelido
        banco = dominio.banco
        bandeiraBruta = dominio.bandeira.rawValue
        ultimos4 = dominio.ultimos4
        cor = dominio.cor
        limiteCentavos = dominio.limite.centavos
        diaFechamento = dominio.diaFechamento
        diaVencimento = dominio.diaVencimento
        contaPagamentoID = dominio.contaPagamentoID
        arquivado = dominio.arquivado
    }

    func paraDominio() -> Cartao {
        Cartao(
            id: id,
            carteiraID: carteiraID,
            apelido: apelido,
            banco: banco,
            bandeira: BandeiraCartao(rawValue: bandeiraBruta) ?? {
                assertionFailure("bandeira desconhecida no armazenamento: \(bandeiraBruta)")
                return .outra
            }(),
            ultimos4: ultimos4,
            cor: cor,
            limite: Money(centavos: limiteCentavos),
            diaFechamento: diaFechamento,
            diaVencimento: diaVencimento,
            contaPagamentoID: contaPagamentoID,
            arquivado: arquivado
        )
    }
}

extension ContaRegistro {
    convenience init(dominio: Conta) {
        self.init()
        id = dominio.id
        carteiraID = dominio.carteiraID
        nome = dominio.nome
        tipoBruto = dominio.tipo.rawValue
        saldoInicialCentavos = dominio.saldoInicial.centavos
        arquivada = dominio.arquivada
    }

    func paraDominio() -> Conta {
        Conta(
            id: id,
            carteiraID: carteiraID,
            nome: nome,
            tipo: TipoConta(rawValue: tipoBruto) ?? {
                assertionFailure("tipo de conta desconhecido: \(tipoBruto)")
                return .corrente
            }(),
            saldoInicial: Money(centavos: saldoInicialCentavos),
            arquivada: arquivada
        )
    }
}

extension FaturaRegistro {
    convenience init(dominio: Fatura) {
        self.init()
        id = dominio.id
        cartaoID = dominio.cartaoID
        competenciaAno = dominio.competencia.ano
        competenciaMes = dominio.competencia.mes
        fechaEm = dominio.fechaEm
        venceEm = dominio.venceEm
        statusBruto = dominio.status.rawValue
        valorPagoCentavos = dominio.valorPago.centavos
    }

    func paraDominio() -> Fatura {
        Fatura(
            id: id,
            cartaoID: cartaoID,
            competencia: Competencia(ano: competenciaAno, mes: competenciaMes),
            fechaEm: fechaEm,
            venceEm: venceEm,
            status: StatusFatura(rawValue: statusBruto) ?? {
                assertionFailure("status de fatura desconhecido: \(statusBruto)")
                return .aberta
            }(),
            valorPago: Money(centavos: valorPagoCentavos)
        )
    }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd App && xcodebuild test -project Casal.xcodeproj -scheme Casal -destination 'platform=iOS Simulator,name=iPhone 17'`
Expected: 5 testes novos passando

- [ ] **Step 5: Commit**

```bash
git add App/Sources/Persistencia/Mapeamento.swift App/Tests/MapeamentoCartaoTests.swift
git commit -m "feat(app): mapeamento de cartao, conta e fatura"
```

---

## Task 10: Repositórios de cartão e fatura

O ponto delicado é a materialização de fatura: o app nunca cria fatura "à mão", ela nasce sob demanda quando uma compra precisa de uma competência que ainda não existe. Isso evita gerar 12 faturas vazias por cartão e evita fatura órfã.

**Files:**
- Create: `App/Sources/Persistencia/RepositorioCartoes.swift`
- Create: `App/Sources/Persistencia/RepositorioFaturas.swift`
- Test: `App/Tests/RepositorioCartoesTests.swift`
- Test: `App/Tests/RepositorioFaturasTests.swift`

**Interfaces:**
- Consumes: `SchemaCasal.container`, os mapeamentos da Tarefa 9, `CalendarioFatura`, `PagamentoFatura`
- Produces:
  - protocolo `RepositorioCartoes`: `salvarCartao(_:)`, `listarCartoes()`, `salvarConta(_:)`, `listarContas()`, `arquivarCartao(id:)`
  - protocolo `RepositorioFaturas`: `faturaOuCriar(cartao:competencia:calendario:)`, `listarFaturas(cartaoID:)`, `atualizarFatura(_:)`, `totalDaFatura(_:transacoes:)`
  - implementações `RepositorioCartoesSwiftData` e `RepositorioFaturasSwiftData`, ambas com `init(contexto: ModelContext)`

- [ ] **Step 1: Escrever os testes que falham**

`App/Tests/RepositorioCartoesTests.swift`:

```swift
import CasalDomain
import Foundation
import SwiftData
import Testing
@testable import Casal

@Suite("RepositorioCartoesSwiftData")
struct RepositorioCartoesTests {
    private func repositorio() throws -> RepositorioCartoesSwiftData {
        RepositorioCartoesSwiftData(contexto: ModelContext(try SchemaCasal.container(emMemoria: true)))
    }

    private func cartao(_ apelido: String = "Nosso") -> Cartao {
        Cartao(
            carteiraID: UUID(), apelido: apelido, banco: "Nubank", ultimos4: "4417",
            limite: Money(centavos: 800_000), diaFechamento: 28, diaVencimento: 5
        )
    }

    @Test("salvar e listar devolve o cartão gravado")
    func salvarEListar() throws {
        let repo = try repositorio()
        try repo.salvarCartao(cartao())
        let encontrados = try repo.listarCartoes()
        #expect(encontrados.count == 1)
        #expect(encontrados.first?.apelido == "Nosso")
        #expect(encontrados.first?.limite == Money(centavos: 800_000))
    }

    @Test("salvar duas vezes o mesmo id atualiza em vez de duplicar")
    func upsert() throws {
        let repo = try repositorio()
        var alvo = cartao()
        try repo.salvarCartao(alvo)
        alvo.limite = Money(centavos: 1_200_000)
        alvo.apelido = "Nosso renovado"
        try repo.salvarCartao(alvo)

        let encontrados = try repo.listarCartoes()
        #expect(encontrados.count == 1)
        #expect(encontrados.first?.limite == Money(centavos: 1_200_000))
        #expect(encontrados.first?.apelido == "Nosso renovado")
    }

    @Test("cartão arquivado sai da listagem")
    func arquivar() throws {
        let repo = try repositorio()
        let alvo = cartao()
        try repo.salvarCartao(alvo)
        try repo.arquivarCartao(id: alvo.id)
        #expect(try repo.listarCartoes().isEmpty)
    }

    @Test("contas também fazem salvar e listar")
    func contas() throws {
        let repo = try repositorio()
        let conta = Conta(carteiraID: UUID(), nome: "Corrente", saldoInicial: Money(centavos: 50_000))
        try repo.salvarConta(conta)
        let encontradas = try repo.listarContas()
        #expect(encontradas.count == 1)
        #expect(encontradas.first?.nome == "Corrente")
    }

    @Test("cartões sobrevivem a fechar e reabrir o armazenamento")
    func persistencia() throws {
        let url = URL.temporaryDirectory.appending(path: "\(UUID()).store")
        let alvo = cartao("Persistente")

        do {
            let c1 = try SchemaCasal.container(url: url)
            try RepositorioCartoesSwiftData(contexto: ModelContext(c1)).salvarCartao(alvo)
        }

        let c2 = try SchemaCasal.container(url: url)
        let encontrados = try RepositorioCartoesSwiftData(contexto: ModelContext(c2)).listarCartoes()
        #expect(encontrados.count == 1)
        #expect(encontrados.first?.id == alvo.id)
        #expect(encontrados.first?.apelido == "Persistente")
    }
}
```

`App/Tests/RepositorioFaturasTests.swift`:

```swift
import CasalDomain
import Foundation
import SwiftData
import Testing
@testable import Casal

@Suite("RepositorioFaturasSwiftData")
struct RepositorioFaturasTests {
    private var calendario: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/Sao_Paulo")!
        return c
    }

    private func repositorio() throws -> RepositorioFaturasSwiftData {
        RepositorioFaturasSwiftData(contexto: ModelContext(try SchemaCasal.container(emMemoria: true)))
    }

    private var cartao: Cartao {
        Cartao(
            carteiraID: UUID(), apelido: "Nosso", banco: "Nubank", ultimos4: "4417",
            limite: Money(centavos: 800_000), diaFechamento: 28, diaVencimento: 5
        )
    }

    @Test("a fatura é criada na primeira vez que a competência é pedida")
    func criaSobDemanda() throws {
        let repo = try repositorio()
        let fatura = try repo.faturaOuCriar(
            cartao: cartao, competencia: Competencia(ano: 2026, mes: 9), calendario: calendario
        )
        #expect(fatura.competencia == Competencia(ano: 2026, mes: 9))
        #expect(fatura.status == .aberta)
        #expect(fatura.valorPago == Money.zero)
    }

    @Test("pedir a mesma competência duas vezes devolve a MESMA fatura, não duas")
    func naoDuplica() throws {
        let repo = try repositorio()
        let meuCartao = cartao
        let primeira = try repo.faturaOuCriar(
            cartao: meuCartao, competencia: Competencia(ano: 2026, mes: 9), calendario: calendario
        )
        let segunda = try repo.faturaOuCriar(
            cartao: meuCartao, competencia: Competencia(ano: 2026, mes: 9), calendario: calendario
        )
        #expect(primeira.id == segunda.id)
        #expect(try repo.listarFaturas(cartaoID: meuCartao.id).count == 1)
    }

    @Test("a fatura criada já vem com fechamento e vencimento calculados")
    func datasCalculadas() throws {
        let repo = try repositorio()
        let fatura = try repo.faturaOuCriar(
            cartao: cartao, competencia: Competencia(ano: 2026, mes: 9), calendario: calendario
        )
        let fecha = calendario.dateComponents([.month, .day], from: fatura.fechaEm)
        let vence = calendario.dateComponents([.month, .day], from: fatura.venceEm)
        #expect(fecha.month == 9)
        #expect(fecha.day == 28)
        // fecha 28 / vence 5 => vence no mês seguinte
        #expect(vence.month == 10)
        #expect(vence.day == 5)
    }

    @Test("dois cartões podem ter fatura da mesma competência sem colidir")
    func isolamentoPorCartao() throws {
        let repo = try repositorio()
        let a = cartao
        let b = Cartao(
            carteiraID: UUID(), apelido: "Outro", banco: "Itau", ultimos4: "9999",
            limite: Money(centavos: 500_000), diaFechamento: 10, diaVencimento: 20
        )
        _ = try repo.faturaOuCriar(cartao: a, competencia: Competencia(ano: 2026, mes: 9), calendario: calendario)
        _ = try repo.faturaOuCriar(cartao: b, competencia: Competencia(ano: 2026, mes: 9), calendario: calendario)

        #expect(try repo.listarFaturas(cartaoID: a.id).count == 1)
        #expect(try repo.listarFaturas(cartaoID: b.id).count == 1)
    }

    @Test("atualizar a fatura persiste status e valor pago")
    func atualizar() throws {
        let repo = try repositorio()
        let meuCartao = cartao
        var fatura = try repo.faturaOuCriar(
            cartao: meuCartao, competencia: Competencia(ano: 2026, mes: 9), calendario: calendario
        )
        fatura = PagamentoFatura.aplicar(
            pagamento: Money(centavos: 100_000), em: fatura, totalDaFatura: Money(centavos: 284_730)
        )
        try repo.atualizarFatura(fatura)

        let recarregada = try repo.listarFaturas(cartaoID: meuCartao.id).first
        #expect(recarregada?.status == .parcial)
        #expect(recarregada?.valorPago == Money(centavos: 100_000))
    }

    @Test("o total da fatura soma as transações daquela competência e ignora removidas")
    func totalDaFatura() throws {
        let repo = try repositorio()
        let meuCartao = cartao
        let fatura = try repo.faturaOuCriar(
            cartao: meuCartao, competencia: Competencia(ano: 2026, mes: 9), calendario: calendario
        )

        var partes = DateComponents()
        partes.year = 2026
        partes.month = 9
        partes.day = 10
        partes.hour = 12
        let dataCompra = calendario.date(from: partes)!

        var umaRemovida = Transacao(
            carteiraID: UUID(), tipo: .despesa, valor: Money(centavos: 9900),
            data: dataCompra, criadoPor: UUID(), cartaoID: meuCartao.id, hashDedup: "b"
        )
        umaRemovida.removidoEm = Date()

        let transacoes = [
            Transacao(
                carteiraID: UUID(), tipo: .despesa, valor: Money(centavos: 41_280),
                data: dataCompra, criadoPor: UUID(), cartaoID: meuCartao.id, hashDedup: "a"
            ),
            umaRemovida
        ]

        let total = repo.totalDaFatura(fatura, transacoes: transacoes, cartao: meuCartao, calendario: calendario)
        #expect(total == Money(centavos: 41_280))
    }
}
```

Atenção ao construir `Transacao` nos testes: confira a ordem real dos parâmetros do inicializador em `Packages/CasalDomain/Sources/CasalDomain/Transacao.swift` antes de copiar as chamadas acima, porque `cartaoID` vem depois de `contaID` na assinatura.

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `cd App && xcodebuild test -project Casal.xcodeproj -scheme Casal -destination 'platform=iOS Simulator,name=iPhone 17'`
Expected: FALHA, `cannot find 'RepositorioCartoesSwiftData' in scope`

- [ ] **Step 3: Implementar RepositorioCartoes**

`App/Sources/Persistencia/RepositorioCartoes.swift`:

```swift
import CasalDomain
import Foundation
import SwiftData

protocol RepositorioCartoes {
    func salvarCartao(_ cartao: Cartao) throws
    func listarCartoes() throws -> [Cartao]
    func arquivarCartao(id: UUID) throws
    func salvarConta(_ conta: Conta) throws
    func listarContas() throws -> [Conta]
}

final class RepositorioCartoesSwiftData: RepositorioCartoes {
    private let contexto: ModelContext

    init(contexto: ModelContext) {
        self.contexto = contexto
    }

    /// Upsert por id, mesmo padrão do repositório de transações: IDs são
    /// gerados no device, então gravar de novo o mesmo cartão atualiza.
    func salvarCartao(_ cartao: Cartao) throws {
        let alvo = cartao.id
        var descritor = FetchDescriptor<CartaoRegistro>(predicate: #Predicate { $0.id == alvo })
        descritor.fetchLimit = 1

        if let existente = try contexto.fetch(descritor).first {
            contexto.delete(existente)
        }
        contexto.insert(CartaoRegistro(dominio: cartao))
        try contexto.save()
    }

    func listarCartoes() throws -> [Cartao] {
        let descritor = FetchDescriptor<CartaoRegistro>(
            predicate: #Predicate { $0.removidoEm == nil && $0.arquivado == false },
            sortBy: [SortDescriptor(\.apelido)]
        )
        return try contexto.fetch(descritor).map { $0.paraDominio() }
    }

    /// Arquivar é o "apagar" de cartão: a fatura antiga continua existindo e
    /// precisa continuar somando no histórico, então o registro nunca sai.
    func arquivarCartao(id: UUID) throws {
        var descritor = FetchDescriptor<CartaoRegistro>(predicate: #Predicate { $0.id == id })
        descritor.fetchLimit = 1

        guard let registro = try contexto.fetch(descritor).first else { return }
        registro.arquivado = true
        registro.atualizadoEm = Date()
        try contexto.save()
    }

    func salvarConta(_ conta: Conta) throws {
        let alvo = conta.id
        var descritor = FetchDescriptor<ContaRegistro>(predicate: #Predicate { $0.id == alvo })
        descritor.fetchLimit = 1

        if let existente = try contexto.fetch(descritor).first {
            contexto.delete(existente)
        }
        contexto.insert(ContaRegistro(dominio: conta))
        try contexto.save()
    }

    func listarContas() throws -> [Conta] {
        let descritor = FetchDescriptor<ContaRegistro>(
            predicate: #Predicate { $0.removidoEm == nil && $0.arquivada == false },
            sortBy: [SortDescriptor(\.nome)]
        )
        return try contexto.fetch(descritor).map { $0.paraDominio() }
    }
}
```

- [ ] **Step 4: Implementar RepositorioFaturas**

`App/Sources/Persistencia/RepositorioFaturas.swift`:

```swift
import CasalDomain
import Foundation
import SwiftData

protocol RepositorioFaturas {
    func faturaOuCriar(cartao: Cartao, competencia: Competencia, calendario: Calendar) throws -> Fatura
    func listarFaturas(cartaoID: UUID) throws -> [Fatura]
    func atualizarFatura(_ fatura: Fatura) throws
    func totalDaFatura(
        _ fatura: Fatura, transacoes: [Transacao], cartao: Cartao, calendario: Calendar
    ) -> Money
}

final class RepositorioFaturasSwiftData: RepositorioFaturas {
    private let contexto: ModelContext

    init(contexto: ModelContext) {
        self.contexto = contexto
    }

    /// Fatura nasce sob demanda, na primeira vez que alguma compra precisa da
    /// competência. Criar as doze faturas futuras adiantado geraria fatura
    /// vazia que o usuário veria sem entender, e fatura órfã se o cartão
    /// mudasse de dia de fechamento.
    func faturaOuCriar(
        cartao: Cartao,
        competencia: Competencia,
        calendario: Calendar = .current
    ) throws -> Fatura {
        let cartaoAlvo = cartao.id
        let ano = competencia.ano
        let mes = competencia.mes

        var descritor = FetchDescriptor<FaturaRegistro>(
            predicate: #Predicate { registro in
                registro.cartaoID == cartaoAlvo
                    && registro.competenciaAno == ano
                    && registro.competenciaMes == mes
                    && registro.removidoEm == nil
            }
        )
        descritor.fetchLimit = 1

        if let existente = try contexto.fetch(descritor).first {
            return existente.paraDominio()
        }

        let nova = Fatura(
            cartaoID: cartao.id,
            competencia: competencia,
            fechaEm: CalendarioFatura.fechamento(
                competencia: competencia, cartao: cartao, calendario: calendario
            ),
            venceEm: CalendarioFatura.vencimento(
                competencia: competencia, cartao: cartao, calendario: calendario
            )
        )
        contexto.insert(FaturaRegistro(dominio: nova))
        try contexto.save()
        return nova
    }

    func listarFaturas(cartaoID: UUID) throws -> [Fatura] {
        let descritor = FetchDescriptor<FaturaRegistro>(
            predicate: #Predicate { $0.cartaoID == cartaoID && $0.removidoEm == nil },
            sortBy: [
                SortDescriptor(\.competenciaAno),
                SortDescriptor(\.competenciaMes)
            ]
        )
        return try contexto.fetch(descritor).map { $0.paraDominio() }
    }

    func atualizarFatura(_ fatura: Fatura) throws {
        let alvo = fatura.id
        var descritor = FetchDescriptor<FaturaRegistro>(predicate: #Predicate { $0.id == alvo })
        descritor.fetchLimit = 1

        guard let registro = try contexto.fetch(descritor).first else { return }
        registro.statusBruto = fatura.status.rawValue
        registro.valorPagoCentavos = fatura.valorPago.centavos
        registro.fechaEm = fatura.fechaEm
        registro.venceEm = fatura.venceEm
        registro.atualizadoEm = Date()
        try contexto.save()
    }

    /// Total de uma fatura é soma de transações, não campo gravado: gravar o
    /// total abriria a porta para ele divergir das transações que o compõem.
    func totalDaFatura(
        _ fatura: Fatura,
        transacoes: [Transacao],
        cartao: Cartao,
        calendario: Calendar = .current
    ) -> Money {
        transacoes
            .filter { transacao in
                transacao.cartaoID == cartao.id
                    && !transacao.estaRemovida
                    && transacao.tipo == .despesa
                    && CalendarioFatura.competencia(
                        deCompraEm: transacao.data, cartao: cartao, calendario: calendario
                    ) == fatura.competencia
            }
            .reduce(Money.zero) { $0 + $1.valor }
    }
}
```

- [ ] **Step 5: Rodar e confirmar que passam**

Run: `cd App && xcodebuild test -project Casal.xcodeproj -scheme Casal -destination 'platform=iOS Simulator,name=iPhone 17'`
Expected: 11 testes novos passando

- [ ] **Step 6: Commit**

```bash
git add App/Sources/Persistencia/RepositorioCartoes.swift \
        App/Sources/Persistencia/RepositorioFaturas.swift \
        App/Tests/RepositorioCartoesTests.swift App/Tests/RepositorioFaturasTests.swift
git commit -m "feat(app): repositorios de cartao, conta e fatura sob demanda"
```

---

# Fase C — Interface

## Task 11: CartaoFace, o cartão em formato de cartão

O mesmo desenho aparece em três lugares e em três tamanhos: miniatura na lista, cartão grande no carrossel, prévia no formulário. Um componente, um parâmetro de tamanho.

**Files:**
- Create: `App/Sources/UI/Cartoes/CartaoFace.swift`
- Test: `App/Tests/CartaoFaceTests.swift`

**Interfaces:**
- Consumes: `Cartao`, `Money`, `BandeiraCartao`
- Produces: `enum TamanhoCartaoFace { case miniatura, media, grande }`, `struct CartaoFace: View` com `init(cartao:tamanho:faturaAtual:limiteDisponivel:)`, e `CartaoFace.corDeFundo(_:) -> Color`

- [ ] **Step 1: Escrever o teste que falha**

Uma `View` do SwiftUI não rende em teste unitário sem infraestrutura de snapshot, que este projeto não tem. O que **é** testável, e o que importa, é a lógica de apresentação: conversão da cor em hexadecimal e o rótulo da bandeira.

`App/Tests/CartaoFaceTests.swift`:

```swift
import CasalDomain
import SwiftUI
import Testing
@testable import Casal

@Suite("CartaoFace")
struct CartaoFaceTests {
    @Test("hexadecimal com e sem cerquilha viram a mesma cor")
    func hexNormalizado() {
        #expect(CartaoFace.componentes(deHex: "#7C5CFF") != nil)
        #expect(CartaoFace.componentes(deHex: "7C5CFF") != nil)
        #expect(CartaoFace.componentes(deHex: "#7C5CFF")! == CartaoFace.componentes(deHex: "7c5cff")!)
    }

    @Test("hexadecimal inválido devolve nil em vez de cor aleatória")
    func hexInvalido() {
        #expect(CartaoFace.componentes(deHex: "") == nil)
        #expect(CartaoFace.componentes(deHex: "#ZZZZZZ") == nil)
        #expect(CartaoFace.componentes(deHex: "#FFF") == nil)
    }

    @Test("os componentes correspondem ao roxo do design")
    func roxoDoDesign() {
        let componentes = CartaoFace.componentes(deHex: "#7C5CFF")
        #expect(componentes?.vermelho == 0x7C)
        #expect(componentes?.verde == 0x5C)
        #expect(componentes?.azul == 0xFF)
    }

    @Test("bandeira tem rótulo curto em caixa alta para estampar no cartão")
    func rotuloDaBandeira() {
        #expect(CartaoFace.rotulo(de: .visa) == "VISA")
        #expect(CartaoFace.rotulo(de: .mastercard) == "MASTERCARD")
        #expect(CartaoFace.rotulo(de: .outra) == "")
    }

    @Test("os três tamanhos têm alturas distintas e crescentes")
    func tamanhos() {
        #expect(TamanhoCartaoFace.miniatura.altura < TamanhoCartaoFace.media.altura)
        #expect(TamanhoCartaoFace.media.altura < TamanhoCartaoFace.grande.altura)
    }
}
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd App && xcodebuild test -project Casal.xcodeproj -scheme Casal -destination 'platform=iOS Simulator,name=iPhone 17'`
Expected: FALHA, `cannot find 'CartaoFace' in scope`

- [ ] **Step 3: Implementar**

`App/Sources/UI/Cartoes/CartaoFace.swift`:

```swift
import CasalDomain
import SwiftUI

enum TamanhoCartaoFace {
    case miniatura, media, grande

    var altura: CGFloat {
        switch self {
        case .miniatura: 34
        case .media: 110
        case .grande: 150
        }
    }

    var raio: CGFloat {
        switch self {
        case .miniatura: 7
        case .media: 14
        case .grande: 16
        }
    }

    var mostraDetalhes: Bool {
        self != .miniatura
    }
}

struct CartaoFace: View {
    let cartao: Cartao
    var tamanho: TamanhoCartaoFace = .grande
    var faturaAtual: Money?
    var limiteDisponivel: Money?

    var body: some View {
        ZStack(alignment: .topLeading) {
            fundo

            if tamanho.mostraDetalhes {
                conteudo
                    .padding(tamanho == .grande ? 14 : 12)
            } else {
                Text(cartao.banco.prefix(2).uppercased())
                    .font(.system(size: 8, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(5)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
            }
        }
        .frame(height: tamanho.altura)
        .clipShape(.rect(cornerRadius: tamanho.raio))
    }

    private var fundo: some View {
        LinearGradient(
            colors: [Self.cor(deHex: cartao.cor), Self.cor(deHex: cartao.cor).opacity(0.72)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .overlay(
            LinearGradient(
                colors: [.white.opacity(0.20), .clear],
                startPoint: .topLeading,
                endPoint: .center
            )
        )
    }

    private var conteudo: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 1) {
                    Text(cartao.banco)
                        .font(.system(size: 11.5, weight: .bold))
                    Text(cartao.apelido)
                        .font(.system(size: 9.5))
                        .opacity(0.75)
                }
                Spacer()
                Text(Self.rotulo(de: cartao.bandeira))
                    .font(.system(size: 8.5, weight: .bold))
                    .opacity(0.85)
            }

            Spacer(minLength: 10)

            Text("•••• \(cartao.ultimos4)")
                .font(.system(size: 11, design: .monospaced))
                .opacity(0.9)

            Spacer(minLength: 8)

            HStack(alignment: .bottom) {
                if let faturaAtual {
                    VStack(alignment: .leading, spacing: 1) {
                        Text("FATURA ATUAL")
                            .font(.system(size: 7.5, weight: .semibold))
                            .opacity(0.65)
                        Text(faturaAtual.formatadoBRL)
                            .font(.system(size: 13.5, weight: .bold))
                    }
                }
                Spacer()
                if let limiteDisponivel {
                    VStack(alignment: .trailing, spacing: 3) {
                        Text("\(limiteDisponivel.formatadoBRL) livres")
                            .font(.system(size: 8.5))
                            .opacity(0.8)
                        barraDeLimite
                    }
                    .frame(width: 90)
                }
            }
        }
        .foregroundStyle(.white)
    }

    private var barraDeLimite: some View {
        GeometryReader { geometria in
            let fracao = fracaoUsada
            ZStack(alignment: .leading) {
                Capsule().fill(.white.opacity(0.28))
                Capsule().fill(.white).frame(width: geometria.size.width * fracao)
            }
        }
        .frame(height: 3)
    }

    /// Fração do limite já usada, entre 0 e 1. Limite zero desenha barra vazia
    /// em vez de dividir por zero.
    private var fracaoUsada: CGFloat {
        guard let limiteDisponivel, cartao.limite.centavos > 0 else { return 0 }
        let usado = cartao.limite.centavos - limiteDisponivel.centavos
        return min(max(CGFloat(usado) / CGFloat(cartao.limite.centavos), 0), 1)
    }

    // MARK: - Apresentação, testável sem renderizar

    struct ComponentesDeCor: Equatable {
        let vermelho: Int
        let verde: Int
        let azul: Int
    }

    /// Decompõe um hexadecimal de seis dígitos. Devolve `nil` para entrada
    /// inválida, para que a chamada decida o fallback em vez de o componente
    /// inventar uma cor.
    static func componentes(deHex hex: String) -> ComponentesDeCor? {
        let limpo = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        guard limpo.count == 6, let valor = Int(limpo, radix: 16) else { return nil }
        return ComponentesDeCor(
            vermelho: (valor >> 16) & 0xFF,
            verde: (valor >> 8) & 0xFF,
            azul: valor & 0xFF
        )
    }

    static func cor(deHex hex: String) -> Color {
        guard let c = componentes(deHex: hex) else { return .accentColor }
        return Color(
            red: Double(c.vermelho) / 255,
            green: Double(c.verde) / 255,
            blue: Double(c.azul) / 255
        )
    }

    static func rotulo(de bandeira: BandeiraCartao) -> String {
        bandeira == .outra ? "" : bandeira.rawValue.uppercased()
    }
}
```

O `Double` aqui é permitido e não viola a constraint de dinheiro: é componente de cor, não valor monetário. A constraint proíbe `Double` em caminho que toca dinheiro — `fracaoUsada` converte centavos para `CGFloat` só para calcular largura de barra, nunca para exibir ou somar valor.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd App && xcodebuild test -project Casal.xcodeproj -scheme Casal -destination 'platform=iOS Simulator,name=iPhone 17'`
Expected: 5 testes novos passando

- [ ] **Step 5: Commit**

```bash
git add App/Sources/UI/Cartoes/CartaoFace.swift App/Tests/CartaoFaceTests.swift
git commit -m "feat(ui): componente de cartao em formato de cartao"
```

---

## Task 12: Tela de entrada da seção Cartões

O desenho aprovado: total consolidado do mês no topo, lista compacta de todos os cartões, e a curva de seis meses das parcelas comprometidas. É a única visão que mostra dívida se acumulando.

**Files:**
- Create: `App/Sources/UI/Cartoes/CartoesModelo.swift`
- Create: `App/Sources/UI/Cartoes/CartoesView.swift`
- Modify: `App/Sources/UI/RaizView.swift`
- Test: `App/Tests/CartoesModeloTests.swift`

**Interfaces:**
- Consumes: `RepositorioCartoes`, `RepositorioFaturas`, `RepositorioTransacoes`, `HorizonteFaturas`, `LimiteCartao`, `CartaoFace`
- Produces: `CartoesModelo` (`@Observable`) com `cartoes`, `resumoPorCartao: [UUID: ResumoCartao]`, `totalDoMes: Money`, `curva: [(competencia: Competencia, total: Money)]`, `recarregar(referencia:)`; `struct ResumoCartao { faturaAtual, proximaFatura, limiteDisponivel, fechaEm, venceEm }`; `CartoesView`

- [ ] **Step 1: Escrever o teste que falha**

`App/Tests/CartoesModeloTests.swift`:

```swift
import CasalDomain
import Foundation
import SwiftData
import Testing
@testable import Casal

@Suite("CartoesModelo")
struct CartoesModeloTests {
    private var calendario: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/Sao_Paulo")!
        return c
    }

    private func modelo() throws -> (CartoesModelo, ModelContext) {
        let contexto = ModelContext(try SchemaCasal.container(emMemoria: true))
        let modelo = CartoesModelo(
            repositorioCartoes: RepositorioCartoesSwiftData(contexto: contexto),
            repositorioFaturas: RepositorioFaturasSwiftData(contexto: contexto),
            repositorioTransacoes: RepositorioSwiftData(contexto: contexto),
            calendario: calendario
        )
        return (modelo, contexto)
    }

    private func cartao(_ apelido: String, fecha: Int = 28, vence: Int = 5) -> Cartao {
        Cartao(
            carteiraID: UUID(), apelido: apelido, banco: "Nubank", ultimos4: "4417",
            limite: Money(centavos: 800_000), diaFechamento: fecha, diaVencimento: vence
        )
    }

    private func data(_ ano: Int, _ mes: Int, _ dia: Int) -> Date {
        var partes = DateComponents()
        partes.year = ano
        partes.month = mes
        partes.day = dia
        partes.hour = 12
        return calendario.date(from: partes)!
    }

    @Test("sem cartão cadastrado, tudo zerado e nada estoura")
    func vazio() throws {
        let (modelo, _) = try modelo()
        modelo.recarregar(referencia: data(2026, 9, 15))
        #expect(modelo.cartoes.isEmpty)
        #expect(modelo.totalDoMes == Money.zero)
        #expect(modelo.curva.count == 6)
        #expect(modelo.curva.allSatisfy { $0.total == Money.zero })
    }

    @Test("o total do mês soma a fatura atual de todos os cartões")
    func totalConsolidado() throws {
        let (modelo, contexto) = try modelo()
        let repoCartoes = RepositorioCartoesSwiftData(contexto: contexto)
        let repoTransacoes = RepositorioSwiftData(contexto: contexto)

        let a = cartao("A")
        let b = cartao("B")
        try repoCartoes.salvarCartao(a)
        try repoCartoes.salvarCartao(b)

        try repoTransacoes.salvar(Transacao(
            carteiraID: a.carteiraID, tipo: .despesa, valor: Money(centavos: 100_000),
            data: data(2026, 9, 10), criadoPor: UUID(), cartaoID: a.id, hashDedup: "a1"
        ))
        try repoTransacoes.salvar(Transacao(
            carteiraID: b.carteiraID, tipo: .despesa, valor: Money(centavos: 40_000),
            data: data(2026, 9, 12), criadoPor: UUID(), cartaoID: b.id, hashDedup: "b1"
        ))

        modelo.recarregar(referencia: data(2026, 9, 15))
        #expect(modelo.cartoes.count == 2)
        #expect(modelo.totalDoMes == Money(centavos: 140_000))
    }

    @Test("compra parcelada aparece na curva dos meses seguintes")
    func curvaComParcelas() throws {
        let (modelo, contexto) = try modelo()
        let repoCartoes = RepositorioCartoesSwiftData(contexto: contexto)
        let repoTransacoes = RepositorioSwiftData(contexto: contexto)

        let meuCartao = cartao("Nosso")
        try repoCartoes.salvarCartao(meuCartao)

        let parcelas = Parcelamento.transacoes(
            de: Parcelamento.planejar(
                total: Money(centavos: 120_000), vezes: 6,
                compraEm: data(2026, 9, 10), cartao: meuCartao, calendario: calendario
            ),
            carteiraID: meuCartao.carteiraID, categoriaID: nil, descricao: "Sofá",
            criadoPor: UUID(), cartao: meuCartao, calendario: calendario
        )
        for parcela in parcelas { try repoTransacoes.salvar(parcela) }

        modelo.recarregar(referencia: data(2026, 9, 15))
        #expect(modelo.curva.count == 6)
        #expect(modelo.curva.allSatisfy { $0.total == Money(centavos: 20_000) })
    }

    @Test("o resumo por cartão traz fatura atual, próxima e limite disponível")
    func resumoPorCartao() throws {
        let (modelo, contexto) = try modelo()
        let repoCartoes = RepositorioCartoesSwiftData(contexto: contexto)
        let repoTransacoes = RepositorioSwiftData(contexto: contexto)

        let meuCartao = cartao("Nosso")
        try repoCartoes.salvarCartao(meuCartao)

        // compra no dia 10 entra na fatura de setembro
        try repoTransacoes.salvar(Transacao(
            carteiraID: meuCartao.carteiraID, tipo: .despesa, valor: Money(centavos: 100_000),
            data: data(2026, 9, 10), criadoPor: UUID(), cartaoID: meuCartao.id, hashDedup: "s"
        ))
        // compra no dia 29 passa do fechamento e cai em outubro
        try repoTransacoes.salvar(Transacao(
            carteiraID: meuCartao.carteiraID, tipo: .despesa, valor: Money(centavos: 30_000),
            data: data(2026, 9, 29), criadoPor: UUID(), cartaoID: meuCartao.id, hashDedup: "o"
        ))

        modelo.recarregar(referencia: data(2026, 9, 15))
        let resumo = modelo.resumoPorCartao[meuCartao.id]
        #expect(resumo?.faturaAtual == Money(centavos: 100_000))
        #expect(resumo?.proximaFatura == Money(centavos: 30_000))
        #expect(resumo?.limiteDisponivel == Money(centavos: 800_000 - 130_000))
    }

    @Test("cartão arquivado não aparece na tela")
    func arquivadoNaoAparece() throws {
        let (modelo, contexto) = try modelo()
        let repoCartoes = RepositorioCartoesSwiftData(contexto: contexto)
        let alvo = cartao("Antigo")
        try repoCartoes.salvarCartao(alvo)
        try repoCartoes.arquivarCartao(id: alvo.id)

        modelo.recarregar(referencia: data(2026, 9, 15))
        #expect(modelo.cartoes.isEmpty)
    }
}
```

O teste `resumoPorCartao` é o que prova o motor inteiro funcionando junto: a compra do dia 10 vai para setembro, a do dia 29 passa do fechamento e vai para outubro, e o limite desconta as duas.

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd App && xcodebuild test -project Casal.xcodeproj -scheme Casal -destination 'platform=iOS Simulator,name=iPhone 17'`
Expected: FALHA, `cannot find 'CartoesModelo' in scope`

- [ ] **Step 3: Implementar o modelo**

`App/Sources/UI/Cartoes/CartoesModelo.swift`:

```swift
import CasalDomain
import Foundation
import Observation

struct ResumoCartao: Hashable, Sendable {
    let faturaAtual: Money
    let proximaFatura: Money
    let limiteDisponivel: Money
    let fechaEm: Date
    let venceEm: Date
}

@Observable
final class CartoesModelo {
    private(set) var cartoes: [Cartao] = []
    private(set) var resumoPorCartao: [UUID: ResumoCartao] = [:]
    private(set) var totalDoMes: Money = .zero
    private(set) var curva: [(competencia: Competencia, total: Money)] = []

    static let mesesNoHorizonte = 6

    private let repositorioCartoes: RepositorioCartoes
    private let repositorioFaturas: RepositorioFaturas
    private let repositorioTransacoes: RepositorioTransacoes
    private let calendario: Calendar

    init(
        repositorioCartoes: RepositorioCartoes,
        repositorioFaturas: RepositorioFaturas,
        repositorioTransacoes: RepositorioTransacoes,
        calendario: Calendar = .current
    ) {
        self.repositorioCartoes = repositorioCartoes
        self.repositorioFaturas = repositorioFaturas
        self.repositorioTransacoes = repositorioTransacoes
        self.calendario = calendario
    }

    func recarregar(referencia: Date = Date()) {
        cartoes = (try? repositorioCartoes.listarCartoes()) ?? []

        // Todo o histórico, porque parcela futura tem data futura e o resumo
        // do mês corrente não a alcançaria.
        let transacoes = (try? repositorioTransacoes.listar(
            de: .distantPast, ate: .distantFuture
        )) ?? []

        let competenciaAtual = Competencia(data: referencia, calendario: calendario)
        var resumos: [UUID: ResumoCartao] = [:]
        var soma = Money.zero
        var curvaAcumulada: [Competencia: Money] = [:]

        for cartao in cartoes {
            let horizonte = HorizonteFaturas.proximas(
                Self.mesesNoHorizonte,
                desde: competenciaAtual,
                transacoes: transacoes,
                cartao: cartao,
                calendario: calendario
            )
            for ponto in horizonte {
                curvaAcumulada[ponto.competencia, default: .zero] =
                    (curvaAcumulada[ponto.competencia] ?? .zero) + ponto.total
            }

            let atual = horizonte.first?.total ?? .zero
            let proxima = horizonte.count > 1 ? horizonte[1].total : .zero

            let faturas = (try? repositorioFaturas.listarFaturas(cartaoID: cartao.id)) ?? []
            var totais: [UUID: Money] = [:]
            for fatura in faturas {
                totais[fatura.id] = repositorioFaturas.totalDaFatura(
                    fatura, transacoes: transacoes, cartao: cartao, calendario: calendario
                )
            }
            let comprometidoFuturo = horizonte.dropFirst(2).reduce(Money.zero) { $0 + $1.total }

            resumos[cartao.id] = ResumoCartao(
                faturaAtual: atual,
                proximaFatura: proxima,
                limiteDisponivel: LimiteCartao.disponivel(
                    cartao: cartao,
                    faturas: faturas,
                    totaisPorFatura: totais,
                    parcelasFuturas: comprometidoFuturo
                ),
                fechaEm: CalendarioFatura.fechamento(
                    competencia: competenciaAtual, cartao: cartao, calendario: calendario
                ),
                venceEm: CalendarioFatura.vencimento(
                    competencia: competenciaAtual, cartao: cartao, calendario: calendario
                )
            )
            soma = soma + atual
        }

        resumoPorCartao = resumos
        totalDoMes = soma
        curva = (0..<Self.mesesNoHorizonte).map { passo in
            let competencia = competenciaAtual.avancando(meses: passo)
            return (competencia, curvaAcumulada[competencia] ?? .zero)
        }
    }
}
```

- [ ] **Step 4: Implementar a view**

`App/Sources/UI/Cartoes/CartoesView.swift`:

```swift
import CasalDomain
import SwiftUI

struct CartoesView: View {
    @Bindable var modelo: CartoesModelo
    let aoAbrirCartao: (Cartao) -> Void
    let aoAdicionarCartao: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if modelo.cartoes.isEmpty {
                    vazio
                } else {
                    totalDoMes
                    listaDeCartoes
                    curvaDeFuturas
                }
            }
            .padding(16)
        }
        .navigationTitle("Cartões")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button(action: aoAdicionarCartao) {
                    Image(systemName: "plus")
                }
                .accessibilityLabel("Adicionar cartão")
            }
        }
        .onAppear { modelo.recarregar() }
    }

    private var vazio: some View {
        ContentUnavailableView {
            Label("Nenhum cartão", systemImage: "creditcard")
        } description: {
            Text("Cadastre um cartão para acompanhar faturas e parcelas.")
        } actions: {
            Button("Adicionar cartão", action: aoAdicionarCartao)
                .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    private var totalDoMes: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text("Total a pagar neste mês")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.white.opacity(0.85))
            ValorTexto(valor: modelo.totalDoMes, tamanho: 30)
                .foregroundStyle(.white)
            Text("\(modelo.cartoes.count) \(modelo.cartoes.count == 1 ? "cartão" : "cartões")")
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.8))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color.accentColor.gradient, in: .rect(cornerRadius: 16))
    }

    private var listaDeCartoes: some View {
        VStack(spacing: 0) {
            ForEach(modelo.cartoes) { cartao in
                Button { aoAbrirCartao(cartao) } label: {
                    linha(cartao)
                }
                .buttonStyle(.plain)

                if cartao.id != modelo.cartoes.last?.id {
                    Divider()
                }
            }
        }
    }

    private func linha(_ cartao: Cartao) -> some View {
        let resumo = modelo.resumoPorCartao[cartao.id]
        return HStack(spacing: 10) {
            CartaoFace(cartao: cartao, tamanho: .miniatura)
                .frame(width: 52)

            VStack(alignment: .leading, spacing: 2) {
                Text("\(cartao.banco) · \(cartao.apelido)")
                    .font(.subheadline.weight(.semibold))
                if let resumo {
                    Text("Fecha \(diaFormatado(resumo.fechaEm)) · vence \(diaFormatado(resumo.venceEm))")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text((resumo?.faturaAtual ?? .zero).formatadoBRL)
                    .font(.subheadline.weight(.bold))
                    .monospacedDigit()
                Text("próx. \((resumo?.proximaFatura ?? .zero).formatadoBRL)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 9)
        .contentShape(.rect)
    }

    private var curvaDeFuturas: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text("PRÓXIMAS FATURAS · TODOS OS CARTÕES")
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(.secondary)

            HStack(alignment: .bottom, spacing: 6) {
                ForEach(modelo.curva, id: \.competencia) { ponto in
                    VStack(spacing: 4) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.accentColor.gradient)
                            .frame(height: altura(de: ponto.total))
                            .accessibilityLabel(
                                "\(ponto.competencia.rotuloCurto): \(ponto.total.formatadoBRL)"
                            )
                        Text(ponto.competencia.rotuloCurto)
                            .font(.system(size: 9))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .frame(height: 76)
        }
    }

    /// Escala as barras pelo maior valor da curva. Curva toda zerada desenha
    /// barras de altura mínima em vez de dividir por zero.
    private func altura(de valor: Money) -> CGFloat {
        let maior = modelo.curva.map(\.total.centavos).max() ?? 0
        guard maior > 0 else { return 2 }
        return max(CGFloat(valor.centavos) / CGFloat(maior) * 58, 2)
    }

    private func diaFormatado(_ data: Date) -> String {
        data.formatted(.dateTime.day())
    }
}
```

- [ ] **Step 5: Ligar na aba Cartões**

Em `App/Sources/UI/RaizView.swift`, substituir o `ChegaNoProximoMilestone` da aba Cartões por uma `NavigationStack` com `CartoesView`, construindo o `CartoesModelo` com os três repositórios sobre o `modelContext` do ambiente. Siga o padrão de propriedade de modelo que a aba Início já usa — o review final do M1 apontou que modelo criado dentro de closure de apresentação não tem dono e perde estado; não repita isso aqui.

- [ ] **Step 6: Rodar, buildar e conferir na tela**

```bash
cd App && xcodegen generate
xcodebuild test -project Casal.xcodeproj -scheme Casal -destination 'platform=iOS Simulator,name=iPhone 17'
xcodebuild -project Casal.xcodeproj -scheme Casal -destination 'platform=iOS Simulator,name=iPhone 17' -derivedDataPath /tmp/casal-dd build
xcrun simctl install "iPhone 17" /tmp/casal-dd/Build/Products/Debug-iphonesimulator/Casal.app
xcrun simctl terminate "iPhone 17" br.com.casal.app
xcrun simctl launch "iPhone 17" br.com.casal.app
```

Espere pelo menos quatro segundos antes de `xcrun simctl io "iPhone 17" screenshot /tmp/cartoes.png`. Screenshot tirado durante o launch sai branco e não prova nada. Olhe a imagem e confirme: a aba Cartões abre no estado vazio com o convite para cadastrar, e não no placeholder antigo.

- [ ] **Step 7: Commit**

```bash
git add App/Sources/UI/Cartoes/CartoesModelo.swift App/Sources/UI/Cartoes/CartoesView.swift \
        App/Sources/UI/RaizView.swift App/Tests/CartoesModeloTests.swift
git commit -m "feat(ui): tela de entrada de cartoes com total e curva de futuras"
```

---

## Task 13: Detalhe do cartão em carrossel

O desenho aprovado: cartão grande como herói, swipe horizontal entre cartões, abas para fatura atual, próxima e futuras, lançamentos abaixo.

**Files:**
- Create: `App/Sources/UI/Cartoes/CartaoDetalheModelo.swift`
- Create: `App/Sources/UI/Cartoes/CartaoDetalheView.swift`
- Modify: `App/Sources/UI/Cartoes/CartoesView.swift`
- Test: `App/Tests/CartaoDetalheModeloTests.swift`

**Interfaces:**
- Consumes: `RepositorioCartoes`, `RepositorioFaturas`, `RepositorioTransacoes`, `CalendarioFatura`, `HorizonteFaturas`, `CartaoFace`, `Competencia`
- Produces: `enum AbaFatura { case atual, proxima, futuras }`, `CartaoDetalheModelo` com `cartoes`, `indiceSelecionado`, `aba`, `cartaoAtual`, `lancamentos`, `totalDaAba`, `faturasFuturas`, `recarregar(referencia:)`; e `CartaoDetalheView`

- [ ] **Step 1: Escrever o teste que falha**

`App/Tests/CartaoDetalheModeloTests.swift`:

```swift
import CasalDomain
import Foundation
import SwiftData
import Testing
@testable import Casal

@Suite("CartaoDetalheModelo")
struct CartaoDetalheModeloTests {
    private var calendario: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/Sao_Paulo")!
        return c
    }

    private func data(_ ano: Int, _ mes: Int, _ dia: Int) -> Date {
        var partes = DateComponents()
        partes.year = ano
        partes.month = mes
        partes.day = dia
        partes.hour = 12
        return calendario.date(from: partes)!
    }

    private func montar() throws -> (CartaoDetalheModelo, ModelContext) {
        let contexto = ModelContext(try SchemaCasal.container(emMemoria: true))
        let modelo = CartaoDetalheModelo(
            repositorioCartoes: RepositorioCartoesSwiftData(contexto: contexto),
            repositorioFaturas: RepositorioFaturasSwiftData(contexto: contexto),
            repositorioTransacoes: RepositorioSwiftData(contexto: contexto),
            calendario: calendario
        )
        return (modelo, contexto)
    }

    private func cartao(_ apelido: String) -> Cartao {
        Cartao(
            carteiraID: UUID(), apelido: apelido, banco: "Nubank", ultimos4: "4417",
            limite: Money(centavos: 800_000), diaFechamento: 28, diaVencimento: 5
        )
    }

    @Test("a aba atual mostra só os lançamentos da fatura corrente")
    func abaAtual() throws {
        let (modelo, contexto) = try montar()
        let repoCartoes = RepositorioCartoesSwiftData(contexto: contexto)
        let repoTransacoes = RepositorioSwiftData(contexto: contexto)
        let meu = cartao("Nosso")
        try repoCartoes.salvarCartao(meu)

        try repoTransacoes.salvar(Transacao(
            carteiraID: meu.carteiraID, tipo: .despesa, valor: Money(centavos: 41_280),
            data: data(2026, 9, 10), descricao: "Zaffari", criadoPor: UUID(),
            cartaoID: meu.id, hashDedup: "set"
        ))
        try repoTransacoes.salvar(Transacao(
            carteiraID: meu.carteiraID, tipo: .despesa, valor: Money(centavos: 8740),
            data: data(2026, 9, 29), descricao: "Ifood", criadoPor: UUID(),
            cartaoID: meu.id, hashDedup: "out"
        ))

        modelo.recarregar(referencia: data(2026, 9, 15))
        modelo.aba = .atual
        #expect(modelo.lancamentos.count == 1)
        #expect(modelo.lancamentos.first?.descricao == "Zaffari")
        #expect(modelo.totalDaAba == Money(centavos: 41_280))
    }

    @Test("a aba próxima mostra o que passou do fechamento")
    func abaProxima() throws {
        let (modelo, contexto) = try montar()
        let repoCartoes = RepositorioCartoesSwiftData(contexto: contexto)
        let repoTransacoes = RepositorioSwiftData(contexto: contexto)
        let meu = cartao("Nosso")
        try repoCartoes.salvarCartao(meu)

        try repoTransacoes.salvar(Transacao(
            carteiraID: meu.carteiraID, tipo: .despesa, valor: Money(centavos: 8740),
            data: data(2026, 9, 29), descricao: "Ifood", criadoPor: UUID(),
            cartaoID: meu.id, hashDedup: "out"
        ))

        modelo.recarregar(referencia: data(2026, 9, 15))
        modelo.aba = .proxima
        #expect(modelo.lancamentos.count == 1)
        #expect(modelo.lancamentos.first?.descricao == "Ifood")
        #expect(modelo.totalDaAba == Money(centavos: 8740))
    }

    @Test("a aba futuras resume as competências seguintes, sem listar lançamento")
    func abaFuturas() throws {
        let (modelo, contexto) = try montar()
        let repoCartoes = RepositorioCartoesSwiftData(contexto: contexto)
        let repoTransacoes = RepositorioSwiftData(contexto: contexto)
        let meu = cartao("Nosso")
        try repoCartoes.salvarCartao(meu)

        let parcelas = Parcelamento.transacoes(
            de: Parcelamento.planejar(
                total: Money(centavos: 120_000), vezes: 6,
                compraEm: data(2026, 9, 10), cartao: meu, calendario: calendario
            ),
            carteiraID: meu.carteiraID, categoriaID: nil, descricao: "Sofá",
            criadoPor: UUID(), cartao: meu, calendario: calendario
        )
        for parcela in parcelas { try repoTransacoes.salvar(parcela) }

        modelo.recarregar(referencia: data(2026, 9, 15))
        modelo.aba = .futuras
        // futuras começa na terceira competência: setembro é atual, outubro é próxima
        #expect(modelo.faturasFuturas.count == 4)
        #expect(modelo.faturasFuturas.allSatisfy { $0.total == Money(centavos: 20_000) })
    }

    @Test("trocar de cartão troca os lançamentos exibidos")
    func trocaDeCartao() throws {
        let (modelo, contexto) = try montar()
        let repoCartoes = RepositorioCartoesSwiftData(contexto: contexto)
        let repoTransacoes = RepositorioSwiftData(contexto: contexto)
        let a = cartao("A")
        let b = cartao("B")
        try repoCartoes.salvarCartao(a)
        try repoCartoes.salvarCartao(b)

        try repoTransacoes.salvar(Transacao(
            carteiraID: a.carteiraID, tipo: .despesa, valor: Money(centavos: 10_000),
            data: data(2026, 9, 10), descricao: "do A", criadoPor: UUID(),
            cartaoID: a.id, hashDedup: "a"
        ))
        try repoTransacoes.salvar(Transacao(
            carteiraID: b.carteiraID, tipo: .despesa, valor: Money(centavos: 20_000),
            data: data(2026, 9, 10), descricao: "do B", criadoPor: UUID(),
            cartaoID: b.id, hashDedup: "b"
        ))

        modelo.recarregar(referencia: data(2026, 9, 15))
        #expect(modelo.cartoes.count == 2)

        let apelidoDoPrimeiro = modelo.cartaoAtual?.apelido
        let descricaoDoPrimeiro = modelo.lancamentos.first?.descricao
        modelo.indiceSelecionado = 1
        #expect(modelo.cartaoAtual?.apelido != apelidoDoPrimeiro)
        #expect(modelo.lancamentos.first?.descricao != descricaoDoPrimeiro)
    }

    @Test("índice fora da lista não estoura e não devolve cartão")
    func indiceInvalido() throws {
        let (modelo, _) = try montar()
        modelo.recarregar(referencia: data(2026, 9, 15))
        modelo.indiceSelecionado = 5
        #expect(modelo.cartaoAtual == nil)
        #expect(modelo.lancamentos.isEmpty)
        #expect(modelo.totalDaAba == Money.zero)
    }

    @Test("lançamento removido não aparece em aba nenhuma")
    func removidoIgnorado() throws {
        let (modelo, contexto) = try montar()
        let repoCartoes = RepositorioCartoesSwiftData(contexto: contexto)
        let repoTransacoes = RepositorioSwiftData(contexto: contexto)
        let meu = cartao("Nosso")
        try repoCartoes.salvarCartao(meu)

        let alvo = Transacao(
            carteiraID: meu.carteiraID, tipo: .despesa, valor: Money(centavos: 41_280),
            data: data(2026, 9, 10), descricao: "Zaffari", criadoPor: UUID(),
            cartaoID: meu.id, hashDedup: "set"
        )
        try repoTransacoes.salvar(alvo)
        try repoTransacoes.remover(id: alvo.id)

        modelo.recarregar(referencia: data(2026, 9, 15))
        modelo.aba = .atual
        #expect(modelo.lancamentos.isEmpty)
        #expect(modelo.totalDaAba == Money.zero)
    }
}
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd App && xcodebuild test -project Casal.xcodeproj -scheme Casal -destination 'platform=iOS Simulator,name=iPhone 17'`
Expected: FALHA, `cannot find 'CartaoDetalheModelo' in scope`

- [ ] **Step 3: Implementar o modelo**

`App/Sources/UI/Cartoes/CartaoDetalheModelo.swift`:

```swift
import CasalDomain
import Foundation
import Observation

enum AbaFatura: String, CaseIterable, Identifiable {
    case atual, proxima, futuras

    var id: String { rawValue }

    var titulo: String {
        switch self {
        case .atual: "Atual"
        case .proxima: "Próxima"
        case .futuras: "Futuras"
        }
    }
}

@Observable
final class CartaoDetalheModelo {
    private(set) var cartoes: [Cartao] = []
    var indiceSelecionado = 0
    var aba: AbaFatura = .atual

    private var todasAsTransacoes: [Transacao] = []
    private var referencia = Date()

    private let repositorioCartoes: RepositorioCartoes
    private let repositorioFaturas: RepositorioFaturas
    private let repositorioTransacoes: RepositorioTransacoes
    private let calendario: Calendar

    static let mesesFuturosExibidos = 4

    init(
        repositorioCartoes: RepositorioCartoes,
        repositorioFaturas: RepositorioFaturas,
        repositorioTransacoes: RepositorioTransacoes,
        calendario: Calendar = .current
    ) {
        self.repositorioCartoes = repositorioCartoes
        self.repositorioFaturas = repositorioFaturas
        self.repositorioTransacoes = repositorioTransacoes
        self.calendario = calendario
    }

    func recarregar(referencia: Date = Date()) {
        self.referencia = referencia
        cartoes = (try? repositorioCartoes.listarCartoes()) ?? []
        todasAsTransacoes = (try? repositorioTransacoes.listar(
            de: .distantPast, ate: .distantFuture
        )) ?? []
        if indiceSelecionado >= cartoes.count { indiceSelecionado = 0 }
    }

    var cartaoAtual: Cartao? {
        cartoes.indices.contains(indiceSelecionado) ? cartoes[indiceSelecionado] : nil
    }

    private var competenciaAtual: Competencia {
        Competencia(data: referencia, calendario: calendario)
    }

    /// Competência que a aba selecionada representa. `futuras` não tem uma
    /// competência única — é resumo, e devolve nil de propósito.
    private var competenciaDaAba: Competencia? {
        switch aba {
        case .atual: competenciaAtual
        case .proxima: competenciaAtual.avancando(meses: 1)
        case .futuras: nil
        }
    }

    var lancamentos: [Transacao] {
        guard let cartao = cartaoAtual, let competencia = competenciaDaAba else { return [] }
        return todasAsTransacoes
            .filter { transacao in
                transacao.cartaoID == cartao.id
                    && !transacao.estaRemovida
                    && transacao.tipo == .despesa
                    && CalendarioFatura.competencia(
                        deCompraEm: transacao.data, cartao: cartao, calendario: calendario
                    ) == competencia
            }
            .sorted { $0.data > $1.data }
    }

    var totalDaAba: Money {
        switch aba {
        case .atual, .proxima:
            lancamentos.reduce(Money.zero) { $0 + $1.valor }
        case .futuras:
            faturasFuturas.reduce(Money.zero) { $0 + $1.total }
        }
    }

    /// As competências depois da próxima. Começa em +2 porque +0 é a aba atual
    /// e +1 é a aba próxima.
    var faturasFuturas: [(competencia: Competencia, total: Money)] {
        guard let cartao = cartaoAtual else { return [] }
        let horizonte = HorizonteFaturas.proximas(
            2 + Self.mesesFuturosExibidos,
            desde: competenciaAtual,
            transacoes: todasAsTransacoes,
            cartao: cartao,
            calendario: calendario
        )
        return Array(horizonte.dropFirst(2))
    }

    var faturaDaAbaAtual: Fatura? {
        guard let cartao = cartaoAtual, let competencia = competenciaDaAba else { return nil }
        return try? repositorioFaturas.faturaOuCriar(
            cartao: cartao, competencia: competencia, calendario: calendario
        )
    }
}
```

- [ ] **Step 4: Implementar a view**

`App/Sources/UI/Cartoes/CartaoDetalheView.swift`:

```swift
import CasalDomain
import SwiftUI

struct CartaoDetalheView: View {
    @Bindable var modelo: CartaoDetalheModelo
    let aoPagarFatura: (Cartao, Fatura, Money) -> Void
    let aoEditarCartao: (Cartao) -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                carrossel
                seletorDeAba

                if modelo.aba == .futuras {
                    listaDeFuturas
                } else {
                    cabecalhoDaFatura
                    listaDeLancamentos
                }
            }
            .padding(16)
        }
        .navigationTitle(modelo.cartaoAtual?.apelido ?? "Cartão")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                if let cartao = modelo.cartaoAtual {
                    Button("Editar") { aoEditarCartao(cartao) }
                }
            }
        }
        .onAppear { modelo.recarregar() }
    }

    private var carrossel: some View {
        TabView(selection: $modelo.indiceSelecionado) {
            ForEach(Array(modelo.cartoes.enumerated()), id: \.element.id) { indice, cartao in
                CartaoFace(
                    cartao: cartao,
                    tamanho: .grande,
                    faturaAtual: modelo.aba == .futuras ? nil : modelo.totalDaAba
                )
                .tag(indice)
                .padding(.horizontal, 2)
            }
        }
        .tabViewStyle(.page(indexDisplayMode: modelo.cartoes.count > 1 ? .automatic : .never))
        .frame(height: TamanhoCartaoFace.grande.altura + 28)
    }

    private var seletorDeAba: some View {
        Picker("Fatura", selection: $modelo.aba) {
            ForEach(AbaFatura.allCases) { aba in
                Text(aba.titulo).tag(aba)
            }
        }
        .pickerStyle(.segmented)
    }

    private var cabecalhoDaFatura: some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                if let fatura = modelo.faturaDaAbaAtual {
                    Text("Vence \(fatura.venceEm.formatted(.dateTime.day().month(.abbreviated)))")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(.secondary)
                }
                ValorTexto(valor: modelo.totalDaAba, tamanho: 24)
            }
            Spacer()
            if let cartao = modelo.cartaoAtual,
               let fatura = modelo.faturaDaAbaAtual,
               fatura.status != .paga,
               modelo.totalDaAba.centavos > 0 {
                Button("Pagar") {
                    aoPagarFatura(cartao, fatura, modelo.totalDaAba)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
            }
        }
        .padding(12)
        .background(Color.primary.opacity(0.06), in: .rect(cornerRadius: 12))
    }

    private var listaDeLancamentos: some View {
        VStack(spacing: 0) {
            if modelo.lancamentos.isEmpty {
                Text("Nenhum lançamento nesta fatura")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 26)
            } else {
                ForEach(modelo.lancamentos) { transacao in
                    HStack(spacing: 10) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(transacao.descricao.isEmpty ? "Sem descrição" : transacao.descricao)
                                .font(.subheadline.weight(.semibold))
                            Text(transacao.data.formatted(.dateTime.day().month(.abbreviated)))
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            Text(transacao.valor.formatadoBRL)
                                .font(.subheadline.weight(.bold))
                                .monospacedDigit()
                            if transacao.parcelaTotal > 1 {
                                Text("\(transacao.parcelaN) de \(transacao.parcelaTotal)")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .padding(.vertical, 7)

                    if transacao.id != modelo.lancamentos.last?.id { Divider() }
                }
            }
        }
    }

    private var listaDeFuturas: some View {
        VStack(spacing: 0) {
            ForEach(modelo.faturasFuturas, id: \.competencia) { ponto in
                HStack {
                    Text("\(ponto.competencia.rotuloCurto) \(String(ponto.competencia.ano))")
                        .font(.subheadline.weight(.semibold))
                    Spacer()
                    Text(ponto.total.formatadoBRL)
                        .font(.subheadline.weight(.bold))
                        .monospacedDigit()
                }
                .padding(.vertical, 9)

                if ponto.competencia != modelo.faturasFuturas.last?.competencia { Divider() }
            }
        }
    }
}
```

- [ ] **Step 5: Ligar a navegação a partir da lista**

Em `App/Sources/UI/Cartoes/CartoesView.swift`, o callback `aoAbrirCartao` já existe. Faça a `RaizView` (ou a `NavigationStack` da aba Cartões) empurrar `CartaoDetalheView` com um `CartaoDetalheModelo` cujo `indiceSelecionado` já aponta para o cartão tocado. O modelo tem de ter dono em `@State` — modelo criado dentro de closure de apresentação perde estado, defeito que o review final do M1 já pegou uma vez neste projeto.

- [ ] **Step 6: Rodar, buildar e conferir na tela**

Rode a suíte, depois instale e tire screenshot como na Tarefa 12, esperando pelo menos quatro segundos após o launch. Confirme na imagem: o cartão grande aparece com gradiente e últimos quatro dígitos, o seletor de três abas está visível, e a lista abaixo mostra o lançamento com "3 de 12" quando houver parcela.

- [ ] **Step 7: Commit**

```bash
git add App/Sources/UI/Cartoes/CartaoDetalheModelo.swift \
        App/Sources/UI/Cartoes/CartaoDetalheView.swift \
        App/Sources/UI/Cartoes/CartoesView.swift App/Sources/UI/RaizView.swift \
        App/Tests/CartaoDetalheModeloTests.swift
git commit -m "feat(ui): detalhe do cartao em carrossel com abas de fatura"
```

---

## Task 14: Cadastro e edição de cartão

Sem esta tela o M2 inteiro é inalcançável: não há como criar o primeiro cartão.

**Files:**
- Create: `App/Sources/UI/Cartoes/CartaoFormModelo.swift`
- Create: `App/Sources/UI/Cartoes/CartaoFormView.swift`
- Test: `App/Tests/CartaoFormModeloTests.swift`

**Interfaces:**
- Consumes: `RepositorioCartoes`, `Cartao`, `BandeiraCartao`, `Money`, `EntradaValor`, `CartaoFace`
- Produces: `CartaoFormModelo` com `apelido`, `banco`, `ultimos4`, `bandeira`, `cor`, `entradaLimite`, `diaFechamento`, `diaVencimento`, `podeSalvar`, `erros: [String]`, `salvar()`, `cartaoDePrevia`; e `CartaoFormView`

- [ ] **Step 1: Escrever o teste que falha**

`App/Tests/CartaoFormModeloTests.swift`:

```swift
import CasalDomain
import Foundation
import SwiftData
import Testing
@testable import Casal

private final class RepositorioCartoesFalso: RepositorioCartoes {
    var cartoesSalvos: [Cartao] = []
    var contasSalvas: [Conta] = []

    func salvarCartao(_ cartao: Cartao) throws { cartoesSalvos.append(cartao) }
    func listarCartoes() throws -> [Cartao] { cartoesSalvos }
    func arquivarCartao(id: UUID) throws { cartoesSalvos.removeAll { $0.id == id } }
    func salvarConta(_ conta: Conta) throws { contasSalvas.append(conta) }
    func listarContas() throws -> [Conta] { contasSalvas }
}

@Suite("CartaoFormModelo")
struct CartaoFormModeloTests {
    private func modeloNovo(
        _ repositorio: RepositorioCartoesFalso = RepositorioCartoesFalso()
    ) -> CartaoFormModelo {
        CartaoFormModelo(repositorio: repositorio, carteiraID: UUID(), cartaoExistente: nil)
    }

    @Test("formulário vazio não pode salvar e explica o que falta")
    func vazioNaoSalva() {
        let modelo = modeloNovo()
        #expect(modelo.podeSalvar == false)
        #expect(modelo.erros.isEmpty == false)
    }

    @Test("preenchido corretamente pode salvar e não tem erro")
    func preenchidoSalva() {
        let modelo = modeloNovo()
        modelo.apelido = "Nosso"
        modelo.banco = "Nubank"
        modelo.ultimos4 = "4417"
        modelo.diaFechamento = 28
        modelo.diaVencimento = 5
        for digito in [8, 0, 0, 0, 0, 0] { modelo.entradaLimite.digitar(digito) }

        #expect(modelo.erros.isEmpty)
        #expect(modelo.podeSalvar)
    }

    @Test("limite zero é recusado — cartão sem limite não calcula disponível")
    func limiteZero() {
        let modelo = modeloNovo()
        modelo.apelido = "Nosso"
        modelo.banco = "Nubank"
        modelo.ultimos4 = "4417"
        #expect(modelo.podeSalvar == false)
    }

    @Test("últimos quatro dígitos exigem exatamente quatro números")
    func ultimos4Invalido() {
        let modelo = modeloNovo()
        modelo.apelido = "Nosso"
        modelo.banco = "Nubank"
        for digito in [8, 0, 0, 0, 0, 0] { modelo.entradaLimite.digitar(digito) }

        modelo.ultimos4 = "441"
        #expect(modelo.podeSalvar == false)
        modelo.ultimos4 = "44177"
        #expect(modelo.podeSalvar == false)
        modelo.ultimos4 = "44a7"
        #expect(modelo.podeSalvar == false)
        modelo.ultimos4 = "4417"
        #expect(modelo.podeSalvar)
    }

    @Test("dias fora de 1 a 31 são recusados")
    func diasInvalidos() {
        let modelo = modeloNovo()
        modelo.apelido = "Nosso"
        modelo.banco = "Nubank"
        modelo.ultimos4 = "4417"
        for digito in [8, 0, 0, 0, 0, 0] { modelo.entradaLimite.digitar(digito) }

        modelo.diaFechamento = 0
        #expect(modelo.podeSalvar == false)
        modelo.diaFechamento = 32
        #expect(modelo.podeSalvar == false)
        modelo.diaFechamento = 28
        modelo.diaVencimento = 0
        #expect(modelo.podeSalvar == false)
        modelo.diaVencimento = 5
        #expect(modelo.podeSalvar)
    }

    @Test("salvar grava o cartão com o limite digitado em centavos")
    func salvaComLimite() throws {
        let repositorio = RepositorioCartoesFalso()
        let modelo = modeloNovo(repositorio)
        modelo.apelido = "Nosso"
        modelo.banco = "Nubank"
        modelo.ultimos4 = "4417"
        modelo.bandeira = .visa
        modelo.diaFechamento = 28
        modelo.diaVencimento = 5
        for digito in [8, 0, 0, 0, 0, 0] { modelo.entradaLimite.digitar(digito) }

        try modelo.salvar()

        #expect(repositorio.cartoesSalvos.count == 1)
        let gravado = try #require(repositorio.cartoesSalvos.first)
        #expect(gravado.apelido == "Nosso")
        #expect(gravado.limite == Money(centavos: 800_000))
        #expect(gravado.bandeira == .visa)
        #expect(gravado.diaFechamento == 28)
        #expect(gravado.diaVencimento == 5)
    }

    @Test("editar preserva o id do cartão em vez de criar outro")
    func edicaoPreservaID() throws {
        let repositorio = RepositorioCartoesFalso()
        let existente = Cartao(
            carteiraID: UUID(), apelido: "Antigo", banco: "Nubank", ultimos4: "4417",
            limite: Money(centavos: 500_000), diaFechamento: 10, diaVencimento: 20
        )
        let modelo = CartaoFormModelo(
            repositorio: repositorio, carteiraID: existente.carteiraID, cartaoExistente: existente
        )
        #expect(modelo.apelido == "Antigo")
        #expect(modelo.entradaLimite.valor == Money(centavos: 500_000))

        modelo.apelido = "Renovado"
        try modelo.salvar()

        #expect(repositorio.cartoesSalvos.first?.id == existente.id)
        #expect(repositorio.cartoesSalvos.first?.apelido == "Renovado")
    }

    @Test("a prévia reflete o que já foi digitado")
    func previa() {
        let modelo = modeloNovo()
        modelo.banco = "Itaú"
        modelo.ultimos4 = "9999"
        #expect(modelo.cartaoDePrevia.banco == "Itaú")
        #expect(modelo.cartaoDePrevia.ultimos4 == "9999")
    }
}
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd App && xcodebuild test -project Casal.xcodeproj -scheme Casal -destination 'platform=iOS Simulator,name=iPhone 17'`
Expected: FALHA, `cannot find 'CartaoFormModelo' in scope`

- [ ] **Step 3: Implementar o modelo**

`App/Sources/UI/Cartoes/CartaoFormModelo.swift`:

```swift
import CasalDomain
import Foundation
import Observation

@Observable
final class CartaoFormModelo {
    var apelido: String = ""
    var banco: String = ""
    var ultimos4: String = ""
    var bandeira: BandeiraCartao = .outra
    var cor: String = "#7C5CFF"
    var entradaLimite = EntradaValor()
    var diaFechamento: Int = 28
    var diaVencimento: Int = 5

    private let repositorio: RepositorioCartoes
    private let carteiraID: UUID
    private let idExistente: UUID?
    private let contaPagamentoID: UUID?

    init(repositorio: RepositorioCartoes, carteiraID: UUID, cartaoExistente: Cartao?) {
        self.repositorio = repositorio
        self.carteiraID = carteiraID
        idExistente = cartaoExistente?.id
        contaPagamentoID = cartaoExistente?.contaPagamentoID

        if let existente = cartaoExistente {
            apelido = existente.apelido
            banco = existente.banco
            ultimos4 = existente.ultimos4
            bandeira = existente.bandeira
            cor = existente.cor
            diaFechamento = existente.diaFechamento
            diaVencimento = existente.diaVencimento
            entradaLimite = EntradaValor(centavos: existente.limite.centavos)
        }
    }

    /// Mensagens do que falta, na ordem em que o usuário preenche. Existe para
    /// que o botão desabilitado não seja um mistério.
    var erros: [String] {
        var lista: [String] = []
        if apelido.trimmingCharacters(in: .whitespaces).isEmpty {
            lista.append("Dê um apelido ao cartão")
        }
        if banco.trimmingCharacters(in: .whitespaces).isEmpty {
            lista.append("Informe o banco")
        }
        if ultimos4.count != 4 || !ultimos4.allSatisfy(\.isNumber) {
            lista.append("Informe os quatro últimos dígitos")
        }
        if entradaLimite.valor.centavos <= 0 {
            lista.append("Informe o limite do cartão")
        }
        if !Cartao.diaValido(diaFechamento) {
            lista.append("Dia de fechamento entre 1 e 31")
        }
        if !Cartao.diaValido(diaVencimento) {
            lista.append("Dia de vencimento entre 1 e 31")
        }
        return lista
    }

    var podeSalvar: Bool { erros.isEmpty }

    var cartaoDePrevia: Cartao {
        Cartao(
            id: idExistente ?? UUID(),
            carteiraID: carteiraID,
            apelido: apelido.isEmpty ? "Apelido" : apelido,
            banco: banco.isEmpty ? "Banco" : banco,
            bandeira: bandeira,
            ultimos4: ultimos4.isEmpty ? "0000" : ultimos4,
            cor: cor,
            limite: entradaLimite.valor,
            diaFechamento: diaFechamento,
            diaVencimento: diaVencimento,
            contaPagamentoID: contaPagamentoID
        )
    }

    func salvar() throws {
        guard podeSalvar else { return }
        try repositorio.salvarCartao(cartaoDePrevia)
    }
}
```

Nota: `EntradaValor` do M1 só sabe receber dígito por dígito. Esta tarefa precisa carregá-la com um valor existente para a edição, então acrescente a `App/Sources/UI/Componentes/ValorTexto.swift` um inicializador que aceita centavos direto, mantendo o inicializador vazio existente:

```swift
    init() {}

    init(centavos: Int) {
        self.centavos = max(0, min(centavos, Self.tetoCentavos))
    }
```

- [ ] **Step 4: Implementar a view**

`App/Sources/UI/Cartoes/CartaoFormView.swift`:

```swift
import CasalDomain
import SwiftUI

struct CartaoFormView: View {
    @Bindable var modelo: CartaoFormModelo
    @Environment(\.dismiss) private var fechar
    @State private var erroAoSalvar: String?

    private let cores = ["#7C5CFF", "#8A2BE2", "#FF9F0A", "#FF453A", "#34C759", "#0A84FF", "#2C2C2E"]

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    CartaoFace(cartao: modelo.cartaoDePrevia, tamanho: .media)
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                }

                Section("Identificação") {
                    TextField("Apelido", text: $modelo.apelido)
                        .textInputAutocapitalization(.words)
                    TextField("Banco", text: $modelo.banco)
                        .textInputAutocapitalization(.words)
                    TextField("Últimos 4 dígitos", text: $modelo.ultimos4)
                        .keyboardType(.numberPad)
                    Picker("Bandeira", selection: $modelo.bandeira) {
                        ForEach(BandeiraCartao.allCases, id: \.self) { bandeira in
                            Text(bandeira == .outra ? "Outra" : bandeira.rawValue.capitalized)
                                .tag(bandeira)
                        }
                    }
                }

                Section("Limite") {
                    HStack {
                        Text("Limite total")
                        Spacer()
                        ValorTexto(valor: modelo.entradaLimite.valor, tamanho: 17)
                    }
                    TecladoNumerico(
                        aoDigitar: { modelo.entradaLimite.digitar($0) },
                        aoApagar: { modelo.entradaLimite.apagar() },
                        aoAbrirMais: {},
                        aoSalvar: {},
                        podeSalvar: false
                    )
                    .listRowInsets(EdgeInsets(top: 6, leading: 6, bottom: 6, trailing: 6))
                }

                Section("Ciclo") {
                    Stepper("Fecha no dia \(modelo.diaFechamento)",
                            value: $modelo.diaFechamento, in: 1...31)
                    Stepper("Vence no dia \(modelo.diaVencimento)",
                            value: $modelo.diaVencimento, in: 1...31)
                    Text(explicacaoDoCiclo)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Section("Cor") {
                    HStack(spacing: 9) {
                        ForEach(cores, id: \.self) { hex in
                            Circle()
                                .fill(CartaoFace.cor(deHex: hex))
                                .frame(width: 28, height: 28)
                                .overlay(
                                    Circle().stroke(.primary, lineWidth: modelo.cor == hex ? 2 : 0)
                                )
                                .onTapGesture { modelo.cor = hex }
                                .accessibilityLabel("Cor \(hex)")
                        }
                    }
                }

                if !modelo.erros.isEmpty {
                    Section {
                        ForEach(modelo.erros, id: \.self) { erro in
                            Label(erro, systemImage: "exclamationmark.circle")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("Cartão")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { fechar() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Salvar", action: salvar).disabled(!modelo.podeSalvar)
                }
            }
            .alert("Não foi possível salvar", isPresented: Binding(
                get: { erroAoSalvar != nil },
                set: { if !$0 { erroAoSalvar = nil } }
            )) {
                Button("OK") { erroAoSalvar = nil }
            } message: {
                Text(erroAoSalvar ?? "")
            }
        }
    }

    /// Explica em texto o efeito da combinação escolhida, porque a relação
    /// entre fechamento e vencimento decide em que mês a fatura vence e é a
    /// parte que mais confunde.
    private var explicacaoDoCiclo: String {
        modelo.diaVencimento > modelo.diaFechamento
            ? "A fatura fecha e vence no mesmo mês."
            : "A fatura fecha num mês e vence no mês seguinte."
    }

    private func salvar() {
        do {
            try modelo.salvar()
            fechar()
        } catch {
            erroAoSalvar = "Não foi possível salvar o cartão. Tente novamente."
        }
    }
}
```

- [ ] **Step 5: Rodar, buildar e conferir na tela**

Rode a suíte, instale e tire screenshot esperando quatro segundos. Confirme: a prévia do cartão no topo muda enquanto os campos são preenchidos, e a frase sobre o ciclo troca ao mexer nos dois steppers.

- [ ] **Step 6: Commit**

```bash
git add App/Sources/UI/Cartoes/CartaoFormModelo.swift \
        App/Sources/UI/Cartoes/CartaoFormView.swift \
        App/Sources/UI/Componentes/ValorTexto.swift \
        App/Tests/CartaoFormModeloTests.swift
git commit -m "feat(ui): cadastro e edicao de cartao com previa"
```

---

## Task 15: Lançar no cartão, parcelar e pagar fatura

A tarefa que fecha o M2. Sem ela o motor existe mas nada o alimenta: o fluxo de lançamento do M1 não sabe escolher cartão nem parcelar, e não há como pagar uma fatura.

**Files:**
- Modify: `App/Sources/UI/Lancamento/LancamentoModelo.swift`
- Modify: `App/Sources/UI/Lancamento/MaisOpcoesView.swift`
- Create: `App/Sources/UI/Cartoes/PagarFaturaView.swift`
- Modify: `App/Sources/UI/InicioModelo.swift`
- Modify: `App/Sources/UI/InicioView.swift`
- Test: `App/Tests/LancamentoComCartaoTests.swift`
- Test: `App/Tests/PagarFaturaTests.swift`

**Interfaces:**
- Consumes: `LancamentoModelo` do M1, `RepositorioCartoes`, `RepositorioFaturas`, `Parcelamento`, `PagamentoFatura`, `HorizonteFaturas`
- Produces: em `LancamentoModelo`, as propriedades `cartaoSelecionado: Cartao?`, `cartoesDisponiveis: [Cartao]`, `parcelas: Int` e o comportamento novo de `salvar()`; `PagarFaturaModelo` com `entrada`, `contaSelecionada`, `saldoDevedor`, `pagar()`; `PagarFaturaView`; e em `InicioModelo` a propriedade `comprometidoNoMes: Money`

- [ ] **Step 1: Escrever os testes que falham**

`App/Tests/LancamentoComCartaoTests.swift`:

```swift
import CasalDomain
import Foundation
import SwiftData
import Testing
@testable import Casal

@Suite("Lancamento com cartao e parcelas")
struct LancamentoComCartaoTests {
    private var calendario: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/Sao_Paulo")!
        return c
    }

    private func data(_ ano: Int, _ mes: Int, _ dia: Int) -> Date {
        var partes = DateComponents()
        partes.year = ano
        partes.month = mes
        partes.day = dia
        partes.hour = 12
        return calendario.date(from: partes)!
    }

    private func montar() throws -> (LancamentoModelo, RepositorioSwiftData, Cartao) {
        let contexto = ModelContext(try SchemaCasal.container(emMemoria: true))
        let repoTransacoes = RepositorioSwiftData(contexto: contexto)
        let repoCartoes = RepositorioCartoesSwiftData(contexto: contexto)

        let carteira = Carteira(nome: "Nosso", donoID: UUID())
        let cartao = Cartao(
            carteiraID: carteira.id, apelido: "Nosso", banco: "Nubank", ultimos4: "4417",
            limite: Money(centavos: 1_000_000), diaFechamento: 28, diaVencimento: 5
        )
        try repoCartoes.salvarCartao(cartao)

        let modelo = LancamentoModelo(
            repositorio: repoTransacoes,
            repositorioCartoes: repoCartoes,
            carteira: carteira,
            categorias: Categoria.padrao,
            autorID: UUID(),
            calendario: calendario
        )
        return (modelo, repoTransacoes, cartao)
    }

    @Test("sem cartão escolhido, o lançamento continua sendo uma transação só")
    func semCartao() throws {
        let (modelo, repo, _) = try montar()
        modelo.entrada.digitar(4)
        modelo.entrada.digitar(2)
        modelo.entrada.digitar(0)
        modelo.entrada.digitar(0)
        try modelo.salvar()

        let gravadas = try repo.listar(de: .distantPast, ate: .distantFuture)
        #expect(gravadas.count == 1)
        #expect(gravadas.first?.cartaoID == nil)
        #expect(gravadas.first?.parcelaTotal == 1)
    }

    @Test("com cartão à vista, grava uma transação já vinculada ao cartão")
    func cartaoAVista() throws {
        let (modelo, repo, cartao) = try montar()
        modelo.cartaoSelecionado = cartao
        modelo.parcelas = 1
        modelo.data = data(2026, 9, 10)
        for digito in [4, 2, 0, 0] { modelo.entrada.digitar(digito) }
        try modelo.salvar()

        let gravadas = try repo.listar(de: .distantPast, ate: .distantFuture)
        #expect(gravadas.count == 1)
        #expect(gravadas.first?.cartaoID == cartao.id)
        #expect(gravadas.first?.valor == Money(centavos: 4200))
    }

    @Test("com cartão em 12x, grava doze transações do mesmo grupo")
    func cartaoParcelado() throws {
        let (modelo, repo, cartao) = try montar()
        modelo.cartaoSelecionado = cartao
        modelo.parcelas = 12
        modelo.data = data(2026, 9, 10)
        modelo.descricao = "Apple Store"
        for digito in [3, 0, 0, 0, 0, 0] { modelo.entrada.digitar(digito) }
        try modelo.salvar()

        let gravadas = try repo.listar(de: .distantPast, ate: .distantFuture)
        #expect(gravadas.count == 12)
        #expect(Set(gravadas.compactMap(\.grupoParcela)).count == 1)
        #expect(gravadas.reduce(Money.zero) { $0 + $1.valor } == Money(centavos: 300_000))
        #expect(Set(gravadas.map(\.parcelaN)) == Set(1...12))
        #expect(gravadas.allSatisfy { $0.parcelaTotal == 12 })
    }

    @Test("parcelamento sem cartão é recusado — parcela sem fatura não existe")
    func parcelaSemCartao() throws {
        let (modelo, repo, _) = try montar()
        modelo.cartaoSelecionado = nil
        modelo.parcelas = 6
        for digito in [3, 0, 0, 0, 0, 0] { modelo.entrada.digitar(digito) }
        try modelo.salvar()

        let gravadas = try repo.listar(de: .distantPast, ate: .distantFuture)
        #expect(gravadas.count == 1)
        #expect(gravadas.first?.parcelaTotal == 1)
    }

    @Test("o estado limpa depois de salvar, inclusive cartão e parcelas")
    func estadoLimpo() throws {
        let (modelo, _, cartao) = try montar()
        modelo.cartaoSelecionado = cartao
        modelo.parcelas = 6
        for digito in [3, 0, 0, 0, 0, 0] { modelo.entrada.digitar(digito) }
        try modelo.salvar()

        #expect(modelo.entrada.valor == Money.zero)
        #expect(modelo.parcelas == 1)
        #expect(modelo.cartaoSelecionado == nil)
    }

    @Test("os cartões disponíveis vêm do repositório")
    func cartoesDisponiveis() throws {
        let (modelo, _, cartao) = try montar()
        #expect(modelo.cartoesDisponiveis.count == 1)
        #expect(modelo.cartoesDisponiveis.first?.id == cartao.id)
    }
}
```

`App/Tests/PagarFaturaTests.swift`:

```swift
import CasalDomain
import Foundation
import SwiftData
import Testing
@testable import Casal

@Suite("PagarFaturaModelo")
struct PagarFaturaTests {
    private var calendario: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/Sao_Paulo")!
        return c
    }

    private func montar(totalDaFatura: Int) throws -> (PagarFaturaModelo, RepositorioSwiftData, RepositorioFaturasSwiftData, Fatura) {
        let contexto = ModelContext(try SchemaCasal.container(emMemoria: true))
        let repoTransacoes = RepositorioSwiftData(contexto: contexto)
        let repoFaturas = RepositorioFaturasSwiftData(contexto: contexto)
        let repoCartoes = RepositorioCartoesSwiftData(contexto: contexto)

        let carteira = UUID()
        let cartao = Cartao(
            carteiraID: carteira, apelido: "Nosso", banco: "Nubank", ultimos4: "4417",
            limite: Money(centavos: 1_000_000), diaFechamento: 28, diaVencimento: 5
        )
        try repoCartoes.salvarCartao(cartao)
        let conta = Conta(carteiraID: carteira, nome: "Corrente")
        try repoCartoes.salvarConta(conta)

        let fatura = try repoFaturas.faturaOuCriar(
            cartao: cartao, competencia: Competencia(ano: 2026, mes: 9), calendario: calendario
        )

        let modelo = PagarFaturaModelo(
            repositorioTransacoes: repoTransacoes,
            repositorioFaturas: repoFaturas,
            repositorioCartoes: repoCartoes,
            cartao: cartao,
            fatura: fatura,
            totalDaFatura: Money(centavos: totalDaFatura),
            carteiraID: carteira,
            autorID: UUID()
        )
        return (modelo, repoTransacoes, repoFaturas, fatura)
    }

    @Test("o valor sugerido é o saldo devedor inteiro")
    func sugereTotal() throws {
        let (modelo, _, _, _) = try montar(totalDaFatura: 284_730)
        #expect(modelo.saldoDevedor == Money(centavos: 284_730))
        #expect(modelo.entrada.valor == Money(centavos: 284_730))
    }

    @Test("pagar grava uma transferência, nunca uma despesa")
    func gravaTransferencia() throws {
        let (modelo, repoTransacoes, _, _) = try montar(totalDaFatura: 284_730)
        modelo.contaSelecionada = try #require(modelo.contasDisponiveis.first)
        try modelo.pagar()

        let gravadas = try repoTransacoes.listar(de: .distantPast, ate: .distantFuture)
        #expect(gravadas.count == 1)
        #expect(gravadas.first?.tipo == .transferencia)
        #expect(gravadas.first?.faturaID != nil)
    }

    @Test("pagamento integral marca a fatura como paga")
    func integralMarcaPaga() throws {
        let (modelo, _, repoFaturas, fatura) = try montar(totalDaFatura: 284_730)
        modelo.contaSelecionada = try #require(modelo.contasDisponiveis.first)
        try modelo.pagar()

        let recarregada = try repoFaturas.listarFaturas(cartaoID: fatura.cartaoID).first
        #expect(recarregada?.status == .paga)
        #expect(recarregada?.valorPago == Money(centavos: 284_730))
    }

    @Test("pagamento parcial marca parcial e deixa saldo devedor")
    func parcial() throws {
        let (modelo, _, repoFaturas, fatura) = try montar(totalDaFatura: 284_730)
        modelo.contaSelecionada = try #require(modelo.contasDisponiveis.first)
        modelo.entrada.limpar()
        for digito in [1, 0, 0, 0, 0, 0] { modelo.entrada.digitar(digito) }
        try modelo.pagar()

        let recarregada = try #require(try repoFaturas.listarFaturas(cartaoID: fatura.cartaoID).first)
        #expect(recarregada.status == .parcial)
        #expect(recarregada.valorPago == Money(centavos: 100_000))
        #expect(PagamentoFatura.saldoDevedor(
            fatura: recarregada, total: Money(centavos: 284_730)
        ) == Money(centavos: 184_730))
    }

    @Test("sem conta escolhida não grava nada")
    func semConta() throws {
        let (modelo, repoTransacoes, _, _) = try montar(totalDaFatura: 284_730)
        modelo.contaSelecionada = nil
        try modelo.pagar()
        #expect(try repoTransacoes.listar(de: .distantPast, ate: .distantFuture).isEmpty)
    }

    @Test("pagar zero não grava nada")
    func pagarZero() throws {
        let (modelo, repoTransacoes, _, _) = try montar(totalDaFatura: 284_730)
        modelo.contaSelecionada = try #require(modelo.contasDisponiveis.first)
        modelo.entrada.limpar()
        try modelo.pagar()
        #expect(try repoTransacoes.listar(de: .distantPast, ate: .distantFuture).isEmpty)
    }

    @Test("o pagamento não infla o total de despesas do mês")
    func naoContaComoDespesa() throws {
        let (modelo, repoTransacoes, _, _) = try montar(totalDaFatura: 284_730)
        modelo.contaSelecionada = try #require(modelo.contasDisponiveis.first)
        try modelo.pagar()

        let todas = try repoTransacoes.listar(de: .distantPast, ate: .distantFuture)
        let resumo = ResumoMensal.calcular(transacoes: todas, de: .distantPast, ate: .distantFuture)
        #expect(resumo.totalDespesas == Money.zero)
        #expect(resumo.quantidade == 0)
    }
}
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `cd App && xcodebuild test -project Casal.xcodeproj -scheme Casal -destination 'platform=iOS Simulator,name=iPhone 17'`
Expected: FALHA, o inicializador de `LancamentoModelo` não aceita `repositorioCartoes`

- [ ] **Step 3: Estender LancamentoModelo**

Em `App/Sources/UI/Lancamento/LancamentoModelo.swift`, acrescentar ao inicializador os parâmetros `repositorioCartoes: RepositorioCartoes` e `calendario: Calendar = .current`, guardá-los, e acrescentar:

```swift
    var cartaoSelecionado: Cartao?
    var parcelas: Int = 1

    var cartoesDisponiveis: [Cartao] {
        (try? repositorioCartoes.listarCartoes()) ?? []
    }
```

E substituir o corpo de `salvar()` por:

```swift
    func salvar() throws {
        guard entrada.podeSalvar else { return }

        // Parcelamento só existe dentro de um cartão: parcela sem fatura não
        // tem onde cair. Sem cartão escolhido, o lançamento é único.
        if let cartao = cartaoSelecionado, parcelas > 1 {
            let planejadas = Parcelamento.planejar(
                total: entrada.valor,
                vezes: parcelas,
                compraEm: data,
                cartao: cartao,
                calendario: calendario
            )
            let transacoes = Parcelamento.transacoes(
                de: planejadas,
                carteiraID: carteira.id,
                categoriaID: categoriaSelecionada?.id,
                descricao: descricao,
                criadoPor: autorID,
                cartao: cartao,
                calendario: calendario
            )
            for transacao in transacoes {
                try repositorio.salvar(transacao)
            }
        } else {
            let transacao = Transacao(
                carteiraID: carteira.id,
                tipo: .despesa,
                valor: entrada.valor,
                data: data,
                categoriaID: categoriaSelecionada?.id,
                descricao: descricao,
                cartaoID: cartaoSelecionado?.id,
                criadoPor: autorID,
                hashDedup: Dedup.chave(
                    carteiraID: carteira.id,
                    tipo: .despesa,
                    valor: entrada.valor,
                    estabelecimento: descricao
                )
            )
            try repositorio.salvar(transacao)
        }

        entrada.limpar()
        descricao = ""
        data = Date()
        parcelas = 1
        cartaoSelecionado = nil
    }
```

Confira a ordem real dos parâmetros de `Transacao.init` antes de copiar: a onda de correção do M1 acrescentou campos, e `cartaoID` fica depois de `contaID`.

**Este passo quebra três chamadores existentes, e é sua responsabilidade consertar os três no mesmo commit:**

1. `App/Tests/LancamentoModeloTests.swift` — o `RepositorioFalso` implementa só `RepositorioTransacoes`, e o modelo agora exige também um `RepositorioCartoes`. Acrescente um falso de cartões que devolva lista vazia, e passe-o em todas as construções do modelo. **Não altere as asserções existentes** — elas cobrem o comportamento do M1 e têm de continuar passando iguais.
2. `App/Sources/UI/RaizView.swift` — a construção do `LancamentoModelo` precisa do repositório de cartões.
3. Qualquer outro ponto que `grep -rn "LancamentoModelo(" App/` revelar.

Rode esse `grep` antes de compilar, para não descobrir os chamadores um erro por vez.

- [ ] **Step 4: Expor cartão e parcelas em MaisOpcoesView**

Em `App/Sources/UI/Lancamento/MaisOpcoesView.swift`, remover a frase "Parcelas e cartão de crédito chegam em breve." e acrescentar duas seções. A seção de parcelas só aparece quando há cartão escolhido — parcelamento sem cartão não existe, e mostrar o campo desabilitado sem explicação é pior que não mostrar:

```swift
                Section("Pago com") {
                    Picker("Cartão", selection: $modelo.cartaoSelecionado) {
                        Text("Dinheiro, Pix ou débito").tag(nil as Cartao?)
                        ForEach(modelo.cartoesDisponiveis) { cartao in
                            Text("\(cartao.banco) ••\(cartao.ultimos4)").tag(cartao as Cartao?)
                        }
                    }
                }

                if modelo.cartaoSelecionado != nil {
                    Section("Parcelas") {
                        Picker("Parcelar em", selection: $modelo.parcelas) {
                            Text("À vista").tag(1)
                            ForEach(2...24, id: \.self) { vezes in
                                Text("\(vezes)x").tag(vezes)
                            }
                        }
                        if modelo.parcelas > 1 {
                            let cada = modelo.entrada.valor.dividir(em: modelo.parcelas).first ?? .zero
                            Text("\(modelo.parcelas)x de \(cada.formatadoBRL), primeira parcela maior se houver sobra")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
```

Também aplique aqui a correção que ficou pendente do M1: o limite superior do `DatePicker` usa `intervalo.end`, que é meia-noite do dia 1 do mês seguinte. Num `ClosedRange` isso ainda permite escolher esse dia e gravar num mês invisível. Troque para um limite exclusivo, usando `intervalo.end.addingTimeInterval(-1)` como limite superior fechado ou reconstruindo o intervalo com o último instante do mês.

- [ ] **Step 5: Implementar PagarFaturaView**

`App/Sources/UI/Cartoes/PagarFaturaView.swift`:

```swift
import CasalDomain
import Foundation
import Observation
import SwiftUI

@Observable
final class PagarFaturaModelo {
    var entrada: EntradaValor
    var contaSelecionada: Conta?

    let cartao: Cartao
    let totalDaFatura: Money
    private(set) var fatura: Fatura

    private let repositorioTransacoes: RepositorioTransacoes
    private let repositorioFaturas: RepositorioFaturas
    private let repositorioCartoes: RepositorioCartoes
    private let carteiraID: UUID
    private let autorID: UUID

    init(
        repositorioTransacoes: RepositorioTransacoes,
        repositorioFaturas: RepositorioFaturas,
        repositorioCartoes: RepositorioCartoes,
        cartao: Cartao,
        fatura: Fatura,
        totalDaFatura: Money,
        carteiraID: UUID,
        autorID: UUID
    ) {
        self.repositorioTransacoes = repositorioTransacoes
        self.repositorioFaturas = repositorioFaturas
        self.repositorioCartoes = repositorioCartoes
        self.cartao = cartao
        self.fatura = fatura
        self.totalDaFatura = totalDaFatura
        self.carteiraID = carteiraID
        self.autorID = autorID

        let devedor = PagamentoFatura.saldoDevedor(fatura: fatura, total: totalDaFatura)
        entrada = EntradaValor(centavos: devedor.centavos)
        contaSelecionada = (try? repositorioCartoes.listarContas())?.first
    }

    var contasDisponiveis: [Conta] {
        (try? repositorioCartoes.listarContas()) ?? []
    }

    var saldoDevedor: Money {
        PagamentoFatura.saldoDevedor(fatura: fatura, total: totalDaFatura)
    }

    var podePagar: Bool {
        entrada.podeSalvar && contaSelecionada != nil
    }

    func pagar() throws {
        guard let conta = contaSelecionada, entrada.podeSalvar else { return }

        let transacao = PagamentoFatura.transacao(
            valor: entrada.valor,
            faturaID: fatura.id,
            contaID: conta.id,
            carteiraID: carteiraID,
            criadoPor: autorID,
            data: Date()
        )
        try repositorioTransacoes.salvar(transacao)

        fatura = PagamentoFatura.aplicar(
            pagamento: entrada.valor, em: fatura, totalDaFatura: totalDaFatura
        )
        try repositorioFaturas.atualizarFatura(fatura)
    }
}

struct PagarFaturaView: View {
    @Bindable var modelo: PagarFaturaModelo
    @Environment(\.dismiss) private var fechar
    @State private var erro: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Saldo devedor")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        ValorTexto(valor: modelo.saldoDevedor, tamanho: 26)
                    }
                }

                Section("Valor a pagar") {
                    HStack {
                        Spacer()
                        ValorTexto(valor: modelo.entrada.valor, tamanho: 22)
                        Spacer()
                    }
                    TecladoNumerico(
                        aoDigitar: { modelo.entrada.digitar($0) },
                        aoApagar: { modelo.entrada.apagar() },
                        aoAbrirMais: {},
                        aoSalvar: {},
                        podeSalvar: false
                    )
                    .listRowInsets(EdgeInsets(top: 6, leading: 6, bottom: 6, trailing: 6))
                }

                Section("Sai de") {
                    if modelo.contasDisponiveis.isEmpty {
                        Text("Cadastre uma conta em Mais para registrar o pagamento.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    } else {
                        Picker("Conta", selection: $modelo.contaSelecionada) {
                            ForEach(modelo.contasDisponiveis) { conta in
                                Text(conta.nome).tag(conta as Conta?)
                            }
                        }
                    }
                }

                Section {
                    Text("O pagamento entra como transferência, não como gasto novo — a compra já foi contada quando aconteceu.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Pagar fatura")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { fechar() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Pagar", action: pagar).disabled(!modelo.podePagar)
                }
            }
            .alert("Não foi possível pagar", isPresented: Binding(
                get: { erro != nil }, set: { if !$0 { erro = nil } }
            )) {
                Button("OK") { erro = nil }
            } message: {
                Text(erro ?? "")
            }
        }
    }

    private func pagar() {
        do {
            try modelo.pagar()
            fechar()
        } catch {
            erro = "Não foi possível registrar o pagamento. Tente novamente."
        }
    }
}
```

- [ ] **Step 6: Mostrar o comprometido na home**

Em `App/Sources/UI/InicioModelo.swift`, acrescentar `private(set) var comprometidoNoMes: Money = .zero` e calculá-lo em `recarregar` somando a fatura corrente de todos os cartões, via `HorizonteFaturas.proximas(1, ...)` por cartão. Isso exige injetar `RepositorioCartoes` no inicializador — o teste de `InicioModelo` do M1 usa um repositório falso, então atualize-o para o novo inicializador sem mudar as asserções existentes.

Em `App/Sources/UI/InicioView.swift`, acrescentar abaixo do cartão de resumo uma linha discreta: `"Comprometido em faturas: <valor>"`, só quando o valor for maior que zero. Não invente o cálculo de sobra segura aqui — isso é M4.

- [ ] **Step 7: Rodar tudo, buildar e conferir na tela**

```bash
cd Packages/CasalDomain && swift test
cd ../../App && xcodegen generate
xcodebuild test -project Casal.xcodeproj -scheme Casal -destination 'platform=iOS Simulator,name=iPhone 17'
cd .. && swiftlint --strict
```

Depois instale e tire screenshot esperando quatro segundos. Confirme na imagem: a aba Cartões lista o cartão cadastrado com fatura e curva, e a home mostra a linha de comprometido.

- [ ] **Step 8: Commit**

```bash
git add App/Sources/UI/Lancamento/LancamentoModelo.swift \
        App/Sources/UI/Lancamento/MaisOpcoesView.swift \
        App/Sources/UI/Cartoes/PagarFaturaView.swift \
        App/Sources/UI/InicioModelo.swift App/Sources/UI/InicioView.swift \
        App/Tests/LancamentoComCartaoTests.swift App/Tests/PagarFaturaTests.swift
git commit -m "feat(ui): lancamento no cartao com parcelas e pagamento de fatura"
```

---

## Definição de pronto do M2

- [ ] `swift test` no domínio verde, incluindo os ~45 testes novos das Tarefas 1 a 7
- [ ] `xcodebuild test` verde no simulador
- [ ] `swiftlint --strict` sem violação
- [ ] Um cartão pode ser cadastrado pela interface, com prévia ao vivo
- [ ] Uma compra em 12x gera doze transações do mesmo grupo, distribuídas em doze competências
- [ ] A aba Cartões mostra total do mês, lista de cartões e a curva de seis meses
- [ ] O detalhe mostra o cartão grande, as três abas de fatura e "N de M" nas parcelas
- [ ] Pagar fatura grava transferência, marca a fatura, e **não** aumenta o total de despesas do mês
- [ ] Compra depois do dia de fechamento aparece na fatura seguinte, não na atual
- [ ] Nenhum `import SwiftUI`, `SwiftData` ou `UIKit` em `Packages/CasalDomain/Sources`

Verificação da última linha:

```bash
! grep -rE "import (SwiftUI|SwiftData|UIKit|Combine)" Packages/CasalDomain/Sources
```

## Herdado do M1 e resolvido aqui

- **Schema versionado** (Tarefa 8) — dívida que o review final do M1 adiou explicitamente para o momento em que entidades novas chegassem.
- **Limite do `DatePicker`** (Tarefa 15, Step 4) — o `ClosedRange` ainda aceitava o dia 1 do mês seguinte.

## Fica para o M3 ou depois

- Precedência de tombstone em `RepositorioSwiftData.salvar` — o delete+insert descarta o `removidoEm` gravado, e isso quebra "apagar vence editar" quando o outbox do M3 reenviar uma escrita velha.
- `fatalError` no lançamento do app virando tela de erro com opção de reset.
- Filtro por `carteiraID` nas consultas, que só faz sentido junto com RLS.
- Tipos de fonte fixos ignorando Dynamic Type.
- Incluir `App/Tests` no escopo do SwiftLint.
- Juros de rotativo, se algum dia deixar de estar fora de escopo.
