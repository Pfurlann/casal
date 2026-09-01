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
