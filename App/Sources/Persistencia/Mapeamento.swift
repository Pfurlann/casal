import CasalDomain
import Foundation

/// Decodifica um valor bruto persistido para o enum de domínio correspondente.
/// Um valor malformado nunca deveria existir — se existir, é corrupção de
/// dado (ex.: uma "receita" virando "despesa" no card do mês). Isso não pode
/// passar em silêncio: assertionFailure é gratuito em release e estoura no
/// test suite se algum caminho algum dia gravar um valor inválido.
private func decodificar<T: RawRepresentable>(
    _ bruto: String, campo: String, padrao: T
) -> T where T.RawValue == String {
    if let valor = T(rawValue: bruto) { return valor }
    assertionFailure("\(campo) armazenado é inválido: \(bruto)")
    return padrao
}

extension TransacaoRegistro {
    convenience init(dominio: Transacao) {
        self.init()
        id = dominio.id
        carteiraID = dominio.carteiraID
        tipoBruto = dominio.tipo.rawValue
        valorCentavos = dominio.valor.centavos
        data = dominio.data
        categoriaID = dominio.categoriaID
        descricao = dominio.descricao
        contaID = dominio.contaID
        cartaoID = dominio.cartaoID
        faturaID = dominio.faturaID
        criadoPor = dominio.criadoPor
        estadoBruto = dominio.estado.rawValue
        origemBruta = dominio.origem.rawValue
        idExterno = dominio.idExterno
        hashDedup = dominio.hashDedup
        grupoParcela = dominio.grupoParcela
        parcelaN = dominio.parcelaN
        parcelaTotal = dominio.parcelaTotal
        criadoEm = dominio.criadoEm
        atualizadoEm = dominio.atualizadoEm
        removidoEm = dominio.removidoEm
        dispositivoID = dominio.dispositivoID
    }

    func paraDominio() -> Transacao {
        Transacao(
            id: id,
            carteiraID: carteiraID,
            tipo: decodificar(tipoBruto, campo: "tipoBruto", padrao: .despesa),
            valor: Money(centavos: valorCentavos),
            data: data,
            categoriaID: categoriaID,
            descricao: descricao,
            contaID: contaID,
            cartaoID: cartaoID,
            faturaID: faturaID,
            criadoPor: criadoPor,
            estado: decodificar(estadoBruto, campo: "estadoBruto", padrao: .confirmada),
            origem: decodificar(origemBruta, campo: "origemBruta", padrao: .manual),
            idExterno: idExterno,
            hashDedup: hashDedup,
            grupoParcela: grupoParcela,
            parcelaN: parcelaN,
            parcelaTotal: parcelaTotal,
            criadoEm: criadoEm,
            atualizadoEm: atualizadoEm,
            removidoEm: removidoEm,
            dispositivoID: dispositivoID
        )
    }
}

extension CarteiraRegistro {
    convenience init(dominio: Carteira) {
        self.init()
        id = dominio.id
        nome = dominio.nome
        cor = dominio.cor
        icone = dominio.icone
        donoID = dominio.donoID
        visibilidadeBruta = dominio.visibilidade.rawValue
        rotuloBruto = dominio.rotulo.rawValue
        arquivada = dominio.arquivada
        criadoEm = dominio.criadoEm
        atualizadoEm = dominio.atualizadoEm
        removidoEm = dominio.removidoEm
        dispositivoID = dominio.dispositivoID
    }

    func paraDominio() -> Carteira {
        Carteira(
            id: id,
            nome: nome,
            cor: cor,
            icone: icone,
            donoID: donoID,
            visibilidade: decodificar(visibilidadeBruta, campo: "visibilidadeBruta", padrao: .aberta),
            rotulo: decodificar(rotuloBruto, campo: "rotuloBruto", padrao: .pessoal),
            arquivada: arquivada,
            criadoEm: criadoEm,
            atualizadoEm: atualizadoEm,
            removidoEm: removidoEm,
            dispositivoID: dispositivoID
        )
    }
}

extension CategoriaRegistro {
    convenience init(dominio: Categoria) {
        self.init()
        id = dominio.id
        carteiraID = dominio.carteiraID
        nome = dominio.nome
        icone = dominio.icone
        cor = dominio.cor
        paiID = dominio.paiID
        tipoBruto = dominio.tipo.rawValue
        criadoEm = dominio.criadoEm
        atualizadoEm = dominio.atualizadoEm
        removidoEm = dominio.removidoEm
        dispositivoID = dominio.dispositivoID
    }

    func paraDominio() -> Categoria {
        Categoria(
            id: id,
            carteiraID: carteiraID,
            nome: nome,
            icone: icone,
            cor: cor,
            paiID: paiID,
            tipo: decodificar(tipoBruto, campo: "tipoBruto (categoria)", padrao: .despesa),
            criadoEm: criadoEm,
            atualizadoEm: atualizadoEm,
            removidoEm: removidoEm,
            dispositivoID: dispositivoID
        )
    }
}
