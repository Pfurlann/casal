import CasalDomain
import SwiftUI

enum TamanhoCartaoFace {
    case miniatura, media, grande

    var altura: CGFloat {
        switch self {
        case .miniatura: 34
        case .media: 110
        case .grande: 150
        }
    }

    var raio: CGFloat {
        switch self {
        case .miniatura: 7
        case .media: 14
        case .grande: 16
        }
    }

    var mostraDetalhes: Bool {
        self != .miniatura
    }
}

struct CartaoFace: View {
    let cartao: Cartao
    var tamanho: TamanhoCartaoFace = .grande
    var faturaAtual: Money?
    var limiteDisponivel: Money?

    var body: some View {
        ZStack(alignment: .topLeading) {
            fundo

            if tamanho.mostraDetalhes {
                conteudo
                    .padding(tamanho == .grande ? 14 : 12)
            } else {
                Text(cartao.banco.prefix(2).uppercased())
                    .font(.system(size: 8, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(5)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
            }
        }
        .frame(height: tamanho.altura)
        .clipShape(.rect(cornerRadius: tamanho.raio))
    }

    private var fundo: some View {
        LinearGradient(
            colors: [Self.cor(deHex: cartao.cor), Self.cor(deHex: cartao.cor).opacity(0.72)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .overlay(
            LinearGradient(
                colors: [.white.opacity(0.20), .clear],
                startPoint: .topLeading,
                endPoint: .center
            )
        )
    }

    private var conteudo: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 1) {
                    Text(cartao.banco)
                        .font(.system(size: 11.5, weight: .bold))
                    Text(cartao.apelido)
                        .font(.system(size: 9.5))
                        .opacity(0.75)
                }
                Spacer()
                Text(Self.rotulo(de: cartao.bandeira))
                    .font(.system(size: 8.5, weight: .bold))
                    .opacity(0.85)
            }

            Spacer(minLength: 10)

            Text("•••• \(cartao.ultimos4)")
                .font(.system(size: 11, design: .monospaced))
                .opacity(0.9)

            Spacer(minLength: 8)

            HStack(alignment: .bottom) {
                if let faturaAtual {
                    VStack(alignment: .leading, spacing: 1) {
                        Text("FATURA ATUAL")
                            .font(.system(size: 7.5, weight: .semibold))
                            .opacity(0.65)
                        Text(faturaAtual.formatadoBRL)
                            .font(.system(size: 13.5, weight: .bold))
                    }
                }
                Spacer()
                if let limiteDisponivel {
                    VStack(alignment: .trailing, spacing: 3) {
                        Text("\(limiteDisponivel.formatadoBRL) livres")
                            .font(.system(size: 8.5))
                            .opacity(0.8)
                        barraDeLimite
                    }
                    .frame(width: 90)
                }
            }
        }
        .foregroundStyle(.white)
    }

    private var barraDeLimite: some View {
        GeometryReader { geometria in
            let fracao = fracaoUsada
            ZStack(alignment: .leading) {
                Capsule().fill(.white.opacity(0.28))
                Capsule().fill(.white).frame(width: geometria.size.width * fracao)
            }
        }
        .frame(height: 3)
    }

    /// Fração do limite já usada, entre 0 e 1. Limite zero desenha barra vazia
    /// em vez de dividir por zero.
    private var fracaoUsada: CGFloat {
        guard let limiteDisponivel, cartao.limite.centavos > 0 else { return 0 }
        let usado = cartao.limite.centavos - limiteDisponivel.centavos
        return min(max(CGFloat(usado) / CGFloat(cartao.limite.centavos), 0), 1)
    }

    // MARK: - Apresentação, testável sem renderizar

    struct ComponentesDeCor: Equatable {
        let vermelho: Int
        let verde: Int
        let azul: Int
    }

    /// Decompõe um hexadecimal de seis dígitos. Devolve `nil` para entrada
    /// inválida, para que a chamada decida o fallback em vez de o componente
    /// inventar uma cor.
    static func componentes(deHex hex: String) -> ComponentesDeCor? {
        let limpo = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        guard limpo.count == 6, limpo.allSatisfy(\.isHexDigit), let valor = Int(limpo, radix: 16) else {
            return nil
        }
        return ComponentesDeCor(
            vermelho: (valor >> 16) & 0xFF,
            verde: (valor >> 8) & 0xFF,
            azul: valor & 0xFF
        )
    }

    static func cor(deHex hex: String) -> Color {
        guard let rgb = componentes(deHex: hex) else { return .accentColor }
        return Color(
            red: Double(rgb.vermelho) / 255,
            green: Double(rgb.verde) / 255,
            blue: Double(rgb.azul) / 255
        )
    }

    static func rotulo(de bandeira: BandeiraCartao) -> String {
        bandeira == .outra ? "" : bandeira.rawValue.uppercased()
    }
}
