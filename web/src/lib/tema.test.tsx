import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { COR_AR, COR_GRAFITE } from "@/design/tema-chrome";
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

function meta(media: string, content: string) {
  const el = document.createElement("meta");
  el.setAttribute("name", "theme-color");
  el.setAttribute("media", media);
  el.setAttribute("content", content);
  document.head.appendChild(el);
  return el;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-tema");
  document.head.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
  meta("(prefers-color-scheme: light)", COR_AR);
  meta("(prefers-color-scheme: dark)", COR_GRAFITE);
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

  it("força o chrome claro ao escolher claro", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "claro" }));
    const cores = [...document.querySelectorAll('meta[name="theme-color"]')].map((m) =>
      m.getAttribute("content"),
    );
    expect(cores).toEqual([COR_AR, COR_AR]);
  });

  it("força o chrome escuro ao escolher escuro", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "escuro" }));
    const cores = [...document.querySelectorAll('meta[name="theme-color"]')].map((m) =>
      m.getAttribute("content"),
    );
    expect(cores).toEqual([COR_GRAFITE, COR_GRAFITE]);
  });
});
