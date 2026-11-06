import Link from "next/link";
import { cerrarSesion } from "@/app/login/actions";
import { Marca } from "@/components/marca";

// Barra superior común a los paneles de médico y RRHH.
export function Encabezado({ nombre, detalle, inicio }: { nombre: string; detalle: string; inicio: string }) {
  return (
    <header className="border-b border-linea bg-papel">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3">
        <Link href={inicio}>
          <Marca />
        </Link>
        <div className="flex items-center gap-4">
          <div className="text-right leading-tight">
            <p className="text-sm font-medium">{nombre}</p>
            <p className="text-xs text-tenue">{detalle}</p>
          </div>
          <form action={cerrarSesion}>
            <button
              type="submit"
              className="text-sm text-tinta-suave underline-offset-4 hover:underline"
            >
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
