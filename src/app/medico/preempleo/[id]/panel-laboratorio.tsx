"use client";

import { useRef, useState, useTransition } from "react";
import { citasLegales, conRangoRevisado, esPositivoNegativo, evaluar, type ValorLab } from "@/lib/laboratorio";
import { guardarValores } from "./actions";

type Props = {
  preempleoId: string;
  valoresIniciales: ValorLab[] | null;
  descartadasIniciales: string[];
  editable: boolean;
};

const CAMPO =
  "w-full min-w-0 rounded border border-transparent bg-transparent px-1.5 py-1 outline-none hover:border-linea focus:border-salvia focus:bg-papel";

// Reduce las fotos del celular para que no superen el límite de subida.
async function prepararArchivo(archivo: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) return archivo;
  try {
    const imagen = await createImageBitmap(archivo);
    const escala = Math.min(1, 2200 / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext("2d")!.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/jpeg", 0.85));
    return blob ? new File([blob], "laboratorio.jpg", { type: "image/jpeg" }) : archivo;
  } catch {
    return archivo;
  }
}

function Marca({ v }: { v: ValorLab }) {
  if (v.ilegible && !v.valor) return <span className="font-medium text-ambar">Ilegible</span>;
  const e = evaluar(v.valor, v.rango_referencia);
  if (e === "alto") return <span className="font-medium text-rojo">Alto</span>;
  if (e === "bajo") return <span className="font-medium text-rojo">Bajo</span>;
  if (e === "alterado" || (e === null && v.fuera_de_rango)) {
    return <span className="font-medium text-rojo">Revisar</span>;
  }
  return null;
}

