import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Marca } from "@/components/marca";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { formatearFechaLarga } from "@/lib/tipos";

export const metadata: Metadata = {
  title: "Verificar certificado · AptoMed",
  robots: { index: false, follow: false },
};

// Página pública: solo confirma si el código existe. No muestra datos de ninguna persona.
export default async function VerificarCodigo({ params }: PageProps<"/verificar/[codigo]">) {
  await connection();
  const { codigo } = await params;
  const limpio = codigo.toUpperCase();

  let emitido: string | null = null;
  if (/^[0-9A-F]{10}$/.test(limpio)) {
    const { data } = await crearClienteAdmin()
      .from("certificados")
      .select("emitido_en")
      .eq("codigo_verificacion", limpio)
      .maybeSingle();
    emitido = data?.emitido_en ?? null;
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-8 px-5 py-6">
      <Link href="/">
        <Marca />
      </Link>
      {emitido ? (
        <div className="space-y-2" role="status">
          <p className="inline-flex items-center gap-2 font-medium text-salvia">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
            Certificado válido
          </p>
          <h1 className="cifras font-mono text-2xl font-medium">{limpio}</h1>
          <p className="leading-relaxed text-tinta-suave">
            Emitido el {formatearFechaLarga(emitido)}. Por privacidad, aquí no se muestran datos del candidato.
          </p>
        </div>
      ) : (
        <div className="space-y-2" role="status">
          <p className="inline-flex items-center gap-2 font-medium text-rojo">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
            No se encontró este certificado
          </p>
          <p className="leading-relaxed text-tinta-suave">Revise que el código esté completo y sin espacios.</p>
        </div>
      )}
      <p className="text-sm text-tenue">Prototipo de demostración: la firma es simulada y no tiene validez legal.</p>
    </main>
  );
}
