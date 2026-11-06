"use client";

import { useActionState, useState } from "react";
import { crearOrden, type EstadoOrden } from "./actions";

const inicial: EstadoOrden = { error: null, token: null, nombre: null };
const CAMPO = "w-full rounded-md border border-linea bg-papel px-3 py-2.5 outline-none focus:border-salvia";

export function CopiarEnlace({ token }: { token: string }) {
  const [estado, setEstado] = useState<"listo" | "copiado" | "fallo">("listo");
  const [enlace, setEnlace] = useState("");

  async function copiar() {
    const url = `${window.location.origin}/candidato/${token}`;
    setEnlace(url);
    try {
      await navigator.clipboard.writeText(url);
      setEstado("copiado");
    } catch {
      setEstado("fallo");
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={copiar}
        className="text-sm font-medium text-tinta underline underline-offset-2"
      >
        {estado === "copiado" ? "Enlace copiado" : "Copiar enlace del candidato"}
      </button>
      {estado === "fallo" && (
        <input
          readOnly
          value={enlace}
          aria-label="Enlace del candidato"
          onFocus={(e) => e.target.select()}
          className="w-full rounded-md border border-linea bg-papel px-2 py-1 text-xs"
        />
      )}
    </div>
  );
}

export function NuevaOrden() {
  const [abierta, setAbierta] = useState(false);
  const [estado, accion, creando] = useActionState(crearOrden, inicial);

  if (!abierta) {
    return (
      <button
        type="button"
        onClick={() => setAbierta(true)}
        className="rounded-md bg-tinta px-4 py-2.5 font-medium text-hueso hover:bg-tinta-suave"
      >
        Nueva orden
      </button>
    );
  }

  return (
    <div className="w-full space-y-4 rounded-lg border border-linea bg-papel p-5">
      <h2 className="font-semibold">Nueva orden de preempleo</h2>
      <form action={accion} className="grid gap-4 md:grid-cols-3">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Nombre del candidato</span>
          <input name="nombre" required maxLength={120} className={CAMPO} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Cédula</span>
          <input name="cedula" required maxLength={30} className={CAMPO} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Puesto</span>
          <input name="puesto" required maxLength={120} className={CAMPO} />
        </label>
        <div className="flex items-center gap-4 md:col-span-3">
          <button
            type="submit"
            disabled={creando}
            className="rounded-md bg-tinta px-4 py-2.5 font-medium text-hueso hover:bg-tinta-suave disabled:opacity-60"
          >
            {creando ? "Creando…" : "Crear orden"}
          </button>
          <button type="button" onClick={() => setAbierta(false)} className="text-sm text-tinta-suave">
            Cerrar
          </button>
        </div>
      </form>
      {estado.error && (
        <p role="alert" className="rounded-md bg-rojo-claro px-3 py-2 text-sm text-rojo">
          {estado.error}
        </p>
      )}
      {estado.token && (
        <div role="status" className="space-y-1 border-t border-linea pt-4">
          <p className="text-sm">Orden creada para {estado.nombre}. Envíele este enlace; solo funciona una vez.</p>
          <CopiarEnlace key={estado.token} token={estado.token} />
        </div>
      )}
    </div>
  );
}
