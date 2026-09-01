import CasalDomain
import SwiftUI

struct CartaoDetalheView: View {
    @Bindable var modelo: CartaoDetalheModelo
    let aoPagarFatura: (Cartao, Fatura, Money) -> Void
    let aoEditarCartao: (Cartao) -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                carrossel
                seletorDeAba

                if modelo.aba == .futuras {
                    listaDeFuturas
                } else {
                    cabecalhoDaFatura
                    listaDeLancamentos
                }
            }
            .padding(16)
        }
        .navigationTitle(modelo.cartaoAtual?.apelido ?? "Cartão")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                if let cartao = modelo.cartaoAtual {
                    Button("Editar") { aoEditarCartao(cartao) }
                }
            }
        }
        .onAppear { modelo.recarregar() }
    }

    private var carrossel: some View {
        TabView(selection: $modelo.indiceSelecionado) {
            ForEach(Array(modelo.cartoes.enumerated()), id: \.element.id) { indice, cartao in
                CartaoFace(
                    cartao: cartao,
                    tamanho: .grande,
                    faturaAtual: modelo.aba == .futuras ? nil : modelo.totalDaAba
                )
                .tag(indice)
                .padding(.horizontal, 2)
            }
        }
        .tabViewStyle(.page(indexDisplayMode: modelo.cartoes.count > 1 ? .automatic : .never))
        .frame(height: TamanhoCartaoFace.grande.altura + 28)
    }

    private var seletorDeAba: some View {
        Picker("Fatura", selection: $modelo.aba) {
            ForEach(AbaFatura.allCases) { aba in
                Text(aba.titulo).tag(aba)
            }
        }
        .pickerStyle(.segmented)
    }

    private var cabecalhoDaFatura: some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                if let fatura = modelo.faturaDaAbaAtual {
                    Text("Vence \(fatura.venceEm.formatted(.dateTime.day().month(.abbreviated)))")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(.secondary)
                }
                ValorTexto(valor: modelo.totalDaAba, tamanho: 24)
            }
            Spacer()
            botaoDePagar
        }
        .padding(12)
        .background(Color.primary.opacity(0.06), in: .rect(cornerRadius: 12))
    }

    @ViewBuilder
    private var botaoDePagar: some View {
        if let cartao = modelo.cartaoAtual,
           let fatura = modelo.faturaDaAbaAtual,
           fatura.status != .paga,
           modelo.totalDaAba.centavos > 0 {
            Button("Pagar") {
                aoPagarFatura(cartao, fatura, modelo.totalDaAba)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.small)
        }
    }

    private var listaDeLancamentos: some View {
        VStack(spacing: 0) {
            if modelo.lancamentos.isEmpty {
                Text("Nenhum lançamento nesta fatura")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 26)
            } else {
                ForEach(modelo.lancamentos) { transacao in
                    linhaDeLancamento(transacao)

                    if transacao.id != modelo.lancamentos.last?.id { Divider() }
                }
            }
        }
    }

    private func linhaDeLancamento(_ transacao: Transacao) -> some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text(transacao.descricao.isEmpty ? "Sem descrição" : transacao.descricao)
                    .font(.subheadline.weight(.semibold))
                Text(transacao.data.formatted(.dateTime.day().month(.abbreviated)))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text(transacao.valor.formatadoBRL)
                    .font(.subheadline.weight(.bold))
                    .monospacedDigit()
                if transacao.parcelaTotal > 1 {
                    Text("\(transacao.parcelaN) de \(transacao.parcelaTotal)")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 7)
    }

    private var listaDeFuturas: some View {
        VStack(spacing: 0) {
            ForEach(modelo.faturasFuturas, id: \.competencia) { ponto in
                HStack {
                    Text("\(ponto.competencia.rotuloCurto) \(String(ponto.competencia.ano))")
                        .font(.subheadline.weight(.semibold))
                    Spacer()
                    Text(ponto.total.formatadoBRL)
                        .font(.subheadline.weight(.bold))
                        .monospacedDigit()
                }
                .padding(.vertical, 9)

                if ponto.competencia != modelo.faturasFuturas.last?.competencia { Divider() }
            }
        }
    }
}
