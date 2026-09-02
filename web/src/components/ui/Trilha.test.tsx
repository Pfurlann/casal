import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Trilha } from "./Trilha";

function proporcoes(container: HTMLElement): number[] {
  const trilha = container.firstElementChild;
  if (!trilha) return [];
  return [...trilha.children].map((d) =>
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
