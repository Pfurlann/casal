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

    private func transacao(
        tipo: TipoTransacao = .despesa,
        valorCentavos: Int,
        dia n: Int,
        local: String
    ) -> Transacao {
        Transacao(
            carteiraID: carteira,
            tipo: tipo,
            valor: Money(centavos: valorCentavos),
            data: dia(n),
            descricao: local,
            criadoPor: autor,
            hashDedup: Dedup.chave(
                carteiraID: carteira,
                tipo: tipo,
                valor: Money(centavos: valorCentavos),
                estabelecimento: local
            )
        )
    }

    @Test("a chave ignora variações de escrita do estabelecimento")
    func chaveCanonica() {
        let a = Dedup.chave(carteiraID: carteira, tipo: .despesa, valor: Money(centavos: 8740), estabelecimento: "ZAFFARI LTDA 4412")
        let b = Dedup.chave(carteiraID: carteira, tipo: .despesa, valor: Money(centavos: 8740), estabelecimento: "  zaffari ")
        #expect(a == b)
    }

    @Test("a chave separa valores e carteiras diferentes")
    func chaveDistingue() {
        let base = Dedup.chave(carteiraID: carteira, tipo: .despesa, valor: Money(centavos: 8740), estabelecimento: "ZAFFARI")
        let outroValor = Dedup.chave(carteiraID: carteira, tipo: .despesa, valor: Money(centavos: 8741), estabelecimento: "ZAFFARI")
        let outraCarteira = Dedup.chave(carteiraID: UUID(), tipo: .despesa, valor: Money(centavos: 8740), estabelecimento: "ZAFFARI")
        #expect(base != outroValor)
        #expect(base != outraCarteira)
    }

    @Test("a chave separa despesa e receita com os mesmos demais campos")
    func chaveDistingueTipo() {
        let despesa = Dedup.chave(carteiraID: carteira, tipo: .despesa, valor: Money(centavos: 8000), estabelecimento: "ZAFFARI")
        let receita = Dedup.chave(carteiraID: carteira, tipo: .receita, valor: Money(centavos: 8000), estabelecimento: "ZAFFARI")
        #expect(despesa != receita)
    }

    @Test("mesma compra com até dois dias de diferença é duplicata")
    func janelaDeDois() {
        let capturada = transacao(valorCentavos: 8740, dia: 10, local: "ZAFFARI")
        let importada = transacao(valorCentavos: 8740, dia: 12, local: "zaffari ltda")
        #expect(Dedup.saoCandidatasADuplicata(capturada, importada))
    }

    @Test("três dias de diferença já não é duplicata")
    func foraDaJanela() {
        let a = transacao(valorCentavos: 8740, dia: 10, local: "ZAFFARI")
        let b = transacao(valorCentavos: 8740, dia: 13, local: "ZAFFARI")
        #expect(Dedup.saoCandidatasADuplicata(a, b) == false)
    }

    @Test("valores diferentes nunca são duplicatas, mesmo no mesmo dia")
    func valorDiferente() {
        let a = transacao(valorCentavos: 8740, dia: 10, local: "ZAFFARI")
        let b = transacao(valorCentavos: 8741, dia: 10, local: "ZAFFARI")
        #expect(Dedup.saoCandidatasADuplicata(a, b) == false)
    }

    @Test("uma transação removida nunca é considerada duplicata")
    func removidaNaoConta() {
        var a = transacao(valorCentavos: 8740, dia: 10, local: "ZAFFARI")
        let b = transacao(valorCentavos: 8740, dia: 10, local: "ZAFFARI")
        a.removidoEm = Date()
        #expect(Dedup.saoCandidatasADuplicata(a, b) == false)
    }

    @Test("despesa e receita de mesmo valor e estabelecimento não são candidatas")
    func despesaEReceitaNaoColidem() {
        let despesa = transacao(tipo: .despesa, valorCentavos: 8000, dia: 10, local: "ZAFFARI")
        let receita = transacao(tipo: .receita, valorCentavos: 8000, dia: 12, local: "ZAFFARI")
        #expect(Dedup.saoCandidatasADuplicata(despesa, receita) == false)
    }

    @Test("estabelecimento vazio nunca gera candidatas, mesmo com todo resto igual")
    func estabelecimentoVazioNaoColide() {
        let a = transacao(valorCentavos: 1200, dia: 10, local: "")
        let b = transacao(valorCentavos: 1200, dia: 10, local: "")
        #expect(Dedup.saoCandidatasADuplicata(a, b) == false)
    }

    @Test("chave(de:) deriva a mesma chave que os campos da transação produziriam")
    func chaveDeTransacao() {
        let t = transacao(valorCentavos: 8740, dia: 10, local: "ZAFFARI")
        let esperada = Dedup.chave(carteiraID: carteira, tipo: .despesa, valor: Money(centavos: 8740), estabelecimento: "ZAFFARI")
        #expect(Dedup.chave(de: t) == esperada)
    }
}
