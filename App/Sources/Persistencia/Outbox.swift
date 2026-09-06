import CasalDomain
import Foundation
import SwiftData

// MARK: - Tipos (espelho web/src/lib/outbox.ts)

enum OpOutbox: String, Codable, Sendable {
    case insert
    case update
    case softDelete = "soft_delete"
}

enum TabelaOutbox: String, Codable, Sendable {
    case transactions
    case cards
    case accounts
    case invoices
    case commitments
}

/// Item em memória / contrato do drain (shape alinhado ao web `ItemOutbox`).
struct ItemOutbox: Equatable, Sendable {
    var id: UUID
    var criadoEm: Date
    var tentativas: Int
    var op: OpOutbox
    var tabela: TabelaOutbox
    /// insert: linhas SQL-shaped (chaves snake_case).
    var linhas: [[String: OutboxJSON]]
    /// update / soft_delete.
    var ids: [String]
    var patch: [String: OutboxJSON]

    init(
        id: UUID = UUID(),
        criadoEm: Date = Date(),
        tentativas: Int = 0,
        op: OpOutbox,
        tabela: TabelaOutbox,
        linhas: [[String: OutboxJSON]] = [],
        ids: [String] = [],
        patch: [String: OutboxJSON] = [:]
    ) {
        self.id = id
        self.criadoEm = criadoEm
        self.tentativas = tentativas
        self.op = op
        self.tabela = tabela
        self.linhas = linhas
        self.ids = ids
        self.patch = patch
    }
}

/// Valor JSON estável para payloads (sem `Any`).
enum OutboxJSON: Codable, Equatable, Sendable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
    case null

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null; return }
        if let v = try? c.decode(Bool.self) { self = .bool(v); return }
        if let v = try? c.decode(Int.self) { self = .int(v); return }
        if let v = try? c.decode(Double.self) { self = .double(v); return }
        if let v = try? c.decode(String.self) { self = .string(v); return }
        self = .null
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .string(let v): try c.encode(v)
        case .int(let v): try c.encode(v)
        case .double(let v): try c.encode(v)
        case .bool(let v): try c.encode(v)
        case .null: try c.encodeNil()
        }
    }
}

enum OutboxCodec {
    static let iso: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    static func isoString(_ date: Date) -> String {
        let s = iso.string(from: date)
        if !s.isEmpty { return s }
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f.string(from: date)
    }

    static func encodeLinhas(_ linhas: [[String: OutboxJSON]]) throws -> Data {
        try JSONEncoder().encode(linhas)
    }

    static func decodeLinhas(_ data: Data) throws -> [[String: OutboxJSON]] {
        try JSONDecoder().decode([[String: OutboxJSON]].self, from: data)
    }

    static func encodeIds(_ ids: [String]) throws -> Data {
        try JSONEncoder().encode(ids)
    }

    static func decodeIds(_ data: Data?) throws -> [String] {
        guard let data, !data.isEmpty else { return [] }
        return try JSONDecoder().decode([String].self, from: data)
    }

    static func encodePatch(_ patch: [String: OutboxJSON]) throws -> Data {
        try JSONEncoder().encode(patch)
    }

    static func decodePatch(_ data: Data?) throws -> [String: OutboxJSON] {
        guard let data, !data.isEmpty else { return [:] }
        return try JSONDecoder().decode([String: OutboxJSON].self, from: data)
    }
}

// MARK: - Payloads SQL-shaped (espelho web)

enum OutboxPayload {
    static func linhaConta(_ conta: Conta, atualizadoEm: Date = Date()) -> [String: OutboxJSON] {
        [
            "id": .string(conta.id.uuidString),
            "wallet_id": .string(conta.carteiraID.uuidString),
            "nome": .string(conta.nome),
            "tipo": .string(conta.tipo.rawValue),
            "saldo_inicial_centavos": .int(conta.saldoInicial.centavos),
            "arquivada": .bool(conta.arquivada),
            "updated_at": .string(OutboxCodec.isoString(atualizadoEm)),
        ]
    }

    static func linhaCartao(_ cartao: Cartao, atualizadoEm: Date = Date()) -> [String: OutboxJSON] {
        [
            "id": .string(cartao.id.uuidString),
            "wallet_id": .string(cartao.carteiraID.uuidString),
            "apelido": .string(cartao.apelido),
            "banco": .string(cartao.banco),
            "ultimos4": .string(cartao.ultimos4),
            "bandeira": .string(cartao.bandeira.rawValue),
            "cor": .string(cartao.cor),
            "limite_centavos": .int(cartao.limite.centavos),
            "dia_fechamento": .int(cartao.diaFechamento),
            "dia_vencimento": .int(cartao.diaVencimento),
            "arquivado": .bool(cartao.arquivado),
            "updated_at": .string(OutboxCodec.isoString(atualizadoEm)),
        ]
    }

