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
    @State private var cartoes: CartoesModelo?
    // Mesma regra do lançamento: dono é este @State, não a closure que abre a
    // tela — senão uma reavaliação de body descartaria o carrossel/aba já
    // selecionados, ou o formulário já preenchido.
    @State private var cartaoDetalhe: CartaoDetalheModelo?
    @State private var cartaoForm: CartaoFormModelo?
    @State private var pagarFatura: PagarFaturaModelo?
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
                        if let cartoes {
                            CartoesView(
                                modelo: cartoes,
                                aoAbrirCartao: abrirCartao,
                                aoAdicionarCartao: adicionarCartao
                            )
                            .navigationDestination(isPresented: Binding(
                                get: { cartaoDetalhe != nil },
                                set: { aberto in if !aberto { cartaoDetalhe = nil } }
                            )) {
                                if let cartaoDetalhe {
                                    CartaoDetalheView(
                                        modelo: cartaoDetalhe,
                                        aoPagarFatura: abrirPagarFatura,
                                        aoEditarCartao: editarCartao
                                    )
                                }
                            }
                        } else {
                            ProgressView()
                        }
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
        .sheet(
            isPresented: Binding(
                get: { cartaoForm != nil },
                set: { aberto in if !aberto { cartaoForm = nil } }
            ),
            onDismiss: { cartoes?.recarregar() },
            content: {
                if let cartaoForm {
                    CartaoFormView(modelo: cartaoForm)
                }
            }
        )
        .sheet(
            isPresented: Binding(
                get: { pagarFatura != nil },
                set: { aberto in if !aberto { pagarFatura = nil } }
            ),
            onDismiss: {
                cartaoDetalhe?.recarregar()
                cartoes?.recarregar()
                inicio?.recarregar()
            },
            content: {
                if let pagarFatura {
                    PagarFaturaView(modelo: pagarFatura)
                }
            }
        )
    }

    private var botaoCentral: some View {
        Button {
            guard let carteira else { return }
            lancamento = LancamentoModelo(
                repositorio: RepositorioSwiftData(contexto: contexto),
                repositorioCartoes: RepositorioCartoesSwiftData(contexto: contexto),
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

    private func abrirCartao(_ cartao: Cartao) {
        let modelo = CartaoDetalheModelo(
            repositorioCartoes: RepositorioCartoesSwiftData(contexto: contexto),
            repositorioFaturas: RepositorioFaturasSwiftData(contexto: contexto),
            repositorioTransacoes: RepositorioSwiftData(contexto: contexto)
        )
        modelo.recarregar()
        if let indice = modelo.cartoes.firstIndex(where: { $0.id == cartao.id }) {
            modelo.indiceSelecionado = indice
        }
        cartaoDetalhe = modelo
    }

    private func abrirPagarFatura(_ cartao: Cartao, _ fatura: Fatura, _ totalDaFatura: Money) {
        guard let carteira else { return }
        pagarFatura = PagarFaturaModelo(
            repositorioTransacoes: RepositorioSwiftData(contexto: contexto),
            repositorioFaturas: RepositorioFaturasSwiftData(contexto: contexto),
            repositorioCartoes: RepositorioCartoesSwiftData(contexto: contexto),
            cartao: cartao,
            fatura: fatura,
            totalDaFatura: totalDaFatura,
            carteiraID: carteira.id,
            autorID: IdentidadeLocal.donoID
        )
    }

    private func adicionarCartao() {
        guard let carteira else { return }
        cartaoForm = CartaoFormModelo(
            repositorio: RepositorioCartoesSwiftData(contexto: contexto),
            carteiraID: carteira.id,
            cartaoExistente: nil
        )
    }

    private func editarCartao(_ cartao: Cartao) {
        cartaoForm = CartaoFormModelo(
            repositorio: RepositorioCartoesSwiftData(contexto: contexto),
            carteiraID: carteira?.id ?? cartao.carteiraID,
            cartaoExistente: cartao
        )
    }

    private func preparar() async {
        let repositorio = RepositorioSwiftData(contexto: contexto)
        carteira = try? Bootstrap.prepararSeNecessario(contexto: contexto, donoID: IdentidadeLocal.donoID)
        categorias = ((try? contexto.fetch(FetchDescriptor<CategoriaRegistro>())) ?? [])
            .map { $0.paraDominio() }
        let modelo = InicioModelo(
            repositorio: repositorio,
            repositorioCartoes: RepositorioCartoesSwiftData(contexto: contexto),
            categorias: categorias
        )
        modelo.recarregar()
        inicio = modelo

        let modeloDeCartoes = CartoesModelo(
            repositorioCartoes: RepositorioCartoesSwiftData(contexto: contexto),
            repositorioFaturas: RepositorioFaturasSwiftData(contexto: contexto),
            repositorioTransacoes: repositorio
        )
        modeloDeCartoes.recarregar()
        cartoes = modeloDeCartoes
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
