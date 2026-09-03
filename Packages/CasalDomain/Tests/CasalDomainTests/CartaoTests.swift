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
        #expect(BandeiraCartao.visa.rawValue == "visa")
        #expect(BandeiraCartao.mastercard.rawValue == "mastercard")
        #expect(BandeiraCartao.elo.rawValue == "elo")
        #expect(BandeiraCartao.amex.rawValue == "amex")
        #expect(BandeiraCartao.hipercard.rawValue == "hipercard")
        #expect(BandeiraCartao.outra.rawValue == "outra")
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

    @Test("conta aceita saldo inicial negativo")
    func contaSaldoNegativo() {
        let conta = Conta(
            carteiraID: UUID(),
            nome: "Corrente",
            tipo: .corrente,
            saldoInicial: Money(centavos: -5_000)
        )
        #expect(conta.saldoInicial == Money(centavos: -5_000))
    }
}
