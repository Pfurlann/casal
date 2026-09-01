import CasalDomain
import Foundation
import Observation
import SwiftUI

@Observable
final class PagarFaturaModelo {
    var entrada: EntradaValor
    var contaSelecionada: Conta?

    let cartao: Cartao
    let totalDaFatura: Money
    private(set) var fatura: Fatura

    private let repositorioTransacoes: RepositorioTransacoes
    private let repositorioFaturas: RepositorioFaturas
    private let repositorioCartoes: RepositorioCartoes
    private let carteiraID: UUID
    private let autorID: UUID

    init(
        repositorioTransacoes: RepositorioTransacoes,
        repositorioFaturas: RepositorioFaturas,
        repositorioCartoes: RepositorioCartoes,
        cartao: Cartao,
        fatura: Fatura,
        totalDaFatura: Money,
        carteiraID: UUID,
        autorID: UUID
    ) {
        self.repositorioTransacoes = repositorioTransacoes
        self.repositorioFaturas = repositorioFaturas
        self.repositorioCartoes = repositorioCartoes
        self.cartao = cartao
        self.fatura = fatura
        self.totalDaFatura = totalDaFatura
        self.carteiraID = carteiraID
        self.autorID = autorID

        let devedor = PagamentoFatura.saldoDevedor(fatura: fatura, total: totalDaFatura)
        entrada = EntradaValor(centavos: devedor.centavos)
        contaSelecionada = (try? repositorioCartoes.listarContas())?.first
    }

    var contasDisponiveis: [Conta] {
        (try? repositorioCartoes.listarContas()) ?? []
    }

    var saldoDevedor: Money {
        PagamentoFatura.saldoDevedor(fatura: fatura, total: totalDaFatura)
    }

    var podePagar: Bool {
        entrada.podeSalvar && contaSelecionada != nil
    }

    /// Grava a transferência que quita (ou abate) a fatura. Este é o
    /// momento legítimo de escrever: o pagamento realmente aconteceu, então
    /// tanto a transação quanto a fatura atualizada precisam ser
    /// persistidas — ao contrário das telas de exibição de Cartões, que
    /// nunca gravam nada.
    ///
    /// A `fatura` recebida no `init` pode ser transiente — a tela de
    /// detalhe monta uma na hora, com `id` novo a cada acesso, quando ainda
    /// não existe linha gravada para a competência (ver
    /// `CartaoDetalheModelo.faturaDaAbaAtual`). Gravar a transação direto
    /// contra esse `id` a deixaria órfã: `atualizarFatura` não encontra
    /// linha nenhuma e no-opa em silêncio. `faturaOuCriar` casa por cartão
    /// + competência, não por id, então resolve para a linha existente ou
    /// cria uma — e é exatamente o momento que `RepositorioFaturas.swift`
    /// documenta como o nascimento legítimo da fatura.
    func pagar() throws {
        guard let conta = contaSelecionada, entrada.podeSalvar else { return }

        fatura = try repositorioFaturas.faturaOuCriar(
            cartao: cartao, competencia: fatura.competencia, calendario: .current
        )

        let contexto = ContextoDeLancamento(carteiraID: carteiraID, criadoPor: autorID, calendario: .current)
        var transacao = PagamentoFatura.transacao(
            valor: entrada.valor,
            faturaID: fatura.id,
            contaID: conta.id,
            contexto: contexto,
            data: Date()
        )
        transacao.dispositivoID = IdentidadeLocal.dispositivoID
        try repositorioTransacoes.salvar(transacao)

        fatura = PagamentoFatura.aplicar(
            pagamento: entrada.valor, em: fatura, totalDaFatura: totalDaFatura
        )
        try repositorioFaturas.atualizarFatura(fatura)
    }
}

struct PagarFaturaView: View {
    @Bindable var modelo: PagarFaturaModelo
    @Environment(\.dismiss) private var fechar
    @State private var erro: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Saldo devedor")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        ValorTexto(valor: modelo.saldoDevedor, tamanho: 26)
                    }
                }

                Section("Valor a pagar") {
                    HStack {
                        Spacer()
                        ValorTexto(valor: modelo.entrada.valor, tamanho: 22)
                        Spacer()
                    }
                    TecladoNumerico(
                        aoDigitar: { modelo.entrada.digitar($0) },
                        aoApagar: { modelo.entrada.apagar() },
                        aoAbrirMais: {},
                        aoSalvar: {},
                        podeSalvar: false
                    )
                    .listRowInsets(EdgeInsets(top: 6, leading: 6, bottom: 6, trailing: 6))
                }

                Section("Sai de") {
                    if modelo.contasDisponiveis.isEmpty {
                        Text("Cadastre uma conta em Mais para registrar o pagamento.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    } else {
                        Picker("Conta", selection: $modelo.contaSelecionada) {
                            ForEach(modelo.contasDisponiveis) { conta in
                                Text(conta.nome).tag(conta as Conta?)
                            }
                        }
                    }
                }

                Section {
                    Text("O pagamento entra como transferência, não como gasto novo — "
                        + "a compra já foi contada quando aconteceu.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Pagar fatura")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { fechar() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Pagar", action: pagar).disabled(!modelo.podePagar)
                }
            }
            .alert("Não foi possível pagar", isPresented: Binding(
                get: { erro != nil }, set: { if !$0 { erro = nil } }
            )) {
                Button("OK") { erro = nil }
            } message: {
                Text(erro ?? "")
            }
        }
    }

    private func pagar() {
        do {
            try modelo.pagar()
            fechar()
        } catch {
            erro = "Não foi possível registrar o pagamento. Tente novamente."
        }
    }
}
