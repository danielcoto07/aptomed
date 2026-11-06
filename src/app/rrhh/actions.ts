"use server";

import { revalidatePath } from "next/cache";
import { exigirRol } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";

export type EstadoOrden = { error: string | null; token: string | null; nombre: string | null };

// La inserción pasa por RLS: RRHH solo puede crear órdenes de su empresa.
export async function crearOrden(_previo: EstadoOrden, formData: FormData): Promise<EstadoOrden> {
  const perfil = await exigirRol("rrhh");
  const nombre = String(formData.get("nombre") ?? "").trim().slice(0, 120);
  const cedula = String(formData.get("cedula") ?? "").trim().slice(0, 30);
  const puesto = String(formData.get("puesto") ?? "").trim().slice(0, 120);

  if (!nombre || !cedula || !puesto) return { error: "Complete nombre, cédula y puesto.", token: null, nombre: null };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("preempleos")
    .insert({ empresa_id: perfil.empresa_id, candidato_nombre: nombre, candidato_cedula: cedula, puesto })
    .select("token_candidato")
    .single();

  if (error || !data) return { error: "No se pudo crear la orden. Intente de nuevo.", token: null, nombre: null };

  revalidatePath("/rrhh");
  return { error: null, token: data.token_candidato, nombre };
}
