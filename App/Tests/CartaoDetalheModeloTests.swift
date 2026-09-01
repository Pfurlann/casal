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
            data: data(2026, 9, 10), descricao: "Zaffari",
            cartaoID: meu.id, criadoPor: UUID(), hashDedup: "set"
        ))
        try repoTransacoes.salvar(Transacao(
            carteiraID: meu.carteiraID, tipo: .despesa, valor: Money(centavos: 8740),
            data: data(2026, 9, 29), descricao: "Ifood",
            cartaoID: meu.id, criadoPor: UUID(), hashDedup: "out"
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
            data: data(2026, 9, 29), descricao: "Ifood",
            cartaoID: meu.id, criadoPor: UUID(), hashDedup: "out"
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

        // Assinatura real de Parcelamento usa ContextoDeLancamento (Phase B),
        // não os parâmetros soltos carteiraID/criadoPor/calendario do brief.
        let contexto2 = ContextoDeLancamento(
            carteiraID: meu.carteiraID, criadoPor: UUID(), calendario: calendario
        )
        let parcelas = Parcelamento.transacoes(
            de: Parcelamento.planejar(
                total: Money(centavos: 120_000), vezes: 6,
                compraEm: data(2026, 9, 10), cartao: meu, contexto: contexto2
            ),
            categoriaID: nil, descricao: "Sofá", cartao: meu, contexto: contexto2
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
            data: data(2026, 9, 10), descricao: "do A",
            cartaoID: a.id, criadoPor: UUID(), hashDedup: "a"
        ))
        try repoTransacoes.salvar(Transacao(
            carteiraID: b.carteiraID, tipo: .despesa, valor: Money(centavos: 20_000),
            data: data(2026, 9, 10), descricao: "do B",
            cartaoID: b.id, criadoPor: UUID(), hashDedup: "b"
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
            data: data(2026, 9, 10), descricao: "Zaffari",
            cartaoID: meu.id, criadoPor: UUID(), hashDedup: "set"
        )
        try repoTransacoes.salvar(alvo)
        try repoTransacoes.remover(id: alvo.id)

        modelo.recarregar(referencia: data(2026, 9, 15))
        modelo.aba = .atual
        #expect(modelo.lancamentos.isEmpty)
        #expect(modelo.totalDaAba == Money.zero)
    }

    @Test("recarregar não grava nenhuma fatura no banco")
    func recarregarNaoPersisteNada() throws {
        let (modelo, contexto) = try montar()
        let repoCartoes = RepositorioCartoesSwiftData(contexto: contexto)
        let repoFaturas = RepositorioFaturasSwiftData(contexto: contexto)
        let meu = cartao("Nosso")
        try repoCartoes.salvarCartao(meu)

        modelo.recarregar(referencia: data(2026, 9, 15))
        modelo.aba = .atual
        _ = modelo.lancamentos
        _ = modelo.totalDaAba
        modelo.aba = .proxima
        _ = modelo.lancamentos
        _ = modelo.totalDaAba
        modelo.aba = .futuras
        _ = modelo.faturasFuturas

        #expect(try repoFaturas.listarFaturas(cartaoID: meu.id).isEmpty)
    }
}
