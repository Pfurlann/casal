import Foundation

public struct Carteira: Identifiable, Hashable, Sendable {
    public let id: UUID
    public var nome: String
    public var cor: String
    public var icone: String
    public var donoID: UUID
    public var visibilidade: VisibilidadeCarteira
    public var rotulo: RotuloCarteira
    public var arquivada: Bool

    public init(
        id: UUID = UUID(),
        nome: String,
        cor: String = "#7C5CFF",
        icone: String = "wallet.pass",
        donoID: UUID,
        visibilidade: VisibilidadeCarteira = .aberta,
        rotulo: RotuloCarteira = .pessoal,
        arquivada: Bool = false
    ) {
        self.id = id
        self.nome = nome
        self.cor = cor
        self.icone = icone
        self.donoID = donoID
        self.visibilidade = visibilidade
        self.rotulo = rotulo
        self.arquivada = arquivada
    }

    /// Carteira fechada é visível apenas ao dono, então admitir outro membro
    /// criaria um membro que não vê nada. A regra vive aqui e é reforçada
    /// no banco quando a sincronização existir (M3).
    public var aceitaMembros: Bool {
        visibilidade != .fechada
    }
}
