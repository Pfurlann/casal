import CasalDomain
import SwiftUI

struct MaisOpcoesView: View {
    @Bindable var modelo: LancamentoModelo
    @Environment(\.dismiss) private var fechar

    /// A home só mostra o mês corrente e não tem navegação entre meses,
    /// então um gasto salvo fora dele fica gravado mas invisível — trava
    /// a escolha aqui até a navegação por mês existir.
    ///
    /// O limite superior é o último instante do mês, não `intervalo.end`:
    /// esse é meia-noite do dia 1 do mês seguinte, e num `ClosedRange` ainda
    /// permitia escolher esse dia e gravar num mês invisível na home.
    private var intervaloDoMesAtual: ClosedRange<Date> {
        let intervalo = Calendar.current.dateInterval(of: .month, for: Date())
            ?? DateInterval(start: Date(), duration: 0)
        return intervalo.start...intervalo.end.addingTimeInterval(-1)
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

                Section("Pago com") {
                    Picker("Cartão", selection: $modelo.cartaoSelecionado) {
                        Text("Dinheiro, Pix ou débito").tag(nil as Cartao?)
                        ForEach(modelo.cartoesDisponiveis) { cartao in
                            Text("\(cartao.banco) ••\(cartao.ultimos4)").tag(cartao as Cartao?)
                        }
                    }
                }

                if modelo.cartaoSelecionado != nil {
                    Section("Parcelas") {
                        Picker("Parcelar em", selection: $modelo.parcelas) {
                            Text("À vista").tag(1)
                            ForEach(2...24, id: \.self) { vezes in
                                Text("\(vezes)x").tag(vezes)
                            }
                        }
                        if modelo.parcelas > 1 {
                            let cada = modelo.entrada.valor.dividir(em: modelo.parcelas).first ?? .zero
                            Text("\(modelo.parcelas)x de \(cada.formatadoBRL), "
                                + "primeira parcela maior se houver sobra")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
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
