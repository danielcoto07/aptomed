"use client";

// Muestra la historia que llenó el candidato (jsonb de la tabla historias).
// Recorre el objeto tal como venga, para no romperse si cambian los campos.
// El médico corrige datos durante la consulta; la respuesta original se conserva.

import { createContext, useContext, useState, useTransition } from "react";
import { OPCIONES, esNegativo } from "@/lib/candidato";
import type { Correcciones, Valor } from "@/lib/historia";
import { corregirHistoria } from "./actions";

const TITULOS: Record<string, string> = {
  datos_generales: "Datos generales",
  antecedentes_personales: "Antecedentes personales",
  antecedentes_familiares: "Antecedentes familiares",
  antecedentes_laborales: "Antecedentes laborales",
  habitos: "Hábitos",
  sintomas_actuales: "Síntomas actuales",
  vacunas: "Vacunas",
};

const ETIQUETAS: Record<string, string> = {
  edad: "Edad",
  sexo: "Sexo",
  estado_civil: "Estado civil",
  escolaridad: "Escolaridad",
  lateralidad: "Lateralidad",
  patologicos: "Patológicos",
  quirurgicos: "Quirúrgicos",
  traumaticos: "Traumáticos",
  alergias: "Alergias",
  medicamentos: "Medicamentos",
  hospitalizaciones: "Hospitalizaciones",
  tabaco: "Tabaco",
  alcohol: "Alcohol",
  actividad_fisica: "Actividad física",
  sueno: "Sueño",
  vertigo_o_mareos: "Vértigo o mareos",
  dolor_de_espalda: "Dolor de espalda",
  vision: "Visión",
  audicion: "Audición",
  otros: "Otros",
  tetanos: "Tétanos",
  hepatitis_b: "Hepatitis B",
  empresa: "Empresa",
  puesto: "Puesto",
  tiempo: "Tiempo",
  riesgos: "Riesgos",
  accidentes: "Accidentes",
};

const etiqueta = (k: string) => ETIQUETAS[k] ?? k.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());

// Postgres (jsonb) no conserva el orden de las llaves: se ordenan según las listas de arriba.
const ORDEN = [...Object.keys(TITULOS), ...Object.keys(ETIQUETAS)];
const posicion = (k: string) => (ORDEN.includes(k) ? ORDEN.indexOf(k) : ORDEN.length);
const ordenadas = (o: Record<string, Valor>) => Object.entries(o).sort(([a], [b]) => posicion(a) - posicion(b));

type Edicion = {
  editable: boolean;
  correcciones: Correcciones;
  guardar: (ruta: string, valor: string) => Promise<string | null>;
};

const ContextoEdicion = createContext<Edicion>({
  editable: false,
  correcciones: {},
  guardar: async () => null,
});

