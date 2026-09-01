import Foundation

public enum Estabelecimento {
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

        // A barra some antes do resto para que "S/A" vire o token "SA",
        // que o conjunto de ruído reconhece. Trocá-la por espaço criaria
        // os tokens "S" e "A", que não dá para descartar sem também
        // descartar palavras legítimas.
        let semBarra = semAcento.replacingOccurrences(of: "/", with: "")

        let apenasPermitidos = semBarra.map { caractere -> Character in
            caractere.isLetter || caractere.isNumber || caractere == " " ? caractere : " "
        }

        let palavras = String(apenasPermitidos)
            .split(separator: " ")
            .map(String.init)
            .filter { palavra in
                guard !ruido.contains(palavra) else { return false }
                // sequência puramente numérica é terminal, loja ou parcela
                return !palavra.allSatisfy(\.isNumber)
            }

        return palavras.joined(separator: " ")
    }
}
