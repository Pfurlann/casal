import Foundation
import Testing
@testable import CasalDomain

@Suite("SugestaoCategoria")
struct SugestaoCategoriaTests {
    let carteira = UUID()
    let autor = UUID()
    let mercado = UUID()
    let restaurante = UUID()
    let combustivel = UUID()

    private func lancamento(_ local: String, _ categoria: UUID, dia n: Int) -> Transacao {
        Transacao(
            carteiraID: carteira,
            tipo: .despesa,
            valor: Money(centavos: 1000),
            data: Date(timeIntervalSince1970: TimeInterval(n * 86_400)),
            categoriaID: categoria,
            descricao: local,
            criadoPor: autor,
            hashDedup: UUID().uuidString
        )
    }

    @Test("a categoria mais usada naquele estabelecimento vem primeiro")
    func historicoDoLocal() {
        let historico = [
            lancamento("Zaffari", mercado, dia: 1),
            lancamento("ZAFFARI LTDA", mercado, dia: 2),
            lancamento("zaffari", restaurante, dia: 3),
            lancamento("Ifood", restaurante, dia: 4)
        ]
        let sugeridas = SugestaoCategoria.sugerir(
            paraEstabelecimento: "  zaffari  ",
            historico: historico,
            limite: 2
        )
        #expect(sugeridas.first == mercado)
        #expect(sugeridas.count == 2)
        #expect(sugeridas.contains(restaurante))
    }

    @Test("sem histórico do local, cai nas categorias mais usadas em geral")
    func fallbackGeral() {
        let historico = [
            lancamento("Ifood", restaurante, dia: 1),
            lancamento("Ifood", restaurante, dia: 2),
            lancamento("Posto", combustivel, dia: 3)
        ]
        let sugeridas = SugestaoCategoria.sugerir(
            paraEstabelecimento: "Loja Nova",
            historico: historico,
            limite: 2
        )
        #expect(sugeridas == [restaurante, combustivel])
    }

    @Test("histórico vazio devolve lista vazia")
    func semHistorico() {
        #expect(SugestaoCategoria.sugerir(paraEstabelecimento: "Qualquer", historico: [], limite: 3).isEmpty)
    }

    @Test("transações removidas e sem categoria não influenciam a sugestão")
    func ignoraRuido() {
        var removida = lancamento("Zaffari", restaurante, dia: 1)
        removida.removidoEm = Date()
        var semCategoria = lancamento("Zaffari", mercado, dia: 2)
        semCategoria.categoriaID = nil

        let historico = [removida, semCategoria, lancamento("Zaffari", mercado, dia: 3)]
        #expect(SugestaoCategoria.sugerir(paraEstabelecimento: "Zaffari", historico: historico, limite: 2) == [mercado])
    }
}
