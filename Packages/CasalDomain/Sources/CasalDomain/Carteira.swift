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
    /// Campos de sincronização exigidos pela seção 7 do spec para toda
    /// tabela sincronizada. Sem lógica de sync ainda — só armazenamento.
    public var criadoEm: Date
    public var atualizadoEm: Date
    public var removidoEm: Date?
    public var dispositivoID: UUID?

    public init(
        id: UUID = UUID(),
        nome: String,
        cor: String = "#7C5CFF",
        icone: String = "wallet.pass",
        donoID: UUID,
        visibilidade: VisibilidadeCarteira = .aberta,
        rotulo: RotuloCarteira = .pessoal,
        arquivada: Bool = false,
        criadoEm: Date = Date(),
        atualizadoEm: Date = Date(),
        removidoEm: Date? = nil,
        dispositivoID: UUID? = nil
    ) {
        self.id = id
        self.nome = nome
        self.cor = cor
        self.icone = icone
        self.donoID = donoID
        self.visibilidade = visibilidade
        self.rotulo = rotulo
        self.arquivada = arquivada
        self.criadoEm = criadoEm
        self.atualizadoEm = atualizadoEm
        self.removidoEm = removidoEm
        self.dispositivoID = dispositivoID
    }

    /// Carteira fechada é visível apenas ao dono, então admitir outro membro
    /// criaria um membro que não vê nada. A regra vive aqui e é reforçada
    /// no banco quando a sincronização existir (M3).
    public var aceitaMembros: Bool {
        visibilidade != .fechada
    }
}
