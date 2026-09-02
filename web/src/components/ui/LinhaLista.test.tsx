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
