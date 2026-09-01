import SwiftUI

struct MaisOpcoesView: View {
    @Bindable var modelo: LancamentoModelo
    @Environment(\.dismiss) private var fechar

    var body: some View {
        NavigationStack {
            Form {
                Section("Estabelecimento") {
                    TextField("Onde foi o gasto", text: $modelo.descricao)
                        .textInputAutocapitalization(.words)
                        .onChange(of: modelo.descricao) { _, novo in
                            modelo.atualizarSugestoes(paraEstabelecimento: novo)
                        }
                }

                Section("Data") {
                    DatePicker("Data do gasto", selection: $modelo.data, displayedComponents: .date)
                        .datePickerStyle(.graphical)
                }

                Section {
                    Text("Parcelas e cartão chegam no próximo milestone.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Mais opções")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Pronto") { fechar() }
                }
            }
        }
    }
}
