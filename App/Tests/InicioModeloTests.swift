import CasalDomain
import Foundation
import Testing
@testable import Casal

private final class RepositorioComDados: RepositorioTransacoes {
    var itens: [Transacao] = []
    func salvar(_ transacao: Transacao) throws { itens.append(transacao) }
    func remover(id: UUID) throws { itens.removeAll { $0.id == id } }
    func listar(de inicio: Date, ate fim: Date) throws -> [Transacao] {
        itens.filter { $0.data >= inicio && $0.data <= fim }
    }
    func historicoRecente(limite: Int) throws -> [Transacao] { Array(itens.prefix(limite)) }
}

@Suite("InicioModelo")
struct InicioModeloTests {
    @Test("o resumo do mês soma apenas o período corrente")
    func resumoDoMes() throws {
        let repositorio = RepositorioComDados()
        let agora = Date()
        let mesPassado = Calendar.current.date(byAdding: .month, value: -1, to: agora)!

        repositorio.itens = [
            Transacao(carteiraID: UUID(), tipo: .despesa, valor: Money(centavos: 4200),
                      data: agora, criadoPor: UUID(), hashDedup: "a"),
            Transacao(carteiraID: UUID(), tipo: .despesa, valor: Money(centavos: 9900),
                      data: mesPassado, criadoPor: UUID(), hashDedup: "b")
        ]

        let modelo = InicioModelo(repositorio: repositorio, categorias: Categoria.padrao)
        modelo.recarregar(referencia: agora)

        #expect(modelo.resumo.totalDespesas == Money(centavos: 4200))
        #expect(modelo.transacoes.count == 1)
    }

    @Test("mês sem lançamento mostra resumo zerado sem estourar")
    func mesVazio() {
        let modelo = InicioModelo(repositorio: RepositorioComDados(), categorias: Categoria.padrao)
        modelo.recarregar(referencia: Date())
        #expect(modelo.resumo.totalDespesas == Money.zero)
        #expect(modelo.transacoes.isEmpty)
    }
}
