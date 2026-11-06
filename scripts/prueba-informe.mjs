// Prueba el PDF del Informe Final: médico y RRHH reciben una copia fija.
// No usa red ni base de datos. Uso: npm run test:informe [carpeta-para-guardar-los-pdf]

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { PDFDocument } from "pdf-lib";
import { crearCertificadoPdf } from "../src/lib/certificado-pdf.ts";

const carpeta = process.argv.slice(2).find((a) => !a.startsWith("-")) ?? process.env.INFORME_SALIDA;

const base = {
  candidato_nombre: "Carlos Mora Solís",
  candidato_cedula: "1-1456-0789",
  puesto: "Operario de construcción en alturas",
  medico_nombre: "Dra. Laura Méndez Vargas",
  medico_codigo: "MED-00000 (ficticio)",
  emitido_en: "2026-11-04T04:00:00.000Z",
  codigo_verificacion: "ABC123DEF4",
  empresa: "Constructora Demo S.A.",
};

const casos = {
  a: { ...base, aptitud: "apto", restricciones_funcionales: null, nota: "Faltan los resultados de los exámenes de laboratorio." },
  b: {
    ...base,
    aptitud: "apto_con_restricciones",
    nota: null,
    restricciones_funcionales:
      "No trabajar en alturas mayores a 1,8 m sin arnés.\nRealizar pausas activas cada 2 horas durante la jornada de trabajo y evitar cargar más de 15 kg de forma repetitiva.\nUsar protección auditiva en zonas de ruido.\nControl médico cada 6 meses.",
  },
  c: { ...base, aptitud: "no_apto", nota: null, restricciones_funcionales: "No puede realizar carga repetitiva de pesos." },
};

async function revisar(datos) {
  const bytes = await crearCertificadoPdf(datos);
  const pdf = await PDFDocument.load(bytes);
  return { bytes, campos: pdf.getForm().getFields().map((f) => f.getName()) };
}

test("el informe siempre es fijo, sin campos editables", async () => {
  for (const datos of Object.values(casos)) {
    const { campos } = await revisar(datos);
    assert.deepEqual(campos, []);
  }
});

test("acepta símbolos que la fuente del PDF no admite", async () => {
  const { bytes } = await revisar({ ...casos.b, restricciones_funcionales: "Cargar ≥ 15 kg 🙂 con ayuda" });
  assert.ok(bytes.length > 0);
});

test("guarda ejemplos si se indica una carpeta", async () => {
  if (!carpeta) return;
  mkdirSync(carpeta, { recursive: true });
  for (const [letra, datos] of Object.entries(casos)) {
    writeFileSync(join(carpeta, `${letra}.pdf`), (await revisar(datos)).bytes);
  }
});
