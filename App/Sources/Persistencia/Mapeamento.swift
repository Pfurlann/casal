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
            estado: EstadoTransacao(persistido: estadoBruto),
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

    /// Update-in-place. Seção 12: se já estava removido, `removidoEm` local vence
    /// o valor vindo no domínio (apagar vence editar / não ressuscita).
    func aplicar(dominio: Transacao) {
        let jaRemovido = removidoEm
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
        // criadoEm permanece o original do registro local
        atualizadoEm = max(dominio.atualizadoEm, atualizadoEm)
        dispositivoID = dominio.dispositivoID ?? dispositivoID
        if let jaRemovido {
            removidoEm = jaRemovido
        } else {
            removidoEm = dominio.removidoEm
        }
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

extension CartaoRegistro {
    convenience init(dominio: Cartao) {
        self.init()
        id = dominio.id
        carteiraID = dominio.carteiraID
        apelido = dominio.apelido
        banco = dominio.banco
        bandeiraBruta = dominio.bandeira.rawValue
        ultimos4 = dominio.ultimos4
        cor = dominio.cor
        limiteCentavos = dominio.limite.centavos
        diaFechamento = dominio.diaFechamento
        diaVencimento = dominio.diaVencimento
        contaPagamentoID = dominio.contaPagamentoID
        arquivado = dominio.arquivado
        removidoEm = dominio.removidoEm
    }

    func paraDominio() -> Cartao {
        Cartao(
            id: id,
            carteiraID: carteiraID,
            apelido: apelido,
            banco: banco,
            bandeira: decodificar(bandeiraBruta, campo: "bandeiraBruta", padrao: .outra),
            ultimos4: ultimos4,
            cor: cor,
            limite: Money(centavos: limiteCentavos),
            diaFechamento: diaFechamento,
            diaVencimento: diaVencimento,
            contaPagamentoID: contaPagamentoID,
            arquivado: arquivado,
            removidoEm: removidoEm
        )
    }

    /// Update-in-place. Seção 12: se já estava removido, `removidoEm` local vence
    /// o valor vindo no domínio (apagar vence editar / não ressuscita).
    func aplicar(dominio: Cartao) {
        let jaRemovido = removidoEm
        carteiraID = dominio.carteiraID
        apelido = dominio.apelido
        banco = dominio.banco
        bandeiraBruta = dominio.bandeira.rawValue
        ultimos4 = dominio.ultimos4
        cor = dominio.cor
        limiteCentavos = dominio.limite.centavos
        diaFechamento = dominio.diaFechamento
        diaVencimento = dominio.diaVencimento
        contaPagamentoID = dominio.contaPagamentoID
        arquivado = dominio.arquivado
        atualizadoEm = Date()
        if let jaRemovido {
            removidoEm = jaRemovido
        } else {
            removidoEm = dominio.removidoEm
        }
    }
}

extension ContaRegistro {
    convenience init(dominio: Conta) {
        self.init()
        id = dominio.id
        carteiraID = dominio.carteiraID
        nome = dominio.nome
        tipoBruto = dominio.tipo.rawValue
        saldoInicialCentavos = dominio.saldoInicial.centavos
        arquivada = dominio.arquivada
        removidoEm = dominio.removidoEm
    }

    func paraDominio() -> Conta {
        Conta(
            id: id,
            carteiraID: carteiraID,
            nome: nome,
            tipo: decodificar(tipoBruto, campo: "tipoBruto (conta)", padrao: .corrente),
            saldoInicial: Money(centavos: saldoInicialCentavos),
            arquivada: arquivada,
            removidoEm: removidoEm
        )
    }

    /// Update-in-place. Seção 12: se já estava removido, `removidoEm` local vence
    /// o valor vindo no domínio (apagar vence editar / não ressuscita).
    func aplicar(dominio: Conta) {
        let jaRemovido = removidoEm
        carteiraID = dominio.carteiraID
        nome = dominio.nome
        tipoBruto = dominio.tipo.rawValue
        saldoInicialCentavos = dominio.saldoInicial.centavos
        arquivada = dominio.arquivada
        atualizadoEm = Date()
        if let jaRemovido {
            removidoEm = jaRemovido
        } else {
            removidoEm = dominio.removidoEm
        }
    }
}

extension FaturaRegistro {
    convenience init(dominio: Fatura) {
        self.init()
        id = dominio.id
        cartaoID = dominio.cartaoID
        competenciaAno = dominio.competencia.ano
        competenciaMes = dominio.competencia.mes
        fechaEm = dominio.fechaEm
        venceEm = dominio.venceEm
        statusBruto = dominio.status.rawValue
        valorPagoCentavos = dominio.valorPago.centavos
    }

    func paraDominio() -> Fatura {
        Fatura(
            id: id,
            cartaoID: cartaoID,
            competencia: Competencia(ano: competenciaAno, mes: competenciaMes),
            fechaEm: fechaEm,
            venceEm: venceEm,
            status: decodificar(statusBruto, campo: "statusBruto", padrao: .aberta),
            valorPago: Money(centavos: valorPagoCentavos)
        )
    }
}
