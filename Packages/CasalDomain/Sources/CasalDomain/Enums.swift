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

public enum EstadoTransacao: String, Codable, Sendable, CaseIterable {
    case confirmada, pendente
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
