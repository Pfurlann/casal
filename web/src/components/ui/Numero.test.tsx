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
