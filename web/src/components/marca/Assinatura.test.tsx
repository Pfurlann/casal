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
