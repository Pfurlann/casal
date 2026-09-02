import { useId } from "react";

export function Campo({
  label,
  value,
  onChange,
  erro,
  placeholder,
  inputMode,
  tipo = "texto",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  erro?: string;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "email";
  tipo?: "texto" | "senha";
  autoComplete?: string;
}) {
  const id = useId();
  const idErro = `${id}-erro`;
  return (
    <div className="mt-3">
      <label htmlFor={id} className="block text-[12px] text-cinza">
        {label}
      </label>
      <input
        id={id}
        type={tipo === "senha" ? "password" : "text"}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete ?? (tipo === "senha" ? "current-password" : undefined)}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : undefined}
        className="mt-1 min-h-[44px] w-full rounded-controle border border-nevoa bg-ar px-3 font-texto text-[16px] text-grafite"
      />
      {erro && (
        <p id={idErro} className="mt-1 text-[12px] text-ambar-texto">
          {erro}
        </p>
      )}
    </div>
  );
}
