import Foundation

public struct ResumoMensal: Hashable, Sendable {
    public let totalDespesas: Money
    public let totalReceitas: Money
    public let quantidade: Int

    public var saldo: Money { totalReceitas - totalDespesas }

    public init(totalDespesas: Money, totalReceitas: Money, quantidade: Int) {
        self.totalDespesas = totalDespesas
        self.totalReceitas = totalReceitas
        self.quantidade = quantidade
    }

    /// Agrega o período. Transferência nunca entra: mover dinheiro entre
    /// potes não é gasto nem ganho. Removidas e pendentes também ficam fora
    /// — pendente é captura ainda não confirmada por uma pessoa.
    public static func calcular(
        transacoes: [Transacao],
        de inicio: Date,
        ate fim: Date
    ) -> ResumoMensal {
        let elegiveis = transacoes.filter { transacao in
            !transacao.estaRemovida
                && transacao.estado == .confirmada
                && transacao.tipo != .transferencia
                && transacao.data >= inicio
                && transacao.data <= fim
        }

        let despesas = elegiveis
            .filter { $0.tipo == .despesa }
            .reduce(Money.zero) { $0 + $1.valor }

        let receitas = elegiveis
            .filter { $0.tipo == .receita }
            .reduce(Money.zero) { $0 + $1.valor }

        return ResumoMensal(
            totalDespesas: despesas,
            totalReceitas: receitas,
            quantidade: elegiveis.count
        )
    }
}
