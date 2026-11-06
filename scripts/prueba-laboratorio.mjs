// Prueba las reglas de laboratorio: filtro legal, rangos y citas.
// No usa red ni base de datos. Uso: npm run test:lab

import assert from "node:assert/strict";
import { test } from "node:test";
import { aplicarCorrecciones } from "../src/lib/historia.ts";
import { citasLegales, evaluar, pruebaProhibida } from "../src/lib/laboratorio.ts";

const VIH = ["VIH", "Anti-VIH 1/2", "HIV1/2 Ag/Ab", "HIV-1", "VIH1", "VIH 1+2", "Antígeno p24", "Prueba de retrovirus"];
const EMBARAZO = [
  "Beta HCG",
  "β-hCG",
  "HGC",
  "Prueba de gravidez",
  "Test de preñez",
  "Embarazo en orina",
  "Gonadotropina coriónica",
  "Subunidad beta",
  "Fracción beta",
];
const PERMITIDAS = [
  "Hemoglobina",
  "Glucosa en ayunas",
  "Colesterol total",
  "Beta 2 microglobulina",
  "Doping",
  "Heces: parásitos",
  "Hematocrito",
];

test("bloquea pruebas de VIH", () => {
  for (const nombre of VIH) assert.equal(pruebaProhibida(nombre), "Prueba de VIH", nombre);
});

test("bloquea pruebas de embarazo", () => {
  for (const nombre of EMBARAZO) assert.equal(pruebaProhibida(nombre), "Prueba de embarazo", nombre);
});

test("permite pruebas comunes", () => {
  for (const nombre of PERMITIDAS) assert.equal(pruebaProhibida(nombre), null, nombre);
});

test("cita la norma de cada prueba", () => {
  assert.match(citasLegales(["Prueba de VIH"]), /inc\. j/);
  assert.doesNotMatch(citasLegales(["Prueba de VIH"]), /inc\. k/);
  assert.match(citasLegales(["Prueba de embarazo"]), /inc\. k/);
  assert.doesNotMatch(citasLegales(["Prueba de embarazo"]), /inc\. j/);
});

test("deja la decisión a la IA si hay rangos por sexo", () => {
  assert.equal(evaluar("12.5", "H: 13-17 M: 12-16"), null);
  assert.equal(evaluar("13.5", "Hombres 13,5-17 / Mujeres 12-16"), null);
});

test("no compara escalas distintas por puntos de miles", () => {
  assert.equal(evaluar("7200", "4.500 - 11.000"), null);
  assert.equal(evaluar("1.200", "< 200"), null);
  assert.equal(evaluar("7.200", "4.500 - 11.000"), "normal");
});

test("reconoce resultados equivalentes", () => {
  assert.equal(evaluar("Negativa", "Negativo"), "normal");
  assert.equal(evaluar("No reactivo", "Negativo"), "normal");
  assert.equal(evaluar("Ausentes", "Ausente"), "normal");
  assert.equal(evaluar("Positivo", "Negativo"), "alterado");
});

test("mantiene los rangos simples", () => {
  assert.equal(evaluar("95", "70 - 100"), "normal");
  assert.equal(evaluar("120", "70 - 100"), "alto");
  assert.equal(evaluar("60", "70 - 100"), "bajo");
  assert.equal(evaluar("180", "< 200"), "normal");
  assert.equal(evaluar("250", "< 200"), "alto");
});

test("aplica correcciones sin cambiar la respuesta del candidato", () => {
  const original = {
    datos_generales: { edad: 41 },
    antecedentes_personales: { medicamentos: ["Ninguno."] },
    antecedentes_laborales: [{ empresa: "Valle Central" }],
  };
  const vigente = aplicarCorrecciones(original, {
    "datos_generales.edad": { valor: "42", corregido_en: "x" },
    "antecedentes_personales.medicamentos.0": { valor: "Losartán 50 mg", corregido_en: "x" },
    "antecedentes_laborales.0.empresa": { valor: "Otra empresa", corregido_en: "x" },
  });
  assert.equal(vigente.datos_generales.edad, "42");
  assert.equal(vigente.antecedentes_personales.medicamentos[0], "Losartán 50 mg");
  assert.equal(vigente.antecedentes_laborales[0].empresa, "Otra empresa");
  assert.equal(original.datos_generales.edad, 41);
  assert.equal(original.antecedentes_personales.medicamentos[0], "Ninguno.");
});
