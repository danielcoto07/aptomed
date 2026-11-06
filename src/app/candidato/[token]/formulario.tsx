"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import {
  OPCIONES,
  OPCIONES_EMPLEO,
  PREGUNTAS_HABITOS,
  PREGUNTAS_SALUD,
  errorPaso,
  type EmpleoCandidato,
  type Pregunta,
  type RespuestasCandidato,
} from "@/lib/candidato";
import { enviarHistoria } from "./actions";

const EMPLEO_VACIO: EmpleoCandidato = { empresa: "", puesto: "", tiempo: "", riesgos: "", accidentes: "" };

const INICIAL: RespuestasCandidato = {
  edad: "",
  sexo: "",
  estado_civil: "",
  escolaridad: "",
  lateralidad: "",
  patologicos: "",
  quirurgicos: "",
  traumaticos: "",
  alergias: "",
  medicamentos: "",
  hospitalizaciones: "",
  familiares: "",
  ha_trabajado: "",
  empleos: [{ ...EMPLEO_VACIO }],
  tabaco: "",
  alcohol: "",
  actividad_fisica: "",
  sueno: "",
  vertigo_o_mareos: "",
  dolor_de_espalda: "",
  vision: "",
  audicion: "",
  otros: "",
  tetanos: "",
  hepatitis_b: "",
};

const PASOS = ["Datos generales", "Su salud", "Trabajos anteriores", "Hábitos y síntomas"];

// text-base evita que el iPhone acerque la página al tocar un campo.
const CAMPO =
  "w-full rounded-md border border-linea bg-papel px-3 py-2.5 text-base outline-none focus:border-salvia";
const BOTON =
  "rounded-md bg-tinta px-5 py-3 font-medium text-hueso hover:bg-tinta-suave disabled:opacity-60";

function Etiqueta({ texto, ayuda, children }: { texto: string; ayuda?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block font-medium">{texto}</span>
      {ayuda && <span className="block text-sm text-tenue">{ayuda}</span>}
      {children}
    </label>
  );
}

const ESCRIBIR = "__escribir";

// Menú con las respuestas comunes; la última opción abre un campo para escribir.
function Elegir({
  titulo,
  ayuda,
  opciones,
  libre,
  valor,
  alCambiar,
}: {
  titulo: string;
  ayuda?: string;
  opciones: string[];
  libre: string;
  valor: string;
  alCambiar: (v: string) => void;
}) {
  const [escribiendo, setEscribiendo] = useState(valor !== "" && !opciones.includes(valor));
  return (
    <div className="space-y-2">
      <Etiqueta texto={titulo} ayuda={ayuda}>
        <select
          className={CAMPO}
          value={escribiendo ? ESCRIBIR : valor}
          onChange={(e) => {
            const elegido = e.target.value;
            setEscribiendo(elegido === ESCRIBIR);
            alCambiar(elegido === ESCRIBIR ? "" : elegido);
          }}
        >
          <option value="">Seleccione</option>
          {opciones.map((o) => (
            <option key={o}>{o}</option>
          ))}
          <option value={ESCRIBIR}>{libre}</option>
        </select>
      </Etiqueta>
      {escribiendo && (
        <input
          aria-label={`${titulo}: detalle`}
          autoFocus
          className={CAMPO}
          value={valor}
          onChange={(e) => alCambiar(e.target.value)}
          maxLength={600}
          placeholder="Escriba aquí"
        />
      )}
    </div>
  );
}

type Props = { token: string; nombre: string; puesto: string; empresa: string };

