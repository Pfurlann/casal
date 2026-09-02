import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProvedorTema, useTema } from "./tema";

function Gatilho() {
  const { tema, escolher } = useTema();
  return (
    <>
      <span data-testid="atual">{tema}</span>
      <button type="button" onClick={() => escolher("escuro")}>escuro</button>
      <button type="button" onClick={() => escolher("claro")}>claro</button>
      <button type="button" onClick={() => escolher("sistema")}>sistema</button>
    </>
  );
}

function montar() {
  return render(
    <ProvedorTema>
      <Gatilho />
    </ProvedorTema>,
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-tema");
});

describe("tema", () => {
  it("começa em sistema, sem atributo na raiz", () => {
    montar();
    expect(screen.getByTestId("atual")).toHaveTextContent("sistema");
    expect(document.documentElement.hasAttribute("data-tema")).toBe(false);
  });

  it("escreve o atributo na raiz ao escolher escuro", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "escuro" }));
    expect(document.documentElement.getAttribute("data-tema")).toBe("escuro");
  });

  it("volta a remover o atributo ao escolher sistema", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "claro" }));
    expect(document.documentElement.getAttribute("data-tema")).toBe("claro");
    await userEvent.click(screen.getByRole("button", { name: "sistema" }));
    expect(document.documentElement.hasAttribute("data-tema")).toBe(false);
  });

  it("persiste a escolha", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "escuro" }));
    expect(localStorage.getItem("casal-tema")).toBe("escuro");
  });

  it("recupera a escolha guardada ao montar", () => {
    localStorage.setItem("casal-tema", "escuro");
    montar();
    expect(screen.getByTestId("atual")).toHaveTextContent("escuro");
    expect(document.documentElement.getAttribute("data-tema")).toBe("escuro");
  });

  it("ignora valor inválido guardado", () => {
    localStorage.setItem("casal-tema", "arco-íris");
    montar();
    expect(screen.getByTestId("atual")).toHaveTextContent("sistema");
  });
});
