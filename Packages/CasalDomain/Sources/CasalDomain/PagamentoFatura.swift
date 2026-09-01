import Foundation

public enum PagamentoFatura: Sendable {
    /// Aplica um pagamento à fatura, acumulando sobre o que já foi pago.
    /// Pagamento que cobre o total marca `paga`; parcial marca `parcial`.
    /// Pagar acima do total não gera crédito — este app registra o que
    /// aconteceu, não simula financiamento.
    public static func aplicar(
        pagamento: Money,
        em fatura: Fatura,
        totalDaFatura total: Money
    ) -> Fatura {
        guard pagamento.centavos > 0 else { return fatura }

        var resultado = fatura
        resultado.valorPago = fatura.valorPago + pagamento
        resultado.status = resultado.valorPago < total ? .parcial : .paga
        return resultado
    }

    /// Quanto ainda falta pagar. Nunca negativo.
    public static func saldoDevedor(fatura: Fatura, total: Money) -> Money {
        let restante = total - fatura.valorPago
        return restante.centavos > 0 ? restante : .zero
    }

    /// A transação que representa o pagamento. É `.transferencia` por decisão
    /// de domínio: a despesa já foi registrada quando a compra aconteceu, e
    /// contar o pagamento como despesa dobraria o mês.
    public static func transacao(
        valor: Money,
        faturaID: UUID,
        contaID: UUID,
        contexto: ContextoDeLancamento,
        data: Date
    ) -> Transacao {
        Transacao(
            carteiraID: contexto.carteiraID,
            tipo: .transferencia,
            valor: valor,
            data: data,
            categoriaID: nil,
            descricao: "Pagamento de fatura",
            contaID: contaID,
            faturaID: faturaID,
            criadoPor: contexto.criadoPor,
            hashDedup: "pagamento|\(faturaID.uuidString)|\(valor.centavos)"
        )
    }
}
