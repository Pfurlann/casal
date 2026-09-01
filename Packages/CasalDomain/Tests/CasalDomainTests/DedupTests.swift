import Foundation
import Testing
@testable import CasalDomain

@Suite("Dedup")
struct DedupTests {
    let carteira = UUID()
    let autor = UUID()

    private func dia(_ n: Int) -> Date {
        Date(timeIntervalSince1970: TimeInterval(n * 86_400))
    }

    private func transacao(valorCentavos: Int, dia n: Int, local: String) -> Transacao {
        Transacao(
            carteiraID: carteira,
            tipo: .despesa,
            valor: Money(centavos: valorCentavos),
            data: dia(n),
            descricao: local,
            criadoPor: autor,
            hashDedup: Dedup.chave(
                carteiraID: carteira,
                valor: Money(centavos: valorCentavos),
                estabelecimento: local
            )
        )
    }

    @Test("a chave ignora variações de escrita do estabelecimento")
    func chaveCanonica() {
        let a = Dedup.chave(carteiraID: carteira, valor: Money(centavos: 8740), estabelecimento: "ZAFFARI LTDA 4412")
        let b = Dedup.chave(carteiraID: carteira, valor: Money(centavos: 8740), estabelecimento: "  zaffari ")
        #expect(a == b)
    }

    @Test("a chave separa valores e carteiras diferentes")
    func chaveDistingue() {
        let base = Dedup.chave(carteiraID: carteira, valor: Money(centavos: 8740), estabelecimento: "ZAFFARI")
        let outroValor = Dedup.chave(carteiraID: carteira, valor: Money(centavos: 8741), estabelecimento: "ZAFFARI")
        let outraCarteira = Dedup.chave(carteiraID: UUID(), valor: Money(centavos: 8740), estabelecimento: "ZAFFARI")
        #expect(base != outroValor)
        #expect(base != outraCarteira)
    }

    @Test("mesma compra com até dois dias de diferença é duplicata")
    func janelaDeDois() {
        let capturada = transacao(valorCentavos: 8740, dia: 10, local: "ZAFFARI")
        let importada = transacao(valorCentavos: 8740, dia: 12, local: "zaffari ltda")
        #expect(Dedup.saoDuplicatas(capturada, importada))
    }

    @Test("três dias de diferença já não é duplicata")
    func foraDaJanela() {
        let a = transacao(valorCentavos: 8740, dia: 10, local: "ZAFFARI")
        let b = transacao(valorCentavos: 8740, dia: 13, local: "ZAFFARI")
        #expect(Dedup.saoDuplicatas(a, b) == false)
    }

    @Test("valores diferentes nunca são duplicatas, mesmo no mesmo dia")
    func valorDiferente() {
        let a = transacao(valorCentavos: 8740, dia: 10, local: "ZAFFARI")
        let b = transacao(valorCentavos: 8741, dia: 10, local: "ZAFFARI")
        #expect(Dedup.saoDuplicatas(a, b) == false)
    }

    @Test("uma transação removida nunca é considerada duplicata")
    func removidaNaoConta() {
        var a = transacao(valorCentavos: 8740, dia: 10, local: "ZAFFARI")
        let b = transacao(valorCentavos: 8740, dia: 10, local: "ZAFFARI")
        a.removidoEm = Date()
        #expect(Dedup.saoDuplicatas(a, b) == false)
    }
}
