import { ETIQUETA_APTITUD, ETIQUETA_ESTADO, type Aptitud, type EstadoPreempleo } from "@/lib/tipos";

const COLOR_ESTADO: Record<EstadoPreempleo, string> = {
  pendiente_candidato: "text-tenue",
  listo_para_consulta: "text-salvia",
  en_valoracion: "text-ambar",
  firmado: "text-tinta",
};

const COLOR_APTITUD: Record<Aptitud, string> = {
  apto: "text-salvia",
  apto_con_restricciones: "text-ambar",
  no_apto: "text-rojo",
};

const BASE = "inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium";

function Punto() {
  return <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />;
}

export function InsigniaEstado({ estado }: { estado: EstadoPreempleo }) {
  return (
    <span className={`${BASE} ${COLOR_ESTADO[estado]}`}>
      <Punto />
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}

export function InsigniaAptitud({ aptitud }: { aptitud: Aptitud }) {
  return (
    <span className={`${BASE} ${COLOR_APTITUD[aptitud]}`}>
      <Punto />
      {ETIQUETA_APTITUD[aptitud]}
    </span>
  );
}
