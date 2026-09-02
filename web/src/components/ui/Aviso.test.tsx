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
