import Foundation

public struct Fatura: Identifiable, Hashable, Sendable {
    public let id: UUID
    public var cartaoID: UUID
    public var competencia: Competencia
    public var fechaEm: Date
    public var venceEm: Date
    public var status: StatusFatura
    public var valorPago: Money

    public init(
        id: UUID = UUID(),
        cartaoID: UUID,
        competencia: Competencia,
        fechaEm: Date,
        venceEm: Date,
        status: StatusFatura = .aberta,
        valorPago: Money = .zero
    ) {
        self.id = id
        self.cartaoID = cartaoID
        self.competencia = competencia
        self.fechaEm = fechaEm
        self.venceEm = venceEm
        self.status = status
        self.valorPago = valorPago
    }
}
