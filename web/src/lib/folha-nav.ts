/** Router mínimo para demitir rota interceptada (@folha). */
export type RouterFolha = {
  back: () => void;
  replace: (href: string) => void;
};

/**
 * Fecha folha de rota interceptada.
 * Soft `push`/`replace` a partir de @folha/(.)… pode deixar o slot montado no
 * mobile/PWA — `back` restaura children + folha juntos. Sem histórico no app,
 * cai no fallback.
 */
export function fecharFolha(router: RouterFolha, fallback = "/mes") {
  const estado = window.history.state as { idx?: number } | null;
  const podeVoltar =
    typeof estado?.idx === "number" ? estado.idx > 0 : window.history.length > 1;

  if (podeVoltar) {
    router.back();
    return;
  }
  router.replace(fallback);
}
