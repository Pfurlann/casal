import CasalDomain
import Foundation
import SwiftData

enum Bootstrap {
    /// Garante que existe uma carteira, uma conta corrente padrão e o
    /// catálogo de categorias. Idempotente: pode rodar a cada abertura do
    /// app sem duplicar dado.
    @discardableResult
    static func prepararSeNecessario(contexto: ModelContext, donoID: UUID) throws -> Carteira {
        let carteirasExistentes = try contexto.fetch(FetchDescriptor<CarteiraRegistro>())

        let carteira: Carteira
        if let primeira = carteirasExistentes.first {
            carteira = primeira.paraDominio()
        } else {
            let nova = Carteira(
                nome: "Nosso",
                donoID: donoID,
                visibilidade: .aberta,
                rotulo: .compartilhada,
                dispositivoID: IdentidadeLocal.dispositivoID
            )
            contexto.insert(CarteiraRegistro(dominio: nova))
            carteira = nova
        }

        let carteiraAlvo = carteira.id
        let contasDaCarteira = try contexto.fetch(
            FetchDescriptor<ContaRegistro>(
                predicate: #Predicate { $0.carteiraID == carteiraAlvo }
            )
        )
        if contasDaCarteira.isEmpty {
            let padrao = Conta(carteiraID: carteira.id, nome: "Corrente", tipo: .corrente)
            contexto.insert(ContaRegistro(dominio: padrao))
        }

        // swiftlint:disable:next todo
        // TODO: checa "existe alguma categoria" em vez de "o catálogo padrão
        // está completo". No dia em que Categoria.padrao ganhar uma 15ª
        // entrada, toda instalação existente já tem >0 categorias e nunca
        // mais recebe a nova — silenciosamente.
        if try contexto.fetch(FetchDescriptor<CategoriaRegistro>()).isEmpty {
            for categoria in Categoria.padrao {
                contexto.insert(CategoriaRegistro(dominio: categoria))
            }
        }

        try contexto.save()
        return carteira
    }
}
