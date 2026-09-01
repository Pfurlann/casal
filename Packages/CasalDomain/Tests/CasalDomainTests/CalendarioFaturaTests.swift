import Foundation
import Testing
@testable import CasalDomain

@Suite("CalendarioFatura")
struct CalendarioFaturaTests {
    private var calendario: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/Sao_Paulo")!
        return c
    }

    private func data(_ ano: Int, _ mes: Int, _ dia: Int, hora: Int = 12) -> Date {
        var partes = DateComponents()
        partes.year = ano
        partes.month = mes
        partes.day = dia
        partes.hour = hora
        return calendario.date(from: partes)!
    }

    private func cartao(fecha: Int, vence: Int) -> Cartao {
        Cartao(
            carteiraID: UUID(), apelido: "teste", banco: "banco", ultimos4: "0000",
            limite: Money(centavos: 1_000_000), diaFechamento: fecha, diaVencimento: vence
        )
    }

    @Test("compra antes do fechamento cai na fatura do próprio mês")
    func antesDoFechamento() {
        let c = cartao(fecha: 28, vence: 5)
        #expect(CalendarioFatura.competencia(deCompraEm: data(2026, 9, 10), cartao: c, calendario: calendario)
                == Competencia(ano: 2026, mes: 9))
    }

    @Test("compra no próprio dia do fechamento ainda entra na fatura daquele mês")
    func noDiaDoFechamento() {
        let c = cartao(fecha: 28, vence: 5)
        #expect(CalendarioFatura.competencia(deCompraEm: data(2026, 9, 28), cartao: c, calendario: calendario)
                == Competencia(ano: 2026, mes: 9))
    }

    @Test("compra depois do fechamento cai na fatura do mês seguinte")
    func depoisDoFechamento() {
        let c = cartao(fecha: 28, vence: 5)
        #expect(CalendarioFatura.competencia(deCompraEm: data(2026, 9, 29), cartao: c, calendario: calendario)
                == Competencia(ano: 2026, mes: 10))
    }

    @Test("compra depois do fechamento em dezembro vira o ano")
    func viradaDeAno() {
        let c = cartao(fecha: 28, vence: 5)
        #expect(CalendarioFatura.competencia(deCompraEm: data(2026, 12, 30), cartao: c, calendario: calendario)
                == Competencia(ano: 2027, mes: 1))
    }

    @Test("fechamento no dia 31 trunca para o último dia de fevereiro")
    func mesCurto() {
        let c = cartao(fecha: 31, vence: 10)
        let fechamento = CalendarioFatura.fechamento(
            competencia: Competencia(ano: 2026, mes: 2), cartao: c, calendario: calendario
        )
        let partes = calendario.dateComponents([.year, .month, .day], from: fechamento)
        #expect(partes.month == 2)
        #expect(partes.day == 28)
    }

    @Test("fechamento no dia 31 trunca para o último dia de abril, mês de 30 dias")
    func mesCurtoAbril() {
        let c = cartao(fecha: 31, vence: 10)
        let fechamento = CalendarioFatura.fechamento(
            competencia: Competencia(ano: 2026, mes: 4), cartao: c, calendario: calendario
        )
        let partes = calendario.dateComponents([.year, .month, .day], from: fechamento)
        #expect(partes.month == 4)
        #expect(partes.day == 30)
    }

    @Test("fechamento no dia 31 trunca para o dia 29 em fevereiro de ano bissexto")
    func mesCurtoFevereiroBissexto() {
        let c = cartao(fecha: 31, vence: 10)
        let fechamento = CalendarioFatura.fechamento(
            competencia: Competencia(ano: 2028, mes: 2), cartao: c, calendario: calendario
        )
        let partes = calendario.dateComponents([.year, .month, .day], from: fechamento)
        #expect(partes.month == 2)
        #expect(partes.day == 29)
    }

    @Test("vencimento maior que fechamento vence no mesmo mês")
    func venceNoMesmoMes() {
        let c = cartao(fecha: 2, vence: 10)
        let vencimento = CalendarioFatura.vencimento(
            competencia: Competencia(ano: 2026, mes: 9), cartao: c, calendario: calendario
        )
        let partes = calendario.dateComponents([.year, .month, .day], from: vencimento)
        #expect(partes.year == 2026)
        #expect(partes.month == 9)
        #expect(partes.day == 10)
    }

    @Test("vencimento menor ou igual ao fechamento vence no mês seguinte")
    func venceNoMesSeguinte() {
        let c = cartao(fecha: 28, vence: 5)
        let vencimento = CalendarioFatura.vencimento(
            competencia: Competencia(ano: 2026, mes: 9), cartao: c, calendario: calendario
        )
        let partes = calendario.dateComponents([.year, .month, .day], from: vencimento)
        #expect(partes.year == 2026)
        #expect(partes.month == 10)
        #expect(partes.day == 5)
    }

    @Test("vencimento de dezembro no mês seguinte vira o ano")
    func vencimentoViraAno() {
        let c = cartao(fecha: 28, vence: 5)
        let vencimento = CalendarioFatura.vencimento(
            competencia: Competencia(ano: 2026, mes: 12), cartao: c, calendario: calendario
        )
        let partes = calendario.dateComponents([.year, .month], from: vencimento)
        #expect(partes.year == 2027)
        #expect(partes.month == 1)
    }

    @Test("compra às 23h do dia do fechamento não escorrega para o mês seguinte")
    func bordaDeHorario() {
        let c = cartao(fecha: 28, vence: 5)
        #expect(CalendarioFatura.competencia(
            deCompraEm: data(2026, 9, 28, hora: 23), cartao: c, calendario: calendario
        ) == Competencia(ano: 2026, mes: 9))
    }
}