function Campo({ ruta, original }: { ruta: string; original: string | number | boolean | null }) {
  const { editable, correcciones, guardar } = useContext(ContextoEdicion);
  const [borrador, setBorrador] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, iniciarGuardado] = useTransition();

  const correccion = correcciones[ruta];
  const respuesta = original === null ? "" : String(original);
  const actual = correccion ? correccion.valor : respuesta;
  const negativo = esNegativo(actual);
  const visible = negativo ? "Ninguno" : actual;
  const llave = ruta.split(".").pop() as keyof typeof OPCIONES;
  const menu = ruta.startsWith("datos_generales.") && Object.hasOwn(OPCIONES, llave) ? OPCIONES[llave] : null;

  function terminar() {
    const texto = (borrador ?? "").trim();
    setBorrador(null);
    if (texto === actual.trim()) return;
    iniciarGuardado(async () => setError(await guardar(ruta, texto)));
  }

  if (menu && editable) {
    return (
      <>
        <select
          aria-label={`Corregir ${etiqueta(llave).toLowerCase()}`}
          value={actual}
          disabled={guardando}
          onChange={(e) => {
            const valor = e.target.value;
            iniciarGuardado(async () => setError(await guardar(ruta, valor)));
          }}
          className="w-full max-w-xs rounded-md border border-linea bg-papel px-2 py-1 text-[15px] outline-none focus:border-salvia disabled:opacity-60"
        >
          {!(menu as readonly string[]).includes(actual) && <option>{actual}</option>}
          {menu.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        {correccion && (
          <span className="mt-0.5 block text-xs text-ambar">Corregido por el médico. El candidato dijo: {respuesta || "—"}</span>
        )}
        {error && (
          <span role="alert" className="mt-0.5 block text-xs text-rojo">
            {error}
          </span>
        )}
      </>
    );
  }

  if (borrador !== null) {
    return (
      <textarea
        aria-label="Corregir dato de la historia"
        autoFocus
        rows={Math.min(5, Math.max(2, Math.ceil(borrador.length / 42)))}
        value={borrador}
        onChange={(e) => setBorrador(e.target.value)}
        onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
        onBlur={terminar}
        onKeyDown={(e) => {
          if (e.key === "Escape") setBorrador(null);
        }}
        className="w-full rounded-md border border-salvia bg-papel px-2 py-1 text-[15px] leading-relaxed outline-none"
      />
    );
  }

  return (
    <>
      {editable ? (
        <button
          type="button"
          onClick={() => setBorrador(actual)}
          disabled={guardando}
          title="Corregir este dato"
          className={`text-left underline decoration-linea decoration-dotted underline-offset-4 hover:decoration-tinta disabled:opacity-60 ${negativo ? "text-tenue" : ""}`}
        >
          {visible || "—"}
        </button>
      ) : (
        <span className={actual && !negativo ? undefined : "text-tenue"}>{visible || "—"}</span>
      )}
      {guardando && <span className="ml-2 text-xs text-tenue">Guardando…</span>}
      {correccion && (
        <span className="mt-0.5 block text-xs text-ambar">
          Corregido por el médico. El candidato dijo: {respuesta || "—"}
        </span>
      )}
      {error && (
        <span role="alert" className="mt-0.5 block text-xs text-rojo">
          {error}
        </span>
      )}
    </>
  );
}

function Texto({ valor, ruta }: { valor: Valor; ruta: string }) {
  if (Array.isArray(valor)) {
    if (valor.every((v) => typeof v !== "object" || v === null)) {
      return (
        <ul className="space-y-0.5">
          {valor.map((v, i) => (
            <li key={i}>
              <Texto valor={v} ruta={`${ruta}.${i}`} />
            </li>
          ))}
        </ul>
      );
    }
    return (
      <div className="space-y-2">
        {valor.map((v, i) => (
          <div key={i} className="rounded-md border border-linea bg-hueso/50 p-3">
            <Texto valor={v} ruta={`${ruta}.${i}`} />
          </div>
        ))}
      </div>
    );
  }
  if (typeof valor === "object" && valor !== null) {
    return (
      <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-1.5">
        {ordenadas(valor).map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-sm text-tenue">{etiqueta(k)}</dt>
            <dd className="min-w-0">
              <Texto valor={v} ruta={`${ruta}.${k}`} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return <Campo ruta={ruta} original={valor} />;
}

type Props = {
  preempleoId: string;
  antecedentes: Record<string, Valor>;
  correccionesIniciales: Correcciones;
  editable: boolean;
};

export function Historia({ preempleoId, antecedentes, correccionesIniciales, editable }: Props) {
  const [correcciones, setCorrecciones] = useState(correccionesIniciales);

  async function guardar(ruta: string, valor: string) {
    const r = await corregirHistoria(preempleoId, ruta, valor);
    if (!r.correcciones) return r.error ?? "No se pudo guardar la corrección.";
    setCorrecciones(r.correcciones);
    return null;
  }

  return (
    <ContextoEdicion.Provider value={{ editable, correcciones, guardar }}>
      {editable && (
        <p className="mb-3 rounded-md bg-hueso/70 px-3 py-2 text-xs text-tinta-suave">
          Haga clic en un dato para corregirlo. La respuesta del candidato se conserva.
        </p>
      )}
      <div className="divide-y divide-linea">
        {ordenadas(antecedentes).map(([seccion, valor]) => (
          <section key={seccion} className="space-y-2.5 py-4 first:pt-0 last:pb-0">
            <h3 className="text-sm font-medium text-tenue">
              {TITULOS[seccion] ?? etiqueta(seccion)}
            </h3>
            <div className="text-[15px] leading-relaxed">
              <Texto valor={valor} ruta={seccion} />
            </div>
          </section>
        ))}
      </div>
    </ContextoEdicion.Provider>
  );
}
