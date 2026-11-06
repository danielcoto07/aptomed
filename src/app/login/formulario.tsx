"use client";

import { useActionState } from "react";
import { iniciarSesion, type EstadoLogin } from "./actions";

const inicial: EstadoLogin = { error: null };

export function FormularioLogin() {
  const [estado, accion, enviando] = useActionState(iniciarSesion, inicial);

  return (
    <form action={accion} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Correo electrónico</span>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-md border border-linea bg-papel px-3 py-2.5 outline-none focus:border-salvia"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Contraseña</span>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-md border border-linea bg-papel px-3 py-2.5 outline-none focus:border-salvia"
        />
      </label>

      {estado.error && (
        <p role="alert" className="rounded-md bg-rojo-claro px-3 py-2 text-sm text-rojo">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-md bg-tinta py-2.5 font-medium text-hueso hover:bg-tinta-suave disabled:opacity-60"
      >
        {enviando ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
