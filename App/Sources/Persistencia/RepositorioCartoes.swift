import CasalDomain
import Foundation
import SwiftData

protocol RepositorioCartoes {
    func salvarCartao(_ cartao: Cartao) throws
    func listarCartoes() throws -> [Cartao]
    /// Soft-delete: arquivado + removidoEm (espelha deleted_at SQL).
    func arquivarCartao(id: UUID) throws
    func salvarConta(_ conta: Conta) throws
    func listarContas() throws -> [Conta]
    /// Soft-delete: arquivada + removidoEm (espelha deleted_at SQL).
    func arquivarConta(id: UUID) throws
}

final class RepositorioCartoesSwiftData: RepositorioCartoes {
    private let contexto: ModelContext
    private let outbox: FilaOutbox

    init(contexto: ModelContext, outbox: FilaOutbox? = nil) {
        self.contexto = contexto
        self.outbox = outbox ?? OutboxFilaSwiftData(contexto: contexto)
    }

    /// Upsert por id via update-in-place. Seção 12: `removidoEm` local
    /// já setado prevalece sobre o domínio (não ressuscita).
    /// Enfileira insert ou update na outbox (iOS ainda sem Auth → sempre local).
    func salvarCartao(_ cartao: Cartao) throws {
        let alvo = cartao.id
        var descritor = FetchDescriptor<CartaoRegistro>(predicate: #Predicate { $0.id == alvo })
        descritor.fetchLimit = 1

        let existente = try contexto.fetch(descritor).first
        let jaExistia = existente != nil
        if let existente {
            existente.aplicar(dominio: cartao)
        } else {
            contexto.insert(CartaoRegistro(dominio: cartao))
        }

        let linha = OutboxPayload.linhaCartao(cartao)
        if jaExistia {
            try outbox.enfileirarUpdate(
                tabela: .cards,
                ids: [cartao.id.uuidString],
                patch: OutboxPayload.patchSemId(linha)
            )
        } else {
            try outbox.enfileirarInsert(tabela: .cards, linhas: [linha])
        }
        try contexto.save()
    }

    func listarCartoes() throws -> [Cartao] {
        let descritor = FetchDescriptor<CartaoRegistro>(
            predicate: #Predicate { $0.removidoEm == nil && $0.arquivado == false },
            sortBy: [SortDescriptor(\.apelido)]
        )
        return try contexto.fetch(descritor).map { $0.paraDominio() }
    }

    /// Soft-delete de cartão: arquivado + removidoEm (espelha deleted_at SQL).
    /// Fatura antiga continua no histórico — o registro nunca sai do store.
    /// Enfileira `soft_delete` cards.
    func arquivarCartao(id: UUID) throws {
        var descritor = FetchDescriptor<CartaoRegistro>(predicate: #Predicate { $0.id == id })
        descritor.fetchLimit = 1

        guard let registro = try contexto.fetch(descritor).first else { return }
        let agora = Date()
        registro.arquivado = true
        registro.removidoEm = agora
        registro.atualizadoEm = agora
        try outbox.enfileirarSoftDelete(
            tabela: .cards,
            ids: [id.uuidString],
            patch: OutboxPayload.patchSoftDeleteCartao(agora: agora)
        )
        try contexto.save()
    }

    /// Upsert por id via update-in-place. Seção 12: `removidoEm` local
    /// já setado prevalece sobre o domínio (não ressuscita).
    /// Enfileira insert ou update na outbox.
    func salvarConta(_ conta: Conta) throws {
        let alvo = conta.id
        var descritor = FetchDescriptor<ContaRegistro>(predicate: #Predicate { $0.id == alvo })
        descritor.fetchLimit = 1

        let existente = try contexto.fetch(descritor).first
        let jaExistia = existente != nil
        if let existente {
            existente.aplicar(dominio: conta)
        } else {
            contexto.insert(ContaRegistro(dominio: conta))
        }

        let linha = OutboxPayload.linhaConta(conta)
        if jaExistia {
            try outbox.enfileirarUpdate(
                tabela: .accounts,
                ids: [conta.id.uuidString],
                patch: OutboxPayload.patchSemId(linha)
            )
        } else {
            try outbox.enfileirarInsert(tabela: .accounts, linhas: [linha])
        }
        try contexto.save()
    }

    func listarContas() throws -> [Conta] {
        let descritor = FetchDescriptor<ContaRegistro>(
            predicate: #Predicate { $0.removidoEm == nil && $0.arquivada == false },
            sortBy: [SortDescriptor(\.nome)]
        )
        return try contexto.fetch(descritor).map { $0.paraDominio() }
    }

    /// Soft-delete de conta: marca arquivada + removidoEm (não apaga o registro).
    /// Enfileira `soft_delete` accounts.
    func arquivarConta(id: UUID) throws {
        var descritor = FetchDescriptor<ContaRegistro>(predicate: #Predicate { $0.id == id })
        descritor.fetchLimit = 1

        guard let registro = try contexto.fetch(descritor).first else { return }
        let agora = Date()
        registro.arquivada = true
        registro.removidoEm = agora
        registro.atualizadoEm = agora
        try outbox.enfileirarSoftDelete(
            tabela: .accounts,
            ids: [id.uuidString],
            patch: OutboxPayload.patchSoftDeleteConta(agora: agora)
        )
        try contexto.save()
    }
}
