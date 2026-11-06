import Image from "next/image";

// Logo de AptoMed. "md" es la versión horizontal para barras; "lg" es el logo completo.
export function Marca({ tamano = "md" }: { tamano?: "md" | "lg" }) {
  if (tamano === "lg") {
    return <Image src="/logo-aptomed.png" alt="AptoMed" width={836} height={662} priority className="h-auto w-36" />;
  }
  return (
    <span className="inline-flex items-center gap-2">
      <Image src="/logo-isotipo.png" alt="" width={498} height={460} priority className="h-7 w-auto" />
      <span className="text-lg tracking-tight text-tinta">
        <span className="font-bold">Apto</span>
        <span className="font-light">Med</span>
      </span>
    </span>
  );
}
