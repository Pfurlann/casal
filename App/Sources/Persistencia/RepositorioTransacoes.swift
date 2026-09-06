import CasalDomain
import Foundation
import SwiftData

protocol RepositorioTransacoes {
    func salvar(_ transacao: Transacao) throws
    func remover(id: UUID) throws
    func listar(de inicio: Date, ate fim: Date) throws -> [Transacao]
    func historicoRecente(limite: Int) throws -> [Transacao]
}

final class RepositorioSwiftData: RepositorioTransacoes {
    private let contexto: ModelContext
    private let outbox: FilaOutbox

    init(contexto: ModelContext, outbox: FilaOutbox? = nil) {
        self.contexto = contexto
        self.outbox = outbox ?? OutboxFilaSwiftData(contexto: contexto)
    }

    /// Upsert por id via update-in-place. Seção 12: se o registro local já
    /// tem `removidoEm`, ele prevalece sobre o domínio recebido (apagar
    /// vence editar — não ressuscita).
    /// Enfileira insert ou update na outbox.
    func salvar(_ transacao: Transacao) throws {
        let alvo = transacao.id
        var descritor = FetchDescriptor<TransacaoRegistro>(
            predicate: #Predicate { $0.id == alvo }
        )
        descritor.fetchLimit = 1

        let existente = try contexto.fetch(descritor).first
        let jaExistia = existente != nil
        if let existente {
            existente.aplicar(dominio: transacao)
        } else {
            contexto.insert(TransacaoRegistro(dominio: transacao))
        }

        let linha = OutboxPayload.linhaTransacao(transacao)
        if jaExistia {
            try outbox.enfileirarUpdate(
                tabela: .transactions,
                ids: [transacao.id.uuidString],
                patch: OutboxPayload.patchSemId(linha)
            )
        } else {
            try outbox.enfileirarInsert(tabela: .transactions, linhas: [linha])
        }
        try contexto.save()
    }

    /// Soft-delete local + enfileira `soft_delete` transactions.
    func remover(id: UUID) throws {
        var descritor = FetchDescriptor<TransacaoRegistro>(
            predicate: #Predicate { $0.id == id }
        )
        descritor.fetchLimit = 1

        guard let registro = try contexto.fetch(descritor).first else { return }
        let agora = Date()
        registro.removidoEm = agora
        registro.atualizadoEm = agora
        try outbox.enfileirarSoftDelete(
            tabela: .transactions,
            ids: [id.uuidString],
            patch: OutboxPayload.patchSoftDeleteTransacao(agora: agora)
        )
        try contexto.save()
    }

    func listar(de inicio: Date, ate fim: Date) throws -> [Transacao] {
        let descritor = FetchDescriptor<TransacaoRegistro>(
            predicate: #Predicate { registro in
                registro.removidoEm == nil && registro.data >= inicio && registro.data < fim
            },
            sortBy: [SortDescriptor(\.data, order: .reverse)]
        )
        return try contexto.fetch(descritor).map { $0.paraDominio() }
    }

    func historicoRecente(limite: Int) throws -> [Transacao] {
        var descritor = FetchDescriptor<TransacaoRegistro>(
            predicate: #Predicate { $0.removidoEm == nil },
            sortBy: [SortDescriptor(\.data, order: .reverse)]
        )
        descritor.fetchLimit = limite
        return try contexto.fetch(descritor).map { $0.paraDominio() }
    }
}
