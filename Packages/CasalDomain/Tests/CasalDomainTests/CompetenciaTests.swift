import Foundation
import Testing
@testable import CasalDomain

@Suite("Competencia")
struct CompetenciaTests {
    @Test("avançar dentro do ano soma meses")
    func avancoSimples() {
        #expect(Competencia(ano: 2026, mes: 3).avancando(meses: 4) == Competencia(ano: 2026, mes: 7))
    }

    @Test("avançar cruzando dezembro vira o ano")
    func viradaDeAno() {
        #expect(Competencia(ano: 2026, mes: 11).avancando(meses: 3) == Competencia(ano: 2027, mes: 2))
        #expect(Competencia(ano: 2026, mes: 12).avancando(meses: 1) == Competencia(ano: 2027, mes: 1))
    }

    @Test("avançar doze meses cai no mesmo mês do ano seguinte")
    func dozeMeses() {
        #expect(Competencia(ano: 2026, mes: 5).avancando(meses: 12) == Competencia(ano: 2027, mes: 5))
    }

    @Test("avançar negativo retrocede")
    func retrocesso() {
        #expect(Competencia(ano: 2026, mes: 2).avancando(meses: -3) == Competencia(ano: 2025, mes: 11))
    }

    @Test("ordena por ano e depois por mês")
    func ordenacao() {
        #expect(Competencia(ano: 2026, mes: 1) < Competencia(ano: 2026, mes: 2))
        #expect(Competencia(ano: 2026, mes: 12) < Competencia(ano: 2027, mes: 1))
    }

    @Test("deriva de uma data no calendário do usuário")
    func deData() {
        var calendario = Calendar(identifier: .gregorian)
        calendario.timeZone = TimeZone(identifier: "America/Sao_Paulo")!
        var partes = DateComponents()
        partes.year = 2026
        partes.month = 8
        partes.day = 31
        partes.hour = 21
        let data = calendario.date(from: partes)!

        #expect(Competencia(data: data, calendario: calendario) == Competencia(ano: 2026, mes: 8))
    }

    @Test("rótulo curto usa três letras minúsculas do mês")
    func rotulo() {
        #expect(Competencia(ano: 2026, mes: 9).rotuloCurto == "set")
        #expect(Competencia(ano: 2026, mes: 1).rotuloCurto == "jan")
    }
}
