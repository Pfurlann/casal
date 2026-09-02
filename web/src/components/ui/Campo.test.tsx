import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Campo } from "./Campo";

describe("Campo", () => {
  it("associa o rótulo ao controle", () => {
    render(<Campo label="Apelido" value="" onChange={() => {}} />);
    expect(screen.getByLabelText("Apelido")).toBeInTheDocument();
  });

  it("relata cada tecla digitada", async () => {
    const onChange = vi.fn();
    render(<Campo label="Banco" value="" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Banco"), "Nu");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("liga o erro ao campo e marca como inválido", () => {
    render(
      <Campo label="Banco" value="" onChange={() => {}} erro="Preencha o banco." />,
    );
    const entrada = screen.getByLabelText("Banco");
    expect(entrada).toHaveAttribute("aria-invalid", "true");
    expect(entrada).toHaveAccessibleDescription("Preencha o banco.");
  });

  it("não marca como inválido quando não há erro", () => {
    render(<Campo label="Banco" value="Nubank" onChange={() => {}} />);
    expect(screen.getByLabelText("Banco")).not.toHaveAttribute("aria-invalid");
  });
});
