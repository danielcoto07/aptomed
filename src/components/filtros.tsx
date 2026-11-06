"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Opcion = { valor: string; etiqueta: string };
type Props = {
  busqueda: string;
  estado: string;
  empresa?: string;
  estados: Opcion[];
  empresas?: Opcion[];
  ayuda: string;
};

const CAMPO = "rounded-md border border-linea bg-papel px-3 py-2 text-[15px] outline-none focus:border-salvia";

// Los filtros viven en la dirección: se puede recargar o compartir la vista.
export function Filtros({ busqueda, estado, empresa = "", estados, empresas = [], ayuda }: Props) {
  const router = useRouter();
  const ruta = usePathname();
  const [v, setV] = useState({ q: busqueda, estado, empresa });
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined);

  function aplicar(nuevo: typeof v) {
    const params = new URLSearchParams();
    for (const [k, valor] of Object.entries(nuevo)) if (valor) params.set(k, valor);
    const consulta = params.toString();
    router.replace(consulta ? `${ruta}?${consulta}` : ruta, { scroll: false });
  }

  function cambiar(campo: keyof typeof v, valor: string) {
    const nuevo = { ...v, [campo]: valor };
    setV(nuevo);
    clearTimeout(espera.current);
    espera.current = setTimeout(() => aplicar(nuevo), campo === "q" ? 250 : 0);
  }

  const activos = v.q || v.estado || v.empresa;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="search"
        value={v.q}
        onChange={(e) => cambiar("q", e.target.value)}
        placeholder={ayuda}
        aria-label={ayuda}
        className={`${CAMPO} min-w-0 flex-1 basis-56`}
      />
      {empresas.length > 1 && (
        <select
          value={v.empresa}
          onChange={(e) => cambiar("empresa", e.target.value)}
          aria-label="Filtrar por empresa"
          className={`${CAMPO} min-w-0`}
        >
          <option value="">Todas las empresas</option>
          {empresas.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.etiqueta}
            </option>
          ))}
        </select>
      )}
      <select
        value={v.estado}
        onChange={(e) => cambiar("estado", e.target.value)}
        aria-label="Filtrar por estado"
        className={`${CAMPO} min-w-0`}
      >
        <option value="">Todos los estados</option>
        {estados.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
      {activos && (
        <button
          type="button"
          onClick={() => {
            const limpio = { q: "", estado: "", empresa: "" };
            setV(limpio);
            clearTimeout(espera.current);
            aplicar(limpio);
          }}
          className="text-sm text-tinta-suave underline underline-offset-4"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}
