import Foundation

/// Valor monetário em centavos. Nunca use ponto flutuante para dinheiro.
public struct Money: Hashable, Sendable, Comparable, Codable {
    public let centavos: Int

    public init(centavos: Int) {
        self.centavos = centavos
    }

    public static let zero = Money(centavos: 0)

    public static func + (lhs: Money, rhs: Money) -> Money {
        Money(centavos: lhs.centavos + rhs.centavos)
    }

    public static func - (lhs: Money, rhs: Money) -> Money {
        Money(centavos: lhs.centavos - rhs.centavos)
    }

    public static func < (lhs: Money, rhs: Money) -> Bool {
        lhs.centavos < rhs.centavos
    }

    public var formatadoBRL: String {
        let formatador = NumberFormatter()
        formatador.numberStyle = .currency
        formatador.currencyCode = "BRL"
        formatador.locale = Locale(identifier: "pt_BR")
        let valor = NSDecimalNumber(value: centavos).dividing(by: 100)
        return formatador.string(from: valor) ?? "R$ 0,00"
    }
}
