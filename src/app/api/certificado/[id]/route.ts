import { crearCertificadoPdf, type DatosCertificado } from "@/lib/certificado-pdf";
import { crearClienteServidor } from "@/lib/supabase/server";

type Fila = Omit<DatosCertificado, "empresa"> & { empresas: { nombre: string } | null };

// Descarga el Informe Final firmado. RLS decide quién lo puede leer:
// el médico del preempleo y RRHH de la misma empresa. Solo usa la tabla certificados, sin datos clínicos.
// Ambos reciben una copia fija: un informe firmado no se debe poder cambiar.
export async function GET(_request: Request, contexto: RouteContext<"/api/certificado/[id]">) {
  const { id } = await contexto.params;
  const supabase = await crearClienteServidor();

  const { data } = await supabase
    .from("certificados")
    .select(
      `candidato_nombre, candidato_cedula, puesto, aptitud, restricciones_funcionales,
       medico_nombre, medico_codigo, nota, emitido_en, codigo_verificacion, empresas(nombre)`,
    )
    .eq("preempleo_id", id)
    .maybeSingle<Fila>();

  if (!data) return new Response("Certificado no encontrado.", { status: 404 });

  const { empresas, ...certificado } = data;
  const pdf = await crearCertificadoPdf({ ...certificado, empresa: empresas?.nombre ?? "—" });
  const nombre = `informe-final-${data.codigo_verificacion}.pdf`;

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
