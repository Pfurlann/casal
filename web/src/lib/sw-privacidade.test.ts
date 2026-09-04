import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

describe("service worker — privacidade offline", () => {
  const sw = readFileSync(join(__dirname, "../../public/sw.js"), "utf8");

  it("preacheia shell e recusa cache de API/Supabase", () => {
    expect(sw).toMatch(/casal-v51-shell/);
    expect(sw).toMatch(/cache\.addAll\(SHELL\)/);
    expect(sw).toMatch(/ePedidoSensivel/);
    expect(sw).toMatch(/supabase/);
    expect(sw).toMatch(/\/api/);
  });

  it("não intercepta métodos além de GET", () => {
    expect(sw).toMatch(/method !== "GET"/);
  });
});
