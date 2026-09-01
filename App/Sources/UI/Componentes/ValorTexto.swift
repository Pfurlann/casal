import CasalDomain
import SwiftUI

/// Digitação estilo caixa de supermercado: cada tecla empurra um dígito
/// pela direita, sem vírgula manual. Menos toque, menos erro.
struct EntradaValor {
    static let tetoCentavos = 99_999_999  // R$ 999.999,99

    private(set) var centavos: Int = 0

    var valor: Money { Money(centavos: centavos) }
    var podeSalvar: Bool { centavos > 0 }
    var texto: String { valor.formatadoBRL }

    mutating func digitar(_ digito: Int) {
        guard (0...9).contains(digito) else { return }
        let candidato = centavos * 10 + digito
        guard candidato <= Self.tetoCentavos else { return }
        centavos = candidato
    }

    mutating func apagar() {
        centavos /= 10
    }

    mutating func limpar() {
        centavos = 0
    }
}

struct ValorTexto: View {
    let valor: Money
    var tamanho: CGFloat = 44

    var body: some View {
        Text(valor.formatadoBRL)
            .font(.system(size: tamanho, weight: .bold, design: .rounded))
            .monospacedDigit()
            .contentTransition(.numericText())
            .animation(.snappy(duration: 0.18), value: valor.centavos)
    }
}
