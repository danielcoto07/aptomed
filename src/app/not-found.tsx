import Link from "next/link";
import { Marca } from "@/components/marca";

export default function NoEncontrada() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-8 px-5 py-6">
      <Marca />
      <div className="space-y-2">
        <h1 className="text-2xl font-medium tracking-tight">No encontramos esta página</h1>
        <p className="leading-relaxed text-tinta-suave">Revise la dirección o vuelva al inicio.</p>
      </div>
      <Link href="/" className="inline-flex font-medium text-tinta underline underline-offset-4">
        Ir al inicio
      </Link>
    </main>
  );
}
