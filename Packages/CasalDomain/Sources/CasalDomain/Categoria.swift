import Foundation

public struct Categoria: Identifiable, Hashable, Sendable {
    public let id: UUID
    public var carteiraID: UUID?
    public var nome: String
    public var icone: String
    public var cor: String
    public var paiID: UUID?
    public var tipo: TipoCategoria
    /// Campos de sincronização exigidos pela seção 7 do spec para toda
    /// tabela sincronizada. Sem lógica de sync ainda — só armazenamento.
    public var criadoEm: Date
    public var atualizadoEm: Date
    public var removidoEm: Date?
    public var dispositivoID: UUID?

    public init(
        id: UUID = UUID(),
        carteiraID: UUID? = nil,
        nome: String,
        icone: String,
        cor: String,
        paiID: UUID? = nil,
        tipo: TipoCategoria = .despesa,
        criadoEm: Date = Date(),
        atualizadoEm: Date = Date(),
        removidoEm: Date? = nil,
        dispositivoID: UUID? = nil
    ) {
        self.id = id
        self.carteiraID = carteiraID
        self.nome = nome
        self.icone = icone
        self.cor = cor
        self.paiID = paiID
        self.tipo = tipo
        self.criadoEm = criadoEm
        self.atualizadoEm = atualizadoEm
        self.removidoEm = removidoEm
        self.dispositivoID = dispositivoID
    }
}

public extension Categoria {
    /// Catálogo inicial. Existe para que o primeiro gasto possa ser
    /// registrado sem nenhuma configuração prévia.
    static let padrao: [Categoria] = [
        Categoria(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000001")!,
            nome: "Mercado", icone: "cart.fill", cor: "#34C759"
        ),
        Categoria(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000002")!,
            nome: "Restaurante", icone: "fork.knife", cor: "#FF9F0A"
        ),
        Categoria(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000003")!,
            nome: "Combustível", icone: "fuelpump.fill", cor: "#FF453A"
        ),
        Categoria(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000004")!,
            nome: "Transporte", icone: "car.fill", cor: "#0A84FF"
        ),
        Categoria(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000005")!,
            nome: "Moradia", icone: "house.fill", cor: "#5E5CE6"
        ),
        Categoria(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000006")!,
            nome: "Saúde", icone: "cross.case.fill", cor: "#FF375F"
        ),
        Categoria(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000007")!,
            nome: "Educação", icone: "book.fill", cor: "#64D2FF"
        ),
        Categoria(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000008")!,
            nome: "Lazer", icone: "gamecontroller.fill", cor: "#BF5AF2"
        ),
        Categoria(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000009")!,
            nome: "Assinaturas", icone: "repeat", cor: "#FFD60A"
        ),
        Categoria(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000010")!,
            nome: "Vestuário", icone: "tshirt.fill", cor: "#AC8E68"
        ),
        Categoria(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000011")!,
            nome: "Presentes", icone: "gift.fill", cor: "#FF6482"
        ),
        Categoria(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000012")!,
            nome: "Outros", icone: "ellipsis.circle.fill", cor: "#8E8E93"
        ),
        Categoria(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000013")!,
            nome: "Salário", icone: "banknote.fill", cor: "#30D158", tipo: .receita
        ),
        Categoria(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000014")!,
            nome: "Reembolso", icone: "arrow.uturn.left", cor: "#66D4CF", tipo: .receita
        )
    ]
}
