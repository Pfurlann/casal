import Foundation

public enum Dedup: Sendable {
    public static let janelaEmDias = 2

    /// Chave de agrupamento gravada em cada transação. Não inclui data:
    /// a mesma compra chega com datas diferentes conforme a fonte, então a
    /// data é tratada na comparação de candidatos, não na chave.
    public static func chave(
        carteiraID: UUID,
        valor: Money,
        estabelecimento: String
    ) -> String {
        "\(carteiraID.uuidString)|\(valor.centavos)|\(Estabelecimento.normalizar(estabelecimento))"
    }

    /// Marca dois candidatos como potenciais duplicatas para confirmação humana.
    /// Duas transações são a mesma compra quando compartilham a chave e
    /// caem dentro da janela de tolerância de datas. Transações removidas
    /// estão fora da comparação.
    ///
    /// INVARIANTE: Esta função marca candidatos, não executa merges ou descartes.
    /// Nunca ligar diretamente a um fluxo de descarte automático de transações.
    public static func saoDuplicatas(
        _ primeira: Transacao,
        _ segunda: Transacao,
        calendario: Calendar = Calendar(identifier: .gregorian)
    ) -> Bool {
        guard primeira.id != segunda.id else { return false }
        guard !primeira.estaRemovida, !segunda.estaRemovida else { return false }
        guard primeira.hashDedup == segunda.hashDedup else { return false }

        let dias = calendario.dateComponents(
            [.day],
            from: calendario.startOfDay(for: min(primeira.data, segunda.data)),
            to: calendario.startOfDay(for: max(primeira.data, segunda.data))
        ).day ?? Int.max

        return dias <= janelaEmDias
    }
}
