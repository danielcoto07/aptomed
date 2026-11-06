import { INTRO_INFORME, OPCIONES_INFORME, ORDEN_INFORME, type Aptitud } from "@/lib/tipos";

export type DatosHoja = {
  nombre: string;
  cedula: string;
  puesto: string;
  empresa: string;
  fecha: string;
  medico: string;
  medicoCodigo: string | null;
};

type Props = {
  datos: DatosHoja;
  aptitud: Aptitud | null;
  alElegir: (aptitud: Aptitud) => void;
  texto: string;
  alEscribir: (texto: string) => void;
  alSalirDelTexto: () => void;
  faltanLaboratorios: boolean;
  alMarcarNota: (marcada: boolean) => void;
};

const AREA =
  "mt-1.5 w-full rounded-md border border-linea bg-papel px-3 py-2 text-sm leading-relaxed outline-none focus:border-salvia";

// "Informe Final a la Empresa": mismo orden del formato real y del PDF.
// No lleva datos clínicos: es lo que recibe la empresa.
export function HojaCertificado({
  datos,
  aptitud,
  alElegir,
  texto,
  alEscribir,
  alSalirDelTexto,
  faltanLaboratorios,
  alMarcarNota,
}: Props) {
  return (
    <div className="rounded-md border border-tinta/25 bg-hueso/40">
      <div className="border-b border-tinta/25 px-4 py-3">
        <p className="font-semibold">AptoMed</p>
        <p className="text-sm font-semibold">Informe Final a la Empresa</p>
      </div>

      <div className="space-y-4 px-4 py-3.5 text-sm">
        <p>
          <span className="font-semibold">Nombre del candidato:</span> {datos.nombre}
        </p>
        <p className="text-tinta-suave">{INTRO_INFORME}</p>

        <fieldset className="space-y-3">
          <legend className="sr-only">Resultado para la empresa (decisión del médico)</legend>
          {ORDEN_INFORME.map((a) => {
            const opcion = OPCIONES_INFORME[a];
            const elegida = aptitud === a;
            return (
              <div
                key={a}
                className={`rounded-md border px-3 py-2.5 ${elegida ? "border-tinta bg-papel" : "border-linea"}`}
              >
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="radio"
                    name="aptitud"
                    value={a}
                    checked={elegida}
                    onChange={() => alElegir(a)}
                    className="mt-1 accent-salvia"
                  />
                  <span className="font-semibold">
                    {opcion.letra}. {opcion.titulo}
                  </span>
                </label>
                <p className="mt-1 text-tinta-suave">{opcion.texto}</p>

                {elegida && a === "apto" && (
                  <label className="mt-2 flex cursor-pointer items-center gap-2">
                    <input
                      id="faltan-laboratorios"
                      type="checkbox"
                      checked={faltanLaboratorios}
                      onChange={(e) => alMarcarNota(e.target.checked)}
                      className="accent-salvia"
                    />
                    Nota: Faltan los resultados de los exámenes de laboratorio
                  </label>
                )}

                {elegida && a !== "apto" && (
                  <>
                    <textarea
                      id="restricciones"
                      aria-label={a === "no_apto" ? "Razones para la empresa" : "Recomendaciones para la empresa"}
                      value={texto}
                      onChange={(e) => alEscribir(e.target.value)}
                      onBlur={alSalirDelTexto}
                      rows={3}
                      placeholder="No levantar más de 15 kg"
                      className={AREA}
                    />
                    <p className="mt-1 text-xs text-tenue">
                      La empresa verá este texto. Escríbalo en términos de capacidad, sin diagnósticos ni valores.
                    </p>
                  </>
                )}

                {opcion.cierre && <p className="mt-1 text-tinta-suave">{opcion.cierre}</p>}
              </div>
            );
          })}
        </fieldset>

        <div>
          <p className="font-semibold">Nombre, código y firma del profesional:</p>
          <p className="text-tinta-suave">
            {datos.medico} · Código {datos.medicoCodigo ?? "—"}
          </p>
          <p className="text-xs text-tenue">La firma simulada se registra al confirmar.</p>
        </div>

        <p className="border-t border-linea pt-2 text-xs text-tenue">
          Puesto: {datos.puesto} · Empresa: {datos.empresa} · Cédula: {datos.cedula} · Fecha: {datos.fecha}. El código
          del certificado se asigna al firmar.
        </p>
      </div>
    </div>
  );
}
