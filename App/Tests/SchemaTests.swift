import CasalDomain
import Foundation
import SwiftData
import Testing
@testable import Casal

@Suite("Schema versionado")
struct SchemaTests {
    @Test("o container da versão atual abre e aceita as seis entidades")
    func containerAtual() throws {
        let container = try SchemaCasal.container(emMemoria: true)
        let contexto = ModelContext(container)

        contexto.insert(CarteiraRegistro())
        contexto.insert(CategoriaRegistro())
        contexto.insert(TransacaoRegistro())
        contexto.insert(ContaRegistro())
        contexto.insert(CartaoRegistro())
        contexto.insert(FaturaRegistro())
        try contexto.save()

        #expect(try contexto.fetch(FetchDescriptor<CartaoRegistro>()).count == 1)
        #expect(try contexto.fetch(FetchDescriptor<FaturaRegistro>()).count == 1)
        #expect(try contexto.fetch(FetchDescriptor<ContaRegistro>()).count == 1)
    }

    @Test("as duas versões declaram identificadores diferentes")
    func versoesDistintas() {
        #expect(SchemaCasalV1.versionIdentifier != SchemaCasalV2.versionIdentifier)
        #expect(SchemaCasalV1.versionIdentifier == Schema.Version(1, 0, 0))
        #expect(SchemaCasalV2.versionIdentifier == Schema.Version(2, 0, 0))
    }

    @Test("a versão 1 não conhece cartão, conta nem fatura")
    func v1SemCartao() {
        let nomes = SchemaCasalV1.models.map { String(describing: $0) }
        #expect(nomes.contains("TransacaoRegistro"))
        #expect(nomes.contains("CartaoRegistro") == false)
        #expect(nomes.contains("FaturaRegistro") == false)
        #expect(nomes.contains("ContaRegistro") == false)
    }

    @Test("a versão 2 conhece as seis entidades")
    func v2Completa() {
        #expect(SchemaCasalV2.models.count == 6)
    }

    @Test("o plano de migração vai da v1 para a v2")
    func planoDeMigracao() {
        #expect(PlanoMigracaoCasal.schemas.count == 2)
        #expect(PlanoMigracaoCasal.stages.count == 1)
    }

    @Test("um store gravado na v2 reabre com os dados intactos")
    func persistenciaEntreAberturas() throws {
        let url = URL.temporaryDirectory.appending(path: "\(UUID()).store")
        let cartaoID = UUID()

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
            try contexto.save()
        }

        let c2 = try SchemaCasal.container(url: url)
        let encontrados = try ModelContext(c2).fetch(FetchDescriptor<CartaoRegistro>())
        #expect(encontrados.count == 1)
        #expect(encontrados.first?.id == cartaoID)
        #expect(encontrados.first?.limiteCentavos == 800_000)
        #expect(encontrados.first?.diaVencimento == 5)
    }
}
