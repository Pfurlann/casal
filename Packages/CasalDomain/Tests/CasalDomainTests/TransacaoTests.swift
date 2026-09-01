import Foundation
import Testing
@testable import CasalDomain

@Suite("Transacao")
struct TransacaoTests {
    @Test("padrões do inicializador refletem o caso comum: manual, confirmada, à vista")
    func padroes() {
        let t = Transacao(
            carteiraID: UUID(),
            tipo: .despesa,
            valor: Money(centavos: 4200),
            data: Date(timeIntervalSince1970: 0),
            criadoPor: UUID(),
            hashDedup: "x"
        )
        #expect(t.estado == .confirmada)
        #expect(t.origem == .manual)
        #expect(t.parcelaN == 1)
        #expect(t.parcelaTotal == 1)
        #expect(t.removidoEm == nil)
        #expect(t.categoriaID == nil)
        #expect(t.descricao == "")
    }

    @Test("transferência é um tipo, não uma entidade separada")
    func transferenciaEhTipo() {
        #expect(TipoTransacao.allCases.contains(.transferencia))
    }

    @Test("carteira fechada não aceita membros além do dono")
    func carteiraFechada() {
        let dono = UUID()
        let carteira = Carteira(nome: "Meu", donoID: dono, visibilidade: .fechada)
        #expect(carteira.aceitaMembros == false)

        let aberta = Carteira(nome: "Nosso", donoID: dono, visibilidade: .aberta)
        #expect(aberta.aceitaMembros == true)
    }
}
