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

    /// Upsert por id via update-in-place. Seção 12: se o registro local já
    /// tem `removidoEm`, ele prevalece sobre o domínio recebido (apagar
    /// vence editar — não ressuscita).
    func salvar(_ transacao: Transacao) throws {
        let alvo = transacao.id
        var descritor = FetchDescriptor<TransacaoRegistro>(
            predicate: #Predicate { $0.id == alvo }
        )
        descritor.fetchLimit = 1

        if let existente = try contexto.fetch(descritor).first {
            existente.aplicar(dominio: transacao)
        } else {
            contexto.insert(TransacaoRegistro(dominio: transacao))
        }
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
