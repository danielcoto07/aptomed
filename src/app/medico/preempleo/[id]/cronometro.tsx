"use client";

import { useEffect, useState } from "react";
import { formatearDuracion } from "@/lib/tipos";

// Tiempo de consulta: corre desde inicio_consulta; al firmar muestra la duración final.
export function Cronometro({ inicio, duracionFinal }: { inicio: string | null; duracionFinal: number | null }) {
  const [ahora, setAhora] = useState<number | null>(null);

  useEffect(() => {
    if (!inicio || duracionFinal != null) return;
    const tic = () => setAhora(Date.now());
    const primero = setTimeout(tic, 0);
    const t = setInterval(tic, 1000);
    return () => {
      clearTimeout(primero);
      clearInterval(t);
    };
  }, [inicio, duracionFinal]);

  let segundos: number | null = duracionFinal;
  if (segundos == null && inicio && ahora != null) {
    segundos = Math.max(0, Math.floor((ahora - new Date(inicio).getTime()) / 1000));
  }

  const corriendo = duracionFinal == null && inicio != null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-linea bg-papel px-4 py-2">
      <span
        className={`h-2 w-2 rounded-full ${corriendo ? "animate-pulse bg-ambar" : "bg-salvia"}`}
        aria-hidden="true"
      />
      <div className="leading-tight">
        <p className="text-xs text-tenue">
          {corriendo ? "Consulta en curso" : "Duración de la consulta"}
        </p>
        <p className="cifras font-mono text-xl font-medium" aria-live="off">
          {segundos == null ? "0:00" : formatearDuracion(segundos)}
          <span className="ml-1 text-sm text-tenue">min</span>
        </p>
      </div>
    </div>
  );
}
