import Foundation

public enum LimiteCartao: Sendable {
    /// Limite que sobra de verdade: o limite do cartão menos o saldo devedor
    /// de cada fatura ainda não paga, menos as parcelas futuras já
    /// comprometidas. Nunca negativo — limite estourado é zero disponível.
    ///
    /// `totaisPorFatura` traz o total de cada fatura, que é soma de
    /// transações e por isso vive na camada que tem acesso a elas.
    public static func disponivel(
        cartao: Cartao,
        faturas: [Fatura],
        totaisPorFatura: [UUID: Money],
        parcelasFuturas: Money
    ) -> Money {
        let devedor = faturas.reduce(Money.zero) { acumulado, fatura in
            guard fatura.status != .paga else { return acumulado }
            let total = totaisPorFatura[fatura.id] ?? .zero
            return acumulado + PagamentoFatura.saldoDevedor(fatura: fatura, total: total)
        }

        let restante = cartao.limite - devedor - parcelasFuturas
        return restante.centavos > 0 ? restante : .zero
    }
}
