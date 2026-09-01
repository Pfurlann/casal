import Testing
@testable import CasalDomain

@Suite("Categorias padrão")
struct CategoriaPadraoTests {
    @Test("o catálogo cobre despesas do dia a dia e ao menos uma receita")
    func cobertura() {
        let nomes = Set(Categoria.padrao.map(\.nome))
        #expect(nomes.contains("Mercado"))
        #expect(nomes.contains("Restaurante"))
        #expect(nomes.contains("Combustível"))
        #expect(nomes.contains("Moradia"))
        #expect(nomes.contains("Salário"))
        #expect(Categoria.padrao.contains { $0.tipo == .receita })
    }

    @Test("nomes não se repetem")
    func semDuplicatas() {
        #expect(Set(Categoria.padrao.map(\.nome)).count == Categoria.padrao.count)
    }

    @Test("categorias padrão são globais, sem carteira dona")
    func saoGlobais() {
        #expect(Categoria.padrao.allSatisfy { $0.carteiraID == nil })
    }

    @Test("ids são estáveis entre leituras e distintos entre si")
    func idsEstaveis() {
        let primeira = Categoria.padrao.map(\.id)
        let segunda = Categoria.padrao.map(\.id)
        #expect(primeira == segunda)
        #expect(Set(primeira).count == 14)
        #expect(Categoria.padrao.count == 14)
        // Esses UUIDs são persistidos como categoriaID em todo gasto salvo.
        // Se algum dia virarem valores por processo, todo gasto histórico
        // perde a categoria no próximo lançamento do app.
        #expect(Categoria.padrao[0].id.uuidString == "00000000-0000-0000-0000-000000000001")
    }
}
