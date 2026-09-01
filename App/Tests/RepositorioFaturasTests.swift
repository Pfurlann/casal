import CasalDomain
import Foundation
import SwiftData
import Testing
@testable import Casal

@Suite("RepositorioFaturasSwiftData")
struct RepositorioFaturasTests {
    private var calendario: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/Sao_Paulo")!
        return c
    }

    private func repositorio() throws -> RepositorioFaturasSwiftData {
        RepositorioFaturasSwiftData(contexto: ModelContext(try SchemaCasal.container(emMemoria: true)))
    }

    private var cartao: Cartao {
        Cartao(
            carteiraID: UUID(), apelido: "Nosso", banco: "Nubank", ultimos4: "4417",
            limite: Money(centavos: 800_000), diaFechamento: 28, diaVencimento: 5
        )
    }

    @Test("a fatura é criada na primeira vez que a competência é pedida")
    func criaSobDemanda() throws {
        let repo = try repositorio()
        let fatura = try repo.faturaOuCriar(
            cartao: cartao, competencia: Competencia(ano: 2026, mes: 9), calendario: calendario
        )
        #expect(fatura.competencia == Competencia(ano: 2026, mes: 9))
        #expect(fatura.status == .aberta)
        #expect(fatura.valorPago == Money.zero)
    }

    @Test("pedir a mesma competência duas vezes devolve a MESMA fatura, não duas")
    func naoDuplica() throws {
        let repo = try repositorio()
        let meuCartao = cartao
        let primeira = try repo.faturaOuCriar(
            cartao: meuCartao, competencia: Competencia(ano: 2026, mes: 9), calendario: calendario
        )
        let segunda = try repo.faturaOuCriar(
            cartao: meuCartao, competencia: Competencia(ano: 2026, mes: 9), calendario: calendario
        )
        #expect(primeira.id == segunda.id)
        #expect(try repo.listarFaturas(cartaoID: meuCartao.id).count == 1)
    }

    @Test("a fatura criada já vem com fechamento e vencimento calculados")
    func datasCalculadas() throws {
        let repo = try repositorio()
        let fatura = try repo.faturaOuCriar(
            cartao: cartao, competencia: Competencia(ano: 2026, mes: 9), calendario: calendario
        )
        let fecha = calendario.dateComponents([.month, .day], from: fatura.fechaEm)
        let vence = calendario.dateComponents([.month, .day], from: fatura.venceEm)
        #expect(fecha.month == 9)
        #expect(fecha.day == 28)
        // fecha 28 / vence 5 => vence no mês seguinte
        #expect(vence.month == 10)
        #expect(vence.day == 5)
    }

    @Test("dois cartões podem ter fatura da mesma competência sem colidir")
    func isolamentoPorCartao() throws {
        let repo = try repositorio()
        let a = cartao
        let b = Cartao(
            carteiraID: UUID(), apelido: "Outro", banco: "Itau", ultimos4: "9999",
            limite: Money(centavos: 500_000), diaFechamento: 10, diaVencimento: 20
        )
        _ = try repo.faturaOuCriar(cartao: a, competencia: Competencia(ano: 2026, mes: 9), calendario: calendario)
        _ = try repo.faturaOuCriar(cartao: b, competencia: Competencia(ano: 2026, mes: 9), calendario: calendario)

        #expect(try repo.listarFaturas(cartaoID: a.id).count == 1)
        #expect(try repo.listarFaturas(cartaoID: b.id).count == 1)
    }

    @Test("atualizar a fatura persiste status e valor pago")
    func atualizar() throws {
        let repo = try repositorio()
        let meuCartao = cartao
        var fatura = try repo.faturaOuCriar(
            cartao: meuCartao, competencia: Competencia(ano: 2026, mes: 9), calendario: calendario
        )
        fatura = PagamentoFatura.aplicar(
            pagamento: Money(centavos: 100_000), em: fatura, totalDaFatura: Money(centavos: 284_730)
        )
        try repo.atualizarFatura(fatura)

        let recarregada = try repo.listarFaturas(cartaoID: meuCartao.id).first
        #expect(recarregada?.status == .parcial)
        #expect(recarregada?.valorPago == Money(centavos: 100_000))
    }

    @Test("o total da fatura soma as transações daquela competência e ignora removidas")
    func totalDaFatura() throws {
        let repo = try repositorio()
        let meuCartao = cartao
        let fatura = try repo.faturaOuCriar(
            cartao: meuCartao, competencia: Competencia(ano: 2026, mes: 9), calendario: calendario
        )

        var partes = DateComponents()
        partes.year = 2026
        partes.month = 9
        partes.day = 10
        partes.hour = 12
        let dataCompra = calendario.date(from: partes)!

        var umaRemovida = Transacao(
            carteiraID: UUID(), tipo: .despesa, valor: Money(centavos: 9900),
            data: dataCompra, cartaoID: meuCartao.id, criadoPor: UUID(), hashDedup: "b"
        )
        umaRemovida.removidoEm = Date()

        let transacoes = [
            Transacao(
                carteiraID: UUID(), tipo: .despesa, valor: Money(centavos: 41_280),
                data: dataCompra, cartaoID: meuCartao.id, criadoPor: UUID(), hashDedup: "a"
            ),
            umaRemovida
        ]

        let total = repo.totalDaFatura(fatura, transacoes: transacoes, cartao: meuCartao, calendario: calendario)
        #expect(total == Money(centavos: 41_280))
    }
}
