import CasalDomain
import SwiftData
import SwiftUI

struct RaizView: View {
    @Environment(\.modelContext) private var contexto
    // Dono do LancamentoModelo é este @State, não a closure do sheet: uma
    // reavaliação de body enquanto a sheet está aberta não pode mais
    // recriar o modelo e descartar valor/data/categoria já digitados.
    @State private var lancamento: LancamentoModelo?
    @State private var inicio: InicioModelo?
    @State private var carteira: Carteira?
    @State private var categorias: [Categoria] = []

    /// Altura padrão do conteúdo (ícone + rótulo) da tab bar do sistema,
    /// sem a faixa de segurança inferior — usada para erguer o botão
    /// central acima dela sem sobrepor nenhum rótulo de aba.
    private static let alturaConteudoBarraDeAbas: CGFloat = 49
    private static let respiroAcimaDaBarra: CGFloat = 14

    var body: some View {
        GeometryReader { geometria in
            ZStack(alignment: .bottom) {
                TabView {
                    NavigationStack {
                        if let inicio {
                            InicioView(modelo: inicio)
                        } else {
                            ProgressView()
                        }
                    }
                    .tabItem { Label("Início", systemImage: "circle.circle") }

                    NavigationStack {
                        ChegaNoProximoMilestone(
                            titulo: "Cartões",
                            detalhe: "Em breve você vai poder acompanhar faturas e parcelas de cartão por aqui."
                        )
                    }
                    .tabItem { Label("Cartões", systemImage: "creditcard") }

                    NavigationStack {
                        ChegaNoProximoMilestone(
                            titulo: "Metas",
                            detalhe: "Em breve você vai poder definir tetos de gasto e acompanhar objetivos por aqui."
                        )
                    }
                    .tabItem { Label("Metas", systemImage: "target") }

                    NavigationStack {
                        ChegaNoProximoMilestone(
                            titulo: "Mais",
                            detalhe: "Em breve você vai poder gerenciar carteiras e ajustes do app por aqui."
                        )
                    }
                    .tabItem { Label("Mais", systemImage: "ellipsis") }
                }

                botaoCentral
                    .padding(.bottom, geometria.safeAreaInsets.bottom
                        + Self.alturaConteudoBarraDeAbas
                        + Self.respiroAcimaDaBarra)
            }
        }
        .task { await preparar() }
        .sheet(item: $lancamento, onDismiss: { inicio?.recarregar() }, content: { modelo in
            LancamentoView(modelo: modelo)
        })
    }

    private var botaoCentral: some View {
        Button {
            guard let carteira else { return }
            lancamento = LancamentoModelo(
                repositorio: RepositorioSwiftData(contexto: contexto),
                carteira: carteira,
                categorias: categorias,
                autorID: IdentidadeLocal.donoID
            )
        } label: {
            Image(systemName: "plus")
                .font(.title2.weight(.semibold))
                .foregroundStyle(.white)
                .frame(width: 52, height: 52)
                .background(Color.accentColor, in: .circle)
                .shadow(color: .accentColor.opacity(0.45), radius: 12, y: 5)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Novo lançamento")
    }

    private func preparar() async {
        let repositorio = RepositorioSwiftData(contexto: contexto)
        carteira = try? Bootstrap.prepararSeNecessario(contexto: contexto, donoID: IdentidadeLocal.donoID)
        categorias = ((try? contexto.fetch(FetchDescriptor<CategoriaRegistro>())) ?? [])
            .map { $0.paraDominio() }
        let modelo = InicioModelo(repositorio: repositorio, categorias: categorias)
        modelo.recarregar()
        inicio = modelo
    }
}

struct ChegaNoProximoMilestone: View {
    let titulo: String
    let detalhe: String

    var body: some View {
        ContentUnavailableView(titulo, systemImage: "hammer", description: Text(detalhe))
            .navigationTitle(titulo)
    }
}
