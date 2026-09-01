import CasalDomain
import SwiftUI

struct ListaCategoriasView: View {
    let categorias: [Categoria]
    @Binding var selecionada: Categoria?
    var body: some View { Text("Categorias") }
}