export function PanelLaboratorio({ preempleoId, valoresIniciales, descartadasIniciales, editable }: Props) {
  const [valores, setValores] = useState<ValorLab[] | null>(valoresIniciales);
  const [descartadas, setDescartadas] = useState(descartadasIniciales);
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, iniciarGuardado] = useTransition();
  const entrada = useRef<HTMLInputElement>(null);

  async function subir(archivo: File | undefined) {
    if (!archivo) return;
    setLeyendo(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("preempleoId", preempleoId);
      form.set("archivo", await prepararArchivo(archivo));
      const respuesta = await fetch("/api/laboratorio", { method: "POST", body: form });
      const datos = await respuesta.json().catch(() => null);
      if (!datos) {
        setError(`El servidor falló (código ${respuesta.status}). Intente de nuevo o ingrese los valores a mano.`);
      } else if (!respuesta.ok) {
        setError(datos.error);
      } else {
        setValores(datos.valores);
        setDescartadas(datos.descartadas);
      }
    } catch {
      setError("No se pudo conectar. Revise su internet e intente de nuevo.");
    } finally {
      setLeyendo(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  function guardar(lista: ValorLab[]) {
    iniciarGuardado(async () => {
      const r = await guardarValores(preempleoId, lista);
      if ("error" in r) {
        setError(r.error ?? null);
        return;
      }
      setError(null);
      setDescartadas(r.descartadas);
      // Si escribieron una prueba prohibida, su fila desaparece.
      if (r.valores.length !== lista.filter((v) => v.nombre.trim()).length) setValores(r.valores);
    });
  }

  function cambiar(i: number, campo: "nombre" | "valor" | "unidad" | "rango_referencia", texto: string) {
    setValores((lista) =>
      (lista ?? []).map((v, j) => (j === i ? conRangoRevisado({ ...v, [campo]: texto || null, nombre: campo === "nombre" ? texto : v.nombre }) : v)),
    );
  }

  const agregar = () =>
    setValores((lista) => [
      ...(lista ?? []),
      { nombre: "", valor: null, unidad: null, rango_referencia: null, fuera_de_rango: false, ilegible: false },
    ]);

  // El resultado queda sin elegir: nunca se presupone un Negativo.
  const agregarPositivoNegativo = () =>
    setValores((lista) => [
      ...(lista ?? []),
      { nombre: "", valor: null, unidad: null, rango_referencia: "Negativo", fuera_de_rango: false, ilegible: false },
    ]);

  function elegirResultado(i: number, texto: string) {
    const lista = (valores ?? []).map((v, j) =>
      j === i ? conRangoRevisado({ ...v, valor: texto || null, fuera_de_rango: false }) : v,
    );
    setValores(lista);
    guardar(lista);
  }

  // Una lista vacía guardada significa que la consulta sigue sin laboratorios.
  const omitir = () => {
    setValores([]);
    guardar([]);
  };

  const quitar = (i: number) => {
    const lista = (valores ?? []).filter((_, j) => j !== i);
    setValores(lista);
    guardar(lista);
  };

  const fuera = (valores ?? []).filter((v) => {
    const e = evaluar(v.valor, v.rango_referencia);
    return e === null ? v.fuera_de_rango : e !== "normal";
  }).length;
  const ilegibles = (valores ?? []).filter((v) => v.ilegible && !v.valor).length;

  return (
    <section className="rounded-lg border border-linea bg-papel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-linea px-5 py-3.5">
        <h2 className="font-semibold">Laboratorios</h2>
        {valores && valores.length > 0 && (
          <p className="text-sm text-tenue">
            {valores.length} {valores.length === 1 ? "valor" : "valores"}
            {fuera > 0 && <span className="font-medium text-rojo"> · {fuera} fuera de rango</span>}
            {ilegibles > 0 && <span className="font-medium text-ambar"> · {ilegibles} ilegibles</span>}
          </p>
        )}
      </div>

      <div className="space-y-4 px-5 py-4">
        <input
          ref={entrada}
          id="archivo-laboratorio"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          className="hidden"
          onChange={(e) => subir(e.target.files?.[0])}
        />

        {descartadas.length > 0 && (
          <div role="alert" className="rounded-md border border-rojo/25 bg-rojo-claro px-4 py-3 text-sm">
            <p className="font-semibold text-rojo">Prueba no permitida descartada: {descartadas.join(", ")}</p>
            <p className="mt-0.5 text-tinta-suave">
              No se guardó su resultado ni el archivo original. Estas pruebas no pueden usarse en un preempleo
              ({citasLegales(descartadas)}).
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-md bg-ambar-claro px-4 py-2.5 text-sm text-ambar">
            {error}
          </p>
        )}

        {leyendo ? (
          <div className="rounded-lg border border-linea bg-hueso/60 px-5 py-9 text-center" aria-live="polite">
            <p className="font-medium">Leyendo el laboratorio con IA…</p>
            <p className="mt-1 text-sm text-tenue">Suele tardar unos segundos.</p>
          </div>
        ) : !valores?.length ? (
          editable ? (
            <div className="rounded-lg border border-dashed border-tinta/25 bg-hueso/60 px-5 py-7 text-center">
              <p className="font-medium">{valores ? "Consulta sin laboratorios" : "Suba la foto o el PDF del resultado"}</p>
              <p className="mx-auto mt-1 max-w-[46ch] text-sm text-tenue">
                {valores
                  ? "Puede firmar sin resultados. Si llegan después de esta decisión, regístrelos aquí antes de firmar."
                  : "La IA extrae cada valor con su unidad y rango, y marca en rojo los que estén fuera de rango. Usted puede corregir cualquier valor."}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => entrada.current?.click()}
                  className="rounded-md bg-tinta px-4 py-2 text-sm font-medium text-hueso hover:bg-tinta-suave"
                >
                  Subir archivo
                </button>
                <button
                  type="button"
                  onClick={agregar}
                  className="rounded-md border border-linea bg-papel px-4 py-2 text-sm hover:bg-hueso"
                >
                  Ingresar a mano
                </button>
                <button
                  type="button"
                  onClick={agregarPositivoNegativo}
                  className="rounded-md border border-linea bg-papel px-4 py-2 text-sm hover:bg-hueso"
                >
                  Positivo / Negativo
                </button>
                {valores === null && (
                  <button
                    type="button"
                    onClick={omitir}
                    className="rounded-md border border-linea bg-papel px-4 py-2 text-sm hover:bg-hueso"
                  >
                    Omitir laboratorios
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-tenue">{valores ? "Consulta sin laboratorios." : "Sin laboratorios cargados."}</p>
          )
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] table-fixed text-left text-sm">
                <thead>
                  <tr className="border-b border-linea text-xs font-medium text-tenue">
                    <th className="w-[36%] px-1.5 py-2 font-medium">Análisis</th>
                    <th className="w-[19%] px-1.5 py-2 font-medium">Resultado</th>
                    <th className="w-[15%] px-1.5 py-2 font-medium">Unidad</th>
                    <th className="w-[19%] px-1.5 py-2 font-medium">Referencia</th>
                    <th className="w-[11%] px-1.5 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {valores.map((v, i) => {
                    const e = evaluar(v.valor, v.rango_referencia);
                    const malo = e === null ? v.fuera_de_rango : e !== "normal";
                    const dudoso = v.ilegible && !v.valor;
                    const fondo = dudoso ? "bg-ambar-claro/70" : malo ? "bg-rojo-claro/70" : "";
                    return (
                      <tr key={i} className={`border-b border-linea last:border-0 ${fondo}`}>
                        {editable ? (
                          <>
                            <td className="py-0.5">
                              <input
                                aria-label="Análisis"
                                className={CAMPO}
                                placeholder={esPositivoNegativo(v) ? "Ej.: Doping" : undefined}
                                value={v.nombre}
                                onChange={(ev) => cambiar(i, "nombre", ev.target.value)}
                                onBlur={() => guardar(valores)}
                              />
                            </td>
                            <td className="py-0.5">
                              {esPositivoNegativo(v) ? (
                                <select
                                  aria-label={`Resultado de ${v.nombre}`}
                                  className={`${CAMPO} ${malo ? "font-medium text-rojo" : ""}`}
                                  value={v.valor ?? ""}
                                  onChange={(ev) => elegirResultado(i, ev.target.value)}
                                >
                                  <option value="">Elegir</option>
                                  <option value="Negativo">Negativo</option>
                                  <option value="Positivo">Positivo</option>
                                </select>
                              ) : (
                                <input
                                  aria-label={`Resultado de ${v.nombre}`}
                                  className={`${CAMPO} cifras font-mono ${malo ? "font-medium text-rojo" : ""}`}
                                  value={v.valor ?? ""}
                                  onChange={(ev) => cambiar(i, "valor", ev.target.value)}
                                  onBlur={() => guardar(valores)}
                                />
                              )}
                            </td>
                            <td className="py-0.5">
                              <input
                                aria-label={`Unidad de ${v.nombre}`}
                                className={`${CAMPO} text-tinta-suave`}
                                value={v.unidad ?? ""}
                                onChange={(ev) => cambiar(i, "unidad", ev.target.value)}
                                onBlur={() => guardar(valores)}
                              />
                            </td>
                            <td className="py-0.5">
                              <input
                                aria-label={`Referencia de ${v.nombre}`}
                                className={`${CAMPO} cifras text-tinta-suave`}
                                value={v.rango_referencia ?? ""}
                                onChange={(ev) => cambiar(i, "rango_referencia", ev.target.value)}
                                onBlur={() => guardar(valores)}
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-1.5 py-1.5">{v.nombre}</td>
                            <td className={`cifras px-1.5 py-1.5 font-mono ${malo ? "font-medium text-rojo" : ""}`}>
                              {v.valor ?? "—"}
                            </td>
                            <td className="px-1.5 py-1.5 text-tinta-suave">{v.unidad}</td>
                            <td className="cifras px-1.5 py-1.5 text-tinta-suave">{v.rango_referencia}</td>
                          </>
                        )}
                        <td className="px-1.5 py-0.5 text-xs">
                          <div className="flex items-center justify-between gap-1">
                            <Marca v={v} />
                            {editable && (
                              <button
                                type="button"
                                aria-label={`Quitar ${v.nombre}`}
                                onClick={() => quitar(i)}
                                className="ml-auto text-tenue hover:text-rojo"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {editable && (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <div className="flex gap-4">
                  <button type="button" onClick={agregar} className="text-tinta-suave underline-offset-2 hover:underline">
                    Agregar valor
                  </button>
                  <button
                    type="button"
                    onClick={agregarPositivoNegativo}
                    className="text-tinta-suave underline-offset-2 hover:underline"
                  >
                    Agregar Positivo / Negativo
                  </button>
                  <button
                    type="button"
                    onClick={() => entrada.current?.click()}
                    className="text-tinta-suave underline-offset-2 hover:underline"
                  >
                    Subir otro archivo (reemplaza)
                  </button>
                </div>
                <span className="text-xs text-tenue" aria-live="polite">
                  {guardando ? "Guardando…" : "Sus correcciones se guardan solas."}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
