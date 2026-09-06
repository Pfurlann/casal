import CasalDomain
import Foundation
import SwiftData
import Testing
@testable import Casal

@Suite("RepositorioCartoesSwiftData")
struct RepositorioCartoesTests {
    private func repositorio() throws -> RepositorioCartoesSwiftData {
        RepositorioCartoesSwiftData(contexto: ModelContext(try SchemaCasal.container(emMemoria: true)))
    }

    private func cartao(_ apelido: String = "Nosso") -> Cartao {
        Cartao(
            carteiraID: UUID(), apelido: apelido, banco: "Nubank", ultimos4: "4417",
            limite: Money(centavos: 800_000), diaFechamento: 28, diaVencimento: 5
        )
    }

    @Test("salvar e listar devolve o cartão gravado")
    func salvarEListar() throws {
        let repo = try repositorio()
        try repo.salvarCartao(cartao())
        let encontrados = try repo.listarCartoes()
        #expect(encontrados.count == 1)
        #expect(encontrados.first?.apelido == "Nosso")
        #expect(encontrados.first?.limite == Money(centavos: 800_000))
    }

    @Test("salvar duas vezes o mesmo id atualiza em vez de duplicar")
    func upsert() throws {
        let repo = try repositorio()
        var alvo = cartao()
        try repo.salvarCartao(alvo)
        alvo.limite = Money(centavos: 1_200_000)
        alvo.apelido = "Nosso renovado"
        try repo.salvarCartao(alvo)

        let encontrados = try repo.listarCartoes()
        #expect(encontrados.count == 1)
        #expect(encontrados.first?.limite == Money(centavos: 1_200_000))
        #expect(encontrados.first?.apelido == "Nosso renovado")
    }

    @Test("cartão arquivado sai da listagem")
    func arquivar() throws {
        let repo = try repositorio()
        let alvo = cartao()
        try repo.salvarCartao(alvo)
        try repo.arquivarCartao(id: alvo.id)
        #expect(try repo.listarCartoes().isEmpty)
    }

    @Test("contas também fazem salvar e listar")
    func contas() throws {
        let repo = try repositorio()
        let conta = Conta(carteiraID: UUID(), nome: "Corrente", saldoInicial: Money(centavos: 50_000))
        try repo.salvarConta(conta)
        let encontradas = try repo.listarContas()
        #expect(encontradas.count == 1)
        #expect(encontradas.first?.nome == "Corrente")
    }

    @Test("conta arquivada (soft-delete) sai da listagem")
    func arquivarConta() throws {
        let repo = try repositorio()
        let conta = Conta(carteiraID: UUID(), nome: "Poupança", saldoInicial: Money(centavos: 10_000))
        try repo.salvarConta(conta)
        try repo.arquivarConta(id: conta.id)
        #expect(try repo.listarContas().isEmpty)
    }

    @Test("cartões sobrevivem a fechar e reabrir o armazenamento")
    func persistencia() throws {
        let url = URL.temporaryDirectory.appending(path: "\(UUID()).store")
        let alvo = cartao("Persistente")

        do {
            let c1 = try SchemaCasal.container(url: url)
            try RepositorioCartoesSwiftData(contexto: ModelContext(c1)).salvarCartao(alvo)
        }

        let c2 = try SchemaCasal.container(url: url)
        let encontrados = try RepositorioCartoesSwiftData(contexto: ModelContext(c2)).listarCartoes()
        #expect(encontrados.count == 1)
        #expect(encontrados.first?.id == alvo.id)
        #expect(encontrados.first?.apelido == "Persistente")
    }
}
