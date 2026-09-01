import CasalDomain
import Foundation
import SwiftData
import Testing
@testable import Casal

@Suite("RepositorioSwiftData")
struct RepositorioTests {
    private func repositorioEmMemoria() throws -> RepositorioSwiftData {
        let configuracao = ModelConfiguration(isStoredInMemoryOnly: true)
        let container = try ModelContainer(
            for: TransacaoRegistro.self, CarteiraRegistro.self, CategoriaRegistro.self,
            configurations: configuracao
        )
        return RepositorioSwiftData(contexto: ModelContext(container))
    }

    private func transacao(_ centavos: Int, dia: Int, local: String = "Zaffari") -> Transacao {
        Transacao(
            carteiraID: UUID(),
            tipo: .despesa,
            valor: Money(centavos: centavos),
            data: Date(timeIntervalSince1970: TimeInterval(dia * 86_400)),
            descricao: local,
            criadoPor: UUID(),
            hashDedup: "k\(centavos)"
        )
    }

    @Test("salvar e listar devolve o que foi gravado")
    func salvarEListar() throws {
        let repo = try repositorioEmMemoria()
        try repo.salvar(transacao(4200, dia: 10))
        let encontradas = try repo.listar(
            de: Date(timeIntervalSince1970: 0),
            ate: Date(timeIntervalSince1970: 30 * 86_400)
        )
        #expect(encontradas.count == 1)
        #expect(encontradas.first?.valor == Money(centavos: 4200))
    }

    @Test("salvar duas vezes o mesmo id atualiza em vez de duplicar")
    func salvarEhUpsert() throws {
        let repo = try repositorioEmMemoria()
        var original = transacao(4200, dia: 10)
        try repo.salvar(original)
        original.valor = Money(centavos: 5000)
        try repo.salvar(original)

        let encontradas = try repo.listar(
            de: Date(timeIntervalSince1970: 0),
            ate: Date(timeIntervalSince1970: 30 * 86_400)
        )
        #expect(encontradas.count == 1)
        #expect(encontradas.first?.valor == Money(centavos: 5000))
    }

    @Test("remover é lógico e some da listagem")
    func remocaoLogica() throws {
        let repo = try repositorioEmMemoria()
        let alvo = transacao(4200, dia: 10)
        try repo.salvar(alvo)
        try repo.remover(id: alvo.id)

        let encontradas = try repo.listar(
            de: Date(timeIntervalSince1970: 0),
            ate: Date(timeIntervalSince1970: 30 * 86_400)
        )
        #expect(encontradas.isEmpty)
    }

    @Test("listar respeita as bordas do período")
    func bordasDoPeriodo() throws {
        let repo = try repositorioEmMemoria()
        try repo.salvar(transacao(100, dia: 9))
        try repo.salvar(transacao(200, dia: 10))
        try repo.salvar(transacao(300, dia: 20))
        try repo.salvar(transacao(400, dia: 21))

        let encontradas = try repo.listar(
            de: Date(timeIntervalSince1970: 10 * 86_400),
            ate: Date(timeIntervalSince1970: 20 * 86_400)
        )
        // Intervalo meio-aberto: o dia 10 entra, o dia 20 nao.
        #expect(encontradas.count == 1)
    }

    @Test("histórico recente vem em ordem decrescente de data")
    func historicoOrdenado() throws {
        let repo = try repositorioEmMemoria()
        try repo.salvar(transacao(100, dia: 5))
        try repo.salvar(transacao(200, dia: 15))
        try repo.salvar(transacao(300, dia: 10))

        let recentes = try repo.historicoRecente(limite: 2)
        #expect(recentes.count == 2)
        #expect(recentes.first?.valor == Money(centavos: 200))
    }
}
