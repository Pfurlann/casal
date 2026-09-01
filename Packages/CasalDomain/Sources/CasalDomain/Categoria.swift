import Foundation

public struct Categoria: Identifiable, Hashable, Sendable {
    public let id: UUID
    public var carteiraID: UUID?
    public var nome: String
    public var icone: String
    public var cor: String
    public var paiID: UUID?
    public var tipo: TipoCategoria

    public init(
        id: UUID = UUID(),
        carteiraID: UUID? = nil,
        nome: String,
        icone: String,
        cor: String,
        paiID: UUID? = nil,
        tipo: TipoCategoria = .despesa
    ) {
        self.id = id
        self.carteiraID = carteiraID
        self.nome = nome
        self.icone = icone
        self.cor = cor
        self.paiID = paiID
        self.tipo = tipo
    }
}
