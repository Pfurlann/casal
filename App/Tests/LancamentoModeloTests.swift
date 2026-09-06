import CasalDomain
import Foundation
import Testing
@testable import Casal

private final class RepositorioFalso: RepositorioTransacoes {
    var salvas: [Transacao] = []
    var historico: [Transacao] = []

    func salvar(_ transacao: Transacao) throws { salvas.append(transacao) }
    func remover(id: UUID) throws {}
    func listar(de inicio: Date, ate fim: Date) throws -> [Transacao] { salvas }
    func historicoRecente(limite: Int) throws -> [Transacao] { Array(historico.prefix(limite)) }
}

/// O M1 não sabia de cartões: este teste cobre só o lançamento sem cartão,
/// então o falso nunca precisa devolver nada além de lista vazia.
private final class RepositorioCartoesFalso: RepositorioCartoes {
    func salvarCartao(_ cartao: Cartao) throws {}
    func listarCartoes() throws -> [Cartao] { [] }
    func arquivarCartao(id: UUID) throws {}
    func salvarConta(_ conta: Conta) throws {}
    func listarContas() throws -> [Conta] { [] }
}

@Suite("LancamentoModelo")
struct LancamentoModeloTests {
    private func fazerModelo(
        repositorio: RepositorioFalso = RepositorioFalso(),
        categorias: [Categoria] = Categoria.padrao
    ) -> LancamentoModelo {
        LancamentoModelo(
            repositorio: repositorio,
            repositorioCartoes: RepositorioCartoesFalso(),
            carteira: Carteira(nome: "Nosso", donoID: UUID()),
            categorias: categorias,
            autorID: UUID()
        )
    }

    @Test("salvar grava uma despesa com o valor digitado e a categoria escolhida")
    func salvaDespesa() throws {
        let repositorio = RepositorioFalso()
        let modelo = fazerModelo(repositorio: repositorio)
        let mercado = try #require(Categoria.padrao.first { $0.nome == "Mercado" })

        modelo.entrada.digitar(4)
        modelo.entrada.digitar(2)
        modelo.entrada.digitar(0)
        modelo.entrada.digitar(0)
        modelo.categoriaSelecionada = mercado

        try modelo.salvar()

        #expect(repositorio.salvas.count == 1)
        let gravada = try #require(repositorio.salvas.first)
        #expect(gravada.valor == Money(centavos: 4200))
        #expect(gravada.categoriaID == mercado.id)
        #expect(gravada.tipo == .despesa)
        #expect(gravada.estado == .liquidado)
        #expect(gravada.origem == .manual)
    }

    @Test("salvar preenche a chave de deduplicação")
    func preencheDedup() throws {
        let repositorio = RepositorioFalso()
        let modelo = fazerModelo(repositorio: repositorio)
        modelo.entrada.digitar(5)
        modelo.descricao = "Zaffari"
        try modelo.salvar()

        let gravada = try #require(repositorio.salvas.first)
        #expect(gravada.hashDedup == Dedup.chave(
            carteiraID: gravada.carteiraID,
            tipo: .despesa,
            valor: gravada.valor,
            estabelecimento: "Zaffari"
        ))
    }

    @Test("salvar carimba o dispositivoID exigido pela seção 7 do spec")
    func carimbaDispositivo() throws {
        let repositorio = RepositorioFalso()
        let modelo = fazerModelo(repositorio: repositorio)
        modelo.entrada.digitar(9)
        try modelo.salvar()

        let gravada = try #require(repositorio.salvas.first)
        #expect(gravada.dispositivoID == IdentidadeLocal.dispositivoID)
    }

    @Test("valor zero não grava nada")
    func valorZeroNaoGrava() throws {
        let repositorio = RepositorioFalso()
        let modelo = fazerModelo(repositorio: repositorio)
        try modelo.salvar()
        #expect(repositorio.salvas.isEmpty)
    }

    @Test("as sugestões vêm do histórico e a primeira já sai selecionada")
    func sugestaoPreSelecionada() throws {
        let mercado = try #require(Categoria.padrao.first { $0.nome == "Mercado" })
        let repositorio = RepositorioFalso()
        repositorio.historico = [
            Transacao(
                carteiraID: UUID(), tipo: .despesa, valor: Money(centavos: 100),
                data: Date(), categoriaID: mercado.id, descricao: "Zaffari",
                criadoPor: UUID(), hashDedup: "k"
            )
        ]
        let modelo = fazerModelo(repositorio: repositorio)
        modelo.atualizarSugestoes(paraEstabelecimento: "Zaffari")

        #expect(modelo.categoriasSugeridas.first?.id == mercado.id)
        #expect(modelo.categoriaSelecionada?.id == mercado.id)
    }
}
