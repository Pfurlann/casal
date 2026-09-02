# casal — Identidade e sistema de design

**Data:** 2026-09-02
**Status:** Aprovado, pronto para planejamento
**Substitui:** a linguagem visual provisória de `web/` (roxo `#7C5CFF`, gradiente 135°, card herói)

---

## 1. O que é

O contrato visual do casal: nome, marca, marca viva, paleta, tipografia, componentes, acessibilidade, responsividade e rotas. É o documento que a implementação da interface segue, e a referência que julga se uma tela está certa.

O produto é o mesmo descrito em `2026-08-31-casal-design.md`. Esta spec não muda escopo funcional — muda a forma, a estrutura da interface e a marca, e conserta os defeitos de interface levantados na auditoria de 2026-09-02.

## 2. Por que agora

O v1 deixou de ser app iOS em TestFlight e virou aplicação web instalável, para contornar a exigência de conta Apple Developer. A decisão trocou a plataforma, mas a interface continuou sendo um app iOS emulado em 430 pixels: barra de abas fixa, empilhamento de telas por estado, moldura de telefone centralizada num fundo preto em qualquer tela maior.

Junto vieram três problemas de marca:

1. **Não existe marca.** A identidade é uma cor. Roxo `#7C5CFF` aparece embutido em vinte e cinco pontos do código, sem token, e é o único elemento reconhecível do produto. Sem o roxo não sobra nada.
2. **A cor escolhida é o clichê da categoria.** Roxo com gradiente 135°, card arredondado de 16px, ícone linear de 1,8px e fonte de sistema formam um conjunto imediatamente reconhecível como interface gerada por modelo de linguagem. É o oposto do efeito desejado.
3. **O nome não tem forma.** `ca$al` aparece como texto de 13px numa única tela e em nenhum outro lugar.

## 3. Decisões travadas

| # | Decisão | Alternativa descartada |
|---|---|---|
| 01 | Nome `casal`, sem o `$` | `respiro`, `folga`, `lastro`, `maré`, manter `ca$al` |
| 02 | Território "calma": dinheiro sem ansiedade | Íntimo/quente, precisão/brutalista, ousado/saturado |
| 03 | Sistema quase monocromático, uma cor de acento | Paleta de marca com cor dominante |
| 04 | Símbolo: o diafragma — linha que cede no meio | Anel com falha, duas barras, letra com ar |
| 05 | Assinatura principal: lockup B, a linha como base da palavra | Marca ao lado do nome, marca empilhada |
| 06 | Marca viva: a curva responde à folga real | Marca estática |
| 07 | Número sempre em monoespaçada tabular | Número na mesma família do texto |
| 08 | Rotas de verdade, uma URL por tela | Empilhamento por estado, como hoje |
| 09 | Layout de desktop próprio a partir de 1024px | Moldura de telefone centralizada |
| 10 | Tema claro e escuro desde o começo | Só claro, escuro depois |

### Sobre o nome

`casal` é palavra comum em português, e isso tem um custo verificado: busca por "casal" em loja de aplicativos devolve produtos de relacionamento, não de finanças. A alternativa `respiro`, avaliada e preferida no primeiro corte, colide de forma ainda mais direta — a App Store já tem `Respiro: Breath & Calm`, `RESPIRO - Stress Relief`, `unrespiro` e `Respiro wind-synth`, todos de respiração e meditação.

A decisão é manter `casal` e aceitar o custo de descoberta orgânica, apostando em indicação como canal. **Consequência que precisa de trabalho separado:** disponibilidade de domínio e busca de anterioridade no INPI não foram verificadas e continuam abertas. Antes de qualquer publicação, verificar `casal.app` e classe 09/36 no INPI.

O `$` sai. Substituição de caractere por símbolo de moeda é o recurso mais datado do gênero, não sobrevive a texto corrido, quebra busca e leitura por leitor de tela, e entrega exatamente a impressão de improviso que a marca quer evitar.

## 4. Não-objetivos

| Fora | Por quê |
|---|---|
| Tipografia própria desenhada | Custo desproporcional ao estágio. Inter Tight e IBM Plex Mono resolvem, e o diferencial da marca está na forma e no espaço, não na letra |
| Ilustração e mascote | Contradizem o território calma e envelhecem rápido |
| Sistema de ícones próprio | Os ícones atuais de `Icones.tsx` sobrevivem com o traço ajustado. Redesenhar tudo não paga |
| Trocar o ícone da tela inicial dinamicamente | Em iOS exige API nativa indisponível a PWA. Fica como investigação, não como promessa |
| Animação de transição entre telas | Depois de rotas funcionarem. Animar navegação quebrada é pintar parede torta |
| Landing page e material de loja | Projeto próprio, depois que a marca existir no produto |

