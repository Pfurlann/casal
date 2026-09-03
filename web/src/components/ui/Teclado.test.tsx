import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Teclado } from "./Teclado";

describe("Teclado — ponteiro", () => {
  it("relata o dígito tocado", async () => {
    const aoDigitar = vi.fn();
    render(<Teclado aoDigitar={aoDigitar} aoApagar={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "7" }));
    expect(aoDigitar).toHaveBeenCalledWith(7);
  });

  it("apaga pelo botão", async () => {
    const aoApagar = vi.fn();
    render(<Teclado aoDigitar={() => {}} aoApagar={aoApagar} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Apagar último dígito" }),
    );
    expect(aoApagar).toHaveBeenCalledOnce();
  });

  it("respeita o alvo mínimo em cada tecla", () => {
    render(<Teclado aoDigitar={() => {}} aoApagar={() => {}} />);
    for (const n of ["0", "5", "9"]) {
      expect(screen.getByRole("button", { name: n }).className).toContain(
        "min-h-[44px]",
      );
    }
  });

  it("alterna o sinal pelo botão +/−", async () => {
    const aoAlternarSinal = vi.fn();
    render(
      <Teclado
        aoDigitar={() => {}}
        aoApagar={() => {}}
        aoAlternarSinal={aoAlternarSinal}
      />,
    );
    const tecla = screen.getByRole("button", { name: "Alternar sinal do saldo" });
    expect(tecla.className).toContain("min-h-[44px]");
    await userEvent.click(tecla);
    expect(aoAlternarSinal).toHaveBeenCalledOnce();
  });
});

describe("Teclado — teclado físico", () => {
  it("aceita dígito digitado", async () => {
    const aoDigitar = vi.fn();
    render(<Teclado aoDigitar={aoDigitar} aoApagar={() => {}} />);
    await userEvent.keyboard("4");
    expect(aoDigitar).toHaveBeenCalledWith(4);
  });

  it("aceita Backspace", async () => {
    const aoApagar = vi.fn();
    render(<Teclado aoDigitar={() => {}} aoApagar={aoApagar} />);
    await userEvent.keyboard("{Backspace}");
    expect(aoApagar).toHaveBeenCalledOnce();
  });

  it("salva com Enter quando pode salvar", async () => {
    const aoSalvar = vi.fn();
    render(
      <Teclado
        aoDigitar={() => {}}
        aoApagar={() => {}}
        aoSalvar={aoSalvar}
        podeSalvar
        mostraSalvar
      />,
    );
    await userEvent.keyboard("{Enter}");
    expect(aoSalvar).toHaveBeenCalledOnce();
  });

  it("não salva com Enter quando não pode salvar", async () => {
    const aoSalvar = vi.fn();
    render(
      <Teclado
        aoDigitar={() => {}}
        aoApagar={() => {}}
        aoSalvar={aoSalvar}
        podeSalvar={false}
        mostraSalvar
      />,
    );
    await userEvent.keyboard("{Enter}");
    expect(aoSalvar).not.toHaveBeenCalled();
  });

  it("fecha com Escape", async () => {
    const aoFechar = vi.fn();
    render(
      <Teclado aoDigitar={() => {}} aoApagar={() => {}} aoFechar={aoFechar} />,
    );
    await userEvent.keyboard("{Escape}");
    expect(aoFechar).toHaveBeenCalledOnce();
  });

  it("alterna o sinal com o hífen", async () => {
    const aoAlternarSinal = vi.fn();
    render(
      <Teclado
        aoDigitar={() => {}}
        aoApagar={() => {}}
        aoAlternarSinal={aoAlternarSinal}
      />,
    );
    await userEvent.keyboard("-");
    expect(aoAlternarSinal).toHaveBeenCalledOnce();
  });

  it("ignora letra", async () => {
    const aoDigitar = vi.fn();
    render(<Teclado aoDigitar={aoDigitar} aoApagar={() => {}} />);
    await userEvent.keyboard("k");
    expect(aoDigitar).not.toHaveBeenCalled();
  });

  it("não rouba o teclado de um campo de texto em foco", async () => {
    const aoDigitar = vi.fn();
    render(
      <>
        <input aria-label="descrição" />
        <Teclado aoDigitar={aoDigitar} aoApagar={() => {}} />
      </>,
    );
    await userEvent.click(screen.getByLabelText("descrição"));
    await userEvent.keyboard("5");
    expect(aoDigitar).not.toHaveBeenCalled();
    expect(screen.getByLabelText("descrição")).toHaveValue("5");
  });
});
