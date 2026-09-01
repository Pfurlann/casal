import Foundation
import Testing
@testable import CasalDomain

@Suite("Money")
struct MoneyTests {
    @Test("soma e subtração operam em centavos")
    func aritmetica() {
        #expect(Money(centavos: 1050) + Money(centavos: 250) == Money(centavos: 1300))
        #expect(Money(centavos: 1050) - Money(centavos: 250) == Money(centavos: 800))
    }

    @Test("valor negativo é permitido e comparável")
    func comparacao() {
        #expect(Money(centavos: -500) < Money.zero)
        #expect(Money(centavos: 1) > Money.zero)
    }

    @Test("formata em real brasileiro")
    func formatacao() {
        let formatador = NumberFormatter()
        formatador.numberStyle = .currency
        formatador.currencyCode = "BRL"
        formatador.locale = Locale(identifier: "pt_BR")

        let esperado1234_56 = formatador.string(from: NSDecimalNumber(value: 1_234.56))!
        let esperado0 = formatador.string(from: NSDecimalNumber(value: 0))!

        #expect(Money(centavos: 123_456).formatadoBRL == esperado1234_56)
        #expect(Money.zero.formatadoBRL == esperado0)
    }
}
