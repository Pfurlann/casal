import Foundation

public struct ParcelaPlanejada: Hashable, Sendable {
    public let competencia: Competencia
    public let valor: Money
    public let numero: Int
    public let total: Int

    public init(competencia: Competencia, valor: Money, numero: Int, total: Int) {
        self.competencia = competencia
        self.valor = valor
        self.numero = numero
        self.total = total
    }
}

public enum Parcelamento: Sendable {
    /// Distribui uma compra em `vezes` parcelas, uma por competência
    /// consecutiva a partir da fatura em que a compra cai.
    ///
    /// `calendario` não tem valor padrão de propósito: o mesmo calendário
    /// precisa ser passado depois para `transacoes(de:...)`, que reconstrói a
    /// data de fechamento de cada parcela a partir da competência calculada
    /// aqui. Um padrão silencioso deixaria as duas chamadas divergirem sem
    /// erro de compilação, e uma parcela cairia no mês errado sem aviso.
    public static func planejar(
        total: Money,
        vezes: Int,
        compraEm data: Date,
        cartao: Cartao,
        calendario: Calendar
    ) -> [ParcelaPlanejada] {
        guard vezes > 0 else { return [] }

        let primeira = CalendarioFatura.competencia(
            deCompraEm: data, cartao: cartao, calendario: calendario
        )
        let valores = total.dividir(em: vezes)

        return valores.enumerated().map { indice, valor in
            ParcelaPlanejada(
                competencia: primeira.avancando(meses: indice),
                valor: valor,
                numero: indice + 1,
                total: vezes
            )
        }
    }

    /// Materializa as parcelas como transações de despesa. Todas compartilham
    /// um `grupoParcela`, para que editar ou estornar uma não quebre as outras.
    ///
    /// O `hashDedup` inclui o número da parcela: sem isso, doze parcelas de
    /// mesmo valor no mesmo estabelecimento colidiriam entre si na detecção de
    /// duplicata, e onze parcelas legítimas pareceriam repetição.
    ///
    /// `calendario` não tem valor padrão de propósito: precisa ser o mesmo
    /// calendário usado em `planejar(...)` para gerar `parcelas`. Se
    /// divergirem, a data de fechamento estampada aqui é calculada num fuso
    /// diferente do que decidiu o mês da competência, e a parcela pode cair
    /// silenciosamente no mês errado.
    public static func transacoes(
        de parcelas: [ParcelaPlanejada],
        carteiraID: UUID,
        categoriaID: UUID?,
        descricao: String,
        criadoPor: UUID,
        cartao: Cartao,
        calendario: Calendar
    ) -> [Transacao] {
        guard !parcelas.isEmpty else { return [] }
        let grupo = UUID()

        return parcelas.map { parcela in
            let dataDaParcela = CalendarioFatura.fechamento(
                competencia: parcela.competencia, cartao: cartao, calendario: calendario
            )
            let chaveBase = Dedup.chave(
                carteiraID: carteiraID,
                tipo: .despesa,
                valor: parcela.valor,
                estabelecimento: descricao
            )
            return Transacao(
                carteiraID: carteiraID,
                tipo: .despesa,
                valor: parcela.valor,
                data: dataDaParcela,
                categoriaID: categoriaID,
                descricao: descricao,
                cartaoID: cartao.id,
                criadoPor: criadoPor,
                hashDedup: "\(chaveBase)|p\(parcela.numero)de\(parcela.total)",
                grupoParcela: grupo,
                parcelaN: parcela.numero,
                parcelaTotal: parcela.total
            )
        }
    }
}
