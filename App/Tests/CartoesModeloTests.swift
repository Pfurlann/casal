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
            data: data(2026, 9, 10), cartaoID: a.id, criadoPor: UUID(), hashDedup: "a1"
        ))
        try repoTransacoes.salvar(Transacao(
            carteiraID: b.carteiraID, tipo: .despesa, valor: Money(centavos: 40_000),
            data: data(2026, 9, 12), cartaoID: b.id, criadoPor: UUID(), hashDedup: "b1"
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

        let contextoLancamento = ContextoDeLancamento(
            carteiraID: meuCartao.carteiraID, criadoPor: UUID(), calendario: calendario
        )
        let parcelas = Parcelamento.transacoes(
            de: Parcelamento.planejar(
                total: Money(centavos: 120_000), vezes: 6,
                compraEm: data(2026, 9, 10), cartao: meuCartao, contexto: contextoLancamento
            ),
            categoriaID: nil, descricao: "Sofá", cartao: meuCartao, contexto: contextoLancamento
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
            data: data(2026, 9, 10), cartaoID: meuCartao.id, criadoPor: UUID(), hashDedup: "s"
        ))
        // compra no dia 29 passa do fechamento e cai em outubro
        try repoTransacoes.salvar(Transacao(
            carteiraID: meuCartao.carteiraID, tipo: .despesa, valor: Money(centavos: 30_000),
            data: data(2026, 9, 29), cartaoID: meuCartao.id, criadoPor: UUID(), hashDedup: "o"
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
