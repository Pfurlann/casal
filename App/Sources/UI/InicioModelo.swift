import CasalDomain
import Foundation
import Observation

@Observable
final class InicioModelo {
    private(set) var resumo = ResumoMensal(totalDespesas: .zero, totalReceitas: .zero, quantidade: 0)
    private(set) var transacoes: [Transacao] = []
    /// Soma da fatura corrente de todos os cartões. É valor de exibição:
    /// nunca aciona `faturaOuCriar`, então recarregar a home não grava
    /// nenhuma fatura no banco.
    private(set) var comprometidoNoMes: Money = .zero

    let categorias: [Categoria]
    private let repositorio: RepositorioTransacoes
    private let repositorioCartoes: RepositorioCartoes

    init(repositorio: RepositorioTransacoes, repositorioCartoes: RepositorioCartoes, categorias: [Categoria]) {
        self.repositorio = repositorio
        self.repositorioCartoes = repositorioCartoes
        self.categorias = categorias
    }

    func recarregar(referencia: Date = Date(), calendario: Calendar = .current) {
        guard let intervalo = calendario.dateInterval(of: .month, for: referencia) else { return }
        // Intervalo meio-aberto [inicio, fim): `intervalo.end` e o primeiro
        // instante do mes seguinte e nao deve ser subtraido de nada. Subtrair
        // um segundo, como versoes anteriores deste plano faziam, descartava
        // silenciosamente um lancamento feito no ultimo segundo do mes.
        let fim = intervalo.end

        let encontradas = (try? repositorio.listar(de: intervalo.start, ate: fim)) ?? []
        transacoes = encontradas
        resumo = ResumoMensal.calcular(transacoes: encontradas, de: intervalo.start, ate: fim)
        comprometidoNoMes = calcularComprometidoNoMes(referencia: referencia, calendario: calendario)
    }

    /// Soma da fatura atual de cada cartão via `HorizonteFaturas.proximas`,
    /// que agrega direto das transações — não lê nem escreve `Fatura`
    /// nenhuma. Ler a home não é "uma compra precisando da competência".
    private func calcularComprometidoNoMes(referencia: Date, calendario: Calendar) -> Money {
        let cartoes = (try? repositorioCartoes.listarCartoes()) ?? []
        guard !cartoes.isEmpty else { return .zero }

        let todasAsTransacoes = (try? repositorio.listar(de: .distantPast, ate: .distantFuture)) ?? []
        let competenciaAtual = Competencia(data: referencia, calendario: calendario)

        return cartoes.reduce(Money.zero) { total, cartao in
            let atual = HorizonteFaturas.proximas(
                1,
                desde: competenciaAtual,
                transacoes: todasAsTransacoes,
                cartao: cartao,
                calendario: calendario
            ).first?.total ?? .zero
            return total + atual
        }
    }

    func categoria(de transacao: Transacao) -> Categoria? {
        guard let id = transacao.categoriaID else { return nil }
        return categorias.first { $0.id == id }
    }
}
