import CasalDomain
import Foundation
import Testing
@testable import Casal

@Suite("Mapeamento domínio ↔ SwiftData")
struct MapeamentoTests {
    @Test("transação sobrevive à ida e volta sem perder campo")
    func idaEVolta() {
        let original = Transacao(
            carteiraID: UUID(),
            tipo: .despesa,
            valor: Money(centavos: 4242),
            data: Date(timeIntervalSince1970: 1_700_000_000),
            categoriaID: UUID(),
            descricao: "Zaffari",
            criadoPor: UUID(),
            estado: .pendente,
            origem: .walletShortcut,
            hashDedup: "chave",
            parcelaN: 1,
            parcelaTotal: 1
        )

        let volta = TransacaoRegistro(dominio: original).paraDominio()

        #expect(volta.id == original.id)
        #expect(volta.valor == original.valor)
        #expect(volta.tipo == original.tipo)
        #expect(volta.estado == original.estado)
        #expect(volta.origem == original.origem)
        #expect(volta.descricao == original.descricao)
        #expect(volta.hashDedup == original.hashDedup)
        #expect(volta.categoriaID == original.categoriaID)
        #expect(volta.data == original.data)
    }

    @Test("valor persiste como inteiro de centavos")
    func valorEmCentavos() {
        let registro = TransacaoRegistro(
            dominio: Transacao(
                carteiraID: UUID(),
                tipo: .despesa,
                valor: Money(centavos: 999),
                data: Date(),
                criadoPor: UUID(),
                hashDedup: "k"
            )
        )
        #expect(registro.valorCentavos == 999)
    }

    @Test("carteira e categoria também fazem ida e volta")
    func outrasEntidades() {
        let carteira = Carteira(nome: "Nosso", donoID: UUID(), visibilidade: .resumo, rotulo: .compartilhada)
        let deVolta = CarteiraRegistro(dominio: carteira).paraDominio()
        #expect(deVolta.visibilidade == .resumo)
        #expect(deVolta.rotulo == .compartilhada)
        #expect(deVolta.nome == "Nosso")

        let categoria = Categoria(nome: "Mercado", icone: "cart.fill", cor: "#34C759")
        let categoriaVolta = CategoriaRegistro(dominio: categoria).paraDominio()
        #expect(categoriaVolta.nome == "Mercado")
        #expect(categoriaVolta.tipo == .despesa)
    }
}
