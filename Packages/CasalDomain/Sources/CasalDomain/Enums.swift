import Foundation

public enum TipoTransacao: String, Codable, Sendable, CaseIterable {
    case despesa, receita, transferencia
}

public enum OrigemTransacao: String, Codable, Sendable, CaseIterable {
    case manual
    case walletShortcut = "wallet_shortcut"
    case ofx
    case openFinance = "open_finance"
}

/// Estado canônico da transação (contrato iOS ↔ web ↔ SQL).
/// Valores persistidos: `liquidado` | `a_pagar`.
/// Legado iOS: `confirmada` → `liquidado`, `pendente` → `a_pagar`.
public enum EstadoTransacao: String, Codable, Sendable, CaseIterable {
    case liquidado
    case aPagar = "a_pagar"

    /// Aceita canônico e legado ao ler SwiftData / payloads antigos.
    public init(persistido bruto: String) {
        switch bruto {
        case "liquidado", "confirmada":
            self = .liquidado
        case "a_pagar", "pendente":
            self = .aPagar
        default:
            self = .liquidado
        }
    }
}

public enum TipoCategoria: String, Codable, Sendable, CaseIterable {
    case despesa, receita
}

public enum VisibilidadeCarteira: String, Codable, Sendable, CaseIterable {
    case aberta, resumo, fechada
}

public enum RotuloCarteira: String, Codable, Sendable, CaseIterable {
    case pessoal, compartilhada, pj
}

public enum StatusFatura: String, Codable, Sendable, CaseIterable {
    case aberta, fechada, parcial, paga
}

public enum TipoConta: String, Codable, Sendable, CaseIterable {
    case corrente, poupanca, dinheiro
}

public enum BandeiraCartao: String, Codable, Sendable, CaseIterable {
    case visa, mastercard, elo, amex, hipercard, outra
}
