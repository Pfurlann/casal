import CasalDomain
import Foundation
import Observation

enum AbaFatura: String, CaseIterable, Identifiable {
    case atual, proxima, futuras

    var id: String { rawValue }

    var titulo: String {
        switch self {
        case .atual: "Atual"
        case .proxima: "Próxima"
        case .futuras: "Futuras"
        }
    }
}

@Observable
final class CartaoDetalheModelo {
    private(set) var cartoes: [Cartao] = []
    var indiceSelecionado = 0
    var aba: AbaFatura = .atual

    private var todasAsTransacoes: [Transacao] = []
    private var referencia = Date()

    private let repositorioCartoes: RepositorioCartoes
    private let repositorioFaturas: RepositorioFaturas
    private let repositorioTransacoes: RepositorioTransacoes
    private let calendario: Calendar

    static let mesesFuturosExibidos = 4

    init(
        repositorioCartoes: RepositorioCartoes,
        repositorioFaturas: RepositorioFaturas,
        repositorioTransacoes: RepositorioTransacoes,
        calendario: Calendar = .current
    ) {
        self.repositorioCartoes = repositorioCartoes
        self.repositorioFaturas = repositorioFaturas
        self.repositorioTransacoes = repositorioTransacoes
        self.calendario = calendario
    }

    func recarregar(referencia: Date = Date()) {
        self.referencia = referencia
        cartoes = (try? repositorioCartoes.listarCartoes()) ?? []
        todasAsTransacoes = (try? repositorioTransacoes.listar(
            de: .distantPast, ate: .distantFuture
        )) ?? []
        if indiceSelecionado >= cartoes.count { indiceSelecionado = 0 }
    }

    var cartaoAtual: Cartao? {
        cartoes.indices.contains(indiceSelecionado) ? cartoes[indiceSelecionado] : nil
    }

    private var competenciaAtual: Competencia {
        Competencia(data: referencia, calendario: calendario)
    }

    /// Competência que a aba selecionada representa. `futuras` não tem uma
    /// competência única — é resumo, e devolve nil de propósito.
    private var competenciaDaAba: Competencia? {
        switch aba {
        case .atual: competenciaAtual
        case .proxima: competenciaAtual.avancando(meses: 1)
        case .futuras: nil
        }
    }

    var lancamentos: [Transacao] {
        guard let cartao = cartaoAtual, let competencia = competenciaDaAba else { return [] }
        return todasAsTransacoes
            .filter { transacao in
                transacao.cartaoID == cartao.id
                    && !transacao.estaRemovida
                    && transacao.tipo == .despesa
                    && CalendarioFatura.competencia(
                        deCompraEm: transacao.data, cartao: cartao, calendario: calendario
                    ) == competencia
            }
            .sorted { $0.data > $1.data }
    }

    var totalDaAba: Money {
        switch aba {
        case .atual, .proxima:
            lancamentos.reduce(Money.zero) { $0 + $1.valor }
        case .futuras:
            faturasFuturas.reduce(Money.zero) { $0 + $1.total }
        }
    }

    /// As competências depois da próxima. Começa em +2 porque +0 é a aba atual
    /// e +1 é a aba próxima.
    var faturasFuturas: [(competencia: Competencia, total: Money)] {
        guard let cartao = cartaoAtual else { return [] }
        let horizonte = HorizonteFaturas.proximas(
            2 + Self.mesesFuturosExibidos,
            desde: competenciaAtual,
            transacoes: todasAsTransacoes,
            cartao: cartao,
            calendario: calendario
        )
        return Array(horizonte.dropFirst(2))
    }

    /// Fatura da aba atual/próxima, para mostrar vencimento e status no
    /// cabeçalho. Nunca escreve: se ainda não existe linha persistida, monta
    /// uma versão transitória com os mesmos padrões que
    /// `RepositorioFaturas.faturaOuCriar` gravaria na primeira compra da
    /// competência — só que esta nunca é salva. Ler a tela de detalhe não é
    /// "uma compra precisando da competência".
    var faturaDaAbaAtual: Fatura? {
        guard let cartao = cartaoAtual, let competencia = competenciaDaAba else { return nil }
        let persistidas = (try? repositorioFaturas.listarFaturas(cartaoID: cartao.id)) ?? []
        if let existente = persistidas.first(where: { $0.competencia == competencia }) {
            return existente
        }
        return Fatura(
            cartaoID: cartao.id,
            competencia: competencia,
            fechaEm: CalendarioFatura.fechamento(
                competencia: competencia, cartao: cartao, calendario: calendario
            ),
            venceEm: CalendarioFatura.vencimento(
                competencia: competencia, cartao: cartao, calendario: calendario
            )
        )
    }
}
