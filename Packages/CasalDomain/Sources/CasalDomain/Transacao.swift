import Foundation

public struct Transacao: Identifiable, Hashable, Sendable {
    public let id: UUID
    public var carteiraID: UUID
    public var tipo: TipoTransacao
    public var valor: Money
    public var data: Date
    public var categoriaID: UUID?
    public var descricao: String
    public var contaID: UUID?
    public var cartaoID: UUID?
    public var faturaID: UUID?
    public var criadoPor: UUID
    public var estado: EstadoTransacao
    public var origem: OrigemTransacao
    public var idExterno: String?
    public var hashDedup: String
    public var grupoParcela: UUID?
    public var parcelaN: Int
    public var parcelaTotal: Int
    public var criadoEm: Date
    public var atualizadoEm: Date
    public var removidoEm: Date?
    /// Seção 7 do spec: created_at/updated_at/deleted_at/device_id em toda
    /// tabela sincronizada. Sem lógica de sync ainda — só armazenamento.
    public var dispositivoID: UUID?

    public init(
        id: UUID = UUID(),
        carteiraID: UUID,
        tipo: TipoTransacao,
        valor: Money,
        data: Date,
        categoriaID: UUID? = nil,
        descricao: String = "",
        contaID: UUID? = nil,
        cartaoID: UUID? = nil,
        faturaID: UUID? = nil,
        criadoPor: UUID,
        estado: EstadoTransacao = .liquidado,
        origem: OrigemTransacao = .manual,
        idExterno: String? = nil,
        hashDedup: String,
        grupoParcela: UUID? = nil,
        parcelaN: Int = 1,
        parcelaTotal: Int = 1,
        criadoEm: Date = Date(),
        atualizadoEm: Date = Date(),
        removidoEm: Date? = nil,
        dispositivoID: UUID? = nil
    ) {
        self.id = id
        self.carteiraID = carteiraID
        self.tipo = tipo
        self.valor = valor
        self.data = data
        self.categoriaID = categoriaID
        self.descricao = descricao
        self.contaID = contaID
        self.cartaoID = cartaoID
        self.faturaID = faturaID
        self.criadoPor = criadoPor
        self.estado = estado
        self.origem = origem
        self.idExterno = idExterno
        self.hashDedup = hashDedup
        self.grupoParcela = grupoParcela
        self.parcelaN = parcelaN
        self.parcelaTotal = parcelaTotal
        self.criadoEm = criadoEm
        self.atualizadoEm = atualizadoEm
        self.removidoEm = removidoEm
        self.dispositivoID = dispositivoID
    }

    public var estaRemovida: Bool { removidoEm != nil }
}
