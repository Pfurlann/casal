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
