import CasalDomain
import SwiftUI

struct LancamentoView: View {
    @Bindable var modelo: LancamentoModelo
    @Environment(\.dismiss) private var fechar
    @State private var mostrandoMaisOpcoes = false
    @State private var mostrandoTodasCategorias = false

    var body: some View {
        VStack(spacing: 14) {
            cabecalho

            ValorTexto(valor: modelo.entrada.valor)
                .frame(maxWidth: .infinity)
                .contentShape(.rect)
                .gesture(
                    DragGesture(minimumDistance: 24)
                        .onEnded { gesto in
                            if gesto.translation.width < 0 { modelo.entrada.apagar() }
                        }
                )
                .accessibilityHint("Deslize para a esquerda para apagar o último dígito")

            Text(modelo.data.formatted(.dateTime.weekday(.wide).day().month()))
                .font(.caption)
                .foregroundStyle(.secondary)

            ChipsCategoria(
                categorias: modelo.categoriasSugeridas,
                selecionada: $modelo.categoriaSelecionada,
                aoPedirTodas: { mostrandoTodasCategorias = true }
            )

            TecladoNumerico(
                aoDigitar: { modelo.entrada.digitar($0) },
                aoApagar: { modelo.entrada.apagar() },
                aoAbrirMais: { mostrandoMaisOpcoes = true },
                aoSalvar: salvar,
                podeSalvar: modelo.entrada.podeSalvar
            )
        }
        .padding(16)
        .presentationDetents([.large])
        .sheet(isPresented: $mostrandoMaisOpcoes) {
            MaisOpcoesView(modelo: modelo)
        }
        .sheet(isPresented: $mostrandoTodasCategorias) {
            ListaCategoriasView(
                categorias: modelo.categorias.filter { $0.tipo == .despesa },
                selecionada: $modelo.categoriaSelecionada
            )
        }
    }

    private var cabecalho: some View {
        HStack {
            Label(modelo.carteira.nome, systemImage: modelo.carteira.icone)
                .font(.caption.weight(.semibold))
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(Color.primary.opacity(0.08), in: .capsule)

            Spacer()

            Button { fechar() } label: {
                Image(systemName: "xmark")
                    .font(.caption.weight(.bold))
                    .padding(6)
                    .background(Color.primary.opacity(0.08), in: .circle)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Fechar")
        }
    }

    private func salvar() {
        do {
            try modelo.salvar()
            fechar()
        } catch {
            // Escrita local que falha é bug, não estado esperado.
            assertionFailure("Falha ao salvar lançamento: \(error)")
        }
    }
}
