import CasalDomain
import SwiftUI

struct CartoesView: View {
    @Bindable var modelo: CartoesModelo
    let aoAbrirCartao: (Cartao) -> Void
    let aoAdicionarCartao: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if modelo.cartoes.isEmpty {
                    vazio
                } else {
                    totalDoMes
                    listaDeCartoes
                    curvaDeFuturas
                }
            }
            .padding(16)
        }
        .navigationTitle("Cartões")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button(action: aoAdicionarCartao) {
                    Image(systemName: "plus")
                }
                .accessibilityLabel("Adicionar cartão")
            }
        }
        .onAppear { modelo.recarregar() }
    }

    private var vazio: some View {
        ContentUnavailableView {
            Label("Nenhum cartão", systemImage: "creditcard")
        } description: {
            Text("Cadastre um cartão para acompanhar faturas e parcelas.")
        } actions: {
            Button("Adicionar cartão", action: aoAdicionarCartao)
                .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    private var totalDoMes: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text("Total a pagar neste mês")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.white.opacity(0.85))
            ValorTexto(valor: modelo.totalDoMes, tamanho: 30)
                .foregroundStyle(.white)
            Text("\(modelo.cartoes.count) \(modelo.cartoes.count == 1 ? "cartão" : "cartões")")
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.8))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color.accentColor.gradient, in: .rect(cornerRadius: 16))
    }

    private var listaDeCartoes: some View {
        VStack(spacing: 0) {
            ForEach(modelo.cartoes) { cartao in
                Button { aoAbrirCartao(cartao) } label: {
                    linha(cartao)
                }
                .buttonStyle(.plain)

                if cartao.id != modelo.cartoes.last?.id {
                    Divider()
                }
            }
        }
    }

    private func linha(_ cartao: Cartao) -> some View {
        let resumo = modelo.resumoPorCartao[cartao.id]
        return HStack(spacing: 10) {
            CartaoFace(cartao: cartao, tamanho: .miniatura)
                .frame(width: 52)

            VStack(alignment: .leading, spacing: 2) {
                Text("\(cartao.banco) · \(cartao.apelido)")
                    .font(.subheadline.weight(.semibold))
                if let resumo {
                    Text("Fecha \(diaFormatado(resumo.fechaEm)) · vence \(diaFormatado(resumo.venceEm))")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text((resumo?.faturaAtual ?? .zero).formatadoBRL)
                    .font(.subheadline.weight(.bold))
                    .monospacedDigit()
                Text("próx. \((resumo?.proximaFatura ?? .zero).formatadoBRL)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 9)
        .contentShape(.rect)
    }

    private var curvaDeFuturas: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text("PRÓXIMAS FATURAS · TODOS OS CARTÕES")
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(.secondary)

            HStack(alignment: .bottom, spacing: 6) {
                ForEach(modelo.curva, id: \.competencia) { ponto in
                    VStack(spacing: 4) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.accentColor.gradient)
                            .frame(height: altura(de: ponto.total))
                            .accessibilityLabel(
                                "\(ponto.competencia.rotuloCurto): \(ponto.total.formatadoBRL)"
                            )
                        Text(ponto.competencia.rotuloCurto)
                            .font(.system(size: 9))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .frame(height: 76)
        }
    }

    /// Escala as barras pelo maior valor da curva. Curva toda zerada desenha
    /// barras de altura mínima em vez de dividir por zero.
    private func altura(de valor: Money) -> CGFloat {
        let maior = modelo.curva.map(\.total.centavos).max() ?? 0
        guard maior > 0 else { return 2 }
        return max(CGFloat(valor.centavos) / CGFloat(maior) * 58, 2)
    }

    private func diaFormatado(_ data: Date) -> String {
        data.formatted(.dateTime.day())
    }
}
