# Verificação visual

`npm run verificar` cobre cor literal, tipos, lint e testes. O que sobra
depende de olho e teclado, e vale antes de qualquer publicação.

## Larguras

Sem rolagem horizontal e sem conteúdo cortado em 320, 390, 768 e 1440px.

## Temas

Cada tela em claro e escuro, sem elemento invisível: `/mes`, `/lancar`,
`/cartoes`, detalhe de cartão, pagar fatura, `/mais`, `/mais/contas`,
`/mais/carteiras`, `/metas`, `/entrar`.

## Teclado

Percorrer cada tela e completar um lançamento sem tocar no ponteiro. Anel
de foco visível em cada parada. Escape fecha as telas com teclado numérico.

## Símbolo em 16px

Renderizar `<Marca tamanho={16} />` e conferir a olho: o desenho pequeno
tem que ler como curva, não como V. É desenho próprio, não escala do grande.

## Marca viva

Passar `folga` de 0,5 a −0,1 e confirmar a sequência: curva funda em
grafite, curva média em grafite, curva rasa em âmbar, reta em âmbar-texto.
A reta só aparece no estouro.

## Zoom

Ampliar até 200% sem perda de função, em celular e no navegador.

## Rotas

Cada URL da seção 14 da spec abre direto, o botão voltar do navegador volta
uma tela, e recarregar mantém o lugar.
