import Link from "next/link";
import { Filtros } from "@/components/filtros";
import { InsigniaEstado } from "@/components/insignias";
import { ESTADOS_FILTRO, coincideTexto, texto } from "@/lib/filtros";
import { crearClienteServidor } from "@/lib/supabase/server";
import { ETIQUETA_ESTADO, formatearDuracion, formatearFecha, type EstadoPreempleo } from "@/lib/tipos";

export const metadata = { title: "Mis preempleos · AptoMed" };

type Fila = {
  id: string;
  candidato_nombre: string;
  candidato_cedula: string;
  puesto: string;
  estado: EstadoPreempleo;
  creado_en: string;
  duracion_consulta_seg: number | null;
  empresas: { nombre: string } | null;
};

// Lo que el médico debe atender primero va arriba.
const ORDEN: Record<EstadoPreempleo, number> = {
  en_valoracion: 0,
  listo_para_consulta: 1,
  pendiente_candidato: 2,
  firmado: 3,
};

export default async function ListaMedico({ searchParams }: PageProps<"/medico">) {
  const filtro = await searchParams;
  const q = texto(filtro.q);
  const estado = texto(filtro.estado);
  const empresa = texto(filtro.empresa);
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("preempleos")
    .select("id, candidato_nombre, candidato_cedula, puesto, estado, creado_en, duracion_consulta_seg, empresas(nombre)")
    .order("creado_en", { ascending: false })
    .returns<Fila[]>();

  const todas = (data ?? []).sort((a, b) => ORDEN[a.estado] - ORDEN[b.estado]);
  const empresas = [...new Set(todas.map((f) => f.empresas?.nombre ?? ""))].filter(Boolean).sort();
  const filas = todas.filter(
    (f) =>
      coincideTexto(q, f.candidato_nombre, f.candidato_cedula, f.puesto) &&
      (!estado || f.estado === estado) &&
      (!empresa || f.empresas?.nombre === empresa),
  );
  const porAtender = todas.filter((f) => f.estado === "listo_para_consulta" || f.estado === "en_valoracion").length;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Mis preempleos</h1>
          <p className="text-tenue">
            {porAtender === 1 ? "1 candidato listo" : `${porAtender} candidatos listos`} para consulta.
          </p>
        </div>
      </div>

      <Filtros
        busqueda={q}
        estado={estado}
        empresa={empresa}
        ayuda="Buscar por nombre, cédula o puesto"
        estados={ESTADOS_FILTRO.map((e) => ({ valor: e, etiqueta: ETIQUETA_ESTADO[e] }))}
        empresas={empresas.map((e) => ({ valor: e, etiqueta: e }))}
      />

      <div className="overflow-x-auto rounded-lg border border-linea bg-papel">
        <table className="w-full min-w-[720px] text-left text-[15px]">
          <thead>
            <tr className="border-b border-linea text-xs font-medium text-tenue">
              <th className="px-5 py-3 font-medium">Candidato</th>
              <th className="px-5 py-3 font-medium">Puesto</th>
              <th className="px-5 py-3 font-medium">Empresa</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium">Orden creada</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const abrible = f.estado !== "pendiente_candidato";
              return (
                <tr key={f.id} className="border-b border-linea last:border-0 hover:bg-hueso/60">
                  <td className="px-5 py-3.5">
                    <p className="font-medium">{f.candidato_nombre}</p>
                    <p className="cifras font-mono text-xs text-tenue">{f.candidato_cedula}</p>
                  </td>
                  <td className="px-5 py-3.5 text-tinta-suave">{f.puesto}</td>
                  <td className="px-5 py-3.5 text-tinta-suave">{f.empresas?.nombre}</td>
                  <td className="px-5 py-3.5">
                    <InsigniaEstado estado={f.estado} />
                    {f.estado === "firmado" && f.duracion_consulta_seg != null && (
                      <p className="cifras mt-1 font-mono text-xs text-tenue">
                        Consulta: {formatearDuracion(f.duracion_consulta_seg)} min
                      </p>
                    )}
                  </td>
                  <td className="cifras whitespace-nowrap px-5 py-3.5 text-sm text-tenue">{formatearFecha(f.creado_en)}</td>
                  <td className="px-5 py-3.5 text-right">
                    {abrible ? (
                      <Link
                        href={`/medico/preempleo/${f.id}`}
                        className={`inline-flex whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                          f.estado === "firmado"
                            ? "border border-linea text-tinta-suave hover:bg-hueso"
                            : "bg-tinta text-hueso hover:bg-tinta-suave"
                        }`}
                      >
                        {f.estado === "firmado" ? "Ver" : "Abrir consulta"}
                      </Link>
                    ) : (
                      <span className="text-sm text-tenue">Sin historia aún</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-tenue">
                  {todas.length ? "Ningún preempleo coincide con los filtros." : "No tiene preempleos asignados."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
