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

    // swiftlint:disable:next todo
    // TODO: este upsert é delete-then-insert, não update-in-place. Isso
    // descarta o `removidoEm` da linha antiga em favor do que vier no
    // `cartao` recebido. No M3, quando o outbox reenviar uma escrita antiga
    // depois que a linha já foi apagada em outro device, esse delete+insert
    // ressuscita o cartão — quebra direto a regra da seção 12 "apagar vence
    // editar". Hoje é inalcançável porque ainda não existe soft-delete de
    // cartão; precisa virar update-in-place que preserva removidoEm quando
    // o registro já está removido.
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

    // swiftlint:disable:next todo
    // TODO: este upsert é delete-then-insert, não update-in-place. Isso
    // descarta o `removidoEm` da linha antiga em favor do que vier na
    // `conta` recebida. No M3, quando o outbox reenviar uma escrita antiga
    // depois que a linha já foi apagada em outro device, esse delete+insert
    // ressuscita a conta — quebra direto a regra da seção 12 "apagar vence
    // editar". Hoje é inalcançável porque ainda não existe soft-delete de
    // conta; precisa virar update-in-place que preserva removidoEm quando
    // o registro já está removido.
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
