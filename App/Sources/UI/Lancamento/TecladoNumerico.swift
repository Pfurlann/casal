import SwiftUI

struct TecladoNumerico: View {
    let aoDigitar: (Int) -> Void
    let aoApagar: () -> Void
    let aoAbrirMais: () -> Void
    let aoSalvar: () -> Void
    let podeSalvar: Bool
    /// No lançamento as teclas `···` e Salvar fazem parte do fluxo.
    /// Em formulários (limite, pagar fatura) o salvar vive na toolbar —
    /// deixar essas teclas mortas só come altura e confunde.
    var mostraAcoes: Bool = true

    var body: some View {
        VStack(spacing: 6) {
            HStack {
                Spacer()
                botaoApagar
            }

            // VStack+HStack, não LazyVGrid: dentro de Form/List o grid
            // preguiçoso não reporta altura e a fileira do 0 some cortada.
            VStack(spacing: 6) {
                fileira([1, 2, 3])
                fileira([4, 5, 6])
                fileira([7, 8, 9])
                HStack(spacing: 6) {
                    if mostraAcoes {
                        tecla("···", peso: .regular, action: aoAbrirMais)
                    } else {
                        Color.clear.frame(minHeight: 56)
                    }
                    tecla("0") { aoDigitar(0) }
                    if mostraAcoes {
                        teclaSalvar
                    } else {
                        Color.clear.frame(minHeight: 56)
                    }
                }
            }
        }
        .padding(.horizontal, 4)
    }

    private func fileira(_ numeros: [Int]) -> some View {
        HStack(spacing: 6) {
            ForEach(numeros, id: \.self) { numero in
                tecla("\(numero)") { aoDigitar(numero) }
            }
        }
    }

    /// Afordância visível para corrigir um dígito errado. Antes disso a
    /// única forma de apagar era o swipe não documentado sobre o valor.
    private var botaoApagar: some View {
        Button(action: aoApagar) {
            Image(systemName: "delete.left")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(.secondary)
                .frame(width: 40, height: 32)
                .background(Color.primary.opacity(0.06), in: .rect(cornerRadius: 8))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Apagar último dígito")
    }

    private func tecla(
        _ rotulo: String,
        peso: Font.Weight = .semibold,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Text(rotulo)
                .font(.system(size: 24, weight: peso, design: .rounded))
                .frame(maxWidth: .infinity, minHeight: 56)
                .background(Color.primary.opacity(0.06), in: .rect(cornerRadius: 12))
        }
        .buttonStyle(.plain)
        .contentShape(.rect)
        .accessibilityLabel(rotulo == "···" ? "Mais opções" : rotulo)
    }

    private var teclaSalvar: some View {
        Button(action: aoSalvar) {
            Text("Salvar")
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, minHeight: 56)
                .background(podeSalvar ? Color.accentColor : Color.gray.opacity(0.4), in: .rect(cornerRadius: 12))
        }
        .buttonStyle(.plain)
        .disabled(!podeSalvar)
        .accessibilityLabel("Salvar gasto")
    }
}

#Preview {
    TecladoNumerico(
        aoDigitar: { _ in },
        aoApagar: {},
        aoAbrirMais: {},
        aoSalvar: {},
        podeSalvar: true
    )
}
