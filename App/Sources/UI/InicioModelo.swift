import CasalDomain
import Foundation
import Observation

@Observable
final class InicioModelo {
    private(set) var resumo = ResumoMensal(totalDespesas: .zero, totalReceitas: .zero, quantidade: 0)
    private(set) var transacoes: [Transacao] = []

    let categorias: [Categoria]
    private let repositorio: RepositorioTransacoes

    init(repositorio: RepositorioTransacoes, categorias: [Categoria]) {
        self.repositorio = repositorio
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
    }

    func categoria(de transacao: Transacao) -> Categoria? {
        guard let id = transacao.categoriaID else { return nil }
        return categorias.first { $0.id == id }
    }
}
