import type { Metadata } from "next";
import { connection } from "next/server";
import { Marca } from "@/components/marca";
import { TOKEN_VALIDO } from "@/lib/candidato";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { FormularioCandidato } from "./formulario";

export const metadata: Metadata = {
  title: "Historia del candidato · AptoMed",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Orden = {
  candidato_nombre: string;
  puesto: string;
  estado: string;
  token_usado_en: string | null;
  empresas: { nombre: string } | null;
};

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="space-y-2 pt-8">
      <h1 className="text-2xl font-medium tracking-tight">{titulo}</h1>
      <p className="leading-relaxed text-tinta-suave">{texto}</p>
    </div>
  );
}

export default async function PaginaCandidato({ params }: PageProps<"/candidato/[token]">) {
  // El estado del enlace cambia: nunca debe servirse una respuesta guardada.
  await connection();
  const { token } = await params;

  let orden: Orden | null = null;
  if (TOKEN_VALIDO.test(token)) {
    const { data } = await crearClienteAdmin()
      .from("preempleos")
      .select("candidato_nombre, puesto, estado, token_usado_en, empresas(nombre)")
      .eq("token_candidato", token)
      .returns<Orden[]>()
      .maybeSingle();
    orden = data;
  }

  const disponible = orden && !orden.token_usado_en && orden.estado === "pendiente_candidato";

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-6 md:max-w-3xl md:py-10">
      <Marca />
      <div className="md:mt-6 md:rounded-xl md:border md:border-linea md:bg-papel md:px-10 md:pb-10 md:pt-2">
      {!orden && (
        <Aviso titulo="Enlace no válido" texto="Revise el enlace que le envió la empresa o solicite uno nuevo." />
      )}
      {orden && !disponible && (
        <Aviso
          titulo="Este enlace ya fue utilizado"
          texto="Su historia ya fue enviada. Por seguridad, no se puede abrir ni modificar desde aquí."
        />
      )}
      {orden && disponible && (
        <FormularioCandidato
          token={token}
          nombre={orden.candidato_nombre}
          puesto={orden.puesto}
          empresa={orden.empresas?.nombre ?? "la empresa"}
        />
      )}
      </div>
    </main>
  );
}
