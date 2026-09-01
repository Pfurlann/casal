import CasalDomain
import Foundation
import SwiftData
import Testing
@testable import Casal

@Suite("Lancamento com cartao e parcelas")
struct LancamentoComCartaoTests {
    private var calendario: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/Sao_Paulo")!
        return c
    }

    private func data(_ ano: Int, _ mes: Int, _ dia: Int) -> Date {
        var partes = DateComponents()
        partes.year = ano
        partes.month = mes
        partes.day = dia
        partes.hour = 12
        return calendario.date(from: partes)!
    }

    private func montar() throws -> (LancamentoModelo, RepositorioSwiftData, Cartao) {
        let contexto = ModelContext(try SchemaCasal.container(emMemoria: true))
        let repoTransacoes = RepositorioSwiftData(contexto: contexto)
        let repoCartoes = RepositorioCartoesSwiftData(contexto: contexto)

        let carteira = Carteira(nome: "Nosso", donoID: UUID())
        let cartao = Cartao(
            carteiraID: carteira.id, apelido: "Nosso", banco: "Nubank", ultimos4: "4417",
            limite: Money(centavos: 1_000_000), diaFechamento: 28, diaVencimento: 5
        )
        try repoCartoes.salvarCartao(cartao)

        let modelo = LancamentoModelo(
            repositorio: repoTransacoes,
            repositorioCartoes: repoCartoes,
            carteira: carteira,
            categorias: Categoria.padrao,
            autorID: UUID(),
            calendario: calendario
        )
        return (modelo, repoTransacoes, cartao)
    }

    @Test("sem cartão escolhido, o lançamento continua sendo uma transação só")
    func semCartao() throws {
        let (modelo, repo, _) = try montar()
        modelo.entrada.digitar(4)
        modelo.entrada.digitar(2)
        modelo.entrada.digitar(0)
        modelo.entrada.digitar(0)
        try modelo.salvar()

        let gravadas = try repo.listar(de: .distantPast, ate: .distantFuture)
        #expect(gravadas.count == 1)
        #expect(gravadas.first?.cartaoID == nil)
        #expect(gravadas.first?.parcelaTotal == 1)
    }

    @Test("com cartão à vista, grava uma transação já vinculada ao cartão")
    func cartaoAVista() throws {
        let (modelo, repo, cartao) = try montar()
        modelo.cartaoSelecionado = cartao
        modelo.parcelas = 1
        modelo.data = data(2026, 9, 10)
        for digito in [4, 2, 0, 0] { modelo.entrada.digitar(digito) }
        try modelo.salvar()

        let gravadas = try repo.listar(de: .distantPast, ate: .distantFuture)
        #expect(gravadas.count == 1)
        #expect(gravadas.first?.cartaoID == cartao.id)
        #expect(gravadas.first?.valor == Money(centavos: 4200))
    }

    @Test("com cartão em 12x, grava doze transações do mesmo grupo")
    func cartaoParcelado() throws {
        let (modelo, repo, cartao) = try montar()
        modelo.cartaoSelecionado = cartao
        modelo.parcelas = 12
        modelo.data = data(2026, 9, 10)
        modelo.descricao = "Apple Store"
        for digito in [3, 0, 0, 0, 0, 0] { modelo.entrada.digitar(digito) }
        try modelo.salvar()

        let gravadas = try repo.listar(de: .distantPast, ate: .distantFuture)
        #expect(gravadas.count == 12)
        #expect(Set(gravadas.compactMap(\.grupoParcela)).count == 1)
        #expect(gravadas.reduce(Money.zero) { $0 + $1.valor } == Money(centavos: 300_000))
        #expect(Set(gravadas.map(\.parcelaN)) == Set(1...12))
        #expect(gravadas.allSatisfy { $0.parcelaTotal == 12 })
    }

    @Test("parcelamento sem cartão é recusado — parcela sem fatura não existe")
    func parcelaSemCartao() throws {
        let (modelo, repo, _) = try montar()
        modelo.cartaoSelecionado = nil
        modelo.parcelas = 6
        for digito in [3, 0, 0, 0, 0, 0] { modelo.entrada.digitar(digito) }
        try modelo.salvar()

        let gravadas = try repo.listar(de: .distantPast, ate: .distantFuture)
        #expect(gravadas.count == 1)
        #expect(gravadas.first?.parcelaTotal == 1)
    }

    @Test("o estado limpa depois de salvar, inclusive cartão e parcelas")
    func estadoLimpo() throws {
        let (modelo, _, cartao) = try montar()
        modelo.cartaoSelecionado = cartao
        modelo.parcelas = 6
        for digito in [3, 0, 0, 0, 0, 0] { modelo.entrada.digitar(digito) }
        try modelo.salvar()

        #expect(modelo.entrada.valor == Money.zero)
        #expect(modelo.parcelas == 1)
        #expect(modelo.cartaoSelecionado == nil)
    }

    @Test("os cartões disponíveis vêm do repositório")
    func cartoesDisponiveis() throws {
        let (modelo, _, cartao) = try montar()
        #expect(modelo.cartoesDisponiveis.count == 1)
        #expect(modelo.cartoesDisponiveis.first?.id == cartao.id)
    }

    @Test("cada parcela carimba o dispositivoID exigido pela seção 7 do spec")
    func parcelaCarimbaDispositivo() throws {
        let (modelo, repo, cartao) = try montar()
        modelo.cartaoSelecionado = cartao
        modelo.parcelas = 3
        for digito in [3, 0, 0, 0] { modelo.entrada.digitar(digito) }
        try modelo.salvar()

        let gravadas = try repo.listar(de: .distantPast, ate: .distantFuture)
        #expect(gravadas.count == 3)
        #expect(gravadas.allSatisfy { $0.dispositivoID == IdentidadeLocal.dispositivoID })
    }
}
