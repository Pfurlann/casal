import CasalDomain
import Foundation
import SwiftData

protocol RepositorioCartoes {
    func salvarCartao(_ cartao: Cartao) throws
    func listarCartoes() throws -> [Cartao]
    func arquivarCartao(id: UUID) throws
    func salvarConta(_ conta: Conta) throws
    func listarContas() throws -> [Conta]
}

final class RepositorioCartoesSwiftData: RepositorioCartoes {
    private let contexto: ModelContext

    init(contexto: ModelContext) {
        self.contexto = contexto
    }

    /// Upsert por id, mesmo padrão do repositório de transações: IDs são
    /// gerados no device, então gravar de novo o mesmo cartão atualiza.
    func salvarCartao(_ cartao: Cartao) throws {
        let alvo = cartao.id
        var descritor = FetchDescriptor<CartaoRegistro>(predicate: #Predicate { $0.id == alvo })
        descritor.fetchLimit = 1

        if let existente = try contexto.fetch(descritor).first {
            contexto.delete(existente)
        }
        contexto.insert(CartaoRegistro(dominio: cartao))
        try contexto.save()
    }

    func listarCartoes() throws -> [Cartao] {
        let descritor = FetchDescriptor<CartaoRegistro>(
            predicate: #Predicate { $0.removidoEm == nil && $0.arquivado == false },
            sortBy: [SortDescriptor(\.apelido)]
        )
        return try contexto.fetch(descritor).map { $0.paraDominio() }
    }

    /// Arquivar é o "apagar" de cartão: a fatura antiga continua existindo e
    /// precisa continuar somando no histórico, então o registro nunca sai.
    func arquivarCartao(id: UUID) throws {
        var descritor = FetchDescriptor<CartaoRegistro>(predicate: #Predicate { $0.id == id })
        descritor.fetchLimit = 1

        guard let registro = try contexto.fetch(descritor).first else { return }
        registro.arquivado = true
        registro.atualizadoEm = Date()
        try contexto.save()
    }

    func salvarConta(_ conta: Conta) throws {
        let alvo = conta.id
        var descritor = FetchDescriptor<ContaRegistro>(predicate: #Predicate { $0.id == alvo })
        descritor.fetchLimit = 1

        if let existente = try contexto.fetch(descritor).first {
            contexto.delete(existente)
        }
        contexto.insert(ContaRegistro(dominio: conta))
        try contexto.save()
    }

    func listarContas() throws -> [Conta] {
        let descritor = FetchDescriptor<ContaRegistro>(
            predicate: #Predicate { $0.removidoEm == nil && $0.arquivada == false },
            sortBy: [SortDescriptor(\.nome)]
        )
        return try contexto.fetch(descritor).map { $0.paraDominio() }
    }
}
