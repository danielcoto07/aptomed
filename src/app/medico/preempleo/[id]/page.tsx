import Link from "next/link";
import { notFound } from "next/navigation";
import { InsigniaAptitud, InsigniaEstado } from "@/components/insignias";
import { obtenerPerfil } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { Correcciones, Valor } from "@/lib/historia";
import type { ValorLab } from "@/lib/laboratorio";
import { formatearDuracion, formatearFecha, formatearFechaLarga, type Aptitud, type EstadoPreempleo } from "@/lib/tipos";
import { iniciarConsulta } from "./actions";
import { Cronometro } from "./cronometro";
import { Historia } from "./historia";
import { PanelDictamen } from "./panel-dictamen";
import { PanelLaboratorio } from "./panel-laboratorio";

export const metadata = { title: "Consulta · AptoMed" };

type Preempleo = {
  id: string;
  candidato_nombre: string;
  candidato_cedula: string;
  puesto: string;
  estado: EstadoPreempleo;
  inicio_consulta: string | null;
  duracion_consulta_seg: number | null;
  empresas: { nombre: string } | null;
  historias: {
    consentimiento_aceptado_en: string;
    enviado_en: string;
    antecedentes: Record<string, Valor>;
    correcciones: Correcciones;
  } | null;
  resultados_lab: { valores: ValorLab[]; pruebas_descartadas: string[] }[];
  dictamenes: {
    borrador_ia: string | null;
    texto_final: string | null;
    examen_fisico: string | null;
    aptitud: Aptitud | null;
    restricciones_funcionales: string | null;
    firmado_en: string | null;
  } | null;
  certificados: { codigo_verificacion: string; emitido_en: string } | null;
};

