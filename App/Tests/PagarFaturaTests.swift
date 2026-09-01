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
        let (modelo, repoTransacoes, repoFaturas, fatura) = try montar(totalDaFatura: 284_730)
        modelo.contaSelecionada = try #require(modelo.contasDisponiveis.first)
        try modelo.pagar()

        let gravadas = try repoTransacoes.listar(de: .distantPast, ate: .distantFuture)
        #expect(gravadas.count == 1)
        #expect(gravadas.first?.tipo == .transferencia)

        // Não basta o campo não ser nil: precisa apontar para uma linha que
        // de fato existe, senão o pagamento fica órfão de fatura.
        let faturaID = try #require(gravadas.first?.faturaID)
        let persistida = try repoFaturas.listarFaturas(cartaoID: fatura.cartaoID).first { $0.id == faturaID }
        #expect(persistida != nil)
    }

    @Test("pagar quando a fatura da tela ainda não foi persistida cria a linha em vez de apontar para um id órfão")
    func pagarSemFaturaPersistida() throws {
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

        let competencia = Competencia(ano: 2026, mes: 9)
        // Espelha exatamente o que `CartaoDetalheModelo.faturaDaAbaAtual`
        // devolve quando ainda não existe linha gravada: uma `Fatura`
        // transiente, com `id` novo a cada chamada, que nunca foi salva.
        let transiente = Fatura(
            cartaoID: cartao.id,
            competencia: competencia,
            fechaEm: CalendarioFatura.fechamento(competencia: competencia, cartao: cartao, calendario: calendario),
            venceEm: CalendarioFatura.vencimento(competencia: competencia, cartao: cartao, calendario: calendario)
        )

        let modelo = PagarFaturaModelo(
            repositorioTransacoes: repoTransacoes,
            repositorioFaturas: repoFaturas,
            repositorioCartoes: repoCartoes,
            cartao: cartao,
            fatura: transiente,
            totalDaFatura: Money(centavos: 284_730),
            carteiraID: carteira,
            autorID: UUID()
        )
        modelo.contaSelecionada = try #require(modelo.contasDisponiveis.first)
        try modelo.pagar()

        let persistida = try #require(
            try repoFaturas.listarFaturas(cartaoID: cartao.id).first { $0.competencia == competencia }
        )
        #expect(persistida.status == .paga)
        #expect(persistida.valorPago == Money(centavos: 284_730))

        let gravadas = try repoTransacoes.listar(de: .distantPast, ate: .distantFuture)
        #expect(gravadas.first?.faturaID == persistida.id)
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

    @Test("o pagamento carimba o dispositivoID exigido pela seção 7 do spec")
    func carimbaDispositivo() throws {
        let (modelo, repoTransacoes, _, _) = try montar(totalDaFatura: 284_730)
        modelo.contaSelecionada = try #require(modelo.contasDisponiveis.first)
        try modelo.pagar()

        let gravada = try #require(try repoTransacoes.listar(de: .distantPast, ate: .distantFuture).first)
        #expect(gravada.dispositivoID == IdentidadeLocal.dispositivoID)
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
