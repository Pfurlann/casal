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

    init() {}
}
