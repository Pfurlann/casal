import SwiftUI

struct TecladoNumerico: View {
    let aoDigitar: (Int) -> Void
    let aoApagar: () -> Void
    let aoAbrirMais: () -> Void
    let aoSalvar: () -> Void
    let podeSalvar: Bool

    private let colunas = Array(repeating: GridItem(.flexible(), spacing: 6), count: 3)

    var body: some View {
        VStack(spacing: 6) {
            HStack {
                Spacer()
                botaoApagar
            }

            LazyVGrid(columns: colunas, spacing: 6) {
                ForEach(1...9, id: \.self) { numero in
                    tecla("\(numero)") { aoDigitar(numero) }
                }
                tecla("···", peso: .regular, action: aoAbrirMais)
                tecla("0") { aoDigitar(0) }
                teclaSalvar
            }
        }
        .padding(.horizontal, 4)
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