export default async function Consulta({ params }: PageProps<"/medico/preempleo/[id]">) {
  const { id } = await params;
  const supabase = await crearClienteServidor();

  const { data: p } = await supabase
    .from("preempleos")
    .select(
      `id, candidato_nombre, candidato_cedula, puesto, estado, inicio_consulta, duracion_consulta_seg,
       empresas(nombre),
       historias(consentimiento_aceptado_en, enviado_en, antecedentes, correcciones),
       resultados_lab(valores, pruebas_descartadas),
       dictamenes(borrador_ia, texto_final, examen_fisico, aptitud, restricciones_funcionales, firmado_en),
       certificados(codigo_verificacion, emitido_en)`,
    )
    .eq("id", id)
    .maybeSingle<Preempleo>();

  if (!p) notFound();

  const firmado = p.estado === "firmado";
  const enConsulta = p.estado === "en_valoracion";
  const iniciar = iniciarConsulta.bind(null, p.id);
  const lab = p.resultados_lab[0] ?? null;
  const perfil = await obtenerPerfil();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-5 py-6">
      {/* Encabezado de la consulta */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Link href="/medico" className="text-sm text-tenue hover:text-tinta">
            ← Mis preempleos
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{p.candidato_nombre}</h1>
            <InsigniaEstado estado={p.estado} />
          </div>
          <p className="text-tinta-suave">
            <span className="cifras font-mono text-sm">{p.candidato_cedula}</span>
            <span className="mx-2 text-linea">|</span>
            {p.puesto}
            <span className="mx-2 text-linea">|</span>
            {p.empresas?.nombre}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {p.estado === "listo_para_consulta" ? (
            <form action={iniciar}>
              <button
                type="submit"
                className="rounded-md bg-tinta px-5 py-3 font-medium text-hueso hover:bg-tinta-suave"
              >
                Iniciar consulta
              </button>
            </form>
          ) : (
            <Cronometro inicio={p.inicio_consulta} duracionFinal={p.duracion_consulta_seg} />
          )}
        </div>
      </div>

      {firmado && p.duracion_consulta_seg != null && (
        <div role="status" className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg bg-salvia-claro px-5 py-4">
          <p className="cifras font-mono text-3xl font-medium">{formatearDuracion(p.duracion_consulta_seg)} min</p>
          <p className="text-tinta-suave">Consulta cerrada. La empresa ya puede ver el informe final.</p>
        </div>
      )}

      {/* Historia a la izquierda · laboratorios y dictamen a la derecha */}
      <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="min-w-0 rounded-lg border border-linea bg-papel">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-linea px-5 py-3.5">
            <h2 className="font-semibold">Historia del candidato</h2>
            {p.historias && (
              <p className="text-xs text-tenue">
                Consentimiento informado aceptado el {formatearFecha(p.historias.consentimiento_aceptado_en)}
                <br />
                Declaración de veracidad aceptada el {formatearFecha(p.historias.enviado_en)}
              </p>
            )}
          </div>
          <div className="px-5 py-4">
            {p.historias ? (
              <Historia
                preempleoId={p.id}
                antecedentes={p.historias.antecedentes}
                correccionesIniciales={p.historias.correcciones}
                editable={enConsulta}
              />
            ) : (
              <p className="text-tenue">El candidato todavía no ha llenado su historia.</p>
            )}
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-5">
          <PanelLaboratorio
            preempleoId={p.id}
            valoresIniciales={lab?.valores ?? null}
            descartadasIniciales={lab?.pruebas_descartadas ?? []}
            editable={enConsulta}
          />

          {enConsulta ? (
            <PanelDictamen
              preempleoId={p.id}
              hoja={{
                nombre: p.candidato_nombre,
                cedula: p.candidato_cedula,
                puesto: p.puesto,
                empresa: p.empresas?.nombre ?? "—",
                fecha: formatearFechaLarga(new Date().toISOString()),
                medico: perfil?.nombre ?? "Médico",
                medicoCodigo: perfil?.codigo_profesional ?? null,
              }}
              textoInicial={p.dictamenes?.texto_final ?? ""}
              examenInicial={p.dictamenes?.examen_fisico ?? ""}
              propuestaInicial={p.dictamenes?.borrador_ia?.match(/Propuesta de la IA: (.+)$/)?.[1] ?? null}
              restriccionesIniciales={p.dictamenes?.restricciones_funcionales ?? ""}
              conBorradorIA={!!p.dictamenes?.borrador_ia}
            />
          ) : (
            <section className="flex-1 rounded-lg border border-linea bg-papel">
              <div className="flex items-center justify-between border-b border-linea px-5 py-3.5">
                <h2 className="font-semibold">Dictamen</h2>
                {firmado && p.dictamenes?.aptitud && <InsigniaAptitud aptitud={p.dictamenes.aptitud} />}
              </div>
              <div className="space-y-4 px-5 py-5">
                {firmado && p.dictamenes ? (
                  <>
                    {p.dictamenes.examen_fisico && (
                      <div>
                        <p className="text-sm font-medium">Examen físico</p>
                        <p className="whitespace-pre-line text-[15px] leading-relaxed text-tinta-suave">
                          {p.dictamenes.examen_fisico}
                        </p>
                      </div>
                    )}
                    <p className="whitespace-pre-line leading-relaxed">{p.dictamenes.texto_final}</p>
                    {p.dictamenes.restricciones_funcionales && (
                      <div className="rounded-md bg-ambar-claro px-4 py-3">
                        <p className="text-sm font-medium text-ambar">
                          {p.dictamenes.aptitud === "no_apto" ? "Razones para la empresa" : "Recomendaciones para la empresa"}
                        </p>
                        <p className="whitespace-pre-line">{p.dictamenes.restricciones_funcionales}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-linea pt-3 text-sm text-tenue">
                      <span>Firmado el {formatearFecha(p.dictamenes.firmado_en)}</span>
                      {p.certificados && (
                        <span>
                          Certificado{" "}
                          <span className="cifras font-mono text-tinta">{p.certificados.codigo_verificacion}</span>
                        </span>
                      )}
                      {p.certificados && (
                        <a href={`/api/certificado/${p.id}`} className="font-medium text-tinta underline underline-offset-2">
                          Descargar PDF
                        </a>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-tenue">Inicie la consulta para subir laboratorios y generar el borrador.</p>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
