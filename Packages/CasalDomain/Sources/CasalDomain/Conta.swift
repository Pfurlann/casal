import Foundation

public struct Conta: Identifiable, Hashable, Sendable {
    public let id: UUID
    public var carteiraID: UUID
    public var nome: String
    public var tipo: TipoConta
    public var saldoInicial: Money
    public var arquivada: Bool
    /// Espelho de `deleted_at` SQL / soft-delete local.
    public var removidoEm: Date?

    public init(
        id: UUID = UUID(),
        carteiraID: UUID,
        nome: String,
        tipo: TipoConta = .corrente,
        saldoInicial: Money = .zero,
        arquivada: Bool = false,
        removidoEm: Date? = nil
    ) {
        self.id = id
        self.carteiraID = carteiraID
        self.nome = nome
        self.tipo = tipo
        self.saldoInicial = saldoInicial
        self.arquivada = arquivada
        self.removidoEm = removidoEm
    }

    public var estaRemovida: Bool { removidoEm != nil }
}
