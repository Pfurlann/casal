import Foundation

public struct Cartao: Identifiable, Hashable, Sendable {
    public let id: UUID
    public var carteiraID: UUID
    public var apelido: String
    public var banco: String
    public var bandeira: BandeiraCartao
    public var ultimos4: String
    public var cor: String
    public var limite: Money
    /// Dia do mês em que a fatura para de receber compras.
    public var diaFechamento: Int
    /// Dia do mês em que a fatura precisa ser paga. Pode ser antes ou depois
    /// do fechamento — a relação entre os dois decide em que mês ela vence.
    public var diaVencimento: Int
    /// Conta de onde o pagamento da fatura sai, quando já escolhida.
    public var contaPagamentoID: UUID?
    public var arquivado: Bool
    /// Espelho de `deleted_at` SQL / soft-delete local.
    public var removidoEm: Date?

    public init(
        id: UUID = UUID(),
        carteiraID: UUID,
        apelido: String,
        banco: String,
        bandeira: BandeiraCartao = .outra,
        ultimos4: String,
        cor: String = "#7C5CFF",
        limite: Money,
        diaFechamento: Int,
        diaVencimento: Int,
        contaPagamentoID: UUID? = nil,
        arquivado: Bool = false,
        removidoEm: Date? = nil
    ) {
        self.id = id
        self.carteiraID = carteiraID
        self.apelido = apelido
        self.banco = banco
        self.bandeira = bandeira
        self.ultimos4 = ultimos4
        self.cor = cor
        self.limite = limite
        self.diaFechamento = diaFechamento
        self.diaVencimento = diaVencimento
        self.contaPagamentoID = contaPagamentoID
        self.arquivado = arquivado
        self.removidoEm = removidoEm
    }

    public var estaRemovido: Bool { removidoEm != nil }

    public static func diaValido(_ dia: Int) -> Bool {
        (1...31).contains(dia)
    }
}
