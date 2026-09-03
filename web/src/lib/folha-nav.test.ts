import { describe, expect, it, vi } from "vitest";
import { fecharFolha } from "./folha-nav";

describe("fecharFolha", () => {
  it("usa back quando o App Router tem idx > 0", () => {
    const back = vi.fn();
    const replace = vi.fn();
    const estado = window.history.state;
    window.history.replaceState({ idx: 2 }, "");
    fecharFolha({ back, replace });
    expect(back).toHaveBeenCalledOnce();
    expect(replace).not.toHaveBeenCalled();
    window.history.replaceState(estado, "");
  });

  it("cai no fallback quando idx é 0", () => {
    const back = vi.fn();
    const replace = vi.fn();
    const estado = window.history.state;
    window.history.replaceState({ idx: 0 }, "");
    fecharFolha({ back, replace }, "/mes");
    expect(back).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/mes");
    window.history.replaceState(estado, "");
  });
});
