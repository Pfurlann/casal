import CasalDomain
import Foundation
import Testing
@testable import Casal

@Suite("Mapeamento domínio ↔ SwiftData")
struct MapeamentoTests {
    @Test("transação sobrevive à ida e volta sem perder campo")
    func idaEVolta() {
        let carteiraID = UUID()
        let categoriaID = UUID()
        let contaID = UUID()
        let cartaoID = UUID()
        let faturaID = UUID()
        let criadoPor = UUID()
        let grupoParcela = UUID()
        let data = Date(timeIntervalSince1970: 1_700_000_000)
        let criadoEm = Date(timeIntervalSince1970: 1_600_000_000)
        let atualizadoEm = Date(timeIntervalSince1970: 1_650_000_000)
        let removidoEm = Date(timeIntervalSince1970: 1_680_000_000)
        let dispositivoID = UUID()

        let original = Transacao(
            carteiraID: carteiraID,
            tipo: .despesa,
            valor: Money(centavos: 4242),
            data: data,
            categoriaID: categoriaID,
            descricao: "Zaffari",
            contaID: contaID,
            cartaoID: cartaoID,
            faturaID: faturaID,
            criadoPor: criadoPor,
            estado: .aPagar,
            origem: .walletShortcut,
            idExterno: "ext-123",
            hashDedup: "chave",
            grupoParcela: grupoParcela,
            parcelaN: 3,
            parcelaTotal: 12,
            criadoEm: criadoEm,
            atualizadoEm: atualizadoEm,
            removidoEm: removidoEm,
            dispositivoID: dispositivoID
        )

        let volta = TransacaoRegistro(dominio: original).paraDominio()

        #expect(volta.id == original.id)
        #expect(volta.carteiraID == carteiraID)
        #expect(volta.tipo == original.tipo)
        #expect(volta.valor == original.valor)
        #expect(volta.data == data)
        #expect(volta.categoriaID == categoriaID)
        #expect(volta.descricao == original.descricao)
        #expect(volta.contaID == contaID)
        #expect(volta.cartaoID == cartaoID)
        #expect(volta.faturaID == faturaID)
        #expect(volta.criadoPor == criadoPor)
        #expect(volta.estado == original.estado)
        #expect(volta.origem == original.origem)
        #expect(volta.idExterno == "ext-123")
        #expect(volta.hashDedup == original.hashDedup)
        #expect(volta.grupoParcela == grupoParcela)
        #expect(volta.parcelaN == 3)
        #expect(volta.parcelaTotal == 12)
        #expect(volta.criadoEm == criadoEm)
        #expect(volta.atualizadoEm == atualizadoEm)
        #expect(volta.removidoEm == removidoEm)
        #expect(volta.dispositivoID == dispositivoID)
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
        let carteiraID = UUID()
        let donoID = UUID()
        let carteiraCriadoEm = Date(timeIntervalSince1970: 1_600_000_001)
        let carteiraAtualizadoEm = Date(timeIntervalSince1970: 1_650_000_002)
        let carteiraRemovidoEm = Date(timeIntervalSince1970: 1_680_000_003)
        let carteiraDispositivoID = UUID()
        let carteira = Carteira(
            id: carteiraID,
            nome: "Nosso",
            cor: "#123456",
            icone: "star.fill",
            donoID: donoID,
            visibilidade: .resumo,
            rotulo: .compartilhada,
            arquivada: true,
            criadoEm: carteiraCriadoEm,
            atualizadoEm: carteiraAtualizadoEm,
            removidoEm: carteiraRemovidoEm,
            dispositivoID: carteiraDispositivoID
        )
        let deVolta = CarteiraRegistro(dominio: carteira).paraDominio()
        #expect(deVolta.id == carteiraID)
        #expect(deVolta.nome == "Nosso")
        #expect(deVolta.cor == "#123456")
        #expect(deVolta.icone == "star.fill")
        #expect(deVolta.donoID == donoID)
        #expect(deVolta.visibilidade == .resumo)
        #expect(deVolta.rotulo == .compartilhada)
        #expect(deVolta.arquivada == true)
        #expect(deVolta.criadoEm == carteiraCriadoEm)
        #expect(deVolta.atualizadoEm == carteiraAtualizadoEm)
        #expect(deVolta.removidoEm == carteiraRemovidoEm)
        #expect(deVolta.dispositivoID == carteiraDispositivoID)

        let categoriaID = UUID()
        let categoriaCarteiraID = UUID()
        let paiID = UUID()
        let categoriaCriadoEm = Date(timeIntervalSince1970: 1_600_000_004)
        let categoriaAtualizadoEm = Date(timeIntervalSince1970: 1_650_000_005)
        let categoriaRemovidoEm = Date(timeIntervalSince1970: 1_680_000_006)
        let categoriaDispositivoID = UUID()
        let categoria = Categoria(
            id: categoriaID,
            carteiraID: categoriaCarteiraID,
            nome: "Mercado",
            icone: "cart.fill",
            cor: "#34C759",
            paiID: paiID,
            tipo: .receita,
            criadoEm: categoriaCriadoEm,
            atualizadoEm: categoriaAtualizadoEm,
            removidoEm: categoriaRemovidoEm,
            dispositivoID: categoriaDispositivoID
        )
        let categoriaVolta = CategoriaRegistro(dominio: categoria).paraDominio()
        #expect(categoriaVolta.id == categoriaID)
        #expect(categoriaVolta.carteiraID == categoriaCarteiraID)
        #expect(categoriaVolta.nome == "Mercado")
        #expect(categoriaVolta.icone == "cart.fill")
        #expect(categoriaVolta.cor == "#34C759")
        #expect(categoriaVolta.paiID == paiID)
        #expect(categoriaVolta.tipo == .receita)
        #expect(categoriaVolta.criadoEm == categoriaCriadoEm)
        #expect(categoriaVolta.atualizadoEm == categoriaAtualizadoEm)
        #expect(categoriaVolta.removidoEm == categoriaRemovidoEm)
        #expect(categoriaVolta.dispositivoID == categoriaDispositivoID)
    }
}
