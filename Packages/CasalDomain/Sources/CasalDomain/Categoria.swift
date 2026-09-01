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

public extension Categoria {
    /// Catálogo inicial. Existe para que o primeiro gasto possa ser
    /// registrado sem nenhuma configuração prévia.
    static let padrao: [Categoria] = [
        Categoria(nome: "Mercado", icone: "cart.fill", cor: "#34C759"),
        Categoria(nome: "Restaurante", icone: "fork.knife", cor: "#FF9F0A"),
        Categoria(nome: "Combustível", icone: "fuelpump.fill", cor: "#FF453A"),
        Categoria(nome: "Transporte", icone: "car.fill", cor: "#0A84FF"),
        Categoria(nome: "Moradia", icone: "house.fill", cor: "#5E5CE6"),
        Categoria(nome: "Saúde", icone: "cross.case.fill", cor: "#FF375F"),
        Categoria(nome: "Educação", icone: "book.fill", cor: "#64D2FF"),
        Categoria(nome: "Lazer", icone: "gamecontroller.fill", cor: "#BF5AF2"),
        Categoria(nome: "Assinaturas", icone: "repeat", cor: "#FFD60A"),
        Categoria(nome: "Vestuário", icone: "tshirt.fill", cor: "#AC8E68"),
        Categoria(nome: "Presentes", icone: "gift.fill", cor: "#FF6482"),
        Categoria(nome: "Outros", icone: "ellipsis.circle.fill", cor: "#8E8E93"),
        Categoria(nome: "Salário", icone: "banknote.fill", cor: "#30D158", tipo: .receita),
        Categoria(nome: "Reembolso", icone: "arrow.uturn.left", cor: "#66D4CF", tipo: .receita)
    ]
}