    /// Espelho parcial de `linhaDaTransacao` web (campos presentes no domínio iOS).
    static func linhaTransacao(_ tx: Transacao) -> [String: OutboxJSON] {
        var linha: [String: OutboxJSON] = [
            "id": .string(tx.id.uuidString),
            "wallet_id": .string(tx.carteiraID.uuidString),
            "tipo": .string(tx.tipo.rawValue),
            "valor_centavos": .int(tx.valor.centavos),
            "data": .string(OutboxCodec.isoString(tx.data)),
            "descricao": .string(tx.descricao),
            "hash_dedup": .string(tx.hashDedup),
            "parcela_n": .int(tx.parcelaN),
            "parcela_total": .int(tx.parcelaTotal),
            "status": .string(tx.estado.rawValue),
            "updated_at": .string(OutboxCodec.isoString(tx.atualizadoEm)),
        ]
        linha["category_id"] = tx.categoriaID.map { .string($0.uuidString) } ?? .null
        linha["account_id"] = tx.contaID.map { .string($0.uuidString) } ?? .null
        linha["card_id"] = tx.cartaoID.map { .string($0.uuidString) } ?? .null
        linha["invoice_id"] = tx.faturaID.map { .string($0.uuidString) } ?? .null
        linha["grupo_parcela"] = tx.grupoParcela.map { .string($0.uuidString) } ?? .null
        if let dispositivo = tx.dispositivoID {
            linha["device_id"] = .string(dispositivo.uuidString)
        }
        return linha
    }

    static func patchSemId(_ linha: [String: OutboxJSON]) -> [String: OutboxJSON] {
        var patch = linha
        patch.removeValue(forKey: "id")
        return patch
    }

    static func patchSoftDeleteConta(agora: Date) -> [String: OutboxJSON] {
        [
            "deleted_at": .string(OutboxCodec.isoString(agora)),
            "arquivada": .bool(true),
            "updated_at": .string(OutboxCodec.isoString(agora)),
        ]
    }

    static func patchSoftDeleteCartao(agora: Date) -> [String: OutboxJSON] {
        [
            "deleted_at": .string(OutboxCodec.isoString(agora)),
            "arquivado": .bool(true),
            "updated_at": .string(OutboxCodec.isoString(agora)),
        ]
    }

    static func patchSoftDeleteTransacao(agora: Date) -> [String: OutboxJSON] {
        [
            "deleted_at": .string(OutboxCodec.isoString(agora)),
            "updated_at": .string(OutboxCodec.isoString(agora)),
        ]
    }
}

// MARK: - Fila persistente

protocol FilaOutbox: AnyObject {
    @discardableResult
    func enfileirar(_ item: ItemOutbox) throws -> ItemOutbox
    func listar() throws -> [ItemOutbox]
    func remover(id: UUID) throws
    func tamanho() throws -> Int
}

extension FilaOutbox {
    @discardableResult
    func enfileirarInsert(tabela: TabelaOutbox, linhas: [[String: OutboxJSON]]) throws -> ItemOutbox {
        precondition(!linhas.isEmpty, "insert exige linhas")
        return try enfileirar(ItemOutbox(op: .insert, tabela: tabela, linhas: linhas))
    }

    @discardableResult
    func enfileirarUpdate(tabela: TabelaOutbox, ids: [String], patch: [String: OutboxJSON]) throws -> ItemOutbox {
        precondition(!ids.isEmpty, "update exige ids")
        precondition(!patch.isEmpty, "update exige patch")
        return try enfileirar(ItemOutbox(op: .update, tabela: tabela, ids: ids, patch: patch))
    }

    @discardableResult
    func enfileirarSoftDelete(tabela: TabelaOutbox, ids: [String], patch: [String: OutboxJSON]) throws -> ItemOutbox {
        precondition(!ids.isEmpty, "soft_delete exige ids")
        precondition(!patch.isEmpty, "soft_delete exige patch")
        return try enfileirar(ItemOutbox(op: .softDelete, tabela: tabela, ids: ids, patch: patch))
    }
}

final class OutboxFilaSwiftData: FilaOutbox {
    private let contexto: ModelContext

    init(contexto: ModelContext) {
        self.contexto = contexto
    }

    @discardableResult
    func enfileirar(_ item: ItemOutbox) throws -> ItemOutbox {
        let registro = OutboxItemRegistro()
        registro.id = item.id
        registro.criadoEm = item.criadoEm
        registro.tentativas = item.tentativas
        registro.opBruto = item.op.rawValue
        registro.tabelaBruta = item.tabela.rawValue
        registro.linhasJSON = try OutboxCodec.encodeLinhas(item.linhas)
        registro.idsJSON = item.ids.isEmpty ? nil : try OutboxCodec.encodeIds(item.ids)
        registro.patchJSON = item.patch.isEmpty ? nil : try OutboxCodec.encodePatch(item.patch)
        contexto.insert(registro)
        // Não salva sozinho — o repositório chama `contexto.save()` após mutar + enfileirar.
        return item
    }

