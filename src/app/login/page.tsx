import Link from "next/link";
import { redirect } from "next/navigation";
import { Marca } from "@/components/marca";
import { obtenerPerfil, rutaDeInicio } from "@/lib/sesion";
import { FormularioLogin } from "./formulario";

export const metadata = { title: "Ingresar · AptoMed" };

export default async function PaginaLogin() {
  const perfil = await obtenerPerfil();
  if (perfil) redirect(rutaDeInicio(perfil.rol));

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm space-y-10">
        <Link href="/" className="mx-auto block w-fit">
          <Marca tamano="lg" />
        </Link>
        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Ingresar</h1>
            <p className="text-sm text-tenue">Médicos y personal de Recursos Humanos.</p>
          </div>
          <FormularioLogin />
        </div>
        <p className="text-xs leading-relaxed text-tenue">
          ¿Es candidato? No necesita cuenta: use el enlace que le envió la empresa.
        </p>
      </div>
    </main>
  );
}