## 5. Nome e voz

**Nome:** `casal`. Sempre em caixa baixa em uso de marca, inclusive em início de frase quando aparece como assinatura. Em texto corrido, segue a ortografia normal.

**Voz:** segunda pessoa do singular, presente, pt-BR. Diz o fato e para.

- **Sim:** "Fatura fecha dia 28." / "Sobram R$ 340 no teto de Mercado." / "Não deu para salvar. Tente de novo."
- **Não:** "Ops! Parece que algo deu errado 😅" / "Você está indo super bem!" / "Vamos organizar suas finanças!"

Sem exclamação, sem emoji, sem elogio ao usuário, sem gamificação. Número negativo não vira piada nem incentivo. A calma vem de não comentar.

**Rótulos de seção:** caixa alta, 10px, espaçamento de letra `0.2em`. São etiquetas, não títulos.

## 6. Símbolo — o diafragma

Uma linha horizontal que cede no meio. É a respiração vista de lado: o diafragma descendo para deixar o ar entrar. É também a linha do orçamento aceitando peso sem quebrar.

### Geometria

Três desenhos, um gesto. **Não escale um só** — em tamanho pequeno a curva colapsa e vira um V torto. Cada faixa tem seu próprio caminho, todos em `viewBox="0 0 64 64"`, traço sem terminação arredondada (`stroke-linecap: butt`), sem preenchimento.

| Faixa | Caminho | Traço |
|---|---|---|
| **Grande** — 32px e acima | `M8 22 C20 22 22 42 32 42 C42 42 44 22 56 22` | 7 |
| **Médio** — 20 a 31px | `M7 21 C18 21 20 43 32 43 C44 43 46 21 57 21` | 9,5 |
| **Pequeno** — abaixo de 20px | `M6 20 C16 20 18 44 32 44 C46 44 48 20 58 20` | 13 |

Conforme o tamanho cai, o curso horizontal encurta, a curva aprofunda e o traço engrossa em proporção. O gesto se mantém legível; a geometria não.

### Assinatura principal — lockup B

A palavra em cima, a linha embaixo, cedendo. A linha não é um símbolo ao lado do nome: é a base sobre a qual o nome se apoia. Diz "aguenta peso e respira" numa forma só.

```
     c a s a l
   ‾‾‾\_______/‾‾‾
```

Construção, em função da largura `L` da palavra composta:

- Largura da linha: `L`
- Altura da caixa da linha: `0.20 × L`
- Traço: `L / 29`
- Espaço entre a base da palavra e o topo da linha: `0.13 × L`
- Caminho, em `viewBox="0 0 132 26"`: `M2 4 C26 4 30 21 66 21 C102 21 106 4 130 4`, traço 4,5

Variantes secundárias, para quando a principal não cabe:

- **Horizontal** — símbolo grande à esquerda, palavra à direita, separados por `0.35 ×` a altura do símbolo. Uso: cabeçalho estreito, assinatura em linha.
- **Símbolo isolado** — ícone de aplicativo, favicon, avatar, marca no canto da tela inicial.

A variante empilhada (símbolo em cima, palavra embaixo) está descartada: repete o que o lockup B já faz, sem a ideia.

### Área de respiro

Em volta de qualquer assinatura, margem livre igual a **duas vezes a espessura do traço** daquela aplicação. Nada entra nessa margem — nem texto, nem borda, nem outra marca.

### Uso indevido

Não: inclinar, espelhar, arredondar as pontas, aplicar gradiente, aplicar sombra, preencher a área sob a curva, inverter a curva para cima, usar a curva como divisor decorativo repetido, colocar a palavra dentro do arco.

## 7. Marca viva

A profundidade da curva é o dado. Mês com folga, a linha respira fundo. Mês estourado, ela estica e vira reta tensa — e reta é o alarme.

### Regra

Dado `folga` = percentual da sobra segura do período sobre o total previsto:

```
t         = clamp(folga / 0.40, 0, 1)
y_fundo   = folga > 0  ?  25 + 21 × t  :  22
```

O caminho grande passa a ser, em função de `y_fundo`:

```
M8 22 C20 22 22 {y} 32 {y} C42 {y} 44 22 56 22
```

