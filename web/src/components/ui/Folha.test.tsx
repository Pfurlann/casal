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
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(aoFechar).toHaveBeenCalledOnce();
  });

  it("não fecha ao clicar dentro", async () => {
    const aoFechar = vi.fn();
    render(<Cena aoFechar={aoFechar} />);
    await userEvent.click(screen.getByRole("button", { name: "primeiro" }));
    expect(aoFechar).not.toHaveBeenCalled();
  });

  it("no desktop a folha fica coluna centrada (~520), sem layout 860", () => {
    render(<Cena aoFechar={() => {}} />);
    const folha = screen.getByRole("dialog");
    expect(folha.className).toContain("lg:max-w-[520px]");
    expect(folha.className).not.toContain("lg:max-w-[860px]");
    expect(folha.className).toContain("overflow-y-auto");
  });

  it("quando trava, deixa faixa tappable acima da safe-area", () => {
    render(
      <Folha aoFechar={() => {}} trava>
        <button type="button">dentro</button>
      </Folha>,
    );
    const folha = screen.getByRole("dialog");
    expect(folha.className).toContain("overflow-hidden");
    expect(folha.className).toContain("safe-area-inset-top");
    expect(folha.className).toContain("h-[calc(100dvh-max(56px,env(safe-area-inset-top)+24px))]");
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

  it("backdrop tem classe casal-folha-fundo", () => {
    render(<Cena aoFechar={() => {}} />);
    const fundo = screen.getByTestId("folha-fundo");
    expect(fundo.className).toContain("casal-folha-fundo");
  });

  it("caixa do diálogo tem classe casal-folha-caixa", () => {
    render(<Cena aoFechar={() => {}} />);
    const folha = screen.getByRole("dialog");
    expect(folha.className).toContain("casal-folha-caixa");
  });
});
