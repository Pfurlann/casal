import CasalDomain
import Foundation
import SwiftData

protocol RepositorioFaturas {
    func faturaOuCriar(cartao: Cartao, competencia: Competencia, calendario: Calendar) throws -> Fatura
    func listarFaturas(cartaoID: UUID) throws -> [Fatura]
    func atualizarFatura(_ fatura: Fatura) throws
    func totalDaFatura(
        _ fatura: Fatura, transacoes: [Transacao], cartao: Cartao, calendario: Calendar
    ) -> Money
}

final class RepositorioFaturasSwiftData: RepositorioFaturas {
    private let contexto: ModelContext

    init(contexto: ModelContext) {
        self.contexto = contexto
    }

    /// Fatura nasce sob demanda, na primeira vez que alguma compra precisa da
    /// competência. Criar as doze faturas futuras adiantado geraria fatura
    /// vazia que o usuário veria sem entender, e fatura órfã se o cartão
    /// mudasse de dia de fechamento.
    func faturaOuCriar(
        cartao: Cartao,
        competencia: Competencia,
        calendario: Calendar = .current
    ) throws -> Fatura {
        let cartaoAlvo = cartao.id
        let ano = competencia.ano
        let mes = competencia.mes

        var descritor = FetchDescriptor<FaturaRegistro>(
            predicate: #Predicate { registro in
                registro.cartaoID == cartaoAlvo
                    && registro.competenciaAno == ano
                    && registro.competenciaMes == mes
                    && registro.removidoEm == nil
            }
        )
        descritor.fetchLimit = 1

        if let existente = try contexto.fetch(descritor).first {
            return existente.paraDominio()
        }

        let nova = Fatura(
            cartaoID: cartao.id,
            competencia: competencia,
            fechaEm: CalendarioFatura.fechamento(
                competencia: competencia, cartao: cartao, calendario: calendario
            ),
            venceEm: CalendarioFatura.vencimento(
                competencia: competencia, cartao: cartao, calendario: calendario
            )
        )
        contexto.insert(FaturaRegistro(dominio: nova))
        try contexto.save()
        return nova
    }

    func listarFaturas(cartaoID: UUID) throws -> [Fatura] {
        let descritor = FetchDescriptor<FaturaRegistro>(
            predicate: #Predicate { $0.cartaoID == cartaoID && $0.removidoEm == nil },
            sortBy: [
                SortDescriptor(\.competenciaAno),
                SortDescriptor(\.competenciaMes)
            ]
        )
        return try contexto.fetch(descritor).map { $0.paraDominio() }
    }

    func atualizarFatura(_ fatura: Fatura) throws {
        let alvo = fatura.id
        var descritor = FetchDescriptor<FaturaRegistro>(predicate: #Predicate { $0.id == alvo })
        descritor.fetchLimit = 1

        guard let registro = try contexto.fetch(descritor).first else { return }
        registro.statusBruto = fatura.status.rawValue
        registro.valorPagoCentavos = fatura.valorPago.centavos
        registro.fechaEm = fatura.fechaEm
        registro.venceEm = fatura.venceEm
        registro.atualizadoEm = Date()
        try contexto.save()
    }

    /// Total de uma fatura é soma de transações, não campo gravado: gravar o
    /// total abriria a porta para ele divergir das transações que o compõem.
    func totalDaFatura(
        _ fatura: Fatura,
        transacoes: [Transacao],
        cartao: Cartao,
        calendario: Calendar = .current
    ) -> Money {
        transacoes
            .filter { transacao in
                transacao.cartaoID == cartao.id
                    && !transacao.estaRemovida
                    && transacao.tipo == .despesa
                    && CalendarioFatura.competencia(
                        deCompraEm: transacao.data, cartao: cartao, calendario: calendario
                    ) == fatura.competencia
            }
            .reduce(Money.zero) { $0 + $1.valor }
    }
}
