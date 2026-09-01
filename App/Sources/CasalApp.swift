import SwiftData
import SwiftUI

@main
struct CasalApp: App {
    let container: ModelContainer

    init() {
        do {
            container = try SchemaCasal.container()
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
    private static let chaveDono = "casal.dono.id"
    private static let chaveDispositivo = "casal.dispositivo.id"

    static var donoID: UUID {
        valorEstavel(chave: chaveDono)
    }

    /// Identificador estável por instalação, exigido pela seção 7 do spec
    /// em todo registro sincronizado. Sem lógica de sync ainda — só
    /// carimbado nos writes para o campo `dispositivoID` existir desde já.
    static var dispositivoID: UUID {
        valorEstavel(chave: chaveDispositivo)
    }

    private static func valorEstavel(chave: String) -> UUID {
        if let salvo = UserDefaults.standard.string(forKey: chave), let id = UUID(uuidString: salvo) {
            return id
        }
        let novo = UUID()
        UserDefaults.standard.set(novo.uuidString, forKey: chave)
        return novo
    }
}
