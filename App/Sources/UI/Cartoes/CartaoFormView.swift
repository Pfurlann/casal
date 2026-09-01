import CasalDomain
import SwiftUI

struct CartaoFormView: View {
    @Bindable var modelo: CartaoFormModelo
    @Environment(\.dismiss) private var fechar
    @State private var erroAoSalvar: String?

    private let cores = ["#7C5CFF", "#8A2BE2", "#FF9F0A", "#FF453A", "#34C759", "#0A84FF", "#2C2C2E"]

    var body: some View {
        NavigationStack {
            Form {
                previaSection
                identificacaoSection
                limiteSection
                cicloSection
                corSection
                errosSection
            }
            .navigationTitle("Cartão")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { fechar() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Salvar", action: salvar).disabled(!modelo.podeSalvar)
                }
            }
            .alert("Não foi possível salvar", isPresented: Binding(
                get: { erroAoSalvar != nil },
                set: { if !$0 { erroAoSalvar = nil } }
            )) {
                Button("OK") { erroAoSalvar = nil }
            } message: {
                Text(erroAoSalvar ?? "")
            }
        }
    }

    private var previaSection: some View {
        Section {
            CartaoFace(cartao: modelo.cartaoDePrevia, tamanho: .media)
                .listRowInsets(EdgeInsets())
                .listRowBackground(Color.clear)
        }
    }

    private var identificacaoSection: some View {
        Section("Identificação") {
            TextField("Apelido", text: $modelo.apelido)
                .textInputAutocapitalization(.words)
            TextField("Banco", text: $modelo.banco)
                .textInputAutocapitalization(.words)
            TextField("Últimos 4 dígitos", text: $modelo.ultimos4)
                .keyboardType(.numberPad)
            Picker("Bandeira", selection: $modelo.bandeira) {
                ForEach(BandeiraCartao.allCases, id: \.self) { bandeira in
                    Text(bandeira == .outra ? "Outra" : bandeira.rawValue.capitalized)
                        .tag(bandeira)
                }
            }
        }
    }

    private var limiteSection: some View {
        Section("Limite") {
            HStack {
                Text("Limite total")
                Spacer()
                ValorTexto(valor: modelo.entradaLimite.valor, tamanho: 17)
            }
            TecladoNumerico(
                aoDigitar: { modelo.entradaLimite.digitar($0) },
                aoApagar: { modelo.entradaLimite.apagar() },
                aoAbrirMais: {},
                aoSalvar: {},
                podeSalvar: false
            )
            .listRowInsets(EdgeInsets(top: 6, leading: 6, bottom: 6, trailing: 6))
        }
    }

    private var cicloSection: some View {
        Section("Ciclo") {
            Stepper(
                "Fecha no dia \(modelo.diaFechamento)",
                value: $modelo.diaFechamento, in: 1...31
            )
            Stepper(
                "Vence no dia \(modelo.diaVencimento)",
                value: $modelo.diaVencimento, in: 1...31
            )
            Text(explicacaoDoCiclo)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private var corSection: some View {
        Section("Cor") {
            HStack(spacing: 9) {
                ForEach(cores, id: \.self) { hex in
                    Circle()
                        .fill(CartaoFace.cor(deHex: hex))
                        .frame(width: 28, height: 28)
                        .overlay(
                            Circle().stroke(.primary, lineWidth: modelo.cor == hex ? 2 : 0)
                        )
                        .onTapGesture { modelo.cor = hex }
                        .accessibilityLabel("Cor \(hex)")
                }
            }
        }
    }

    @ViewBuilder
    private var errosSection: some View {
        if !modelo.erros.isEmpty {
            Section {
                ForEach(modelo.erros, id: \.self) { erro in
                    Label(erro, systemImage: "exclamationmark.circle")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    /// Explica em texto o efeito da combinação escolhida, porque a relação
    /// entre fechamento e vencimento decide em que mês a fatura vence e é a
    /// parte que mais confunde.
    private var explicacaoDoCiclo: String {
        modelo.diaVencimento > modelo.diaFechamento
            ? "A fatura fecha e vence no mesmo mês."
            : "A fatura fecha num mês e vence no mês seguinte."
    }

    private func salvar() {
        do {
            try modelo.salvar()
            fechar()
        } catch {
            erroAoSalvar = "Não foi possível salvar o cartão. Tente novamente."
        }
    }
}