export function FormularioCandidato({ token, nombre, puesto, empresa }: Props) {
  const [acepta, setAcepta] = useState(false);
  const [consentimientoEn, setConsentimientoEn] = useState<string | null>(null);
  const [paso, setPaso] = useState(0);
  const [declara, setDeclara] = useState(false);
  const [r, setR] = useState(INICIAL);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, iniciarEnvio] = useTransition();

  // Avisar antes de salir: las respuestas solo se guardan al enviar.
  const llenando = consentimientoEn !== null && !enviado;
  useEffect(() => {
    if (!llenando) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [llenando]);

  const poner = (campo: keyof RespuestasCandidato, valor: string) => setR((a) => ({ ...a, [campo]: valor }));
  const ponerEmpleo = (i: number, campo: keyof EmpleoCandidato, valor: string) =>
    setR((a) => ({ ...a, empleos: a.empleos.map((e, j) => (j === i ? { ...e, [campo]: valor } : e)) }));

  const irA = (n: number) => {
    setError(null);
    setPaso(n);
    window.scrollTo(0, 0);
  };

  const pregunta = (p: Pregunta) => (
    <Elegir key={p.campo} {...p} valor={r[p.campo]} alCambiar={(v) => poner(p.campo, v)} />
  );

  function lista(campo: "sexo" | "estado_civil" | "escolaridad" | "lateralidad", titulo: string) {
    return (
      <Etiqueta texto={titulo}>
        <select className={CAMPO} value={r[campo]} onChange={(e) => poner(campo, e.target.value)}>
          <option value="">Seleccione</option>
          {OPCIONES[campo].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </Etiqueta>
    );
  }

  function siguiente() {
    const invalido = errorPaso(r, paso);
    if (invalido) return setError(invalido);
    irA(paso + 1);
  }

  function enviar() {
    const invalido = errorPaso(r, paso);
    if (invalido) return setError(invalido);
    setError(null);
    iniciarEnvio(async () => {
      try {
        const resultado = await enviarHistoria(token, consentimientoEn!, r, declara);
        if (resultado.ok) {
          setEnviado(true);
          window.scrollTo(0, 0);
        } else {
          setError(resultado.error);
        }
      } catch {
        setError("No se pudo enviar. Revise su conexión e intente de nuevo.");
      }
    });
  }

  if (enviado) {
    return (
      <div className="space-y-2 pt-8" role="status">
        <h1 className="text-2xl font-medium tracking-tight">Su historia fue enviada</h1>
        <p className="leading-relaxed text-tinta-suave">
          Gracias, {nombre}. El médico la revisará en su consulta. Ya puede cerrar esta página.
        </p>
      </div>
    );
  }

  if (!consentimientoEn) {
    return (
      <div className="space-y-6 pt-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-medium tracking-tight">Consentimiento informado</h1>
          <p className="text-tinta-suave">
            {nombre} · {puesto} · {empresa}
          </p>
        </div>

        <div className="space-y-3 leading-relaxed text-tinta-suave">
          <p>
            Sus respuestas son datos sensibles protegidos por la Ley 8968. Se usan solo para valorar su aptitud
            para este puesto.
          </p>
          <p>
            <strong className="font-semibold text-tinta">Quién las ve:</strong> únicamente el médico que le
            atiende. La empresa recibe solo el informe final con el resultado y, si aplica, recomendaciones de
            capacidad. Nunca ve su historia, sus laboratorios ni diagnósticos.
          </p>
          <p>
            <strong className="font-semibold text-tinta">Uso de inteligencia artificial:</strong> una IA ayuda a
            preparar un borrador con esta información. La decisión es siempre del médico.
          </p>
          <p>Puede pedir al médico corregir sus datos. Si no acepta, no se guardará ninguna respuesta.</p>
          <p className="text-sm text-ambar">Prototipo de demostración: use solo datos ficticios.</p>
        </div>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={acepta}
            onChange={(e) => setAcepta(e.target.checked)}
            className="mt-1 h-5 w-5 accent-salvia"
          />
          <span>He leído esta información y acepto el tratamiento de mis datos.</span>
        </label>

        <button
          type="button"
          disabled={!acepta}
          onClick={() => setConsentimientoEn(new Date().toISOString())}
          className={`${BOTON} w-full`}
        >
          Continuar
        </button>
      </div>
    );
  }

  return (
    <form
      className="space-y-6 pt-8"
      // La tecla "Ir" del celular no debe enviar la historia a medias.
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault();
      }}
      onSubmit={(e) => {
        e.preventDefault();
        if (paso < PASOS.length - 1) siguiente();
        else enviar();
      }}
    >
      <div className="space-y-1">
        <p className="text-sm text-tenue">
          Paso {paso + 1} de {PASOS.length}
        </p>
        <h1 className="text-2xl font-medium tracking-tight">{PASOS[paso]}</h1>
      </div>

      {paso === 0 && (
        <div className="grid gap-5 md:grid-cols-2">
          <Etiqueta texto="Edad">
            <input
              className={CAMPO}
              inputMode="numeric"
              value={r.edad}
              onChange={(e) => poner("edad", e.target.value.replace(/\D/g, "").slice(0, 2))}
            />
          </Etiqueta>
          {lista("sexo", "Sexo")}
          {lista("estado_civil", "Estado civil")}
          {lista("escolaridad", "Escolaridad")}
          {lista("lateralidad", "Mano dominante")}
        </div>
      )}

      {paso === 1 && <div className="grid gap-5 md:grid-cols-2">{PREGUNTAS_SALUD.map(pregunta)}</div>}

      {paso === 2 && (
        <div className="space-y-6">
          <div className="md:max-w-xs">
            <Etiqueta texto="¿Ha trabajado antes?">
              <select className={CAMPO} value={r.ha_trabajado} onChange={(e) => poner("ha_trabajado", e.target.value)}>
                <option value="">Seleccione</option>
                <option>Sí</option>
                <option>No</option>
              </select>
            </Etiqueta>
          </div>
          {r.ha_trabajado === "Sí" &&
            r.empleos.map((e, i) => (
              <fieldset key={i} className="grid gap-4 border-t border-linea pt-5 md:grid-cols-2">
                <legend className="sr-only">Trabajo {i + 1}</legend>
                <Etiqueta texto="Empresa">
                  <input className={CAMPO} value={e.empresa} onChange={(v) => ponerEmpleo(i, "empresa", v.target.value)} maxLength={600} />
                </Etiqueta>
                <Etiqueta texto="Puesto">
                  <input className={CAMPO} value={e.puesto} onChange={(v) => ponerEmpleo(i, "puesto", v.target.value)} maxLength={600} />
                </Etiqueta>
                <Etiqueta texto="Tiempo" ayuda="Por ejemplo, 2 años.">
                  <input className={CAMPO} value={e.tiempo} onChange={(v) => ponerEmpleo(i, "tiempo", v.target.value)} maxLength={600} />
                </Etiqueta>
                <Elegir titulo="Riesgos del trabajo" {...OPCIONES_EMPLEO.riesgos} valor={e.riesgos} alCambiar={(v) => ponerEmpleo(i, "riesgos", v)} />
                <Elegir titulo="Accidentes laborales" {...OPCIONES_EMPLEO.accidentes} valor={e.accidentes} alCambiar={(v) => ponerEmpleo(i, "accidentes", v)} />
                {r.empleos.length > 1 && (
                  <button
                    type="button"
                    className="text-left text-sm text-tinta-suave underline underline-offset-4 md:col-span-2"
                    onClick={() => setR((a) => ({ ...a, empleos: a.empleos.filter((_, j) => j !== i) }))}
                  >
                    Quitar este trabajo
                  </button>
                )}
              </fieldset>
            ))}
          {r.ha_trabajado === "Sí" && r.empleos.length < 6 && (
            <button
              type="button"
              className="font-medium text-tinta-suave underline underline-offset-4"
              onClick={() => setR((a) => ({ ...a, empleos: [...a.empleos, { ...EMPLEO_VACIO }] }))}
            >
              Agregar otro trabajo
            </button>
          )}
        </div>
      )}

      {paso === 3 && (
        <div className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">{PREGUNTAS_HABITOS.map(pregunta)}</div>

          <div className="space-y-3 border-t border-linea pt-5">
            <h2 className="font-medium">Declaración de veracidad</h2>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={declara}
                onChange={(e) => setDeclara(e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 accent-salvia"
              />
              <span className="leading-relaxed">
                Declaro que la información que di es verdadera y completa, y que no oculté datos sobre mi salud, para
                que sea veraz y exacta como pide el artículo 6 de la Ley 8968. Entiendo que el médico la usará para
                valorar mi aptitud, y que dar información falsa o incompleta puede afectar ese resultado. Si con ello
                induzco a error al patrono al contratarme, puede ser causa de despido según el artículo 81, inciso j,
                del Código de Trabajo.
              </span>
            </label>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-rojo-claro px-3 py-2 text-sm text-rojo">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        {paso > 0 ? (
          <button type="button" onClick={() => irA(paso - 1)} className="py-3 font-medium text-tinta-suave">
            Atrás
          </button>
        ) : (
          <span />
        )}
        <button type="submit" disabled={enviando || (paso === PASOS.length - 1 && !declara)} className={BOTON}>
          {paso < PASOS.length - 1 ? "Siguiente" : enviando ? "Enviando…" : "Enviar historia"}
        </button>
      </div>
    </form>
  );
}
