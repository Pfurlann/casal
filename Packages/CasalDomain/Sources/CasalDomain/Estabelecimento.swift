import Foundation

public enum Estabelecimento: Sendable {
    private static let ruido: Set<String> = [
        "LTDA", "ME", "EPP", "SA", "S/A", "EIRELI", "MEI", "CIA"
    ]

    /// Reduz o nome a uma forma canônica comparável entre fontes distintas:
    /// remove acentos, pontuação, sufixos societários e sequências numéricas
    /// de terminal, e colapsa espaços.
    public static func normalizar(_ bruto: String) -> String {
        let semAcento = bruto.folding(
            options: [.diacriticInsensitive, .caseInsensitive],
            locale: Locale(identifier: "pt_BR")
        ).uppercased()

        // Barra e ponto desaparecem para que "S/A" e "S.A." virem o token "SA",
        // que o conjunto de ruído reconhece. Trocá-las por espaço criaria
        // os tokens "S" e "A", resolvidos depois pelo merge de single-letters.
        let semBarraEPonto = semAcento
            .replacingOccurrences(of: "/", with: "")
            .replacingOccurrences(of: ".", with: "")

        let apenasPermitidos = semBarraEPonto.map { caractere -> Character in
            caractere.isLetter || caractere.isNumber || caractere == " " ? caractere : " "
        }

        let palavrasBrutas = String(apenasPermitidos)
            .split(separator: " ")
            .map(String.init)

        // Merge tokens single-letter consecutivos: "S" "A" vira "SA"
        var palavrasMergeadas: [String] = []
        var acumuladorSingleLetras = ""

        for palavra in palavrasBrutas {
            if palavra.count == 1 && palavra.first?.isLetter ?? false {
                acumuladorSingleLetras.append(palavra)
            } else {
                if !acumuladorSingleLetras.isEmpty {
                    palavrasMergeadas.append(acumuladorSingleLetras)
                    acumuladorSingleLetras = ""
                }
                palavrasMergeadas.append(palavra)
            }
        }

        if !acumuladorSingleLetras.isEmpty {
            palavrasMergeadas.append(acumuladorSingleLetras)
        }

        let palavras = palavrasMergeadas
            .enumerated()
            .filter { idx, palavra in
                // Remove purely numeric sequences
                if palavra.allSatisfy(\.isNumber) {
                    return false
                }
                // Remove noise tokens unless they're the first token
                if idx > 0 && ruido.contains(palavra) {
                    return false
                }
                return true
            }
            .map { $0.element }

        return palavras.joined(separator: " ")
    }
}
