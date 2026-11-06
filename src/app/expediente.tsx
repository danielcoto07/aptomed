"use client";

import { useState } from "react";

type Fila = { etiqueta: string; valor: string; clinico: boolean; alerta?: boolean };

const FILAS: Fila[] = [
  { etiqueta: "Candidato", valor: "Carlos Mora Solís", clinico: false },
  { etiqueta: "Puesto", valor: "Operario de construcción en alturas", clinico: false },
  { etiqueta: "Antecedentes", valor: "Lumbalgia mecánica en 2023, tratada con fisioterapia", clinico: true },
  { etiqueta: "Hábitos", valor: "5 cigarrillos al día desde hace 10 años", clinico: true },
  { etiqueta: "Laboratorio", valor: "Glucosa 118 mg/dL · fuera de rango", clinico: true, alerta: true },
  { etiqueta: "Dictamen", valor: "Requiere control al trabajar en altura por antecedente lumbar", clinico: true },
  { etiqueta: "Resultado", valor: "Compatible con seguimiento médico", clinico: false },
  { etiqueta: "Recomendación", valor: "No trabajar en alturas mayores a 1,8 m sin arnés", clinico: false },
];

const VISTAS = [
  { id: "medico", nombre: "Médico" },
  { id: "empresa", nombre: "Empresa" },
] as const;

// El mismo preempleo visto por cada rol: al cambiar a Empresa, lo clínico desaparece.
export function Expediente() {
  const [vista, setVista] = useState<"medico" | "empresa">("medico");
  const empresa = vista === "empresa";

  return (
    <figure className="min-w-0 rounded-xl border border-linea bg-papel shadow-[0_18px_50px_-30px_rgb(6_60_65/0.45)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linea px-5 py-3">
        <figcaption className="text-sm text-tenue">Caso ficticio</figcaption>
        <div role="group" aria-label="Elegir quién ve el preempleo" className="flex rounded-md bg-hueso p-1">
          {VISTAS.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={vista === v.id}
              onClick={() => setVista(v.id)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                vista === v.id ? "bg-tinta text-hueso" : "text-tinta-suave hover:text-tinta"
              }`}
            >
              {v.nombre}
            </button>
          ))}
        </div>
      </div>

      <dl className="divide-y divide-linea px-5">
        {FILAS.map((f) => {
          const oculto = empresa && f.clinico;
          return (
            <div key={f.etiqueta} className="grid gap-x-4 gap-y-0.5 py-3 sm:grid-cols-[7.5rem_1fr]">
              <dt className="text-sm text-tenue">{f.etiqueta}</dt>
              <dd className="relative min-w-0 text-[15px] leading-snug">
                <span
                  aria-hidden={oculto}
                  className={`block transition-[opacity,filter] duration-300 ease-out motion-reduce:transition-none ${
                    oculto ? "opacity-0 blur-sm" : ""
                  } ${f.alerta ? "text-rojo" : ""}`}
                >
                  {f.valor}
                </span>
                {oculto && (
                  <span className="absolute inset-0 flex items-center">
                    <span className="h-3 w-full max-w-[18rem] rounded-sm bg-linea" />
                    <span className="sr-only">Dato clínico oculto para la empresa</span>
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      <p className="min-h-11 border-t border-linea px-5 py-3 text-sm text-tinta-suave">
        {empresa
          ? "La empresa solo recibe el informe final. Lo clínico no llega a su cuenta."
          : "El médico ve todo, corrige lo que haga falta y decide."}
      </p>
    </figure>
  );
}
