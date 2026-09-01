import Testing
@testable import CasalDomain

@Suite("Money.dividir")
struct MoneyDivisaoTests {
    @Test("divisão exata reparte igual")
    func exata() {
        #expect(Money(centavos: 30_000).dividir(em: 3) == [
            Money(centavos: 10_000), Money(centavos: 10_000), Money(centavos: 10_000)
        ])
    }

    @Test("a sobra vai para a primeira parcela")
    func sobraNaPrimeira() {
        #expect(Money(centavos: 10_000).dividir(em: 3) == [
            Money(centavos: 3334), Money(centavos: 3333), Money(centavos: 3333)
        ])
    }

    @Test("sobra de dois centavos também fica inteira na primeira")
    func sobraDeDois() {
        #expect(Money(centavos: 10_001).dividir(em: 3) == [
            Money(centavos: 3335), Money(centavos: 3333), Money(centavos: 3333)
        ])
    }

    @Test("a soma das parcelas é sempre igual ao total")
    func somaPreservada() {
        for total in [1, 7, 99, 100, 10_000, 10_001, 123_457] {
            for partes in 1...24 {
                let parcelas = Money(centavos: total).dividir(em: partes)
                #expect(parcelas.count == partes)
                #expect(parcelas.reduce(Money.zero, +) == Money(centavos: total))
            }
        }
    }

    @Test("dividir em uma parte devolve o próprio valor")
    func umaParte() {
        #expect(Money(centavos: 4242).dividir(em: 1) == [Money(centavos: 4242)])
    }

    @Test("zero ou negativo de partes devolve lista vazia em vez de estourar")
    func partesInvalidas() {
        #expect(Money(centavos: 100).dividir(em: 0).isEmpty)
        #expect(Money(centavos: 100).dividir(em: -3).isEmpty)
    }

    @Test("valor menor que o número de parcelas não gera parcela negativa")
    func valorMinusculo() {
        let parcelas = Money(centavos: 2).dividir(em: 5)
        #expect(parcelas.reduce(Money.zero, +) == Money(centavos: 2))
        #expect(parcelas.allSatisfy { $0.centavos >= 0 })
    }
}
