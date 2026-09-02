import { COR_AR } from "@/design/tema-chrome";

export function ehRotaAuth(pathname: string): boolean {
  return pathname === "/entrar" || pathname.startsWith("/entrar/");
}

/** Roda no <head> antes da pintura: default claro; /entrar nunca herda o escuro. */
export const SCRIPT_BOOTSTRAP_TEMA = `try{var p=location.pathname;var a=p==="/entrar"||p.indexOf("/entrar/")===0;if(a)document.documentElement.setAttribute("data-auth","");var t=localStorage.getItem("casal-tema");if(!a&&t==="escuro")document.documentElement.setAttribute("data-tema","escuro");else if(!a&&t==="sistema")document.documentElement.removeAttribute("data-tema");else document.documentElement.setAttribute("data-tema","claro");if(a||(t!=="escuro"&&t!=="sistema"))document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("content","${COR_AR}")})}catch(e){}`;
