import CasalDomain
import Foundation
import SwiftData
import Testing
@testable import Casal

@Suite("Schema versionado")
struct SchemaTests {
    @Test("o container da versão atual abre e aceita as sete entidades")
    func containerAtual() throws {
        let container = try SchemaCasal.container(emMemoria: true)
        let contexto = ModelContext(container)

        contexto.insert(CarteiraRegistro())
        contexto.insert(CategoriaRegistro())
        contexto.insert(TransacaoRegistro())
        contexto.insert(ContaRegistro())
        contexto.insert(CartaoRegistro())
        contexto.insert(FaturaRegistro())
        contexto.insert(OutboxItemRegistro())
        try contexto.save()

        #expect(try contexto.fetch(FetchDescriptor<CartaoRegistro>()).count == 1)
        #expect(try contexto.fetch(FetchDescriptor<FaturaRegistro>()).count == 1)
        #expect(try contexto.fetch(FetchDescriptor<ContaRegistro>()).count == 1)
        #expect(try contexto.fetch(FetchDescriptor<OutboxItemRegistro>()).count == 1)
    }

    @Test("as três versões declaram identificadores diferentes")
    func versoesDistintas() {
        #expect(SchemaCasalV1.versionIdentifier != SchemaCasalV2.versionIdentifier)
        #expect(SchemaCasalV2.versionIdentifier != SchemaCasalV3.versionIdentifier)
        #expect(SchemaCasalV1.versionIdentifier == Schema.Version(1, 0, 0))
        #expect(SchemaCasalV2.versionIdentifier == Schema.Version(2, 0, 0))
        #expect(SchemaCasalV3.versionIdentifier == Schema.Version(3, 0, 0))
    }

    @Test("a versão 1 não conhece cartão, conta nem fatura")
    func v1SemCartao() {
        let nomes = SchemaCasalV1.models.map { String(describing: $0) }
        #expect(nomes.contains("TransacaoRegistro"))
        #expect(nomes.contains("CartaoRegistro") == false)
        #expect(nomes.contains("FaturaRegistro") == false)
        #expect(nomes.contains("ContaRegistro") == false)
        #expect(nomes.contains("OutboxItemRegistro") == false)
    }

    @Test("a versão 2 conhece as seis entidades (sem outbox)")
    func v2Completa() {
        #expect(SchemaCasalV2.models.count == 6)
        let nomes = SchemaCasalV2.models.map { String(describing: $0) }
        #expect(nomes.contains("OutboxItemRegistro") == false)
    }

    @Test("a versão 3 acrescenta OutboxItemRegistro")
    func v3ComOutbox() {
        #expect(SchemaCasalV3.models.count == 7)
        let nomes = SchemaCasalV3.models.map { String(describing: $0) }
        #expect(nomes.contains("OutboxItemRegistro"))
    }

    @Test("o plano de migração vai da v1→v2→v3")
    func planoDeMigracao() {
        #expect(PlanoMigracaoCasal.schemas.count == 3)
        #expect(PlanoMigracaoCasal.stages.count == 2)
    }

    @Test("um store gravado na v3 reabre com os dados intactos")
    func persistenciaEntreAberturas() throws {
        let url = URL.temporaryDirectory.appending(path: "\(UUID()).store")
        let cartaoID = UUID()
        let outboxID = UUID()

        do {
            let c1 = try SchemaCasal.container(url: url)
            let contexto = ModelContext(c1)
            let registro = CartaoRegistro()
            registro.id = cartaoID
            registro.apelido = "Nosso"
            registro.limiteCentavos = 800_000
            registro.diaFechamento = 28
            registro.diaVencimento = 5
            contexto.insert(registro)
            let item = OutboxItemRegistro()
            item.id = outboxID
            item.opBruto = "insert"
            item.tabelaBruta = "cards"
            contexto.insert(item)
            try contexto.save()
        }

        let c2 = try SchemaCasal.container(url: url)
        let ctx = ModelContext(c2)
        let encontrados = try ctx.fetch(FetchDescriptor<CartaoRegistro>())
        #expect(encontrados.count == 1)
        #expect(encontrados.first?.id == cartaoID)
        #expect(encontrados.first?.limiteCentavos == 800_000)
        #expect(encontrados.first?.diaVencimento == 5)
        let fila = try ctx.fetch(FetchDescriptor<OutboxItemRegistro>())
        #expect(fila.count == 1)
        #expect(fila.first?.id == outboxID)
    }
}
