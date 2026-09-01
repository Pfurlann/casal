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
    var cartaoSelecionado: Cartao?
    var parcelas: Int = 1

    let carteira: Carteira
    let categorias: [Categoria]

    private let repositorio: RepositorioTransacoes
    private let repositorioCartoes: RepositorioCartoes
    private let autorID: UUID
    private let calendario: Calendar

    init(
        repositorio: RepositorioTransacoes,
        repositorioCartoes: RepositorioCartoes,
        carteira: Carteira,
        categorias: [Categoria],
        autorID: UUID,
        calendario: Calendar = .current
    ) {
        self.repositorio = repositorio
        self.repositorioCartoes = repositorioCartoes
        self.carteira = carteira
        self.categorias = categorias
        self.autorID = autorID
        self.calendario = calendario
        atualizarSugestoes(paraEstabelecimento: "")
    }

    /// Cartões elegíveis para "Pago com". Vazio quando o casal ainda não
    /// cadastrou nenhum — o lançamento continua funcionando em dinheiro.
    var cartoesDisponiveis: [Cartao] {
        (try? repositorioCartoes.listarCartoes()) ?? []
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

        // Parcelamento só existe dentro de um cartão: parcela sem fatura não
        // tem onde cair. Sem cartão escolhido, o lançamento é único.
        if let cartao = cartaoSelecionado, parcelas > 1 {
            try salvarParcelado(cartao: cartao)
        } else {
            try salvarUnico()
        }

        entrada.limpar()
        descricao = ""
        data = Date()
        parcelas = 1
        cartaoSelecionado = nil
    }

    private func salvarParcelado(cartao: Cartao) throws {
        let contexto = ContextoDeLancamento(
            carteiraID: carteira.id, criadoPor: autorID, calendario: calendario
        )
        let planejadas = Parcelamento.planejar(
            total: entrada.valor,
            vezes: parcelas,
            compraEm: data,
            cartao: cartao,
            contexto: contexto
        )
        let transacoes = Parcelamento.transacoes(
            de: planejadas,
            categoriaID: categoriaSelecionada?.id,
            descricao: descricao,
            cartao: cartao,
            contexto: contexto
        )
        for transacao in transacoes {
            try repositorio.salvar(transacao)
        }
    }

    private func salvarUnico() throws {
        let transacao = Transacao(
            carteiraID: carteira.id,
            tipo: .despesa,
            valor: entrada.valor,
            data: data,
            categoriaID: categoriaSelecionada?.id,
            descricao: descricao,
            cartaoID: cartaoSelecionado?.id,
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
    }
}
