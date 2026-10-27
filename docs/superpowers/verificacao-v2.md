# V2 (DFCL e Portadores): o que foi feito e o que falta

Branch: `v2-dfcl` (não foi enviada ao GitHub). Design: `specs/2026-10-27-v2-web-dfcl-design.md`. Plano: `plans/2026-10-27-v2-web-dfcl.md`.

## Entregue

- **DFCL previsto x realizado** (`/dfcl`): meses lado a lado com Prev | Real | %, árvore da sua aba DFCL, filtro por pessoa, saldo acumulado. Motor em `src/lib/dfcl.ts`.
- **Saldo por portador** (`/portadores`): saldo de hoje e projetado para 6 meses, por portador, por pessoa e total. Motor em `src/lib/portadores.ts`.
- **Lançamento rápido**: o formulário atual ganhou "de quem é" (Pedro, Daniele, Conjunto, PHF, lembrado no navegador) e sugere categoria e pessoa pela descrição, com base em lançamentos anteriores.
- **Leitura das planilhas**: `node scripts/exportar-planilhas.mjs` gera `web/importacao/dados.json` (fora do git). Na tela do DFCL, "importar planilhas" carrega esse arquivo.
- **Migração SQL** pronta em `web/supabase/migrations/20261027_dfcl_v2.sql`, **não aplicada**.
- Navegação: entram `dfcl` e `portadores`; `metas` sai da barra (rotas e dados continuam).

## Verificação feita

- Testes novos: 48 (motores, planilhas, telas, formulário), mais 2 de navegação ajustados. Todos passam.
- `tsc --noEmit` limpo, ESLint sem erros, `npm run cores` limpo, `npm run build` passou.
- Aceite com as suas planilhas reais: 191 realizados e 322 metas lidos. As saídas previstas de outubro/2026 dão R$ 16.791,00, igual à sua aba DFCL.
- **17 testes antigos falham** em `Cartoes.test.tsx` e `CartaoDetalhe.test.tsx`. Eu não alterei esses arquivos nem o código que eles testam. Os testes fixam datas de setembro de 2026 (`new Date(2026, 8, ...)`), e a data de hoje é 27/10/2026. Não rodei na `main` limpa para provar; a causa é uma dedução minha.

## O que depende de você

1. **Aplicar a migração** em produção, depois de revisar. Sem ela, "de quem é" fica só no navegador de quem lançou e se perde quando o app recarrega os dados do Supabase. O código que grava `pessoa`, `vencimento`, `natureza` e `portador_id` em `persistir.ts` ainda não existe.
2. **As metas e as planilhas importadas ficam no navegador** (localStorage, por usuário). Pedro e Daniele não veem os mesmos dados do DFCL até existir a gravação em `dfcl_metas` e `portadores`.
3. **Conferir os valores do realizado de outubro**: "Financiamento Veiculo - Safra" (R$ 91.698,80) e "Aluguel + Condominio" (R$ 53.384,94) fazem o realizado de saídas passar de R$ 168 mil contra R$ 16,8 mil previstos. Pode ser quitação real ou lançamento errado.
4. **9 contas do realizado não existem no cadastro do C03** (Mercado, Roupas, Barbeiro, Limpeza Casa, Mecânica - Carro, INSS, Rendimentos, Pacote Bancário, Juros Bancários). Entram como Variável. Precisam ser classificadas.
5. Decisões que eu tomei no lugar do Pedro estão em M1 a M17 do design. Vale ler principalmente M10 (parcelas e contas adiantadas) e M11 (fatura sem compras detalhadas).

## Não feito

- Gravar metas, contas e portadores no Supabase (depende da migração).
- Parcelamento "em Nx" para contas sem cartão (o formulário só parcela no cartão, como já era).
- Tela de cadastro de contas do DFCL e de portadores.
- Janela do DFCL com todos os 15 meses da planilha de uma vez (hoje 6 meses com setas).