| Estado | Condição | `y_fundo` | Cor |
|---|---|---|---|
| Folga larga | `folga ≥ 40%` | 46 | `--grafite` |
| Aperto | `15% ≤ folga < 40%` | 32,9 a 46 | `--grafite` |
| No limite | `0 < folga < 15%` | 25 a 32,9 | `--ambar` |
| Estourado | `folga ≤ 0` | 22, reta | `--ambar-texto` |

O piso de 25 existe de propósito: mantém uma curva mínima perceptível enquanto ainda há folga, e reserva a **reta exata** para o estouro. Sem esse piso, folga de 0,5% desenharia praticamente a mesma reta do estouro e o alarme perderia o significado.

Sem vermelho, sem sino, sem ícone de perigo. A linha simplesmente para de respirar. Alerta que não grita é a única forma de alerta coerente com o território.

### Onde vive, e quando

| Superfície | Fase |
|---|---|
| Canto do cabeçalho da tela `mês` | com a marca viva |
| Favicon do PWA, redesenhado por código | com a marca viva |
| Ícone da tela inicial | fora de escopo — exige API nativa |

**Dependência que muda a ordem de entrega.** A marca viva precisa de `folga`, e `folga` precisa de tetos e sobra segura, que são o milestone de Metas — hoje a aba Metas é um espaço reservado sem funcionalidade. Portanto:

- **Agora:** a marca é estática, no estado "folga larga" (`y_fundo = 46`). O sistema já nasce com a marca desenhada como função de `y_fundo`, não como SVG fixo.
- **Com Metas:** o valor de `y_fundo` passa a vir do dado. Nenhuma refatoração — só a troca da constante por chamada.

A mesma dependência vale para o teto por categoria exibido na tela de lançamento. Sem Metas, aquela linha não aparece; o espaço não é reservado nem preenchido com valor falso.

## 8. Cor

Quase monocromático. Uma cor de acento, e ela aparece só onde exige atenção. Não existe cor de marca competindo com o dado — o dado é o conteúdo.

### Tema claro

| Token | Valor | Uso | Contraste sobre `--ar` |
|---|---|---|---|
| `--ar` | `#FBFAF7` | fundo | — |
| `--grafite` | `#0E0E0C` | texto principal, marca, número | 18,5:1 |
| `--cinza` | `#6E6E66` | texto secundário, rótulo | 4,9:1 ✓ AA |
| `--nevoa` | `#E7E4DC` | divisor, trilha vazia, borda de campo | — |
| `--ambar` | `#C98A2E` | preenchimento, indicador, marca em alerta | 2,8:1 ✗ |
| `--ambar-texto` | `#8A5A0F` | âmbar aplicado a texto e ícone fino | 5,7:1 ✓ AA |

**Dois âmbares porque um não passa.** `#C98A2E` sobre `#FBFAF7` dá 2,8:1 e falha o mínimo de 4,5:1 para texto. Preenchimento de área usa o claro; texto e traço fino usam o escuro. Essa separação existe para que o defeito de contraste encontrado na auditoria — texto secundário a `rgba(0,0,0,0.40)`, cerca de 4,0:1 — não possa se repetir por descuido: não há token que falhe disponível para texto.

### Tema escuro

Inversão de papel, não de valor. Os mesmos seis tokens, remapeados:

| Token | Valor | Contraste sobre `--ar` |
|---|---|---|
| `--ar` | `#0E0E0C` | — |
| `--grafite` | `#FBFAF7` | 18,5:1 |
| `--cinza` | `#9A9A90` | 6,8:1 ✓ AA |
| `--nevoa` | `#26261F` | — |
| `--ambar` | `#C98A2E` | 6,6:1 |
| `--ambar-texto` | `#E0A94A` | 9,1:1 ✓ AA |

O tema segue `prefers-color-scheme` por padrão, com escolha explícita persistida quando o usuário decidir. `theme_color` do manifesto deixa de ser `#7C5CFF` e passa a acompanhar o tema.

### Proibições

Sem gradiente, em nenhuma superfície. Sem cor por categoria em área grande: categoria se distingue por rótulo e ícone, não por bloco colorido.

Sem sombra decorativa. Sombra existe só para elevar sobreposição — modal, folha — e vive num único token, `--elevacao`, que nenhum componente contorna escrevendo sombra própria. O token tem um valor por tema, porque o mesmo valor não serve nos dois: `0 8px 24px rgba(14,14,12,0.14)` no claro, e `0 8px 24px rgba(0,0,0,0.5)` no escuro. Sombra quase preta sobre fundo quase preto é invisível, e uma sobreposição sem elevação perceptível deixa de se distinguir do conteúdo atrás dela. A regra é um token, não um literal.

