import CasalDomain
import Foundation
import SwiftData
import Testing
@testable import Casal

@Suite("Outbox local iOS")
struct OutboxTests {
    private func contexto() throws -> ModelContext {
        ModelContext(try SchemaCasal.container(emMemoria: true))
    }

    private func cartao() -> Cartao {
        Cartao(
            carteiraID: UUID(), apelido: "Nosso", banco: "Nubank", ultimos4: "4417",
            limite: Money(centavos: 800_000), diaFechamento: 28, diaVencimento: 5
        )
    }

    private func transacao() -> Transacao {
        Transacao(
            carteiraID: UUID(),
            tipo: .despesa,
            valor: Money(centavos: 4200),
            data: Date(timeIntervalSince1970: 1_700_000_000),
            descricao: "Zaffari",
            criadoPor: UUID(),
            hashDedup: "k4200"
        )
    }

    @Test("salvar cartão novo enfileira insert cards")
    func salvarCartaoInsert() throws {
        let ctx = try contexto()
        let repo = RepositorioCartoesSwiftData(contexto: ctx)
        let alvo = cartao()
        try repo.salvarCartao(alvo)

        let fila = try OutboxFilaSwiftData(contexto: ctx).listar()
        #expect(fila.count == 1)
        #expect(fila[0].op == .insert)
        #expect(fila[0].tabela == .cards)
        #expect(fila[0].linhas.count == 1)
        #expect(fila[0].linhas[0]["id"] == .string(alvo.id.uuidString))
        #expect(fila[0].linhas[0]["apelido"] == .string("Nosso"))
        #expect(fila[0].linhas[0]["limite_centavos"] == .int(800_000))
    }

    @Test("salvar cartão existente enfileira update cards")
    func salvarCartaoUpdate() throws {
        let ctx = try contexto()
        let repo = RepositorioCartoesSwiftData(contexto: ctx)
        var alvo = cartao()
        try repo.salvarCartao(alvo)
        alvo.apelido = "Renovo"
        alvo.limite = Money(centavos: 1_000_000)
        try repo.salvarCartao(alvo)

        let fila = try OutboxFilaSwiftData(contexto: ctx).listar()
        #expect(fila.count == 2)
        #expect(fila[1].op == .update)
        #expect(fila[1].tabela == .cards)
        #expect(fila[1].ids == [alvo.id.uuidString])
        #expect(fila[1].patch["apelido"] == .string("Renovo"))
        #expect(fila[1].patch["id"] == nil)
    }

    @Test("arquivar cartão enfileira soft_delete cards")
    func arquivarCartaoSoftDelete() throws {
        let ctx = try contexto()
        let repo = RepositorioCartoesSwiftData(contexto: ctx)
        let alvo = cartao()
        try repo.salvarCartao(alvo)
        try repo.arquivarCartao(id: alvo.id)

        let fila = try OutboxFilaSwiftData(contexto: ctx).listar()
        let soft = fila.last
        #expect(soft?.op == .softDelete)
        #expect(soft?.tabela == .cards)
        #expect(soft?.ids == [alvo.id.uuidString])
        #expect(soft?.patch["arquivado"] == .bool(true))
        if case .string(let deleted)? = soft?.patch["deleted_at"] {
            #expect(!deleted.isEmpty)
        } else {
            Issue.record("deleted_at ausente")
        }
    }

    @Test("salvar/arquivar conta enfileira insert e soft_delete accounts")
    func contaOutbox() throws {
        let ctx = try contexto()
        let repo = RepositorioCartoesSwiftData(contexto: ctx)
        let conta = Conta(carteiraID: UUID(), nome: "Corrente", saldoInicial: Money(centavos: 10_000))
        try repo.salvarConta(conta)
        try repo.arquivarConta(id: conta.id)

        let fila = try OutboxFilaSwiftData(contexto: ctx).listar()
        #expect(fila.count == 2)
        #expect(fila[0].op == .insert && fila[0].tabela == .accounts)
        #expect(fila[1].op == .softDelete && fila[1].tabela == .accounts)
        #expect(fila[1].patch["arquivada"] == .bool(true))
    }

