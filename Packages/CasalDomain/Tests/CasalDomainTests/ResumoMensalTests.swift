import Foundation
import Testing
@testable import CasalDomain

@Suite("ResumoMensal")
struct ResumoMensalTests {
    let carteira = UUID()
    let autor = UUID()

    private func dia(_ n: Int) -> Date {
        Date(timeIntervalSince1970: TimeInterval(n * 86_400))
    }

    private func fazer(
        _ tipo: TipoTransacao,
        _ centavos: Int,
        dia n: Int,
        estado: EstadoTransacao = .liquidado,
        removida: Bool = false
    ) -> Transacao {
        Transacao(
            carteiraID: carteira,
            tipo: tipo,
            valor: Money(centavos: centavos),
            data: dia(n),
            criadoPor: autor,
            estado: estado,
            hashDedup: UUID().uuidString,
            removidoEm: removida ? Date() : nil
        )
    }

    @Test("soma despesas e receitas do período e devolve o saldo")
    func somaBasica() {
        let resumo = ResumoMensal.calcular(
            transacoes: [
                fazer(.despesa, 4200, dia: 5),
                fazer(.despesa, 800, dia: 6),
                fazer(.receita, 10_000, dia: 1)
            ],
            de: dia(0),
            ate: dia(30)
        )
        #expect(resumo.totalDespesas == Money(centavos: 5000))
        #expect(resumo.totalReceitas == Money(centavos: 10_000))
        #expect(resumo.saldo == Money(centavos: 5000))
        #expect(resumo.quantidade == 3)
    }

    @Test("transferência não entra em despesa nem em receita")
    func transferenciaNaoConta() {
        let resumo = ResumoMensal.calcular(
            transacoes: [
                fazer(.despesa, 4200, dia: 5),
                fazer(.transferencia, 100_000, dia: 5)
            ],
            de: dia(0),
            ate: dia(30)
        )
        #expect(resumo.totalDespesas == Money(centavos: 4200))
        #expect(resumo.totalReceitas == Money.zero)
        #expect(resumo.quantidade == 1)
    }

    @Test("transação removida é ignorada")
    func removidaIgnorada() {
        let resumo = ResumoMensal.calcular(
            transacoes: [
                fazer(.despesa, 4200, dia: 5),
                fazer(.despesa, 9900, dia: 5, removida: true)
            ],
            de: dia(0),
            ate: dia(30)
        )
        #expect(resumo.totalDespesas == Money(centavos: 4200))
    }

    @Test("a_pagar não entra no resumo até ser liquidado")
    func aPagarIgnorada() {
        let resumo = ResumoMensal.calcular(
            transacoes: [
                fazer(.despesa, 4200, dia: 5),
                fazer(.despesa, 8740, dia: 5, estado: .aPagar)
            ],
            de: dia(0),
            ate: dia(30)
        )
        #expect(resumo.totalDespesas == Money(centavos: 4200))
    }

    @Test("o período é meio-aberto: início incluído, fim excluído")
    func limitesDoPeriodo() {
        let resumo = ResumoMensal.calcular(
            transacoes: [
                fazer(.despesa, 100, dia: 10),
                fazer(.despesa, 200, dia: 20),
                fazer(.despesa, 400, dia: 21)
            ],
            de: dia(10),
            ate: dia(20)
        )
        #expect(resumo.totalDespesas == Money(centavos: 100))
    }

    @Test("transação exatamente em fim é excluída; um segundo antes é incluída")
    func fronteiraDoFim() {
        let fim = dia(20)
        let noFim = Transacao(
            carteiraID: carteira,
            tipo: .despesa,
            valor: Money(centavos: 500),
            data: fim,
            criadoPor: autor,
            hashDedup: UUID().uuidString
        )
        let umSegundoAntes = Transacao(
            carteiraID: carteira,
            tipo: .despesa,
            valor: Money(centavos: 700),
            data: fim.addingTimeInterval(-1),
            criadoPor: autor,
            hashDedup: UUID().uuidString
        )

        let resumo = ResumoMensal.calcular(
            transacoes: [noFim, umSegundoAntes],
            de: dia(10),
            ate: fim
        )
        #expect(resumo.totalDespesas == Money(centavos: 700))
        #expect(resumo.quantidade == 1)
    }

    @Test("lista vazia devolve resumo zerado")
    func vazio() {
        let resumo = ResumoMensal.calcular(transacoes: [], de: dia(0), ate: dia(30))
        #expect(resumo.totalDespesas == Money.zero)
        #expect(resumo.saldo == Money.zero)
        #expect(resumo.quantidade == 0)
    }
}
