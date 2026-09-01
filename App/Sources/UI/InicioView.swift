import CasalDomain
import SwiftUI

struct InicioView: View {
    @Bindable var modelo: InicioModelo

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                cartaoResumo

                if modelo.comprometidoNoMes.centavos > 0 {
                    Text("Comprometido em faturas: \(modelo.comprometidoNoMes.formatadoBRL)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                if modelo.transacoes.isEmpty {
                    vazio
                } else {
                    Text("LANÇAMENTOS")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.secondary)

                    ForEach(modelo.transacoes) { transacao in
                        linha(transacao)
                    }
                }
            }
            .padding(16)
        }
        .navigationTitle("Nosso mês")
        .onAppear { modelo.recarregar() }
    }

    private var cartaoResumo: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Gasto neste mês")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.white.opacity(0.85))
            ValorTexto(valor: modelo.resumo.totalDespesas, tamanho: 34)
                .foregroundStyle(.white)
            Text("\(modelo.resumo.quantidade) lançamentos")
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.8))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color.accentColor.gradient, in: .rect(cornerRadius: 16))
    }

    private var vazio: some View {
        VStack(spacing: 8) {
            Image(systemName: "tray")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text("Nenhum gasto este mês")
                .font(.subheadline.weight(.semibold))
            Text("Toque no + para registrar o primeiro.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    private func linha(_ transacao: Transacao) -> some View {
        HStack(spacing: 10) {
            Image(systemName: modelo.categoria(de: transacao)?.icone ?? "circle")
                .frame(width: 28, height: 28)
                .background(Color.primary.opacity(0.07), in: .rect(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 2) {
                Text(transacao.descricao.isEmpty ? "Sem descrição" : transacao.descricao)
                    .font(.subheadline.weight(.semibold))
                Text(modelo.categoria(de: transacao)?.nome ?? "Sem categoria")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Text(transacao.valor.formatadoBRL)
                .font(.subheadline.weight(.bold))
                .monospacedDigit()
        }
        .padding(.vertical, 6)
    }
}
