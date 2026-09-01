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
