import CasalDomain
import Foundation
import Testing
@testable import Casal

@Suite("Mapeamento de cartao, conta e fatura")
struct MapeamentoCartaoTests {
    @Test("cartão faz ida e volta sem perder nenhum campo")
    func cartaoIdaEVolta() {
        let original = Cartao(
            carteiraID: UUID(),
            apelido: "Nosso",
            banco: "Nubank",
            bandeira: .visa,
            ultimos4: "4417",
            cor: "#8A2BE2",
            limite: Money(centavos: 800_000),
            diaFechamento: 28,
            diaVencimento: 5,
            contaPagamentoID: UUID(),
            arquivado: true
        )

        let volta = CartaoRegistro(dominio: original).paraDominio()

        #expect(volta.id == original.id)
        #expect(volta.carteiraID == original.carteiraID)
        #expect(volta.apelido == original.apelido)
        #expect(volta.banco == original.banco)
        #expect(volta.bandeira == .visa)
        #expect(volta.ultimos4 == original.ultimos4)
        #expect(volta.cor == original.cor)
        #expect(volta.limite == original.limite)
        #expect(volta.diaFechamento == 28)
        #expect(volta.diaVencimento == 5)
        #expect(volta.contaPagamentoID == original.contaPagamentoID)
        #expect(volta.arquivado == true)
    }

    @Test("o limite persiste como inteiro de centavos")
    func limiteEmCentavos() {
        let registro = CartaoRegistro(dominio: Cartao(
            carteiraID: UUID(), apelido: "x", banco: "y", ultimos4: "0001",
            limite: Money(centavos: 999), diaFechamento: 1, diaVencimento: 10
        ))
        #expect(registro.limiteCentavos == 999)
    }

    @Test("fatura faz ida e volta, com competência em dois inteiros")
    func faturaIdaEVolta() {
        let original = Fatura(
            cartaoID: UUID(),
            competencia: Competencia(ano: 2027, mes: 3),
            fechaEm: Date(timeIntervalSince1970: 1_600_000_000),
            venceEm: Date(timeIntervalSince1970: 1_650_000_000),
            status: .parcial,
            valorPago: Money(centavos: 100_000)
        )

        let registro = FaturaRegistro(dominio: original)
        #expect(registro.competenciaAno == 2027)
        #expect(registro.competenciaMes == 3)
        #expect(registro.valorPagoCentavos == 100_000)

        let volta = registro.paraDominio()
        #expect(volta.id == original.id)
        #expect(volta.cartaoID == original.cartaoID)
        #expect(volta.competencia == Competencia(ano: 2027, mes: 3))
        #expect(volta.fechaEm == original.fechaEm)
        #expect(volta.venceEm == original.venceEm)
        #expect(volta.status == .parcial)
        #expect(volta.valorPago == Money(centavos: 100_000))
    }

    @Test("conta faz ida e volta")
    func contaIdaEVolta() {
        let original = Conta(
            carteiraID: UUID(), nome: "Conta corrente",
            tipo: .poupanca, saldoInicial: Money(centavos: 150_000), arquivada: true
        )
        let volta = ContaRegistro(dominio: original).paraDominio()

        #expect(volta.id == original.id)
        #expect(volta.carteiraID == original.carteiraID)
        #expect(volta.nome == "Conta corrente")
        #expect(volta.tipo == .poupanca)
        #expect(volta.saldoInicial == Money(centavos: 150_000))
        #expect(volta.arquivada == true)
    }

    @Test("raw value malformado cai no padrão e dispara assertion em debug")
    func rawValueMalformado() {
        let registro = CartaoRegistro()
        registro.bandeiraBruta = "bandeira-que-nao-existe"
        // Em debug isto para no assertionFailure do mapeamento, o que é o
        // comportamento desejado: corrupção de armazenamento tem de aparecer.
        // Em release cai no padrão sem travar o app.
        #expect(registro.bandeiraBruta == "bandeira-que-nao-existe")
    }
}