## 9. Tipografia

| Família | Onde | Pesos |
|---|---|---|
| **Inter Tight** | texto, título, rótulo, botão | 400, 500, 600 |
| **IBM Plex Mono** | **todo número, sem exceção** | 400, 500 |

Número em monoespaçada não é estética. É o motivo pelo qual um valor não dança quando o dígito muda, e pelo qual coluna de dinheiro alinha sem recurso. Toda ocorrência usa `font-variant-numeric: tabular-nums` junto.

Vale para: valor, saldo, percentual, data, dia de fechamento e vencimento, número de parcela, código de convite.

### Escala

| Tamanho | Papel | Família | Peso | Espaçamento |
|---|---|---|---|---|
| 10 | rótulo de seção, caixa alta | Inter Tight | 600 | `0.2em` |
| 12 | secundário, legenda | Inter Tight | 400 | 0 |
| 14 | corpo, item de lista | Inter Tight | 400 | 0 |
| 17 | título de tela | Inter Tight | 600 | `-0.02em` |
| 24 | número de seção | IBM Plex Mono | 500 | `-0.03em` |
| 36 | número herói | IBM Plex Mono | 500 | `-0.03em` |

Nada entre 17 e 24, nada acima de 36. O título de 34px em negrito que hoje abre cada aba sai: com número herói presente, dois pesos grandes na mesma tela brigam.

Centavos no número herói vão a 47% do tamanho e opacidade 0,42 — presentes, subordinados.

### Carregamento

As duas famílias entram auto-hospedadas em `woff2`, subconjunto latino, `font-display: swap`, com pré-carregamento dos dois pesos usados acima da dobra. Fonte de terceiro por CDN está fora: adiciona origem externa e uma corrida de rede no caminho crítico.

## 10. Superfície e espaço

**Escala de espaço** — múltiplos de 4: `4, 8, 12, 16, 20, 24, 32, 48`. Nada fora dessa lista.

**Raios:**

| Valor | Uso |
|---|---|
| 0 | trilha de progresso, divisor |
| 4 | amostra de cor, marcador |
| 9 | tecla, botão, campo |
| 22 | ícone de aplicativo |
| `999px` | etiqueta de categoria |

O raio de 16px em card grande sai junto com os cards.

**Divisor:** 1px `--nevoa`. Nunca sombra, nunca segundo fundo para separar lista.

**Trilha de progresso:** 3px de altura, dois segmentos, sem raio, `--grafite` para o consumido e `--nevoa` para o restante. Substitui o card herói: mesma informação, um trigésimo do peso visual.

## 11. Componentes

O que a interface tem, com contrato. Cada um vira um arquivo em `src/components/ui/`.

| Componente | Contrato |
|---|---|
| `Marca` | props `tamanho` e `folga?`. Escolhe o caminho por faixa de tamanho e calcula `y_fundo`. Único lugar do código que conhece a geometria do símbolo |
| `Numero` | recebe centavos, devolve valor em IBM Plex Mono tabular, com centavos subordinados. Único formatador de dinheiro na interface |
| `Rotulo` | rótulo de seção: 10px, caixa alta, `0.2em`, `--cinza` |
| `Cabecalho` | título de tela, ação à esquerda, ação à direita, marca opcional. Substitui o `Cabecalho` atual de posicionamento absoluto |
| `Navegacao` | abas embaixo abaixo de 640px, trilho lateral a partir de 1024px. Uma fonte de verdade para os quatro destinos |
| `LinhaLista` | ícone, título, subtítulo, valor à direita, divisor. Substitui as seis variantes de linha espalhadas hoje |
| `Trilha` | trilha de 3px, consumido sobre total |
| `Etiqueta` | categoria selecionável, raio `999px`, estado ativo em `--grafite` sólido |
| `Tecla` e `Teclado` | teclado numérico. **Aceita teclado físico**: dígitos, `Backspace`, `Enter` para salvar, `Escape` para fechar |
| `Botao` | primário sólido `--grafite`, secundário com borda `--nevoa`, destrutivo em `--ambar-texto`. Altura mínima 44px |
| `Campo` | rótulo, entrada, erro. Anel de foco visível obrigatório |
| `Vazio` | estado vazio: marca em 48px, frase, ação |
| `Aviso` | mensagem transitória de erro ou confirmação, no topo, dispensável, anunciada por leitor de tela |

