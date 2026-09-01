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

    init(contexto: ModelContext) {
        self.contexto = contexto
    }

    // swiftlint:disable:next todo
    // TODO: este upsert é delete-then-insert, não update-in-place. Isso
    // descarta o `removidoEm` da linha antiga em favor do que vier na
    // `transacao` recebida. Não é só "perder um token de histórico": no
    // M3, quando o outbox reenviar uma escrita antiga depois que a linha
    // já foi apagada em outro device, esse delete+insert ressuscita a
    // transação — quebra direto a regra da seção 12 "apagar vence editar".
    // Precisa virar update-in-place que preserva removidoEm quando o
    // registro já está removido.
    /// Upsert por id. IDs são gerados no device, então gravar de novo a
    /// mesma transação precisa atualizar e nunca duplicar — é o que torna
    /// a sincronização do M3 segura contra retry.
    func salvar(_ transacao: Transacao) throws {
        let alvo = transacao.id
        var descritor = FetchDescriptor<TransacaoRegistro>(
            predicate: #Predicate { $0.id == alvo }
        )
        descritor.fetchLimit = 1

        if let existente = try contexto.fetch(descritor).first {
            contexto.delete(existente)
        }
        contexto.insert(TransacaoRegistro(dominio: transacao))
        try contexto.save()
    }

    func remover(id: UUID) throws {
        var descritor = FetchDescriptor<TransacaoRegistro>(
            predicate: #Predicate { $0.id == id }
        )
        descritor.fetchLimit = 1

        guard let registro = try contexto.fetch(descritor).first else { return }
        registro.removidoEm = Date()
        registro.atualizadoEm = Date()
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
