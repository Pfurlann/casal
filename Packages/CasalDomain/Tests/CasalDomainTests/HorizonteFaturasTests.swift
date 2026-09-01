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
