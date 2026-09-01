import SwiftUI

struct MaisOpcoesView: View {
    @Bindable var modelo: LancamentoModelo
    @Environment(\.dismiss) private var fechar

    /// A home só mostra o mês corrente e não tem navegação entre meses,
    /// então um gasto salvo fora dele fica gravado mas invisível — trava
    /// a escolha aqui até a navegação por mês existir.
    private var intervaloDoMesAtual: ClosedRange<Date> {
        let intervalo = Calendar.current.dateInterval(of: .month, for: Date())
            ?? DateInterval(start: Date(), duration: 0)
        return intervalo.start...intervalo.end
    }

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
                    DatePicker(
                        "Data do gasto", selection: $modelo.data,
                        in: intervaloDoMesAtual, displayedComponents: .date
                    )
                    .datePickerStyle(.graphical)

                    Text("Ainda não dá para navegar por outros meses na tela inicial.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section {
                    Text("Parcelas e cartão de crédito chegam em breve.")
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
