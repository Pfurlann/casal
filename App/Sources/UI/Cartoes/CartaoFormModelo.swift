import CasalDomain
import Foundation
import Observation

@Observable
final class CartaoFormModelo {
    var apelido: String = ""
    var banco: String = ""
    var ultimos4: String = ""
    var bandeira: BandeiraCartao = .outra
    var cor: String = "#7C5CFF"
    var entradaLimite = EntradaValor()
    var diaFechamento: Int = 28
    var diaVencimento: Int = 5

    private let repositorio: RepositorioCartoes
    private let carteiraID: UUID
    private let idExistente: UUID?
    private let contaPagamentoID: UUID?

    init(repositorio: RepositorioCartoes, carteiraID: UUID, cartaoExistente: Cartao?) {
        self.repositorio = repositorio
        self.carteiraID = carteiraID
        idExistente = cartaoExistente?.id
        contaPagamentoID = cartaoExistente?.contaPagamentoID

        if let existente = cartaoExistente {
            apelido = existente.apelido
            banco = existente.banco
            ultimos4 = existente.ultimos4
            bandeira = existente.bandeira
            cor = existente.cor
            diaFechamento = existente.diaFechamento
            diaVencimento = existente.diaVencimento
            entradaLimite = EntradaValor(centavos: existente.limite.centavos)
        }
    }

    /// Mensagens do que falta, na ordem em que o usuário preenche. Existe para
    /// que o botão desabilitado não seja um mistério.
    var erros: [String] {
        var lista: [String] = []
        if apelido.trimmingCharacters(in: .whitespaces).isEmpty {
            lista.append("Dê um apelido ao cartão")
        }
        if banco.trimmingCharacters(in: .whitespaces).isEmpty {
            lista.append("Informe o banco")
        }
        if ultimos4.count != 4 || !ultimos4.allSatisfy(\.isNumber) {
            lista.append("Informe os quatro últimos dígitos")
        }
        if entradaLimite.valor.centavos <= 0 {
            lista.append("Informe o limite do cartão")
        }
        if !Cartao.diaValido(diaFechamento) {
            lista.append("Dia de fechamento entre 1 e 31")
        }
        if !Cartao.diaValido(diaVencimento) {
            lista.append("Dia de vencimento entre 1 e 31")
        }
        return lista
    }

    var podeSalvar: Bool { erros.isEmpty }

    var cartaoDePrevia: Cartao {
        Cartao(
            id: idExistente ?? UUID(),
            carteiraID: carteiraID,
            apelido: apelido.isEmpty ? "Apelido" : apelido,
            banco: banco.isEmpty ? "Banco" : banco,
            bandeira: bandeira,
            ultimos4: ultimos4.isEmpty ? "0000" : ultimos4,
            cor: cor,
            limite: entradaLimite.valor,
            diaFechamento: diaFechamento,
            diaVencimento: diaVencimento,
            contaPagamentoID: contaPagamentoID
        )
    }

    func salvar() throws {
        guard podeSalvar else { return }
        try repositorio.salvarCartao(cartaoDePrevia)
    }
}
