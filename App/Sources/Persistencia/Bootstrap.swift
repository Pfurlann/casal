import CasalDomain
import Foundation
import SwiftData

enum Bootstrap {
    /// Garante que existe uma carteira e o catálogo de categorias.
    /// Idempotente: pode rodar a cada abertura do app sem duplicar dado.
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
                rotulo: .compartilhada
            )
            contexto.insert(CarteiraRegistro(dominio: nova))
            carteira = nova
        }

        if try contexto.fetch(FetchDescriptor<CategoriaRegistro>()).isEmpty {
            for categoria in Categoria.padrao {
                contexto.insert(CategoriaRegistro(dominio: categoria))
            }
        }

        try contexto.save()
        return carteira
    }
}
