import Foundation

public enum HorizonteFaturas: Sendable {
    /// Total por competência para as próximas `quantidade` faturas do cartão,
    /// a partir de `inicio`. Competência sem lançamento vem com zero em vez de
    /// faltar, para que a curva desenhada na tela não desalinhe o eixo.
    public static func proximas(
        _ quantidade: Int,
        desde inicio: Competencia,
        transacoes: [Transacao],
        cartao: Cartao,
        calendario: Calendar = .current
    ) -> [(competencia: Competencia, total: Money)] {
        guard quantidade > 0 else { return [] }

        let doCartao = transacoes.filter { transacao in
            transacao.cartaoID == cartao.id
                && !transacao.estaRemovida
                && transacao.tipo == .despesa
        }

        var somaPorCompetencia: [Competencia: Money] = [:]
        for transacao in doCartao {
            let competencia = CalendarioFatura.competencia(
                deCompraEm: transacao.data, cartao: cartao, calendario: calendario
            )
            somaPorCompetencia[competencia, default: .zero] =
                (somaPorCompetencia[competencia] ?? .zero) + transacao.valor
        }

        return (0..<quantidade).map { passo in
            let competencia = inicio.avancando(meses: passo)
            return (competencia, somaPorCompetencia[competencia] ?? .zero)
        }
    }
}
