import Testing
@testable import CasalDomain

@Suite("Estabelecimento")
struct EstabelecimentoTests {
    @Test("caixa alta, acentos e espaços extras não distinguem estabelecimentos")
    func normalizacaoBasica() {
        #expect(Estabelecimento.normalizar("  Padaria  Açúcar ") == "PADARIA ACUCAR")
        #expect(Estabelecimento.normalizar("ZAFFARI") == "ZAFFARI")
        #expect(Estabelecimento.normalizar("zaffari") == "ZAFFARI")
    }

    @Test("sufixos societários e números de terminal são descartados")
    func descartaRuido() {
        #expect(Estabelecimento.normalizar("ZAFFARI LTDA 4412") == "ZAFFARI")
        #expect(Estabelecimento.normalizar("POSTO IPIRANGA S/A") == "POSTO IPIRANGA")
        #expect(Estabelecimento.normalizar("IFOOD *PIZZARIA") == "IFOOD PIZZARIA")
    }

    @Test("string vazia normaliza para vazio sem estourar")
    func vazio() {
        #expect(Estabelecimento.normalizar("") == "")
        #expect(Estabelecimento.normalizar("   ") == "")
    }

    @Test("ponto e barra são descartados para que variantes de sufixo societário colapsem")
    func variantesSufixo() {
        #expect(Estabelecimento.normalizar("POSTO IPIRANGA S/A") == "POSTO IPIRANGA")
        #expect(Estabelecimento.normalizar("POSTO IPIRANGA S.A.") == "POSTO IPIRANGA")
        #expect(Estabelecimento.normalizar("POSTO IPIRANGA S A") == "POSTO IPIRANGA")
    }

    @Test("sufixo societário só é descartado se não for primeiro token")
    func sufixoNaoNoInicio() {
        #expect(Estabelecimento.normalizar("CIA DO CHURRASCO") == "CIA DO CHURRASCO")
        #expect(Estabelecimento.normalizar("ZAFFARI LTDA 4412") == "ZAFFARI")
    }
}
