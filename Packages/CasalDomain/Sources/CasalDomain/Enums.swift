import Foundation

public enum TipoTransacao: String, Codable, Sendable, CaseIterable {
    case despesa, receita, transferencia
}

public enum OrigemTransacao: String, Codable, Sendable, CaseIterable {
    case manual, walletShortcut, ofx, openFinance
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
