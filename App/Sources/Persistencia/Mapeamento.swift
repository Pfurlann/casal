import CasalDomain
import Foundation

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
    }

    func paraDominio() -> Transacao {
        Transacao(
            id: id,
            carteiraID: carteiraID,
            tipo: TipoTransacao(rawValue: tipoBruto) ?? .despesa,
            valor: Money(centavos: valorCentavos),
            data: data,
            categoriaID: categoriaID,
            descricao: descricao,
            contaID: contaID,
            cartaoID: cartaoID,
            faturaID: faturaID,
            criadoPor: criadoPor,
            estado: EstadoTransacao(rawValue: estadoBruto) ?? .confirmada,
            origem: OrigemTransacao(rawValue: origemBruta) ?? .manual,
            idExterno: idExterno,
            hashDedup: hashDedup,
            grupoParcela: grupoParcela,
            parcelaN: parcelaN,
            parcelaTotal: parcelaTotal,
            criadoEm: criadoEm,
            atualizadoEm: atualizadoEm,
            removidoEm: removidoEm
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
    }

    func paraDominio() -> Carteira {
        Carteira(
            id: id,
            nome: nome,
            cor: cor,
            icone: icone,
            donoID: donoID,
            visibilidade: VisibilidadeCarteira(rawValue: visibilidadeBruta) ?? .aberta,
            rotulo: RotuloCarteira(rawValue: rotuloBruto) ?? .pessoal,
            arquivada: arquivada
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
    }

    func paraDominio() -> Categoria {
        Categoria(
            id: id,
            carteiraID: carteiraID,
            nome: nome,
            icone: icone,
            cor: cor,
            paiID: paiID,
            tipo: TipoCategoria(rawValue: tipoBruto) ?? .despesa
        )
    }
}
