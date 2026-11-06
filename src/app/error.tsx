"use client";

import { useEffect } from "react";

export default function ErrorPagina({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-5 py-12">
      <h1 className="text-2xl font-medium tracking-tight">Algo salió mal</h1>
      <p className="leading-relaxed text-tinta-suave">
        No se pudo cargar esta página. Intente de nuevo; si sigue fallando, revise su conexión.
      </p>
      <button
        type="button"
        onClick={retry}
        className="rounded-md bg-tinta px-5 py-3 font-medium text-hueso hover:bg-tinta-suave"
      >
        Intentar de nuevo
      </button>
    </main>
  );
}
