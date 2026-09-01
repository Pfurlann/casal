import CasalDomain
import SwiftUI

struct ChipsCategoria: View {
    let categorias: [Categoria]
    @Binding var selecionada: Categoria?
    let aoPedirTodas: () -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(categorias) { categoria in
                    chip(categoria)
                }
                Button(action: aoPedirTodas) {
                    Text("+ outras")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(.secondary.opacity(0.35), style: .init(lineWidth: 1, dash: [4]))
                        )
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 4)
        }
    }

    private func chip(_ categoria: Categoria) -> some View {
        let ativa = selecionada?.id == categoria.id
        return Button {
            selecionada = categoria
        } label: {
            Label(categoria.nome, systemImage: categoria.icone)
                .font(.caption.weight(.semibold))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(
                    ativa ? Color.accentColor : Color.primary.opacity(0.07),
                    in: .rect(cornerRadius: 16)
                )
                .foregroundStyle(ativa ? .white : .primary)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(ativa ? [.isSelected] : [])
    }
}
