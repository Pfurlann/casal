import Foundation

/// Os três dados que acompanham toda criação de transação: em qual carteira,
/// por quem, e em que calendário. Andam sempre juntos, e passá-los como um
/// único valor torna impossível o erro de calcular a data de uma parcela num
/// fuso e derivar a competência dela noutro.
public struct ContextoDeLancamento: Hashable, Sendable {
    public let carteiraID: UUID
    public let criadoPor: UUID
    public let calendario: Calendar

    public init(carteiraID: UUID, criadoPor: UUID, calendario: Calendar) {
        self.carteiraID = carteiraID
        self.criadoPor = criadoPor
        self.calendario = calendario
    }
}
