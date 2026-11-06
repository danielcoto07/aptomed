"use server";

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import { rutaDeInicio } from "@/lib/sesion";
import type { Rol } from "@/lib/tipos";

export type EstadoLogin = { error: string | null };

export async function iniciarSesion(_previo: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Escriba su correo y su contraseña." };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Correo o contraseña incorrectos." };

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", data.user.id)
    .single();

  if (!perfil) {
    await supabase.auth.signOut();
    return { error: "Su cuenta no tiene un perfil asignado. Contacte al administrador." };
  }

  redirect(rutaDeInicio(perfil.rol as Rol));
}

export async function cerrarSesion() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
