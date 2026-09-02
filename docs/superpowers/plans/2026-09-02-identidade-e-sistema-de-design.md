# Identidade e sistema de design — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a linguagem visual provisória de `web/` pela identidade `casal` — símbolo do diafragma, marca viva, paleta quase monocromática, tipografia com número em monoespaçada — sobre uma interface com rotas de verdade, componentes reutilizáveis, layout de desktop e acessibilidade verificável.

**Architecture:** Três fases em ordem obrigatória. A **fase 1** cria a fundação — infra de teste, tokens, fontes, marca, ativos — sem tocar em tela nenhuma. A **fase 2** migra a interface **uma tela por vez**: rota do App Router, componentes extraídos de `CasalApp.tsx` e a forma nova, juntos, **com o comportamento de cada tela preservado**. Enquanto uma rota já está migrada, as outras continuam servidas pelo arquivo antigo, então a aplicação nunca fica quebrada entre commits. A **fase 3** aplica o que vale para todas as telas de uma vez: tema escuro, layout de desktop, varredura de acessibilidade e portões de verificação automatizados.

**Tech Stack:** Next.js 15 (App Router, Turbopack), React 19, TypeScript 5, Tailwind CSS v4, Supabase JS 2, Vitest + React Testing Library + jsdom (novos neste plano).

**Spec:** `docs/superpowers/specs/2026-09-02-identidade-e-sistema-de-design-design.md`

## Global Constraints

Requisitos válidos em toda tarefa. Valores copiados da spec, sem arredondar.

**Cor — tema claro:** `--ar: #FBFAF7` · `--grafite: #0E0E0C` · `--cinza: #6E6E66` · `--nevoa: #E7E4DC` · `--ambar: #C98A2E` · `--ambar-texto: #8A5A0F`

**Cor — tema escuro:** `--ar: #0E0E0C` · `--grafite: #FBFAF7` · `--cinza: #9A9A90` · `--nevoa: #26261F` · `--ambar: #C98A2E` · `--ambar-texto: #E0A94A`

**`--ambar` nunca em texto.** Sobre `--ar` claro dá 2,8:1 e falha AA. Preenchimento de área usa `--ambar`; texto e traço fino usam `--ambar-texto`.

**Contraste mínimo 4,5:1** para todo texto, nos dois temas.

**Nenhuma cor literal fora de `src/design/tokens.css`.** Busca por `#` em `src/app` e `src/components` tem que devolver vazio. Verificado por script na tarefa 21.

**Tipografia:** Inter Tight (400/500/600) em texto; IBM Plex Mono (400/500) em **todo número, sem exceção** — valor, saldo, percentual, data, dia de fechamento e vencimento, número de parcela, código de convite. Sempre com `font-variant-numeric: tabular-nums`.

**Escala tipográfica:** 10 (rótulo caixa alta, `0.2em`, peso 600) · 12 (secundário) · 14 (corpo) · 17 (título de tela, peso 600, `-0.02em`) · 24 (número de seção, mono 500, `-0.03em`) · 36 (número herói, mono 500, `-0.03em`). Nada entre 17 e 24, nada acima de 36.

**Escala de espaço:** múltiplos de 4 — `4, 8, 12, 16, 20, 24, 32, 48`. Nada fora dessa lista.

**Raios:** 0 (trilha, divisor) · 4 (amostra) · 9 (tecla, botão, campo) · 22 (ícone de aplicativo) · `999px` (etiqueta de categoria).

**Proibido:** gradiente em qualquer superfície; sombra decorativa; cor por categoria em área grande; raio de 16px em card.

**Sombra:** só para elevar sobreposição, e sempre pelo token `--elevacao` — nenhum componente escreve sombra própria. O token tem um valor por tema: `0 8px 24px rgba(14,14,12,0.14)` no claro, `0 8px 24px rgba(0,0,0,0.5)` no escuro. Sombra quase preta sobre fundo quase preto é invisível, e sobreposição sem elevação perceptível deixa de se distinguir do conteúdo atrás.

**Alvo de toque mínimo:** 44×44px, inclusive teclas e abas.

**Anel de foco obrigatório** em todo focável: `outline: 2px solid var(--grafite); outline-offset: 2px`. `outline-none` sem substituto é reprovação.

**Voz:** pt-BR, segunda pessoa do singular, presente. Sem exclamação, sem emoji, sem elogio ao usuário, sem gamificação. Rótulo de seção é etiqueta, não título.

**Nome:** `casal`, caixa baixa em uso de marca. O `$` não aparece em lugar nenhum.

**Fora deste plano:** os oito defeitos não visuais da seção 18 da spec (testes do motor de fatura, fila de escrita remota, `hashDedup`, data da parcela, id de fatura, privacidade no banco, service worker). Não corrigir aqui, nem de passagem.

**Contagem de testes não é requisito.** Onde um passo diz `Expected: PASS, N testes`, o `N` é indicativo e foi contado à mão pelo autor do plano — que já errou duas vezes. O requisito é: o conjunto de testes escrito no passo anterior passa inteiro, com saída limpa. Divergência entre o `N` e o número real de casos não é defeito e não vira achado de revisão. O que **é** defeito: um caso do conjunto escrito no plano que não existe no arquivo entregue.

---

## Estrutura de arquivos

Novos:

```
web/vitest.config.mts                      configuração de teste
web/src/teste/setup.ts                     matchers do jest-dom
web/scripts/sem-cor-literal.mjs            portão: nenhuma cor literal em src/app e src/components

web/src/design/tokens.css                  variáveis de tema + @theme inline do Tailwind
web/src/design/fontes.css                  @font-face auto-hospedado
web/src/design/contraste.ts                cálculo de contraste WCAG, função pura
web/src/design/contraste.test.ts           prova que a paleta passa AA
web/public/fontes/                         woff2 subconjunto latino

web/src/components/marca/Marca.tsx         geometria do símbolo, três faixas, marca viva
web/src/components/marca/marca.ts          yFundo, caminhoMarca — funções puras
web/src/components/marca/marca.test.ts
web/src/components/marca/Assinatura.tsx    lockup B e horizontal

web/src/components/ui/Rotulo.tsx
web/src/components/ui/Numero.tsx
web/src/components/ui/Numero.test.tsx
web/src/components/ui/Cabecalho.tsx
web/src/components/ui/Navegacao.tsx
web/src/components/ui/LinhaLista.tsx
web/src/components/ui/Trilha.tsx
web/src/components/ui/Etiqueta.tsx
web/src/components/ui/Botao.tsx
web/src/components/ui/Campo.tsx
web/src/components/ui/Vazio.tsx
web/src/components/ui/Aviso.tsx            componente + contexto useAviso
web/src/components/ui/Teclado.tsx          Tecla + Teclado, com teclado físico
web/src/components/ui/Teclado.test.tsx

web/src/app/(app)/layout.tsx               casca, navegação, provedor de aviso
web/src/app/(app)/mes/page.tsx
web/src/app/(app)/lancar/page.tsx
web/src/app/(app)/cartoes/page.tsx
web/src/app/(app)/cartoes/novo/page.tsx
web/src/app/(app)/cartoes/[id]/page.tsx
web/src/app/(app)/cartoes/[id]/editar/page.tsx
web/src/app/(app)/cartoes/[id]/faturas/[competencia]/pagar/page.tsx
web/src/app/(app)/metas/page.tsx
web/src/app/(app)/mais/page.tsx
web/src/app/(app)/mais/contas/page.tsx
web/src/app/(app)/mais/contas/novo/page.tsx
web/src/app/(app)/mais/contas/[id]/page.tsx
web/src/app/(app)/mais/carteiras/page.tsx
web/src/app/(app)/mais/carteiras/nova/page.tsx
web/src/app/entrar/page.tsx
```

Modificados:

```
web/package.json                           dependências de teste, scripts verificar
web/src/app/layout.tsx                     metadata, viewport com zoom liberado, fontes
web/src/app/globals.css                    importa tokens e fontes; perde overflow hidden e cores
web/src/app/page.tsx                       redireciona para /mes
web/src/components/Providers.tsx           deixa de decidir tela; só provê sessão e loja
web/src/components/Icones.tsx              traço vindo de token
web/public/manifest.json                   nome casal, theme_color sem #7C5CFF
```

Removidos ao fim da fase 2:

```
web/src/components/CasalApp.tsx             1.208 linhas, catorze componentes
web/src/components/Login.tsx                vira src/app/entrar/page.tsx
web/src/components/CartaoFace.tsx           imitação de plástico, sai na fase 3
web/src/components/Teclado.tsx              vira src/components/ui/Teclado.tsx
web/public/file.svg, globe.svg, next.svg, vercel.svg, window.svg    restos do template
```

---

# Fase 1 — Fundação

Nenhuma tela muda nesta fase. Ao fim dela existem: infra de teste, tokens, fontes, marca e ativos, todos testados, e a interface antiga continua funcionando igual.

---

### Task 1: Infra de teste

`web/` não tem framework de teste. Sem isso não há TDD, e o motor de fatura em TypeScript segue sem cobertura. Esta tarefa instala o mínimo e prova que funciona com um teste real do domínio já existente.

**Files:**
- Modify: `web/package.json`
- Create: `web/vitest.config.mts`
- Create: `web/src/teste/setup.ts`
- Test: `web/src/lib/money.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: comando `npm test` (Vitest em modo run) e `npm run test:watch`. Ambiente `jsdom` com `@testing-library/jest-dom` carregado. Toda tarefa seguinte depende disso.

- [ ] **Step 1: Instalar dependências**

```bash
cd web
npm install -D vitest@^3 @vitejs/plugin-react@^5 jsdom@^26 \
  @testing-library/react@^16 @testing-library/dom@^10 \
  @testing-library/user-event@^14 @testing-library/jest-dom@^6
```

- [ ] **Step 2: Criar a configuração**

`web/vitest.config.mts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/teste/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
```

`web/src/teste/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Adicionar os scripts**

Em `web/package.json`, dentro de `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Escrever o teste que prova a infra**

`web/src/lib/money.test.ts`. Cobre `dividir`, que a spec original manda arredondar na primeira parcela, e `formatarBRL`:

```ts
import { describe, expect, it } from "vitest";
import { dividir, formatarBRL, EntradaValor } from "./money";

describe("dividir", () => {
  it("põe a sobra na primeira parcela", () => {
    expect(dividir(10000, 3)).toEqual([3334, 3333, 3333]);
  });

  it("divide exato quando não há sobra", () => {
    expect(dividir(9000, 3)).toEqual([3000, 3000, 3000]);
  });

  it("devolve vazio para zero partes", () => {
    expect(dividir(10000, 0)).toEqual([]);
  });
});

describe("formatarBRL", () => {
  it("formata com separador de milhar pt-BR", () => {
    expect(formatarBRL(428310)).toBe("R$ 4.283,10");
  });

  it("marca negativo com sinal de menos", () => {
    expect(formatarBRL(-1800)).toBe("−R$ 18,00");
  });

  it("preenche centavos com zero à esquerda", () => {
    expect(formatarBRL(105)).toBe("R$ 1,05");
  });
});

describe("EntradaValor", () => {
  it("digita da direita para a esquerda em centavos", () => {
    const e = new EntradaValor();
    e.digitar(2);
    e.digitar(1);
    e.digitar(4);
    e.digitar(9);
    expect(e.centavos).toBe(2149);
    // Quatro dígitos num teclado de centavos são R$ 21,49, não R$ 214,90.
    expect(formatarBRL(e.centavos)).toBe("R$ 21,49");
  });

  it("apaga o último dígito", () => {
    const e = EntradaValor.deCentavos(21490);
    e.apagar();
    expect(e.centavos).toBe(2149);
  });

  it("não permite salvar valor zero", () => {
    expect(new EntradaValor().podeSalvar).toBe(false);
  });
});
```

- [ ] **Step 5: Rodar e verificar que passa**

Run: `cd web && npm test`
Expected: PASS, 9 testes. Se `dividir(10000, 3)` falhar, o defeito é real e está em `money.ts` — pare e reporte, não ajuste o teste.

- [ ] **Step 6: Commit**

```bash
git add web/package.json web/package-lock.json web/vitest.config.mts \
  web/src/teste/setup.ts web/src/lib/money.test.ts
git commit -m "test(web): infra de teste com vitest e testing library"
```

---

### Task 2: Tokens de cor, espaço e raio

**Files:**
- Create: `web/src/design/tokens.css`
- Create: `web/src/design/contraste.ts`
- Test: `web/src/design/contraste.test.ts`
- Modify: `web/src/app/globals.css`

**Interfaces:**
- Consumes: infra de teste da tarefa 1.
- Produces: variáveis CSS `--ar --grafite --cinza --nevoa --ambar --ambar-texto` em `:root`, com troca automática por `prefers-color-scheme` e sobreposição explícita por `[data-tema="claro"|"escuro"]`. Utilitários Tailwind `bg-ar text-grafite text-cinza border-nevoa bg-ambar text-ambar-texto`, mais `font-texto` e `font-numero`. Exporta `luminancia(hex: string): number` e `contraste(a: string, b: string): number`.

- [ ] **Step 1: Escrever o teste de contraste**

`web/src/design/contraste.test.ts`. Este teste é o portão que impede o defeito de contraste da interface atual de voltar:

```ts
import { describe, expect, it } from "vitest";
import { contraste } from "./contraste";

const CLARO = {
  ar: "#FBFAF7",
  grafite: "#0E0E0C",
  cinza: "#6E6E66",
  ambar: "#C98A2E",
  ambarTexto: "#8A5A0F",
};

const ESCURO = {
  ar: "#0E0E0C",
  grafite: "#FBFAF7",
  cinza: "#9A9A90",
  ambar: "#C98A2E",
  ambarTexto: "#E0A94A",
};

