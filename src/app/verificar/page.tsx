import { redirect } from "next/navigation";
import { texto } from "@/lib/filtros";

// Recibe el código escrito en la página de inicio.
export default async function Verificar({ searchParams }: PageProps<"/verificar">) {
  const { codigo } = await searchParams;
  const limpio = texto(codigo).trim().toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 20);
  redirect(`/verificar/${limpio || "sin-codigo"}`);
}
