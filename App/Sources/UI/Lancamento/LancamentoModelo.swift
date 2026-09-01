import CasalDomain
import Foundation
import Observation

@Observable
final class LancamentoModelo: Identifiable {
    let id = UUID()
    var entrada = EntradaValor()
    var categoriaSelecionada: Categoria?
    var descricao: String = ""
    var data: Date = Date()
    var categoriasSugeridas: [Categoria] = []

    let carteira: Carteira
    let categorias: [Categoria]

    private let repositorio: RepositorioTransacoes
    private let autorID: UUID

    init(
        repositorio: RepositorioTransacoes,
        carteira: Carteira,
        categorias: [Categoria],
        autorID: UUID
    ) {
        self.repositorio = repositorio
        self.carteira = carteira
        self.categorias = categorias
        self.autorID = autorID
        atualizarSugestoes(paraEstabelecimento: "")
    }

    /// Recalcula os chips e já seleciona o mais provável, para que o caso
    /// comum seja digitar o valor e tocar em salvar.
    func atualizarSugestoes(paraEstabelecimento estabelecimento: String) {
        let historico = (try? repositorio.historicoRecente(limite: 300)) ?? []
        let ids = SugestaoCategoria.sugerir(
            paraEstabelecimento: estabelecimento,
            historico: historico,
            limite: 3
        )

        let sugeridas = ids.compactMap { id in categorias.first { $0.id == id } }
        let despesasPadrao = categorias.filter { $0.tipo == .despesa }.prefix(3)
        categoriasSugeridas = sugeridas.isEmpty ? Array(despesasPadrao) : sugeridas

        if categoriaSelecionada == nil {
            categoriaSelecionada = categoriasSugeridas.first
        }
    }

    func salvar() throws {
        guard entrada.podeSalvar else { return }

        let transacao = Transacao(
            carteiraID: carteira.id,
            tipo: .despesa,
            valor: entrada.valor,
            data: data,
            categoriaID: categoriaSelecionada?.id,
            descricao: descricao,
            criadoPor: autorID,
            hashDedup: Dedup.chave(
                carteiraID: carteira.id,
                tipo: .despesa,
                valor: entrada.valor,
                estabelecimento: descricao
            ),
            dispositivoID: IdentidadeLocal.dispositivoID
        )

        try repositorio.salvar(transacao)
        entrada.limpar()
        descricao = ""
        data = Date()
    }
}
