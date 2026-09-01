import CasalDomain
import Foundation
import SwiftData
import Testing
@testable import Casal

@Suite("Bootstrap")
struct BootstrapTests {
    private func contextoEmMemoria() throws -> ModelContext {
        ModelContext(try SchemaCasal.container(emMemoria: true))
    }

    @Test("primeiro launch cria a carteira padrão e o catálogo de categorias")
    func primeiroLaunch() throws {
        let contexto = try contextoEmMemoria()
        let carteira = try Bootstrap.prepararSeNecessario(contexto: contexto, donoID: UUID())

        #expect(carteira.nome == "Nosso")
        let categorias = try contexto.fetch(FetchDescriptor<CategoriaRegistro>())
        #expect(categorias.count == Categoria.padrao.count)
        let contas = try contexto.fetch(FetchDescriptor<ContaRegistro>())
        #expect(contas.count == 1)
        #expect(contas.first?.nome == "Corrente")
        #expect(contas.first?.carteiraID == carteira.id)
    }

    @Test("rodar de novo não duplica nada")
    func idempotente() throws {
        let contexto = try contextoEmMemoria()
        let dono = UUID()
        let primeira = try Bootstrap.prepararSeNecessario(contexto: contexto, donoID: dono)
        let segunda = try Bootstrap.prepararSeNecessario(contexto: contexto, donoID: dono)

        #expect(primeira.id == segunda.id)
        #expect(try contexto.fetch(FetchDescriptor<CarteiraRegistro>()).count == 1)
        #expect(try contexto.fetch(FetchDescriptor<CategoriaRegistro>()).count == Categoria.padrao.count)
        #expect(try contexto.fetch(FetchDescriptor<ContaRegistro>()).count == 1)
    }
}
