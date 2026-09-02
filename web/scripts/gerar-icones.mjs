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
