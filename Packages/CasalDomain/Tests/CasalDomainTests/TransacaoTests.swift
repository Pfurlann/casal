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

    @Test("raw values dos enums persistidos são snake_case e travados como formato de dado")
    func rawValuesPersistidos() {
        #expect(TipoTransacao.despesa.rawValue == "despesa")
        #expect(TipoTransacao.receita.rawValue == "receita")
        #expect(TipoTransacao.transferencia.rawValue == "transferencia")

        #expect(OrigemTransacao.manual.rawValue == "manual")
        #expect(OrigemTransacao.walletShortcut.rawValue == "wallet_shortcut")
        #expect(OrigemTransacao.ofx.rawValue == "ofx")
        #expect(OrigemTransacao.openFinance.rawValue == "open_finance")

        #expect(EstadoTransacao.confirmada.rawValue == "confirmada")
        #expect(EstadoTransacao.pendente.rawValue == "pendente")

        #expect(TipoCategoria.despesa.rawValue == "despesa")
        #expect(TipoCategoria.receita.rawValue == "receita")

        #expect(VisibilidadeCarteira.aberta.rawValue == "aberta")
        #expect(VisibilidadeCarteira.resumo.rawValue == "resumo")
        #expect(VisibilidadeCarteira.fechada.rawValue == "fechada")

        #expect(RotuloCarteira.pessoal.rawValue == "pessoal")
        #expect(RotuloCarteira.compartilhada.rawValue == "compartilhada")
        #expect(RotuloCarteira.pj.rawValue == "pj")
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