`Aviso` é componente novo e cobre um defeito real: hoje falha ao salvar cartão, conta ou lançamento não avisa ninguém.

## 12. Acessibilidade

Requisitos, não recomendações. Cada um é verificável.

1. **Contraste mínimo 4,5:1** para todo texto. Garantido pela paleta: nenhum token reprovado está disponível para texto.
2. **Zoom liberado.** `maximumScale: 1` e `userScalable: false` saem do viewport. Hoje bloqueiam ampliação e reprovam o critério 1.4.4.
3. **Anel de foco visível** em todo elemento focável: 2px sólido `--grafite` com deslocamento de 2px, `--ar` no tema escuro. O `outline-none` aplicado a todos os campos hoje sai, e não volta sem substituto.
4. **Alvo de toque mínimo 44×44px**, inclusive nas teclas e nas abas.
5. **Aba ativa** marcada com `aria-current="page"`, não apenas por cor.
6. **Ordem de foco** segue a ordem visual. Sobreposição prende o foco e devolve ao elemento de origem ao fechar.
7. **Estado por forma, não só por cor.** Alerta usa a curva reta e o rótulo; a cor é reforço.
8. **Rótulo textual** em todo controle apenas com ícone.
9. **Movimento** respeita `prefers-reduced-motion`: sem exceção.

## 13. Responsividade

Três faixas. A moldura de telefone de 430px com fundo preto em volta desaparece, junto com `overflow: hidden` no corpo do documento.

| Faixa | Layout |
|---|---|
| **até 639px** | uma coluna, largura total, navegação em abas embaixo, ação de lançar no centro. Rolagem no documento, não num painel interno |
| **640 a 1023px** | uma coluna centralizada, largura máxima 560px, navegação em abas embaixo |
| **1024px e acima** | trilho de navegação fixo à esquerda, 220px, com a assinatura completa no topo. Conteúdo centralizado, máximo 640px. Telas de detalhe abrem no lugar, sem empilhar |

Formulários de valor têm tratamento distinto por faixa:

- **até 1023px** — teclado numérico na tela, fixo no rodapé, é a entrada principal.
- **1024px e acima** — o campo de valor recebe o foco ao abrir e o teclado físico é a entrada principal. O teclado na tela continua visível ao lado do resumo, como atalho de ponteiro, e não fica colado ao rodapé.

Em toda faixa o teclado físico funciona: dígitos, `Backspace`, `Enter` para salvar, `Escape` para fechar. Hoje não funciona em nenhuma — no desktop só é possível lançar clicando dígito por dígito.

Alvo mínimo verificado: 320px de largura sem rolagem horizontal.

## 14. Rotas

Uma URL por tela. Hoje toda navegação é estado em memória, então o botão voltar do navegador sai do aplicativo em vez de voltar uma tela, recarregar perde o lugar, e nenhuma tela pode ser compartilhada ou salva.

```
/entrar

/mes                                        (raiz redireciona para cá)
/lancar

/cartoes
/cartoes/novo
/cartoes/[id]
/cartoes/[id]/editar
/cartoes/[id]/faturas/[competencia]/pagar   competencia = AAAA-MM

/metas

/mais
/mais/contas
/mais/contas/novo
/mais/contas/[id]
/mais/carteiras
/mais/carteiras/nova
```

`/lancar` é rota própria, apresentada como folha sobre a tela anterior quando há histórico e como tela cheia quando é entrada direta. Fechar volta no histórico.

## 15. Estrutura de arquivos

`CasalApp.tsx` tem 1.208 linhas e catorze componentes. A quebra segue as rotas e não é opcional: o arquivo é grande o suficiente para que qualquer alteração ali seja arriscada.

```
src/design/tokens.css              @theme do Tailwind v4: cor, tipografia, espaço, raio
src/design/fontes.css              @font-face auto-hospedado

src/app/(app)/layout.tsx           casca, navegação, marca
src/app/(app)/mes/page.tsx
src/app/(app)/lancar/page.tsx
src/app/(app)/cartoes/...
src/app/(app)/metas/page.tsx
src/app/(app)/mais/...
src/app/entrar/page.tsx

src/components/ui/                 os catorze componentes da seção 11
src/components/marca/Marca.tsx     geometria do símbolo, três caminhos
src/components/marca/Assinatura.tsx lockup B e variantes
```