    @Test("salvar/remover transação enfileira insert e soft_delete transactions")
    func transacaoOutbox() throws {
        let ctx = try contexto()
        let repo = RepositorioSwiftData(contexto: ctx)
        let tx = transacao()
        try repo.salvar(tx)
        try repo.remover(id: tx.id)

        let fila = try OutboxFilaSwiftData(contexto: ctx).listar()
        #expect(fila.count == 2)
        #expect(fila[0].op == .insert && fila[0].tabela == .transactions)
        #expect(fila[0].linhas[0]["valor_centavos"] == .int(4200))
        #expect(fila[0].linhas[0]["status"] == .string("liquidado"))
        #expect(fila[1].op == .softDelete && fila[1].tabela == .transactions)
        #expect(fila[1].ids == [tx.id.uuidString])
    }

    @Test("outbox persiste entre aberturas do store")
    func persistenciaFila() throws {
        let url = URL.temporaryDirectory.appending(path: "\(UUID()).store")
        let alvo = cartao()

        do {
            let c1 = try SchemaCasal.container(url: url)
            try RepositorioCartoesSwiftData(contexto: ModelContext(c1)).salvarCartao(alvo)
        }

        let c2 = try SchemaCasal.container(url: url)
        let fila = try OutboxFilaSwiftData(contexto: ModelContext(c2)).listar()
        #expect(fila.count == 1)
        #expect(fila[0].tabela == .cards)
        #expect(fila[0].linhas[0]["id"] == .string(alvo.id.uuidString))
    }

    @Test("drain stub sem sessão não remove itens")
    func drainSemSessao() async throws {
        let ctx = try contexto()
        let fila = OutboxFilaSwiftData(contexto: ctx)
        try fila.enfileirarInsert(
            tabela: .cards,
            linhas: [OutboxPayload.linhaCartao(cartao())]
        )
        try ctx.save()

        let drenador = DrenadorOutboxStub(fila: fila, sessao: SessaoSyncAusente())
        let resultado = try await drenador.drenar()
        #expect(resultado.enviados == 0)
        #expect(resultado.restam == 1)
        #expect(resultado.motivoParada == "sem_sessao")
        #expect(try fila.listar().count == 1)
    }

    @Test("drain stub com sessão sem cliente remoto não envia")
    func drainSemCliente() async throws {
        struct SessaoFalsa: ProvedorSessaoSync {
            var userId: String? { "user-teste" }
        }
        let ctx = try contexto()
        let fila = OutboxFilaSwiftData(contexto: ctx)
        try fila.enfileirarInsert(
            tabela: .accounts,
            linhas: [OutboxPayload.linhaConta(Conta(carteiraID: UUID(), nome: "X"))]
        )
        try ctx.save()

        let drenador = DrenadorOutboxStub(fila: fila, sessao: SessaoFalsa(), cliente: nil)
        let resultado = try await drenador.drenar()
        #expect(resultado.motivoParada == "cliente_remoto_ausente")
        #expect(try fila.listar().count == 1)
    }

    @Test("tamanho conta linhas/ids como web")
    func tamanhoOutbox() throws {
        let ctx = try contexto()
        let fila = OutboxFilaSwiftData(contexto: ctx)
        try fila.enfileirarInsert(
            tabela: .transactions,
            linhas: [
                OutboxPayload.linhaTransacao(transacao()),
                OutboxPayload.linhaTransacao(transacao()),
            ]
        )
        try fila.enfileirarSoftDelete(
            tabela: .transactions,
            ids: [UUID().uuidString],
            patch: OutboxPayload.patchSoftDeleteTransacao(agora: Date())
        )
        try ctx.save()
        #expect(try fila.tamanho() == 3)
    }
}
