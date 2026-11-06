import Link from "next/link";
import { redirect } from "next/navigation";
import { Marca } from "@/components/marca";
import { obtenerPerfil, rutaDeInicio } from "@/lib/sesion";
import { Expediente } from "./expediente";

const PASOS = [
  ["Empresa", "Crea la orden y envía un enlace al candidato."],
  ["Candidato", "Acepta el consentimiento y llena su historia desde el celular."],
  ["Médico", "Valora con los laboratorios leídos y un borrador listo para corregir."],
  ["Empresa", "Recibe el informe firmado, sin datos clínicos."],
];

const REGLAS = [
  ["La empresa no ve datos clínicos.", "Lo impide la base de datos, no solo la pantalla (Ley 8968)."],
  ["La IA solo propone.", "Nada se firma ni llega a la empresa sin la decisión del médico."],
  ["VIH y embarazo no se registran.", "Si aparecen en un laboratorio, se descartan con un aviso (Código de Trabajo, art. 70, incs. j y k)."],
];

export default async function Inicio() {
  const perfil = await obtenerPerfil();
  if (perfil) redirect(rutaDeInicio(perfil.rol));

  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6">
        <Marca />
        <Link href="/login" className="text-sm font-medium text-tinta-suave underline-offset-4 hover:underline">
          Ingresar
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-20 pt-8 lg:grid-cols-[1fr_1.05fr] lg:pt-14">
        <div className="min-w-0 space-y-7">
          <h1 className="text-[2.75rem] font-medium leading-[1.04] tracking-[-0.03em] md:text-6xl">
            Un preempleo. Dos miradas.
          </h1>
          <p className="max-w-[46ch] text-lg leading-relaxed text-tinta-suave">
            AptoMed lleva la consulta precargada para que el médico valore, corrija y firme. La empresa recibe el
            resultado y nada más.
          </p>
          <Link
            href="/login"
            className="inline-flex rounded-md bg-tinta px-5 py-3 font-medium text-hueso hover:bg-tinta-suave"
          >
            Ingresar a la plataforma
          </Link>
        </div>
        <Expediente />
      </section>

      <section className="border-t border-linea">
        <div className="mx-auto w-full max-w-6xl space-y-10 px-5 py-16">
          <h2 className="max-w-[24ch] text-3xl font-medium leading-tight tracking-[-0.02em]">
            Cuando el médico abre la consulta, el papeleo ya pasó.
          </h2>
          <ol className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {PASOS.map(([quien, que], i) => (
              <li key={i} className="space-y-1.5 border-t border-tinta/25 pt-4">
                <p className="font-semibold">{quien}</p>
                <p className="leading-relaxed text-tinta-suave">{que}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-tinta text-hueso">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[1fr_1.4fr]">
          <h2 className="max-w-[16ch] text-3xl font-medium leading-tight tracking-[-0.02em]">
            Tres reglas que el sistema no deja romper.
          </h2>
          <ul className="divide-y divide-hueso/20">
            {REGLAS.map(([regla, detalle]) => (
              <li key={regla} className="space-y-1 py-5 first:pt-0 last:pb-0">
                <p className="text-lg font-medium">{regla}</p>
                <p className="leading-relaxed text-hueso/75">{detalle}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-6 px-5 py-14">
        <div className="space-y-1">
          <h2 className="text-xl font-medium">Verificar un certificado</h2>
          <p className="text-tinta-suave">Escriba el código del informe o escanee su QR.</p>
        </div>
        <form action="/verificar" className="flex w-full max-w-sm gap-2">
          <input
            name="codigo"
            required
            maxLength={20}
            aria-label="Código del certificado"
            placeholder="Código"
            className="min-w-0 flex-1 rounded-md border border-linea bg-papel px-3 py-2.5 text-base uppercase outline-none focus:border-salvia"
          />
          <button type="submit" className="rounded-md border border-tinta/25 px-4 py-2.5 font-medium hover:bg-papel">
            Verificar
          </button>
        </form>
      </section>

      <footer className="mx-auto w-full max-w-6xl border-t border-linea px-5 py-6 text-sm text-tenue">
        Prototipo para HackaToB 2026 · Salud ocupacional, Costa Rica. Todos los datos mostrados son ficticios.
      </footer>
    </main>
  );
}
