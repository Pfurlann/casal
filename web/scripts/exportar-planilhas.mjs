// Lê as duas planilhas do casal e grava web/importacao/dados.json (fora do git).
// Uso: node scripts/exportar-planilhas.mjs [pessoal.xlsx] [c03.xlsx]
// O app importa esse JSON na tela do DFCL e aplica src/lib/planilhas.ts.
import ExcelJS from "exceljs";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const raiz = resolve(import.meta.dirname, "..", "..");
const pessoal = process.argv[2] ?? join(raiz, "Orçamento _ Planejamento Pessoal.xlsx");
const c03 = process.argv[3] ?? join(raiz, "Orçamento _ Planejamento_Casal.C03.xlsx");

/** Data válida em ISO; a fórmula "Ano/Mês" do C03 devolve Invalid Date, que vira null. */
const dataIso = (d) => (Number.isNaN(d.getTime()) ? null : d.toISOString());

function valor(celula) {
  const v = celula.value;
  if (v && typeof v === "object" && !(v instanceof Date)) {
    if ("result" in v) return v.result instanceof Date ? dataIso(v.result) : (v.result ?? null);
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    return null;
  }
  return v instanceof Date ? dataIso(v) : v;
}

async function aba(arquivo, nome, colunas) {
  // O Excel trava o arquivo aberto; trabalhar numa cópia.
  const copia = join(tmpdir(), `casal-${Date.now()}-${Math.random().toString(36).slice(2)}.xlsx`);
  copyFileSync(arquivo, copia);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(copia);
  const ws = wb.getWorksheet(nome);
  if (!ws) throw new Error(`Aba "${nome}" não encontrada em ${arquivo}`);
  const cab = [];
  ws.getRow(1).eachCell((c, i) => {
    if (i <= colunas) cab[i] = String(valor(c) ?? "").trim();
  });
  const linhas = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const obj = {};
    let algum = false;
    for (let i = 1; i <= colunas; i++) {
      if (!cab[i]) continue;
      const v = valor(row.getCell(i));
      if (v !== null && v !== "") algum = true;
      obj[cab[i]] = v;
    }
    if (algum) linhas.push(obj);
  });
  return linhas;
}

const dados = {
  gerado_em: new Date().toISOString(),
  realizados: (await aba(pessoal, "Lançamentos - Realizados", 19)).filter((l) => l.Data),
  metas: (await aba(c03, "Lançamentos", 9)).filter((l) => l.Conta),
  config: (await aba(c03, "Configurações", 3)).filter((l) => l["Nome Conta"]),
};

const saida = join(import.meta.dirname, "..", "importacao");
mkdirSync(saida, { recursive: true });
writeFileSync(join(saida, "dados.json"), JSON.stringify(dados));
console.log(
  `realizados: ${dados.realizados.length} · metas: ${dados.metas.length} · contas: ${dados.config.length}\nGravado em ${join(saida, "dados.json")}`,
);
