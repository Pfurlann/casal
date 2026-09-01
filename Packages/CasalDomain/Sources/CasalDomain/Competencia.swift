import Foundation

/// Mês de referência de uma fatura. Guarda ano e mês, nunca dia, porque
/// fatura não pertence a uma data — pertence a um ciclo.
public struct Competencia: Hashable, Sendable, Comparable, Codable {
    public let ano: Int
    public let mes: Int

    public init(ano: Int, mes: Int) {
        self.ano = ano
        self.mes = mes
    }

    /// Deriva a competência de uma data no calendário do usuário. O calendário
    /// carrega o fuso, então uma compra às 21h do dia 31 em São Paulo fica no
    /// mês que o usuário viveu, não no mês em UTC.
    public init(data: Date, calendario: Calendar = .current) {
        let partes = calendario.dateComponents([.year, .month], from: data)
        ano = partes.year ?? 1
        mes = partes.month ?? 1
    }

    public static func < (lhs: Competencia, rhs: Competencia) -> Bool {
        (lhs.ano, lhs.mes) < (rhs.ano, rhs.mes)
    }

    public func avancando(meses: Int) -> Competencia {
        let totalZeroBase = (ano * 12 + (mes - 1)) + meses
        return Competencia(ano: totalZeroBase / 12, mes: totalZeroBase % 12 + 1)
    }

    private static let rotulos = [
        "jan", "fev", "mar", "abr", "mai", "jun",
        "jul", "ago", "set", "out", "nov", "dez"
    ]

    public var rotuloCurto: String {
        guard (1...12).contains(mes) else { return "?" }
        return Self.rotulos[mes - 1]
    }
}