    func listar() throws -> [ItemOutbox] {
        let descritor = FetchDescriptor<OutboxItemRegistro>(
            sortBy: [SortDescriptor(\.criadoEm)]
        )
        return try contexto.fetch(descritor).map { try $0.paraItem() }
    }

    func remover(id: UUID) throws {
        var descritor = FetchDescriptor<OutboxItemRegistro>(predicate: #Predicate { $0.id == id })
        descritor.fetchLimit = 1
        guard let registro = try contexto.fetch(descritor).first else { return }
        contexto.delete(registro)
    }

    func tamanho() throws -> Int {
        try listar().reduce(0) { parcial, item in
            if item.op == .insert { return parcial + item.linhas.count }
            return parcial + item.ids.count
        }
    }
}

extension OutboxItemRegistro {
    func paraItem() throws -> ItemOutbox {
        ItemOutbox(
            id: id,
            criadoEm: criadoEm,
            tentativas: tentativas,
            op: OpOutbox(rawValue: opBruto) ?? .insert,
            tabela: TabelaOutbox(rawValue: tabelaBruta) ?? .transactions,
            linhas: try OutboxCodec.decodeLinhas(linhasJSON),
            ids: try OutboxCodec.decodeIds(idsJSON),
            patch: try OutboxCodec.decodePatch(patchJSON)
        )
    }
}

// MARK: - Drain (contrato / stub — sem Auth/Supabase real)

/// Sessão necessária para o drain falar com o remoto. Hoje sempre ausente no iOS.
protocol ProvedorSessaoSync: Sendable {
    /// `nil` ⇒ sem Auth; drain não envia.
    var userId: String? { get }
}

struct SessaoSyncAusente: ProvedorSessaoSync {
    var userId: String? { nil }
}

/// Cliente remoto (Supabase) — real fica pra quando Auth existir.
protocol ClienteSyncRemoto: Sendable {
    /// Aplica um item (insert/update/soft_delete) no backend. Idempotente como o drain web.
    func aplicar(item: ItemOutbox) async throws
}

struct ResultadoDrain: Equatable, Sendable {
    var enviados: Int
    var restam: Int
    /// `nil` se drenou (ou fila vazia). Senão: `sem_sessao` | `cliente_remoto_ausente`.
    var motivoParada: String?
}

protocol DrenadorOutbox: AnyObject {
    func drenar() async throws -> ResultadoDrain
}

/// Stub: fila local pronta; não fala com rede.
/// - Sem sessão → para com `sem_sessao` (não remove itens).
/// - Com sessão mas sem `ClienteSyncRemoto` → `cliente_remoto_ausente`.
/// - Com ambos → aplica FIFO, remove ok, incrementa `tentativas` em falha (como web).
final class DrenadorOutboxStub: DrenadorOutbox {
    private let fila: FilaOutbox
    private let sessao: ProvedorSessaoSync
    private let cliente: (any ClienteSyncRemoto)?

    init(
        fila: FilaOutbox,
        sessao: ProvedorSessaoSync = SessaoSyncAusente(),
        cliente: (any ClienteSyncRemoto)? = nil
    ) {
        self.fila = fila
        self.sessao = sessao
        self.cliente = cliente
    }

    func drenar() async throws -> ResultadoDrain {
        let pendentes = try fila.listar()
        let restamAgora = try fila.tamanho()
        guard !pendentes.isEmpty else {
            return ResultadoDrain(enviados: 0, restam: 0, motivoParada: nil)
        }
        guard sessao.userId != nil else {
            return ResultadoDrain(enviados: 0, restam: restamAgora, motivoParada: "sem_sessao")
        }
        guard let cliente else {
            return ResultadoDrain(enviados: 0, restam: restamAgora, motivoParada: "cliente_remoto_ausente")
        }

        var enviados = 0
        for item in pendentes {
            do {
                try await cliente.aplicar(item: item)
                try fila.remover(id: item.id)
                enviados += item.op == .insert ? item.linhas.count : item.ids.count
            } catch {
                // Incrementa tentativas no registro persistido.
                try incrementarTentativas(id: item.id)
            }
        }
        // Persiste remoções / tentativas.
        if let sd = fila as? OutboxFilaSwiftData {
            try sd.persistir()
        }
        return ResultadoDrain(enviados: enviados, restam: try fila.tamanho(), motivoParada: nil)
    }

    private func incrementarTentativas(id: UUID) throws {
        guard let sd = fila as? OutboxFilaSwiftData else { return }
        try sd.incrementarTentativas(id: id)
    }
}

extension OutboxFilaSwiftData {
    func persistir() throws {
        try contexto.save()
    }

    func incrementarTentativas(id: UUID) throws {
        var descritor = FetchDescriptor<OutboxItemRegistro>(predicate: #Predicate { $0.id == id })
        descritor.fetchLimit = 1
        guard let registro = try contexto.fetch(descritor).first else { return }
        registro.tentativas += 1
    }
}
