import Foundation
import SwiftData

/// Versão 1: o schema que o M1 colocou em produção — transações, carteiras e
/// categorias. Declarada agora, retroativamente, para que a v2 tenha de onde
/// migrar. Não adicione entidades aqui.
enum SchemaCasalV1: VersionedSchema {
    static var versionIdentifier: Schema.Version { Schema.Version(1, 0, 0) }

    static var models: [any PersistentModel.Type] {
        [TransacaoRegistro.self, CarteiraRegistro.self, CategoriaRegistro.self]
    }
}

/// Versão 2: acrescenta conta, cartão e fatura. Puramente aditiva — nenhum
/// campo existente muda de nome ou de tipo, então a migração é leve.
enum SchemaCasalV2: VersionedSchema {
    static var versionIdentifier: Schema.Version { Schema.Version(2, 0, 0) }

    static var models: [any PersistentModel.Type] {
        [
            TransacaoRegistro.self, CarteiraRegistro.self, CategoriaRegistro.self,
            ContaRegistro.self, CartaoRegistro.self, FaturaRegistro.self
        ]
    }
}

/// Versão 3: acrescenta a fila outbox local (offline→online). Aditiva.
enum SchemaCasalV3: VersionedSchema {
    static var versionIdentifier: Schema.Version { Schema.Version(3, 0, 0) }

    static var models: [any PersistentModel.Type] {
        [
            TransacaoRegistro.self, CarteiraRegistro.self, CategoriaRegistro.self,
            ContaRegistro.self, CartaoRegistro.self, FaturaRegistro.self,
            OutboxItemRegistro.self
        ]
    }
}

enum PlanoMigracaoCasal: SchemaMigrationPlan {
    static var schemas: [any VersionedSchema.Type] {
        [SchemaCasalV1.self, SchemaCasalV2.self, SchemaCasalV3.self]
    }

    static var stages: [MigrationStage] {
        [
            .lightweight(fromVersion: SchemaCasalV1.self, toVersion: SchemaCasalV2.self),
            .lightweight(fromVersion: SchemaCasalV2.self, toVersion: SchemaCasalV3.self),
        ]
    }
}

enum SchemaCasal {
    /// Container da versão corrente, com o plano de migração aplicado.
    /// Todo caminho que abre armazenamento deve passar por aqui, para que
    /// nenhum lugar do app crie um container sem plano de migração.
    static func container(emMemoria: Bool = false) throws -> ModelContainer {
        try ModelContainer(
            for: Schema(versionedSchema: SchemaCasalV3.self),
            migrationPlan: PlanoMigracaoCasal.self,
            configurations: ModelConfiguration(isStoredInMemoryOnly: emMemoria)
        )
    }

    static func container(url: URL) throws -> ModelContainer {
        try ModelContainer(
            for: Schema(versionedSchema: SchemaCasalV3.self),
            migrationPlan: PlanoMigracaoCasal.self,
            configurations: ModelConfiguration(url: url)
        )
    }
}