describe("contraste", () => {
  it("calcula o par conhecido preto sobre branco", () => {
    expect(contraste("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
  });

  it("é simétrico", () => {
    expect(contraste("#0E0E0C", "#FBFAF7")).toBeCloseTo(
      contraste("#FBFAF7", "#0E0E0C"),
      5,
    );
  });

  it("aceita forma abreviada de três dígitos", () => {
    expect(contraste("#000", "#fff")).toBeCloseTo(21, 1);
  });
});

describe("tokens de texto passam AA no tema claro", () => {
  it.each([
    ["grafite", CLARO.grafite],
    ["cinza", CLARO.cinza],
    ["ambarTexto", CLARO.ambarTexto],
  ])("%s sobre ar tem no mínimo 4,5:1", (_nome, cor) => {
    expect(contraste(cor, CLARO.ar)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("tokens de texto passam AA no tema escuro", () => {
  it.each([
    ["grafite", ESCURO.grafite],
    ["cinza", ESCURO.cinza],
    ["ambarTexto", ESCURO.ambarTexto],
  ])("%s sobre ar tem no mínimo 4,5:1", (_nome, cor) => {
    expect(contraste(cor, ESCURO.ar)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("ambar de preenchimento é reprovado para texto no tema claro", () => {
  it("fica abaixo de 4,5:1, por isso existe o ambar-texto", () => {
    expect(contraste(CLARO.ambar, CLARO.ar)).toBeLessThan(4.5);
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `cd web && npm test -- contraste`
Expected: FAIL — `Failed to resolve import "./contraste"`.

- [ ] **Step 3: Implementar o cálculo**

`web/src/design/contraste.ts`:

```ts
/** Contraste WCAG 2.1. Entrada em hexadecimal de 3 ou 6 dígitos. */

function canal(v: number): number {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminancia(hex: string): number {
  const bruto = hex.replace("#", "");
  const cheio =
    bruto.length === 3
      ? bruto
          .split("")
          .map((c) => c + c)
          .join("")
      : bruto;
  if (!/^[0-9a-fA-F]{6}$/.test(cheio)) {
    throw new Error(`hexadecimal inválido: ${hex}`);
  }
  const r = canal(parseInt(cheio.slice(0, 2), 16));
  const g = canal(parseInt(cheio.slice(2, 4), 16));
  const b = canal(parseInt(cheio.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  const claro = Math.max(la, lb);
  const escuro = Math.min(la, lb);
  return (claro + 0.05) / (escuro + 0.05);
}
```

- [ ] **Step 4: Rodar e verificar que passa**

Run: `cd web && npm test -- contraste`
Expected: PASS, 10 testes (3 do cálculo, 3 do tema claro, 3 do escuro, 1 do âmbar reprovado). O último confirma de propósito que `--ambar` reprova em texto.

- [ ] **Step 5: Criar os tokens**

`web/src/design/tokens.css`. `@theme inline` é o que permite os utilitários apontarem para variáveis que trocam em tempo de execução:

```css
:root {
  --ar: #fbfaf7;
  --grafite: #0e0e0c;
  --cinza: #6e6e66;
  --nevoa: #e7e4dc;
  --ambar: #c98a2e;
  --ambar-texto: #8a5a0f;

  --elevacao: 0 8px 24px rgba(14, 14, 12, 0.14);

  --e-1: 4px;
  --e-2: 8px;
  --e-3: 12px;
  --e-4: 16px;
  --e-5: 20px;
  --e-6: 24px;
  --e-7: 32px;
  --e-8: 48px;

  --r-amostra: 4px;
  --r-controle: 9px;
  --r-icone: 22px;
  --r-etiqueta: 999px;

  --alvo: 44px;
  --traco-icone: 1.5px;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-tema="claro"]) {
    --ar: #0e0e0c;
    --grafite: #fbfaf7;
    --cinza: #9a9a90;
    --nevoa: #26261f;
    --ambar: #c98a2e;
    --ambar-texto: #e0a94a;
    --elevacao: 0 8px 24px rgba(0, 0, 0, 0.5);
  }
}

:root[data-tema="escuro"] {
  --ar: #0e0e0c;
  --grafite: #fbfaf7;
  --cinza: #9a9a90;
  --nevoa: #26261f;
  --ambar: #c98a2e;
  --ambar-texto: #e0a94a;
  --elevacao: 0 8px 24px rgba(0, 0, 0, 0.5);
}

@theme inline {
  --color-ar: var(--ar);
  --color-grafite: var(--grafite);
  --color-cinza: var(--cinza);
  --color-nevoa: var(--nevoa);
  --color-ambar: var(--ambar);
  --color-ambar-texto: var(--ambar-texto);

  --font-texto: "Inter Tight", system-ui, sans-serif;
  --font-numero: "IBM Plex Mono", ui-monospace, monospace;

  --radius-amostra: var(--r-amostra);
  --radius-controle: var(--r-controle);
  --radius-icone: var(--r-icone);
  --radius-etiqueta: var(--r-etiqueta);

  --shadow-elevacao: var(--elevacao);
}
```

- [ ] **Step 6: Ligar os tokens ao globals.css**

Em `web/src/app/globals.css`, substituir as duas primeiras linhas do arquivo (o `@import "tailwindcss";` e o bloco `:root` com `--casal: #7c5cff;`) por:

```css
@import "tailwindcss";
@import "../design/tokens.css";
```

O bloco `:root` antigo — `--casal`, `--tab-h`, `--fab-size`, `--fab-lift`, `--safe-bottom`, `--tab-pad` — perde só a linha `--casal: #7c5cff;`. As medidas da barra de abas continuam por ora: a fase 2 substitui a barra, e removê-las agora quebra a interface atual.

- [ ] **Step 7: Verificar que a aplicação sobe**

Run: `cd web && npm run build`
Expected: build conclui sem erro. A aparência não muda — nenhum componente usa os tokens ainda.

- [ ] **Step 8: Commit**

```bash
git add web/src/design/tokens.css web/src/design/contraste.ts \
  web/src/design/contraste.test.ts web/src/app/globals.css
git commit -m "feat(design): tokens de cor, espaco e raio com portao de contraste"
```

---

### Task 3: Fontes auto-hospedadas

Fonte por CDN está fora: adiciona origem externa e uma corrida de rede no caminho crítico.

**Files:**
- Create: `web/src/design/fontes.css`
- Create: `web/public/fontes/` (dez arquivos `woff2` — cinco faces × subconjuntos `latin` e `latin-ext`)
- Modify: `web/src/app/globals.css`
- Modify: `web/src/app/layout.tsx`

**Interfaces:**
- Consumes: tokens da tarefa 2 (`--font-texto`, `--font-numero`).
- Produces: famílias `Inter Tight` (400/500/600) e `IBM Plex Mono` (400/500) disponíveis por CSS, sem requisição a terceiro.

- [ ] **Step 1: Baixar os arquivos**

Cinco faces, cada uma nos subconjuntos `latin` e `latin-ext`, com `unicode-range` declarado. O `latin-ext` custa espaço no repositório e nenhum byte em execução: diacrítico português vive no Latin-1 Supplement, dentro da faixa `latin`, então o navegador só busca o `latin-ext` se aparecer um glifo que exija — nome de estabelecimento estrangeiro, por exemplo.

```bash
cd web && mkdir -p public/fontes
npx --yes google-webfonts-helper@latest download \
  --id inter-tight --variants 400,500,600 --formats woff2 \
  --subsets latin,latin-ext --dest public/fontes
npx --yes google-webfonts-helper@latest download \
  --id ibm-plex-mono --variants 400,500 --formats woff2 \
  --subsets latin,latin-ext --dest public/fontes
ls -la public/fontes
```

Se a ferramenta falhar ou mudar de interface, baixe direto de `https://gwfh.mranftl.com/fonts` pelas mesmas opções e coloque os `woff2` em `web/public/fontes/`. O que importa é o resultado: arquivos locais com esses nomes.

- [ ] **Step 2: Declarar as faces**

`web/src/design/fontes.css`. Ajuste os nomes dos arquivos ao que o passo 1 produziu:

```css
@font-face {
  font-family: "Inter Tight";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fontes/inter-tight-latin-400-normal.woff2") format("woff2");
}
@font-face {
  font-family: "Inter Tight";
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url("/fontes/inter-tight-latin-500-normal.woff2") format("woff2");
}
@font-face {
  font-family: "Inter Tight";
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("/fontes/inter-tight-latin-600-normal.woff2") format("woff2");
}
@font-face {
  font-family: "IBM Plex Mono";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fontes/ibm-plex-mono-latin-400-normal.woff2") format("woff2");
}
@font-face {
  font-family: "IBM Plex Mono";
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url("/fontes/ibm-plex-mono-latin-500-normal.woff2") format("woff2");
}
```

- [ ] **Step 3: Importar e aplicar ao corpo**

Em `web/src/app/globals.css`, adicionar a importação logo depois dos tokens:

```css
@import "../design/fontes.css";
```

E na regra `html, body`, trocar a declaração `font-family` inteira — hoje é a pilha `-apple-system, BlinkMacSystemFont, "SF Pro Text", …` — por:

```css
  font-family: var(--font-texto);
```

- [ ] **Step 4: Pré-carregar os dois pesos acima da dobra**

Os dois pesos são **Inter Tight 600** e **IBM Plex Mono 500**, não os 400 nem os 500 do texto. É o que a dobra do estado-alvo usa: `Cabecalho` e `Rotulo` são 600, e todo número é mono 500. Inter Tight 400 é corpo de lista, que aparece abaixo. Enquanto as telas não estiverem migradas, o preload do mono fica sem uso e o navegador registra aviso de "preload não utilizado" — transitório, resolve na tarefa 12.

Em `web/src/app/layout.tsx`, dentro do `<head>` que já existe, ao lado da meta `apple-mobile-web-app-capable`:

```tsx
<link
  rel="preload"
  href="/fontes/inter-tight-latin-600-normal.woff2"
  as="font"
  type="font/woff2"
  crossOrigin="anonymous"
/>
<link
  rel="preload"
  href="/fontes/ibm-plex-mono-latin-500-normal.woff2"
  as="font"
  type="font/woff2"
  crossOrigin="anonymous"
/>
```

- [ ] **Step 5: Verificar**

Run: `cd web && npm run build && npm run dev`
Abra `http://localhost:3000` e confirme na aba de rede que as fontes vêm de `/fontes/` e que nenhuma requisição sai para `fonts.googleapis.com` ou `fonts.gstatic.com`. O texto do aplicativo tem que mudar de aparência — é a única mudança visual permitida na fase 1.

- [ ] **Step 6: Commit**

```bash
git add web/public/fontes web/src/design/fontes.css \
  web/src/app/globals.css web/src/app/layout.tsx
git commit -m "feat(design): Inter Tight e IBM Plex Mono auto-hospedadas"
```

---

### Task 4: A marca — geometria e marca viva

O componente é o único lugar do código que conhece a geometria do símbolo. Três desenhos por faixa de tamanho, porque escalar um só colapsa a curva em tamanho pequeno.

**Files:**
- Create: `web/src/components/marca/marca.ts`
- Create: `web/src/components/marca/Marca.tsx`
- Test: `web/src/components/marca/marca.test.ts`

**Interfaces:**
- Consumes: tokens da tarefa 2.
- Produces:
  - `yFundo(folga: number | undefined): number` — profundidade da curva. `folga` é fração (0,36 = 36%). `undefined` devolve 46, o estado de folga larga usado enquanto Metas não existe.
  - `corDaMarca(folga: number | undefined): "grafite" | "ambar" | "ambar-texto"`
  - `faixaDe(tamanho: number): "grande" | "medio" | "pequeno"`
  - `caminhoMarca(tamanho: number, y: number): { d: string; traco: number }`
  - `<Marca tamanho={n} folga?={f} />` — SVG `viewBox="0 0 64 64"`, `role="img"`, com `<title>casal</title>`.

- [ ] **Step 1: Escrever o teste**

`web/src/components/marca/marca.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { caminhoMarca, corDaMarca, faixaDe, yFundo } from "./marca";

describe("yFundo", () => {
  it("dá a curva mais funda com folga de 40% ou mais", () => {
    expect(yFundo(0.4)).toBe(46);
    expect(yFundo(0.9)).toBe(46);
  });

  it("interpola no meio da faixa de aperto", () => {
    expect(yFundo(0.2)).toBeCloseTo(35.5, 1);
  });

  it("mantém o piso de 25 enquanto ainda há folga", () => {
    expect(yFundo(0.001)).toBeGreaterThanOrEqual(25);
    expect(yFundo(0.15)).toBeCloseTo(32.875, 2);
  });

  it("vira reta exata quando a folga acaba", () => {
    expect(yFundo(0)).toBe(22);
    expect(yFundo(-0.3)).toBe(22);
  });

  it("assume folga larga quando não há dado", () => {
    expect(yFundo(undefined)).toBe(46);
  });
});

describe("corDaMarca", () => {
  it("usa grafite com folga de 15% ou mais", () => {
    expect(corDaMarca(0.36)).toBe("grafite");
    expect(corDaMarca(0.15)).toBe("grafite");
  });

  it("usa ambar quando está no limite", () => {
    expect(corDaMarca(0.05)).toBe("ambar");
  });

  it("usa ambar-texto no estouro", () => {
    expect(corDaMarca(0)).toBe("ambar-texto");
    expect(corDaMarca(-0.1)).toBe("ambar-texto");
  });

  it("usa grafite sem dado", () => {
    expect(corDaMarca(undefined)).toBe("grafite");
  });
});

describe("faixaDe", () => {
  it("separa as três faixas nos limites da spec", () => {
    expect(faixaDe(64)).toBe("grande");
    expect(faixaDe(32)).toBe("grande");
    expect(faixaDe(31)).toBe("medio");
    expect(faixaDe(20)).toBe("medio");
    expect(faixaDe(19)).toBe("pequeno");
    expect(faixaDe(16)).toBe("pequeno");
  });
});

describe("caminhoMarca", () => {
  it("usa o desenho grande com o traço da spec", () => {
    const { d, traco } = caminhoMarca(48, 42);
    expect(d).toBe("M8 22 C20 22 22 42 32 42 C42 42 44 22 56 22");
    expect(traco).toBe(7);
  });

  it("usa o desenho médio, com curso mais curto e traço mais grosso", () => {
    const { d, traco } = caminhoMarca(28, 43);
    expect(d).toBe("M7 21 C18 21 20 43 32 43 C44 43 46 21 57 21");
    expect(traco).toBe(9.5);
  });

  it("usa o desenho pequeno abaixo de 20px", () => {
    const { d, traco } = caminhoMarca(16, 44);
    expect(d).toBe("M6 20 C16 20 18 44 32 44 C46 44 48 20 58 20");
    expect(traco).toBe(13);
  });

  it("aplica o y recebido no desenho, e não um valor fixo", () => {
    expect(caminhoMarca(48, 31).d).toBe(
      "M8 22 C20 22 22 31 32 31 C42 31 44 22 56 22",
    );
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `cd web && npm test -- marca`
Expected: FAIL — `Failed to resolve import "./marca"`.

- [ ] **Step 3: Implementar as funções puras**

`web/src/components/marca/marca.ts`:

```ts
/**
 * Geometria do símbolo do casal — o diafragma.
 *
 * Três desenhos, um gesto. Escalar um só colapsa a curva: em tamanho
 * pequeno o curso horizontal encurta, a curva aprofunda e o traço
 * engrossa em proporção.
 *
 * A profundidade da curva é o dado. Reta é o alarme.
 */

export type Faixa = "grande" | "medio" | "pequeno";
export type CorMarca = "grafite" | "ambar" | "ambar-texto";

/** Curva mais funda possível: usado como padrão enquanto Metas não existe. */
export const Y_FUNDO_LARGO = 46;

/** Reta exata. Reservada ao estouro. */
export const Y_RETA = 22;

/** Piso de curva enquanto ainda há folga, para a reta significar só estouro. */
const Y_PISO = 25;

const FOLGA_CHEIA = 0.4;
const FOLGA_LIMITE = 0.15;

function limitar(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function yFundo(folga: number | undefined): number {
  if (folga === undefined) return Y_FUNDO_LARGO;
  if (folga <= 0) return Y_RETA;
  const t = limitar(folga / FOLGA_CHEIA, 0, 1);
  return Y_PISO + (Y_FUNDO_LARGO - Y_PISO) * t;
}

export function corDaMarca(folga: number | undefined): CorMarca {
  if (folga === undefined) return "grafite";
  if (folga <= 0) return "ambar-texto";
  if (folga < FOLGA_LIMITE) return "ambar";
  return "grafite";
}

export function faixaDe(tamanho: number): Faixa {
  if (tamanho >= 32) return "grande";
  if (tamanho >= 20) return "medio";
  return "pequeno";
}

const DESENHOS: Record<
  Faixa,
  { x0: number; x1: number; c0: number; c1: number; base: number; traco: number }
> = {
  grande: { x0: 8, x1: 56, c0: 20, c1: 22, base: 22, traco: 7 },
  medio: { x0: 7, x1: 57, c0: 18, c1: 20, base: 21, traco: 9.5 },
  pequeno: { x0: 6, x1: 58, c0: 16, c1: 18, base: 20, traco: 13 },
};

/** Curva simétrica, pontas na horizontal: cede e volta, nunca cai. */
export function caminhoMarca(
  tamanho: number,
  y: number,
): { d: string; traco: number } {
  const { x0, x1, c0, c1, base, traco } = DESENHOS[faixaDe(tamanho)];
  const e0 = 64 - c0;
  const e1 = 64 - c1;
  const d =
    `M${x0} ${base} ` +
    `C${c0} ${base} ${c1} ${y} 32 ${y} ` +
    `C${e1} ${y} ${e0} ${base} ${x1} ${base}`;
  return { d, traco };
}
```

- [ ] **Step 4: Rodar e verificar que passa**

Run: `cd web && npm test -- marca`
Expected: PASS, 14 testes.

- [ ] **Step 5: Implementar o componente**

`web/src/components/marca/Marca.tsx`:

```tsx
import { caminhoMarca, corDaMarca, yFundo } from "./marca";

const CLASSE_COR = {
  grafite: "text-grafite",
  ambar: "text-ambar",
  "ambar-texto": "text-ambar-texto",
} as const;

/**
 * O símbolo. `folga` é a fração da sobra segura do período — omitida
 * enquanto Metas não existe, o que desenha o estado de folga larga.
 */
export function Marca({
  tamanho,
  folga,
  titulo = "casal",
}: {
  tamanho: number;
  folga?: number;
  titulo?: string;
}) {
  const y = yFundo(folga);
  const { d, traco } = caminhoMarca(tamanho, y);
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 64 64"
      role="img"
      className={CLASSE_COR[corDaMarca(folga)]}
    >
      <title>{titulo}</title>
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={traco}
        strokeLinecap="butt"
      />
    </svg>
  );
}
```

- [ ] **Step 6: Verificar que compila**

Run: `cd web && npx tsc --noEmit && npm test`
Expected: sem erro de tipo, todos os testes passam.

- [ ] **Step 7: Commit**

```bash
git add web/src/components/marca
git commit -m "feat(marca): diafragma em tres faixas com curva ligada a folga"
```

---

### Task 5: A assinatura — lockup B

A palavra em cima, a linha embaixo, cedendo. A linha não é símbolo ao lado do nome: é a base sobre a qual o nome se apoia.

**Files:**
- Create: `web/src/components/marca/Assinatura.tsx`
- Test: `web/src/components/marca/Assinatura.test.tsx`

**Interfaces:**
- Consumes: `Marca` e `caminhoMarca` da tarefa 4; tokens da tarefa 2.
- Produces: `<Assinatura variante="base" | "horizontal" largura={n} />`. `largura` em pixels é a largura da palavra composta; toda medida deriva dela, conforme a spec: caixa da linha `0.20 × L`, traço `L / 29`, espaço entre palavra e linha `0.13 × L`.

- [x] **Step 1: Escrever o teste**

`web/src/components/marca/Assinatura.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Assinatura } from "./Assinatura";

describe("Assinatura", () => {
  it("mostra o nome em caixa baixa e sem o dólar", () => {
    render(<Assinatura variante="base" largura={132} />);
    const nome = screen.getByText("casal");
    expect(nome).toBeInTheDocument();
    expect(nome.textContent).not.toContain("$");
  });

  it("anuncia como imagem única, não como texto solto mais desenho", () => {
    render(<Assinatura variante="base" largura={132} />);
    expect(screen.getByRole("img", { name: "casal" })).toBeInTheDocument();
  });

  it("deriva o traço da largura, na proporção da spec", () => {
    // A spec define o traço em pixels: L / 29. O atributo stroke-width está em
    // unidade de viewBox, que tem 132 de largura, então converta antes de medir.
    const largura = 290;
    const { container } = render(<Assinatura variante="base" largura={largura} />);
    const emViewBox = Number(container.querySelector("path")?.getAttribute("stroke-width"));
    const emPixels = emViewBox * (largura / 132);
    expect(emPixels).toBeCloseTo(largura / 29, 1);
  });

  it("mantém a proporção do traço em qualquer largura", () => {
    for (const largura of [112, 132, 290]) {
      const { container, unmount } = render(
        <Assinatura variante="base" largura={largura} />,
      );
      const emViewBox = Number(container.querySelector("path")?.getAttribute("stroke-width"));
      expect(emViewBox * (largura / 132)).toBeCloseTo(largura / 29, 1);
      unmount();
    }
  });

  it("na variante horizontal usa o símbolo, não a linha larga", () => {
    const { container } = render(
      <Assinatura variante="horizontal" largura={132} />,
    );
    expect(container.querySelector('svg[viewBox="0 0 64 64"]')).not.toBeNull();
  });
});
```

- [x] **Step 2: Rodar e verificar que falha**

Run: `cd web && npm test -- Assinatura`
Expected: FAIL — `Failed to resolve import "./Assinatura"`.

- [x] **Step 3: Implementar**

`web/src/components/marca/Assinatura.tsx`:

```tsx
import { Marca } from "./Marca";

/**
 * Assinatura da marca.
 *
 * `base` é a principal: palavra em cima, linha embaixo cedendo. Toda
 * medida deriva da largura da palavra, conforme a seção 6 da spec.
 * `horizontal` é a secundária, para cabeçalho estreito.
 */
export function Assinatura({
  variante,
  largura,
}: {
  variante: "base" | "horizontal";
  largura: number;
}) {
  if (variante === "horizontal") {
    const alturaSimbolo = largura * 0.34;
    return (
      <span
        role="img"
        aria-label="casal"
        className="inline-flex items-center text-grafite"
        style={{ gap: alturaSimbolo * 0.35 }}
      >
        {/* O nome acessível é o da assinatura inteira; o símbolo interno
            sai da árvore de acessibilidade para não anunciar imagem sem nome. */}
        <span aria-hidden>
          <Marca tamanho={alturaSimbolo} titulo="" />
        </span>
        <span
          aria-hidden
          className="font-texto font-medium lowercase leading-none"
          style={{ fontSize: largura * 0.23, letterSpacing: "0.22em" }}
        >
          casal
        </span>
      </span>
    );
  }

  const alturaLinha = largura * 0.2;
  const traco = largura / 29;
  const respiro = largura * 0.13;

  return (
    <span
      role="img"
      aria-label="casal"
      className="inline-flex flex-col items-center text-grafite"
    >
      <span
        aria-hidden
        className="font-texto font-medium lowercase leading-none"
        style={{
          fontSize: largura * 0.23,
          letterSpacing: "0.22em",
          paddingLeft: "0.22em",
          marginBottom: respiro,
        }}
      >
        casal
      </span>
      <svg
        width={largura}
        height={alturaLinha}
        viewBox="0 0 132 26"
        aria-hidden
        style={{ display: "block" }}
      >
        <path
          d="M2 4 C26 4 30 21 66 21 C102 21 106 4 130 4"
          fill="none"
          stroke="currentColor"
          strokeWidth={(traco * 132) / largura}
          strokeLinecap="butt"
        />
      </svg>
    </span>
  );
}
```

O `strokeWidth` converte a espessura em pixels para a unidade do `viewBox`, que é fixo em 132 de largura. Para `largura = 290` isso dá `(290/29 × 132) / 290 = 4,55` no `viewBox`, o que o teste do passo 1 confere em pixels.

- [x] **Step 4: Rodar e verificar que passa**

Run: `cd web && npm test -- Assinatura`
Expected: PASS, 4 testes.

- [x] **Step 5: Conferir a constante do traço**

O `stroke-width` em unidade de `viewBox` é `132 / 29 = 4,552`, **constante para qualquer largura** — é o que faz o traço renderizado crescer junto com a palavra. Confirme:

Run: `cd web && npm test -- Assinatura --reporter=verbose`

Se o valor em `viewBox` variar com a largura, a conversão está errada: o traço em pixels deixaria de ser `L / 29` e a assinatura perderia a proporção em alguma escala.

- [x] **Step 6: Commit**

```bash
git add web/src/components/marca/Assinatura.tsx \
  web/src/components/marca/Assinatura.test.tsx
git commit -m "feat(marca): assinatura com a linha como base da palavra"
```

---

### Task 6: Ativos, manifesto e zoom liberado

Fecha a fase 1: os ícones do `$` roxo saem, o manifesto para de declarar `#7C5CFF`, e o bloqueio de ampliação — que reprova o critério 1.4.4 do WCAG — é removido.

**Files:**
- Create: `web/public/favicon.svg`
- Create: `web/scripts/gerar-icones.mjs`
- Modify: `web/public/icon-192.png`, `web/public/icon-512.png`, `web/public/apple-touch-icon.png`
- Create: `web/public/icon-512-maskable.png`
- Modify: `web/public/manifest.json`
- Modify: `web/src/app/layout.tsx`
- Delete: `web/public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`

**Interfaces:**
- Consumes: geometria da tarefa 4 — o script importa `caminhoMarca` em vez de repetir o caminho, para que exista uma única fonte da forma.
- Produces: conjunto completo de ícones, `favicon.svg`, manifesto com `name: "casal"` e `theme_color` sem roxo, viewport sem bloqueio de zoom.

- [ ] **Step 1: Criar o favicon vetorial**

`web/public/favicon.svg` usa o desenho da faixa pequena, porque favicon renderiza a 16px:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#FBFAF7"/>
  <path d="M6 20 C16 20 18 44 32 44 C46 44 48 20 58 20"
        fill="none" stroke="#0E0E0C" stroke-width="13" stroke-linecap="butt"/>
</svg>
```

- [ ] **Step 2: Escrever o script que gera os PNG**

`web/scripts/gerar-icones.mjs`. Importa a geometria para não haver duas verdades sobre a forma:

```js
import { writeFile, mkdir } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";

const AR = "#FBFAF7";
const GRAFITE = "#0E0E0C";

// Espelha caminhoMarca("grande", 46) de src/components/marca/marca.ts.
const CAMINHO_GRANDE = "M8 22 C20 22 22 46 32 46 C42 46 44 22 56 22";

function svg({ margem }) {
  const escala = 1 - margem * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${AR}"/>
  <g transform="translate(${margem * 64} ${margem * 64}) scale(${escala})">
    <path d="${CAMINHO_GRANDE}" fill="none" stroke="${GRAFITE}"
          stroke-width="7" stroke-linecap="butt"/>
  </g>
</svg>`;
}

const ALVOS = [
  { arquivo: "icon-192.png", tamanho: 192, margem: 0 },
  { arquivo: "icon-512.png", tamanho: 512, margem: 0 },
  { arquivo: "icon-512-maskable.png", tamanho: 512, margem: 0.2 },
  { arquivo: "apple-touch-icon.png", tamanho: 180, margem: 0 },
];

await mkdir("public", { recursive: true });
for (const { arquivo, tamanho, margem } of ALVOS) {
  const png = new Resvg(svg({ margem }), {
    fitTo: { mode: "width", value: tamanho },
  })
    .render()
    .asPng();
  await writeFile(`public/${arquivo}`, png);
  console.log(`${arquivo} · ${tamanho}px · margem ${margem * 100}%`);
}
```

- [ ] **Step 3: Gerar**

```bash
cd web
npm install -D @resvg/resvg-js@^2
node scripts/gerar-icones.mjs
```

Expected: quatro linhas na saída. Abra `public/icon-512.png` e confirme: curva grafite sobre papel, sem roxo, sem `$`.

- [ ] **Step 4: Reescrever o manifesto**

`web/public/manifest.json`:

```json
{
  "name": "casal",
  "short_name": "casal",
  "description": "Gastos, cartões e contas do casal.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#FBFAF7",
  "theme_color": "#FBFAF7",
  "lang": "pt-BR",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

O ícone `maskable` deixa de ser o mesmo arquivo do `any`: agora tem a margem de segurança de 20% que a plataforma recorta.

- [ ] **Step 5: Liberar o zoom e trocar o título**

Em `web/src/app/layout.tsx`, substituir o objeto `viewport` inteiro por:

```tsx
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBFAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#0E0E0C" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
```

`maximumScale` e `userScalable` saem e não voltam: bloqueavam ampliação e reprovavam o critério 1.4.4.

No objeto `metadata`, trocar os três textos e acrescentar o favicon vetorial:

```tsx
  title: "casal",
  description: "Gastos, cartões e contas do casal.",
  applicationName: "casal",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "casal",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
```

`statusBarStyle` deixa de ser `black-translucent`: com fundo papel, translúcido preto entrega texto ilegível na barra de status.

- [ ] **Step 6: Apagar os restos do template**

```bash
cd web && rm public/file.svg public/globe.svg public/next.svg \
  public/vercel.svg public/window.svg
grep -rn "file.svg\|globe.svg\|next.svg\|vercel.svg\|window.svg" src/ || \
  echo "nenhuma referência restante"
```

Expected: `nenhuma referência restante`.

- [ ] **Step 7: Verificar**

Run: `cd web && npm run build`
Expected: build limpo. Em `npm run dev`, o ícone da aba passa a ser a curva, e a ampliação por pinça volta a funcionar no celular.

- [ ] **Step 8: Commit**

```bash
git add web/public web/scripts/gerar-icones.mjs web/src/app/layout.tsx \
  web/package.json web/package-lock.json
git commit -m "feat(marca): icones, manifesto e favicon do casal; libera o zoom"
```

---
# Fase 2 — Rotas, componentes e forma, uma tela por vez

Troca navegação por estado em memória por rotas de verdade, extrai os catorze componentes de `CasalApp.tsx`, e aplica a forma nova — tudo junto, mas **uma tela por vez**.

A regra que governa a fase é a da seção 19 da spec: **o comportamento de cada tela é preservado a cada passo.** A aparência muda, porque migrar para os componentes já traz a paleta e a tipografia novas; o que a tela *faz* não muda. Nenhum cálculo, nenhuma regra de fatura e nenhuma chamada ao repositório é tocada aqui.

Tela por tela, e não tudo de uma vez, por um motivo prático: enquanto uma rota já está migrada, as outras continuam sendo servidas por `CasalApp.tsx`, e a aplicação nunca fica quebrada entre commits. `CasalApp.tsx` só é apagado na tarefa 16, quando a última tela sai dele.

Tema escuro, layout de desktop, varredura de acessibilidade e portões automatizados são a fase 3 — valem para todas as telas de uma vez e não fazem sentido tela por tela.

---

### Task 7: Casca com rotas e navegação

Hoje toda navegação é `useState<Tela>` dentro de `CasalApp`. O botão voltar do navegador sai do aplicativo, recarregar perde o lugar, e nenhuma tela pode ser compartilhada.

**Files:**
- Create: `web/src/app/(app)/layout.tsx`
- Create: `web/src/app/(app)/mes/page.tsx`
- Create: `web/src/app/(app)/metas/page.tsx`
- Create: `web/src/components/ui/Navegacao.tsx`
- Test: `web/src/components/ui/Navegacao.test.tsx`
- Modify: `web/src/app/page.tsx`
- Modify: `web/src/components/Providers.tsx`

**Interfaces:**
- Consumes: tokens da tarefa 2; `Marca` da tarefa 4.
- Produces:
  - `<Navegacao />` — lê `usePathname()`, marca o destino ativo com `aria-current="page"`, cobre os quatro destinos `/mes /cartoes /metas /mais`.
  - `(app)/layout.tsx` — casca com `Providers`, área de rolagem, `Navegacao` e a ação de lançar. Todas as rotas de aplicativo vivem dentro dela.
  - `/` redireciona para `/mes`. `/metas` existe como tela reservada.

- [ ] **Step 1: Escrever o teste da navegação**

`web/src/components/ui/Navegacao.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Navegacao } from "./Navegacao";

const caminho = vi.hoisted(() => ({ atual: "/mes" }));
vi.mock("next/navigation", () => ({
  usePathname: () => caminho.atual,
}));

describe("Navegacao", () => {
  it("oferece os quatro destinos", () => {
    caminho.atual = "/mes";
    render(<Navegacao />);
    for (const nome of ["mês", "cartões", "metas", "mais"]) {
      expect(screen.getByRole("link", { name: nome })).toBeInTheDocument();
    }
  });

  it("marca o destino ativo com aria-current, não só com cor", () => {
    caminho.atual = "/cartoes";
    render(<Navegacao />);
    expect(screen.getByRole("link", { name: "cartões" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "mês" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("considera ativa a seção inteira, não só a raiz dela", () => {
    caminho.atual = "/cartoes/abc/editar";
    render(<Navegacao />);
    expect(screen.getByRole("link", { name: "cartões" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("dá à ação de lançar um alvo próprio, fora das abas", () => {
    caminho.atual = "/mes";
    render(<Navegacao />);
    expect(
      screen.getByRole("link", { name: "Novo lançamento" }),
    ).toHaveAttribute("href", "/lancar");
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `cd web && npm test -- Navegacao`
Expected: FAIL — `Failed to resolve import "./Navegacao"`.

- [ ] **Step 3: Implementar a navegação**

`web/src/components/ui/Navegacao.tsx`. Mantém as medidas atuais da barra de abas, para não mudar a aparência nesta fase:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconeAba } from "../Icones";

const DESTINOS = [
  { href: "/mes", nome: "mês", icone: "inicio" },
  { href: "/cartoes", nome: "cartões", icone: "cartoes" },
  { href: "/metas", nome: "metas", icone: "metas" },
  { href: "/mais", nome: "mais", icone: "mais" },
] as const;

function ativa(caminho: string, href: string): boolean {
  return caminho === href || caminho.startsWith(`${href}/`);
}

export function Navegacao() {
  const caminho = usePathname();
  return (
    <>
      <nav className="casal-tabbar" aria-label="Seções">
        {DESTINOS.map((d) => {
          const atual = ativa(caminho, d.href);
          return (
            <Link
              key={d.href}
              href={d.href}
              aria-current={atual ? "page" : undefined}
              className="flex h-[49px] w-full min-w-0 flex-col items-center justify-center gap-0.5 text-[10px]"
            >
              <span
                className={
                  atual
                    ? "rounded-lg bg-nevoa px-2.5 py-0.5 text-grafite"
                    : "rounded-lg px-2.5 py-0.5 text-cinza"
                }
              >
                <IconeAba nome={d.icone} />
              </span>
              <span
                className={
                  atual
                    ? "max-w-full truncate font-semibold text-grafite"
                    : "max-w-full truncate text-cinza"
                }
              >
                {d.nome}
              </span>
            </Link>
          );
        })}
      </nav>
      <Link href="/lancar" aria-label="Novo lançamento" className="casal-fab">
        +
      </Link>
    </>
  );
}
```

- [ ] **Step 4: Mover os ícones de aba para Icones.tsx**

Os quatro casos de `TabIcon` estão em `CasalApp.tsx:173-217`. Mova para `web/src/components/Icones.tsx` como `IconeAba`, com a mesma geometria, trocando `strokeWidth="1.8"` por `strokeWidth="var(--traco-icone)"`:

```tsx
export type NomeAba = "inicio" | "cartoes" | "metas" | "mais";

export function IconeAba({ nome }: { nome: NomeAba }) {
  const comum = { viewBox: "0 0 24 24", width: 22, height: 22, "aria-hidden": true } as const;
  switch (nome) {
    case "inicio":
      return (
        <svg {...comum} fill="none" stroke="currentColor" strokeWidth="var(--traco-icone)">
          <circle cx="12" cy="12" r="8.2" />
          <circle cx="12" cy="12" r="3.6" />
        </svg>
      );
    case "cartoes":
      return (
        <svg {...comum} fill="none" stroke="currentColor" strokeWidth="var(--traco-icone)">
          <rect x="2.5" y="5.5" width="19" height="13" rx="2.2" />
          <path d="M2.5 10h19" />
          <path d="M6 15.2h4" strokeLinecap="round" />
        </svg>
      );
    case "metas":
      return (
        <svg {...comum} fill="none" stroke="currentColor" strokeWidth="var(--traco-icone)">
          <circle cx="12" cy="12" r="8.2" />
          <circle cx="12" cy="12" r="4.6" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case "mais":
      return (
        <svg {...comum} fill="currentColor">
          <circle cx="5.5" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="18.5" cy="12" r="1.7" />
        </svg>
      );
  }
}
```

- [ ] **Step 5: Rodar e verificar que passa**

Run: `cd web && npm test -- Navegacao`
Expected: PASS, 4 testes.

- [ ] **Step 6: Criar a casca**

`web/src/app/(app)/layout.tsx`:

```tsx
import { Providers } from "@/components/Providers";
import { Navegacao } from "@/components/ui/Navegacao";

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="casal-shell">
        <div className="casal-phone">
          <div className="flex h-full min-h-0 flex-1 flex-col">
            <div className="casal-scroll">{children}</div>
            <Navegacao />
          </div>
        </div>
      </div>
    </Providers>
  );
}
```

- [ ] **Step 7: Enxugar o Providers**

`web/src/components/Providers.tsx` hoje decide qual tela mostrar — devolve `<Login />` quando falta sessão. Isso passa a ser redirecionamento de rota. Substitua o arquivo por:

```tsx
"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LojaProvider } from "@/lib/store";

function ComSessao({ children }: { children: ReactNode }) {
  const { pronto, precisaLogin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (pronto && precisaLogin) router.replace("/entrar");
  }, [pronto, precisaLogin, router]);

  if (!pronto || precisaLogin) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-cinza">
        Carregando…
      </div>
    );
  }
  return <LojaProvider>{children}</LojaProvider>;
}

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, []);
  return (
    <AuthProvider>
      <ComSessao>{children}</ComSessao>
    </AuthProvider>
  );
}
```

- [ ] **Step 8: Criar as duas primeiras rotas e o redirecionamento**

`web/src/app/(app)/mes/page.tsx` — por ora reaproveita o corpo atual, para não mudar nada visível. A migração real é a tarefa 12:

```tsx
"use client";

import { CasalApp } from "@/components/CasalApp";

export default function PaginaMes() {
  return <CasalApp aba="inicio" />;
}
```

`web/src/app/(app)/metas/page.tsx`:

```tsx
"use client";

import { CasalApp } from "@/components/CasalApp";

export default function PaginaMetas() {
  return <CasalApp aba="metas" />;
}
```

`web/src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function Raiz() {
  redirect("/mes");
}
```

Em `CasalApp.tsx`, aceite a aba por propriedade em vez de estado, e deixe de renderizar a barra e a moldura — a casca faz isso agora. Troque a assinatura `export function CasalApp()` por `export function CasalApp({ aba }: { aba: Aba })`, remova o `useState<Aba>` e remova o `<Phone>`, a `<nav className="casal-tabbar">` e o botão `casal-fab` do retorno. O empilhamento por `useState<Tela>` continua por enquanto: as tarefas 13 a 16 o desmontam rota por rota.

- [ ] **Step 9: Verificar o comportamento**

Run: `cd web && npm run build && npm run dev`

Confira, um por um:
- `http://localhost:3000` redireciona para `/mes`
- `/metas` abre a tela reservada
- clicar em Cartões nas abas navega e o botão voltar do navegador **volta uma tela** em vez de sair
- recarregar em `/metas` mantém o lugar
- sem sessão, qualquer rota de aplicativo manda para `/entrar` (que ainda não existe — erro 404 aqui é esperado e a tarefa 16 resolve)

- [ ] **Step 10: Commit**

```bash
git add web/src/app web/src/components/Providers.tsx \
  web/src/components/Icones.tsx web/src/components/ui/Navegacao.tsx \
  web/src/components/ui/Navegacao.test.tsx web/src/components/CasalApp.tsx
git commit -m "feat(web): casca com rotas e navegacao por URL"
```

---

### Task 8: Rótulo e número

Dois primitivos que a spec trata como regra, não como estilo: rótulo de seção é etiqueta, e **todo número** vive em monoespaçada tabular.

**Files:**
- Create: `web/src/components/ui/Rotulo.tsx`
- Create: `web/src/components/ui/Numero.tsx`
- Test: `web/src/components/ui/Numero.test.tsx`

**Interfaces:**
- Consumes: tokens da tarefa 2; `formatarBRL` de `@/lib/money`.
- Produces:
  - `<Rotulo>texto</Rotulo>` — 10px, caixa alta, `0.2em`, cor `cinza`.
  - `<Numero centavos={n} tamanho="heroi" | "secao" | "corpo" | "legenda" tom?="normal" | "atencao" subordinaCentavos?={boolean} />` — único formatador de dinheiro da interface. `subordinaCentavos` separa os centavos em 47% do tamanho e opacidade 0,42, conforme a seção 9 da spec.

- [ ] **Step 1: Escrever o teste**

`web/src/components/ui/Numero.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Numero } from "./Numero";

describe("Numero", () => {
  it("formata em real brasileiro", () => {
    render(<Numero centavos={428310} tamanho="corpo" />);
    expect(screen.getByText("R$ 4.283,10")).toBeInTheDocument();
  });

  it("usa monoespaçada tabular sempre", () => {
    const { container } = render(<Numero centavos={100} tamanho="corpo" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("font-numero");
    expect(el.className).toContain("tabular-nums");
  });

  it("subordina os centavos quando pedido, sem perdê-los do texto", () => {
    const { container } = render(
      <Numero centavos={124000} tamanho="heroi" subordinaCentavos />,
    );
    expect(container.textContent).toBe("R$ 1.240,00");
    const centavos = screen.getByText(",00");
    expect(centavos).toBeInTheDocument();
  });

  it("mantém o número inteiro num só nó quando não subordina", () => {
    const { container } = render(<Numero centavos={124000} tamanho="heroi" />);
    expect(container.textContent).toBe("R$ 1.240,00");
    expect(container.querySelectorAll("span").length).toBe(1);
  });

  it("usa ambar-texto no tom de atenção, nunca o ambar de preenchimento", () => {
    const { container } = render(
      <Numero centavos={210600} tamanho="corpo" tom="atencao" />,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("text-ambar-texto");
    expect(el.className).not.toContain("text-ambar ");
  });

  it("preserva o sinal de negativo", () => {
    render(<Numero centavos={-1800} tamanho="corpo" />);
    expect(screen.getByText("−R$ 18,00")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `cd web && npm test -- Numero`
Expected: FAIL — `Failed to resolve import "./Numero"`.

- [ ] **Step 3: Implementar**

`web/src/components/ui/Rotulo.tsx`:

```tsx
/** Etiqueta de seção. Não é título: não entra na hierarquia de cabeçalhos. */
export function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-texto text-[10px] font-semibold uppercase tracking-[0.2em] text-cinza">
      {children}
    </div>
  );
}
```

`web/src/components/ui/Numero.tsx`:

```tsx
import { formatarBRL } from "@/lib/money";

const TAMANHO = {
  heroi: "text-[36px] tracking-[-0.03em]",
  secao: "text-[24px] tracking-[-0.03em]",
  corpo: "text-[14px]",
  legenda: "text-[12px]",
} as const;

const TOM = {
  normal: "text-grafite",
  atencao: "text-ambar-texto",
} as const;

/**
 * Único formatador de dinheiro da interface.
 *
 * Monoespaçada tabular não é estética: é o motivo pelo qual o valor não
 * dança quando o dígito muda e pelo qual coluna de dinheiro alinha.
 */
export function Numero({
  centavos,
  tamanho,
  tom = "normal",
  subordinaCentavos = false,
}: {
  centavos: number;
  tamanho: keyof typeof TAMANHO;
  tom?: keyof typeof TOM;
  subordinaCentavos?: boolean;
}) {
  const classe = `font-numero font-medium tabular-nums ${TAMANHO[tamanho]} ${TOM[tom]}`;
  const texto = formatarBRL(centavos);

  if (!subordinaCentavos) {
    return <span className={classe}>{texto}</span>;
  }

  const corte = texto.lastIndexOf(",");
  const inteiro = texto.slice(0, corte);
  const resto = texto.slice(corte);

  return (
    <span className={classe}>
      {inteiro}
      <span className="text-[47%] opacity-[0.42]">{resto}</span>
    </span>
  );
}
```

- [ ] **Step 4: Rodar e verificar que passa**

Run: `cd web && npm test -- Numero`
Expected: PASS, 6 testes.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/ui/Rotulo.tsx web/src/components/ui/Numero.tsx \
  web/src/components/ui/Numero.test.tsx
git commit -m "feat(ui): rotulo de secao e numero em monoespacada tabular"
```

---

### Task 9: Cabeçalho, linha de lista, trilha e etiqueta

Substituem, respectivamente: o `Cabecalho` de posicionamento absoluto de `CasalApp.tsx:230`, as seis variantes de linha espalhadas pelo arquivo, o card herói com gradiente, e as etiquetas de categoria de `CasalApp.tsx:696`.

**Files:**
- Create: `web/src/components/ui/Cabecalho.tsx`
- Create: `web/src/components/ui/LinhaLista.tsx`
- Create: `web/src/components/ui/Trilha.tsx`
- Create: `web/src/components/ui/Etiqueta.tsx`
- Test: `web/src/components/ui/Trilha.test.tsx`
- Test: `web/src/components/ui/LinhaLista.test.tsx`

**Interfaces:**
- Consumes: `Numero` da tarefa 8; `Marca` da tarefa 4; tokens da tarefa 2.
- Produces:
  - `<Cabecalho titulo="…" voltarPara?="/rota" acao?={ReactNode} marca?={boolean} />` — o voltar é um `Link`, não um `onClick`, para o histórico do navegador funcionar.
  - `<LinhaLista icone?={ReactNode} titulo="…" subtitulo?="…" valor?={number} tom?="normal" | "atencao" href?="…" aoClicar?={fn} />`
  - `<Trilha consumido={n} total={n} />` — 3px, dois segmentos, sem raio.
  - `<Etiqueta ativa={boolean} aoClicar={fn}>…</Etiqueta>`

- [ ] **Step 1: Escrever os testes**

`web/src/components/ui/Trilha.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Trilha } from "./Trilha";

function proporcoes(container: HTMLElement): number[] {
  return [...container.querySelectorAll("div > div")].map((d) =>
    Number((d as HTMLElement).style.flexGrow),
  );
}

describe("Trilha", () => {
  it("divide os dois segmentos na proporção do consumo", () => {
    const { container } = render(<Trilha consumido={1240} total={3400} />);
    expect(proporcoes(container)).toEqual([1240, 2160]);
  });

  it("não deixa o segmento restante ficar negativo no estouro", () => {
    const { container } = render(<Trilha consumido={4000} total={3400} />);
    expect(proporcoes(container)).toEqual([3400, 0]);
  });

  it("trata total zero sem dividir por zero", () => {
    const { container } = render(<Trilha consumido={0} total={0} />);
    expect(proporcoes(container)).toEqual([0, 1]);
  });

  it("é decorativa para leitor de tela: o número ao lado já informa", () => {
    const { container } = render(<Trilha consumido={1} total={2} />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});
```

`web/src/components/ui/LinhaLista.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LinhaLista } from "./LinhaLista";

describe("LinhaLista", () => {
  it("mostra título, subtítulo e valor formatado", () => {
    render(<LinhaLista titulo="Mercado" subtitulo="hoje" valor={21490} />);
    expect(screen.getByText("Mercado")).toBeInTheDocument();
    expect(screen.getByText("hoje")).toBeInTheDocument();
    expect(screen.getByText("R$ 214,90")).toBeInTheDocument();
  });

  it("vira link quando recebe destino", () => {
    render(<LinhaLista titulo="Nubank" href="/cartoes/1" />);
    expect(screen.getByRole("link", { name: /Nubank/ })).toHaveAttribute(
      "href",
      "/cartoes/1",
    );
  });

  it("vira botão quando recebe ação", async () => {
    const aoClicar = vi.fn();
    render(<LinhaLista titulo="Contas" aoClicar={aoClicar} />);
    await userEvent.click(screen.getByRole("button", { name: /Contas/ }));
    expect(aoClicar).toHaveBeenCalledOnce();
  });

  it("é elemento inerte quando não recebe nem destino nem ação", () => {
    render(<LinhaLista titulo="Padaria" valor={1800} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("respeita o alvo mínimo de toque", () => {
    const { container } = render(<LinhaLista titulo="Mercado" aoClicar={() => {}} />);
    const el = container.querySelector("button") as HTMLElement;
    expect(el.className).toContain("min-h-[44px]");
  });
});
```

- [ ] **Step 2: Rodar e verificar que falham**

Run: `cd web && npm test -- Trilha LinhaLista`
Expected: FAIL nos dois arquivos, por importação não resolvida.

- [ ] **Step 3: Implementar Trilha**

`web/src/components/ui/Trilha.tsx`:

```tsx
/**
 * Trilha de 3px, dois segmentos, sem raio. Substitui o card herói:
 * mesma informação, um trigésimo do peso visual.
 */
export function Trilha({
  consumido,
  total,
}: {
  consumido: number;
  total: number;
}) {
  const usado = total > 0 ? Math.min(consumido, total) : 0;
  const resta = total > 0 ? total - usado : 1;
  return (
    <div aria-hidden="true" className="flex h-[3px] gap-[2px]">
      <div className="bg-grafite" style={{ flexGrow: usado }} />
      <div className="bg-nevoa" style={{ flexGrow: resta }} />
    </div>
  );
}
```

- [ ] **Step 4: Implementar LinhaLista**

`web/src/components/ui/LinhaLista.tsx`:

```tsx
import Link from "next/link";
import { Numero } from "./Numero";

function Conteudo({
  icone,
  titulo,
  subtitulo,
  valor,
  tom,
}: {
  icone?: React.ReactNode;
  titulo: string;
  subtitulo?: string;
  valor?: number;
  tom: "normal" | "atencao";
}) {
  return (
    <>
      {icone && <span className="shrink-0 text-cinza">{icone}</span>}
      <span className="min-w-0 flex-1 text-left">
        <span
          className={`block truncate text-[14px] ${
            tom === "atencao" ? "text-ambar-texto" : "text-grafite"
          }`}
        >
          {titulo}
        </span>
        {subtitulo && (
          <span className="block truncate text-[12px] text-cinza">{subtitulo}</span>
        )}
      </span>
      {valor !== undefined && <Numero centavos={valor} tamanho="corpo" tom={tom} />}
    </>
  );
}

/** Uma linha de lista. Substitui as seis variantes espalhadas hoje. */
export function LinhaLista({
  icone,
  titulo,
  subtitulo,
  valor,
  tom = "normal",
  href,
  aoClicar,
}: {
  icone?: React.ReactNode;
  titulo: string;
  subtitulo?: string;
  valor?: number;
  tom?: "normal" | "atencao";
  href?: string;
  aoClicar?: () => void;
}) {
  const classe =
    "flex min-h-[44px] w-full items-center gap-3 border-b border-nevoa py-3 text-left";
  const filhos = (
    <Conteudo
      icone={icone}
      titulo={titulo}
      subtitulo={subtitulo}
      valor={valor}
      tom={tom}
    />
  );

  if (href) {
    return (
      <Link href={href} className={classe}>
        {filhos}
      </Link>
    );
  }
  if (aoClicar) {
    return (
      <button type="button" onClick={aoClicar} className={classe}>
        {filhos}
      </button>
    );
  }
  return <div className={classe}>{filhos}</div>;
}
```

- [ ] **Step 5: Implementar Cabecalho e Etiqueta**

`web/src/components/ui/Cabecalho.tsx`. O voltar é `Link`, não `onClick`: é o que faz o histórico do navegador funcionar:

```tsx
import Link from "next/link";
import { Marca } from "../marca/Marca";
import { IconeVoltar } from "../Icones";

export function Cabecalho({
  titulo,
  voltarPara,
  acao,
  marca = false,
  folga,
}: {
  titulo: string;
  voltarPara?: string;
  acao?: React.ReactNode;
  marca?: boolean;
  folga?: number;
}) {
  return (
    <div className="flex min-h-[44px] items-center gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))]">
      {voltarPara && (
        <Link
          href={voltarPara}
          aria-label="Voltar"
          className="flex min-h-[44px] min-w-[44px] items-center text-grafite"
        >
          <IconeVoltar size={20} />
        </Link>
      )}
      <h1 className="min-w-0 flex-1 truncate font-texto text-[17px] font-semibold tracking-[-0.02em] text-grafite">
        {titulo}
      </h1>
      {marca && <Marca tamanho={26} folga={folga} />}
      {acao}
    </div>
  );
}
```

`web/src/components/ui/Etiqueta.tsx`:

```tsx
export function Etiqueta({
  ativa,
  aoClicar,
  children,
}: {
  ativa: boolean;
  aoClicar: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-pressed={ativa}
      className={`flex min-h-[44px] items-center gap-1.5 rounded-etiqueta px-3 text-[12px] ${
        ativa
          ? "bg-grafite text-ar"
          : "border border-nevoa text-grafite"
      }`}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 6: Rodar e verificar que passam**

Run: `cd web && npm test -- Trilha LinhaLista && npx tsc --noEmit`
Expected: PASS, 9 testes; sem erro de tipo.

- [ ] **Step 7: Commit**

```bash
git add web/src/components/ui
git commit -m "feat(ui): cabecalho, linha de lista, trilha e etiqueta"
```

---

### Task 10: Botão, campo, vazio e aviso

`Aviso` cobre um defeito real: hoje falha ao salvar cartão, conta ou lançamento não avisa ninguém.

**Files:**
- Create: `web/src/components/ui/Botao.tsx`
- Create: `web/src/components/ui/Campo.tsx`
- Create: `web/src/components/ui/Vazio.tsx`
- Create: `web/src/components/ui/Aviso.tsx`
- Test: `web/src/components/ui/Aviso.test.tsx`
- Test: `web/src/components/ui/Campo.test.tsx`
- Modify: `web/src/app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `Marca` da tarefa 4; `Rotulo` da tarefa 8.
- Produces:
  - `<Botao variante="primario" | "secundario" | "destrutivo" onClick={fn} disabled?={b} type?={"button" | "submit"}>…</Botao>`
  - `<Campo label="…" value="…" onChange={fn} erro?="…" placeholder?="…" inputMode?={…} tipo?={"texto" | "senha"} />` — o erro é ligado ao campo por `aria-describedby` e o campo ganha `aria-invalid`. `tipo="senha"` rende `type="password"` com o `autoComplete` correspondente, sem o que o gerenciador de senhas do navegador não reconhece o formulário de entrada.
  - `<Vazio frase="…" acao?={ReactNode} />`
  - `<ProvedorAviso>` e `useAviso(): { avisar: (tipo: "erro" | "ok", texto: string) => void }` — a mensagem vive numa região `role="status"` `aria-live="polite"`.

- [ ] **Step 1: Escrever os testes**

`web/src/components/ui/Aviso.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProvedorAviso, useAviso } from "./Aviso";

function Gatilho() {
  const { avisar } = useAviso();
  return (
    <>
      <button type="button" onClick={() => avisar("erro", "Não deu para salvar.")}>
        falhar
      </button>
      <button type="button" onClick={() => avisar("ok", "Fatura paga.")}>
        confirmar
      </button>
    </>
  );
}

describe("Aviso", () => {
  it("não mostra nada antes de haver aviso", () => {
    render(
      <ProvedorAviso>
        <Gatilho />
      </ProvedorAviso>,
    );
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("anuncia o erro numa região viva, para leitor de tela", async () => {
    render(
      <ProvedorAviso>
        <Gatilho />
      </ProvedorAviso>,
    );
    await userEvent.click(screen.getByRole("button", { name: "falhar" }));
    const regiao = screen.getByRole("status");
    expect(regiao).toHaveAttribute("aria-live", "polite");
    expect(regiao).toHaveTextContent("Não deu para salvar.");
  });

  it("pode ser dispensado", async () => {
    render(
      <ProvedorAviso>
        <Gatilho />
      </ProvedorAviso>,
    );
    await userEvent.click(screen.getByRole("button", { name: "falhar" }));
    await userEvent.click(screen.getByRole("button", { name: "Fechar aviso" }));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("substitui o aviso anterior em vez de empilhar", async () => {
    render(
      <ProvedorAviso>
        <Gatilho />
      </ProvedorAviso>,
    );
    await userEvent.click(screen.getByRole("button", { name: "falhar" }));
    await userEvent.click(screen.getByRole("button", { name: "confirmar" }));
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Fatura paga.");
  });
});
```

`web/src/components/ui/Campo.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Campo } from "./Campo";

describe("Campo", () => {
  it("associa o rótulo ao controle", () => {
    render(<Campo label="Apelido" value="" onChange={() => {}} />);
    expect(screen.getByLabelText("Apelido")).toBeInTheDocument();
  });

  it("relata cada tecla digitada", async () => {
    const onChange = vi.fn();
    render(<Campo label="Banco" value="" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Banco"), "Nu");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("liga o erro ao campo e marca como inválido", () => {
    render(
      <Campo label="Banco" value="" onChange={() => {}} erro="Preencha o banco." />,
    );
    const entrada = screen.getByLabelText("Banco");
    expect(entrada).toHaveAttribute("aria-invalid", "true");
    expect(entrada).toHaveAccessibleDescription("Preencha o banco.");
  });

  it("não marca como inválido quando não há erro", () => {
    render(<Campo label="Banco" value="Nubank" onChange={() => {}} />);
    expect(screen.getByLabelText("Banco")).not.toHaveAttribute("aria-invalid");
  });
});
```

- [ ] **Step 2: Rodar e verificar que falham**

Run: `cd web && npm test -- Aviso Campo`
Expected: FAIL nos dois, por importação não resolvida.

- [ ] **Step 3: Implementar Aviso**

`web/src/components/ui/Aviso.tsx`:

```tsx
"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Tipo = "erro" | "ok";
type Estado = { tipo: Tipo; texto: string } | null;

const Ctx = createContext<{ avisar: (tipo: Tipo, texto: string) => void } | null>(null);

export function useAviso() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAviso fora do provedor");
  return v;
}

export function ProvedorAviso({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>(null);
  const avisar = useCallback((tipo: Tipo, texto: string) => {
    setEstado({ tipo, texto });
  }, []);

  return (
    <Ctx.Provider value={{ avisar }}>
      {estado && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 border-b border-nevoa px-4 py-3 text-[12px]"
        >
          <span className={estado.tipo === "erro" ? "text-ambar-texto" : "text-grafite"}>
            {estado.texto}
          </span>
          <button
            type="button"
            aria-label="Fechar aviso"
            onClick={() => setEstado(null)}
            className="ml-auto min-h-[44px] min-w-[44px] text-cinza"
          >
            ×
          </button>
        </div>
      )}
      {children}
    </Ctx.Provider>
  );
}
```

- [ ] **Step 4: Implementar Botao, Campo e Vazio**

`web/src/components/ui/Botao.tsx`:

```tsx
const VARIANTE = {
  primario: "bg-grafite text-ar",
  secundario: "border border-nevoa text-grafite",
  destrutivo: "text-ambar-texto",
} as const;

export function Botao({
  variante,
  onClick,
  disabled,
  type = "button",
  children,
}: {
  variante: keyof typeof VARIANTE;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  children: React.ReactNode;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-[44px] w-full items-center justify-center rounded-controle px-4 font-texto text-[14px] font-semibold disabled:opacity-40 ${VARIANTE[variante]}`}
    >
      {children}
    </button>
  );
}
```

`web/src/components/ui/Campo.tsx`. `outline-none` não aparece aqui, e não deve aparecer:

```tsx
import { useId } from "react";

export function Campo({
  label,
  value,
  onChange,
  erro,
  placeholder,
  inputMode,
  tipo = "texto",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  erro?: string;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "email";
  tipo?: "texto" | "senha";
  autoComplete?: string;
}) {
  const id = useId();
  const idErro = `${id}-erro`;
  return (
    <div className="mt-3">
      <label htmlFor={id} className="block text-[12px] text-cinza">
        {label}
      </label>
      <input
        id={id}
        type={tipo === "senha" ? "password" : "text"}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete ?? (tipo === "senha" ? "current-password" : undefined)}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : undefined}
        className="mt-1 min-h-[44px] w-full rounded-controle border border-nevoa bg-ar px-3 font-texto text-[16px] text-grafite"
      />
      {erro && (
        <p id={idErro} className="mt-1 text-[12px] text-ambar-texto">
          {erro}
        </p>
      )}
    </div>
  );
}
```

`web/src/components/ui/Vazio.tsx`:

```tsx
import { Marca } from "../marca/Marca";

export function Vazio({
  frase,
  acao,
}: {
  frase: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
      <Marca tamanho={48} />
      <p className="max-w-[280px] text-[14px] text-cinza">{frase}</p>
      {acao}
    </div>
  );
}
```

- [ ] **Step 5: Ligar o provedor à casca**

Em `web/src/app/(app)/layout.tsx`, envolver o conteúdo com `ProvedorAviso`, entre `Providers` e a casca:

```tsx
import { Providers } from "@/components/Providers";
import { ProvedorAviso } from "@/components/ui/Aviso";
import { Navegacao } from "@/components/ui/Navegacao";

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <ProvedorAviso>
        <div className="casal-shell">
          <div className="casal-phone">
            <div className="flex h-full min-h-0 flex-1 flex-col">
              <div className="casal-scroll">{children}</div>
              <Navegacao />
            </div>
          </div>
        </div>
      </ProvedorAviso>
    </Providers>
  );
}
```

- [ ] **Step 6: Rodar e verificar que passam**

Run: `cd web && npm test && npx tsc --noEmit`
Expected: PASS em tudo; sem erro de tipo.

- [ ] **Step 7: Commit**

```bash
git add web/src/components/ui web/src/app/(app)/layout.tsx
git commit -m "feat(ui): botao, campo, vazio e aviso com regiao viva"
```

---

### Task 11: Teclado com teclado físico

Hoje o teclado numérico só responde a clique. No notebook, lançar um gasto exige clicar dígito por dígito — a aplicação é web e não aceita o teclado do computador.

**Files:**
- Create: `web/src/components/ui/Teclado.tsx`
- Test: `web/src/components/ui/Teclado.test.tsx`
- Delete: `web/src/components/Teclado.tsx` (ao fim da tarefa 14)

**Interfaces:**
- Consumes: tokens da tarefa 2; `IconeApagar` e `IconeMaisOpcoes` de `@/components/Icones`.
- Produces: `<Teclado aoDigitar={(d: number) => void} aoApagar={() => void} aoSalvar?={() => void} aoFechar?={() => void} aoMaisOpcoes?={() => void} podeSalvar?={boolean} mostraSalvar?={boolean} />`. Escuta no documento: dígitos `0`–`9`, `Backspace`, `Enter` (salva, se `podeSalvar`), `Escape` (fecha).

- [ ] **Step 1: Escrever o teste**

`web/src/components/ui/Teclado.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Teclado } from "./Teclado";

describe("Teclado — ponteiro", () => {
  it("relata o dígito tocado", async () => {
    const aoDigitar = vi.fn();
    render(<Teclado aoDigitar={aoDigitar} aoApagar={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "7" }));
    expect(aoDigitar).toHaveBeenCalledWith(7);
  });

  it("apaga pelo botão", async () => {
    const aoApagar = vi.fn();
    render(<Teclado aoDigitar={() => {}} aoApagar={aoApagar} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Apagar último dígito" }),
    );
    expect(aoApagar).toHaveBeenCalledOnce();
  });

  it("respeita o alvo mínimo em cada tecla", () => {
    render(<Teclado aoDigitar={() => {}} aoApagar={() => {}} />);
    for (const n of ["0", "5", "9"]) {
      expect(screen.getByRole("button", { name: n }).className).toContain(
        "min-h-[44px]",
      );
    }
  });
});

describe("Teclado — teclado físico", () => {
  it("aceita dígito digitado", async () => {
    const aoDigitar = vi.fn();
    render(<Teclado aoDigitar={aoDigitar} aoApagar={() => {}} />);
    await userEvent.keyboard("4");
    expect(aoDigitar).toHaveBeenCalledWith(4);
  });

  it("aceita Backspace", async () => {
    const aoApagar = vi.fn();
    render(<Teclado aoDigitar={() => {}} aoApagar={aoApagar} />);
    await userEvent.keyboard("{Backspace}");
    expect(aoApagar).toHaveBeenCalledOnce();
  });

  it("salva com Enter quando pode salvar", async () => {
    const aoSalvar = vi.fn();
    render(
      <Teclado
        aoDigitar={() => {}}
        aoApagar={() => {}}
        aoSalvar={aoSalvar}
        podeSalvar
        mostraSalvar
      />,
    );
    await userEvent.keyboard("{Enter}");
    expect(aoSalvar).toHaveBeenCalledOnce();
  });

  it("não salva com Enter quando não pode salvar", async () => {
    const aoSalvar = vi.fn();
    render(
      <Teclado
        aoDigitar={() => {}}
        aoApagar={() => {}}
        aoSalvar={aoSalvar}
        podeSalvar={false}
        mostraSalvar
      />,
    );
    await userEvent.keyboard("{Enter}");
    expect(aoSalvar).not.toHaveBeenCalled();
  });

  it("fecha com Escape", async () => {
    const aoFechar = vi.fn();
    render(
      <Teclado aoDigitar={() => {}} aoApagar={() => {}} aoFechar={aoFechar} />,
    );
    await userEvent.keyboard("{Escape}");
    expect(aoFechar).toHaveBeenCalledOnce();
  });

  it("ignora letra", async () => {
    const aoDigitar = vi.fn();
    render(<Teclado aoDigitar={aoDigitar} aoApagar={() => {}} />);
    await userEvent.keyboard("k");
    expect(aoDigitar).not.toHaveBeenCalled();
  });

  it("não rouba o teclado de um campo de texto em foco", async () => {
    const aoDigitar = vi.fn();
    render(
      <>
        <input aria-label="descrição" />
        <Teclado aoDigitar={aoDigitar} aoApagar={() => {}} />
      </>,
    );
    await userEvent.click(screen.getByLabelText("descrição"));
    await userEvent.keyboard("5");
    expect(aoDigitar).not.toHaveBeenCalled();
    expect(screen.getByLabelText("descrição")).toHaveValue("5");
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `cd web && npm test -- Teclado`
Expected: FAIL — `Failed to resolve import "./Teclado"`.

- [ ] **Step 3: Implementar**

`web/src/components/ui/Teclado.tsx`. A última asserção do teste é o motivo do `emCampoDeTexto`: sem ela, digitar uma descrição alimentaria o valor:

```tsx
"use client";

import { useEffect } from "react";
import { IconeApagar, IconeMaisOpcoes } from "@/components/Icones";

function emCampoDeTexto(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false;
  const tag = alvo.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || alvo.isContentEditable;
}

export function Teclado({
  aoDigitar,
  aoApagar,
  aoSalvar,
  aoFechar,
  aoMaisOpcoes,
  podeSalvar = false,
  mostraSalvar = false,
}: {
  aoDigitar: (d: number) => void;
  aoApagar: () => void;
  aoSalvar?: () => void;
  aoFechar?: () => void;
  aoMaisOpcoes?: () => void;
  podeSalvar?: boolean;
  mostraSalvar?: boolean;
}) {
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (emCampoDeTexto(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        aoDigitar(Number(e.key));
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        aoApagar();
        return;
      }
      if (e.key === "Enter" && aoSalvar && podeSalvar) {
        e.preventDefault();
        aoSalvar();
        return;
      }
      if (e.key === "Escape" && aoFechar) {
        e.preventDefault();
        aoFechar();
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoDigitar, aoApagar, aoSalvar, aoFechar, podeSalvar]);

  return (
    <div className="px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))]">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={aoApagar}
          aria-label="Apagar último dígito"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-controle text-grafite"
        >
          <IconeApagar size={22} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <Tecla key={n} aoClicar={() => aoDigitar(n)}>
            {n}
          </Tecla>
        ))}
        {mostraSalvar && aoMaisOpcoes ? (
          <Tecla aoClicar={aoMaisOpcoes} rotulo="Mais opções">
            <IconeMaisOpcoes size={22} />
          </Tecla>
        ) : (
          <div />
        )}
        <Tecla aoClicar={() => aoDigitar(0)}>0</Tecla>
        {mostraSalvar ? (
          <button
            type="button"
            disabled={!podeSalvar}
            onClick={aoSalvar}
            className="min-h-[44px] rounded-controle bg-grafite font-texto text-[14px] font-semibold uppercase tracking-[0.1em] text-ar disabled:opacity-40"
          >
            Salvar
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}

function Tecla({
  children,
  aoClicar,
  rotulo,
}: {
  children: React.ReactNode;
  aoClicar: () => void;
  rotulo?: string;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-label={rotulo}
      className="flex min-h-[44px] items-center justify-center rounded-controle border border-nevoa font-numero text-[18px] tabular-nums text-grafite"
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Rodar e verificar que passa**

Run: `cd web && npm test -- Teclado`
Expected: PASS, 11 testes.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/ui/Teclado.tsx web/src/components/ui/Teclado.test.tsx
git commit -m "feat(ui): teclado numerico que aceita teclado fisico"
```

---
### Task 12: Tela do mês

Primeira tela migrada. Mata o card herói com gradiente de `CasalApp.tsx:276-283` e o título de 34px, e põe no lugar o número solto com a trilha de 3px e a marca no canto.

**Files:**
- Modify: `web/src/app/(app)/mes/page.tsx`
- Create: `web/src/components/telas/Mes.tsx`
- Test: `web/src/components/telas/Mes.test.tsx`
- Modify: `web/src/components/CasalApp.tsx` (remove `Inicio`)

**Interfaces:**
- Consumes: `useLoja` de `@/lib/store`; `Cabecalho`, `Rotulo`, `Numero`, `Trilha`, `LinhaLista`, `Vazio`; `faturaAtualOuRascunho`, `saldoDevedor`, `totalDaFatura` de `@/lib/store`; `CATEGORIAS` de `@/lib/domain`.
- Produces: `<Mes />`. Enquanto Metas não existe, `folga` fica `undefined` e a marca desenha o estado de folga larga; a trilha compara gasto contra gasto mais comprometido, que é o único total real disponível hoje.

- [ ] **Step 1: Escrever o teste**

`web/src/components/telas/Mes.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Mes } from "./Mes";

const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});

const CARTEIRA = { id: "c1", nome: "Nosso", cor: "#000", rotulo: "compartilhada", visibilidade: "aberta" };

function despesa(valor: number, descricao: string, categoriaID: string) {
  return {
    id: crypto.randomUUID(),
    carteiraID: "c1",
    tipo: "despesa",
    valor,
    data: new Date().toISOString(),
    categoriaID,
    descricao,
    hashDedup: "",
    parcelaN: 1,
    parcelaTotal: 1,
  };
}

describe("Mes", () => {
  it("soma só as despesas do mês corrente", () => {
    const mesPassado = new Date();
    mesPassado.setMonth(mesPassado.getMonth() - 1);
    loja.valor = {
      carteira: CARTEIRA,
      cartoes: [],
      faturas: [],
      transacoes: [
        despesa(21490, "Mercado", "00000000-0000-0000-0000-000000000001"),
        despesa(1800, "Padaria", "00000000-0000-0000-0000-000000000001"),
        { ...despesa(50000, "Antigo", "00000000-0000-0000-0000-000000000001"), data: mesPassado.toISOString() },
      ],
    };
    render(<Mes />);
    expect(screen.getByText("R$ 232,90")).toBeInTheDocument();
    expect(screen.queryByText("Antigo")).toBeNull();
  });

  it("lista os lançamentos do mês com a categoria", () => {
    loja.valor = {
      carteira: CARTEIRA,
      cartoes: [],
      faturas: [],
      transacoes: [despesa(21490, "Mercado", "00000000-0000-0000-0000-000000000001")],
    };
    render(<Mes />);
    expect(screen.getByText("Mercado")).toBeInTheDocument();
    expect(screen.getByText(/Mercado/)).toBeInTheDocument();
  });

  it("mostra o estado vazio quando não houve gasto", () => {
    loja.valor = { carteira: CARTEIRA, cartoes: [], faturas: [], transacoes: [] };
    render(<Mes />);
    expect(screen.getByText(/Nenhum gasto/)).toBeInTheDocument();
  });

  it("não usa gradiente em nenhuma superfície", () => {
    loja.valor = {
      carteira: CARTEIRA,
      cartoes: [],
      faturas: [],
      transacoes: [despesa(21490, "Mercado", "00000000-0000-0000-0000-000000000001")],
    };
    const { container } = render(<Mes />);
    expect(container.innerHTML).not.toContain("gradient");
  });

  it("não deixa cor literal no marcador", () => {
    loja.valor = {
      carteira: CARTEIRA,
      cartoes: [],
      faturas: [],
      transacoes: [despesa(21490, "Mercado", "00000000-0000-0000-0000-000000000001")],
    };
    const { container } = render(<Mes />);
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `cd web && npm test -- Mes`
Expected: FAIL — `Failed to resolve import "./Mes"`.

- [ ] **Step 3: Implementar**

`web/src/components/telas/Mes.tsx`:

```tsx
"use client";

import { CATEGORIAS } from "@/lib/domain";
import {
  faturaAtualOuRascunho,
  saldoDevedor,
  totalDaFatura,
  useLoja,
} from "@/lib/store";
import { Cabecalho } from "../ui/Cabecalho";
import { LinhaLista } from "../ui/LinhaLista";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { Trilha } from "../ui/Trilha";
import { Vazio } from "../ui/Vazio";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function Mes() {
  const { transacoes, cartoes, faturas, carteira } = useLoja();
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);

  const doMes = transacoes.filter((t) => {
    const d = new Date(t.data);
    return t.tipo === "despesa" && d >= inicio && d < fim;
  });
  const gasto = doMes.reduce((s, t) => s + t.valor, 0);
  const comprometido = cartoes.reduce((s, cartao) => {
    const f = faturaAtualOuRascunho(cartao, faturas, agora);
    return s + saldoDevedor(f, totalDaFatura(f, transacoes, cartao));
  }, 0);

  return (
    <div>
      <Cabecalho titulo={`${MESES[agora.getMonth()]} · ${carteira.nome}`} marca />
      <div className="px-4 pt-8">
        <Rotulo>gasto neste mês</Rotulo>
        <div className="mt-2">
          <Numero centavos={gasto} tamanho="heroi" subordinaCentavos />
        </div>
        <div className="mt-5">
          <Trilha consumido={gasto} total={gasto + comprometido} />
        </div>
        <p className="mt-2 font-numero text-[12px] tabular-nums text-cinza">
          {comprometido > 0
            ? `${doMes.length} lançamentos · faturas somam mais`
            : `${doMes.length} lançamentos`}
        </p>
        {comprometido > 0 && (
          <div className="mt-1">
            <span className="text-[12px] text-cinza">comprometido em faturas </span>
            <Numero centavos={comprometido} tamanho="legenda" tom="atencao" />
          </div>
        )}
      </div>

      {doMes.length === 0 ? (
        <Vazio frase="Nenhum gasto este mês. Toque em + para registrar o primeiro." />
      ) : (
        <div className="mt-8 px-4">
          <Rotulo>hoje</Rotulo>
          <div className="mt-2">
            {doMes
              .slice()
              .reverse()
              .map((t) => {
                const cat = CATEGORIAS.find((c) => c.id === t.categoriaID);
                return (
                  <LinhaLista
                    key={t.id}
                    titulo={t.descricao || cat?.nome || "Sem descrição"}
                    subtitulo={cat?.nome ?? "Sem categoria"}
                    valor={t.valor}
                  />
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
```

O marcador quadrado colorido por categoria de `CasalApp.tsx:304-309` não volta: a spec proíbe cor por categoria em área grande, e a categoria já aparece como subtítulo.

- [ ] **Step 4: Ligar à rota**

`web/src/app/(app)/mes/page.tsx`:

```tsx
import { Mes } from "@/components/telas/Mes";

export default function PaginaMes() {
  return <Mes />;
}
```

- [ ] **Step 5: Remover a tela antiga**

Em `web/src/components/CasalApp.tsx`, apague a função `Inicio` inteira (`CasalApp.tsx:257-323`) e a linha `{aba === "inicio" && <Inicio />}` do retorno. Se `IconeVazio` e `IconeCategoria` ficarem sem uso, deixe as importações apenas se outras telas do arquivo ainda as usarem.

- [ ] **Step 6: Rodar e verificar**

Run: `cd web && npm test && npx tsc --noEmit && npm run build`
Expected: PASS, sem erro de tipo, build limpo. Em `npm run dev`, `/mes` mostra o número solto com trilha e a marca no canto; `/cartoes` continua igual ao de antes.

- [ ] **Step 7: Commit**

```bash
git add web/src/components/telas web/src/app/(app)/mes web/src/components/CasalApp.tsx
git commit -m "feat(web): tela do mes em rota propria, sem card com gradiente"
```

---

### Task 13: Telas de cartões

Cinco rotas de uma vez, porque compartilham o mesmo dado e separá-las deixaria estados intermediários sem como voltar. Mata `CartaoFace` — a imitação de plástico é o clichê mais surrado da categoria.

**Files:**
- Create: `web/src/components/telas/Cartoes.tsx`
- Create: `web/src/components/telas/CartaoForm.tsx`
- Create: `web/src/components/telas/CartaoDetalhe.tsx`
- Create: `web/src/components/telas/PagarFatura.tsx`
- Create: `web/src/components/ui/Curva.tsx`
- Create: `web/src/app/(app)/cartoes/page.tsx`
- Create: `web/src/app/(app)/cartoes/novo/page.tsx`
- Create: `web/src/app/(app)/cartoes/[id]/page.tsx`
- Create: `web/src/app/(app)/cartoes/[id]/editar/page.tsx`
- Create: `web/src/app/(app)/cartoes/[id]/faturas/[competencia]/pagar/page.tsx`
- Test: `web/src/components/telas/Cartoes.test.tsx`
- Test: `web/src/components/ui/Curva.test.tsx`
- Modify: `web/src/components/CasalApp.tsx`
- Delete: `web/src/components/CartaoFace.tsx`

**Interfaces:**
- Consumes: tudo da tarefa 9 e 10; `Teclado` da tarefa 11; `useAviso` da tarefa 10; `competenciaDe`, `competenciaDaCompra`, `horizonte`, `rotuloCurto`, `CORES_CARTAO`, `ROTULO_BANDEIRA`, `ROTULO_TIPO_CONTA` de `@/lib/domain`.
- Produces:
  - `<Curva pontos={{ rotulo: string; total: number }[]} />` — barras da curva de faturas, sem gradiente.
  - `competenciaDaRota(s: string): { ano: number; mes: number }` exportada de `@/lib/domain`, que lê o segmento `AAAA-MM` da URL de pagamento.

- [ ] **Step 1: Escrever o teste da curva**

`web/src/components/ui/Curva.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Curva } from "./Curva";

const PONTOS = [
  { rotulo: "set", total: 340000 },
  { rotulo: "out", total: 170000 },
  { rotulo: "nov", total: 0 },
];

describe("Curva", () => {
  it("mostra o rótulo de cada mês", () => {
    render(<Curva pontos={PONTOS} />);
    for (const r of ["set", "out", "nov"]) {
      expect(screen.getByText(r)).toBeInTheDocument();
    }
  });

  it("dimensiona as barras contra o maior valor", () => {
    const { container } = render(<Curva pontos={PONTOS} />);
    const alturas = [...container.querySelectorAll("[data-barra]")].map(
      (b) => (b as HTMLElement).style.height,
    );
    expect(alturas[0]).toBe("100%");
    expect(alturas[1]).toBe("50%");
  });

  it("dá altura mínima visível ao mês sem fatura", () => {
    const { container } = render(<Curva pontos={PONTOS} />);
    const alturas = [...container.querySelectorAll("[data-barra]")].map(
      (b) => (b as HTMLElement).style.height,
    );
    expect(alturas[2]).toBe("2px");
  });

  it("não usa gradiente", () => {
    const { container } = render(<Curva pontos={PONTOS} />);
    expect(container.innerHTML).not.toContain("gradient");
  });

  it("aguenta todos os meses zerados sem dividir por zero", () => {
    const { container } = render(
      <Curva pontos={[{ rotulo: "set", total: 0 }, { rotulo: "out", total: 0 }]} />,
    );
    const alturas = [...container.querySelectorAll("[data-barra]")].map(
      (b) => (b as HTMLElement).style.height,
    );
    expect(alturas).toEqual(["2px", "2px"]);
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `cd web && npm test -- Curva`
Expected: FAIL — importação não resolvida.

- [ ] **Step 3: Implementar a curva**

`web/src/components/ui/Curva.tsx`:

```tsx
export function Curva({
  pontos,
}: {
  pontos: { rotulo: string; total: number }[];
}) {
  const maior = Math.max(...pontos.map((p) => p.total), 0);
  return (
    <div className="flex h-[56px] items-end gap-1.5">
      {pontos.map((p, i) => (
        <div key={`${p.rotulo}-${i}`} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end">
            <div
              data-barra
              className="w-full bg-grafite"
              style={{ height: maior > 0 && p.total > 0 ? `${(p.total / maior) * 100}%` : "2px" }}
            />
          </div>
          <span className="font-numero text-[10px] tabular-nums text-cinza">
            {p.rotulo}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Rodar e verificar que passa**

Run: `cd web && npm test -- Curva`
Expected: PASS, 5 testes.

- [ ] **Step 5: Escrever o teste da leitura de competência na URL**

Acrescente ao fim de `web/src/lib/money.test.ts` não — crie `web/src/lib/domain.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { competenciaDaRota, rotuloDaCompetencia } from "./domain";

describe("competenciaDaRota", () => {
  it("lê ano e mês do segmento AAAA-MM", () => {
    expect(competenciaDaRota("2026-09")).toEqual({ ano: 2026, mes: 9 });
  });

  it("aceita mês de um dígito com zero à esquerda", () => {
    expect(competenciaDaRota("2027-01")).toEqual({ ano: 2027, mes: 1 });
  });

  it("recusa formato inválido", () => {
    expect(() => competenciaDaRota("setembro")).toThrow();
    expect(() => competenciaDaRota("2026-13")).toThrow();
    expect(() => competenciaDaRota("2026-00")).toThrow();
  });
});

describe("rotuloDaCompetencia", () => {
  it("devolve o segmento de rota a partir da competência", () => {
    expect(rotuloDaCompetencia({ ano: 2026, mes: 9 })).toBe("2026-09");
    expect(rotuloDaCompetencia({ ano: 2026, mes: 12 })).toBe("2026-12");
  });
});
```

- [ ] **Step 6: Rodar, verificar que falha, implementar**

Run: `cd web && npm test -- domain`
Expected: FAIL — as duas funções não existem.

Acrescente ao fim de `web/src/lib/domain.ts`:

```ts
/** Lê o segmento AAAA-MM da rota de pagamento de fatura. */
export function competenciaDaRota(s: string): Competencia {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(s);
  if (!m) throw new Error(`competência inválida na rota: ${s}`);
  return { ano: Number(m[1]), mes: Number(m[2]) };
}

/** Escreve a competência no formato usado na rota. */
export function rotuloDaCompetencia(c: Competencia): string {
  return `${c.ano}-${String(c.mes).padStart(2, "0")}`;
}
```

Run: `cd web && npm test -- domain`
Expected: PASS, 5 testes.

- [ ] **Step 7: Escrever o teste da lista de cartões**

`web/src/components/telas/Cartoes.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Cartoes } from "./Cartoes";

const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});

const CARTAO = {
  id: "k1",
  carteiraID: "c1",
  apelido: "Roxinho",
  banco: "Nubank",
  ultimos4: "1234",
  bandeira: "mastercard",
  cor: "#000000",
  limite: 500000,
  diaFechamento: 28,
  diaVencimento: 5,
  arquivado: false,
};

describe("Cartoes", () => {
  it("mostra o estado vazio com ação de cadastrar", () => {
    loja.valor = { cartoes: [], transacoes: [], faturas: [] };
    render(<Cartoes />);
    expect(screen.getByRole("link", { name: /Adicionar cartão/ })).toHaveAttribute(
      "href",
      "/cartoes/novo",
    );
  });

  it("lista o cartão com banco, apelido e datas", () => {
    loja.valor = { cartoes: [CARTAO], transacoes: [], faturas: [] };
    render(<Cartoes />);
    expect(screen.getByText(/Nubank/)).toBeInTheDocument();
    expect(screen.getByText(/fecha 28/)).toBeInTheDocument();
    expect(screen.getByText(/vence 05/)).toBeInTheDocument();
  });

  it("cada cartão leva à própria rota de detalhe", () => {
    loja.valor = { cartoes: [CARTAO], transacoes: [], faturas: [] };
    render(<Cartoes />);
    expect(screen.getByRole("link", { name: /Nubank/ })).toHaveAttribute(
      "href",
      "/cartoes/k1",
    );
  });

  it("não desenha imitação de cartão de plástico", () => {
    loja.valor = { cartoes: [CARTAO], transacoes: [], faturas: [] };
    const { container } = render(<Cartoes />);
    expect(container.innerHTML).not.toContain("gradient");
    expect(container.innerHTML).not.toContain("••••");
  });
});
```

- [ ] **Step 8: Rodar, verificar que falha, implementar as quatro telas**

Run: `cd web && npm test -- Cartoes`
Expected: FAIL — importação não resolvida.

`web/src/components/telas/Cartoes.tsx`:

```tsx
"use client";

import Link from "next/link";
import { competenciaDe, horizonte, rotuloCurto, avancando } from "@/lib/domain";
import {
  faturaAtualOuRascunho,
  faturaDaCompetencia,
  saldoDevedor,
  totalDaFatura,
  useLoja,
} from "@/lib/store";
import { Cabecalho } from "../ui/Cabecalho";
import { Curva } from "../ui/Curva";
import { LinhaLista } from "../ui/LinhaLista";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { Vazio } from "../ui/Vazio";

export function Cartoes() {
  const { cartoes, transacoes, faturas } = useLoja();
  const agora = new Date();
  const c0 = competenciaDe(agora);

  const itens = cartoes.map((cartao) => {
    const atual = faturaAtualOuRascunho(cartao, faturas, agora);
    const total = totalDaFatura(atual, transacoes, cartao);
    const prox = faturaDaCompetencia(cartao, faturas, avancando(c0, 1));
    return {
      cartao,
      total,
      aPagar: saldoDevedor(atual, total),
      proxima: totalDaFatura(prox, transacoes, cartao),
      fecha: atual.fechaEm.slice(8),
      vence: atual.venceEm.slice(8),
      curva: horizonte(6, c0, transacoes, cartao),
    };
  });

  const totalMes = itens.reduce((s, t) => s + t.aPagar, 0);
  const pontos = [0, 1, 2, 3, 4, 5].map((i) => ({
    rotulo: rotuloCurto(avancando(c0, i)),
    total: itens.reduce((s, t) => s + (t.curva[i]?.total ?? 0), 0),
  }));

  if (cartoes.length === 0) {
    return (
      <div>
        <Cabecalho titulo="cartões" />
        <Vazio
          frase="Nenhum cartão. Cadastre um para acompanhar faturas e parcelas."
          acao={
            <Link
              href="/cartoes/novo"
              className="flex min-h-[44px] items-center rounded-controle bg-grafite px-4 font-texto text-[14px] font-semibold text-ar"
            >
              Adicionar cartão
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <Cabecalho
        titulo="cartões"
        acao={
          <Link
            href="/cartoes/novo"
            aria-label="Adicionar cartão"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[20px] text-grafite"
          >
            +
          </Link>
        }
      />
      <div className="px-4 pt-8">
        <Rotulo>a pagar este mês</Rotulo>
        <div className="mt-2">
          <Numero centavos={totalMes} tamanho="heroi" subordinaCentavos />
        </div>
      </div>
      <div className="mt-8 px-4">
        <Rotulo>próximas faturas · todos os cartões</Rotulo>
        <div className="mt-3">
          <Curva pontos={pontos} />
        </div>
      </div>
      <div className="mt-8 px-4">
        {itens.map((t) => (
          <LinhaLista
            key={t.cartao.id}
            titulo={`${t.cartao.banco} · ${t.cartao.apelido}`}
            subtitulo={`fecha ${t.fecha} · vence ${t.vence}`}
            valor={t.total}
            href={`/cartoes/${t.cartao.id}`}
          />
        ))}
      </div>
    </div>
  );
}
```

`web/src/components/telas/CartaoForm.tsx` — mesma lógica de `CasalApp.tsx:420-515`, com quatro mudanças: sem `CartaoFace` de prévia, com `Campo` e `Botao` novos, com `useAviso` no lugar do silêncio em caso de falha, e navegando por rota em vez de `onClose`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Cartao } from "@/lib/domain";
import { CORES_CARTAO, ROTULO_BANDEIRA } from "@/lib/domain";
import { EntradaValor } from "@/lib/money";
import { useLoja } from "@/lib/store";
import { Cabecalho } from "../ui/Cabecalho";
import { Campo } from "../ui/Campo";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { Teclado } from "../ui/Teclado";
import { useAviso } from "../ui/Aviso";

export function CartaoForm({ id }: { id?: string }) {
  const { cartoes, carteira, salvarCartao } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();
  const existente = cartoes.find((c) => c.id === id);

  const [apelido, setApelido] = useState(existente?.apelido ?? "");
  const [banco, setBanco] = useState(existente?.banco ?? "");
  const [ultimos4, setUltimos4] = useState(existente?.ultimos4 ?? "");
  const [bandeira, setBandeira] = useState<Cartao["bandeira"]>(existente?.bandeira ?? "outra");
  const [cor, setCor] = useState(existente?.cor ?? CORES_CARTAO[0]);
  const [diaFechamento, setDiaFechamento] = useState(existente?.diaFechamento ?? 28);
  const [diaVencimento, setDiaVencimento] = useState(existente?.diaVencimento ?? 5);
  const [entrada] = useState(() => EntradaValor.deCentavos(existente?.limite ?? 0));
  const [, tick] = useState(0);
  const [salvando, setSalvando] = useState(false);

  const pode =
    apelido.trim().length > 0 &&
    banco.trim().length > 0 &&
    /^\d{4}$/.test(ultimos4) &&
    entrada.centavos > 0 &&
    !salvando;

  const voltar = () => router.push(existente ? `/cartoes/${existente.id}` : "/cartoes");

  async function salvar() {
    if (!pode) return;
    setSalvando(true);
    try {
      await salvarCartao({
        id: existente?.id ?? crypto.randomUUID(),
        carteiraID: carteira.id,
        apelido: apelido.trim(),
        banco: banco.trim(),
        ultimos4,
        bandeira,
        cor,
        limite: entrada.centavos,
        diaFechamento,
        diaVencimento,
        arquivado: false,
      });
      voltar();
    } catch {
      avisar("erro", "Não deu para salvar o cartão. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Cabecalho
        titulo={existente ? "editar cartão" : "novo cartão"}
        voltarPara={existente ? `/cartoes/${existente.id}` : "/cartoes"}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <Campo label="Apelido" value={apelido} onChange={setApelido} placeholder="Roxinho" />
        <Campo label="Banco" value={banco} onChange={setBanco} placeholder="Nubank" />
        <Campo
          label="Últimos 4 dígitos"
          value={ultimos4}
          inputMode="numeric"
          onChange={(v) => setUltimos4(v.replace(/\D/g, "").slice(0, 4))}
        />

        <div className="mt-4">
          <Rotulo>bandeira</Rotulo>
          <select
            value={bandeira}
            onChange={(e) => setBandeira(e.target.value as Cartao["bandeira"])}
            aria-label="Bandeira"
            className="mt-1 min-h-[44px] w-full rounded-controle border border-nevoa bg-ar px-3 font-texto text-[16px] text-grafite"
          >
            {(Object.keys(ROTULO_BANDEIRA) as Cartao["bandeira"][]).map((b) => (
              <option key={b} value={b}>
                {ROTULO_BANDEIRA[b]}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <Rotulo>limite total</Rotulo>
          <Numero centavos={entrada.centavos} tamanho="corpo" />
        </div>

        <div className="mt-5">
          <label htmlFor="fechamento" className="block text-[12px] text-cinza">
            Fecha no dia {diaFechamento}
          </label>
          <input
            id="fechamento"
            type="range"
            min={1}
            max={31}
            value={diaFechamento}
            onChange={(e) => setDiaFechamento(Number(e.target.value))}
            className="mt-2 w-full"
          />
          <label htmlFor="vencimento" className="mt-3 block text-[12px] text-cinza">
            Vence no dia {diaVencimento}
          </label>
          <input
            id="vencimento"
            type="range"
            min={1}
            max={31}
            value={diaVencimento}
            onChange={(e) => setDiaVencimento(Number(e.target.value))}
            className="mt-2 w-full"
          />
          <p className="mt-2 text-[12px] text-cinza">
            {diaVencimento > diaFechamento
              ? "A fatura fecha e vence no mesmo mês."
              : "A fatura fecha num mês e vence no mês seguinte."}
          </p>
        </div>

        <div className="mt-5 flex gap-2">
          {CORES_CARTAO.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={`Cor ${hex}`}
              aria-pressed={cor === hex}
              onClick={() => setCor(hex)}
              className="h-7 w-7 rounded-amostra border border-nevoa"
              style={{ background: hex }}
            />
          ))}
        </div>
      </div>
      <Teclado
        aoDigitar={(d) => {
          entrada.digitar(d);
          tick((n) => n + 1);
        }}
        aoApagar={() => {
          entrada.apagar();
          tick((n) => n + 1);
        }}
        aoSalvar={salvar}
        aoFechar={voltar}
        podeSalvar={pode}
        mostraSalvar
      />
    </div>
  );
}
```

As amostras de cor são a única exceção à regra de cor literal: são dados do cartão escolhidos pelo usuário, vindos de `CORES_CARTAO` em `domain.ts`, não decisão de estilo. O script da tarefa 21 exclui `src/lib/` da varredura por isso.

`web/src/components/telas/CartaoDetalhe.tsx` — mesma lógica de `CasalApp.tsx:517-609`, sem `CartaoFace`, com as abas de fatura preservadas e o pagar apontando para rota:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import {
  avancando,
  competenciaDaCompra,
  competenciaDe,
  rotuloCurto,
  rotuloDaCompetencia,
} from "@/lib/domain";
import {
  faturaAtualOuRascunho,
  faturaDaCompetencia,
  totalDaFatura,
  useLoja,
} from "@/lib/store";
import { Cabecalho } from "../ui/Cabecalho";
import { LinhaLista } from "../ui/LinhaLista";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";

type Aba = "atual" | "proxima" | "futuras";

export function CartaoDetalhe({ id }: { id: string }) {
  const { cartoes, transacoes, faturas } = useLoja();
  const [aba, setAba] = useState<Aba>("atual");
  const cartao = cartoes.find((c) => c.id === id);

  if (!cartao) {
    return (
      <div>
        <Cabecalho titulo="cartão" voltarPara="/cartoes" />
        <p className="px-4 pt-8 text-[14px] text-cinza">Este cartão não existe mais.</p>
      </div>
    );
  }

  const agora = new Date();
  const c0 = competenciaDe(agora);
  const atual = faturaAtualOuRascunho(cartao, faturas, agora);
  const prox = faturaDaCompetencia(cartao, faturas, avancando(c0, 1));
  const fatura = aba === "proxima" ? prox : atual;
  const total = totalDaFatura(fatura, transacoes, cartao);

  const lancamentos = transacoes
    .filter((t) => t.tipo === "despesa" && t.cartaoID === cartao.id)
    .filter((t) => {
      const x = competenciaDaCompra(new Date(t.data), cartao);
      return x.ano === fatura.ano && x.mes === fatura.mes;
    });

  return (
    <div>
      <Cabecalho
        titulo={cartao.apelido}
        voltarPara="/cartoes"
        acao={
          <Link
            href={`/cartoes/${cartao.id}/editar`}
            className="flex min-h-[44px] items-center text-[14px] text-grafite"
          >
            Editar
          </Link>
        }
      />
      <div className="px-4 pt-6">
        <Rotulo>{cartao.banco} · final {cartao.ultimos4}</Rotulo>
        <div className="mt-4 flex gap-2">
          {(["atual", "proxima", "futuras"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAba(a)}
              aria-pressed={aba === a}
              className={`min-h-[44px] flex-1 rounded-controle text-[12px] ${
                aba === a ? "bg-grafite text-ar" : "border border-nevoa text-grafite"
              }`}
            >
              {a === "atual" ? "Atual" : a === "proxima" ? "Próxima" : "Futuras"}
            </button>
          ))}
        </div>

        {aba !== "futuras" ? (
          <>
            <div className="mt-8">
              <Rotulo>
                fecha {fatura.fechaEm.split("-").reverse().join("/")} · vence{" "}
                {fatura.venceEm.split("-").reverse().join("/")}
              </Rotulo>
              <div className="mt-2">
                <Numero centavos={total} tamanho="heroi" subordinaCentavos />
              </div>
            </div>
            {fatura.status !== "paga" && total > 0 && (
              <Link
                href={`/cartoes/${cartao.id}/faturas/${rotuloDaCompetencia(fatura)}/pagar`}
                className="mt-5 flex min-h-[44px] items-center justify-center rounded-controle bg-grafite font-texto text-[14px] font-semibold text-ar"
              >
                Pagar
              </Link>
            )}
            <div className="mt-8">
              {lancamentos.map((t) => (
                <LinhaLista
                  key={t.id}
                  titulo={t.descricao || "Sem descrição"}
                  subtitulo={
                    t.parcelaTotal > 1 ? `parcela ${t.parcelaN} de ${t.parcelaTotal}` : undefined
                  }
                  valor={t.valor}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="mt-8">
            {[2, 3, 4, 5].map((i) => {
              const c = avancando(c0, i);
              const f = faturaDaCompetencia(cartao, faturas, c);
              return (
                <LinhaLista
                  key={rotuloDaCompetencia(c)}
                  titulo={`${rotuloCurto(c)} ${c.ano}`}
                  valor={totalDaFatura(f, transacoes, cartao)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

`web/src/components/telas/PagarFatura.tsx` — mesma lógica de `CasalApp.tsx:611-678`, com a fatura reconstruída da competência da URL em vez de recebida por estado:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Competencia } from "@/lib/domain";
import { ROTULO_TIPO_CONTA } from "@/lib/domain";
import { EntradaValor } from "@/lib/money";
import {
  faturaDaCompetencia,
  saldoDevedor,
  totalDaFatura,
  useLoja,
} from "@/lib/store";
import { Cabecalho } from "../ui/Cabecalho";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { Teclado } from "../ui/Teclado";
import { useAviso } from "../ui/Aviso";

export function PagarFatura({
  cartaoId,
  competencia,
}: {
  cartaoId: string;
  competencia: Competencia;
}) {
  const { cartoes, contas, faturas, transacoes, pagarFatura } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();
  const cartao = cartoes.find((c) => c.id === cartaoId);
  const fatura = cartao ? faturaDaCompetencia(cartao, faturas, competencia) : null;
  const total = cartao && fatura ? totalDaFatura(fatura, transacoes, cartao) : 0;
  const saldo = fatura ? saldoDevedor(fatura, total) : 0;
  const [contaID, setContaID] = useState(contas[0]?.id ?? "");
  const [entrada] = useState(() => EntradaValor.deCentavos(saldo));
  const [, tick] = useState(0);
  const [pagando, setPagando] = useState(false);

  if (!cartao || !fatura) {
    return (
      <div>
        <Cabecalho titulo="pagar fatura" voltarPara="/cartoes" />
        <p className="px-4 pt-8 text-[14px] text-cinza">Este cartão não existe mais.</p>
      </div>
    );
  }

  const voltar = () => router.push(`/cartoes/${cartao.id}`);
  const pode = entrada.podeSalvar && contaID.length > 0 && !pagando;

  async function pagar() {
    if (!pode) return;
    setPagando(true);
    try {
      await pagarFatura({ cartao: cartao!, fatura: fatura!, valor: entrada.centavos, contaID });
      voltar();
    } catch {
      avisar("erro", "Não deu para registrar o pagamento. Tente de novo.");
    } finally {
      setPagando(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Cabecalho titulo="pagar fatura" voltarPara={`/cartoes/${cartao.id}`} />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-6">
        <Rotulo>saldo devedor</Rotulo>
        <div className="mt-2">
          <Numero centavos={saldo} tamanho="secao" />
        </div>
        <div className="mt-8 text-center">
          <Numero centavos={entrada.centavos} tamanho="heroi" subordinaCentavos />
        </div>

        {contas.length === 0 ? (
          <div className="mt-8">
            <p className="text-[14px] text-cinza">
              Cadastre uma conta para escolher de onde sai o pagamento.
            </p>
            <Link
              href="/mais/contas/novo"
              className="mt-3 flex min-h-[44px] items-center text-[14px] font-semibold text-grafite"
            >
              Cadastrar conta
            </Link>
          </div>
        ) : (
          <div className="mt-8">
            <Rotulo>sai de</Rotulo>
            <select
              value={contaID}
              onChange={(e) => setContaID(e.target.value)}
              aria-label="Conta de saída"
              className="mt-1 min-h-[44px] w-full rounded-controle border border-nevoa bg-ar px-3 font-texto text-[16px] text-grafite"
            >
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} · {ROTULO_TIPO_CONTA[c.tipo]}
                </option>
              ))}
            </select>
          </div>
        )}

        <p className="mt-6 text-[12px] text-cinza">
          O pagamento entra como transferência, não como gasto novo — a compra já foi
          contada quando aconteceu.
        </p>
      </div>
      <Teclado
        aoDigitar={(d) => {
          entrada.digitar(d);
          tick((n) => n + 1);
        }}
        aoApagar={() => {
          entrada.apagar();
          tick((n) => n + 1);
        }}
        aoSalvar={pagar}
        aoFechar={voltar}
        podeSalvar={pode}
        mostraSalvar
      />
    </div>
  );
}
```

- [ ] **Step 9: Criar as cinco páginas**

`web/src/app/(app)/cartoes/page.tsx`:

```tsx
import { Cartoes } from "@/components/telas/Cartoes";

export default function PaginaCartoes() {
  return <Cartoes />;
}
```

`web/src/app/(app)/cartoes/novo/page.tsx`:

```tsx
import { CartaoForm } from "@/components/telas/CartaoForm";

export default function PaginaNovoCartao() {
  return <CartaoForm />;
}
```

`web/src/app/(app)/cartoes/[id]/page.tsx`:

```tsx
import { CartaoDetalhe } from "@/components/telas/CartaoDetalhe";

export default async function PaginaCartao({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CartaoDetalhe id={id} />;
}
```

`web/src/app/(app)/cartoes/[id]/editar/page.tsx`:

```tsx
import { CartaoForm } from "@/components/telas/CartaoForm";

export default async function PaginaEditarCartao({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CartaoForm id={id} />;
}
```

`web/src/app/(app)/cartoes/[id]/faturas/[competencia]/pagar/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { competenciaDaRota } from "@/lib/domain";
import { PagarFatura } from "@/components/telas/PagarFatura";

export default async function PaginaPagarFatura({
  params,
}: {
  params: Promise<{ id: string; competencia: string }>;
}) {
  const { id, competencia } = await params;
  try {
    return <PagarFatura cartaoId={id} competencia={competenciaDaRota(competencia)} />;
  } catch {
    notFound();
  }
}
```

- [ ] **Step 10: Remover as telas antigas**

Em `web/src/components/CasalApp.tsx`, apague as funções `Cartoes`, `CartaoForm`, `CartaoDetalhe` e `PagarFatura`, e os ramos correspondentes do retorno e do tipo `Tela`. Depois:

```bash
cd web && rm src/components/CartaoFace.tsx
grep -rn "CartaoFace" src/ || echo "nenhuma referência restante"
```

Expected: `nenhuma referência restante`.

- [ ] **Step 11: Rodar e verificar**

Run: `cd web && npm test && npx tsc --noEmit && npm run build`
Expected: PASS em tudo. Em `npm run dev`, percorra: `/cartoes` → tocar num cartão → `/cartoes/<id>` → Editar → voltar pelo botão do navegador → Pagar → `/cartoes/<id>/faturas/2026-09/pagar`. Cada passo tem URL própria e o voltar do navegador funciona em todos.

- [ ] **Step 12: Commit**

```bash
git add web/src/components web/src/app/(app)/cartoes web/src/lib/domain.ts \
  web/src/lib/domain.test.ts
git commit -m "feat(web): cartoes em cinco rotas, sem imitacao de plastico"
```

---

### Task 14: Tela de lançamento

Cumpre a promessa da seção 11 da spec original — o teto aparece na hora de gastar — na parte que já é possível hoje: sem Metas, a linha do teto não aparece, e o espaço não é reservado nem preenchido com valor falso.

**Files:**
- Create: `web/src/components/telas/Lancar.tsx`
- Create: `web/src/app/(app)/lancar/page.tsx`
- Test: `web/src/components/telas/Lancar.test.tsx`
- Modify: `web/src/components/CasalApp.tsx`
- Delete: `web/src/components/Teclado.tsx`

**Interfaces:**
- Consumes: `Teclado` da tarefa 11; `Etiqueta` da tarefa 9; `useAviso` da tarefa 10; `lancar` de `useLoja`.
- Produces: `<Lancar />` na rota `/lancar`.

- [ ] **Step 1: Escrever o teste**

`web/src/components/telas/Lancar.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Lancar } from "./Lancar";
import { ProvedorAviso } from "../ui/Aviso";

const empurrar = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: empurrar }) }));

const lancar = vi.hoisted(() => ({ fn: vi.fn() }));
const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});

function montar() {
  loja.valor = { cartoes: [], lancar: lancar.fn };
  return render(
    <ProvedorAviso>
      <Lancar />
    </ProvedorAviso>,
  );
}

describe("Lancar", () => {
  it("começa em zero e não deixa salvar", () => {
    montar();
    expect(screen.getByText(/R\$ 0/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("monta o valor pelo teclado físico e habilita o salvar", async () => {
    montar();
    await userEvent.keyboard("21490");
    expect(screen.getByText(/214/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
  });

  it("grava o lançamento com a categoria escolhida", async () => {
    lancar.fn.mockClear();
    montar();
    await userEvent.keyboard("1000");
    await userEvent.click(screen.getByRole("button", { name: /Restaurante/ }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(lancar.fn).toHaveBeenCalledWith(
      expect.objectContaining({
        valor: 1000,
        categoriaID: "00000000-0000-0000-0000-000000000002",
        parcelas: 1,
      }),
    );
  });

  it("não mostra linha de teto enquanto Metas não existe", async () => {
    montar();
    await userEvent.keyboard("1000");
    expect(screen.queryByText(/teto/i)).toBeNull();
    expect(screen.queryByText(/sobram/i)).toBeNull();
  });

  it("avisa quando a gravação falha, em vez de fechar em silêncio", async () => {
    lancar.fn.mockRejectedValueOnce(new Error("rede"));
    montar();
    await userEvent.keyboard("1000");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByRole("status")).toHaveTextContent(/Não deu para salvar/);
    expect(empurrar).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `cd web && npm test -- Lancar`
Expected: FAIL — importação não resolvida.

- [ ] **Step 3: Implementar**

`web/src/components/telas/Lancar.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORIAS } from "@/lib/domain";
import { EntradaValor } from "@/lib/money";
import { useLoja } from "@/lib/store";
import { Cabecalho } from "../ui/Cabecalho";
import { Campo } from "../ui/Campo";
import { Etiqueta } from "../ui/Etiqueta";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { Teclado } from "../ui/Teclado";
import { useAviso } from "../ui/Aviso";
import { IconeCategoria } from "../Icones";

const DESPESAS = CATEGORIAS.filter((c) => c.tipo === "despesa");

export function Lancar() {
  const { cartoes, lancar } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();

  const [entrada] = useState(() => new EntradaValor());
  const [, tick] = useState(0);
  const [categoriaID, setCategoriaID] = useState(DESPESAS[0].id);
  const [descricao, setDescricao] = useState("");
  const [cartaoID, setCartaoID] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [mais, setMais] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const pode = entrada.podeSalvar && !salvando;
  const voltar = () => router.push("/mes");

  async function salvar() {
    if (!pode) return;
    setSalvando(true);
    try {
      await lancar({
        valor: entrada.centavos,
        categoriaID,
        descricao,
        data: new Date(),
        cartaoID: cartaoID || undefined,
        parcelas: cartaoID ? parcelas : 1,
      });
      voltar();
    } catch {
      avisar("erro", "Não deu para salvar o lançamento. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Cabecalho titulo="novo gasto" voltarPara="/mes" />
      <div className="px-4 pt-6 text-center">
        <Numero centavos={entrada.centavos} tamanho="heroi" subordinaCentavos />
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2 px-4">
        {DESPESAS.slice(0, 6).map((c) => (
          <Etiqueta
            key={c.id}
            ativa={categoriaID === c.id}
            aoClicar={() => setCategoriaID(c.id)}
          >
            <IconeCategoria nome={c.icone} size={14} />
            {c.nome}
          </Etiqueta>
        ))}
      </div>

      {mais && (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4">
          <Campo label="Onde foi o gasto" value={descricao} onChange={setDescricao} />
          <div className="mt-4">
            <Rotulo>pago com</Rotulo>
            <select
              value={cartaoID}
              aria-label="Forma de pagamento"
              onChange={(e) => {
                setCartaoID(e.target.value);
                if (!e.target.value) setParcelas(1);
              }}
              className="mt-1 min-h-[44px] w-full rounded-controle border border-nevoa bg-ar px-3 font-texto text-[16px] text-grafite"
            >
              <option value="">Dinheiro, Pix ou débito</option>
              {cartoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.banco} · final {c.ultimos4}
                </option>
              ))}
            </select>
          </div>
          {cartaoID && (
            <div className="mt-4">
              <Rotulo>parcelar em</Rotulo>
              <select
                value={parcelas}
                aria-label="Parcelas"
                onChange={(e) => setParcelas(Number(e.target.value))}
                className="mt-1 min-h-[44px] w-full rounded-controle border border-nevoa bg-ar px-3 font-texto text-[16px] text-grafite"
              >
                <option value={1}>À vista</option>
                {Array.from({ length: 23 }, (_, i) => i + 2).map((n) => (
                  <option key={n} value={n}>
                    {n}x
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <div className="mt-auto">
        <Teclado
          aoDigitar={(d) => {
            entrada.digitar(d);
            tick((n) => n + 1);
          }}
          aoApagar={() => {
            entrada.apagar();
            tick((n) => n + 1);
          }}
          aoSalvar={salvar}
          aoFechar={voltar}
          aoMaisOpcoes={() => setMais((v) => !v)}
          podeSalvar={pode}
          mostraSalvar
        />
      </div>
    </div>
  );
}
```

O teto por categoria **não** entra aqui. Ele depende de Metas, que não existe; exibir um número inventado seria mentir sobre dinheiro. Quando Metas chegar, a linha entra entre as etiquetas e o teclado.

- [ ] **Step 4: Criar a página**

`web/src/app/(app)/lancar/page.tsx`:

```tsx
import { Lancar } from "@/components/telas/Lancar";

export default function PaginaLancar() {
  return <Lancar />;
}
```

- [ ] **Step 5: Remover a tela antiga e o teclado antigo**

Em `web/src/components/CasalApp.tsx`, apague a função `Lancamento` e o ramo `{tela.nome === "lancamento" && …}`. Depois:

```bash
cd web && rm src/components/Teclado.tsx
grep -rn 'from "./Teclado"\|components/Teclado' src/ || echo "nenhuma referência restante"
```

Expected: `nenhuma referência restante`.

- [ ] **Step 6: Rodar e verificar**

Run: `cd web && npm test && npx tsc --noEmit && npm run build`
Expected: PASS em tudo. Em `npm run dev`, no notebook: abra `/lancar`, digite `21490` no teclado do computador, aperte Enter. O gasto tem que ser gravado — hoje isso é impossível.

- [ ] **Step 7: Commit**

```bash
git add web/src/components web/src/app/(app)/lancar
git commit -m "feat(web): lancamento em rota propria com teclado fisico"
```

---

### Task 15: Telas de mais, contas e carteiras

Seis rotas. Encerra o empilhamento por estado: depois desta tarefa, `CasalApp.tsx` só tem a casca vazia.

**Files:**
- Create: `web/src/components/telas/Mais.tsx`
- Create: `web/src/components/telas/Contas.tsx`
- Create: `web/src/components/telas/ContaForm.tsx`
- Create: `web/src/components/telas/Carteiras.tsx`
- Create: `web/src/components/telas/CarteiraForm.tsx`
- Create: `web/src/components/telas/Metas.tsx`
- Create: as seis páginas em `web/src/app/(app)/mais/` e `web/src/app/(app)/metas/page.tsx`
- Test: `web/src/components/telas/Carteiras.test.tsx`
- Modify: `web/src/components/CasalApp.tsx`

**Interfaces:**
- Consumes: todos os componentes das tarefas 8 a 11; `criarConvite`, `aceitarConvite`, `criarCarteira`, `selecionarCarteira`, `salvarConta` de `useLoja`.
- Produces: `/mais`, `/mais/contas`, `/mais/contas/novo`, `/mais/contas/[id]`, `/mais/carteiras`, `/mais/carteiras/nova`, `/metas`.

- [ ] **Step 1: Escrever o teste do convite**

O código do convite é o trecho com mais regra de negócio na interface. `web/src/components/telas/Carteiras.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Carteiras, formatarCodigoConvite } from "./Carteiras";
import { ProvedorAviso } from "../ui/Aviso";

const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
const auth = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});
vi.mock("@/lib/auth", async (original) => {
  const real = await original<typeof import("@/lib/auth")>();
  return { ...real, useAuth: () => auth.valor };
});

const CONJUNTA = {
  id: "w1",
  nome: "Nosso",
  cor: "#000000",
  rotulo: "compartilhada",
  visibilidade: "aberta",
};

function montar(extra: Record<string, unknown> = {}) {
  auth.valor = { usuario: { id: "u1", email: "eu@casa.br" } };
  loja.valor = {
    carteira: CONJUNTA,
    carteiras: [{ ...CONJUNTA, membrosN: 2 }],
    membros: [
      { userId: "u1", email: "eu@casa.br", papel: "dono" },
      { userId: "u2", email: "voce@casa.br", papel: "membro" },
    ],
    convite: null,
    remoto: true,
    criarConvite: vi.fn().mockResolvedValue(null),
    aceitarConvite: vi.fn().mockResolvedValue(null),
    selecionarCarteira: vi.fn(),
    ...extra,
  };
  return render(
    <ProvedorAviso>
      <Carteiras />
    </ProvedorAviso>,
  );
}

describe("formatarCodigoConvite", () => {
  it("agrupa em três mais três", () => {
    expect(formatarCodigoConvite("abcdef")).toBe("ABC-DEF");
  });

  it("devolve o que recebeu quando não tem seis caracteres", () => {
    expect(formatarCodigoConvite("abc")).toBe("ABC");
  });
});

describe("Carteiras", () => {
  it("lista quem está na carteira, marcando você", () => {
    montar();
    expect(screen.getByText("Você")).toBeInTheDocument();
    expect(screen.getByText("voce@casa.br")).toBeInTheDocument();
  });

  it("oferece gerar convite para o dono de carteira conjunta", () => {
    montar();
    expect(screen.getByRole("button", { name: /Gerar convite/ })).toBeEnabled();
  });

  it("mostra o código com prazo quando já existe convite", () => {
    montar({ convite: { codigo: "ABCDEF", expiraEm: "2026-09-30T00:00:00.000Z" } });
    expect(screen.getByText("ABC-DEF")).toBeInTheDocument();
  });

  it("não oferece convite em carteira pessoal", () => {
    const pessoal = { ...CONJUNTA, rotulo: "pessoal", visibilidade: "fechada" };
    montar({ carteira: pessoal, carteiras: [{ ...pessoal, membrosN: 1 }] });
    expect(screen.queryByRole("button", { name: /Gerar convite/ })).toBeNull();
    expect(screen.getByText(/não aceita convite/)).toBeInTheDocument();
  });

  it("avisa a falha ao aceitar código, em vez de engolir", async () => {
    montar({ aceitarConvite: vi.fn().mockResolvedValue("Código inválido ou já usado.") });
    await userEvent.type(screen.getByLabelText(/código/i), "ABCDEF");
    await userEvent.click(screen.getByRole("button", { name: /Entrar na carteira/ }));
    expect(await screen.findByRole("status")).toHaveTextContent(/Código inválido/);
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `cd web && npm test -- Carteiras`
Expected: FAIL — importação não resolvida.

- [ ] **Step 3: Implementar as seis telas**

Cada uma reaproduz a lógica da função equivalente em `CasalApp.tsx`, trocando o que a spec manda trocar: `Cabecalho`, `Rotulo`, `LinhaLista`, `Campo`, `Botao`, `Numero` no lugar das versões embutidas; `useAviso` no lugar do `useState<string | null>` de erro; navegação por rota no lugar de `onClose`.

`web/src/components/telas/Mais.tsx` — de `CasalApp.tsx:765-804`:

```tsx
"use client";

import { useAuth } from "@/lib/auth";
import { useLoja } from "@/lib/store";
import { Cabecalho } from "../ui/Cabecalho";
import { LinhaLista } from "../ui/LinhaLista";
import { Rotulo } from "../ui/Rotulo";
import { Botao } from "../ui/Botao";

export function Mais() {
  const { contas, carteira, remoto } = useLoja();
  const { usuario, sair } = useAuth();
  return (
    <div>
      <Cabecalho titulo="mais" />
      <div className="px-4 pt-6">
        {usuario?.email && (
          <div>
            <Rotulo>conta</Rotulo>
            <p className="mt-1 text-[14px] text-grafite">{usuario.email}</p>
            <div className="mt-3">
              <Botao variante="secundario" onClick={() => void sair()}>
                Sair
              </Botao>
            </div>
          </div>
        )}
        <div className="mt-8">
          <LinhaLista
            titulo="Carteiras"
            subtitulo={`pessoal e conjunta · ${carteira.nome}`}
            href="/mais/carteiras"
          />
          <LinhaLista
            titulo="Contas"
            subtitulo={
              contas.length
                ? `corrente, poupança e dinheiro · ${contas.length}`
                : "corrente, poupança e dinheiro"
            }
            href="/mais/contas"
          />
        </div>
        <p className="mt-8 text-[12px] text-cinza">
          {remoto
            ? "Dados neste dispositivo e no Supabase."
            : "Dados só neste aparelho — configure o Supabase para sincronizar."}
        </p>
      </div>
    </div>
  );
}
```

`web/src/components/telas/Metas.tsx`:

```tsx
import { Cabecalho } from "../ui/Cabecalho";
import { Vazio } from "../ui/Vazio";

export function Metas() {
  return (
    <div>
      <Cabecalho titulo="metas" />
      <Vazio frase="Tetos de gasto e objetivos entram aqui. Ainda não estão prontos." />
    </div>
  );
}
```

`web/src/components/telas/Contas.tsx` — de `CasalApp.tsx:1062-1107`:

```tsx
"use client";

import Link from "next/link";
import { ROTULO_TIPO_CONTA } from "@/lib/domain";
import { useLoja } from "@/lib/store";
import { Cabecalho } from "../ui/Cabecalho";
import { LinhaLista } from "../ui/LinhaLista";
import { Vazio } from "../ui/Vazio";

export function Contas() {
  const { contas } = useLoja();

  return (
    <div>
      <Cabecalho
        titulo="contas"
        voltarPara="/mais"
        acao={
          <Link
            href="/mais/contas/novo"
            aria-label="Adicionar conta"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[20px] text-grafite"
          >
            +
          </Link>
        }
      />
      <div className="px-4 pt-6">
        <p className="text-[12px] text-cinza">
          O que você tem no banco — usadas ao pagar fatura.
        </p>
        {contas.length === 0 ? (
          <Vazio
            frase="Nenhuma conta cadastrada."
            acao={
              <Link
                href="/mais/contas/novo"
                className="flex min-h-[44px] items-center rounded-controle bg-grafite px-4 font-texto text-[14px] font-semibold text-ar"
              >
                Adicionar conta
              </Link>
            }
          />
        ) : (
          <div className="mt-4">
            {contas.map((c) => (
              <LinhaLista
                key={c.id}
                titulo={c.nome}
                subtitulo={ROTULO_TIPO_CONTA[c.tipo]}
                valor={c.saldoInicial}
                href={`/mais/contas/${c.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

`web/src/components/telas/ContaForm.tsx` — de `CasalApp.tsx:1109-1184`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Conta, TipoConta } from "@/lib/domain";
import { ROTULO_TIPO_CONTA } from "@/lib/domain";
import { EntradaValor } from "@/lib/money";
import { useLoja } from "@/lib/store";
import { useAviso } from "../ui/Aviso";
import { Botao } from "../ui/Botao";
import { Cabecalho } from "../ui/Cabecalho";
import { Campo } from "../ui/Campo";
import { Etiqueta } from "../ui/Etiqueta";
import { Numero } from "../ui/Numero";
import { Rotulo } from "../ui/Rotulo";
import { Teclado } from "../ui/Teclado";

const TIPOS: TipoConta[] = ["corrente", "poupanca", "dinheiro"];

export function ContaForm({ id }: { id?: string }) {
  const { contas, carteira, salvarConta } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();
  const existente = contas.find((c) => c.id === id);

  const [nome, setNome] = useState(existente?.nome ?? "");
  const [tipo, setTipo] = useState<TipoConta>(existente?.tipo ?? "corrente");
  const [entrada] = useState(() => EntradaValor.deCentavos(existente?.saldoInicial ?? 0));
  const [, tick] = useState(0);
  const [salvando, setSalvando] = useState(false);

  const pode = nome.trim().length > 0 && !salvando;
  const voltar = () => router.push("/mais/contas");

  function montar(arquivada: boolean): Conta {
    return {
      id: existente?.id ?? crypto.randomUUID(),
      carteiraID: carteira.id,
      nome: nome.trim() || existente?.nome || "",
      tipo,
      saldoInicial: entrada.centavos,
      arquivada,
    };
  }

  async function salvar() {
    if (!pode) return;
    setSalvando(true);
    try {
      await salvarConta(montar(false));
      voltar();
    } catch {
      avisar("erro", "Não deu para salvar a conta. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  async function arquivar() {
    if (!existente) return;
    setSalvando(true);
    try {
      await salvarConta(montar(true));
      voltar();
    } catch {
      avisar("erro", "Não deu para arquivar a conta. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Cabecalho
        titulo={existente ? "editar conta" : "nova conta"}
        voltarPara="/mais/contas"
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <Campo
          label="Nome"
          value={nome}
          onChange={setNome}
          placeholder="Nubank, Itaú, Carteira…"
        />

        <div className="mt-4">
          <Rotulo>tipo</Rotulo>
          <div className="mt-2 flex gap-2">
            {TIPOS.map((t) => (
              <Etiqueta key={t} ativa={tipo === t} aoClicar={() => setTipo(t)}>
                {ROTULO_TIPO_CONTA[t]}
              </Etiqueta>
            ))}
          </div>
        </div>

        <div
          className="mt-6"
          role="status"
          aria-live="polite"
          aria-label="Saldo inicial"
        >
          <Rotulo>saldo inicial</Rotulo>
          <div className="mt-2">
            <Numero centavos={entrada.centavos} tamanho="secao" />
          </div>
        </div>

        {existente && (
          <div className="mt-8">
            <Botao variante="destrutivo" onClick={arquivar} disabled={salvando}>
              Arquivar conta
            </Botao>
          </div>
        )}
      </div>
      <Teclado
        aoDigitar={(d) => {
          entrada.digitar(d);
          tick((n) => n + 1);
        }}
        aoApagar={() => {
          entrada.apagar();
          tick((n) => n + 1);
        }}
        aoSalvar={salvar}
        aoFechar={voltar}
        podeSalvar={pode}
        mostraSalvar
      />
    </div>
  );
}
```

`web/src/components/telas/CarteiraForm.tsx` — de `CasalApp.tsx:983-1059`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RotuloCarteira } from "@/lib/domain";
import { CORES_CARTAO, ROTULO_CARTEIRA } from "@/lib/domain";
import { useLoja } from "@/lib/store";
import { useAviso } from "../ui/Aviso";
import { Botao } from "../ui/Botao";
import { Cabecalho } from "../ui/Cabecalho";
import { Campo } from "../ui/Campo";
import { Etiqueta } from "../ui/Etiqueta";
import { Rotulo } from "../ui/Rotulo";

const ROTULOS: RotuloCarteira[] = ["pessoal", "compartilhada"];

export function CarteiraForm() {
  const { criarCarteira } = useLoja();
  const { avisar } = useAviso();
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [rotulo, setRotulo] = useState<RotuloCarteira>("pessoal");
  const [cor, setCor] = useState(CORES_CARTAO[0]);
  const [criando, setCriando] = useState(false);

  const pode = nome.trim().length > 0 && !criando;

  async function criar() {
    if (!pode) return;
    setCriando(true);
    const falha = await criarCarteira({ nome: nome.trim(), rotulo, cor });
    setCriando(false);
    if (falha) avisar("erro", falha);
    else router.push("/mais/carteiras");
  }

  return (
    <div>
      <Cabecalho titulo="nova carteira" voltarPara="/mais/carteiras" />
      <div className="px-4 pt-6">
        <Campo
          label="Nome"
          value={nome}
          onChange={setNome}
          placeholder={rotulo === "pessoal" ? "Meu, Pessoal…" : "Nosso, Casal…"}
        />

        <div className="mt-4">
          <Rotulo>tipo</Rotulo>
          <div className="mt-2 flex gap-2">
            {ROTULOS.map((r) => (
              <Etiqueta key={r} ativa={rotulo === r} aoClicar={() => setRotulo(r)}>
                {ROTULO_CARTEIRA[r]}
              </Etiqueta>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-cinza">
            {rotulo === "pessoal"
              ? "Só você vê. Não aceita convite."
              : "Você convida o parceiro com um código."}
          </p>
        </div>

        <div className="mt-5">
          <Rotulo>cor</Rotulo>
          <div className="mt-2 flex gap-2">
            {CORES_CARTAO.map((hex) => (
              <button
                key={hex}
                type="button"
                aria-label={`Cor ${hex}`}
                aria-pressed={cor === hex}
                onClick={() => setCor(hex)}
                className="h-7 w-7 rounded-amostra border border-nevoa"
                style={{ background: hex }}
              />
            ))}
          </div>
        </div>

        <div className="mt-8">
          <Botao variante="primario" onClick={criar} disabled={!pode}>
            {criando ? "Criando…" : "Criar carteira"}
          </Botao>
        </div>
      </div>
    </div>
  );
}
```

`web/src/components/telas/Carteiras.tsx` — de `CasalApp.tsx:812-981`. As falhas de `criarConvite` e `aceitarConvite`, que hoje viram texto vermelho local, passam a chamar `avisar`. O campo do código usa `label="Código do convite"`, que é o que o teste do passo 1 procura:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { ROTULO_CARTEIRA } from "@/lib/domain";
import { useLoja } from "@/lib/store";
import { useAviso } from "../ui/Aviso";
import { Botao } from "../ui/Botao";
import { Cabecalho } from "../ui/Cabecalho";
import { Campo } from "../ui/Campo";
import { LinhaLista } from "../ui/LinhaLista";
import { Rotulo } from "../ui/Rotulo";

export function formatarCodigoConvite(codigo: string): string {
  const x = codigo.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (x.length !== 6) return x;
  return `${x.slice(0, 3)}-${x.slice(3)}`;
}

export function Carteiras() {
  const {
    carteira,
    carteiras,
    membros,
    convite,
    remoto,
    criarConvite,
    aceitarConvite,
    selecionarCarteira,
  } = useLoja();
  const { usuario } = useAuth();
  const { avisar } = useAviso();

  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const souDono = membros.some((m) => m.userId === usuario?.id && m.papel === "dono");
  const aceitaConvite =
    carteira.visibilidade !== "fechada" && carteira.rotulo !== "pessoal";
  const limpo = codigo.replace(/[^A-Za-z0-9]/g, "");

  async function gerar() {
    setEnviando(true);
    const falha = await criarConvite();
    setEnviando(false);
    if (falha) avisar("erro", falha);
  }

  async function entrar() {
    setEnviando(true);
    const falha = await aceitarConvite(codigo);
    setEnviando(false);
    if (falha) avisar("erro", falha);
    else {
      avisar("ok", "Você entrou na carteira conjunta.");
      setCodigo("");
    }
  }

  async function copiar() {
    if (!convite) return;
    try {
      await navigator.clipboard.writeText(formatarCodigoConvite(convite.codigo));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      avisar("erro", "Não deu para copiar. Anote o código.");
    }
  }

  return (
    <div>
      <Cabecalho
        titulo="carteiras"
        voltarPara="/mais"
        acao={
          <Link
            href="/mais/carteiras/nova"
            aria-label="Nova carteira"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[20px] text-grafite"
          >
            +
          </Link>
        }
      />
      <div className="px-4 pt-6">
        <div>
          {carteiras.map((c) => (
            <LinhaLista
              key={c.id}
              titulo={c.id === carteira.id ? `${c.nome} · atual` : c.nome}
              subtitulo={`${ROTULO_CARTEIRA[c.rotulo]}${
                c.membrosN > 1 ? ` · ${c.membrosN} pessoas` : " · só você"
              }`}
              aoClicar={() => void selecionarCarteira(c.id)}
            />
          ))}
        </div>

        <div className="mt-8">
          <Rotulo>quem está em {carteira.nome}</Rotulo>
          <div className="mt-2">
            {membros.length === 0 ? (
              <p className="text-[14px] text-cinza">Ninguém listado ainda.</p>
            ) : (
              membros.map((m) => {
                const voce = m.userId === usuario?.id;
                return (
                  <LinhaLista
                    key={m.userId}
                    titulo={voce ? "Você" : m.email || "Parceiro"}
                    subtitulo={
                      voce
                        ? `${m.papel === "dono" ? "Dono" : "Parceiro"} · ${m.email}`
                        : m.papel === "dono"
                          ? "Dono"
                          : "Parceiro"
                    }
                  />
                );
              })
            )}
          </div>
        </div>

        {souDono && aceitaConvite && (
          <div className="mt-8">
            <Rotulo>convidar parceiro</Rotulo>
            <p className="mt-2 text-[12px] text-cinza">
              Gere um código e mande no WhatsApp. A outra pessoa entra com a conta
              dela e cola o código aqui.
            </p>
            {convite ? (
              <div className="mt-4">
                <p className="font-numero text-[24px] tabular-nums tracking-[0.18em] text-grafite">
                  {formatarCodigoConvite(convite.codigo)}
                </p>
                <p className="mt-1 font-numero text-[12px] tabular-nums text-cinza">
                  válido até {new Date(convite.expiraEm).toLocaleDateString("pt-BR")}
                </p>
                <div className="mt-3">
                  <Botao variante="secundario" onClick={copiar}>
                    {copiado ? "Copiado" : "Copiar código"}
                  </Botao>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <Botao variante="primario" onClick={gerar} disabled={!remoto || enviando}>
                  {enviando ? "Gerando…" : "Gerar convite"}
                </Botao>
              </div>
            )}
          </div>
        )}

        {souDono && !aceitaConvite && (
          <p className="mt-8 text-[14px] text-cinza">
            Carteira pessoal não aceita convite. Crie uma conjunta para compartilhar.
          </p>
        )}

        <div className="mt-8">
          <Rotulo>tenho um código</Rotulo>
          <p className="mt-2 text-[12px] text-cinza">
            Entra na carteira conjunta da outra pessoa, sem sair da sua pessoal.
          </p>
          <Campo
            label="Código do convite"
            value={codigo}
            onChange={(v) => setCodigo(v.toUpperCase())}
            placeholder="ABC-DEF"
          />
          <div className="mt-3">
            <Botao
              variante="primario"
              onClick={entrar}
              disabled={!remoto || enviando || limpo.length < 6}
            >
              Entrar na carteira
            </Botao>
          </div>
        </div>

        {!remoto && (
          <p className="mt-6 text-[12px] text-cinza">
            Convites só funcionam com login na nuvem.
          </p>
        )}
      </div>
    </div>
  );
}
```

Duas mudanças de comportamento nesta tela, ambas deliberadas: o nome da carteira atual passa a carregar o sufixo `· atual` no próprio título, porque `LinhaLista` não tem espaço para um terceiro elemento à direita; e a confirmação de entrada, que era texto verde local, passa pelo `Aviso`, que leitor de tela anuncia.

- [ ] **Step 4: Criar as sete páginas**

`web/src/app/(app)/mais/page.tsx`, `mais/contas/page.tsx`, `mais/contas/novo/page.tsx`, `mais/carteiras/page.tsx`, `mais/carteiras/nova/page.tsx` seguem o padrão de uma linha, como em `web/src/app/(app)/mais/page.tsx`:

```tsx
import { Mais } from "@/components/telas/Mais";

export default function PaginaMais() {
  return <Mais />;
}
```

`web/src/app/(app)/mais/contas/[id]/page.tsx` lê o parâmetro:

```tsx
import { ContaForm } from "@/components/telas/ContaForm";

export default async function PaginaConta({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContaForm id={id} />;
}
```

`web/src/app/(app)/metas/page.tsx`:

```tsx
import { Metas } from "@/components/telas/Metas";

export default function PaginaMetas() {
  return <Metas />;
}
```

- [ ] **Step 5: Rodar e verificar**

Run: `cd web && npm test -- Carteiras && npm test && npx tsc --noEmit && npm run build`
Expected: PASS, 8 testes em `Carteiras`, todo o resto passando, build limpo.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/telas web/src/app/(app)/mais web/src/app/(app)/metas
git commit -m "feat(web): mais, contas, carteiras e metas em rotas proprias"
```

---

### Task 16: Entrada e remoção do arquivo antigo

Fecha a fase 2. `CasalApp.tsx` sai, e com ele as 1.208 linhas e o empilhamento por estado.

**Files:**
- Create: `web/src/app/entrar/page.tsx`
- Create: `web/src/components/telas/Entrar.tsx`
- Test: `web/src/components/telas/Entrar.test.tsx`
- Delete: `web/src/components/CasalApp.tsx`, `web/src/components/Login.tsx`

**Interfaces:**
- Consumes: `useAuth` de `@/lib/auth`; `Assinatura` da tarefa 5; `Campo` e `Botao` da tarefa 10.
- Produces: `/entrar` com os dois modos, entrar e criar conta. É a única rota fora do grupo `(app)`, porque não tem navegação nem barra de abas.

- [ ] **Step 1: Escrever o teste**

`web/src/components/telas/Entrar.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Entrar } from "./Entrar";

const entrar = vi.fn().mockResolvedValue(null);
const criarConta = vi.fn().mockResolvedValue(null);
vi.mock("@/lib/auth", async (original) => {
  const real = await original<typeof import("@/lib/auth")>();
  return { ...real, useAuth: () => ({ entrar, criarConta }) };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

describe("Entrar", () => {
  it("mostra a assinatura da marca", () => {
    render(<Entrar />);
    expect(screen.getByRole("img", { name: "casal" })).toBeInTheDocument();
  });

  it("bloqueia envio com e-mail sem arroba", async () => {
    render(<Entrar />);
    await userEvent.type(screen.getByLabelText("E-mail"), "eu");
    await userEvent.type(screen.getByLabelText("Senha"), "seissseis");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeDisabled();
  });

  it("bloqueia envio com senha curta", async () => {
    render(<Entrar />);
    await userEvent.type(screen.getByLabelText("E-mail"), "eu@casa.br");
    await userEvent.type(screen.getByLabelText("Senha"), "12345");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeDisabled();
  });

  it("entra com credencial válida", async () => {
    entrar.mockClear();
    render(<Entrar />);
    await userEvent.type(screen.getByLabelText("E-mail"), "eu@casa.br");
    await userEvent.type(screen.getByLabelText("Senha"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(entrar).toHaveBeenCalledWith("eu@casa.br", "123456");
  });

  it("alterna para criar conta e chama o outro caminho", async () => {
    criarConta.mockClear();
    render(<Entrar />);
    await userEvent.click(screen.getByRole("button", { name: /Não tem conta/ }));
    await userEvent.type(screen.getByLabelText("E-mail"), "eu@casa.br");
    await userEvent.type(screen.getByLabelText("Senha"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(criarConta).toHaveBeenCalledWith("eu@casa.br", "123456");
  });

  it("mostra a falha devolvida pela autenticação", async () => {
    entrar.mockResolvedValueOnce("E-mail ou senha incorretos.");
    render(<Entrar />);
    await userEvent.type(screen.getByLabelText("E-mail"), "eu@casa.br");
    await userEvent.type(screen.getByLabelText("Senha"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("E-mail ou senha incorretos.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `cd web && npm test -- Entrar`
Expected: FAIL — importação não resolvida.

- [ ] **Step 3: Implementar**

`web/src/components/telas/Entrar.tsx`. Reaproveita a lógica de `Login.tsx`, com a assinatura da marca no lugar do texto de 13px e sem a frase "com a mesma cara do iPhone", que deixou de ser verdade:

```tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Assinatura } from "../marca/Assinatura";
import { Botao } from "../ui/Botao";
import { Campo } from "../ui/Campo";

export function Entrar() {
  const { entrar, criarConta } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const pode = email.trim().includes("@") && senha.length >= 6 && !enviando;
  const rotulo = modo === "entrar" ? "Entrar" : "Criar conta";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6">
      <div className="pt-[max(48px,env(safe-area-inset-top))]">
        <Assinatura variante="base" largura={132} />
        <h1 className="mt-8 font-texto text-[17px] font-semibold tracking-[-0.02em] text-grafite">
          {rotulo}
        </h1>
        <p className="mt-2 text-[14px] text-cinza">
          Gastos, cartões e contas do casal, num lugar só.
        </p>
      </div>

      <form
        className="mt-8 flex flex-1 flex-col"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!pode) return;
          setEnviando(true);
          setErro(null);
          const falha =
            modo === "entrar"
              ? await entrar(email, senha)
              : await criarConta(email, senha);
          setEnviando(false);
          if (falha) setErro(falha);
        }}
      >
        <Campo
          label="E-mail"
          value={email}
          onChange={setEmail}
          inputMode="email"
          autoComplete="email"
        />
        <Campo
          label="Senha"
          value={senha}
          onChange={setSenha}
          erro={erro ?? undefined}
          tipo="senha"
          autoComplete={modo === "entrar" ? "current-password" : "new-password"}
        />
        <div className="mt-6">
          <Botao variante="primario" type="submit" disabled={!pode}>
            {enviando ? "Aguarde…" : rotulo}
          </Botao>
        </div>
        <div className="mt-4">
          <Botao
            variante="secundario"
            onClick={() => {
              setErro(null);
              setModo((m) => (m === "entrar" ? "criar" : "entrar"));
            }}
          >
            {modo === "entrar" ? "Não tem conta? Criar" : "Já tem conta? Entrar"}
          </Botao>
        </div>
      </form>
    </div>
  );
}
```

O `autoComplete` do campo de senha muda com o modo: `current-password` ao entrar e `new-password` ao criar conta. Sem essa distinção, o gerenciador de senhas do navegador sugere a senha antiga na tela de criação.

- [ ] **Step 4: Criar a página e o provedor de sessão**

`web/src/app/entrar/page.tsx`. Fora do grupo `(app)`, porque não tem navegação:

```tsx
import { AuthProvider } from "@/lib/auth";
import { Entrar } from "@/components/telas/Entrar";

export default function PaginaEntrar() {
  return (
    <AuthProvider>
      <Entrar />
    </AuthProvider>
  );
}
```

- [ ] **Step 5: Apagar o arquivo antigo**

```bash
cd web && rm src/components/CasalApp.tsx src/components/Login.tsx
grep -rn "CasalApp\|components/Login" src/ || echo "nenhuma referência restante"
```

Expected: `nenhuma referência restante`. Se algo aparecer, é uma rota que ainda não foi migrada — volte à tarefa correspondente.

- [ ] **Step 6: Rodar e verificar**

Run: `cd web && npm test && npx tsc --noEmit && npm run build`
Expected: PASS em tudo, build limpo.

Em `npm run dev`, com sessão encerrada: qualquer rota de aplicativo redireciona para `/entrar`; entrar leva de volta a `/mes`. Com sessão ativa, `/entrar` continua acessível — o redirecionamento de volta é opcional e fica fora de escopo.

- [ ] **Step 7: Commit**

```bash
git add web/src/app/entrar web/src/components/telas/Entrar.tsx \
  web/src/components/telas/Entrar.test.tsx
git rm --cached web/src/components/CasalApp.tsx web/src/components/Login.tsx 2>/dev/null || true
git add -A web/src/components
git commit -m "feat(web): entrada em rota propria; remove CasalApp de 1208 linhas"
```

---
# Fase 3 — Tema, desktop, acessibilidade e portões

O que vale para todas as telas de uma vez. Não faz sentido tela por tela.

---

### Task 17: Tema escuro com escolha persistida

Os tokens da tarefa 2 já trocam por `prefers-color-scheme`. Falta a escolha explícita, e falta garantir que nenhuma tela tem elemento invisível no escuro.

**Files:**
- Create: `web/src/lib/tema.tsx`
- Test: `web/src/lib/tema.test.tsx`
- Create: `web/src/components/ui/EscolhaTema.tsx`
- Modify: `web/src/app/layout.tsx`
- Modify: `web/src/components/telas/Mais.tsx`

**Interfaces:**
- Consumes: tokens da tarefa 2.
- Produces:
  - `ProvedorTema` e `useTema(): { tema: "sistema" | "claro" | "escuro"; escolher: (t) => void }`. A escolha grava em `localStorage` sob `casal-tema` e escreve `data-tema` no elemento raiz. `"sistema"` remove o atributo, devolvendo o controle a `prefers-color-scheme`.
  - `<EscolhaTema />` — três `Etiqueta`, exibida em `/mais`.

- [ ] **Step 1: Escrever o teste**

`web/src/lib/tema.test.tsx`:

```tsx
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProvedorTema, useTema } from "./tema";

function Gatilho() {
  const { tema, escolher } = useTema();
  return (
    <>
      <span data-testid="atual">{tema}</span>
      <button type="button" onClick={() => escolher("escuro")}>escuro</button>
      <button type="button" onClick={() => escolher("claro")}>claro</button>
      <button type="button" onClick={() => escolher("sistema")}>sistema</button>
    </>
  );
}

function montar() {
  return render(
    <ProvedorTema>
      <Gatilho />
    </ProvedorTema>,
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-tema");
});

describe("tema", () => {
  it("começa em sistema, sem atributo na raiz", () => {
    montar();
    expect(screen.getByTestId("atual")).toHaveTextContent("sistema");
    expect(document.documentElement.hasAttribute("data-tema")).toBe(false);
  });

  it("escreve o atributo na raiz ao escolher escuro", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "escuro" }));
    expect(document.documentElement.getAttribute("data-tema")).toBe("escuro");
  });

  it("volta a remover o atributo ao escolher sistema", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "claro" }));
    expect(document.documentElement.getAttribute("data-tema")).toBe("claro");
    await userEvent.click(screen.getByRole("button", { name: "sistema" }));
    expect(document.documentElement.hasAttribute("data-tema")).toBe(false);
  });

  it("persiste a escolha", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "escuro" }));
    expect(localStorage.getItem("casal-tema")).toBe("escuro");
  });

  it("recupera a escolha guardada ao montar", () => {
    localStorage.setItem("casal-tema", "escuro");
    montar();
    expect(screen.getByTestId("atual")).toHaveTextContent("escuro");
    expect(document.documentElement.getAttribute("data-tema")).toBe("escuro");
  });

  it("ignora valor inválido guardado", () => {
    localStorage.setItem("casal-tema", "arco-íris");
    montar();
    expect(screen.getByTestId("atual")).toHaveTextContent("sistema");
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `cd web && npm test -- tema`
Expected: FAIL — importação não resolvida.

- [ ] **Step 3: Implementar**

`web/src/lib/tema.tsx`:

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Tema = "sistema" | "claro" | "escuro";

const CHAVE = "casal-tema";
const VALIDOS: Tema[] = ["sistema", "claro", "escuro"];

function guardado(): Tema {
  try {
    const v = localStorage.getItem(CHAVE);
    return VALIDOS.includes(v as Tema) ? (v as Tema) : "sistema";
  } catch {
    return "sistema";
  }
}

function aplicar(tema: Tema) {
  const raiz = document.documentElement;
  if (tema === "sistema") raiz.removeAttribute("data-tema");
  else raiz.setAttribute("data-tema", tema);
}

const Ctx = createContext<{ tema: Tema; escolher: (t: Tema) => void } | null>(null);

export function useTema() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTema fora do provedor");
  return v;
}

export function ProvedorTema({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(() =>
    typeof window === "undefined" ? "sistema" : guardado(),
  );

  useEffect(() => {
    aplicar(tema);
  }, [tema]);

  const escolher = useCallback((t: Tema) => {
    setTema(t);
    try {
      localStorage.setItem(CHAVE, t);
    } catch {
      // navegador com armazenamento bloqueado: a escolha vale só nesta sessão
    }
  }, []);

  return <Ctx.Provider value={{ tema, escolher }}>{children}</Ctx.Provider>;
}
```

- [ ] **Step 4: Rodar e verificar que passa**

Run: `cd web && npm test -- tema`
Expected: PASS, 6 testes.

- [ ] **Step 5: Criar o controle e ligar à raiz**

`web/src/components/ui/EscolhaTema.tsx`:

```tsx
"use client";

import { useTema, type Tema } from "@/lib/tema";
import { Etiqueta } from "./Etiqueta";
import { Rotulo } from "./Rotulo";

const OPCOES: { valor: Tema; nome: string }[] = [
  { valor: "sistema", nome: "Sistema" },
  { valor: "claro", nome: "Claro" },
  { valor: "escuro", nome: "Escuro" },
];

export function EscolhaTema() {
  const { tema, escolher } = useTema();
  return (
    <div>
      <Rotulo>tema</Rotulo>
      <div className="mt-2 flex gap-2">
        {OPCOES.map((o) => (
          <Etiqueta key={o.valor} ativa={tema === o.valor} aoClicar={() => escolher(o.valor)}>
            {o.nome}
          </Etiqueta>
        ))}
      </div>
    </div>
  );
}
```

Em `web/src/app/layout.tsx`, envolver o corpo com o provedor, e evitar o piscar de tema na primeira pintura com um script que roda antes da hidratação:

```tsx
<head>
  {/* … os preloads da tarefa 3 … */}
  <script
    dangerouslySetInnerHTML={{
      __html: `try{var t=localStorage.getItem("casal-tema");if(t==="claro"||t==="escuro")document.documentElement.setAttribute("data-tema",t)}catch(e){}`,
    }}
  />
</head>
<body>
  <ProvedorTema>{children}</ProvedorTema>
</body>
```

Em `web/src/components/telas/Mais.tsx`, inserir `<EscolhaTema />` entre o bloco da conta e a lista de carteiras e contas.

- [ ] **Step 6: Conferir cada tela no escuro**

Run: `cd web && npm run dev`

Em `/mais`, escolha Escuro. Depois percorra `/mes`, `/lancar`, `/cartoes`, um detalhe de cartão, uma tela de pagar, `/mais/contas`, `/mais/carteiras`, `/metas` e `/entrar`. Em cada uma, confirme: nenhum texto invisível, nenhuma borda que desaparece, nenhuma superfície branca sobrando. Onde houver, o defeito é uma cor literal esquecida — a tarefa 20 tem o script que acha todas.

- [ ] **Step 7: Commit**

```bash
git add web/src/lib/tema.tsx web/src/lib/tema.test.tsx \
  web/src/components/ui/EscolhaTema.tsx web/src/app/layout.tsx \
  web/src/components/telas/Mais.tsx
git commit -m "feat(design): tema escuro com escolha persistida"
```

---

### Task 18: Layout responsivo e fim da moldura de telefone

Hoje o desktop mostra um iPhone de 430px num vazio preto, com `overflow: hidden` no corpo do documento. Esta tarefa apaga a moldura e cria as três faixas da seção 13 da spec.

**Files:**
- Modify: `web/src/app/globals.css`
- Modify: `web/src/app/(app)/layout.tsx`
- Modify: `web/src/components/ui/Navegacao.tsx`
- Test: `web/src/components/ui/Navegacao.test.tsx`

**Interfaces:**
- Consumes: `Navegacao` da tarefa 7; `Assinatura` da tarefa 5.
- Produces: até 639px, uma coluna com abas embaixo; de 640 a 1023px, coluna centralizada de 560px com abas embaixo; a partir de 1024px, trilho de navegação de 220px à esquerda com a assinatura no topo e conteúdo de 640px. A rolagem passa a ser do documento.

- [ ] **Step 1: Acrescentar o teste do trilho**

Ao fim de `web/src/components/ui/Navegacao.test.tsx`, dentro de um novo `describe`:

```tsx
describe("Navegacao — trilho de desktop", () => {
  it("traz a assinatura da marca, que não existe nas abas", () => {
    caminho.atual = "/mes";
    render(<Navegacao />);
    expect(screen.getByRole("img", { name: "casal" })).toBeInTheDocument();
  });

  it("mantém um único conjunto de destinos, sem duplicar para leitor de tela", () => {
    caminho.atual = "/mes";
    render(<Navegacao />);
    expect(screen.getAllByRole("link", { name: "mês" })).toHaveLength(1);
  });
});
```

O segundo teste existe para impedir a solução preguiçosa: renderizar dois conjuntos de links e esconder um com `hidden` do CSS entrega navegação duplicada a quem usa leitor de tela.

- [ ] **Step 2: Rodar e verificar que falha**

Run: `cd web && npm test -- Navegacao`
Expected: FAIL no primeiro teste novo — a assinatura ainda não está lá.

- [ ] **Step 3: Reescrever globals.css**

`web/src/app/globals.css` inteiro. Sai `overflow: hidden`, saem `.casal-shell`, `.casal-phone`, `.casal-fab`, `.casal-tabbar` e as medidas `--tab-*`; entra a rolagem do documento:

```css
@import "tailwindcss";
@import "../design/tokens.css";
@import "../design/fontes.css";

html,
body {
  margin: 0;
  min-height: 100dvh;
  background: var(--ar);
  color: var(--grafite);
  font-family: var(--font-texto);
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior-y: none;
}

* {
  box-sizing: border-box;
}

button,
input,
select {
  font: inherit;
  color: inherit;
}

:focus-visible {
  outline: 2px solid var(--grafite);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 4: Reescrever a casca**

`web/src/app/(app)/layout.tsx`. O `md:` cobre a faixa do meio e o `lg:` o desktop:

```tsx
import { Providers } from "@/components/Providers";
import { ProvedorAviso } from "@/components/ui/Aviso";
import { Navegacao } from "@/components/ui/Navegacao";

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <ProvedorAviso>
        <div className="lg:flex lg:justify-center">
          <Navegacao />
          <main className="mx-auto w-full max-w-[560px] pb-[132px] lg:mx-0 lg:max-w-[640px] lg:pb-12">
            {children}
          </main>
        </div>
      </ProvedorAviso>
    </Providers>
  );
}
```

O `pb-[132px]` reserva o espaço das abas e da ação de lançar nas duas faixas menores; a partir de `lg` a navegação sai do rodapé e o espaço volta a ser de conteúdo.

- [ ] **Step 5: Reescrever a navegação**

`web/src/components/ui/Navegacao.tsx`. Um único conjunto de links, com o contêiner mudando de forma por faixa:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconeAba } from "../Icones";
import { Assinatura } from "../marca/Assinatura";

const DESTINOS = [
  { href: "/mes", nome: "mês", icone: "inicio" },
  { href: "/cartoes", nome: "cartões", icone: "cartoes" },
  { href: "/metas", nome: "metas", icone: "metas" },
  { href: "/mais", nome: "mais", icone: "mais" },
] as const;

function ativa(caminho: string, href: string): boolean {
  return caminho === href || caminho.startsWith(`${href}/`);
}

export function Navegacao() {
  const caminho = usePathname();

  return (
    <nav
      aria-label="Seções"
      className={
        // até lg: barra fixa no rodapé. de lg em diante: trilho à esquerda.
        "fixed inset-x-0 bottom-0 z-20 flex items-stretch border-t border-nevoa bg-ar " +
        "pb-[env(safe-area-inset-bottom)] " +
        "lg:static lg:h-dvh lg:w-[220px] lg:shrink-0 lg:flex-col lg:items-stretch " +
        "lg:border-r lg:border-t-0 lg:px-4 lg:pt-8 lg:pb-0"
      }
    >
      <div className="hidden lg:mb-10 lg:block lg:px-2">
        <Assinatura variante="base" largura={112} />
      </div>

      {DESTINOS.map((d) => {
        const atual = ativa(caminho, d.href);
        return (
          <Link
            key={d.href}
            href={d.href}
            aria-current={atual ? "page" : undefined}
            className={
              "flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 text-[10px] " +
              "lg:min-h-[44px] lg:flex-none lg:flex-row lg:justify-start lg:gap-3 lg:rounded-controle lg:px-3 lg:text-[14px] " +
              (atual ? "text-grafite lg:bg-nevoa" : "text-cinza")
            }
          >
            <span aria-hidden>
              <IconeAba nome={d.icone} />
            </span>
            <span className={atual ? "font-semibold" : undefined}>{d.nome}</span>
          </Link>
        );
      })}

      <Link
        href="/lancar"
        aria-label="Novo lançamento"
        className={
          "absolute left-1/2 -translate-x-1/2 -top-[68px] flex h-[52px] w-[52px] items-center justify-center " +
          "rounded-etiqueta bg-grafite text-[24px] text-ar shadow-elevacao " +
          "lg:static lg:mt-auto lg:mb-8 lg:h-[44px] lg:w-full lg:translate-x-0 lg:rounded-controle lg:text-[14px] lg:font-semibold lg:shadow-none"
        }
      >
        <span aria-hidden className="lg:hidden">+</span>
        <span className="hidden lg:inline">Novo gasto</span>
      </Link>
    </nav>
  );
}
```

A ação de lançar troca de forma por faixa: círculo no polegar até `lg`, botão com texto no trilho a partir dali. É o mesmo link, com um só rótulo acessível.

- [ ] **Step 6: Rodar e verificar que passa**

Run: `cd web && npm test -- Navegacao && npx tsc --noEmit && npm run build`
Expected: PASS, 6 testes; sem erro de tipo; build limpo.

- [ ] **Step 7: Conferir as quatro larguras**

Run: `cd web && npm run dev`

Em cada largura, confirme que não há rolagem horizontal e nada cortado:

| Largura | O que esperar |
|---|---|
| 320px | uma coluna, abas embaixo, ação de lançar alcançável |
| 390px | idem |
| 768px | coluna centralizada de 560px, abas embaixo |
| 1440px | trilho à esquerda com a assinatura, conteúdo de 640px, sem moldura preta |

- [ ] **Step 8: Commit**

```bash
git add web/src/app/globals.css web/src/app/(app)/layout.tsx \
  web/src/components/ui/Navegacao.tsx web/src/components/ui/Navegacao.test.tsx
git commit -m "feat(web): tres faixas responsivas e fim da moldura de telefone"
```

---

### Task 19: Varredura de acessibilidade

Os requisitos 1, 2, 3, 4, 5 e 9 da seção 12 já foram cumpridos nas tarefas anteriores — paleta, zoom, anel de foco global, alvos de 44px, `aria-current` e `prefers-reduced-motion`. Esta tarefa fecha os que sobraram: ordem de foco no formulário de valor e teclado do computador percorrendo tudo.

**Files:**
- Modify: `web/src/components/telas/Lancar.tsx`
- Modify: `web/src/components/telas/CartaoForm.tsx`
- Modify: `web/src/components/telas/PagarFatura.tsx`
- Modify: `web/src/components/telas/ContaForm.tsx`
- Test: `web/src/components/telas/Lancar.a11y.test.tsx`

**Interfaces:**
- Consumes: `Teclado` da tarefa 11.
- Produces: em telas de valor, um campo de número focável recebe o foco ao abrir, o teclado na tela deixa de ser a única entrada, e a ordem de foco segue a ordem visual.

- [ ] **Step 1: Escrever o teste**

`web/src/components/telas/Lancar.a11y.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Lancar } from "./Lancar";
import { ProvedorAviso } from "../ui/Aviso";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const loja = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock("@/lib/store", async (original) => {
  const real = await original<typeof import("@/lib/store")>();
  return { ...real, useLoja: () => loja.valor };
});

function montar() {
  loja.valor = { cartoes: [], lancar: vi.fn() };
  return render(
    <ProvedorAviso>
      <Lancar />
    </ProvedorAviso>,
  );
}

describe("Lancar — acessibilidade", () => {
  it("anuncia o valor como campo, não só como texto decorativo", () => {
    montar();
    expect(screen.getByRole("status", { name: /valor/i })).toBeInTheDocument();
  });

  it("chega ao salvar percorrendo com Tab, sem ponteiro", async () => {
    montar();
    await userEvent.keyboard("1000");
    const salvar = screen.getByRole("button", { name: "Salvar" });
    for (let i = 0; i < 40 && document.activeElement !== salvar; i++) {
      await userEvent.tab();
    }
    expect(document.activeElement).toBe(salvar);
  });

  it("dá rótulo acessível a cada tecla, inclusive as de símbolo", () => {
    montar();
    expect(screen.getByRole("button", { name: "Apagar último dígito" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mais opções" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `cd web && npm test -- a11y`
Expected: FAIL no primeiro teste — o valor hoje é texto sem papel nem nome.

- [ ] **Step 3: Dar papel e nome ao valor**

Em `web/src/components/telas/Lancar.tsx`, envolver o número herói:

```tsx
      <div
        className="px-4 pt-6 text-center"
        role="status"
        aria-live="polite"
        aria-label="Valor do gasto"
      >
        <Numero centavos={entrada.centavos} tamanho="heroi" subordinaCentavos />
      </div>
```

Aplicar o mesmo tratamento ao número herói de `PagarFatura.tsx` (`aria-label="Valor do pagamento"`), ao limite em `CartaoForm.tsx` (`aria-label="Limite do cartão"`) e ao saldo inicial em `ContaForm.tsx` (`aria-label="Saldo inicial"`). Sem isso, quem usa leitor de tela digita no teclado numérico e não ouve o número mudar.

- [ ] **Step 4: Rodar e verificar que passa**

Run: `cd web && npm test -- a11y`
Expected: PASS, 3 testes.

- [ ] **Step 5: Conferir com o teclado, na aplicação de verdade**

Run: `cd web && npm run dev`

Sem tocar no ponteiro em nenhum momento:

- [ ] `/mes` — percorrer com Tab; o anel de foco aparece em cada parada
- [ ] chegar a `/lancar` pela navegação, digitar `2149`, apertar Enter, e confirmar que o gasto foi gravado
- [ ] `/cartoes/novo` — preencher os quatro campos, ajustar os dias com as setas, salvar
- [ ] `/mais/carteiras` — colar um código e enviar
- [ ] em qualquer tela com `Teclado`, apertar Escape e confirmar que volta

- [ ] **Step 6: Commit**

```bash
git add web/src/components/telas
git commit -m "fix(a11y): valor anunciado por leitor de tela e ordem de foco"
```

---

### Task 20: Portões de verificação

Fecha o plano. Transforma os itens automatizáveis da seção 17 da spec em comandos que falham sozinhos.

**Files:**
- Create: `web/scripts/sem-cor-literal.mjs`
- Modify: `web/package.json`
- Create: `docs/superpowers/verificacao-visual.md`

**Interfaces:**
- Consumes: tudo.
- Produces: `npm run verificar` — encadeia tipos, lint, testes e o portão de cor literal. Um comando, e ele é o critério de pronto.

- [ ] **Step 1: Escrever o portão de cor literal**

`web/scripts/sem-cor-literal.mjs`. `src/lib/` fica fora da varredura porque `CORES_CARTAO` e as cores de categoria em `domain.ts` são dados escolhidos pelo usuário, não decisão de estilo:

```js
import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const RAIZES = ["src/app", "src/components"];
const EXTENSOES = new Set([".ts", ".tsx", ".css"]);
const COR = /#[0-9a-fA-F]{3,8}\b/g;

// O único arquivo autorizado a conter cor literal.
const PERMITIDOS = new Set(["src/design/tokens.css"]);

async function arquivos(dir) {
  const achados = [];
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    const caminho = join(dir, entrada.name);
    if (entrada.isDirectory()) achados.push(...(await arquivos(caminho)));
    else if (EXTENSOES.has(extname(entrada.name))) achados.push(caminho);
  }
  return achados;
}

const faltas = [];
for (const raiz of RAIZES) {
  for (const caminho of await arquivos(raiz)) {
    if (PERMITIDOS.has(caminho)) continue;
    const texto = await readFile(caminho, "utf8");
    texto.split("\n").forEach((linha, i) => {
      for (const achado of linha.matchAll(COR)) {
        faltas.push(`${caminho}:${i + 1}  ${achado[0]}  ${linha.trim()}`);
      }
    });
  }
}

if (faltas.length > 0) {
  console.error(
    `\nCor literal fora dos tokens (${faltas.length}):\n\n${faltas.join("\n")}\n\n` +
      "Toda cor vem de src/design/tokens.css. Use os utilitários bg-ar, " +
      "text-grafite, text-cinza, border-nevoa, bg-ambar, text-ambar-texto.\n",
  );
  process.exit(1);
}

console.log("nenhuma cor literal em src/app e src/components");
```

- [ ] **Step 2: Rodar e verificar que o portão encontra algo**

Run: `cd web && node scripts/sem-cor-literal.mjs`

Expected: uma de duas coisas. Se listar faltas, corrija cada linha apontada trocando o valor pelo utilitário do token, e rode de novo até passar. Se já disser `nenhuma cor literal`, o portão está satisfeito — confirme que ele funciona introduzindo `color: #ff0000` numa linha de qualquer componente, rodando o script, vendo a falha, e desfazendo.

- [ ] **Step 3: Encadear os portões**

Em `web/package.json`, dentro de `"scripts"`:

```json
"verificar": "npm run cores && tsc --noEmit && next lint && vitest run",
"cores": "node scripts/sem-cor-literal.mjs"
```

- [ ] **Step 4: Rodar o portão completo**

Run: `cd web && npm run verificar`
Expected: os quatro passos passam em sequência. Este comando é o critério de pronto de qualquer mudança de interface daqui para frente.

- [ ] **Step 5: Escrever a lista do que não dá para automatizar**

`docs/superpowers/verificacao-visual.md`:

```markdown
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
```

- [ ] **Step 6: Commit**

```bash
git add web/scripts/sem-cor-literal.mjs web/package.json \
  docs/superpowers/verificacao-visual.md
git commit -m "test(web): portao de cor literal e comando unico de verificacao"
```

---

### Task 21: Lançamento como folha, com foco preso

A seção 14 da spec pede: `/lancar` apresentado como folha sobre a tela anterior quando há histórico, e como tela cheia quando é entrada direta. A tarefa 14 entregou só a tela cheia. Esta fecha a lacuna, e com ela o requisito 6 da seção 12 — sobreposição prende o foco e devolve ao elemento de origem ao fechar.

Rotas paralelas e interceptadas do App Router fazem exatamente isso: a mesma URL renderiza a folha quando a navegação é interna e a página inteira quando o carregamento é direto.

**Files:**
- Create: `web/src/app/(app)/@folha/default.tsx`
- Create: `web/src/app/(app)/@folha/(.)lancar/page.tsx`
- Create: `web/src/components/ui/Folha.tsx`
- Test: `web/src/components/ui/Folha.test.tsx`
- Modify: `web/src/app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `Lancar` da tarefa 14.
- Produces: `<Folha aoFechar={fn}>…</Folha>` — sobreposição que prende o foco enquanto está aberta, fecha com Escape e com clique fora, e devolve o foco ao elemento que a abriu. Respeita `prefers-reduced-motion`, já garantido globalmente na tarefa 18.

- [ ] **Step 1: Escrever o teste**

`web/src/components/ui/Folha.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Folha } from "./Folha";

function Cena({ aoFechar }: { aoFechar: () => void }) {
  return (
    <>
      <button type="button">origem</button>
      <Folha aoFechar={aoFechar}>
        <button type="button">primeiro</button>
        <button type="button">último</button>
      </Folha>
    </>
  );
}

describe("Folha", () => {
  it("anuncia como diálogo modal", () => {
    render(<Cena aoFechar={() => {}} />);
    const folha = screen.getByRole("dialog");
    expect(folha).toHaveAttribute("aria-modal", "true");
  });

  it("põe o foco no primeiro focável ao abrir", () => {
    render(<Cena aoFechar={() => {}} />);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "primeiro" }),
    );
  });

  it("prende o foco: do último, Tab volta ao primeiro", async () => {
    render(<Cena aoFechar={() => {}} />);
    const primeiro = screen.getByRole("button", { name: "primeiro" });
    const ultimo = screen.getByRole("button", { name: "último" });
    ultimo.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(primeiro);
  });

  it("prende o foco para trás: do primeiro, Shift+Tab vai ao último", async () => {
    render(<Cena aoFechar={() => {}} />);
    const ultimo = screen.getByRole("button", { name: "último" });
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(ultimo);
  });

  it("nunca deixa o foco alcançar a tela de baixo", async () => {
    render(<Cena aoFechar={() => {}} />);
    const origem = screen.getByRole("button", { name: "origem" });
    for (let i = 0; i < 6; i++) await userEvent.tab();
    expect(document.activeElement).not.toBe(origem);
  });

  it("fecha com Escape", async () => {
    const aoFechar = vi.fn();
    render(<Cena aoFechar={aoFechar} />);
    await userEvent.keyboard("{Escape}");
    expect(aoFechar).toHaveBeenCalledOnce();
  });

  it("fecha ao clicar fora", async () => {
    const aoFechar = vi.fn();
    render(<Cena aoFechar={aoFechar} />);
    await userEvent.click(screen.getByTestId("folha-fundo"));
    expect(aoFechar).toHaveBeenCalledOnce();
  });

  it("não fecha ao clicar dentro", async () => {
    const aoFechar = vi.fn();
    render(<Cena aoFechar={aoFechar} />);
    await userEvent.click(screen.getByRole("button", { name: "primeiro" }));
    expect(aoFechar).not.toHaveBeenCalled();
  });

  it("devolve o foco ao elemento de origem ao desmontar", () => {
    render(<Cena aoFechar={() => {}} />);
    const origem = screen.getByRole("button", { name: "origem" });
    origem.focus();
    const { unmount } = render(<Folha aoFechar={() => {}}>
      <button type="button">dentro</button>
    </Folha>);
    unmount();
    expect(document.activeElement).toBe(origem);
  });
});
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `cd web && npm test -- Folha`
Expected: FAIL — importação não resolvida.

- [ ] **Step 3: Implementar**

`web/src/components/ui/Folha.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Sobreposição que prende o foco enquanto está aberta e devolve ao
 * elemento de origem ao fechar — requisito 6 da seção 12 da spec.
 */
export function Folha({
  aoFechar,
  children,
}: {
  aoFechar: () => void;
  children: React.ReactNode;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const origem = useRef<Element | null>(null);

  useEffect(() => {
    origem.current = document.activeElement;
    const primeiro = caixa.current?.querySelector<HTMLElement>(FOCAVEIS);
    primeiro?.focus();
    return () => {
      if (origem.current instanceof HTMLElement) origem.current.focus();
    };
  }, []);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        aoFechar();
        return;
      }
      if (e.key !== "Tab" || !caixa.current) return;

      const focaveis = [...caixa.current.querySelectorAll<HTMLElement>(FOCAVEIS)];
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const atual = document.activeElement;

      if (e.shiftKey && (atual === primeiro || !caixa.current.contains(atual))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && atual === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <div
        data-testid="folha-fundo"
        aria-hidden
        onClick={aoFechar}
        className="absolute inset-0 bg-grafite/40"
      />
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-label="Novo gasto"
        className="relative flex max-h-[92dvh] w-full max-w-[430px] flex-col overflow-y-auto rounded-t-[22px] bg-ar shadow-elevacao sm:rounded-[22px]"
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e verificar que passa**

Run: `cd web && npm test -- Folha`
Expected: PASS, 9 testes.

- [ ] **Step 5: Criar a rota paralela e a interceptada**

`web/src/app/(app)/@folha/default.tsx` — o que a fenda renderiza quando nenhuma folha está aberta:

```tsx
export default function SemFolha() {
  return null;
}
```

`web/src/app/(app)/@folha/(.)lancar/page.tsx` — o `(.)` intercepta a navegação interna para `/lancar` no mesmo nível de rota:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Folha } from "@/components/ui/Folha";
import { Lancar } from "@/components/telas/Lancar";

export default function FolhaLancar() {
  const router = useRouter();
  return (
    <Folha aoFechar={() => router.back()}>
      <Lancar />
    </Folha>
  );
}
```

`web/src/app/(app)/lancar/page.tsx` continua como está, e passa a servir só a entrada direta — abrir a URL, recarregar, ou chegar por link externo.

- [ ] **Step 6: Abrir a fenda no layout**

`web/src/app/(app)/layout.tsx` recebe a fenda como segunda propriedade:

```tsx
import { Providers } from "@/components/Providers";
import { ProvedorAviso } from "@/components/ui/Aviso";
import { Navegacao } from "@/components/ui/Navegacao";

export default function LayoutApp({
  children,
  folha,
}: {
  children: React.ReactNode;
  folha: React.ReactNode;
}) {
  return (
    <Providers>
      <ProvedorAviso>
        <div className="lg:flex lg:justify-center">
          <Navegacao />
          <main className="mx-auto w-full max-w-[560px] pb-[132px] lg:mx-0 lg:max-w-[640px] lg:pb-12">
            {children}
          </main>
        </div>
        {folha}
      </ProvedorAviso>
    </Providers>
  );
}
```

- [ ] **Step 7: Ajustar o fechar do Lancar**

Em `web/src/components/telas/Lancar.tsx`, o `voltar` hoje faz `router.push("/mes")`, o que na folha empurraria uma entrada nova no histórico em vez de fechar. Troque por:

```tsx
  const voltar = () => router.back();
```

Na entrada direta em `/lancar` sem histórico anterior, `router.back()` não tem para onde ir. Trate o caso:

```tsx
  const voltar = () => {
    if (window.history.length > 1) router.back();
    else router.push("/mes");
  };
```

- [ ] **Step 8: Verificar as duas apresentações**

Run: `cd web && npm run verificar && npm run dev`

- [ ] navegar de `/mes` para lançar pelo botão: abre como folha sobre a tela do mês, que continua visível atrás
- [ ] Escape fecha a folha e o foco volta ao botão de lançar
- [ ] Tab dentro da folha nunca alcança as abas nem o conteúdo de baixo
- [ ] com a folha aberta, o botão voltar do navegador a fecha
- [ ] abrir `http://localhost:3000/lancar` direto: aparece como tela cheia, sem sobreposição
- [ ] recarregar com a folha aberta: vira tela cheia, e fechar leva a `/mes`

- [ ] **Step 9: Commit**

```bash
git add web/src/app/(app) web/src/components/ui/Folha.tsx \
  web/src/components/ui/Folha.test.tsx web/src/components/telas/Lancar.tsx
git commit -m "feat(web): lancamento como folha com foco preso e devolvido"
```

---

## Cobertura da spec

| Seção da spec | Onde é implementada |
|---|---|
| 5 · Nome e voz | Tarefas 6, 16 — nome nos ativos e na assinatura; voz aplicada nos textos das tarefas 12 a 16 |
| 6 · Símbolo, três faixas | Tarefa 4 |
| 6 · Assinatura lockup B | Tarefa 5 |
| 6 · Área de respiro, uso indevido | Tarefa 5 — construção derivada da largura |
| 7 · Marca viva | Tarefa 4 (`yFundo`, `corDaMarca`) e tarefa 12 (marca no cabeçalho) |
| 7 · Favicon | Tarefa 6 |
| 8 · Cor, dois âmbares | Tarefa 2 |
| 8 · Tema escuro | Tarefas 2 (tokens) e 17 (escolha) |
| 8 · Proibição de gradiente e sombra | Tarefas 12, 13 (testes que buscam `gradient`) e 20 (portão) |
| 9 · Tipografia e escala | Tarefas 3 e 8 |
| 10 · Espaço, raios, trilha | Tarefas 2 e 9 |
| 11 · Os catorze componentes | Tarefas 7 a 11 |
| 12 · Acessibilidade | Tarefas 6 (zoom), 10 (campo e aviso), 18 (foco global, movimento), 19 (varredura), 21 (foco preso em sobreposição) |
| 13 · Responsividade | Tarefa 18 |
| 14 · Rotas | Tarefas 7, 12, 13, 14, 15, 16 |
| 14 · `/lancar` como folha | Tarefa 21 |
| 15 · Estrutura de arquivos | Tarefas 7 a 16 |
| 16 · Ativos | Tarefas 3 e 6 |
| 17 · Verificação | Tarefa 20 |
| 18 · Fora deste ciclo | Não implementado aqui, por decisão registrada |
