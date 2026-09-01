import Foundation

public enum SugestaoCategoria {
    /// Ordena categorias pela frequência com que já foram usadas naquele
    /// estabelecimento. Sem histórico do local, usa a frequência geral —
    /// um chute útil vale mais que nenhum chute.
    public static func sugerir(
        paraEstabelecimento estabelecimento: String,
        historico: [Transacao],
        limite: Int
    ) -> [UUID] {
        let alvo = Estabelecimento.normalizar(estabelecimento)

        let uteis = historico.filter { !$0.estaRemovida && $0.categoriaID != nil }

        let doLocal = uteis.filter { Estabelecimento.normalizar($0.descricao) == alvo }
        let base = doLocal.isEmpty ? uteis : doLocal

        var frequencia: [UUID: Int] = [:]
        var primeiraAparicao: [UUID: Int] = [:]
        for (indice, transacao) in base.enumerated() {
            guard let categoria = transacao.categoriaID else { continue }
            frequencia[categoria, default: 0] += 1
            if primeiraAparicao[categoria] == nil {
                primeiraAparicao[categoria] = indice
            }
        }

        return frequencia
            .sorted { esquerda, direita in
                if esquerda.value != direita.value { return esquerda.value > direita.value }
                // desempate estável: quem apareceu primeiro no histórico
                return (primeiraAparicao[esquerda.key] ?? 0) < (primeiraAparicao[direita.key] ?? 0)
            }
            .prefix(limite)
            .map(\.key)
    }
}
