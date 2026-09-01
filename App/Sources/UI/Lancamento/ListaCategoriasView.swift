import CasalDomain
import SwiftUI

struct ListaCategoriasView: View {
    let categorias: [Categoria]
    @Binding var selecionada: Categoria?
    @Environment(\.dismiss) private var fechar

    var body: some View {
        NavigationStack {
            List(categorias) { categoria in
                Button {
                    selecionada = categoria
                    fechar()
                } label: {
                    HStack {
                        Label(categoria.nome, systemImage: categoria.icone)
                        Spacer()
                        if selecionada?.id == categoria.id {
                            Image(systemName: "checkmark")
                                .foregroundStyle(Color.accentColor)
                        }
                    }
                }
                .buttonStyle(.plain)
            }
            .navigationTitle("Categorias")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
