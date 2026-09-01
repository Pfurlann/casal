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
