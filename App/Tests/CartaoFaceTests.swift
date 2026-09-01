import CasalDomain
import SwiftUI
import Testing
@testable import Casal

@Suite("CartaoFace")
struct CartaoFaceTests {
    @Test("hexadecimal com e sem cerquilha viram a mesma cor")
    func hexNormalizado() {
        #expect(CartaoFace.componentes(deHex: "#7C5CFF") != nil)
        #expect(CartaoFace.componentes(deHex: "7C5CFF") != nil)
        #expect(CartaoFace.componentes(deHex: "#7C5CFF")! == CartaoFace.componentes(deHex: "7c5cff")!)
    }

    @Test("hexadecimal inválido devolve nil em vez de cor aleatória")
    func hexInvalido() {
        #expect(CartaoFace.componentes(deHex: "") == nil)
        #expect(CartaoFace.componentes(deHex: "#ZZZZZZ") == nil)
        #expect(CartaoFace.componentes(deHex: "#FFF") == nil)
    }

    @Test("os componentes correspondem ao roxo do design")
    func roxoDoDesign() {
        let componentes = CartaoFace.componentes(deHex: "#7C5CFF")
        #expect(componentes?.vermelho == 0x7C)
        #expect(componentes?.verde == 0x5C)
        #expect(componentes?.azul == 0xFF)
    }

    @Test("bandeira tem rótulo curto em caixa alta para estampar no cartão")
    func rotuloDaBandeira() {
        #expect(CartaoFace.rotulo(de: .visa) == "VISA")
        #expect(CartaoFace.rotulo(de: .mastercard) == "MASTERCARD")
        #expect(CartaoFace.rotulo(de: .outra) == "")
    }

    @Test("os três tamanhos têm alturas distintas e crescentes")
    func tamanhos() {
        #expect(TamanhoCartaoFace.miniatura.altura < TamanhoCartaoFace.media.altura)
        #expect(TamanhoCartaoFace.media.altura < TamanhoCartaoFace.grande.altura)
    }
}
