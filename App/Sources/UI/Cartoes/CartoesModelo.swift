import CasalDomain
import Foundation
import Observation

struct ResumoCartao: Hashable, Sendable {
    let faturaAtual: Money
    let proximaFatura: Money
    let limiteDisponivel: Money
    let fechaEm: Date
    let venceEm: Date
}

@Observable
final class CartoesModelo {
    private(set) var cartoes: [Cartao] = []
    private(set) var resumoPorCartao: [UUID: ResumoCartao] = [:]
    private(set) var totalDoMes: Money = .zero
    private(set) var curva: [(competencia: Competencia, total: Money)] = []

    static let mesesNoHorizonte = 6

    private let repositorioCartoes: RepositorioCartoes
    private let repositorioFaturas: RepositorioFaturas
    private let repositorioTransacoes: RepositorioTransacoes
    private let calendario: Calendar

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
        cartoes = (try? repositorioCartoes.listarCartoes()) ?? []

        // Todo o histórico, porque parcela futura tem data futura e o resumo
        // do mês corrente não a alcançaria.
        let transacoes = (try? repositorioTransacoes.listar(
            de: .distantPast, ate: .distantFuture
        )) ?? []

        let competenciaAtual = Competencia(data: referencia, calendario: calendario)
        var resumos: [UUID: ResumoCartao] = [:]
        var curvaAcumulada: [Competencia: Money] = [:]

        for cartao in cartoes {
            let horizonte = HorizonteFaturas.proximas(
                Self.mesesNoHorizonte,
                desde: competenciaAtual,
                transacoes: transacoes,
                cartao: cartao,
                calendario: calendario
            )
            for ponto in horizonte {
                curvaAcumulada[ponto.competencia, default: .zero] =
                    (curvaAcumulada[ponto.competencia] ?? .zero) + ponto.total
            }

            resumos[cartao.id] = resumo(
                de: cartao, horizonte: horizonte, competenciaAtual: competenciaAtual, transacoes: transacoes
            )
        }

        resumoPorCartao = resumos
        totalDoMes = resumos.values.reduce(Money.zero) { $0 + $1.faturaAtual }
        curva = (0..<Self.mesesNoHorizonte).map { passo in
            let competencia = competenciaAtual.avancando(meses: passo)
            return (competencia, curvaAcumulada[competencia] ?? .zero)
        }
    }

    /// Monta o resumo de um cartão a partir do horizonte já calculado.
    ///
    /// Não escreve nada: a fatura atual e a próxima entram no cálculo do
    /// limite mesmo quando ainda não foram persistidas, usando uma versão
    /// transitória (`faturaOuTransiente`) que nunca é salva. Uma fatura já
    /// persistida — paga ou parcial — sempre vence a transitória, porque só
    /// ela sabe o `valorPago` de verdade.
    private func resumo(
        de cartao: Cartao,
        horizonte: [(competencia: Competencia, total: Money)],
        competenciaAtual: Competencia,
        transacoes: [Transacao]
    ) -> ResumoCartao {
        let persistidas = (try? repositorioFaturas.listarFaturas(cartaoID: cartao.id)) ?? []
        let competenciaProxima = competenciaAtual.avancando(meses: 1)

        var faturas = persistidas
        for competencia in [competenciaAtual, competenciaProxima]
        where !persistidas.contains(where: { $0.competencia == competencia }) {
            faturas.append(faturaOuTransiente(cartao: cartao, competencia: competencia))
        }

        var totais: [UUID: Money] = [:]
        for fatura in faturas {
            totais[fatura.id] = repositorioFaturas.totalDaFatura(
                fatura, transacoes: transacoes, cartao: cartao, calendario: calendario
            )
        }
        // Comprometido além da fatura atual e da próxima: parcelas que só
        // vão virar fatura de verdade em meses futuros.
        let comprometidoFuturo = horizonte.dropFirst(2).reduce(Money.zero) { $0 + $1.total }

        return ResumoCartao(
            faturaAtual: horizonte.first?.total ?? .zero,
            proximaFatura: horizonte.count > 1 ? horizonte[1].total : .zero,
            limiteDisponivel: LimiteCartao.disponivel(
                cartao: cartao,
                faturas: faturas,
                totaisPorFatura: totais,
                parcelasFuturas: comprometidoFuturo
            ),
            fechaEm: CalendarioFatura.fechamento(
                competencia: competenciaAtual, cartao: cartao, calendario: calendario
            ),
            venceEm: CalendarioFatura.vencimento(
                competencia: competenciaAtual, cartao: cartao, calendario: calendario
            )
        )
    }

    /// Fatura de uma competência que ainda não foi persistida: mesmos campos
    /// e mesmos padrões (`status: .aberta`, `valorPago: .zero`) que
    /// `RepositorioFaturas.faturaOuCriar` grava na primeira compra da
    /// competência (`RepositorioFaturas.swift`) — só que esta nunca é salva.
    /// Ler a tela de Cartões não é "uma compra precisando da competência", e
    /// por isso não é o momento de gravar a fatura de verdade.
    private func faturaOuTransiente(cartao: Cartao, competencia: Competencia) -> Fatura {
        Fatura(
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
