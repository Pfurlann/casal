import CasalDomain
import Foundation
import SwiftData
import Testing
@testable import Casal

private final class RepositorioCartoesFalso: RepositorioCartoes {
    var cartoesSalvos: [Cartao] = []
    var contasSalvas: [Conta] = []

    func salvarCartao(_ cartao: Cartao) throws { cartoesSalvos.append(cartao) }
    func listarCartoes() throws -> [Cartao] { cartoesSalvos }
    func arquivarCartao(id: UUID) throws { cartoesSalvos.removeAll { $0.id == id } }
    func salvarConta(_ conta: Conta) throws { contasSalvas.append(conta) }
    func listarContas() throws -> [Conta] { contasSalvas }
    func arquivarConta(id: UUID) throws { contasSalvas.removeAll { $0.id == id } }
}

@Suite("CartaoFormModelo")
struct CartaoFormModeloTests {
    private func modeloNovo(
        _ repositorio: RepositorioCartoesFalso = RepositorioCartoesFalso()
    ) -> CartaoFormModelo {
        CartaoFormModelo(repositorio: repositorio, carteiraID: UUID(), cartaoExistente: nil)
    }

    @Test("formulário vazio não pode salvar e explica o que falta")
    func vazioNaoSalva() {
        let modelo = modeloNovo()
        #expect(modelo.podeSalvar == false)
        #expect(modelo.erros.isEmpty == false)
    }

    @Test("preenchido corretamente pode salvar e não tem erro")
    func preenchidoSalva() {
        let modelo = modeloNovo()
        modelo.apelido = "Nosso"
        modelo.banco = "Nubank"
        modelo.ultimos4 = "4417"
        modelo.diaFechamento = 28
        modelo.diaVencimento = 5
        for digito in [8, 0, 0, 0, 0, 0] { modelo.entradaLimite.digitar(digito) }

        #expect(modelo.erros.isEmpty)
        #expect(modelo.podeSalvar)
    }

    @Test("limite zero é recusado — cartão sem limite não calcula disponível")
    func limiteZero() {
        let modelo = modeloNovo()
        modelo.apelido = "Nosso"
        modelo.banco = "Nubank"
        modelo.ultimos4 = "4417"
        #expect(modelo.podeSalvar == false)
    }

    @Test("últimos quatro dígitos exigem exatamente quatro números")
    func ultimos4Invalido() {
        let modelo = modeloNovo()
        modelo.apelido = "Nosso"
        modelo.banco = "Nubank"
        for digito in [8, 0, 0, 0, 0, 0] { modelo.entradaLimite.digitar(digito) }

        modelo.ultimos4 = "441"
        #expect(modelo.podeSalvar == false)
        modelo.ultimos4 = "44177"
        #expect(modelo.podeSalvar == false)
        modelo.ultimos4 = "44a7"
        #expect(modelo.podeSalvar == false)
        modelo.ultimos4 = "4417"
        #expect(modelo.podeSalvar)
    }

    @Test("dias fora de 1 a 31 são recusados")
    func diasInvalidos() {
        let modelo = modeloNovo()
        modelo.apelido = "Nosso"
        modelo.banco = "Nubank"
        modelo.ultimos4 = "4417"
        for digito in [8, 0, 0, 0, 0, 0] { modelo.entradaLimite.digitar(digito) }

        modelo.diaFechamento = 0
        #expect(modelo.podeSalvar == false)
        modelo.diaFechamento = 32
        #expect(modelo.podeSalvar == false)
        modelo.diaFechamento = 28
        modelo.diaVencimento = 0
        #expect(modelo.podeSalvar == false)
        modelo.diaVencimento = 5
        #expect(modelo.podeSalvar)
    }

    @Test("salvar grava o cartão com o limite digitado em centavos")
    func salvaComLimite() throws {
        let repositorio = RepositorioCartoesFalso()
        let modelo = modeloNovo(repositorio)
        modelo.apelido = "Nosso"
        modelo.banco = "Nubank"
        modelo.ultimos4 = "4417"
        modelo.bandeira = .visa
        modelo.diaFechamento = 28
        modelo.diaVencimento = 5
        for digito in [8, 0, 0, 0, 0, 0] { modelo.entradaLimite.digitar(digito) }

        try modelo.salvar()

        #expect(repositorio.cartoesSalvos.count == 1)
        let gravado = try #require(repositorio.cartoesSalvos.first)
        #expect(gravado.apelido == "Nosso")
        #expect(gravado.limite == Money(centavos: 800_000))
        #expect(gravado.bandeira == .visa)
        #expect(gravado.diaFechamento == 28)
        #expect(gravado.diaVencimento == 5)
    }

    @Test("editar preserva o id do cartão em vez de criar outro")
    func edicaoPreservaID() throws {
        let repositorio = RepositorioCartoesFalso()
        let existente = Cartao(
            carteiraID: UUID(), apelido: "Antigo", banco: "Nubank", ultimos4: "4417",
            limite: Money(centavos: 500_000), diaFechamento: 10, diaVencimento: 20
        )
        let modelo = CartaoFormModelo(
            repositorio: repositorio, carteiraID: existente.carteiraID, cartaoExistente: existente
        )
        #expect(modelo.apelido == "Antigo")
        #expect(modelo.entradaLimite.valor == Money(centavos: 500_000))

        modelo.apelido = "Renovado"
        try modelo.salvar()

        #expect(repositorio.cartoesSalvos.first?.id == existente.id)
        #expect(repositorio.cartoesSalvos.first?.apelido == "Renovado")
    }

    @Test("a prévia reflete o que já foi digitado")
    func previa() {
        let modelo = modeloNovo()
        modelo.banco = "Itaú"
        modelo.ultimos4 = "9999"
        #expect(modelo.cartaoDePrevia.banco == "Itaú")
        #expect(modelo.cartaoDePrevia.ultimos4 == "9999")
    }
}
