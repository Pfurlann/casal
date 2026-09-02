import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProvedorTema } from "@/lib/tema";
import { EscolhaTema } from "./EscolhaTema";

function montar() {
  return render(
    <ProvedorTema>
      <EscolhaTema />
    </ProvedorTema>,
  );
}

describe("EscolhaTema", () => {
  it("mostra as três opções alinhadas na largura do conteúdo", () => {
    montar();
    for (const nome of ["Sistema", "Claro", "Escuro"]) {
      const botao = screen.getByRole("button", { name: nome });
      expect(botao.className).toContain("flex-1");
    }
  });

  it("deixa o rótulo da opção ativa invertido sobre o fundo", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Claro" }));
    const claro = screen.getByRole("button", { name: "Claro" });
    expect(claro).toHaveAttribute("aria-pressed", "true");
    expect(claro.style.color).toBe("var(--ar)");
    expect(claro.style.backgroundColor).toBe("var(--grafite)");
    expect(screen.getByRole("button", { name: "Escuro" }).style.color).toBe(
      "var(--grafite)",
    );
  });
});
