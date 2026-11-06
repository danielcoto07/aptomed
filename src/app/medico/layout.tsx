import { Encabezado } from "@/components/encabezado";
import { exigirRol } from "@/lib/sesion";

export default async function LayoutMedico({ children }: LayoutProps<"/medico">) {
  const perfil = await exigirRol("medico");

  return (
    <>
      <Encabezado nombre={perfil.nombre} detalle="Médico de empresa" inicio="/medico" />
      <div className="flex flex-1 flex-col">{children}</div>
    </>
  );
}
