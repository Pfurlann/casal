import CasalDomain
import Foundation
import Testing
@testable import Casal

private final class RepositorioComDados: RepositorioTransacoes {
    var itens: [Transacao] = []
    func salvar(_ transacao: Transacao) throws { itens.append(transacao) }
    func remover(id: UUID) throws { itens.removeAll { $0.id == id } }
    func listar(de inicio: Date, ate fim: Date) throws -> [Transacao] {
        // Meio-aberto [inicio, fim), igual ao contrato de RepositorioSwiftData
        // e de ResumoMensal.calcular: `fim` é exclusivo.
        itens.filter { $0.data >= inicio && $0.data < fim }
    }
    func historicoRecente(limite: Int) throws -> [Transacao] { Array(itens.prefix(limite)) }
}

/// Nenhum teste aqui cobre cartão: o falso sempre devolve lista vazia, então
/// `comprometidoNoMes` fica em zero e não interfere nas asserções do M1.
private final class RepositorioCartoesFalso: RepositorioCartoes {
    func salvarCartao(_ cartao: Cartao) throws {}
    func listarCartoes() throws -> [Cartao] { [] }
    func arquivarCartao(id: UUID) throws {}
    func salvarConta(_ conta: Conta) throws {}
    func listarContas() throws -> [Conta] { [] }
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

        let modelo = InicioModelo(
            repositorio: repositorio, repositorioCartoes: RepositorioCartoesFalso(), categorias: Categoria.padrao
        )
        modelo.recarregar(referencia: agora)

        #expect(modelo.resumo.totalDespesas == Money(centavos: 4200))
        #expect(modelo.transacoes.count == 1)
    }

    @Test("mês sem lançamento mostra resumo zerado sem estourar")
    func mesVazio() {
        let modelo = InicioModelo(
            repositorio: RepositorioComDados(),
            repositorioCartoes: RepositorioCartoesFalso(),
            categorias: Categoria.padrao
        )
        modelo.recarregar(referencia: Date())
        #expect(modelo.resumo.totalDespesas == Money.zero)
        #expect(modelo.transacoes.isEmpty)
    }

    @Test("transação exatamente no fim do intervalo fica de fora; um segundo antes entra")
    func fronteiraDoIntervalo() throws {
        let repositorio = RepositorioComDados()
        let calendario = Calendar.current
        let referencia = Date()
        let intervalo = try #require(calendario.dateInterval(of: .month, for: referencia))
        let noFim = intervalo.end
        let umSegundoAntes = try #require(calendario.date(byAdding: .second, value: -1, to: intervalo.end))

        repositorio.itens = [
            Transacao(carteiraID: UUID(), tipo: .despesa, valor: Money(centavos: 100),
                      data: noFim, criadoPor: UUID(), hashDedup: "no-fim"),
            Transacao(carteiraID: UUID(), tipo: .despesa, valor: Money(centavos: 200),
                      data: umSegundoAntes, criadoPor: UUID(), hashDedup: "um-segundo-antes")
        ]

        let modelo = InicioModelo(
            repositorio: repositorio, repositorioCartoes: RepositorioCartoesFalso(), categorias: Categoria.padrao
        )
        modelo.recarregar(referencia: referencia)

        #expect(modelo.transacoes.count == 1)
        #expect(modelo.transacoes.first?.hashDedup == "um-segundo-antes")
    }
}
