import Foundation

public enum CalendarioFatura: Sendable {
    /// Em qual fatura uma compra cai. Se o dia da compra for menor ou igual ao
    /// dia de fechamento, ela entra na fatura que fecha naquele mês; senão, na
    /// do mês seguinte.
    public static func competencia(
        deCompraEm data: Date,
        cartao: Cartao,
        calendario: Calendar = .current
    ) -> Competencia {
        let dia = calendario.component(.day, from: data)
        let base = Competencia(data: data, calendario: calendario)
        return dia <= cartao.diaFechamento ? base : base.avancando(meses: 1)
    }

    /// Data de fechamento da competência. Meses curtos truncam: fechamento no
    /// dia 31 acontece no dia 28 ou 29 em fevereiro.
    public static func fechamento(
        competencia: Competencia,
        cartao: Cartao,
        calendario: Calendar = .current
    ) -> Date {
        diaDoMes(cartao.diaFechamento, competencia: competencia, calendario: calendario)
    }

    /// Data de vencimento da competência. Se o dia de vencimento for maior que
    /// o de fechamento, vence no mesmo mês (fecha 02, vence 10). Se for menor
    /// ou igual, vence no mês seguinte (fecha 28, vence 05).
    public static func vencimento(
        competencia: Competencia,
        cartao: Cartao,
        calendario: Calendar = .current
    ) -> Date {
        let alvo = cartao.diaVencimento > cartao.diaFechamento
            ? competencia
            : competencia.avancando(meses: 1)
        return diaDoMes(cartao.diaVencimento, competencia: alvo, calendario: calendario)
    }

    /// Resolve "dia N da competência", truncando para o último dia quando o
    /// mês é curto demais. A hora fica no início do dia, para que comparações
    /// de data não dependam do horário em que o cartão foi cadastrado.
    private static func diaDoMes(
        _ dia: Int,
        competencia: Competencia,
        calendario: Calendar
    ) -> Date {
        var partes = DateComponents()
        partes.year = competencia.ano
        partes.month = competencia.mes
        partes.day = 1
        let primeiroDia = calendario.date(from: partes) ?? Date(timeIntervalSince1970: 0)

        let diasNoMes = calendario.range(of: .day, in: .month, for: primeiroDia)?.count ?? 28
        partes.day = min(dia, diasNoMes)

        let resolvida = calendario.date(from: partes) ?? primeiroDia
        return calendario.startOfDay(for: resolvida)
    }
}
