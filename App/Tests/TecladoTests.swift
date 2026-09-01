import CasalDomain
import Testing
@testable import Casal

@Suite("EntradaValor")
struct TecladoTests {
    @Test("dígitos entram pela direita, como calculadora de caixa")
    func digitacao() {
        var entrada = EntradaValor()
        #expect(entrada.valor == Money.zero)

        entrada.digitar(4)
        #expect(entrada.valor == Money(centavos: 4))
        entrada.digitar(2)
        #expect(entrada.valor == Money(centavos: 42))
        entrada.digitar(0)
        #expect(entrada.valor == Money(centavos: 420))
        entrada.digitar(0)
        #expect(entrada.valor == Money(centavos: 4200))
    }

    @Test("apagar remove o último dígito")
    func apagar() {
        var entrada = EntradaValor()
        entrada.digitar(4)
        entrada.digitar(2)
        entrada.apagar()
        #expect(entrada.valor == Money(centavos: 4))
        entrada.apagar()
        #expect(entrada.valor == Money.zero)
        entrada.apagar()
        #expect(entrada.valor == Money.zero)
    }

    @Test("o valor tem teto para não aceitar digitação acidental infinita")
    func teto() {
        var entrada = EntradaValor()
        for _ in 0..<12 { entrada.digitar(9) }
        #expect(entrada.valor.centavos <= EntradaValor.tetoCentavos)
    }

    @Test("valor zerado é inválido para salvar")
    func validacao() {
        var entrada = EntradaValor()
        #expect(entrada.podeSalvar == false)
        entrada.digitar(1)
        #expect(entrada.podeSalvar == true)
    }
}
