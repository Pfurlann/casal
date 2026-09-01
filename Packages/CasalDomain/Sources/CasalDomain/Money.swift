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
        formatador.locale = Locale(identifier: "pt_BR")
        formatador.currencyCode = "BRL"
        let valor = NSDecimalNumber(value: centavos).dividing(by: 100)
        return formatador.string(from: valor) ?? "R$ 0,00"
    }

    /// Reparte o valor em `partes` parcelas. A sobra da divisão inteira vai
    /// integralmente para a PRIMEIRA parcela, que é como o cartão de crédito
    /// brasileiro faz: R$ 100,00 em 3x são 33,34 + 33,33 + 33,33.
    ///
    /// A soma das parcelas devolvidas é sempre exatamente igual ao total.
    public func dividir(em partes: Int) -> [Money] {
        guard partes > 0 else { return [] }

        let base = centavos / partes
        let primeira = centavos - base * (partes - 1)

        var parcelas = [Money(centavos: primeira)]
        parcelas.append(contentsOf: repeatElement(Money(centavos: base), count: partes - 1))
        return parcelas
    }
}
