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
