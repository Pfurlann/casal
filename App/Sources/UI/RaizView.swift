import CasalDomain
import SwiftData
import SwiftUI

struct RaizView: View {
    @Environment(\.modelContext) private var contexto
    @State private var mostrandoLancamento = false
    @State private var inicio: InicioModelo?
    @State private var carteira: Carteira?
    @State private var categorias: [Categoria] = []

    var body: some View {
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
                    ChegaNoProximoMilestone(titulo: "Cartões", detalhe: "Faturas e parcelas chegam no M2.")
                }
                .tabItem { Label("Cartões", systemImage: "creditcard") }

                NavigationStack {
                    ChegaNoProximoMilestone(titulo: "Metas", detalhe: "Tetos e objetivos chegam no M4.")
                }
                .tabItem { Label("Metas", systemImage: "target") }

                NavigationStack {
                    ChegaNoProximoMilestone(titulo: "Mais", detalhe: "Carteiras e ajustes chegam no M3.")
                }
                .tabItem { Label("Mais", systemImage: "ellipsis") }
            }

            botaoCentral
        }
        .task { await preparar() }
        .sheet(isPresented: $mostrandoLancamento, onDismiss: { inicio?.recarregar() }, content: {
            if let carteira {
                LancamentoView(
                    modelo: LancamentoModelo(
                        repositorio: RepositorioSwiftData(contexto: contexto),
                        carteira: carteira,
                        categorias: categorias,
                        autorID: IdentidadeLocal.donoID
                    )
                )
            }
        })
    }

    private var botaoCentral: some View {
        Button {
            mostrandoLancamento = true
        } label: {
            Image(systemName: "plus")
                .font(.title2.weight(.semibold))
                .foregroundStyle(.white)
                .frame(width: 52, height: 52)
                .background(Color.accentColor, in: .circle)
                .shadow(color: .accentColor.opacity(0.45), radius: 12, y: 5)
        }
        .buttonStyle(.plain)
        .offset(y: -6)
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