Nenhuma cor literal fora de `tokens.css`. Nenhum `style={{ color: "#7C5CFF" }}`, em nenhum lugar. A verificação é mecânica: busca por `#` em `src/components` e `src/app` devolve vazio.

## 16. Ativos a produzir

| Ativo | Formato | Observação |
|---|---|---|
| Símbolo, três faixas | SVG | grande, médio, pequeno — desenhos distintos |
| Assinatura lockup B | SVG | claro e escuro |
| Assinatura horizontal | SVG | claro e escuro |
| `favicon.svg` | SVG | desenhado por código, acompanha a marca viva |
| `icon-192.png`, `icon-512.png` | PNG | símbolo grafite sobre `--ar` |
| `icon-512-maskable.png` | PNG | símbolo com margem de segurança de 20% |
| `apple-touch-icon.png` | PNG 180 | idem |
| `manifest.json` | JSON | `name` e `short_name` para `casal`; `theme_color` e `background_color` deixam `#7C5CFF` |
| Inter Tight, IBM Plex Mono | woff2 | subconjunto latino, pesos 400/500/600 e 400/500 |

Os ícones PNG atuais — o `$` formado por dois anéis sobre roxo chapado — saem.

## 17. Verificação

Uma interface está pronta quando:

1. **Contraste** — verificação automática de todo par texto/fundo do sistema contra 4,5:1. Roda no processo de build.
2. **Sem cor literal** — busca por `#` em `src/app` e `src/components` devolve vazio.
3. **Larguras** — 320, 390, 768 e 1440px sem rolagem horizontal e sem conteúdo cortado.
4. **Temas** — cada tela em claro e escuro, sem elemento invisível.
5. **Teclado** — percorrer toda tela e completar um lançamento sem tocar no ponteiro. Anel de foco visível em cada parada.
6. **Símbolo em 16px** — renderizado e conferido visualmente. O desenho pequeno tem que ler como curva, não como V.
7. **Rotas** — cada URL da seção 14 abre direto, o botão voltar volta uma tela, recarregar mantém o lugar.
8. **Zoom** — ampliação até 200% sem perda de função.

## 18. Fora deste ciclo

A auditoria de 2026-09-02 achou defeitos que **não são de interface** e que esta spec não resolve. Eles precisam de spec e plano próprios, e são mais urgentes que a marca:

- `web/` inteiro fora do controle de versão
- nenhum teste no motor de fatura em TypeScript, enquanto o motor em Swift tem cobertura
- escrita remota sem fila nem repetição, com sobrescrita do estado local no recarregamento
- `hashDedup` de parcela sem carteira e sem data
- data da parcela carimbada no fechamento em vez da compra, o que faz "gasto do mês" mentir
- identificador de fatura gerado a cada renderização
- níveis de privacidade `resumo` e `fechada` sem nenhuma aplicação no banco
- service worker que nunca guarda nada em cache, então o aplicativo não abre offline

Ordem recomendada: identidade e sistema de design em paralelo com o endurecimento; endurecimento **antes** de qualquer usuário externo.

## 19. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Minimalismo severo lê como inacabado | Produto parece rascunho, o oposto de confiança | A curva do diafragma é o gesto humano do sistema e aparece em toda tela. Espaçamento vem da escala de 4, sem exceção — o que quebra a leitura de "minimalista" é inconsistência, não ausência |
| Sistema frio para um produto de casal | Distância emocional num app sobre vida compartilhada | Âmbar carrega o calor e aparece nos momentos que importam. Papel é branco quente, não branco puro. A voz não é fria, é econômica |
| Símbolo ilegível em tamanho pequeno | Marca morre justamente onde mais aparece | Três desenhos, não uma escala. Verificação 6 da seção 17 |
| Curva lida como queda | A marca diz o contrário do que quer dizer | A curva cede e volta, simétrica, com as pontas na horizontal. Queda seria assimétrica e terminaria embaixo |
| Marca viva presa a Metas | Prometer marca reativa e entregar estática | Já está resolvido no desenho: a marca nasce como função de `y_fundo`, com constante agora e dado depois |
| Nome com descoberta orgânica fraca | Aquisição por busca praticamente nula | Decisão consciente. Aquisição por indicação. Domínio e INPI ainda a verificar antes de publicar |
| Reescrever a interface introduz defeito onde não havia | Regressão numa área que hoje funciona | Rotas e componentes entram antes da troca visual, uma tela por vez, com o comportamento atual preservado a cada passo |
