import { Filtros } from "@/components/filtros";
import { ESTADOS_FILTRO, coincideTexto, texto } from "@/lib/filtros";
import { InsigniaAptitud, InsigniaEstado } from "@/components/insignias";
import { crearClienteServidor } from "@/lib/supabase/server";
import { CopiarEnlace, NuevaOrden } from "./nueva-orden";
import { ETIQUETA_ESTADO, OPCIONES_INFORME, formatearFecha, type Aptitud, type EstadoPreempleo } from "@/lib/tipos";

export const metadata = { title: "Preempleos · AptoMed" };

type Fila = {
  id: string;
  candidato_nombre: string;
  puesto: string;
  estado: EstadoPreempleo;
  creado_en: string;
  token_candidato: string;
  certificados: {
    aptitud: Aptitud;
    restricciones_funcionales: string | null;
    nota: string | null;
    emitido_en: string;
    codigo_verificacion: string;
  } | null;
};

const SIN_ORDENES = "Todavía no hay órdenes. Cree la primera con Nueva orden.";

function Estado({ fila }: { fila: Fila }) {
  return (
    <>
      <InsigniaEstado estado={fila.estado} />
      {fila.estado === "pendiente_candidato" && (
        <div className="mt-1">
          <CopiarEnlace token={fila.token_candidato} />
        </div>
      )}
    </>
  );
}

function Informe({ certificado: c, preempleoId }: { certificado: NonNullable<Fila["certificados"]>; preempleoId: string }) {
  const opcion = OPCIONES_INFORME[c.aptitud];
  return (
    <div className="space-y-1">
      <InsigniaAptitud aptitud={c.aptitud} />
      <p className="max-w-[46ch] text-sm text-tinta-suave">{opcion.texto}</p>
      {c.restricciones_funcionales && <p className="whitespace-pre-line text-sm">{c.restricciones_funcionales}</p>}
      {opcion.cierre && <p className="max-w-[46ch] text-sm text-tinta-suave">{opcion.cierre}</p>}
      {c.nota && <p className="text-sm text-ambar">Nota: {c.nota}</p>}
      <p className="cifras text-xs text-tenue">
        Emitido {formatearFecha(c.emitido_en)} · <span className="font-mono">{c.codigo_verificacion}</span>
      </p>
      <a
        href={`/api/certificado/${preempleoId}`}
        className="inline-block text-sm font-medium text-tinta underline underline-offset-2"
      >
        Descargar informe PDF
      </a>
      <a
        href={`/verificar/${c.codigo_verificacion}`}
        className="ml-4 inline-block text-sm text-tinta-suave underline underline-offset-2"
      >
        Verificar
      </a>
    </div>
  );
}

// RRHH solo ve la orden y, cuando existe, el certificado. Nada clínico (lo garantiza RLS).
export default async function ListaRrhh({ searchParams }: PageProps<"/rrhh">) {
  const filtro = await searchParams;
  const q = texto(filtro.q);
  const estado = texto(filtro.estado);
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("preempleos")
    .select("id, candidato_nombre, puesto, estado, creado_en, token_candidato, certificados(aptitud, restricciones_funcionales, nota, emitido_en, codigo_verificacion)")
    .order("creado_en", { ascending: false })
    .returns<Fila[]>();

  const todas = data ?? [];
  const filas = todas.filter(
    (f) => coincideTexto(q, f.candidato_nombre, f.puesto) && (!estado || f.estado === estado),
  );
  const vacio = todas.length ? "Ninguna orden coincide con los filtros." : SIN_ORDENES;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Preempleos de su empresa</h1>
          <p className="text-tenue">Usted ve el estado de cada orden y el informe final cuando el médico firma.</p>
        </div>
        <NuevaOrden />
      </div>

      <Filtros
        busqueda={q}
        estado={estado}
        ayuda="Buscar por nombre o puesto"
        estados={ESTADOS_FILTRO.map((e) => ({ valor: e, etiqueta: ETIQUETA_ESTADO[e] }))}
      />

      {/* Pantallas angostas: una ficha por orden, sin deslizar hacia los lados. */}
      <ul className="divide-y divide-linea rounded-lg border border-linea bg-papel lg:hidden">
        {filas.map((f) => (
          <li key={f.id} className="space-y-3 px-4 py-4">
            <div>
              <p className="font-medium">{f.candidato_nombre}</p>
              <p className="text-sm text-tinta-suave">{f.puesto}</p>
            </div>
            <Estado fila={f} />
            {f.certificados && <Informe certificado={f.certificados} preempleoId={f.id} />}
          </li>
        ))}
        {filas.length === 0 && <li className="px-4 py-10 text-center text-tenue">{vacio}</li>}
      </ul>

      <div className="hidden rounded-lg border border-linea bg-papel lg:block">
        <table className="w-full text-left text-[15px]">
          <thead>
            <tr className="border-b border-linea text-xs font-medium text-tenue">
              <th className="px-5 py-3 font-medium">Candidato</th>
              <th className="px-5 py-3 font-medium">Puesto</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium">Informe final</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} className="border-b border-linea align-top last:border-0">
                <td className="px-5 py-3.5 font-medium">{f.candidato_nombre}</td>
                <td className="px-5 py-3.5 text-tinta-suave">{f.puesto}</td>
                <td className="px-5 py-3.5">
                  <Estado fila={f} />
                </td>
                <td className="px-5 py-3.5">
                  {f.certificados ? (
                    <Informe certificado={f.certificados} preempleoId={f.id} />
                  ) : (
                    <span className="text-sm text-tenue">Pendiente</span>
                  )}
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-tenue">
                  {vacio}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
