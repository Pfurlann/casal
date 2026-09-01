import SwiftData
import SwiftUI

@main
struct CasalApp: App {
    let container: ModelContainer

    init() {
        do {
            container = try ModelContainer(
                for: TransacaoRegistro.self, CarteiraRegistro.self, CategoriaRegistro.self
            )
            try Bootstrap.prepararSeNecessario(
                contexto: ModelContext(container),
                donoID: IdentidadeLocal.donoID
            )
        } catch {
            fatalError("Falha ao preparar o armazenamento local: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            RaizView()
        }
        .modelContainer(container)
    }
}

/// Identidade local do M1. No M3 isso passa a vir do Supabase Auth.
enum IdentidadeLocal {
    private static let chave = "casal.dono.id"

    static var donoID: UUID {
        if let salvo = UserDefaults.standard.string(forKey: chave), let id = UUID(uuidString: salvo) {
            return id
        }
        let novo = UUID()
        UserDefaults.standard.set(novo.uuidString, forKey: chave)
        return novo
    }
}
