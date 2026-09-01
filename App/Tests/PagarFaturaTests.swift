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
