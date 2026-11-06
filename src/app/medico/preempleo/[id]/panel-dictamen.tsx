"use client";

import { useState, useTransition } from "react";
import { HojaCertificado, type DatosHoja } from "@/components/certificado";
import { palabrasClinicas } from "@/lib/guardian";
import { ETIQUETA_APTITUD, PLANTILLA_EXAMEN_FISICO, type Aptitud } from "@/lib/tipos";
import { firmar, guardarDictamen } from "./actions";

type Props = {
  preempleoId: string;
  hoja: DatosHoja;
  textoInicial: string;
  examenInicial: string;
  restriccionesIniciales: string;
  propuestaInicial: string | null;
  conBorradorIA: boolean;
};

const AREA =
  "w-full rounded-md border border-linea bg-papel px-3 py-2.5 text-[15px] leading-relaxed outline-none focus:border-salvia";

export function PanelDictamen({
  preempleoId,
  hoja,
  textoInicial,
  examenInicial,
  restriccionesIniciales,
  propuestaInicial,
  conBorradorIA,
}: Props) {
  const [examen, setExamen] = useState(examenInicial);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [texto, setTexto] = useState(textoInicial);
  const [restricciones, setRestricciones] = useState(restriccionesIniciales);
  const [propuesta, setPropuesta] = useState(propuestaInicial);
  const [aptitud, setAptitud] = useState<Aptitud | null>(null);
  const [faltanLaboratorios, setFaltanLaboratorios] = useState(false);
  const [esIA, setEsIA] = useState(conBorradorIA);
  const [manual, setManual] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmandoNuevo, setConfirmandoNuevo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firmando, iniciarFirma] = useTransition();

  async function generar() {
    setConfirmandoNuevo(false);
    setGenerando(true);
    setError(null);
    try {
      const respuesta = await fetch("/api/dictamen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preempleoId, examenFisico: examen }),
      });
      const datos = await respuesta.json().catch(() => null);
      if (!datos) {
        setError(`El servidor falló (código ${respuesta.status}). Intente de nuevo o redacte el dictamen a mano.`);
      } else if (!respuesta.ok) {
        setError(datos.error);
      } else {
        setTexto(datos.texto);
        setRestricciones(datos.restricciones);
        setPropuesta(datos.propuesta);
        setEsIA(true);
      }
    } catch {
      setError("No se pudo conectar. Revise su internet e intente de nuevo.");
    } finally {
      setGenerando(false);
    }
  }

  // Si falla, el médico debe enterarse: su texto todavía no está guardado.
  async function guardar(cambios?: { examen?: string }) {
    try {
      const r = await guardarDictamen(preempleoId, { texto, restricciones, examen: cambios?.examen ?? examen });
      setErrorGuardado(r.error);
    } catch {
      setErrorGuardado("No se pudo guardar. Revise su internet; su texto sigue en pantalla.");
    }
  }

  function cargarPlantilla() {
    setExamen(PLANTILLA_EXAMEN_FISICO);
    guardar({ examen: PLANTILLA_EXAMEN_FISICO });
  }

  function confirmarFirma() {
    if (!aptitud) return;
    iniciarFirma(async () => {
      const r = await firmar(preempleoId, { texto, restricciones, examen, aptitud, faltanLaboratorios });
      if (r.error) {
        setError(r.error);
        setConfirmando(false);
      }
    });
  }

  const hayTexto = texto.trim().length > 0;
  const hayExamen = examen.trim().length > 0;
  const pideTexto = aptitud === "apto_con_restricciones" || aptitud === "no_apto";
  const faltaTextoEmpresa = pideTexto && !restricciones.trim();
  const alertasEmpresa = pideTexto ? palabrasClinicas(restricciones) : [];
  const puedeFirmar = hayTexto && hayExamen && aptitud !== null && !faltaTextoEmpresa;

  const avisoBoton = !hayExamen
    ? "Registre el examen físico para firmar"
    : aptitud === null
      ? "Elija el resultado para firmar"
      : faltaTextoEmpresa
        ? aptitud === "no_apto"
          ? "Indique las razones"
          : "Indique las recomendaciones"
        : "Firmar dictamen";

  return (
    <>
      <section className="rounded-lg border border-linea bg-papel">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-linea px-5 py-3.5">
          <h2 className="font-semibold">Nota de preempleo</h2>
          {!hayExamen && (
            <button
              type="button"
              onClick={cargarPlantilla}
              className="rounded-md border border-linea px-3 py-1.5 text-sm hover:bg-hueso"
            >
              Cargar plantilla normal
            </button>
          )}
        </div>
        <div className="space-y-3 px-5 py-4">
          <p className="text-sm">
            <span className="text-tenue">Padecimiento actual:</span> Valoración preempleo
          </p>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Examen físico</span>
            <textarea
              id="examen-fisico"
              value={examen}
              onChange={(e) => setExamen(e.target.value)}
              onBlur={() => guardar()}
              rows={hayExamen ? 8 : 3}
              placeholder="Registre lo encontrado en la valoración presencial."
              className={AREA}
            />
          </label>
          {hayExamen && (
            <p className="text-xs text-tenue">Ajuste la plantilla a lo que encontró en esta valoración.</p>
          )}
        </div>
      </section>

      <section className="flex-1 rounded-lg border border-linea bg-papel">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-linea px-5 py-3.5">
          <h2 className="font-semibold">Dictamen</h2>
          {(hayTexto || manual) && !confirmandoNuevo && (
            <button
              type="button"
              onClick={() => (hayTexto || restricciones.trim() ? setConfirmandoNuevo(true) : generar())}
              disabled={generando}
              className="text-sm text-tinta-suave underline-offset-2 hover:underline disabled:opacity-50"
            >
              {esIA ? "Generar de nuevo con IA" : "Generar con IA"}
            </button>
          )}
        </div>

        <div className="space-y-4 px-5 py-4">
          {errorGuardado && (
            <p role="alert" className="rounded-md bg-rojo-claro px-3 py-2 text-sm text-rojo">
              {errorGuardado}
            </p>
          )}
          {confirmandoNuevo && (
            <div className="space-y-3 rounded-md border border-ambar/30 bg-ambar-claro px-4 py-3">
              <p className="text-sm text-ambar">
                El borrador nuevo reemplazará el dictamen y el texto para la empresa, incluidas sus correcciones.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={generar}
                  className="rounded-md bg-tinta px-4 py-2 text-sm font-medium text-hueso hover:bg-tinta-suave"
                >
                  Reemplazar borrador
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmandoNuevo(false)}
                  className="rounded-md border border-linea bg-papel px-4 py-2 text-sm"
                >
                  Conservar mis cambios
                </button>
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-md bg-ambar-claro px-4 py-2.5 text-sm text-ambar">
              {error}
            </p>
          )}

          {generando ? (
            <div className="rounded-lg border border-linea bg-hueso/60 px-5 py-9 text-center" aria-live="polite">
              <p className="font-medium">Redactando el borrador…</p>
              <p className="mt-1 text-sm text-tenue">
                La IA usa solo la historia, el examen físico y los laboratorios de este candidato.
              </p>
            </div>
          ) : !hayTexto && !manual ? (
            <div className="rounded-lg border border-dashed border-tinta/25 bg-hueso/60 px-5 py-7 text-center">
              <p className="font-medium">Borrador de dictamen con IA</p>
              <p className="mx-auto mt-1 max-w-[46ch] text-sm text-tenue">
                Con la historia, el examen físico y los laboratorios, la IA propone un borrador. Usted lo corrige,
                elige el resultado y firma. Nada llega a la empresa sin su firma.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={generar}
                  className="rounded-md bg-tinta px-4 py-2 text-sm font-medium text-hueso hover:bg-tinta-suave"
                >
                  Generar borrador
                </button>
                <button
                  type="button"
                  onClick={() => setManual(true)}
                  className="rounded-md border border-linea bg-papel px-4 py-2 text-sm hover:bg-hueso"
                >
                  Redactar a mano
                </button>
              </div>
            </div>
          ) : (
            <>
              {esIA && (
                <div className="rounded-md bg-ambar-claro px-3 py-2 text-sm text-ambar">
                  <p className="font-medium">Borrador generado por IA — requiere valoración médica</p>
                  {propuesta && <p>Propuesta de la IA: {propuesta}</p>}
                </div>
              )}

              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Dictamen (clínico, la empresa no lo ve)</span>
                <textarea
                  id="texto-dictamen"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onBlur={() => guardar()}
                  rows={10}
                  className={AREA}
                />
              </label>

              <div className="space-y-1.5">
                <p className="text-sm font-medium">Informe final para la empresa (editable hasta firmar)</p>
                <HojaCertificado
                  datos={hoja}
                  aptitud={aptitud}
                  alElegir={(a) => {
                    setAptitud(a);
                    setConfirmando(false);
                  }}
                  texto={restricciones}
                  alEscribir={setRestricciones}
                  alSalirDelTexto={() => guardar()}
                  faltanLaboratorios={faltanLaboratorios}
                  alMarcarNota={setFaltanLaboratorios}
                />
              </div>

              {alertasEmpresa.length > 0 && (
                <div role="status" className="rounded-md bg-ambar-claro px-3 py-2 text-sm text-ambar">
                  <p className="font-medium">Revise el texto para la empresa</p>
                  <p>
                    Parece mencionar: {alertasEmpresa.join(", ")}. Redáctelo en términos de capacidad, sin datos
                    clínicos. La decisión es suya.
                  </p>
                </div>
              )}

              {confirmando ? (
                <div className="space-y-3 rounded-md border border-tinta/25 bg-hueso px-4 py-3">
                  <p className="text-sm">
                    Va a firmar como <b>{aptitud && ETIQUETA_APTITUD[aptitud]}</b>. La empresa recibirá el informe y el
                    dictamen ya no se podrá editar.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={confirmarFirma}
                      disabled={firmando}
                      className="rounded-md bg-salvia px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {firmando ? "Firmando…" : "Confirmar firma"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmando(false)}
                      disabled={firmando}
                      className="rounded-md border border-linea bg-papel px-4 py-2 text-sm"
                    >
                      Volver
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmando(true)}
                  disabled={!puedeFirmar}
                  className="w-full rounded-md bg-tinta py-2.5 font-medium text-hueso hover:bg-tinta-suave disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {avisoBoton}
                </button>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
