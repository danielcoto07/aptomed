import { Encabezado } from "@/components/encabezado";
import { exigirRol } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";

export default async function LayoutRrhh({ children }: LayoutProps<"/rrhh">) {
  const perfil = await exigirRol("rrhh");
  const supabase = await crearClienteServidor();
  const { data: empresa } = await supabase
    .from("empresas")
    .select("nombre")
    .eq("id", perfil.empresa_id!)
    .single();

  return (
    <>
      <Encabezado nombre={perfil.nombre} detalle={`Recursos Humanos · ${empresa?.nombre ?? ""}`} inicio="/rrhh" />
      <div className="flex flex-1 flex-col">{children}</div>
    </>
  );
}
