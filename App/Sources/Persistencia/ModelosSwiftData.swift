import Foundation
import SwiftData

@Model
final class TransacaoRegistro {
    // Sem `#Unique`: a macro exige iOS 18 e o alvo é iOS 17. A unicidade
    // por id é garantida pelo upsert do repositório na Task 10.
    var id: UUID = UUID()
    var carteiraID: UUID = UUID()
    var tipoBruto: String = "despesa"
    var valorCentavos: Int = 0
    var data: Date = Date()
    var categoriaID: UUID?
    var descricao: String = ""
    var contaID: UUID?
    var cartaoID: UUID?
    var faturaID: UUID?
    var criadoPor: UUID = UUID()
    var estadoBruto: String = "confirmada"
    var origemBruta: String = "manual"
    var idExterno: String?
    var hashDedup: String = ""
    var grupoParcela: UUID?
    var parcelaN: Int = 1
    var parcelaTotal: Int = 1
    var criadoEm: Date = Date()
    var atualizadoEm: Date = Date()
    var removidoEm: Date?
    // Seção 7 do spec: toda tabela sincronizada carrega device_id.
    var dispositivoID: UUID?

    init() {}
}

@Model
final class CarteiraRegistro {
    var id: UUID = UUID()
    var nome: String = ""
    var cor: String = "#7C5CFF"
    var icone: String = "wallet.pass"
    var donoID: UUID = UUID()
    var visibilidadeBruta: String = "aberta"
    var rotuloBruto: String = "pessoal"
    var arquivada: Bool = false
    // Seção 7 do spec: created_at/updated_at/deleted_at/device_id em toda
    // tabela sincronizada. Defaults preservam a abertura de stores antigos.
    var criadoEm: Date = Date()
    var atualizadoEm: Date = Date()
    var removidoEm: Date?
    var dispositivoID: UUID?

    init() {}
}

@Model
final class CategoriaRegistro {
    var id: UUID = UUID()
    var carteiraID: UUID?
    var nome: String = ""
    var icone: String = ""
    var cor: String = ""
    var paiID: UUID?
    var tipoBruto: String = "despesa"
    // Seção 7 do spec: created_at/updated_at/deleted_at/device_id em toda
    // tabela sincronizada. Defaults preservam a abertura de stores antigos.
    var criadoEm: Date = Date()
    var atualizadoEm: Date = Date()
    var removidoEm: Date?
    var dispositivoID: UUID?

    init() {}
}

@Model
final class ContaRegistro {
    var id: UUID = UUID()
    var carteiraID: UUID = UUID()
    var nome: String = ""
    var tipoBruto: String = "corrente"
    var saldoInicialCentavos: Int = 0
    var arquivada: Bool = false
    // Seção 7 do spec: created_at/updated_at/deleted_at/device_id em toda
    // tabela sincronizada. Mesmos nomes usados pelos registros do M1.
    var criadoEm: Date = Date()
    var atualizadoEm: Date = Date()
    var removidoEm: Date?
    var dispositivoID: UUID?

    init() {}
}

@Model
final class CartaoRegistro {
    var id: UUID = UUID()
    var carteiraID: UUID = UUID()
    var apelido: String = ""
    var banco: String = ""
    var bandeiraBruta: String = "outra"
    var ultimos4: String = ""
    var cor: String = "#7C5CFF"
    var limiteCentavos: Int = 0
    var diaFechamento: Int = 1
    var diaVencimento: Int = 10
    var contaPagamentoID: UUID?
    var arquivado: Bool = false
    // Seção 7 do spec: created_at/updated_at/deleted_at/device_id em toda
    // tabela sincronizada. Mesmos nomes usados pelos registros do M1.
    var criadoEm: Date = Date()
    var atualizadoEm: Date = Date()
    var removidoEm: Date?
    var dispositivoID: UUID?

    init() {}
}

@Model
final class FaturaRegistro {
    var id: UUID = UUID()
    var cartaoID: UUID = UUID()
    var competenciaAno: Int = 2026
    var competenciaMes: Int = 1
    var fechaEm: Date = Date()
    var venceEm: Date = Date()
    var statusBruto: String = "aberta"
    var valorPagoCentavos: Int = 0
    // Seção 7 do spec: created_at/updated_at/deleted_at/device_id em toda
    // tabela sincronizada. Mesmos nomes usados pelos registros do M1.
    var criadoEm: Date = Date()
    var atualizadoEm: Date = Date()
    var removidoEm: Date?
    var dispositivoID: UUID?

    init() {}
}
